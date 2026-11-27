# Backend — Vendas em Aberto

## Baseline e segurança

### Abrir e executar os testes

No VS Code, abra a solução versionada `backend/VendasEmAberto.slnx` (ou abra
`backend/` como workspace), em vez de iniciar a descoberta por uma solução
temporária do workspace. Os projetos de teste fixam `MSTest.Sdk/4.5.3` no
próprio `.csproj`, para que o resolvedor do MSBuild também encontre essa versão
quando a solução da extensão estiver fora da pasta do repositório. O mesmo número
permanece em `global.json` para a CLI; os dois valores devem ficar alinhados.

O SDK MSTest é distinto do SDK .NET: antes de rodar os comandos, instale o SDK
.NET selecionado por `global.json` (10.0.404 ou patch permitido na mesma feature
band). A partir de `backend/`, execute:

```powershell
dotnet --version
dotnet restore .\VendasEmAberto.slnx --locked-mode
dotnet test --solution .\VendasEmAberto.slnx -c Release
```

Se `dotnet --version` não selecionar o SDK exigido, instale-o pelos canais
oficiais; não altere o pin para contornar a configuração local. Se somente a
extensão falhar, recarregue a janela após abrir a solução versionada e confira
os logs de restore para garantir que ela carregou os projetos do repositório.

O backend tem como alvo `.NET 10` (`net10.0`). Baseline planejada em 25/11/2026:

- SDK `10.0.404`, `rollForward=latestPatch`, `allowPrerelease=false`.
- Runtime .NET e ASP.NET Core `10.0.15`.
- `MSTest.Sdk` `4.5.3` e `Microsoft.AspNetCore.Mvc.Testing` `10.0.15`.

O host de desenvolvimento observado originalmente tinha SDK `10.0.103` e runtime
ASP.NET Core `10.0.3`; esses componentes locais não serão usados para esta baseline.
Para viabilizar a Change sem alterar a instalação global, o SDK `10.0.404` foi
instalado isoladamente em `%LOCALAPPDATA%\Temp\opencode\dotnet-10.0.404`. A
instalação informou runtime .NET e ASP.NET Core `10.0.15`. Esta cópia temporária é
específica deste ambiente e não é requisito de distribuição; desenvolvedores devem
instalar o SDK exigido a partir dos canais oficiais.

A página oficial de downloads do .NET 10 consultada em 25/11/2026 identifica
`10.0.15` como patch de segurança, publicado em 10/11/2026, e SDK `10.0.404`; a
política oficial indica suporte ao .NET 10 até 14/11/2028. Advisories ASP.NET Core
publicados em 10/11/2026 incluem versões até `10.0.14` como afetadas e `10.0.15`
como corrigida. As versões exatas dos pacotes acima estão publicadas no NuGet; a
auditoria do grafo transitivo realizada durante o restore está registrada abaixo.

Referências consultadas em 25/11/2026:

- <https://dotnet.microsoft.com/download/dotnet/10.0>
- <https://dotnet.microsoft.com/platform/support/policy/dotnet-core>
- Advisories Microsoft ASP.NET Core publicados em 10/11/2026; consultar os avisos
  aplicáveis novamente ao atualizar a baseline.
- <https://www.nuget.org/packages/MSTest.Sdk/4.5.3>
- <https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing/10.0.15>

## Dependências de persistência SQLite

As dependências de produção ficam somente em `VendasEmAberto.Infraestrutura`:
`Microsoft.EntityFrameworkCore.Sqlite` e `Microsoft.EntityFrameworkCore.Design`
`10.0.15`; Design usa `PrivateAssets=all`. A ferramenta `dotnet-ef` `10.0.15` é
local ao diretório `backend` (`dotnet-tools.json`), sem instalação global. O pacote
EF SQLite declara SQLitePCLRaw `>= 2.1.13`; foi fixado o patch `2.1.14` do bundle
para obter a revisão mais recente da linha compatível sem adotar a major 3. As
transitivas restantes são reproduzidas pelos `packages.lock.json`.

Em 25/11/2026, foram conferidos no NuGet os metadados de versão, framework, licença
e dependências. O grafo bloqueado da Infraestrutura contém 40 pacotes: 36 com licença
MIT e quatro SQLitePCLRaw (`bundle_e_sqlite3`, `core`, `lib.e_sqlite3` e
`provider.e_sqlite3`) com Apache-2.0. `dotnet-ef` declara licença MIT e não declara
dependências NuGet; seu `.deps.json` contém somente o próprio pacote. As versões e
hashes efetivos constam em
`src/VendasEmAberto.Infraestrutura/packages.lock.json`; ferramenta e versão estão em
`dotnet-tools.json`.

Na baseline anterior à composição HTTP/API-01/1.3, `Api.csproj` referenciava apenas
Aplicacao e o grafo da API não continha EF Core/SQLite. A decisão D1 da fase 005 passou
a compor a Infraestrutura pela API; a nova referência transitiva e os lockfiles atuais
estão registrados em “Inicialização do host local (API-01/1.3)” abaixo. As dependências
de produção do EF/SQLite continuam declaradas somente pela Infraestrutura.

Fontes oficiais consultadas:

- <https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Sqlite/10.0.15>
- <https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Design/10.0.15>
- <https://www.nuget.org/packages/dotnet-ef/10.0.15>
- <https://www.nuget.org/packages/SQLitePCLRaw.bundle_e_sqlite3/2.1.14>
- <https://www.nuget.org/packages/SQLitePCLRaw.core/2.1.14>
- <https://www.nuget.org/packages/SQLitePCLRaw.provider.e_sqlite3/2.1.14>
- <https://www.nuget.org/packages/SQLitePCLRaw.lib.e_sqlite3/2.1.14>

Verificações executadas com o SDK isolado `10.0.404` (runtime `10.0.15`):

```powershell
dotnet restore VendasEmAberto.slnx --force-evaluate
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet tool restore
dotnet tool run dotnet-ef --version
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet list src/VendasEmAberto.Infraestrutura/VendasEmAberto.Infraestrutura.csproj package --include-transitive
dotnet list src/VendasEmAberto.Api/VendasEmAberto.Api.csproj package --include-transitive
dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive
```

Restore bloqueado e build Release passaram; a ferramenta informou `10.0.15`. O
list de pacotes da API não encontrou pacote algum, e a pasta Release não contém
assemblies EF/SQLite. A auditoria NuGet, nas fontes disponíveis, não reportou
pacotes vulneráveis nos seis projetos da solução, incluindo transitivas e o pacote
nativo SQLite. Essa consulta não é análise
estática do binário nativo nem auditoria geral; `dotnet list package` também não
inclui ferramentas locais no grafo da solução. Para `dotnet-ef`, foram conferidos
seus metadados, ausência de dependências declaradas e `.deps.json`; resultados de
advisories dependem das fontes NuGet no momento da execução.

## Dependências dos casos de uso (APP-01/1.1)

As dependências dos casos de uso ficam em `VendasEmAberto.Aplicacao`: MediatR
`12.5.0` (Apache-2.0), FluentResults `4.0.0` (MIT),
`Microsoft.Extensions.DependencyInjection.Abstractions` `10.0.15` (MIT) e
`Microsoft.Extensions.Logging.Abstractions` `10.0.15` (MIT). Infraestrutura declara
diretamente `Microsoft.Extensions.DependencyInjection.Abstractions` `10.0.15` (MIT),
que consome em sua composição. Os lockfiles registram versões, dependências e hashes.
Não foi adicionado pacote separado de DI do MediatR nem extensão ASP.NET do
FluentResults. A API continua referenciando apenas Aplicacao; seu grafo inclui
MediatR/FluentResults transitivamente, mas não EF Core nem SQLite.

Os `.nuspec` obtidos do NuGet declaram as licenças acima. MediatR `12.5.0` oferece
assets `net6.0` e `netstandard2.0`, declarando DI Abstractions `>=8.0.0`; FluentResults
`4.0.0` oferece grupo `net9.0` (selecionado pelo consumidor `net10.0`) e declara
Logging Abstractions `>=2.1.1`. As referências diretas Microsoft `10.0.15` alinham os
contratos ao runtime escolhido. Restore bloqueado, build Release sem restore e
auditoria NuGet transitiva passaram sem avisos de compatibilidade ou vulnerabilidades
reportadas pelas fontes disponíveis em 26/11/2026. Isso não constitui garantia de
suporte/servicing futuro: MediatR `12.5.0` é uma escolha explícita da linha Apache-2.0
registrada na DEC-040, não uma afirmação de que a versão continuará recebendo correções.

Fontes oficiais consultadas em 26/11/2026:

- <https://www.nuget.org/packages/MediatR/12.5.0>
- <https://github.com/LuckyPennySoftware/MediatR/tree/v12.5.0>
- <https://www.nuget.org/packages/FluentResults/4.0.0>
- <https://www.nuget.org/packages/Microsoft.Extensions.DependencyInjection.Abstractions/10.0.15>
- <https://www.nuget.org/packages/Microsoft.Extensions.Logging.Abstractions/10.0.15>

Verificações desta etapa, executadas com o SDK temporário `10.0.404` e runtime
`10.0.15` em `%LOCALAPPDATA%\Temp\opencode\dotnet-10.0.404` (instalação global
inalterada):

```powershell
dotnet restore VendasEmAberto.slnx
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive
dotnet list VendasEmAberto.slnx package --include-transitive
```

O restore inicial e o bloqueado passaram. O build Release passou com zero avisos e
zero erros. A auditoria não reportou vulnerabilidades nos seis projetos, considerando
as fontes NuGet disponíveis. A listagem confirmou as dependências diretas/transitivas
e que o grafo da API não contém EF Core/SQLite. A avaliação de advisories é um retrato
das fontes consultadas em 26/11/2026, não uma auditoria estática de código ou do binário
nativo SQLite.

## Contratos compartilhados dos casos de uso (APP-01/1.2)

`Comum/Erros/` converte categorias de domínio explicitamente, preservando código,
mensagem pública e campo. Erros de armazenamento são classificados por código estável:
caminho/candidato inválido como validação; conflito de revisão/exclusão/histórico como
conflito; falhas de banco/schema/dados/bloqueio/limite como infraestrutura; e
`confirmacao-indeterminada` como estado indeterminado. Código ou categoria desconhecidos
propagam exceção técnica genérica, sem converter falha em sucesso nem publicar o snapshot
candidato. Cancelamento e exceções inesperadas não são capturados pelos conversores.

`Contratos/` contém somente o cliente, resumo e detalhe da venda necessários ao cadastro
e à consulta inicial. Os valores monetários são `long` em centavos; datas usam `DateOnly`;
descrição e dados de pagamento ainda não existentes mantêm nulabilidade. Enums próprios
da Aplicacao são convertidos por `switch` exaustivo. O mapper transporta as projeções do
domínio sem recalcular valores, associa a projeção à raiz pelo ID e mantém as ordens de
parcelas, recebimentos e alocações. As coleções de resposta são cópias somente leitura;
nenhuma resposta contém entidade de domínio, EF Core ou contrato HTTP.

`IGeradorIdentificadores` é a abstração de geração, sem impor formato aos IDs existentes.
A implementação concreta e a política GUID formato N pertencem à composição da
Infraestrutura (APP-01/1.3).

Evidência direcionada em 26/11/2026, com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter "FullyQualifiedName~ConversorErrosAplicacaoTests|FullyQualifiedName~MapeadorVendaRespostaTests"
```

Resultado: 9 testes passaram, 0 falhas. Cobrem as quatro categorias de domínio, todos
os códigos de armazenamento conhecidos, código/categoria desconhecidos, falha sem
acesso a `Result.Value`, resposta candidata não publicada, centavos/datas/nulabilidade,
DTOs sem tipos de domínio/infra/HTTP e coleções defensivas. Esta etapa não implementa
handlers nem mapeamento HTTP.

## Composição interna da aplicação e SQLite (APP-01/1.3)

O consumidor interno compõe um container com o destino de banco explícito. A composição
não executa I/O nem migração; consulta a um arquivo inexistente retorna `banco-ausente`.
Somente `IPreparacaoArmazenamentoVendas.PrepararAsync` inicializa o schema, sem seed.
Repetir a preparação preserva os dados e a revisão. A Aplicacao registra MediatR,
handlers por assembly e o serviço de preparação; a Infraestrutura registra um destino
imutável singleton, gerador GUID formato N singleton e adaptador SQLite transient.
Não há `DbContext` global nem referência da Aplicacao para Infraestrutura. O consumidor
interno mantém composição explícita; a API usa `AdicionarAplicacao` e
`AdicionarPersistenciaSqlite` como composition root e chama a preparação separadamente
antes de servir.

Exemplo de composição para consumidor interno (não é registro do host HTTP):

```csharp
var services = new ServiceCollection()
    .AdicionarAplicacao()
    .AdicionarPersistenciaSqlite(caminhoAbsoluto);
using var provider = services.BuildServiceProvider();
var preparacao = provider.GetRequiredService<IPreparacaoArmazenamentoVendas>();
var resultado = await preparacao.PrepararAsync(cancellationToken);
```

O chamador deve fornecer caminho absoluto e diretório pai já existente, tratar o
`Result` da preparação e descartar o `ServiceProvider` ao fim do escopo de uso. Não
compartilhar o provider entre destinos diferentes; providers distintos podem apontar
para o mesmo arquivo e continuam sujeitos à revisão global do armazenamento.

Verificações executadas em temporários próprios com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~DestinoArmazenamentoVendasTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ComposicaoInternaTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultado: 2 testes unitários e 3 de integração passaram; build Release terminou com
zero avisos/erros e `dotnet format --verify-no-changes` passou. Os testes cobrem configuração vazia/
relativa sem I/O, resolução de `ISender`, ausência de criação em composição/consulta,
revisão zero, reabertura, preparação repetida preservando venda/revisão, e lifetimes
independentes em dois providers. O SQLite real permaneceu restrito aos diretórios
temporários descartados pelos testes. Em produção, somente
`PreparacaoArmazenamentoVendas.PrepararAsync` chama `InicializarAsync`; nesta etapa,
nenhum handler ou consulta usa o serviço de preparação.

## Contrato HTTP comum (API-01/1.1)

`Api/Contratos/` concentra leitura explícita de JSON/query e tipos exclusivos do fio,
sem expor DTOs internos, domínio ou `Result`. O leitor de body reconhece apenas os
campos declarados por cada endpoint; campos desconhecidos são ignorados, chaves
conhecidas repetidas são recusadas e valores de ID/texto não passam por `Trim` ou
segunda decodificação. Parâmetros query obrigatórios precisam ocorrer exatamente uma
vez. Datas são civis `yyyy-MM-dd`; centavos aceitam token inteiro entre zero e
`9.007.199.254.740.991`; enums aceitam somente nomes textuais conhecidos; revisão usa
string decimal canônica até `long.MaxValue`. O wrapper `RevisaoApi` aplica a forma
textual somente às revisões; não existe conversor global de `long`, então centavos
continuam números JSON. Saídas usam camelCase, enums textuais e datas ISO exatas.

Verificação direcionada desta funcionalidade: testes `ContratoApiJsonTests`,
`LeitorObjetoJsonTests` e `ParametrosQueryApiTests` no projeto UnitTests cobrem os
extremos, ausência/null/default, tipos incorretos, duplicatas, enums, IDs sem
normalização e propriedades desconhecidas. O adaptador de erros HTTP e a tradução
dessas falhas para Problem Details pertencem à tarefa API-01/1.2; endpoints e mappers
específicos serão adicionados junto a cada operação.

## Falhas HTTP e Problem Details (API-01/1.2)

`AdaptadorResultadosApi` é o ponto único de tradução de `Result` para HTTP. Categorias
conhecidas são mapeadas sem ler `Result.Value` em falha; somente códigos/campos
permitidos atravessam a fronteira. Validações múltiplas coerentes retornam uma lista
segura. Código/categoria/campo desconhecido, erros mistos ou falha sem erro tipado
resultam em 500 genérico, sem serializar `Reasons`. A mensagem de infraestrutura não
é propagada: o detalhe HTTP é fixo. Falhas inesperadas e binding não ecoam mensagem de
exceção nem valores recebidos.

| Situação | Status | `codigo` / detalhe |
| --- | ---: | --- |
| JSON, query ou validação tipada inválida | 400 | Código conhecido; validações múltiplas usam `erros-validacao` |
| Credencial técnica ausente/inválida | 401 | `acesso-local-negado` |
| Recurso inexistente | 404 | Código conhecido, por exemplo `venda-inexistente` |
| Conflito de revisão/histórico | 409 | Código conhecido |
| Regra comercial não atendida | 422 | Código conhecido |
| Armazenamento indisponível | 503 | Código conhecido e detalhe fixo |
| Confirmação indeterminada | 500 | `confirmacao-indeterminada`, `resultadoOperacao: "indeterminado"` |
| Exceção inesperada, categoria/código desconhecido ou categorias mistas | 500 | `falha-interna`, detalhe genérico |
| Método, tamanho ou tipo de conteúdo não aceito | 405 / 413 / 415 | `metodo-nao-permitido` / `conteudo-muito-grande` / `tipo-conteudo-nao-suportado` |

As respostas de erro usam `application/problem+json`, `type: about:blank`, status
coerente com o status HTTP, `codigo` e, quando seguro e fornecido, `campo`; não incluem
`instance` com query. O corpo recebe `Cache-Control: no-store`. Em .NET 10, o handler
trata explicitamente `BadHttpRequestException` para preservar 400/405/413/415 em vez
de convertê-los em 500; `UseStatusCodePages` cobre 405/413 produzidos pelo pipeline.
Não se promete tradução de códigos ou categorias que não estejam allowlisted: eles
falham fechados como erro interno genérico. A verificação desta tarefa cobre respostas
em Development e Production; a auditoria transversal do logging automático e dos
marcadores nos logs está registrada em API-05/5.2.

Verificações executadas em 26/11/2026 com o SDK isolado `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~AdaptadorResultadosApiTests"
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~FalhasTecnicasTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
```

Resultados observados: 7 testes unitários e 10 de integração passaram; o build Release
passou com 0 avisos e 0 erros. A cobertura verifica 400/404/409/422/503, 401 técnico,
500 genérico/indeterminado, 405/413/415, status HTTP e corpo em Development/Production,
campos allowlisted, validações múltiplas/mistas, `Result.Value` não acessado em falha e
ausência de marcadores sintéticos de entrada/exceção nas respostas. Os testes host-level
injetam `BadHttpRequestException` para simular os status de binding nesta etapa; ainda
não há endpoint comercial que permita exercitar o binding real ponta a ponta.

## Cadastro de venda (APP-02/2.1)

`CadastrarVendaCommand` recebe os quatro campos do cliente, data civil, total em
centavos, quantidade total de parcelas, referência, revisão esperada e entrada opcional.
O handler valida cliente, dinheiro, quantidade, datas/limites do calendário e entrada
antes de carregar/gravar ou gerar IDs. Carrega um snapshot com destino/referência/token,
compara a revisão e somente então solicita IDs ao `IGeradorIdentificadores`. Cria a
venda pelas fábricas do domínio, adiciona-a às demais raízes do snapshot, valida o
conjunto completo (incluindo unicidade global de IDs e limites financeiros), pré-mapeia
a resposta e chama `SalvarAsync` uma única vez. A resposta só é devolvida após sucesso
da gravação e contém a revisão confirmada; falha não devolve resposta candidata nem
dispara retry.

Testes unitários direcionados em 26/11/2026:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~CadastrarVendaHandlerTests
```

