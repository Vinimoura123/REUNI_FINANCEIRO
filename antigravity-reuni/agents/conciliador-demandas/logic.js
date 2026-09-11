// conciliador-demandas: ver prompt.md. Recebe uma demanda que virou "Pago"
// e PROPÕE o lançamento correspondente — nunca escreve. A confiança reflete
// o quanto o custo foi verificado de fato contra um comprovante (3.1), não
// um número fixo.

const TOLERANCIA_VALOR = 0.01 // arredondamento de centavos

function calcularConfianca(custo, extracao) {
  if (!extracao || extracao.valor_extraido === null || extracao.valor_extraido === undefined) {
    // Sem comprovante verificável (não anexado, ou extração não conseguiu
    // ler) — abaixo do limiar de aprovação automática de propósito.
    return 0.6
  }

  const extraido = Number(extracao.valor_extraido)
  const divergiu = Math.abs(custo - extraido) > TOLERANCIA_VALOR

  if (divergiu) {
    // Valor do comprovante não bate com o custo lançado — sinal de alerta
    // real, nunca escondido atrás de uma confiança aceitável.
    return Math.min(0.3, extracao.confianca ?? 0.3)
  }

  // Bate: confiança alta, mas nunca maior que a própria confiança da
  // leitura do comprovante — não inventa mais certeza do que ela permite.
  return Math.min(0.95, extracao.confianca ?? 0.95)
}

export function proporPlano(demanda, extracao = null) {
  const custo = Number(demanda.custo)

  const dados = {
    descricao: `Pagamento Demanda: ${demanda.item} (${demanda.comissao})`,
    tipo: 'Saída',
    valor: custo,
    categoria: demanda.comissao,
    demandaId: demanda.id
  }

  const plano = {
    acao: 'insert',
    tabela: 'transacoes',
    dados,
    confianca: calcularConfianca(custo, extracao)
  }

  if (extracao) {
    plano.extracaoRef = {
      valor_extraido: extracao.valor_extraido,
      confianca_extracao: extracao.confianca
    }
  }

  return plano
}
