using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorRelatorioMensalApi
{
    public static RelatorioMensalApiResposta Mapear(RelatorioMensalResposta relatorio)
    {
        ArgumentNullException.ThrowIfNull(relatorio);

        return new RelatorioMensalApiResposta(
            relatorio.Referencia,
            relatorio.InicioMes,
            relatorio.FimMes,
            new RevisaoApi(relatorio.Revisao),
            relatorio.Recebimentos.Select(item => new RecebimentoMensalApiResposta(
                item.Id,
                MapeadorVendaResumoApi.Mapear(item.Venda),
                Mapear(item.Origem),
                item.Data,
                Mapear(item.Forma),
                item.ValorCentavos)),
            relatorio.RecebimentosDiarios.Select(item => new RecebimentoDiarioApiResposta(
                item.Data,
                item.TotalCentavos)),
            relatorio.VendasDoMes.Select(MapeadorVendaResumoApi.Mapear),
            relatorio.Saldos.Select(item => new SaldoMensalApiResposta(
                MapeadorVendaResumoApi.Mapear(item.Venda),
                item.SaldoCentavos,
                item.PrimeiroVencimentoPendente)),
            relatorio.ParcelasAtrasadas.Select(item => new ParcelaAtrasadaApiResposta(
                MapeadorVendaResumoApi.Mapear(item.Venda),
                Mapear(item.Parcela))),
            relatorio.ParcelasPrejuizo.Select(item => new ParcelaPrejuizoApiResposta(
                MapeadorVendaResumoApi.Mapear(item.Venda),
                Mapear(item.Parcela),
                item.IncluirNoTotal)),
            relatorio.TotalRecebidoCentavos,
            relatorio.QuantidadeVendasMes,
            relatorio.TotalVendasMesCentavos,
            relatorio.TotalEmAbertoCentavos,
            relatorio.TotalAtrasadoCentavos,
            relatorio.TotalPrejuizoCentavos);
    }

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

    private static OrigemRecebimentoApi Mapear(OrigemRecebimentoResposta origem) => origem switch
    {
        OrigemRecebimentoResposta.Entrada => OrigemRecebimentoApi.Entrada,
        OrigemRecebimentoResposta.Individual => OrigemRecebimentoApi.Individual,
        OrigemRecebimentoResposta.HistoricoLote => OrigemRecebimentoApi.HistoricoLote,
        _ => throw new InvalidOperationException("Origem de recebimento do relatório não reconhecida.")
    };

    private static FormaPagamentoApi Mapear(FormaPagamentoResposta forma) => forma switch
    {
        FormaPagamentoResposta.Dinheiro => FormaPagamentoApi.Dinheiro,
        FormaPagamentoResposta.Pix => FormaPagamentoApi.Pix,
        FormaPagamentoResposta.CartaoDebito => FormaPagamentoApi.CartaoDebito,
        FormaPagamentoResposta.CartaoCredito => FormaPagamentoApi.CartaoCredito,
        _ => throw new InvalidOperationException("Forma de pagamento do relatório não reconhecida.")
    };

    private static SituacaoParcelaApi Mapear(SituacaoParcelaResposta situacao) => situacao switch
    {
        SituacaoParcelaResposta.Paga => SituacaoParcelaApi.Paga,
        SituacaoParcelaResposta.Atrasada => SituacaoParcelaApi.Atrasada,
        SituacaoParcelaResposta.ProximosDias => SituacaoParcelaApi.ProximosDias,
        SituacaoParcelaResposta.EmAberto => SituacaoParcelaApi.EmAberto,
        _ => throw new InvalidOperationException("Situação de parcela do relatório não reconhecida.")
    };
}
