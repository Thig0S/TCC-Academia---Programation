# Design

## Context

O frontend é uma aplicação Angular 22 standalone, zoneless e baseada em Signals. Hoje importa Bootstrap 5.3.9 globalmente pelo Sass; templates usam suas classes para layout e controles, estilos consultam tokens `--bs-*`, e o tema é exposto como `data-bs-theme`. Há SCSS global e por componente. As referências visuais estão em `frontend/public/imgs/exemplos/`; as especificações existentes também impõem contraste, foco, dois temas, densidade e fluxos que não podem regredir. Motivação e escopo estão em `proposal.md`; os contratos visuais estão nas deltas de `temas-visuais` e `consulta-vendas`.

**Bloqueio documental:** este desenho propõe substituir DEC-013, mas `docs/tdd/tdd.md` ainda determina Bootstrap e proíbe Tailwind. Antes de qualquer implementação, conciliar o PRD e depois o TDD, preservando seus IDs/histórico; revisar então esta Change com referências às revisões efetivas. Esses documentos não são alterados nesta revisão. Artefatos completos no CLI não significam autorização ou ausência desse bloqueio.

**Alvos observados:** `frontend/angular.json` referencia `src/styles.scss`, `inlineStyleLanguage: scss` em aplicação e fixture, e geração de componentes em SCSS. Só o alvo principal possui configuração `production`; a fixture usa `build-paginacao-fixture` sem essa configuração. Há templates inline em TypeScript, como o selo de situação, além dos HTML externos.

## Goals / Non-Goals

**Goals:**

- Migrar a camada de apresentação para Tailwind sem alterar estado, domínio, rotas ou comportamento dos fluxos.
- Dar aos temas claro e escuro tokens explícitos e reutilizáveis que não dependam de Bootstrap.
- Organizar a migração por superfície visual e validar build, comportamento, acessibilidade e fidelidade em etapas.

**Non-Goals:**

- Introduzir uma biblioteca de componentes, ícones, gráficos ou JavaScript de interface.
- Redesenhar regras de negócio ou copiar controles e dados das imagens.
- Fazer Tailwind determinar estrutura de domínio ou estado Angular.

## Decisions

### Tailwind CSS v4 com integração de build Angular, sem Sass

Adotar Tailwind v4 e seu plugin de build PostCSS, importando Tailwind a partir de uma folha de entrada CSS. A documentação oficial consultada indica que v4 é um pipeline CSS próprio e não foi desenhado para ser executado por Sass/SCSS. Portanto, substituir as entradas SCSS por CSS e remover Sass quando não houver uso residual necessário; não encadear Tailwind dentro do Sass.

Usar `tailwindcss`, `@tailwindcss/postcss` e as dependências exigidas pela integração oficial, fixando patches compatíveis no manifesto/lockfile durante o apply, sem atualizar Angular/Node/npm como consequência. Registrar o plugin em configuração PostCSS reconhecida pelo builder (preferência por `.postcssrc.json` no frontend) e a entrada em `src/styles.css`. Ajustar ambos os alvos, referências `styleUrl`, estilos inline e padrão de geração de componentes para CSS. Não duplicar a folha Tailwind inteira em componentes.

**Alternativas consideradas:** Tailwind v3, que teria fluxo de configuração distinto e mantém mais passos de configuração; manter Bootstrap junto ao Tailwind, que deixaria duas fontes concorrentes de utilitários, resets e tokens e contrariaria a remoção solicitada. A escolha v4 deve ser confirmada por um build mínimo no Angular CLI 22 antes de migrar telas; se a integração suportada pelo builder não funcionar, interromper a migração ampla e revisar a decisão em vez de contornar silenciosamente o pipeline.

### Utilitários nos templates Angular e CSS local somente para composição específica

Expressar layout, espaçamento, tipografia, responsividade e estados de interação prioritariamente com utilitários Tailwind nos templates. Manter CSS local apenas para composição específica que não fique clara ou sustentável como utilitários, regras de acessibilidade e detalhes de componentes; não criar uma camada genérica concorrente de classes visuais.

Garantir detecção de classes em `src/**/*.html` e `src/**/*.ts`, incluindo templates inline, mapas de situações e fixture. Usar nomes de classes completos e literais nos mapas condicionais; não construir nomes por concatenação de fragmentos. Validar CSS computado em build otimizado para impedir que uma classe ausente passe despercebida num simples build bem-sucedido.

