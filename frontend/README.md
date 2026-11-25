# Base técnica — Vendas em Aberto

## Apply `dashboard-relatorios` — baseline de Relatórios — 25/11/2026

Antes de alterar a página, Relatórios foi capturado com o seed sintético padrão no
Chromium headless, nos viewports 1366×768 e 390×844, temas escuro e claro. As quatro
capturas PNG e os metadados JSON estão versionados em
`frontend/evidencias/dashboard-relatorios/baseline/` (`relatorios-{dark,light}-{1366x768,390x844}.{png,json}`).
Os metadados registram dimensões do documento, títulos, linhas das tabelas e
tipografia. No baseline, o documento mede 1366×1773 no desktop e 390×2466 no celular;
as quatro tabelas presentes usam fonte de 18 px e line-height de 20 px, com 6
recebimentos, 3 vendas, 9 saldos e 6 parcelas vencidas no seed. A composição contém
“Análise mensal”, seguida das cinco tabelas/seções existentes e da ação ilustrativa
de exportação; ainda não há seletor, cartões ou gráficos. Os arquivos foram
verificados após a geração. Capturas e dados são sintéticos, sem aceite visual ou
operacional; esta baseline não mede zoom nativo.

### Cálculo mensal opcional — tarefa 2.1

`calcularRelatorio(vendas, referencia, mes?)` mantém o comportamento anterior quando
chamado com dois argumentos. O terceiro argumento seleciona o mês civil das vendas e
recebimentos; as posições de saldo, vencidas e Prejuízo continuam derivadas das
projeções existentes na referência, sem reconstrução histórica. Foram cobertos os
limites inclusivos, movimento de venda Ativa e recebimentos de todos os status,
meses sem dados/futuros, fevereiro bissexto e comum, dezembro/janeiro e os anos
0001/9999. A comparação de meses confirmou saldos, vencidas e Prejuízo invariáveis.

Verificações executadas em 25/11/2026: `npm.cmd test -- --watch=false
--include="src/app/funcionalidades/relatorios/relatorios.calculos.spec.ts"` — **19/19
testes aprovados**; Prettier direcionado aos dois arquivos de cálculo/teste e
`git diff --check` — aprovados. Os cenários são unitários e usam projeções sintéticas;
não representam aceite operacional.

## Deploy no GitHub Pages — `deploy-github-pages` — 23/11/2026

Foi criado `.github/workflows/deploy-pages.yml`: o deploy automático é acionado por
`push` em `main`; `workflow_dispatch` permite execução manual. O workflow instala
dependências com `npm ci` (Node.js 24 e npm 11.19.0), compila no diretório `frontend/`
com base `/TCC-Academia---Programation/`, copia `index.html` para `404.html` como
fallback da SPA e publica `dist/vendas-em-aberto/browser` usando as Actions oficiais
de artefato/deploy do Pages. `GITHUB_TOKEN` possui permissões de leitura de conteúdo
no build e `pages: write`/`id-token: write` no job de deploy. Concorrência evita
cancelar um deploy em andamento.

O GitHub Pages foi configurado via API do GitHub com `build_type=workflow`; a API
retornou a URL `https://thig0s.github.io/TCC-Academia---Programation/` e `https_enforced=true`.
Isso confirma configuração, não publicação: ainda não houve push/merge em `main` após
a criação do workflow, então a execução real, o carregamento público de assets e uma
rota acessada diretamente permanecem pendentes.

Verificações locais em 23/11/2026: `npm run build -- --base-href=/TCC-Academia---Programation/`
passou; conferência da saída confirmou base href, arquivos JS/CSS e fallback `404.html`.
`npm test -- --watch=false`: 373 testes em 31 arquivos aprovados. `npm run format:check`
e `prettier --check .github/workflows/deploy-pages.yml` passaram. `openspec validate
deploy-github-pages --strict` passou. A validação remota do workflow e o deploy dependem
de sua publicação/execução no GitHub após integração na `main`.

### Revisão dos caminhos de imagens

A conferência identificou `src="/imgs/logo-franquia.jpg"`, que apontaria à raiz do
domínio (`/imgs/...`) e quebraria na URL de projeto do Pages. A referência foi corrigida
para `src="imgs/logo-franquia.jpg"`, resolvida relativamente ao `<base href>`; o teste
unitário confirma que a URL resultante é
`/TCC-Academia---Programation/imgs/logo-franquia.jpg`. O arquivo existe em
`frontend/public/imgs/logo-franquia.jpg` e é copiado para `browser/imgs/logo-franquia.jpg`
no build. O favicon já usa caminho relativo (`favicon.svg`) e também é copiado de
`frontend/public/`. A validação final da resposta HTTP da imagem e do favicon no Pages
depende da publicação após merge.

O teste E2E `npm run test:e2e -- --grep "logo local"` não iniciou: o endereço padrão
`127.0.0.1:4200` já estava ocupado. O servidor existente foi preservado e não reutilizado;
portanto esse teste não é contado como aprovado. A resolução no subcaminho é verificada
pela regressão unitária e pela presença do arquivo no build local.
## Apply `harmonizar-consultas-colecoes` — estilo das buscas — 24/11/2026

Os campos de busca e botões Limpar pesquisa em Quitadas, Inativas e Prejuízo agora
usam a mesma altura, superfície, borda, arredondamento, espaçamento e foco visual
da listagem de Vendas abertas. Inativas e Prejuízo recebem o ajuste pelo template
administrativo compartilhado. Nenhum filtro por situação ou outro controle foi
adicionado; busca, limpeza, rotas e paginação permanecem inalteradas. O texto auxiliar
usa a cor de conteúdo para manter contraste legível sobre a nova superfície da busca.

Verificações finais após a revisão:

- `npm.cmd test -- --watch=false` — **418 testes em 33 arquivos aprovados**.
- Build (`npm.cmd run build`) — aprovado; bundle inicial **315,57 kB** (transferência estimada **83,52 kB**).
- E2E completo (134 testes, Chromium 1366×768 e 390×844) — aprovado usando configuração temporária com `reuseExistingServer: true`, pois a porta padrão 4200 já estava em uso.
- Prettier direcionado aos templates, testes e artefatos OpenSpec — aprovado.
- `openspec validate harmonizar-consultas-colecoes --strict` e `git diff --check` — aprovados.

A checagem Prettier que também incluiu o PRD e o TDD apontou diferenças de
formatação que já existem nesses documentos em `HEAD`; eles não foram reformatados
integralmente. As verificações usaram somente dados sintéticos e não constituem
aceite operacional.

## Apply `feedback-luighi` — coleções e reconciliação por status — 24/11/2026

As projeções normais de Vendas/Quitadas incluem somente vendas Ativas; Inativas e
Prejuízo são expostas separadamente no serviço. Total em aberto, atraso e quantidade
operacional contam apenas Ativas. Recebimentos mensais e consultas por período continuam
incluindo valores efetivamente pagos por vendas de qualquer status, sem reclassificar ou
duplicar o histórico.

Reconciliação observada em teste: uma venda sem entrada, de R$ 1.000,00 em quatro
parcelas, teve a primeira parcela de R$ 250,00 recebida em 15/01/2027. Com três parcelas
pendentes vencidas, o saldo e o atraso operacionais eram R$ 750,00. Ao passar por
Inativo→Ativo e Prejuízo→Ativo, as coleções e esses indicadores saíram/voltaram conforme
o status; enquanto fora de Ativo, saldo, atraso e contagem operacional deixaram de
incluí-la. Em todas as transições, o recebimento de R$ 250,00 permaneceu no período de
15/01/2027 uma única vez, e ID, parcelas e histórico foram preservados. Isso documenta
somente o comportamento coberto pelo teste de serviço, não uma validação operacional.

Verificação executada: `npm.cmd test -- --watch=false` — **379/379 testes em 31 arquivos**.
As ações visuais e as seções navegáveis de Inativas/Prejuízo foram entregues na tarefa 1.3;
o total acima registra a suíte executada ao concluir a tarefa 1.2.

## Apply `feedback-luighi` — baixa individual com acréscimo — 24/11/2026

O núcleo mantém `Venda.valorTotalCentavos` e os valores das parcelas como bases imutáveis.
Cada baixa individual nova registra o valor efetivo na alocação e no recebimento, marca a
origem como `individual` e grava o acréscimo (efetivo menos base) e a observação. Entradas
e lotes do seed permanecem sem esse marcador e sem acréscimo; não foram reescritos. A
projeção soma os acréscimos ao total efetivo e calcula o saldo como total efetivo menos o
recebido, validando que o resultado continue exatamente igual à soma das parcelas-base
pendentes, sem crédito residual. Valores não seguros, overflow, acréscimo inconsistente,
alocação fora da sequência e observação acima de 20 caracteres são rejeitados antes da
publicação.

No modal, o valor-base aparece para conferência e preenche inicialmente o campo editável
Valor recebido. A baixa continua integral e sequencial; valor inferior à base, data/forma
inválidas ou nota longa bloqueiam a confirmação e associam o erro ao campo, mantendo o
rascunho para correção/retry. A nota é opcional e limitada a 20 caracteres. “Checar juros
do Crediloja!” aparece somente quando a parcela está atrasada; nenhum juro é calculado ou
exigido, e não há integração com o Crediloja. O valor efetivo já está disponível na
projeção do domínio; sua apresentação nos detalhes e relatórios será coberta pelas tarefas
posteriores da Change. A correção de pagamentos individuais também permanece pendente das
tarefas 3.1/3.2; entrada e lote histórico não são editáveis neste fluxo.

Reconciliação sintética observada nos testes: em uma venda de R$ 100,00 dividida em três
parcelas sem entrada, a primeira base de R$ 33,34 foi recebida por R$ 40,00, com acréscimo
de R$ 6,66 e nota “juros externos”. A base contratual permaneceu R$ 100,00, o total
efetivo projetado passou a R$ 106,66, o recebido ficou em R$ 40,00 e o saldo permaneceu
R$ 66,66, igual às duas parcelas-base pendentes; a baixa não alterou seus valores. Outro
teste recebeu R$ 0,07 acima da base em uma venda de R$ 1.000,03 e verificou total efetivo
de R$ 1.000,10, sem saldo residual após quitar as demais bases. Esses resultados são
evidência de testes automatizados com dados sintéticos, não de operação real ou aceite da
ótica.

Concordância conferida: o comportamento implementado corresponde ao PRD/RF-015/RN-025,
à TDD/DEC-028/D2/D5 e aos cenários da Change `feedback-luighi` (tarefas 2.1/2.2). As
restrições de juros, histórico e saldo-base foram preservadas.

Verificações executadas em 24/11/2026: `npm.cmd test -- --watch=false` — **396/396
testes em 32 arquivos**; `npm.cmd run build` — aprovado (bundle inicial de **310,31 kB**,
transferência estimada **82,60 kB**); `prettier --check` de `frontend/README.md` —
aprovado; e `git diff --check` — aprovado. A checagem Prettier que incluiu
`docs/tdd/tdd.md` reportou diferenças de formatação; o TDD não foi reformatado
integralmente para evitar alterações mais amplas que esta tarefa. Testes E2E específicos
da baixa não foram executados nesta etapa; os testes de componente usam um dialog
simulado e não comprovam top layer/inércia do navegador. Não houve cálculo de juros,
integração externa ou avaliação operacional.

## Apply `feedback-luighi` — correção pela interface e conciliação no relatório — 24/11/2026

O detalhe da venda agora separa valor-base, total efetivo, recebido por parcela e acréscimo.
A ação **Corrigir pagamento** aparece somente em parcelas pagas por um recebimento
individual de uma venda Ativa. O modal apresenta valor, data, forma e observação atuais,
permite confirmar ou cancelar e também pode ser fechado por Escape. A correção substitui
o mesmo recebimento pelo ID estável e mantém sua alocação; não cria recebimento nem ID
novo. Valor abaixo da base, data fora do período venda–referência, forma inválida e nota
acima de 20 caracteres são recusados, mantendo a venda e o rascunho para nova tentativa.
Entradas e lotes históricos continuam sem edição.

O relatório mensal distingue a origem `Individual` de `Entrada` e `Lote`. A correção
recalcula o valor efetivo e move o recebimento para o mês da nova data, contado uma única
vez. Em cenário E2E sintético de venda de R$ 100,00 em três parcelas sem entrada, a
primeira base de R$ 33,34 recebeu R$ 34,34 e foi corrigida para R$ 33,84 (acréscimo de
R$ 0,50). A parcela-base permaneceu inalterada; a linha saiu do relatório do mês original,
o total desse mês diminuiu R$ 34,34 e a correção ficou associada ao mesmo pagamento. A
validação de domínio também cobriu movimentação entre meses, preservação do saldo-base e
retry atômico. Juros do Crediloja não são calculados nem integrados.

Verificações executadas em 24/11/2026: `npm.cmd test -- --watch=false` — **404/404
testes em 32 arquivos**; `npm.cmd run build` — aprovado (bundle inicial de **314,04 kB**,
transferência estimada **83,13 kB**); Prettier dos arquivos alterados — aprovado;
`git diff --check` — aprovado; e `openspec validate feedback-luighi --strict` — aprovado.
Teste E2E direcionado — **2/2 projetos Chromium**, 390×844 e 1366×768, com os temas
escuro e claro exercitados em cada projeto; cobriu valores iniciais, Escape/foco,
validação dos campos, correção e reconciliação mensal. O E2E reutilizou temporariamente
um `ng serve` já ativo na porta 4200; a configuração temporária foi removida após a
execução. A suíte E2E completa e a fixture de paginação não foram executadas nesta
tarefa; estão previstas na regressão integrada. Os testes são sintéticos e não constituem
aceite operacional.

## Apply `feedback-luighi` — ordenação e navegação por coleções — 24/11/2026

A consulta normal de Vendas lista apenas contratos Ativos e combina pesquisa, situação
financeira e ordenação antes da paginação de dez linhas. Os critérios são cliente A–Z,
data de venda crescente e próximo vencimento pendente crescente; empates usam ID crescente
e vendas sem vencimento ficam por último. Trocar o critério retorna à primeira página e
preserva os demais filtros. Inativas e Prejuízo continuam em rotas e coleções próprias,
acessíveis pela navegação principal e pela navegação entre coleções; não foi adicionado
seletor administrativo à lista normal nem uma segunda cópia de Prejuízo. A busca e o
filtro financeiro permanecem aplicados somente à coleção corrente.

Verificações de consulta: os testes de componente das listas normais e administrativas
passaram **12/12**, cobrindo coleções exclusivas, rotas por ID, estados vazios, busca e
paginação; os testes de ordenação cobrem empate por ID, datas crescentes, vencimento
ausente, reset da página, combinação de filtros e redução para dez itens. O E2E de
navegação por teclado passou em **2/2 projetos Chromium** (390×844 e 1366×768): Tab/Enter
percorreu Quitadas, Inativas e Prejuízo, os destinos vazios foram anunciados e não houve
overflow horizontal. O E2E de transições com dados passou em **4/4 casos** nos dois
viewports e temas claro/escuro, retornando Inativas e Prejuízo aos destinos dedicados.
Esses testes validam somente o protótipo demonstrativo, não aceite operacional.

Verificações executadas em 24/11/2026: `npm.cmd test -- --watch=false` — **410/410
testes em 33 arquivos**; `npm.cmd run build` — aprovado (bundle inicial de **314,08 kB**,
transferência estimada **83,19 kB**); Prettier dos arquivos alterados — aprovado;
`git diff --check` — aprovado; `openspec validate feedback-luighi --strict` — aprovado.
Os testes E2E foram direcionados às rotas e transições administrativas; a suíte E2E
completa e a fixture separada de paginação extensa não foram executadas nesta tarefa.
Nenhum desses testes sintéticos constitui aceite operacional.

## Apply `feedback-luighi` — projeções de Relatórios por status — 24/11/2026

Os cálculos agora preservam Recebimentos no mês de todos os status pela data efetiva,
enquanto Vendas no mês, posição em aberto e parcelas vencidas consideram somente vendas
Ativas. O total vendido usa o total efetivo com acréscimos aceitos; o saldo permanece
baseado nas parcelas pendentes. A posição calcula o primeiro vencimento pendente e ordena
por essa data; parcelas vencidas também ficam em ordem crescente, com empates estáveis.
Há projeção separada das parcelas pendentes em Prejuízo: todas as linhas são mantidas,
mas só parcelas de contratos sem entrada ou qualquer recebimento compõem o total separado.
O grid e sua apresentação com identificação e linhas excluídas do total foram concluídos na
tarefa 5.2, conforme verificações abaixo.

Os testes de cálculo e componente de Relatórios passaram **17/17** antes da regressão
completa. Cobriram recebimentos históricos com contrato Inativo/Prejuízo, reativação sem
duplicar recebimentos, venda mensal com acréscimo e total efetivo, entrada, contrato em
Prejuízo com pagamento parcial anterior versus sem pagamentos, saldo/atraso apenas Ativos,
ordenação e desempate, recebimento que muda de mês mantendo o mesmo ID, limites civis e
overflow. Os cenários de projeção usam dados sintéticos; a mudança de status foi exercitada
por novas projeções no teste de cálculo e por atualização da fonte reativa no teste de
componente. Não constituem aceite operacional.

Verificações executadas em 24/11/2026: `npm.cmd test -- --watch=false` — **415/415
testes em 33 arquivos**; `npm.cmd run build` — aprovado (bundle inicial de **314,08 kB**,
transferência estimada **83,15 kB**); Prettier dos arquivos de cálculo e testes — aprovado;
e `openspec validate feedback-luighi --strict` — aprovado. A interface do relatório e sua
regressão E2E visual/responsiva foram verificadas na tarefa 5.2.

## Apply `feedback-luighi` — apresentação dos relatórios de cobrança — 24/11/2026

Os relatórios identificam recebimentos, vendas, parcelas em aberto e parcelas vencidas
com títulos e tabelas próprias. Posição em aberto e atraso exibem CPF/telefone; a primeira
também apresenta o primeiro vencimento pendente. Posição e vencidas permanecem em ordem
crescente de vencimento, conforme as projeções da tarefa 5.1. Links de cliente levam à venda
por ID e anunciam o nome e o ID. O grid de Prejuízo lista somente parcelas pendentes,
apresenta CPF/telefone, parcela e vencimento, e marca explicitamente se cada linha entra na
soma ou fica fora por existir recebimento anterior. O total separado inclui somente as
parcelas pendentes de vendas sem entrada ou outro pagamento.

As regiões de tabela têm nomes acessíveis distintos das seções que as contêm, foco por
teclado e instrução associada para percorrer colunas com as setas. A largura excedente é
rolada localmente; o E2E também verifica que o documento não ganha overflow horizontal.
Estados vazios não criam tabelas fantasma. Não foram incluídos cartões, gráficos ou
indicadores do dashboard da Change posterior `dashboard-relatorios`.

Verificações direcionadas em 24/11/2026: testes de cálculo, apresentação e conteúdo —
**21/21** em três arquivos. E2E direcionado — **10/10 execuções** nos dois projetos Chromium,
cobrindo o grid Prejuízo com/sem recebimentos anteriores, soma reconciliada com as linhas
incluídas, IDs, identificação, ordenação, rolagem local, ausência de overflow global e os
temas escuro/claro em 1366×768 e 390×844; também verificou reconciliação entre cadastro,
recebimentos, vendas, Visão Geral e relatório. Prettier dos arquivos desta tarefa,
`git diff --check` e
`openspec validate feedback-luighi --strict` — aprovados. São evidências sintéticas do
protótipo, não aceite operacional. A regressão integrada e a fixture independente de
paginação estão registradas abaixo.

## Apply `feedback-luighi` — regressão integrada e conciliação — 24/11/2026

As projeções de status, baixa/correção individual, valores-base e efetivos, coleções,
filtros, indicadores e relatórios foram conferidos em conjunto. Os E2E exercitam a navegação
e os fluxos administrativos, o acréscimo seguido de correção de valor/data/forma, edição de
identificação sem mudar finanças, filtro sem restringir indicadores, recebimentos que mudam
de mês, recarga que descarta a sessão demonstrativa e retorno das coleções. Casos de centavos,
limites de mês civil, pagamentos históricos e falhas atômicas também são cobertos nos testes
unitários/componentes, conforme as seções anteriores. O E2E integrado de cadastro, entrada,
quitação, filtro, edição, indicadores e relatórios percorreu os temas escuro/claro nos dois
projetos Chromium.

Verificações finais em 24/11/2026:

- `npm.cmd test -- --watch=false` — **416/416 testes em 33 arquivos**.
- `npm.cmd run test:e2e -- --config=playwright.reuse.config.ts` — **132/132**; projetos
  Chromium 1366×768 e 390×844.
- `npm.cmd run test:e2e:paginacao-fixture` — **24/24**; inclui os limites 0/1/10/11/21,
  larguras responsivas, temas, teclado e detalhes com dez/onze parcelas.
- O E2E de reconciliação integrada, ampliado para ambos os temas, passou **2/2 projetos**;
  cada projeto percorreu escuro e claro. A fixture permite rolagem vertical normal no detalhe
  de dez parcelas (documento de 935 px para viewport de 768 px), mantendo alinhamento dos
  blocos em desktop, conteúdo alcançável e sem overflow horizontal.
- `npm.cmd run build` — aprovado; bundle inicial **314,47 kB** (transferência estimada
  **83,10 kB**). `npm.cmd run format:check` e `openspec validate feedback-luighi --strict`
  — aprovados; `git diff --check` — aprovado.

O E2E reutilizou temporariamente o servidor já ativo na porta 4200 por meio de
`playwright.reuse.config.ts`; a configuração não faz parte da entrega e foi removida após a
execução. As duas suítes Playwright foram executadas em processos separados para evitar
colisão de artefatos de trace. Tentou-se o atalho de zoom no Chromium headless, mas o browser
não expôs controle de zoom nativo: `innerWidth`, largura do documento, `devicePixelRatio` e
`visualViewport.scale` permaneceram inalterados. Portanto, zoom nativo de 200% **não foi
verificado**; as verificações em viewports reais de 1366×768 e 390×844 não são apresentadas
como equivalente. Todos os dados são sintéticos; não houve homologação, operação com clientes
reais nem aprovação da ótica.

Conciliação: PRD/FON-017, TDD/DEC-028, seis deltas SDD e tarefas CA-036–038 foram comparados
com a implementação e os resultados acima. A Change implementa o protótipo em memória sem
persistência, juros calculados ou integração Crediloja; `dashboard-relatorios` permanece fora
do escopo. Ver também `openspec/changes/feedback-luighi/tasks.md` para rastreabilidade por
tarefa.

## Apply `nomes-e-valores-seed-vendas` — 23/11/2026

O seed inicial agora usa 12 nomes completos sintéticos distintos e 12 totais também
distintos, de R$ 689,00 a R$ 2.399,00. IDs, datas, grupos de situação e presença de
entrada foram preservados; entradas equivalem a 20% do total e parcelas/recebimentos
históricos são derivados dos valores efetivos. Nenhum nome ou número foi consultado
externamente, e não há garantia de inexistência de titulares. PRD, TDD e a Change
`nomes-e-valores-seed-vendas` registram os requisitos e o desenho.

Verificações desta alteração: `npm.cmd test -- --watch=false` — **373/373 testes**;
`npm.cmd run build` — aprovado (bundle inicial de **305,21 kB**, transferência
estimada **81,56 kB**); `npm.cmd run format:check` — aprovado; e
`openspec validate nomes-e-valores-seed-vendas --strict` — aprovado. Os testes do
seed também mantêm os cenários de datas extremas, situações possíveis, determinismo,
identificação válida e reconciliação financeira.

## Apply `piloto-fidelidade-visual-vendas` — baseline e mapa de referência — 22/11/2026

### Baseline anterior à edição — tarefa 1.1

A captura reprodutível adicionada em `e2e/paginacao-fixture.spec.ts` foi executada
antes de alterar templates/estilos de produção:

`npm.cmd run test:e2e:paginacao-fixture -- --grep "registra baseline visual do piloto" --output=test-results/piloto-fidelidade-visual-vendas-baseline`

Resultado: **2/2 projetos Chromium** (1366×768 e 390×844), ambos percorrem Vendas e
Quitadas nos temas escuro/claro. O seed é sintético; Vendas usa exatamente dez
registros abertos e Quitadas tem 16 registros, com dez linhas visíveis na primeira
página. O teste grava PNG/JSON local em `test-results/`; uma cópia versionada das
oito combinações página×tema×viewport está em
`evidencias/piloto-fidelidade-visual-vendas/baseline/`.

Na baseline clara/escura de Vendas em 1366×768, documento **1366×768**, décima linha
até **661,5 px**, rodapé até **692 px**, fonte/line-height **18/20 px**. A região da
tabela tem **1070 px** visíveis para **1305 px** de conteúdo e mantém `overflow-x:auto`;
na tela estreita, documento **390×1447**, tabela **362/1305 px** (visível/conteúdo),
com a mesma rolagem local e sem overflow horizontal global. Quitadas em 1366×768
tem décima linha até **633,5 px**, rodapé até **682 px**, tabela **1070/1309 px**;
em 390×844, documento **390×1370 px** e tabela **362/1309 px**. Os JSONs por tema
e viewport contêm as medições completas.

### Mapa referência ↔ contrato vigente — tarefa 1.2

| Área da referência escolhida                                              | Alvo estético do piloto                                                   | Contrato mantido / item fora                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabeçalho “Vendas” com ícone/copy e CTA à direita                         | Reforçar hierarquia, respiro e acabamento do cabeçalho/painel             | Sem conteúdo comercial demonstrativo novo; “Nova venda” permanece na faixa dos critérios (RF-003/CA-028/DEC-023)                                        |
| Quatro cartões KPI acima dos critérios                                    | **Não reproduzir** na listagem                                            | Total em aberto, Valores em atraso, Recebido no mês e Vendas cadastradas não aparecem como cartões (RF-002/CA-028)                                      |
| Busca destacada, situação, filtro de período e limpar filtros             | Dar tratamento de controle coeso à busca e situação locais                | Uma busca local; sem período; “Limpar pesquisa” limpa apenas o termo e preserva situação; sem limpeza conjunta (RF-003/CA-028/DEC-023)                  |
| Tabela em cartão branco, cabeçalho suave, linhas e separadores finos      | Reorganizar visualmente superfícies, alinhamentos, densidade e hover/foco | Oito colunas/dados atuais; texto de ação Visualizar/Editar permanece visível; não criar avatares/IDs falsos nem menu de reticências (RF-002/CA-028/029) |
| Selos suaves coloridos por situação                                       | Aplicar pills legíveis e integradas à linha                               | Texto e classificação real continuam presentes, sem depender só de cor                                                                                  |
| Rodapé com faixa à esquerda e paginação à direita                         | Unificar faixa e navegação em composição de tabela                        | Contagem, páginas e foco seguem o contrato de paginação (CA-027)                                                                                        |
| Tipografia compacta da imagem (captura 1672×920)                          | Referência de ritmo e hierarquia, não de redução tipográfica              | 18 px/20 px e padding atual permanecem; em 1366×768 a tabela rola horizontalmente dentro da região, como medido na baseline (CA-028)                    |
| Sidebar clara, busca global, notificações, janela e largura desktop ampla | Registrar como contexto da composição, fora deste piloto                  | Shell/sidebar não são alterados; sem busca duplicada, notificação, controle de janela ou mudança de largura global                                      |

A imagem mostra 8 colunas compatíveis em conceito, mas usa avatar e menu de ações
ilustrativos, fonte menor e um desktop de 1672 px. A versão atual preserva seus dados
e ações verdadeiros. A fidelidade desta etapa será julgada por composição, superfície,
hierarquia e acabamento no conteúdo de Vendas; sem prometer réplica pixel a pixel ou
aprovação automática. PRD RF-002/RF-003, CA-027/028/029, TDD DEC-018/022/023 e o delta
`openspec/changes/piloto-fidelidade-visual-vendas/specs/consulta-vendas/spec.md`
foram conferidos antes da implementação.

### 2.1 — hierarquia e faixa de critérios

