# Tasks

No planejamento inicial, todas as caixas abaixo representavam execução futura, não trabalho concluído.
Começar somente após revisão dos artefatos e novo pedido explícito de apply. Referências:
`docs/prd/vendas-em-aberto.md`, RF-011 e RNF-001/004/008/010;
`docs/tdd/tdd.md` v1.3, FASE-001/002 e DEC-001/002/003/008/009/013/014;
`specs/demonstracao-inicial/spec.md`. A FASE-001 global continua parcial nas regras diferidas.

Verificação documental do planejamento em 12/11/2026: `openspec validate
preparar-base-tecnica-frontend --strict`, na raiz, aprovado. `git diff --check` sem erros
de whitespace, apenas aviso de normalização LF/CRLF no TDD. Instalação, build e testes da
aplicação não executados: a base ainda será implementada mediante novo pedido.

## 1. Preparação do recorte e compatibilidade — FASE-001

- [x] 1.1 Revalidar branch dedicada, estado do diretório e colisões nos destinos específicos descritos em `design.md`; verificar por `git status` e comparação dos arquivos que a base não sobrescreverá conteúdo alheio nem exigirá exclusão de caches/saídas; interromper e perguntar se houver colisão não autorizada.
- [x] 1.2 Conferir metadados oficiais e documentação dos patches estáveis candidatos nas faixas do TDD, incluindo engines, peers, npm e licenças diretas; verificar uma combinação de Angular/CLI/build 22.x, TypeScript 6.0.x, Node.js 24 compatível, RxJS exigido, Bootstrap 5.3.x, Sass, Vitest/jsdom, Playwright e Prettier; registrar a matriz e fontes em `frontend/README.md` antes da instalação definitiva; bloquear em incompatibilidade, sem flags de força ou troca silenciosa de major (TDD/PEN-015).
- [x] 1.3 Registrar em `frontend/README.md` o recorte FASE-001/002, a decisão DEC-014 e os bloqueios diferidos, apontando temas para FASE-003, regras para suas fases e PRD/PEN-013/014 para avaliação de produto; verificar que nenhum item aberto seja declarado resolvido ou aprovado pela ótica.

## 2. Base executável e formatação — FASE-002

- [x] 2.1 Gerar a base standalone/SCSS/zoneless em local isolado e transferir apenas arquivos necessários para `frontend/`, com configurações estritas e HTML separado; verificar manifesto/configurações de acordo com `design.md`, ausência de ZoneJS/SSR/PWA/HTTP de dados e ausência de páginas, modelos ou serviços comerciais antecipados.
- [x] 2.2 Fixar as dependências diretas resolvidas e registrar npm/engines, gerar `package-lock.json` pela ferramenta e criar exclusões locais para dependências, build, cache e resultados E2E; verificar instalação por `npm.cmd ci` em `frontend/` e revisão do status sem arquivos gerados indevidos, registrando versões e resultado em `frontend/README.md`.
- [x] 2.3 Configurar Prettier, suas exclusões e scripts `format`/`format:check`, com dois espaços, aspas simples e largura 100, sem lint; verificar `npm.cmd run format:check` no frontend e documentar os comandos, confirmando que saídas e documentos fora do frontend não são formatados.
- [x] 2.4 Configurar scripts `start`, `build` e `test` com a CLI compatível e documentar execução Windows em `frontend/README.md`; verificar inicialização local e `npm.cmd run build` de produção com tipos/templates estritos, registrando resultado sem tratar servidor de desenvolvimento como backend.

## 3. Página demonstrativa e estilos — FASE-002

- [x] 3.1 Criar a página técnica com `h1` do produto, explicação de ausência de fluxos comerciais, aviso literal da delta e `lang="pt-BR"`; adicionar testes de componente para identidade, aviso e explicação; verificar os testes por `npm.cmd test -- --watch=false` e ausência de login, formulários ou ações comerciais na página.
- [x] 3.2 Importar Bootstrap 5.3.x uma única vez por SCSS global e aplicar contêiner/utilitário mínimo sem plugins JS, uso de Popper, ativos remotos ou alternância de tema; permitir Popper apenas como peer transitivo instalado conforme TDD/DEC-013 e verificar sua ausência no bundle; verificar `npm.cmd run build`, aplicação visual dos estilos e registrar warnings Sass de terceiros e seus impactos em `frontend/README.md`, sem esconder erros ou alegar entrega da FASE-003.
- [x] 3.3 Configurar Vitest/TestBed/jsdom sem ZoneJS e acrescentar caso unitário reativo e teste de atualização de signal em fixture zoneless, usando host de teste se necessário; verificar `npm.cmd test -- --watch=false` sem detecção forçada para mascarar falhas e documentar o alcance limitado dos testes, sem fabricar função de negócio apenas para cobertura.

