# Base técnica — Vendas em Aberto

## Apply FASE-003 — 13/11/2026

Implementação autorizada explicitamente pelo pedido de apply `fase-003`, na branch
`feature/fase-003-implementacao`, criada da `main` atualizada (`a5dee79`). Estado inicial:
somente cinco imagens não versionadas, preservadas e autorizadas para inclusão no commit.
Base: Angular 22.2.6 e Bootstrap 5.3.9, sem Router, Forms ou ZoneJS no manifesto inicial.
Referências: PRD 1.1, TDD 1.4 e `openspec/changes/fase-003/`.

O recorte autoriza estrutura, rotas, temas em memória e conteúdo explicativo, não FASE-004
a FASE-008 nem regras comerciais abertas. `public/imgs/logo-franquia.jpg` será usada na
identidade, sem alteração da imagem. Os quatro arquivos em `public/imgs/exemplos/`
(`exemploCadastrarVenda.png`, `exemploDadosDaVenda.png`, `exemploDesignDark.png` e
`exemploListagemDeVendas.png`) foram inspecionados apenas como referências de composição,
espaçamento e hierarquia; não autorizam copiar dados, campos ou ações comerciais.
Os registros abaixo desta seção são evidências históricas da base, não deste apply.

### Dependência de navegação

`npm.cmd install --save-exact @angular/router@22.2.6` gerou o lockfile (saída 0).
Peers consultados: Angular core/common/platform-browser 22.2.6 e RxJS compatível com 7.8.2.
`npm.cmd ci`, `npm.cmd ls --depth=0` e `npm.cmd run build` passaram (saída 0), sem
flags de força, Forms, ZoneJS ou upgrades incidentais. Build inicial: 324,32 kB.
Permanecem os avisos dos quatro scripts npm não aprovados e Sass `@import` depreciado;
nenhum aviso foi suprimido e nenhum script foi aprovado automaticamente.

### Estrutura e layout

Rotas lazy, redirecionamento inicial, wildcard com retorno, títulos contextuais e identidade
global implementados. `npm.cmd run build`: saída 0 (438,54 kB iniciais); unitários/componentes:
13/13; E2E incremental: 8/8, incluindo logo carregada e proporção natural preservada,
aviso, pt-BR, estilos efetivos Bootstrap, ausência de rolagem horizontal e isolamento inicial.
Revisão visual em Chromium via Playwright, 1366 × 768 e 390 × 844: coluna lateral desktop,
navegação inteira no fluxo abaixo de md, marca legível, título e aviso sem corte. No pequeno
há rolagem vertical normal, sem esconder destinos. Referências orientam somente estrutura e
hierarquia; nenhum formulário/dado das capturas foi incorporado. Sass mantém seu warning.
Esta revisão incremental ainda não comprova temas, zoom, foco ou aceite do produto.

Regressão de navegação: `npm.cmd test -- --watch=false` aprovou 13/13 testes;
`npm.cmd run test:e2e` aprovou 12/12 execuções nos dois viewports. Cobertura: URL direta e
recarga dos cinco destinos, título contextual, aviso/identidade, um aria-current, Tab/Enter,
atalho para conteúdo, foco no h1, link já ativo sem roubo de foco, voltar/avançar, navegação
rápida e wildcard/retorno. Monitoramento de console/pageerror sem erros; inspeção de rede
local e storage preservada. Um erro incremental de compilação acessou `.id` em um signal
de navegação; após pausa e autorização explícita, foi corrigido para chamar o signal.
As execuções acima são posteriores à correção. Nenhum timer ou detectChanges foi acrescentado.

### Tema global em memória

