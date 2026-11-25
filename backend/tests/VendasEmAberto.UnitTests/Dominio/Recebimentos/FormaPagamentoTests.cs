using VendasEmAberto.Dominio.Recebimentos;

namespace VendasEmAberto.UnitTests.Dominio.Recebimentos;

[TestClass]
public sealed class FormaPagamentoTests
{
    [TestMethod]
    [DataRow(FormaPagamento.Dinheiro)]
    [DataRow(FormaPagamento.Pix)]
    [DataRow(FormaPagamento.CartaoDebito)]
    [DataRow(FormaPagamento.CartaoCredito)]
    public void EhValida_AceitaFormasVigentes(FormaPagamento forma)
    {
        Assert.IsTrue(FormasPagamento.EhValida(forma));
    }

    [TestMethod]
    public void EhValida_RejeitaValorDeEnumDesconhecido()
    {
        Assert.IsFalse(FormasPagamento.EhValida((FormaPagamento)999));
    }
}