## 4. Smoke E2E da demonstração inicial — FASE-002

- [x] 4.1 Configurar Playwright Test, script `test:e2e`, instalação do Chromium correspondente e dois projetos de viewport 1366 × 768 e 390 × 844 no Windows, com `webServer` e `baseURL` em `http://127.0.0.1:4200` sem reutilizar servidor desconhecido; documentar instalação/execução e verificar subida e encerramento do servidor por `npm.cmd run test:e2e` com cenário mínimo de abertura.
- [x] 4.2 Implementar os cenários de identidade, aviso após recarga, idioma e leitura sem corte horizontal em ambos os projetos, com captura de `pageerror` e erros inesperados de console; verificar todos os casos em `npm.cmd run test:e2e` e registrar resultados por viewport, sem extrapolar suporte a dispositivos ou aceite do MVP.
- [x] 4.3 Acrescentar verificação em contexto limpo de ausência de APIs de dados/CDNs, cookies de aplicação, localStorage, sessionStorage e bancos do navegador após abertura/recarga; verificar por E2E e inspeção de fonte a ausência de persistência e coleta pessoal, distinguindo recursos locais e canal de desenvolvimento de consultas de dados; registrar limitações da inspeção.

## 5. Verificação integrada e rastreabilidade — FASE-002

- [x] 5.1 Executar em `frontend/` a sequência integrada `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`; verificar códigos de saída e registrar comandos, versões, ambiente, resultados, warnings e itens não executados em `frontend/README.md`, sem marcar sucesso quando houver bloqueio.
- [x] 5.2 Revisar diff e rastreabilidade final com PRD/TDD/delta, validar `openspec validate preparar-base-tecnica-frontend --strict` e atualizar este registro com evidências reais; verificar que apenas a base do recorte está entregue, que não há segredos/dados reais/gerados indevidos e que FASE-003 a FASE-008, temas e regras abertas não foram incluídos nem declarados concluídos.

## Evidências do apply — 13/11/2026

- Pedido explícito de implementação das FASE-001/002; branch dedicada reutilizada,
  sem sobrescrever arquivos alheios. As alterações anteriores de planejamento foram preservadas.
- Tarefa 1.2 pausada ao detectar peer obrigatório de Popper em Bootstrap. O usuário autorizou
  presença somente instalada, sem importação/execução/bundle; TDD/DEC-013 e design atualizados
  antes da implementação. Lockfile confirma Popper 2.11.8 como peer; análise de 256 inputs
  do build com `--stats-json` confirma ausência de Popper, plugins JS Bootstrap e ZoneJS.
- Geração isolada com CLI 22.2.6, standalone/SCSS/zoneless; tentativa inicial de caminho
  absoluto falhou sem transferência. Após confirmação, geração relativa funcionou.
- Em `frontend/`, sequência integrada com saída 0: `npm.cmd ci` (288 pacotes, auditoria npm
  automática sem vulnerabilidades reportadas), `npm.cmd run format:check`, `npm.cmd run build`,
  `npm.cmd test -- --watch=false` (5/5 em 2 arquivos) e `npm.cmd run test:e2e` (8/8,
  quatro por viewport). Porta 4200 livre após E2E; nenhum erro inesperado de console/pageerror.
- Avisos reais: Sass `@import` depreciado e scripts npm não aprovados de quatro pacotes.
  Nenhuma supressão, aprovação automática ou flags de força/ignorar peers.
- Revisão de fonte, status e lockfile sem segredos/dados reais/gerados indevidos encontrados;
  `git diff --check` com saída 0 e avisos LF/CRLF; validação OpenSpec estrita aprovada.
- Matriz de versões, fontes, ambiente Windows/Chromium, resultados, rastreabilidade e limites
  em `frontend/README.md`. FASE-001 global parcial; FASE-003 a FASE-008 e pendências de temas,
  regras e aceite de produto não foram declaradas concluídas. Sem commit, push, PR ou merge
  por este agente. Revisão humana e eventual publicação/arquivamento continuam pendentes.

## Workflow follow-up

- Apresentar para revisão um resumo conforme `.github/pull_request_template.md`, com escopo efetivamente entregue, PRD/TDD/SDD, evidências, limitações e verificações não executadas. Publicar PR da feature branch para `main` somente com solicitação explícita.
- Não fazer commit, push ou merge por inferência da autorização de apply; observar a autorização específica do usuário e as proteções/revisões exigidas pelo repositório.
- Arquivar esta mudança somente em fluxo solicitado após implementação e revisão; conferir o resultado sem declarar o MVP inteiro concluído.
