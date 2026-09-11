// radar-editais: ver prompt.md. Similaridade por sobreposição de palavras
// (Jaccard) — aproximação declarada de embeddings reais, não escondida.

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para', 'com', 'em', 'um', 'uma', 'no', 'na'])

function tokenizar(texto) {
  return new Set(
    (texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOPWORDS.has(t))
  )
}

export function calcularSimilaridade(textoA, textoB) {
  const setA = tokenizar(textoA)
  const setB = tokenizar(textoB)
  if (setA.size === 0 || setB.size === 0) return 0

  let intersecao = 0
  for (const palavra of setA) {
    if (setB.has(palavra)) intersecao++
  }
  const uniao = new Set([...setA, ...setB]).size
  return Number((intersecao / uniao).toFixed(2))
}

// historicoEditais: [{ titulo, texto, ano }]. Sem histórico -> lista vazia,
// nunca um resultado fabricado.
export function buscarSimilares(editalNovoTitulo, editalNovoTexto, historicoEditais = [], topN = 3) {
  const candidatos = historicoEditais
    .map(e => ({
      titulo: e.titulo,
      ano: e.ano ?? null,
      score: calcularSimilaridade(editalNovoTexto, e.texto)
    }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)

  return {
    edital_novo: editalNovoTitulo,
    top_similares: candidatos
  }
}