**Alternativas consideradas:** manter todas as regras em folhas SCSS/CSS locais, preservando a abordagem atual e limitando o valor da migração; usar Tailwind exclusivamente em CSS com `@apply`, que ocultaria a composição utilitária e aumentaria a manutenção de folhas paralelas.

### Tokens semânticos próprios para temas claro e escuro

Definir tokens semânticos compartilhados para fundos, superfícies, texto, bordas, identidade, estados, foco e navegação. O tema atual permanece controlado pelo serviço Angular e alterna em memória; os tokens refletem esse estado sem `data-bs-theme` nem variáveis `--bs-*`. Usar variante escura vinculada explicitamente ao estado do tema, sem inferir preferência do sistema nem persistir preferência.

Usar `data-tema="light|dark"` em `app-root`, com seletores que incluam o próprio host e descendentes, e variante `dark` ligada a `[data-tema='dark']`. Manter o `dialog` sob esse contexto: `showModal()` não deve exigir mover o componente para fora da árvore temática. Definir tokens com o mesmo nome nos dois temas e integrá-los aos utilitários por variáveis/tema CSS; nada de duplicar listas de cores por página. Migrar seletores e expectativas de testes juntos em cada entrega. Enquanto a ponte atender telas residuais, o atributo antigo pode refletir o mesmo signal sem virar uma segunda fonte; removê-lo definitivamente no corte final da tarefa 4.3.

**Alternativas consideradas:** cores arbitrárias repetidas em utilitários, que dificultariam consistência entre telas; variantes apenas por preferência do sistema, incompatíveis com o tema escuro inicial e o controle explícito existentes.

### Migração horizontal por camadas visuais, com verificação após cada grupo

Fazer primeiro uma integração mínima com Preflight adiado, mantendo Bootstrap como ponte temporária nas telas não migradas. Limitar a ponte à branch de trabalho; migrar tokens, estrutura, componentes e páginas por grupos com testes e registros próprios. Ao final dos grupos, remover integralmente a ponte, dependência, import e acoplamentos Bootstrap, ativar a entrada Tailwind completa com Preflight e repetir a regressão. Não declarar a Change entregue enquanto coexistirem os dois sistemas.

Na etapa transitória, carregar somente tema/utilitários Tailwind com camadas e ordem explícitas e verificar precedência sobre regras Bootstrap; não supor que a ordem de imports resolve regras sem camada versus regras em camada. Não importar o reset global antecipadamente. Testar nessa etapa e novamente após o corte final os estilos computados de botões, campos, tabelas e títulos. A ponte não vira uma biblioteca de compatibilidade permanente nem autoriza relaxar contrastes.

**Alternativas consideradas:** conversão de todos os templates em um único lote, com alto risco de regressões difíceis de localizar; coexistência prolongada de Bootstrap e Tailwind, que dificulta atribuir a origem dos estilos e validar os temas.

### Fidelidade visual verificável sem igualdade literal

Aplicar a matriz de referências definida em temas-visuais. Listas e detalhe devem conservar CA-027/028/029; formulários usam a composição em blocos e prévia da imagem, sem incorporar cliente mestre ou campos financeiros adicionais. Visão Geral, Relatórios e Configurações mantêm seus conteúdos atuais e recebem o mesmo acabamento. Preservar logo, SVGs locais e `dialog` nativo, sem catálogo de ícones, fonte remota ou novas requisições externas.

Para cada grupo, registrar capturas com tema, viewport, cenário sintético e diferenças justificadas. Conferir hierarquia/alinhamento, tipografia, superfícies, cores, espaçamentos, bordas/cantos, estados e ações, comparando a referência correspondente quando existir. As imagens são referência de design, não snapshots com dados idênticos; não inventar percentual de similaridade nem copiar seus dados. Asserções de geometria/contraste são automatizáveis; aprovação visual não é inferida apenas de testes verdes.

**Alternativa considerada:** comparação pixel a pixel com as imagens originais. Rejeitada porque proporções, dados e diferenças funcionais aprovadas tornam esse critério inadequado.

### Testes e evidências acompanham cada entrega

