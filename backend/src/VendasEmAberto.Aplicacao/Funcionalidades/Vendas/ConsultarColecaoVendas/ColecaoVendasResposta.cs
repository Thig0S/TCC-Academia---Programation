using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

public sealed class ColecaoVendasResposta
{
    public ColecaoVendas Colecao { get; }

    public long Revisao { get; }

    public DateOnly Referencia { get; }

    public IReadOnlyList<VendaResumoResposta> Vendas { get; }

    public ColecaoVendasResposta(
        ColecaoVendas colecao,
        long revisao,
        DateOnly referencia,
        IEnumerable<VendaResumoResposta> vendas)
    {
        ArgumentNullException.ThrowIfNull(vendas);
        Colecao = colecao;
        Revisao = revisao;
        Referencia = referencia;
        Vendas = Array.AsReadOnly(vendas.ToArray());
    }
}
