namespace VendasEmAberto.Aplicacao.Contratos;

public sealed class RelatorioMensalResposta
{
    public DateOnly Referencia { get; }

    public DateOnly InicioMes { get; }

    public DateOnly FimMes { get; }

    public long Revisao { get; }

    public IReadOnlyList<RecebimentoMensalResposta> Recebimentos { get; }

    public IReadOnlyList<RecebimentoDiarioResposta> RecebimentosDiarios { get; }

    public IReadOnlyList<VendaResumoResposta> VendasDoMes { get; }

    public IReadOnlyList<SaldoMensalResposta> Saldos { get; }

    public IReadOnlyList<ParcelaAtrasadaResposta> ParcelasAtrasadas { get; }

    public IReadOnlyList<ParcelaPrejuizoResposta> ParcelasPrejuizo { get; }

    public long TotalRecebidoCentavos { get; }

    public int QuantidadeVendasMes { get; }

    public long TotalVendasMesCentavos { get; }

    public long TotalEmAbertoCentavos { get; }

    public long TotalAtrasadoCentavos { get; }

    public long TotalPrejuizoCentavos { get; }

    public RelatorioMensalResposta(
        DateOnly referencia,
        DateOnly inicioMes,
        DateOnly fimMes,
        long revisao,
        IEnumerable<RecebimentoMensalResposta> recebimentos,
        IEnumerable<RecebimentoDiarioResposta> recebimentosDiarios,
        IEnumerable<VendaResumoResposta> vendasDoMes,
        IEnumerable<SaldoMensalResposta> saldos,
        IEnumerable<ParcelaAtrasadaResposta> parcelasAtrasadas,
        IEnumerable<ParcelaPrejuizoResposta> parcelasPrejuizo,
        long totalRecebidoCentavos,
        int quantidadeVendasMes,
        long totalVendasMesCentavos,
        long totalEmAbertoCentavos,
        long totalAtrasadoCentavos,
        long totalPrejuizoCentavos)
    {
        ArgumentNullException.ThrowIfNull(recebimentos);
        ArgumentNullException.ThrowIfNull(recebimentosDiarios);
        ArgumentNullException.ThrowIfNull(vendasDoMes);
        ArgumentNullException.ThrowIfNull(saldos);
        ArgumentNullException.ThrowIfNull(parcelasAtrasadas);
        ArgumentNullException.ThrowIfNull(parcelasPrejuizo);

        Referencia = referencia;
        InicioMes = inicioMes;
        FimMes = fimMes;
        Revisao = revisao;
        Recebimentos = Array.AsReadOnly(recebimentos.ToArray());
        RecebimentosDiarios = Array.AsReadOnly(recebimentosDiarios.ToArray());
        VendasDoMes = Array.AsReadOnly(vendasDoMes.ToArray());
        Saldos = Array.AsReadOnly(saldos.ToArray());
        ParcelasAtrasadas = Array.AsReadOnly(parcelasAtrasadas.ToArray());
        ParcelasPrejuizo = Array.AsReadOnly(parcelasPrejuizo.ToArray());
        TotalRecebidoCentavos = totalRecebidoCentavos;
        QuantidadeVendasMes = quantidadeVendasMes;
        TotalVendasMesCentavos = totalVendasMesCentavos;
        TotalEmAbertoCentavos = totalEmAbertoCentavos;
        TotalAtrasadoCentavos = totalAtrasadoCentavos;
        TotalPrejuizoCentavos = totalPrejuizoCentavos;
    }
}

public sealed record RecebimentoMensalResposta(
    string Id,
    VendaResumoResposta Venda,
    OrigemRecebimentoResposta Origem,
    DateOnly Data,
    FormaPagamentoResposta Forma,
    long ValorCentavos);

public sealed record RecebimentoDiarioResposta(DateOnly Data, long TotalCentavos);

public sealed record SaldoMensalResposta(
    VendaResumoResposta Venda,
    long SaldoCentavos,
    DateOnly? PrimeiroVencimentoPendente);

public sealed record ParcelaAtrasadaResposta(VendaResumoResposta Venda, ParcelaDetalheResposta Parcela);

public sealed record ParcelaPrejuizoResposta(
    VendaResumoResposta Venda,
    ParcelaDetalheResposta Parcela,
    bool IncluirNoTotal);
