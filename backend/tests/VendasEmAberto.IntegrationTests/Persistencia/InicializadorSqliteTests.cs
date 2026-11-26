using Microsoft.Data.Sqlite;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class InicializadorSqliteTests
{
    private readonly InicializadorSqlite _inicializador = new();
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-init-{Guid.NewGuid():N}");
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

    [TestMethod]
    public async Task Inicializar_CriaBancoNovoComSchemaERevisaoZero()
    {
        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);

        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
        Assert.IsTrue(File.Exists(_caminhoBanco));
        Assert.AreEqual(0L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT Revisao FROM EstadoArmazenamento WHERE Id = 1;"));
        Assert.AreEqual(6L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN " +
            "('EstadoArmazenamento', 'Identificadores', 'Vendas', 'Parcelas', 'Recebimentos', 'Alocacoes');"));
    }

    [TestMethod]
    public async Task Inicializar_DatabaseVazioExistenteTambemRecebeMigration()
    {
        await using (var conexao = CriarConexao(_caminhoBanco, SqliteOpenMode.ReadWriteCreate))
        {
            await conexao.OpenAsync();
        }

        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);

        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
        Assert.AreEqual(0L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT Revisao FROM EstadoArmazenamento WHERE Id = 1;"));
    }

    [TestMethod]
    public async Task Inicializar_RepetidaPreservaRevisaoERegistroExistentes()
    {
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(
            await _inicializador.InicializarAsync(_caminhoBanco));
        await ExecutarAsync(_caminhoBanco, "UPDATE EstadoArmazenamento SET Revisao = 17 WHERE Id = 1;");

        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);

        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
        Assert.AreEqual(17L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT Revisao FROM EstadoArmazenamento WHERE Id = 1;"));
        Assert.AreEqual(1L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT COUNT(*) FROM EstadoArmazenamento;"));
    }

    [TestMethod]
    public async Task Inicializar_RecusaCaminhoRelativoEPaiAusenteSemCriarDiretorios()
    {
        var caminhoRelativo = $"banco-{Guid.NewGuid():N}.db";
        var caminhoComPaiAusente = Path.Combine(_diretorioTemporario, "nao-criar", "persistencia.db");

        var relativo = await _inicializador.InicializarAsync(caminhoRelativo);
        var paiAusente = await _inicializador.InicializarAsync(caminhoComPaiAusente);

        Assert.AreEqual(
            CodigosErroArmazenamento.CaminhoInvalido,
            Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Falha>(relativo).Erro.Codigo);
        Assert.AreEqual(
            CodigosErroArmazenamento.CaminhoInvalido,
            Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Falha>(paiAusente).Erro.Codigo);
        Assert.IsFalse(File.Exists(caminhoRelativo));
        Assert.IsFalse(Directory.Exists(Path.GetDirectoryName(caminhoComPaiAusente)));
    }

    [TestMethod]
    public async Task Inicializar_RecusaBancoAlheioSemAlterarSeusBytes()
    {
        await ExecutarAsync(
            _caminhoBanco,
            "CREATE TABLE TabelaAlheia (Id INTEGER PRIMARY KEY, Conteudo TEXT NOT NULL); " +
            "INSERT INTO TabelaAlheia (Id, Conteudo) VALUES (1, 'preservar');");
        var bytesOriginais = await File.ReadAllBytesAsync(_caminhoBanco);

        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.SchemaIncompativel,
            Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Falha>(resultado).Erro.Codigo);
        CollectionAssert.AreEqual(bytesOriginais, await File.ReadAllBytesAsync(_caminhoBanco));
    }

    [TestMethod]
    public async Task Inicializar_RecusaHistoricoDeMigracaoFuturoSemAlterarSeusBytes()
    {
        await ExecutarAsync(
            _caminhoBanco,
            "CREATE TABLE __EFMigrationsHistory (MigrationId TEXT NOT NULL CONSTRAINT PK_History PRIMARY KEY, " +
            "ProductVersion TEXT NOT NULL); " +
            "INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) " +
            "VALUES ('99999999999999_Futura', '99.0.0');");
        var bytesOriginais = await File.ReadAllBytesAsync(_caminhoBanco);

        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.SchemaIncompativel,
            Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Falha>(resultado).Erro.Codigo);
        CollectionAssert.AreEqual(bytesOriginais, await File.ReadAllBytesAsync(_caminhoBanco));
    }

    private static SqliteConnection CriarConexao(string caminho, SqliteOpenMode modo) =>
        new(new SqliteConnectionStringBuilder
        {
            DataSource = caminho,
            Mode = modo,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString());

    private static async Task<long> ConsultarEscalarAsync(string caminho, string sql)
    {
        await using var conexao = CriarConexao(caminho, SqliteOpenMode.ReadWrite);
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        return Convert.ToInt64(await comando.ExecuteScalarAsync());
    }

    private static async Task ExecutarAsync(string caminho, string sql)
    {
        await using var conexao = CriarConexao(caminho, SqliteOpenMode.ReadWriteCreate);
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
    }
}
