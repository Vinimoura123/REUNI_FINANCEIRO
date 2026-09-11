// prestacao-contas: ver prompt.md. Só leitura — cruza transacoes + demandas
// + inventarioItems e compila a prestação de contas de uma edição. Compara
// com edição anterior só quando ela existir de verdade; nunca fabrica uma
// comparação ou uma "média histórica" a partir do nada.

function agruparPorChave(lista, chave, valorFn) {
  const grupos = {}
  for (const item of lista) {
    const k = item[chave] || 'Sem categoria'
    grupos[k] = (grupos[k] || 0) + valorFn(item)
  }
  return grupos
}

export function compilarPrestacaoContas(edicao, { transacoes = [], demandas = [], inventarioItems = [] } = {}, edicaoAnterior = null) {
  const entradas = transacoes.filter(t => t.tipo === 'Entrada')
  const saidas = transacoes.filter(t => t.tipo === 'Saída')

  const totalArrecadado = entradas.reduce((s, t) => s + Number(t.valor || 0), 0)
  const totalGasto = saidas.reduce((s, t) => s + Number(t.valor || 0), 0)
  const saldo = totalArrecadado - totalGasto

  const gastoPorComissao = agruparPorChave(saidas, 'categoria', t => Number(t.valor || 0))
  const arrecadadoPorCategoria = agruparPorChave(entradas, 'categoria', t => Number(t.valor || 0))

  const demandasPendentesLista = demandas
    .filter(d => d.status !== 'Pago')
    .map(d => ({ id: d.id, item: d.item, comissao: d.comissao, custo: Number(d.custo || 0) }))
  const totalDemandasPendentes = demandasPendentesLista.reduce((s, d) => s + d.custo, 0)

  const valorTotalEconomizado = inventarioItems.reduce((s, i) => s + Number(i.valorEstimadoEconomizado || 0), 0)

  const prestacao = {
    edicao,
    totalArrecadado,
    totalGasto,
    saldo,
    gastoPorComissao,
    arrecadadoPorCategoria,
    demandasPendentes: demandasPendentesLista,
    totalDemandasPendentes,
    valorTotalEconomizado,
    comparacaoEdicaoAnterior: compararComEdicaoAnterior(
      { edicao, totalGasto, gastoPorComissao },
      edicaoAnterior
    )
  }

  return prestacao
}

// Nunca fabrica uma comparação — sem edição anterior real, devolve
// comparavel:false de forma explícita, não um número aproximado.
export function compararComEdicaoAnterior(atual, edicaoAnterior) {
  if (!edicaoAnterior) {
    return {
      comparavel: false,
      motivo: 'Nenhuma edição fechada anterior disponível para comparar (confirmado: não existe histórico no banco nem em planilha neste projeto).',
      variacaoGastoTotalPercentual: null,
      variacaoPorComissao: null
    }
  }

  const variacaoGastoTotalPercentual = edicaoAnterior.totalGasto > 0
    ? Number((((atual.totalGasto - edicaoAnterior.totalGasto) / edicaoAnterior.totalGasto) * 100).toFixed(1))
    : null

  const variacaoPorComissao = {}
  const comissoes = new Set([
    ...Object.keys(atual.gastoPorComissao || {}),
    ...Object.keys(edicaoAnterior.gastoPorComissao || {})
  ])
  for (const c of comissoes) {
    const anterior = edicaoAnterior.gastoPorComissao?.[c] || 0
    const atualValor = atual.gastoPorComissao?.[c] || 0
    variacaoPorComissao[c] = anterior > 0
      ? Number((((atualValor - anterior) / anterior) * 100).toFixed(1))
      : null // sem base anterior pra essa comissão específica -> não calcula variação
  }

  return {
    comparavel: true,
    motivo: `Comparado com ${edicaoAnterior.edicao}.`,
    variacaoGastoTotalPercentual,
    variacaoPorComissao
  }
}

