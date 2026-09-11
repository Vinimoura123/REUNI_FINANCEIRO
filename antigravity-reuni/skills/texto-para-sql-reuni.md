# skill: texto-para-sql-reuni

> Nome mantido do blueprint original (seção 06) por rastreabilidade, mas
> adaptado: o banco é um arquivo JSON (`data/reuni_db.json`), não SQL. O
> equivalente aqui é o schema das coleções + o mapeamento pergunta→função
> usado por `consulta-financeira`.

## Schema real (as 6 coleções de `data/reuni_db.json`)

### `demandas`
`{ id, item, comissao, custo, quantidade, prioridade, status, observacoes, data }`
`status`: `"Pendente"` | `"Pago"` (outros valores intermediários podem existir,
mas só a transição para `"Pago"` aciona `conciliador-demandas`).

### `arrecadacoes`
`{ id, nome, tipo, meta, atual, status, observacao, prazoFinal? }`
`tipo`: `"Rifa"` | `"Doação"` | `"Parceria"` | `"Edital"` | `"Festa/Evento"` | `"Outros"`.
`prazoFinal` é opcional (`AAAA-MM-DD`) — usado por `radar-arrecadacao`.

### `transacoes`
`{ id, data, descricao, tipo, valor, categoria, comprovanteUrl?, demandaId?, vendedor?, comprador?, ... }`
`tipo`: `"Entrada"` | `"Saída"` (exato, com acento — todo cálculo de total
filtra por essa string literal). `categoria` normalmente é a comissão (nas
saídas) ou o `tipo` da arrecadação (nas entradas). `demandaId` presente só
quando a transação veio de `conciliador-demandas`.

### `bazarItems`
`{ id, nome, categoria, doador, estado, precoAvaliado, status, precoVendido?, comprador?, comprovanteUrl? }`

### `keepNotes`
`{ id, titulo, conteudo, cor, isPinned, tags, checklistItems? }`

### `inventarioItems`
`{ id, item, comissao, quantidade, unidade, estadoConservacao, responsavelGuarda, localArmazenamento, valorEstimadoEconomizado, status, observacoes }`

## Mapeamento pergunta → função (usado por `consulta-financeira`)

| Pergunta típica | Função | Parâmetros |
|---|---|---|
| "Qual o saldo?" | `saldoAtual(transacoes)` | — |
| "Extrato de agosto" | `extratoPeriodo(transacoes, inicio, fim)` | datas |
| "Quanto gastamos por comissão?" | `totalPorCategoria(transacoes, 'Saída')` | tipo |
| "Quanto arrecadamos em setembro?" | `totalPorPeriodo(transacoes, inicio, fim)` | datas |

Pergunta fora desse conjunto → `consulta-financeira` devolve `query: null`,
nunca estima.

## Categorias válidas do plano de contas (Bíblia REUNI cap. 6.4)

Rifas, Doações/Contribuições Solidárias, Parcerias/Apoio Privado ou EJ,
Editais Institucionais (UFBA/Extensão), Festa/Evento Beneficente, Bazar.
