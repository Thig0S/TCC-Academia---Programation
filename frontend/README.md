# Base técnica — Vendas em Aberto

## Apply FASE-005 — busca de vendas

Implementada a função pura `buscarVendas` em `src/app/funcionalidades/vendas/venda.busca.ts`.
Ela filtra somente a coleção recebida, mantém a ordem e combina a situação opcional por E.
Nome e marcadores textuais são comparados sem distinção de caixa/diacríticos; CPF e telefone
também aceitam consulta numérica ignorando pontuação, sem aceitar sequência vazia nem retirar
letras de termos mistos. Um termo completo `DD/MM/AAAA` tem precedência exclusiva e compara
somente `dataVenda`, após validação com `interpretarDataCivil` (calendário gregoriano 0001–9999).
Data completa inválida retorna vazio, sem exceção ou fallback numérico; data parcial não é
tratada como data. A busca não altera objetos nem coleções.

Verificação incremental em 16/11/2026, Windows, Node 24.21.0/npm 11.19.0; dependências
exatas existentes mantidas (Angular 22.2.6, TypeScript 6.0.3, Vitest 5.1.0):

| Comando em `frontend/`          | Saída | Resultado real                                      |
| ------------------------------- | ----- | --------------------------------------------------- |
| `npm.cmd run format`            | 0     | Prettier executado                                  |
| `npm.cmd run build`             | 0     | 480,18 kB iniciais; transferência estimada 91,57 kB |
| `npm.cmd test -- --watch=false` | 0     | 162/162 testes em 14 arquivos                       |

O build mantém o aviso existente de depreciação de Sass `@import`; budgets e dependências não
foram alterados. Os testes novos cobrem situação, nome, identificadores, busca numérica,
entradas inválidas, datas bissextas/extremas, ordem e ausência de mutação. Isso não verifica
interface, navegação ou aceitação comercial.

### Detalhe de venda e rota por identificador

A rota lazy `/vendas/:id` fica após as rotas estáticas e antes do wildcard. O componente lê
`paramMap` reativamente e consulta a instância raiz de `ServicoDemonstracao`; IDs são passados
ao Router como segmento e serializados por `createUrlTree`/`serializeUrl`, sem transformação
do identificador. O detalhe é somente leitura, apresenta dados financeiros formatados pela
projeção existente, entrada separada, todas as parcelas, referência da sessão, ausência de
próximo vencimento e retornos explícitos. A inexistência de venda tem estado próprio.

Verificações incrementais de 16/11/2026: `npm.cmd run build` saiu 0 (487,33 kB iniciais;
transferência estimada 93,81 kB), `npm.cmd test -- --watch=false` saiu 0 (167/167 testes em
15 arquivos). O RouterTestingHarness confirmou `seed/venda/1` e `sessao/venda/1` com barras,
reutilização A→B→inexistente, venda quitada e parcelas, entrada presente/ausente, descrição
ausente, formatação, retornos e ausência de controles mutáveis. O E2E dirigido passou 2/2
(uma execução por viewport: 1366×768 e 390×844), cobrindo URL direta codificada, recarga,
contexto de Vendas, retorno explícito e foco no título após retorno. A porta padrão 4200 estava
ocupada pelo processo Node PID 1292 do repositório; sem encerrá-lo, o runner iniciou e fechou
servidor próprio em 4302 por configuração temporária. O Sass `@import` depreciado segue como
aviso existente.

Após os testes adicionais de identificador e descrição: `npm.cmd run format:check`, build e
suíte unitária/componentes passaram (saída 0); 167/167 testes em 15 arquivos. A regressão E2E
completa desta etapa passou 28/28 execuções, 14 por viewport, com servidor próprio em 4302.
Contraste medido pelo E2E estrutural existente: texto mínimo 5,96:1 no tema escuro e 4,83:1
no claro; borda/foco dos controles essenciais também superaram 3:1. Essa regressão conserva
as asserções de indisponibilidade das listas até a implementação da tarefa 3.1.

Essas verificações não são homologação de outros navegadores, aceite da ótica ou prova de
contraste/acessibilidade completa. A verificação de foco ao abrir o detalhe por link da lista
será concluída junto à entrega dos links de consulta nas listas.

### Listas, busca visível e cartões globais — FASE-005

Vendas e Quitadas apresentam coleções separadas da fonte raiz, referência da sessão e a tabela
compartilhada. Vendas mostra os quatro cartões globais sem recalculá-los pelos resultados da
pesquisa; o filtro de situação existe somente nas abertas. Os campos nativos aceitam nome,
marcadores sintéticos de CPF/telefone e data completa obtida da própria UI. Limpar pesquisa
preserva situação; Limpar critérios restaura Todas. Os dois links por linha abrem a venda
identificada; ações de cadastro, edição, pagamento e exportação não foram adicionadas.

Verificação incremental em 16/11/2026, Windows, Node 24.21.0/npm 11.19.0, Chromium, viewports
1366×768 e 390×844: `npm.cmd run format:check` passou; `npm.cmd run build` saiu 0 com
488,11 kB iniciais e 93,81 kB estimados; `npm.cmd test -- --watch=false` aprovou 173/173 testes
em 16 arquivos.
Playwright com servidor próprio em 4302 aprovou 30/30 E2E (15 por viewport), incluindo nome,
CPF/telefone sintéticos, data da tabela, combinação busca/situação, limpezas e foco, abertura
pelos links de nome e Visualizar, ausência de filtro em Quitadas, conteúdo ainda indisponível
em Visão Geral/Relatórios, Configurações, aviso, rede local e ausência de persistência. O teste
de contraste mediu texto mínimo 5,96:1 no tema escuro e 4,83:1 no claro; borda/foco dos
controles essenciais excederam 3:1. O Sass `@import` depreciado permanece como warning.

Esse resultado incremental não homologa outros navegadores/dispositivos, não comprova zoom
nativo de 200% e não constitui avaliação da ótica. A inspeção e medição completa dos estados
de tabelas, selos e controles continua vinculada às tarefas de acessibilidade da FASE-005.

### Acessibilidade visual de listas e parcelas — FASE-005

As listas usam tabela semântica com caption, oito cabeçalhos com `scope`, links nomeados e
região de rolagem identificada. Os selos mantêm o texto da situação, além da cor; o contador
fica em `role="status"`. Botões de limpeza usam tokens do tema para texto e borda, incluindo
estado hover, sem alterar foco ao digitar ou escolher situação.

Medição Playwright em 16/11/2026, Chromium, ambos os viewports (1366×768 e 390×844) e temas
escuro/claro: `th`, `td`, `caption`, selos, botões e labels foram medidos por cores computadas
com composição de fundos transparentes. Razão mínima observada: 4,53:1 nas listas abertas,
quitadas e parcelas de vendas quitadas; 4,69:1 nas parcelas de venda aberta. Os botões de
limpeza também foram medidos em hover, com mínimo de 4,53:1 nos dois temas. Os testes
confirmaram nomes dos campos, oito cabeçalhos, captions, leitura textual de Em aberto,
Próximos dias, Atrasada, Quitada, Paga e Aberto, região e anúncio de resultados. A execução
integral do E2E passou 32/32 (16 por viewport); warning Sass `@import` mantido.

