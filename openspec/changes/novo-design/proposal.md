# Proposal

## Why

O frontend Angular já oferece os fluxos da demonstração e parte da linguagem visual, mas a apresentação ainda não traduz integralmente a hierarquia de `DESIGN.md`: a listagem não identifica seu painel com “Vendas cadastradas” e o shell, os controles e as demais telas têm composição mais utilitária que as referências. Esta Change organiza o redesenho visual sem substituir contratos já aprovados nem transformar protótipos demonstrativos em funcionalidades.

## What Changes

- Dar à listagem de Vendas uma hierarquia explícita com título textual “Vendas cadastradas” no painel, mantendo título da página, pesquisa única, situação, “Limpar pesquisa”, “Nova venda”, tabela e paginação; nunca introduzir cartões de KPI nessa listagem.
- Harmonizar shell de conteúdo, cabeçalhos, painéis, controles, selos, estados e tabelas existentes nos temas claro/escuro com `DESIGN.md`, reaproveitando a logo, os tokens e os componentes atuais; preservar a aparência e o comportamento responsivo da sidebar já especificados.
- Priorizar Vendas/ Quitadas e seus componentes compartilhados; aplicar o mesmo acabamento a Nova venda, detalhe/parcelas, edição, modal de pagamento, Visão Geral, Relatórios, Configurações e estados auxiliares somente onde esses fluxos já existem.
- Preservar as decisões posteriores aos mockups: tabelas de Vendas/Quitadas/parcelas/Relatórios em 18 px com densidade desktop existente; cadastro com prévia lateral a partir de 768 px; pagamento individual sequencial. Não criar busca global, KPIs em Vendas, filtro de datas, controles de janela, ajuda, novos campos, rotas ou dependências.
- Comparar os dois temas e larguras existentes com `references/`: cinco mockups PNG (explorações de listagem, versão escura, cadastro e detalhe), protótipos HTML claro/escuro e template Angular de Nova venda. Os HTMLs também existem, idênticos, em `frontend/public/imgs/exemplos/`; as quatro imagens dessa pasta seguem como referências complementares já usadas pelo projeto. Registrar diferenças por contraste, zoom e contratos funcionais. Dos seis PNGs citados em `DESIGN.md`, falta somente `references/a_clean_modern_desktop_app_dashboard_ui_light_the.png`; o solicitante autorizou prosseguir com os demais.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `consulta-vendas`: explicitar a identificação textual do painel de listagem das vendas abertas, com controles e resultados da fonte existente, sem cartões financeiros ou buscas duplicadas.

## Impact

- Apresentação em `frontend/src/app/app.html`, `app.css`, `frontend/src/styles.css`, templates/estilos de Vendas e componentes compartilhados, e somente ajustes visuais pertinentes nas outras páginas existentes; `ServicoDemonstracao`, cálculos, rotas e Signal Forms permanecem intactos.
- Reutiliza PRD `docs/prd/vendas-em-aberto.md` (RF-001 a RF-012, RNF-002/003/007, CA-027/028/032) e TDD `docs/tdd/tdd.md` (DEC-006/018/021–027), além das specs principais `temas-visuais`, `navegacao-aplicacao` e `formularios-vendas`; não substitui essas decisões.
- Verificações futuras de layout/acessibilidade e regressão em `frontend/e2e/`, testes de componentes, build e `format:check`. Nenhuma verificação de aplicação foi executada nesta etapa de planejamento.
- Há conflito documental preexistente: `consulta-vendas` ainda menciona “Limpar critérios” em requisitos antigos embora o PRD, o TDD e o código atuais a removam; `recebimentos-parcelas` ainda descreve lote no modal embora o PRD/TDD e o código atuais usem parcela individual. Esses conflitos não autorizam regressão nem mudança de regras nesta Change; requerem conciliação documental específica antes de alterar tais contratos. O redesign mantém os fluxos atuais.
