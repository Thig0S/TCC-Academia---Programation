using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Contratos;

public static class MapeadorVendaResposta
{
    public static VendaResumoResposta MapearResumo(
        Venda venda,
        ProjecaoVenda projecao,
        long revisao,
        DateOnly referencia)
    {
        ArgumentNullException.ThrowIfNull(venda);
        ArgumentNullException.ThrowIfNull(projecao);
        if (!StringComparer.Ordinal.Equals(venda.Id, projecao.Id))
        {
            throw new InvalidOperationException("A venda e sua projeção não correspondem.");
        }

        return new VendaResumoResposta(
            venda.Id,
            new ClienteResposta(
                venda.Cliente.Nome,
                venda.Cliente.Cpf,
                venda.Cliente.Telefone,
                venda.Cliente.Descricao),
            venda.DataVenda,
            Mapear(projecao.StatusAdministrativo),
            Mapear(projecao.Situacao),
            projecao.ValorTotalBase.Centavos,
            projecao.TotalAcrescimos.Centavos,
            projecao.ValorTotalEfetivo.Centavos,
            projecao.TotalRecebido.Centavos,
            projecao.Saldo.Centavos,
            projecao.QuantidadePaga,
            projecao.QuantidadeParcelas,
            projecao.ProximoVencimento,
            revisao,
            referencia);
    }

    public static VendaDetalheResposta MapearDetalhe(
        Venda venda,
        ProjecaoVenda projecao,
        long revisao,
        DateOnly referencia)
    {
        var resumo = MapearResumo(venda, projecao, revisao, referencia);
        var projecoesPorId = projecao.Parcelas.ToDictionary(item => item.Id, StringComparer.Ordinal);
        if (projecoesPorId.Count != venda.Parcelas.Count ||
            venda.Parcelas.Any(parcela => !projecoesPorId.ContainsKey(parcela.Id)))
        {
            throw new InvalidOperationException("As parcelas da venda e da projeção não correspondem.");
        }

        var parcelas = venda.Parcelas.Select(parcela =>
        {
            var calculada = projecoesPorId[parcela.Id];
            return new ParcelaDetalheResposta(
                parcela.Id,
                parcela.Numero,
                calculada.ValorBase.Centavos,
                calculada.Acrescimo.Centavos,
                calculada.ValorEfetivo.Centavos,
                calculada.ValorRecebido.Centavos,
                calculada.Saldo.Centavos,
                parcela.Vencimento,
                Mapear(calculada.Situacao),
                calculada.DataPagamento,
                calculada.FormaPagamento is { } forma ? Mapear(forma) : null);
        });

        var recebimentos = venda.Recebimentos.Select(recebimento => new RecebimentoDetalheResposta(
            recebimento.Id,
            recebimento.Data,
            Mapear(recebimento.Forma),
            Mapear(recebimento.Origem),
            recebimento.Valor.Centavos,
            recebimento.Acrescimo.Centavos,
            recebimento.Observacao,
            recebimento.Alocacoes.Select(alocacao => new AlocacaoResposta(
                alocacao.ParcelaId,
                alocacao.Valor.Centavos))));

        return new VendaDetalheResposta(resumo, parcelas, recebimentos);
    }

    internal static ParcelaDetalheResposta MapearParcela(ProjecaoParcelaVenda parcela) => new(
        parcela.Id,
        parcela.Numero,
        parcela.ValorBase.Centavos,
        parcela.Acrescimo.Centavos,
        parcela.ValorEfetivo.Centavos,
        parcela.ValorRecebido.Centavos,
        parcela.Saldo.Centavos,
        parcela.Vencimento,
        Mapear(parcela.Situacao),
        parcela.DataPagamento,
        parcela.FormaPagamento is { } forma ? Mapear(forma) : null);

    internal static StatusAdministrativoResposta Mapear(StatusAdministrativoVenda status) => status switch
    {
        StatusAdministrativoVenda.Ativo => StatusAdministrativoResposta.Ativo,
        StatusAdministrativoVenda.Inativo => StatusAdministrativoResposta.Inativo,
        StatusAdministrativoVenda.Prejuizo => StatusAdministrativoResposta.Prejuizo,
        _ => throw new InvalidOperationException("Status administrativo não reconhecido.")
    };

    internal static SituacaoVendaResposta Mapear(SituacaoVendaProjetada situacao) => situacao switch
    {
        SituacaoVendaProjetada.Quitada => SituacaoVendaResposta.Quitada,
        SituacaoVendaProjetada.Atrasada => SituacaoVendaResposta.Atrasada,
        SituacaoVendaProjetada.ProximosDias => SituacaoVendaResposta.ProximosDias,
        SituacaoVendaProjetada.EmAberto => SituacaoVendaResposta.EmAberto,
        _ => throw new InvalidOperationException("Situação financeira da venda não reconhecida.")
    };

    internal static SituacaoParcelaResposta Mapear(SituacaoParcelaProjetada situacao) => situacao switch
    {
        SituacaoParcelaProjetada.Paga => SituacaoParcelaResposta.Paga,
        SituacaoParcelaProjetada.Atrasada => SituacaoParcelaResposta.Atrasada,
        SituacaoParcelaProjetada.ProximosDias => SituacaoParcelaResposta.ProximosDias,
        SituacaoParcelaProjetada.EmAberto => SituacaoParcelaResposta.EmAberto,
        _ => throw new InvalidOperationException("Situação financeira da parcela não reconhecida.")
    };

    internal static FormaPagamentoResposta Mapear(FormaPagamento forma) => forma switch
    {
        FormaPagamento.Dinheiro => FormaPagamentoResposta.Dinheiro,
        FormaPagamento.Pix => FormaPagamentoResposta.Pix,
        FormaPagamento.CartaoDebito => FormaPagamentoResposta.CartaoDebito,
        FormaPagamento.CartaoCredito => FormaPagamentoResposta.CartaoCredito,
        _ => throw new InvalidOperationException("Forma de pagamento não reconhecida.")
    };

    internal static OrigemRecebimentoResposta Mapear(OrigemRecebimento origem) => origem switch
    {
        OrigemRecebimento.Entrada => OrigemRecebimentoResposta.Entrada,
        OrigemRecebimento.Individual => OrigemRecebimentoResposta.Individual,
        OrigemRecebimento.HistoricoLote => OrigemRecebimentoResposta.HistoricoLote,
        _ => throw new InvalidOperationException("Origem de recebimento não reconhecida.")
    };
}