Essas medições cobrem as superfícies e estados exercitados, não certificam acessibilidade
integral nem tecnologia assistiva; zoom nativo de 200% e avaliação da ótica não foram
executados nesta verificação.

### Viewports, teclado e zoom — FASE-005

Nova regressão E2E em Chromium passou 34/34 execuções (17 por viewport: 1366×768 e 390×844),
com `prefers-reduced-motion: reduce`. Verifica listas, detalhe e páginas ainda indisponíveis,
ausência de overflow horizontal no documento, região da tabela identificada e focável, avanço
por Tab até a última ação Visualizar, abertura por Enter e região de parcelas focável. Em
390×844, confirmou overflow contido na região da tabela enquanto a página permanece sem
rolagem horizontal. Os testes de busca anteriores também verificam que limpar critérios devolve
foco à busca e que digitar/selecionar situação não o desloca.

Zoom nativo de 200%: relato manual do solicitante em 16/11/2026, após aplicar o controle nativo
do navegador em Vendas, Quitadas e detalhe; informou conteúdo legível e ausência de overflow
horizontal da página. Não foi substituído por CSS zoom nem medido independentemente nesta
sessão. Chromium automatizado nos viewports técnicos não equivale à homologação de navegador
ou dispositivo real; tecnologia assistiva e avaliação da ótica continuam fora da evidência.

Regressão posterior às alterações visuais, em 16/11/2026: `npm.cmd run format:check` saiu 0;
`npm.cmd run build` saiu 0 com 488,11 kB iniciais/93,81 kB estimados, sem warning de budget;
`npm.cmd test -- --watch=false` saiu 0 (174/174 em 16 arquivos após o teste integrado); E2E completo com servidor
próprio em 4302 saiu 0 (34/34, 17 por viewport). Sass `@import` segue depreciado. A primeira
verificação de formatação incluiu a configuração temporária do runner ainda presente e saiu 1;
após removê-la, a reexecução passou. Nenhuma configuração temporária permaneceu no projeto.

O teste integrado do TestBed usa `ServicoDemonstracao` pela injeção de teste para emitir um
cadastro e um pagamento completos; comprova atualização zoneless por `whenStable`, identidade
da fonte entre lista/detalhe, cartões, parcelas e transição de aberta para quitada. Antes do
pagamento compara a identidade do snapshot financeiro após pesquisar, limpar e navegar. Esse
comando interno é exclusivo do TestBed: a aplicação e os E2E continuam sem botão de pagamento,
hook global ou chamada ao serviço pelo browser. O teste não representa operação visível ao
usuário nem altera regras do núcleo financeiro.

#### Detalhe compacto — tarefa 3.1 de `ajutes-fase-005`

O detalhe mantém cliente e dados financeiros lado a lado no desktop, inclui entrada e descrição,
e exibe a tabela completa sem paginação. Com até dez parcelas, o teste browser isolado mediu
1366×768, Chromium: as dez linhas terminaram em y=732,86 px, a região em y=764,75 px e o
documento permaneceu em 768 px, sem rolagem da página. Com onze parcelas, a região interna
tem foco por teclado, rolagem vertical, cabeçalho sticky e todas as linhas preservadas. A fixture
cria dados sintéticos somente no host de teste; não altera seed, rotas ou serviço de produção.
TestBed existente cobre venda de uma parcela, entrada presente/ausente, descrição ausente,
valores em centavos, situação paga e navegação sem mutação.

Verificações desta tarefa: fixture Playwright 4/4; `npm.cmd test -- --watch=false` 190/190 em
18 arquivos; `npm.cmd run build` saiu 0 com 489,48 kB iniciais e 94,32 kB estimados. Sass
`@import` depreciado permanece como aviso. Os testes de viewport/parcelas usam Chromium e fixture
isolada; não são homologação visual de outros navegadores nem avaliação da ótica.

#### Superfícies e links da consulta — tarefa 3.2 de `ajutes-fase-005`

Links de navegação, perfil, cliente, Visualizar e retornos usam vermelho da identidade
no tema claro e tom vermelho claro no escuro, sem azul ou sublinhado permanente. Hover
e foco por teclado sublinham os links; a rota ativa mantém `aria-current` e destaque
de fundo/peso, e os retornos e ações continuam âncoras com seus destinos existentes.
A logo, o skip link e as ações somente leitura foram preservados.

Em 17/11/2026, comparação visual em Chromium com `exemploListagemDeVendas.png`,
`exemploDadosDaVenda.png` e `exemploDesignDark.png`: foram preservados lateral vermelha,
superfícies brancas no claro, grafite no escuro, densidade de tabela e destaque vermelho.
Diferenças intencionais: sem cartões globais, filtros de data/ações de negócio,
notificações ou busca global duplicada; a busca aprovada fica junto aos filtros locais.
Não foi feita comparação pixel a pixel nem copiados dados das capturas.

E2E Chromium, ambos os viewports (1366×768 e 390×844), passou 2/2 execuções da nova
verificação de links. Contraste de texto normal medido: dark — menu 5,96:1, perfil
10,41:1, cliente/Visualizar 7,68:1; light — menu 8,63:1, perfil 5,75:1,
cliente/Visualizar 8,08:1. O teste também exige pelo menos 4,5:1 no foco, indicador
de foco de 3 px e sublinhado em hover/foco; retornos têm contraste mínimo 4,5:1.
A regressão E2E existente da lateral mede texto/ícones e foco nos extremos/meio do
degradê, nos estados normal, hover, ativo e foco, nos dois temas. Aviso Sass `@import`
permanece; esta execução não é certificação de acessibilidade nem aceite da ótica.

#### Regra civil de atraso — tarefa 4.1 de `ajutes-fase-005`

A regra de domínio foi preservada. Testes de projeção agora verificam explicitamente
vencimento em 10/11/2027: Próximos dias na própria data e Atrasado em 11/11; a parcela
recebida em 10/11 permanece Paga no dia seguinte. Casos adicionais confirmam +7/+8
cruzando mês (30/04–01/05) e ano (25/12–01/01). O cenário integrado reconcilia situação
da parcela/venda, próximo vencimento, pagos, saldo, parcelas pagas e resumo de valores
em atraso, antes e depois do recebimento, sem tolerância nem alteração de seed/relógio.

Em 17/11/2026, `npm.cmd test -- --watch=false` passou: 197/197 testes em 18 arquivos.
O aviso preexistente de Sass `@import` permanece. Não foi alterado código de produção;
os testes não representam uma UI de pagamento nem aceite comercial.

#### Evidências de layout integrado — tarefa 4.2 de `ajutes-fase-005` (concluída)