Atualizar testes ao mudar cada componente, sem adiar adaptações para a regressão final nem removê-los para acomodar falhas. Trocar seletores Bootstrap por papéis, nomes acessíveis e atributos estáveis existentes; substituir a expectativa `bootstrapAplicado` por verificações de aparência/comportamento pertinentes. Preservar asserções de domínio, privacidade, ausência de rede externa, foco e densidade. Não remover `bootstrapApplication`: trata-se da inicialização Angular, não da dependência visual.

Em cada grupo, executar unitários/componentes sem watch, E2E pertinentes nos dois temas/viewports e build; registrar resultados no README junto da entrega e criar commit individual coerente com testes/documentação. A etapa final só consolida a regressão integral. Zoom nativo de 200% exige evidência manual com navegador/versão, escala Windows e viewport útil; `CSS zoom`, escala de captura ou apenas reduzir viewport não o substituem. Se não for possível executar, registrar pendência em vez de marcar a verificação concluída.

**Alternativa considerada:** ajustar todos os testes somente ao final. Rejeitada por ocultar regressões de etapas anteriores.

## Risks / Trade-offs

- [Integração PostCSS pode não ser compatível com o builder Angular 22 ou com ambos os alvos de build] → validar um protótipo mínimo nos alvos de aplicação e fixture antes da migração visual ampla; não avançar se falhar.
- [A remoção do CSS Bootstrap altera estilos nativos de tabelas, botões, campos e elementos sem estilo] → inventariar componentes existentes e verificar cada fluxo e controle nos dois temas.
- [Utilitários extensos em templates podem reduzir legibilidade e replicar combinações] → compartilhar componentes já existentes e reservar CSS local para padrões de composição estáveis, sem inventar abstrações genéricas.
- [A aproximação visual pode competir com densidade, contraste e foco] → usar capturas nos viewports existentes e verificar critérios funcionais, contraste, teclado, zoom e movimento reduzido.
- [Mudanças de largura/altura podem exceder budgets ou alongar telas] → acompanhar build e cenários de densidade sem alterar budgets ou ocultar conteúdo como atalho.
- [Preflight e precedência de camadas alteram o visual na transição/corte final] → adiar reset, tornar a ordem explícita e verificar estilos computados e regressão após remover a ponte.
- [Suporte mínimo de browser do Tailwind v4 não corresponde a todo navegador antigo] → registrar os requisitos oficiais do patch escolhido e verificar o ambiente técnico disponível; não alegar compatibilidade Chrome/aceite global apenas com Chromium automatizado.

## Migration Plan

1. Resolver a conciliação PRD → TDD → SDD, revisar os artefatos e obter autorização explícita de apply antes de executar as tarefas.
2. Registrar a linha de base real e provar a integração Tailwind v4/PostCSS nos alvos de aplicação e fixture, sem retirar a base das telas ainda não migradas.
3. Migrar tokens/tema, estrutura, componentes e páginas com testes, capturas, documentação e commits próprios de cada entrega.
4. Remover Bootstrap e Sass direto, concluir conversão CSS e ativar Preflight; confirmar ausência de acoplamentos e repetir verificações afetadas.
5. Consolidar regressão integral e evidências, preservando budgets e registrando falhas, avisos e pendências reais. Abrir o PR único apenas quando todo o escopo autorizado estiver completo; merge exige autorização própria.

Comandos de verificação, executados em `frontend/` durante o apply: `npm ci`, `npm run build`, `npx ng run vendas-em-aberto:build-paginacao-fixture`, `npm test -- --watch=false`, `npm run test:e2e`, `npm run test:e2e:paginacao-fixture` e `npm run format:check`. Não solicitar `:production` para a fixture, que não possui essa configuração. As suítes E2E já iniciam servidores locais próprios; evitar concorrência entre execuções que usem a mesma porta.

Como a migração é de frontend e não muda dados persistidos nem contratos externos, rollback consiste em reverter a mudança de código na branch antes da integração. Não manter compatibilidade simultânea de estilos como mecanismo de rollback.

## Open Questions

Não há nova decisão de produto pendente nesta revisão. Isso não resolve o bloqueio de conciliação PRD/TDD indicado no início. Os patches e a compatibilidade local serão verificados na primeira etapa autorizada; falha de integração ou incompatibilidade com o ambiente requerido interrompe o trabalho para revisão, sem adotar outra major ou mudar requisitos silenciosamente. Nenhum teste de aplicação ou integração Tailwind foi executado nesta revisão documental.
