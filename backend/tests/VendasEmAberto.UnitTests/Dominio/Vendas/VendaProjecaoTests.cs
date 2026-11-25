using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaProjecaoTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 2, 28);

    [TestMethod]
    public void Projetar_ReconciliaBaseAcrescimoEfetivoRecebidoSaldoEProximoVencimento()
    {
        var original = CriarVenda("venda-projecao", 20_000, 2);
        var comPagamento = ObterSucesso(original.RegistrarPagamento(
            "recebimento-projecao",
            "venda-projecao-parcela-1",
            DinheiroValido(11_000),
            new DateOnly(2027, 1, 20),
            FormaPagamento.Pix,
            Referencia,
            "pagamento parcial"));

        var projecao = ObterSucesso(comPagamento.Projetar(new DateOnly(2027, 3, 8)));

        Assert.AreEqual("venda-projecao", projecao.Id);
        Assert.AreEqual(20_000, projecao.ValorTotalBase.Centavos);
        Assert.AreEqual(1_000, projecao.TotalAcrescimos.Centavos);
        Assert.AreEqual(21_000, projecao.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(11_000, projecao.TotalRecebido.Centavos);
        Assert.AreEqual(10_000, projecao.Saldo.Centavos);
        Assert.AreEqual(1, projecao.QuantidadePaga);
        Assert.AreEqual(2, projecao.QuantidadeParcelas);
        Assert.AreEqual(new DateOnly(2027, 3, 15), projecao.ProximoVencimento);
        Assert.AreEqual(SituacaoVendaProjetada.ProximosDias, projecao.Situacao);

        var parcelaPaga = projecao.Parcelas[0];
        Assert.AreEqual(10_000, parcelaPaga.ValorBase.Centavos);
        Assert.AreEqual(1_000, parcelaPaga.Acrescimo.Centavos);
        Assert.AreEqual(11_000, parcelaPaga.ValorEfetivo.Centavos);
        Assert.AreEqual(11_000, parcelaPaga.ValorRecebido.Centavos);
        Assert.AreEqual(0, parcelaPaga.Saldo.Centavos);
        Assert.AreEqual(SituacaoParcelaProjetada.Paga, parcelaPaga.Situacao);
        Assert.AreEqual(new DateOnly(2027, 1, 20), parcelaPaga.DataPagamento);
        Assert.AreEqual(FormaPagamento.Pix, parcelaPaga.FormaPagamento);

        var parcelaPendente = projecao.Parcelas[1];
        Assert.AreEqual(10_000, parcelaPendente.ValorBase.Centavos);
        Assert.AreEqual(0, parcelaPendente.Acrescimo.Centavos);
        Assert.AreEqual(10_000, parcelaPendente.ValorEfetivo.Centavos);
        Assert.AreEqual(0, parcelaPendente.ValorRecebido.Centavos);
        Assert.AreEqual(10_000, parcelaPendente.Saldo.Centavos);
        Assert.AreEqual(SituacaoParcelaProjetada.ProximosDias, parcelaPendente.Situacao);
        Assert.AreEqual(10_000, projecao.Parcelas.Sum(parcela => parcela.Saldo.Centavos));
        Assert.AreEqual(
            projecao.ValorTotalEfetivo.Centavos - projecao.TotalRecebido.Centavos,
            projecao.Saldo.Centavos);
        Assert.AreEqual(0, original.Recebimentos.Count);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ProjecaoParcelaVenda>)projecao.Parcelas)[0] = parcelaPaga);
    }

    [TestMethod]
    public void Projetar_ClassificaOntemHojeMaisSeteMaisOitoEDateOnlyMaxValue()
    {
        var venda = CriarVenda("venda-limite-projecao", 10_000, 1);

        Assert.AreEqual(
            SituacaoParcelaProjetada.Atrasada,
            ObterSucesso(venda.Projetar(new DateOnly(2027, 2, 16))).Parcelas[0].Situacao);
        Assert.AreEqual(
            SituacaoParcelaProjetada.ProximosDias,
            ObterSucesso(venda.Projetar(new DateOnly(2027, 2, 15))).Parcelas[0].Situacao);
        Assert.AreEqual(
            SituacaoParcelaProjetada.ProximosDias,
            ObterSucesso(venda.Projetar(new DateOnly(2027, 2, 8))).Parcelas[0].Situacao);
        Assert.AreEqual(
            SituacaoParcelaProjetada.EmAberto,
            ObterSucesso(venda.Projetar(new DateOnly(2027, 2, 7))).Parcelas[0].Situacao);

        var naReferenciaMaxima = ObterSucesso(venda.Projetar(DateOnly.MaxValue));
        Assert.AreEqual(SituacaoParcelaProjetada.Atrasada, naReferenciaMaxima.Parcelas[0].Situacao);
        Assert.AreEqual(SituacaoVendaProjetada.Atrasada, naReferenciaMaxima.Situacao);
        Assert.AreEqual(new DateOnly(2027, 2, 15), naReferenciaMaxima.ProximoVencimento);
    }

    [TestMethod]
    public void Projetar_AplicaPrecedenciaDeAtrasoSobreProximosDiasEQuitacaoSobreAtraso()
    {
        var vendaComTresParcelas = CriarVenda("venda-precedencia", 30_000, 3);
        var comAtrasadaEProxima = ObterSucesso(vendaComTresParcelas.Projetar(new DateOnly(2027, 3, 8)));
        var vendaQuitada = ObterSucesso(CriarVenda("venda-quitada", 10_000, 1).RegistrarPagamento(
            "recebimento-quitado",
            "venda-quitada-parcela-1",
            DinheiroValido(10_000),
            DataVenda,
            FormaPagamento.Dinheiro,
            Referencia));
        var quitadaDepoisDoVencimento = ObterSucesso(vendaQuitada.Projetar(new DateOnly(2027, 2, 16)));

        Assert.AreEqual(SituacaoParcelaProjetada.Atrasada, comAtrasadaEProxima.Parcelas[0].Situacao);
        Assert.AreEqual(SituacaoParcelaProjetada.ProximosDias, comAtrasadaEProxima.Parcelas[1].Situacao);
        Assert.AreEqual(SituacaoVendaProjetada.Atrasada, comAtrasadaEProxima.Situacao);
        Assert.AreEqual(SituacaoParcelaProjetada.Paga, quitadaDepoisDoVencimento.Parcelas[0].Situacao);
        Assert.AreEqual(SituacaoVendaProjetada.Quitada, quitadaDepoisDoVencimento.Situacao);
        Assert.AreEqual(0, quitadaDepoisDoVencimento.Saldo.Centavos);
        Assert.IsNull(quitadaDepoisDoVencimento.ProximoVencimento);
    }

    [TestMethod]
    public void Projetar_ContaEntradaLoteECorrecaoSemMutarHistoricoOuDuplicarMovimento()
    {
        var original = CriarVendaComEntradaLoteEIndividual();
        var projecaoOriginal = ObterSucesso(original.Projetar(Referencia));
        var corrigida = ObterSucesso(original.CorrigirPagamento(
            "recebimento-individual",
            DinheiroValido(10_500),
            new DateOnly(2027, 2, 5),
            FormaPagamento.CartaoCredito,
            Referencia,
            [original],
            "nota corrigida"));
        var projecaoCorrigida = ObterSucesso(corrigida.Projetar(Referencia));
        var segundaConsulta = ObterSucesso(corrigida.Projetar(Referencia));

        Assert.AreEqual(40_000, projecaoOriginal.ValorTotalBase.Centavos);
        Assert.AreEqual(1_000, projecaoOriginal.TotalAcrescimos.Centavos);
        Assert.AreEqual(41_000, projecaoOriginal.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(41_000, projecaoOriginal.TotalRecebido.Centavos);
        Assert.AreEqual(4, projecaoOriginal.QuantidadePaga);
        Assert.IsNull(projecaoOriginal.ProximoVencimento);
        Assert.AreEqual(SituacaoVendaProjetada.Quitada, projecaoOriginal.Situacao);
        Assert.AreEqual(OrigemRecebimento.Entrada, original.Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, original.Recebimentos[1].Origem);

        Assert.AreEqual(40_000, projecaoCorrigida.ValorTotalBase.Centavos);
        Assert.AreEqual(500, projecaoCorrigida.TotalAcrescimos.Centavos);
        Assert.AreEqual(40_500, projecaoCorrigida.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(40_500, projecaoCorrigida.TotalRecebido.Centavos);
        Assert.AreEqual(0, projecaoCorrigida.Saldo.Centavos);
        Assert.AreEqual(4, projecaoCorrigida.QuantidadePaga);
        Assert.AreEqual(4, projecaoCorrigida.QuantidadeParcelas);
        Assert.IsNull(projecaoCorrigida.ProximoVencimento);
        Assert.AreEqual(SituacaoVendaProjetada.Quitada, projecaoCorrigida.Situacao);
        Assert.AreEqual(10_500, projecaoCorrigida.Parcelas[3].ValorRecebido.Centavos);
        Assert.AreEqual(new DateOnly(2027, 2, 5), projecaoCorrigida.Parcelas[3].DataPagamento);
        Assert.AreEqual(FormaPagamento.CartaoCredito, projecaoCorrigida.Parcelas[3].FormaPagamento);
        Assert.AreEqual(40_500, segundaConsulta.TotalRecebido.Centavos);
        Assert.AreEqual(3, corrigida.Recebimentos.Count);
        Assert.AreEqual(11_000, original.Recebimentos[2].Valor.Centavos);
        Assert.AreEqual(41_000, ObterSucesso(original.Projetar(Referencia)).TotalRecebido.Centavos);
    }

    private static Venda CriarVenda(string id, long valorTotal, int quantidadeParcelas) =>
        ObterSucesso(Venda.Cadastrar(
            id,
            ClienteValido(),
            DataVenda,
            DinheiroValido(valorTotal),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(numero => $"{id}-parcela-{numero}").ToArray(),
            Referencia));

    private static Venda CriarVendaComEntradaLoteEIndividual()
    {
        var parcelas = Enumerable.Range(1, 4)
            .Select(numero => new DadosReconstrucaoParcela(
                $"historico-parcela-{numero}",
                numero,
                DinheiroValido(10_000),
                numero == 1 ? DataVenda : DataVenda.AddMonths(numero - 1)))
            .ToArray();
        var recebimentos = new[]
        {
            new DadosReconstrucaoRecebimento(
                "recebimento-entrada",
                DataVenda,
                FormaPagamento.Dinheiro,
                DinheiroValido(10_000),
                OrigemRecebimento.Entrada,
                default,
                null,
                [new("historico-parcela-1", DinheiroValido(10_000))]),
            new DadosReconstrucaoRecebimento(
                "recebimento-lote",
                new DateOnly(2027, 1, 30),
                FormaPagamento.Pix,
                DinheiroValido(20_000),
                OrigemRecebimento.HistoricoLote,
                default,
                null,
                [
                    new("historico-parcela-2", DinheiroValido(10_000)),
                    new("historico-parcela-3", DinheiroValido(10_000))
                ]),
            new DadosReconstrucaoRecebimento(
                "recebimento-individual",
                new DateOnly(2027, 1, 31),
                FormaPagamento.Pix,
                DinheiroValido(11_000),
                OrigemRecebimento.Individual,
                DinheiroValido(1_000),
                "nota original",
                [new("historico-parcela-4", DinheiroValido(11_000))])
        };
        var dados = new DadosReconstrucaoVenda(
            "venda-historica-projecao",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            DataVenda,
            DinheiroValido(40_000),
            parcelas,
            recebimentos);

        return ObterSucesso(Venda.Reconstruir(dados, Referencia));
    }

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static ProjecaoVenda ObterSucesso(ResultadoDominio<ProjecaoVenda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<ProjecaoVenda>.Sucesso>(resultado).Valor;

    private static Venda ObterSucesso(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(resultado).Valor;
}
