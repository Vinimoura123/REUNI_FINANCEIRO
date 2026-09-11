# roteador-intencao

## Responsabilidade

Recebe um pedido em linguagem natural e devolve qual sub-agente deve
tratar — sem ferramenta de negócio nenhuma, classificação pura. Parte do
agente-mestre (ver `../../AGENT.md`).

## Limite honesto desta implementação

Classificação de intenção de verdade precisa de um LLM interpretando a
frase. Esta implementação (`logic.js`) é um classificador **por
palavra-chave** — cobre pedidos óbvios e serve de teste real, mas não
substitui uma interpretação de linguagem natural completa. Frases
ambíguas ou fora do vocabulário mapeado caem em `ambiguo` ou
`sub_agente: null`, nunca um chute.

## Saída

```json
{
  "sub_agente": "consulta-financeira" | "conciliador-demandas" | "radar-arrecadacao" | "prestacao-contas" | "radar-editais" | "extrator-comprovante" | null,
  "confianca": 0.0,
  "ambiguo": false,
  "motivo": "..."
}
```

`sub_agente: null` e `ambiguo: true` juntos significam: pergunte ao
usuário, não adivinhe — regra 2 do `AGENT.md`.
