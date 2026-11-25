using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public ResultadoDominio<ProjecaoVenda> Projetar(DateOnly referencia)
    {
        var historicoValidado = Reconstruir(
            new DadosReconstrucaoVenda(
                Id,
                StatusAdministrativo,
                Cliente,
                DataVenda,
                ValorTotalBase,
                Parcelas.Select(parcela => new DadosReconstrucaoParcela(
                    parcela.Id,
                    parcela.Numero,
                    parcela.ValorBase,
                    parcela.Vencimento)).ToArray(),
                Recebimentos.Select(recebimento => new DadosReconstrucaoRecebimento(
                    recebimento.Id,
                    recebimento.Data,
                    recebimento.Forma,
                    recebimento.Valor,
                    recebimento.Origem,
                    recebimento.Acrescimo,
                    recebimento.Observacao,
                    recebimento.Alocacoes.Select(alocacao => new DadosReconstrucaoAlocacao(
                        alocacao.ParcelaId,
                        alocacao.Valor)).ToArray())).ToArray()),
            referencia);
        if (historicoValidado is not ResultadoDominio<Venda>.Sucesso)
        {
            return ResultadoDominio<ProjecaoVenda>.CriarFalha(
                ((ResultadoDominio<Venda>.Falha)historicoValidado).Erro);
        }

        var alocacoesPorParcela = new Dictionary<string, (RecebimentoVenda Recebimento, AlocacaoPagamento Alocacao)>(
            StringComparer.Ordinal);
        long totalRecebidoDosRecebimentos = 0;
        foreach (var recebimento in Recebimentos)
        {
            if (!TentarSomar(
                    totalRecebidoDosRecebimentos,
                    recebimento.Valor.Centavos,
                    out totalRecebidoDosRecebimentos))
            {
                return FalhaProjecaoLimite("A soma dos recebimentos excede o limite seguro de centavos.");
            }

            foreach (var alocacao in recebimento.Alocacoes)
            {
                if (!Parcelas.Any(parcela => parcela.Id == alocacao.ParcelaId) ||
                    !alocacoesPorParcela.TryAdd(alocacao.ParcelaId, (recebimento, alocacao)))
                {
                    return FalhaProjecaoHistorico("O histórico contém alocação sem vínculo ou duplicada.");
                }
            }
        }

        var parcelasProjetadas = new List<ProjecaoParcelaVenda>(Parcelas.Count);
        long totalBase = 0;
        long totalAcrescimos = 0;
        long totalRecebidoDasAlocacoes = 0;
        long saldo = 0;
        foreach (var parcela in Parcelas)
        {
            var paga = alocacoesPorParcela.TryGetValue(parcela.Id, out var pagamento);
            var acrescimoCentavos = paga && pagamento.Recebimento.Origem == OrigemRecebimento.Individual
                ? pagamento.Recebimento.Acrescimo.Centavos
                : 0;
            var valorRecebidoCentavos = paga ? pagamento.Alocacao.Valor.Centavos : 0;
            var saldoParcela = paga ? 0 : parcela.ValorBase.Centavos;
            if (!TentarSomar(totalBase, parcela.ValorBase.Centavos, out totalBase) ||
                !TentarSomar(totalAcrescimos, acrescimoCentavos, out totalAcrescimos) ||
                !TentarSomar(totalRecebidoDasAlocacoes, valorRecebidoCentavos, out totalRecebidoDasAlocacoes) ||
                !TentarSomar(saldo, saldoParcela, out saldo))
            {
                return FalhaProjecaoLimite("Os totais projetados excedem o limite seguro de centavos.");
            }

            if (!TentarSomar(parcela.ValorBase.Centavos, acrescimoCentavos, out var valorEfetivoCentavos))
            {
                return FalhaProjecaoLimite("O valor efetivo da parcela excede o limite seguro de centavos.");
            }

            var situacaoParcela = paga
                ? SituacaoParcelaProjetada.Paga
                : ClassificarParcela(parcela.Vencimento, referencia);
            parcelasProjetadas.Add(new ProjecaoParcelaVenda(
                parcela.Id,
                parcela.Numero,
                parcela.ValorBase,
                DinheiroInterno(acrescimoCentavos),
                DinheiroInterno(valorEfetivoCentavos),
                DinheiroInterno(valorRecebidoCentavos),
                DinheiroInterno(saldoParcela),
                parcela.Vencimento,
                situacaoParcela,
                paga ? pagamento.Recebimento.Data : null,
                paga ? pagamento.Recebimento.Forma : null));
        }

        if (totalBase != ValorTotalBase.Centavos ||
            totalRecebidoDosRecebimentos != totalRecebidoDasAlocacoes ||
            !TentarSomar(totalBase, totalAcrescimos, out var totalEfetivo) ||
            totalRecebidoDasAlocacoes > totalEfetivo ||
            totalEfetivo - totalRecebidoDasAlocacoes != saldo)
        {
            return FalhaProjecaoHistorico("O histórico projetado não reconcilia com o contrato.");
        }

        var parcelasPendentes = parcelasProjetadas
            .Where(parcela => parcela.Situacao != SituacaoParcelaProjetada.Paga)
            .ToArray();
        var situacao = saldo == 0
            ? SituacaoVendaProjetada.Quitada
            : parcelasPendentes.Any(parcela => parcela.Situacao == SituacaoParcelaProjetada.Atrasada)
                ? SituacaoVendaProjetada.Atrasada
                : parcelasPendentes.Any(parcela => parcela.Situacao == SituacaoParcelaProjetada.ProximosDias)
                    ? SituacaoVendaProjetada.ProximosDias
                    : SituacaoVendaProjetada.EmAberto;

        return ResultadoDominio<ProjecaoVenda>.CriarSucesso(new ProjecaoVenda(
            Id,
            StatusAdministrativo,
            parcelasProjetadas,
            DinheiroInterno(totalBase),
            DinheiroInterno(totalAcrescimos),
            DinheiroInterno(totalEfetivo),
            DinheiroInterno(totalRecebidoDasAlocacoes),
            DinheiroInterno(saldo),
            parcelasProjetadas.Count(parcela => parcela.Situacao == SituacaoParcelaProjetada.Paga),
            parcelasPendentes.OrderBy(parcela => parcela.Vencimento).Select(parcela => (DateOnly?)parcela.Vencimento).FirstOrDefault(),
            situacao));
    }

    private static SituacaoParcelaProjetada ClassificarParcela(DateOnly vencimento, DateOnly referencia)
    {
        var diasAteVencimento = vencimento.DayNumber - referencia.DayNumber;
        return diasAteVencimento < 0
            ? SituacaoParcelaProjetada.Atrasada
            : diasAteVencimento <= 7
                ? SituacaoParcelaProjetada.ProximosDias
                : SituacaoParcelaProjetada.EmAberto;
    }

    private static Dinheiro DinheiroInterno(long centavos)
    {
        var resultado = Dinheiro.Criar(centavos);
        return ((ResultadoDominio<Dinheiro>.Sucesso)resultado).Valor;
    }

    private static ResultadoDominio<ProjecaoVenda> FalhaProjecaoLimite(string mensagem) =>
        ResultadoDominio<ProjecaoVenda>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            mensagem,
            "historico"));

    private static ResultadoDominio<ProjecaoVenda> FalhaProjecaoHistorico(string mensagem) =>
        ResultadoDominio<ProjecaoVenda>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "historico-invalido",
            mensagem,
            "historico"));
}
