using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Persistencia;

public sealed record SnapshotVendas
{
    public ConjuntoVendas Conjunto { get; }

    public long Revisao { get; }

    public SnapshotVendas(ConjuntoVendas conjunto, long revisao)
    {
        ArgumentNullException.ThrowIfNull(conjunto);

        if (revisao < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(revisao), "A revisão não pode ser negativa.");
        }

        Conjunto = conjunto;
        Revisao = revisao;
    }
}
