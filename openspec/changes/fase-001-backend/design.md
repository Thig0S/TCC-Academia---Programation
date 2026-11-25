# Design

## Context

Ver `proposal.md`, PRD/FON-036/RF-021/022/CA-044/045 e TDD/DEC-033. A inspeção
encontrou somente `frontend/` como aplicação, `app.config.ts` sem cliente HTTP de
dados e workflow exclusivo de Pages. `ServicoDemonstracao` mantém o estado em
memória; a nova API não será seu substituto nesta fase.

`dotnet --info` informou SDK 10.0.103/ASP.NET Core 10.0.3 no Windows x64. Não há
solução C# ou configuração de SDK versionada. PRD/FON-035 confirma equipe única,
uso local offline e ausência de autenticação de usuários. O inventário da planilha
expõe ambiguidades de migração, mas nenhum dado será lido pelo backend desta fase.

O desenho se aplica porque introduz arquitetura e dependências novas e define
limites de rede antes da implementação. A inspeção de `estado-demonstrativo` e
`demonstracao-inicial` confirmou que a independência da SPA deve ser mantida; não
há mudança dessas capabilities. Divergências históricas de outras Changes não
serão conciliadas por este trabalho.

## Goals / Non-Goals

**Goals:** ter um ponto de composição mínimo e testável; ferramentas C# isoladas;
fluxo restore/build/test/format/run reproduzível; MSTest como padrão explícito do
backend; verificação real do binding local sem infraestrutura financeira.

**Non-Goals:** tornar esta base uma aplicação financeira operacional ou protocolo
desktop definitivo. Não desenhar entidades provisórias, banco, contrato HTTP de
vendas, token de IPC, UI de login ou workflow de CI. Não converter restrição de
uso offline em promessa de restore sem rede/cache.

## Decisions

### D1 — Solução isolada e fronteiras de projeto

Criar no apply, não nesta proposta:

```text
backend/
  global.json
  Directory.Build.props
  .editorconfig
  .gitignore
  README.md
  VendasEmAberto.slnx
  src/
    VendasEmAberto.Api/
    VendasEmAberto.Aplicacao/
    VendasEmAberto.Dominio/
    VendasEmAberto.Infraestrutura/
  tests/
    VendasEmAberto.UnitTests/
    VendasEmAberto.IntegrationTests/
```

Grafo: Api → Aplicacao e Infraestrutura; Infraestrutura → Aplicacao e Dominio;
Aplicacao → Dominio; Dominio não depende dos demais. Os testes referenciam somente
os projetos necessários aos cenários, inicialmente Api. Class libraries começam
sem classes de exemplo, entidades, interfaces especulativas ou referências de
framework web. Esta é a estrutura de camadas confirmada, não uma obrigação de
inventar regras para preenchê-la.

Alternativas: projeto único seria menor, mas perderia as fronteiras iniciais
confirmadas; microserviços aumentariam complexidade sem necessidade local.
Configuração na raiz global poderia afetar outros projetos; por isso tudo fica
em `backend/`. Preservar `.gitignore` alheio da raiz; ignorar `bin/`, `obj/`,
`TestResults/` e artefatos locais apenas pelo arquivo próprio do backend.

### D2 — Baseline .NET 10 e dependências fixadas

Usar `net10.0`, nullable e implicit usings, sem preview. Seleção em
`backend/global.json`: SDK 10.0.103, `rollForward=latestPatch`,
`allowPrerelease=false`; o comando precisa partir de `backend/`. A política aceita
patch instalado posterior na mesma feature band, não SDK major/feature novo.
Quem tiver somente outra feature band recebe instrução explícita de instalar a
baseline ou propor atualização documentada, em vez de depender da resolução
implícita. Registrar o SDK efetivamente usado.

Fixar MSTest.Sdk 4.5.3 em ambos os projetos de testes; IntegrationTests também
referencia Microsoft.AspNetCore.Mvc.Testing 10.0.3. Os metadados NuGet dessas versões
foram consultados, mas isso não prova execução local nem ausência de
vulnerabilidades. No apply, analisar suporte e avisos antes de consolidar as
versões; se exigir substituição, revisar primeiro DEC-033 e os artefatos afetados.
Não instalar SDK nem atualizar pacotes durante a proposta.

