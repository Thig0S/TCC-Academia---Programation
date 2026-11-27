using System.Security.Cryptography;
using MediatR;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class ConfiguracaoHostApiTests
{
    private static readonly DateOnly Referencia = new(2027, 2, 1);

    [TestMethod]
    public async Task Host_PreparaBancoVazioAntesDeResponderHealth()
    {
        await using var fixture = await HostApiFixture.CriarAsync();

        Assert.IsTrue(File.Exists(fixture.CaminhoBanco));
        using var resposta = await fixture.Cliente.GetAsync("/health");
        Assert.AreEqual(System.Net.HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual(0L, await ConsultarEscalarAsync(
            fixture.CaminhoBanco,
            "SELECT Revisao FROM EstadoArmazenamento WHERE Id = 1;"));
        Assert.AreEqual(0L, await ConsultarEscalarAsync(
            fixture.CaminhoBanco,
            "SELECT COUNT(*) FROM Vendas;"));
    }

    [TestMethod]
    public async Task ConfiguracaoInvalidaFalhaAntesDeCriarBancoOuPaiAusente()
    {
        var raiz = Path.Combine(Path.GetTempPath(), $"vendas-api-config-{Guid.NewGuid():N}");
        Directory.CreateDirectory(raiz);
        var caminhoBanco = Path.Combine(raiz, "sem-banco.sqlite");
        const string segredoMarcador = "segredo-sintetico-nao-ecoar";

        try
        {
            var erroSegredo = await Assert.ThrowsExactlyAsync<InvalidOperationException>(
                async () => await HostApiFixture.CriarAsync(
                    caminhoBanco: caminhoBanco,
                    segredoLocal: segredoMarcador));
            Assert.IsFalse(File.Exists(caminhoBanco));
            Assert.IsFalse(erroSegredo.ToString().Contains(segredoMarcador, StringComparison.Ordinal));

            var caminhoPaiAusente = Path.Combine(raiz, "nao-criar", "vendas.sqlite");
            var erroPai = await Assert.ThrowsExactlyAsync<InvalidOperationException>(
                async () => await HostApiFixture.CriarAsync(caminhoBanco: caminhoPaiAusente));
            Assert.IsFalse(Directory.Exists(Path.GetDirectoryName(caminhoPaiAusente)));
            Assert.IsFalse(erroPai.ToString().Contains(caminhoPaiAusente, StringComparison.Ordinal));
        }
        finally
        {
            Directory.Delete(raiz, recursive: true);
        }
    }

    [TestMethod]
    public async Task SegredoEmConfiguracaoNaoSubstituiVariavelDeAmbienteObrigatoria()
    {
        var raiz = Path.Combine(Path.GetTempPath(), $"vendas-api-segredo-{Guid.NewGuid():N}");
        Directory.CreateDirectory(raiz);
        var caminhoBanco = Path.Combine(raiz, "sem-segredo.sqlite");
        var segredoConfigurado = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        try
        {
            await Assert.ThrowsExactlyAsync<InvalidOperationException>(async () =>
                await HostApiFixture.CriarAsync(
                    configurar: builder => builder.ConfigureAppConfiguration((_, configuracao) =>
                        configuracao.AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["Backend:SegredoLocal"] = segredoConfigurado
                        })),
                    caminhoBanco: caminhoBanco,
                    incluirSegredoLocal: false));

            Assert.IsFalse(File.Exists(caminhoBanco));
        }
        finally
        {
            Directory.Delete(raiz, recursive: true);
        }
    }

    [TestMethod]
    public async Task PreparacaoRepetidaNoStartupPreservaVendaERevisao()
    {
        var raiz = Path.Combine(Path.GetTempPath(), $"vendas-api-reinicio-{Guid.NewGuid():N}");
        Directory.CreateDirectory(raiz);
        var caminhoBanco = Path.Combine(raiz, "vendas.sqlite");

        try
        {
            string vendaId;
            await using (var primeiraExecucao = await HostApiFixture.CriarAsync(caminhoBanco: caminhoBanco))
            {
                var sender = primeiraExecucao.Servicos.GetRequiredService<ISender>();
                var cadastro = await sender.Send(new CadastrarVendaCommand(
                    "Cliente Sintético",
                    "52998224725",
                    "11987654321",
                    null,
                    new DateOnly(2027, 1, 1),
                    10_000,
                    1,
                    Referencia,
                    0));

                Assert.IsTrue(cadastro.IsSuccess);
                Assert.AreEqual(1L, cadastro.Value.Resumo.Revisao);
                vendaId = cadastro.Value.Resumo.Id;
            }

            await using (var segundaExecucao = await HostApiFixture.CriarAsync(caminhoBanco: caminhoBanco))
            {
                var sender = segundaExecucao.Servicos.GetRequiredService<ISender>();
                var consulta = await sender.Send(new ConsultarColecaoVendasQuery(
                    ColecaoVendas.Abertas,
                    Referencia));

                Assert.IsTrue(consulta.IsSuccess);
                Assert.AreEqual(1L, consulta.Value.Revisao);
                Assert.AreEqual(vendaId, consulta.Value.Vendas.Single().Id);
            }
        }
        finally
        {
            Directory.Delete(raiz, recursive: true);
        }
    }

    [TestMethod]
    [DataRow(
        "CREATE TABLE TabelaAlheia (Id INTEGER PRIMARY KEY, Conteudo TEXT NOT NULL); " +
        "INSERT INTO TabelaAlheia (Id, Conteudo) VALUES (1, 'preservar');")]
    [DataRow(
        "CREATE TABLE __EFMigrationsHistory (MigrationId TEXT NOT NULL CONSTRAINT PK_History PRIMARY KEY, " +
        "ProductVersion TEXT NOT NULL); " +
        "INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) " +
        "VALUES ('99999999999999_Futura', '99.0.0');")]
    public async Task BancoAlheioOuFuturo_FalhaStartupSemAlterarArquivo(string sql)
    {
        var raiz = Path.Combine(Path.GetTempPath(), $"vendas-api-incompativel-{Guid.NewGuid():N}");
        Directory.CreateDirectory(raiz);
        var caminhoBanco = Path.Combine(raiz, "incompativel.sqlite");

        try
        {
            await CriarBancoAsync(caminhoBanco, sql);
            var bytesOriginais = await File.ReadAllBytesAsync(caminhoBanco);

            var erro = await Assert.ThrowsExactlyAsync<InvalidOperationException>(async () =>
                await HostApiFixture.CriarAsync(caminhoBanco: caminhoBanco));

            CollectionAssert.AreEqual(bytesOriginais, await File.ReadAllBytesAsync(caminhoBanco));
            Assert.IsFalse(erro.ToString().Contains(caminhoBanco, StringComparison.Ordinal));
            Assert.IsFalse(erro.ToString().Contains("TabelaAlheia", StringComparison.Ordinal));
            Assert.IsFalse(erro.ToString().Contains("99999999999999", StringComparison.Ordinal));
        }
        finally
        {
            Directory.Delete(raiz, recursive: true);
        }
    }

    private static async Task<long> ConsultarEscalarAsync(string caminho, string sql)
    {
        await using var conexao = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = caminho,
            Mode = SqliteOpenMode.ReadOnly,
            Pooling = false
        }.ToString());
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        return Convert.ToInt64(await comando.ExecuteScalarAsync());
    }

    private static async Task CriarBancoAsync(string caminho, string sql)
    {
        await using var conexao = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = caminho,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        }.ToString());
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
    }
}
