namespace VendasEmAberto.Api.Contratos;

public sealed class VisaoGeralApiResposta
{
    public DateOnly Referencia { get; }

    public RevisaoApi Revisao { get; }

    public IndicadoresVisaoGeralApiResposta Indicadores { get; }

    public IReadOnlyList<VendaResumoApiResposta> VendasRecentes { get; }

    public IReadOnlyList<ParcelaVisaoGeralApiResposta> ParcelasProximas { get; }

    public IReadOnlyList<ParcelaVisaoGeralApiResposta> ParcelasAtrasadas { get; }

    public VisaoGeralApiResposta(
        DateOnly referencia,
        RevisaoApi revisao,
        IndicadoresVisaoGeralApiResposta indicadores,
        IEnumerable<VendaResumoApiResposta> vendasRecentes,
        IEnumerable<ParcelaVisaoGeralApiResposta> parcelasProximas,
        IEnumerable<ParcelaVisaoGeralApiResposta> parcelasAtrasadas)
    {
        ArgumentNullException.ThrowIfNull(indicadores);
        ArgumentNullException.ThrowIfNull(vendasRecentes);
        ArgumentNullException.ThrowIfNull(parcelasProximas);
        ArgumentNullException.ThrowIfNull(parcelasAtrasadas);

        Referencia = referencia;
        Revisao = revisao;
        Indicadores = indicadores;
        VendasRecentes = Array.AsReadOnly(vendasRecentes.ToArray());
        ParcelasProximas = Array.AsReadOnly(parcelasProximas.ToArray());
        ParcelasAtrasadas = Array.AsReadOnly(parcelasAtrasadas.ToArray());
    }
}

public sealed record IndicadoresVisaoGeralApiResposta(
    long TotalEmAbertoCentavos,
    long ValoresEmAtrasoCentavos,
    long RecebidoNoMesCentavos,
    int QuantidadeVendasAtivas);

public sealed record ParcelaVisaoGeralApiResposta(
    VendaResumoApiResposta Venda,
    ParcelaDetalheApiResposta Parcela);
