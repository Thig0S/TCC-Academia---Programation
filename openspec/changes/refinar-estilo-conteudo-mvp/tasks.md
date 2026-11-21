# Tasks

> Somente planejamento autorizado. Todas as tarefas abaixo são futuras e dependem de novo pedido explícito de apply após revisão dos artefatos. Reutilizar PRD 1.11 e TDD 1.15 conforme `proposal.md`; não alterar código nesta etapa.
>
> No apply, manter esta Change na mesma feature branch. Cada entrega coerente inclui testes, capturas, registro real em `frontend/README.md` e commit individual em português; não acumular funcionalidades independentes num commit final nem incluir arquivos do usuário no staging. As referências HTML são locais/não rastreadas e não devem ser editadas ou incluídas silenciosamente.

## 1. Registrar linha de base e proteger contratos

- [x] 1.1 Confirmar a disponibilidade dos dois HTMLs nomeados em `proposal.md` e registrar em `frontend/README.md` sua identificação/hash, referências complementares e diferenças funcionais descartadas; verificar leitura dos arquivos e a matriz de escopo de D3. Ausência de referência bloqueia comparação, sem recriar arquivos ou incorporar trabalho alheio.
- [x] 1.2 Antes de editar apresentação, registrar linha de base real com build, unitários sem watch, E2E da aplicação e fixture; capturar conteúdo e lateral nos dois temas em 1366×768 e 390×844 e registrar resultados, falhas/avisos e caminhos de evidências no README. Não transportar contagens de execuções anteriores como resultados novos.

## 2. Refinar fundação visual e componentes compartilhados

- [ ] 2.1 Refinar tokens semânticos do conteúdo em `src/styles.css` e hierarquia/superfícies da área principal, cabeçalho e aviso, usando D2; manter fonte de sistema e tokens/aparência da lateral. Verificar estilos computados, alternância/recarga do tema, aviso, foco e equivalência da lateral nos dois temas/viewports com testes pertinentes e build; registrar capturas e contrastes reais no README.
- [ ] 2.2 Refinar apresentação de selos suaves, campos, botões, paginação e modal nos consumidores compartilhados, preservando bindings, nomes acessíveis, semântica e eventos; verificar todas as situações, normal/hover/foco/ativo/desabilitado, movimento reduzido e pares de contraste 4,5:1/3:1 com testes de componentes/E2E pertinentes e build. Registrar comparação com HTMLs, diferenças justificadas e efeitos na lateral no README.

## 3. Refinar Visão Geral

- [ ] 3.1 Refinar quatro indicadores e três resumos com valores destacados, rótulos secundários, painéis e separadores; verificar testes do componente e E2E nos dois temas/viewports para referência/mês, limites/ordenação, zero e ausência de itens, links e ausência de ações/gráficos novos. Executar build e registrar capturas comparativas e contrastes no README, sem alterar projeções ou adicionar conteúdo funcional.

## 4. Refinar consultas de Vendas e Quitadas

- [ ] 4.1 Refinar o conjunto visual de critérios, tabela, ações e paginação em Vendas/Quitadas, destacando Nova venda sem mudar destino ou papel de âncora; verificar busca/filtro, duas limpezas, estados vazio/sem resultados, nomes acessíveis e coleções separadas com testes de componentes e E2E nos dois temas/viewports. Usar fixture 0/1/10/11/21 para medir dez linhas, cabeçalhos, critérios, faixa/total e paginação sem rolagem vertical em 1366×768; executar build e registrar capturas/medidas e adaptações dos HTMLs no README.
- [ ] 4.2 Refinar detalhe e tabela de parcelas, mantendo cliente/venda lado a lado e entrada separada; verificar testes de detalhe e fixture/E2E para até dez parcelas com entrada/descrição curta sem rolagem da página em 1366×768, e excedente/textos extensos em região interna identificada por teclado. Conferir página, retornos, ações elegíveis e datas/formas completas nos dois temas e em 390×844; executar build e registrar capturas/medidas/contrastes no README, sem esconder conteúdo ou alterar histórico.

## 5. Refinar formulários e recebimento

