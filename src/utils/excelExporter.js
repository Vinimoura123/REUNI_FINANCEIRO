import * as XLSX from 'xlsx'

// Utilitário de formatação de valores em Reais (R$)
const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Calcular largura automática de colunas para encaixe perfeito sem cortes
const getColumnWidths = (rows, headers) => {
  return headers.map((header) => {
    let maxLen = String(header.label || header.key).length
    rows.forEach((row) => {
      const cellVal = row[header.key] !== undefined && row[header.key] !== null ? String(row[header.key]) : ''
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length
      }
    })
    return { wch: Math.max(maxLen + 4, 12) }
  })
}

/**
 * Exporta todo o ecossistema do REUNI Financeiro 2026 em uma planilha Excel (.xlsx) profissional
 * com múltiplas abas organizadas por categoria, comissão e módulo.
 */
export function exportToExcel({ demandas = [], arrecadacoes = [], transacoes = [], bazarItems = [], inventarioItems = [], keepNotes = [] }) {
  const wb = XLSX.utils.book_new()

  // -------------------------------------------------------------
  // 1. ABA RESUMO EXECUTIVO
  // -------------------------------------------------------------
  const totalArrecadado = transacoes.filter(t => t.tipo === 'Entrada').reduce((sum, t) => sum + Number(t.valor), 0)
  const totalGastos = transacoes.filter(t => t.tipo === 'Saída').reduce((sum, t) => sum + Number(t.valor), 0)
  const saldoAtual = totalArrecadado - totalGastos
  const totalDemandasPrevistas = demandas.reduce((sum, d) => sum + Number(d.custo), 0)

  // Agrupar demandas por comissão
  const comissoesMap = {}
  demandas.forEach(d => {
    const com = d.comissao || 'Geral'
    if (!comissoesMap[com]) {
      comissoesMap[com] = { comissao: com, qteDemandas: 0, custoTotal: 0, inegociaveis: 0, pago: 0, pendente: 0 }
    }
    comissoesMap[com].qteDemandas += 1
    comissoesMap[com].custoTotal += Number(d.custo || 0)
    if (d.prioridade === 'Inegociável') comissoesMap[com].inegociaveis += 1
    if (d.status === 'Pago') comissoesMap[com].pago += Number(d.custo || 0)
    else comissoesMap[com].pendente += Number(d.custo || 0)
  })

  const resumoComissoesRows = Object.values(comissoesMap).map(c => ({
    'Comissão': c.comissao,
    'Qte Demandas': c.qteDemandas,
    'Custo Total (R$)': `R$ ${formatCurrency(c.custoTotal)}`,
    'Essenciais (Inegociáveis)': c.inegociaveis,
    'Total Pago (R$)': `R$ ${formatCurrency(c.pago)}`,
    'Pendente (R$)': `R$ ${formatCurrency(c.pendente)}`
  }))

  const resumoRows = [
    { 'Métrica Geral': 'Saldo Atual em Caixa', 'Valor (R$)': `R$ ${formatCurrency(saldoAtual)}`, 'Observação': 'Entradas liquidadas - Saídas efetuadas' },
    { 'Métrica Geral': 'Total Arrecadado', 'Valor (R$)': `R$ ${formatCurrency(totalArrecadado)}`, 'Observação': 'Receitas de Rifas, Bazar, Doações e Comissões' },
    { 'Métrica Geral': 'Total Pago (Despesas)', 'Valor (R$)': `R$ ${formatCurrency(totalGastos)}`, 'Observação': 'Saídas efetuadas do caixa' },
    { 'Métrica Geral': 'Demandas Totais Previstas', 'Valor (R$)': `R$ ${formatCurrency(totalDemandasPrevistas)}`, 'Observação': 'Soma das demandas de todas as comissões' },
    { 'Métrica Geral': 'Diferença (Saldo x Demandas)', 'Valor (R$)': `R$ ${formatCurrency(saldoAtual - totalDemandasPrevistas)}`, 'Observação': saldoAtual >= totalDemandasPrevistas ? 'Superávit Garantido' : 'Necessita Arrecadação Complementar' }
  ]

  const wsResumo = XLSX.utils.json_to_sheet(resumoRows)
  XLSX.utils.sheet_add_aoa(wsResumo, [['']], { origin: -1 })
  XLSX.utils.sheet_add_json(wsResumo, resumoComissoesRows, { origin: -1 })

  wsResumo['!cols'] = [
    { wch: 32 },
    { wch: 24 },
    { wch: 45 }
  ]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo')

  // -------------------------------------------------------------
  // 2. ABA DEMANDAS POR COMISSÃO
  // -------------------------------------------------------------
  // Ordenar por comissão -> prioridade -> custo
  const demandasOrdenadas = [...demandas].sort((a, b) => {
    if (a.comissao !== b.comissao) return (a.comissao || '').localeCompare(b.comissao || '')
    const prioridadeOrder = { 'Inegociável': 1, 'Alta': 2, 'Média': 3, 'Baixa': 4 }
    return (prioridadeOrder[a.prioridade] || 5) - (prioridadeOrder[b.prioridade] || 5)
  })

  const demandasRows = demandasOrdenadas.map((d, index) => {
    const isSemCusto = d.semCusto || Number(d.custo) === 0
    const rotuloCusto = isSemCusto ? (d.tipoSemCusto || 'A Definir') : `R$ ${formatCurrency(d.custo)}`
    return {
      'Nº': index + 1,
      'Comissão': d.comissao || 'Geral',
      'Nome do Item': d.item,
      'Detalhamento / Especificações': d.detalhamento || d.observacoes || '-',
      'Custo Estimado': rotuloCusto,
      'Prioridade': d.prioridade,
      'Prazo Limite': d.prazoData ? (d.prazoHora ? `${d.prazoData} ${d.prazoHora}` : d.prazoData) : 'Sem prazo',
      'Status': d.status || 'Pendente'
    }
  })

  const wsDemandas = XLSX.utils.json_to_sheet(demandasRows)
  wsDemandas['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 35 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 30 }
  ]
  XLSX.utils.book_append_sheet(wb, wsDemandas, 'Demandas por Comissão')

  // -------------------------------------------------------------
  // 3. ABA GESTÃO DE CAIXA & MOVIMENTAÇÕES
  // -------------------------------------------------------------
  const transacoesRows = transacoes.map((t, index) => ({
    'Nº': index + 1,
    'Data': t.data,
    'Descrição da Movimentação': t.descricao,
    'Tipo': t.tipo,
    'Categoria / Comissão': t.categoria,
    'Valor (R$)': `${t.tipo === 'Entrada' ? '+' : '-'} R$ ${formatCurrency(t.valor)}`,
    'Possui Comprovante': t.comprovanteUrl ? 'Sim (Anexado)' : 'Não'
  }))

  const wsTransacoes = XLSX.utils.json_to_sheet(transacoesRows)
  wsTransacoes['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 }
  ]
  XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Gestão de Caixa')

  // -------------------------------------------------------------
  // 4. ABA ARRECADAÇÃO ESTRATÉGICA
  // -------------------------------------------------------------
  const arrecadacaoRows = arrecadacoes.map((a, index) => {
    const meta = Number(a.meta || 0)
    const atual = Number(a.atual || 0)
    const pct = meta > 0 ? ((atual / meta) * 100).toFixed(1) : '0.0'
    return {
      'Nº': index + 1,
      'Ação / Nome': a.nome,
      'Tipo de Captação': a.tipo,
      'Meta Prevista (R$)': `R$ ${formatCurrency(meta)}`,
      'Arrecadado (R$)': `R$ ${formatCurrency(atual)}`,
      'Progresso (%)': `${pct}%`,
      'Status': a.status || (atual >= meta ? 'Concluída' : 'Em Andamento')
    }
  })

  const wsArrecadacao = XLSX.utils.json_to_sheet(arrecadacaoRows)
  wsArrecadacao['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(wb, wsArrecadacao, 'Arrecadação Estratégica')

  // -------------------------------------------------------------
  // 5. ABA CURADORIA DO BAZAR
  // -------------------------------------------------------------
  const bazarRows = bazarItems.map((b, index) => ({
    'Nº': index + 1,
    'Item do Acervo': b.nome,
    'Categoria': b.categoria,
    'Preço Avaliado (R$)': `R$ ${formatCurrency(b.precoAvaliado)}`,
    'Status': b.status || 'Em Avaliação',
    'Preço Vendido (R$)': b.precoVendido ? `R$ ${formatCurrency(b.precoVendido)}` : '-',
    'Comprador': b.comprador || '-'
  }))

  const wsBazar = XLSX.utils.json_to_sheet(bazarRows)
  wsBazar['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 25 }
  ]
  XLSX.utils.book_append_sheet(wb, wsBazar, 'Curadoria Bazar')

  // -------------------------------------------------------------
  // 6. ABA INVENTÁRIO & PATRIMÔNIO ACUMULADO
  // -------------------------------------------------------------
  const inventarioRows = inventarioItems.map((inv, index) => ({
    'Nº': index + 1,
    'Material / Equipamento': inv.item,
    'Comissão / Guarda': inv.comissao,
    'Quantidade': inv.quantidade || 1,
    'Estado de Conservação': inv.estadoConservacao,
    'Valor Economizado (R$)': `R$ ${formatCurrency(inv.valorEstimadoEconomizado)}`,
    'Responsável pela Guarda': inv.responsavelGuarda || '-'
  }))

  const wsInventario = XLSX.utils.json_to_sheet(inventarioRows)
  wsInventario['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 20 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 }
  ]
  XLSX.utils.book_append_sheet(wb, wsInventario, 'Inventário & Patrimônio')

  // Gerar arquivo e iniciar download no navegador
  const fileName = `REUNI_Financeiro_2026_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * Exporta dados em formato CSV limpo com codificação UTF-8 (BOM \uFEFF)
 * para abertura direta no Microsoft Excel sem erros de acentuação.
 */
export function exportToCSV(data, fileNamePrefix = 'REUNI_Financeiro') {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = []
  csvRows.push(headers.join(';'))

  data.forEach((row) => {
    const values = headers.map((header) => {
      const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : ''
      const escaped = val.replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(';'))
  })

  const csvContent = '\uFEFF' + csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