Habilitar lockfiles NuGet aplicáveis e versioná-los, incluindo resolução transitiva.
O MSBuild SDK MSTest tem versão exata própria, não substituída pelo lockfile NuGet.
Restauração inicial gera locks; depois usar `--locked-mode`. Não adicionar
ferramentas dotnet globais ou dependências de ORM, DI externo, FluentAssertions,
mediador, mapeador ou cobertura sem necessidade desta fase. A checagem de formato
usa o comando do SDK e o `.editorconfig` local.

Alternativa de versões flutuantes rejeitada por dificultar repetição. Não declarar
a baseline observada como o patch atual de segurança nem como pacote pronto para
distribuição a clientes.

### D3 — MSTest com Microsoft.Testing.Platform

MSTest é decisão do solicitante para **todos os testes do backend**, unitários e
de integração. Usar MSTest.Sdk, que configura framework/runner, e selecionar
`test.runner=Microsoft.Testing.Platform` no `global.json` local. Não misturar runner
VSTest ou instalar xUnit/NUnit. Os testes do frontend continuam Vitest/Playwright.

UnitTests exercita a validação pura da configuração de inicialização (porta e
sobrescritas de endpoints), extraída para unidade testável na API. Não testar
`1+1` nem criar domínio fictício apenas para ter um teste. IntegrationTests usa
`WebApplicationFactory` e instâncias descartáveis para contrato HTTP, falhas e
startup inválido, sem chamadas em rede externas. As referências ao entry point
devem seguir o comportamento do pacote fixado: evitar declaração parcial duplicada
de `Program` se a versão já gerar esse acesso.

Verificar descoberta e contagem não vazia em ambos os projetos. O comando nativo
MTP é `dotnet test --solution VendasEmAberto.slnx -c Release --no-build`; não copiar
opções posicionais de VSTest. Falha real precisa retornar não zero. Cobertura não
terá meta arbitrária ou integração adicional nesta fase.

Alternativas xUnit/NUnit rejeitadas por contrariar a escolha explícita; somente
testes manuais não sustentariam repetibilidade do contrato técnico.

### D4 — Minimal API de disponibilidade, sem contratos comerciais

Registrar health checks do framework e mapear somente `GET /health`, resposta
padrão saudável 200 `text/plain` com `Healthy`. Não configurar checks financeiros
ou de banco. Remover qualquer rota WeatherForecast ou OpenAPI gerada por template.
`/vendas` e `/pagamentos` ficam inexistentes e retornam 404.

Não configurar autenticação, autorização por usuário, CORS, cookies ou
redirecionamento HTTPS. Configurar tratamento de exceções com Problem Details
genérico e sem Developer Exception Page, inclusive em Development. Não enviar
exceção, path de arquivo ou configuração no corpo. Para testar 500, usar composição
exclusiva do host de testes com falha controlada; nunca adicionar `/throw` ou
equivalente ao host real. Logs são técnicos no console; não há payload comercial.

Um endpoint simples é suficiente; controllers ou biblioteca de API desnecessária
aumentariam superfície e dependências. `/health` confirma vida do processo, não
readiness de componentes que ainda não existem.

### D5 — Restrição de listener e ciclo de vida

Fonte própria `Backend:Porta`, padrão 5070, override `Backend__Porta`, intervalo
1024–65535. Vincular explicitamente a `127.0.0.1`. Para evitar fontes de endpoints
concorrentes, rejeitar configurações paralelas de URLs/endpoints, orientando o uso
de `Backend:Porta`; isso inclui `urls`/`--urls`, `ASPNETCORE_URLS`, portas genéricas
de hosting e `Kestrel:Endpoints`. Não deixar a validação depender do template de
`launchSettings.json`, que também não deve inserir URLs concorrentes.