Unitários: 5 testes passaram. Com gerador determinístico, comprovam distribuição
10.000/3 em 3.334, 3.333, 3.333; entrada 10.000 em venda de 20.000/2 com uma única
origem Entrada; IDs distintos; ordem e vencimentos; preservação de venda existente;
mesma referência/token/destino; revisão confirmada; validações de cliente, dinheiro,
entrada, quantidade e calendário sem carga/IDs; revisão obsoleta antes do gerador; ID
colidente e overflow do conjunto completo sem gravação, inclusive uma venda em Prejuízo.

Integração por `ISender` com SQLite real preparado em diretório temporário e leitura
posterior por provider novo:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~CadastrarVendaSqliteTests
```

Resultado: 3 testes passaram. Reabertura confirmou revisão 2, duas vendas com CPF
repetido, nome/descrição Unicode e descrição nula; IDs de venda/parcela e ordem,
vencimentos civis, valores-base, recebido/saldo, alocação única da entrada e preservação
do conjunto. Cadastro sem preparação retornou `banco-ausente` sem criar arquivo; cliente
inválido e revisão obsoleta não alteraram snapshot nem revisão. Bancos e conexões ficaram
restritos ao diretório temporário da fixture, removido no cleanup; não foi usada base
real nem houve seed.

## Consulta de detalhe da venda (APP-02/2.3)

`ConsultarVendaQuery` recebe `VendaId` opaco e `Referencia`, lê exatamente um snapshot
e localiza o ID com comparação ordinal. ID vazio falha como validação antes da carga;
venda ausente no snapshot falha como `Inexistencia`/`venda-inexistente`, enquanto falhas
do armazenamento (incluindo banco ausente) mantêm seus próprios códigos/categorias.
Para venda existente, a projeção financeira é calculada uma vez pelo domínio e combinada
por ID ao contrato e ao histórico raiz via `MapeadorVendaResposta`; a Query não prepara,
grava nem gera identificadores. A resposta inclui revisão/referência do snapshot e cópias
defensivas em ordem de parcelas, recebimentos e alocações.

Testes direcionados:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarVendaHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarVendaSqliteTests
```

Resultado: 4 unitários e 2 de integração passaram. O histórico sintético preserva
entrada, lote e Individual, notas Unicode e datas de recebimento fora de ordem (o lote
tem data posterior ao pagamento Individual, mas permanece na ordem de registro). Os
testes conferem cliente completo/nulabilidade, data/status/centavos, projeções das
parcelas pagas, acréscimo, saldo, formas/origens, IDs e alocações; identificador vazio,
venda inexistente e distinção de banco ausente. A integração gravou em arquivo SQLite
temporário, consultou via `ISender` em provider novo e confirmou revisão inalterada,
sem mutar respostas já entregues. Os arquivos e pools foram limpos pela fixture.

## Edição dos dados do cliente (APP-03/3.1)

`EditarClienteVendaCommand` valida revisão, ID e os quatro campos pela factory do domínio
antes de carregar. Depois lê snapshot único, confere a revisão antes de localizar venda
ou tratar no-op e distingue `venda-inexistente`. A comparação de no-op usa os campos já
normalizados (nome/CPF/telefone/descrição); equivalente retorna detalhe e revisão
observada sem `SalvarAsync`. Mudança edita somente o cliente, substitui a raiz na posição
existente, valida o conjunto todo, mapeia antes de gravar e retorna a revisão confirmada.
CPF pode se repetir em outra venda. Status, contrato, parcelas, recebimentos e demais
vendas são preservados.

Verificações direcionadas, SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~EditarClienteVendaHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~EditarClienteVendaSqliteTests
```

Resultado: 4 testes unitários e 2 de integração passaram. Cobrem venda Ativa aberta e
quitada, Inativa e Prejuízo; CPF repetido; preservação financeira/histórica e posição
das demais vendas após reabertura; validação inválida e venda ausente sem alteração;
no-op após normalização sem avanço de revisão; e revisão obsoleta que conflita antes
do no-op. SQLite e fixtures usam apenas arquivos temporários removidos ao término.

## Alteração de status administrativo (APP-03/3.2)

`AlterarStatusVendaCommand` valida revisão, ID e enum antes da carga; após ler snapshot,
confere a revisão antes de localizar a venda ou decidir no-op. O domínio autoriza Ativo
para Inativo, Ativo para Prejuízo somente com saldo, e retorno de Inativo/Prejuízo para
Ativo. Outras transições são falhas de regra de negócio. Repetir o status corrente
devolve o detalhe e a revisão observada sem gravar; revisão obsoleta conflita antes
desse no-op. Mudança substitui apenas a venda na posição original, valida o conjunto,
pré-mapeia a resposta e grava uma vez. Projeções usam os status existentes do domínio;
nenhuma Query adicional ou regra financeira foi introduzida.

Verificações direcionadas:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~AlterarStatusVendaHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~AlterarStatusVendaSqliteTests
```

Resultado: 4 testes unitários e 1 integração passaram. Cobrem a matriz permitida e
proibida, Ativo quitado não marcado como Prejuízo, enum inválido, no-op sem avanço,
conflito obsoleto inclusive no no-op, venda ausente e preservação de IDs/alocações do
histórico após reabertura. A integração usou apenas arquivo temporário.

## Registro de pagamento individual (APP-04/4.1)

`RegistrarPagamentoCommand` exige `VendaId` e `ParcelaId` explícitos; o cliente não
envia o ID do recebimento. Depois das validações escalares e da revisão do snapshot,
o handler gera um ID, delega à regra de domínio a seleção estrita da primeira parcela
pendente, cria um recebimento Individual, substitui a venda na posição existente,
valida o conjunto completo e grava uma vez. Não desloca parcela nem repete o comando
automaticamente. A resposta financeira é projetada antes do commit e só é entregue
com a revisão confirmada. Observações contam valores escalares Unicode, máximo 20.

Verificações direcionadas:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~RegistrarPagamentoHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~RegistrarPagamentoSqliteTests
```

Resultado: 5 testes unitários e 2 de integração passaram. Cobrem acréscimo de 1.000
centavos sobre parcela-base de 10.000, saldo-base e projeção, preservação do conjunto,
IDs e revisão; baixa da primeira pendente futura; seleção explícita sem avanço em
repetição/salto/parcela desconhecida ou de outra venda; venda ausente/não Ativa; valor,
forma, data e observação inválidos; limite Unicode de 20 scalars; e revisão obsoleta
antes do gerador. A integração gravou dois pagamentos via `ISender`, reabriu com
provider novo e confirmou IDs, acréscimo, base/recebido/saldo e revisão 3. Falhas de
seleção/status não alteraram snapshot. SQLite/fixtures ficaram em arquivos temporários.

## Correção de pagamento individual (APP-04/4.2)

`CorrigirPagamentoCommand` recebe venda e recebimento explicitamente, sem solicitar ID
novo. O handler valida dados escalares, carrega um snapshot e confere a revisão antes
de localizar a venda. Entrega ao domínio o recebimento existente e a coleção completa
das vendas para distinguir ID inexistente de recebimento pertencente a outra venda.
Somente Individual de venda Ativa é corrigível; entrada/lote são recusados. O domínio
preserva ID e alocação e recalcula o acréscimo. A aplicação substitui a raiz na posição
original, valida o conjunto e projeta/mapeia a resposta antes de uma única gravação.
Correção idêntica não é no-op: grava e retorna a revisão confirmada, sem duplicar
recebimento.

Verificações direcionadas, com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~CorrigirPagamentoHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~CorrigirPagamentoSqliteTests
```

Resultado: 5 testes unitários e 2 de integração passaram. Cobrem recebimento de
11.000 corrigido para 10.500 em parcela-base de 10.000, acréscimo de 500, data movida
de fevereiro para março, preservação de IDs/alocações/ordem e saldo das outras
parcelas; correção idêntica com uma gravação e revisão +1; recebimento ausente versus
de outra venda; entrada/lote, venda não Ativa/ausente e valor, forma, data e observação
inválidos. SQLite temporário foi reaberto em provider novo, mantendo a revisão final,
histórico e projeção reconciliáveis, sem alterar as demais vendas.

## Consulta de coleções de vendas (APP-05/5.1)

`ConsultarColecaoVendasQuery` recebe uma das quatro opções próprias: `Abertas`,
`Quitadas`, `Inativas` ou `Prejuizo`, além da referência civil. A consulta lê um snapshot,
projeta cada raiz uma vez com o domínio e classifica por status e saldo (Abertas/Quitadas
incluem apenas Ativas), preservando a ordem do snapshot. Cada item usa
`VendaResumoResposta`, que inclui os quatro campos do cliente e situação/valores
projetados; a resposta da coleção inclui seletor, revisão e referência. Não há filtros,
busca, paginação, ordenação parametrizável, inicialização, gravação ou geração de IDs.
Coleções, inclusive vazias, são cópias somente leitura.

Verificações direcionadas, com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarColecaoVendasHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarColecaoVendasSqliteTests
```

Resultado: 2 testes unitários e 2 de integração passaram. Fixtures com status mistos
conferem as quatro coleções e todos os IDs na ordem de origem, cliente/status/revisão/
referência, coleção vazia bem-sucedida e enum desconhecido como validação. Os fakes
confirmam uma carga por chamada, caminho/referência/revisão, zero inicialização e Save;
consulta SQLite via `ISender` após reabertura preserva revisão e conjunto. Banco,
conexões e providers dos testes usam temporários e cleanup.

## Consulta do resumo financeiro (APP-05/5.2)

`ConsultarResumoQuery` lê um snapshot com a referência recebida e delega integralmente
a `ConjuntoVendas.Projetar`. `ResumoResposta` transporta, em centavos inteiros, total
em aberto, valores em atraso, recebido no mês, quantidade de vendas Ativas (incluindo
quitadas), revisão e referência. A camada de aplicação não recompõe nem recalcula os
totais; recebimentos mensais de todos os status e os indicadores operacionais de Ativas
mantêm a semântica do domínio. A consulta não prepara nem grava armazenamento.

Verificações direcionadas, SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarResumoHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarResumoSqliteTests
```

Resultado: 2 unitários e 2 de integração passaram. Oráculo literal com entrada e lote
na mesma venda reconcilia aberto 20.000, atrasado 10.000, recebido no mês 50.000 e
3 vendas Ativas; o mês inclui recebimentos de vendas Ativas, Inativa e Prejuízo, com
entrada e lote computados uma vez. UnitTests conferem uma carga, caminho/referência/
revisão e zero Init/Save, conjunto vazio zerado e valor no limite seguro de centavos.
SQLite em provider reaberto confirma revisão 1 e ausência de alteração; banco e pools
foram temporários e limpos.

## Consulta de período (APP-05/5.3)

`ConsultarPeriodoQuery` recebe início, fim e referência civil explícitos. O handler
rejeita intervalo invertido antes de carregar o banco; para intervalo válido, carrega
um snapshot e delega a `ConjuntoVendas.ConsultarPeriodo`, fonte das regras: vendas
Ativas cuja data de venda esteja entre as duas bordas inclusivas, e recebimentos
somados uma vez por data no intervalo em todas as vendas/status. A resposta própria
contém limites, total recebido em centavos, revisão/referência do snapshot e resumos
das vendas elegíveis projetados na referência. Não inicializa nem grava.

Verificações direcionadas, SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarPeriodoHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarPeriodoSqliteTests
```

Resultado: 3 testes unitários e 2 SQLite passaram. Oráculo literal: recebimentos de
10.000 e 10.000 nas bordas, 5.000 de venda cuja data está fora do período, 6.000 de
venda Inativa e 7.000 de venda Prejuízo somam 38.000; somente as vendas Ativas aberta
e quitadas das bordas/intervalo aparecem, na ordem do snapshot. UnitTests verificam
uma carga, destino/referência/revisão, zero preparação/gravação, coleção protegida,
vazio e inversão como validação antes da carga. Integração repete via `ISender` com
SQLite temporário/provider reaberto e confirma revisão/conjunto inalterados.

## Consulta de relatório mensal (APP-05/5.4)

`ConsultarRelatorioMensalQuery` recebe ano, mês e referência separadamente. O handler
valida ano 1–9999 e mês 1–12 antes de construir a data do mês; em seguida carrega um
snapshot e delega a `ConjuntoVendas.GerarRelatorioMensal`. `RelatorioMensalResposta`
preserva referência/revisão do snapshot e mapeia limites do mês, recebimentos com venda
vinculada/origem/data/forma/valor, série diária, vendas do mês, saldos, parcelas
atrasadas e Prejuízo (incluindo `IncluirNoTotal`), além de todos os totais/quantidades
do domínio. Cada coleção é uma cópia somente leitura. O mapper não refaz cálculo
financeiro e a consulta não inicializa nem grava.

Verificações direcionadas, SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarRelatorioMensalHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConsultarRelatorioMensalSqliteTests
```

Resultado: 4 testes unitários e 3 SQLite passaram. Oráculo sintético literal concilia
101.000 recebidos com 31 totais diários, 2 vendas Ativas/221.000 no mês, 170.000 em
aberto, 20.000 atrasados e Prejuízo separado de 10.000; valida vínculos de cliente,
origens Entrada/Lote/Individual, status mistos, ordenação existente e parcelas de
Prejuízo com/sem recebimentos. A integração também consulta fevereiro bissexto vazio
com posição não vazia, valida parâmetros, consulta anos 0001/9999 e usa o command de
correção para mover um recebimento de março a abril: só a movimentação muda, mantendo
referência, revisão e posição financeira. Fixtures usam SQLite temporário e cleanup.

## Concorrência transversal dos Commands (APP-06/6.1)

Os cinco Commands mutáveis (`CadastrarVenda`, `EditarClienteVenda`,
`AlterarStatusVenda`, `RegistrarPagamento` e `CorrigirPagamento`) rejeitam revisão
negativa. Testes SQLite aplicam, antes de cada tentativa obsoleta, uma edição bem
sucedida em outra venda; todas as tentativas com a revisão anterior retornam
`conflito-revisao`, sem aplicar o candidato. Uma corrida determinística inicia dois
consumidores/providers independentes, usa um double delegante apenas para liberar as
duas cargas antes de `SaveAsync` e então delega as gravações ao SQLite real. De duas
alterações de vendas distintas, somente uma confirma; cada consumidor chama Save uma
vez (sem retry), o reaberto preserva o conjunto completo e a edição/revisão do vencedor,
e rejeita os dados do perdedor. O double não substitui os testes de transação SQLite.

Verificação, SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~ConcorrenciaCommandsSqliteTests
```

Resultado: 2 testes passaram; arquivos SQLite e pools são temporários e limpos.

## Falhas e cancelamento transversais (APP-06/6.2)

`HandlersFalhasCancelamentoTests` percorre os cinco Commands com armazenamento
controlado: token previamente cancelado (zero carga/Save/IDs), cancelamento em
`SaveAsync` antes da confirmação (propaga `OperationCanceledException` ou subtipo,
preserva token/argumentos e não devolve resposta), cancelamento depois do sucesso
confirmado (devolve resposta com revisão confirmada, uma carga/Save e sem recarga),
falhas físicas `banco-ocupado`/`armazenamento-indisponivel` e
`confirmacao-indeterminada` (categorias corretas, sem retry/carga posterior/candidato),
exceção inesperada e código de armazenamento desconhecido (propagam sem Save). Os
testes também verificam todas as mensagens e Reasons públicas contra SQL, CPF,
telefone e caminho de banco.

O double comprova somente o protocolo da aplicação. A garantia transacional permanece
verificada por SQLite real nos testes do gravador: cancelamento prévio/durante a
transação preserva revisão e conjunto; cancelamento depois do commit retorna sucesso e
revisão confirmada; falha de confirmação resulta em `confirmacao-indeterminada` sem
retry, e a recarga constata o estado realmente confirmado. A integração existente
`ConsultarVendaAusenteDistingueAusenciaDeFalhaDeArmazenamento` separa `banco-ausente`
de `venda-inexistente`.

Verificações com SDK `10.0.404`: build Release da solução sem restore (0 avisos/erros),
5 testes unitários transversais, 4 regressões SQLite direcionadas (incluindo as três
do gravador e a distinção de inexistência), `dotnet format --verify-no-changes` sem
alterações pendentes. Os comandos direcionados são:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~HandlersFalhasCancelamentoTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-build --filter 'FullyQualifiedName~Salvar_CancelamentoPreviamenteSolicitadoOuAntesDoCommitReverteEstado|FullyQualifiedName~Salvar_CancelamentoDepoisDeCommitConfirmadoRetornaSucessoERevisaoConfirmada|FullyQualifiedName~Salvar_FalhaNaConfirmacaoRetornaIndeterminadaSemRetryNemFalsoRollback|FullyQualifiedName~ConsultarVendaAusenteDistingueAusenciaDeFalhaDeArmazenamento'
```

## Verificação integrada do backend (APP-06/6.3)

Executado sequencialmente em `backend/` com o SDK temporário autorizado
`%LOCALAPPDATA%\Temp\opencode\dotnet-10.0.404\dotnet.exe`: `dotnet --info` confirmou
SDK `10.0.404`, MSBuild `18.9.15`, runtime `10.0.15`, Windows x64 e seleção pelo
`global.json`; `dotnet restore VendasEmAberto.slnx --locked-mode` passou; build Release
com `--no-restore` passou com 0 avisos/erros; a execução MTP
`dotnet test --solution VendasEmAberto.slnx -c Release --no-build` passou com 285
testes, 0 falhas e 0 ignorados. `dotnet test --solution ... --list-tests` descobriu
88 testes de integração e 197 unitários (285 total). `dotnet format
VendasEmAberto.slnx --verify-no-changes --no-restore` passou.

Auditoria NuGet executada nas fontes `api.nuget.org` e cache Microsoft local:
`dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive` não
reportou pacotes vulneráveis em nenhum dos seis projetos. O grafo transitivo de API,
consultado por `dotnet list src/VendasEmAberto.Api/VendasEmAberto.Api.csproj package
--include-transitive`, contém apenas `FluentResults 4.0.0`, `MediatR 12.5.0` e
`MediatR.Contracts 2.0.1`; não inclui EF Core nem SQLite. O restore em modo bloqueado
não exigiu alteração dos lockfiles. Esses resultados são da auditoria nas fontes
consultadas nesta execução, não uma garantia futura sobre novos advisories.

## Smoke da API e independência do frontend (APP-06/6.4)

Smoke executado com a DLL Release em processo próprio, diretamente pelo SDK isolado
`10.0.404`, sem launch profile e sem banco configurado. Na porta temporária `5097`,
`GET /health` respondeu `200`, `text/plain`, corpo exato `Healthy`; `GET /vendas`
respondeu `404`. O listener observado foi exclusivamente `127.0.0.1`; nenhum arquivo
`.db` novo foi criado no diretório `backend/`. O próprio processo (PID `20640`) foi
encerrado após as verificações e a porta foi conferida liberada. A composição técnica
do host permanece sem uso de armazenamento.

Com a API própria desligada, frontend verificado em `frontend/` com Node `v24.21.0`
e npm `11.19.0` (compatíveis com os engines do projeto). `node_modules` já estava
presente, portanto não foi necessário `npm ci`; `npm.cmd test -- --watch=false`
passou com 33 arquivos/430 testes e `npm.cmd run build` concluiu sem erros. Nenhum
manifesto ou lockfile foi atualizado. E2E, auditoria visual e zoom não se aplicam,
pois esta Change não alterou a UI.

