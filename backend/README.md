# Backend — Vendas em Aberto

## Baseline e segurança

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
como corrigida. As versões exatas dos pacotes acima estão publicadas no NuGet; isso
não substitui a auditoria do grafo transitivo a executar durante o restore.

Referências consultadas em 25/11/2026:

- <https://dotnet.microsoft.com/download/dotnet/10.0>
- <https://dotnet.microsoft.com/platform/support/policy/dotnet-core>
- Advisories Microsoft ASP.NET Core publicados em 10/11/2026; consultar os avisos
  aplicáveis novamente ao atualizar a baseline.
- <https://www.nuget.org/packages/MSTest.Sdk/4.5.3>
- <https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing/10.0.15>

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
financeira antes de criar a raiz. Ela existe para estados sintéticos completos de
consulta/teste; não importa planilhas/dados reais e não oferece comando para registrar
novas baixas em lote. O catálogo documenta lotes de uma e várias parcelas e as falhas
de reconstrução correspondentes.

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
também são rejeitados. `/health` indica somente
disponibilidade do processo, não readiness de banco nem operação comercial. Não há
login, dados financeiros, integração Angular, importação da planilha, persistência
ou Tauri nesta fase.

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
