namespace VendasEmAberto.Api.Contratos;

public sealed class PeriodoApiResposta
{
    public DateOnly Inicio { get; }

    public DateOnly Fim { get; }

    public long RecebidosCentavos { get; }

    public RevisaoApi Revisao { get; }

    public DateOnly Referencia { get; }

    public IReadOnlyList<VendaResumoApiResposta> Vendas { get; }

    public PeriodoApiResposta(
        DateOnly inicio,
        DateOnly fim,
        long recebidosCentavos,
        RevisaoApi revisao,
        DateOnly referencia,
        IEnumerable<VendaResumoApiResposta> vendas)
    {
        ArgumentNullException.ThrowIfNull(vendas);

        Inicio = inicio;
        Fim = fim;
        RecebidosCentavos = recebidosCentavos;
        Revisao = revisao;
        Referencia = referencia;
        Vendas = Array.AsReadOnly(vendas.ToArray());
    }
}
