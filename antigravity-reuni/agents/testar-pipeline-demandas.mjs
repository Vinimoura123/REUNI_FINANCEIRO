// Teste real dos 3 cenários pedidos para conciliador-demandas +
// avaliador-financeiro, rodando contra um arquivo de STAGING separado do
// banco real (data/reuni_db.staging.json) — nunca toca data/reuni_db.json.
//
// Uso: node antigravity-reuni/agents/testar-pipeline-demandas.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyDb } from '../../dbOps.js'
import { proporPlano } from './conciliador-demandas/logic.js'
import { avaliarPlano, aplicarPlanoAprovado } from './avaliador-financeiro/logic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const stagingPath = path.join(__dirname, '..', '..', 'data', 'reuni_db.staging.json')

// Começa sempre do zero pra o teste ser reprodutível
let db = emptyDb()
fs.writeFileSync(stagingPath, JSON.stringify(db, null, 2), 'utf-8')

// Orçamento de teste (fixture — o app real não tem essa fonte de dado ainda,
// ver alerta "orcamento_nao_configurado" nas comissões fora deste mapa)
const ORCAMENTOS_TESTE = {
  Estrutura: { limite: 5000, gastoAtual: 3000 }
}

function rodar(nomeCenario, demanda, extracao) {
  console.log(`\n=== ${nomeCenario} ===`)
  console.log('Demanda:', demanda)
  console.log('Extração (3.1):', extracao)

  const plano = proporPlano(demanda, extracao)
  console.log('\n[conciliador-demandas] plano proposto:')
  console.log(JSON.stringify(plano, null, 2))

  const avaliacao = avaliarPlano(plano, {
    transacoesExistentes: db.transacoes,
    orcamentosPorComissao: ORCAMENTOS_TESTE
  })
  console.log('\n[avaliador-financeiro] decisão:')
  console.log(JSON.stringify(avaliacao, null, 2))

  if (avaliacao.aprovado) {
    const item = aplicarPlanoAprovado(db, plano)
    fs.writeFileSync(stagingPath, JSON.stringify(db, null, 2), 'utf-8')
    console.log('\n>>> GRAVADO no staging:', JSON.stringify(item))
  } else {
    console.log('\n>>> NÃO GRAVADO. Vai para revisão humana.')
  }

  return { plano, avaliacao }
}

// ---------------------------------------------------------------------
// Cenário 1 — comprovante batendo (aprova e grava)
// Extração real reaproveitada do teste do extrator-comprovante (3.1):
// comprovante Pix real, R$ 15,00, confiança 0.97.
// ---------------------------------------------------------------------
const demanda1 = { id: 'demanda-1', item: 'Cabo XLR 10m', comissao: 'Estrutura', custo: 15.00, status: 'Pago' }
const extracao1 = { transacaoId: 'demanda-1', valor_extraido: 15.00, data_extraida: '2026-09-04', fornecedor_extraido: 'Maria Cristina Reis Araujo', confianca: 0.97 }
rodar('Cenário 1: comprovante batendo', demanda1, extracao1)

// ---------------------------------------------------------------------
// Cenário 2 — valor divergente (vai para revisão, não grava)
// Mesma extração real de R$ 15,00, mas o custo lançado na demanda é
// R$ 999,00 — divergência real entre o que foi digitado e o comprovante.
// ---------------------------------------------------------------------
const demanda2 = { id: 'demanda-2', item: 'Projetor Multimídia', comissao: 'Programação', custo: 999.00, status: 'Pago' }
const extracao2 = { transacaoId: 'demanda-2', valor_extraido: 15.00, data_extraida: '2026-09-04', fornecedor_extraido: 'Maria Cristina Reis Araujo', confianca: 0.97 }
rodar('Cenário 2a: valor divergente do comprovante', demanda2, extracao2)

// Sub-caso do mesmo cenário: sem comprovante nenhum anexado
const demanda2b = { id: 'demanda-2b', item: 'Fita Isolante', comissao: 'Estrutura', custo: 25.00, status: 'Pago' }
rodar('Cenário 2b: sem comprovante anexado', demanda2b, null)

// ---------------------------------------------------------------------
// Cenário 3 — mesma demanda marcada "Pago" 2x (rejeita por duplicidade)
// Repropõe o MESMO plano da demanda-1, que já virou transação no Cenário 1.
// ---------------------------------------------------------------------
rodar('Cenário 3: demanda-1 marcada "Pago" de novo (duplicidade)', demanda1, extracao1)

// ---------------------------------------------------------------------
console.log('\n\n=== Estado final do staging (data/reuni_db.staging.json) ===')
console.log(fs.readFileSync(stagingPath, 'utf-8'))