Em `src/app/funcionalidades/vendas/listar-vendas/listar-vendas.html`, o título
“Vendas” passou à escala principal do cabeçalho, enquanto “Vendas cadastradas”
passou a encabeçar um painel com borda de destaque. A referência da demonstração
fica alinhada ao título como informação auxiliar. A faixa única de critérios recebeu
fundo contextual, mais respiro e controles de 48 px com superfície/contorno
consistentes; busca, situação, Limpar pesquisa e Nova venda continuam no mesmo
grupo, sem busca duplicada ou KPI. O status de resultados ganhou separação visual.
Shell e template de Quitadas não foram alterados. Componentes de tabela, selo e
paginação receberam variantes opt-in que permanecem desligadas por padrão; somente
Vendas abertas solicita esse acabamento.

Capturas sintéticas pós-2.1 (1366×768 e 390×844, claro/escuro) estão em
`evidencias/piloto-fidelidade-visual-vendas/hierarquia/`; comparação direta com a
baseline usa os arquivos correspondentes de
`evidencias/piloto-fidelidade-visual-vendas/baseline/`. O E2E direcionado
`npm.cmd run test:e2e:paginacao-fixture -- --grep "hierarquia de Vendas apresenta"`
passou 2/2 projetos; o teste inclui título, faixa única, alinhamento desktop,
controles, registros sintéticos e capturas. A automação `consulta listas, combina
critérios` passou **2/2** em servidor isolado na porta 4310 após detectar a porta
4200 ocupada; verificou busca, combinação com situação, Limpar pesquisa preservando
o filtro e CTA Nova venda.

### 2.2 — tabela, situações, estados e rodapé contextual

O acabamento opt-in da tabela mantém as oito colunas, fonte de **18 px**, line-height
de **20 px**, paddings das células (4 px vertical/10 px horizontal) e ações textuais.
Em Vendas abertas, o contorno da região fica mais arredondado, linhas alternadas
recebem superfície suave e hover/foco passam a transicionar sem alterar o conteúdo.
Selos mantêm os paddings verticais originais e ampliam somente o respiro horizontal;
a paginação usa contornos arredondados, sombra discreta e borda de destaque na página
ativa. A composição funciona com os tokens light/dark existentes e sem gradientes
novos. As variantes padrão continuam inalteradas em Quitadas.

Após 2.2, em 1366×768 e ambos os temas: décima linha até **676 px**, rodapé até
**720,5 px**, documento permanece **1366×768**, controles desktop alinhados, fonte/
line-height **18/20 px**, padding celular **4/10 px**. Em 390×844, documento **390×1581**,
largura global **390 px** e tabela rola apenas dentro da região; décima linha e
paginação estão disponíveis no documento rolável. Capturas atualizadas da mesma
fixture sintética de dez vendas (pós-2.2) substituem os quatro PNGs em
`evidencias/piloto-fidelidade-visual-vendas/hierarquia/`; a baseline de dez vendas
permanece em sua pasta homônima. O quadro visual lado a lado e o controle de Quitadas
estão em `evidencias/piloto-fidelidade-visual-vendas/comparacao.md`. A fixture
completa passou **24/24**, incluindo
coleções 0/1/10/11/21, contraste, foco, teclado e viewports. A suíte unitária passou
**373/373** e o build passou. Quitadas foi capturada após a mudança nos dois
temas/viewports em `evidencias/piloto-fidelidade-visual-vendas/quitadas-verificacao/`;
verificações de oito colunas, fonte, paddings, raio da tabela, badge e paginação
confirmam que a variante compartilhada permanece desligada nessa página.
Contraste medido de texto de paginação: mínimo **4,89:1** no estado ativo; contornos
e foco excederam os limites automatizados de **3:1**. As outras áreas de UI não foram
mudadas por esta etapa.

### Verificação integrada — tarefas 3.1 e 3.2

Execuções finais em `frontend/`, 22/11/2026:

| Comando                                                                                                 | Resultado                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd test -- --watch=false`                                                                         | **31 arquivos, 373 testes aprovados**                                                                                                              |
| `npm.cmd run test:e2e -- --config=playwright.pilot-temp.config.ts --workers=2`                          | **116/116** aprovados; config temporária aponta para servidor Chromium na porta 4310, pois a 4200 estava ocupada; arquivo removido após a execução |
| `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/piloto-fidelidade-visual-vendas-final` | **24/24** aprovados; inclui coleções 0/1/10/11/21, ambos temas/viewports, medições e capturas                                                      |
| `npm.cmd run build`                                                                                     | Aprovado; bundle inicial **305,08 kB** (transferência estimada **81,47 kB**)                                                                       |
| `npm.cmd run format:check`                                                                              | Aprovado após formatar os JSONs e comparação versionada das evidências                                                                             |
| `openspec validate piloto-fidelidade-visual-vendas --strict`                                            | Aprovado                                                                                                                                           |
| `git diff --check`                                                                                      | Aprovado                                                                                                                                           |

Durante a integração, o E2E completo inicialmente atingiu o limite de cinco minutos
com 112/116 cenários executados e revelou dois contratos visuais que precisavam ser
atualizados: raio opt-in de Vendas versus raio padrão de Quitadas e contraste dos
textos sobre zebra translúcida. O teste de raio agora diferencia as variantes e o
fundo alternado usa o token sólido `surface-muted`; após as correções a suíte completa
foi executada novamente pelo script padrão, com **116/116 aprovados**. O format check
inicial também apontou os JSONs gerados, corrigidos antes do resultado final. Não foi
encerrado o processo que ocupava a porta 4200.

Não houve reinspeção de zoom nativo do navegador nesta Change; nenhum resultado de
zoom é alegado. As capturas são sintéticas; a avaliação estética registrada abaixo
foi fornecida explicitamente pelo solicitante, não inferida dos testes automatizados.

Em 23/11/2026, após revisar a comparação `evidencias/piloto-fidelidade-visual-vendas/comparacao.md`,
o solicitante aprovou explicitamente a direção visual do piloto pelo Harness. A
aprovação limita-se à listagem de Vendas; não autoriza aplicar o padrão às outras
páginas nem mesclar o PR.

## Apply `novo-design` — verificação integrada — 22/11/2026

Conclusão da Change `novo-design` na `feature/redesign`. O escopo ficou restrito
à apresentação existente, seus testes e documentação: rotas, conteúdo/ações,
contratos de componentes, filtros, cálculos, seed e regras de negócio foram
preservados. PRD `docs/prd/vendas-em-aberto.md` e TDD `docs/tdd/tdd.md` foram
reutilizados; a proposta, o desenho, o delta `consulta-vendas` e as tarefas OpenSpec
registram a rastreabilidade. Permanecem como conflitos documentais preexistentes as
menções históricas a “Limpar critérios” e recebimento em lote; esta Change não as
concilia nem reintroduz esses comportamentos.

### Regressão integrada — tarefa 5.1

Execuções finais em `frontend/`, 22/11/2026:

| Comando                                  | Resultado                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm.cmd test -- --watch=false`          | **373/373** testes unitários/componentes aprovados                                              |
| `npm.cmd run test:e2e -- --workers=1`    | **116/116** cenários E2E aprovados; execução isolada na porta 4304 porque a 4200 estava ocupada |
| `npm.cmd run build`                      | Aprovado; bundle inicial **303,68 kB**, transferência estimada **81,19 kB**                     |
| `npm.cmd run format:check`               | Aprovado                                                                                        |
| `npm.cmd run test:e2e:paginacao-fixture` | **16/16** aprovados; aviso esperado de prebundling não utilizado com otimização de scripts      |
| Capturas visuais direcionadas            | **10/10** verificações aprovadas; saídas locais em `test-results/novo-design-visual-final/`     |
| `openspec validate novo-design --strict` | Aprovado                                                                                        |

Não houve falha na execução integrada final. A ocupação da porta padrão foi
contornada com configuração isolada; nenhum processo alheio foi encerrado. A fixture
passou integralmente apesar do aviso acima. As capturas Playwright são evidência
automatizada local, não anexos versionados.

### Comparação visual integrada — tarefa 5.2

Foram conferidos os cinco PNGs presentes, os HTMLs claro/escuro e o template
`nova_venda_refatorada.component.html` em `references/`, junto às capturas atuais
em ambos os temas e viewports 1366×768 e 390×844. A imagem
`a_clean_modern_desktop_app_dashboard_ui_light_the.png`, citada em `DESIGN.md`, não
existe; nenhuma comparação com ela é alegada. Também não se copiou dos protótipos
busca global, KPIs na lista, controles de janela, filtros, ações ou campos fictícios
que conflitam com os contratos atuais.

Na revisão das capturas representativas de Vendas, Visão Geral, cadastro/prévia,
detalhe/parcelas e Relatórios, nos dois temas e tamanhos, a hierarquia e os estados
permanecem legíveis; formulários empilham no viewport estreito, e tabelas/conteúdo
extenso usam rolagem local onde previsto, sem overflow horizontal global. Os cenários
automatizados cobrem ainda Configurações, Quitadas, ausências, erros e modal de
recebimento. Contraste, foco/teclado, densidade e resultados são respaldados pelas
medições e testes registrados nas seções de cada entrega acima; a revisão visual não
substitui auditoria de tecnologia assistiva ou aceite da ótica.

**Zoom nativo 200% — evidência anterior, não repetida nesta execução:** o solicitante
confirmou os destinos e modal nos temas claro/escuro usando Chrome 157.0.8103.79
(64 bits), escala Windows 125% e viewport útil de 506×528,65 CSS px. O registro e
seus limites estão descritos nas revisões do PRD/TDD e na matriz visual anterior deste
README (linhas históricas abaixo); é relato manual, não inspeção nem medição
independente do agente, e não equivale a homologação geral ou aceite da ótica.
Não foi usado `CSS zoom` como substituto. Capturas recentes não são evidência de zoom.

### Fechamento SDD — tarefa 5.3

`openspec validate novo-design --strict` passou. A revisão de rastreabilidade confirma
o reaproveitamento do PRD, TDD e specs; o diff da Change contém templates de
apresentação, testes, tarefas OpenSpec e este registro, sem mudança de contratos,
regras financeiras, rotas ou dependências. Não se afirma conciliação dos conflitos
documentais preexistentes, aprovação da ótica, publicação, PR ou merge nesta etapa.

## Apply `novo-design` — listagens — 22/11/2026

Reutilizados PRD RF-002/RF-003 e CA-027/028, TDD DEC-018/022/023 e o delta
OpenSpec `novo-design`; sem alterar dados, rotas, filtros, ações ou contratos dos
componentes. `DESIGN.md` confirma “Vendas cadastradas” como título do painel, não
KPI. Os PNGs de listagem e os HTMLs de `references/` mostram composições anteriores
com busca global, cartões financeiros, ícones/ações ilustrativos e, em alguns casos,
filtros de datas ou navegação adicional. Esses elementos não foram copiados: prevalecem
o título e a busca locais, situação, botão “Limpar pesquisa”, CTA existente, oito
colunas, ações Visualizar/Editar e paginação do Angular atual. O mockup escuro e o
claro de listagem serviram para orientar superfície da tabela e selos arredondados;
tokens semânticos e contraste dos dois temas foram mantidos.

O título textual está dentro do painel de Vendas e permanece com linhas, pesquisa
sem resultados e coleção vazia. A tabela recebeu contorno arredondado; os selos usam
formato pill e tipografia 14 px sem aumentar sua altura; a faixa de resultados e a
paginação compartilham uma linha flexível e quebram quando necessário. Foram mantidos
os inputs/outputs, oito colunas, fonte 18 px, line-height 20 px, paddings 10×4 px nos
dados e 10×8 px nos cabeçalhos, ações, semântica de foco e rolagem horizontal contida
na tabela. Não houve alterações no seed nem nova dependência.

Verificações reais:

- `npm.cmd test -- --watch=false --include="src/app/funcionalidades/vendas/listas-vendas.spec.ts"`:
  **9/9** testes de componente.
- `npm.cmd test -- --watch=false --include="src/app/compartilhado/componentes/selo-situacao/selo-situacao.spec.ts" --include="src/app/funcionalidades/vendas/componentes/paginacao-vendas/paginacao-vendas.spec.ts"`:
  **11/11** testes de componente.
- E2E direcionado de título e alinhamento das listas:
  **4/4** em Chromium, 1366×768 e 390×844, claro/escuro.
- `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/novo-design-listagem-1.2-confirmacao`:
  **16/16**. Inclui paginação extensa, coleção de 21 vendas, temas, teclado,
  responsividade e medições de dez linhas. Em 1366×768, a décima linha terminou
  em **660,5 px** e a paginação em **705 px**; em 390×844, a largura do documento
  permaneceu **390 px**, com conteúdo largo rolável na região da tabela.
- Prettier direcionado aos arquivos alterados e `git diff --check`: aprovados.

As capturas/metadados gerados pelo Playwright estão localmente em
`frontend/test-results/novo-design-listagem-1.2-confirmacao/` e
`frontend/test-results/novo-design-listagem-refinamento-2/`; são saídas de teste,
não evidência de zoom nativo ou aceite. A primeira execução integrada da fixture
revelou um deslocamento vertical de 0,5 px nas dez parcelas após ampliar os selos;
reduzido o padding vertical, a execução completa final passou 16/16.

Foram conferidos `DESIGN.md`, os cinco PNGs presentes, os dois HTMLs e
`nova_venda_refatorada.component.html`. A única referência ausente entre as seis
imagens mencionadas no documento é
`references/a_clean_modern_desktop_app_dashboard_ui_light_the.png`; os demais caminhos
citados existem. Não se afirma comparação com a imagem ausente nem com zoom nativo.

## Apply `novo-design` — shell e componentes compartilhados — 22/11/2026

Reutilizados PRD RNF-002/007, TDD DEC-006/021/022 e os protótipos
`references/mercadao_oculos_dashboard_light.html` e
`references/mercadao_oculos_dashboard_dark.html`. Os protótipos exibem busca global,
notificações/controles de janela, gradientes e outros elementos que não fazem parte
do shell atual aprovado. A barra superior continua contendo apenas a identificação
do protótipo e o controle acessível de tema; a busca permanece local à lista. Logo,
sidebar, textos/rotas de navegação e tokens próprios da lateral não foram alterados.

O ritmo foi ajustado com gutter horizontal de 16 px no conteúdo desktop (12 px em
viewports menores), preservando 12 px verticais; a barra superior usa altura mínima
de 56 px e a separação de 8 px entre cabeçalho de página e conteúdo permanece. Os
tokens existentes `--app-surface`, `--app-canvas`, `--app-text`, `--app-brand` e
`--app-focus` já atendem aos estados atuais; não foi necessário criar/alterar tokens
nem tocar em `styles.css`. O subtítulo comum dos cabeçalhos usa o token semântico de
marca, e as mensagens de sucesso existentes no detalhe compartilham raio de borda
de 8 px com os demais painéis. Os contratos do cabeçalho, modal, foco e mensagens
foram preservados; não foi necessário modificar o modal. Nenhuma dependência foi
adicionada.

Verificações reais:

- Captura E2E anterior à edição: **2/2** (`test-results/novo-design-shell-before/`).
- E2E de tema inicial escuro, alternância por teclado, contraste/foco da lateral e
  medidas do shell: **12/12**, Chromium 1366×768 e 390×844, nos dois temas.
- Capturas E2E posteriores para comparação: **2/2** em
  `test-results/novo-design-shell-final/`.
- Comparação de 36 pares de metadados da sidebar (rotas, dois temas e dois viewports):
  **32/36 idênticos**. Nos quatro demais (cadastro e relatórios, claro/escuro),
  a altura geométrica do `<aside>` e a posição vertical do bloco de perfil variaram
  **1 px**, pelo estiramento automático da linha da grade conforme a altura do
  conteúdo. Largura, cores, gradiente, fonte, navegação e estilos computados dos
  elementos internos permaneceram iguais; o E2E
  da lateral mediu contraste mínimo de texto/ícones **4,83:1** no claro e **5,96:1**
  no escuro, e foco **5,75:1** e **10,41:1**, respectivamente.
- Testes de contraste/tabelas, matriz responsiva, mensagens de sucesso e cabeçalho:
  **8/8 E2E**; componentes de cabeçalho e selo: **8/8 unitários**.
- `package.json`/lockfile não foram alterados; o diff do shell não toca logo, rotas,
  navegação lateral ou busca global.

As evidências são capturas/metadados Playwright locais, não equivalem a auditoria de
leitor de tela, zoom nativo de 200% ou aceite da ótica.

## Revisão pós-implementação `refinar-design` — 22/11/2026

Reutilizados PRD RNF-002/007/009, RF-003 e CA-027/028 e TDD DEC-018/021/023,
sem mudança de requisitos ou arquitetura. A revisão autorizada na
`feature/redesign` preserva lateral, tema, fonte tabular de 18 px, CTA Nova venda
na faixa de critérios, rotas e regras financeiras. `DESIGN.md` não rastreado é
trabalho do solicitante e não foi alterado/incluído nos commits.

### Paginação extensa — tarefa 9.2

Reprodução antes da correção: com 80 vendas na fixture e página 4, a largura
documental foi **472 px em viewport de 390 px**; Próxima ficava fora do painel.
O novo E2E falhou nos dois projetos por esse overflow (não por timeout).
A única alteração de produção é `flex-wrap` na lista dos controles compartilhados:
mantém ordem, texto, semântica, eventos e foco, permitindo outra linha quando necessário.
A fixture aceita 80 vendas exclusivamente no alvo de testes; o seed real não muda.

`npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/revisao-paginacao-depois`
passou **16/16**. Inclui primeira/intermediária/última páginas e Enter com foco
preservado em ambos temas, nas larguras 390/767/768/1024/1366. Os testes existentes
de contraste, movimento reduzido e densidade também passaram: em 1366×768,
décima linha até 641,5 px, rodapé até 709 px, dez parcelas até 735 px.
Capturas locais antes/depois estão em `test-results/revisao-paginacao-antes/` e
`test-results/revisao-paginacao-depois/`; não equivalem a zoom nativo ou aceite.

### Auditoria e reprodução — tarefa 9.1

Os 372 testes unitários passaram antes das alterações. A primeira execução E2E
registrou 109/110 aprovados e um timeout no pagamento repetido; ocorreu durante
edições com servidor de desenvolvimento ativo, portanto não serve como baseline
isolada completa. A repetição isolada do mesmo teste passou 2/2, sem alterar fluxo
ou teste de pagamento. A regressão final será feita sem editar a aplicação durante
a execução.

A nova regressão da Visão Geral cadastrou pela interface um nome sintético sem
espaços de 322 caracteres e total de R$ 1.000.000.000.000,00, ambos aceitos pelas
validações atuais. Em 390 px, o documento chegou a **2177 px**; reprodução falhou
nos dois projetos. Isso comprova que a matriz anterior com textos longos contendo
espaços não cobria essa quebra. Fonte, serviços, limites e recortes não devem ser
alterados para contornar o problema.

### Resumos e indicadores resilientes — tarefa 9.3

Aplicado `wrap-anywhere` somente aos indicadores e à grade dos resumos da Visão
Geral. Nomes sem espaços e valores extensos podem quebrar dentro do painel sem
truncar, reduzir fonte, esconder overflow ou mudar cálculo/ordem/limites. A regra
é herdada pelos três resumos, preservando os quatro indicadores e cinco links
por resumo no cenário de teste.

`npx.cmd playwright test --config=playwright.refinar-baseline.config.ts --grep
"resumos preservam nome|preserva os indicadores e refina"
--output=test-results/revisao-resumos-depois` passou **4/4**. O teste novo percorre
390/767/768/1024/1366 px nos dois temas, mede conteúdo versus largura dos painéis
e itens e confirma nome integral. Capturas antes/depois foram inspecionadas em
`test-results/revisao-resumos-antes/` e `test-results/revisao-resumos-depois/`.
As evidências selecionadas de ambas correções estão versionadas em
`evidencias/revisao-refinar-design/`; sem dados reais, zoom nativo ou homologação.

### Regressão isolada final — tarefa 9.4

Verificações finais em `frontend/`, 22/11/2026:

- `npm.cmd test -- --watch=false`: **372/372**, 30 arquivos.
- `npm.cmd run build`: aprovado, inicial **303,80 kB**, sem aviso de budget.
- `npx.cmd ng run vendas-em-aberto:build-paginacao-fixture`: aprovado, **305,70 kB**.
- `npx.cmd playwright test --config=playwright.refinar-baseline.config.ts
--output=test-results/revisao-refinar-design-isolada`: **112/112**, sem edições
  ou builds concorrentes durante a execução. Inclui cadastro/entrada, edição,
  pagamentos/quitação, cancelamento, recarga, foco, contraste, ambos temas e matriz
  responsiva; nenhum teste de fluxo existente foi alterado.
- `npm.cmd run test:e2e:paginacao-fixture --
--output=test-results/revisao-fixture-final`: **16/16**. Único aviso: prebundling
  não usado com otimização de scripts.
- `npm.cmd run format:check`, `git diff --check` e `openspec validate refinar-design
--strict` (os dois últimos na raiz): aprovados.

A tentativa anterior `revisao-refinar-design-final` registrou **111/112** e falha
de tema em Configurações. Os traces das duas tentativas com falhas mostram uma
reinicialização Angular/conexão Vite adicional durante o cenário, com descarte
do estado em memória; elas ocorreram com trabalho/compilações concorrentes e
permanecem registradas, não são aceitas como regressão limpa. A execução isolada
completa acima passou sem alterar aplicação, timeouts, assertions ou retries.

Diff de produção restrito a três classes em dois templates; sem alterações de
domínio, contratos, dependências ou estilos da lateral. PRD/TDD foram reutilizados
e o acompanhamento SDD registra 25/25 tarefas. Não houve nova inspeção manual de
zoom nativo 200%, teste com outros navegadores/leitor de tela ou aceite da ótica;
as evidências anteriores não são reinterpretadas como novas verificações.

## Apply `refinar-design` — linha de base RD-01 — 22/11/2026

Esta matriz é a baseline de geometria anterior à edição, vinculada aos contratos
CA-028 (densidade), CA-031 (conteúdo e estados) e CA-032 (composição responsiva);
não representa aceite dos critérios visuais novos.

Antes de editar a apresentação, foi usada uma instância Angular isolada em
`127.0.0.1:4302`; o servidor preexistente em 4200 não foi encerrado nem reutilizado.
As rotas usam a referência fixa `22/11/2026` e os dados sintéticos versionados do
seed. O cadastro de baseline usa dados determinísticos próprios e não submete nem
persiste a venda.

- `npx.cmd playwright test --config=playwright.refinar-baseline.config.ts --output=test-results/refinar-design-baseline --workers=1`:
  **12/12 E2E passaram** em Chromium nas viewports 1366×768 e 390×844.
- `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-design-baseline-fixture`:
  **12/12 E2E passaram**; aviso do Angular: prebundling não é usado com otimização
  de scripts.
- A baseline visual registra rotas principais, páginas/registros ausentes, detalhe
  e edição válidos, modal aberto, cadastro inválido/válido e pesquisa sem resultados,
  em tema escuro/claro. Os arquivos `.png` têm sidecars `.json` com rota, tema,
  viewport e cenário; a saída local não é versionada pelo Git. O teste também grava
  geometria/estilos da lateral para cada rota e tema.
- Nas medições da fixture em 1366×768, a décima linha termina em 641,5 px e o rodapé
  em 709 px; no detalhe, dez parcelas terminam em 727 px. Fonte das tabelas: 18 px;
  padding das células: 10×4 px (horizontal×vertical). Documento da lista e detalhe:
  1366 px de largura, sem rolagem vertical da página neste cenário.
- Em 390×844, o documento mantém 390 px de largura, sem overflow horizontal global;
  lista com dez linhas mede 1472 px de altura e detalhe com dez parcelas 1644 px.
  A rolagem é vertical da página. Em todas as páginas sob teste, a asserção de
  largura global passou nos dois temas/viewports.
- A geometria registrada da lateral foi 260 px em 1366 px e largura integral de
  390 px no viewport estreito; seus estilos ficam nos JSONs `*-lateral-*.json` para
  a comparação depois das alterações. Não há comparação antes/depois nem aceite
  visual nesta etapa. Zoom nativo de 200% e estados de falha/retry permanecem para
  as tarefas de QA correspondentes.

### Ações e espaçamento comum RD-02

A ação “Nova venda” na lista agora usa o mesmo preenchimento, tipografia, borda,
fundo de hover e foco das ações primárias dos formulários; removida a classe
concorrente `text-text`, que podia sobrescrever o texto branco. O padding comum
do conteúdo permanece em 12 px e o componente de cabeçalho compartilhado continua
uniforme: a tentativa de ampliar o gutter desktop aumentou a altura observada da
lateral em 8 px, então foi revertida para preservar sua geometria.

Teste adicional percorre Visão Geral, Vendas, Relatórios e Configurações e confirma
gutter de 12 px e separação comum de 8 px entre cabeçalho e conteúdo (2/2 projetos
Chromium aprovados).

Verificação real: `npx.cmd playwright test --config=playwright.refinar-baseline.config.ts --output=test-results/refinar-design-rd02 --workers=1 -g "ação Nova venda|registra conteúdo"` passou **4/4** em Chromium, nos dois temas/viewports. Os estilos computados confirmaram fundo normal `rgb(215, 40, 72)`, texto branco, hover `rgb(181, 31, 61)` e foco de 3 px; os dois estados de fundo atingem o limiar de contraste testado de 4,5:1. Comparação de 36 pares JSON da lateral (nove superfícies × dois temas × dois viewports): nenhuma diferença de geometria, cores, degradê ou fonte.

### Consultas e valores monetários RD-02

Quitadas agora alinha o status da contagem à mesma margem lógica de Vendas. Nas
tabelas compartilhadas, “Valor total” e “Saldo devedor” têm cabeçalhos alinhados à
direita e valores com `tabular-nums`; datas, parcelas, situação e ações mantêm o
alinhamento próprio. As medidas contratadas continuam 18 px/20 px, dados com
padding 10×4 px e cabeçalhos 10×8 px (horizontal×vertical). Vendas e Quitadas
mantêm o mesmo recuo de pesquisa/contagem e a mesma região de paginação.

Verificações reais: o E2E novo de alinhamento passou 2/2 projetos Chromium (1366×768
e 390×844), verificando ambos temas e coleções; testes de consulta/filtros/semântica
passaram 8/8; `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-design-rd02-fixture`
passou 12/12, incluindo coleções 0/1/10/11/21, navegação por teclado e dez linhas
visíveis em 1366×768. A décima linha termina em 641,5 px, rodapé em 709 px; largura
global 1366 px no desktop. Em 390×844, largura do documento 390 px e altura da lista
com dez linhas 1468 px, sem overflow horizontal global. Capturas e medidas locais
estão em `test-results/refinar-design-rd02/` e
`test-results/refinar-design-rd02-fixture/`. Nenhuma alteração nos dados/contratos
financeiros de produção.

Na fixture, os valores das vendas sintéticas agora variam entre magnitudes, sem
alterar o seed real, serviços ou regras financeiras. O E2E comprova valores distintos
e alinhamento/tabularidade nos dois temas quando a coleção tem 21 vendas. A execução
final da fixture passou 12/12. Comparação final da lateral com a baseline: 36/36
pares de geometria e paleta sem diferenças.

### Detalhe e recebimento RD-02 — tarefas 3.1–3.2

O detalhe agora dá hierarquia ao saldo (20 px, peso 700, tabular), destaca
“Receber” como ação primária apenas quando há saldo e alinha à direita o cabeçalho
e os valores das parcelas sem mexer na tipografia ou no CSS compacto de composição.
As mensagens de sucesso existentes de cadastro/recebimento no detalhe usam a
superfície semântica de sucesso e conservam `role="status"`. O fluxo de recebimento,
anúncios, textos e elegibilidade não foi alterado.

Verificações reais: E2E de detalhe/teclado/overflow e estilos passou **8/8** (Chromium
1366×768 e 390×844); estado de venda ausente e retornos passaram **2/2**; fluxo de
recebimento (primeira parcela, valor/soma, pagamento sequencial, quitação, proteção
contra duplo envio, mensagem e retorno de foco) passou **2/2**. A fixture completa
passou **12/12** nos dois temas/viewports, comprovando entrada como parcela 1, venda
quitada sem botão “Receber”, preservação do valor total `R$ 1.100,00`, dez parcelas
e excedente rolável, cabeçalho sticky e uso da região por teclado.

