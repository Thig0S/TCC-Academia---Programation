using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Projecoes;

public sealed class ConsultaPeriodoVendas
{
    public DateOnly Inicio { get; }

    public DateOnly Fim { get; }

    public Dinheiro Recebidos { get; }

    public IReadOnlyList<Venda> Vendas { get; }

    internal ConsultaPeriodoVendas(
        DateOnly inicio,
        DateOnly fim,
        Dinheiro recebidos,
        IEnumerable<Venda> vendas)
    {
        Inicio = inicio;
        Fim = fim;
        Recebidos = recebidos;
        Vendas = Array.AsReadOnly(vendas.ToArray());
    }
}
