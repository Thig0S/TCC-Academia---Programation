using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorVisaoGeralApi
{
    public static VisaoGeralApiResposta Mapear(VisaoGeralResposta visaoGeral)
    {
        ArgumentNullException.ThrowIfNull(visaoGeral);

        return new VisaoGeralApiResposta(
            visaoGeral.Referencia,
            new RevisaoApi(visaoGeral.Revisao),
            new IndicadoresVisaoGeralApiResposta(
                visaoGeral.Indicadores.TotalEmAbertoCentavos,
                visaoGeral.Indicadores.ValoresEmAtrasoCentavos,
                visaoGeral.Indicadores.RecebidoNoMesCentavos,
                visaoGeral.Indicadores.QuantidadeVendasAtivas),
            visaoGeral.VendasRecentes.Select(MapeadorVendaResumoApi.Mapear),
            visaoGeral.ParcelasProximas.Select(Mapear),
            visaoGeral.ParcelasAtrasadas.Select(Mapear));
    }

    private static ParcelaVisaoGeralApiResposta Mapear(ParcelaVisaoGeralResposta parcela) =>
        new(
            MapeadorVendaResumoApi.Mapear(parcela.Venda),
            Mapear(parcela.Parcela));

    private static ParcelaDetalheApiResposta Mapear(ParcelaDetalheResposta parcela) => new(
        parcela.Id,
        parcela.Numero,
        parcela.ValorBaseCentavos,
        parcela.AcrescimoCentavos,
        parcela.ValorEfetivoCentavos,
        parcela.ValorRecebidoCentavos,
        parcela.SaldoCentavos,
        parcela.Vencimento,
        Mapear(parcela.Situacao),
        parcela.DataPagamento,
        parcela.FormaPagamento is { } forma ? Mapear(forma) : null);

    private static SituacaoParcelaApi Mapear(SituacaoParcelaResposta situacao) => situacao switch
    {
        SituacaoParcelaResposta.Paga => SituacaoParcelaApi.Paga,
        SituacaoParcelaResposta.Atrasada => SituacaoParcelaApi.Atrasada,
        SituacaoParcelaResposta.ProximosDias => SituacaoParcelaApi.ProximosDias,
        SituacaoParcelaResposta.EmAberto => SituacaoParcelaApi.EmAberto,
        _ => throw new InvalidOperationException("Situação da parcela da Visão Geral não reconhecida.")
    };

    private static FormaPagamentoApi Mapear(FormaPagamentoResposta forma) => forma switch
    {
        FormaPagamentoResposta.Dinheiro => FormaPagamentoApi.Dinheiro,
        FormaPagamentoResposta.Pix => FormaPagamentoApi.Pix,
        FormaPagamentoResposta.CartaoDebito => FormaPagamentoApi.CartaoDebito,
        FormaPagamentoResposta.CartaoCredito => FormaPagamentoApi.CartaoCredito,
        _ => throw new InvalidOperationException("Forma de pagamento da Visão Geral não reconhecida.")
    };
}