Na venda sintética com 10 parcelas, 1366×768 mantém a página em 768 px de altura e
a tabela termina em 735 px; em 390×844 o documento tem 1648 px e segue rolável
verticalmente sem overflow horizontal. O caso excedente combina nome e descrição
extensos: a região de parcelas tem 173 px de rolagem interna; largura do documento
fica exatamente 1366 px no desktop e 390 px no mobile; altura total 2380 px e
2825 px, respectivamente, sem corte dos textos. As capturas das dez parcelas e do
cenário extenso incluem sidecars JSON com rota, tema, viewport e medições em
`test-results/refinar-design-detalhe-fixture/`; a venda ausente tem capturas com
metadados em `test-results/refinar-design-detalhe/`. Saídas locais não são
versionadas. Um primeiro disparo paralelo encontrou a porta 4302 ocupada e um
argumento de fixture ausente; corrigi o isolamento para porta 4303 e o teste para
receber `testInfo`, e as execuções finais acima passaram. Nenhuma alteração de
regra, cálculo ou dado de produção.

### Cadastro e prévia RD-03 — tarefa 4.1

Removida a margem duplicada do fieldset de identificação quando ele participa do
grid adaptativo do cadastro; o grid passa a manter o intervalo uniforme de 12 px
entre identificação e dados da venda. Mantive os campos e o breakpoint 768 px.
Na prévia, somente o cabeçalho e os valores de “Valor” foram alinhados à direita e
os valores receberam algarismos tabulares. A fonte própria da prévia continua 14 px;
os cabeçalhos e células mantêm paddings anteriores. O resumo de entrada/saldo passou
a quebrar com espaçamento explícito quando estreito, e as ações não acrescentam
margem inferior fora do grid.

Verificação real: teste responsivo passou **2/2 projetos Chromium**, percorrendo
ambos temas em 1366, 1024, 768, 767 e 390 px; confirmou duas colunas em 768+, empilhamento
em 767-, proporção dos campos, alinhamento/tabularidade e ausência de overflow global.
Medições do grid formulário/prévia: 589/482 px em 1366, 400/328 px em 1024, 260/212 px
em 768, 743/743 px em 767 e 366/366 px em 390. O campo Nome continuou mais largo
que Valor total nas larguras onde o teste exige essa proporção. O E2E de erros,
prévia extensa e acessibilidade passou **2/2** nos dois temas/viewports; o menor
contraste textual medido nesse percurso foi 4,899:1. Capturas PNG e metadados de
cadastro válido em 1366×768 e 390×844 estão em
`test-results/refinar-design-cadastro-final/`; capturas adicionais de erro e prévia
extensa ficam em `test-results/refinar-design-cadastro/`. As mudanças são apenas de
apresentação.

### Mensagens e ações do cadastro RD-03 — tarefa 4.2

A mensagem geral de erro mantém o texto e `role="alert"`, mas agora só é renderizada
quando há mensagem; quando aparece, recebe borda/superfície neutra e texto de erro,
sem reservar um painel vazio na composição. O binding continua `mensagem()` e os
validadores/campos não foram alterados. Confirmar permanece ação principal vermelha
com estilo de indisponibilidade existente; Cancelar permanece secundária.

Verificações reais: testes unitários do cadastro passaram **10/10**, incluindo erro
de escolha obrigatória, Sim/Não com rascunho preservado, prévia inválida/válida,
entrada registrada na parcela 1, cancelar sem publicar, exceção/retorno de falha com
retry do rascunho e submissão duplicada executada uma única vez. E2E direcionado
passou **12/12** em Chromium 1366×768 e 390×844 nos dois temas, cobrindo esses fluxos,
mensagens de campo, foco, prévia completa e ausência de overflow. A renderização
condicional elimina o alert geral vazio; a mensagem existente continua anunciada
quando ocorre falha. Capturas de cadastro e prévia nos dois temas ficam em
`test-results/refinar-design-cadastro-fluxos-final/`. Nenhuma regra de validação,
binding ou comportamento de ação foi alterado.

### Edição do cliente RD-03 — tarefa 5.1

A edição agora apresenta a informação de escopo com intervalo consistente e uma
mensagem geral de erro contextual, renderizada somente quando existente, mantendo
`role="alert"`. Os quatro campos continuam fornecidos pelo componente compartilhado;
nenhum dado financeiro ou botão novo foi introduzido. Confirmar segue primário e
Cancelar secundário.

Verificações reais: suíte unitária do componente de edição passou **10/10**, cobrindo
valores iniciais, edição sem publicar durante digitação, estados sem pagamento/entrada/
parcial/quitada, integridade financeira e de resumos, cancelamento, erros de campo,
falha controlada/exceção com retry, sucesso e proteção contra envio duplicado. O E2E
de nome/descrição extensos e CPF inválido passou **2/2 projetos Chromium**, em ambos
temas e viewports; rascunho foi preservado após erro, sucesso exibiu os textos
completos e a seção financeira permaneceu idêntica. Capturas do estado de erro com
sidecars JSON estão em `test-results/refinar-design-edicao-final/`. As alterações
são exclusivamente visuais.

### Recebimento RD-03 — tarefa 5.2

O aviso geral do modal agora segue o mesmo padrão contextual das mensagens nos
formulários: só aparece quando há aviso e, quando renderizado, mantém `role="alert"`
com borda/superfície e texto de erro. A conferência soma, ordem, seleção pelo
prefixo pendente e as ações primária/secundária permanecem inalteradas; nenhum
estado de sucesso ou confirmação novo foi criado no modal.

Verificações reais: suíte unitária passou **11/11**, incluindo seleção e soma,
parcelas consecutivas desde a primeira pendente, quitação, erro de validação,
falha/exceção com rascunho preservado e retry, envio duplicado, cancelamento e
fechamento via evento nativo. E2E passou **4/4** em Chromium 1366×768 e 390×844,
nos dois temas, verificando valor/soma, modalidade sequencial, pagamento inicial,
primeira parcela pendente, quitação e ausência da ação após quitar; Escape,
Tab/Shift+Tab, contenção e retorno de foco também passaram. Mais **2/2** execuções
geraram capturas do modal inicial nos dois temas/viewports com metadados em
`test-results/refinar-design-recebimento-capturas/`. A apresentação é visual; o
fluxo e as regras de recebimento não mudaram.

### Matriz responsiva de edição e recebimento RD-03 — tarefa 5.3

Edição e modal foram verificados em 390, 767, 768, 1024 e 1366 px, ambos temas,
com nome/descrição longos, erro real de CPF/valor e lista de 24 parcelas. A edição
mantém o erro e os textos completos alcançáveis; corrigir CPF conclui o fluxo sem
alterar os dados financeiros. No recebimento, o campo com erro foi focado e
rolado até a área visível; o estado indisponível do botão manteve cursor `not-allowed`
e opacidade 0,6. Os checks de contraste do estado de erro em ambos os temas também
estão cobertos pela suíte de acessibilidade visual existente, que exige ao menos
4,5:1.

Verificação real: matriz E2E passou **2/2 projetos Chromium**, perfazendo 10
combinações viewport/tema. Não houve overflow horizontal global: `scrollWidth` foi
igual à largura do viewport (390, 767, 768, 1024 ou 1366 px). A lista de 24 parcelas
mede 576 px de conteúdo para 160 px visíveis em desktop/intermediários e 1152 px
para 160 px no mobile; portanto a conferência permanece em rolagem interna. O modal
fica limitado a 736 px de altura no viewport 1366×768 e 812 px no 390×844; no mobile,
seu conteúdo de 902 px rola dentro do limite visível de 810 px. Botão de confirmação,
campo e mensagem foram alcançados após erro, e Escape fechou o modal. Capturas e
sidecars com rota, tema, viewport e medidas estão em
`test-results/refinar-design-fluxos-matriz/`. O estilo desabilitado foi ativado no
teste diretamente no controle para inspecionar as classes existentes (submissão
normal não permanece indisponível tempo suficiente para captura); nenhum estado
artificial foi introduzido na aplicação.

### Visão Geral RD-04 — tarefa 6.1

A Visão Geral mantém os quatro indicadores com seus valores e a grade própria, mas
ganha uma separação de 12 px antes dos resumos. Os três resumos agora usam intervalos
de 16 px entre si e títulos com 12 px antes do conteúdo, reforçando a hierarquia sem
alterar conteúdo, ordem, links ou o limite de cinco itens. Estados vazios preservam
mensagens específicas; nenhum controle foi adicionado.

Verificações reais: testes unitários/calculados passaram **6/6**; E2E de hierarquia,
quatro indicadores, três resumos, links/limite e recorte passou **2/2** em Chromium
1366×768 e 390×844 nos dois temas. Exportação, valores e acessibilidade permanecem
fora do escopo desta superfície. Capturas pós-refinamento com rota, tema e viewport
estão em `test-results/refinar-design-visao-geral/`.

### Relatórios RD-04 — tarefa 6.2

As quatro seções de relatório agora têm separação vertical de 12 px, cabeçalhos com
respiro interno uniforme e maior distância entre exportação, período e tabelas. Em
cada tabela, apenas cabeçalho e valor monetário foram alinhados à direita e os
algarismos receberam `tabular-nums`; data, cliente, situação, origem, forma e ações
mantêm alinhamento textual. Fonte permanece 18 px/20 px, dados continuam com padding
10×4 px e cabeçalhos 10×8 px. Totais, períodos, captions, links, ordem e exportação
indisponível não mudaram.

Verificações reais: unitários e cálculos de Relatórios passaram **11/11**; E2E de
alinhamento, tabularidade, densidade, quatro tabelas, rolagem contida e ausência de
overflow global passou **6/6** em Chromium 1366×768 e 390×844, nos dois temas. E2E
funcional de tabela completa, valores, período e exportação sem download/rede/mutação
passou **6/6** nos dois temas/viewports. Estados vazios e totais zerados têm cobertura
unitária. Capturas pós-refinamento com sidecars JSON estão em
`test-results/refinar-design-visao-relatorios-capturas/`. Nenhuma consulta ou cálculo
financeiro foi alterado.

### Configurações RD-04 — tarefa 7.1

As quatro explicações demonstrativas agora usam rótulo e descrição alinhados em
duas colunas a partir do breakpoint `sm`, empilhando no mobile. Recuos padrões do
`dd` foram substituídos por uma grade explícita; separadores e textos integrais
permanecem. Nenhum controle foi introduzido e a página continua sem alerta global.

Verificações reais: E2E passou **2/2** projetos Chromium em 1366×768 e 390×844,
ambos temas e pelos acessos principal/atalho; confirmou os quatro tópicos completos,
layout e ausência de controles. Medição de contraste textual em 11 trechos: mínimo
7,74:1 no tema escuro e 5,64:1 no claro. Capturas com sidecars JSON em
`test-results/refinar-design-configuracoes-final/`. Comportamento, rotas e textos
demonstrativos não foram alterados.

### Estados auxiliares RD-04 — tarefa 7.2

Estados de página ausente e de venda/edição ausente agora usam a mesma linguagem
de aviso discreto (borda, fundo neutro, padding e raio), mantendo títulos, textos e
retornos próprios. A pesquisa sem resultados e a coleção aberta vazia usam o mesmo
tratamento de superfície, sem confundir “sem cadastro” com “sem correspondência”.
Nenhum ID, item ou explicação foi inventado.

Verificações reais: E2E passou **2/2** projetos Chromium em ambos os temas para
página desconhecida, detalhe ausente, edição ausente e busca vazia em Vendas/Quitadas;
confirmou mensagens específicas, links de retorno alcançáveis via Tab e ausência de
overflow horizontal. A fixture de consulta passou **12/12**, incluindo coleção aberta
vazia e resumos sem parcelas próximas/atrasadas nos dois temas, além de dados 1/10/11/21.
Os unitários de Visão Geral/Relatórios cobrem seções vazias e totais zerados (17 testes
ao todo, já executados). Capturas com metadados das rotas ausentes e buscas estão em
`test-results/refinar-design-estados-final/`; coleção e resumos vazios em
`test-results/refinar-design-estados-fixture/`. A primeira checagem presumiu foco
automático no título inexistente para uma rota desconhecida; o comportamento real
não promete isso, então a verificação foi corrigida para provar que os retornos são
alcançáveis por teclado sem alterar gestão de foco da aplicação.

### Comparação visual integrada RD-05 — tarefa 8.1

Capturas atuais de nove rotas principais/ausentes foram geradas nos dois temas e
viewports; cadastro válido/inválido, edição e modal têm capturas E2E próprias. Os
arquivos incluem metadados e continuam fora do Git. Inspeção automatizada e revisão
das evidências confirmam as hierarquias e mensagens descritas nas entregas RD-02 a
RD-04; as superfícies sem alteração funcional mantêm seu conteúdo/rotas/controles.
Não foram removidos dados, marca, ações ou componentes. O detalhe continua usando a
composição compacta; formulários seguem com seus próprios escalonamentos.

Comparação de 36 pares de geometria/estilos da lateral (nove superfícies × dois
temas × dois viewports): largura, cores, degradê, tipografia, marca, textos e estilos
sem diferenças nos **36/36**. Em **32/36** o JSON completo é idêntico. Os quatro pares
restantes são cadastro e Relatórios no desktop, escuro/claro: só mudam altura da
lateral e posição vertical do bloco fixo de perfil, como consequência de a grade
acompanhar a altura/documento do conteúdo. Cadastro ficou 28 px mais curto após
remover margem duplicada; Relatórios ficou 52 px mais alto após espaçar as seções.
Não há alteração de estilo ou conteúdo da lateral; a diferença de altura é
intencional e acompanha as páginas, em vez de mascarar a rolagem do documento.

Contraste foi conferido em estados/telas nos dois temas, teclado/foco nos fluxos de
ação e modal, e `prefers-reduced-motion` nos testes de paginação (movimento 0 s).
Comparação técnica não equivale a aprovação visual/ótica; nenhuma aprovação foi
alegada. Capturas basais e atuais estão em
`test-results/refinar-design-baseline/` e `test-results/refinar-design-final-superficies/`.

### Matriz responsiva integrada RD-05 — tarefa 8.2

A matriz integrada percorreu nove rotas (Visão Geral, Vendas, Quitadas, cadastro,
Relatórios, Configurações, página ausente, detalhe ausente e edição ausente) mais o
modal: **100 combinações por projeto** = cinco larguras (390, 767, 768, 1024, 1366)
× dois temas × dez superfícies. Os dois projetos Chromium passaram. Em todos, a
largura documental foi menor ou igual à viewport; cadastro manteve a fronteira
767/768 px e suas duas colunas a partir de 768 px. O modal permaneceu dentro da
largura disponível, com foco inicial e fechamento por Escape.

Na fixture, mais **30 amostras por projeto Chromium** cobriram 21 vendas, as quatro
tabelas de Relatórios e a venda de 11 parcelas com nome/descrição longos, nos mesmos
cinco limites e temas. A matriz passou **2/2**; textos completos foram localizados,
a largura global não excedeu a viewport, e regiões com tabelas mantiveram rolagem
interna quando necessária. Cobertura dedicada anterior confirma dez linhas e dez
parcelas no desktop, parcela excedente em região rolável acessível e sem sobreposição.
As medições estão em `test-results/refinar-design-matriz-integrada/` e
`test-results/refinar-design-matriz-fixture/`; os cenários especializados de cadastro,
edição e modal permanecem em seus diretórios de captura. Não foi aplicado `overflow-x:hidden`
para esconder falhas.

### Regressão integrada final RD-05 — tarefas 8.3–8.5

Execuções finais em 22/11/2026: `npm.cmd test -- --watch=false` **372/372**;
`npm.cmd run build` e `npx.cmd ng run vendas-em-aberto:build-paginacao-fixture`
aprovados; `npm.cmd run test:e2e -- --config=playwright.refinar-baseline.config.ts
--output=test-results/refinar-design-regressao-app-final --workers=1` **108/108**;
`npm.cmd run test:e2e:paginacao-fixture --
--output=test-results/refinar-design-regressao-fixture-final` **14/14**; e
`npm.cmd run format:check` aprovado. A fixture emite o aviso Angular esperado de que
prebundling não é usado com otimização de scripts. O E2E completo inclui o fluxo de
cadastro com entrada, edição sem mudança financeira, recebimento/quitação, reconciliação
em listas/Visão Geral/Relatórios e reload; a suíte passou sem alterar regras/budgets.

**Bloqueio explícito — tarefa 8.3:** o Chromium automatizado disponível não permitiu
verificar zoom nativo de 200%. Tentativas com `Control+Plus` (tecla não aceita pelo
driver) e `Control+Equal` não alteraram a escala: `devicePixelRatio=1` e
`visualViewport.scale=1` permaneceram. Viewport de janela não substitui zoom nativo;
nenhuma emulação CSS/escala foi usada. Falta a inspeção manual em navegador real,
para todos os destinos e modal nos dois temas, registrando navegador/versão e
viewport útil. A tarefa 8.3 continua aberta, a Change permanece incompleta e não
será aberto PR nesta etapa.

Rastreabilidade confirmada: o escopo visual complementa requisitos/CA existentes do
`docs/prd/vendas-em-aberto.md` (RNF-002/003/007/009; CA-016/017/018/022/023/027/028/
029/031/032) e decisões técnicas do `docs/tdd/tdd.md` (DEC-006/008/018/020–026),
materializados em proposal/design/spec delta/tasks de `refinar-design`; nenhum PRD,
TDD, cálculo financeiro ou dependência foi alterado. `openspec validate refinar-design
--strict` passou. As evidências verificáveis estão registradas acima; zoom manual e
aprovação ótica não foram executados/não são alegados.

## Apply `refinar-estilo-conteudo-mvp` — 21/11/2026

### Referências confirmadas — tarefa 1.1

Leitura local dos dois HTMLs confirmada nesta execução. Arquivos fornecidos pelo
solicitante, não rastreados: não foram modificados nem incluídos no staging.
SHA-256 dos arquivos em `public/imgs/exemplos/`:

| Arquivo                                | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `mercadao_oculos_dashboard_light.html` | `9D71B2C67695EE1E1072A035ADB4A15126C77B9BBA22D5E70F3451BACA8DCB7E` |
| `mercadao_oculos_dashboard_dark.html`  | `62A1A8C9FB277584259FA982CA2DB3993893CEA3C5C866968E8738D9548DF60F` |

Os HTMLs definem canvas claro `#f5f6f9`/escuro `#111217`, painel branco/
`#1d1e24`, superfícies elevadas `#f8f9fb`/`#25262d`, marca `#d72848`, painéis
arredondados, sombras discretas e selos suaves. Isso é referência de acabamento,
não comprovação de contraste ou de fidelidade do MVP. A inspeção foi do código;
a renderização das referências, com suas dependências externas, não foi validada.

Referências complementares presentes: `exemploListagemDeVendas.png`,
`exemploDadosDaVenda.png` e `exemploCadastrarVenda.png` para composição compacta;
`exemploDesignDark.png` para linguagem escura e lateral existente.

Matriz de escopo conferida contra D3 de
`../openspec/changes/refinar-estilo-conteudo-mvp/design.md`:

| Superfície                        | Acabamento autorizado                                 | Contrato preservado / diferenças descartadas                                                                                                       |
| --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Área principal, cabeçalho e aviso | Hierarquia, alinhamento e superfícies                 | Aviso, tema e foco; sem busca global, notificações ou perfil superior novos; lateral intacta                                                       |
| Visão Geral                       | Quatro indicadores e três resumos em painéis          | Dados, referência, limites e links existentes; sem gráficos ou cadastro novo                                                                       |
| Vendas/Quitadas                   | Critérios, tabela, paginação e selos coerentes        | Dez linhas, ações textuais e limpezas existentes; sem oito linhas, linha clicável, menu de reticências ou indicadores globais                      |
| Cadastro/edição                   | Painéis, campos e prévia                              | Páginas existentes; mesmos campos e validações; edição só dos quatro campos; sem vencimento editável, limite de 120 parcelas ou cálculo aproximado |
| Detalhe                           | Blocos compactos, valores e parcelas                  | Página, entrada separada, histórico completo e dez parcelas; sem conversão para modal                                                              |
| Recebimento                       | Acabamento do diálogo e resumos                       | Modal nativo, sequência, valor exato, confirmação, cancelamento e foco; sem regras dos exemplos                                                    |
| Relatórios                        | Quatro consultas com totais e períodos hierarquizados | Mês fixo, posição na referência, todos os registros; sem seletor, gráfico, indicadores globais ou CSV                                              |
| Configurações/ausências           | Divisões e mensagens coerentes                        | Quatro explicações e retornos atuais; sem controles ou mensagens funcionais novos                                                                  |

Não copiar scripts, dados pessoais ou seed dos exemplos, CDNs, Google Fonts/Inter,
Lucide remoto, busca global, ajuda, notificações, exportação ou comportamento de
recolher/esconder a lateral. Manter fonte de sistema, dependências e contratos do
MVP. A comparação visual por superfície e os pares de contraste são registrados nas
entregas abaixo e consolidados na matriz da tarefa 7.2.

### Linha de base — tarefa 1.2

Execuções reais antes de qualquer edição de apresentação, em `frontend/`:

- `npm.cmd run build`: saída 0; bundle inicial 477,56 kB, transferência estimada
  96,49 kB; nenhum aviso de budget ou Sass na saída desta execução.
- `npm.cmd test -- --watch=false`: saída 0; 356/356 testes em 29 arquivos.
- `npm.cmd run test:e2e -- --output=test-results/refinar-estilo-baseline/aplicacao --workers=1`:
  saída 1 antes de executar testes, pois `http://127.0.0.1:4200` já está em uso.
  A configuração exige `reuseExistingServer: false`; ela não foi alterada e o
  servidor preexistente não foi encerrado nem reutilizado sem orientação.

O solicitante autorizou no Harness encerrar especificamente o PID 7300; processo
encerrado e E2E repetido com o mesmo comando: saída 0, 68/68 testes.

- `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-estilo-baseline/fixture`:
  saída 0, 8/8. Aviso: prebundling desativado com otimização de scripts.
  Desktop: documento 768 px, décima linha até 665,5 px, rodapé até 728 px;
  detalhe com dez parcelas, tabela até 713,27 px. Mobile: largura global 390 px,
  documentos de lista 1530 px e detalhe 1624 px; rolagem permitida.
- `npm.cmd run test:e2e -- refinamento-visual.spec.ts --output=test-results/refinar-estilo-baseline/conteudo --workers=1`:
  saída 0, 2/2. Novo teste registra capturas persistentes do conteúdo/lateral
  e estilos/geometria JSON da lateral, antes de qualquer edição de apresentação.

Evidências locais (ignoradas pelo Git), nos dois temas e viewports 1366×768 e
390×844: `test-results/refinar-estilo-baseline/conteudo/refinamento-visual-*/*.png`
e `*.json`; `test-results/refinar-estilo-baseline/fixture/paginacao-fixture-*/lista-{dark,light}.png`
e `detalhe-dez-{dark,light}.png`;
`test-results/refinar-estilo-baseline/aplicacao/acessibilidade-formularios-*/*.png`
para erros, prévia extensa e recebimento.
Contraste baseline da lateral: texto/ícones mínimo 5,96:1 escuro e 4,83:1 claro;
foco 10,41:1 e 5,75:1. As suítes não substituem a comparação visual posterior
nem zoom nativo. Nenhum estilo alterado na linha de base.

### Fundação do conteúdo — tarefa 2.1

Canvas/painéis agora seguem a paleta dos HTMLs; texto secundário e foco têm cores
adaptadas para contraste. Cabeçalho superior usa painel e sombra discreta, título
tem entreletras compactas, aviso e alternância têm raio de 8 px. A fonte de sistema,
as medidas existentes e todos os tokens `--app-sidebar-*` foram preservados.

Verificações reais: `npm.cmd run build` passou (314,16 kB iniciais, 82,63 kB
estimados; sem aviso de budget/Sass); `npm.cmd test -- --watch=false` passou
356/356, 29 arquivos. E2E dirigido com filtro
`paleta do conteúdo|registra conteúdo|alterna tema|inicia escuro|aviso completo|lateral segue|contraste efetivo|orienta foco`
e `--output=test-results/refinar-estilo-fundacao --workers=1`: primeira execução
19/20, por leitura imediata de estilo no teste novo após alternar tema; repetição
20/20 com espera explícita pelo atributo temático nesse teste.

Contrastes medidos pelo E2E: textos mínimos 5,96:1 escuro/4,83:1 claro;
borda de controle 8,01:1/4,69:1; foco 7,70:1/6,51:1. Lateral manteve os mesmos
mínimos da baseline. Comparação dos 32 JSONs da lateral entre baseline e fundação
não encontrou diferenças de estilos ou geometria nos oito destinos, dois temas
e dois viewports. Capturas em `test-results/refinar-estilo-fundacao/refinamento-visual-*`.

Inspeção visual real das quatro capturas de Vendas confirmou canvas quase preto/
claro, contraste painel/cabeçalho, aviso legível e lateral preservada; no mobile,
mantidos empilhamento e overflow da tabela local. Ainda não há o acabamento final
da tabela/selos/painéis: são entregas seguintes. Em relação aos HTMLs, mantidos
aviso permanente, fonte de sistema, cabeçalho compacto sem busca global e lateral
original; não se pretende igualdade pixel a pixel nem aceite global.

### Componentes compartilhados — tarefa 2.2

Acabamento implementado: pares de
tokens suaves por situação, campos compartilhados elevados, paginação com cantos
de 8 px e estado ativo preservado no hover, modal com raio de 12 px e backdrop
desfocado. Não há alteração de eventos, bindings ou regras.

Resultados reais desta etapa:

- `npm.cmd run build`: saída 0, 314,75 kB iniciais, 82,74 kB estimados; sem aviso
  de budget/Sass. Budgets e dependências inalterados.
- `npm.cmd test -- --watch=false`: 362/362 testes em 30 arquivos. Depois dessa
  execução foi acrescentado o caso unitário do rótulo `Aberto`, ainda não reexecutado.
- E2E com filtro `contraste|dialog nativo|registra capturas|registra conteúdo|mede formulários|recebe parcela`
  e `--output=test-results/refinar-estilo-compartilhados --workers=1`: 20/20.
  Texto das consultas mínimo 7,32:1 escuro/6,05:1 claro; formulários/modal
  mínimo observado 4,899:1; lateral manteve os mínimos anteriores.
- `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-estilo-compartilhados-fixture`:
  8 aprovados, 2 falhas no teste novo de estados da paginação, ambos os viewports.
  A medição do foco no tema claro resultou em 1,0807:1, abaixo do mínimo 3:1.
  O cenário escuro mediu texto mínimo 4,899:1 e foco mínimo 8,667:1.
  As oito verificações existentes de geometria, teclado e parcelas passaram;
  isso não aprova os estados novos. Aviso de prebundling permanece.

Após autorização do solicitante para diagnóstico, confirmado problema de medição:
o foco programático após hover não ativava `:focus-visible`. O teste agora chega
ao botão com Shift+Tab/Tab e exige foco visível; nenhum mínimo foi reduzido.
Reexecução em `test-results/refinar-estilo-compartilhados-fixture-verificado`:
10/10; texto mínimo 4,899:1, borda mínima 4,339:1 e foco mínimo 6,019:1 no claro,
8,667:1 no escuro, incluindo ativo/indisponível, normal/hover/foco e movimento reduzido.
Unitários reexecutados com `Aberto`: 363/363 em 30 arquivos.

