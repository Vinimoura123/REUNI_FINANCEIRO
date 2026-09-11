// consulta-financeira: ver prompt.md. Só leitura, nunca estima um valor —
// pergunta fora do que é suportado devolve query:null explicitamente.

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`
}

function dentroDoPeriodo(dataStr, inicio, fim) {
  if (!dataStr) return false
  const d = new Date(dataStr)
  if (inicio && d < new Date(inicio)) return false
  if (fim && d > new Date(fim)) return false
  return true
}

export function saldoAtual(transacoes = []) {
  const totalArrecadado = transacoes.filter(t => t.tipo === 'Entrada').reduce((s, t) => s + Number(t.valor || 0), 0)
  const totalGasto = transacoes.filter(t => t.tipo === 'Saída').reduce((s, t) => s + Number(t.valor || 0), 0)
  const saldo = totalArrecadado - totalGasto
  return {
    query: 'saldoAtual()',
    resultado: { totalArrecadado, totalGasto, saldo },
    resumo_em_texto: `Saldo atual: ${formatarMoeda(saldo)} (arrecadado ${formatarMoeda(totalArrecadado)}, gasto ${formatarMoeda(totalGasto)}).`
  }
}

export function extratoPeriodo(transacoes = [], dataInicio = null, dataFim = null) {
  const filtradas = transacoes.filter(t => dentroDoPeriodo(t.data, dataInicio, dataFim))
  const resumo = filtradas.length === 0
    ? `Nenhuma transação encontrada entre ${dataInicio || 'o início'} e ${dataFim || 'hoje'}.`
    : `${filtradas.length} transação(ões) encontrada(s) entre ${dataInicio || 'o início'} e ${dataFim || 'hoje'}.`
  return {
    query: `extratoPeriodo(inicio=${dataInicio}, fim=${dataFim})`,
    resultado: filtradas,
    resumo_em_texto: resumo
  }
}

export function totalPorCategoria(transacoes = [], tipo = null) {
  const base = tipo ? transacoes.filter(t => t.tipo === tipo) : transacoes
  const grupos = {}
  for (const t of base) {
    const cat = t.categoria || 'Sem categoria'
    grupos[cat] = (grupos[cat] || 0) + Number(t.valor || 0)
  }
  const partes = Object.entries(grupos).map(([cat, v]) => `${cat} ${formatarMoeda(v)}`)
  const resumo = partes.length === 0
    ? `Nenhuma transação${tipo ? ` do tipo ${tipo}` : ''} encontrada.`
    : `Total${tipo ? ` de ${tipo.toLowerCase()}s` : ''} por categoria: ${partes.join(', ')}.`
  return {
    query: `totalPorCategoria(tipo=${tipo || 'todos'})`,
    resultado: grupos,
    resumo_em_texto: resumo
  }
}

export function totalPorPeriodo(transacoes = [], dataInicio = null, dataFim = null) {
  const filtradas = transacoes.filter(t => dentroDoPeriodo(t.data, dataInicio, dataFim))
  const totalArrecadado = filtradas.filter(t => t.tipo === 'Entrada').reduce((s, t) => s + Number(t.valor || 0), 0)
  const totalGasto = filtradas.filter(t => t.tipo === 'Saída').reduce((s, t) => s + Number(t.valor || 0), 0)
  return {
    query: `totalPorPeriodo(inicio=${dataInicio}, fim=${dataFim})`,
    resultado: { totalArrecadado, totalGasto, saldo: totalArrecadado - totalGasto },
    resumo_em_texto: filtradas.length === 0
      ? `Nenhuma transação encontrada entre ${dataInicio || 'o início'} e ${dataFim || 'hoje'}.`
      : `Entre ${dataInicio || 'o início'} e ${dataFim || 'hoje'}: arrecadado ${formatarMoeda(totalArrecadado)}, gasto ${formatarMoeda(totalGasto)}, saldo ${formatarMoeda(totalArrecadado - totalGasto)}.`
  }
}

// Roteamento simples por tipo de pergunta pré-definido — não é interpretação
// de linguagem natural (isso é trabalho do agente-mestre/orquestrador).
export function responder(pergunta, transacoes = []) {
  const { tipo, params = {} } = pergunta || {}

  switch (tipo) {
    case 'saldo':
      return saldoAtual(transacoes)
    case 'extrato':
      return extratoPeriodo(transacoes, params.dataInicio, params.dataFim)
    case 'totalPorCategoria':
      return totalPorCategoria(transacoes, params.tipo)
    case 'totalPorPeriodo':
      return totalPorPeriodo(transacoes, params.dataInicio, params.dataFim)
    default:
      return {
        query: null,
        resultado: null,
        resumo_em_texto: 'Não encontrei uma forma de responder isso com os dados disponíveis.'
      }
  }
}
