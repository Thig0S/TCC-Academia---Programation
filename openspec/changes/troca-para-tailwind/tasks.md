# Tasks

> Planejamento conciliado com PRD 1.11 e TDD 1.15/DEC-021. As tarefas 1.1, 1.2, 2.1, 2.2 e 3.1 estão concluídas; nove tarefas permanecem pendentes. Ver evidências de implementação e verificações em `frontend/README.md`.

## Pré-requisitos bloqueantes do apply

- Pré-requisito documental concluído nesta revisão: PRD 1.11 explicita abrangência visual global sem fixar tecnologia; TDD 1.15/DEC-021 substitui a direção de base visual de DEC-013, preservando seu registro histórico e condicionando migração ampla à prova dos dois builds.
- Proposal, design e tasks foram alinhados às referências efetivas de PRD/TDD. As tarefas ainda pendentes só devem avançar com apply explícito e após revisão desta conciliação; o estado de artefatos completos no CLI não comprova implementação.
- Trabalhar na mesma feature branch e preservar alterações alheias. Cada entrega coerente inclui seus testes, documentação e commit próprio, sem PRs individuais por tarefa.

## 1. Validar fundação Tailwind

- [x] 1.1 Antes de mudar dependências, registrar a linha de base real de build, unitários sem watch e E2E da aplicação/fixture, incluindo falhas e avisos preexistentes; depois provar Tailwind v4/PostCSS nos alvos com `npm run build` e `npx ng run vendas-em-aberto:build-paginacao-fixture`, verificando utilitários por estilos computados também no build otimizado. Registrar versões/compatibilidade e evidências em `frontend/README.md`; falha bloqueia migração ampla, sem mudar major ou builder silenciosamente.
- [x] 1.2 Configurar entrada CSS/PostCSS e detecção de classes em HTML/TypeScript, inclusive templates inline e fixture, com Preflight adiado e ponte Bootstrap temporária explicitamente ordenada por camadas; verificar `npm ci`, os dois builds e um smoke de campos, botões e tabelas ainda existentes nos dois temas. Registrar a transição no README; remover Bootstrap somente na tarefa 4.3.

## 2. Migrar tokens, estrutura e navegação

- [x] 2.1 Criar tokens semânticos, `data-tema="light|dark"` em `app-root` e variante escura explícita para host/descendentes, preservando escuro inicial e preferência em memória; atualizar os testes de tema no mesmo passo e verificar alternância por teclado, foco mantido, navegação, página ausente, recarga, preferência de sistema e ausência de storage. Só remover o atributo antigo quando os consumidores residuais tiverem sido migrados, no máximo em 4.3; registrar evidências no README.
- [x] 2.2 Migrar estrutura global, cabeçalho, aviso, barra lateral, perfil e navegação sem alterar logo ou destinos; adaptar testes ligados a seletores Bootstrap e verificar ambos os temas/viewports, contraste da lateral em extremos/meio do degradê, ativo/hover/foco e atalho de conteúdo. Registrar capturas, comparação com referências e exceções justificadas no README junto da entrega.

## 3. Migrar componentes compartilhados e consultas

- [x] 3.1 Migrar cabeçalho de página, selos, paginação e modal existentes, além dos padrões de campos/botões/estados vazios em seus consumidores, sem criar abstrações genéricas desnecessárias. Atualizar seus testes e verificar classes literais de todos os selos, foco visível, movimento reduzido e `dialog` com tema herdado, contenção, Escape, cancelamento e retorno de foco; registrar resultados no README.
- [ ] 3.2 Migrar listagens de Vendas/Quitadas e tabelas, adaptando testes no mesmo passo; verificar busca/filtro, limpezas, coleções vazias versus sem resultados, 0/1/10/11/21 registros e paginação com identidade/foco preservados. Medir dez linhas/cabeçalhos/critérios/faixa e paginação quando necessária em 1366×768/100%, sem rolagem da página; verificar reorganização em 390×844 e registrar capturas/resultados nos dois temas no README.
- [ ] 3.3 Migrar detalhe e parcelas, atualizando testes de layout/acessibilidade; verificar cliente/venda lado a lado, entrada separada, ações e dez parcelas com descrição curta em 1366×768/100%, além de histórico completo com excedentes e textos extensos em região identificável operável por teclado. Registrar capturas, comparação com `exemploDadosDaVenda.png` e resultados nos dois temas/viewports no README.