- [ ] 5.1 Refinar identificação compartilhada, cadastro, entrada e prévia em painéis coerentes com os HTMLs; verificar testes de cadastro/componentes e E2E nos dois temas/viewports para campos/rótulos atuais, erros associados, foco, prévia completa, cancelamento, falha/retry e confirmação única. Executar build e registrar capturas comparativas e contraste no README, sem converter página em modal ou copiar primeiro vencimento editável, limite de parcelas ou cálculo aproximado.
- [ ] 5.2 Refinar edição com a mesma linguagem, preservando somente os quatro campos editáveis; verificar testes de edição e E2E nos dois temas/viewports, incluindo quitada, cancelamento, erro e atualização isolada da identificação sem mudança financeira. Executar build e registrar capturas, foco e contrastes no README; manter ausência de registro distinta de erro de validação.
- [ ] 5.3 Refinar apresentação do recebimento no modal existente; verificar testes do modal/recebimento e E2E nos dois temas/viewports para sequência de parcelas, valor exato, datas/formas atuais, falha/retry, confirmação única, cancelamento/Escape, contenção e retorno de foco após quitação. Executar build e registrar capturas/contrastes no README, sem alterar mecanismo nativo, comandos ou regras.

## 6. Refinar Relatórios, Configurações e estados auxiliares

- [ ] 6.1 Refinar os quatro blocos de consultas de Relatórios com painéis, totais e períodos hierarquizados; verificar testes próprios e E2E nos dois temas/viewports para mês fixo, posição na referência, reconciliação, todos os registros e vazios. Conferir ausência dos quatro indicadores globais, seletor e gráfico, e exportação indisponível sem download/rede; executar build e registrar capturas/contrastes no README.
- [ ] 6.2 Refinar apresentação das quatro explicações de Configurações e das páginas/registro ausentes; verificar testes de conteúdo/componentes e E2E nos dois temas/viewports para conteúdo existente, ausência de controles novos, retornos e foco. Conferir também aparência coerente dos erros/vazios já tratados nas entregas anteriores; executar build e registrar capturas e contraste no README, sem criar mensagens ou funcionalidades copiadas dos HTMLs.

## 7. Consolidar verificação integrada

- [ ] 7.1 Executar regressão integral em `frontend/`: `npm test -- --watch=false`, `npm run test:e2e` e `npm run test:e2e:paginacao-fixture`; conferir cadastro com entrada → recebimento → quitação → edição → consultas/resumos → recarga, privacidade e ausência de rede externa. Registrar comandos, resultados reais e limitações no README, sem remover asserções funcionais, densidade ou foco para acomodar o visual.
- [ ] 7.2 Consolidar a matriz de D5 cobrindo todas as superfícies/estados de D3 nos dois temas e viewports; comparar HTML/referência complementar, antes/depois e lateral preservada, com caminhos de captura e diferenças justificadas. Verificar hierarquia, alinhamento, cores, superfícies, tipografia, espaçamento, bordas/cantos, sombras, teclado e contraste; registrar revisão visual real separadamente de testes verdes, sem alegar igualdade pixel a pixel ou aceite da ótica.
- [ ] 7.3 Verificar zoom nativo de 200% nos dois temas para consultas, formulários, modal, resumos, relatórios e estados auxiliares, registrando navegador/versão, escala Windows, viewport útil e resultado em `frontend/README.md`; confirmar alcance de conteúdo/ações/foco. Se evidência manual não estiver disponível, manter esta tarefa pendente e informar bloqueio; CSS zoom ou viewport reduzido não a concluem.
- [ ] 7.4 Executar `npm run build`, `npx ng run vendas-em-aberto:build-paginacao-fixture` e `npm run format:check` em `frontend/`, além de `openspec validate refinar-estilo-conteudo-mvp --strict` na raiz; registrar resultados/avisos no README sem alterar budgets. Revisar o diff final para comprovar escopo de apresentação/testes/documentação, ausência de mudanças em domínio/estado/rotas/campos/regras/dependências e preservação dos arquivos alheios.

## Workflow follow-up

- Não abrir PR com apenas este planejamento concluído. Após novo pedido de apply e conclusão integral da Change, abrir um único PR da mesma feature para `main` usando `.github/pull_request_template.md`, referências PRD/TDD/SDD, verificações reais e limitações.
- Sync/archive seguem autorização e fluxo próprios; não executar nesta proposta. Não declarar FASE-008, aprovação global ou aceite comercial por conclusão técnica.
- Merge exige autorização explícita do usuário e verificações/revisão aplicáveis; após integração, confirmar estado do PR e presença da mudança na `main`.