Revisão visual das capturas de consultas, identificação com erros e modal extenso:
selos agora suaves em vez de sólidos, texto preservado; campos compartilhados
elevados e foco legível. Modal ganhou centralização explícita `m-auto`, borda,
divisória e backdrop coerentes com os HTMLs. Mantém diálogo nativo e conteúdo
rolável, em vez do mecanismo JavaScript dos exemplos. E2E adicional de
centralização/limites, contenção/Escape e formulários: 4/4 em
`test-results/refinar-estilo-modal-centralizado`; build posterior 314,77 kB
iniciais/82,75 kB estimados, saída 0 sem avisos. Os 32 JSONs da lateral continuam
idênticos à baseline. Campos financeiros e composição das páginas serão tratados
nas entregas próprias; sem efeito visual observado na lateral, sem aceite global.

### Visão Geral — tarefa 3.1

Quatro indicadores com valores de 30 px, rótulos secundários de 14 px, números
tabulares e painéis de 12 px; três resumos com títulos/divisórias e sombras
discretas. Mantidos textos, links, limite de cinco, dados e projeções. Sem ícones,
gráfico ou conteúdo funcional extra para preencher a composição dos HTMLs.
Espaçamento vertical adaptado à janela do MVP para não alongar a lateral.

Verificações reais: unitários 363/363 em 30 arquivos; E2E dirigido
`Visão Geral|destaca valores|registra conteúdo|abre cada resumo` 14/14;
contraste das páginas novas 2/2, mínimo 6,57:1 escuro/5,64:1 claro em Visão Geral.
Após calibrar espaçamento, `destaca valores|registra conteúdo` 4/4 e build
315,05 kB iniciais/82,80 kB estimados, saída 0 sem avisos. Capturas finais em
`test-results/refinar-estilo-visao-geral-final/refinamento-visual-*`, arquivo
`visao-geral-{dark,light}.png`, ambos os viewports. Os 32 JSONs da lateral foram
comparados com baseline e permaneceram idênticos.

Revisão visual das capturas desktop escura/mobile clara confirmou hierarquia de
valores/rótulos, painéis, separadores e reorganização sem corte global. Diferenças
intencionais dos HTMLs: fonte de sistema, dados sintéticos próprios, aviso,
quatro indicadores exclusivamente nesta página e três resumos existentes,
sem indicadores complementares ou ações novas. Os testes do componente incluem
zero/ausências e ordenação; isso não é aceite global ou zoom nativo.

### Consultas Vendas/Quitadas — tarefa 4.1

Critérios, tabela e paginação integram painel de 12 px com sombra discreta,
campos elevados, cabeçalho suave e realce de linha em hover/foco interno. Nova
venda permanece âncora `/vendas/nova`, agora com destaque vermelho. Preservados
colunas, ações textuais, busca local, limpezas e separação de coleções.

Verificações reais: 363/363 unitários; build saída 0, 315,15 kB iniciais e
82,81 kB estimados, sem avisos. E2E dirigido
`consulta listas|semântica e contraste|overflow contido|links afetados|registra conteúdo`
(filtro efetivo incluiu `contraste` dos testes de consultas): 10/10, evidências
em `test-results/refinar-estilo-consultas`. Texto mínimo nas consultas
7,32:1 escuro/6,05:1 claro; links em hover/foco 7,53:1/6,18:1.

Fixture ampliada apenas no alvo de teste com parâmetro `quantidade` restrito a
0/1/10/11/21, usando comandos existentes de quitação, sem alterar domínio/seed
da aplicação. `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-estilo-consultas-fixture`:
12/12, dois temas/viewports. Desktop: todas as coleções com documento de 768 px;
faixa até 695 px, paginação até 741 px; dez linhas, cabeçalhos e critérios visíveis.
Mobile: largura global 390 px e rolagem vertical permitida. Aviso de prebundling
mantido. Capturas `colecao-{0,1,10,11,21}-{dark,light}.png` no diretório da fixture.

Inspeção visual desktop escura/mobile clara confirmou conjunto de painel e
legibilidade. Adaptações dos HTMLs: dez linhas compactas com fonte atual de 14 px,
sem indicadores globais, avatar/dados extras, linha clicável, oito registros ou
menu que esconda Visualizar/Editar; lateral e aviso originais preservados.

#### Ajuste pontual de respiro e tipografia — tarefa 4.3 — 21/11/2026

Na tabela compartilhada de Vendas/Quitadas, o tamanho da fonte passou de 14 px
para 15 px, mantendo `leading-5`; células de dados passaram de 8 px para 10 px
de padding horizontal, sem ampliar a altura vertical das linhas. Assim os dados
ficam menos próximos às bordas sem perder a densidade de dez vendas.

Verificações reais: `CI=true npm test` aprovou 363/363 testes em 30 arquivos;
`npm run test:e2e:paginacao-fixture -- -g "mede dez linhas, critérios e rodapé"`
aprovou 2/2 cenários nos temas claro/escuro e viewports 1366×768/390×844; a
geometria desktop ficou em documento de 768 px, décima linha até 669,5 px e
paginação até 737 px. A fixture confirmou fonte computada de 15 px e padding
vertical de 4 px. `npm run build` concluiu sem avisos de budget; bundle inicial
315,90 kB (82,94 kB estimados). `npm run format:check` aprovado.
O E2E `confere semântica e contraste de tabelas, situações e controles de consulta`
aprovou 2/2 projetos Chromium (1366×768/390×844), percorreu Vendas/Quitadas nos
dois temas e mediu contraste mínimo de 7,32:1 nas tabelas abertas e 8,07:1 nas quitadas.

#### Padronização das tabelas em 18 px — tarefa 4.4 — 21/11/2026

Atualizada a tipografia das tabelas de Vendas/Quitadas e parcelas para 18 px,
line-height 20 px e padding uniforme: dados 10×4 px (horizontal×vertical),
cabeçalhos 10×8 px. Para manter dez parcelas visíveis sem rolagem vertical no
desktop, os blocos existentes de cliente/venda foram compactados e reorganizados;
nenhum campo foi removido ou reduzido. A barra horizontal continua restrita à
região da tabela.

`npm run test:e2e:paginacao-fixture`: 12/12 cenários aprovados nos dois temas e
viewports. Em 1366×768, a lista mantém dez linhas (base da décima em 679,5 px,
paginação até 747 px); o detalhe mantém dez parcelas (última linha até 760,5 px,
região até 761 px). Largura do documento permaneceu em 1366 px; em 390×844,
rolagem vertical é permitida e a largura global permaneceu 390 px. Estilos
computados confirmaram 18 px e o mesmo padding nas duas tabelas.

`npm run test:e2e`: 79/80 na execução completa; a falha foi uma asserção de
atualização da Visão Geral no fluxo de reconciliação, fora das tabelas. Repetição
isolada do cenário passou 2/2 viewports. E2E direcionado de semântica/contraste
passou nos dois temas e viewports; mínimo medido: 7,32:1 em Vendas, 8,07:1 em
Quitadas e 8,71:1 em parcelas abertas. `CI=true npm test`: 363/363 em 30 arquivos;
build principal 315,82 kB iniciais/82,92 kB estimados; build da fixture 317,57 kB/
83,30 kB; ambos sem avisos de budget. `npm run format:check` e validação estrita
da Change aprovados. Zoom nativo de 200% permanece pendente conforme tarefa 7.3.

### Revisão de consulta — aviso global e limpeza de critérios — 21/11/2026

Após confirmação explícita do solicitante, o aviso global persistente foi removido
do shell, a ação conjunta “Limpar critérios” e o atalho de Quitadas saíram do cabeçalho
da lista; “Nova venda” ocupa a posição da limpeza. Quitadas segue no menu lateral.
O contexto demonstrativo e o descarte ao recarregar continuam explicados em
Configurações e nas confirmações de operações. “Limpar pesquisa” ainda
preserva a situação selecionada; para voltar à lista completa, limpar o termo e
selecionar “Todas”. PRD 1.14, TDD DEC-023 e o delta OpenSpec foram atualizados antes
de adequar as asserções.

Verificações desta revisão: `CI=true npm test` 363/363 em 30 arquivos;
`npm run test:e2e` por configuração temporária na porta 4202, 80/80 em 2 viewports;
`npm run test:e2e:paginacao-fixture` 12/12; `npm run build` 299,47 kB iniciais/
80,42 kB estimados; build da fixture 301,20 kB/80,92 kB; `npm run format:check`
aprovado. O E2E padrão não pôde usar a porta 4200, já ocupada por servidor
preexistente; o processo não foi interrompido. A configuração temporária foi removida.

### Tipografia das tabelas de Relatórios — tarefa 6.3 — 21/11/2026

As tabelas Recebimentos do mês, Vendas do mês, Posição em aberto e Parcelas
vencidas agora compartilham o padrão de Vendas/Quitadas e parcelas: dados a 18 px,
line-height 20 px, padding de 10×4 px em células de dados e 10×8 px em cabeçalhos
(horizontal×vertical). Conteúdo, ordem, totais, links e captions não mudaram; as
quatro regiões continuam com rolagem horizontal identificável e Relatórios mantém
rolagem vertical normal entre seções.

O teste E2E `Relatórios mantém quatro tabelas completas nos dois temas e viewports`
mediu os estilos computados em todas as quatro tabelas (18 px/20 px e os paddings
esperados) e confirmou `overflow-x: auto` nos dois temas e em 1366×768/390×844:
2/2 projetos aprovados; mínimo de contraste observado na página Relatórios foi
5,64:1 no tema claro e 7,74:1 no escuro. Unitários: 363/363; fixture de paginação:
12/12. Build principal: 299,48 kB iniciais/80,49 kB estimados; build da fixture:
301,21 kB/80,94 kB. `npm run format:check` e validação estrita OpenSpec aprovados.

A regressão E2E completa passou 79/80: houve uma falha no viewport 1366×768 do
cenário de reconciliação de indicadores da Visão Geral, não relacionado às tabelas
de Relatórios; a repetição isolada desse cenário passou 2/2 viewports. A suíte foi
executada pela configuração temporária na porta 4202; o arquivo temporário foi
removido. A evidência de estilos computados e cobertura está em
`e2e/demonstracao-inicial.spec.ts`; a captura de relatórios existente é gerada pelo
teste `anexa capturas sintéticas da Visão Geral, Relatórios e Configurações`.

### Detalhe e parcelas — tarefa 4.2

Blocos de cliente/venda e painel de parcelas usam raio de 12 px, divisórias,
sombras discretas e cabeçalho suave. Rótulos secundários, números tabulares e
valores destacados conservam todos os dados, entrada separada e histórico.
Não foram removidos os ajustes compactos nem a região interna de excedentes.

Execuções reais: 363/363 unitários; build saída 0, 315,22 kB iniciais/82,80 kB
estimados, sem avisos. Fixture com filtro `dez parcelas|excedentes`: 4/4 nos
dois temas/viewports, capturas `detalhe-dez-{dark,light}.png` em
`test-results/refinar-estilo-detalhe-fixture`. Desktop: blocos iniciam em 182 px,
documento 768 px, última parcela até 727,77 px e tabela até 728,27 px; mobile
largura global 390 px, conteúdo rolável. E2E da aplicação dirigido a consultas,
contraste e overflow: 6/6 em `test-results/refinar-estilo-detalhe`;
mínimos de textos em parcelas quitadas/abertas 8,07:1/8,71:1.

Inspeção visual desktop escura/mobile clara confirmou cliente/venda lado a lado
no desktop, empilhamento no mobile, entrada destacada separadamente e tabela
compacta sem ocultação de datas/formas. Adaptados os painéis dos HTMLs à página
existente e ao PNG complementar, sem transformar detalhe em modal nem trocar
ações por menus. A captura inclui foco no título após navegação, deliberadamente.

### Cadastro, entrada e prévia — tarefa 5.1

Painéis de cliente/venda/prévia com raio de 12 px e sombra discreta, campos
financeiros de superfície elevada e raio de 8 px, ações hierarquizadas e resumo
auxiliar secundário. Mesmos campos/rótulos, entrada e prévia completa; continua
página, sem vencimento editável, limite de 120 parcelas ou cálculo aproximado.

Resultados reais: unitários 363/363; build 315,22 kB iniciais/82,84 kB estimados,
saída 0 sem avisos; E2E `cadastro|cadastra|mede formulários|revela erros` 12/12,
incluindo cadastro sem/com entrada, confirmação única, erros/foco, cancelamento,
prévia extensa, reconciliação e recarga nos dois temas/viewports. Cenários de
falha/retry permanecem cobertos pelos testes de componentes existentes.

## Apply `simplificar-pagamento-parcelas` — FASE-014/015 (em andamento)

O comando de pagamento da sessão agora contém somente `vendaId`, `parcelaId`,
`data` e `forma`. O núcleo revalida a primeira parcela pendente por número, deriva
seu valor canônico em centavos e cria um recebimento com uma alocação; lista de IDs
e valor externo são rejeitados. A preparação sintética de lotes históricos foi
separada em `preparar-pagamento-historico.ts` e permanece restrita ao seed, sem
alterar os recebimentos já existentes. O rascunho de pagamento e o modal agora
solicitam somente data e forma; o detalhe oferece ação acessível na primeira
pendente e informa “Aguardando parcela anterior” nas seguintes.

Verificações integradas executadas em 22/11/2026: `npm test -- --watch=false`
passou **372/372**; `npx playwright test --config=playwright.refinar-baseline.config.ts`
passou **108/108** em Chromium, viewports 1366×768 e 390×844; `npm run
test:e2e:paginacao-fixture -- --output=test-results/simplificar-pagamento-paginacao`
passou **14/14**; `npm run build` e `npx ng run
vendas-em-aberto:build-paginacao-fixture` passaram; `npm run format:check` passou.
A fixture informa que prebundling não é usado com otimização de scripts.
O teste de captura `--grep "registra capturas sintéticas"` passou **2/2** projetos;
as imagens finais foram copiadas para o diretório versionado de evidências abaixo.

Limite de execução: `npm run test:e2e` não inicia porque `127.0.0.1:4200` já estava
ocupada por um servidor preexistente; não foi encerrado. A mesma suíte completa foi
executada com a configuração isolada `playwright.refinar-baseline.config.ts` na
porta 4303, sem reutilizar esse servidor. Testes de componente e E2E do fluxo novo
verificam foco na data/primeiro campo inválido/mensagem focalizável, ciclo
Tab/Shift+Tab e inércia nativa do diálogo, retorno do foco ao acionador ou próxima
ação, quitação para o título das parcelas, ausência de abertura automática, entrada
sem botão próprio, valores fracionados, datas/formas por confirmação, conciliação
em abertas/quitadas/painel/relatórios, histórico em lote e descarte ao recarregar.

Verificação visual automatizada: a fixture mediu dez parcelas em desktop com fonte
18 px, células 4×10 px, cabeçalho 8×10 px e rodapé em 709 px dentro do viewport de
768 px, sem rolagem global; excedentes permanecem em região rolável e operável por
teclado. A matriz verificou coluna Ações, modal e contenção horizontal nos dois
temas/viewports. Contrastes mínimos observados nas páginas/controles incluem
4,899:1 para texto e 4,339:1 para borda em estados claros; os limiares visuais dos
cenários passaram. Capturas versionadas do detalhe/modal e metadados de rota, tema e
viewport estão em `evidencias/simplificar-pagamento-parcelas/` (`detalhe-*` e
`modal-*`). Isso não representa teste de navegador manual nem de zoom nativo.
O zoom de 200% permanece pendente e não foi simulado por CSS ou escala do viewport.

### Cadastro com prévia lateral — tarefa 5.4 — 21/11/2026

Em Nova venda, os painéis de identificação e dados financeiros ficam à esquerda e
a prévia completa à direita a partir de 768 px; abaixo disso, empilham nessa ordem.
A grade interna responde à largura real do painel para evitar campos financeiros
estreitos por causa do menu lateral. Nome/descrição ocupam mais largura quando há
espaço; valor total, quantidade e entrada usam colunas menores e padding mais
compacto. Em uma coluna estreita, os campos voltam a ocupar a largura disponível,
sem truncar rótulos ou limitar o valor digitado. O ajuste opt-in no componente de
identificação preserva seu layout de edição. Um único `<form>`, foco, validações,
entrada, cálculo e estados da prévia não mudaram.

O E2E responsivo mediu nos dois temas e larguras 1366/1024/768/767/390 px:
1366 px, formulário 589 px e prévia 482 px, nome 563 px e valor 132 px; 1024 px,
400/328 px e nome/valor 374/85 px; 768 px, 260/212 px; abaixo do breakpoint,
767 px, ambos 743 px, e 390 px, ambos 366 px. O topo alinhou a partir de 768 px,
os blocos empilharam a 767 px e não houve overflow horizontal global; a tabela
manteve `overflow-x: auto` na região identificada. Capturas dark/light em 1366 e
390 px estão anexadas ao resultado do teste
`Nova venda mantém formulário e prévia responsivos sem overflow nos dois temas`.

### Correção responsiva do detalhe após relato de zoom — 22/11/2026

O relato manual apontou CPF, telefone e descrição comprimidos em colunas a 200%.
O detalhe agora usa a largura efetivamente disponível ao componente (container
queries), não apenas o breakpoint da viewport: com até 832 px úteis, os blocos e
seus pares rótulo/valor empilham em uma coluna, mantendo texto integral e ações.
Os demais breakpoints e o layout compacto para largura suficiente permanecem.

Verificação automatizada real: o E2E `detalhe reorganiza campos conforme a largura
útil sem perder conteúdo` passou **1/1** em Chromium (configuração isolada, porta
4303), nos temas escuro/claro e larguras de viewport 800, 640 e 390 px. Confirmou
empilhamento conforme a largura do container, CPF/telefone/descrição visíveis e sem
overflow horizontal global. Essas larguras cobrem a reorganização responsiva, mas
não equivalem a zoom nativo.

Verificação manual do solicitante: confirmação em 22/11/2026 de que o zoom nativo
200% passou no detalhe e modal, nos temas escuro/claro, com teclado, foco, mensagens,
ações e histórico alcançáveis. Ambiente informado: Chrome; versão não informada.
Registro de relato do solicitante, sem reprodução independente pelo agente. Com essa
confirmação, a tarefa 3.3 foi marcada concluída; não foram reutilizadas capturas
automatizadas como prova do zoom manual.

Verificações: testes unitários 363/363; E2E de `formularios-vendas.spec.ts` 20/20
nos viewports 1366×768 e 390×844; E2E combinado de layout/contraste 4/4. Contraste
mínimo medido no cadastro: 4,90:1 em ambos os temas. Build principal 299,92 kB
iniciais/80,59 kB estimados; build da fixture 301,65 kB/81,07 kB; `npm run
format:check` aprovado. A suíte E2E integral não foi repetida nesta extensão; zoom
nativo 200% permanece pendente em 7.3 e não é substituído pelos viewports medidos.

### Edição — tarefa 5.2

Identificação compartilhada mantém seus painéis/campos elevados; texto auxiliar
secundário e ações com raio de 8 px e primária destacada completam a edição,
sem campos novos. Ausência de registro continua distinta de erro de validação.

Verificações reais: 363/363 unitários; build 315,22 kB iniciais/82,78 kB estimados,
saída 0 sem avisos. E2E `edita cliente|mede formulários|registra capturas`: 8/8,
incluindo aberta/quitada, cancelamento, finanças inalteradas, erros e foco nos
dois temas/viewports. Componentes preservam cenários de falha e atualização
isolada. Contraste textual na edição: 6,505:1 escuro/5,643:1 claro, bordas
8,011:1/4,339:1. Capturas `test-results/refinar-estilo-edicao/acessibilidade-formularios-*/{dark,light}-edicao-erros.png`.
Inspeção desktop clara confirmou somente quatro campos, mensagens associadas,
foco perceptível e hierarquia equivalente ao cadastro, derivada dos HTMLs sem
importar campos financeiros. Reorganização mobile verificada pelo E2E.

### Recebimento — tarefa 5.3

Campos elevados com raio de 8 px, conferência em painel suave, soma destacada,
ações coerentes e orientação secundária. Mantidos diálogo nativo, comandos,
sequência, valor exato, datas/formas e comportamento de foco. Campo de data
usa esquema nativo escuro no tema escuro para legibilidade do controle.

Verificações reais: 363/363 unitários, incluindo falha/retry, envio único e
cancelamento; 8/8 E2E com filtro
`recebe parcela|dialog nativo|mede formulários|registra capturas`, ambos os
temas/viewports. Após ajuste do esquema nativo, diálogo revalidado 2/2;
build final 315,36 kB iniciais/82,84 kB estimados, saída 0 sem avisos.
Capturas em `test-results/refinar-estilo-recebimento/acessibilidade-formularios-*`;
execução final em `test-results/refinar-estilo-recebimento-final`.
Texto mínimo 4,899:1, bordas essenciais mínimo 4,339:1 nos cenários medidos.

Inspeção desktop escura com texto extenso confirmou modal centralizado,
conferência/soma hierarquizadas e ações alcançáveis por rolagem/foco. O título
fica acima do trecho capturado após rolar a lista: não foi ocultado ou removido.
Adaptada a estética dos HTMLs sem copiar mecanismo modal ou regras de pagamento.

### Relatórios — tarefa 6.1

Quatro consultas em painéis com raio de 12 px, divisórias e sombra discreta;
totais semânticos/tabulares e períodos auxiliares. Preservados mês fixo, posição
na referência, todos os registros, mensagens vazias e exportação indisponível.
Espaçamento redistribuído sem alterar a altura total da página/lateral.

Resultados reais: 363/363 unitários, incluindo reconciliação e vazios; build
315,78 kB iniciais/82,98 kB estimados, saída 0 sem avisos. E2E dirigido
`Relatórios|relatório|contraste de textos|registra conteúdo`: 14/14, exportação
sem download/rede/mutação e tabelas completas nos dois temas/viewports.
Contraste textual mínimo 7,74:1 escuro/5,64:1 claro. Capturas em
`test-results/refinar-estilo-relatorios/refinamento-visual-*/relatorios-{dark,light}.png`.
Comparação dos 32 JSONs da lateral com baseline: nenhuma diferença.

Inspeção desktop clara confirmou hierarquia dos quatro blocos e tabelas completas.
Dos HTMLs são reutilizadas superfícies, bordas, cantos e linguagem cromática,
não indicadores globais, gráfico, seletor mensal, dados ou CSV. A rolagem
vertical é deliberada nesta página para manter todos os registros disponíveis.

### Configurações e estados auxiliares — tarefa 6.2

Quatro explicações preservadas, agora com divisórias e descrições secundárias
em painel de 12 px. Página/registro ausentes usam os mesmos painéis e retornos
atuais; edição ausente tem captura própria. Erros associados aos campos passam
a consumir `text-error`/`text-sm`, removendo classes visuais legadas sem utilidade
no Tailwind, sem alterar mensagens, validação ou associação acessível.

Resultados reais: 363/363 unitários; build 315,82 kB iniciais/82,90 kB estimados,
saída 0 sem avisos. E2E dirigido a Configurações, ausências, navegação/foco e
formulários: 12/12 em `test-results/refinar-estilo-estados`; teste novo de
contraste/ausência de controles: 2/2 em `test-results/refinar-estilo-estados-contraste`.
Mínimo textual das quatro superfícies auxiliares: 7,74:1 escuro/5,64:1 claro,
em ambos os viewports. Erros/formulários mantiveram texto ≥4,899:1 e borda
≥4,339:1 nos cenários medidos.

Capturas de `configuracoes`, `pagina-ausente`, `registro-ausente`, `edicao-ausente`
nos dois temas em `test-results/refinar-estilo-estados/refinamento-visual-*`.
Inspeção desktop clara/escura confirmou divisões, hierarquia e retornos, sem
novos controles/conteúdo dos HTMLs. Vazios e erros existentes mantêm texto
explícito e superfícies coerentes; sem alegar aceite global ou zoom nativo.

### Regressão integral — tarefa 7.1

Execuções reais após todas as entregas de apresentação, em `frontend/`:

| Comando                                                                                            | Resultado                                                  |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `npm.cmd test -- --watch=false`                                                                    | Saída 0, 363/363 testes em 30 arquivos                     |
| `npm.cmd run test:e2e -- --output=test-results/refinar-estilo-regressao/aplicacao --workers=1`     | Saída 0, 76/76 Chromium, dois viewports                    |
| `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-estilo-regressao/fixture` | Saída 0, 12/12, dois viewports/temas; aviso de prebundling |

Suítes E2E executadas sequencialmente; nenhuma expectativa financeira, de
privacidade, rede, densidade ou foco removida. Fluxo integrado confirmou cadastro
com entrada → recebimento/quitação → edição → listas/indicadores/resumos/relatórios
→ recarga. Testes de contexto limpo verificaram ausência de persistência e rede
externa; exportação continuou indisponível. Os 32 registros de estilos/geometria
da lateral dos oito destinos originais seguem idênticos à baseline. Nova captura
de edição ausente é adicional e não é contada como comparação antes/depois.
Log da fixture em `test-results/refinar-estilo-regressao/fixture.log`;
capturas/JSONs da aplicação e fixture nos diretórios acima. Não comprova zoom
nativo, homologação da ótica ou conclusão integral da Change.

### Matriz visual consolidada — tarefa 7.2 — 21/11/2026

Complementos de captura inicialmente falharam (8/10 aprovados): o seletor
`textbox` novo não localizou o campo de pesquisa nos dois viewports e atingiu
30 s. Após autorização para correção, confirmado `type="search"` no template;
ajustado exclusivamente o teste para `searchbox`, sem alteração da aplicação.
Reexecutadas as suítes completas: **78/78 E2E** (2,4 min) e **12/12 fixture**
(30,2 s), incluindo os complementos. Capturas de sem resultados e de resumos
vazios produzidas e inspecionadas nos dois temas/viewports. Unitários também
reexecutados: **363/363**, 30 arquivos, saída 0.

Revisão técnica real de capturas locais, separada dos resultados automatizados.
Abrange `dark` e `light`, em 1366×768 e 390×844. Foram inspecionados os PNGs
complementares de listagem, detalhe e cadastro e o código de estilos/composição
dos dois HTMLs identificados na tarefa 1.1. A renderização dos HTMLs com CDN e
Inter **não** foi validada; a comparação de sua paleta, raios, hierarquia e
composição deriva do código, não de uma captura renderizada desses HTMLs.
Não há alegação de igualdade pixel a pixel, certificação ou aceite da ótica.

Localização das evidências, relativa a `frontend/` (arquivos ignorados pelo Git):

- **B** — antes: `test-results/refinar-estilo-baseline/conteudo/refinamento-visual-*/`;
  formulários com erros/prévia/modal em
  `test-results/refinar-estilo-baseline/aplicacao/acessibilidade-formularios-*/`;
  lista/detalhe em `test-results/refinar-estilo-baseline/fixture/paginacao-fixture-*/`.
- **A** — depois: `test-results/refinar-estilo-consolidacao/aplicacao/`;
  páginas em `refinamento-visual-registr-*/`, formulários preenchidos em
  `formularios-vendas-registr-*/`, erros/prévia extensa em
  `acessibilidade-formularios-*/`.
- **F** — depois, fixture: `test-results/refinar-estilo-consolidacao/fixture/paginacao-fixture-*/`.
- **C** — complementos de consulta aprovados na reexecução integral:
  `test-results/refinar-estilo-consolidacao/aplicacao/refinamento-visual-registr-*/`.
  A execução parcial anterior em `consolidacao/complementos/` falhou e não serve
  como evidência de conclusão.

Os diretórios de cenário terminam em `chromium-1366x768` ou `chromium-390x844`;
`{tema}` nos nomes abaixo significa os arquivos `dark` **e** `light`. Cada linha
abrange os quatro cruzamentos tema/viewport, não apenas a captura desktop.
Capturas de página completa podem ultrapassar a altura da janela: não são prova
isolada de ausência de rolagem. A geometria é conferida pela fixture.