## Auditoria final de requisitos — fase-004-aplicacao (APP-06/6.5)

Matriz de rastreabilidade revisada contra `specs/casos-de-uso-vendas/spec.md`,
PRD/CA-054–060, TDD/DEC-040 e testes executados:

| Requisito da delta | Aceite | Evidência principal |
| --- | --- | --- |
| Destino e preparação explícita | CA-059 | `ComposicaoInternaTests`, `DestinoArmazenamentoVendasTests`, `ConsultarVendaSqliteTests`; DI real, destino ausente não cria arquivo e preparação separada/idempotente. |
| Referência civil e identidade | CA-054/056/057 | Testes dos cinco Commands, Queries e integração; referência/token/caminho conferidos, IDs opacos preservados e IDs novos somente nos fluxos autorizados. |
| Cadastro sem publicação parcial | CA-054 | `CadastrarVendaHandlerTests` e `CadastrarVendaSqliteTests`; distribuição literal, entrada, colisões/overflow, falha sem Save e reabertura. |
| Edição cadastral e status | CA-055 | `EditarClienteVendaHandlerTests`/`EditarClienteVendaSqliteTests` e `AlterarStatusVendaHandlerTests`/`AlterarStatusVendaSqliteTests`; campos isolados, CPF repetido, matriz e histórico. |
| Baixa e correção individuais | CA-056 | `RegistrarPagamentoHandlerTests`/`RegistrarPagamentoSqliteTests` e `CorrigirPagamentoHandlerTests`/`CorrigirPagamentoSqliteTests`; alvo explícito, identidade/alocação preservadas e movimentação mensal. |
| Revisão e gravação única | CA-058 | `ConcorrenciaCommandsSqliteTests`, cobertura unitária de cada Command e `GravadorVendasSqliteTests`; obsolescência, corrida pós-carga, um vencedor, sem retry e conjunto completo. |
| No-op | CA-055/058 | Testes de edição/status provam zero Save/revisão avançada; revisão antiga falha antes do no-op; correção idêntica segue gravação conforme testes de recebimento. |
| Consultas completas e sem escrita | CA-057 | Testes de detalhe, coleções, resumo e período unitários/SQLite; snapshot/revisão, ordem, clientes/histórico, vazio, imutabilidade e zero escrita. |
| Período/mês reconciliáveis | CA-057 | `ConsultarPeriodoHandlerTests`/`ConsultarPeriodoSqliteTests` e `ConsultarRelatorioMensalHandlerTests`/`ConsultarRelatorioMensalSqliteTests`; bordas, todos os status, série diária, totais, extremos e correção entre meses. |
| Respostas próprias e protegidas | CA-054–057 | Testes de `MapeadorVendaResposta`, DTOs de consultas e reaberturas SQLite; centavos inteiros, datas, nulabilidade, ordens, vínculo do cliente e coleções protegidas. |
| Falhas tipadas e seguras | CA-058 | `ConversorErrosAplicacaoTests`, testes dos handlers e `HandlersFalhasCancelamentoTests`; códigos/categorias, Reasons sem dados técnicos/pessoais, exceção/código desconhecido e banco ausente distinto de venda ausente. |
| Cancelamento/commit incerto | CA-058 | `HandlersFalhasCancelamentoTests` valida protocolo; `GravadorVendasSqliteTests` comprova rollback, sucesso tardio e confirmação indeterminada com SQLite real. |
| Isolamento host/frontend | CA-059/060 | Smoke documentado acima, auditoria transitiva da API sem EF/SQLite e teste/build frontend com API desligada. |

Fechamento APP-06: restore bloqueado, build Release, 285 testes backend (88 integração
+ 197 unitários), format, auditoria NuGet, smoke da API e 430 testes/build frontend
foram observados nesta execução. `openspec validate fase-004-aplicacao --strict` e
`git diff --check` passaram; a revisão completa contra `origion/main` atualizada
encontrou 82 arquivos da Change e nenhum dado real, arquivo de banco, endpoint de
negócio, integração Angular, migration/schema ou alteração de outra Change. Não houve
achado bloqueante na matriz CA-054–060. A spec `casos-de-uso-vendas` foi sincronizada
para `openspec/specs/casos-de-uso-vendas/spec.md`; `openspec validate --specs` aprovou
11 specs, 0 falhas, com 3 avisos de descrições de requisito acima de 500 caracteres.
A Change foi arquivada em `openspec/changes/archive/2026-11-26-fase-004-aplicacao/`;
resta o PR único. Não declarar homologação operacional nem aprovação de produto.

## Contrato de armazenamento

O contrato puro está em `VendasEmAberto.Aplicacao/Persistencia/`, sem referência a
EF Core, HTTP ou handlers. `IArmazenamentoVendas` oferece:

- `InicializarAsync(caminhoAbsoluto, cancellationToken)`: prepara schema somente por
  chamada explícita e retorna `ResultadoOperacaoArmazenamento`.
- `CarregarAsync(caminhoAbsoluto, referencia, cancellationToken)`: retorna
  `ResultadoArmazenamento<SnapshotVendas>`; o snapshot contém `ConjuntoVendas`
  imutável e revisão `long` não negativa.
- `SalvarAsync(caminhoAbsoluto, candidatoCompleto, revisaoEsperada, referencia,
  cancellationToken)`: recebe o conjunto completo e retorna
  `ResultadoArmazenamento<long>` com a nova revisão, somente após confirmação do
  commit.

Falhas esperadas são `Falha(ErroArmazenamento)` com código de
`CodigosErroArmazenamento` e mensagem segura. Variantes de falha não têm propriedade
`Valor`; cancelamento e exceções inesperadas não são convertidos em erro comercial.
Revisão inicia em zero em banco novo; gravação válida incrementa uma vez e apenas
depois do commit. Falha/conflito não entrega revisão nova. A interface é assíncrona
por contrato, sem prometer I/O SQLite verdadeiramente assíncrono ou cancelamento
imediato do provider.

Ao concluir SQL-01/1.2 em 25/11/2026, `ArmazenamentoVendasContractTests` passou:
6 testes direcionados, zero falhas; o build Release da solução passou com zero
avisos/erros. Essa etapa implementou somente contrato e tipos; a inicialização foi
entregue separadamente em SQL-02/2.1.

## Modelo SQLite e migration (SQL-01/1.3)

EF e modelos de linha ficam em `VendasEmAberto.Infraestrutura/Persistencia/Sqlite/`;
nenhum tipo persistente é entidade do domínio. A migration `Inicial` cria seis
tabelas da aplicação; EF administra `__EFMigrationsHistory` separadamente:

| Tabela | Conteúdo e garantias |
| --- | --- |
| `EstadoArmazenamento` | Chave fixa `Id=1`, revisão `INTEGER >= 0`; a migration não insere estado inicial. |
| `Identificadores` | ID opaco `TEXT COLLATE BINARY` como chave global, tipo `INTEGER` restrito a Venda/Parcela/Recebimento. |
| `Vendas` | Uma linha por venda, dados de cliente próprios, status enum validado, data civil `TEXT`, total-base em centavos `INTEGER` seguro e ordem global única. CPF não tem índice único. |
| `Parcelas` | ID global, vínculo restrito à venda, número único por venda, base positiva em centavos e vencimento `TEXT`. |
| `Recebimentos` | ID global, venda, ordem única por venda, data `TEXT`, forma/origem enum validados, valor/acréscimo em centavos e observação nullable. |
| `Alocacoes` | Ordem como parte da chave primária; FKs compostas `(VendaId, RecebimentoId)` e `(VendaId, ParcelaId)` impedem cruzar vendas. Exclusões são restritas. |

Todas as colunas monetárias são `INTEGER` com CHECK no intervalo seguro de centavos;
datas são `TEXT` para `DateOnly`; enums persistem como `INTEGER` com CHECK de valores
conhecidos. IDs usam collation BINARY. FKs e constraints impedem órfãos, duplicidade
de ordem/número e alocações entre vendas. A validação de tipo da linha contra o registro
global de IDs é repetida pelo leitor; CPF pode se repetir entre vendas.

`VendasDbContextFactory` de design-time exige `--database` e caminho absoluto; usa
SQLite em modo `ReadWrite` e não chama migrations nem cria arquivo ao construir o
contexto. Comandos executados em `backend/`:

```powershell
dotnet tool run dotnet-ef -- migrations add Inicial `
  --project src/VendasEmAberto.Infraestrutura/VendasEmAberto.Infraestrutura.csproj `
  --startup-project src/VendasEmAberto.Infraestrutura/VendasEmAberto.Infraestrutura.csproj `
  --output-dir Persistencia/Sqlite/Migrations `
  -- --database "$env:LOCALAPPDATA\Temp\opencode\fase003-schema-scaffold.db"
dotnet tool run dotnet-ef -- migrations has-pending-model-changes `
  --project src/VendasEmAberto.Infraestrutura/VendasEmAberto.Infraestrutura.csproj `
  --startup-project src/VendasEmAberto.Infraestrutura/VendasEmAberto.Infraestrutura.csproj `
  -- --database "$env:LOCALAPPDATA\Temp\opencode\fase003-schema-scaffold.db"
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~VendasDbContextSchemaTests
```

O caminho de scaffolding foi conferido inexistente antes e depois da geração; nenhuma
base de desenvolvimento foi aberta. `has-pending-model-changes` informou que não há
alteração entre modelo e snapshot. Os cinco testes MSTest de schema/migration passaram
em arquivo temporário: criação das tabelas/tipos, factory sem criação, IDs globais,
ordens, CHECK monetário, CPF repetido e FKs compostas. SQL-01/1.3 não incluía
inicializador, leitura ou gravação; veja a entrega posterior SQL-02/2.1 abaixo.

## Inicialização explícita (SQL-02/2.1)

`InicializadorSqlite` é interno à Infraestrutura; não é registrado nem chamado pelo
host da API e não expõe CLI. Exige caminho absoluto e diretório pai já existente.
Quando o arquivo não existe, reserva o caminho com criação exclusiva; não substitui
arquivo concorrente. Também aceita arquivo SQLite vazio. Antes de migrar qualquer
arquivo não vazio, confere `application_id`/`user_version`, objetos SQLite, formato do
histórico e se as migrations aplicadas formam um prefixo conhecido. Tabelas, índices,
views/triggers alheios, migration futura ou schema não reconhecido retornam
`schema-incompativel` sem executar migration nem alterar o arquivo. Códigos de caminho
inválido e acesso/bloqueio também retornam mensagens seguras sem expor caminho ou SQL.

Usa `Database.MigrateAsync` somente nesta operação explícita; nunca chama
`EnsureCreated`, não aplica migrations na API e não cria dados de vendas de exemplo.
Após as migrations, cria idempotentemente a linha de controle `Id=1, Revisao=0` com
`ON CONFLICT DO NOTHING`; essa linha é estado técnico, não seed de vendas. Repetir a
inicialização mantém a revisão atual e não altera registros existentes. Não apaga
automaticamente `__EFMigrationsLock`: um lock com linha ativa resulta em
`banco-ocupado`.

Verificações da etapa em arquivos próprios sob `%TEMP%`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~InicializadorSqliteTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj `
  -c Release --no-restore --filter FullyQualifiedName~VendasDbContextSchemaTests