Serviço raiz com signal privado e leitura readonly, sem providers duplicados. Tema escuro
inicial, botão nativo “Tema escuro”, estado textual e aria-pressed, variáveis Bootstrap no
host cobrindo a viewport. SCSS complementar somente para foco e controle de tema.
Unitários/componentes: 16/16 aprovados, incluindo alternância e identidade da instância em
todas as páginas lazy. E2E: 18/18 aprovados (9 por projeto Chromium), incluindo Enter/Espaço
sem roubo de foco/rota, sistema claro/escuro, recarga e contextos novos, escolha clara mantida
pelos links de todos os destinos e evento de histórico para wildcard. Nenhum erro inesperado
de console/pageerror observado. Inspeção após alternar/navegar: somente recursos GET locais
e WebSocket Vite; cookies/storage/IndexedDB/caches/service workers vazios. Não há persistência,
leitura da preferência de sistema, novos pacotes ou JavaScript Bootstrap/Popper na aplicação.
Limite: Chromium/Windows nos viewports técnicos não homologa dispositivos ou outros motores.

Contraste: teste E2E calcula luminância sRGB e razão WCAG a partir de `getComputedStyle`,
compondo transparência sobre os fundos ancestrais; inspeciona textos, ativo, botão e foco
em Quitadas (superfícies compartilhadas), nos dois temas/viewports, com movimento reduzido.
Falha real inicial no link de Configurações: 4,27:1; após pausa e autorização, links de
conteúdo/perfil passaram a usar `--bs-primary-text-emphasis`, sem reduzir o mínimo do teste.
Suíte posterior: 20/20; execução dirigida `npm.cmd run test:e2e -- --grep "contraste efetivo"`:
2/2. Mínimos medidos: escuro texto 5,51:1, borda do botão 10,23:1, foco 5,51:1; claro texto
6,59:1, borda 14,63:1, foco 12,81:1. Contorno 3 px; fundos da raiz rgb(33,37,41)/branco.
Revisão visual de Quitadas em desktop/pequeno, ambos os temas: foco visível, tema sem bordas
brancas externas, ativo sublinhado e módulo destacado, marca legível; movimento reduzido não
impede ações. Não é certificação integral, teste de leitor de tela nem homologação da ótica.

### Conteúdo comercial indisponível

Visão Geral, Vendas, Quitadas e Relatórios informam explicitamente que nenhuma consulta foi
realizada: não são consultas vazias. Não estão implementados domínio, registros, indicadores,
cadastro, edição, parcelas, pagamento, filtros ou exportação. Controles existentes são apenas
navegação e tema. `npm.cmd test -- --watch=false`: 20/20; E2E dirigido de páginas comerciais:
2/2, cobrindo as quatro páginas nos dois viewports, sem formulários, tabelas, valores ou
ações comerciais inventadas. Os textos não copiam dados pessoais ou financeiros das imagens.

Configurações explica os quatro limites de PRD/CA-022: dados fictícios, memória, descarte
ao recarregar e ausência de uso operacional/cobranças reais. Não há controles fictícios.
Unitários/componentes posteriores: 21/21. E2E dirigido de Configurações: 2/2, exercitando
menu e atalho nos dois temas e viewports. PRD/PEN-012 está parcialmente resolvida somente
para esse conteúdo (HIP-004 aceita); os filtros de Quitadas continuam fora do escopo.

Revisão de conteúdo com PRD/RF-001/011/012, CA-022 e TDD/FASE-003 e deltas: quatro módulos,
Quitadas interna, nenhuma implementação de cadastro mestre, formulário, lista ou domínio.
Busca no fonte confirmou somente a logo como imagem da interface; capturas não são carregadas.
Manifesto mantém Bootstrap como única base visual e Router como única dependência direta nova.
Regressão de conteúdo consolidada: 21/21 testes unitários/componentes e 24/24 execuções E2E
aprovadas, incluindo todos os contratos anteriores. Os exemplos não definiram campos/regras.

### Verificação integrada da FASE-003 — 13/11/2026

