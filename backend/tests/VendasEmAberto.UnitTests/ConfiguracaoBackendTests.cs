using VendasEmAberto.Api.Configuracao;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace VendasEmAberto.UnitTests;

[TestClass]
public sealed class ConfiguracaoBackendTests
{
    [TestMethod]
    public void ObterCaminhoBanco_AceitaArquivoAbsolutoQuandoPaiExisteSemCriarArquivo()
    {
        var diretorio = Path.Combine(Path.GetTempPath(), $"config-api-{Guid.NewGuid():N}");
        Directory.CreateDirectory(diretorio);
        var caminho = Path.Combine(diretorio, "vendas.sqlite");

        try
        {
            Assert.AreEqual(Path.GetFullPath(caminho), ConfiguracaoBackend.ObterCaminhoBanco(caminho));
            Assert.IsFalse(File.Exists(caminho));
        }
        finally
        {
            Directory.Delete(diretorio, recursive: true);
        }
    }

    [TestMethod]
    [DataRow(null)]
    [DataRow("")]
    [DataRow("caminho-relativo.sqlite")]
    public void ObterCaminhoBanco_RejeitaConfiguracaoAusenteOuRelativaSemEcoarValor(string? valor)
    {
        var erro = Assert.ThrowsExactly<InvalidOperationException>(
            () => ConfiguracaoBackend.ObterCaminhoBanco(valor));

        if (!string.IsNullOrEmpty(valor))
        {
            Assert.IsFalse(erro.Message.Contains(valor, StringComparison.Ordinal));
        }
    }

    [TestMethod]
    public void ObterCaminhoBanco_RejeitaPaiAusenteEDiretorioComoArquivoSemCriarPai()
    {
        var paiAusente = Path.Combine(Path.GetTempPath(), $"nao-criar-{Guid.NewGuid():N}", "vendas.sqlite");
        var erroPai = Assert.ThrowsExactly<InvalidOperationException>(
            () => ConfiguracaoBackend.ObterCaminhoBanco(paiAusente));
        var erroDiretorio = Assert.ThrowsExactly<InvalidOperationException>(
            () => ConfiguracaoBackend.ObterCaminhoBanco(Path.GetTempPath()));

        Assert.IsFalse(Directory.Exists(Path.GetDirectoryName(paiAusente)));
        Assert.IsFalse(erroPai.Message.Contains(paiAusente, StringComparison.Ordinal));
        Assert.IsFalse(erroDiretorio.Message.Contains(Path.GetTempPath(), StringComparison.Ordinal));
    }

    [TestMethod]
    public void ValidarSegredoLocal_AceitaSomenteBase64CanonicoDe32Bytes()
    {
        var segredo = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        ConfiguracaoBackend.ValidarSegredoLocal(segredo);
    }

    [TestMethod]
    [DataRow(null)]
    [DataRow("")]
    [DataRow("segredo-marker-nao-base64")]
    [DataRow("MDEyMzQ1Njc4OWFiY2RlZg==")]
    public void ValidarSegredoLocal_RejeitaAusenteOuFormatoInvalidoSemEcoarValor(string? valor)
    {
        var erro = Assert.ThrowsExactly<InvalidOperationException>(
            () => ConfiguracaoBackend.ValidarSegredoLocal(valor));

        if (!string.IsNullOrEmpty(valor))
        {
            Assert.IsFalse(erro.Message.Contains(valor, StringComparison.Ordinal));
        }
        StringAssert.Contains(erro.Message, ConfiguracaoBackend.VariavelSegredoLocal);
    }

    [TestMethod]
    public void ValidarSegredoLocal_RejeitaRepresentacaoComEspacoMesmoQuandoDecodificavel()
    {
        var canonico = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var naoCanonico = canonico.Insert(4, " ");

        Assert.ThrowsExactly<InvalidOperationException>(
            () => ConfiguracaoBackend.ValidarSegredoLocal(naoCanonico));
    }

    [TestMethod]
    public void ObterPorta_UsaPadraoQuandoNaoConfigurada()
    {
        Assert.AreEqual(5070, ConfiguracaoBackend.ObterPorta(null));
    }

    [TestMethod]
    [DataRow("1024", 1024)]
    [DataRow("65535", 65535)]
    [DataRow("5080", 5080)]
    public void ObterPorta_AceitaPortaValida(string valor, int esperada)
    {
        Assert.AreEqual(esperada, ConfiguracaoBackend.ObterPorta(valor));
    }

    [TestMethod]
    [DataRow("abc")]
    [DataRow("")]
    [DataRow("1023")]
    [DataRow("65536")]
    public void ObterPorta_RejeitaValorInvalido(string valor)
    {
        var erro = Assert.ThrowsExactly<FormatException>(() => ConfiguracaoBackend.ObterPorta(valor));

        StringAssert.Contains(erro.Message, ConfiguracaoBackend.ChavePorta);
    }

    [TestMethod]
    [DataRow("--urls=http://0.0.0.0:5000")]
    [DataRow("--Kestrel:Endpoints:Http:Url=http://0.0.0.0:5000")]
    public void ValidarAusenciaDeSobrescrita_RejeitaArgumentoDeEndpoint(string argumento)
    {
        var erro = Assert.ThrowsExactly<InvalidOperationException>(() => Validar(argumento: [argumento]));

        StringAssert.Contains(erro.Message, ConfiguracaoBackend.ChavePorta);
    }

    [TestMethod]
    [DataRow("ASPNETCORE_URLS")]
    [DataRow("DOTNET_URLS")]
    [DataRow("ASPNETCORE_HTTP_PORTS")]
    [DataRow("ASPNETCORE_HTTPS_PORTS")]
    [DataRow("Kestrel__Endpoints__Http__Url")]
    public void ValidarAusenciaDeSobrescrita_RejeitaVariavelDeEndpoint(string nome)
    {
        var variavel = new KeyValuePair<string, string?>(nome, "http://0.0.0.0:5000");

        Assert.ThrowsExactly<InvalidOperationException>(() => Validar(ambiente: [variavel]));
    }

    [TestMethod]
    public void ValidarAusenciaDeSobrescrita_RejeitaEndpointsDaConfiguracao()
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Kestrel:Endpoints:Http:Url"] = "http://0.0.0.0:5000"
            })
            .Build();

        Assert.ThrowsExactly<InvalidOperationException>(() =>
            ConfiguracaoBackend.ValidarAusenciaDeSobrescritaDeEndpoints(configuracao, [], []));
    }

    private static void Validar(
        string[]? argumento = null,
        KeyValuePair<string, string?>[]? ambiente = null)
    {
        var configuracao = new ConfigurationBuilder().Build();
        ConfiguracaoBackend.ValidarAusenciaDeSobrescritaDeEndpoints(
            configuracao,
            argumento ?? [],
            ambiente ?? []);
    }
}
