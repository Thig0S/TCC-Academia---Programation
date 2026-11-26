using VendasEmAberto.Dominio.Recebimentos;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

internal sealed class RecebimentoLinha
{
    public string Id { get; set; } = string.Empty;

    public string VendaId { get; set; } = string.Empty;

    public int Ordem { get; set; }

    public DateOnly Data { get; set; }

    public FormaPagamento Forma { get; set; }

    public OrigemRecebimento Origem { get; set; }

    public long ValorCentavos { get; set; }

    public long AcrescimoCentavos { get; set; }

    public string? Observacao { get; set; }
}
