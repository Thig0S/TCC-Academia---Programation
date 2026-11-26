namespace VendasEmAberto.Aplicacao.Contratos;

public sealed class PeriodoResposta
{
    public DateOnly Inicio { get; }

    public DateOnly Fim { get; }

    public long RecebidosCentavos { get; }

    public long Revisao { get; }

    public DateOnly Referencia { get; }

    public IReadOnlyList<VendaResumoResposta> Vendas { get; }

    public PeriodoResposta(
        DateOnly inicio,
        DateOnly fim,
        long recebidosCentavos,
        long revisao,
        DateOnly referencia,
        IEnumerable<VendaResumoResposta> vendas)
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
