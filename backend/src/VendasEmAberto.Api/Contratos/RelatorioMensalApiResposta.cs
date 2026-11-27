namespace VendasEmAberto.Api.Contratos;

public sealed class RelatorioMensalApiResposta
{
    public DateOnly Referencia { get; }

    public DateOnly InicioMes { get; }

    public DateOnly FimMes { get; }

    public RevisaoApi Revisao { get; }

    public IReadOnlyList<RecebimentoMensalApiResposta> Recebimentos { get; }

    public IReadOnlyList<RecebimentoDiarioApiResposta> RecebimentosDiarios { get; }

    public IReadOnlyList<VendaResumoApiResposta> VendasDoMes { get; }

    public IReadOnlyList<SaldoMensalApiResposta> Saldos { get; }

    public IReadOnlyList<ParcelaAtrasadaApiResposta> ParcelasAtrasadas { get; }

    public IReadOnlyList<ParcelaPrejuizoApiResposta> ParcelasPrejuizo { get; }

    public long TotalRecebidoCentavos { get; }

    public int QuantidadeVendasMes { get; }

    public long TotalVendasMesCentavos { get; }

    public long TotalEmAbertoCentavos { get; }

    public long TotalAtrasadoCentavos { get; }

    public long TotalPrejuizoCentavos { get; }

    public RelatorioMensalApiResposta(
        DateOnly referencia,
        DateOnly inicioMes,
        DateOnly fimMes,
        RevisaoApi revisao,
        IEnumerable<RecebimentoMensalApiResposta> recebimentos,
        IEnumerable<RecebimentoDiarioApiResposta> recebimentosDiarios,
        IEnumerable<VendaResumoApiResposta> vendasDoMes,
        IEnumerable<SaldoMensalApiResposta> saldos,
        IEnumerable<ParcelaAtrasadaApiResposta> parcelasAtrasadas,
        IEnumerable<ParcelaPrejuizoApiResposta> parcelasPrejuizo,
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

public sealed record RecebimentoMensalApiResposta(
    string Id,
    VendaResumoApiResposta Venda,
    OrigemRecebimentoApi Origem,
    DateOnly Data,
    FormaPagamentoApi Forma,
    long ValorCentavos);

public sealed record RecebimentoDiarioApiResposta(DateOnly Data, long TotalCentavos);

public sealed record SaldoMensalApiResposta(
    VendaResumoApiResposta Venda,
    long SaldoCentavos,
    DateOnly? PrimeiroVencimentoPendente);

public sealed record ParcelaAtrasadaApiResposta(
    VendaResumoApiResposta Venda,
    ParcelaDetalheApiResposta Parcela);

public sealed record ParcelaPrejuizoApiResposta(
    VendaResumoApiResposta Venda,
    ParcelaDetalheApiResposta Parcela,
    bool IncluirNoTotal);
