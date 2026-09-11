# antigravity-reuni — workspace de agentes (esqueleto)

Estrutura de pastas prevista na seção 08 do `blueprint-antigravity-reuni.md`
(raiz do workspace, fora deste repositório), criada como parte da **Trilha A**
(reorganização estrutural) do processo de 3 fases descrito em
`prompts-3-fases-antigravity.md`.

## Status atual: só esqueleto, sem lógica

A auditoria da Fase 1 confirmou que **nenhum dos 5 sub-agentes do blueprint
existe hoje** — o REUNI Financeiro é um app CRUD (React + Node) sem nenhuma
camada de IA na frente do usuário. Por isso não havia nada para "mover" para
cá: estas pastas foram criadas vazias, sem prompt, schema ou regra de negócio
nenhuma dentro.

Cada sub-agente só ganha conteúdo real na **Fase 3**, um de cada vez, seguindo
a ordem de prioridade da seção 11 do blueprint
(`consulta-financeira` → `conciliacao-lancamento` + `avaliador-plano` →
`radar-editais`), sempre com o prompt atual vs. proposto lado a lado e
aprovação explícita antes de aplicar.

## O que vive em cada pasta

- `agents/` — um subdiretório por sub-agente (`prompt.md` + `schema.json` de
  saída), quando cada um for implementado.
- `skills/` — conhecimento consultável pelos agentes (schema do banco,
  regras extraídas da Bíblia REUNI). O material bruto já existe em
  [`docs/financeiro_extracted.md`](../docs/financeiro_extracted.md); ainda
  não foi transformado em skill.
- `mcp/` — configuração de servidores MCP usados pelos agentes financeiros
  (banco, e-mail, embeddings). Hoje não existe nenhum MCP desse tipo no
  workspace — os únicos MCP configurados (`.agents/mcp/mcp_config.json` e
  `.vscode/mcp.json`, na raiz do workspace) são de branding/design e não têm
  relação com este projeto.
- `memory/decisions-log/` — log estruturado de decisões de escrita
  (categoria, confiança, timestamp, agente responsável). Hoje o equivalente
  mais próximo que existe é o histórico de commits do Git e os backups
  versionados em `D:\REUNI_STORAGE\backups` — nenhum dos dois registra
  decisão de agente, porque nenhum agente decide nada ainda.

## O que NÃO está aqui

Nenhuma lógica de aplicação foi tocada para criar este esqueleto — nenhum
arquivo de `src/`, `server.js` ou `data/` foi movido, renomeado ou alterado.
