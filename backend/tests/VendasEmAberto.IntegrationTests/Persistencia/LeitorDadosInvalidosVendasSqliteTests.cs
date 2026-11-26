using Microsoft.Data.Sqlite;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class LeitorDadosInvalidosVendasSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 4, 30);
    private readonly InicializadorSqlite _inicializador = new();
    private readonly LeitorVendasSqlite _leitor = new();
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-invalid-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "persistencia.db");
    }

    [TestCleanup]
    public void LimparFixture()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    public static IEnumerable<object[]> CasosCorrompidos() =>
    [
        [new CasoCorrupcao(
            "entrada-alocada-9999",
            "UPDATE Alocacoes SET ValorCentavos = 9999 WHERE RecebimentoId = 'receb-entrada';",
            "UPDATE Alocacoes SET ValorCentavos = 10000 WHERE RecebimentoId = 'receb-entrada';",
            "SELECT ValorCentavos FROM Alocacoes WHERE RecebimentoId = 'receb-entrada';",
            9999L)],
        [new CasoCorrupcao(
            "entrada-alocada-10001",
            "UPDATE Alocacoes SET ValorCentavos = 10001 WHERE RecebimentoId = 'receb-entrada';",
            "UPDATE Alocacoes SET ValorCentavos = 10000 WHERE RecebimentoId = 'receb-entrada';",
            "SELECT ValorCentavos FROM Alocacoes WHERE RecebimentoId = 'receb-entrada';",
            10001L)],
        [new CasoCorrupcao(
            "data-civil-malformada",
            "UPDATE Recebimentos SET Data = '2027-02-30' WHERE Id = 'receb-entrada';",
            "UPDATE Recebimentos SET Data = '2027-01-15' WHERE Id = 'receb-entrada';",
            "SELECT Data FROM Recebimentos WHERE Id = 'receb-entrada';",
            "2027-02-30")],
        [new CasoCorrupcao(
            "forma-de-pagamento-desconhecida",
            "UPDATE Recebimentos SET Forma = 99 WHERE Id = 'receb-entrada';",
            "UPDATE Recebimentos SET Forma = 1 WHERE Id = 'receb-entrada';",
            "SELECT Forma FROM Recebimentos WHERE Id = 'receb-entrada';",
            99L,
            IgnorarChecks: true,
            ProvaConstraint: "UPDATE Recebimentos SET Forma = 99 WHERE Id = 'receb-entrada';")],
        [new CasoCorrupcao(
            "status-administrativo-desconhecido",
            "UPDATE Vendas SET StatusAdministrativo = 99 WHERE Id = 'venda-entrada';",
            "UPDATE Vendas SET StatusAdministrativo = 0 WHERE Id = 'venda-entrada';",
            "SELECT StatusAdministrativo FROM Vendas WHERE Id = 'venda-entrada';",
            99L,
            IgnorarChecks: true,
            ProvaConstraint: "UPDATE Vendas SET StatusAdministrativo = 99 WHERE Id = 'venda-entrada';")],
        [new CasoCorrupcao(
            "registro-de-id-com-tipo-incorreto",
            "UPDATE Identificadores SET Tipo = 0 WHERE Id = 'parcela-futura';",
            "UPDATE Identificadores SET Tipo = 1 WHERE Id = 'parcela-futura';",
            "SELECT Tipo FROM Identificadores WHERE Id = 'parcela-futura';",
            0L)],
        [new CasoCorrupcao(
            "registro-de-id-ausente",
            "DELETE FROM Identificadores WHERE Id = 'parcela-futura';",
            "INSERT INTO Identificadores (Id, Tipo) VALUES ('parcela-futura', 1);",
            "SELECT COUNT(*) FROM Identificadores WHERE Id = 'parcela-futura';",
            0L,
            DesabilitarChavesEstrangeiras: true,
            ProvaConstraint: "DELETE FROM Identificadores WHERE Id = 'parcela-futura';")],
        [new CasoCorrupcao(
            "identificador-vazio",
            "UPDATE Vendas SET Id = '' WHERE Id = 'venda-prejuizo'; UPDATE Identificadores SET Id = '' WHERE Id = 'venda-prejuizo';",
            "UPDATE Vendas SET Id = 'venda-prejuizo' WHERE Id = ''; UPDATE Identificadores SET Id = 'venda-prejuizo' WHERE Id = '';",
            "SELECT COUNT(*) FROM Vendas WHERE Id = '';",
            1L,
            DesabilitarChavesEstrangeiras: true)],
        [new CasoCorrupcao(
            "ordem-global-de-vendas-com-lacuna",
            "UPDATE Vendas SET Ordem = 4 WHERE Id = 'venda-prejuizo';",
            "UPDATE Vendas SET Ordem = 2 WHERE Id = 'venda-prejuizo';",
            "SELECT Ordem FROM Vendas WHERE Id = 'venda-prejuizo';",
            4L)],
        [new CasoCorrupcao(
            "ordem-de-recebimento-com-lacuna",
            "UPDATE Recebimentos SET Ordem = 2 WHERE Id = 'receb-entrada';",
            "UPDATE Recebimentos SET Ordem = 0 WHERE Id = 'receb-entrada';",
            "SELECT Ordem FROM Recebimentos WHERE Id = 'receb-entrada';",
            2L)],
        [new CasoCorrupcao(
            "ordem-de-alocacao-com-lacuna",
            "UPDATE Alocacoes SET Ordem = 2 WHERE RecebimentoId = 'receb-entrada';",
            "UPDATE Alocacoes SET Ordem = 0 WHERE RecebimentoId = 'receb-entrada';",
            "SELECT Ordem FROM Alocacoes WHERE RecebimentoId = 'receb-entrada';",
            2L)],
        [new CasoCorrupcao(
            "alocacao-vinculada-a-outra-venda",
            "UPDATE Alocacoes SET VendaId = 'venda-prejuizo' WHERE RecebimentoId = 'receb-entrada';",
            "UPDATE Alocacoes SET VendaId = 'venda-entrada' WHERE RecebimentoId = 'receb-entrada';",
            "SELECT VendaId FROM Alocacoes WHERE RecebimentoId = 'receb-entrada';",
            "venda-prejuizo",
            DesabilitarChavesEstrangeiras: true,
            ProvaConstraint: "UPDATE Alocacoes SET VendaId = 'venda-prejuizo' WHERE RecebimentoId = 'receb-entrada';")],
        [new CasoCorrupcao(
            "total-base-zero",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 0 WHERE Id = 'venda-prejuizo';",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 10000 WHERE Id = 'venda-prejuizo';",
            "SELECT ValorTotalBaseCentavos FROM Vendas WHERE Id = 'venda-prejuizo';",
            0L,
            IgnorarChecks: true,
            ProvaConstraint: "UPDATE Vendas SET ValorTotalBaseCentavos = 0 WHERE Id = 'venda-prejuizo';")],
        [new CasoCorrupcao(
            "soma-global-insegura-incluindo-inativa",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 9007199254740991 WHERE Id = 'venda-inativa'; UPDATE Parcelas SET ValorBaseCentavos = 9007199254740991 WHERE Id = 'parcela-inativa';",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 10000 WHERE Id = 'venda-inativa'; UPDATE Parcelas SET ValorBaseCentavos = 10000 WHERE Id = 'parcela-inativa';",
            "SELECT ValorTotalBaseCentavos FROM Vendas WHERE Id = 'venda-inativa';",
            Dinheiro.LimiteCentavos)],
        [new CasoCorrupcao(
            "soma-global-insegura-incluindo-prejuizo",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 9007199254740991 WHERE Id = 'venda-prejuizo'; UPDATE Parcelas SET ValorBaseCentavos = 9007199254740991 WHERE Id = 'parcela-prejuizo';",
            "UPDATE Vendas SET ValorTotalBaseCentavos = 10000 WHERE Id = 'venda-prejuizo'; UPDATE Parcelas SET ValorBaseCentavos = 10000 WHERE Id = 'parcela-prejuizo';",
            "SELECT ValorTotalBaseCentavos FROM Vendas WHERE Id = 'venda-prejuizo';",
            Dinheiro.LimiteCentavos)],
        [new CasoCorrupcao(
            "observacao-nula",
            "UPDATE Recebimentos SET Observacao = NULL WHERE Id = 'receb-entrada';",
            "UPDATE Recebimentos SET Observacao = '' WHERE Id = 'receb-entrada';",
            "SELECT Observacao IS NULL FROM Recebimentos WHERE Id = 'receb-entrada';",
            1L)]
    ];

    [TestMethod]
    [DynamicData(nameof(CasosCorrompidos))]
    public async Task Carregar_RejeitaCorrupcaoSemRepararERelêAposRestauracao(CasoCorrupcao caso)
    {
        await PrepararFixtureValidaAsync();

        if (caso.ProvaConstraint is not null)
        {
            await AssertFalhaConstraintAsync(() => ExecutarSqlAsync(caso.ProvaConstraint));
        }

        await ExecutarSqlAsync(
            caso.Corromper,
            ignorarChecks: caso.IgnorarChecks,
            desabilitarChavesEstrangeiras: caso.DesabilitarChavesEstrangeiras);

        var resultadoInvalido = await _leitor.CarregarAsync(_caminhoBanco, Referencia);

        var falha = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Falha>(resultadoInvalido);
        Assert.AreEqual(CodigosErroArmazenamento.DadosPersistidosInvalidos, falha.Erro.Codigo);
        Assert.IsFalse(string.IsNullOrWhiteSpace(falha.Erro.Mensagem));
        Assert.AreEqual(
            Convert.ToString(caso.ValorPersistidoCorrompido, System.Globalization.CultureInfo.InvariantCulture),
            Convert.ToString(await ConsultarEscalarAsync(caso.ConsultaCorrompida), System.Globalization.CultureInfo.InvariantCulture));

        await ExecutarSqlAsync(
            caso.Restaurar,
            ignorarChecks: caso.IgnorarChecks,
            desabilitarChavesEstrangeiras: caso.DesabilitarChavesEstrangeiras);

        var resultadoRestaurado = await _leitor.CarregarAsync(_caminhoBanco, Referencia);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(resultadoRestaurado).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(3, snapshot.Conjunto.Vendas.Count);
        CollectionAssert.AreEqual(
            new[] { "venda-entrada", "venda-inativa", "venda-prejuizo" },
            snapshot.Conjunto.Vendas.Select(venda => venda.Id).ToArray());
        Assert.AreEqual(20_000L, snapshot.Conjunto.Vendas[0].ValorTotalBase.Centavos);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[1].ValorTotalBase.Centavos);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, snapshot.Conjunto.Vendas[1].StatusAdministrativo);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[2].ValorTotalBase.Centavos);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, snapshot.Conjunto.Vendas[2].StatusAdministrativo);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[0].Recebimentos.Single().Alocacoes.Single().Valor.Centavos);
    }

    [TestMethod]
    public async Task Preparar_ConstraintDeRegistroGlobalRecusaColisaoEntreTiposSemAlterarFixture()
    {
        await PrepararFixtureValidaAsync();

        await AssertFalhaConstraintAsync(() => ExecutarSqlAsync(
            "INSERT INTO Identificadores (Id, Tipo) VALUES ('venda-entrada', 1);"));

        var resultado = await _leitor.CarregarAsync(_caminhoBanco, Referencia);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(resultado).Valor;
        Assert.AreEqual(3, snapshot.Conjunto.Vendas.Count);
    }

    private async Task PrepararFixtureValidaAsync()
    {
        var inicializacao = await _inicializador.InicializarAsync(_caminhoBanco);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(inicializacao);

        await ExecutarSqlAsync("""
            INSERT INTO Identificadores (Id, Tipo) VALUES
                ('venda-entrada', 0), ('parcela-entrada', 1), ('parcela-futura', 1),
                ('receb-entrada', 2), ('venda-inativa', 0), ('parcela-inativa', 1),
                ('venda-prejuizo', 0), ('parcela-prejuizo', 1);

            INSERT INTO Vendas
                (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                 ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES
                ('venda-entrada', 0, 0, 'Entrada', '12345678909', '1198765432', NULL, '2027-01-15', 20000),
                ('venda-inativa', 1, 1, 'Inativa', '93541134780', '3198765432', NULL, '2027-01-15', 10000),
                ('venda-prejuizo', 2, 2, 'Prejuízo', '52998224725', '2198765432', NULL, '2027-01-15', 10000);

            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento) VALUES
                ('parcela-entrada', 'venda-entrada', 1, 10000, '2027-01-15'),
                ('parcela-futura', 'venda-entrada', 2, 10000, '2027-02-15'),
                ('parcela-inativa', 'venda-inativa', 1, 10000, '2027-02-15'),
                ('parcela-prejuizo', 'venda-prejuizo', 1, 10000, '2027-02-15');

            INSERT INTO Recebimentos
                (Id, VendaId, Ordem, Data, Forma, Origem, ValorCentavos, AcrescimoCentavos, Observacao)
            VALUES
                ('receb-entrada', 'venda-entrada', 0, '2027-01-15', 1, 0, 10000, 0, '');

            INSERT INTO Alocacoes (RecebimentoId, Ordem, VendaId, ParcelaId, ValorCentavos)
            VALUES ('receb-entrada', 0, 'venda-entrada', 'parcela-entrada', 10000);
            """);

        var valido = await _leitor.CarregarAsync(_caminhoBanco, Referencia);
        Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(valido);
    }

    private async Task ExecutarSqlAsync(
        string sql,
        bool ignorarChecks = false,
        bool desabilitarChavesEstrangeiras = false)
    {
        await using var conexao = CriarConexao();
        await conexao.OpenAsync();
        if (desabilitarChavesEstrangeiras)
        {
            await ExecutarComandoAsync(conexao, "PRAGMA foreign_keys = OFF;");
        }

        if (ignorarChecks)
        {
            await ExecutarComandoAsync(conexao, "PRAGMA ignore_check_constraints = ON;");
        }

        await ExecutarComandoAsync(conexao, sql);
    }

    private async Task<object?> ConsultarEscalarAsync(string sql)
    {
        await using var conexao = CriarConexao();
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        return await comando.ExecuteScalarAsync();
    }

    private SqliteConnection CriarConexao() => new(new SqliteConnectionStringBuilder
    {
        DataSource = _caminhoBanco,
        Mode = SqliteOpenMode.ReadWrite,
        ForeignKeys = true,
        DefaultTimeout = 5,
        Pooling = false
    }.ToString());

    private static async Task ExecutarComandoAsync(SqliteConnection conexao, string sql)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
    }

    private static async Task AssertFalhaConstraintAsync(Func<Task> operacao)
    {
        SqliteException? excecaoRecebida = null;
        try
        {
            await operacao();
        }
        catch (SqliteException excecao)
        {
            excecaoRecebida = excecao;
        }

        Assert.IsNotNull(excecaoRecebida, "A constraint SQLite deveria recusar a alteração inválida.");
    }

    public sealed record CasoCorrupcao(
        string Nome,
        string Corromper,
        string Restaurar,
        string ConsultaCorrompida,
        object ValorPersistidoCorrompido,
        bool IgnorarChecks = false,
        bool DesabilitarChavesEstrangeiras = false,
        string? ProvaConstraint = null)
    {
        public override string ToString() => Nome;
    }
}
