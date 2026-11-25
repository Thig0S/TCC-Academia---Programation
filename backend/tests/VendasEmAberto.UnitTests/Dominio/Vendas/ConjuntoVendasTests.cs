using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class ConjuntoVendasTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 2, 28);

    [TestMethod]
    public void Criar_RejeitaColisoesGlobaisEntreTiposEAgregados()
    {
        AssertConflitoGlobal(CriarVenda("venda-id-repetido", 10_000), CriarVenda("venda-id-repetido", 20_000));
        AssertConflitoGlobal(
            CriarVenda("venda-parcela-a", 10_000, "parcela-id-repetido"),
            CriarVenda("venda-parcela-b", 10_000, "parcela-id-repetido"));

        var idVendaColidido = CriarVenda("id-colidido", 10_000, "parcela-a");
        var parcelaColidida = CriarVenda("venda-b", 10_000, "id-colidido");
        AssertConflitoGlobal(idVendaColidido, parcelaColidida);

        var vendaComParcela = CriarVenda("venda-parcela", 10_000, "id-parcela-reutilizado");
        var vendaComRecebimento = RegistrarPagamento(
            CriarVenda("venda-recebimento", 10_000, "parcela-recebimento"),
            "id-parcela-reutilizado",
            10_000);
        AssertConflitoGlobal(vendaComParcela, vendaComRecebimento);

        var vendaComRecebimentoIgualAoIdDeVenda = RegistrarPagamento(
            CriarVenda("venda-com-pagamento", 10_000),
            "id-de-outra-venda",
            10_000);
        var vendaComIdColidido = CriarVenda("id-de-outra-venda", 10_000);
        AssertConflitoGlobal(vendaComRecebimentoIgualAoIdDeVenda, vendaComIdColidido);

        var recebimentoA = RegistrarPagamento(CriarVenda("venda-a", 10_000), "recebimento-reutilizado", 10_000);
        var recebimentoB = RegistrarPagamento(CriarVenda("venda-b", 10_000), "recebimento-reutilizado", 10_000);
        AssertConflitoGlobal(recebimentoA, recebimentoB);
    }

    [TestMethod]
    public void Criar_RejeitaSomaInseguraMesmoEmVendasNaoOperacionais()
    {
        var vendaNoLimite = CriarVenda("venda-no-limite", Dinheiro.LimiteCentavos);

        foreach (var statusOculto in new[]
        {
            StatusAdministrativoVenda.Inativo,
            StatusAdministrativoVenda.Prejuizo
        })
        {
            var vendaOculta = ObterSucesso(
                CriarVenda($"venda-oculta-{statusOculto}", 1)
                    .AlterarStatusAdministrativo(statusOculto));

            var falha = ObterFalha(ConjuntoVendas.Criar([vendaNoLimite, vendaOculta]));

            Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Categoria);
            Assert.AreEqual("limite-financeiro-excedido", falha.Codigo);
            Assert.AreEqual("vendas", falha.Campo);
        }
    }

    [TestMethod]
    public void AceitarCandidato_RejeitaCadastroGlobalmenteInvalidoSemAlterarConjuntoAnterior()
    {
        var vendaExistente = CriarVenda("venda-cadastrada-no-limite", Dinheiro.LimiteCentavos);
        var conjuntoAnterior = ObterSucesso(ConjuntoVendas.Criar([vendaExistente]));
        var novaVendaLocalmenteValida = CriarVenda("venda-cadastro-extra", 1);

        var resultado = conjuntoAnterior.AceitarCandidato([vendaExistente, novaVendaLocalmenteValida]);

        var falha = ObterFalha(resultado);
        Assert.AreEqual("limite-financeiro-excedido", falha.Codigo);
        Assert.AreEqual(1, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaExistente, conjuntoAnterior.Vendas[0]);
        Assert.IsInstanceOfType<ResultadoDominio<ConjuntoVendas>.Falha>(resultado);
    }

    [TestMethod]
    public void AceitarCandidato_RejeitaBaixaLocalmenteValidaQueExcedeSomaGlobal()
    {
        var (conjuntoAnterior, vendaMenor) = CriarConjuntoComBasesSomandoLimite(out _);
        var vendaComBaixa = RegistrarPagamento(vendaMenor, "recebimento-com-acrescimo", 10_001);

        var resultado = conjuntoAnterior.AceitarCandidato(
            conjuntoAnterior.Vendas.Select(venda => venda.Id == vendaMenor.Id ? vendaComBaixa : venda));

        var falha = ObterFalha(resultado);
        Assert.AreEqual("limite-financeiro-excedido", falha.Codigo);
        Assert.AreEqual(2, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaMenor, conjuntoAnterior.Vendas.Single(venda => venda.Id == vendaMenor.Id));
        Assert.AreEqual(0, vendaMenor.Recebimentos.Count);
        Assert.AreEqual(10_001, vendaComBaixa.Recebimentos.Single().Valor.Centavos);
    }

    [TestMethod]
    public void AceitarCandidato_RejeitaCorrecaoLocalmenteValidaQueExcedeSomaGlobal()
    {
        var (conjuntoAnterior, vendaMenor) = CriarConjuntoComPagamentoNaBase();
        var vendaCorrigida = ObterSucesso(vendaMenor.CorrigirPagamento(
            "recebimento-na-base",
            DinheiroValido(10_001),
            DataVenda,
            FormaPagamento.Pix,
            Referencia,
            [vendaMenor]));

        var resultado = conjuntoAnterior.AceitarCandidato(
            conjuntoAnterior.Vendas.Select(venda => venda.Id == vendaMenor.Id ? vendaCorrigida : venda));

        var falha = ObterFalha(resultado);
        Assert.AreEqual("limite-financeiro-excedido", falha.Codigo);
        Assert.AreEqual(2, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaMenor, conjuntoAnterior.Vendas.Single(venda => venda.Id == vendaMenor.Id));
        Assert.AreEqual(10_000, vendaMenor.Recebimentos.Single().Valor.Centavos);
        Assert.AreEqual(10_001, vendaCorrigida.Recebimentos.Single().Valor.Centavos);
    }

    [TestMethod]
    public void AceitarCandidato_CopiaColecaoEPreparacaoDescartadaNaoPublicaEstado()
    {
        var vendaInicial = CriarVenda("venda-inicial", 10_000);
        var conjuntoAnterior = ObterSucesso(ConjuntoVendas.Criar([vendaInicial]));
        var vendaCandidata = CriarVenda("venda-candidata", 20_000);
        var candidatas = new List<Venda> { vendaInicial, vendaCandidata };

        var aceito = ObterSucesso(conjuntoAnterior.AceitarCandidato(candidatas));
        candidatas[1] = CriarVenda("substituta-externa", 30_000);
        _ = conjuntoAnterior.AceitarCandidato([vendaInicial, CriarVenda("preparacao-descartada", 5_000)]);

        Assert.AreEqual("venda-candidata", aceito.Vendas[1].Id);
        Assert.AreEqual(1, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaInicial, conjuntoAnterior.Vendas[0]);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<Venda>)aceito.Vendas)[0] = vendaCandidata);
    }

    [TestMethod]
    public void AceitarCandidato_PropagaFalhaTecnicaSemClassificaLaComoRegraDeDominio()
    {
        var vendaInicial = CriarVenda("venda-antes-da-falha-tecnica", 10_000);
        var conjuntoAnterior = ObterSucesso(ConjuntoVendas.Criar([vendaInicial]));

        var excecao = Assert.ThrowsExactly<InvalidOperationException>(() =>
            conjuntoAnterior.AceitarCandidato(EnumerarComFalhaTecnica(vendaInicial)));

        Assert.AreEqual("falha técnica durante a enumeração", excecao.Message);
        Assert.AreEqual(1, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaInicial, conjuntoAnterior.Vendas[0]);
    }

    private static void AssertConflitoGlobal(params Venda[] vendas)
    {
        var falha = ObterFalha(ConjuntoVendas.Criar(vendas));

        Assert.AreEqual(CategoriaErroDominio.Conflito, falha.Categoria);
        Assert.AreEqual("identificador-duplicado", falha.Codigo);
    }

    private static (ConjuntoVendas Conjunto, Venda VendaMenor) CriarConjuntoComBasesSomandoLimite(
        out Venda vendaMenor)
    {
        var vendaMaior = CriarVenda("venda-maior", Dinheiro.LimiteCentavos - 10_000);
        vendaMenor = CriarVenda("venda-menor", 10_000);
        return (ObterSucesso(ConjuntoVendas.Criar([vendaMaior, vendaMenor])), vendaMenor);
    }

    private static (ConjuntoVendas Conjunto, Venda VendaMenor) CriarConjuntoComPagamentoNaBase()
    {
        var (conjuntoSemPagamento, vendaMenor) = CriarConjuntoComBasesSomandoLimite(out _);
        var vendaPagaNaBase = RegistrarPagamento(vendaMenor, "recebimento-na-base", 10_000);
        var conjunto = ObterSucesso(conjuntoSemPagamento.AceitarCandidato(
            conjuntoSemPagamento.Vendas.Select(venda => venda.Id == vendaMenor.Id ? vendaPagaNaBase : venda)));

        return (conjunto, vendaPagaNaBase);
    }

    private static Venda CriarVenda(string id, long valorTotal, string? parcelaId = null) =>
        ObterSucesso(Venda.Cadastrar(
            id,
            ClienteValido(),
            DataVenda,
            DinheiroValido(valorTotal),
            1,
            [parcelaId ?? $"{id}-parcela-1"],
            Referencia));

    private static Venda RegistrarPagamento(Venda venda, string recebimentoId, long valorCentavos) =>
        ObterSucesso(venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValido(valorCentavos),
            DataVenda,
            FormaPagamento.Pix,
            Referencia));

    private static IEnumerable<Venda> EnumerarComFalhaTecnica(Venda venda)
    {
        yield return venda;
        throw new InvalidOperationException("falha técnica durante a enumeração");
    }

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static T ObterSucesso<T>(ResultadoDominio<T> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<T>.Sucesso>(resultado).Valor;

    private static ErroDominio ObterFalha<T>(ResultadoDominio<T> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<T>.Falha>(resultado).Erro;
}
