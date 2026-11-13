# Tasks

Planejamento apenas: todas as caixas representam execução futura. Iniciar somente após revisão
dos artefatos e novo pedido explícito de apply. Fontes: PRD 1.1 (RF-001/011/012,
RNF-001/002/003/004/007/008/009/010, CA-001/022/023), TDD 1.4 (FASE-003,
DEC-003/006/008/013/014), `design.md` e as três deltas em `specs/`.

## 1. Dependência de navegação e fronteira de execução

- [ ] 1.1 Revalidar branch dedicada, autorização de apply e versões da base; conferir `git status`, manifesto e existência de `frontend/public/imgs/logo-franquia.jpg` e dos quatro exemplos indicados no design, preservando os arquivos e qualquer trabalho alheio; registrar o recorte e as referências visuais em `frontend/README.md` sem declarar FASE-004 a FASE-008 ou regras abertas como autorizadas.
- [ ] 1.2 Acrescentar somente `@angular/router@22.2.6` compatível com a base e gerar o lockfile pelo npm; verificar peers sem flags de força por `npm.cmd ls --depth=0`, instalação por `npm.cmd ci` e build por `npm.cmd run build` em `frontend/`; registrar resultados e versões em `frontend/README.md`, sem Forms, ZoneJS ou upgrades incidentais.

## 2. Estrutura navegável e regressão de abertura

- [ ] 2.1 Criar `app.routes.ts`, integrar Router na configuração existente e implementar páginas standalone mínimas para as cinco rotas do design, redirecionamento da entrada e página não encontrada; verificar build estrito e testes de Router para URL direta, correspondência de Quitadas antes do wildcard e retorno, sem rotas de cadastro, edição ou detalhes comerciais.
- [ ] 2.2 Substituir a página técnica pela estrutura persistente com identidade global usando a logo local `frontend/public/imgs/logo-franquia.jpg`, aviso literal, quatro módulos, Quitadas interna, perfil estático e atalho de Configurações; implementar ícones SVG próprios decorativos e estados ativos sem dois `aria-current="page"`; verificar `app.spec.ts`, navegação e carregamento da logo sem distorção ou duplicação do nome acessível, atualizando as asserções obsoletas de ausência de links e de `h1` igual ao produto.
- [ ] 2.3 Aplicar Bootstrap/SCSS à navegação lateral desktop e ao bloco no fluxo abaixo de `md`, usando os designs de `frontend/public/imgs/exemplos/` como referência somente de estrutura de layout, espaçamento e hierarquia, sem menu oculto, ativos remotos ou plugins JS; verificar leitura, logo legível e ausência de rolagem horizontal em 1366 × 768 e 390 × 844 via E2E e revisão visual, sem exigir reprodução dos formulários ou dados das imagens; substituir a asserção de padding fixo por estilos efetivos e registrar limites e warning Sass em `frontend/README.md`.
- [ ] 2.4 Implementar título de documento contextual, um `h1` por página, atalho para conteúdo e foco no título após mudança interna de destino renderizado, sem roubar foco ao clicar no link já ativo; verificar E2E por teclado, histórico voltar/avançar, navegação rápida e wildcard, sem timers arbitrários ou detecção forçada para esconder falhas zoneless.
- [ ] 2.5 Evoluir `e2e/demonstracao-inicial.spec.ts` para identidade global, títulos de página, aviso e recarga de cada rota, preservando captura de console/pageerror, pt-BR e inspeção de recursos locais/storage; executar `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`, registrar resultados da navegação em `frontend/README.md` e criar commit coerente desta funcionalidade com seus testes, documentação e tarefas.

## 3. Temas globais em memória

- [ ] 3.1 Criar serviço de tema raiz com signal privado, leitura e alternância, iniciando em escuro independentemente do sistema; verificar testes unitários de alternância e instância compartilhada, sem ler/gravar storage, cookies ou preferência de sistema e sem provedores duplicados nas páginas lazy.
- [ ] 3.2 Vincular tema ao host da aplicação e às variáveis Bootstrap com SCSS complementar, cobrindo a viewport completa; adicionar botão nativo de tema com nome acessível, indicação textual e `aria-pressed` coerente; verificar componentes nos dois temas e E2E de Enter/Espaço preservando foco e rota, sem novos pacotes ou importações de JavaScript Bootstrap/Popper.
- [ ] 3.3 Cobrir por E2E tema escuro inicial com preferência de sistema clara/escura, escolha preservada em todos os destinos e wildcard, retorno ao escuro na recarga e nova sessão, ausência de cookies/storage após alternar e navegar; executar as suítes de tema/abertura nos dois projetos Chromium e registrar comandos, resultados e limites em `frontend/README.md`.
- [ ] 3.4 Inspecionar contraste efetivo, foco, indicação ativa e superfícies em ambos os temas, incluindo movimento reduzido e viewport pequeno; verificar os mínimos da delta `temas-visuais`, registrar método/valores/limitações e corrigir problemas antes do commit da funcionalidade, incluindo seus testes, documentação e tarefas; não alegar certificação integral de acessibilidade.

