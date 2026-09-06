# github.md

repo: Vinimoura123/REUNI_FINANCEIRO
branch: main
path: src

## Last sync

date: 2026-09-06T04:05:00Z

### Updated in this project
- Novo modelo de design do sistema financeiro como protótipo navegável (`Sistema REUNI Financeiro.dc.html`), com identidade REUNI aplicada.
- Tipografia Archivo e paleta institucional (Tinta/Papel + quatro cores dos BIs) substituindo o tema slate + glassmorphism do repositório.
- Três telas novas que ainda não existem no código: Parcerias e patrocínios, Prestação de contas e Acessos da comissão.

## Screen map

| Tela do protótipo | Arquivos do repositório |
| --- | --- |
| Login | (nova — não existe no repo) |
| Visão geral | src/pages/Dashboard.jsx, src/context/FinanceContext.jsx |
| Gestão de caixa | src/pages/Caixa.jsx, src/components/AddTransacaoModal.jsx, src/components/UploadComprovanteModal.jsx |
| Demandas por subcomissão | src/pages/Demandas.jsx, src/constants/comissoes.js |
| Arrecadação | src/pages/Arrecadacao.jsx, src/components/AddArrecadacaoModal.jsx |
| Parcerias e patrocínios | (nova — não existe no repo) |
| Bazar | src/pages/Bazar.jsx, src/components/AddBazarItemModal.jsx |
| Prestação de contas | (nova — deriva de src/utils/excelExporter.js) |
| Inventário | src/pages/Inventario.jsx |
| Acessos da comissão | (nova — não existe no repo) |
| Navegação e shell | src/App.jsx, src/index.css |
