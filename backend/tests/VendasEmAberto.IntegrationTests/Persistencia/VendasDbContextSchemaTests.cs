using System.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.DesignTime;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class VendasDbContextSchemaTests
{
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-schema-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "persistencia.db");
    }

    [TestCleanup]
    public void LimparFixture()
    {
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    [TestMethod]
    public async Task MigrationInicial_CriaTabelasETiposEsperadosEmArquivoTemporario()
    {
        await using var contexto = CriarContexto();

        await contexto.Database.MigrateAsync();

        Assert.IsTrue(File.Exists(_caminhoBanco));
        var tabelas = await ConsultarStringsAsync(
            contexto,
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;");

        CollectionAssert.AreEquivalent(
            new[]
            {
                "Alocacoes",
                "EstadoArmazenamento",
                "Identificadores",
                "Parcelas",
                "Recebimentos",
                "Vendas"
            },
            tabelas.Where(tabela => !tabela.StartsWith("__", StringComparison.Ordinal)).ToArray());
        CollectionAssert.Contains(tabelas.ToArray(), "__EFMigrationsHistory");

        var colunasVendas = await ConsultarColunasAsync(contexto, "Vendas");
        Assert.AreEqual("TEXT", colunasVendas["DataVenda"].Tipo);
        Assert.AreEqual("INTEGER", colunasVendas["ValorTotalBaseCentavos"].Tipo);
        Assert.IsTrue(colunasVendas["ClienteDescricao"].PermiteNulo);

        var colunasRecebimentos = await ConsultarColunasAsync(contexto, "Recebimentos");
        Assert.AreEqual("TEXT", colunasRecebimentos["Data"].Tipo);
        Assert.AreEqual("INTEGER", colunasRecebimentos["ValorCentavos"].Tipo);
        Assert.IsTrue(colunasRecebimentos["Observacao"].PermiteNulo);
    }

    [TestMethod]
    public void FactoryDesignTime_ExigeCaminhoAbsolutoESemAbrirOuCriarArquivo()
    {
        var factory = new VendasDbContextFactory();

        using var contexto = factory.CreateDbContext(["--database", _caminhoBanco]);

        Assert.AreEqual("Microsoft.EntityFrameworkCore.Sqlite", contexto.Database.ProviderName);
        Assert.IsFalse(File.Exists(_caminhoBanco));
        Assert.ThrowsExactly<ArgumentException>(() =>
            factory.CreateDbContext(["--database", "relativo.db"]));
        Assert.IsFalse(File.Exists(_caminhoBanco));
    }

    [TestMethod]
    public async Task Constraints_RejeitamColisaoGlobalOrdemDuplicadaEValorForaDoLimite()
    {
        await using var contexto = CriarContexto();
        await contexto.Database.MigrateAsync();
        await InserirIdentificadorAsync(contexto, "venda-1", 0);
        await InserirIdentificadorAsync(contexto, "venda-2", 0);
        await InserirIdentificadorAsync(contexto, "venda-3", 0);
        await InserirVendaAsync(contexto, "venda-1", 0, 10_000, "12345678909");
        await InserirVendaAsync(contexto, "venda-2", 1, 20_000, "12345678909");

        var clientesComCpfRepetido = await ConsultarEscalarAsync(
            contexto,
            "SELECT COUNT(*) FROM Vendas WHERE ClienteCpf = '12345678909';");
        Assert.AreEqual(2L, Convert.ToInt64(clientesComCpfRepetido));

        await AssertViolacaoConstraintAsync(
            () => InserirIdentificadorAsync(contexto, "venda-1", 1));
        await AssertViolacaoConstraintAsync(
            () => InserirVendaAsync(contexto, "venda-3", 0, 30_000, "98765432100"));
        await AssertViolacaoConstraintAsync(
            () => InserirVendaAsync(contexto, "venda-3", 2, 9_007_199_254_740_992, "98765432100"));
        await AssertViolacaoConstraintAsync(
            () => ExecutarAsync(contexto, "UPDATE Vendas SET StatusAdministrativo = 99 WHERE Id = 'venda-1';"));
    }

    [TestMethod]
    public async Task Constraints_RejeitamNumeroDeParcelaEOrdemDeRecebimentoDuplicados()
    {
        await using var contexto = CriarContexto();
        await contexto.Database.MigrateAsync();
        await InserirIdentificadorAsync(contexto, "venda-1", 0);
        await InserirVendaAsync(contexto, "venda-1", 0, 10_000, "12345678909");
        await InserirIdentificadorAsync(contexto, "parcela-1", 1);
        await InserirIdentificadorAsync(contexto, "parcela-2", 1);
        await InserirParcelaAsync(contexto, "parcela-1", "venda-1", 1);
        await AssertViolacaoConstraintAsync(
            () => InserirParcelaAsync(contexto, "parcela-2", "venda-1", 1));

        await InserirIdentificadorAsync(contexto, "recebimento-1", 2);
        await InserirIdentificadorAsync(contexto, "recebimento-2", 2);
        await InserirRecebimentoAsync(contexto, "recebimento-1", "venda-1", 0);
        await AssertViolacaoConstraintAsync(
            () => InserirRecebimentoAsync(contexto, "recebimento-2", "venda-1", 0));
    }

    [TestMethod]
    public async Task ChavesCompostas_ImpedemAlocacaoDeParcelaDeOutraVenda()
    {
        await using var contexto = CriarContexto();
        await contexto.Database.MigrateAsync();
        await InserirIdentificadorAsync(contexto, "venda-1", 0);
        await InserirIdentificadorAsync(contexto, "venda-2", 0);
        await InserirVendaAsync(contexto, "venda-1", 0, 10_000, "12345678909");
        await InserirVendaAsync(contexto, "venda-2", 1, 10_000, "12345678909");
        await InserirIdentificadorAsync(contexto, "parcela-1", 1);
        await InserirIdentificadorAsync(contexto, "parcela-2", 1);
        await InserirParcelaAsync(contexto, "parcela-1", "venda-1", 1);
        await InserirParcelaAsync(contexto, "parcela-2", "venda-2", 1);
        await InserirIdentificadorAsync(contexto, "recebimento-1", 2);
        await InserirRecebimentoAsync(contexto, "recebimento-1", "venda-1", 0);

        await InserirAlocacaoAsync(contexto, "recebimento-1", "venda-1", "parcela-1", 0);

        await AssertViolacaoConstraintAsync(
            () => InserirAlocacaoAsync(contexto, "recebimento-1", "venda-1", "parcela-1", 0));
        await AssertViolacaoConstraintAsync(
            () => InserirAlocacaoAsync(contexto, "recebimento-1", "venda-1", "parcela-2", 1));
        await AssertViolacaoConstraintAsync(
            () => ExecutarAsync(contexto, "DELETE FROM Vendas WHERE Id = 'venda-1';"));
    }

    private VendasDbContext CriarContexto()
    {
        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _caminhoBanco,
            Mode = SqliteOpenMode.ReadWriteCreate,
            ForeignKeys = true,
            Pooling = false,
            DefaultTimeout = 5
        }.ToString();
        var options = new DbContextOptionsBuilder<VendasDbContext>()
            .UseSqlite(connectionString)
            .Options;

        return new VendasDbContext(options);
    }

    private async Task InserirIdentificadorAsync(VendasDbContext contexto, string id, int tipo) =>
        await ExecutarAsync(
            contexto,
            "INSERT INTO Identificadores (Id, Tipo) VALUES ($id, $tipo);",
            ("$id", id),
            ("$tipo", tipo));

    private async Task InserirVendaAsync(
        VendasDbContext contexto,
        string id,
        int ordem,
        long totalBaseCentavos,
        string cpf) =>
        await ExecutarAsync(
            contexto,
            """
            INSERT INTO Vendas (
                Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES ($id, $ordem, 0, 'Cliente Sintético', $cpf, '1198765432', NULL,
                    '2027-01-15', $total);
            """,
            ("$id", id),
            ("$ordem", ordem),
            ("$cpf", cpf),
            ("$total", totalBaseCentavos));

    private async Task InserirParcelaAsync(
        VendasDbContext contexto,
        string id,
        string vendaId,
        int numero) =>
        await ExecutarAsync(
            contexto,
            """
            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento)
            VALUES ($id, $vendaId, $numero, 10000, '2027-02-15');
            """,
            ("$id", id),
            ("$vendaId", vendaId),
            ("$numero", numero));

    private async Task InserirRecebimentoAsync(
        VendasDbContext contexto,
        string id,
        string vendaId,
        int ordem) =>
        await ExecutarAsync(
            contexto,
            """
            INSERT INTO Recebimentos (
                Id, VendaId, Ordem, Data, Forma, Origem, ValorCentavos, AcrescimoCentavos, Observacao)
            VALUES ($id, $vendaId, $ordem, '2027-01-15', 0, 1, 10000, 0, NULL);
            """,
            ("$id", id),
            ("$vendaId", vendaId),
            ("$ordem", ordem));

    private async Task InserirAlocacaoAsync(
        VendasDbContext contexto,
        string recebimentoId,
        string vendaId,
        string parcelaId,
        int ordem) =>
        await ExecutarAsync(
            contexto,
            """
            INSERT INTO Alocacoes (RecebimentoId, Ordem, VendaId, ParcelaId, ValorCentavos)
            VALUES ($recebimentoId, $ordem, $vendaId, $parcelaId, 10000);
            """,
            ("$recebimentoId", recebimentoId),
            ("$ordem", ordem),
            ("$vendaId", vendaId),
            ("$parcelaId", parcelaId));

    private static async Task AssertViolacaoConstraintAsync(Func<Task> operacao)
    {
        try
        {
            await operacao();
            Assert.Fail("A operação deveria ter violado uma constraint SQLite.");
        }
        catch (SqliteException excecao)
        {
            Assert.AreEqual(19, excecao.SqliteErrorCode);
        }
    }

    private static async Task ExecutarAsync(
        VendasDbContext contexto,
        string sql,
        params (string Nome, object Valor)[] parametros)
    {
        var conexao = contexto.Database.GetDbConnection();
        if (conexao.State != ConnectionState.Open)
        {
            await conexao.OpenAsync();
        }

        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        foreach (var (nome, valor) in parametros)
        {
            var parametro = comando.CreateParameter();
            parametro.ParameterName = nome;
            parametro.Value = valor;
            comando.Parameters.Add(parametro);
        }

        await comando.ExecuteNonQueryAsync();
    }

    private static async Task<object?> ConsultarEscalarAsync(VendasDbContext contexto, string sql)
    {
        var conexao = contexto.Database.GetDbConnection();
        if (conexao.State != ConnectionState.Open)
        {
            await conexao.OpenAsync();
        }

        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        return await comando.ExecuteScalarAsync();
    }

    private static async Task<IReadOnlyList<string>> ConsultarStringsAsync(
        VendasDbContext contexto,
        string sql)
    {
        var conexao = contexto.Database.GetDbConnection();
        if (conexao.State != ConnectionState.Open)
        {
            await conexao.OpenAsync();
        }

        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await using var leitor = await comando.ExecuteReaderAsync();
        var valores = new List<string>();
        while (await leitor.ReadAsync())
        {
            valores.Add(leitor.GetString(0));
        }

        return valores;
    }

    private static async Task<IReadOnlyDictionary<string, (string Tipo, bool PermiteNulo)>> ConsultarColunasAsync(
        VendasDbContext contexto,
        string tabela)
    {
        var conexao = contexto.Database.GetDbConnection();
        if (conexao.State != ConnectionState.Open)
        {
            await conexao.OpenAsync();
        }

        await using var comando = conexao.CreateCommand();
        comando.CommandText = $"PRAGMA table_info(\"{tabela}\");";
        await using var leitor = await comando.ExecuteReaderAsync();
        var colunas = new Dictionary<string, (string Tipo, bool PermiteNulo)>(StringComparer.Ordinal);
        while (await leitor.ReadAsync())
        {
            var nome = leitor.GetString(1);
            var tipo = leitor.GetString(2);
            var naoNulo = leitor.GetInt32(3) != 0;
            colunas.Add(nome, (tipo, !naoNulo));
        }

        return colunas;
    }
}