```

Os seis testes do inicializador e os cinco testes de schema passaram. Cobrem arquivo
novo/vazio, revisão zero, repetição sem reset, recusa de caminho relativo/pai ausente,
banco alheio e histórico futuro byte a byte inalterados. Isso verifica somente a
inicialização explícita; carga e gravação pertencem às etapas seguintes.

## Abertura por operação (SQL-02/2.2)

`AbridorVendasSqlite` abre uma sessão interna por operação e retorna `banco-ausente`
sem criar arquivo quando o caminho não existe. Só aceita migration history completa
e conhecida e schema físico corrente: confere tabelas/colunas, tipos, nulabilidade,
chaves primárias, índices nomeados, CHECKs e FKs contra o modelo EF, além da linha de
revisão. Não executa migrations nem tenta reparar schema. Banco vazio, parcial, futuro,
adulterado ou ilegível é recusado antes de entregar a sessão.

A conexão usa `Mode=ReadWrite` (nunca `ReadWriteCreate`), `ForeignKeys=true`, timeout
finito de cinco segundos e pooling desabilitado. A sessão é `IAsyncDisposable`; seu
contexto deve ser descartado ao final da operação. Linha ativa em
`__EFMigrationsLock` retorna `banco-ocupado`; nenhuma linha/tabela de lock é apagada
automaticamente. Timeout não aciona retry. O adaptador interno implementa o contrato
de armazenamento e delega ao leitor/gravador. Na etapa SQL-02, anterior à API-01/1.3,
ele ainda não estava ligado à API; a composição atual está descrita abaixo.

`AbridorVendasSqliteTests` passou com seis casos em arquivos temporários: ausência
sem criação, arquivo não SQLite preservado, schema corrente com modo/FKs/timeout
esperados, coluna alterada recusada, lock preservado como ocupado e liberação da
conexão que permite mover o arquivo. Junto aos seis testes do inicializador e cinco
de schema, são 17 testes direcionados aprovados naquela etapa. `Program.cs` e
endpoints/health não foram alterados então; API-01/1.3 posteriormente adicionou a
composição da Infraestrutura e o bootstrap explícito.

## Leitura transacional (SQL-03/3.1)

`LeitorVendasSqlite` usa a sessão de abertura validada e carrega, em uma transação de
leitura e com `AsNoTracking`, o estado de revisão, o registro global de identificadores,
vendas, parcelas, recebimentos e alocações. Mantém a ordem global das vendas e as ordens
persistidas de recebimentos/alocações; parcelas são reconstituídas por número. Verifica
sequências de ordem e correspondência de cada ID com seu tipo registrado antes de
montar o snapshot.

Dinheiro passa por `Dinheiro.Criar`; cliente por `DadosClienteVenda.Criar` e comparação
ordinal com os campos armazenados (se a fábrica normalizaria algum campo, o leitor
recusa em vez de alterar); cada venda passa por `Venda.Reconstruir` com a referência
civil fornecida; o conjunto completo passa por `ConjuntoVendas.Criar`. Só depois de
todas as validações a operação confirma a transação e entrega `SnapshotVendas` com a
revisão lida na mesma transação. Histórico de domínio inconsistente retorna
`dados-persistidos-invalidos` sem snapshot parcial. Observação nula é recusada; texto
vazio e Unicode são preservados. Não há projeção persistida, reparo ou uso de valores
reconstruídos por aproximação.

O leitor permanece interno; nenhuma leitura é ligada à API. Os quatro testes
`LeitorVendasSqliteTests` preparam fixtures
por SQL em arquivos temporários após inicializar a migration. Cobrem conjunto vazio e
revisão corrente, todos os campos de uma venda com entrada e pagamento Individual,
duas vendas com CPF repetido, descrição nula, notas Unicode e ordem, datas civis
extremas válidas e `Dinheiro.LimiteCentavos`. O comando focado passou com 4/4 testes;
a suíte `FullyQualifiedName~Persistencia` passou com 21/21 após a leitura.
Oráculo SQL-REP-01: datas civis válidas permanecem exatas; o centavo máximo permanece
inteiro, sem conversão por `REAL`, arredondamento ou reconstrução de datas por relógio.

### Histórico, correção e relatórios (SQL-03/3.2)

`LeitorHistoricoVendasSqliteTests` usa fixture SQL própria em arquivo temporário, criada
após a migration e sem depender de `SalvarAsync`. A venda-base de 20.000 com duas
parcelas tem entrada de 10.000; uma Individual persistida pelo estado final da correção
mantém o ID, valor 10.500/acréscimo 500 e data em março. Uma segunda venda contém lote
de 20.000 alocado a duas parcelas e Individual de 11.000/acréscimo 1.000. A sequência
armazenada põe o lote de 20/03 antes do Individual de 15/02: a leitura mantém `Ordem`,
sem reordenar o histórico pela data. Fixtures adicionais cobrem recebimentos em
Inativa e Prejuízo.

Oráculos SQL-HIS-01/SQL-COR-01/SQL-ORD-01: projeção da venda com entrada = base 20.000,
efetivo/recebido 20.500 e saldo zero; projeção da venda com lote = base 40.000,
acréscimos 1.000, efetivo 41.000, recebido 31.000 e saldo 10.000; a mesma parcela e
identidade do Individual permanecem vinculadas. As coleções projetadas mantêm uma
Quitada, uma Aberta, uma Inativa e um Prejuízo. O relatório de março inclui todos os
status: 40.500 recebidos (10.500 em 05/03, 10.000 em 10/03 e 20.000 em 20/03), cuja
soma diária reconcilia. Fevereiro totaliza 11.000 do outro Individual e não inclui o
ID corrigido, demonstrando a data final persistida sem duplicidade. Prejuízo com
histórico permanece separado; total agregado de Prejuízo = 0 conforme regra vigente.

O teste direcionado `LeitorHistoricoVendasSqliteTests` passou 1/1; a suíte de
persistência passou 22/22 naquele marco. São fixtures sintéticas/oráculos do domínio,
não evidência de migração ou escrita de produção.

### Rejeição de histórico inválido (SQL-03/3.3)

`LeitorDadosInvalidosVendasSqliteTests` cobre 16 adulterações controladas em fixtures
sintéticas, com uma venda Ativa com entrada, uma Inativa e uma em Prejuízo. As alocações
de entrada 9.999 e 10.001 contra recebimento/base 10.000 são rejeitadas. Também são
rejeitados data civil impossível, forma/status desconhecidos, ID vazio, registro de ID
com tipo errado/ausente, lacunas nas ordens globais/de recebimentos/de alocações,
alocação cruzada, observação nula, total-base zero e somas globais inseguras ao levar
uma venda Inativa ou em Prejuízo ao limite individual de centavos.

Cada caso verifica `Falha(dados-persistidos-invalidos)` sem snapshot, consulta o arquivo
para provar que o leitor não reparou nem omitiu a linha inválida, restaura explicitamente
os valores da fixture e faz nova leitura (nova sessão/conexão), que recupera as três
vendas e a revisão zero. Para enum inválido, ID ausente e vínculo cruzado, primeiro se
comprova a recusa normal por CHECK/FK; só então a fixture de defesa de leitura usa
`ignore_check_constraints` ou `foreign_keys=OFF` na conexão de teste, nunca no leitor.
Uma colisão de ID entre tipos também é recusada pela PK global e a fixture segue legível.

SQL-HIS-02/HIS-005–007: tentativas de entrada divergente falham antes da publicação do
conjunto; restauração explícita permite reler sem estado residual. Teste focado: 17/17;
suíte `FullyQualifiedName~Persistencia`: 39/39; build Release sem avisos ou erros.
A adulteração é exclusiva das fixtures temporárias e não representa uma operação
pública de reparo.

## Gravação transacional (SQL-04/4.1)

`ArmazenamentoVendasSqlite` implementa internamente `IArmazenamentoVendas`; o gravador
materializa e valida o candidato completo pelo domínio, abre sessão em modo `ReadWrite`
e inicia `BeginTransaction(deferred: false)` antes de consultar a revisão e o conjunto
atual. A carga de validação reutiliza o mesmo `VendasDbContext` e a mesma transação: uma
primeira tentativa por segunda conexão produziu `banco-ocupado`, então essa validação foi
extraída para `CarregarNaTransacaoAtualAsync`, sem abandonar a trava adquirida antes da
leitura.

Na revisão esperada, incrementa `EstadoArmazenamento.Revisao` com `WHERE Revisao = $esperada`
e exige uma linha afetada. No mesmo commit, reconcilia por ID e faz upsert parametrizado
das entidades e linhas relacionadas; não exclui nem recria a base. Ordens existentes de
vendas, parcelas, recebimentos e alocações passam por uma faixa temporária não colidente
dentro da transação antes de receber os valores finais, protegendo os índices únicos sem
publicar a etapa intermediária. O retorno só contém a revisão depois do commit.

Um snapshot idêntico salvo com a revisão corrente é aceito e avança uma vez (não é
deduplicação de transporte); salvar com revisão antiga conflita. O custo da validação e
reconciliação é proporcional ao conjunto completo lido e às linhas atualizadas; nenhum
benchmark ou limite operacional foi medido. Leitor/gravador continuam internos e não
são registrados na API.

`GravadorVendasSqliteTests` parte de fixture sintética com entrada, lote, Individual
corrigido com nova data, ordem não cronológica, Inativa e Prejuízo. Grava em banco
preparado vazio, fecha a operação e relê por nova conexão; compara profundamente raízes,
clientes, status, datas, parcelas, recebimentos, acréscimos, observações, origens e
alocações. Salvar o mesmo candidato na revisão 1 retorna revisão 2 sem duplicação.
Na entrega SQL-04/4.1, o teste focado passou 1/1 e a suíte
`FullyQualifiedName~Persistencia` passou 40/40; build Release com zero avisos/erros e
`dotnet format --verify-no-changes --no-restore` passaram. Fixtures e arquivos são
próprios/temporários; nenhuma operação usou banco operacional ou dados reais.

### Preservação de contratos e histórico (SQL-04/4.2)

Antes de qualquer DML, o gravador compara cada venda existente pelo ID. Não aceita
omissão de raiz; preserva data/base da venda e a coleção ordenada de parcelas (ID,
número, valor-base e vencimento). Recebimentos existentes têm de permanecer no mesmo
prefixo e ordem. Entrada e lote são imutáveis, incluindo ID, data, forma, valores,
observação e alocações. Individual pode ser corrigido conforme o domínio, mas mantém
ID, origem, ordem e parcela alocada; campos corrigíveis e valor da alocação podem mudar
somente se a venda candidata continuar válida. Recebimentos novos em venda já existente
devem ser Individual. Novas vendas podem trazer entrada na formação inicial.

Testes de recusa verificam omissão de venda, remoção/troca de parcela, alteração do
contrato-base, remoção de recebimento, reescrita de entrada/lote e troca de identidade
ou parcela vinculada a Individual. Candidatos com IDs colidentes entre tipos ou overflow
do total global são construídos pelas fábricas públicas do domínio e recusados como
`candidato-invalido`. Cada falha é seguida de releitura que compara todo o conjunto e
revisão anterior. No sucesso, operações reais do domínio editam cliente, reativam status,
registram baixa e corrigem Individual; a venda não alterada e as demais raízes/históricos
permanecem preservados. Testes da classe `GravadorVendasSqliteTests`: 6/6; suíte
`FullyQualifiedName~Persistencia`: 45/45; build Release sem avisos/erros e format verify
passaram. Tudo em arquivos sintéticos temporários.

### Concorrência e leitura consistente (SQL-04/4.3)

Com journal DELETE padrão e sem WAL obrigatório, o gravador mantém transação SQLite
imediata. O leitor agora inicia transação deferred e adquire seu snapshot no primeiro
SELECT: assim, enquanto um writer mantém atualização de cliente e revisão sem commit, a
leitura observa integralmente a versão anterior; após commit, nova leitura observa
integralmente a versão nova. Não há exposição de linhas intermediárias.

Uma barreira libera dois consumidores com candidatos diferentes e a mesma revisão:
exatamente um confirma revisão 1 e o outro recebe `conflito-revisao`; o snapshot final
corresponde integralmente ao candidato vencedor. Uma nova tentativa com revisão antiga
também conflita e preserva o estado. Sob uma conexão que mantém `BEGIN IMMEDIATE`, uma
gravação concorrente retorna `banco-ocupado` após 5,248 s para timeout configurado de
5 s; não há retry automático nem alteração da revisão/snapshot. Revisão `long.MaxValue`
é recusada com `limite-revisao-excedido`, sem overflow ou escrita.

Os quatro testes novos de SQL-04/4.3 passaram; a classe do gravador passou 10/10 e a
suíte `FullyQualifiedName~Persistencia` 49/49. Build Release sem avisos/erros e
`dotnet format --verify-no-changes --no-restore` passaram. A concorrência é coberta em
arquivos sintéticos temporários; isso não constitui homologação operacional.

### Rollback, cancelamento e confirmação (SQL-04/4.4)

Um seam interno `IIntervencaoTransacionalGravacaoSqlite`, usado somente pela composição
de testes, pausa/falha após a primeira alteração (token de revisão) e envolve a
confirmação sem alterar o contrato da Aplicacao ou registrar serviço na API. Uma falha
inesperada nesse ponto propaga a mesma exceção; a transação descartada reverte revisão e
snapshot. Nova conexão confirma o estado anterior, e uma gravação válida posterior pode
confirmar normalmente.

Cancelamento já solicitado antes da abertura e cancelamento observado depois da primeira
alteração propagam `OperationCanceledException` e deixam revisão/dados anteriores. Se o
commit completou e o token é cancelado depois, o método retorna sucesso com revisão
confirmada; não relata rollback de estado já publicado. Exceção durante a confirmação é
tratada como `confirmacao-indeterminada`, com instrução para recarregar e conferir revisão,
sem retry automático. O teste simula perda do ACK após o commit real: resposta fica
indeterminada, uma única confirmação é invocada e a recarga encontra o conjunto salvo.

Mensagens de `banco-ocupado` e confirmação indeterminada são verificadas sem SQL, CPF,
telefone ou caminho pessoal. `OpcoesVendasDbContext` mantém logging de dados sensíveis
desativado. Cinco testes novos de SQL-04/4.4: classe do gravador 15/15; suíte
`FullyQualifiedName~Persistencia` 54/54; build Release sem avisos/erros e
`dotnet format --verify-no-changes --no-restore` passaram. A injeção é interna e não
compõe uma rota ou contrato de produção.

## Fechamento integrado e rastreabilidade (SQL-05)

### Matriz dos critérios de aceite

| PRD / requisito | Evidência em testes e comportamento | Resultado |
| --- | --- | --- |
| CA-049 / RF-024 — fidelidade e round-trip | `LeitorVendasSqliteTests` (vazio, campos, ordem, Unicode, CPF repetido e extremos), `LeitorHistoricoVendasSqliteTests`, `GravadorVendasSqliteTests.Salvar_ReabreRoundTripCompletoEIncrementaRevisaoSemDuplicarSnapshotIdentico` e `Salvar_AceitaEdicaoClienteStatusBaixaECorrecaoPreservandoDemaisVendas` | Coberto; leitura e reabertura em SQLite real usando fixtures sintéticas temporárias. |
| CA-050 / RF-024–025 — atomicidade, revisão e concorrência | `GravadorVendasSqliteTests` cobre omissão, histórico protegido, colisão/overflow, consumidores concorrentes, revisão obsoleta, timeout, rollback, falhas, cancelamento e confirmação indeterminada | Coberto; revisão e snapshot permanecem atômicos; confirmação ambígua exige recarga e não retry. |
| CA-051 / RF-024/026 — preparação e rejeição integral | `InicializadorSqliteTests`, `AbridorVendasSqliteTests`, `LeitorDadosInvalidosVendasSqliteTests` e `VendasDbContextSchemaTests` | Coberto; arquivo ausente/alheio/futuro, schema e histórico inválidos recusados sem criação, reparo ou retorno parcial. |
| CA-052 / RF-026 — verificação integrada e isolamento | Suíte backend, restore bloqueado, build/format, auditoria NuGet, grafo da API, smoke real, testes/build frontend em cópia isolada; OpenSpec estrito | Coberto com as limitações de ambiente descritas abaixo; nenhum acesso a dados reais ou banco operacional. |

### Matriz dos cenários OpenSpec

| Requisito / cenários da delta | Evidências associadas | Auditoria |
| --- | --- | --- |
| Preparação explícita — “Preparar arquivo novo e repetir a preparação”; “Recusar caminho ou arquivo incompatível”; “Ler ou gravar sem preparação” | `InicializadorSqliteTests` cobre criação/revisão zero, repetição, preservação, caminho inválido e banco alheio/futuro; `AbridorVendasSqliteTests.Abrir_ArquivoAusenteRetornaBancoAusenteSemCriarArquivo`; gravador reutiliza o abridor sem criar/migrar | Coberto; schema desconhecido e arquivo ausente não são sobrescritos. |
| Recuperação fiel — “Reabrir venda com entrada”; “Preservar correção individual e histórico em lote”; “Preservar representação e universos”; “Ler banco preparado vazio” | `LeitorVendasSqliteTests`, `LeitorHistoricoVendasSqliteTests` e round-trip/gravação válida em `GravadorVendasSqliteTests` | Coberto com SQLite real, reabertura e fixtures sintéticas. |
| Rejeição de dados — “Recusar entrada divergente antes de entregar snapshot”; “Recusar outros estados inválidos” | `LeitorDadosInvalidosVendasSqliteTests.Carregar_RejeitaCorrupcaoSemRepararERelêAposRestauracao` (casos parametrizados) e constraints/FKs em `VendasDbContextSchemaTests` | Coberto; falha integral, restauração explícita e releitura em conexão nova. |
| Gravação atômica — “Confirmar candidato válido”; “Concorrência entre consumidores”; “Rejeitar candidato inválido ou limite de revisão”; “Salvar o mesmo snapshot com revisão atual” | Round-trip e repetição de snapshot em `GravadorVendasSqliteTests`; `Salvar_DoisConsumidoresNaMesmaRevisaoConfirmamUmaUnicaVersaoIntegra`; `Salvar_RecusaRevisaoLongMaxValueSemOverflowNemAlteracao`; candidatos inválidos e timeout também cobertos | Coberto; um consumidor confirma, conflito/revisão máxima não alteram o estado, sem retry automático. |
| Preservação — “Omitir venda existente”; “Tentar apagar ou reescrever histórico protegido”; “Atualizar cliente e status sem perda de histórico” | `Salvar_RecusaOmissaoDeVendaSemAlterarDadosNemRevisao`, `Salvar_RecusaAlteracoesDeContratoEntradaLoteEIdentidadeIndividualSemGravar`, `Salvar_RecusaTrocarIdentidadeEParcelaAlocadaEntreIndividualSemAlterarEstado` e `Salvar_AceitaEdicaoClienteStatusBaixaECorrecaoPreservandoDemaisVendas` | Coberto; sucessos e recusas verificam preservação de revisão/dados. |
| Falhas e cancelamento — “Falha intermediária e tentativa válida posterior”; “Cancelar antes ou depois da confirmação”; “Arquivo ocupado ou inacessível”; “Confirmação de commit indeterminada” | `GravadorVendasSqliteTests` cobre rollback, exceção, cancelamento pré/durante/pós commit, timeout `banco-ocupado`, mensagem segura e ACK perdido após commit | Bloqueio/timeout, rollback, cancelamento e confirmação indeterminada cobertos; falha de acesso negado específica do sistema operacional não foi induzida separadamente. |
| Isolamento — “Iniciar API sem banco”; “Executar integração em isolamento” | Smoke da DLL Release; grafo/projeto da API; testes SQLite em fixtures temporárias; validação frontend independente | Coberto para API loopback/health/404 sem banco e fixtures locais; nenhuma UI foi alterada. |

### Execuções finais

No diretório `backend/`, com SDK .NET 10.0.404 e runtime .NET/ASP.NET Core 10.0.15:

```text
dotnet tool restore                                      — sucesso
dotnet tool run dotnet-ef --version                     — Entity Framework CLI 10.0.15
dotnet restore VendasEmAberto.slnx --locked-mode        — sucesso
dotnet build VendasEmAberto.slnx -c Release --no-restore — sucesso, 0 avisos/erros
dotnet test --solution VendasEmAberto.slnx -c Release --no-build — 203/203 aprovados
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore — sucesso
dotnet test --solution VendasEmAberto.slnx -c Release --no-build --list-tests — 203 descobertos
dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive — nenhum vulnerável reportado
```

A descoberta contou 62 testes de integração e 141 unitários. A suíte de persistência
foi exercitada em etapa própria: 54/54. A API referencia somente `Aplicacao`; sua lista
de pacotes e `Api.deps.json` não incluem Infraestrutura, EF Core ou SQLite. Nenhum
arquivo SQLite está versionado; o `.gitignore` do backend limita-se a saídas locais de
build/testes e arquivos locais de usuário/lock temporário.

O smoke iniciou a DLL Release em processo próprio na porta temporária 59617, ligada
somente a `127.0.0.1`: `/health` respondeu 200 `text/plain` com `Healthy`,
`/vendas` respondeu 404 e nenhum arquivo `.db`/SQLite foi criado. O processo foi
encerrado e a porta liberada. O host não iniciou com banco preparado nem conectou a
persistência.

No frontend, `npm ci` no diretório original encontrou `EPERM` ao remover
`node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node`, bloqueado
por servidores `ng serve` ativos. Por decisão do usuário, os processos existentes
(dois `ng serve` ativos) não foram encerrados e o comando não foi repetido nesse diretório;
o estado local do `node_modules` pode requerer restauração quando os servidores forem
encerrados pelo usuário. Para validar sem tocar nesse ambiente, foi usada cópia
temporária do código/lockfile, sem `node_modules` ou `.angular`: `npm ci` instalou 301
pacotes e reportou zero vulnerabilidades; `npm.cmd test -- --watch=false` passou 33
arquivos/430 testes; `npm.cmd run build` concluiu com sucesso, com API desligada.
Ambiente frontend: Node v24.21.0 e npm 11.19.0.

E2E, revisão visual/zoom e validação operacional não foram executados: não houve
alteração de UI e esta biblioteca ainda não está homologada para dados/uso operacional.
Não houve acesso a planilha ou banco real. A Change OpenSpec registra a matriz
completa: `openspec/changes/fase-003-persistencia-sqlite/`, vinculada ao PRD/FON-041/
RF-024–026/CA-049–052 e TDD/DEC-038.

## Correção de contratos e rastreabilidade (OpenSpec)

**Inspeção que originou a Change `corrigir-contratos-e-rastreabilidade`:** a consulta
por período selecionava vendas pela data, sem restringir o status, embora os relatórios
operacionais usem somente Ativas; o cálculo de recebimentos percorre os contratos de
todos os status. O teste de reconstrução HIS-007 cobria entrada válida, mas ainda não
uma tentativa inválida seguida de válida no mesmo método. PRD/TDD também reutilizavam
IDs entre a correção MSTest e a persistência SQLite.

**Plano aprovado:** `ConsultarPeriodo.Vendas` deve retornar somente Ativas vendidas no
intervalo civil inclusivo, preservando a ordem; recebimentos de todos os status ficam
no período da data efetiva. O mesmo teste HIS-007 deve provar rejeição sem mutação e
sucesso subsequente. A rastreabilidade canônica é DEC-039/CA-053/FON-042 para MSTest
e DEC-038/CA-049/FON-041 para persistência. Referências históricas e resultados de
Changes concluídas são preservados; detalhes e critérios estão em `docs/prd/vendas-em-aberto.md`,
`docs/tdd/tdd.md` e na Change OpenSpec `corrigir-contratos-e-rastreabilidade`.

**Execução registrada nesta atualização:** MAN-01 remapeou as referências MSTest no
PRD/TDD e documentou a reconciliação com RF-023/RN-026/DEC-037. A inspeção de referências
não encontrou IDs adicionais a alterar na Change MSTest ou neste README antes desta seção.
COR-01 restringiu `ConsultarPeriodo.Vendas` a Ativas vendidas no intervalo, sem filtrar
recebimentos por status. Em `backend/`, a classe direcionada passou com SDK isolado
10.0.404:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConjuntoVendasConsultasTests"
```

Resultado: 7 aprovados, 0 falhas e 0 ignorados. Isso cobre a consulta por período,
incluindo os casos adicionados CON-012/013; não é a regressão integrada. As verificações
integradas permanecem pendentes; estes resultados não declaram aceite final nem
substituem as evidências históricas acima.

**Regressões COR-01 executadas em sequência**, também em `backend/` com o mesmo SDK
10.0.404, Release e `--no-restore`:

| Filtro MSTest | Aprovados | Falhas/ignorados |
| --- | ---: | ---: |
| `FullyQualifiedName~RelatorioMensalVendasTests` | 5 | 0/0 |
| `FullyQualifiedName~VendaProjecaoTests` | 4 | 0/0 |
| `FullyQualifiedName~ConjuntoVendasTests` | 7 | 0/0 |
| `FullyQualifiedName~LeitorHistoricoVendasSqliteTests` | 1 | 0/0 |

Cada filtro foi executado por `dotnet test` no respectivo projeto UnitTests (três
primeiros) ou IntegrationTests (último). Os casos de relatório confirmam vendas
operacionais somente Ativas e recebimentos históricos de todos os status, sem alterar
as posições/regras de persistência. A produção alterada nesta entrega é somente o
predicado de seleção de vendas em `ConjuntoVendas.Consultas.cs`; nenhum relatório,
validador global ou contrato SQLite foi refatorado.

