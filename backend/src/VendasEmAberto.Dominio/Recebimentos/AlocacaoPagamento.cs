using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Recebimentos;

public sealed class AlocacaoPagamento
{
    public string ParcelaId { get; }

    public Dinheiro Valor { get; }

    internal AlocacaoPagamento(string parcelaId, Dinheiro valor)
    {
        ParcelaId = parcelaId;
        Valor = valor;
    }
}
