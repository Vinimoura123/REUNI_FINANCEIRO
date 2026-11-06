// Suite automatizada de testes anti-regressão de sincronização multi-membros,
// tolerância a divergência de relógio (PC local vs NTP nuvem), auto-cura pós
// hibernação de container efêmero (Render) e integridade de saldos editados.
//
// Uso: node antigravity-reuni/agents/testar-sincronizacao-multi-membros.mjs
// Nunca toca data/reuni_db.json real — opera exclusivamente em diretório temporário isolado.

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOps, bumpDbVersion } from '../../dbOps.js'
import { mergeCloudSnapshotIntoLocal } from '../../cloudBackup.js'
import { createReuniServer } from '../../server.js'
import {
  computeServerSignature,
  markLocalCreated,
  markLocalUpdated,
  reconcileStateWithServer
} from '../../src/lib/syncEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const realSnapshotPath = path.join(__dirname, '..', '..', 'data', 'reuni_db.json')
const snapshotOutubro = JSON.parse(fs.readFileSync(realSnapshotPath, 'utf-8'))
const hashAntesDoTeste = fs.readFileSync(realSnapshotPath, 'utf-8')

const TOKEN_TESTE = process.env.REUNI_ACCESS_TOKEN || '304314'
const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN_TESTE}`
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuni-sync-e2e-'))

function extrairColecoes(dbObj) {
  return {
    demandas: structuredClone(dbObj.demandas || []),
    arrecadacoes: structuredClone(dbObj.arrecadacoes || []),
    transacoes: structuredClone(dbObj.transacoes || []),
    bazarItems: structuredClone(dbObj.bazarItems || []),
    keepNotes: structuredClone(dbObj.keepNotes || []),
    inventarioItems: structuredClone(dbObj.inventarioItems || [])
  }
}

// Dispara requisições HTTP reais direto contra o handler de server.js (funciona
// inclusive em ambientes CI/sandbox sem permissão de abertura de socket TCP).
function criarClienteHttpInProcess(httpServer) {
  function normalizarHeaders(raw = {}) {
    const out = {}
    for (const [k, v] of Object.entries(raw)) {
      out[k.toLowerCase()] = String(v)
    }
    return out
  }

  function request(urlPath, { method = 'GET', headers = {}, body = null } = {}) {
    return new Promise((resolve) => {
      const req = new EventEmitter()
      req.url = urlPath
      req.method = method
      req.headers = normalizarHeaders(headers)

      const resHeaders = {}
      let statusCode = 200
      let chunks = ''

      const res = {
        headersSent: false,
        writeHead(code, hdrs = {}) {
          statusCode = code
          this.headersSent = true
          for (const [k, v] of Object.entries(hdrs)) {
            resHeaders[k.toLowerCase()] = String(v)
          }
        },
        write(chunk) {
          chunks += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
          return true
        },
        end(chunk = '') {
          if (chunk) {
            chunks += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
          }
          resolve({
            status: statusCode,
            headers: { get: (name) => resHeaders[name.toLowerCase()] || null },
            text: async () => chunks,
            json: async () => JSON.parse(chunks)
          })
        }
      }

      httpServer.emit('request', req, res)

      queueMicrotask(() => {
        if (body !== null && body !== undefined) {
          req.emit('data', typeof body === 'string' ? body : JSON.stringify(body))
        }
        req.emit('end')
      })
    })
  }

  function openSse(urlPath, headers = {}) {
    const req = new EventEmitter()
    req.url = urlPath
    req.method = 'GET'
    req.headers = normalizarHeaders(headers)

    const resHeaders = {}
    const events = []
    let buffer = ''

    const res = {
      headersSent: false,
      writeHead(_code, hdrs = {}) {
        this.headersSent = true
        for (const [k, v] of Object.entries(hdrs)) {
          resHeaders[k.toLowerCase()] = String(v)
        }
      },
      write(chunk) {
        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const block of parts) {
          if (block.startsWith('data: ')) {
            events.push(JSON.parse(block.slice(6)))
          }
        }
        return true
      },
      end() {}
    }

    httpServer.emit('request', req, res)

    return {
      headers: { get: (name) => resHeaders[name.toLowerCase()] || null },
      events,
      close: () => req.emit('close')
    }
  }

  return { request, openSse }
}

function iniciarServidorStaging(initialDb) {
  const instanceDir = fs.mkdtempSync(path.join(tempDir, 'srv-'))
  const dbFile = path.join(instanceDir, 'reuni_db.json')
  fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2), 'utf-8')

  const { server, safeWriteDb, dbPath } = createReuniServer({
    dataDir: instanceDir,
    seedDbPath: null,
    enableCloudVault: false,
    syncSeedFile: false
  })

  const client = criarClienteHttpInProcess(server)

  return {
    client,
    dbPath,
    safeWriteDb
  }
}

async function executarSuite() {
  console.log('🧪 Iniciando Suite E2E de Sincronização Multi-Membros REUNI...\n')

  // =========================================================================
  // TESTE 1: Imunidade de bumpDbVersion contra relógio NTP menor que snapshot
  // =========================================================================
  {
    const db = structuredClone(snapshotOutubro) // updatedAt = 1791315585764 (Out/2026)
    const clockServidorNtpMaio = 1778036400000 // Maio/2026 (< Out/2026!)
    bumpDbVersion(db, 0, clockServidorNtpMaio)

    assert.equal(db.revision, 1, 'revision deve iniciar em 1 na primeira escrita')
    assert.ok(
      db.updatedAt > snapshotOutubro.updatedAt,
      `updatedAt (${db.updatedAt}) nunca pode retroceder abaixo de ${snapshotOutubro.updatedAt}`
    )
    console.log('✅ [Teste 1] Monotonicidade garantida sob divergência de relógio (PC Out/Nov vs Servidor NTP Maio).')
  }

  // =========================================================================
  // TESTE 2: Cenário exato da madrugada (Coordenador com Saúde, Monitoria,
  // Bazar, Inventário e Saldos editados no localStorage -> Servidor -> Membros)
  // =========================================================================
  const srv = iniciarServidorStaging(structuredClone(snapshotOutubro))
  try {
    // 2.1 Verifica headers HTTP anti-cache em /api/data e /api/events
    const resDataInicial = await srv.client.request('/api/data', { headers: authHeaders })
    assert.equal(resDataInicial.status, 200)
    assert.match(resDataInicial.headers.get('cache-control') || '', /no-store/i)
    const serverInicial = await resDataInicial.json()

    // Abre conexão SSE real simulando o celular de um Membro da equipe conectado
    const sseConn = srv.client.openSse(`/api/events?token=${encodeURIComponent(TOKEN_TESTE)}`)
    assert.equal(sseConn.headers.get('x-accel-buffering'), 'no')
    assert.equal(sseConn.events.length, 1, 'Conexão SSE deve entregar snapshot inicial imediatamente')

    // 2.2 Estado salvo de madrugada no localStorage do Coordenador (sem _rev/_dirty legado!)
    const estadoLocalMadrugadaCoordenador = extrairColecoes(snapshotOutubro)
    // Adiciona Demanda de Monitoria e Demanda de Saúde novas
    estadoLocalMadrugadaCoordenador.demandas.unshift(
      { id: 'dem_monitoria_madrugada', comissao: 'Monitoria', item: 'Apostilas e Crachás Monitoria', quantidade: 30, custo: 210, status: 'Pendente', data: '2026-11-05' },
      { id: 'dem_saude_madrugada', comissao: 'Saúde', item: 'Insumos Primeiros Socorros', quantidade: 5, custo: 340, status: 'Aprovado', data: '2026-11-05' }
    )
    // Edita demanda já existente no servidor
    estadoLocalMadrugadaCoordenador.demandas = estadoLocalMadrugadaCoordenador.demandas.map(d =>
      d.id === 'demanda_teste_qtd' ? { ...d, comissao: 'Saúde', custo: 480, status: 'Pago' } : d
    )
    // Adiciona itens na Curadoria do Bazar e no Inventário
    estadoLocalMadrugadaCoordenador.bazarItems.unshift({
      id: 'bazar_curadoria_1',
      nome: 'Casaco Vintage Curadoria',
      categoria: 'Vestuário',
      precoAvaliado: 85,
      status: 'Disponível'
    })
    estadoLocalMadrugadaCoordenador.inventarioItems.unshift({
      id: 'inv_madrugada_1',
      item: 'Caixa Organizadora Curadoria Bazar',
      comissao: 'Estrutura',
      quantidade: 4,
      valorEstimadoEconomizado: 160
    })
    // Atualiza Saldos: edita valor de transação existente (1000 -> 1850) + cria nova entrada
    estadoLocalMadrugadaCoordenador.transacoes = estadoLocalMadrugadaCoordenador.transacoes.map(t =>
      t.id === '1789093396693' ? { ...t, valor: 1850, descricao: 'Renova (Saldo Conferido na Madrugada)' } : t
    )
    estadoLocalMadrugadaCoordenador.transacoes.unshift({
      id: 'trans_madrugada_1',
      data: '2026-11-05',
      descricao: 'Arrecadação Extra Monitoria/Bazar',
      tipo: 'Entrada',
      valor: 320,
      categoria: 'Bazar'
    })

    // Reconcilia o navegador do Coordenador contra o servidor ainda em Outubro (rev=0)
    const recCoord = reconcileStateWithServer({
      localState: estadoLocalMadrugadaCoordenador,
      baseState: extrairColecoes(snapshotOutubro),
      baseRevision: 0,
      baseUpdatedAt: snapshotOutubro.updatedAt,
      serverData: serverInicial,
      localTombstones: {},
      hasSyncedV3Before: false
    })

    assert.ok(recCoord.correctiveOps.length > 0, 'Coordenador deve gerar operações corretivas para curar o servidor')

    // Envia operações corretivas ao servidor real via POST /api/mutate
    const mutateRes = await srv.client.request('/api/mutate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ops: recCoord.correctiveOps, minRevision: 0 })
    })
    assert.equal(mutateRes.status, 200)
    const mutateJson = await mutateRes.json()
    assert.equal(mutateJson.success, true)
    assert.equal(mutateJson.revision, 1)

    // Confirma convergência no navegador do Coordenador (2ª passagem pós-ACK)
    const ackCoord = reconcileStateWithServer({
      localState: recCoord.mergedState,
      baseState: extrairColecoes(snapshotOutubro),
      baseRevision: 0,
      baseUpdatedAt: snapshotOutubro.updatedAt,
      serverData: mutateJson.data,
      localTombstones: {},
      hasSyncedV3Before: false
    })
    assert.equal(ackCoord.correctiveOps.length, 0, 'Após ACK do servidor não deve restar nenhuma operação pendente')

    // 2.3 Membro B (que estava com dados antigos de Outubro) sincroniza com o servidor
    const estadoMembroB = extrairColecoes(snapshotOutubro)
    const resDataMembroB = await srv.client.request('/api/data', { headers: authHeaders })
    const serverAtualizado = await resDataMembroB.json()

    const recMembroB = reconcileStateWithServer({
      localState: estadoMembroB,
      baseState: extrairColecoes(snapshotOutubro),
      baseRevision: 0,
      baseUpdatedAt: snapshotOutubro.updatedAt,
      serverData: serverAtualizado,
      localTombstones: {},
      hasSyncedV3Before: false
    })

    assert.equal(recMembroB.correctiveOps.length, 0, 'Membro B sem edições próprias não deve sobrescrever o servidor')
    assert.ok(
      recMembroB.mergedState.demandas.some(d => d.id === 'dem_monitoria_madrugada' && d.comissao === 'Monitoria'),
      'Membro B deve enxergar a nova demanda de Monitoria'
    )
    assert.ok(
      recMembroB.mergedState.demandas.some(d => d.id === 'dem_saude_madrugada' && d.comissao === 'Saúde'),
      'Membro B deve enxergar a nova demanda de Saúde'
    )
    assert.equal(
      recMembroB.mergedState.demandas.find(d => d.id === 'demanda_teste_qtd')?.custo,
      480,
      'Membro B deve enxergar a edição feita em demanda pré-existente'
    )
    assert.equal(
      recMembroB.mergedState.bazarItems.find(b => b.id === 'bazar_curadoria_1')?.precoAvaliado,
      85,
      'Membro B deve enxergar o item adicionado na Curadoria do Bazar'
    )
    assert.equal(
      recMembroB.mergedState.inventarioItems.find(i => i.id === 'inv_madrugada_1')?.quantidade,
      4,
      'Membro B deve enxergar o item adicionado ao Inventário'
    )
    assert.equal(
      recMembroB.mergedState.transacoes.find(t => t.id === '1789093396693')?.valor,
      1850,
      'Membro B deve enxergar o saldo editado na madrugada (1850 e não 1000)'
    )
    assert.ok(
      recMembroB.mergedState.transacoes.some(t => t.id === 'trans_madrugada_1' && t.valor === 320),
      'Membro B deve enxergar a nova transação de saldo criada na madrugada'
    )

    sseConn.close()
    assert.ok(
      sseConn.events.some(p => p.revision === 1 && p.bazarItems?.length === 1),
      'Stream SSE /api/events deve entregar o novo estado em tempo real para membros conectados'
    )

    console.log('✅ [Teste 2] Sincronização completa Coordenador -> Servidor -> Membros (Demandas Saúde/Monitoria, Bazar, Inventário e Saldos) validada!')

    // =========================================================================
    // TESTE 3: Simulação de Hibernação Efêmera do Render (Wipe do Container)
    // Mesmo com o PC do Coordenador desligado, o navegador já sincronizado do
    // Membro B detecta o rollback de revisão e restaura 100% do servidor!
    // =========================================================================
    srv.safeWriteDb(srv.dbPath, structuredClone(snapshotOutubro)) // Reseta disco do servidor para Outubro (rev=0)!
    const serverResetado = await (await srv.client.request('/api/data', { headers: authHeaders })).json()
    assert.equal(serverResetado.bazarItems.length, 0, 'Servidor simulou perda efêmera de disco pós-hibernação')

    const curaPeloMembroB = reconcileStateWithServer({
      localState: recMembroB.cleanBaseCandidate,
      baseState: recMembroB.cleanBaseCandidate,
      baseRevision: recMembroB.nextBaseRevision, // rev #1 já confirmada antes da hibernação
      baseUpdatedAt: serverAtualizado.updatedAt,
      serverData: serverResetado, // voltou para rev #0!
      localTombstones: {},
      hasSyncedV3Before: true
    })

    assert.equal(curaPeloMembroB.serverRolledBack, true, 'Deve detectar rollback de revisão do servidor')
    assert.ok(curaPeloMembroB.correctiveOps.length > 0, 'Deve gerar upsertMany completo de auto-cura')

    const healRes = await srv.client.request('/api/mutate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ops: curaPeloMembroB.correctiveOps, minRevision: recMembroB.nextBaseRevision })
    })
    const healJson = await healRes.json()
    assert.equal(healJson.success, true)
    assert.equal(healJson.revision, 2, 'Revisão do servidor restaurado deve saltar para #2 (> baseRevision #1)')
    assert.equal(healJson.data.transacoes.find(t => t.id === '1789093396693')?.valor, 1850)
    assert.equal(healJson.data.bazarItems.length, 1)
    assert.ok(healJson.data.demandas.some(d => d.id === 'dem_monitoria_madrugada'))

    console.log('✅ [Teste 3] Auto-cura distribuída pós-hibernação do container (incluindo saldos editados) validada!')

    // =========================================================================
    // TESTE 4: Navegador antigo defasado (Membro C sem abrir desde 01/10)
    // NÃO pode sobrescrever os saldos novos do servidor!
    // =========================================================================
    const snapshotAntigoOutubro1 = extrairColecoes(snapshotOutubro)
    const recMembroDefasado = reconcileStateWithServer({
      localState: snapshotAntigoOutubro1,
      baseState: snapshotAntigoOutubro1,
      baseRevision: 0,
      baseUpdatedAt: 1790800000000, // 01/10
      serverData: healJson.data, // rev #2
      localTombstones: {},
      hasSyncedV3Before: false
    })
    assert.equal(recMembroDefasado.correctiveOps.length, 0, 'Membro com cache antigo não deve gerar escrita reversa')
    assert.equal(recMembroDefasado.mergedState.transacoes.find(t => t.id === '1789093396693')?.valor, 1850)
    console.log('✅ [Teste 4] Proteção contra sobrescrita por navegador defasado validada!')

    // =========================================================================
    // TESTE 5: Exclusão por um membro NUNCA é ressuscitada por outro membro
    // =========================================================================
    const delRes = await srv.client.request('/api/mutate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ops: [{ op: 'delete', colecao: 'bazarItems', id: 'bazar_curadoria_1' }]
      })
    })
    const delJson = await delRes.json()
    assert.equal(delJson.data.bazarItems.length, 0)
    assert.ok(delJson.data.deletedIds['bazar_curadoria_1'])

    // Membro B ainda tinha bazar_curadoria_1 em seu estado local antes de receber o evento:
    const recPosDelete = reconcileStateWithServer({
      localState: recMembroB.cleanBaseCandidate,
      baseState: recMembroB.cleanBaseCandidate,
      baseRevision: 2,
      baseUpdatedAt: healJson.data.updatedAt,
      serverData: delJson.data,
      localTombstones: {},
      hasSyncedV3Before: true
    })
    assert.equal(recPosDelete.mergedState.bazarItems.length, 0, 'Item deletado no servidor deve sumir no Membro B')
    assert.equal(recPosDelete.correctiveOps.length, 0, 'Membro B jamais deve re-enviar item que está em server.deletedIds')
    console.log('✅ [Teste 5] Anti-ressurreição entre múltiplos membros (deletedIds + tombstones) validada!')

    // =========================================================================
    // TESTE 6: Idempotência sob retentativas de rede da fila Outbox + Assinatura
    // =========================================================================
    const novaDemanda = markLocalCreated({
      id: 'dem_retry_idemp',
      comissao: 'Monitoria',
      item: 'Kit Pincéis Quadro Branco',
      custo: 75,
      status: 'Pendente'
    })
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      await srv.client.request('/api/mutate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ops: [{ op: 'create', colecao: 'demandas', item: novaDemanda }] })
      })
    }
    const aposRetries = await (await srv.client.request('/api/data', { headers: authHeaders })).json()
    const ocorrencias = aposRetries.demandas.filter(d => d.id === 'dem_retry_idemp')
    assert.equal(ocorrencias.length, 1, 'Retentativas da fila Outbox nunca podem duplicar registros com mesmo ID')

    const editadaLocal = markLocalUpdated(ocorrencias[0], { custo: 95 })
    assert.equal(editadaLocal._dirty, true)
    assert.ok(computeServerSignature(aposRetries).startsWith('r='))
    console.log('✅ [Teste 6] Idempotência de retentativas Outbox (zero duplicatas) validada!')

    // =========================================================================
    // TESTE 7: Hidratação Cloud Vault (mergeCloudSnapshotIntoLocal)
    // =========================================================================
    const containerRecemCriado = structuredClone(snapshotOutubro)
    const { merged: restauradoDaNuvem, changed } = mergeCloudSnapshotIntoLocal(containerRecemCriado, aposRetries)
    assert.equal(changed, true)
    assert.ok(restauradoDaNuvem.demandas.some(d => d.id === 'dem_monitoria_madrugada'))
    assert.equal(restauradoDaNuvem.transacoes.find(t => t.id === '1789093396693')?.valor, 1850)
    assert.equal(restauradoDaNuvem.bazarItems.length, 0, 'Deve respeitar deletedIds remotos do Cloud Vault')
    console.log('✅ [Teste 7] Fusão Cloud Vault na subida de container efêmero validada!')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  // Verificação final de integridade: garante que data/reuni_db.json real não sofreu 1 byte de alteração durante os testes
  const hashDepoisDoTeste = fs.readFileSync(realSnapshotPath, 'utf-8')
  assert.equal(hashDepoisDoTeste, hashAntesDoTeste, 'data/reuni_db.json real deve permanecer 100% intocado pelos testes')

  // Testa também applyOps direto em memória para garantir cobertura unitária de upsertMany sem ping-pong
  const memDb = structuredClone(snapshotOutubro)
  applyOps(memDb, [{ op: 'upsertMany', colecao: 'demandas', items: memDb.demandas }])
  assert.equal(memDb.demandas.length, snapshotOutubro.demandas.length)

  console.log('\n🎉 TODOS OS 7 CENÁRIOS DE SINCRONIZAÇÃO E BLINDAGEM PASSARAM COM 100% DE SUCESSO!')
}

executarSuite().catch(err => {
  console.error('\n❌ FALHA NA SUITE DE SINCRONIZAÇÃO:', err)
  try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch {}
  process.exit(1)
})
