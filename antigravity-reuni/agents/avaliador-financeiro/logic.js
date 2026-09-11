// avaliador-financeiro: ver prompt.md. Único ponto que autoriza uma write
// action de verdade — nenhum outro sub-agente grava por conta própria.

import { applyOps } from '../../../dbOps.js'

const LIMIAR_CONFIANCA = 0.7
const TOLERANCIA_VALOR = 0.01

export function avaliarPlano(plano, contexto = {}) {
  const { transacoesExistentes = [], orcamentosPorComissao = null } = contexto
  const alertas = []

  // 1. Duplicidade
  const demandaId = plano.dados?.demandaId
  const jaExiste = Boolean(demandaId) && transacoesExistentes.some(t => t.demandaId === demandaId)
  if (jaExiste) alertas.push('duplicidade')

  // 2. Confiança
  const confiancaBaixa = (plano.confianca ?? 0) < LIMIAR_CONFIANCA
  if (confiancaBaixa) alertas.push('confianca_baixa')

  // 3. Divergência de valor (checagem redundante e explícita, além da
  // confiança já ter caído no conciliador-demandas quando isso acontece)
  let valorDivergente = false
  if (plano.extracaoRef && plano.extracaoRef.valor_extraido !== null && plano.extracaoRef.valor_extraido !== undefined) {
    const diff = Math.abs(Number(plano.dados.valor) - Number(plano.extracaoRef.valor_extraido))
    valorDivergente = diff > TOLERANCIA_VALOR
    if (valorDivergente) alertas.push('valor_divergente')
  }

  // 4. Orçamento da comissão (só checa se houver dado real configurado —
  // nunca inventa um limite que o app não tem hoje)
  let orcamentoEstourado = false
  const comissao = plano.dados?.categoria
  if (orcamentosPorComissao && comissao && orcamentosPorComissao[comissao]) {
    const { limite, gastoAtual = 0 } = orcamentosPorComissao[comissao]
    if (gastoAtual + Number(plano.dados.valor) > limite) {
      orcamentoEstourado = true
      alertas.push('orcamento_estourado')
    }
  } else if (comissao) {
    alertas.push('orcamento_nao_configurado')
  }

  const aprovado = !jaExiste && !confiancaBaixa && !valorDivergente && !orcamentoEstourado

  let justificativa
  if (jaExiste) {
    justificativa = `Já existe uma transação registrada para a demanda ${demandaId} — bloqueado por duplicidade.`
  } else if (confiancaBaixa) {
    justificativa = `Confiança do plano (${plano.confianca}) abaixo do limiar de ${LIMIAR_CONFIANCA} — revisão humana obrigatória.`
  } else if (valorDivergente) {
    justificativa = `Valor do plano (R$ ${plano.dados.valor}) diverge do comprovante extraído (R$ ${plano.extracaoRef.valor_extraido}) — revisão humana obrigatória.`
  } else if (orcamentoEstourado) {
    justificativa = `Aprovação excederia o orçamento configurado para a comissão "${comissao}".`
  } else {
    justificativa = 'Plano aprovado: sem duplicidade, confiança suficiente, valor confere' +
      (orcamentosPorComissao && comissao && orcamentosPorComissao[comissao] ? ', dentro do orçamento.' : ' (orçamento da comissão não configurado).')
  }

  return { aprovado, justificativa, alertas }
}

// Só chamado depois de aprovado === true. Nunca sobrescreve o array
// inteiro — usa a mesma operação atômica 'create' do dbOps.js, o mesmo
// caminho usado por POST /api/mutate.
export function aplicarPlanoAprovado(db, plano) {
  const item = {
    id: Date.now().toString(),
    data: new Date().toISOString().split('T')[0],
    ...plano.dados
  }
  applyOps(db, [{ op: 'create', colecao: 'transacoes', item }])
  db.updatedAt = Date.now()
  return item
}