## 4. Conteúdo honesto e Configurações

- [ ] 4.1 Refinar os textos das páginas comerciais para declarar indisponibilidade sem simular consulta vazia, resumos ou ações de cadastrar/editar/pagar/exportar; verificar testes de componentes e E2E para as quatro páginas, mantendo permitidos apenas controles de tema e navegação; registrar o que ainda não está implementado em `frontend/README.md`.
- [ ] 4.2 Implementar Configurações explicando dados fictícios, memória, descarte ao recarregar e ausência de uso operacional, sem controles fictícios; verificar os quatro limites por testes de componente e E2E pelos dois acessos e nos dois temas, conforme PRD/CA-022; registrar PEN-012 parcialmente resolvida e filtros de Quitadas fora do escopo.
- [ ] 4.3 Executar os testes aplicáveis ao conteúdo e revisar consistência com PRD/TDD/deltas; verificar que os módulos seguem a documentação e não copiam campos, dados, números financeiros, situações, filtros ou ações das imagens; confirmar ausência de formulários, cadastro mestre e biblioteca visual extra nesta fase, com apenas a logo indicada usada como ativo de interface e capturas usadas somente como referência de layout; criar commit coerente com testes, documentação e tarefas deste conteúdo.

## 5. Verificação integrada da FASE-003

- [ ] 5.1 Executar em `frontend/` `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`; verificar códigos de saída e cenários cruzados de navegação/temas/recarga/isolamento, sem erros inesperados no console/pageerror e sem reutilizar servidor alheio; registrar ambiente, resultados e warnings reais em `frontend/README.md`.
- [ ] 5.2 Percorrer manualmente todos os destinos por teclado nos dois temas, conferir atalho, foco, ausência de corte, zoom 200% e movimento reduzido; registrar roteiro, resultados e itens não executados em `frontend/README.md`, sem converter o smoke técnico em homologação de dispositivos, navegadores ou aceite da ótica.
- [ ] 5.3 Revisar rastreabilidade final, executar `openspec validate fase-003 --strict` e `git diff --check`, conferir o diff limitado ao recorte e atualizar estas tarefas somente conforme evidências reais; registrar pendências comerciais, CA-018/021 completos e PRD/PEN-013/014 ainda não atendidos, sem declarar o MVP concluído.

## Evidências do planejamento — 13/11/2026

- PRD 1.1 e TDD 1.4 revisados antes dos artefatos SDD, após confirmação explícita de temas e conteúdo explicativo de Configurações. Nenhuma outra hipótese ou regra financeira foi aprovada.
- Inspecionados fonte, testes, manifesto, estilos e configuração Playwright da base. Consulta read-only de metadados npm confirma Router 22.2.6 alinhado aos peers existentes; documentação Angular e Bootstrap consultada via Context7, sem instalação.
- `openspec validate fase-003 --strict`, na raiz: aprovado. `git diff --check`, na raiz: saída 0, somente avisos LF/CRLF. Artefatos presentes; todas as 17 tarefas de implementação permanecem desmarcadas.
- Instalação, build, formatação do frontend, testes unitários/componentes/E2E e avaliação visual/manual não executados: esta entrega é apenas planejamento. As evidências da base citadas no PRD/TDD pertencem à entrega anterior.
- Especificações principais, arquivo histórico, código, dependências e configurações de execução não foram alterados. As imagens em `frontend/public/imgs/` permanecem intactas e não foram adicionadas ao Git nesta revisão; o solicitante autorizou planejar o uso da logo e dos quatro exemplos como referências de layout, sem copiar formulários ou dados e sem ampliar a FASE-003.

## Workflow follow-up

- Apresentar o planejamento para revisão na conversa ou na branch, distinguindo documentação de implementação, sem gerar PR antecipado e sem iniciar apply por inferência desta proposta.
- Durante o apply autorizado, manter commits individuais por funcionalidade com testes e documentação correspondentes na mesma feature branch; apresentar o escopo integral concluído em um único PR para main, conforme `AGENTS.md` e `.github/pull_request_template.md`, sem novos PRs por alteração.
- Não mesclar sem autorização explícita e revisões exigidas; não sincronizar as deltas nem arquivar antes do fluxo de conclusão solicitado.
