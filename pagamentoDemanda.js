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
import { extrairComprovanteViaGemini } from './visaoGemini.js'
import { salvarDocumento } from './armazenamentoDocumentos.js'

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

// Variante que recebe um comprovante (base64) junto do pedido de pagamento:
// salva o arquivo, roda o extrator-comprovante de verdade via Gemini
// (visaoGemini.js) e só então avalia o plano com a extração real. Se a
// extração falhar por qualquer motivo (sem GEMINI_API_KEY, erro de rede,
// resposta inesperada), NUNCA bloqueia o pagamento — cai de volta pro
// comportamento sem comprovante (confiança baixa, revisão humana), com o
// erro registrado em erroExtracao pra quem chamou saber o que aconteceu.
export async function processarPagamentoDemandaComComprovante(db, demandaId, comprovante) {
  const { base64, mimeType, fileName } = comprovante || {}
  let comprovanteUrl = null
  let extracao = null
  let erroExtracao = null

  if (base64) {
    try {
      const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '')
      const buffer = Buffer.from(cleanBase64, 'base64')
      const fileExt = (fileName && fileName.includes('.')) ? fileName.slice(fileName.lastIndexOf('.')) : '.jpg'
      const salvo = salvarDocumento(buffer, fileExt)
      comprovanteUrl = salvo.url

      extracao = await extrairComprovanteViaGemini(cleanBase64, mimeType || 'image/jpeg')
    } catch (err) {
      erroExtracao = err.message
      extracao = null
    }
  }

  const resultado = processarPagamentoDemanda(db, demandaId, extracao)

  // Guarda o comprovante na demanda (auditoria, mesmo se foi pra revisão) e
  // também na transação, se uma foi criada — consistente com o resto do
  // app, onde toda transação pode ter um comprovanteUrl.
  if (comprovanteUrl) {
    applyOps(db, [{ op: 'update', colecao: 'demandas', id: demandaId, fields: { comprovanteUrl } }])
    if (resultado.transacaoCriada) {
      applyOps(db, [{ op: 'update', colecao: 'transacoes', id: resultado.transacaoCriada.id, fields: { comprovanteUrl } }])
      resultado.transacaoCriada.comprovanteUrl = comprovanteUrl
    }
  }

  return { ...resultado, erroExtracao }
}
