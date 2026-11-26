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

Para manter a API técnica sem persistência transitiva, `Api.csproj` referencia apenas
Aplicacao. EF Core/SQLite não aparece no grafo de pacotes nem no diretório Release da
API; a suíte de persistência adicionará referência direta à Infraestrutura quando os
testes forem introduzidos.

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
de armazenamento e delega ao leitor/gravador, mas não está registrado nem ligado à API;
esta permanece sem dependência da Infraestrutura.

`AbridorVendasSqliteTests` passou com seis casos em arquivos temporários: ausência
sem criação, arquivo não SQLite preservado, schema corrente com modo/FKs/timeout
esperados, coluna alterada recusada, lock preservado como ocupado e liberação da
conexão que permite mover o arquivo. Junto aos seis testes do inicializador e cinco
de schema, são 17 testes direcionados aprovados. `Program.cs` e endpoints/health não
foram alterados; a API permanece sem dependência da Infraestrutura.

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
