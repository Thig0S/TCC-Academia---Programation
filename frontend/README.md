# Base técnica — Vendas em Aberto

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
[SDD](../openspec/changes/preparar-base-tecnica-frontend/).

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
