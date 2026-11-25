using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed class ParcelaVenda
{
    public string Id { get; }

    public int Numero { get; }

    public Dinheiro ValorBase { get; }

    public DateOnly Vencimento { get; }

    internal ParcelaVenda(string id, int numero, Dinheiro valorBase, DateOnly vencimento)
    {
        Id = id;
        Numero = numero;
        ValorBase = valorBase;
        Vencimento = vencimento;
    }
}
