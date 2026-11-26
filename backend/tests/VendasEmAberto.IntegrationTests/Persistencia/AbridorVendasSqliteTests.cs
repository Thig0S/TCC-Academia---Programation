using System.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class AbridorVendasSqliteTests
{
    private readonly InicializadorSqlite _inicializador = new();
    private readonly AbridorVendasSqlite _abridor = new();
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-open-{Guid.NewGuid():N}");
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
    public async Task Abrir_ArquivoAusenteRetornaBancoAusenteSemCriarArquivo()
    {
        var resultado = await _abridor.AbrirAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.BancoAusente,
            Assert.IsInstanceOfType<ResultadoArmazenamento<SessaoVendasSqlite>.Falha>(resultado).Erro.Codigo);
        Assert.IsFalse(File.Exists(_caminhoBanco));
    }

    [TestMethod]
    public async Task Abrir_ArquivoQueNaoEUmBancoSQLiteRecusaSemAlterarConteudo()
    {
        var conteudo = "arquivo sintético que não é SQLite";
        await File.WriteAllTextAsync(_caminhoBanco, conteudo);
        var bytesOriginais = await File.ReadAllBytesAsync(_caminhoBanco);

        var resultado = await _abridor.AbrirAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.SchemaIncompativel,
            Assert.IsInstanceOfType<ResultadoArmazenamento<SessaoVendasSqlite>.Falha>(resultado).Erro.Codigo);
        CollectionAssert.AreEqual(bytesOriginais, await File.ReadAllBytesAsync(_caminhoBanco));
    }

    [TestMethod]
    public async Task Abrir_SchemaAtualAbreReadWriteComForeignKeysETimeoutFinito()
    {
        await InicializarBancoAsync();

        var resultado = await _abridor.AbrirAsync(_caminhoBanco);

        var sessao = ExigirSessaoAberta(resultado);
        await using (sessao)
        {
            var conexao = (SqliteConnection)sessao.Contexto.Database.GetDbConnection();
            var configuracao = new SqliteConnectionStringBuilder(conexao.ConnectionString);

            Assert.AreEqual(ConnectionState.Open, conexao.State);
            Assert.AreEqual(SqliteOpenMode.ReadWrite, configuracao.Mode);
            Assert.AreEqual(5, configuracao.DefaultTimeout);
            Assert.IsFalse(configuracao.Pooling);
            Assert.IsTrue(configuracao.ForeignKeys);
            Assert.AreEqual(1L, await ConsultarEscalarAsync(conexao, "PRAGMA foreign_keys;"));
            Assert.AreEqual(0L, await ConsultarEscalarAsync(
                conexao,
                "SELECT Revisao FROM EstadoArmazenamento WHERE Id = 1;"));
        }
    }

    [TestMethod]
    public async Task Abrir_SchemaFisicoAlteradoRecusaUso()
    {
        await InicializarBancoAsync();
        await ExecutarAsync(_caminhoBanco, "ALTER TABLE Vendas DROP COLUMN ClienteDescricao;");

        var resultado = await _abridor.AbrirAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.SchemaIncompativel,
            Assert.IsInstanceOfType<ResultadoArmazenamento<SessaoVendasSqlite>.Falha>(resultado).Erro.Codigo);
    }

    [TestMethod]
    public async Task Abrir_LinhaDeBloqueioDeMigrationRetornaBancoOcupadoSemRecuperarLock()
    {
        await InicializarBancoAsync();
        await ExecutarAsync(
            _caminhoBanco,
            "INSERT INTO __EFMigrationsLock (Id, Timestamp) VALUES (1, 'fixture-sintetica');");

        var resultado = await _abridor.AbrirAsync(_caminhoBanco);

        Assert.AreEqual(
            CodigosErroArmazenamento.BancoOcupado,
            Assert.IsInstanceOfType<ResultadoArmazenamento<SessaoVendasSqlite>.Falha>(resultado).Erro.Codigo);
        Assert.AreEqual(1L, await ConsultarEscalarAsync(
            _caminhoBanco,
            "SELECT COUNT(*) FROM __EFMigrationsLock;"));
    }

    [TestMethod]
    public async Task Sessao_DisposeLiberaConexaoEArquivoPodeSerMovido()
    {
        await InicializarBancoAsync();
        var resultado = await _abridor.AbrirAsync(_caminhoBanco);
        var sessao = ExigirSessaoAberta(resultado);
        var conexao = sessao.Contexto.Database.GetDbConnection();

        Assert.AreEqual(ConnectionState.Open, conexao.State);
        await sessao.DisposeAsync();
        Assert.AreEqual(ConnectionState.Closed, conexao.State);

        var caminhoMovido = Path.Combine(_diretorioTemporario, "movido.db");
        File.Move(_caminhoBanco, caminhoMovido);
        Assert.IsTrue(File.Exists(caminhoMovido));
        Assert.IsFalse(File.Exists(_caminhoBanco));
    }

    private async Task InicializarBancoAsync()
    {
        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
    }

    private static SessaoVendasSqlite ExigirSessaoAberta(
        ResultadoArmazenamento<SessaoVendasSqlite> resultado)
    {
        if (resultado is ResultadoArmazenamento<SessaoVendasSqlite>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoArmazenamento<SessaoVendasSqlite>.Sucesso>(resultado).Valor;
    }

    private static async Task<long> ConsultarEscalarAsync(SqliteConnection conexao, string sql)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        return Convert.ToInt64(await comando.ExecuteScalarAsync());
    }

    private static async Task<long> ConsultarEscalarAsync(string caminho, string sql)
    {
        await using var conexao = CriarConexao(caminho, SqliteOpenMode.ReadWrite);
        await conexao.OpenAsync();
        return await ConsultarEscalarAsync(conexao, sql);
    }

    private static async Task ExecutarAsync(string caminho, string sql)
    {
        await using var conexao = CriarConexao(caminho, SqliteOpenMode.ReadWrite);
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
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
}