**HIS-007 sequencial — 26/11/2026:** o mesmo teste agora tenta reconstruir entrada
recebida de 10.000 com alocação de 9.999, confere a falha tipada e a preservação das
entradas e do conjunto anterior, e então reconstrói fixture independente com os mesmos
IDs e alocação exata de 10.000. Na mesma referência, a versão válida reconcilia base e
efetivo de 20.000, recebido/saldo de 10.000, 1/2 paga e recebimento único no período;
`Venda.Reconstrucao.cs` não mudou.

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~VendaReconstrucaoTests"
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore
```

Executados em `backend/`, sequencialmente: classe `VendaReconstrucaoTests`, 11/11
aprovados; UnitTests completa, 143/143 aprovados; zero falhas ou ignorados em ambas.
Esses resultados são direcionados à reconstrução/domínio, não substituem a regressão
integrada de toda a solução.

**Regressão integrada VER-01/4.1 — 26/11/2026:** executada em `backend/` com SDK
isolado .NET 10.0.404 (host/runtime 10.0.15, Windows x64). O `dotnet` do PATH seleciona
10.0.103 e não satisfaz `global.json`; nenhum SDK foi instalado ou alterado. Comandos,
em sequência, todos com código de saída 0:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" --info
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" restore VendasEmAberto.slnx --locked-mode
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" build VendasEmAberto.slnx -c Release --no-restore
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test --solution VendasEmAberto.slnx -c Release --no-build
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Restore bloqueado e format verify passaram; build Release passou com 0 avisos/erros;
as suítes não vazias UnitTests e IntegrationTests aprovaram 205 testes no total,
0 falhas e 0 ignorados. Os critérios cobrem domínio, API e persistência SQLite.

**Smoke VER-01/4.2 — 26/11/2026:** a DLL Release foi iniciada diretamente, sem launch
profile, com `Backend__Porta=62741`, em loopback. `/health` respondeu HTTP 200,
`text/plain`, `Healthy`; `/vendas` respondeu HTTP 404. Nenhum arquivo `.db`, `.sqlite`
ou `.sqlite3` foi criado. O processo próprio (PID 6820) foi encerrado e a porta ficou
livre.

Com a API parada, foi tentado `npm.cmd test -- --watch=false` em `frontend/`; terminou
com código 1 porque não encontra o pacote/builder `@angular/build:unit-test`
(`Node packages may not be installed`). Embora exista diretório `node_modules`, a
dependência de teste estava indisponível. Após autorização Harness para preparar o
ambiente e atualizar D6/VER-01, foi executado `npm.cmd ci` em `frontend/`: 301 pacotes
adicionados, 308 auditados e nenhuma vulnerabilidade reportada. npm avisou que quatro
pacotes têm scripts de instalação ainda não cobertos por `allowScripts`. Node `v24.21.0`
e npm `11.19.0` correspondem aos requisitos do manifesto; `@angular/build` e seu
`builders.json` agora existem em `node_modules`. `package.json` e `package-lock.json`
permanecem sem diff. Após a restauração, `npm.cmd test -- --watch=false` passou com
430 testes em 33 arquivos e `npm.cmd run build` concluiu, ambos em `frontend/` com
código de saída 0; o bundle foi gerado em `frontend/dist/vendas-em-aberto`. O aviso de
quatro scripts ainda não cobertos por `allowScripts` permaneceu, mas não impediu testes
ou build. Não houve alteração de fontes frontend.

**Auditoria final VER-01/4.3 — 26/11/2026:** os cenários da delta estão ligados aos
testes CON-008/012/013 e HIS-007 no catálogo; a documentação mantém DEC-038/CA-049/
FON-041 para SQLite e DEC-039/CA-053/FON-042 para MSTest, com aliases antigos
qualificados. `openspec validate corrigir-contratos-e-rastreabilidade --strict`,
`openspec validate corrigir-resolucao-sdk-mstest --strict`, `git diff --check` e a
checagem de whitespace contra `origion/main` passaram. A `main` local está sincronizada
com `origion/main`; o diff da feature contém somente arquivos e áreas previstos pela
Change.
Limitações: a extensão VS Code não foi verificada; E2E visual/zoom não se aplicam por
não haver alteração de UI. O aviso npm de scripts não cobertos por `allowScripts` foi
preservado acima; testes e build frontend ainda assim passaram. Não há alterações em
dependências/manifests, persistência ou API de negócio.

## Estado de verificação

### Contrato de resultados do domínio

O domínio representa operações esperadas com `ResultadoDominio<T>`: `Sucesso`
contém o valor e `Falha` contém um `ErroDominio` com categoria (`Validacao`,
`Inexistencia`, `Conflito` ou `RegraNegocio`), código estável, mensagem pública em
pt-BR e campo opcional. A variante de falha não possui propriedade de valor. O
contrato não referencia HTTP, FluentResults ou outro pacote de produção. A suíte
UnitTests referencia diretamente o projeto Dominio, além da referência Api mantida
para os testes técnicos.

Os casos iniciais RES-001/RES-002 e sua rastreabilidade estão em
`tests/VendasEmAberto.UnitTests/Dominio/catalogo-paridade.md`.

`Dinheiro` guarda somente centavos `long` entre zero e `9.007.199.254.740.991`,
o limite comum com `Number.MAX_SAFE_INTEGER`. Criação, soma e subtração são
validadas e retornam resultado de domínio tipado; valores negativos ou operações
que ultrapassem o intervalo não produzem um novo valor. Formatação e interpretação
de reais permanecem responsabilidade dos consumidores.

`CalendarioCivil` usa exclusivamente `DateOnly` gregoriano, sem relógio ou fuso.
Cada vencimento mensal é calculado a partir da data-base original; o alcance do
último vencimento é validado antes de alocar a coleção. A classificação na janela
de dias compara diferença civil inclusiva e não soma dias à referência, inclusive
em `9999-12-31`. Este núcleo recebe datas já tipadas; parse e apresentação textual
permanecem nas fronteiras consumidoras.

`DadosClienteVenda` é criado por fábrica validada e expõe apenas propriedades de
leitura. Nome é obrigatório e aparado; CPF aceita somente a formatação local
permitida, dígitos ASCII e verificadores válidos; telefone aceita 10 ou 11 dígitos
ASCII com formatação permitida, sem `+55`. CPF não é único entre vendas. Descrição
vazia é representada por `null`. `FormaPagamento` restringe as operações a dinheiro,
Pix, cartão de débito ou cartão de crédito e possui validação explícita de valores de
enum desconhecidos.

`Venda` é a raiz imutável do agregado: conserva identificadores fornecidos pelo
chamador, cliente, data civil, total-base, status e coleções defensivas de parcelas
e recebimentos. O cadastro sem entrada verifica total positivo, uma unidade mínima
de centavo por parcela, data não futura, alcance do calendário e unicidade local de
IDs antes de publicar o agregado. A distribuição do resto prioriza as primeiras
parcelas. Cada parcela e alocação é imutável; nenhuma operação gera IDs.

Com entrada, a quantidade solicitada inclui a entrada como parcela 1; ela vence e
é recebida uma única vez na data da venda, com forma explícita. A distribuição do
saldo ocorre apenas nas parcelas futuras. Entrada zero, integral, sem parcela futura,
com data divergente ou forma desconhecida é rejeitada antes de publicar a venda.

O histórico reconstruído distingue `Entrada`, `Individual` e `HistoricoLote` por
origem explícita. A fábrica `Venda.Reconstruir` valida o parcelamento-base,
identidades, vínculos, sequência, datas, formas, metadados individuais e reconciliação
financeira antes de criar a raiz; alocação Individual deve igualar o valor efetivo
recebido. Ela existe para estados sintéticos completos de consulta/teste; não importa
planilhas/dados reais e não oferece comando para registrar novas baixas em lote. O
catálogo documenta lotes de uma e várias parcelas e as falhas de reconstrução
correspondentes.

`Venda.EditarCliente` recebe somente nome, CPF, telefone e descrição; valida o novo
cliente e retorna outra raiz preservando status, contrato, parcelas, recebimentos,
identificadores e a venda original. A operação é por agregado, sem procura nem
propagação por CPF.

`Venda.RegistrarPagamento` aceita somente a primeira parcela pendente de uma venda
Ativa, com data entre venda e referência explícita e uma das quatro formas vigentes.
O valor recebido pode superar a base; a diferença fica no recebimento Individual,
sem reescrever parcelas futuras ou o total contratual. Salto, repetição, entrada já
paga, identidade duplicada ou estado administrativo inelegível retorna falha sem
publicar novo agregado.

Observação opcional é normalizada para texto vazio quando ausente e limitada a 20
valores escalares Unicode por `Rune`, não por unidades UTF-16; seu conteúdo é
preservado sem aparar.

`Venda.CorrigirPagamento` substitui os dados do mesmo recebimento Individual de uma
venda Ativa, inclusive quitada: preserva ID e vínculo à parcela, atualiza a alocação
para o novo valor efetivo e recalcula o acréscimo sem alterar a base, outras parcelas
ou recebimentos. Revalida mínimo-base, data, forma e observação pelas mesmas regras
da baixa; repetição corrige o registro existente em vez de acrescentar outro. O
conjunto de vendas conhecidas é recebido somente para distinguir ID de outra venda
de ID inexistente; a operação devolve apenas a raiz corrigida. Entrada, lote
histórico, recebimento ausente e venda Inativa/Prejuízo falham sem mutar qualquer
venda. A validação/aceitação global é uma fronteira distinta em `ConjuntoVendas`:
operações locais não publicam automaticamente suas raízes; o consumidor valida o
candidato completo antes de adotar o novo snapshot.

`Venda.AlterarStatusAdministrativo` aplica a matriz Ativo→Inativo, Ativo→Prejuízo
com saldo e retorno de Inativo/Prejuízo a Ativo. Solicitar o status atual é um no-op
que devolve a mesma raiz; transições diretas entre Inativo e Prejuízo e Prejuízo em
venda quitada falham tipadamente. Cada transição permitida cria nova raiz e conserva
cliente, contrato-base, parcelas, vencimentos e recebimentos — sem estorno ou exclusão.

`Venda.Projetar(referencia)` revalida o histórico e devolve uma projeção imutável de
parcelas e venda. Por parcela, informa base, acréscimo, efetivo, recebido, saldo,
situação e dados do pagamento; no agregado, reconcilia base + acréscimos = efetivo,
efetivo − recebido = saldo, quantidade paga e primeiro vencimento pendente. Parcela
paga prevalece sobre atraso; vencimento anterior à referência é Atrasada, de hoje a
sete dias é Próximos dias e além disso é Em aberto. A situação da venda prioriza
Quitada, Atrasada, Próximos dias e Em aberto. A consulta não modifica o agregado e
protege a coleção projetada contra mutação externa.

`ConjuntoVendas.Criar` valida a coleção inicial e `AceitarCandidato` prepara um novo
snapshot somente após conferir unicidade ordinal global entre IDs de vendas,
parcelas e recebimentos e somas seguras de base, efetivo, recebido e saldo. A
verificação inclui vendas Inativas e em Prejuízo, mesmo que projeções operacionais
posteriores as separem. Candidatos rejeitados não são retornados como sucesso nem
alteram o conjunto anterior; aceitar um candidato também não publica nem persiste
estado por conta própria. O consumidor escolhe se conserva o novo conjunto. A
fronteira não captura exceções inesperadas: falhas técnicas propagam sem serem
classificadas como regra comercial. A garantia é de validação e imutabilidade em
memória, não de concorrência, transação ou persistência.

Os casos CON-001–CON-006 do catálogo cobrem colisões entre tipos/agregados, soma
insegura em estados não operacionais, cadastro/baixa/correção localmente válidos mas
globalmente inválidos, rejeição sem publicação parcial, descarte de preparação e
propagação de falha técnica.

`ConjuntoVendas.Projetar(referencia)` devolve projeções de todas as vendas e
coleções separadas: Abertas e Quitadas contêm somente Ativas; Inativas e Prejuízos
ficam em coleções próprias. `TotalEmAberto`, `ValoresEmAtraso` e
`VendasCadastradas` consideram somente Ativas, enquanto `RecebidoNoMes` agrega os
movimentos civis do mês da referência em todos os status. A consulta reusa as
projeções puras de venda e não altera as raízes nem a ordem original.

`ConjuntoVendas.ConsultarPeriodo(inicio, fim)` recebe `DateOnly`, exige intervalo
ordenado e inclui integralmente as duas datas-limite. Soma recebimentos de todos os
status por data efetiva e devolve as vendas cuja data de cadastro está no período;
essa consulta de eventos não reconstrói posição histórica. A falha por intervalo
invertido é `Validacao/periodo-invalido`. Consultas vazias retornam coleções vazias e
totais zero, e as coleções devolvidas são somente leitura. Os casos CON-007–CON-011
registram vazio, bordas inclusivas, universo dos status, totais operacionais,
reativação e intervalo inválido.

`ConjuntoVendas.GerarRelatorioMensal(referencia, mesSelecionado)` é uma projeção
puramente mensal. Sem mês selecionado, usa o mês civil da referência; ao selecionar
outro mês, troca somente os limites de movimentos/vendas mensais, mantendo a mesma
referência para posições. A série diária contém todos os dias do mês e zeros, e sua
soma reconcilia com os recebimentos detalhados. Cada recebimento de Entrada,
HistoricoLote ou Individual é contado uma única vez por seu valor, sem somar
alocações novamente; movimentos incluem todos os status.

Vendas do mês consideram somente Ativas pela data de venda e totalizam o valor
efetivo (base mais acréscimos). Saldos e parcelas atrasadas são posições da
referência, somente de Ativas, ordenadas por vencimento e estáveis nos empates.
Prejuízo lista todas as parcelas pendentes em seção separada; somente vendas sem
recebimentos contribuem ao total, e uma entrada também conta como recebimento.
Relatório, listas, itens e série devolvidos são imutáveis. Nenhum componente de UI,
histórico de posição ou persistência é introduzido. Os casos REL-001–REL-006
documentam limites de mês/calendário, reconciliação diária, status, entrada/lote,
correção entre meses e estabilidade de ordenação.

### Auditoria do catálogo de paridade — DOM-07

A revisão do catálogo contra CA-046/047 e todos os cenários da delta da capability
`dominio-vendas` encontrou e fechou duas lacunas de cobertura: overflow local na
baixa (`PAG-005`) e na correção (`COR-004`). Os testes usam uma venda sintética de
2 centavos e recebimentos próximos de `9.007.199.254.740.991`; as expectativas
numéricas são explícitas e confirmam falha tipada sem publicar/alterar recebimentos.
As demais linhas do catálogo ligam fonte/regra, entrada, resultado esperado e método
MSTest, cobrindo cadastro, identificação, calendário, reconstrução, isolamento,
status, conjunto e projeções. A implementação C# não é usada como oráculo dos valores
esperados; referências TypeScript são fontes de regra e não são executadas em runtime.
Verificação direcionada executada com SDK 10.0.404: os dois casos novos passaram
(2 aprovados, 0 falhas); `dotnet format` direcionado com `--verify-no-changes`
também passou.

A inspeção do escopo confirmou reconstrução apenas sintética e ausência, nas fontes
de domínio/produção e alterações da Change, de leitura XLSX, pacotes de produção
novos, handlers, mudanças Angular/seed ou endpoints de negócio. Não se iniciou host
nem houve acesso a arquivo/dado real durante testes de domínio. Limite: esta é uma
auditoria de rastreabilidade e escopo, não homologação operacional nem auditoria geral
de segurança. Evidências finais das verificações integradas serão registradas após
as tarefas 7.2–7.5.

### Verificação integrada do backend — DOM-07 (25/11/2026)

Executada em `backend/` com o SDK isolado `10.0.404` e runtimes
`Microsoft.NETCore.App`/`Microsoft.AspNetCore.App 10.0.15` (Windows x64). O
`dotnet` disponível no `PATH` seleciona SDK `10.0.103`, incompatível com o
`backend/global.json`; por isso, nesta execução, os comandos foram iniciados pelo
`dotnet.exe` instalado em `%LOCALAPPDATA%\Temp\opencode\dotnet-10.0.404`. A saída de
`--info` confirmou SDK 10.0.404 e leitura do `global.json` do backend.

Comandos executados, nessa ordem, a partir de `backend/`:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" --info
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" restore VendasEmAberto.slnx --locked-mode
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" build VendasEmAberto.slnx -c Release --no-restore
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test --solution VendasEmAberto.slnx -c Release --no-build
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Restore bloqueado e build Release passaram; build registrou 0 avisos e 0 erros.
A suíte da solução descobriu e aprovou 139 testes, sem falhas/ignorados: 131 em
UnitTests (115 no filtro do namespace `Dominio`, além dos testes técnicos) e 8 em
IntegrationTests. A verificação de formatação integral passou após aplicar
`dotnet format` para normalizar finais de linha/codificação e remover um `using`
desnecessário. `dotnet list` confirmou que o projeto Dominio não tem pacotes; seu
`packages.lock.json` contém dependências vazias para `net10.0`. O grafo de produção
não recebeu dependências novas nesta fase.

### Smoke real da API — DOM-07 (25/11/2026)

Executada a DLL Release (`src/VendasEmAberto.Api/bin/Release/net10.0/
VendasEmAberto.Api.dll`) diretamente com o SDK isolado 10.0.404, diretório de
trabalho `backend/`, sem launch profile e com `Backend__Porta` temporária `62372`.
`Get-NetTCPConnection` associou o listener ao PID `12136` em `127.0.0.1` somente;
`GET /health` respondeu `200`, `text/plain`, corpo `Healthy`; `GET /vendas` respondeu
404. O processo iniciado foi encerrado e a conexão TCP de verificação falhou como
esperado, confirmando liberação da porta. A variável de ambiente foi restaurada e
nenhum outro processo/listener foi encerrado. Os testes técnicos de endpoint/falha
genérica também passaram na suíte de integração da tarefa 7.2 (8/8). Nenhum banco,
frontend ou serviço externo foi iniciado.

### Independência do frontend — DOM-07 (25/11/2026)

Com a API desligada (porta padrão `5070` sem listener antes e após as execuções),
foram executados em `frontend/` `npm.cmd test -- --watch=false` e `npm.cmd run build`.
Os testes passaram: 33 arquivos e 430 testes, sem falhas; o build Angular concluiu
com sucesso. A árvore não contém alterações em fontes do frontend. E2E, inspeção
visual e zoom não foram executados porque não houve mudança de UI; estes resultados
demonstram não regressão automatizada, não homologação operacional ou visual.

### Fechamento PRD → TDD → SDD — DOM-07

FON-040/RF-023/CA-046–048 rastreiam para TDD/DEC-037, a proposta e o design de
`openspec/changes/fase-002-dominio/`, a delta `dominio-vendas`, as tarefas DOM-01–07,
o catálogo de paridade e os testes MSTest correspondentes. O planejamento inicial
foi revisado antes da autorização explícita de apply. As tarefas 1.1–7.4 foram
concluídas; 7.5 fecha a validação documental e o escopo desta Change.

A revisão do escopo confirmou que a entrega permanece no domínio e testes: sem
handlers, persistência, endpoints de negócio, leitura de XLSX, alteração de Angular
ou seed. Restore bloqueado, build Release, 139 testes backend, formatação, smoke real
e 430 testes/build do frontend estão detalhados acima. O smoke confirma somente a API
técnica (`/health` em loopback e `/vendas` 404); não é aceite operacional. E2E,
inspeção visual e zoom não foram executados porque a interface não mudou.

### Reprodução da divergência na entrada — Change `corrigir-reconstrucao-entrada`

Na revisão da reconstrução, `Venda.Reconstruir` verificava que o recebimento Entrada
correspondia à base da primeira parcela, mas copiava sua alocação sem comparar o valor
alocado. A projeção posterior compara recebimentos com alocações e pode então rejeitar
um agregado que a fábrica aceitou.

Para reproduzir a lacuna antes da correção, foram adicionados três testes MSTest com
venda sintética de 20.000 centavos em duas parcelas de 10.000, entrada recebida de
10.000 e alocações divergentes de 1, 9.999 e 10.001 centavos. Executados com SDK
isolado 10.0.404 em `backend/`:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~Reconstruir_RejeitaAlocacaoDeEntradaDiferenteDoValorRecebido"
```

