// radar-arrecadacao: ver prompt.md. Só sugere — nunca altera meta/atual de
// uma arrecadação. Todo cálculo é determinístico e testável; nada aqui
// "estima no olho".

const PRECO_IDEAL = 7
const PRECO_LIMITE_ADESAO = 10

function diasEntre(dataA, dataB) {
  const ms = dataB.getTime() - dataA.getTime()
  return ms / (1000 * 60 * 60 * 24)
}

// Aceita "DD/MM/AAAA HH:MM" (formato usado em transacoes.dataHora) ou
// "AAAA-MM-DD". Retorna null se não conseguir interpretar — nunca inventa
// uma data a partir de um formato desconhecido.
function parseData(str) {
  if (!str) return null
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
  if (isoMatch) {
    const [, ano, mes, dia] = isoMatch
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(str)
  if (brMatch) {
    const [, dia, mes, ano] = brMatch
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }
  return null
}

function formatarISO(date) {
  return date.toISOString().split('T')[0]
}

function sugerirPrecificacao(precoMedio) {
  if (precoMedio === null) {
    return { texto: 'Sem vendas suficientes para calcular o preço médio do bilhete.', alerta: null }
  }
  if (precoMedio <= PRECO_IDEAL) {
    return { texto: `Preço médio atual (R$ ${precoMedio.toFixed(2)}) já está na faixa ideal (até R$ ${PRECO_IDEAL.toFixed(2)}) — não precisa mudar.`, alerta: null }
  }
  if (precoMedio <= PRECO_LIMITE_ADESAO) {
    return { texto: `Preço médio atual (R$ ${precoMedio.toFixed(2)}) está acima do ideal (R$ ${PRECO_IDEAL.toFixed(2)}), mas ainda abaixo do patamar que historicamente reduz adesão (R$ ${PRECO_LIMITE_ADESAO.toFixed(2)}). Considere aproximar de R$ ${PRECO_IDEAL.toFixed(2)} se possível.`, alerta: 'preco_acima_ideal' }
  }
  return { texto: `Preço médio atual (R$ ${precoMedio.toFixed(2)}) está acima de R$ ${PRECO_LIMITE_ADESAO.toFixed(2)} — historicamente reduz adesão. Recomenda-se baixar para perto de R$ ${PRECO_IDEAL.toFixed(2)}.`, alerta: 'preco_reduz_adesao' }
}

function gerarCopy(arrecadacao, faltante, atrasada, projecaoISO) {
  const nome = arrecadacao.nome
  const faltanteFmt = `R$ ${faltante.toFixed(2)}`

  if (atrasada === true) {
    return `⏰ Reta final da campanha "${nome}"! Faltam ${faltanteFmt} pra gente bater a meta e o ritmo precisa acelerar. Bora dar aquela força? Cada bilhete conta! 💛`
  }
  if (atrasada === 'indeterminado' && projecaoISO === null) {
    return `📣 A campanha "${nome}" está rolando! Ainda faltam ${faltanteFmt} pra meta — ajuda a gente a chegar lá?`
  }
  return `🎉 "${nome}" está indo bem! Faltam só ${faltanteFmt} pra meta${projecaoISO ? `, no ritmo atual devemos chegar lá até ${projecaoISO}` : ''}. Continue apoiando a REUNI!`
}

export function avaliarCampanha(arrecadacao, vendas = [], prazoFinal = null, hoje = new Date()) {
  const alertas = []
  const meta = Number(arrecadacao.meta)
  const atual = Number(arrecadacao.atual)
  const faltante = Math.max(0, meta - atual)

  const vendasValidas = vendas
    .map(v => ({ ...v, dataParsed: parseData(v.dataHora || v.data) }))
    .filter(v => v.dataParsed !== null)
    .sort((a, b) => a.dataParsed - b.dataParsed)

  let velocidadeReaisDia = 0
  let velocidadeBilhetesDia = 0
  let precoMedio = null

  if (vendasValidas.length === 0) {
    alertas.push('sem_vendas_registradas')
  } else {
    const totalReais = vendasValidas.reduce((s, v) => s + Number(v.valor || 0), 0)
    const totalBilhetes = vendasValidas.reduce((s, v) => s + Number(v.qtdBilhetes || 0), 0)
    const primeiraVenda = vendasValidas[0].dataParsed
    const periodoDias = Math.max(1, diasEntre(primeiraVenda, hoje))

    velocidadeReaisDia = totalReais / periodoDias
    velocidadeBilhetesDia = totalBilhetes / periodoDias
    precoMedio = totalBilhetes > 0 ? totalReais / totalBilhetes : null
  }

  // Projeção de conclusão — nunca uma data chutada sem velocidade real
  let projecaoData = null
  if (velocidadeReaisDia > 0 && faltante > 0) {
    const diasNecessarios = faltante / velocidadeReaisDia
    const dataProjetada = new Date(hoje)
    dataProjetada.setDate(dataProjetada.getDate() + Math.ceil(diasNecessarios))
    projecaoData = formatarISO(dataProjetada)
  } else if (faltante === 0) {
    projecaoData = formatarISO(hoje) // meta já batida
  }

  // Ritmo necessário e atraso — só calculável com prazoFinal
  let ritmoNecessario = null
  let percentualRitmo = null
  let atrasada = 'indeterminado'

  if (prazoFinal) {
    const prazoDate = parseData(prazoFinal)
    if (prazoDate) {
      const diasRestantes = Math.max(0.0001, diasEntre(hoje, prazoDate))
      ritmoNecessario = faltante / diasRestantes
      percentualRitmo = ritmoNecessario > 0 ? (velocidadeReaisDia / ritmoNecessario) * 100 : 100
      atrasada = faltante > 0 && velocidadeReaisDia < ritmoNecessario
      if (atrasada === true) alertas.push('atrasada')
    }
  } else {
    alertas.push('sem_prazo_definido')
  }

  const precificacao = sugerirPrecificacao(precoMedio)
  if (precificacao.alerta) alertas.push(precificacao.alerta)

  const copy = gerarCopy(arrecadacao, faltante, atrasada, projecaoData)

  return {
    arrecadacaoId: arrecadacao.id,
    velocidade_bilhetes_dia: Number(velocidadeBilhetesDia.toFixed(3)),
    velocidade_reais_dia: Number(velocidadeReaisDia.toFixed(2)),
    projecao_data_conclusao: projecaoData,
    ritmo_necessario_reais_dia: ritmoNecessario !== null ? Number(ritmoNecessario.toFixed(2)) : null,
    percentual_do_ritmo: percentualRitmo !== null ? Number(percentualRitmo.toFixed(1)) : null,
    atrasada,
    sugestao_precificacao: precificacao.texto,
    copy_divulgacao: copy,
    alertas
  }
}
