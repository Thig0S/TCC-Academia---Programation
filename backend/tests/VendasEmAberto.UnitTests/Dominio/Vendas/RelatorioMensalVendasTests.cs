using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class RelatorioMensalVendasTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 20);

    [TestMethod]
    public void GerarRelatorioMensal_AceitaMesPadraoSelecionadoVazioEBordasDoCalendario()
    {
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([]));
        var padrao = GerarRelatorio(conjunto, Referencia);
        var selecionadoVazio = GerarRelatorio(conjunto, Referencia, new DateOnly(2028, 6, 15));

        Assert.AreEqual(new DateOnly(2027, 3, 1), padrao.InicioMes);
        Assert.AreEqual(new DateOnly(2027, 3, 31), padrao.FimMes);
        Assert.AreEqual(31, padrao.RecebimentosDiarios.Count);
        Assert.AreEqual(new DateOnly(2028, 6, 1), selecionadoVazio.InicioMes);
        Assert.AreEqual(new DateOnly(2028, 6, 30), selecionadoVazio.FimMes);
        Assert.AreEqual(0, selecionadoVazio.TotalRecebido.Centavos);
        Assert.AreEqual(0, selecionadoVazio.QuantidadeVendasMes);
        Assert.AreEqual(0, selecionadoVazio.TotalVendasMes.Centavos);
        Assert.AreEqual(0, selecionadoVazio.TotalEmAberto.Centavos);
        Assert.AreEqual(0, selecionadoVazio.TotalAtrasado.Centavos);
        Assert.AreEqual(0, selecionadoVazio.TotalPrejuizo.Centavos);
        Assert.AreEqual(30, selecionadoVazio.RecebimentosDiarios.Count);
        Assert.IsTrue(selecionadoVazio.RecebimentosDiarios.All(item => item.Total.Centavos == 0));

        var mesesDeBorda = new[]
        {
            (new DateOnly(2024, 2, 29), new DateOnly(2024, 2, 1), new DateOnly(2024, 2, 29), 29),
            (new DateOnly(2023, 2, 28), new DateOnly(2023, 2, 1), new DateOnly(2023, 2, 28), 28),
            (new DateOnly(2027, 12, 31), new DateOnly(2027, 12, 1), new DateOnly(2027, 12, 31), 31),
            (new DateOnly(2028, 1, 31), new DateOnly(2028, 1, 1), new DateOnly(2028, 1, 31), 31),
            (DateOnly.MinValue, new DateOnly(1, 1, 1), new DateOnly(1, 1, 31), 31),
            (DateOnly.MaxValue, new DateOnly(9999, 12, 1), new DateOnly(9999, 12, 31), 31)
        };

        foreach (var (mes, inicio, fim, quantidadeDias) in mesesDeBorda)
        {
            var relatorio = GerarRelatorio(conjunto, mes, mes);

            Assert.AreEqual(inicio, relatorio.InicioMes);
            Assert.AreEqual(fim, relatorio.FimMes);
            Assert.AreEqual(quantidadeDias, relatorio.RecebimentosDiarios.Count);
            Assert.AreEqual(inicio, relatorio.RecebimentosDiarios[0].Data);
            Assert.AreEqual(fim, relatorio.RecebimentosDiarios[^1].Data);
            Assert.IsTrue(relatorio.RecebimentosDiarios.All(item => item.Total.Centavos == 0));
        }
    }

    [TestMethod]
    public void GerarRelatorioMensal_ContaEntradaELoteUmaVezESerieDiariaReconcilia()
    {
        var venda = CriarVendaSinteticaComEntradaELote();
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([venda]));

        var relatorio = GerarRelatorio(conjunto, new DateOnly(2027, 3, 31));

        Assert.AreEqual(2, relatorio.Recebimentos.Count);
        Assert.AreEqual(OrigemRecebimento.Entrada, relatorio.Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, relatorio.Recebimentos[1].Origem);
        Assert.AreEqual(20_000, relatorio.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(40_000, relatorio.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(60_000, relatorio.TotalRecebido.Centavos);
        Assert.AreEqual(60_000, relatorio.RecebimentosDiarios.Sum(item => item.Total.Centavos));
        Assert.AreEqual(20_000, relatorio.RecebimentosDiarios[0].Total.Centavos);
        Assert.AreEqual(40_000, relatorio.RecebimentosDiarios[30].Total.Centavos);
        Assert.AreEqual(1, relatorio.VendasDoMes.Count);
        Assert.AreEqual(200_000, relatorio.VendasDoMes[0].ValorTotalBase.Centavos);
        Assert.AreEqual(140_000, relatorio.TotalEmAberto.Centavos);
    }

    [TestMethod]
    public void GerarRelatorioMensal_MantemMovimentosDeTodosOsStatusEPrejuizoSeparado()
    {
        var vendaAtiva = ObterSucesso(CriarVenda("relatorio-ativa", 20_000, 2, new DateOnly(2027, 3, 5))
            .RegistrarPagamento(
                "recebimento-ativo",
                "relatorio-ativa-parcela-1",
                DinheiroValido(11_000),
                new DateOnly(2027, 3, 10),
                FormaPagamento.Pix,
                Referencia));
        var vendaInativa = ObterSucesso(ObterSucesso(CriarVenda("relatorio-inativa", 10_000, 1, new DateOnly(2027, 3, 6))
                .RegistrarPagamento(
                    "recebimento-inativo",
                    "relatorio-inativa-parcela-1",
                    DinheiroValido(10_000),
                    new DateOnly(2027, 3, 11),
                    FormaPagamento.Dinheiro,
                    Referencia))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoComPagamento = ObterSucesso(ObterSucesso(CriarVenda(
                    "relatorio-prejuizo-com-pagamento",
                    20_000,
                    2,
                    new DateOnly(2027, 3, 7))
                .RegistrarPagamento(
                    "recebimento-prejuizo",
                    "relatorio-prejuizo-com-pagamento-parcela-1",
                    DinheiroValido(10_000),
                    new DateOnly(2027, 3, 12),
                    FormaPagamento.CartaoCredito,
                    Referencia))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var dataEntradaPrejuizo = new DateOnly(2027, 3, 9);
        var vendaPrejuizoComEntrada = ObterSucesso(Venda.Cadastrar(
                "relatorio-prejuizo-com-entrada",
                ClienteValido(),
                dataEntradaPrejuizo,
                DinheiroValido(20_000),
                2,
                ["relatorio-prejuizo-com-entrada-parcela-1", "relatorio-prejuizo-com-entrada-parcela-2"],
                Referencia,
                new DadosEntradaVenda(
                    "recebimento-entrada-prejuizo",
                    DinheiroValido(10_000),
                    dataEntradaPrejuizo,
                    FormaPagamento.Pix)));
        var prejuizoComEntrada = ObterSucesso(
            vendaPrejuizoComEntrada.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoSemPagamento = ObterSucesso(
            CriarVenda("relatorio-prejuizo-sem-pagamento", 10_000, 1, new DateOnly(2027, 3, 8))
                .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var conjunto = ObterSucesso(ConjuntoVendas.Criar(
            [vendaAtiva, vendaInativa, prejuizoComPagamento, prejuizoComEntrada, prejuizoSemPagamento]));

        var relatorio = GerarRelatorio(conjunto, Referencia);

        CollectionAssert.AreEqual(
            new[]
            {
                "recebimento-ativo",
                "recebimento-inativo",
                "recebimento-prejuizo",
                "recebimento-entrada-prejuizo"
            },
            relatorio.Recebimentos.Select(item => item.Id).ToArray());
        Assert.AreEqual(41_000, relatorio.TotalRecebido.Centavos);
        Assert.AreEqual(41_000, relatorio.RecebimentosDiarios.Sum(item => item.Total.Centavos));
        Assert.AreEqual(1, relatorio.QuantidadeVendasMes);
        CollectionAssert.AreEqual(new[] { "relatorio-ativa" }, relatorio.VendasDoMes.Select(item => item.Id).ToArray());
        Assert.AreEqual(21_000, relatorio.TotalVendasMes.Centavos);
        Assert.AreEqual(10_000, relatorio.TotalEmAberto.Centavos);
        Assert.AreEqual(0, relatorio.TotalAtrasado.Centavos);
        CollectionAssert.AreEqual(
            new[]
            {
                ("relatorio-prejuizo-com-pagamento", false),
                ("relatorio-prejuizo-com-entrada", false),
                ("relatorio-prejuizo-sem-pagamento", true)
            },
            relatorio.ParcelasPrejuizo.Select(item => (item.Venda.Id, item.IncluirNoTotal)).ToArray());
        Assert.AreEqual(10_000, relatorio.TotalPrejuizo.Centavos);
        Assert.AreEqual(5, conjunto.Vendas.Count);
        Assert.AreEqual(1, vendaAtiva.Recebimentos.Count);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<RecebimentoDiarioRelatorio>)relatorio.RecebimentosDiarios)[0] = relatorio.RecebimentosDiarios[0]);
    }

    [TestMethod]
    public void GerarRelatorioMensal_CorrecaoMoveRecebimentoEntreMesesSemAlterarPosicao()
    {
        var referencia = new DateOnly(2027, 4, 30);
        var vendaOriginal = ObterSucesso(CriarVenda("relatorio-correcao", 20_000, 2, new DateOnly(2027, 1, 15))
            .RegistrarPagamento(
                "recebimento-estavel",
                "relatorio-correcao-parcela-1",
                DinheiroValido(11_000),
                new DateOnly(2027, 3, 31),
                FormaPagamento.Pix,
                referencia));
        var conjuntoOriginal = ObterSucesso(ConjuntoVendas.Criar([vendaOriginal]));
        var originalMarco = GerarRelatorio(conjuntoOriginal, referencia, new DateOnly(2027, 3, 15));
        var vendaCorrigida = ObterSucesso(vendaOriginal.CorrigirPagamento(
            "recebimento-estavel",
            DinheiroValido(11_000),
            new DateOnly(2027, 4, 1),
            FormaPagamento.Pix,
            referencia,
            [vendaOriginal]));
        var conjuntoCorrigido = ObterSucesso(conjuntoOriginal.AceitarCandidato([vendaCorrigida]));
        var corrigidaMarco = GerarRelatorio(conjuntoCorrigido, referencia, new DateOnly(2027, 3, 1));
        var corrigidaAbril = GerarRelatorio(conjuntoCorrigido, referencia, new DateOnly(2027, 4, 30));

        Assert.AreEqual(11_000, originalMarco.TotalRecebido.Centavos);
        Assert.AreEqual(0, corrigidaMarco.TotalRecebido.Centavos);
        Assert.AreEqual(11_000, corrigidaAbril.TotalRecebido.Centavos);
        Assert.AreEqual("recebimento-estavel", corrigidaAbril.Recebimentos.Single().Id);
        Assert.AreEqual(new DateOnly(2027, 4, 1), corrigidaAbril.Recebimentos.Single().Data);
        Assert.AreEqual(referencia, corrigidaMarco.Referencia);
        Assert.AreEqual(referencia, corrigidaAbril.Referencia);
        Assert.AreEqual(corrigidaMarco.TotalEmAberto.Centavos, corrigidaAbril.TotalEmAberto.Centavos);
        Assert.AreEqual(corrigidaMarco.TotalAtrasado.Centavos, corrigidaAbril.TotalAtrasado.Centavos);
        Assert.AreEqual(corrigidaMarco.TotalPrejuizo.Centavos, corrigidaAbril.TotalPrejuizo.Centavos);
        CollectionAssert.AreEqual(
            corrigidaMarco.Saldos.Select(item => (item.Venda.Id, item.Saldo.Centavos, item.PrimeiroVencimentoPendente)).ToArray(),
            corrigidaAbril.Saldos.Select(item => (item.Venda.Id, item.Saldo.Centavos, item.PrimeiroVencimentoPendente)).ToArray());
        CollectionAssert.AreEqual(
            corrigidaMarco.ParcelasAtrasadas.Select(item => (item.Venda.Id, item.Parcela.Id)).ToArray(),
            corrigidaAbril.ParcelasAtrasadas.Select(item => (item.Venda.Id, item.Parcela.Id)).ToArray());
        Assert.AreEqual(originalMarco.TotalEmAberto.Centavos, corrigidaAbril.TotalEmAberto.Centavos);
        Assert.AreEqual(originalMarco.TotalAtrasado.Centavos, corrigidaAbril.TotalAtrasado.Centavos);
        CollectionAssert.AreEqual(
            originalMarco.Saldos.Select(item => (item.Venda.Id, item.Saldo.Centavos, item.PrimeiroVencimentoPendente)).ToArray(),
            corrigidaAbril.Saldos.Select(item => (item.Venda.Id, item.Saldo.Centavos, item.PrimeiroVencimentoPendente)).ToArray());
        Assert.AreEqual(new DateOnly(2027, 3, 31), vendaOriginal.Recebimentos.Single().Data);
    }

    [TestMethod]
    public void GerarRelatorioMensal_OrdenaPosicoesEstavelmentePorVencimento()
    {
        var vendaZ = CriarVenda("venda-z", 20_000, 2, new DateOnly(2027, 1, 15));
        var vendaA = CriarVenda("venda-a", 20_000, 2, new DateOnly(2027, 1, 15));
        var conjunto = ObterSucesso(ConjuntoVendas.Criar([vendaZ, vendaA]));

        var relatorio = GerarRelatorio(conjunto, new DateOnly(2027, 4, 1), new DateOnly(2027, 6, 1));

        CollectionAssert.AreEqual(
            new[] { "venda-z", "venda-a" },
            relatorio.Saldos.Select(item => item.Venda.Id).ToArray());
        CollectionAssert.AreEqual(
            new[]
            {
                ("venda-z", "venda-z-parcela-1"),
                ("venda-a", "venda-a-parcela-1"),
                ("venda-z", "venda-z-parcela-2"),
                ("venda-a", "venda-a-parcela-2")
            },
            relatorio.ParcelasAtrasadas.Select(item => (item.Venda.Id, item.Parcela.Id)).ToArray());
        Assert.AreEqual(0, relatorio.TotalRecebido.Centavos);
        Assert.AreEqual(30, relatorio.RecebimentosDiarios.Count);
    }

    private static Venda CriarVenda(string id, long total, int quantidadeParcelas, DateOnly dataVenda) =>
        ObterSucesso(Venda.Cadastrar(
            id,
            ClienteValido(),
            dataVenda,
            DinheiroValido(total),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(numero => $"{id}-parcela-{numero}").ToArray(),
            Referencia));

    private static Venda CriarVendaSinteticaComEntradaELote()
    {
        var dataVenda = new DateOnly(2027, 3, 1);
        var parcelas = Enumerable.Range(1, 10)
            .Select(numero => new DadosReconstrucaoParcela(
                $"relatorio-parcela-{numero}",
                numero,
                DinheiroValido(20_000),
                numero == 1 ? dataVenda : dataVenda.AddMonths(numero - 1)))
            .ToArray();
        var recebimentos = new[]
        {
            new DadosReconstrucaoRecebimento(
                "relatorio-entrada",
                dataVenda,
                FormaPagamento.Pix,
                DinheiroValido(20_000),
                OrigemRecebimento.Entrada,
                default,
                null,
                [new("relatorio-parcela-1", DinheiroValido(20_000))]),
            new DadosReconstrucaoRecebimento(
                "relatorio-lote",
                new DateOnly(2027, 3, 31),
                FormaPagamento.Dinheiro,
                DinheiroValido(40_000),
                OrigemRecebimento.HistoricoLote,
                default,
                null,
                [
                    new("relatorio-parcela-2", DinheiroValido(20_000)),
                    new("relatorio-parcela-3", DinheiroValido(20_000))
                ])
        };
        var dados = new DadosReconstrucaoVenda(
            "venda-relatorio-historica",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            dataVenda,
            DinheiroValido(200_000),
            parcelas,
            recebimentos);

        return ObterSucesso(Venda.Reconstruir(dados, new DateOnly(2027, 3, 31)));
    }

    private static RelatorioMensalVendas GerarRelatorio(
        ConjuntoVendas conjunto,
        DateOnly referencia,
        DateOnly? mesSelecionado = null) =>
        ObterSucesso(conjunto.GerarRelatorioMensal(referencia, mesSelecionado));

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static T ObterSucesso<T>(ResultadoDominio<T> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<T>.Sucesso>(resultado).Valor;
}
