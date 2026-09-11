# avaliador-financeiro

## Responsabilidade

Recebe o plano de qualquer sub-agente de escrita (hoje: `conciliador-demandas`)
e decide se ele pode ir para o banco. **É o único ponto do sistema que
autoriza uma write action** — nenhum outro sub-agente grava por conta própria.

## Checagens, nesta ordem

1. **Duplicidade** — já existe uma transação com o mesmo `demandaId`? Se sim,
   bloqueia. Isso cobre o caso de uma demanda ser marcada "Pago" duas vezes
   (ex.: clique duplo, ou alguém desfazendo e refazendo o status).
2. **Confiança** — `plano.confianca < 0.7` nunca aprova sozinho. Vai para
   revisão humana, sem exceção — não existe "quase 0.7, deixa passar".
3. **Divergência de valor** — se o plano trouxe uma referência de extração
   (`extracaoRef`) e o valor dela diverge do valor do plano, bloqueia
   explicitamente (mesmo que, por algum motivo, a confiança calculada não
   tivesse capturado isso — checagem redundante de propósito).
4. **Orçamento da comissão** — se houver dado de orçamento configurado para
   a comissão do plano (`limite` e `gastoAtual`), bloqueia se a aprovação
   estourar o limite. **Hoje o app não tem uma fonte real de orçamento por
   comissão** — quando não há dado configurado, o avaliador não inventa um
   limite: sinaliza `orcamento_nao_configurado` como alerta informativo e
   segue avaliando os outros critérios normalmente (não bloqueia por uma
   informação que não existe).

Só aprova se **nenhuma** das checagens acima bloquear.

## Saída (JSON, schema fixo — ver `schema.json`)

```json
{ "aprovado": true, "justificativa": "...", "alertas": [] }
```

```json
{
  "aprovado": false,
  "justificativa": "Confiança do plano (0.6) abaixo do limiar de 0.7 — revisão humana obrigatória.",
  "alertas": ["confianca_baixa"]
}
```

## Depois de aprovado

Só então o lançamento é de fato escrito — via a mesma operação atômica
`create` do `dbOps.js` (o mesmo caminho usado por `POST /api/mutate`),
**nunca sobrescrevendo o array inteiro de `transacoes`**. Um plano
reprovado nunca chega perto de `dbOps.js`.

## Log

Toda decisão (aprovada ou não) deveria virar uma entrada em
`memory/decisions-log/` (seção 07 do blueprint) — ainda não implementado
nesta etapa; a função `avaliarPlano` já devolve todos os campos necessários
para isso (`aprovado`, `justificativa`, `alertas`, mais o plano e o
timestamp de quando foi chamada).