Ambiente revalidado: Windows 11 Home 64 bits 10.0.26200, Node 24.21.0, npm 11.19.0;
Angular/Router/CLI/build 22.2.6, TypeScript 6.0.3, Vitest 5.1.0, jsdom 31.0.0 e
Playwright 1.65.0/Chromium. Após instalação limpa em `frontend/`:

| Comando                         | Saída | Resultado                                                                    |
| ------------------------------- | ----- | ---------------------------------------------------------------------------- |
| `npm.cmd ci`                    | 0     | 289 pacotes; auditoria automática reportou 0 vulnerabilidades                |
| `npm.cmd run format:check`      | 0     | Prettier aprovado                                                            |
| `npm.cmd run build`             | 0     | Produção estrita; 466,15 kB iniciais, estimativa de transferência 87,08 kB   |
| `npm.cmd test -- --watch=false` | 0     | 21/21 testes em 5 arquivos                                                   |
| `npm.cmd run test:e2e`          | 0     | 24/24 execuções, 12 por viewport; sem erros inesperados de console/pageerror |

E2E usa servidor próprio (`reuseExistingServer: false`), iniciado e encerrado pelo runner.
Os servidores da inspeção visual foram encerrados antes dos E2E, sem reutilizar servidor
alheio. Cobertos navegação/tema/recarga/isolamento e contraste. Warnings mantidos: quatro
scripts npm não aprovados e Sass `@import` depreciado. Auditoria npm não é certificação de
segurança ou licenças. Não houve aprovação automática de scripts ou bypass de peers.

### Percurso assistido e bloqueio da tarefa 5.2

Inspeção interativa via ferramentas Playwright, fora do runner E2E, com Tab/Enter/Espaço:
Visão Geral → Vendas → Quitadas → Relatórios → Configurações → Visão Geral, nos dois
temas e viewports, com movimento reduzido. Todos os destinos ficaram alcançáveis, foco no
h1 após mudança e nenhuma rolagem horizontal. Atalho “Ir para o conteúdo” levou ao main
após aguardar a página renderizar; uma leitura imediata anterior à conclusão da ação não
foi usada como resultado. Revisão visual de Quitadas e Configurações confirmou texto,
aviso, tema, foco e leitura sem corte. Não é avaliação humana com tecnologia assistiva.

**Zoom nativo a 200% não executado:** o atalho enviado ao navegador controlado não alterou
o zoom (innerWidth 1366, devicePixelRatio 1 e visualViewport.scale 1 antes/depois). Foi
oferecida verificação por CSS `zoom: 200%`; o solicitante preferiu manter o zoom nativo
pendente, sem aceitar substituição. Portanto a tarefa 5.2 permanece aberta e **não abrir PR**
até concluí-la. Não se alega conformidade a zoom 200%, homologação de navegadores/dispositivos
reais ou aceite da ótica. Firefox, WebKit e leitor de tela não foram verificados.

### Rastreabilidade final e estado da entrega

| Referência                                              | Evidência técnica                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| PRD/RF-001/012, CA-001/022; TDD/DEC-003/008             | Rotas, módulos, Quitadas, Configurações, testes de Router/componentes/E2E e percurso assistido               |
| PRD/RNF-009, CA-023; TDD/DEC-006/013                    | Serviço raiz, tema global, teclado, recarga, contraste medido e estado somente em memória                    |
| PRD/RF-011, RNF-001/004/010; delta demonstracao-inicial | Aviso literal, pt-BR, identidade, rede local e ausência de persistência após interações                      |
| TDD/DEC-002/009/014                                     | Angular standalone zoneless estrito, apenas Router alinhado acrescentado, lockfile e automações reexecutadas |

Na raiz, `openspec validate fase-003 --strict`: aprovado; `git diff --check`: saída 0,
apenas avisos LF/CRLF. Diff revisado: implementação e testes desta fase, documentação,
dependência Router e as cinco imagens explicitamente solicitadas. Sem alterações de regras,
persistência, backend ou antecipação das FASE-004 a FASE-008. Capturas temporárias da revisão
ficaram fora do Git. Os servidores próprios de inspeção foram encerrados.

