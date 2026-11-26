namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

internal sealed class ParcelaLinha
{
    public string Id { get; set; } = string.Empty;

    public string VendaId { get; set; } = string.Empty;

    public int Numero { get; set; }

    public long ValorBaseCentavos { get; set; }

    public DateOnly Vencimento { get; set; }
}