| Superfície/estado de D3                                      | Referência e captura                                                                                                          | Revisão visual e diferença antes → depois                                                                                                                                              | Adaptação preservada                                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Área principal, cabeçalho, aviso e lateral                   | HTMLs, `exemploDesignDark.png`; B/A `vendas-{tema}.png`, `*-lateral-{tema}.png` e `*-lateral-{tema}.json`                     | Canvas cinza anterior → quase preto/claro dos HTMLs; cabeçalho de painel, aviso arredondado, títulos alinhados; logo, navegação, perfil e gradiente permanecem equivalentes            | Lateral original em ambos os temas, inclusive empilhada no mobile; sem sidebar branca/recolhível, busca ou perfil superiores dos HTMLs                  |
| Visão Geral normal, valores e resumos                        | HTMLs como linguagem; B/A `visao-geral-{tema}.png`; F `resumos-vazios-{tema}.png` para próximas/atrasadas vazias              | Valores mais destacados que rótulos; painéis de 12 px, divisórias e cores semânticas; quatro indicadores alinhados no desktop e empilhados no mobile                                   | Três resumos e links existentes; sem gráfico, ícones remotos ou indicadores extras; vendas recentes continuam presentes na fixture quitada              |
| Vendas/Quitadas, busca e sem resultados                      | HTMLs e `exemploListagemDeVendas.png`; B/A `{vendas,quitadas}-{tema}.png`; C `{vendas,quitadas}-sem-resultados-{tema}.png`    | Critérios antes separados → painel contínuo com tabela/rodapé; Nova venda destacada em vermelho; selos sólidos → suaves; campos elevados, divisórias e estados de consulta legíveis    | Mesmas colunas, duas limpezas distintas e ações textuais; sem cartões globais, avatar, oito linhas ou menus que escondam ações                          |
| Lista vazia e paginação normal/hover/foco/ativa/indisponível | F `colecao-{0,1,10,11,21}-{tema}.png`, `{tema}-*-{normal,hover,foco}.png`, `paginacao-{tema}.png`; B `lista-{tema}.png`       | Painel vazio mantém faixa e mensagem explícita; atual vermelho e foco contornado distinguem-se de hover; anterior indisponível continua identificável; cantos e alinhamentos coerentes | Dez linhas sem rolagem da página no desktop; tabela horizontal interna no mobile, com ações alcançáveis; indisponibilidade continua por `aria-disabled` |
| Detalhe, entrada e dez parcelas                              | HTMLs e `exemploDadosDaVenda.png`; B/F `detalhe-dez-{tema}.png`; A `recebimento-{tema}.png` inclui detalhe aberto sob o modal | Blocos antes de fundo uniforme → painéis com rótulos secundários, números destacados, divisórias e cabeçalho suave; cliente/venda lado a lado no desktop, empilhados no mobile         | Página, entrada separada, histórico completo e retornos; sem modal de detalhe, truncamento ou remoção de datas/formas                                   |
| Cadastro, entrada, prévia e erros                            | HTMLs e `exemploCadastrarVenda.png`; B/A `cadastro-{tema}.png`; B/A `{tema}-cadastro-{erros,previa}.png`                      | Painéis/campos com cantos maiores, superfícies elevadas e ações hierarquizadas; foco e mensagens junto aos campos; prévia extensa permanece rolável                                    | Formulário continua página; fonte de sistema e disposição vertical adaptada, sem cliente mestre, primeiro vencimento editável ou cálculo aproximado     |
| Edição normal/erro e registro ausente                        | Padrão derivado dos HTMLs; A `edicao-{tema}.png`, B/A `{tema}-edicao-erros.png`; A `edicao-ausente-{tema}.png`                | Mesma identificação refinada do cadastro, quatro campos; erro textual e foco contrastante; ausência usa painel/mensagem próprios e retornos explícitos                                 | Sem campos financeiros; captura de edição ausente é adicional, sem alegar comparação baseline inexistente                                               |
| Recebimento normal/erro e conteúdo extenso                   | Padrão derivado dos HTMLs/detalhe; A `recebimento-{tema}.png`; B/A `{tema}-recebimento-erros.png`                             | Diálogo centralizado, raio de 12 px, backdrop desfocado, campos elevados e soma destacada; lista longa tem foco visível e rolagem própria                                              | `dialog` nativo, sequência, conferência exata e cancelamento; o título pode ficar fora do trecho capturado após rolagem, mas não foi removido           |
| Relatórios e exportação indisponível                         | Linguagem dos HTMLs; B/A `relatorios-{tema}.png`                                                                              | Tabelas antes soltas → quatro painéis com títulos/totais/períodos hierarquizados; separadores e cores semânticas; reorganização estreita e tabelas com rolagem local                   | Todos os registros, mês fixo, sem gráfico/seletor/indicadores globais/CSV; botão informa indisponibilidade, não simula download                         |
| Configurações, página e registro ausentes                    | Linguagem dos HTMLs; B/A `{configuracoes,pagina-ausente,registro-ausente}-{tema}.png`                                         | Painéis arredondados, títulos/descrições separados e quatro explicações com divisórias; retornos sem perda de contraste                                                                | Sem controles ou mensagens novas; ausência de registro distinta de validação de formulário                                                              |

Critérios transversais conferidos: hierarquia de títulos/rótulos/valores,
alinhamento dos painéis/controles, cores e superfícies temáticas, fonte de sistema,
espaçamento compacto, bordas, cantos e sombras discretas. O espaçamento dos HTMLs
não foi copiado literalmente: aviso, rótulos completos e dez linhas prevalecem.
Textos auxiliares/contornos foram adaptados para contraste, em vez de copiar
indiscriminadamente fonte de 10/11 px ou bordas fracas das referências.

As edições preexistentes de apresentação/testes foram autorizadas pelo solicitante
para esta continuação. Incluem o esquema nativo escuro do campo de data do cadastro
(ícone legível, sem substituição do controle) e a remoção da sombra do cabeçalho,
evitando projetá-la sobre a lateral mobile. Não se redesenhou a lateral.

Nova comparação dos **32 JSONs** de estilos/geometria da lateral com a baseline:
todos idênticos; resultado local em
`test-results/refinar-estilo-consolidacao/comparacao-lateral-estilos.json`.
Isso comprova os estilos/retângulos coletados, não igualdade de todos os pixels.
A inspeção também encontrou no relatório anterior
`test-results/refinar-estilo-final/comparacao-lateral.json` pequenas diferenças
de rasterização/limite de captura no mobile; não foram tratadas como igualdade
pixel a pixel nem usadas para dispensar a revisão visual.

Verificação automatizada complementar, nesta continuação:

- Primeira regressão interrompida pelo limite do executor de 120 s após 45 testes
  aprovados; não contada como suíte concluída. Reexecução autorizada sem esse
  limite: `npm.cmd run test:e2e -- --output=test-results/refinar-estilo-consolidacao/aplicacao --workers=1`,
  saída 0, **78/78**, 2,4 min, Chromium, nos dois viewports.
- `npm.cmd run test:e2e:paginacao-fixture -- --output=test-results/refinar-estilo-consolidacao/fixture`:
  saída 0, **12/12**, 38,7 s; aviso de prebundling mantido. Desktop: faixa até
  695 px, paginação até 741 px, última parcela até 727,77 px e documento 768 px.
  Mobile: largura do documento 390 px e rolagem vertical permitida.
- Contrastes desta execução: texto mínimo observado **4,899:1**; bordas essenciais
  mínimo **4,339:1**; paginação com foco por teclado **7,703:1** no escuro e
  **6,505:1** no claro. Lateral: texto/ícones **5,96:1 / 4,83:1**, foco
  **10,41:1 / 5,75:1**, escuro/claro. Asserções funcionais e mínimos preservados.
- Teclado, atalho, hover/foco/ativo, movimento reduzido, Escape, contenção/retorno
  de foco e privacidade/rede passaram nas suítes; não são inferidos só dos PNGs.
  Falha/retry e os vazios não alcançáveis com o seed da aplicação continuam sendo
  verificados em componentes, não são declarados capturas de produção vazia.

### Fechamento automatizado e auditoria — tarefa 7.4

Execuções reais em 21/11/2026, após a matriz e as correções de apresentação:

| Comando                                                         | Resultado                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm.cmd run build`                                             | Saída 0; 315,79 kB iniciais, 82,90 kB de transferência estimada; sem avisos de budget/Sass |
| `npx.cmd ng run vendas-em-aberto:build-paginacao-fixture`       | Saída 0; 317,54 kB iniciais, 83,34 kB estimados; sem avisos de budget/Sass                 |
| `openspec validate refinar-estilo-conteudo-mvp --strict` (raiz) | Saída 0: Change válida                                                                     |
| `git diff --check` (raiz)                                       | Saída 0; avisos locais de conversão LF/CRLF, sem erro de whitespace                        |

A primeira execução de `npm.cmd run format:check` retornou saída 1 somente pelos
dois HTMLs de referência locais/não rastreados. O solicitante autorizou excluir
**apenas esses dois caminhos** em `.prettierignore`; decisão registrada em D5.
Não foram reformatados, versionados nem ignorados os demais arquivos da pasta.
Hashes SHA-256 reconferidos e iguais aos da tarefa 1.1. Reexecução de
`npm.cmd run format:check` após a exceção: **saída 0**, todos os arquivos
abrangidos no padrão Prettier. Validação estrita OpenSpec repetida após atualizar
D5 e a tarefa 7.4: **saída 0**, Change válida.

Auditoria do diff da feature contra `main`: mudanças de produção limitadas a
CSS/templates e classes visuais de selo/erro inline. Nenhum diff em domínio,
serviço/estado, rotas, modelos, validadores, campos financeiros, dependências,
lockfile, configuração Angular ou budgets. A alteração em
`src/testing/paginacao-fixture.ts` é exclusiva do alvo de teste: quita vendas
por comandos existentes para compor as coleções 0/1/10/11/21; não altera o seed
nem regras da aplicação. A única exceção de ferramenta nova é a lista explícita
dos dois HTMLs no Prettier. PRD 1.11/TDD 1.15 continuam suficientes: não houve
decisão de produto/arquitetura nova.

Preservados fora do staging desta entrega: `../README.md`, `.playwright-mcp/`
na raiz e os dois HTMLs de referência. Nenhuma asserção financeira, de foco,
contraste, privacidade, rede ou densidade foi removida. Fechamento automatizado
não conclui zoom nativo, aceite da ótica ou a Change inteira.

### Verificação final para abertura do PR — 21/11/2026

Após os commits de tipografia, consulta, cadastro lateral e remoção do texto
redundante da entrada, foram executados novamente:

| Diretório   | Comando                                                                                                          | Resultado                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `frontend/` | `npm test -- --watch=false`                                                                                      | 30 arquivos, 363 testes aprovados            |
| `frontend/` | `npm run build`                                                                                                  | Aprovado; inicial 299,92 kB                  |
| `frontend/` | `npx ng run vendas-em-aberto:build-paginacao-fixture`                                                            | Aprovado; inicial 301,65 kB                  |
| `frontend/` | `npm run format:check`                                                                                           | Aprovado                                     |
| `frontend/` | `npm run test:e2e:paginacao-fixture`                                                                             | 12 testes aprovados                          |
| `frontend/` | `npx playwright test --config C:/Users/Thiago/AppData/Local/Temp/opencode/playwright-refinamento-4202.config.ts` | 82 testes aprovados, dois viewports Chromium |

O comando padrão `npm run test:e2e` não iniciou os testes porque a porta 4200
estava ocupada. A execução aprovada utilizou configuração temporária fora do
repositório, importando `frontend/playwright.config.ts` e mantendo testes,
projetos e asserções; alterou somente URL/servidor para 4202 e caminhos absolutos
necessários (`testDir`, `webServer.cwd`). Não foi interrompido o servidor existente
nem alterada a configuração versionada. O Angular avisou que a opção de porta
foi fornecida duas vezes, usando 4202. Capturas dessa execução são artefatos locais
em `frontend/test-results/`, não versionados.

A validação `openspec validate refinar-estilo-conteudo-mvp --strict`, na raiz,
também foi aprovada; `git diff --check` não apontou erros de whitespace.

### Apply `entrada-como-primeira-parcela` — preparação de cadastro — 22/11/2026

Comportamento planejado na tarefa 1.1: a quantidade informada inclui a entrada
como parcela 1 paga; as futuras usam o saldo e conservam os IDs históricos
opacos. Sem entrada, N=1 continua válido; com entrada, são necessárias pelo
menos duas parcelas totais. O recebimento integral da entrada é preparado junto
com a venda, sem publicação ou consumo de identificador nesta função.

Resultado real: `npx vitest run --globals
src/app/funcionalidades/vendas/venda.validacoes.spec.ts` aprovou 33/33 testes,
cobrindo entradas de R$ 200 e R$ 500 em R$ 2.000/10, mínimo de R$ 0,02/2,
N=1 com/sem entrada, IDs, 31/01, ano bissexto e novembro/dezembro de 9999.
O primeiro `npx vitest run` sem `--globals` não encontrou `describe`; repetido
com a opção compatível com a configuração local, passou.

A regressão integral `npm test -- --watch=false`, executada durante a transição
do agregado, terminou com 234/365 testes aprovados e 131 falhas em 17 arquivos.
As falhas observadas são consumidores ainda no contrato de entrada separada
(validação/projeções, seed, recebimento, formulário e detalhe); não são tratadas
como aprovadas nem ocultadas. Serão reavaliadas após as tarefas 1.2–3.5; este
registro não representa resultado final da Change.

### Apply `entrada-como-primeira-parcela` — validação e projeções — 22/11/2026

Na tarefa 1.2, `validarVenda` agora exige o recebimento inicial integral,
coincidente com o metadado e alocado exclusivamente à parcela 1; as alocações
subsequentes continuam em prefixo integral. Pago é derivado exclusivamente da
soma dos recebimentos; quantidade paga e saldo resultam das parcelas liquidadas,
com a soma das pendentes validada contra o saldo. Falhas são puras e não alteram
o agregado.

Resultado focado: `npx vitest run --globals
src/app/funcionalidades/vendas/venda.validacoes.spec.ts
src/app/funcionalidades/vendas/venda.calculos.spec.ts -t "Preparação pura|Projeções financeiras puras"`
aprovou 49 testes; 3 testes de período foram filtrados para a tarefa 1.3.
Os testes adicionados rejeitam recebimento inicial ausente/duplicado/inconsistente,
alocação parcial, repetida ou com salto, e centavos inseguros; confirmam
preservação do objeto nas falhas. A execução de toda a suíte de cálculos ainda
reproduz a dupla contagem do metadado na consulta mensal, explicitamente pendente
da tarefa 1.3, e não foi registrada como aprovada.

### Apply `entrada-como-primeira-parcela` — períodos e Relatórios — 22/11/2026

Na tarefa 1.3, a consulta por período e o resumo mensal somam somente os
recebimentos. Relatórios também percorre cada recebimento uma vez e determina
“Entrada” pelo vínculo da alocação com a parcela 1; o metadado não gera linha
ou valor próprio. A ordem original por venda foi preservada, com o recebimento
inicial antes dos lotes.

Resultado real: `npm test -- --watch=false
--include=src/app/funcionalidades/vendas/venda.calculos.spec.ts
--include=src/app/funcionalidades/relatorios/relatorios.calculos.spec.ts
--include=src/app/funcionalidades/relatorios/relatorios.spec.ts` aprovou 30/30
testes em 3 arquivos. Inclui período civil inclusivo e vazio, bordas de
referência, reconciliação de entrada R$ 200 + lote R$ 400 = R$ 600, bem como
Relatórios e seus consumidores. A chamada direta ao Vitest para o teste Angular
não inicializou `TestBed`; a execução correta foi pelo target `ng test` via
`npm test`.

### Apply `entrada-como-primeira-parcela` — seed demonstrativo — 22/11/2026

Na tarefa 2.1, as 12 vendas sintéticas mantêm K parcelas futuras históricas;
com entrada, o cadastro recebe N=K+1 e gera a parcela 1 paga com recebimento
canônico. IDs existentes das futuras e dos pagamentos históricos permanecem
estáveis. O seed paga somente o prefixo de futuras ainda pendentes, preservando
os critérios de data e valor, sem incluir novamente a entrada nos lotes.

Resultado real: `npm test -- --watch=false
--include=src/app/nucleo/demonstracao/dados-demonstrativos.spec.ts` aprovou
17/17 testes. A suíte percorreu todos os dias nos meses de borda 0001-01 a
0001-04 e 9999-09 a 9999-12, além de referências usuais, verificando 12 vendas,
unicidade de IDs, estrutura financeira reconciliada, situações possíveis,
identificações sintéticas aceitas e isolamento entre sessões.

### Apply `entrada-como-primeira-parcela` — serviço e recebimentos — 22/11/2026

Na tarefa 1.4, o serviço conserva publicação atômica: cadastro e recebimento da
entrada são um único agregado e uma única publicação, usando o ID da venda e
namespace próprio para o recebimento inicial. Lotes posteriores consomem os IDs
de operação existentes; rejeições, comandos obsoletos e falhas de preparação não
publicam nem avançam o contador. A seleção começa na primeira futura pendente,
rejeitando explicitamente a entrada paga, inclusive quando incluída em comando
antigo. Permanecem cobertos cópia defensiva, edição somente de cliente e quitação.

Resultado real: `npm test -- --watch=false
--include=src/app/funcionalidades/parcelas/pagamento.validacoes.spec.ts
--include=src/app/nucleo/demonstracao/edicao-cliente-servico.spec.ts
--include=src/app/nucleo/demonstracao/servico-demonstracao.spec.ts` aprovou
44/44 testes em 3 arquivos, incluindo publicação/retry, IDs, rejeição de entrada,
quitação, edições e isolamento de sessão.

### Apply `entrada-como-primeira-parcela` — fixtures de paginação — 22/11/2026

Na tarefa 2.2, a fixture seleciona apenas parcelas sem recebimento para concluir
as vendas de detalhe; ao ajustar o tamanho de abertas, também envia somente as
parcelas ainda não pagas. Assim, o cenário “dez parcelas” conta a entrada entre
as dez linhas e o detalhe de onze mantém seu excedente rolável, sem nova
persistência ou migração.

Resultados reais: `npx ng run vendas-em-aberto:build-paginacao-fixture` aprovou;
`npm run test:e2e:paginacao-fixture` aprovou 12/12 testes em Chromium, viewports
1366×768 e 390×844 e temas claro/escuro, cobrindo coleções 0/1/10/11/21, detalhe
de 10/11 parcelas, navegação por teclado e geometria/overflow. A suíte unitária
integral executada neste ponto aprovou 364/368 testes. Permaneceram quatro falhas
em rascunho/cadastro e recebimento/detalhe, cujos ajustes são tarefas 3.1/3.4;
não foram considerados aprovação nem ocultados nesta entrega de fixture.

### Apply `entrada-como-primeira-parcela` — escolha triestado — 22/11/2026

Na tarefa 3.1, o rascunho distingue explicitamente `''`, `'sim'` e `'nao'`;
inicia sem decisão e só `'sim'` ativa a conversão de valor/forma. Valores
inativos permanecem no rascunho e são ignorados em “Não”; ao voltar a “Sim”,
valor e forma são revalidados. A quantidade é N total; M futuras é N−1 com
entrada e N sem ela, usada tanto no limite de centavos quanto na validação de
calendário. Escolha ausente/desconhecida não gera comando nem prévia.

Resultado real: `npm test -- --watch=false
--include=src/app/funcionalidades/vendas/formulario-venda/rascunhos.spec.ts`
aprovou 46/46 testes. Cobertura inclui estado inicial, escolha ausente e
desconhecida, Sim/Não, valores ocultos inválidos ignorados/restaurados,
revalidação de entrada e conversão de N para M. A primeira execução encontrou
uma expectativa antiga que contava N como futuras; o caso foi corrigido para
validar três parcelas totais (duas futuras) e a reexecução passou.

### Apply `entrada-como-primeira-parcela` — select obrigatório — 22/11/2026

Na tarefa 3.2, a checkbox foi substituída pelo select nativo “Possui Entrada”,
com “Selecione uma opção”, “Sim” e “Não”, no DOM antes de data, valor total e
quantidade. A validação Signal Forms associa a mensagem especificada à seleção;
no envio sem resposta, o erro aparece, o foco vai ao select e nenhum cadastro,
prévia válida ou consumo de ID ocorre. “Sim” exige valor/forma; “Não” esconde e
ignora os valores preservados.

Resultado real: `npm test -- --watch=false
--include=src/app/funcionalidades/vendas/cadastrar-venda/cadastrar-venda.spec.ts
--include=src/app/funcionalidades/vendas/formulario-venda/rascunhos.spec.ts`
aprovou 56/56 testes em 2 arquivos. A cobertura de componente confere opções e
ordem DOM, escolha sem resposta com demais obrigatórios válidos, mensagem/foco,
ausência de publicação/consumo de ID, exigência condicional e alternância com
restauração do rascunho. Build do template foi concluído pelo target de testes.

### Apply `entrada-como-primeira-parcela` — prévia do cadastro — 22/11/2026

Na tarefa 3.3, `prepararPrevia` prepara o agregado com ID exclusivamente local e
passa pela mesma projeção financeira usada no domínio. A tabela mostra número,
valor, vencimento e situação textual; a parcela 1 recebe a identificação
“Entrada” e situação “Paga”. O resumo mantém entrada e saldo futuro, o caption
explica que nenhuma venda foi criada e a tabela continua em região rolável.
Dados inválidos removem a prévia anterior; cancelamento, falha/retry e envio
único continuam nas verificações de componente já existentes.

Resultado real: `npm test -- --watch=false
--include=src/app/funcionalidades/vendas/cadastrar-venda/cadastrar-venda.spec.ts
--include=src/app/funcionalidades/vendas/formulario-venda/rascunhos.spec.ts`
aprovou 57/57 testes em 2 arquivos. Verificou 10 parcelas no exemplo de
R$ 2.000,00/10 com entrada de R$ 500,00, divisão exata dos R$ 1.500,00 futuros,
entrada/Paga/data na prévia, recálculo/ocultação/restauração, finanças sem
publicação e descarte da prévia inválida. Os testes Angular compilaram o
template; ainda não é a regressão integral da Change.

### Apply `entrada-como-primeira-parcela` — detalhe e edição do cliente — 22/11/2026

Na tarefa 3.4, o detalhe identifica a linha canônica da parcela 1 como “Entrada”
e “Paga”; o bloco de entrada continua apenas resumo de valor/data/forma e não
compõe novamente pago, saldo ou contagem. A seleção de recebimento começa pela
primeira futura pendente e não oferece a parcela de entrada. Listas mantêm
pagas/total sobre o número real de parcelas; edição segue restrita aos dados do
cliente e preserva recebimentos, parcelas, projeções e resumos.

Resultado real: `npm test -- --watch=false` com includes para detalhe, listas,
edição de cliente, modal de recebimento e integração aprovou **56/56 testes em 6
arquivos**. A nova integração percorre 1/10 → 3/10 → 10/10, verifica entrada
somente na parcela 1, seleção inicial pela parcela 2 e depois parcela 4, totais
pagos/saldos, situação Quitada e remoção da ação Receber ao quitar. Os testes
encontraram fixtures antigos que substituíam o recebimento inicial ao simular
edição/pagamento parcial; foram ajustados para preservar a entrada canônica e
operar somente sobre parcelas futuras. A execução final direcionada passou; a
regressão integral fica para 4.1.

### Apply `entrada-como-primeira-parcela` — E2E do cadastro e consumidores — 22/11/2026

Na tarefa 3.5, os fluxos E2E passaram a escolher explicitamente “Não” ou “Sim”
no select, contabilizar a entrada dentro de N, e selecionar recebimentos apenas
entre parcelas pendentes. O cenário novo percorre por teclado e nos temas escuro
e claro: envio sem escolha com foco/mensagem, alternância com restauração,
prévia de dez parcelas, confirmação única, entrada paga na parcela 1, lote das
nove futuras, quitação e conferência de contagens/saldos. A suíte existente
continua verificando cancelamento, relatórios e recarga. O cenário responsivo
mede 1366, 1024, 768, 767 e 390 px e os dois temas; a suíte também roda nos
projetos Chromium 1366×768 e 390×844. Permaneceram asserções financeiras e
checagem de overflow global.

Resultado real: `npm run test:e2e -- e2e/formularios-vendas.spec.ts -g
"seleção por teclado"` passou 2/2 execuções Chromium. A suíte completa
`npm run test:e2e -- e2e/formularios-vendas.spec.ts` passou 22/22 execuções (11
cenários em dois projetos). As capturas sintéticas do novo fluxo foram anexadas
ao resultado do Playwright para os dois temas. A primeira tentativa de lote
usava `1.500`, rejeitado pelo formato monetário; com `1.500,00`, o fluxo passou.
Essa evidência é focada no arquivo E2E; não substitui as verificações integradas
4.1/4.2 nem a verificação manual 4.3.

### Apply `entrada-como-primeira-parcela` — verificação integrada — 22/11/2026

Ambiente: Windows, Node v24.21.0, npm 11.19.0, Playwright Chromium nos projetos
1366×768 e 390×844. Verificações executadas após as tarefas 3.1–3.5:

- `npm test -- --watch=false`: **372/372 testes em 30 arquivos aprovados**.
- `npm run test:e2e`: **84/84 execuções aprovadas** nos dois projetos. A primeira
  execução revelou um cenário de acessibilidade que ainda não selecionava
  “Possui Entrada”; após ajustar a fixture para “Não”, o arquivo específico
  passou 2/2 e a suíte completa passou 84/84. A cobertura inclui fluxo de
  cadastro, cancelamento, recebimentos/quitação, relatórios, recarga em contexto
  limpo, privacidade/rede e reconciliação de contagens/valores. Sem aviso de
  `pageerror` ou console nos monitores E2E.
- `npm run test:e2e:paginacao-fixture`: **12/12 execuções aprovadas**, com
  coleções 0/1/10/11/21, detalhe de 1/10/11 parcelas, excedentes em rolagem
  interna, teclado, dois viewports e temas. Aviso do runner: prebundling
  desativado porque otimização de scripts está habilitada.
- `npm run build` e `npx ng run vendas-em-aberto:build-paginacao-fixture`:
  ambos concluídos com sucesso. Os bundles iniciais foram respectivamente
  300,25 kB e 302,18 kB; sem avisos de budget/Sass nestas execuções.
- `openspec validate entrada-como-primeira-parcela --strict` e `git diff
--check`: aprovados.
- `npm run format:check`: primeira execução apontou 13 arquivos da Change fora
  do padrão. Prettier foi aplicado somente nesses arquivos; a reexecução aprovou
  todos os arquivos do projeto.

A revisão do diff após as funcionalidades encontrou apenas arquivos da Change
em E2E, formulário/prévia, projeções/validações, seeds/serviço e respectivos
testes/documentação; sem alteração de dependências, persistência ou edição
financeira. A formatação final é exclusivamente ajuste de estilo.

### Apply `entrada-como-primeira-parcela` — conferência manual 200% — 22/11/2026

Resultado manual informado pelo solicitante e confirmado para registro: zoom
nativo do navegador em 200%, escala de exibição do Windows em 125% e viewport
útil de 404×1594,95 px. Navegador Google na mesma versão já registrada no projeto
(Playwright Chromium Headless 157). O solicitante confirmou a conferência nos
temas claro e escuro, cobrindo cadastro/select/erro/prévia,
detalhe/recebimento e análises afetadas, com teclado e foco; relatou que os
componentes apresentam o comportamento esperado. Evidência é relato manual do
solicitante, não uma inspeção executada independentemente pelo agente; não foram
anexadas capturas.

### Zoom nativo — tarefa 7.3 encerrada por relato e autorização do solicitante

Em 21/11/2026, no contexto da conferência solicitada em zoom nativo de 200%,
o solicitante relatou: “A página comporta como esperado. Os elementos não são
distorcidos e nem criadas novas barras laterais desnecessárias. Os elementos
ficam uns abaixo dos outros conforme o esperado.” Autorizou explicitamente
finalizar a pendência com esses dados.

A tarefa foi encerrada por esse relato, com dispensa expressa da complementação
da evidência para abertura do PR. Não foram fornecidos navegador/versão, escala
Windows, viewport útil, capturas nem resultados discriminados por tela, tema e
teclado/foco. Portanto, não se afirma cobertura integral desses itens nem execução
manual independente pelo agente. Não houve substituição por CSS zoom ou redução
de viewport. Os registros anteriores de pendência neste README são históricos;
este encerramento não representa aceite da ótica ou conclusão da FASE-008.

## Apply `troca-para-tailwind` — linha de base — 20/11/2026

Ambiente Windows, Node 24.21.0, npm 11.19.0, Angular CLI/build 22.2.6.
Antes de alterar dependências ou estilos, a linha de base real foi:

- `npm.cmd run build`: saída 0; bundle inicial 511,34 kB e transferência estimada
  99,50 kB. Avisos: Sass `@import` depreciado em `src/styles.scss` e budget de
  aviso de 500 kB excedido em 11,34 kB (limite de erro 1 MB; budgets inalterados).
- `npm.cmd test -- --watch=false`: saída 0; 356/356 testes em 29 arquivos. O runner
  também reportou o aviso Sass preexistente.
- `npm.cmd run test:e2e`: saída 0; 64/64 em Chromium nos viewports 1366×768 e
  390×844, incluindo formulários, fluxo integrado, tema, contraste, foco e rotas.
  O servidor Playwright emitiu o mesmo aviso Sass.
- `npm.cmd run test:e2e:paginacao-fixture`: saída 0; 8/8 em Chromium nos dois
  viewports e temas. Confirmou densidade e rolagem interna conforme os cenários;
  avisos: Sass `@import` e prebundling desativado com otimização de scripts.

Nesta linha de base, `@angular/cli` e `@angular/build` estão em 22.2.6; Tailwind
e `@tailwindcss/postcss` ainda não estão instalados. Resultados são do ambiente
registrado e não comprovam compatibilidade Tailwind, suporte de outros browsers ou
aceite global/da ótica.

### Prova mínima Tailwind v4/PostCSS — tarefa 1.1

Instalados `tailwindcss@4.3.5` e `@tailwindcss/postcss@4.3.5` como dependências
diretas exatas, sem alterar Angular/Node/npm. Os metadados npm não declaram restrição
de `engines`/peers para esses pacotes; a compatibilidade foi verificada localmente
com Angular CLI/build 22.2.6. A documentação oficial consultada exige Safari 16.4+,
Chrome 111+ ou Firefox 128+ para Tailwind v4. O Chromium Headless 157 do Playwright
está acima do mínimo Chrome documentado; isso não valida Safari, Firefox nem a versão
operacional Chrome da ótica.

Com ponte Bootstrap ainda intacta e Preflight omitido, o plugin processou a entrada
CSS nos dois alvos: `npm.cmd run build` passou (saída 0; 513,64 kB iniciais,
100,09 kB estimados) e `npx.cmd ng run vendas-em-aberto:build-paginacao-fixture`
passou (saída 0; 515,03 kB iniciais, 100,45 kB estimados). O build principal
otimizado foi servido com configuração `production` em `127.0.0.1:4215`; no
Chromium, o utilitário literal de smoke `text-[#123456]` apresentou estilo computado
`rgb(18, 52, 86)` e permaneceu oculto (`display: none`). Isto comprova extração e
aplicação do utilitário nesse build; o elemento de smoke é temporário e será removido
ao fechar a verificação da ponte.

Os avisos preexistentes de Sass permanecem. O build otimizado elevou o aviso de
budget para 13,64 kB acima de 500 kB durante a prova mínima (sem alterar budgets),
incluindo o utilitário de smoke; reavaliar após remover o elemento de prova. A
instalação acrescentou 12 pacotes, auditoria reportou zero vulnerabilidades e o npm
avisou quatro pacotes com scripts ainda não aprovados; nenhum script foi aprovado.
No fechamento da prova inicial 1.1, smoke dos controles e instalação limpa ainda
estavam pendentes; foram realizados e registrados na tarefa 1.2 abaixo.

### Ponte temporária Tailwind/Bootstrap — tarefa 1.2

`npm.cmd ci` passou após adicionar as dependências exatas (303 pacotes instalados,
zero vulnerabilidades reportadas). O npm manteve quatro avisos de scripts não
aprovados (`@parcel/watcher`, `esbuild`, `lmdb` e `msgpackr-extract`); nenhum foi
aprovado. O primeiro `npm ci` foi interrompido por `EPERM` ao tentar remover o
binário `lightningcss` enquanto o servidor de prova otimizada ainda o mantinha
aberto; encerrei esse servidor próprio e a reexecução limpa passou.

A ponte compila Bootstrap Sass sob `@layer bootstrap`; a ordem é declarada como
`theme, base, bootstrap, components, utilities`. A entrada Tailwind importa somente
tema e utilitários, explicitamente sem Preflight; detecção está registrada em
`src/app` e `src/testing`, cobrindo HTML/TypeScript, templates inline e fixture.
Ambos os alvos Angular mantêm CSS e SCSS em paralelo nesta transição. Builds após
essa configuração: `npm.cmd run build` passou (513,71 kB iniciais, 100,14 kB
estimados; aviso de budget excedido em 13,71 kB) e `npx.cmd ng run
vendas-em-aberto:build-paginacao-fixture` passou (515,11 kB iniciais, 100,50 kB
estimados). O Sass `@import` da ponte continua gerando depreciação; budgets não
foram alterados.

Smoke em Chromium Headless 157 contra `ng serve --configuration production`:
utilitário literal gerou `rgb(18, 52, 86)` no estilo computado. Campos, botões e
tabelas foram inspecionados nos temas escuro e claro; a regressão E2E completa
passou 64/64 nos viewports 1366×768 e 390×844, incluindo seus testes de estilo,
foco, contraste e fluxo. Exemplos medidos para campo: escuro com texto
`rgb(222, 226, 230)` e fundo `rgb(33, 37, 41)`; claro com texto
`rgb(33, 37, 41)` e fundo branco. O elemento oculto de smoke foi removido após a
inspeção. O resultado não é aprovação visual global nem validação de outros browsers.

### Tokens e estado de tema — tarefa 2.1

`app-root` agora expõe `data-tema="dark|light"` sincronizado ao signal do tema e
mantém temporariamente `data-bs-theme` para os consumidores Bootstrap ainda não
migrados. A variante Tailwind `dark` está vinculada explicitamente a
`[data-tema='dark']`, incluindo host e descendentes. Tokens semânticos próprios cobrem
canvas, superfícies, texto, borda, marca, estados e foco; o escuro inicial e a
preferência apenas em memória permanecem. Os testes verificam a alternância por
Enter/Espaço com foco e rota preservados, recarga, preferência de sistema, página
ausente, navegação e ausência de persistência.

Durante a verificação, o cenário da fixture de detalhe apresentou descrição em duas
linhas e tabela em 784,75 px para viewport de 768 px. A inspeção dinâmica mostrou que
remover `data-tema` ou `data-bs-theme` não alterava a geometria; a correção autorizada
foi localizada no layout desktop do detalhe, sem reduzir fonte nem afrouxar o critério:
coluna de identificação mais útil e espaçamento/entrelinha vertical do bloco financeiro
compactados somente a partir de 768 px. A descrição passou a caber em uma linha. Após
a correção, nos dois temas em 1366×768, a última parcela ficou em 726,86 px, a base da
tabela em 758,75 px e o documento em 768 px; em 390×844 os blocos continuam empilhados
e o conteúdo permanece rolável.

Verificações reais posteriores, Windows/Node 24.21.0/npm 11.19.0, Chromium:

- `npm test -- --watch=false`: 356/356, 29 arquivos, saída 0.
- `npm run test:e2e:paginacao-fixture`: 8/8 nos viewports 1366×768 e 390×844,
  temas escuro/claro; densidade da lista e do detalhe, paginação por teclado e
  rolagem interna de excedentes aprovadas.
- `npm run test:e2e -- --workers=1`: 64/64 nos dois viewports, incluindo alternância,
  foco, navegação, ausência, recarga, preferência de sistema, storage e contraste.
- `npx prettier --check` nos arquivos alterados: saída 0.

Uma execução anterior da suíte principal em paralelo à fixture teve duas falhas
`ENOENT` ao gravar artefatos Playwright compartilhados; foi descartada como evidência
e a reexecução serial acima passou. O aviso preexistente Sass `@import` continua
visível. Isso não constitui aceite visual global, zoom nativo ou homologação da ótica.

### Estrutura global e navegação — tarefa 2.2

Shell, cabeçalho, aviso, perfil, atalho de conteúdo e navegação principal agora usam
utilitários Tailwind; o SCSS local restante limita-se ao gradiente/superfícies do shell,
logo e estados dinâmicos de navegação/foco. Rotas, logo, nomes e aviso permanecem. Os
tokens da lateral cobrem os dois temas. A comparação com `exemploDesignDark.png`
preserva a identidade vermelha e o contraste sidebar/grafite; não reproduz a busca
global, notificações, controles de janela nem perfil pessoal da referência, pois não
existem como capacidades aprovadas. O perfil continua explicitamente estático.

O teste `lateral segue a marca e mantém contraste no degradê, hover, ativo e foco`
anexa capturas `estrutura-dark` e `estrutura-light` ao relatório Playwright para cada
viewport; as capturas mostram a estrutura em foco por teclado. As medições nos extremos
e no meio do degradê, incluindo normal/hover/ativo/foco, obtiveram texto/ícones mínimos
de 5,96:1 no escuro e 4,83:1 no claro; foco mínimo de 10,41:1 e 5,75:1, respectivamente.
O estado atual (`aria-current`), o hover, o foco, o atalho de conteúdo e ausência de
overflow horizontal passaram em 1366×768 e 390×844, nos dois temas.

Verificação incremental posterior às mudanças do shell, em Chromium:

- `npm run test:e2e -- --grep "lateral segue" --workers=1`: 2/2, cobrindo os dois
  viewports e os temas escuro/claro, saída 0; capturas anexadas ao relatório.
- `npm run test:e2e -- --grep "lateral segue|orienta foco|abre a estrutura"
--workers=1`: estrutura e navegação passaram; o primeiro ensaio revelou outline de
  foco com 2,35:1 devido à regra global Bootstrap sem camada. Após restaurar outline
  local branco de 3 px e remover sua sombra, a execução dirigida `lateral segue`
  passou com os contrastes acima. O ensaio inicial não é contado como aprovação.
- `npm test -- --watch=false`: 356/356, 29 arquivos, saída 0, após as alterações de
  markup/estilo da estrutura.
- `npm run build`: saída 0, bundle inicial 517,93 kB; aviso de budget de 500 kB
  excedido em 17,93 kB, limite de erro de 1 MB intacto; o Sass `@import` também
  permanece como aviso.
- `npx prettier --check` nos arquivos da entrega: saída 0.

O runner ainda emite a depreciação preexistente de Sass `@import`; Bootstrap permanece
como ponte apenas para telas e componentes ainda não migrados.

### Componentes compartilhados e controles — OpenSpec tarefa 3.1

Migrados cabeçalho de página, selos de situação, paginação e modal, além dos
controles/estados vazios alcançados nesta etapa. Os selos preservam uma linha em
tabelas densas (`whitespace-nowrap` e `leading-3`). A migração descobriu que a classe
Bootstrap `.border` declara `border` com `!important`, sobrepondo a cor semântica Tailwind;
os contornos migrados usam `border-[1px]` para evitar a colisão e conservar o token de
contraste. O texto de erro usa token próprio, com cor mais clara no tema escuro.

Verificações reais incrementais em Windows, Chromium Playwright 158.0.8127.18,
viewports 1366×768 e 390×844:

| Comando em `frontend/`               | Resultado                                                    |
| ------------------------------------ | ------------------------------------------------------------ |
| `npm test -- --watch=false`          | Saída 0; 356/356 testes, 29 arquivos                         |
| `npm run test:e2e -- --workers=1`    | Saída 0; 64/64, execução serial nos dois viewports           |
| `npm run test:e2e:paginacao-fixture` | Saída 0; 8/8, incluindo densidade e detalhe com dez parcelas |
| `npm run format:check`               | Saída 0                                                      |

Os E2E verificaram diálogo nativo (tema herdado, contenção, Escape, cancelamento e
retorno de foco), foco visível, movimento reduzido, contraste de texto/bordas e links
em hover/foco. As medições de controles mantiveram mínimo 3:1 para bordas/foco e 4,5:1
para texto; a fixture desktop terminou com documento de 768 px, sem rolagem da página.
`npm run build` passou com bundle inicial de 521,39 kB (budget de 500 kB excedido em
21,39 kB, sem alterar limites); permanece o aviso Sass `@import`. Uma execução paralela
à fixture ocasionou `ENOENT` nos artefatos Playwright compartilhados; não foi contada e
a suíte principal foi repetida serialmente com 64/64. Capturas e traces ficam em
`test-results/` e não são versionados. Ainda não é aceite visual global nem avaliação
de zoom nativo.

### Listagens Vendas/Quitadas e tabelas — OpenSpec tarefa 3.2 — 21/11/2026

Listagens, filtros e tabela de Vendas/Quitadas migrados para utilitários Tailwind;
as tabelas usam superfícies e bordas semânticas, cabeçalhos legíveis, espaçamento
compacto e rolagem horizontal restrita à região acessível. Busca, filtros, ações,
coleções vazias, conteúdo financeiro e paginação foram preservados. A fixture E2E
agora também verifica estilos computados para confirmar o CSS gerado.

Verificações reais em Windows e Chromium Playwright, nos viewports 1366×768 e
390×844, temas escuro/claro:

- `npm test -- --watch=false`: saída 0, 356/356 testes em 29 arquivos.
- `npm run test:e2e:paginacao-fixture`: saída 0, 8/8. Em 1366×768, dez linhas,
  faixa e paginação couberam sem rolagem vertical da página; documento 768 px,
  última linha 669,5 px, rodapé 732 px e controles alinhados. Em 390×844, documento
  1614 px, largura 390 px e sem overflow horizontal global.
- Prettier aplicado aos três templates alterados; verificação global será consolidada
  no fechamento integrado.

Avisos mantidos: Sass `@import` e prebundling desativado com otimização de scripts.
Capturas locais foram revisadas, mas não versionadas. Não houve medição de zoom nativo.

### Cadastro, edição e prévia — OpenSpec tarefa 4.1 — 21/11/2026

Cadastro, edição e prévia de parcelas agora usam layout responsivo Tailwind nas
superfícies, campos, agrupamentos e ações; mantidos os componentes compartilhados de
identificação/erros, validações, confirmação, cancelamento e proteção contra envio
duplicado. A tabela completa da prévia permanece rolável e não representa criação
antes da confirmação. Comparada visualmente a composição sintética com
`exemploCadastrarVenda.png`, sem reproduzir dados ou capacidades indisponíveis.

Verificações em `frontend/`, Windows/Chromium, viewports 1366×768 e 390×844:

- `npm test -- --watch=false`: saída 0, 356/356 em 29 arquivos.
- `npx playwright test formularios-vendas.spec.ts`: saída 0, 18/18; cadastro,
  edição, erros/foco, entrada, prévia, cancelamento e envio único nos dois temas.
- O cenário `registra capturas sintéticas de cadastro e edição nos dois temas`
  anexou capturas dark/light ao relatório Playwright nos dois viewports.
- Prettier aplicado aos três templates migrados e ao teste E2E.

Aviso Sass `@import` mantido. Não foram adicionados dados pessoais reais, campos
financeiros ou dependências.

### Visão Geral, Relatórios e Configurações — OpenSpec tarefa 4.2 — 21/11/2026

As três páginas foram migradas para superfícies, grid responsivo, tipografia e listas
Tailwind; tabelas de relatório usam regiões acessíveis de rolagem e células com bordas
e espaçamento semântico. Conteúdo e limites foram preservados: quatro indicadores
somente na Visão Geral, três resumos limitados, quatro tabelas sem limite arbitrário,
período mensal fixo, posições na referência e exportação indisponível. Configurações
continua explicativa, sem controles inventados.

Verificações em `frontend/`:

- `npm test -- --watch=false`: saída 0, 356/356 em 29 arquivos.
- `npx playwright test demonstracao-inicial.spec.ts --workers=1`: saída 0, 46/46
  em Chromium 1366×768 e 390×844. Cobriu indicadores e resumos, quatro tabelas,
  estados vazios, exportação sem arquivo/rede/mutação, rotas ausentes, teclado,
  recarga e Configurações. Contraste textual mínimo observado 5,55:1 em Visão Geral,
  5,78:1 claro e 7,29:1 escuro em Relatórios.
- `npx playwright test demonstracao-inicial.spec.ts --grep "anexa capturas sintéticas"
--workers=1`: saída 0, 2/2; anexou capturas de cada página nos temas escuro/claro
  e nos dois viewports ao relatório Playwright.
- Prettier aplicado aos três templates e ao teste E2E.

Avisos Sass `@import` e prebundling permanecem. As capturas são evidência Chromium,
não aprovação de produto nem avaliação com a ótica; zoom nativo não foi medido.

### Recebimento — OpenSpec tarefa 4.4 — 21/11/2026

A lista de parcelas selecionadas no modal usa altura máxima e rolagem em utilitários
Tailwind; campos, erros e ações seguem os padrões semânticos dos formulários. O
comportamento de seleção sequencial, valor exato, falha/retry, confirmação única,
cancelamento e retorno de foco foi preservado. O teste de capturas anexa o modal e os
estados de cadastro/edição nos dois temas e viewports.

Verificações reais em `frontend/`:

- `npm test -- --watch=false`: saída 0, 356/356 em 29 arquivos.
- `npx playwright test formularios-vendas.spec.ts --workers=1`: saída 0, 18/18 em
  Chromium 1366×768/390×844. Inclui quitação, integração com listas e resumos,
  erros/validações, teclado, cancelamento, Escape, retorno de foco e capturas anexadas.
- Prettier aplicado ao template do recebimento e ao teste E2E.

Aviso Sass `@import` mantido; não foi alegada medição de zoom nativo.

### Remoção da ponte Bootstrap e ativação do Preflight — OpenSpec tarefa 4.3 — 21/11/2026

Removidos a dependência/import visual Bootstrap, tokens/atributos `--bs-*` e
`data-bs-theme`, classes exclusivas restantes e dependência direta Sass. Entradas e
estilos locais SCSS foram convertidos para CSS; ambos os alvos Angular e o schematics
passaram a usar CSS. Tailwind Preflight foi ativado na camada `base`, mantendo a ordem
CSS de tema/base/componentes/utilitários e o tema explícito `data-tema`. A inicialização
`bootstrapApplication` do Angular permanece intencionalmente preservada.

Verificações reais em `frontend/`:

- `npm ci`: saída 0; 301 pacotes instalados, auditoria sem vulnerabilidades. O npm
  informou quatro scripts de instalação não aprovados; nenhum foi aprovado.
- `npm run build`: saída 0, bundle inicial 297,57 kB; budgets não foram alterados.
- `npx ng run vendas-em-aberto:build-paginacao-fixture`: saída 0, bundle inicial
  298,89 kB.
- `npm test -- --watch=false`: saída 0, 356/356 testes em 29 arquivos.
- `npm run test:e2e -- --workers=1`: saída 0, 68/68 em Chromium nos viewports
  1366×768/390×844; inclui tabelas, densidade, formulários, contraste, foco, estados,
  navegação, modal e fluxos financeiros.
- `npm run test:e2e:paginacao-fixture`: saída 0, 8/8; listas e detalhes compactos,
  rolagem interna e teclado nos dois temas/viewports.
- `npm run format:check`: saída 0. Auditoria de source/config não encontrou
  `data-bs-theme`, tokens `--bs-*`, import Bootstrap nem arquivos SCSS.

Os avisos anteriores de Sass e CSS budget desapareceram com a migração; budgets
mantidos. O zoom nativo continua sendo evidência manual separada e não é inferido
pelas capturas Chromium.

#### Fechamento técnico — tarefa 5.3

Em 21/11/2026, após a instalação limpa já registrada acima, a verificação final foi
repetida: `npm run build` passou (297,57 kB inicial),
`npx ng run vendas-em-aberto:build-paginacao-fixture` passou (298,89 kB inicial) e
`npm run format:check` passou. Na raiz do repositório,
`openspec validate troca-para-tailwind --strict` retornou “Change 'troca-para-tailwind'
is valid”. Budgets permaneceram inalterados; a auditoria de source/config confirmou
ausência de Bootstrap visual, mantendo a inicialização Angular. A tarefa 5.2 foi
fechada posteriormente com a matriz abaixo e o relato manual de zoom.

### Regressão integrada final — OpenSpec tarefa 5.1 — 21/11/2026

Após instalação limpa (`npm ci`), a regressão integrada foi repetida serialmente em
`frontend/`, Windows, Chromium, viewports 1366×768 e 390×844:

- `npm test -- --watch=false`: saída 0, 356/356 em 29 arquivos.
- `npm run test:e2e -- --workers=1`: saída 0, 68/68; cobre cadastro, recebimento e
  quitação, edição, listas, Visão Geral, Relatórios, configuração, recarga, rotas,
  estados, teclado, foco, contraste e ausência de rede/storage de negócio.
- `npm run test:e2e:paginacao-fixture`: saída 0, 8/8; densidade/rolagem, paginação,
  detalhe com dez parcelas e excedentes nos dois temas/viewports.

As medições e capturas permanecem evidência automatizada Chromium; a inspeção manual
de zoom nativo 200% é registrada separadamente abaixo.

#### Matriz visual consolidada — tarefa 5.2 — 21/11/2026

Capturas citadas são anexos dos relatórios Playwright (`frontend/test-results/`, não
versionados); os nomes abaixo identificam cenários/anexos reproduzíveis. Os testes
foram executados em 1366×768 e 390×844, temas escuro/claro, salvo onde indicado.

| Rota/estado                                                            | Referência e evidência                                                                                                                                | Critérios conferidos e resultado                                                                                                                                                       | Diferenças justificadas                                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Estrutura, navegação, aviso e página ausente                           | `exemploDesignDark.png`; anexos `estrutura-dark/light` em `demonstracao-inicial.spec.ts`; casos de navegação/404                                      | Hierarquia, logo proporcional, destinos, ativo/hover/foco, atalho de conteúdo, contraste e ausência de overflow; testes passaram                                                       | Texto de marca/aviso e SVGs existentes preservados; sem controles decorativos das imagens             |
| Vendas e Quitadas: normal, busca/filtro, vazio, hover/foco e paginação | `exemploListagemDeVendas.png`; `lista-dark/light`, `consulta-{tema}-links`, cobertura em `paginacao-fixture.spec.ts` e `demonstracao-inicial.spec.ts` | Dez linhas e paginação em desktop sem scroll vertical da página; em 390 px tabela rola dentro da região e não cria overflow horizontal global; teclado, identidade e faixa preservados | Tabela mantém todas as colunas e usa rolagem horizontal interna em telas estreitas                    |
| Detalhe, parcelas e excedentes                                         | `exemploDadosDaVenda.png`; `detalhe-dez-dark/light` na fixture                                                                                        | Cliente/venda lado a lado no desktop, entrada distinta, dez parcelas; excedentes/texto longo em região nomeada com cabeçalho sticky e teclado; ambos temas/viewports passaram          | Scroll interno apenas para histórico excedente                                                        |
| Cadastro, prévia, erros, edição e confirmação                          | `exemploCadastrarVenda.png`; anexos `cadastro-dark/light`, `edicao-dark/light` em `formularios-vendas.spec.ts` e `acessibilidade-formularios.spec.ts` | Campos/erros associados, foco, envio único, cancelamento e preservação funcional; fluxo passou nos dois temas/viewports                                                                | Composição responsiva adapta blocos; sem dados reais, cliente mestre ou campos financeiros adicionais |
| Modal de recebimento e estados                                         | Derivado de `exemploDadosDaVenda.png`; anexos `recebimento-dark/light` em `formularios-vendas.spec.ts`                                                | Tema herdado, contenção, sequência, valor, erro/retry, confirmação, Escape/cancelamento e retorno de foco; fluxo passou nos dois temas/viewports                                       | `dialog` nativo mantido; lista longa tem rolagem limitada                                             |
| Visão Geral, Relatórios e Configurações                                | `exemploDesignDark.png` como linguagem; anexos `${rota}-${tema}` (`visao-geral`, `relatorios`, `configuracoes`) em `demonstracao-inicial.spec.ts`     | Indicadores/resumos, quatro tabelas, estados vazios/ausentes, exportação indisponível, foco, contraste e sem overflow; 46/46 verificações passaram                                     | Páginas sem referência própria seguem tokens e hierarquia comuns, sem inventar ações                  |

Verificações transversais: E2E serial 68/68 e fixture 8/8; foco por teclado, movimento
reduzido, normal/hover/ativo/erro e contrastes de texto e controles foram exercitados.
Capturas automatizadas não são aprovação da ótica nem certificação integral de
acessibilidade.

**Zoom nativo manual informado pelo solicitante:** Google Chrome **157.0.8103.79
(Versão oficial), 64 bits**; Windows com escala **125%**, resolução física **1920×1080**;
viewport útil durante a verificação em zoom **200%: 506×528,65 CSS px**. Resultado
relatado: elementos sem distorção, sem barra horizontal, empilhados verticalmente como
esperado. O agente não operou nem reproduziu a medição; não foi usado CSS `zoom` como
substituto. A evidência é relato manual do solicitante e não constitui aceite da ótica.

**Atualização da tarefa 8.3 — zoom nativo 200% — 22/11/2026:** o solicitante confirmou
que a verificação atende aos requisitos da matriz da Change, mantendo exatamente as
configurações acima. Confirmação registrada para os destinos e modal nos temas claro e
escuro, com conteúdo e controles alcançáveis e reorganização/rolagem sem perda de
conteúdo. Trata-se de relato manual do solicitante, não inspeção reproduzida pelo agente;
não foram anexadas capturas nem medições por rota/controle. Não foi usado CSS `zoom`.
Isso conclui a tarefa técnica 8.3 com a evidência autorizada, sem homologar outros
navegadores, declarar conformidade integral de acessibilidade ou representar aceite da
ótica.

### Detalhe e parcelas — OpenSpec tarefa 3.3 — 21/11/2026

Detalhe da venda e histórico de parcelas migrados para superfícies, bordas, tipografia
e tabela com utilitários Tailwind, mantendo CSS local apenas para o grid denso, os
limites de rolagem e a precedência do cabeçalho fixo sobre a ponte Bootstrap. Entrada
permanece separada e a região de excedentes continua identificada e operável por
teclado. A captura `detalhe-dez-dark.png` foi revisada contra `exemploDadosDaVenda.png`;
foram mantidos dados sintéticos e os controles funcionais existentes.

`npm test -- --watch=false`: saída 0, 356/356 testes em 29 arquivos. Após detectar
que a regra Bootstrap prevalecia sobre `position: sticky`, `npm run
test:e2e:paginacao-fixture`: saída 0, 8/8 em Chromium, dark/light e 1366×768/390×844.
No desktop, cliente e venda alinham no topo; dez parcelas e a região terminam antes
do limite de 768 px, sem rolagem vertical da página. O teste com 11 parcelas confirmou
rolagem interna, cabeçalho fixo e navegação por teclado. Em mobile, documento 1706 px,
largura 390 px, sem overflow horizontal global. Avisos de Sass e prebundling
permanecem; zoom nativo não foi medido.

## Apply FASE-007 — Visão Geral — 20/11/2026

Entregue a página de Visão Geral com os quatro indicadores derivados de
`ServicoDemonstracao.resumo()` e três resumos calculados sem mutar as projeções:
até cinco vendas recentes (quitadas incluídas), até cinco parcelas próximas e até
cinco atrasadas. As parcelas usam as situações já projetadas pelo domínio; a janela
próxima permanece hoje a +7 dias inclusivos e datas extremas não geram aritmética
fora do calendário. Empates mantêm a ordem da fonte, e os links de detalhe usam
segmentos Router para preservar IDs com barras. Referência, mês, recortes, limites e
mensagens vazias são identificados na página. Os quatro indicadores não dependem
dos resumos limitados.
Esse recorte mantém alinhamento com CA-014/020: posição global reconciliável,
vendas quitadas incluídas e filtros de Vendas sem efeito sobre os indicadores.

As expectativas temporárias de indisponibilidade foram migradas somente para Visão
Geral; Configurações continua com suas quatro explicações e Relatórios permanece
indisponível até o segundo grupo da Change. Não houve alteração no domínio, seed,
persistência, dependências ou regras financeiras.

Verificações reais em Windows, Node 24.21.0/npm 11.19.0:

- `npm test -- --watch=false`: saída 0, 346/346 em 27 arquivos. Inclui seleções
  puras para listas vazias, limites, ordenação/empates, quitadas, situações de
  parcelas e bordas civis; componente com fonte substituída, vazios, reatividade,
  identificação editada sem alteração do resumo e links com ID opaco.
- `npm run test:e2e -- e2e/demonstracao-inicial.spec.ts`: saída 0, 40/40 em Chromium
  1366×768 e 390×844. Os resumos exibiram cinco links cada; navegação por teclado
  abriu IDs `seed/venda/...` e moveu foco ao título do detalhe. Ambos os temas foram
  exercitados em cada viewport, sem overflow horizontal observado na Visão Geral.
- `npx prettier --check` nos arquivos da entrega: saída 0.
- O runner reportou aviso Sass preexistente sobre `@import` em `src/styles.scss`.

A checagem de overflow não substitui inspeção de contraste dos elementos da página,
zoom nativo 200% ou avaliação visual completa; esses itens permanecem na tarefa 3.2.
Os E2E usam Chromium e não comprovam Chrome alvo, uso operacional ou aceite da ótica.
Sem alteração dos limites de bundle, PRD/TDD ou especificações principais nesta
entrega; Relatórios e regressão integrada ainda pendentes.

## Apply FASE-007 — Relatórios — 20/11/2026

Entregues quatro tabelas completas: recebimentos do mês (uma linha por entrada ou
lote, sem somar alocações novamente), vendas do mês (inclui quitadas), saldos
positivos por venda e parcelas vencidas. As duas últimas seções são posições na
referência atual, separadas das movimentações mensais. Período e posição são
identificados, cada seção tem total próprio e estado vazio próprio, e as tabelas
mantêm todos os registros elegíveis sem limite de cinco. Links por segmentos Router
preservam IDs opacos. Não há seletor, gráfico nem faixa global de indicadores.
O recorte segue RF-010/CA-014 ao separar mês e posição na referência; exportação
honesta atende CA-015 sem arquivo ou promessa de sucesso.

Exportar relatório permanece uma ação ilustrativa: explicação persistente associada
ao botão e mensagem `role="status"` após acionamento. Testes verificaram operação
por teclado, ausência de download/requisição e igualdade do conteúdo financeiro
antes/depois. Configurações preserva os quatro limites; sua explicação de dados
fictícios agora esclarece que páginas e alterações são somente demonstrativas, sem
afirmar que as consultas ainda não existem. Recarga continua descartando a sessão.

Verificações reais em Windows, Node 24.21.0/npm 11.19.0:

- `npm test -- --watch=false`: saída 0, 356/356 em 29 arquivos. Inclui limites
  inclusivos, fevereiro bissexto e anos 0001/9999, venda anterior recebida no mês,
  entrada/lote sem dupla contagem, quitação, posições acima de cinco registros,
  zeros, overflow, imutabilidade e componentes reativos com links opacos.
- `npm run test:e2e -- e2e/demonstracao-inicial.spec.ts`: saída 0, 42/42 em Chromium
  1366×768 e 390×844; inclui rotas diretas/internas, foco, aviso, Configurações e
  acionamento de exportação sem arquivo, rede ou mutação.
- `npm run test:e2e -- e2e/demonstracao-inicial.spec.ts --grep "Relatórios mantém"`:
  saída 0, 2/2 adicionais; quatro tabelas com linhas alcançáveis e sem overflow
  horizontal em tema escuro/claro nos dois viewports.
- `npx prettier --check` nos arquivos desta funcionalidade e migração: saída 0.
- Permanece o aviso Sass preexistente para `@import` global. Build e fixture E2E
  ainda não foram executados nesta etapa; serão registrados no fechamento integrado.

### Verificação integrada FASE-007 — tarefa 3.1

O cenário `reconcilia cadastro, entrada, quitação e edição entre listas, Visão Geral
e Relatórios` passou 2/2 em Chromium 1366×768 e 390×844. Conferiu em centavos
entrada inicial, saldo remanescente, recebimentos do mês, venda do mês, quitação por
lote, retirada de saldo/atraso, presença em Quitadas, invariância do detalhe após
edição de identificação, invariância dos cartões sob filtro e descarte da sessão ao
recarregar. A referência exibida coincidiu com a data do cadastro.

A primeira falha desse cenário era do próprio teste: `page.goto()` causava recarga
completa e, portanto, descartava corretamente o estado em memória antes da
reconciliação. O cenário foi ajustado para navegar pelos links internos da SPA; não
foi necessária alteração das regras ou do código financeiro. Ao final, uma recarga
completa confirmou o descarte demonstrativo esperado.

### Verificação de acessibilidade FASE-007 — tarefa 3.2 (parcial)

Em 20/11/2026, Windows/Node 24.21.0/npm 11.19.0, a nova medição Playwright
executou em Chromium 1366×768 e 390×844, tema escuro e claro. Foram examinados
33 textos na Visão Geral e 151 em Relatórios: contraste mínimo medido de 7,29:1
no escuro e 6,78:1 no claro. Borda e foco do botão Exportar passaram o mínimo 3:1;
foco por teclado apresentou outline sólido de 3 px. A primeira medição identificou
3,29:1 no texto do botão secundário padrão; foi trocado para o estilo demonstrativo
de consulta e adicionada regra de outline específica para `:focus-visible`. Após a
correção, as verificações passaram. Também passaram 6/6 E2E de navegação por teclado
dos resumos/foco no título, exportação anunciável e tabelas roláveis, além de
verificações das quatro explicações de Configurações e ausência de indicadores em
Vendas, Quitadas e Relatórios.

**Complemento da tarefa 3.2 — 20/11/2026:** em solicitação manual, a pessoa
confirmou zoom nativo do navegador a 200% e relatou que não surgiu barra lateral,
os elementos não foram distorcidos e permaneceram alinhados conforme o zoom era
aplicado. É evidência declarativa do solicitante, não medição/reprodução independente;
browser e versão usados no relato não foram informados. Não foi usado CSS `zoom` como
substituto.

Na mesma data, `npm.cmd run test:e2e -- e2e/demonstracao-inicial.spec.ts
e2e/acessibilidade-formularios.spec.ts --workers=1` passou 48/48 em Chromium,
Windows, viewports 1366×768 e 390×844. Cobriu contraste textual (mínimo medido
6,78:1 nas páginas novas; 4,50:1 nos formulários/erros), controles e foco (mínimo
3:1), operação por teclado, erros e mensagens, textos longos/prévia de 24 parcelas,
rolagem interna do modal, Configurações e ausência de cartões globais em Vendas,
Quitadas e Relatórios. O documento não teve overflow horizontal nos cenários
medidos. Uma primeira execução com dois workers teve uma falha em asserção de faixa
de resultados da lista (estado observado `1–3 de 3` em vez de `1–0 de 0`); não se
reproduziu na execução serial de 48/48. O runner reportou a depreciação Sass já
conhecida de `@import`.

Com o relato de zoom e essas verificações, a tarefa técnica 3.2 foi concluída. Isto
não é medição independente do zoom nativo, homologação do Chrome alvo, auditoria
integral de acessibilidade nem aceite global/da ótica; tecnologia assistiva e
avaliação por usuários permanecem fora desta evidência.

### Regressão final FASE-007 — tarefa 3.3

Execuções integrais em `frontend/`, Windows/Node 24.21.0/npm 11.19.0, em 20/11/2026:

- `npm test -- --watch=false`: saída 0; 356/356 testes em 29 arquivos.
- `npm run test:e2e`: saída 0; 64/64 em Chromium 1366×768 e 390×844. Inclui
  cenário integrado 3.1, contraste das páginas novas, controles/foco, navegação,
  Configurações, exportação e regressões existentes. Sem falhas de console/pageerror.
- `npm run test:e2e:paginacao-fixture`: saída 0; 8/8 nos dois viewports e temas.
  Permanecem medições intencionais de geometria/rolagem interna da fixture longa.
- `npm run build`: saída 0; bundle inicial 511,34 kB e transferência estimada
  99,50 kB. O aviso de budget de 500 kB permanece excedido em 11,34 kB; limite de
  erro de 1 MB e budgets foram mantidos. Também reportado aviso Sass `@import`.
- `npm run format:check`: saída 0; todos os arquivos formatados.
- A fixture também avisou que prebundling não será usado com otimização de scripts.
  Não houve falhas de compilação; os avisos acima não foram ocultados.

### Conciliação documental FASE-007 — tarefa 3.4 (20/11/2026)

PRD 1.10 e TDD 1.14 receberam acompanhamentos de implementação sem alterar requisitos,
decisões ou IDs. Ambos registram o estado parcial de 3.2, o zoom nativo pendente,
as evidências da tarefa 3.3 e a ausência de aceite. Permanecem explicitamente abertas
PEN-013, PEN-014 e HIP-006; a FASE-008 e a aprovação da ótica não foram declaradas
concluídas. Os quatro deltas da Change continuam vinculados às capabilities de
Visão Geral, Relatórios, navegação e estado demonstrativo, sem sincronização das
specs principais nesta etapa.

`openspec validate fase-007 --strict`: válido. A Change continua parcialmente
implementada, com task 3.2 aberta; não houve sync, archive, PR ou merge.

Evidência é Chromium, não valida Chrome alvo nem aceite da ótica. A checagem de
overflow e teclado não substitui a revisão dedicada de contraste/textos extensos e
zoom nativo 200% da tarefa 3.2. PEN-013/014/HIP-006 continuam pendentes; sem sync,
archive, PR ou merge nesta etapa.

## Apply FASE-006 — dependência de formulários — 18/11/2026

Apply autorizado na `feature/fase-006`, inicialmente limpa. Reutilizados PRD 1.8,
TDD 1.12 e os oito arquivos de contexto da Change, revisados antes das alterações.
Adicionado somente `@angular/forms@22.2.6` como dependência direta, alinhado aos
peers core/common/platform-browser 22.2.6 e RxJS 7.8.2. O lock acrescenta a
transitiva `@standard-schema/spec@1.1.0`; Zod 4.6.6 já existente passa também a
dependência de produção, sem atualizar versões anteriores.

Context7 consultado sobre validação/submissão. Os exports e declarações instalados
confirmam `form`, `FormField`, `validate` e `submit` públicos desde 22.0, sem marca
experimental nessas APIs. A presença de outras APIs experimentais no pacote não
autoriza seu uso. A compilação dos formulários será comprovada nas tarefas seguintes.

Verificações reais em Windows, Node 24.21.0/npm 11.19.0:

- `npm.cmd install --save-exact @angular/forms@22.2.6`: saída 0.
- `npm.cmd ci`: saída 0; 291 pacotes instalados e auditoria automática sem
  vulnerabilidades reportadas. Mantidos os avisos de scripts não aprovados de quatro
  pacotes; nenhum script aprovado nem `audit fix` executado.
- `npm.cmd run build`: saída 0, 492,50 kB iniciais/94,95 kB estimados; aviso
  preexistente Sass `@import`, sem mudança de budgets.
- `npm.cmd run format:check`: saída 0.

Esta etapa não entrega UI, testes de fluxos, avaliação ou aceite. PEN-013/014 e
HIP-006 permanecem abertos. Sem sync/archive ou PR antecipado.

### Adaptadores de rascunhos — tarefa 1.2

`formulario-venda/rascunhos.ts` mantém dinheiro/quantidades como texto, converte
comandos independentes e associa erros de identificação, valor, quantidade, data
e forma aos campos. Prévia chama `prepararCadastro` com `previa/local`, sem fonte,
relógio ou reserva de ID. A edição copia somente os quatro campos. Recebimento
copia IDs capturados e revalida o prefixo pelo domínio; seleção obsoleta fica no
resumo, sem trocar pelas próximas pendências. A fonte continua autoridade final
para validação do agregado, inclusive overflow global.

Verificação incremental: `npm.cmd test -- --watch=false`, saída 0, 310/310 testes
em 22 arquivos (45 casos novos). Cobertos vazios, identificação válida/inválida,
CPF repetido, precisão/overflow, quantidades, datas cruzadas e limites do calendário,
entrada, centavos e 31/01, seleção vazia/saltada/obsoleta e cópias sem mutação.
Aviso Sass mantido. Os adaptadores não comprovam entrega dos formulários visuais.

### Pausa no cadastro — tarefas 2.1/2.2 em andamento

Criado esboço não concluído de cadastro lazy com Signal Forms, identificação,
entrada condicional, prévia e submissão; integração inicial de Nova venda e retorno
de foco. Não há evidência de conclusão dessas tarefas nem commit funcional.

`npm.cmd run build` após esse esboço saiu 1: TS2322 na passagem da árvore completa
`FieldTree<RascunhoCadastro>` para `FieldTree<RascunhoCliente>` em
`cadastrar-venda.html`. O iterador da árvore completa inclui booleano, impedindo
compatibilidade estrutural com a árvore somente de strings. Execução pausada
conforme o fluxo de apply, aguardando orientação. Correção proposta: contrato
explícito dos quatro campos filhos no componente de identificação, sem casts/any
ou mudança de tecnologia. Os 310 testes aprovados acima antecedem este esboço;
não comprovam o estado atual. Build atual falha; testes de componente/E2E e nova
formatação do esboço ainda não executados. Nenhum PR, sync/archive ou merge.

### Retomada autorizada — contrato da identificação

Após revisão em explore e autorização explícita, o input da identificação passou
a receber `Pick<FieldTree<RascunhoCliente>, keyof RascunhoCliente>`: referências
dos quatro campos, sem exigir raiz/iterador do formulário completo, sem casts,
`any`, segunda cópia do modelo ou mudança de tecnologia.

`npm.cmd run build` passou (saída 0): 506,79 kB iniciais/98,71 kB estimados.
Novo aviso de budget inicial excedido em 6,79 kB, além do Sass preexistente;
budgets mantidos. Este resultado comprova a correção do TS2322, não a entrega.

Continuada a implementação parcial com foco no primeiro erro por `onInvalid`,
mensagem de negócio separada do resultado de submit, guarda de conclusão e anúncio
transitório em serviço de memória, sem gravar mensagem no histórico do Router.
Arquivos de código tocados formatados com Prettier; sem nova verificação global.

`npm.cmd test -- --watch=false` saiu 1: 316/317 testes passaram, 22 arquivos
aprovados e um com falha. Dos sete novos testes de cadastro, seis passaram
(referência/prévia/invalidação sem publicação, erros/foco, envio único/sucesso,
falha retornada e exceção com retry, cancelamento). Falhou a expectativa de quatro
linhas após preencher entrada/forma. Inspeção do teste mostra helper disparando
apenas `change` no select; `nativeControlCreate` do pacote instalado escuta `input`
para controles nativos, inclusive select. Hipótese fundamentada de evento
incompleto no teste, ainda não corrigida nem comprovada por reexecução/browser.

Apply novamente pausado conforme instrução de parar em erros, aguardando orientação
para ajustar os eventos do teste e repetir verificações, preservando a asserção
de quatro parcelas e saldo de R$ 800,00. Tarefas 2.1/2.2/2.3 continuam abertas;
alterações funcionais sem commit. Sem E2E, conclusão integral, PR ou aceite.

### Cadastro verificado — tarefas 2.1 a 2.3

Após autorização, o helper de teste passou a emitir `input` e `change` no select.
Sem alteração de produção para esse erro, a suíte passou 317/317; adicionadas
verificações de coleção vazia e abandono, passou 319/319 em 23 arquivos (saída 0).
O teste de quatro parcelas/entrada mantém as asserções financeiras originais.

Cadastro lazy em `/vendas/nova`, antes da rota dinâmica, usa um único rascunho
Signal Forms e os adaptadores puros. Erros junto aos campos via `aria-describedby`,
primeiro erro focado pelo callback oficial `onInvalid`; conversão revalidada na
confirmação. Prévia é recalculada/invalida com os dados, sem publicar ou consumir
IDs; entrada condicional e datas civis, descrição opcional. Identificação compartilha
referências dos quatro campos, não uma cópia concorrente. Fonte segue autoridade
final do agregado. Erros de negócio/exceções ficam em mensagem anunciável e liberam
retry sem limpar os valores; resolver submit não é tratado como sucesso de negócio.

Guarda de conclusão impede novo comando após sucesso até navegação. Anúncio do
resultado é transitório em serviço em memória, consumido pelo detalhe, sem storage
ou estado do histórico do Router. Cancelar volta a Vendas e restaura Nova venda
por identidade lógica após renderização, com título como fallback. Outros links
descartam o rascunho sem guardas de abandono. Botão Nova venda permanece funcional
em coleção sem abertas. Nenhum indicador ou ação em Visão Geral/Relatórios.

Verificações incrementais reais em 18/11/2026:

- `npm.cmd test -- --watch=false`: 319/319, 23 arquivos, saída 0; inclui falha
  retornada e exceção controladas, retry, envio concorrente, foco/erros, referência
  fixa, calendário/limites/prévia e nenhuma publicação/consumo de ID antes de confirmar.
- `npx.cmd playwright test formularios-vendas.spec.ts`: 6/6, saída 0.
- `npm.cmd run test:e2e`: 42/42, saída 0, Chromium, 1366×768 e 390×844, servidor
  próprio do runner em 4200. Novos cenários de UI conferem cadastro com/sem entrada
  e descrição, Enter repetido/clique duplicado, exatamente uma venda por navegação
  interna, descarte na recarga, prévia/erros/foco e cancelamento nos dois temas.
- `npm.cmd run build`: saída 0, 506,89 kB iniciais/98,73 kB estimados; novo aviso
  do budget de 500 kB excedido em 6,89 kB, sem aumentar budget. Aviso Sass mantido.
- `npm.cmd run format:check`: saída 0.

Edição, recebimento, verificação visual completa/zoom nativo e regressão final
continuam pendentes. Sem avaliação de produto, aceite, sync/archive ou PR antecipado.

### Edição restrita verificada — tarefas 3.1 a 3.3

Página lazy `/vendas/:id/editar` consulta o ID completo por `paramMap`. Rascunho
independente contém somente os quatro campos do cliente, reinicializado ao mudar
ID; nenhum controle financeiro desabilitado ou editável. Identificação reutiliza
o componente já consumido pelo cadastro. Editar nas duas tabelas e detalhe usa
segmentos Router, nome acessível com cliente/ID e identidade lógica de foco.
Contexto de origem é enum interno validado (abertas/quitadas/detalhe), não URL
arbitrária. Cancelar retorna ao contexto ou, sem contexto válido, ao detalhe;
registro ausente oferece Vendas/Quitadas e nenhum formulário. Sucesso exige
resultado de negócio aceito, anuncia e abre detalhe; erros/exceções preservam
rascunho e permitem retry. Envio inválido revela erro e foca o campo.

Verificações reais em 18/11/2026, mesmo ambiente Windows/Angular/Chromium:

- `npm.cmd test -- --watch=false`: saída 0, 329/329 em 24 arquivos. Dez casos novos
  cobrem troca/ausência de ID com barras, nenhuma publicação ao digitar, quatro
  situações financeiras, comparação profunda de finanças/resumos/outras vendas
  inclusive CPF repetido, descrição vazia, erros, exceção/retry e cancelamento.
  Integração existente de reatividade de busca/lista/detalhe permanece aprovada.
- `npm.cmd run test:e2e`: saída 0, 46/46 em 1366×768 e 390×844, servidor próprio
  em 4200. Novos percursos editam aberta e quitada via ações reais, corrigem CPF,
  preservam bloco financeiro visível, pesquisam novos dados e conferem retorno/foco
  ao cancelar a partir de detalhe e das duas listas, sem recarregar a sessão.
- `npm.cmd run build`: saída 0; 507,04 kB iniciais/98,78 kB estimados; aviso de
  budget excedido em 7,04 kB e Sass, sem alterar limites ou dependências.
- `npm.cmd run format:check`: saída 0.

Asserções históricas evoluídas somente para Editar: três links por linha com
destino correto e teclado até Editar, voltando por Shift+Tab a Visualizar para
conservar o percurso de detalhe. Exportação, indicadores nas listas e ações de
Visão Geral/Relatórios continuam ausentes. Recebimento, visual/zoom e regressão
final ainda pendentes; sem PR antecipado ou aceite da ótica.

### Recebimento em andamento — pausa nas verificações browser

Implementação parcial das tarefas 4.1–4.3: encapsulamento de dialog com `showModal`,
título associado, cancel/close e descarte no desmonte; foco inicial e callback de
restauração pós-render para Receber/título de Parcelas. Formulário usa snapshot
das pendências na abertura, quantidade do prefixo, soma/IDs capturados e campos
valor/data/forma. Revalida pelo adaptador/domínio e comando da fonte, fecha somente
após sucesso, preserva rascunho em erro e não desloca seleção obsoleta. Detalhe
oferece Receber somente com saldo; nenhum plugin Bootstrap/CDK ou regra nova.

`npm.cmd test -- --watch=false`: saída 0, 339/339 em 25 arquivos. Dez casos novos
cobrem ciclo de vida com doubles de dialog (sem alegar top layer do jsdom), campos
iniciais, erros/foco, lote antecipado e quitação com resumos, repetição, falha/
exceção/retry, seleção obsoleta, cancelamento/close/desmonte sem publicação.

`npx.cmd playwright test formularios-vendas.spec.ts`: saída 1, 10/14 aprovados.
Falhas nos dois viewports (1366×768 e 390×844):

- Fluxo de recebimento alcançou quitação, foco no título e ausência na coleção
  aberta, mas o seletor global do link Quitadas encontrou dois links (menu e main).
  A conferência final em Quitadas ainda não terminou. Correção proposta: escopo
  explícito em main, sem alterar produto nem asserções de quitação.
- Teste de modalidade confirmou `:modal` e foco inicial, mas o laço de Tab/Shift+Tab
  encontrou foco fora do dialog. Causa ainda não diagnosticada; não comprova
  contenção correta nem autoriza relaxar o critério. Cancelamento/Escape/reabertura
  nos dois temas desse teste ainda não foram alcançados.

Traces/capturas locais em `test-results/`, ignorados pelo Git. Apply pausado para
orientação conforme fluxo, sem marcar tarefas 4.1–4.3, commit funcional ou PR.
Build/formatação global e regressão integrada após recebimento não executados;
evidências anteriores pertencem aos commits de cadastro/edição. Progresso 8/15.

### Diagnóstico autorizado do modal e nova regressão

Diagnóstico browser instrumentado confirmou foco em BODY após Tab de índice 9,
apesar de `:modal` verdadeiro. Mantido `showModal`; acrescentada ciclagem explícita
de Tab/Shift+Tab entre primeiro/último controles visíveis habilitados no wrapper,
sem tabindex no dialog, CDK, relaxamento de teste ou mudança financeira. Seletor
Quitadas restrito a main. Reexecução dirigida passou 14/14 (saída 0), comprovando
modalidade/foco/cancelamento/Escape/reabertura em ambos os temas/viewports.

Ampliado o fluxo de quitação para os dois temas e acrescentada integração de entrada

- lote, com comparação dos resumos sem dupla contagem. Novas execuções reais:

* `npm.cmd test -- --watch=false`: saída 0, 340/340 em 25 arquivos.
* `npm.cmd run build`: saída 0, 509,14 kB iniciais/99,45 kB estimados; avisos
  Sass e budget excedido em 9,14 kB, budgets mantidos.
* `npm.cmd run format:check`: saída 0.
* `npm.cmd run test:e2e`: saída 1, 49/50. Todos os cenários novos de cadastro,
  edição, recebimento, quitação, modal/teclado e retorno de foco passaram nos dois
  viewports. Falhou o cenário histórico de contraste em mobile, dark/Parcelas
  abertas: a medição encontrou label de busca da lista (razão 1:1), embora o
  snapshot final já mostre o detalhe. O teste aguarda badge "Aberto" genericamente
  após clicar detalhe; essa condição pode coincidir ainda na lista, antes de
  terminar a navegação. Hipótese de corrida de sincronização, não comprovada como
  correção nem dispensa do requisito de contraste. Trace/captura em test-results.

Tarefas 4.1/4.2 verificadas; 4.3 permanece aberta pela regressão afetada e commit
pendente. Apply pausado conforme fluxo para orientação sobre investigar/sincronizar
o teste histórico, mantendo os mínimos de contraste e repetindo a suíte completa.

### Recebimento verificado — fechamento incremental 4.3

Após autorização, o teste histórico aguarda título e região exclusivos do detalhe
antes de localizar o selo e medir contraste. Sem sleeps/retries, alteração de cores
ou redução de mínimos. `npm.cmd run test:e2e` completo repetido: saída 0, 50/50.
Contraste das consultas/parcelas voltou a medir mínimos 4,53:1/4,69:1 nos dois temas
e viewports; isso não substitui a medição específica de todos os novos formulários.

O recebimento agora tem evidência browser de prefixo único/lote antecipado, valor
divergente/data/forma, pagamento repetido, quitação, retirada de abertas/inclusão
única em Quitadas, histórico visível e mesmo ID por navegação interna. Foco retorna
a Receber ou ao título de Parcelas após quitação; Escape/Cancelar descartam, reabrir
inicia limpo. Os cenários de quitação/cancelamento percorrem dark/light e ambos os
viewports. Mantidos 340 unitários/componentes, build e formatação aprovados conforme
execuções imediatamente anteriores; a única alteração posterior foi sincronização
de teste E2E. Tarefas visuais/zoom e regressão final continuam pendentes; sem PR.

### Verificação das consultas — regressão visual detectada

`npm.cmd run test:e2e:paginacao-fixture` executado após o commit de recebimento:
saída 1, 7/8 aprovados. Cenário desktop de dez vendas falhou com rodapé em
849,52 px para viewport de 768 px. Captura revista: Editar aumentou a largura
necessária das ações, estreitando Cliente e quebrando nomes de registros sintéticos
em duas linhas. Regressão real de densidade, não tratada como aceite. Proposta de
correção: evitar quebra dos nomes/ações da tabela compacta, preservando fonte e
conteúdo; eventual excesso horizontal fica na região rolável já existente. Ainda
não aplicada; apply pausado para orientação conforme fluxo.

Os outros sete cenários passaram, incluindo teclado/paginação, dez parcelas e
excedentes nos dois temas/viewports. Detalhe com dez parcelas no desktop mantém
última parcela em 732,86 px, tabela em 764,75 px e documento de 768 px. No mobile,
documento da lista de 2357 px e largura 390 px sem overflow horizontal global;
detalhe com dez parcelas de 1733 px/390 px. Fixture é isolada, sem mudar seed ou
introduzir hooks de produção. Tarefas 5.1/5.2 e regressão final continuam abertas;
progresso 11/15, sem PR antecipado.

### Compatibilidade das consultas e densidade corrigida — tarefa 5.1

Após autorização, tabela compacta mantém nomes, cabeçalhos e ações sem quebra,
com excesso horizontal restrito à região acessível existente, sem reduzir fonte,
esconder colunas/dados ou mudar paginação. A primeira iteração só nos nomes/ações
trouxe rodapé à tela, mas documento de 770 px; incluir cabeçalhos restaurou 768 px.
Reexecução completa de `npm.cmd run test:e2e:paginacao-fixture`: saída 0, 8/8.
Nos dois temas desktop: dez linhas até 629,77 px, rodapé 730,27 px, documento 768 px,
controles alinhados (diferença 0); no mobile, documento 1591 px e largura 390 px,
sem overflow horizontal global. Dez parcelas continuam no desktop até 732,86 px,
região 764,75 px, documento 768 px. Capturas automáticas locais revistas na etapa
visual, não confundidas com zoom nativo.

Asserções históricas evoluídas nos commits funcionais somente para ações entregues:
Editar tem destino/ID correto; Receber existe em abertas e não em quitadas;
consulta ainda não publica. Exportação, indicadores globais nas listas e ações
comerciais de Visão Geral/Relatórios continuam ausentes. Regressões executadas
até aqui: 340 unitários/componentes e 50 E2E da aplicação aprovados, com nome/
CPF/telefone parciais, datas, filtros, IDs opacos e paginação; teste de redução da
coleção após quitação e ajuste de última página permanece aprovado na suíte.
Seed de 12 vendas, alvo isolado da fixture e ausência de hooks globais preservados.
Regressão final após todos os ajustes ainda será executada; zoom nativo e medição
completa dos formulários continuam pendentes na tarefa 5.2, sem PR antecipado.

### Tarefa 5.2 — medição dos novos formulários em andamento

Acrescentado teste browser de contraste/overflow/capturas para cadastro com erros,
prévia de 24 parcelas, edição e modal com seleção extensa, nos dois temas/viewports.
Erros usam token `text-danger-emphasis`; controles novos recebem borda com token
secundário e outline explícito de 3 px nos estados focus-visible, sem mudar fonte.
Esses ajustes/testes ainda não têm commit nem verificação global posterior.

`npx.cmd playwright test acessibilidade-formularios.spec.ts`: saída 1, 0/2 cenários
completos. No escuro, as quatro etapas medidas superaram 4,5:1 de texto (mínimo
4,5008:1) e 3:1 de bordas (mínimos 3,3866–3,4275:1), sem overflow horizontal do
documento. Prévia/lista de 24 parcelas têm scroll interno operável por teclado;
outline do campo inválido medido em 3 px. No claro, cadastro com erros falhou por
borda abaixo de 3:1 (1,5243:1 desktop, 1,4454:1 mobile). O estilo de foco do
Bootstrap ainda pode prevalecer sobre a borda base; medições também devem observar
estado estável em vez de transição de tema. Diagnóstico/correção ainda não
concluídos, sem reduzir mínimos ou declarar acessibilidade aprovada. Apply pausado
para orientação; tarefa 5.2 continua aberta, progresso 12/15. Zoom nativo 200%
não executado nem substituído por CSS zoom; sem regressão final ou PR.

### Contraste corrigido e regressão posterior (ainda não concluída)

Após autorização, bordas dos controles preservam token secundário também em foco;
botões novos preservam a borda contrastante em hover/active/foco. Medição usa
movimento reduzido para observar estado estável, sem sleeps ou diminuir mínimos;
incluída asserção de contraste do outline. Duas execuções dirigidas posteriores
passaram 2/2: texto mínimo 4,5008:1, bordas mínimas dark 7,2920:1/light 6,7811:1,
foco medido pelo menos 3:1 e outline de 3 px nos campos inválidos. Capturas salvas
explicitamente em `test-results/.../*.png`; revistas capturas de prévia/modal/
erros, desktop/mobile e ambos os temas. Conteúdo extenso permanece rolável, sem
overflow horizontal global. A primeira repetição com movimento reduzido revelou
também borda do botão em hover de 2,3960:1; corrigida nos mesmos estados, mantendo
as asserções. Isso não comprova zoom nativo ou acessibilidade integral.

Regressão após os ajustes: build saída 0, 510,89 kB iniciais/99,58 kB estimados
(Sass e budget excedido em 10,89 kB; limites inalterados); unitários/componentes
340/340 em 25 arquivos, saída 0. `format:check` saiu 1 apenas em README.md atualizado.
E2E completo saiu 1, 50/52: novos cenários de contraste passaram, mas fluxo de
recebimento desktop viu quatro quitadas em vez de uma após preencher busca (indício
de preenchimento no campo antigo durante a navegação); cenário histórico mobile
mediu hover de Limpar pesquisa em Quitadas a 3,9560:1 (possível transição ainda
ativa). Sem assumir correção: aguardando orientação para sincronizar os campos
por destino, medir hover estável e normalizar README, preservando asserts.

Progresso 12/15; ajustes visuais ainda sem commit. Zoom nativo, fechamento da
regressão e conciliação final continuam pendentes, sem PR antecipado.

### Regressão integrada aprovada — tarefa 6.1, zoom ainda pendente

Após autorização, o preenchimento da pesquisa após entrar em Quitadas usa
`#busca-vendas-quitadas`, evitando o campo ainda montado de Vendas. Medição
histórica de hover usa movimento reduzido, como os testes novos, sem sleeps,
retries ou mudanças nos mínimos. README normalizado pelo Prettier. Os novos
arquivos E2E agora verificam console/pageerror explicitamente em cada cenário.

Execuções reais posteriores, em Windows/Node 24.21.0/npm 11.19.0, Angular
22.2.6 e Chromium do Playwright, viewports 1366×768 e 390×844:

| Comando em frontend/                     | Resultado                                        |
| ---------------------------------------- | ------------------------------------------------ |
| `npm.cmd run format:check`               | Saída 0                                          |
| `npm.cmd run build`                      | Saída 0, 510,89 kB iniciais/99,58 kB estimados   |
| `npm.cmd test -- --watch=false`          | Saída 0, 340/340 em 25 arquivos                  |
| `npm.cmd run test:e2e`                   | Saída 0, 52/52, sem console/pageerror inesperado |
| `npm.cmd run test:e2e:paginacao-fixture` | Saída 0, 8/8                                     |

Runners iniciaram/encerraram seus servidores em 4200/4301; nenhum processo alheio
encerrado. Avisos mantidos: Sass `@import`, prebundling da fixture e bundle inicial
10,89 kB acima do aviso de 500 kB (abaixo do erro de 1 MB); budgets inalterados.
Inspeção de produção não encontrou storage, cookies, HTTP de negócio ou exportação;
fluxos usam fonte em memória e dados de teste sintéticos, sem dados reais. Testes
de recarga e isolamento preservados. Auditoria não é certificação de segurança.

Capturas revistas de lista dark/light desktop e formulários/prévia/modal nos dois
viewports: densidade de consulta restaurada, erros legíveis, foco explícito e
rolagem interna para excedentes. A medição de formulários usa texto mínimo de
4,5008:1, bordas dark 7,2920:1/light 6,7811:1 e foco pelo menos 3:1 nos estados
exercitados; não é auditoria integral de acessibilidade. Zoom nativo de 200% ainda
não executado pelo agente nem relatado pelo solicitante para estes fluxos novos.
Logo, tarefa 5.2 continua aberta; regressão automatizada não encerra esse critério.
Conciliação final e PR aguardam essa evidência; PEN-013/014/HIP-006 seguem abertos.

### Zoom nativo — relato manual do solicitante, 18/11/2026

Após iniciar servidor local próprio com `npm.cmd start` em 127.0.0.1:4200,
fornecido roteiro pelo Harness para zoom nativo de 200% pelo menu do navegador:
Vendas/Quitadas, cadastro e prévia de 24 parcelas, edição e modal de recebimento,
nos temas escuro e claro; conferir textos, erros, foco, Tab/Shift+Tab, Escape,
rolagem e acesso às ações. O solicitante respondeu **“Sem problemas observados”**
à pergunta sobre o roteiro completo: fluxos legíveis e operáveis, sem cortes ou
controles inacessíveis. Ambiente de trabalho Windows; navegador/versão e dimensões
exatas da janela dessa execução não foram informados. O agente não operou nem
mediu independentemente o zoom; evidência é relato manual, separado das capturas
Chromium automatizadas em 1366×768/390×844. Não houve CSS zoom como substituto.

Essa evidência complementa as medições e capturas descritas acima e encerra o
recorte técnico da tarefa 5.2, não a avaliação/aceite da ótica. PEN-013/014 e
HIP-006 permanecem abertas. Nenhum código alterado após a regressão aprovada de
340 testes, 52 E2E e 8 E2E da fixture; somente conciliação documental posterior.

### Conciliação final da Change — tarefa 6.2

Revisados PRD 1.8/RF-004/005/006/007/008/011, RN-011–023 e critérios referidos na
proposta, TDD 1.12/DEC-004/005/007/010/015/016/018/019 e deltas contra as specs
principais. As cinco deltas acrescentam os fluxos comerciais e substituem somente
as proibições históricas da UI somente leitura; as regras financeiras/sequenciais
continuam as existentes. Nenhuma spec principal sincronizada ou Change arquivada.
PRD/TDD e proposal/design/tasks conciliados com a implementação/evidências reais,
mantendo IDs e pendências de avaliação. Todo o escopo das 15 tarefas verificado
antes da preparação do PR único; aprovação/merge ainda não realizados.

Validações posteriores à conciliação: `openspec validate fase-006 --strict`,
`openspec validate --all --strict` (oito itens), `git diff --check` e
`npm.cmd run format:check`, saídas 0. Avisos Git somente de conversão LF/CRLF nos
documentos fora de frontend. Conferidos os commits separados por funcionalidade
contra `origion/main`, sem alterações alheias ou atualização financeira/seed.

Reexecução final na mesma data, antes do commit documental e do PR, sem alteração
de código desde a regressão acima: `format:check` 0; `build` 0 (510,89 kB, mesmos
avisos Sass/budget); `test -- --watch=false` 340/340 em 25 arquivos; `test:e2e`
52/52 após liberar a porta 4200 ocupada por servidor `ng serve` alheio ao runner
(encerrado a pedido do solicitante); `test:e2e:paginacao-fixture` 8/8. Servidores
dos runners iniciados e encerrados próprios, sem matar processos de terceiros.
Não executados: avaliação/aceite com a ótica, metas de desempenho de produto,
tecnologia assistiva, outros navegadores/sistemas, auditoria de segurança ou
homologação operacional. Versão/janela do navegador no relato de zoom não
informadas; não inferidas a partir do Chromium automatizado.

### Consolidação documental e archive — sincronização das specs

Após autorização explícita no Harness em 18/11/2026, a entrega documental foi feita
em `docs/atualizar-documentacao-fase-006`, criada a partir da `feature/fase-006`.
As cinco deltas foram sincronizadas em `openspec/specs`: `consulta-vendas`,
`estado-demonstrativo` e `navegacao-aplicacao` tiveram requisitos modificados,
`recebimentos-parcelas` recebeu os requisitos visuais de lote, modal acessível e
quitação, e a nova capability `formularios-vendas` registra cadastro e edição.
A Change foi movida para `openspec/changes/archive/2026-11-18-fase-006/`, com
artefatos completos e 15/15 tarefas. PRD 1.9 e TDD 1.13 apenas conciliam estado e
rastreabilidade e atualizam o roadmap; requisitos, IDs, decisões e pendências de
avaliação não mudaram.

Validações reais desta etapa: `openspec validate --specs --strict` e
`openspec validate --all --strict` com oito specs aprovadas (nove itens antes do
archive, incluindo `change/fase-006`); `git diff --check` sem erros; e
`npm.cmd run format:check` com saída 0 após as edições. Nenhum teste de aplicação,
build ou E2E foi reexecutado nesta consolidação; as evidências de regressão acima
permanecem as últimas execuções reais, sem alteração de código desde então.
Revisão, PR único e merge da FASE-006 continuam pendentes; não há aceite da ótica,
conclusão da FASE-007/008 ou alteração de PEN-013/014/HIP-006.

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

#### Apply — identificação e edição interna — 18/11/2026

Pedido explícito de apply da Change `decisoes-edicao-identificacao-avaliacao`,
em `feature/edicao-identificacao-vendas`, partindo da `main` limpa e alinhada a
`origion/main` (`e12d360`). Reutilizados PRD 1.8/RN-021/022/023, CA-007/012/016/017/030
e TDD 1.12/DEC-019; sem nova regra de produto, UI comercial ou avaliação.

Identificação compartilhada em `identificacao.validacoes.ts`: CPF com verificadores
e rejeição de sequências repetidas; telefone 10/11 dígitos sem +55 ou tabelas externas.
Cadastro normaliza somente formatação permitida e continua aceitando CPF repetido.
O seed e as fixtures usam números gerados deterministicamente, sem coleta ou cópia
de pessoas. Validade matemática **não garante inexistência de titular**. Mantidos
12 registros iniciais, namespaces, valores, datas e política de calendário anterior.
A busca continua parcial, sem exigir validação de campo completo.

Verificações incrementais de 1.1/1.2 em `frontend/`:

- `npm.cmd test -- --watch=false`: 241/241 testes, 19 arquivos, saída 0. A primeira
  execução encontrou uma fixture de CPF inválido num teste de busca (239 passaram,
  1 falhou); corrigida para identificação sintética compatível, mantendo cobertura
  de pontuação/substring. Os testes do seed cobrem determinismo, isolamento e bordas.
- `npm.cmd run build`: saída 0, 491,36 kB iniciais/94,80 kB estimados. Aviso
  preexistente de depreciação Sass `@import`, sem mudança de dependências.
- `npm.cmd run format:check`: saída 0.
- `npm.cmd run test:e2e`: 36/36; `npm.cmd run test:e2e:paginacao-fixture`: 8/8,
  ambos com saída 0, Chromium em 1366×768 e 390×844. Primeiro E2E bloqueado
  por servidor preexistente na porta 4200; retomado após liberação pelo usuário,
  sem encerrar processo alheio ou alterar configs. Servidores próprios dos runners.
  Fixture mantém aviso de prebundling desativado por otimização. Regressão final
  será repetida depois da edição interna.

Contrato `ComandoEdicaoCliente`: somente `vendaId` e bloco de cliente com
nome/CPF/telefone/descrição opcional. `prepararEdicaoCliente` seleciona por ID,
revalida identificação e copia a venda atual, substituindo exclusivamente cliente;
não chama cadastro nem regenera parcelas. Campos extras financeiros/temporais
não têm efeito. Preparação aceita vendas sem entrada, com entrada, parcialmente
pagas e quitadas, sem propagação por CPF ou compartilhamento de rascunhos/histórico.
Verificação incremental de 2.1: `npm.cmd test -- --watch=false`, saída 0,
255/255 testes em 20 arquivos; 14 novos casos puros de edição, incluindo comparação
profunda do histórico/projeções/resumo, descrição, identificação inválida, ausência
e falha inesperada.

`ServicoDemonstracao.editarCliente` integra a preparação por adaptador sem estado,
seguindo a fronteira existente de recebimento. Copia o comando, valida o agregado
completo antes de publicar e congela resultado/estado com um único `set`. Não há
publicação em ausência, validação ou falha; nova tentativa é independente. Como nos
outros comandos da sessão, o contador só avança após sucesso. Nenhuma rota, formulário,
botão ou dependência foi acrescentada. Context7 Angular consultado para DI/TestBed
e atualização reativa com `whenStable`.

Verificação incremental de 2.2 em `frontend/`: `npm.cmd test -- --watch=false`
aprovou 265/265 testes em 21 arquivos; `npm.cmd run build` passou (492,50 kB
iniciais/94,95 kB estimados; aviso Sass preexistente); `npm.cmd run format:check`
passou. Cobertura de serviço compara todas as situações financeiras, rascunhos,
campos extras ignorados, CPF repetido, congelamento, falha de preparação e agregado
inválido sem mutação/consumo de ID. Integração DOM verifica lista/detalhe/busca
reativos, quitadas, fonte mantida entre rotas, resumo invariável e uma atualização
por edição aceita, nenhuma para comandos rejeitados.

Regressão integrada final de 3.1 em 18/11/2026: Windows, Node 24.21.0, npm
11.19.0, Chromium do Playwright 158.0.8127.18, viewports CSS técnicos 1366×768
e 390×844. As execuções abaixo são desta implementação, não evidências herdadas:

| Comando em `frontend/`                   | Resultado                                      |
| ---------------------------------------- | ---------------------------------------------- |
| `npm.cmd run format:check`               | Saída 0                                        |
| `npm.cmd run build`                      | Saída 0; 492,50 kB iniciais/94,95 kB estimados |
| `npm.cmd test -- --watch=false`          | Saída 0; 265/265, 21 arquivos                  |
| `npm.cmd run test:e2e`                   | Saída 0; 36/36                                 |
| `npm.cmd run test:e2e:paginacao-fixture` | Saída 0; 8/8 após correção de sincronização    |

A primeira regressão final da fixture teve 7 aprovados/1 falha móvel. O trace
confirmou `fill` no campo antigo `#busca-vendas` antes da rota Quitadas: corrida
de navegação no teste, não falha de filtragem. Após autorização explícita no Harness,
os dois preenchimentos após esse destino usam `#busca-vendas-quitadas`, sem sleeps,
retries, mudança de aplicação ou relaxamento de asserções. Context7 Playwright
consultado; suíte completa repetida com 8/8. Os runners administram seus próprios
servidores. Capturas/geometrias são artefatos locais ignorados em `test-results/`.

Regressão cobre nome/dígitos parciais/data, abertas/quitadas, IDs opacos, paginação,
detalhe, temas, contraste, teclado/foco e UI sem ações de negócio fictícias.
Avisos preexistentes: Sass `@import` e prebundling da fixture. Não executados:
avaliação/aceite com a ótica, metas de desempenho/15 vendas, zoom nativo manual,
outros navegadores/sistemas e auditoria de dependências. Não há UI de edição para
avaliar modal/Escape/cancelamento visual. PEN-013/014 e HIP-006 continuam pendentes;
versão do Chromium automatizado não equivale à coleta do Chrome da avaliação.

Rastreabilidade final de 3.2: PRD/TDD receberam acompanhamento de implementação,
sem alterar regras ou IDs, distinguindo núcleo entregue na feature da UI futura.
Proposta/desenho preservam o histórico documental do PR #13 e registram o apply
posterior autorizado. Deltas mantidas sem sync/archive. Na raiz,
`openspec validate decisoes-edicao-identificacao-avaliacao --strict` passou e
`git diff --check` passou com avisos de normalização LF/CRLF. Nenhuma mudança
financeira, avaliação ou aprovação de PEN-013/014/HIP-006 foi incluída.

#### Decisões de produto — PRD 1.8 / TDD 1.12 (registro histórico de planejamento)

Após perguntas e aprovação explícita no Harness, foram definidos RN-021/022/023,
CA-012/030 e DEC-019: após cadastro, somente nome, CPF, telefone e descrição serão
editáveis, inclusive em quitadas e apenas na venda selecionada. Data da venda,
total, entrada, parcelamento e pagamentos não serão editáveis. Cadastro/edição
exigirão CPF com 11 dígitos, verificadores e rejeição de sequências repetidas, sem
unicidade, e telefone BR de 10/11 dígitos incluindo DDD, com espaços/parênteses/hífen
permitidos e sem +55, lista de DDDs ou regras de prefixo. Sem serviços externos.

As novas regras e a substituição dos marcadores CPF-DEMO/TEL-DEMO por números
sintéticos compatíveis ficam planejadas para a FASE-006; não foram implementadas
neste PR. A Change `openspec/changes/decisoes-edicao-identificacao-avaliacao/`
contém proposta, desenho, três deltas e tarefas futuras desmarcadas. Ela prepara
regras internas/seed, não entrega nem autoriza toda a UI da FASE-006. As specs
principais e o código continuam descrevendo/implementando a entrega anterior.

Ambiente de avaliação definido: máquina do solicitante, i7-1165G7, 16 GB RAM,
placa gráfica informada como 128 MB (sem inferir modelo ou memória total), SSD
954 GB; Windows 11 Home 10.0.26200/build 26200 observado por consulta local;
Chrome com versão a registrar, tela 1920×1080, escala Windows **125%** e zoom
Chrome 100%. Coletar viewport CSS real na execução; não equiparar resolução física
aos testes Chromium em 1366×768/390×844 nem substituir CA-028. Não é ambiente de
produção ou homologação concluída.

PEN-008/010 resolvidas como decisões, ainda sem implementação. PEN-013 permanece
parcial por versão Chrome/viewport/medições; PEN-014 prevê solicitante e equipe da
ótica, mas mantém papéis/autoridade, quantidade/consentimento, metas e confirmação
das entrevistas reconstruídas em aberto. MET-001 a MET-005 e HIP-006 (300 ms/15
vendas) permanecem para discussão, não aprovadas nem medidas. Este registro não
autoriza código, alteração do seed, apply, avaliação ou merge.

Verificações desta revisão documental: na raiz,
`openspec validate decisoes-edicao-identificacao-avaliacao --strict` passou;
`openspec validate --all --strict` aprovou sete specs e a nova Change (8 itens).
`openspec status --change decisoes-edicao-identificacao-avaliacao` confirmou 4/4
artefatos de planejamento e `openspec list --json` confirmou 0/6 tarefas executadas.
`git diff --check` passou com avisos LF/CRLF; `npm.cmd run format:check` em
`frontend/` passou. Revisado PRD → TDD → deltas → desenho/tarefas, com conferência
do diff sem alterações em código, testes, dependências ou specs principais.
Não executados instalação, build, testes unitários/componentes/E2E, novas medições,
revisão visual ou avaliação com a ótica, por ser entrega exclusivamente documental.

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

## Apply `novo-design` — demais módulos e estados — tarefa 4.3 — 22/11/2026

Nos módulos existentes, os rótulos dos quatro indicadores da Visão Geral ganharam
ênfase tipográfica; os três resumos, ordem, links e limites foram preservados. As
quatro tabelas de Relatórios agora compartilham painel com borda semântica e recorte
arredondado, conservando fonte 18 px, paddings, valores, filtros temporais e
rolagem horizontal interna. Configurações mantém suas quatro explicações, agora com
divisória sob o título. Estados vazios e ausentes usam superfície neutra, raio de
12 px e padding uniforme, sem alterar texto, retornos, foco ou semântica.

Comparação com `../references/mercadao_oculos_dashboard_light.html` e
`../references/mercadao_oculos_dashboard_dark.html`: os protótipos apresentam uma
Visão Geral de duas listas e indicadores compartilhados em Relatórios; o código atual
tem quatro indicadores e três resumos na Visão Geral, e quatro tabelas de consultas
reais da demonstração em Relatórios. As referências também propõem exportar CSV e
preferências de unidade/tema/modo em Configurações; esses controles/conteúdos não
foram copiados. A exportação continua explicitamente indisponível, sem download,
rede ou mutação. Foram preservados o tema e os textos explicativos atuais. Inter,
CDN, ícones remotos e outros dados/ações fictícios do mockup não foram introduzidos.

Resultados reais:

- Testes unitários direcionados de Visão Geral e Relatórios: **17/17 em 4 arquivos**.
- E2E direcionados a indicadores/resumos, quatro tabelas, capturas de Configurações
  e exportação indisponível: **10/10** nos projetos Chromium 1366×768 e 390×844,
  incluindo ambos os temas.
- Estados auxiliares (página/registro ausente e pesquisa sem resultados), com
  leitura, retorno por teclado e temas claro/escuro: **2/2 E2E**; componentes
  próximos de listas, detalhe e edição: **27/27 unitários**.
- Prettier direcionado e `git diff --check`: aprovados. Como a porta padrão 4200
  estava ocupada, os E2E deste grupo usaram servidor isolado na porta 4304; a
  configuração temporária foi removida e o servidor preexistente não foi encerrado.

Capturas e medições Playwright são artefatos locais em `frontend/test-results/`, não
versionados; não equivalem a inspeção manual de zoom ou aceite visual. O grupo não
altera dados, fórmulas, navegação, número de tabelas, explicações nem disponibilidade
funcional da exportação.

## Apply `novo-design` — detalhe, edição e recebimento — tarefa 3.3 — 22/11/2026

O PNG `../references/a_detailed_ui_screenshot_of_a_sales_detail_page_fo.png` orientou
a hierarquia dos blocos de cliente/venda, valores tabulares, divisórias e lista de
parcelas. A implementação mantém a página de detalhe, a entrada separada, todos os
campos e histórico, tabela de 18 px e ação individual somente na primeira parcela
elegível. Não foram copiadas a busca global, métricas/ações fictícias, ações em todas
as parcelas, seleção de lote ou modal de detalhes. Edição permanece limitada aos
quatro campos de cliente; o modal nativo de pagamento preserva contratos, sequência,
validação, cancelamento e retorno de foco. O refinamento acrescenta respiro compacto
aos blocos, superfície semântica à entrada, acabamento da tabela, painel de edição e
ênfase tipográfica nos rótulos do recebimento.

Medições reais da fixture de dez parcelas, nos temas claro/escuro:

| Viewport | Documento (largura × altura) | Blocos cliente/venda               | Última parcela / painel     | Tabela                                         |
| -------- | ---------------------------- | ---------------------------------- | --------------------------- | ---------------------------------------------- |
| 1366×768 | 1366 × 768 px                | ambos iniciam em 149 px            | base em 753,5 px / 754 px   | fonte 18 px; dados 10×4 px e cabeçalho 10×8 px |
| 390×844  | 390 × 2031 px                | cliente em 511 px; venda em 746 px | base em 1806,5 px / 1807 px | fonte 18 px; dados 10×4 px e cabeçalho 10×8 px |

No desktop, dez parcelas e a página inteira permanecem no limite de 768 px, sem
rolagem vertical global; no mobile, a rolagem vertical é esperada e a largura não
excede 390 px. O primeiro ajuste de espaçamento excedeu o limite desktop (documento
781,5 px); a densidade foi recalibrada e a execução final mediu 768 px. O cenário de
mais de dez parcelas permaneceu em região interna rolável e operável por teclado.

Verificações reais desta tarefa:

- `npx ng test vendas-em-aberto --watch=false --include src/app/funcionalidades/vendas/detalhes-venda/detalhes-venda.spec.ts --include src/app/funcionalidades/vendas/editar-venda/editar-venda.spec.ts --include src/app/funcionalidades/parcelas/registrar-pagamento/registrar-pagamento.spec.ts`:
  **29/29 testes em 3 arquivos**.
- E2E de detalhe, pagamento individual e edição nos projetos Chromium 1366×768 e
  390×844: **8/8**; inclui erro de validação, pagamentos sequenciais/quitação e
  preservação das finanças ao cancelar edição.
- E2E do modal nativo, cancelamento por botão/Escape, contenção e retorno de foco:
  **2/2** nos dois viewports.
- `paginacao-fixture.spec.ts`, dez parcelas e excedentes roláveis: **4/4** nos dois
  viewports/temas; fonte, padding, largura documental e limite desktop conferidos.
- Prettier direcionado e `git diff --check`: aprovados.

As capturas e sidecars gerados estão localmente em `frontend/test-results/` e não são
versionados; documentam execução automatizada, não substituem zoom nativo ou aceite
visual. Não houve inspeção manual de zoom nesta tarefa. O resultado do grupo não
representa a regressão integrada nem a conclusão da Change.
## Apply `empilhar-links-sidebar` — coleções em linhas verticais — 24/11/2026

Quitadas, Inativas e Prejuízo agora estão agrupadas em um contêiner flexível
vertical sob Vendas. A ordem DOM, destinos, foco e indicação de rota atual foram
preservados.

Verificações reais direcionadas:

- E2E de navegação por teclado e empilhamento geométrico: **4/4** nos projetos Chromium 1366×768 e 390×844; o novo cenário conferiu os dois temas.
- Prettier direcionado ao template e ao E2E: aprovado.
- `npm.cmd test -- --watch=false`: **416/416 testes em 33 arquivos**; `npm.cmd run build`: aprovado; `openspec validate empilhar-links-sidebar --strict`: válido.
- `npm.cmd run format:check` não passou porque `README.md` não está formatado; a mesma checagem falha no `frontend/README.md` da revisão base (`HEAD`). O trecho adicionado foi revisado e o restante do arquivo não foi reformatado para evitar alterações alheias.
- A primeira execução com a configuração padrão não iniciou porque a porta 4200 já estava ocupada. Não encerramos o servidor preexistente; a suíte direcionada passou usando servidor isolado na porta 4305 e configuração temporária removida após a execução.

Refinamento visual posterior: o grupo usa `gap-2` (8 px) entre os links; cada link recebeu SVG inline de 16 px com check, pausa e alerta, todos decorativos e ocultos à tecnologia assistiva. E2E mediu ordem, separação mínima de 7 px, alinhamento dos ícones, nomes acessíveis e atributos decorativos nos dois temas e viewports. A suíte de navegação serial passou **4/4**; a suíte unitária passou **416/416** em 33 arquivos; build, Prettier direcionado, `git diff --check` e `openspec validate empilhar-links-sidebar --strict` passaram. Uma execução paralela anterior teve falha intermitente no teste preexistente de teclado/ordenação mobile; a repetição isolada e a regressão serial passaram.

## Apply `feedback-luighi` — coleções e reconciliação por status — 24/11/2026