CA-018 (registro de venda inexistente) e CA-021 completos (mutações de negócio e descarte)
continuam não atendidos: wildcard de rota não substitui registro inexistente. Pendências
comerciais permanecem abertas; PEN-012 só foi parcialmente resolvida para o conteúdo de
Configurações. PRD/PEN-013/014 seguem abertos. CA-001/022/023 possuem evidências técnicas
deste recorte, não aceite comercial. **Entrega pausada pela tarefa 5.2, sem PR, merge,
sincronização de specs ou arquivamento. O MVP não está concluído.**

## Compatibilidade verificada antes da instalação

Ambiente observado na execução de 12–13/11/2026: Windows, Node.js 24.21.0 e npm 11.19.0.
Os metadados abaixo foram consultados com `npm.cmd view <pacote>@<versão>
version engines peerDependencies peerDependenciesMeta license --json` no registro npm.
São versões estáveis candidatas fixadas para esta base, não resultado de build ou testes.

| Pacote / ferramenta                                       | Versão  | Compatibilidade relevante                                                             | Licença                               |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Node.js                                                   | 24.21.0 | Recorte `>=24.15.0 <25`                                                               | MIT e avisos próprios da distribuição |
| npm                                                       | 11.19.0 | Node `^20.17.0                                                                        |                                       | >=22.9.0` | Artistic-2.0 |
| `@angular/core`, `common`, `compiler`, `platform-browser` | 22.2.6  | Node `^22.22.3                                                                        |                                       | ^24.15.0  |              | >=26`; peers Angular alinhados; RxJS `^7.4.0` | MIT |
| `@angular/cli`, `@angular/build`, `@angular/compiler-cli` | 22.2.6  | Node como acima; npm >=8 aceito; TypeScript `>=6.0 <6.1`; build aceita Vitest `^4.0.8 |                                       | ^5.0.0`   | MIT          |
| TypeScript                                                | 6.0.3   | Node >=14.17                                                                          | Apache-2.0                            |
| RxJS                                                      | 7.8.2   | Satisfaz peer Angular; não será store                                                 | Apache-2.0                            |
| tslib                                                     | 2.9.1   | Satisfaz build `^2.3.0`                                                               | 0BSD                                  |
| Bootstrap                                                 | 5.3.9   | Peer obrigatório `@popperjs/core ^2.11.8`                                             | MIT                                   |
| Sass                                                      | 1.104.1 | Node >=20.19; mesma versão usada por `@angular/build`                                 | MIT                                   |
| Vitest                                                    | 5.1.0   | Node `^22.12                                                                          |                                       | ^24       |              | >=26`; peer Vite `^6.4                        |     | ^7  |     | ^8`(build usa 8.3.5); jsdom opcional`*` | MIT |
| jsdom                                                     | 31.0.0  | Node `^22.22.2                                                                        |                                       | ^24.15    |              | >=26`; canvas opcional, não necessário        | MIT |
| `@playwright/test`                                        | 1.65.0  | Node >=20; Chromium correspondente a instalar                                         | Apache-2.0                            |
| Prettier                                                  | 3.10.1  | Node >=14                                                                             | MIT                                   |

ZoneJS e animações são peers opcionais não utilizados. Forms e Router gerados no manifesto
de referência da CLI não têm consumidor neste recorte e não serão adicionados.
Conforme esclarecimento autorizado em TDD/DEC-013, Popper poderá existir **somente instalado
como peer transitivo**; não será importado, executado ou incluído no bundle. Não usar
`--force`, `--legacy-peer-deps` ou contornar engines. Não se trata de auditoria transitiva
completa de licenças ou vulnerabilidades.

Fontes oficiais consultadas:

