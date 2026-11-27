using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorVendaDetalheApi
{
    public static VendaDetalheApiResposta Mapear(VendaDetalheResposta detalhe)
    {
        ArgumentNullException.ThrowIfNull(detalhe);

        var resumo = detalhe.Resumo;
        return new VendaDetalheApiResposta(
            new VendaResumoApiResposta(
                resumo.Id,
                new ClienteApiResposta(
                    resumo.Cliente.Nome,
                    resumo.Cliente.Cpf,
                    resumo.Cliente.Telefone,
                    resumo.Cliente.Descricao),
                resumo.DataVenda,
                Mapear(resumo.StatusAdministrativo),
                Mapear(resumo.Situacao),
                resumo.ValorTotalBaseCentavos,
                resumo.TotalAcrescimosCentavos,
                resumo.ValorTotalEfetivoCentavos,
                resumo.TotalRecebidoCentavos,
                resumo.SaldoCentavos,
                resumo.QuantidadePaga,
                resumo.QuantidadeParcelas,
                resumo.ProximoVencimento,
                new RevisaoApi(resumo.Revisao),
                resumo.Referencia),
            detalhe.Parcelas.Select(Mapear),
            detalhe.Recebimentos.Select(recebimento => new RecebimentoDetalheApiResposta(
                recebimento.Id,
                recebimento.Data,
                Mapear(recebimento.Forma),
                Mapear(recebimento.Origem),
                recebimento.ValorCentavos,
                recebimento.AcrescimoCentavos,
                recebimento.Observacao,
                recebimento.Alocacoes.Select(alocacao => new AlocacaoApiResposta(
                    alocacao.ParcelaId,
                    alocacao.ValorCentavos)))));
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

    private static StatusAdministrativoApi Mapear(StatusAdministrativoResposta status) => status switch
    {
        StatusAdministrativoResposta.Ativo => StatusAdministrativoApi.Ativo,
        StatusAdministrativoResposta.Inativo => StatusAdministrativoApi.Inativo,
        StatusAdministrativoResposta.Prejuizo => StatusAdministrativoApi.Prejuizo,
        _ => throw new InvalidOperationException("Status administrativo da resposta não reconhecido.")
    };

    private static SituacaoVendaApi Mapear(SituacaoVendaResposta situacao) => situacao switch
    {
        SituacaoVendaResposta.Quitada => SituacaoVendaApi.Quitada,
        SituacaoVendaResposta.Atrasada => SituacaoVendaApi.Atrasada,
        SituacaoVendaResposta.ProximosDias => SituacaoVendaApi.ProximosDias,
        SituacaoVendaResposta.EmAberto => SituacaoVendaApi.EmAberto,
        _ => throw new InvalidOperationException("Situação da venda na resposta não reconhecida.")
    };

    private static SituacaoParcelaApi Mapear(SituacaoParcelaResposta situacao) => situacao switch
    {
        SituacaoParcelaResposta.Paga => SituacaoParcelaApi.Paga,
        SituacaoParcelaResposta.Atrasada => SituacaoParcelaApi.Atrasada,
        SituacaoParcelaResposta.ProximosDias => SituacaoParcelaApi.ProximosDias,
        SituacaoParcelaResposta.EmAberto => SituacaoParcelaApi.EmAberto,
        _ => throw new InvalidOperationException("Situação da parcela na resposta não reconhecida.")
    };

    private static FormaPagamentoApi Mapear(FormaPagamentoResposta forma) => forma switch
    {
        FormaPagamentoResposta.Dinheiro => FormaPagamentoApi.Dinheiro,
        FormaPagamentoResposta.Pix => FormaPagamentoApi.Pix,
        FormaPagamentoResposta.CartaoDebito => FormaPagamentoApi.CartaoDebito,
        FormaPagamentoResposta.CartaoCredito => FormaPagamentoApi.CartaoCredito,
        _ => throw new InvalidOperationException("Forma de pagamento na resposta não reconhecida.")
    };

    private static OrigemRecebimentoApi Mapear(OrigemRecebimentoResposta origem) => origem switch
    {
        OrigemRecebimentoResposta.Entrada => OrigemRecebimentoApi.Entrada,
        OrigemRecebimentoResposta.Individual => OrigemRecebimentoApi.Individual,
        OrigemRecebimentoResposta.HistoricoLote => OrigemRecebimentoApi.HistoricoLote,
        _ => throw new InvalidOperationException("Origem do recebimento na resposta não reconhecida.")
    };
}
