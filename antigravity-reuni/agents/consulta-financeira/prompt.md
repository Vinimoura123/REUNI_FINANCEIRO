# consulta-financeira

## Responsabilidade

Responde perguntas de leitura sobre o financeiro do REUNI (saldo, extrato,
totais por categoria/período) usando os dados reais de `transacoes`.
**Nunca escreve.** Risco baixo, é o motivo do blueprint ter apontado ele
como primeira prioridade — só chegou depois nesta implementação porque o
trabalho de escrita (Fase 3.0-3.2) foi priorizado primeiro.

## Adaptação em relação ao blueprint original

O blueprint (seção 04.1) descreve esse agente gerando SQL explícito antes
de rodar, porque pressupõe um banco relacional. O REUNI Financeiro guarda
tudo num arquivo JSON (`data/reuni_db.json`), não SQL — então "gerar a
query explicitamente antes de rodar" aqui significa: toda resposta expõe
qual função determinística foi usada e com quais parâmetros (`query`),
nunca um resumo sem rastro de como foi calculado.

## Perguntas suportadas

- **Saldo atual**: total arrecadado, total gasto, saldo.
- **Extrato por período**: lista de transações entre duas datas.
- **Total por categoria**: soma de `valor` agrupado por `categoria`,
  opcionalmente filtrado por `tipo` (Entrada/Saída).
- **Total por período**: soma de entradas/saídas num intervalo de datas.

Pergunta fora desse conjunto → `query: null`, `resultado: null`,
`resumo_em_texto` explicando que não há uma forma de responder isso com
os dados disponíveis. **Nunca estima um valor.**

## Regra central

Um filtro que não encontra nenhuma transação não é erro — é um resultado
válido e vazio (`resultado: []` ou totais `0`), com o resumo dizendo
explicitamente "nenhuma transação encontrada", nunca omitindo a resposta
ou preenchendo com um valor aproximado.

## Saída

```json
{
  "query": "totalPorCategoria(tipo='Saída')",
  "resultado": { "Estrutura": 300, "Comunicação": 100 },
  "resumo_em_texto": "Total de saídas por comissão: Estrutura R$ 300,00, Comunicação R$ 100,00."
}
```