**Evidência de 25/11/2026:** build do projeto passou com aviso `MSTEST0044` porque o
primeiro rascunho usava `[DataTestMethod]`; a execução descobriu os três valores e
falhou nos três, pois obteve `Sucesso` onde esperava `Falha`. Código de saída do MTP:
2. O aviso foi eliminado em seguida, substituindo os casos parametrizados por três
`[TestMethod]` nomeados. A reprodução foi repetida sem avisos com o filtro:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~Reconstruir_RejeitaAlocacaoDeEntrada"
```

Os três testes nomeados falharam como esperado na versão pré-correção: os resultados
foram `Sucesso` em vez de `Falha`; MTP informou 3 falhas, 0 sucessos e código de saída
2. Esta reprodução confirma a lacuna, não é resultado dos testes após o conserto.

**Correção e verificação local de 25/11/2026:** a validação do ramo Entrada agora
exige que a única alocação seja igual em centavos ao recebimento e à base da parcela.
Os casos HIS-005/006 passaram após a alteração: 3 aprovados, 0 falhas, 0 ignorados,
sem avisos de compilação. A suíte completa de `VendaReconstrucaoTests` passou: 11
aprovados, 0 falhas, 0 ignorados; inclui os testes negativos, os históricos entrada/
lote existentes e HIS-007, que confere entrada exata em projeção, conjunto e período.
Estas são execuções direcionadas, não substituem as verificações integradas das
demais tarefas desta Change.

Após a inclusão do caso positivo HIS-007, a suíte UnitTests completa foi executada
em Release com SDK isolado 10.0.404 e `--no-restore`: 135 aprovados, 0 falhas e
0 ignorados. Isso cobre também as regressões técnicas e as classes existentes de
projeção, conjunto, pagamento individual e cadastro.

**Verificação integrada da Change `corrigir-reconstrucao-entrada` — 25/11/2026:**
executada em `backend/` com SDK isolado 10.0.404 e runtimes 10.0.15, pois o `dotnet`
do PATH seleciona 10.0.103, abaixo da baseline de `global.json`. Comandos executados
sequencialmente (códigos de saída 0, exceto onde indicado):

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" --info
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" restore VendasEmAberto.slnx --locked-mode
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" build VendasEmAberto.slnx -c Release --no-restore
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" test --solution VendasEmAberto.slnx -c Release --no-build
& "$env:LOCALAPPDATA\Temp\opencode\dotnet-10.0.404\dotnet.exe" format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Restore bloqueado passou; build Release passou com 0 avisos e 0 erros; a solução
descobriu e aprovou 143 testes (135 UnitTests + 8 IntegrationTests), 0 falhas e
0 ignorados. A primeira verificação integral de formato apontou LF nos dois arquivos
C# alterados pela Change (exit code 1). `dotnet format whitespace` foi aplicado
somente a `src/VendasEmAberto.Dominio/Vendas/Venda.Reconstrucao.cs` e
`tests/VendasEmAberto.UnitTests/Dominio/Vendas/VendaReconstrucaoTests.cs`; a
verificação integral posterior listada acima passou (exit code 0). Nenhum pacote ou
baseline foi alterado.

**Smoke real da API e frontend — Change `corrigir-reconstrucao-entrada`:** a DLL
Release foi iniciada em processo separado com SDK 10.0.404, sem launch profile, na
porta temporária `62421`. A API abriu somente `127.0.0.1`; `curl.exe` confirmou
`GET /health` como HTTP 200 com corpo `Healthy` (o log Kestrel confirmou
`text/plain`) e `GET /vendas` como HTTP 404. O processo iniciado (PID 5580) foi
encerrado; a porta ficou livre e `Backend__Porta` foi restaurada. Nenhum listener
permaneceu.

Com a API desligada, a partir de `frontend/`, foram executados `npm.cmd test --
--watch=false` e `npm.cmd run build`, ambos com exit code 0. Os testes aprovaram 33
arquivos/430 testes; o build Angular produziu `frontend/dist/vendas-em-aberto`.
Como a mudança não altera a interface, E2E, inspeção visual e zoom não foram
executados; esta evidência não equivale a homologação operacional.

Fechamento da Change `corrigir-reconstrucao-entrada`: PRD/RF-023/CA-046–048 e
TDD/DEC-037 foram reutilizados sem alteração; rastreabilidade do delta para HIS-005–007,
testes e evidências está em `openspec/changes/corrigir-reconstrucao-entrada/` e no
catálogo de paridade. `openspec validate corrigir-reconstrucao-entrada --strict` e
`git diff --check` foram executados após revisar o diff; produção alterada somente
na igualdade do ramo Entrada, sem mudança de pacote, frontend, dados reais ou sync/
archive alheio. Nenhuma rota de negócio, persistência ou camada de aplicação é
introduzida por esta correção.

Validações finais executadas na revisão 7.5:

- `openspec validate fase-002-dominio --strict` — aprovado.
- `git diff --check` — aprovado, sem erros de whitespace.

Não há dados reais incluídos ou usados como fixture. A regra de `.gitignore` que
estava no commit inicial foi retirada em commit corretivo separado para que o arquivo
não componha o diff final da Change; o XLSX local permaneceu fora do staging e dos
commits. Os resultados comprovam critérios técnicos e rastreabilidade, não
homologação da ótica, uso com dados reais, nem existência de camada de aplicação ou
persistência.

O SDK isolado respondeu `dotnet --info` como versão `10.0.404`, com runtimes
`Microsoft.NETCore.App 10.0.15` e `Microsoft.AspNetCore.App 10.0.15` (Windows x64).
A seleção por `backend/global.json` foi confirmada executando os comandos abaixo a
partir desta pasta. Restore inicial gerou lockfiles e `restore --locked-mode` passou;
build Release sem restore passou com 0 avisos e 0 erros. `dotnet list ... package
--vulnerable --include-transitive` não reportou pacotes vulneráveis nas fontes
consultadas em 25/11/2026. A primeira checagem de formatação encontrou finais de
linha/codificação nos arquivos gerados; após `dotnet format`, a verificação sem
alterações foi aprovada. A suíte `UnitTests` foi executada pelo MTP: 16 testes
aprovados, 0 falhas e 0 ignorados (porta e rejeição de endpoints concorrentes).
A API foi iniciada como processo real, sem launch profile: listener padrão `5070` e
alternativo `5073` observados somente em `127.0.0.1`; porta alternativa foi liberada
após `CTRL_BREAK_EVENT`/encerramento normal. Porta `5074` ocupada causou falha na
instância nova sem interromper o listener proprietário; configuração de porta `1023`
falhou antes de abrir listener. `IntegrationTests` foi executado pelo MTP: 8 testes
aprovados, 0 falhas e 0 ignorados; cobre `/health`, 404 sem autenticação ou
redirecionamento, ausência de CORS permissivo e inexistência de rotas de
template/OpenAPI.
Contrato também verificado em processo Kestrel real (DLL Release, diretório
`backend/`, ambiente `Production`, sem launch profile): listener `127.0.0.1:5070`,
`GET /health` respondeu `HTTP 200`, `text/plain`, corpo `Healthy`; `CTRL_BREAK_EVENT`
encerrou o host normalmente (exit code 0) e a porta foi liberada. A resposta informa
apenas que o processo está disponível; não existe banco ou verificação de readiness
financeira nesta fase.
Não considerar projeto sem testes descobertos como suíte aprovada.

Verificação integrada 5.1 executada em sequência a partir de `backend/` com o SDK
isolado 10.0.404: `restore --locked-mode` passou; build Release sem restore passou
com 0 avisos/erros; `dotnet test --solution ... --no-build` descobriu e aprovou 16
testes unitários e 8 de integração (24 total, 0 falhas/ignorados); `dotnet format
... --verify-no-changes --no-restore` passou. Em cópia temporária isolada, a troca
de `Microsoft.AspNetCore.Mvc.Testing` para 10.0.14 sem atualizar o lockfile foi
rejeitada por NU1004 (exit code 1). Também foi adicionada nessa cópia uma falha MSTest
intencional: execução identificou 17 testes, 1 falha, exit code 2. Nenhum desses
arquivos de verificação foi criado na árvore de trabalho entregue.

Smoke repetido (5.2) com a DLL Release, diretório `backend/` e sem launch profile:
porta padrão `5070` abriu somente em `127.0.0.1` e `GET /health` retornou
`HTTP 200`, `text/plain`, `Healthy`; porta alternativa `5073` abriu somente em
loopback. CTRL_BREAK foi enviado aos hosts e, em seguida, foi confirmado que seus
processos/listeners não permaneciam ativos e que as portas foram liberadas. Com
`5074` ocupada por um listener de teste, a nova instância falhou com erro de endereço
em uso e o listener proprietário permaneceu ativo até ser encerrado pelo próprio
smoke. `ASPNETCORE_URLS=http://0.0.0.0:5091` foi rejeitada antes de bind e nenhum
listener apareceu em `5091`. Ao final, nenhuma das portas de smoke ou processo de
host ficou ativo; variáveis de ambiente foram restauradas. Nenhum banco ou serviço
externo foi iniciado.

Verificação de independência da demonstração (5.3), executada em `frontend/` com
a API desligada: `npm.cmd test -- --watch=false` aprovou 33 arquivos e 430 testes;
`npm.cmd run build` concluiu sem erros. Nenhum E2E foi executado, pois não houve
mudança de UI. O diff da Change não contém alterações em fontes Angular, seed,
workflow Pages, banco, autenticação, Tauri ou dados reais; a compilação frontend
permanece independente do host backend.

## Pré-requisitos e execução

- Windows x64 com SDK .NET `10.0.404` (ou patch compatível da mesma feature band)
  instalado e selecionável pelo `global.json` local.
- Acesso à internet na primeira restauração para obter pacotes NuGet ainda ausentes;
  após restore completo e pacotes em cache, a compilação e execução local não usam
  banco, serviços externos nem a planilha. Não prometer restore offline de pacotes
  que não foram previamente baixados.
- Não é necessário Visual Studio, workload MAUI, ferramenta global, banco ou
  frontend em execução.

Execute os comandos no diretório `backend/`:

```powershell
dotnet --info
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet test --solution VendasEmAberto.slnx -c Release --no-build
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
dotnet run --project src/VendasEmAberto.Api -c Release --no-build --no-launch-profile
```

O `global.json` seleciona .NET SDK 10.0.404 com política `latestPatch`, fixa
`MSTest.Sdk` 4.5.3 e seleciona `Microsoft.Testing.Platform` (MTP); os projetos de
teste não usam VSTest. `Directory.Build.props` fixa `net10.0`, nullable e implicit
usings e habilita lockfiles. Restore inicial sem `--locked-mode` só foi usado para
gerar `packages.lock.json`; as execuções reproduzíveis usam o modo bloqueado. Todos
os projetos e transitivas têm versões reproduzíveis pelos projetos e lockfiles.

## Projetos e dependências

```text
src/VendasEmAberto.Api             → Aplicacao, Infraestrutura
src/VendasEmAberto.Aplicacao       → Dominio
src/VendasEmAberto.Infraestrutura  → Aplicacao, Dominio
src/VendasEmAberto.Dominio         → (sem dependências de projeto)
tests/VendasEmAberto.UnitTests     → Api (somente cenários necessários)
tests/VendasEmAberto.IntegrationTests → Api + Mvc.Testing
```

A API e as bibliotecas de produção não adicionam pacote NuGet nesta base; o projeto
de integração usa `Microsoft.AspNetCore.Mvc.Testing` 10.0.15 e ambos projetos de
testes usam `MSTest.Sdk` 4.5.3. Dependências transientes ficam nos respectivos
lockfiles. Nenhum ORM/SQLite, serviço externo, autenticador, MediatR ou FluentResults
foi instalado. A solução contém apenas a estrutura técnica; não há regras de negócio.

## Padrão de futuros casos de uso

As funcionalidades futuras da camada Aplicacao seguem **MediatR + CQRS + Vertical
Slice Architecture**, conforme PRD/FON-037 e TDD/DEC-034. Cada Command (escrita) ou
Query (consulta sem efeitos colaterais) tem seu Handler próprio e tipos necessários
organizados juntos em `Funcionalidades/<contexto>/<caso-de-uso>/`. É uma decisão do
projeto, não uma exigência do .NET. Manter os limites das quatro camadas; não criar
pastas/handlers vazios para exemplificar o padrão nesta fase. MediatR é despacho em
processo, não broker, banco, transação ou CQRS automático.

Futuros handlers de Aplicacao usam **FluentResults** e retornam `Result` ou
`Result<TResposta>` como contrato interno para a API (PRD/FON-038 e TDD/DEC-035).
Aplicacao e Dominio não dependem de HTTP. A API transforma sucesso em DTO/status
conforme o contrato e falhas esperadas em Problem Details: validação 400,
inexistência 404, conflito 409 e regra de negócio/inelegibilidade 422; exceções ou
categorias não classificadas resultam em 500 genérico. Classificar por tipo/código
estável, nunca por texto de mensagem. Não serializar Result/Errors diretamente nem
expor mensagens internas, stack trace ou metadados arbitrários. `/health` é técnico
e usa health checks nativos, sem MediatR/FluentResults.

Antes da primeira adoção efetiva de cada biblioteca, uma Change própria deve fixar
versão, conferir compatibilidade e licença e especificar os contratos públicos
afetados. Verificar licença/chave de MediatR e versão/licença/compatibilidade de
FluentResults antes de instalar; esta documentação não presume gratuidade, compra
ou necessidade de chave. Não instalar extensões ASP.NET de FluentResults sem nova
decisão explícita.

## Host local e limites

O binding já implementado restringe o listener a `127.0.0.1`, porta padrão `5070`.
O host disponibiliza somente `GET /health`; teste de integração confirma HTTP 200,
`text/plain`, corpo `Healthy`, repetição sem `Set-Cookie` e resposta sem mutação.
`Backend:Porta` (variável de ambiente `Backend__Porta`) seleciona uma porta inteira
entre 1024 e 65535; por exemplo, `Backend__Porta=5080`. Ausência da configuração
usa 5070; valor vazio, não numérico ou fora dos limites encerra a inicialização
com mensagem que identifica a chave suportada. Não configurar `--urls`,
`ASPNETCORE_URLS`, `DOTNET_URLS`, `ASPNETCORE_HTTP_PORTS`,
`ASPNETCORE_HTTPS_PORTS`, `DOTNET_HTTP_PORTS`, `DOTNET_HTTPS_PORTS` ou
`Kestrel:Endpoints` concorrentes. A validação ocorre antes de construir/iniciar o
host e orienta a usar `Backend:Porta`; argumentos de linha de comando equivalentes
também são rejeitados. O host só começa a escutar depois de preparar o banco; `/health`
indica que o processo está ativo após essa preparação, mas não garante disponibilidade
de cada operação comercial. O host ainda não expõe operações comerciais; o grupo
versionado preparado para elas usa Bearer local. Não há integração Angular,
importação da planilha ou Tauri.

## Falhas técnicas e segurança das respostas

Exceções inesperadas em requisições são tratadas pelo middleware nativo
`UseExceptionHandler` e pelo serviço `AddProblemDetails`. Em Development e
Production, a resposta é HTTP 500 com `application/problem+json`, sem mensagem da
exceção, stack trace, segredo ou configuração interna. Os testes provocam a falha
por um `IStartupFilter` adicionado exclusivamente via `ConfigureTestServices` na
`WebApplicationFactory`; essa composição não faz parte do `Program` publicado e
`/__test/failure` retorna 404 em ambos os ambientes sem a injeção de teste.

O middleware registra a exceção nos logs do servidor para diagnóstico. Logs podem
conter mensagens e stack traces internos: evitar incluir credenciais ou dados
pessoais em mensagens de exceção e restringir acesso e retenção dos logs conforme o
ambiente. A resposta HTTP é deliberadamente genérica; detalhes de implementação
não devem ser adicionados ao corpo nem a headers.

## Inicialização do host local (API-01/1.3)

A API agora compõe `Aplicacao` e `Infraestrutura` como composition root. Antes de abrir
o listener Kestrel, valida as opções de hosting/porta, o destino e o segredo; registra
os serviços e chama `IPreparacaoArmazenamentoVendas.PrepararAsync` explicitamente. Se
a preparação falhar ou lançar exceção inesperada, o host termina sem servir; o
diagnóstico é genérico e não inclui caminho, SQL, segredo nem mensagem/exceção. O
cancelamento de startup continua propagado. O host não cria o diretório pai, não faz
seed e não repara nem sobrescreve banco incompatível.

| Configuração | Regra |
| --- | --- |
| `Backend__Porta` | Opcional; padrão 5070, inteiro entre 1024 e 65535; listener somente em `127.0.0.1`. Sobrescritas de endpoints continuam recusadas. |
| `Backend__CaminhoBanco` | Obrigatória; destino absoluto de arquivo, com diretório pai já existente. A configuração inválida falha antes de inicializar armazenamento. |
| `Backend__SegredoLocal` | Obrigatória e lida diretamente do ambiente do processo; Base64 canônico de exatamente 32 bytes. Não aceita valor de appsettings ou argumento de linha de comando. Não imprimir nem persistir o segredo. |

Para iniciar em desenvolvimento, configure `Backend__CaminhoBanco` com o destino local
e forneça `Backend__SegredoLocal` ao ambiente do processo por um iniciador seguro; não
coloque o segredo em argumento, appsettings, histórico de comandos ou logs. A partir de
`backend/`, o comando de execução é:

```powershell
dotnet run --project src/VendasEmAberto.Api/VendasEmAberto.Api.csproj -c Release
```

Em destino novo, a preparação cria o schema e estado técnico na revisão zero, sem
vendas de exemplo. Reinicialização conserva revisão e registros. `HealthEndpointTests`,
`RotasNaoImplementadasTests` e `FalhasTecnicasTests` usam `HostApiFixture`: cada host
recebe banco/segredo sintéticos próprios, as alterações às variáveis globais de
ambiente são serializadas e restauradas no cleanup. `ConfiguracaoHostApiTests` prova
banco vazio no primeiro startup, ausência de I/O para configurações inválidas,
recusa de fallback de segredo vindo da configuração, reinício preservando venda/revisão
e recusa de banco alheio/futuro sem mudança de bytes.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet restore VendasEmAberto.slnx --force-evaluate
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConfiguracaoBackendTests"
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConfiguracaoHostApiTests"
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~HealthEndpointTests|FullyQualifiedName~RotasNaoImplementadasTests|FullyQualifiedName~FalhasTecnicasTests"
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ComposicaoInternaTests|FullyQualifiedName~InicializadorSqliteTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
```

Resultados: restore bloqueado passou; 27 testes unitários de configuração, 6 testes
host-level de bootstrap, 16 regressões de health/rotas/falhas e 9 testes de composição/
inicialização passaram; build Release terminou com 0 avisos e 0 erros. A referência
intencional da API para Infraestrutura adicionou EF Core/SQLite ao grafo transitivo e
os lockfiles da API e dos projetos de teste foram atualizados somente pelo restore do
grafo; a listagem confirma EF Core/SQLite em API e nenhum pacote transitivo no Domínio.

Também foi iniciado o binário Release em processo próprio, com banco/segredo temporários
e porta livre: health respondeu `200 text/plain Healthy`, o listener observado foi
`127.0.0.1`, o banco foi preparado, a saída não continha caminho/segredo e o processo
foi encerrado com a porta liberada. Processos negativos recusaram segredo fornecido
somente por argumento e pai inexistente antes de criar banco/diretório ou manter
listener. Essa etapa não exercitou autenticação comercial; os testes HTTP da tarefa
API-01/1.4 abaixo cobrem o esquema. Nem esta etapa nem os testes substituem o smoke
completo de API-05/5.4.

## Credencial comercial local (API-01/1.4)

O grupo `/api/v1` exige uma única credencial `Authorization: Bearer <segredo>`. O
segredo é exatamente o valor Base64 canônico de 32 bytes configurado em
`Backend__SegredoLocal` no ambiente do processo. Não há fallback em appsettings ou
argumentos, JWT, conta de funcionário, cookie, endpoint de login ou CORS. O esquema
decodifica a credencial recebida e compara os bytes com
`CryptographicOperations.FixedTimeEquals`; formato inválido, credencial ausente,
incorreta ou duplicada não autentica. As respostas comerciais do prefixo `/api/v1`
usam `Cache-Control: no-store`, inclusive challenge 401, sucesso e falhas.

Gere uma credencial nova no iniciador e defina-a no ambiente do processo sem colocá-la
em argumento, arquivo, URL ou log. Exemplo em PowerShell, antes de iniciar o host:

```powershell
$env:Backend__SegredoLocal = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

