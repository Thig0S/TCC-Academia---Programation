using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaCadastroTests
{
    [TestMethod]
    public void Cadastrar_AceitaTotalMinimoComUmaParcela()
    {
        var venda = ObterSucesso(Cadastrar(1, 1, ["parcela-1"]));

        Assert.AreEqual("venda-1", venda.Id);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, venda.StatusAdministrativo);
        Assert.AreEqual(1, venda.ValorTotalBase.Centavos);
        Assert.AreEqual(1, venda.Parcelas.Count);
        Assert.AreEqual(1, venda.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual(new DateOnly(2027, 2, 15), venda.Parcelas[0].Vencimento);
        Assert.AreEqual(0, venda.Recebimentos.Count);
    }

    [TestMethod]
    public void Cadastrar_DistribuiRestoNasPrimeirasParcelas()
    {
        var venda = ObterSucesso(Cadastrar(10_000, 3, ["parcela-1", "parcela-2", "parcela-3"]));

        CollectionAssert.AreEqual(
            new long[] { 3_334, 3_333, 3_333 },
            venda.Parcelas.Select(parcela => parcela.ValorBase.Centavos).ToArray());
        Assert.AreEqual(10_000, venda.Parcelas.Sum(parcela => parcela.ValorBase.Centavos));
    }

    [TestMethod]
    public void Cadastrar_RejeitaMaisParcelasQueCentavosDoTotal()
    {
        var falha = ObterFalha(Cadastrar(2, 3, ["p1", "p2", "p3"]));

        Assert.AreEqual("valor-invalido", falha.Erro.Codigo);
        Assert.AreEqual("quantidadeParcelas", falha.Erro.Campo);
    }

    [TestMethod]
    public void Cadastrar_RejeitaTotalNaoPositivo()
    {
        var falha = ObterFalha(Cadastrar(0, 1, ["p1"]));

        Assert.AreEqual("valor-invalido", falha.Erro.Codigo);
        Assert.AreEqual("valorTotal", falha.Erro.Campo);
    }

    [TestMethod]
    public void Cadastrar_RejeitaDataVendaPosteriorAReferencia()
    {
        var falha = ObterFalha(Cadastrar(
            1,
            1,
            ["p1"],
            dataVenda: new DateOnly(2027, 2, 16),
            referencia: new DateOnly(2027, 2, 15)));

        Assert.AreEqual("data-invalida", falha.Erro.Codigo);
        Assert.AreEqual("dataVenda", falha.Erro.Campo);
    }

    [TestMethod]
    public void Cadastrar_RejeitaIdentificadoresVazios()
    {
        var falhaIdVenda = ObterFalha(Cadastrar(1, 1, ["p1"], id: ""));
        var falhaIdParcela = ObterFalha(Cadastrar(1, 1, [""]));

        Assert.AreEqual("identificador-invalido", falhaIdVenda.Erro.Codigo);
        Assert.AreEqual("identificador-invalido", falhaIdParcela.Erro.Codigo);
    }

    [TestMethod]
    public void Cadastrar_RejeitaIdentificadoresDuplicadosNoAgregado()
    {
        var idParcelaDuplicado = ObterFalha(Cadastrar(2, 2, ["p1", "p1"]));
        var idVendaDuplicado = ObterFalha(Cadastrar(1, 1, ["venda-1"]));

        Assert.AreEqual("identificador-duplicado", idParcelaDuplicado.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Conflito, idParcelaDuplicado.Erro.Categoria);
        Assert.AreEqual("identificador-duplicado", idVendaDuplicado.Erro.Codigo);
    }

    [TestMethod]
    public void Cadastrar_CopiaIdsDeEntradaEProtegeColecoesDeSaida()
    {
        var ids = new[] { "parcela-original" };
        var venda = ObterSucesso(Cadastrar(1, 1, ids));

        ids[0] = "parcela-alterada";

        Assert.AreEqual("parcela-original", venda.Parcelas[0].Id);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ParcelaVenda>)venda.Parcelas)[0] = venda.Parcelas[0]);
    }

    private static ResultadoDominio<Venda> Cadastrar(
        long total,
        int quantidade,
        IReadOnlyList<string> ids,
        DateOnly? dataVenda = null,
        DateOnly? referencia = null,
        string id = "venda-1") =>
        Venda.Cadastrar(
            id,
            ClienteValido(),
            dataVenda ?? new DateOnly(2027, 1, 15),
            ObterSucesso(Dinheiro.Criar(total)),
            quantidade,
            ids,
            referencia ?? new DateOnly(2027, 1, 15));

    private static DadosClienteVenda ClienteValido() => ObterSucesso(DadosClienteVenda.Criar(
        "Cliente Sintético",
        "12345678909",
        "1198765432",
        null));

    private static Venda ObterSucesso(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(resultado).Valor;

    private static Dinheiro ObterSucesso(ResultadoDominio<Dinheiro> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(resultado).Valor;

    private static DadosClienteVenda ObterSucesso(ResultadoDominio<DadosClienteVenda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<Venda>.Falha ObterFalha(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Falha>(resultado);
}
