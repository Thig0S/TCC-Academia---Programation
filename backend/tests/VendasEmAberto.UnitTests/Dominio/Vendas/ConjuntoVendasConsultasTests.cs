using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class ConjuntoVendasConsultasTests
{
    private static readonly DateOnly ReferenciaCriacao = new(2027, 3, 31);
    private static readonly DateOnly ReferenciaProjecao = new(2027, 3, 16);

    [TestMethod]
    public void Projetar_EConsultarPeriodo_ConjuntoVazioRetornaColecoesEResumosZerados()
    {
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([]));

        var projecao = ObterSucesso(conjunto.Projetar(ReferenciaProjecao));
        var periodo = ObterSucesso(conjunto.ConsultarPeriodo(
            new DateOnly(2027, 3, 1),
            new DateOnly(2027, 3, 31)));

        Assert.AreEqual(0, projecao.Vendas.Count);
        Assert.AreEqual(0, projecao.Abertas.Count);
        Assert.AreEqual(0, projecao.Quitadas.Count);
        Assert.AreEqual(0, projecao.Inativas.Count);
        Assert.AreEqual(0, projecao.Prejuizos.Count);
        Assert.AreEqual(0, projecao.TotalEmAberto.Centavos);
        Assert.AreEqual(0, projecao.ValoresEmAtraso.Centavos);
        Assert.AreEqual(0, projecao.RecebidoNoMes.Centavos);
        Assert.AreEqual(0, projecao.VendasCadastradas);
        Assert.AreEqual(0, periodo.Recebidos.Centavos);
        Assert.AreEqual(0, periodo.Vendas.Count);
    }

    [TestMethod]
    public void ConsultarPeriodo_RejeitaIntervaloInvertidoSemMutarConjunto()
    {
        var venda = CriarVenda("venda-periodo-invertido", 10_000, 1, new DateOnly(2027, 1, 1));
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([venda]));

        var resultado = conjunto.ConsultarPeriodo(new DateOnly(2027, 3, 2), new DateOnly(2027, 3, 1));
        var falha = Assert.IsInstanceOfType<ResultadoDominio<ConsultaPeriodoVendas>.Falha>(resultado).Erro;

        Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Categoria);
        Assert.AreEqual("periodo-invalido", falha.Codigo);
        Assert.AreEqual("periodo", falha.Campo);
        Assert.AreEqual(1, conjunto.Vendas.Count);
        Assert.AreSame(venda, conjunto.Vendas[0]);
    }

    [TestMethod]
    public void ConsultarPeriodo_IncluiBordasCivisERecebimentosDeTodosOsStatus()
    {
        var anterior = ObterSucesso(RegistrarPagamento(
            CriarVenda("venda-antes", 10_000, 1, new DateOnly(2027, 1, 31)),
            "recebimento-antes",
            new DateOnly(2027, 1, 31)));
        var inicio = ObterSucesso(RegistrarPagamento(
            CriarVenda("venda-inicio", 10_000, 1, new DateOnly(2027, 2, 1)),
            "recebimento-inicio",
            new DateOnly(2027, 2, 1)));
        var fim = ObterSucesso(ObterSucesso(RegistrarPagamento(
                CriarVenda("venda-fim", 10_000, 1, new DateOnly(2027, 2, 28)),
                "recebimento-fim",
                new DateOnly(2027, 2, 28)))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var depois = ObterSucesso(RegistrarPagamento(
            CriarVenda("venda-depois", 10_000, 1, new DateOnly(2027, 1, 31)),
            "recebimento-depois",
            new DateOnly(2027, 3, 1)));
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([anterior, inicio, fim, depois]));

        var periodo = ObterSucesso(conjunto.ConsultarPeriodo(
            new DateOnly(2027, 2, 1),
            new DateOnly(2027, 2, 28)));

        Assert.AreEqual(20_000, periodo.Recebidos.Centavos);
        CollectionAssert.AreEqual(
            new[] { "venda-inicio", "venda-fim" },
            periodo.Vendas.Select(venda => venda.Id).ToArray());
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, periodo.Vendas[1].StatusAdministrativo);
        Assert.AreEqual(new DateOnly(2027, 2, 1), periodo.Inicio);
        Assert.AreEqual(new DateOnly(2027, 2, 28), periodo.Fim);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<Venda>)periodo.Vendas)[0] = anterior);
    }

    [TestMethod]
    public void Projetar_SeparaStatusEMantemTotaisOperacionaisSomenteNasAtivas()
    {
        var ativaAberta = ObterSucesso(RegistrarPagamento(
            CriarVenda("ativa-aberta", 30_000, 3, new DateOnly(2027, 1, 15)),
            "recebimento-ativa-aberta",
            new DateOnly(2027, 3, 10)));
        var ativaQuitada = ObterSucesso(RegistrarPagamento(
            CriarVenda("ativa-quitada", 10_000, 1, new DateOnly(2027, 2, 28)),
            "recebimento-ativa-quitada",
            new DateOnly(2027, 3, 10)));
        var inativaAberta = ObterSucesso(ObterSucesso(RegistrarPagamento(
                CriarVenda("inativa-aberta", 20_000, 2, new DateOnly(2027, 1, 1)),
                "recebimento-inativo",
                new DateOnly(2027, 3, 10)))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoAberto = ObterSucesso(ObterSucesso(RegistrarPagamento(
                CriarVenda("prejuizo-aberto", 20_000, 2, new DateOnly(2027, 1, 1)),
                "recebimento-prejuizo",
                new DateOnly(2027, 3, 10)))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([ativaAberta, ativaQuitada, inativaAberta, prejuizoAberto]));

        var projecao = ObterSucesso(conjunto.Projetar(ReferenciaProjecao));
        var segundaConsulta = ObterSucesso(conjunto.Projetar(ReferenciaProjecao));

        CollectionAssert.AreEqual(new[] { "ativa-aberta" }, projecao.Abertas.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "ativa-quitada" }, projecao.Quitadas.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "inativa-aberta" }, projecao.Inativas.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "prejuizo-aberto" }, projecao.Prejuizos.Select(venda => venda.Id).ToArray());
        Assert.AreEqual(20_000, projecao.TotalEmAberto.Centavos);
        Assert.AreEqual(10_000, projecao.ValoresEmAtraso.Centavos);
        Assert.AreEqual(40_000, projecao.RecebidoNoMes.Centavos);
        Assert.AreEqual(2, projecao.VendasCadastradas);
        Assert.AreEqual(40_000, segundaConsulta.RecebidoNoMes.Centavos);
        Assert.AreEqual(10_000, ObterSucesso(ativaAberta.Projetar(ReferenciaProjecao)).TotalRecebido.Centavos);
        Assert.AreEqual(4, conjunto.Vendas.Count);
        Assert.AreEqual(1, ativaAberta.Recebimentos.Count);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ProjecaoVenda>)projecao.Vendas)[0] = projecao.Vendas[1]);
    }

    [TestMethod]
    public void Projetar_ReativacaoMoveCadaVendaParaColecaoAtivaCorrespondenteSemMutarOrigem()
    {
        var inativaQuitada = ObterSucesso(RegistrarPagamento(
                CriarVenda("reativada-quitada", 10_000, 1, new DateOnly(2027, 1, 1)),
                "recebimento-reativada-quitada",
                new DateOnly(2027, 1, 2)))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo);
        var prejuizoAberto = CriarVenda("reativada-aberta", 20_000, 2, new DateOnly(2027, 1, 1));
        var prejuizo = ObterSucesso(prejuizoAberto.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var conjuntoAnterior = ObterSucesso(ConjuntoVendas.Criar([ObterSucesso(inativaQuitada), prejuizo]));
        var candidatas = conjuntoAnterior.Vendas.Select(venda =>
            ObterSucesso(venda.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo))).ToArray();
        var reativado = ObterSucesso(conjuntoAnterior.AceitarCandidato(candidatas));

        var antes = ObterSucesso(conjuntoAnterior.Projetar(ReferenciaProjecao));
        var depois = ObterSucesso(reativado.Projetar(ReferenciaProjecao));

        CollectionAssert.AreEqual(new[] { "reativada-quitada" }, antes.Inativas.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "reativada-aberta" }, antes.Prejuizos.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "reativada-aberta" }, depois.Abertas.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "reativada-quitada" }, depois.Quitadas.Select(venda => venda.Id).ToArray());
        Assert.AreEqual(0, depois.Inativas.Count);
        Assert.AreEqual(0, depois.Prejuizos.Count);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, conjuntoAnterior.Vendas[0].StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, conjuntoAnterior.Vendas[1].StatusAdministrativo);
        Assert.AreEqual(1, conjuntoAnterior.Vendas[0].Recebimentos.Count);
        Assert.AreEqual(0, conjuntoAnterior.Vendas[1].Recebimentos.Count);
    }

    private static Venda CriarVenda(string id, long total, int parcelas, DateOnly dataVenda) =>
        ObterSucesso(Venda.Cadastrar(
            id,
            ClienteValido(),
            dataVenda,
            DinheiroValido(total),
            parcelas,
            Enumerable.Range(1, parcelas).Select(numero => $"{id}-parcela-{numero}").ToArray(),
            ReferenciaCriacao));

    private static ResultadoDominio<Venda> RegistrarPagamento(
        Venda venda,
        string recebimentoId,
        DateOnly data) =>
        venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValido(venda.Parcelas[0].ValorBase.Centavos),
            data,
            FormaPagamento.Pix,
            ReferenciaCriacao);

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static T ObterSucesso<T>(ResultadoDominio<T> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<T>.Sucesso>(resultado).Valor;
}
