import { classificar } from './logic.js'

const frases = [
  'Qual o saldo atual da REUNI?',
  'Marcar a demanda do cabo XLR como pago',
  'Como está a velocidade de venda da rifa do Kindle?',
  'Gera a prestação de contas desse mês',
  'Tem algum edital de fomento novo pra gente concorrer?',
  'Anexei o comprovante da compra, confere pra mim?',
  'Compara o total arrecadado com o relatório da campanha', // ambíguo de propósito
  'Qual a previsão do tempo pra sexta-feira?' // fora do vocabulário
]

for (const frase of frases) {
  console.log(`"${frase}"`)
  console.log(JSON.stringify(classificar(frase)))
  console.log()
}
