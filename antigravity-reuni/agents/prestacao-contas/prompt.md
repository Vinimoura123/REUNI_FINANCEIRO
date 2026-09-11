# prestacao-contas

## Responsabilidade

Cruza `transacoes` + `demandas` + `inventarioItems` (campo
`valorEstimadoEconomizado`) de uma edição da REUNI e gera a prestação de
contas: resumo financeiro, gasto por comissão, demandas pendentes,
economia por reaproveitamento de patrimônio. Quando existir pelo menos uma
edição anterior fechada, compara custo entre edições e alimenta a memória
de custos histórica.

**Só leitura.** Não altera nenhum dado — nem `transacoes`, nem `demandas`,
nem `inventarioItems`, nem o resultado de uma edição anterior.

## Pré-requisito explícito (do próprio pedido)

> "Construir só depois de existir ao menos uma edição fechada pra comparar."

A comparação entre edições **não é fabricável** — sem uma edição anterior
de verdade, este agente nunca inventa uma. Por isso a função de comparação
sempre aceita "sem edição anterior" como resultado válido e explícito
(`comparavel: false`), nunca um número aproximado.

## Entrada

- `edicao`: identificador da edição atual (ex.: `"REUNI 2026"`).
- `transacoes`, `demandas`, `inventarioItems`: os arrays reais dessas
  coleções para a edição atual.
- `edicaoAnterior` (opcional): a prestação de contas já compilada de uma
  edição fechada anterior, no mesmo formato de saída deste agente. `null`
  quando não existe (situação atual do REUNI Financeiro — confirmado na
  auditoria: nenhuma edição fechada, nenhum histórico em planilha ou
  banco).
- `historicoEdicoes` (opcional): lista de prestações de contas de edições
  fechadas anteriores, para compilar a memória de custos por categoria.

## Cálculos (determinísticos)

- `totalArrecadado` / `totalGasto` / `saldo` — mesma lógica já usada em
  `FinanceContext.jsx` (`tipo === 'Entrada' | 'Saída'`).
- `gastoPorComissao` / `arrecadadoPorCategoria` — agrupamento de
  `transacoes` por `categoria`.
- `demandasPendentes` — `demandas` com `status !== 'Pago'`, com custo
  total pendente.
- `valorTotalEconomizado` — soma de `inventarioItems[].valorEstimadoEconomizado`
  (reaproveitamento que evitou gasto novo).
- `compararComEdicaoAnterior` — variação percentual de gasto total e por
  comissão. Sem `edicaoAnterior`, devolve `{ comparavel: false, motivo: "..." }`.
- `compilarMemoriaCustos` — custo médio histórico por categoria entre as
  edições de `historicoEdicoes`. Com uma edição só disponível, sinaliza
  `amostraUnica: true` — não finge que uma média de um ponto só é uma
  média confiável.

## Saída

Relatório estruturado (ver `schema.json`) + uma versão em Markdown
(`gerarRelatorioMarkdown`), pronta para virar PDF depois (fora do escopo
desta etapa) ou complementar a aba "Resumo Executivo" que já existe em
`src/utils/excelExporter.js`.

> Nota: ao implementar, notei que `excelExporter.js` já referencia campos
> que não existem no schema real usado em `FinanceContext.jsx` (ex.:
> `inv.valorEstimado` em vez de `valorEstimadoEconomizado`, `a.arrecadado`
> em vez de `atual`, `b.preco` em vez de `precoAvaliado`) — não mexi nisso
> aqui por estar fora do que foi pedido, só registrando o achado.
