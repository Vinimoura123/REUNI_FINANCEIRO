# Diretrizes — REUNI Financeiro

> Seções 02-03 do blueprint, com o status real de cada regra nesta
> implementação (o que já vale de verdade vs. o que ainda é aspiracional).

## Gerais (todos os agentes)

- **Saída sempre estruturada** quando alimenta outro passo — todo agente
  construído devolve JSON com schema fixo (`schema.json` de cada um).
  ✅ Implementado.
- **Nunca inventar dado financeiro** — todo agente que lê comprovante ou
  calcula projeção devolve `null`/confiança baixa em vez de estimar.
  ✅ Implementado em `extrator-comprovante`, `conciliador-demandas`,
  `radar-arrecadacao`, `consulta-financeira`.
- **Confiança explícita** em toda classificação. ✅ Implementado
  (`extrator-comprovante`, `conciliador-demandas`).
- **Write actions sempre atrás de um gate** — nenhum sub-agente grava sem
  passar pelo `avaliador-financeiro`. ✅ Implementado e ligado no app real
  (`pagamentoDemanda.js`) só para o fluxo demanda→pago. ⚠️ Outros
  caminhos de escrita (venda de rifa, venda de bazar, lançamento manual)
  ainda gravam direto, sem gate — nenhum agente foi desenhado pra eles
  ainda.
- **Log estruturado de toda decisão** — o `avaliador-financeiro` já
  devolve tudo que precisaria virar log (aprovado, justificativa,
  alertas). ⚠️ Persistência em `memory/decisions-log/` ainda pendente.
- **Português direto, sem inflar resposta.** ✅ Convenção seguida em toda
  saída de agente.

## Específicas por domínio

### Persistência (Render)

- Banco é um arquivo JSON (`data/reuni_db.json`), não Postgres — diferença
  estrutural conhecida e aceita (ver auditoria original), não um desvio
  silencioso.
- Escrita nunca sobrescreve array inteiro — todo write passa por operação
  atômica (`create`/`update`/`delete`/`replaceAll` em `dbOps.js`).
  ✅ Implementado (era o bug real corrigido em `fix/sync-lost-update`).
- Staging antes de produção: sem infraestrutura de staging real (um
  arquivo só) — mitigado testando sempre contra cópias isoladas antes de
  qualquer merge que toque escrita.

### Regras financeiras do REUNI (Bíblia REUNI)

- Precificação de rifa (~R$ 7, nunca acima de R$ 10): ✅ implementado em
  `radar-arrecadacao`.
- 5 cotações concorrentes para compra relevante: ❌ não implementado —
  nenhum agente verifica isso hoje.
- Piso de reserva entre edições: ❌ não implementado — depende de existir
  uma edição fechada anterior, que não existe ainda (ver
  `prestacao-contas/prompt.md`).

### Segurança e credenciais

- `REUNI_ACCESS_TOKEN` nunca em arquivo de agente/prompt — vive só em
  variável de ambiente. ✅ Implementado (`auth.js`).
