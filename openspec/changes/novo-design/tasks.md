# Tasks

## 1. Listagem de vendas abertas e quitadas

- [x] 1.1 Acrescentar “Vendas cadastradas” como título textual dentro do painel de Vendas e refinar hierarquia de cabeçalho/critérios/estados com as classes atuais; verificar em teste de componente e E2E que o título persiste com resultados e vazios, não há KPIs nem busca global e “Limpar pesquisa” preserva a situação.
- [x] 1.2 Harmonizar as duas listagens e os componentes `tabela-vendas`/`paginacao-vendas` usando os PNGs claro/escuro de `references/` para composição e selos, sem mudar inputs/outputs, oito colunas, 18 px, paginação ou ações; verificar `frontend/e2e/refinamento-visual.spec.ts` e `paginacao-fixture.spec.ts` em ambos os temas, 1366×768 com dez linhas visíveis e 390×844 com rolagem horizontal apenas na tabela.
- [x] 1.3 Registrar em `frontend/README.md` as diferenças entre `DESIGN.md`, mockups de listagem em `references/` e Vendas/Quitadas atuais, capturas/medições e resultados reais dos testes deste grupo; explicitar a ausência apenas de `a_clean_modern_desktop_app_dashboard_ui_light_the.png` e verificar que os caminhos citados existem.

## 2. Shell e identidade visual compartilhada

- [x] 2.1 Ajustar só o ritmo da área principal/barra superior e os tokens semânticos estritamente necessários em `app.html`, `app.css` e `styles.css`, sem alterar logo, lateral, rotas ou inserir pesquisa global; verificar E2E do shell, foco de teclado, tema inicial escuro/alternância e comparação da sidebar antes/depois em claro/escuro e dois viewports.
- [x] 2.2 Uniformizar acabamentos dos componentes compartilhados usados pelo conteúdo (cabeçalho, selos, estados e modal somente se necessário) sem alterar seletores, contratos ou semântica; verificar testes de componentes e cenários de contraste/foco em `frontend/e2e/refinamento-visual.spec.ts` e `matriz-responsiva.spec.ts`.
- [x] 2.3 Registrar em `frontend/README.md` decisões de tokens, diferenças justificadas dos protótipos `references/mercadao_oculos_dashboard_light.html` e `references/mercadao_oculos_dashboard_dark.html` e evidências reais de regressão/acessibilidade do shell; conferir ausência de nova dependência e de alterações indevidas na sidebar pelo diff.

## 3. Nova venda, detalhe e recebimento

- [x] 3.1 Refinar apenas composição e superfícies de Nova venda, identificação, prévia e erros tomando `references/a_clean_modern_ui_mockup_portuguese_in_the_same.png` e `references/nova_venda_refatorada.component.html` como orientação visual, sem copiar seletor de cliente, campos extras, ordem antiga ou breakpoint `xl`, nem alterar `[formField]`, validações ou prévia; verificar `formularios-vendas.spec.ts` e `acessibilidade-formularios.spec.ts`, incluindo 767/768 px, claro/escuro e estado inválido.
- [x] 3.2 Harmonizar detalhe/parcelas, edição e modal de pagamento individual tomando `references/a_detailed_ui_screenshot_of_a_sales_detail_page_fo.png` como guia de hierarquia, sem copiar o pagamento em lote; manter primeira parcela elegível, tabela de 18 px, campos editáveis e retorno de foco; verificar testes de componente e E2E de pagamento, histórico excedente, cancelamento, erro e quitação.
- [x] 3.3 Registrar em `frontend/README.md` comparações, medições de até dez parcelas em 1366×768, resultados reais e limites do grupo; conferir que não foi reintroduzida seleção de lote nem modal de detalhes.

## 4. Demais módulos e estados existentes

- [x] 4.1 Harmonizar visualmente Visão Geral (quatro indicadores e três resumos existentes), Relatórios (quatro tabelas) e Configurações (explicações existentes), sem criar controles/ações; verificar `visao-geral-refinamento.spec.ts`, testes de Relatórios e `refinamento-visual.spec.ts`, preservando dados e a indicação de exportação indisponível.
- [x] 4.2 Aplicar acabamento consistente a Quitadas/registro ausente, página não encontrada e demais estados vazios/erros já implementados; verificar `estados-auxiliares.spec.ts`, navegação por teclado e leitura nos dois temas.
- [x] 4.3 Registrar no `frontend/README.md` as comparações e resultados reais deste grupo, incluindo divergências intencionais de mockups com dados/ações fictícios; conferir texto e fluxos atuais com os testes executados.

## 5. Verificação integrada da Change

- [x] 5.1 Executar `npm test`, `npm run test:e2e`, `npm run build` e `npm run format:check` em `frontend/`; registrar comandos, contagens, falhas/avisos e eventuais execuções não realizadas em `frontend/README.md`, sem declarar aprovação por antecipação.
- [x] 5.2 Comparar navegação, listagens, cadastro, detalhe, pagamento e demais módulos em claro/escuro, 1366×768, 390×844 e zoom nativo 200% quando disponível com os cinco PNGs, dois HTMLs e template Angular efetivamente presentes em `references/`; verificar contraste, foco, ausência de overflow da página, densidade, resultados reais e registrar no `frontend/README.md` diferenças intencionais e a comparação impossível com o sexto PNG ausente.
- [x] 5.3 Validar `openspec validate novo-design --strict`, revisar rastreabilidade PRD/TDD/SDD e o diff para assegurar que só houve mudanças autorizadas de apresentação e testes; registrar o resultado real e as divergências documentais preexistentes sem alegar conciliação/aceite/merge que não ocorreu.

## Workflow follow-up

- Após apply explicitamente solicitado e conclusão integral das verificações, seguir o fluxo de PR único da feature branch conforme `AGENTS.md`; não abrir PR só pelos artefatos de planejamento.
