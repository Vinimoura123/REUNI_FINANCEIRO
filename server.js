import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOps, emptyDb, purgeDeleted } from './dbOps.js'
import { isAuthorized } from './auth.js'
import { processarPagamentoDemanda, processarPagamentoDemandaComComprovante } from './pagamentoDemanda.js'
import { salvarDocumento, localizarDocumento, apagarDocumento } from './armazenamentoDocumentos.js'
import {
  resolveStoragePaths,
  hydrateDbFromCloud,
  scheduleCloudBackup,
  getCloudSyncTelemetry
} from './cloudBackup.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

// Rotas que exigem REUNI_ACCESS_TOKEN válido (ver auth.js). O front-end e a
// API sempre rodam na mesma origem (este mesmo processo serve os dois), então
// não existe CORS legítimo a preservar — por isso ele foi removido, não
// restrito a uma allowlist. Chamada servidor-a-servidor (um futuro sub-agente,
// por exemplo) nunca passa por CORS de qualquer forma.
const ROTAS_PROTEGIDAS = [
  { path: '/api/data', method: 'GET' },
  { path: '/api/events', method: 'GET' },
  { path: '/api/mutate', method: 'POST' },
  { path: '/api/documents/upload', method: 'POST' },
  { path: '/api/auth/verify', method: 'POST' },
  { path: '/api/demandas/pagar', method: 'POST' }
]

