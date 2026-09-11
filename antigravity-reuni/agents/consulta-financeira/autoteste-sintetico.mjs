// Autoteste com números FICTÍCIOS. Não é o teste com dado real — o banco
// real (data/reuni_db.json) continua sem transações registradas hoje.

import { responder } from './logic.js'

const transacoesFic = [
  { data: '2026-08-01', tipo: 'Entrada', categoria: 'Rifa', valor: 500 },
  { data: '2026-08-15', tipo: 'Entrada', categoria: 'Doação', valor: 200 },
  { data: '2026-08-20', tipo: 'Saída', categoria: 'Estrutura', valor: 300 },
  { data: '2026-09-01', tipo: 'Saída', categoria: 'Comunicação', valor: 100 }
]

console.log('--- saldo ---')
console.log(JSON.stringify(responder({ tipo: 'saldo' }, transacoesFic), null, 2))

console.log('\n--- extrato agosto ---')
console.log(JSON.stringify(responder({ tipo: 'extrato', params: { dataInicio: '2026-08-01', dataFim: '2026-08-31' } }, transacoesFic), null, 2))

console.log('\n--- total por categoria (saídas) ---')
console.log(JSON.stringify(responder({ tipo: 'totalPorCategoria', params: { tipo: 'Saída' } }, transacoesFic), null, 2))

console.log('\n--- período sem nenhuma transação (caso vazio, não deve inventar) ---')
console.log(JSON.stringify(responder({ tipo: 'extrato', params: { dataInicio: '2020-01-01', dataFim: '2020-01-31' } }, transacoesFic), null, 2))

console.log('\n--- pergunta não suportada ---')
console.log(JSON.stringify(responder({ tipo: 'previsao_do_tempo' }, transacoesFic), null, 2))
