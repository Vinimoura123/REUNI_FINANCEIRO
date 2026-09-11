// Liga o gate conciliador-demandas -> avaliador-financeiro no fluxo real de
// "demanda vira Pago". Compartilhado entre server.js e vite.config.js
// (mesmo padrão de dbOps.js e auth.js) pra não duplicar a lógica.
//
// O status "Pago" é o fato que a pessoa está declarando — sempre é gravado.
// Só a criação automática da transação correspondente fica condicionada à
// aprovação do avaliador-financeiro. Roda contra o estado ATUAL do banco
// (nunca uma cópia do cliente) pelo mesmo motivo do dbOps.js: evitar
// lost-update e checar duplicidade de verdade.

import { applyOps } from './dbOps.js'
import { proporPlano } from './antigravity-reuni/agents/conciliador-demandas/logic.js'
import { avaliarPlano, aplicarPlanoAprovado } from './antigravity-reuni/agents/avaliador-financeiro/logic.js'

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

  return { plano, avaliacao, transacaoCriada }
}
