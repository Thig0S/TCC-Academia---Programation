using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Recebimentos;

public sealed class RecebimentoVenda
{
    public string Id { get; }

    public DateOnly Data { get; }

    public FormaPagamento Forma { get; }

    public Dinheiro Valor { get; }

    public OrigemRecebimento Origem { get; }

    public Dinheiro Acrescimo { get; }

    public string Observacao { get; }

    public IReadOnlyList<AlocacaoPagamento> Alocacoes { get; }

    internal RecebimentoVenda(
        string id,
        DateOnly data,
        FormaPagamento forma,
        Dinheiro valor,
        OrigemRecebimento origem,
        Dinheiro acrescimo,
        string observacao,
        IEnumerable<AlocacaoPagamento> alocacoes)
    {
        Id = id;
        Data = data;
        Forma = forma;
        Valor = valor;
        Origem = origem;
        Acrescimo = acrescimo;
        Observacao = observacao;
        Alocacoes = Array.AsReadOnly(alocacoes.ToArray());
    }
}
