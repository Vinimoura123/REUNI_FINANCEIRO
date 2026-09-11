// Liga o gate conciliador-demandas -> avaliador-financeiro no fluxo real de
// "demanda vira Pago". Compartilhado entre server.js e vite.config.js
// (mesmo padrão de dbOps.js e auth.js) pra não duplicar a lógica.
//
// O status "Pago" é o fato que a pessoa está declarando — sempre é gravado.
// Só a criação automática da transação correspondente fica condicionada à
// aprovação do avaliador-financeiro. Roda contra o estado ATUAL do banco
// (nunca uma cópia do cliente) pelo mesmo motivo do dbOps.js: evitar
// lost-update e checar duplicidade de verdade.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOps } from './dbOps.js'
import { proporPlano } from './antigravity-reuni/agents/conciliador-demandas/logic.js'
import { avaliarPlano, aplicarPlanoAprovado } from './antigravity-reuni/agents/avaliador-financeiro/logic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const decisionsLogDir = path.join(__dirname, 'antigravity-reuni', 'memory', 'decisions-log')
const decisionsLogPath = path.join(decisionsLogDir, 'log.jsonl')

// Log estruturado de toda decisão do avaliador-financeiro (seção 02/07 do
// blueprint) — um agente só, roda só server-side (nunca importado por
// código de navegador), por isso pode usar fs diretamente aqui.
function registrarDecisao(entrada) {
  try {
    if (!fs.existsSync(decisionsLogDir)) fs.mkdirSync(decisionsLogDir, { recursive: true })
    fs.appendFileSync(decisionsLogPath, JSON.stringify(entrada) + '\n', 'utf-8')
  } catch (err) {
    // Nunca deixa uma falha de log quebrar o pagamento em si.
    console.error('Erro ao gravar decisions-log:', err.message)
  }
}

export function processarPagamentoDemanda(db, demandaId, extracao = null, orcamentosPorComissao = null) {
  const demanda = (db.demandas || []).find(d => d.id === demandaId)
  if (!demanda) {
    throw new Error(`Demanda ${demandaId} não encontrada`)
  }

  const plano = proporPlano(demanda, extracao)
  const avaliacao = avaliarPlano(plano, {
    transacoesExistentes: db.transacoes || [],
    orcamentosPorComissao
  })

  applyOps(db, [{ op: 'update', colecao: 'demandas', id: demandaId, fields: { status: 'Pago' } }])

  let transacaoCriada = null
  if (avaliacao.aprovado) {
    transacaoCriada = aplicarPlanoAprovado(db, plano)
  }

  db.updatedAt = Date.now()

  registrarDecisao({
    timestamp: new Date().toISOString(),
    subAgente: 'avaliador-financeiro',
    demandaId,
    plano,
    avaliacao,
    transacaoCriadaId: transacaoCriada?.id ?? null
  })

  return { plano, avaliacao, transacaoCriada }
}
