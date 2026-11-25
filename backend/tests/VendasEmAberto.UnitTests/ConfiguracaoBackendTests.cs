using VendasEmAberto.Api.Configuracao;
using Microsoft.Extensions.Configuration;

namespace VendasEmAberto.UnitTests;

[TestClass]
public sealed class ConfiguracaoBackendTests
{
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