O cliente deve enviar esse valor somente no header `Authorization`; não o registre em
URL ou telemetria. Uma nova execução pode receber outro segredo: tokens da execução
anterior deixam de autenticar após reiniciar com a credencial nova. `GET /health`
continua público, textual e sem cookie; rotas ausentes permanecem 404, sem redirect
para login. A proteção é de processo local, não identidade humana nem fronteira contra
outro processo com o mesmo usuário/permissões; loopback, segredo e `no-store` não
substituem isolamento do sistema operacional nem protegem um iniciador/usuário
comprometido.

Verificações da autenticação local executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~ConfiguracaoBackendTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~AutenticacaoBearerLocalTests|FullyQualifiedName~HealthEndpointTests|FullyQualifiedName~RotasNaoImplementadasTests|FullyQualifiedName~FalhasTecnicasTests|FullyQualifiedName~ConfiguracaoHostApiTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 27 testes unitários de configuração e 25 testes de integração (3 de
autenticação, 6 de startup/configuração e 16 regressões de health, rotas e falhas)
passaram; build Release com 0 avisos/erros e verificação de formato passaram. Os testes
verificam challenge/corpo Problem Details seguro e `no-store` para credencial ausente,
incorreta/duplicada; 401 antes do binding de JSON inválido; execução do handler só
após autenticação; sucesso/falha sem cache; troca do segredo entre inicializações;
e ausência de credenciais capturadas em respostas/logs. O handler usa comparação
constante de bytes. As consultas comerciais de produção GET `/api/v1/vendas` e
`GET /api/v1/vendas/detalhe` estão documentadas abaixo; as demais rotas previstas
serão adicionadas nas próximas tarefas. Endpoints de prova usados nos testes
transversais continuam restritos ao TestServer.

## Consulta interna consolidada da Visão Geral (API-02/2.1–2.2)

`ConsultarVisaoGeralQuery`/Handler carrega uma única vez o snapshot da referência
solicitada e chama `ConjuntoVendas.Projetar` uma vez. Os quatro indicadores vêm dessa
projeção existente, preservando o universo operacional de Ativas e recebimentos do mês
de todos os status. As três listas são montadas em memória a partir das mesmas vendas e
projeções alinhadas; não há consulta por venda, cálculo financeiro duplicado,
preparação/gravação, geração de IDs ou mudança no frontend.

O DTO interno `VisaoGeralResposta` mantém referência/revisão no envelope e os quatro
indicadores sem metadados duplicados; resumos de venda e itens `{venda, parcela}` usam
os contratos protegidos existentes e repetem a mesma referência/revisão nos resumos
aninhados. Cada lista é copiada e exposta como coleção somente leitura. Recentes filtra
Ativas, ordena por data decrescente e índice original crescente antes de limitar a cinco,
incluindo Ativas quitadas. Próximas e atrasadas filtram Ativas pela classificação do
domínio, ordenam por vencimento e pelos índices originais de venda/parcela e só então
limitam a cinco; a janela usa a classificação por `DayNumber`, sem `AddDays` no handler.
O endpoint HTTP `/api/v1/visao-geral` e seu mapper externo continuam na tarefa 3.6.

Verificações da funcionalidade executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~ConsultarVisaoGeralHandlerTests
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter FullyQualifiedName~ConsultarVisaoGeralSqliteTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 4 testes unitários e 2 testes de integração SQLite aprovados; build Release
com 0 avisos/erros e verificação de formato aprovados. O fake confirma uma carga e zero
preparações/gravações; os oráculos literais cobrem indicadores com entrada, lote e
pagamentos Individuais em estados mistos, seleção antes do limite com mais de cinco
elegíveis, empates estáveis, parcelas pagas, ontem/hoje/+7/+8, blocos vazios e
independentes, datas nos anos 0001/9999 e imutabilidade das listas. A integração grava
18 vendas sintéticas em banco temporário, reabre com outro provider, confere IDs,
revisão/referência e valores, transita vendas por Inativa/Prejuízo/Ativa sem estornar
recebimentos (60.500 centavos), preserva a resposta anterior e confirma revisão 5 após
nova reabertura. Não foi acessado banco operacional ou alterada a UI.

## Consulta HTTP de detalhe da venda (API-03/3.1)

`GET /api/v1/vendas/detalhe` exige Bearer e os parâmetros únicos `vendaId` e
`referencia` (`yyyy-MM-dd`) na query. O ID é opaco: consumidores devem codificá-lo como
um único valor de query e o host o decodifica uma vez, sem aparar nem reinterpretar
`/`, `%`, `+`, `?`, `#` ou Unicode. A resposta 200 tem `resumo`, `parcelas` e
`recebimentos`, preservando campos, vínculos e ordem dos DTOs internos; o mapper HTTP
declara DTOs/enums próprios e converte explicitamente cada status, situação, forma e
origem. Valores monetários continuam inteiros em centavos, datas são ISO civis,
`revisao` é string decimal canônica inclusive nos resumos, e nulabilidade/listas são
preservadas. O endpoint é somente leitura e respostas comerciais mantêm `no-store`.

ID inexistente retorna 404 `venda-inexistente`; query ausente, vazia, duplicada ou
referência inválida retorna 400 `requisicao-invalida`, sem chamar a consulta para
parâmetros incompletos. O teste de integração grava uma venda sintética com entrada,
lote e pagamento individual num SQLite temporário, fecha o primeiro host e reabre o
mesmo arquivo em outro host antes de consultar. O oráculo JSON compara todos os campos
literalmente, incluindo ordem, nulabilidade, Unicode, alocações e ID reservado
`venda/%+?#🧾`; outra verificação cobre 400/404 e confirma revisão 1/uma venda após as
requisições GET, sem avanço ou escrita.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter FullyQualifiedName~ConsultarVendaDetalheEndpointTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 2 testes HTTP/SQLite aprovados; build Release com 0 avisos/erros e
verificação de formato aprovados. Não foi iniciado smoke da DLL nem acessado banco
operacional; o smoke completo permanece na tarefa 5.4.

## Consulta HTTP de coleções de vendas (API-03/3.2)

`GET /api/v1/vendas` exige Bearer e os parâmetros únicos `colecao` e `referencia`
(`yyyy-MM-dd`). `colecao` aceita somente os textos exatos `Abertas`, `Quitadas`,
`Inativas` e `Prejuizo`; valores numéricos, desconhecidos, diferenças de caixa,
duplicados ou ausentes são rejeitados com 400 `requisicao-invalida`. A resposta 200
contém `colecao`, `revisao` decimal textual, `referencia` e a lista integral `vendas`.
Cada resumo mantém os campos de cliente/financeiros do contrato v1, centavos como
inteiros, datas civis, enums textuais e nulabilidade, usando o mesmo mapper HTTP
explícito do resumo no detalhe. A ordem é a do conjunto carregado; não há busca,
paginação ou ordenação configurável. Lista vazia retorna 200 com `vendas: []`; toda
resposta comercial usa `no-store`.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 2 testes HTTP/SQLite de coleção e 2 testes de regressão do detalhe
aprovados. As verificações literais percorrem as quatro coleções em ordem com status
misto, campos completos de resumo/cliente e revisão/referência; cobrem banco vazio,
seletores ausentes, numéricos, desconhecidos, com caixa divergente e duplicados. Após
as consultas válidas e inválidas, a revisão continua 1 e os oito IDs/ordens persistidos
permanecem iguais; o caso vazio conserva revisão 0. Build Release com 0 avisos/erros e
verificação de formato aprovados. Dados são sintéticos e banco temporário.

## Consulta HTTP de indicadores (API-03/3.3)

`GET /api/v1/resumo` exige Bearer e o parâmetro único `referencia` (`yyyy-MM-dd`). A
resposta 200 contém `totalEmAbertoCentavos`, `valoresEmAtrasoCentavos`,
`recebidoNoMesCentavos`, `quantidadeVendasAtivas`, `revisao` decimal textual e
`referencia`; os três valores financeiros são inteiros em centavos seguros. O handler
reutilizado projeta a carga existente: saldo e atraso consideram somente vendas Ativas
(a contagem inclui Ativas quitadas), enquanto recebimentos reais do mês contam uma vez
em qualquer status, incluindo Entrada e histórico de lote. O endpoint é somente leitura,
respostas comerciais mantêm `no-store`, e banco preparado vazio retorna zeros/revisão
observada.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 3 testes HTTP/SQLite de resumo e 4 regressões de detalhe/coleções aprovados;
build Release com 0 avisos/erros e verificação de formato aprovados. Oráculos literais
confirmam 20.000 em aberto, 10.000 em atraso, 50.000 recebidos no mês e 3 Ativas no
conjunto misto (incluindo quitada), com Entrada única e recebimentos de Inativa/Prejuízo
incluídos sem contaminar a dívida operacional. Banco vazio mantém zeros/revisão 0. O
limite seguro `9.007.199.254.740.991` foi verificado como token numérico inteiro tanto
em aberto quanto recebido, antes e após registrar a quitação do cenário sintético; consultas
não avançaram as revisões 1 e 2. Não houve acesso a banco operacional.

## Consulta HTTP por período (API-03/3.4)

`GET /api/v1/periodo` exige Bearer e os parâmetros únicos `inicio`, `fim` e
`referencia`, todos no formato civil `yyyy-MM-dd`. A resposta 200 mantém os limites,
`recebidosCentavos`, revisão textual, referência e a lista de resumos `vendas`. A lista
inclui somente vendas Ativas cuja `dataVenda` esteja dentro do intervalo inclusivo,
preservando a ordem do conjunto; `recebidosCentavos` soma recebimentos efetivos de todos
os status pela data de recebimento, inclusive venda originada fora do período. Intervalo
vazio retorna 200 com lista vazia e zero recebidos. Datas ausentes/malformadas retornam
400 `requisicao-invalida`; `inicio > fim` retorna 400 `periodo-invalido`. A consulta não
prepara nem grava e a resposta comercial usa `no-store`.

Exemplo sintético: `/api/v1/periodo?inicio=2027-03-01&fim=2027-03-31&referencia=2027-04-02`.
Os dados e datas do exemplo não são registros operacionais.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarPeriodoEndpointTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 2 testes HTTP/SQLite do período e 7 regressões dos três endpoints anteriores
aprovados; build Release com 0 avisos/erros e verificação de formato aprovados. O cenário
confere vendas nas duas bordas inclusivas, exclui venda Ativa fora do intervalo e vendas
Inativa/Prejuízo, mas soma pela data efetiva recebimentos de Ativas nas bordas e fora do
intervalo, além de Inativa/Prejuízo (38.000 centavos). Os resumos esperados comparam todos
os campos e a ordem. Banco vazio, parâmetros ausentes/data impossível e intervalo invertido
retornaram os status/códigos esperados; revisões 1 e 0 e seus conjuntos permaneceram sem
alteração após as consultas.

## Consulta HTTP de relatório mensal (API-03/3.5)

`GET /api/v1/relatorios/mensal` exige Bearer e os parâmetros únicos `ano` (1–9999),
`mes` (1–12) e `referencia` (`yyyy-MM-dd`). O ano/mês seleciona apenas o relatório; a
referência civil continua sendo a fornecida pelo consumidor. Ausência, duplicidade,
formato ou limites inválidos retornam 400 `requisicao-invalida` antes de consultar o
handler. Respostas comerciais, inclusive falhas, mantêm `Cache-Control: no-store`.

A resposta preserva integralmente o `RelatorioMensalResposta` da Aplicacao: referência,
limites do mês e revisão decimal textual; recebimentos identificados com resumo completo
da venda, origem, data, forma e valor; série diária completa; vendas do mês; saldos e
primeiro vencimento pendente; parcelas atrasadas; parcelas de Prejuízo com
`incluirNoTotal`; e os totais/quantidades recebido, vendas do mês, aberto, atrasado e
Prejuízo. Resumos aninhados incluem todos os campos do cliente e financeiros. Parcelas
mantêm campos, enums, nulabilidade e vínculo com venda; centavos são tokens inteiros,
datas são civis ISO e listas/ordens são as produzidas pelo caso de uso, sem cálculo HTTP.
Mês sem movimento continua com uma linha diária por dia, inclusive ano bissexto, e não
substitui a referência nem os totais globais da fotografia.

Exemplo sintético: `/api/v1/relatorios/mensal?ano=2027&mes=3&referencia=2027-04-15`.
O cenário de verificação usa somente vendas sintéticas e SQLite temporário.

Verificações executadas em 26/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarPeriodoEndpointTests|FullyQualifiedName~ConsultarRelatorioMensalEndpointTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 3 novos testes HTTP/SQLite e 9 regressões das quatro consultas anteriores
aprovados. O cenário mensal compara campo a campo o JSON e todas as linhas/resumos/
parcelas com o DTO baseline do handler após reabrir o banco; confere ordem e vínculo de
Entrada, lote e Individual, série diária conciliada em 101.000 centavos, vendas do mês,
saldos, atrasadas, status mistos e Prejuízo/`incluirNoTotal`, além dos totais literais
(221.000 vendidos, 170.000 em aberto, 20.000 atrasados e 10.000 em Prejuízo). Também
verifica mês vazio bissexto mantendo a referência e saldo global, correção Individual
movida de março para abril sem alterar a posição na referência, meses de 0001/9999 e
parâmetros ausentes/duplicados/inválidos sem escrita (revisão permanece 0 no banco
vazio). Build Release com 0 avisos/erros e verificação de formato aprovados. Não houve
acesso a banco operacional.

## Consulta HTTP da Visão Geral (API-03/3.6)

`GET /api/v1/visao-geral` exige Bearer e o parâmetro único `referencia` (`yyyy-MM-dd`).
O envelope contém `referencia`, `revisao` decimal textual, `indicadores` com os quatro
valores numéricos, `vendasRecentes`, `parcelasProximas` e `parcelasAtrasadas`. Cada
resumo de venda transporta todos os campos do cliente/financeiros; os itens de parcelas
identificam venda e parcela com seus campos, enums e nulabilidade. Revisão e referência
dos resumos aninhados coincidem com o envelope. As três listas respeitam a seleção,
ordenação estável e o limite cinco já aplicados pelo handler; o transporte não cria
consultas por venda nem recalcula regras. Respostas comerciais usam `no-store`; referência
ausente ou inválida retorna 400 sem chamar o handler. A consulta não prepara nem grava.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarPeriodoEndpointTests|FullyQualifiedName~ConsultarRelatorioMensalEndpointTests|FullyQualifiedName~ConsultarVisaoGeralEndpointTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 14 testes HTTP/SQLite das seis consultas aprovados; build Release com 0
avisos/erros e verificação de formato aprovados. O cenário reabre SQLite com status
Ativo, Inativo, Prejuízo e venda quitada, compara todos os campos HTTP com o DTO baseline,
confere os quatro indicadores (21.300 em aberto, 600 em atraso, 60.600 recebidos e 17
Ativas), IDs/ordem dos três blocos, inclusão de Ativa quitada, limites, bordas ontem/hoje/
hoje+7/hoje+8 e metadados aninhados. Um decorator contador sobre o armazenamento SQLite
confirma uma única carga e zero inicializações/salvamentos durante o GET e nenhuma carga
para referência inválida/ausente. Banco vazio retorna quatro zeros e três listas vazias,
sem escrita. Dados são sintéticos; não houve alteração do frontend ou acesso a banco
operacional.

## Cadastro HTTP de venda (API-04/4.1)

`POST /api/v1/vendas` exige Bearer e `application/json`. O corpo contém `nome`, `cpf`,
`telefone`, `dataVenda`, `valorTotalCentavos`, `quantidadeParcelas`, `referencia` e
`revisaoEsperada` como string decimal canônica; `descricao` e `entrada` são opcionais/
nullable. Entrada, quando presente, tem somente `valorCentavos` inteiro e `forma` textual.
Os campos desconhecidos são ignorados e não permitem escolher IDs, status, parcelas,
recebimentos ou outros dados financeiros. Enum e campos conhecidos repetidos, datas e
tipos inválidos são rejeitados pelo binding seguro; media type não JSON retorna 415.

Exemplo sintético de corpo (nenhum segredo fixo/documentado):

```json
{
  "nome": "Cliente de demonstração",
  "cpf": "52998224725",
  "telefone": "11987654321",
  "descricao": null,
  "dataVenda": "2027-01-15",
  "valorTotalCentavos": 20000,
  "quantidadeParcelas": 2,
  "referencia": "2027-03-15",
  "revisaoEsperada": "0",
  "entrada": { "valorCentavos": 10000, "forma": "Pix" }
}
```

Sucesso confirmado retorna 201 com o detalhe HTTP completo e `Location` relativo
`/api/v1/vendas/detalhe?vendaId=<codificado>&referencia=<yyyy-MM-dd>`. O ID vem do
gerador do backend, não do corpo; somente após o save confirmado é retornada a revisão
nova. O escape de query preserva IDs opacos (`/`, `%`, `+`, `?`, `#` e Unicode), e a
Location pode ser consultada com Bearer após reabrir o banco. A entrada é um recebimento
único alocado à primeira parcela: 10.000 de entrada em contrato de 20.000 resulta em
20.000 de valor-base, 10.000 recebidos e 10.000 de saldo, sem duplicar o valor. Erros
de calendário do domínio apontam `dataVenda`, nome público do campo, não `dataBase`.
Todas as respostas comerciais incluem `Cache-Control: no-store`; validações e conflito
de revisão não salvam candidatos nem avançam a revisão.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarPeriodoEndpointTests|FullyQualifiedName~ConsultarRelatorioMensalEndpointTests|FullyQualifiedName~ConsultarVisaoGeralEndpointTests|FullyQualifiedName~CadastrarVendaEndpointTests"
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~CadastrarVendaHandlerTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 17 testes HTTP/SQLite (cadastro e regressão das seis consultas) e 6 testes
unitários do handler aprovados; build Release com 0 avisos/erros e verificação de formato
aprovados. Testes de cadastro conferem 10.000/3 = 3.334/3.333/3.333, IDs gerados, revisão
confirmada, Location corretamente codificada e consulta após reiniciar o host; entrada
10.000 em 20.000/2 sem dupla contagem; CPF/entrada/calendário/revisão inválidos, stale
revision e media type incorreto sem save, venda persistida ou avanço de revisão. Um teste
unitário verifica o mapeamento seguro do erro de calendário. Fixture e SQLite são
temporários/sintéticos; não houve acesso a banco operacional.

## Edição HTTP de cliente da venda (API-04/4.2)

`PUT /api/v1/vendas/cliente` exige Bearer e `application/json`, com `vendaId`, `nome`,
`cpf`, `telefone`, `referencia`, `revisaoEsperada` (string decimal canônica) e
`descricao` opcional/nullable. Somente os quatro dados cadastrais são enviados ao caso
de uso; propriedades adicionais, inclusive financeiras ou administrativas, são ignoradas.
O ID é opaco e permanece no corpo. Sucesso retorna 200 com o detalhe completo e revisão
confirmada. A edição vale para vendas Ativas abertas/quitadas, Inativas e em Prejuízo;
CPF repetido entre vendas é permitido e altera somente o cliente da venda-alvo. Status,
contrato, parcelas, recebimentos e seus IDs/alocações permanecem intactos.

