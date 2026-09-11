# radar-arrecadacao

## Responsabilidade

Acompanha uma campanha de `arrecadacoes` (rifa, doação, feirinha etc.) e as
vendas individuais ligadas a ela (registradas em `transacoes`, por bilhete)
para: calcular velocidade de venda, projetar se a meta vai ser batida,
sugerir precificação e um texto de divulgação, e alertar se a campanha está
atrasada.

**Só sugere — nunca altera `meta` nem `atual` de uma arrecadação.** Toda
saída é recomendação para uma pessoa decidir, nunca um ajuste automático.

## Entrada

- `arrecadacao`: `{ id, nome, tipo, meta, atual, status }`.
- `vendas`: lista das vendas por bilhete dessa campanha (campos usados de
  `transacoes`: `dataHora`, `qtdBilhetes`, `valor`).
- `prazoFinal` (opcional): data-limite da campanha (`AAAA-MM-DD`). **Sem
  isso, o agente não inventa uma data** — a projeção de conclusão ainda é
  calculada (baseada só na velocidade), mas o alerta de atraso vem
  `indeterminado`, nunca um "não, está tudo bem" por suposição.

## Cálculos (determinísticos, nunca estimados "no olho")

- **Velocidade de venda**: total vendido (R$ e bilhetes) dividido pelo
  número de dias entre a primeira venda registrada e hoje. Sem vendas
  registradas, velocidade é `0` — não existe "velocidade estimada".
- **Projeção de conclusão**: `(meta - atual) / velocidade_reais_dia` dias a
  partir de hoje. Se velocidade é `0`, a projeção vem `null`
  (indeterminada), nunca uma data chutada.
- **Ritmo necessário** (só se houver `prazoFinal`): `(meta - atual) /
  dias_restantes_até_o_prazo`. Comparado contra a velocidade atual para
  decidir `atrasada`.
- **Alerta de atraso**: `true` se a velocidade atual for menor que o ritmo
  necessário; `indeterminado` se não houver `prazoFinal` ou não houver
  vendas suficientes para calcular velocidade.

## Sugestão de precificação (regra "Kit Calouro" — Bíblia REUNI cap. 6.4)

Baseado no preço médio por bilhete (`valor total vendido / bilhetes
vendidos`):

| Preço médio atual | Sugestão |
|---|---|
| ≤ R$ 7 | Já está na faixa ideal — não sugere mudança. |
| > R$ 7 e ≤ R$ 10 | Acima do ideal, mas ainda não no patamar que reduz adesão — sugere aproximar de R$ 7 se possível. |
| > R$ 10 | Historicamente reduz adesão — sugestão explícita de baixar para perto de R$ 7. |

## Copy de divulgação

Texto curto sugerido para redes sociais, calibrado pelo estado da campanha
(convidativo se no ritmo; mais urgente, sem soar alarmista, se atrasada).
Sempre uma sugestão — nunca publicado automaticamente.

## Saída

```json
{
  "arrecadacaoId": "...",
  "velocidade_bilhetes_dia": 0.0,
  "velocidade_reais_dia": 0.0,
  "projecao_data_conclusao": "AAAA-MM-DD" | null,
  "ritmo_necessario_reais_dia": 0.0 | null,
  "percentual_do_ritmo": 0.0 | null,
  "atrasada": true | false | "indeterminado",
  "sugestao_precificacao": "...",
  "copy_divulgacao": "...",
  "alertas": []
}
```
