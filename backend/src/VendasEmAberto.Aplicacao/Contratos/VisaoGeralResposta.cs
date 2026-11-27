namespace VendasEmAberto.Aplicacao.Contratos;

public sealed class VisaoGeralResposta
{
    public DateOnly Referencia { get; }

    public long Revisao { get; }

    public IndicadoresVisaoGeralResposta Indicadores { get; }

    public IReadOnlyList<VendaResumoResposta> VendasRecentes { get; }

    public IReadOnlyList<ParcelaVisaoGeralResposta> ParcelasProximas { get; }

    public IReadOnlyList<ParcelaVisaoGeralResposta> ParcelasAtrasadas { get; }

    public VisaoGeralResposta(
        DateOnly referencia,
        long revisao,
        IndicadoresVisaoGeralResposta indicadores,
        IEnumerable<VendaResumoResposta> vendasRecentes,
        IEnumerable<ParcelaVisaoGeralResposta> parcelasProximas,
        IEnumerable<ParcelaVisaoGeralResposta> parcelasAtrasadas)
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

public sealed record IndicadoresVisaoGeralResposta(
    long TotalEmAbertoCentavos,
    long ValoresEmAtrasoCentavos,
    long RecebidoNoMesCentavos,
    int QuantidadeVendasAtivas);

public sealed record ParcelaVisaoGeralResposta(
    VendaResumoResposta Venda,
    ParcelaDetalheResposta Parcela);
