// Teste com editais de exemplo (texto sintético, mas o mecanismo de
// similaridade é testado de verdade). Sem histórico real de editais da
// REUNI no projeto ainda (ver prompt.md) — busca real fica pendente.

import { buscarSimilares, calcularSimilaridade } from './logic.js'

console.log('--- checagem de acentuação (normalização) ---')
console.log('similaridade("edição", "edicao"):', calcularSimilaridade('edição extensão', 'edicao extensao'))

const historico = [
  { titulo: 'Edital de Extensão UFBA 2024', texto: 'Edital de fomento à extensão universitária para projetos estudantis de permanência e acolhimento', ano: 2024 },
  { titulo: 'Edital de Cultura UFBA 2023', texto: 'Edital de apoio a projetos culturais e artísticos da comunidade universitária', ano: 2023 },
  { titulo: 'Edital de Esporte UFBA 2022', texto: 'Edital de incentivo a práticas esportivas e recreativas no campus', ano: 2022 }
]

const editalNovo = 'Edital de fomento à extensão universitária 2027, voltado a projetos de acolhimento e permanência estudantil'

console.log('\n--- buscarSimilares com histórico ---')
console.log(JSON.stringify(buscarSimilares('Edital REUNI 2027', editalNovo, historico), null, 2))

console.log('\n--- buscarSimilares SEM histórico (situação real hoje) ---')
console.log(JSON.stringify(buscarSimilares('Edital REUNI 2027', editalNovo, []), null, 2))
