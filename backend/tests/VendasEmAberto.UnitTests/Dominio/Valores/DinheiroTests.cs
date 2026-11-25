using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.UnitTests.Dominio.Valores;

[TestClass]
public sealed class DinheiroTests
{
    [TestMethod]
    [DataRow(0L)]
    [DataRow(1L)]
    [DataRow(Dinheiro.LimiteCentavos)]
    public void Criar_AceitaCentavosNoIntervalo(long centavos)
    {
        var resultado = Dinheiro.Criar(centavos);

        var sucesso = Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(resultado);
        Assert.AreEqual(centavos, sucesso.Valor.Centavos);
    }

    [TestMethod]
    public void Criar_RejeitaCentavosNegativos()
    {
        var falha = ObterFalha(Dinheiro.Criar(-1));

        Assert.AreEqual("valor-invalido", falha.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Erro.Categoria);
        Assert.AreEqual("valor", falha.Erro.Campo);
    }

    [TestMethod]
    public void Criar_RejeitaValorAcimaDoLimiteSeguro()
    {
        var falha = ObterFalha(Dinheiro.Criar(Dinheiro.LimiteCentavos + 1));

        Assert.AreEqual("limite-financeiro-excedido", falha.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Erro.Categoria);
    }

    [TestMethod]
    public void Somar_AceitaLimiteExato()
    {
        var dinheiro = ObterSucesso(Dinheiro.Criar(Dinheiro.LimiteCentavos - 1));

        var sucesso = ObterSucesso(dinheiro.Somar(ObterSucesso(Dinheiro.Criar(1))));

        Assert.AreEqual(Dinheiro.LimiteCentavos, sucesso.Centavos);
    }

    [TestMethod]
    public void Somar_RejeitaSomaAcimaDoLimiteSeguro()
    {
        var dinheiro = ObterSucesso(Dinheiro.Criar(Dinheiro.LimiteCentavos));

        var falha = ObterFalha(dinheiro.Somar(ObterSucesso(Dinheiro.Criar(1))));

        Assert.AreEqual("limite-financeiro-excedido", falha.Erro.Codigo);
        Assert.AreEqual("valor", falha.Erro.Campo);
    }

    [TestMethod]
    public void Subtrair_AceitaResultadoNaoNegativo()
    {
        var total = ObterSucesso(Dinheiro.Criar(10_000));

        var sucesso = ObterSucesso(total.Subtrair(ObterSucesso(Dinheiro.Criar(3_333))));

        Assert.AreEqual(6_667, sucesso.Centavos);
    }

    [TestMethod]
    public void Subtrair_RejeitaResultadoNegativo()
    {
        var total = ObterSucesso(Dinheiro.Criar(1));

        var falha = ObterFalha(total.Subtrair(ObterSucesso(Dinheiro.Criar(2))));

        Assert.AreEqual("valor-invalido", falha.Erro.Codigo);
    }

    private static Dinheiro ObterSucesso(ResultadoDominio<Dinheiro> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<Dinheiro>.Falha ObterFalha(ResultadoDominio<Dinheiro> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Falha>(resultado);
}
