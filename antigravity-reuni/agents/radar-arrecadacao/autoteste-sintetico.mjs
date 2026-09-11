// Autoteste com números FICTÍCIOS — valida só se a fórmula não quebra e
// devolve números plausíveis. NÃO é o teste com campanhas reais pedido;
// isso fica em testar-campanhas-reais.mjs, com dado de verdade.

import { avaliarCampanha } from './logic.js'

const hoje = new Date('2026-09-10')

console.log('=== Autoteste sintético (números fictícios, só validação de fórmula) ===\n')

const campanhaNoRitmo = { id: 'fic-1', nome: 'Rifa Fictícia A', tipo: 'Rifa', meta: 1000, atual: 500 }
const vendasNoRitmo = [
  { dataHora: '01/09/2026 10:00', qtdBilhetes: 10, valor: 70 },
  { dataHora: '05/09/2026 10:00', qtdBilhetes: 20, valor: 140 },
  { dataHora: '09/09/2026 10:00', qtdBilhetes: 40, valor: 280 }
]
console.log('--- Campanha fictícia no ritmo (prazo folgado) ---')
console.log(JSON.stringify(avaliarCampanha(campanhaNoRitmo, vendasNoRitmo, '2026-10-10', hoje), null, 2))

const campanhaAtrasadaFic = { id: 'fic-2', nome: 'Rifa Fictícia B', tipo: 'Rifa', meta: 1000, atual: 100 }
const vendasAtrasadaFic = [
  { dataHora: '01/09/2026 10:00', qtdBilhetes: 5, valor: 35 }
]
console.log('\n--- Campanha fictícia atrasada (prazo apertado) ---')
console.log(JSON.stringify(avaliarCampanha(campanhaAtrasadaFic, vendasAtrasadaFic, '2026-09-15', hoje), null, 2))

console.log('\n--- Campanha sem nenhuma venda (caso limite) ---')
console.log(JSON.stringify(avaliarCampanha({ id: 'fic-3', nome: 'Rifa sem vendas', tipo: 'Rifa', meta: 500, atual: 0 }, [], null, hoje), null, 2))