export function createReuniServer(options = {}) {
  const rootDir = options.rootDir || __dirname
  const defaultPaths = resolveStoragePaths(rootDir)
  const dataDir = options.dataDir ? path.resolve(options.dataDir) : defaultPaths.dataDir
  const dbPath = options.dbPath || path.join(dataDir, 'reuni_db.json')
  const localBackupsDir = options.localBackupsDir || path.join(dataDir, 'backups')
  const localDocsDir = options.localDocsDir || path.join(dataDir, 'comprovantes')
  const seedDbPath = options.seedDbPath !== undefined ? options.seedDbPath : defaultPaths.seedDbPath
  const distDir = options.distDir || path.join(rootDir, 'dist')
  const enableCloudVault = options.enableCloudVault !== false
  const syncSeedFile = options.syncSeedFile !== false

  // Garantir criação das pastas locais da hospedagem
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(localDocsDir)) fs.mkdirSync(localDocsDir, { recursive: true })
  if (!fs.existsSync(localBackupsDir)) fs.mkdirSync(localBackupsDir, { recursive: true })

  // Escrita atômica segura anti-crash: grava primeiro em arquivo temporário e depois renomeia
  const safeWriteDb = (targetPath, data) => {
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tempPath, targetPath)
  }

  // Inicialização com Auto-Recuperação em Cascata (nunca apaga dados existentes)
  const initDb = () => {
    let restored = null

    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') restored = purgeDeleted(parsed)
        }
      } catch {
        console.warn('⚠️ [Auto-Recovery] reuni_db.json principal corrompido, tentando restaurar de backup...')
      }
    }

    // Se o principal não existe ou está corrompido, busca do backup mais recente
    const latestBackup = path.join(localBackupsDir, 'reuni_db_latest.json')
    if (!restored && fs.existsSync(latestBackup)) {
      try {
        const raw = fs.readFileSync(latestBackup, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            const purged = purgeDeleted(parsed)
            safeWriteDb(dbPath, purged)
            console.log('✅ [Auto-Recovery] Restaurado com sucesso de data/backups/reuni_db_latest.json')
            restored = purged
          }
        }
      } catch {}
    }

    // Se ainda não restaurou, busca de reuni_db.seed.json
    if (!restored && seedDbPath && fs.existsSync(seedDbPath)) {
      try {
        const raw = fs.readFileSync(seedDbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            const purged = purgeDeleted(parsed)
            safeWriteDb(dbPath, purged)
            console.log('✅ [Auto-Recovery] Restaurado com sucesso de data/reuni_db.seed.json')
            restored = purged
          }
        }
      } catch {}
    }

    // Se não encontrou nenhum backup prévio, cria a estrutura inicial e guarda no seed
    if (!restored) {
      const initialData = emptyDb()
      safeWriteDb(dbPath, initialData)
      if (syncSeedFile && seedDbPath) {
        safeWriteDb(seedDbPath, initialData)
      }
    }
  }

  initDb()

  let sseClients = []

  // Lê o estado ATUAL do disco com tolerância a falhas e expurga deletados
  const readCurrentDb = () => {
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') return purgeDeleted(parsed)
        }
      } catch {
        console.error('⚠️ [Auto-Recovery] Erro ao ler reuni_db.json, buscando backup...')
      }
    }

    // Fallback para backup latest
    const latestBackup = path.join(localBackupsDir, 'reuni_db_latest.json')
    if (fs.existsSync(latestBackup)) {
      try {
        const raw = fs.readFileSync(latestBackup, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          const purged = purgeDeleted(parsed)
          safeWriteDb(dbPath, purged)
          return purged
        }
      } catch {}
    }

    // Fallback para seed
    if (seedDbPath && fs.existsSync(seedDbPath)) {
      try {
        const raw = fs.readFileSync(seedDbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          const purged = purgeDeleted(parsed)
          safeWriteDb(dbPath, purged)
          return purged
        }
      } catch {}
    }

    return null
  }

  const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`
    sseClients = sseClients.filter(clientRes => {
      try {
        clientRes.write(payload)
        return true
      } catch {
        return false
      }
    })
  }

  // Grava backups versionados e mantém o seed sincronizado
  const syncBackups = (data) => {
    try {
      safeWriteDb(path.join(localBackupsDir, 'reuni_db_latest.json'), data)
      if (syncSeedFile && seedDbPath) {
        safeWriteDb(seedDbPath, data)
      }
      const backupName = `reuni_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const backupFiles = fs.readdirSync(localBackupsDir).filter(f => f.startsWith('reuni_db_backup_'))
      if (backupFiles.length < 50) {
        safeWriteDb(path.join(localBackupsDir, backupName), data)
      }
    } catch (err) {
      console.error('Erro ao gravar backup no servidor:', err.message)
    }
  }

  // Hidratação assíncrona a partir do Cloud Vault na subida do container (ex: pós-hibernação Render)
  if (enableCloudVault) {
    const initialLocal = readCurrentDb() || emptyDb()
    hydrateDbFromCloud(initialLocal).then(({ db: hydratedDb, hydrated }) => {
      if (hydrated && hydratedDb) {
        safeWriteDb(dbPath, hydratedDb)
        syncBackups(hydratedDb)
        broadcast(hydratedDb)
        console.log(`☁️ [Cloud Vault] Estado restaurado da nuvem (rev #${hydratedDb.revision || 0})`)
      }
    })
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://internal')
    const urlPath = parsedUrl.pathname

    const precisaAutorizacao =
      ROTAS_PROTEGIDAS.some(r => r.path === urlPath && r.method === req.method) ||
      (urlPath.startsWith('/api/documents/') && urlPath !== '/api/documents/upload' && (req.method === 'GET' || req.method === 'DELETE'))

    if (precisaAutorizacao && !isAuthorized(req, parsedUrl)) {
      res.writeHead(401, NO_STORE_JSON_HEADERS)
      return res.end(JSON.stringify({ error: 'Não autorizado' }))
    }

    // Endpoint só para a tela de login validar o token na hora (não grava/lê nada)
    if (urlPath === '/api/auth/verify' && req.method === 'POST') {
      res.writeHead(200, NO_STORE_JSON_HEADERS)
      return res.end(JSON.stringify({ ok: true }))
    }

    // API Status & Telemetria do Servidor
    if (urlPath === '/api/system/status' && req.method === 'GET') {
      res.writeHead(200, NO_STORE_JSON_HEADERS)
      let localDocsCount = 0
      try { localDocsCount = fs.readdirSync(localDocsDir).length } catch {}
      const currentData = readCurrentDb() || emptyDb()
      const cloudInfo = getCloudSyncTelemetry(defaultPaths.usingPersistentDisk)

      return res.end(JSON.stringify({
        ssdConnected: false,
        ssdPath: null,
        localDocsCount,
        totalDocuments: localDocsCount,
        status: 'online',
        revision: currentData.revision || 0,
        updatedAt: currentData.updatedAt || 0,
        connectedClients: sseClients.length,
        counts: {
          demandas: (currentData.demandas || []).length,
          arrecadacoes: (currentData.arrecadacoes || []).length,
          transacoes: (currentData.transacoes || []).length,
          bazarItems: (currentData.bazarItems || []).length,
          inventarioItems: (currentData.inventarioItems || []).length,
          keepNotes: (currentData.keepNotes || []).length
        },
        ...cloudInfo,
        storageEngine: 'Armazenamento Centralizado no Servidor + Réplica Distribuída LWW'
      }))
    }

    // API Server-Sent Events (SSE Real-Time Sync) com keepalive anti-timeout de proxy
    if (urlPath === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=UTF-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('retry: 1500\n\n')
      sseClients.push(res)

      const currentData = readCurrentDb()
      if (currentData) {
        res.write(`data: ${JSON.stringify(currentData)}\n\n`)
      }

      const keepAliveTimer = setInterval(() => {
        try {
          res.write(': keepalive\n\n')
        } catch {
          clearInterval(keepAliveTimer)
        }
      }, 20000)
      if (keepAliveTimer.unref) keepAliveTimer.unref()

      req.on('close', () => {
        clearInterval(keepAliveTimer)
        sseClients = sseClients.filter(c => c !== res)
      })
      return
    }

    // API Obter Dados (sempre sem cache HTTP intermediário para nunca entregar snapshot defasado)
    if (urlPath === '/api/data' && req.method === 'GET') {
      const currentData = readCurrentDb() || emptyDb()
      res.writeHead(200, NO_STORE_JSON_HEADERS)
      return res.end(JSON.stringify(currentData))
    }

    // API Mutação atômica (create/createMany/update/upsertMany/delete/deleteMany/replaceAll)
    // Aplicada sempre em cima do estado ATUAL do arquivo, com revisão lógica monotônica
    // imune a divergência de relógio entre dispositivos (ver dbOps.js).
    if (urlPath === '/api/mutate' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const { ops, minRevision } = JSON.parse(body)
          if (!Array.isArray(ops) || ops.length === 0) {
            res.writeHead(400, NO_STORE_JSON_HEADERS)
            return res.end(JSON.stringify({ error: '"ops" precisa ser um array não vazio' }))
          }

          const current = readCurrentDb() || emptyDb()
          applyOps(current, ops, { minRevision })

          // 1. Grava no DB local de forma atômica e segura
          safeWriteDb(dbPath, current)

          // 2. Grava backup local e agenda espelhamento remoto (se habilitado)
          syncBackups(current)
          if (enableCloudVault) scheduleCloudBackup(current)

          // 3. Notifica todos os navegadores conectados em tempo real
          broadcast(current)

          const payload = JSON.stringify({
            success: true,
            revision: current.revision,
            updatedAt: current.updatedAt,
            data: current,
            serverSynced: true
          })

          res.writeHead(200, NO_STORE_JSON_HEADERS)
          res.end(payload)
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(400, NO_STORE_JSON_HEADERS)
          }
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // API Pagamento de demanda — passa pelo gate conciliador-demandas ->
    // avaliador-financeiro antes de criar a transação correspondente.
    // O status "Pago" é sempre gravado; a transação só é criada se aprovada.
    if (urlPath === '/api/demandas/pagar' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        try {
          const { demandaId, extracao, comprovante } = JSON.parse(body)
          if (!demandaId) {
            res.writeHead(400, NO_STORE_JSON_HEADERS)
            return res.end(JSON.stringify({ error: '"demandaId" é obrigatório' }))
          }

          const current = readCurrentDb() || emptyDb()

          // Se veio um comprovante no pedido, roda o extrator-comprovante de
          // verdade (Gemini) antes de avaliar — nunca no cliente, a chave
          // fica só aqui no servidor. Sem comprovante, comportamento igual
          // a antes (extracao explícita ou null).
          const { plano, avaliacao, transacaoCriada, erroExtracao } = comprovante
            ? await processarPagamentoDemandaComComprovante(current, demandaId, comprovante)
            : processarPagamentoDemanda(current, demandaId, extracao || null)

          safeWriteDb(dbPath, current)
          syncBackups(current)
          if (enableCloudVault) scheduleCloudBackup(current)
          broadcast(current)

          const payload = JSON.stringify({
            success: true,
            revision: current.revision,
            updatedAt: current.updatedAt,
            data: current,
            plano,
            avaliacao,
            transacaoCriada,
            erroExtracao: erroExtracao || null
          })

          res.writeHead(200, NO_STORE_JSON_HEADERS)
          res.end(payload)
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(400, NO_STORE_JSON_HEADERS)
          }
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // API Upload de Documentos/PDFs/Imagens
    if (urlPath === '/api/documents/upload' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const { fileName, fileType, base64 } = JSON.parse(body)
          if (!fileName || !base64) {
            res.writeHead(400, NO_STORE_JSON_HEADERS)
            return res.end(JSON.stringify({ error: 'Parâmetros inválidos (fileName e base64 são obrigatórios)' }))
          }

          const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '')
          const buffer = Buffer.from(cleanBase64, 'base64')
          const fileExt = path.extname(fileName) || (fileType?.includes('pdf') ? '.pdf' : '.png')
          const { fileId, url: fileUrl, savedOnSSD } = salvarDocumento(buffer, fileExt)

          const payload = JSON.stringify({
            success: true,
            fileId,
            fileName,
            url: fileUrl,
            size: buffer.length,
            savedOnSSD,
            uploadedAt: new Date().toISOString()
          })

          res.writeHead(200, NO_STORE_JSON_HEADERS)
          res.end(payload)
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, NO_STORE_JSON_HEADERS)
          }
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // API Servir Documentos / PDFs / Fotos
    if (urlPath.startsWith('/api/documents/') && urlPath !== '/api/documents/upload' && req.method === 'GET') {
      const fileId = urlPath.replace('/api/documents/', '')
      const targetPath = localizarDocumento(fileId)

      if (targetPath) {
        const ext = path.extname(targetPath).toLowerCase()
        const contentType = MIME_TYPES[ext] || 'application/octet-stream'
        fs.readFile(targetPath, (err, content) => {
          if (err) {
            res.writeHead(500)
            res.end('Erro ao ler documento')
          } else {
            res.writeHead(200, {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400'
            })
            res.end(content)
          }
        })
        return
      }
      res.writeHead(404, NO_STORE_JSON_HEADERS)
      return res.end(JSON.stringify({ error: 'Documento não encontrado' }))
    }

    // API Apagar Documento — do local e do SSD (quando existir). Quem chama
    // ainda precisa limpar o comprovanteUrl do registro que apontava pra
    // ele via /api/mutate — apagar o arquivo aqui não mexe nesses registros.
    if (urlPath.startsWith('/api/documents/') && urlPath !== '/api/documents/upload' && req.method === 'DELETE') {
      const fileId = urlPath.replace('/api/documents/', '')
      const apagou = apagarDocumento(fileId)
      res.writeHead(apagou ? 200 : 404, NO_STORE_JSON_HEADERS)
      return res.end(JSON.stringify({ success: apagou }))
    }

    // Servir arquivos estáticos da SPA em /dist
    let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath)

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html')
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const cacheHeader = ext === '.html'
      ? 'no-store, no-cache, must-revalidate'
      : (urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500)
        res.end('Erro interno do servidor')
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': cacheHeader
        })
        res.end(content)
      }
    })
  })

  return { server, readCurrentDb, safeWriteDb, dbPath }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename
if (isMainModule) {
  const PORT = process.env.PORT || 3000
  const { server } = createReuniServer()
  server.listen(PORT, () => {
    console.log(`🚀 Servidor REUNI Financeiro rodando 24/7 na porta ${PORT}`)
  })
}
