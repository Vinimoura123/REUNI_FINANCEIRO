# radar-editais

## Responsabilidade

Busca editais/oportunidades de fomento parecidos com um edital novo,
usando o histórico do REUNI. **Só sugestão** — nunca decide sozinho
concorrer a um edital. Risco baixo, o blueprint já apontava como última
prioridade de construção.

## Adaptação em relação ao blueprint original

O blueprint (seção 04.3) descreve embeddings + similaridade de cosseno.
Não há modelo de embeddings nem MCP configurado neste projeto — a
adaptação usa **similaridade de texto por sobreposição de palavras**
(Jaccard sobre o conjunto de palavras normalizado), determinística e
testável sem depender de API externa. É uma aproximação mais grosseira
que embeddings de verdade (não captura sinônimo/paráfrase), documentada
como tal — não escondida atrás do nome "similaridade".

## Pré-requisito ainda não satisfeito

Precisa de um **histórico de editais anteriores** pra comparar. Hoje
existe só `EDITAL REUNI 2027.pdf` no projeto — um documento de referência,
não um corpus de editais passados. Sem histórico, `buscarSimilares`
devolve `top_similares: []`, nunca resultados fabricados.

## Saída

```json
{
  "edital_novo": "Edital de Extensão UFBA 2027",
  "top_similares": [
    { "titulo": "Edital de Extensão UFBA 2025", "score": 0.62, "ano": 2025 }
  ]
}
```