## 4. Migrar demais módulos e formulários

- [ ] 4.1 Migrar cadastro, edição e prévia, atualizando seus testes e comparando a composição do cadastro a `exemploCadastrarVenda.png`; verificar campos/erros associados, entrada, confirmação, cancelamento, envio duplicado e preservação dos dados nos dois temas/viewports. Registrar capturas/resultados no README, sem copiar cliente mestre ou campos financeiros novos.
- [ ] 4.2 Migrar Visão Geral, Relatórios e Configurações com testes próprios e padrão derivado das referências; verificar quatro indicadores apenas na Visão Geral, três resumos limitados, relatórios do mês fixo, exportação indisponível e Configurações explicativa. Incluir estados vazios, textos extensos e páginas/registro ausentes; registrar evidências nos dois temas/viewports no README.
- [ ] 4.4 Migrar a apresentação do recebimento e seus estados com testes próprios, preservando seleção sequencial, valor exato, falha/retry, confirmação única, cancelamento e retorno de foco após quitação; conferir modal e controles nos dois temas/viewports e registrar capturas/resultados no README. Executar após 4.1 e antes de 4.3.
- [ ] 4.3 Após 4.4 e todas as telas migradas, remover a ponte Bootstrap, dependência/import, tokens `--bs-*`, `data-bs-theme` e classes exclusivas, ativar Preflight e concluir conversão SCSS → CSS em `styleUrl`, entrada global, dois alvos, `inlineStyleLanguage` e schematics. Remover dependência direta Sass se não houver uso; verificar instalação limpa, ambos os builds e testes afetados por reset/precedência. Preservar `bootstrapApplication` Angular e histórico documental; registrar auditoria e resultados no README.

## 5. Verificação integrada visual e funcional

- [ ] 5.1 Consolidar regressão integral com os testes já adaptados em cada entrega: executar em `frontend/` `npm test -- --watch=false`, `npm run test:e2e` e `npm run test:e2e:paginacao-fixture`, incluindo cadastro → recebimento → quitação → edição → consultas/resumos → recarga, sem armazenamento ou rede externos. Registrar resultados e falhas, sem atribuir à revisão documental execução de aplicação.
- [ ] 5.2 Consolidar a matriz visual de todas as rotas/modal e estados nos dois temas em 1366×768/100% e 390×844, relacionando referência, captura, critérios, resultado e diferenças justificadas; verificar geometria, teclado, foco, movimento reduzido e contrastes 4,5:1/3:1 inclusive estados ativos/hover/erro. Complementar com zoom nativo 200% documentando navegador/versão, escala Windows e viewport útil; sem medição manual disponível, manter pendência, não substituir por CSS zoom nem alegar aceite global.
- [ ] 5.3 Executar `npm ci`, `npm run build`, `npx ng run vendas-em-aberto:build-paginacao-fixture` e `npm run format:check` em `frontend/`, sem alterar budgets; validar a Change com `openspec validate troca-para-tailwind --strict` na raiz. Consolidar no README versões, comandos, resultados, evidências visuais, avisos e verificações não executadas; confirmar ausência final de Bootstrap visual sem remover inicialização Angular nem referências históricas.

## Workflow follow-up

- Não abrir PR apenas por esta revisão: a proposta de migração continua sem implementação. Usar o PR único da mesma feature branch somente depois de todo o escopo autorizado concluído, com o template do repositório e referências PRD/TDD/SDD.
- Sync/archive seguem fluxo próprio quando aplicável; não encerrar FASE-008, pendências de avaliação ou aceite da ótica por regressão técnica. Merge exige autorização explícita.
