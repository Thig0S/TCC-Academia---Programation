using VendasEmAberto.Aplicacao.Persistencia;

namespace VendasEmAberto.UnitTests.Aplicacao.Persistencia;

[TestClass]
public sealed class DestinoArmazenamentoVendasTests
{
    [TestMethod]
    public void Construtor_RecusaCaminhoVazioERelativoComMensagemSemCaminhoPessoal()
    {
        foreach (var caminho in new[] { "", "   ", "banco-vendas.db" })
        {
            var excecao = Assert.ThrowsExactly<ArgumentException>(() =>
                new DestinoArmazenamentoVendas(caminho));

            Assert.IsTrue(excecao.Message.StartsWith(
                "Informe um caminho absoluto válido para o banco.",
                StringComparison.Ordinal));
            Assert.IsFalse(excecao.Message.Contains(Path.GetTempPath(), StringComparison.OrdinalIgnoreCase));
        }
    }

    [TestMethod]
    public void Construtor_PreservaDestinoAbsolutoSemCriarArquivoOuDiretorio()
    {
        var diretorioAusente = Path.Combine(Path.GetTempPath(), $"vendas-destino-{Guid.NewGuid():N}");
        var caminho = Path.Combine(diretorioAusente, "vendas.db");

        var destino = new DestinoArmazenamentoVendas(caminho);

        Assert.AreEqual(Path.GetFullPath(caminho), destino.CaminhoAbsoluto);
        Assert.IsFalse(Directory.Exists(diretorioAusente));
        Assert.IsFalse(File.Exists(caminho));
    }
}
