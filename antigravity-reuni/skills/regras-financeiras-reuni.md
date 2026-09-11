# skill: regras-financeiras-reuni

> Regras extraídas da Bíblia REUNI (`docs/financeiro_extracted.md`),
> compiladas aqui pra consulta de `avaliador-financeiro` e
> `radar-arrecadacao`. Cada regra marca se já está implementada em código
> ou ainda é só referência.

## Precificação de rifa (cap. 6.4)

- Valor máximo recomendado: **R$ 7,00** por bilhete — gera maior
  circulação, menor resistência.
- Acima de **R$ 10,00**: reduz drasticamente a adesão histórica.
- Preferencialmente até **3 rifas simultâneas** por ciclo — a partir da
  4ª, desempenho cai significativamente.
- Rifas com maior apelo histórico: Kindle, Kit Calouro.

✅ Implementado: `radar-arrecadacao/logic.js` (`sugerirPrecificacao`).
❌ Não implementado: limite de 3 rifas simultâneas (nenhum agente verifica
quantas campanhas do tipo Rifa estão ativas ao mesmo tempo).

## Capital prévio e fluxo de caixa (cap. 6.3)

- A maior parte dos gastos ocorre **antes** do evento — depender de
  arrecadação tardia compromete a execução.
- Rifas devem ser lançadas cedo, não vendidas majoritariamente durante o
  evento.

⚠️ Referência apenas — nenhum agente hoje verifica se uma campanha está
"tardia demais" em relação ao cronograma do evento (diferente de
"atrasada em relação à própria meta", que `radar-arrecadacao` já cobre).

## Diversificação de arrecadação (cap. 6.4)

Rifas, doações, parcerias, editais, feirinha, festas, apoios institucionais
— nenhuma fonte única deve sustentar o caixa.

⚠️ Referência apenas — nenhum agente audita concentração de fonte.

## Cotações e compras (citado no blueprint, seção 03)

- Compra/contrato relevante exige no mínimo **5 cotações concorrentes**.

❌ Não implementado — nenhum agente verifica isso hoje. `demandas` não tem
campo pra anexar cotações. Fica registrado como gap real, não silenciado.

## Piso de reserva entre edições (citado no blueprint, seção 03)

- Parte do saldo de cada edição deve ficar reservada pra próxima — não
  zerar caixa.

❌ Não implementado — depende de existir uma edição fechada anterior
(mesmo pré-requisito do `prestacao-contas`), que não existe ainda.

## Segurança e credenciais (blueprint seção 03)

- Credenciais institucionais nunca em prompt de agente ou log.

✅ Implementado: `REUNI_ACCESS_TOKEN` só em variável de ambiente
(`auth.js`).