Dados de cliente são normalizados pelas fábricas existentes antes da comparação de no-op.
Uma edição normalizada idêntica retorna 200 sem save/avanço da revisão; revisão obsoleta
retorna 409 antes dessa comparação, também sem save. Falhas de campo retornam Problem
Details seguro com campo público e não persistem candidato. Respostas comerciais mantêm
`Cache-Control: no-store`.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConsultarVendaDetalheEndpointTests|FullyQualifiedName~ConsultarColecaoVendasEndpointTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarPeriodoEndpointTests|FullyQualifiedName~ConsultarRelatorioMensalEndpointTests|FullyQualifiedName~ConsultarVisaoGeralEndpointTests|FullyQualifiedName~CadastrarVendaEndpointTests|FullyQualifiedName~EditarClienteVendaEndpointTests|FullyQualifiedName~EditarClienteVendaSqliteTests"
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~EditarClienteVendaHandlerTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 21 testes HTTP/SQLite (seis consultas, cadastro, edição HTTP e edição
persistida preexistente) e 4 testes unitários do handler aprovados; build Release com 0
avisos/erros e verificação de formato aprovados. Após reabrir SQLite, os testes cobrem
edição nos quatro status, CPF compartilhado sem propagação, campos financeiros extras
ignorados, status/contrato/parcelas/pagamentos preservados, no-op com revisão estável e
revisão antiga 409 inclusive no no-op. CPF inválido, telefone ausente, chave conhecida
duplicada e revisão não canônica apontam campos seguros e não salvam. Dados/arquivos são
sintéticos e temporários; não houve acesso a banco operacional.

## Alteração HTTP do status administrativo (API-04/4.3)

`PUT /api/v1/vendas/status` exige Bearer e `application/json`, com `vendaId`, `novoStatus`,
`referencia` (`yyyy-MM-dd`) e `revisaoEsperada` (string decimal canônica). `novoStatus`
aceita exclusivamente os textos `Ativo`, `Inativo` e `Prejuizo`; enum numérico, texto
desconhecido ou variação de caixa retorna 400 `requisicao-invalida`. Sucesso confirmado
retorna 200 com detalhe completo e revisão. As regras são as do domínio: Ativo→Inativo,
Ativo→Prejuizo somente se restar saldo em parcelas, Inativo→Ativo e Prejuizo→Ativo.
Transições não permitidas retornam 422; mesmo status é no-op 200 sem avanço, mas revisão
obsoleta retorna 409 antes do no-op. Respostas comerciais incluem `Cache-Control: no-store`.

Exemplo sintético:

```json
{
  "vendaId": "venda-exemplo",
  "novoStatus": "Prejuizo",
  "referencia": "2027-03-15",
  "revisaoEsperada": "5"
}
```

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~AlterarStatusVendaEndpointTests|FullyQualifiedName~AlterarStatusVendaSqliteTests|FullyQualifiedName~ConsultarResumoEndpointTests|FullyQualifiedName~ConsultarVisaoGeralEndpointTests"
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~AlterarStatusVendaHandlerTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 7 testes HTTP/SQLite (status, matriz/persistência existente, resumo e painel)
e 4 unitários do handler aprovados; build Release com 0 avisos/erros e verificação de
formato aprovados. A cobertura verifica as quatro transições permitidas, Inativo→Prejuizo,
Prejuizo→Inativo e venda quitada→Prejuizo recusadas; `Prejuizo` exige saldo, enum inválido
e numérico recusados, no-op e revisão obsoleta. Resumo/painel após as mudanças reportam
2 vendas Ativas, 10.000 centavos em aberto e 50.000 recebidos no mês, incluindo recebimentos
de todos os status; o SQLite reaberto confirma revisão 5 e preserva valores, parcelas,
recebimentos e alocações. Dados e arquivos são sintéticos/temporários; não houve acesso a
banco operacional.

## Baixa HTTP de recebimento individual (API-04/4.4)

`POST /api/v1/recebimentos` exige Bearer e `application/json`, com `vendaId`, `parcelaId`,
`valorRecebidoCentavos` (inteiro em centavos), `data`, `forma`, `referencia` e
`revisaoEsperada` (string decimal canônica); `observacao` é opcional/nullable. A forma é
um dos textos `Dinheiro`, `Pix`, `CartaoDebito` ou `CartaoCredito`; enums numéricos e
desconhecidos são recusados no binding. O domínio exige venda Ativa e que o ID de parcela
corresponda à primeira pendente, mesmo que o vencimento seja futuro; pagamento menor que
o valor-base, salto/repetição, data/forma ou observação inválidas não são persistidos.
Observação comporta até 20 valores escalares Unicode. Valor acima do base registra
acréscimo individual sem alterar o contrato-base. Sucesso confirmado retorna 200 com o
detalhe completo e revisão nova; ID de recebimento é gerado no servidor. Não existe
recurso GET individual para o recebimento, portanto não há `Location`.

Exemplo sintético:

```json
{
  "vendaId": "venda-exemplo",
  "parcelaId": "parcela-1",
  "valorRecebidoCentavos": 11000,
  "data": "2027-03-12",
  "forma": "Pix",
  "observacao": "Acréscimo aplicado",
  "referencia": "2027-03-15",
  "revisaoEsperada": "5"
}
```

O contrato não oferece idempotency key nem retry automático. Em timeout/desconexão, o
consumidor deve consultar o detalhe/revisão antes de decidir nova ação; uma repetição cega
pode atingir parcela já paga ou causar conflito se o primeiro comando foi confirmado.
Todas as respostas comerciais incluem `Cache-Control: no-store`.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~RegistrarPagamentoEndpointTests|FullyQualifiedName~RegistrarPagamentoSqliteTests"
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~RegistrarPagamentoHandlerTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 4 testes HTTP/SQLite (dois novos de endpoint e os dois de aplicação SQLite)
e 5 unitários do handler aprovados; build Release com 0 avisos/erros e verificação de
formato aprovados. Testes confirmam baixa da terceira parcela futura após duas anteriores,
acréscimo de 1.000 sobre base 10.000, nota de 20 emojis (valores escalares), revisão/IDs/
alocações após reabertura, ausência de `Location` e ID gerado mesmo com propriedade extra
`recebimentoId`. Salto, repetição, valor menor, data após referência, formas inválidas,
nota acima do limite e venda Inativa falham sem save; uma baixa válida posterior confirma
que a primeira parcela continua sendo o alvo. Centavos enviados como string retornam 400
com campo público `valorRecebidoCentavos`. Fixtures/SQLite são sintéticos e temporários;
não houve acesso a banco operacional.

## Correção HTTP de recebimento individual (API-04/4.5)

`PUT /api/v1/recebimentos` exige Bearer e `application/json`, com `vendaId`,
`recebimentoId`, `valorRecebidoCentavos`, `data`, `forma`, `referencia` e
`revisaoEsperada` (string decimal canônica); `observacao` é opcional/nullable. Não recebe
`parcelaId`: a correção usa e preserva a alocação original. Somente recebimentos de origem
Individual em venda Ativa são corrigíveis; entrada/lote, venda não Ativa, ID ausente ou
pertencente a outra venda têm falhas tipadas distintas. O mínimo continua sendo o valor-base
da parcela, e o acréscimo é recalculado como valor corrigido menos base. Sucesso confirmado
retorna 200 com detalhe e revisão nova; ID, ordem, alocação, contrato-base e demais
recebimentos são preservados. Não há `Location` porque não se cria novo recurso. Mesmo
payload de correção é uma confirmação de escrita e avança a revisão uma vez, sem duplicar
o recebimento.

Exemplo sintético:

```json
{
  "vendaId": "venda-exemplo",
  "recebimentoId": "recebimento-1",
  "valorRecebidoCentavos": 10500,
  "data": "2027-03-10",
  "forma": "CartaoCredito",
  "observacao": "Corrigido em março",
  "referencia": "2027-03-31",
  "revisaoEsperada": "5"
}
```

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~CorrigirPagamentoEndpointTests|FullyQualifiedName~CorrigirPagamentoSqliteTests"
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter FullyQualifiedName~CorrigirPagamentoHandlerTests
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 4 testes HTTP/SQLite (dois de endpoint e dois de aplicação SQLite) e 5
unitários do handler aprovados; build Release com 0 avisos/erros e verificação de formato
aprovados. A correção reduz o acréscimo de 1.000 para 500 centavos e move a data de
fevereiro para março: consultas por período passam a totalizar 20.000 em fevereiro e 10.500
em março. Reenvio idêntico, com revisão atual, incrementa revisão sem duplicar ID; SQLite
reaberto confirma IDs, ordem, vínculo à parcela, saldos das demais e outra venda intactos.
IDs ausentes/externos, entrada, lote, venda Inativa, valor menor, data posterior à
referência, forma inválida, observação acima de 20 valores escalares e revisão obsoleta
retornam status/códigos esperados sem save. Arquivos e dados são sintéticos/temporários;
não houve acesso a banco operacional.

## Verificação HTTP transversal de concorrência e confirmação (API-05/5.1)

Os cenários abaixo complementam — não substituem — os testes próprios de cada endpoint.
Dois `HttpClient`s independentes disputam comandos distintos na revisão 1 por uma barreira
após ambos carregarem a mesma revisão. Com SQLite real, um recebe 200/revisão 2, o outro
409 `conflito-revisao`; após descartar o host, reabrir o banco confirma revisão 2, conjunto
completo e alteração somente da venda vencedora, sem retry do handler.

No cancelamento pré-commit, o cliente HTTP cancela enquanto o gravador SQLite real está
dentro da transação, após a primeira alteração e antes da confirmação. O token recebido
pela intervenção transacional é observado cancelado; o pedido termina sem resposta de
sucesso/erro comercial e a reabertura confirma revisão e venda originais. O caso tardio
usa `RequestAborted` controlado no TestServer: o hook confirma o commit SQLite, cancela o
token e retorna; a API mantém 200 e revisão confirmada. Isso testa a ordem do token e do
commit sem alegar que uma resposta possa chegar após uma desconexão de rede real.

Para confirmação indeterminada, um hook de teste lança `IOException` sintética depois de
confirmar um commit SQLite real. A resposta HTTP é 500 Problem Details com
`codigo: "confirmacao-indeterminada"` e `resultadoOperacao: "indeterminado"`, sem revisão,
sucesso ou alegação de rollback. Contadores do armazenamento no limite do handler mostram
uma carga inicial e uma tentativa de save, sem nova carga nem retry após a falha; ao
reabrir, o teste comprova que o commit aconteceu. Essa falha de confirmação é injetada pelo
seam de teste, não é falha nativa do SQLite/SO; não se simularam desconexão de rede real,
perda de energia ou falha nativa durante o commit. Em timeout/desconexão, a entrega da
resposta e o desfecho podem permanecer desconhecidos; consumidores não devem repetir
comandos cegamente e precisam conferir o estado antes de decidir.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore --filter "FullyQualifiedName~ConcorrenciaCommandsEndpointTests|FullyQualifiedName~ConcorrenciaCommandsSqliteTests|FullyQualifiedName~GravadorVendasSqliteTests"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados: 21 testes de integração direcionados aprovados (4 HTTP transversais, concorrência
de Commands no nível de aplicação e testes do gravador SQLite); build Release com 0
avisos/erros e verificação de formato aprovados. Os testes usam apenas IDs, dados e arquivos
sintéticos/temporários; nenhum banco operacional foi acessado. A cobertura não prova
entrega após desconexão real nem falha nativa de confirmação.

## Auditoria transversal HTTP, privacidade e logs (API-05/5.2)

### Matriz de rotas e contratos

As seis consultas e os cinco comandos têm testes HTTP/SQLite específicos, além dos
testes de contratos JSON/query e do adaptador de erros. A matriz identifica a cobertura
principal sem substituir os cenários detalhados por operação:

| Operação | Teste HTTP/SQLite principal |
| --- | --- |
| `GET /api/v1/vendas/detalhe` | `ConsultarVendaDetalheEndpointTests` |
| `GET /api/v1/vendas` | `ConsultarColecaoVendasEndpointTests` |
| `GET /api/v1/resumo` | `ConsultarResumoEndpointTests` |
| `GET /api/v1/periodo` | `ConsultarPeriodoEndpointTests` |
| `GET /api/v1/relatorios/mensal` | `ConsultarRelatorioMensalEndpointTests` |
| `GET /api/v1/visao-geral` | `ConsultarVisaoGeralEndpointTests` |
| `POST /api/v1/vendas` | `CadastrarVendaEndpointTests` |
| `PUT /api/v1/vendas/cliente` | `EditarClienteVendaEndpointTests` |
| `PUT /api/v1/vendas/status` | `AlterarStatusVendaEndpointTests` |
| `POST /api/v1/recebimentos` | `RegistrarPagamentoEndpointTests` |
| `PUT /api/v1/recebimentos` | `CorrigirPagamentoEndpointTests` |

`ContratoApiJsonTests`, `LeitorObjetoJsonTests` e `ParametrosQueryApiTests` cobrem
camelCase, campos requeridos/null/default, duplicatas, propriedades desconhecidas,
datas civis/extremos, enums textuais, centavos e revisão decimal textual canônica.
Os testes por operação verificam os mappers, ordens, vínculos, nulabilidade e os campos
aplicáveis do contrato. Em particular, `CadastrarVendaEndpointTests` confirma no JSON
de sucesso os dados previstos do cliente — nome, CPF, telefone e descrição nula — além
dos valores e parcelas; dados cadastrais são deliberadamente preservados em sucesso e
não mascarados na resposta contratada.

### Status, autenticação, cache e superfícies ausentes

| Verificação | Evidência observada |
| --- | --- |
| 401 antes de binding, challenge Bearer e `no-store` | `PrivacidadeHttpTests` envia Bearer incorreto e JSON malformado contra o host real, em Development e Production; `AutenticacaoBearerLocalTests` complementa ausência, credencial incorreta/duplicada e contador sem chamada do handler. |
| 400 / 404 / 409 / 422 | `PrivacidadeHttpTests.CategoriasComerciaisMantemStatusEProblemDetailsNosDoisAmbientes` atravessa o host real em Development e Production; testes HTTP individuais e `AdaptadorResultadosApiTests` ampliam binding, regras/campos e combinações de erros. |
| 405 / 413 / 415 em ambos ambientes | `FalhasTecnicasTests.BadHttpRequest_PreservaStatusEProblemDetailsNosDoisAmbientes`; endpoints também cobrem content type inválido com binding/composição reais. |
| 503 em ambos ambientes | `PrivacidadeHttpTests.BancoAusenteAposInicializacao_Retorna503HttpSemCaminhoNoProblema` remove apenas o SQLite temporário após o startup e confirma `banco-ausente`, `no-store`, Problem Details coerente e ausência de recriação/caminho. |
| 500 genérico em ambos ambientes | `FalhasTecnicasTests` e `PrivacidadeHttpTests` conferem status/corpo; 500 indeterminado após commit real é coberto por `ConcorrenciaCommandsEndpointTests`. |
| `no-store` em sucesso/falhas comerciais | Testes de endpoint conferem respostas de operações; os cenários transversais acima verificam explicitamente 401, 500 e 503. |
| CORS, cookies, login, OpenAPI e rotas de teste | `RotasNaoImplementadasTests`/`HealthEndpointTests` confirmam health público textual, ausência de `Access-Control-Allow-Origin`, cookies/redirecionamento, `/swagger`, `/openapi/v1.json`, rotas antigas e `/__test/failure` no host normal. |

### Captura de logs e limitação

`PrivacidadeHttpTests.ExcecaoComMarcadoresPrivados_Retorna500GenericoESemVazamentoEmLogsDoHost`
injeta no host real, em Development e Production, uma exceção sintética que contém
segredo Bearer válido, CPF, telefone, marcador de caminho, SQL e texto de exceção. A
requisição inclui o segredo no header, CPF/telefone no query/body e o marcador no caminho;
a exceção sintética contém todas as sentinelas e o SQL. Um `ILoggerProvider` de teste
captura todos os níveis desde Trace, estado formatado, exceção e scopes. O teste comprova
que nenhuma delas está no Problem Details ou nos logs capturados,
incluindo a saída automática do middleware de exceção .NET 10. O comportamento
observado depende do handler central tratar a exceção e da supressão padrão de
diagnósticos de exceções tratadas no runtime alvo; não é promessa de sanitização de
qualquer provider de logging que uma integração futura venha a adicionar.

O caso cobre falha controlada no pipeline e não representa captura de tráfego de rede,
telemetria externa, dumps/processo ou comportamento de provedores de logging futuros.
Os testes anteriores de autenticação continuam verificando ausência do Bearer nos logs
e nas respostas. Somente sentinelas sintéticas e o banco descartável são usados.

Verificações executadas em 27/11/2026 com SDK `10.0.404`:

```powershell
dotnet test tests/VendasEmAberto.IntegrationTests/VendasEmAberto.IntegrationTests.csproj -c Release --no-restore
dotnet test tests/VendasEmAberto.UnitTests/VendasEmAberto.UnitTests.csproj -c Release --no-restore --filter "FullyQualifiedName~VendasEmAberto.UnitTests.Api"
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
```

Resultados reproduzidos em 27/11/2026 com SDK `10.0.404`: suíte completa de integração,
143 aprovados, 0 falhas e 0 ignorados; suíte unitária da API, 33 aprovados, 0 falhas e
0 ignorados; build Release com 0 avisos/erros; verificação de formato e `git diff --check`
aprovados. A execução focada inicial de `PrivacidadeHttpTests` também passou (6 testes).
Todos os testes usam dados sintéticos e arquivos SQLite temporários; não houve acesso
a banco operacional. Não foram executados nesta tarefa restore, frontend nem smoke da
DLL em processo próprio; esses itens permanecem para as tarefas 5.3 e 5.4.

## Regressão final, grafo de dependências e frontend independente (API-05/5.3)

O backend usa SDK `10.0.404` conforme `global.json`, MSTest.Sdk `4.5.3` e
`net10.0`. Em 27/11/2026, na ordem exigida, foram executados:

```powershell
dotnet restore VendasEmAberto.slnx --locked-mode
dotnet build VendasEmAberto.slnx -c Release --no-restore
dotnet test --solution VendasEmAberto.slnx -c Release --no-build
dotnet test --solution VendasEmAberto.slnx -c Release --no-build --list-tests
dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore
dotnet list VendasEmAberto.slnx package --include-transitive
dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive
```

Restore bloqueado concluiu para os seis projetos. Build Release: 0 avisos e 0 erros.
Suíte MSTest: 389 aprovados, 0 falhas e 0 ignorados; descoberta: 143 testes de
integração + 246 unitários = 389. Formatação passou. A listagem transitiva confirmou
que `VendasEmAberto.Api` referencia Aplicacao e Infraestrutura e recebe EF Core/SQLite
transitivamente pelo composition root Infraestrutura; Aplicacao referencia Domínio;
Domínio não tem referências de projeto nem pacotes e busca dos fontes não encontrou
tipos/namespaces HTTP. A auditoria `--vulnerable --include-transitive` não reportou
pacotes vulneráveis nos seis projetos, usando NuGet.org e
`C:\Program Files (x86)\Microsoft SDKs\NuGetPackages\`, fontes disponíveis no ambiente.
O comando de listagem também confirmou as versões resolvidas;
não houve atualização intencional de dependências ou lockfiles.

Frontend, executado em `frontend/` com Node `v24.21.0` e npm `11.19.0`, compatíveis
com `package.json`. `node_modules` já existia, portanto `npm ci` não foi necessário;
`package-lock.json` foi preservado. Antes dos comandos não havia listener na porta 5070
e nenhum processo de API foi iniciado. Foram executados:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Testes: 33 arquivos e 430 testes aprovados. Build Angular completou e gerou
`frontend/dist/vendas-em-aberto`. Os dois comandos passaram sem API ligada; os testes
do frontend continuam sem depender do backend. O smoke de processo/listener real da
DLL permanece exclusivamente na tarefa 5.4. `git status` e `git diff --check` não
apontaram alterações de lockfile ou artefatos versionados após as verificações.
