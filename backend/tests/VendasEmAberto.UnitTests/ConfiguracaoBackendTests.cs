using VendasEmAberto.Api.Configuracao;

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
}
