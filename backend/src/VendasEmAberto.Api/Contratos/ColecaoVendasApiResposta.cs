namespace VendasEmAberto.Api.Contratos;

public sealed class ColecaoVendasApiResposta
{
    public ColecaoVendasApi Colecao { get; }

    public RevisaoApi Revisao { get; }

    public DateOnly Referencia { get; }

    public IReadOnlyList<VendaResumoApiResposta> Vendas { get; }

    public ColecaoVendasApiResposta(
        ColecaoVendasApi colecao,
        RevisaoApi revisao,
        DateOnly referencia,
        IEnumerable<VendaResumoApiResposta> vendas)
    {
        ArgumentNullException.ThrowIfNull(vendas);

        Colecao = colecao;
        Revisao = revisao;
        Referencia = referencia;
        Vendas = Array.AsReadOnly(vendas.ToArray());
    }
}

public enum ColecaoVendasApi
{
    Abertas,
    Quitadas,
    Inativas,
    Prejuizo
}
