// Autoteste com números FICTÍCIOS — valida só se a fórmula não quebra e o
// Markdown sai bem formado. NÃO é o teste com relatório real pedido: não
// existe hoje nenhuma edição fechada da REUNI nem dado transacional real
// no banco para gerar isso de verdade (ver conversa/auditoria).

import { compilarPrestacaoContas, compilarMemoriaCustos, gerarRelatorioMarkdown } from './logic.js'

const transacoesFic = [
  { tipo: 'Entrada', categoria: 'Rifa', valor: 500 },
  { tipo: 'Entrada', categoria: 'Doação', valor: 200 },
  { tipo: 'Saída', categoria: 'Estrutura', valor: 300 },
  { tipo: 'Saída', categoria: 'Comunicação', valor: 100 }
]
const demandasFic = [
  { id: 'd1', item: 'Cabo XLR', comissao: 'Estrutura', custo: 150, status: 'Pago' },
  { id: 'd2', item: 'Impressão de banner', comissao: 'Comunicação', custo: 80, status: 'Pendente' }
]
const inventarioFic = [
  { item: 'Caixa de som (herdada)', valorEstimadoEconomizado: 400 }
]

console.log('=== Sem edição anterior (situação real hoje: nenhuma edição fechada) ===\n')
const prestacao1 = compilarPrestacaoContas('REUNI 2026 (fictício)', { transacoes: transacoesFic, demandas: demandasFic, inventarioItems: inventarioFic }, null)
console.log(JSON.stringify(prestacao1, null, 2))
console.log('\n--- Markdown gerado ---\n')
console.log(gerarRelatorioMarkdown(prestacao1))

console.log('\n\n=== Com uma edição anterior fictícia (só pra validar a fórmula de comparação) ===\n')
const edicaoAnteriorFic = { edicao: 'REUNI 2025 (fictício)', totalGasto: 320, gastoPorComissao: { Estrutura: 200, Comunicação: 120 } }
const prestacao2 = compilarPrestacaoContas('REUNI 2026 (fictício)', { transacoes: transacoesFic, demandas: demandasFic, inventarioItems: inventarioFic }, edicaoAnteriorFic)
console.log(JSON.stringify(prestacao2.comparacaoEdicaoAnterior, null, 2))

console.log('\n=== Memória de custos com histórico fictício de 1 e depois 2 edições ===\n')
console.log('1 edição:', JSON.stringify(compilarMemoriaCustos([edicaoAnteriorFic])))
console.log('2 edições:', JSON.stringify(compilarMemoriaCustos([edicaoAnteriorFic, { edicao: 'REUNI 2024 (fictício)', gastoPorComissao: { Estrutura: 100, Comunicação: 60 } }])))