Em 17/11/2026, `npm.cmd run test:e2e:paginacao-fixture` passou 8/8 em Chromium
1.65.0, servidor de fixture isolado na porta 4301 e viewports 1366×768 e 390×844.
Os dados vieram do host sintético `src/testing/paginacao-fixture.ts`; não são seed
nem fluxo comercial. Nos dois temas, desktop: 10 linhas até y=629,77, rodapé até
y=730,27, documento 768 px, controles alinhados (diferença de base 0 px), sem
scroll vertical ou horizontal da página. Capturas anexadas aos resultados Playwright
foram revistas em light/dark; a composição mantém aviso, filtros, dez linhas e
paginação. No mobile: documento 2325 px, largura 390 px sem overflow horizontal;
controles empilhados (diferença de base 170 px) e conteúdo acessível por rolagem.
As colunas da tabela exigem rolagem horizontal interna, sem ampliar o documento.

Detalhe sintético com 10 parcelas, em ambos os temas no desktop: cliente e finanças
começam em y=182; última linha em y=732,86; tabela em y=764,75; documento 768 px.
Em 390×844, blocos empilham (topos y=383,02 e 553,02), documento 1733 px e largura
390 px; dados, retorno, entrada, descrição e 10 linhas permanecem presentes. O
cenário de 11 parcelas + descrição extensa passou nos dois temas e viewports, com
região interna nomeada, cabeçalho sticky, todas as linhas e scroll acionado por
teclado (`End`); no mobile mantém-se a rolagem vertical da página. Teste adicional
confirmou paginação por teclado, foco retido e faixa anunciada.

Zoom nativo 200%: verificação manual confirmada pelo solicitante nesta sessão para
lista e detalhe, sem perda de legibilidade/conteúdo segundo o relato. O agente não
operou os controles da interface do navegador nem reproduziu essa verificação; CSS
viewport reduzido não foi usado como substituto. Evidência identificada como relato
manual do solicitante, distinta das medições automatizadas e das evidências históricas.

#### Verificação integrada final — tarefa 4.3 de `ajutes-fase-005`

Executada em 17/11/2026, Windows 11, Node 24.21.0/npm 11.19.0, lockfile mantido,
Angular 22.2.6, Playwright 1.65.0, Chromium, branch `feature/ajustes-fase-005`:

| Comando (em `frontend/`, salvo validação)           | Resultado                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                        | Exit 0; 289 pacotes adicionados. A auditoria automática reportou 12 vulnerabilidades altas; npm também listou scripts de instalação pendentes de aprovação para 4 pacotes. Não rodei `npm audit fix`, não aprovei scripts nem alterei manifesto/lockfile.           |
| `npm.cmd run format:check`                          | Exit 0; todos os arquivos formatados.                                                                                                                                                                                                                               |
| `npm.cmd run build`                                 | Exit 0; bundle inicial 490,33 kB, transferência estimada 94,50 kB, abaixo do budget de 500 kB. Aviso Sass `@import` depreciado.                                                                                                                                     |
| `npm.cmd test -- --watch=false`                     | Exit 0; 197/197 testes em 18 arquivos. Aviso Sass.                                                                                                                                                                                                                  |
| `npm.cmd run test:e2e`                              | Exit 0; 36/36, 18 por viewport (1366×768 e 390×844), Chromium. Playwright iniciou e encerrou servidor próprio em 4200 (`reuseExistingServer: false`). Cobriu navegação, filtros, temas, teclado/foco, movimento reduzido, contrastes, links e overflow. Aviso Sass. |
| `npm.cmd run test:e2e:paginacao-fixture`            | Exit 0; 8/8, host sintético na porta 4301; medições/capturas constam na seção 4.2 acima. Aviso Sass.                                                                                                                                                                |
| `openspec validate ajutes-fase-005 --strict` (raiz) | Exit 0; Change válida.                                                                                                                                                                                                                                              |
| `git diff --check` (raiz)                           | Exit 0; avisos apenas de conversão LF/CRLF nos arquivos preexistentes e não commitados da Change histórica `fase-005`.                                                                                                                                              |

Revisão de coerência feita na ordem PRD 1.6 (RN-014/018/019/020; CA-026–029) →
TDD 1.10/DEC-018 → proposta, design, três deltas, tarefas e testes da Change; revisão
do diff dos 10 commits da feature contra `origion/main`. Implementação permanece no
escopo: listas sem cartões, paginação local, detalhe somente leitura, links/temas e
regra civil de atraso mantida. Visão Geral não foi antecipada; seed, regras de produção
e dependências não foram alterados. PRD/TDD seguem identificados como planejamento,
sem aprovação da ótica; execução técnica não é aceite comercial. As cinco alterações
locais pré-existentes em `openspec/changes/fase-005/` ficaram fora do diff e dos commits.

#### Conciliação documental e arquivamento dos ajustes — 17/11/2026

