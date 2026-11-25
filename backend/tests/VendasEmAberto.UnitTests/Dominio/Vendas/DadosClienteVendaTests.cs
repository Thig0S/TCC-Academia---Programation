using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class DadosClienteVendaTests
{
    [TestMethod]
    public void Criar_NormalizaSomenteFormatacaoPermitida()
    {
        var cliente = ObterSucesso(DadosClienteVenda.Criar(
            "  Cliente Sintético  ",
            "123.456.789-09",
            " (11) 98765-4321 ",
            "  referência de teste  "));

        Assert.AreEqual("Cliente Sintético", cliente.Nome);
        Assert.AreEqual("12345678909", cliente.Cpf);
        Assert.AreEqual("11987654321", cliente.Telefone);
        Assert.AreEqual("referência de teste", cliente.Descricao);
    }

    [TestMethod]
    [DataRow("11111111111")]
    [DataRow("12345678900")]
    [DataRow("１２３４５６７８９０９")]
    [DataRow("123abc78909")]
    public void Criar_RejeitaCpfInvalidoOuComDigitosNaoAscii(string cpf)
    {
        var falha = ObterFalha(DadosClienteVenda.Criar("Cliente", cpf, "1198765432", null));

        Assert.AreEqual("cpf-invalido", falha.Erro.Codigo);
        Assert.AreEqual("cpf", falha.Erro.Campo);
    }

    [TestMethod]
    [DataRow("1198765432")]
    [DataRow("11987654321")]
    [DataRow("(11) 98765-4321")]
    public void Criar_AceitaTelefoneComDezOuOnzeDigitos(string telefone)
    {
        var cliente = ObterSucesso(DadosClienteVenda.Criar("Cliente", "12345678909", telefone, null));

        Assert.IsTrue(cliente.Telefone.All(digito => digito is >= '0' and <= '9'));
        Assert.IsFalse(cliente.Telefone.Contains('+'));
    }

    [TestMethod]
    [DataRow("+5511987654321")]
    [DataRow("1198765432a")]
    [DataRow("１１９８７６５４３２１")]
    [DataRow("123456789")]
    [DataRow("11.98765-4321")]
    public void Criar_RejeitaTelefoneForaDoContrato(string telefone)
    {
        var falha = ObterFalha(DadosClienteVenda.Criar("Cliente", "12345678909", telefone, null));

        Assert.AreEqual("telefone-invalido", falha.Erro.Codigo);
        Assert.AreEqual("telefone", falha.Erro.Campo);
    }

    [TestMethod]
    public void Criar_ExigeNomeNaoVazio()
    {
        var falha = ObterFalha(DadosClienteVenda.Criar("   ", "12345678909", "1198765432", null));

        Assert.AreEqual("identificacao-obrigatoria", falha.Erro.Codigo);
        Assert.AreEqual("nome", falha.Erro.Campo);
    }

    [TestMethod]
    public void Criar_ConverteDescricaoVaziaEmAusencia()
    {
        var semDescricao = ObterSucesso(
            DadosClienteVenda.Criar("Cliente", "12345678909", "1198765432", "   "));

        Assert.IsNull(semDescricao.Descricao);
    }

    [TestMethod]
    public void Criar_NaoImpedeCpfValidoRepetidoEmVendasDiferentes()
    {
        var primeiro = ObterSucesso(
            DadosClienteVenda.Criar("Cliente A", "12345678909", "1198765432", null));
        var segundo = ObterSucesso(
            DadosClienteVenda.Criar("Cliente B", "12345678909", "2198765432", null));

        Assert.AreEqual(primeiro.Cpf, segundo.Cpf);
    }

    private static DadosClienteVenda ObterSucesso(ResultadoDominio<DadosClienteVenda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<DadosClienteVenda>.Falha ObterFalha(
        ResultadoDominio<DadosClienteVenda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Falha>(resultado);
}