Variáveis devem ser controladas apenas no ambiente dos processos de teste; não
alterar permanentemente as variáveis do usuário. Testar fontes equivalentes de
arquivo, environment e argumentos; nenhuma delas pode abrir listener externo.
Configuração inválida ou porta ocupada encerra com erro/não zero. Não usar wildcard,
fallback silencioso ou encerrar processo alheio para liberar porta. Ctrl+C encerra
normalmente o host; smoke precisa confirmar liberação.

Kestrel real é verificado separadamente de TestServer: uma aplicação em memória
não comprova segurança do socket. O smoke usa porta livre alternativa quando
necessário, verifica endereços dos listeners e encerra somente o processo criado.
O teste de conflito ocupa a porta deliberadamente e preserva seu dono.

Alternativas rejeitadas: confiar em URL de launch profile, escutar em 0.0.0.0 ou
integrar já à SPA. Sem credencial de IPC e sem dados, este host é uma base técnica;
o desenho de produção deverá resolver segurança entre processos antes de expor
operações financeiras, sem transformar isso em login da equipe.

### D6 — Comandos, verificações e rastreabilidade

`backend/README.md` deve documentar pré-requisitos, SDK/runner efetivos e versões,
grafo, comandos abaixo (diretório `backend/`), porta, sobrescritas rejeitadas, erro
de conflito e limites do endpoint. Indicar que Visual Studio/MAUI não são requisitos.

```text
dotnet --info
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet test --solution VendasEmAberto.slnx -c Release --no-build
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
dotnet run --project src/VendasEmAberto.Api -c Release --no-build --no-launch-profile
```

O README do apply registra resultados reais e limitações, não estes comandos como
execuções já feitas. Incluir análise de dependências e smoke real. Como fronteira
com a demonstração, executar build e testes unitários em `frontend/` e revisar diff
para ausência de cliente HTTP, mudanças em seed, assets e Pages. Não reexecutar
E2E como requisito artificial de uma base sem alteração da UI; registrar a dispensa
e reavaliá-la se o escopo mudar (sem ampliar implementação silenciosamente).

## Risks / Trade-offs

- [Baseline não representar patch de segurança atual] → validar avisos/suporte no
  apply e revisar o planejamento antes de atualizar a base afetada; não publicar
  para produção nesta fase.
- [MSTest/MTP não compatível no patch observado] → comprovar restore, build,
  descoberta não vazia e execução; não trocar por outro framework para avançar.
- [SDK local não selecionado ao rodar da raiz] → comandos e `global.json` em
  `backend/`, com diretório sempre explícito na documentação.
- [Variável de ambiente abrir listener externo] → uma fonte de porta, rejeição de
  endpoints concorrentes e smoke real sem depender de launch profile.
- [Teste de integração passar sem provar binding] → TestServer para contrato e
  processo Kestrel separado para listener, conflito e encerramento.
- [Camadas iniciais vazias virarem arquitetura especulativa] → só referências e
  configurações; nenhum modelo/serviço financeiro ou classe artificial.
- [Confundir API técnica com evolução completa] → exclusões em PRD, proposta e
  README; sem dados reais, persistência, auth ou integrações.
- [Autoria ou segurança presumida pelo uso offline] → FON-035 preservada; sem login
  nem autoria individual prometida, sem dispensar futuro desenho de IPC.

## Migration Plan

Não há migração de dados ou de consumidor. Durante o apply: criar base, confirmar
ferramentas e build, adicionar comportamento técnico com testes e documentação,
executar regressão aplicável e só então abrir um PR único. Cada entrega coerente
leva commit próprio, com mensagens em português e testes/documentação associados.

Não modificar as specs principais antes de sync/archive autorizados. Se houver
falha, corrigir a entrega própria na feature; rollback remove/reverte apenas o
escopo da fase pelo fluxo de revisão, sem apagar trabalho alheio ou tocar na
planilha. O frontend permanece utilizável com o backend desligado.

Esta proposta não executou restore, build, testes ou startup. Não há questão
funcional bloqueante desta base: decisões financeiras, migração e IPC de produção
ficam fora do recorte e precisam de propostas próprias antes dos casos afetados.
