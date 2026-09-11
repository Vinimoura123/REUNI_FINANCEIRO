// roteador-intencao: ver prompt.md. Classificador por palavra-chave — não
// substitui interpretação de linguagem natural real por LLM. Sem match
// nenhum ou empate entre dois agentes -> nunca chuta, devolve null/ambíguo.

const PALAVRAS_CHAVE = {
  'consulta-financeira': ['saldo', 'extrato', 'quanto temos', 'quanto arrecadamos', 'quanto gastamos', 'total de'],
  'conciliador-demandas': ['como pago', 'demanda paga', 'pagar demanda', 'lançar pagamento'],
  'radar-arrecadacao': ['rifa', 'campanha', 'velocidade de venda', 'meta da campanha', 'bilhete'],
  'prestacao-contas': ['prestação de contas', 'relatório', 'memória de custos', 'comparar edição'],
  'radar-editais': ['edital', 'fomento', 'oportunidade institucional'],
  'extrator-comprovante': ['comprovante', 'recibo', 'nota fiscal']
}

export function classificar(pergunta) {
  const texto = (pergunta || '').toLowerCase()

  const pontuacoes = Object.entries(PALAVRAS_CHAVE).map(([agente, palavras]) => {
    const matches = palavras.filter(p => texto.includes(p))
    return { agente, score: matches.length, matches }
  }).filter(p => p.score > 0)

  if (pontuacoes.length === 0) {
    return {
      sub_agente: null,
      confianca: 0,
      ambiguo: false,
      motivo: 'Nenhuma palavra-chave reconhecida — fora do vocabulário mapeado deste classificador simples.'
    }
  }

  pontuacoes.sort((a, b) => b.score - a.score)
  const empateNoTopo = pontuacoes.length > 1 && pontuacoes[0].score === pontuacoes[1].score

  if (empateNoTopo) {
    return {
      sub_agente: null,
      confianca: 0.5,
      ambiguo: true,
      motivo: `Pedido ambíguo entre ${pontuacoes[0].agente} e ${pontuacoes[1].agente} — pergunte ao usuário em vez de adivinhar.`
    }
  }

  const vencedor = pontuacoes[0]
  return {
    sub_agente: vencedor.agente,
    confianca: Math.min(0.9, 0.5 + vencedor.score * 0.2),
    ambiguo: false,
    motivo: `Reconheci: "${vencedor.matches.join(', ')}".`
  }
}