// Com uma edição só disponível, sinaliza amostraUnica:true — não finge que
// um ponto só é uma média histórica confiável.
export function compilarMemoriaCustos(historicoEdicoes = []) {
  if (historicoEdicoes.length === 0) {
    return { custoMedioPorCategoria: {}, amostraUnica: false, edicoesConsideradas: 0 }
  }

  const somaPorCategoria = {}
  const contagemPorCategoria = {}

  for (const edicao of historicoEdicoes) {
    for (const [categoria, valor] of Object.entries(edicao.gastoPorComissao || {})) {
      somaPorCategoria[categoria] = (somaPorCategoria[categoria] || 0) + valor
      contagemPorCategoria[categoria] = (contagemPorCategoria[categoria] || 0) + 1
    }
  }

  const custoMedioPorCategoria = {}
  for (const categoria of Object.keys(somaPorCategoria)) {
    custoMedioPorCategoria[categoria] = Number((somaPorCategoria[categoria] / contagemPorCategoria[categoria]).toFixed(2))
  }

  return {
    custoMedioPorCategoria,
    amostraUnica: historicoEdicoes.length === 1,
    edicoesConsideradas: historicoEdicoes.length
  }
}

export function gerarRelatorioMarkdown(prestacao) {
  const linhas = []
  linhas.push(`# Prestação de Contas — ${prestacao.edicao}`)
  linhas.push('')
  linhas.push(`Gerado em ${new Date().toLocaleDateString('pt-BR')}.`)
  linhas.push('')
  linhas.push('## Resumo financeiro')
  linhas.push('')
  linhas.push(`- **Total arrecadado:** R$ ${prestacao.totalArrecadado.toFixed(2)}`)
  linhas.push(`- **Total gasto:** R$ ${prestacao.totalGasto.toFixed(2)}`)
  linhas.push(`- **Saldo:** R$ ${prestacao.saldo.toFixed(2)}`)
  linhas.push(`- **Economizado via reaproveitamento de patrimônio:** R$ ${prestacao.valorTotalEconomizado.toFixed(2)}`)
  linhas.push('')

  linhas.push('## Gasto por comissão')
  linhas.push('')
  const comissoes = Object.entries(prestacao.gastoPorComissao)
  if (comissoes.length === 0) {
    linhas.push('_Nenhuma saída registrada._')
  } else {
    linhas.push('| Comissão | Gasto (R$) |')
    linhas.push('|---|---|')
    for (const [comissao, valor] of comissoes) {
      linhas.push(`| ${comissao} | R$ ${valor.toFixed(2)} |`)
    }
  }
  linhas.push('')

  linhas.push('## Demandas pendentes')
  linhas.push('')
  if (prestacao.demandasPendentes.length === 0) {
    linhas.push('_Nenhuma demanda pendente._')
  } else {
    linhas.push('| Item | Comissão | Custo (R$) |')
    linhas.push('|---|---|---|')
    for (const d of prestacao.demandasPendentes) {
      linhas.push(`| ${d.item} | ${d.comissao} | R$ ${d.custo.toFixed(2)} |`)
    }
    linhas.push('')
    linhas.push(`**Total pendente:** R$ ${prestacao.totalDemandasPendentes.toFixed(2)}`)
  }
  linhas.push('')

  linhas.push('## Comparação com edição anterior')
  linhas.push('')
  const comp = prestacao.comparacaoEdicaoAnterior
  if (!comp.comparavel) {
    linhas.push(`_${comp.motivo}_`)
  } else {
    linhas.push(comp.motivo)
    linhas.push('')
    linhas.push(`- Variação do gasto total: ${comp.variacaoGastoTotalPercentual === null ? 'não calculável' : `${comp.variacaoGastoTotalPercentual > 0 ? '+' : ''}${comp.variacaoGastoTotalPercentual}%`}`)
  }
  linhas.push('')

  if (prestacao.memoriaCustos) {
    linhas.push('## Memória de custos histórica')
    linhas.push('')
    if (prestacao.memoriaCustos.edicoesConsideradas === 0) {
      linhas.push('_Sem histórico de edições fechadas ainda._')
    } else {
      if (prestacao.memoriaCustos.amostraUnica) {
        linhas.push('_Baseado em 1 edição só — não é uma média confiável ainda, é só o dado dessa edição._')
        linhas.push('')
      }
      linhas.push('| Categoria | Custo médio histórico (R$) |')
      linhas.push('|---|---|')
      for (const [categoria, valor] of Object.entries(prestacao.memoriaCustos.custoMedioPorCategoria)) {
        linhas.push(`| ${categoria} | R$ ${valor.toFixed(2)} |`)
      }
    }
  }

  return linhas.join('\n')
}
