# skill: arquitetura-agentes-reuni

> Para quando alguém for adicionar um sub-agente novo ou revisar a
> arquitetura. Descreve o padrão que emergiu na prática construindo os 8
> agentes que existem hoje — não o blueprint teórico original.

## Estrutura de um agente

```
antigravity-reuni/agents/<nome-do-agente>/
├── prompt.md               # responsabilidade, regras, formato de saída
├── schema.json              # schema JSON da saída, validável
├── logic.js                 # implementação real (quando determinística)
└── autoteste-sintetico.mjs  # teste com dado fictício, NUNCA passado como real
```

Quando o "raciocínio" do agente é inerentemente não-determinístico (visão
computacional, classificação de linguagem natural), `logic.js` não existe
ou só cobre uma parte — `prompt.md` é a especificação que uma pessoa (ou
um LLM) segue manualmente. Ver `extrator-comprovante` (só prompt, sem
logic.js) vs. `radar-arrecadacao` (só logic.js, sem chamada de LLM).

## Regras não-negociáveis (aprendidas construindo os 8 agentes)

1. **Nunca inventa dado.** Todo agente aqui devolve `null`/confiança baixa
   em vez de estimar — verificado em todo `logic.js` existente.
2. **Nunca fabrica evidência de teste.** Autoteste com dado fictício é
   permitido e útil (valida que a fórmula não quebra), mas precisa estar
   marcado como tal no código e no commit — nunca é apresentado como "o
   teste com dado real" quando não existe dado real disponível ainda.
3. **Um agente por branch, nunca mistura.** Cada agente novo (ou mudança
   que muda comportamento de escrita) ganha sua própria branch. Merge só
   acontece depois de build+lint conferidos e, quando toca escrita, um
   teste real de ponta a ponta (servidor isolado, nunca o banco de
   produção nem `D:\REUNI_STORAGE`).
4. **Escrita nunca sobrescreve o array inteiro.** Todo write action passa
   pela operação atômica de `dbOps.js` (`create`/`update`/`delete`/
   `replaceAll`), nunca um payload de "aqui está o array completo".
5. **Write action real precisa de gate.** Um agente que propõe uma escrita
   (`conciliador-demandas`) nunca aplica sozinho — outro agente avalia
   (`avaliador-financeiro`) antes. Construir o par sem ligar ao app real é
   trabalho pela metade — ver a diferença entre "testado isolado" e
   "ligado no app" nas notas de `GUIDELINES.md`.
6. **Lógica compartilhada entre server.js e o middleware de dev do
   vite.config.js vira módulo próprio** (`dbOps.js`, `auth.js`,
   `pagamentoDemanda.js`) — nunca duplicada nos dois lugares (já causou
   bug real de divergência uma vez).

## Como adicionar um agente novo

1. `prompt.md` primeiro — responsabilidade, o que ele NUNCA faz, formato
   de saída.
2. `schema.json` — schema validável da saída.
3. Se for determinístico, `logic.js` com funções puras, testáveis sem
   mock de rede/disco quando possível.
4. Autoteste sintético — prova que a fórmula não quebra, claramente
   marcado como não-real.
5. Se o agente precisar de dado real que não existe no projeto (a maioria
   dos casos até agora), **pedir ao usuário** em vez de fabricar. Ver
   `extrator-comprovante` (pediu 5 comprovantes reais) como referência.
6. Branch própria, commit com evidência real do que foi testado, merge só
   depois de build/lint conferidos.
