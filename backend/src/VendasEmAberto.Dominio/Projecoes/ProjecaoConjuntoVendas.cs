using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Projecoes;

public sealed class ProjecaoConjuntoVendas
{
    public IReadOnlyList<ProjecaoVenda> Vendas { get; }

    public IReadOnlyList<ProjecaoVenda> Abertas { get; }

    public IReadOnlyList<ProjecaoVenda> Quitadas { get; }

    public IReadOnlyList<ProjecaoVenda> Inativas { get; }

    public IReadOnlyList<ProjecaoVenda> Prejuizos { get; }

    public Dinheiro TotalEmAberto { get; }

    public Dinheiro ValoresEmAtraso { get; }

    public Dinheiro RecebidoNoMes { get; }

    public int VendasCadastradas { get; }

    internal ProjecaoConjuntoVendas(
        IEnumerable<ProjecaoVenda> vendas,
        IEnumerable<ProjecaoVenda> abertas,
        IEnumerable<ProjecaoVenda> quitadas,
        IEnumerable<ProjecaoVenda> inativas,
        IEnumerable<ProjecaoVenda> prejuizos,
        Dinheiro totalEmAberto,
        Dinheiro valoresEmAtraso,
        Dinheiro recebidoNoMes,
        int vendasCadastradas)
    {
        Vendas = Array.AsReadOnly(vendas.ToArray());
        Abertas = Array.AsReadOnly(abertas.ToArray());
        Quitadas = Array.AsReadOnly(quitadas.ToArray());
        Inativas = Array.AsReadOnly(inativas.ToArray());
        Prejuizos = Array.AsReadOnly(prejuizos.ToArray());
        TotalEmAberto = totalEmAberto;
        ValoresEmAtraso = valoresEmAtraso;
        RecebidoNoMes = recebidoNoMes;
        VendasCadastradas = vendasCadastradas;
    }
}