Implementação dos ajustes integrada pelo [PR #10](https://github.com/Thig0S/TCC-Academia---Programation/pull/10),
commit `59af9a2`; merge confirmado no GitHub em 18/11/2026 às 01:19 UTC (17/11 local).
As specs `consulta-vendas`, `estado-demonstrativo` e `temas-visuais` foram
sincronizadas no commit `72ade92` da `main` (o hash `91208a7` pertence à branch
original `docs/sincronizar-specs-ajustes-fase-005`).
PRD 1.7 e TDD 1.11 conciliam o estado, sem alterar requisitos ou regras. A Change
com 9/9 tarefas fica em `openspec/changes/archive/2026-11-17-ajutes-fase-005/`;
essa consolidação documental e o arquivamento foram integrados à `main` pelo
[PR #12](https://github.com/Thig0S/TCC-Academia---Programation/pull/12), commit `c845ce9`,
em 18/11/2026 às 01:51:53 UTC (17/11 local), conforme confirmação no GitHub.
O título da evidência 4.2 foi corrigido para concluída: medições automatizadas e
relato manual de zoom já estavam registrados; nenhuma nova aprovação ou medição
foi inferida dessa correção. Os resultados de aplicação acima são anteriores e
não foram reexecutados neste fechamento exclusivamente documental.

Verificações deste fechamento: `openspec validate ajutes-fase-005 --strict` antes
de arquivar saiu 0; depois, `openspec validate --all --strict` aprovou as sete specs
e `openspec list --json` confirmou nenhuma Change ativa. `npm.cmd run format:check`
em `frontend/` passou; `git diff --check` passou com avisos LF/CRLF. Não houve nova
instalação, build, execução de testes da aplicação ou medição visual.

Conferência pós-integração: API do GitHub e `git ls-remote origion refs/heads/main`
confirmaram `c845ce9ff0f9535ce915156c9b694cd16ae9ae95` na `main`. A API confirmou
`72ade92363b37bc66c18db73dbe9f32a75046afa` como o commit de sincronização nesse
histórico e o PR #12 como integrado. Corrigidas somente referências de status e
hash no PRD, TDD, neste README e no registro arquivado; sem novas regras ou
reexecução dos testes da aplicação.

Verificações desta correção pós-integração: na raiz, `openspec validate --all --strict`
aprovou as sete specs e `git diff --check` passou com avisos LF/CRLF; em `frontend/`,
`npm.cmd run format:check` passou. Reutilizados PRD 1.7, TDD 1.11 e o registro SDD
arquivado: não há novo requisito, decisão ou tarefa funcional que exija outra Change.

#### Regressão limpa FASE-005 — 16/11/2026

Ambiente: Windows 11, Node 24.21.0/npm 11.19.0, versões do manifesto/lockfile mantidas.
`npm ci` teve uma primeira tentativa com saída 1 (`EBUSY` em `sass-embedded.../dart-sass/src`)
enquanto havia servidor em 4200; não foi encerrado processo nessa tentativa. Após nova
conferência, o listener e seus processos filhos já tinham terminado por conta própria; a
repetição de `npm ci` saiu 0, instalou 289 pacotes e a auditoria automática reportou 0
vulnerabilidades. Os quatro avisos de scripts não autorizados foram preservados, sem aprovação.

| Comando em `frontend/`          | Saída | Resultado                                                     |
| ------------------------------- | ----- | ------------------------------------------------------------- |
| `npm.cmd ci`                    | 0     | 289 pacotes; auditoria automática reportou 0 vulnerabilidades |
| `npm.cmd run format:check`      | 0     | Prettier aprovado                                             |
| `npm.cmd run build`             | 0     | 488,11 kB iniciais/93,81 kB estimados                         |
| `npm.cmd test -- --watch=false` | 0     | 174/174 testes em 16 arquivos                                 |
| `npm.cmd run test:e2e`          | 0     | 34/34, 17 por viewport Chromium                               |

Budgets inalterados: bundle inicial aviso 500 kB/erro 1 MB e estilos por componente aviso
4 kB/erro 8 kB; sem aviso de budget. Sass `@import` depreciado permanece. O runner usou
`reuseExistingServer: false`, servidor próprio em 4200 e o encerrou ao terminar; nenhum
processo alheio foi reutilizado ou encerrado nesta regressão final.

### Rastreabilidade e limites — conclusão 5.3 da FASE-005

Em 16/11/2026, após consolidação autorizada, `fase-004` foi arquivada em
`openspec/changes/archive/2026-11-16-fase-004/`; suas três capabilities foram sincronizadas
para `openspec/specs/`. Em seguida, as três deltas da FASE-005 foram reconciliadas: criada a
spec principal `consulta-vendas`, atualizadas as três requirements modificadas de
`navegacao-aplicacao`, e atualizada `Núcleo sem promessa de interface comercial` em
`estado-demonstrativo`, preservando os demais requisitos de ambas as specs existentes.
`openspec validate --specs` passou em 7/7 specs e `openspec validate fase-005 --strict` saiu 0.

Rastreabilidade revisada: PRD 1.5/RF-002/003/005/008/RN-018/019/CA-002/003/004/005/010/014/
018/019/020/025/026 → TDD 1.9/FASE-005/DEC-017 → deltas `consulta-vendas`,
`estado-demonstrativo` e `navegacao-aplicacao` → testes puros de busca, TestBed de listas/
detalhe/fonte, rotas e projeções, e E2E `demonstracao-inicial.spec.ts`. A regressão cobre
consultas e limpeza, combinação por E, cartões globais, vazio/sem resultado, duas coleções,
detalhe por nome/Visualizar/URL opaca e recarga, foco/teclado, contraste/temas, viewports
1366×768 e 390×844, referência e reinicialização, ausência de console inesperado, cookies,
storage e tráfego externo. Percurso de 200% permanece apenas como relato manual acima.

**Limites de aceite:** CA-026 e os aspectos de consulta de CA-002/003/004/005/010/014/018/019/
020/025 têm evidência técnica nos testes descritos; isso não equivale a aceite de produto ou
da ótica. Itens de mutação de CA-002/003/010/011–017/021 e operações futuras permanecem fora
da interface desta fase; o comando de cadastro/pagamento no teste TestBed é integração interna,
não fluxo de usuário. Integração com backend/serviços reais, homologação em Firefox/WebKit,
leitor de tela/tecnologia assistiva e avaliação da ótica não foram executados. O efeito e2e
não testa comportamento de persistência financeira real, pois a fonte é intencionalmente em
memória. Não há dependência de serviço externo para a consulta demonstrativa.

Revisão final 5.4: branch `feature/fase-005`, commits por entrega verificados contra `main`;
diff restrito ao planejamento PRD/TDD/SDD, implementação/testes/docs da 005 e consolidação
documental solicitada da 004. `git diff --check` saiu 0 (avisos de conversão LF/CRLF do Git);
`openspec validate fase-005 --strict` saiu 0 e `openspec validate --specs` aprovou 7/7.
Template consultado: `.github/pull_request_template.md`. Nenhum PR estava aberto para esta
branch na consulta final; preparar um PR único após fechar a última tarefa, sem merge nesta
etapa.

## Apply FASE-004 — 14/11/2026

Autorizado pelo pedido explícito `/opsx-apply fase-004`, após revisão de PRD 1.3,
TDD 1.6 e proposal/design/três deltas/tasks. Reutilizada `feature/fase-004`, limpa,
base `58fb57b5bfd9f9ed843d5cc5b732e10de83bc204`. Manifesto e raiz do lockfile
conferidos: Angular/Router/CLI 22.2.6, TypeScript 6.0.3, Vitest 5.1.0,
jsdom 31.0.0, Playwright 1.65.0; ambiente Node 24.21.0/npm 11.19.0.
Sem upgrades ou novas dependências. O recorte é domínio puro, comandos internos,
seed e fonte raiz em memória; não autoriza UI comercial, edição, busca ou persistência.
Os registros das fases anteriores abaixo são históricos, não resultados deste apply.

### Utilitários de domínio

`dinheiro.ts` valida centavos não negativos seguros, verifica cada soma/subtração e
interpreta texto pt-BR sem float intermediário (construção por BigInt). Aceita `1234`,
`1234,5`, `1.234,56`; rejeita sinais, expoentes, símbolos, agrupamento incorreto,
ponto sem decimal e frações de centavo. Formatação BRL conserva o extremo seguro.
Erros técnicos são `RangeError` em português; comandos tratarão esses erros sem publicação.

`data-civil.ts` usa strings AAAA-MM-DD gregorianas, anos 0001–9999, sem Date/UTC
no domínio. Meses são calculados desde a data-base original; alcance do último
vencimento é validado antes de alocar parcelas. Ordinais permitem janelas de dias
sem duração de horas. Apresentação DD/MM/AAAA e limites do mês explícitos.

Verificações reais: unitários iniciais de dinheiro 49/49 (6 arquivos); após calendário,
65/65 (7 arquivos), saída 0 em cada processo. Para fusos, executar no PowerShell
`$env:TZ = 'UTC'` e depois `npm.cmd test -- --watch=false --reporters=verbose`;
repetir em novo processo com `America/Sao_Paulo`. O nome do teste registra o fuso
observado por Intl e o offset de Date em janeiro: UTC/0 e America/Sao_Paulo/180,
respectivamente, ambos 65/65. A primeira execução sem verbose não mostrou os logs,
por isso não foi usada isoladamente para comprovar o fuso. Warning Sass mantido.
Estes testes não são homologação de todos os fusos, interface ou aceite comercial.

Regressão do grupo: `npm.cmd run build` saída 0, 467,06 kB iniciais (87,48 kB
de transferência estimada), abaixo do aviso de 500 kB; `npm.cmd test -- --watch=false`
saída 0, 65/65 em 7 arquivos. `format:check` inicialmente saiu 1 em 31 arquivos
preexistentes: diagnóstico com Prettier confirmou exclusivamente CRLF versus LF.
Após autorização do solicitante, normalização e `frontend/.gitattributes` preservam
LF, sem mudanças funcionais ou de dependências; correção em commit separado
`1c321fa`. Nova execução `npm.cmd run format:check`: saída 0. Os 31 arquivos
já tinham LF no índice Git, por isso não geraram diff de conteúdo. Warning Sass
de `@import` permanece. Nenhuma página ou rota foi alterada pelos utilitários.

### Modelos, cadastro e projeções

Modelos readonly de venda/cliente próprio/parcela/entrada/recebimento/alocação e
`Resultado<T>` discriminado em sucesso, validação, inexistência, inelegibilidade
ou falha. `prepararCadastro` copia identificação, exige presença sem checksum ou
unicidade, normaliza descrição vazia para null e não publica estado. Entrada ausente
é null, sem data/forma fictícias. Parcelamento usa quociente/resto inteiros por BigInt,
centavos residuais nas primeiras parcelas e primeiro vencimento no mês seguinte.

`projetarVenda` deriva pago, saldo, contagem paga, próximo vencimento e situação;
data/forma da parcela vêm do recebimento associado. `validarVenda` confere calendário,
distribuição, IDs e histórico integral sequencial, alocações, valores e reconciliação.
`projetarVendas` também verifica IDs globais e somas seguras do conjunto antes da
aceitação. Coleções abertas/quitadas são projeções, não cópias canônicas concorrentes.
Resumos globais não recebem filtros; períodos são inclusivos com datas explícitas,
recebimentos por sua data, entradas pela venda e mês civil, nunca últimos 30 dias.

Verificações incrementais: build estrito saída 0 (467,06 kB); cadastro e parcelas
92/92 testes. Após projeções, 102/102 em 9 arquivos (saída 0). Houve uma execução
101/102 por expectativa incorreta de atraso numa fixture com a primeira parcela já
quitada; após pausa e autorização, expectativa corrigida para zero e suíte reexecutada.
Não se alterou a regra. Casos incluem CA-008/009/014/020/025 no domínio: limites,
restos, entrada, ontem/hoje/+7/+8, precedências, quitação, dois meses, bordas inclusivas,
vazio e overflow agregado. Busca, edição, identificação completa e UI permanecem pendentes.

Regressão do grupo de vendas: formatação, build estrito e unitários/componentes
reexecutados com saída 0; 102/102 testes em 9 arquivos, build 467,06 kB/87,48 kB.
Warning Sass mantido. Diff limitado aos modelos, cálculos, preparação, testes e
documentação/tarefas; nenhuma alteração em páginas, rotas, manifesto ou lockfile.

### Recebimentos sequenciais — retomada em 15/11/2026

Novo pedido explícito de apply reutiliza PRD 1.3/TDD 1.7 e a branch limpa
`feature/fase-004`. `selecionarParcelas` exige um prefixo não vazio das pendentes,
sem duplicatas, saltos ou IDs de outra venda; ordem textual não muda a ordem canônica.
`prepararPagamento` revalida o estado atual, exige soma integral, data entre venda e
referência e uma das quatro formas aprovadas. Cria um recebimento com alocações, sem
publicação, parcialidade, juros, descontos ou dados bancários/cartão.

Conforme DEC-016, operações tipadas têm padrão puro; `PreparadorRecebimento` é um
adaptador raiz sem estado, relógio ou IDs próprios. Métodos delegam à alocação e
validação final puras. Doubles de métodos da instância TestBed substituem os spies
de exports relativos, sem trocar runner/dependências. Falha na segunda alocação e
na validação final retorna `falha-preparacao-lote`, mantém snapshot completo e
permite nova tentativa. Repetição/seleção obsoleta retorna `selecao-nao-sequencial`;
ausência retorna `venda-inexistente`; valor diferente retorna `valor-nao-integral`.
Mensagens são em português. Publicação e contador ainda dependem do grupo 4.

Verificação real do grupo: `npm.cmd test -- --watch=false`, saída 0, 128/128 testes
em 10 arquivos; `npm.cmd run build`, saída 0, 467,06 kB iniciais/87,48 kB estimados.
Aviso Sass `@import` preexistente mantido. Formatação dos arquivos de pagamentos
corrigida com Prettier; nenhuma UI, rota, dependência ou controle de falha acrescentado.
Context7 Angular/TestBed consultado nesta retomada para doubles de serviços.
`npm.cmd run format:check`: saída 0. Diff revisado restrito à preparação, seus
testes, adaptador e documentação; falhas artificiais existem somente no spec.

### Dados sintéticos e fonte de sessão — 15/11/2026

`criarDadosDemonstrativos(referencia)` cria 12 vendas inventadas, com marcadores
`Cliente DEMO`, `CPF-DEMO` e `TEL-DEMO`, nomes semelhantes, entrada opcional e
situações Em aberto/Próximos dias/Atrasada/Quitada. Usa calendário mensal e as
preparações puras aprovadas, com namespace `seed/`. Os testes conferem invariantes,
histórico sequencial, cinco referências (incluindo fevereiro bissexto e dias 31),
equivalência e isolamento. Revisão do fonte confirmou ausência de dados de pessoas,
imagens ou entrevistas. Datas históricas são anteriores à referência; liquidações
antecipadas obedecem ao intervalo venda–referência.

`ServicoDemonstracao` raiz contém agregado privado (referência/vendas/próximo ID).
`vendas`, `abertas`, `quitadas` e `resumo` são computed; consultas por ID e período
distinguem ausência de coleção vazia. `cadastrarVenda` e `registrarPagamento` são
síncronos e internos. O adaptador é injetado; somente o serviço publica, com um
`set` após preparação, validação financeira e congelamento. IDs `sessao/` avançam
apenas no sucesso, inclusive após falhas posteriores/finais e overflow. Entrada e
recebimento somam uma vez; parcelas pagas vêm das alocações, não da entrada.

Rascunhos, estado e projeções são copiados defensivamente; objetos/arrays próprios
são congelados recursivamente. Testes usam `Reflect.set` contra cliente, entrada,
parcela, alocação e coleção; alterações externas não modificam a sessão nem snapshots
anteriores. Novo TestBed/injetor restaura seed e contador independentes. Não há
effects de sincronização, storage, HTTP, temporizador de referência ou providers
por página. O token `REFERENCIA_DEMONSTRACAO` captura a data local ao criar a fonte;
App injeta a fonte na abertura sem alterar HTML, navegação ou foco.

Integração: RouterTestingHarness percorre todos os destinos preservando instância,
cadastro e lote; host exclusivo de teste observa uma atualização coerente por comando
aceito com `whenStable`, sem `detectChanges`. App é criado em 31/01 às 23:59;
primeira consulta após 01/02 mantém 31/01; nova aplicação usa 01/02 e descarta mutações.
Houve timeout incremental (142/143) com timers falsos completos. Após pausa e correção
autorizada, apenas Date é simulado (`toFake: ['Date']`), mantendo agendamento real e
timeout original: 143/143 em 13 arquivos, saída 0. Context7 Angular e Vitest consultados.

Build do grupo: saída 0, 479,89 kB iniciais/91,39 kB estimados, abaixo do aviso 500 kB;
Sass `@import` permanece. E2E padrão: saída 0, 26/26 (13 por viewport), preservando
aviso, indisponibilidade, temas, foco, contraste, rede somente local e storage vazio.
Portas 4200/4301 estavam ocupadas; override temporário 4302 abortou antes de testes
por combinação dos servidores na configuração. Foi removido. O solicitante escolheu
4200 padrão e autorizou encerrar especificamente PIDs 3332/5968 do projeto nove-mil;
identidades reconferidas antes de encerrá-los. A execução aprovada usou servidor
próprio do runner em 4200, `reuseExistingServer: false`, sem reutilizar outro servidor.

`npm.cmd run format:check` e `git diff --check`: saída 0; diff revisado sem alteração
de páginas, HTML, rotas, manifesto ou lockfile. Porta 4200 sem listener após o E2E.

Limites: recriação da sessão financeira é verificada no TestBed, não por mutação via
navegador. E2E continua regressão visual/estrutural: não há hooks globais, endpoints,
formulários ou ações de negócio nesta fase. CA-018/021 completos, UI dos demais CA
e aceite da ótica continuam dependentes das fases seguintes; não há persistência.

### Regressão limpa e pausa para revisão — 15/11/2026

Ambiente reconferido: Windows 11 Home 10.0.26200 64 bits, Node 24.21.0,
npm 11.19.0; versões do manifesto/lockfile preservadas. A primeira tentativa de
`npm.cmd ci` saiu 1, EBUSY nos arquivos Sass: servidor preexistente em 4301 mantinha
dart.exe aberto. Após autorização explícita, reconferidos e encerrados somente
ng serve PID 18332 e seus filhos esbuild 20080/dart 6396 deste projeto. Sem remoção
manual de pastas, aprovação de scripts ou bypass de peers. Execuções posteriores:

| Comando em `frontend/`          | Saída | Resultado real                                                              |
| ------------------------------- | ----- | --------------------------------------------------------------------------- |
| `npm.cmd ci`                    | 0     | 289 pacotes instalados; auditoria automática: 0 vulnerabilidades reportadas |
| `npm.cmd run format:check`      | 0     | Prettier aprovado                                                           |
| `npm.cmd run build`             | 0     | 479,89 kB iniciais, transferência estimada 91,39 kB                         |
| `npm.cmd test -- --watch=false` | 0     | 143/143 testes em 13 arquivos                                               |
| `npm.cmd run test:e2e`          | 0     | 26/26, 13 por viewport, configuração padrão/servidor próprio em 4200        |

Budgets preservados: inicial aviso 500 kB/erro 1 MB; estilo por componente aviso
4 kB/erro 8 kB. Sem aviso de budget; Sass `@import` depreciado permanece. npm avisa
scripts não aprovados de @parcel/watcher, esbuild, lmdb e msgpackr-extract; nenhum
foi aprovado automaticamente. Auditoria automática não é certificação de segurança.
E2E verificou aviso, navegação, foco, temas, contraste, indisponibilidade comercial,
ausência de console/pageerror inesperado, APIs de negócio ou persistência observada.

**Bloqueio da revisão final:** o seed usa três meses de histórico e quatro de
vencimentos futuros. Por inspeção, referências próximas ao início/fim de 0001–9999
podem ultrapassar o calendário nas funções puras; por exemplo, 0001-01-01 não tem
histórico anterior e 9999-12-31 não permite quatro vencimentos futuros. As cinco
referências testadas não comprovam essas extremidades. Não foi executado teste
adicional dessas bordas nem definido um novo limite ou fallback silencioso.

O solicitante escolheu **pausar para revisão**, sem aceitar restringir a referência
do seed ou dispensar situações nas bordas. Tarefa 4.1 reaberta; 5.2/5.3 pendentes.
As implementações e resultados acima continuam parciais, não aceite integral.
Próximo passo: decidir o comportamento, atualizar primeiro PRD/TDD e depois SDD,
adicionar testes de borda e repetir as verificações afetadas em apply autorizado.
Nenhuma UI comercial, edição, busca, persistência ou dependência nova incluída.
Não foram executados aceite da ótica, UI das FASE-005/006/007, Firefox/WebKit,
homologação de dispositivos, cobertura percentual ou desempenho de negócio.
CA-018/021 completos continuam pendentes. Sem PR antecipado, merge, sync ou arquivo.

## Retomada FASE-004 — 16/11/2026

PRD 1.4/TDD 1.8 e deltas revisados e aprovados no Harness antes do código. A opção
de restringir a referência foi reconsiderada: o domínio e a sessão mantêm 0001–9999.
O seed adapta meses/quantidade de parcelas e, quando necessário, dia-base e prefixo
pago. Janeiro/0001 usa 01/01 no grupo próximo; fevereiro/0001 usa 01/01 no atrasado.
Dezembro/9999 usa 31/10 e primeira parcela paga para deixar pendência em 31/12 no
grupo aberto e no próximo em 31/12. Nos demais casos limita o mês entre janeiro/0001
e novembro/9999 e usa até quatro parcelas que caibam no calendário. Soma valores
efetivos ao pagar; nenhuma alteração da referência ou das validações comerciais.

Tarefa 4.1: suíte percorre todos os 242 dias de janeiro–abril/0001 e setembro–dezembro/9999,
validando 12 vendas, IDs únicos, somas, calendário, histórico sequencial, determinismo
e conjunto exato de situações possíveis; isolamento também nos dois extremos.
As cinco referências anteriores continuam cobertas. Revisão do fonte confirma apenas
marcadores sintéticos, sem dados reais. Situações impossíveis: atraso até 01/02/0001
inclusive, próximos antes de 25/01/0001 e aberto nos últimos sete dias mais o próprio
31/12/9999. As demais situações são preservadas.

Verificações incrementais desta retomada, todas saída 0: formatação, build de produção
(480,18 kB iniciais/91,57 kB estimados; sem aviso de budget, Sass `@import` mantido)
e 153/153 testes em 13 arquivos. Validação OpenSpec inicialmente saiu 1 por texto de
requisito longo; após autorização, detalhes ficaram nos cenários e a validação passou.
Context7 Angular/TestBed consultado para integração/recriação. Estes resultados não
comprovam UI de negócio nem aceite da ótica; 5.2/5.3 ainda pendentes neste ponto.

Tarefa 5.2: três cenários integrados em 0001-01-01, 2027-01-31 e 9999-12-31
conferem seed, cadastro de 100.000 centavos com entrada de 20.000, duas parcelas
de 40.000, rejeição de 39.999, dois recebimentos até quitação, duplicidade rejeitada
e recriação independente restaurando seed. A cada etapa são reconciliados todos
os saldos, pagos, prefixos, próximas datas, abertas/quitadas, resumo mensal/atraso e
períodos inclusivos (calendário inteiro, dia da venda e dia da referência). O cenário
intermediário separa entrada em dezembro e lotes em janeiro; o superior separa
outubro/dezembro. IDs e snapshots permanecem protegidos pelos demais testes.

A execução inicial desses testes saiu 1 (153 passaram, três falharam): expectativa
comparava vendas brutas do período com projeções enriquecidas. Após autorização,
corrigida somente a expectativa para comparar todos os campos brutos; derivados
continuam verificados separadamente. Nova suíte: saída 0, 156/156 em 13 arquivos.
Isso cobre contratos internos de CA-008/009/011/013/014/017/020/024/025, não UI dos
CA nem CA-018/021 completos, recarga financeira por navegador ou aceite da ótica.
As telas de consulta, comandos visíveis e indicadores dependem de FASE-005/006/007.

### Regressão final e rastreabilidade — 16/11/2026

Ambiente Windows, Node 24.21.0/npm 11.19.0, versões fixadas preservadas. Instalação
limpa repetida sem bypass de peers ou aprovação de scripts; 289 pacotes instalados,
0 vulnerabilidades reportadas pela auditoria automática (não é certificação).

| Comando em `frontend/`          | Saída | Resultado                                                         |
| ------------------------------- | ----- | ----------------------------------------------------------------- |
| `npm.cmd ci`                    | 0     | Instalação limpa; quatro avisos de scripts não aprovados mantidos |
| `npm.cmd run format:check`      | 0     | Todos os arquivos abrangidos aprovados                            |
| `npm.cmd run build`             | 0     | 480,18 kB iniciais/91,57 kB estimados; Sass `@import` depreciado  |
| `npm.cmd test -- --watch=false` | 0     | 156/156 testes, 13 arquivos                                       |
| `npm.cmd run test:e2e`          | 0     | 26/26, 13 por viewport Chromium, servidor próprio em 4200         |

Budgets não alterados: inicial 500 kB/1 MB e estilos 4/8 kB; nenhum warning de budget.
Os E2E preservam aviso, temas, teclado/foco, contraste, indisponibilidade comercial,
rede local e ausência de persistência observada; nenhum erro inesperado de console.
Porta 4200 livre após o runner; nenhum servidor alheio reutilizado ou encerrado.

Revisão de escopo da branch contra `main`: domínio puro, sessão, testes e documentos;
App somente injeta a fonte. Manifesto/lockfile, HTML, rotas e configuração E2E intactos.
Inspeção de `src/app` não encontrou storage, HTTP/fetch, cookies ou effects de cópias.
Commits individuais de utilitários, vendas, recebimentos e sessão preservados; correção
do seed e integração têm commits próprios com testes, documentação e tarefas.

Rastreabilidade: PRD 1.4, RN-011–017/CA-008/009/011/013/014/017/020/024/025 →
TDD 1.8, FASE-004/DEC-004/005/008/011/015/016 → Change `fase-004`, capacidades
`dominio-vendas`, `recebimentos-parcelas`, `estado-demonstrativo` → testes colocados
e evidências acima. Não se declara CA-018/021 completo nem aceite da ótica. Sem
edição, nova regra de identificação, busca/filtros, interface comercial, persistência
ou nova dependência. Firefox/WebKit, dispositivos reais, desempenho, cobertura
percentual, UI comercial e avaliação de produto não executados por estarem fora
do recorte. Arquivamento/sync e merge não executados; merge exige autorização.

Na raiz, `openspec validate fase-004 --strict` e `git diff --check` aprovados com
saída 0; Git apenas avisa LF/CRLF nos documentos da raiz. Tarefas 21/21 concluídas,
revisão de rastreabilidade realizada e PR único preparado somente após todo o escopo.

### Apply ajustes FASE-005 — tarefa 1.1

Em 17/11/2026, retirados da lista de Vendas os quatro cartões globais; `ServicoDemonstracao.resumo` e seus derivados financeiros permanecem. Testes da lista cobrem ausência de cartões em Vendas e Quitadas e invariância dos derivados internos após critérios; integração cobre lista e detalhe na mesma fonte, sem mutações por consulta. Visão Geral e Relatórios continuam indisponíveis. Não houve alteração de rotas, seed, dependências ou comandos do domínio.

Verificação incremental: Windows, Node v24.21.0/npm 11.19.0. `npm.cmd test -- --watch=false` passou: 174/174 testes em 16 arquivos. `npm.cmd run build` saiu 0 (488,11 kB iniciais; transferência estimada 93,82 kB). `npm.cmd run format:check` apontou inicialmente os dois testes editados; ambos foram formatados com Prettier direcionado. O build mantém o aviso existente de Sass `@import`. E2E e medições visuais não foram executados nesta tarefa.

### Apply ajustes FASE-005 — tarefa 1.2

Em 17/11/2026, busca, situação e as duas ações de limpeza foram organizadas em uma única faixa desktop nas abertas; Quitadas mantém somente busca e Limpar pesquisa. Rótulos, orientação, foco após limpeza e separação das coleções foram preservados. No viewport Chromium 1366×768, E2E verificou a mesma faixa nas duas coleções e nos temas escuro/claro, e confirmou um único campo de busca. Em 390×844 os controles continuam adaptáveis.

Verificações incrementais: `npm.cmd run format:check` passou; `npm.cmd run build` saiu 0 (488,11 kB iniciais/93,81 kB estimados); `npm.cmd test -- --watch=false` passou (174/174 em 16 arquivos); `npm.cmd run test:e2e` passou (34/34, 17 por viewport Chromium). Uma execução E2E inicial detectou que o teste comparava bordas superiores, apesar dos controles alinhados pela base; a asserção foi corrigida para medir a base e a suíte completa passou na repetição. Sass `@import` permanece como aviso preexistente.

### Apply ajustes FASE-005 — tarefa 2.1

Foi adicionada derivação local de páginas de até dez itens e da faixa completa dos resultados, depois de `buscarVendas`, tanto para abertas quanto quitadas. A seleção usa `linkedSignal`: mudanças de termo/situação redefinem a página 1; redução do total limita a seleção à última página válida; limpar pesquisa/critério também força a página 1 mesmo quando os campos já estão vazios. Coleções e ordem são lidas sem mutação; nenhuma dependência, seed ou fonte de domínio foi alterada.

Testes unitários verificam 0/1/10/11/21 resultados, faixas, divisão ordenada sem duplicação/omissão, limite após redução e ausência de mutação. Verificações incrementais em Windows/Node 24.21.0/npm 11.19.0: build passou (488,12 kB iniciais/93,93 kB estimados); testes passaram (183/183 em 17 arquivos). O aviso Sass `@import` permanece. A apresentação e os cenários de interação com páginas serão verificados na tarefa 2.2.

### Apply ajustes FASE-005 — tarefa 2.2

Integração da paginação compartilhada: TestBed percorreu 21 registros por páginas 10/10/1, verificou ausência de duplicação/omissão, reset após pesquisa e limpezas inclusive com campo vazio, e observou comando interno de pagamento reduzir a seleção inválida da página 3 para a última página válida (2). Teste E2E da aplicação/seed real passou em Chromium 1366×768 e 390×844; o seed tem apenas uma página em ambas as coleções, apresenta a faixa correta e não exibe navegação fictícia. Verificação final nesta tarefa: `npm.cmd run format:check` passou; build passou (489,48 kB iniciais/94,25 kB estimados); testes passaram (189/189 em 18 arquivos); E2E do seed real passou (34/34); E2E da fixture isolada passou (2/2). Sass `@import` permanece como aviso.

Para cobrir cardinalidade ausente do seed sem alterar produção, foi criado target e bootstrap isolados de fixture (`build/serve-paginacao-fixture`) que compõem o App e componentes reais e acrescentam registros sintéticos apenas em memória. Em Chromium 1366×768/100%, ambos os temas passaram com 10 linhas e rodapé dentro do viewport; geometria registrada: primeira linha y=377,89 px, décima linha até y=629,77 px, rodapé até y=730,27 px, documento com 768 px. Capturas e JSON de geometria são anexados à execução Playwright da fixture. Navegação por teclado passou nas três páginas, mantendo foco e faixa anunciada. Isso comprova o cenário fixture, não altera a evidência do seed real. Warning Sass `@import` permanece.

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

Na inspeção inicial, o zoom nativo a 200% não foi executado: o atalho enviado ao navegador
controlado não alterou o zoom (innerWidth 1366, devicePixelRatio 1 e visualViewport.scale 1
antes/depois). Foi oferecida verificação por CSS `zoom: 200%`; o solicitante preferiu manter
pendente essa verificação nativa, sem aceitar substituição. A situação foi atualizada pelo
relato manual abaixo. Isso não comprova homologação de navegadores/dispositivos reais ou
aceite da ótica. Firefox, WebKit e leitor de tela não foram verificados.

#### Complemento — relato manual de zoom nativo, 14/11/2026

Após a inspeção acima, o solicitante confirmou ter aplicado 200% pelo controle nativo do
navegador, sem CSS zoom ou DevTools. Relatou que os elementos permaneceram dentro da página,
sem distorção nem barras laterais. Este resultado é evidência manual informada pelo
solicitante, não uma medição independente nesta sessão. Combinado ao percurso assistido,
teclado, foco, atalho, leitura sem corte e movimento reduzido registrados acima, conclui-se
a verificação técnica desta tarefa no escopo observado. Isso não representa homologação
de outros navegadores/dispositivos, teste com tecnologia assistiva ou aceite do produto.

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

### Refinamento da lateral vermelha — PRD 1.2 / TDD 1.5

Pedido visual posterior aplicado na mesma Change e branch, após alinhar os artefatos:
tema claro com fundo `#ce0026`, textos/ícones claros e ativo claro com texto vermelho
escuro; tema escuro com degradê vertical estático `#850020` → `#300010` e ativo vermelho.
Tokens próprios limitados à lateral; logo intacta, sem novos pacotes, alterações no
conteúdo principal ou nas regras de navegação. O bloco abaixo de md usa a mesma identidade.
As imagens `exemploListagemDeVendas.png` e `exemploDesignDark.png` passam também a orientar
as cores dessa área, sem autorizar copiar campos/dados. Referências visuais não são embutidas.

O teste de contraste passou a considerar background-image, com interpolação sRGB explícita
entre as duas paradas do degradê; amostras conservadoras no topo, meio e base são usadas
para texto normal/secundário, perfil, links, ícones, ativo, hover e foco. Mínimos observados:

| Lateral | Texto/ícones | Foco    |
| ------- | ------------ | ------- |
| Escura  | 5,96:1       | 10,41:1 |
| Clara   | 4,83:1       | 5,75:1  |

Contorno de foco 3 px explícito para não ser removido pela precedência dos estilos nav do
Bootstrap. Duas falhas incrementais foram corrigidas após confirmação: ausência desse
contorno e contraste 4,49:1 durante a transição de cores do item ativo. A animação dos links
foi desativada para evitar cores intermediárias ilegíveis; o degradê estático foi preservado.
Revisão visual assistida nos dois temas em 1366 × 768 e 390 × 844 confirmou composição,
logo proporcional, perfil legível, indicação de Quitadas e foco, sem corte horizontal.

Execuções posteriores às correções em `frontend/`, todas com saída 0:

- `npm.cmd run format:check`: aprovado.
- `npm.cmd run build`: produção estrita, 467,06 kB iniciais, transferência estimada 87,48 kB.
- `npm.cmd test -- --watch=false`: 21/21 testes em 5 arquivos.
- `npm.cmd run test:e2e -- --config playwright.lateral.config.ts`: 26/26 execuções,
  13 por viewport; sem erros inesperados de console/pageerror.

A primeira tentativa E2E na configuração padrão foi bloqueada pela porta 4200 ocupada,
sem executar testes. Conforme escolha do solicitante, a regressão e a inspeção usaram
servidor próprio em 4301, mantendo o processo de 4200 intacto. A configuração temporária
`playwright.lateral.config.ts` apenas estendeu a padrão, sobrescrevendo `use.baseURL` e
`webServer.url` para `http://127.0.0.1:4301`, comando `npm.cmd exec -- ng serve --host
127.0.0.1 --port 4301` e `reuseExistingServer: false`. Foi removida após as execuções;
para repetir na mesma porta, recriar esse override temporário. Os testes de contextos novos
agora usam a baseURL do runner, sem acesso acidental ao servidor de 4200. Servidor próprio
encerrado; capturas temporárias fora do Git. Warning Sass `@import` mantido.

Validação OpenSpec e diff registradas nas tarefas. Não há certificação de acessibilidade
integral; zoom nativo 200% permanece pendente em 5.2, sem substituição por CSS zoom e sem PR.

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