- Metadados versionados: `https://registry.npmjs.org/<pacote>/<versão>` (pacotes com escopo
  usam, por exemplo, `https://registry.npmjs.org/@angular%2fbuild/22.2.6`).
- [Compatibilidade Angular](https://angular.dev/reference/versions) e
  [testes Angular](https://angular.dev/guide/testing); Context7 Angular CLI v22.2.2 e ajuda
  real de `@angular/cli@22.2.6 ng new --help`.
- [Zoneless](https://angular.dev/guide/zoneless), TestBed e `whenStable` (Context7 Angular).
- [Bootstrap/Sass](https://getbootstrap.com/docs/5.3/customize/sass/) e
  [dependência Popper](https://getbootstrap.com/docs/5.3/getting-started/vite/),
  consultados via Context7 Bootstrap 5.3.8; o peer foi confirmado no pacote 5.3.9.
- [Playwright webServer](https://playwright.dev/docs/test-webserver) e
  [Prettier CLI](https://prettier.io/docs/cli), consultados via Context7.

## Recorte e pendências

Esta entrega cobre somente a preparação aplicável da FASE-001 e a base da FASE-002:
página técnica estática, identidade, aviso demonstrativo, pt-BR e ferramentas mínimas.
Referências: [PRD](../docs/prd/vendas-em-aberto.md), RF-011 e RNF-001/004/008/010;
[TDD](../docs/tdd/tdd.md), DEC-001/002/003/008/009/013/014;
[SDD](../openspec/changes/archive/2026-11-13-preparar-base-tecnica-frontend/).

DEC-014: Prettier com dois espaços, aspas simples e largura 100, sem lint; Vitest/TestBed/
jsdom zoneless; smoke E2E Chromium no Windows em 1366 × 768 e 390 × 844.
O viewport pequeno não comprova emulação nem suporte a aparelhos.

A FASE-001 global permanece parcial. PRD/TDD PEN-006 (temas) continua aberto e bloqueia
a direção visual da FASE-003; importar estilos Bootstrap não conclui essa fase.
As regras comerciais PEN-001 a PEN-005 e PEN-007 a PEN-012 aguardam as decisões das fases
afetadas. PRD/PEN-013 (compatibilidade do produto) e PEN-014 (participantes/aprovadores)
continuam abertos: smoke técnico não significa aceite do MVP nem aprovação da ótica.
FASE-003 a FASE-008, fluxos comerciais, autenticação, APIs de dados, persistência, SSR,
PWA, temas e dados pessoais estão fora deste recorte.

## Execução e evidências

Lockfile gerado por `npm.cmd install --package-lock-only --ignore-scripts --no-audit
--no-fund`. `npm.cmd ci --no-audit --no-fund` terminou com código 0 (288 pacotes);
`npm.cmd ls --depth=0` confirmou as versões diretas da tabela, sem peers inválidos.
O npm 11.19.0 avisou sobre scripts não aprovados de `@parcel/watcher`, `esbuild`, `lmdb`
e `msgpackr-extract`; nenhuma aprovação automática foi feita. As verificações posteriores
determinarão se os binários distribuídos são suficientes. Dependências, caches e saídas
estão excluídos do Git localmente; a revisão de status não mostrou gerados indevidos.

Comandos no PowerShell, a partir de `frontend/`:

```powershell
npm.cmd ci
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false
npm.cmd run format
npm.cmd run format:check
```

`start` serve somente desenvolvimento em `http://127.0.0.1:4200`, não é um backend.
Encerre com Ctrl+C antes dos E2E. `build` usa produção por padrão, com TypeScript e
templates estritos explícitos. `format` e `format:check` usam somente o diretório frontend,
dois espaços, aspas simples e largura 100; ignoram lockfile, dependências, caches,
saídas e relatórios. Não há lint nem formatação dos documentos da raiz.

Verificações incrementais: `npm.cmd run format:check` e `npm.cmd run build -- --stats-json`
terminaram com código 0. O servidor iniciado por `npm.cmd start` respondeu no navegador.
O primeiro acesso encontrou 404 no favicon implícito; foi acrescentado um SVG geométrico
local próprio e referência explícita, sem ativos de terceiros. Testes ainda não executados.

O build Sass reportou depreciação de `@import` na entrada Bootstrap de `src/styles.scss`:
será removido no Dart Sass 3.0. Bootstrap 5.3 usa esse mecanismo; não houve supressão de
warnings nem substituição por CSS pronto. Sass está fixado em 1.104.1 e o build atual
foi aprovado. Atualização futura exige revalidar o pipeline, não ignorar falhas.

Inspeção visual da página confirmou contêiner, espaçamento e aviso Bootstrap aplicados:
em largura 1280, contêiner 1140 px, padding superior 48 px e fundo do aviso
`rgb(255, 243, 205)`. A análise dos 256 inputs de
`dist/vendas-em-aberto/browser-stats.json`, gerado pelo build com `--stats-json`, não
encontrou Popper, plugins JavaScript Bootstrap ou ZoneJS. A primeira tentativa de leitura
usou incorretamente `stats.json`; o nome real foi localizado e a análise refeita com falhas
tratadas como erros, sem usar a tentativa anterior como evidência.

`npm.cmd test -- --watch=false` aprovou 5 testes em 2 arquivos: três de renderização,
um de projeção `computed` e um de atualização do DOM por signal em fixture zoneless.
O builder padrão `@angular/build:unit-test` integra Vitest 5.1.0, TestBed e jsdom 31;
não há ZoneJS, detecção forçada ou função comercial fabricada. Esses testes não comprovam
layout real, acessibilidade integral, cálculos ou os fluxos futuros do MVP.

Para instalar o navegador correspondente e executar os E2E no Windows:

```powershell
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

A instalação executada baixou Chromium/Headless Shell 158.0.8127.18, revisão Playwright
1254, e FFmpeg 1013. O download da ferramenta é necessário apenas na preparação; não é
uma chamada da aplicação. `playwright.config.ts` inicia `npm.cmd start` em loopback e
usa `baseURL` e `webServer.url` iguais a `http://127.0.0.1:4200`, com
`reuseExistingServer: false`. Se a porta já estiver ocupada, não reutilize processo alheio.
O smoke inicial aprovou 2/2 execuções, uma por viewport, e a porta 4200 ficou sem listener
após o encerramento automático. Resultados e traces ficam em `test-results/`, fora do Git.

A ampliação da tarefa 4.2 aprovou 6/6 execuções: 3 casos em 1366 × 768 e 3 em
390 × 844, cobrindo identidade, limite comercial, aviso após recarga, pt-BR e ausência
de corte horizontal. Todos capturam `pageerror` e erros de console (nenhum observado).
Isso não amplia suporte de produto nem representa aceite de compatibilidade do MVP.

A tarefa 4.3 aprovou 8/8 execuções (4 por viewport). Em contextos novos e após recarga,
os testes não observaram APIs de dados, CDNs, cookies, localStorage, sessionStorage,
IndexedDB, caches ou service workers. A rede permite somente recursos GET locais,
sem fetch/XHR/EventSource, e distingue o WebSocket local do Vite como ferramenta de
desenvolvimento, não API de negócio. A revisão de `src/` não encontrou uso de rede de
dados, persistência, formulários, coleta pessoal ou importação de plugins Bootstrap/Popper.
Limite: isso inspeciona a página atual durante abertura/recarga em Chromium, não é uma
auditoria de segurança de dependências, de tráfego do sistema ou de funcionalidades futuras.

## Verificação integrada — 13/11/2026

Ambiente: Windows 11 Home 64 bits, versão 10.0.26200; Node.js 24.21.0, npm 11.19.0,
Angular/CLI/build 22.2.6, TypeScript 6.0.3, Vitest 5.1.0, jsdom 31.0.0,
Playwright 1.65.0 com Chromium 158.0.8127.18 (revisão 1254).
Sequência executada em `frontend/`, sem flags de força ou bypass de peers:

| Comando                         | Saída | Resultado real                                                                                  |
| ------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                    | 0     | 288 pacotes instalados; auditoria npm automática: 0 vulnerabilidades reportadas naquele momento |
| `npm.cmd run format:check`      | 0     | Todos os arquivos abrangidos formatados                                                         |
| `npm.cmd run build`             | 0     | Produção estrita; 324,32 kB iniciais (estimativa de transferência 51,44 kB)                     |
| `npm.cmd test -- --watch=false` | 0     | 5/5 testes, 2 arquivos                                                                          |
| `npm.cmd run test:e2e`          | 0     | 8/8 execuções: 4 por viewport; nenhum erro inesperado de console/pageerror                      |

Warnings mantidos: scripts npm não aprovados dos quatro pacotes citados e depreciação
Sass `@import`. Os binários disponíveis foram suficientes para a sequência completa;
isso não autoriza aprovar scripts automaticamente em outros ambientes. Não foi feita
auditoria independente de segurança/licenças transitivas: o resultado do npm não é
certificação. O servidor da inspeção manual foi encerrado explicitamente (processo próprio);
o servidor E2E é gerenciado pelo Playwright.

Não executados por estarem fora do recorte: Firefox, WebKit, dispositivos reais, fluxos
comerciais, teclado de formulários/modais, alternância/contraste de temas, zoom 200%,
desempenho de negócio, cobertura percentual e avaliação com a ótica. Lint não foi configurado
por DEC-014. Os critérios CA-001 a CA-022 do MVP não são declarados concluídos; CA-021
exige mutações e navegação ainda ausentes. Não há aprovação de produto ou aptidão operacional.

## Revisão e rastreabilidade final

| Referência                       | Evidência do recorte                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| PRD/RF-011; RNF-001              | Identidade, aviso literal e pt-BR em fonte, testes de componente e E2E                    |
| PRD/RNF-004/010                  | Página sem coleta, APIs ou persistência; inspeção e E2E de abertura/recarga               |
| PRD/RNF-008; TDD/DEC-002/003/009 | Standalone, HTML separado, zoneless, tipos/templates estritos, versões fixadas e lockfile |
| TDD/DEC-008/014                  | Prettier, 5 testes unitários/componentes e 8 E2E em Chromium/Windows                      |
| TDD/DEC-013                      | Sass Bootstrap compilado; Popper 2.11.8 apenas peer instalado (MIT), ausente do bundle    |
| Delta `demonstracao-inicial`     | Quatro requisitos e seus cenários cobertos; não equivale aos critérios integrais do MVP   |

Na raiz, `openspec validate preparar-base-tecnica-frontend --strict` passou e
`git diff --check` terminou com código 0, apenas avisos de normalização LF/CRLF.
Revisão do status e dos arquivos novos: somente fonte, configurações, testes, documentação
e lockfile; sem caches, resultados ou dependências para versionar. A busca de segredos/dados
pessoais não encontrou ocorrências; não substitui auditoria especializada.
O lockfile usa o registro npm público; a leitura foi feita por Node.js porque o
`ConvertFrom-Json` do PowerShell local não aceita a chave vazia da raiz de `packages`.

A branch pertinente foi reutilizada, preservando alterações anteriores. O scaffold foi
gerado isoladamente com Angular CLI 22.2.6, sem instalação/Git; a primeira tentativa com
caminho absoluto falhou e foi repetida com diretório relativo, após confirmação do usuário.
Nenhuma pasta preexistente foi apagada. Há somente página técnica, não FASE-003 a FASE-008.
As evidências estão prontas para revisão conforme o template de PR do repositório;
nenhum commit, push, PR ou merge foi executado por este agente.
