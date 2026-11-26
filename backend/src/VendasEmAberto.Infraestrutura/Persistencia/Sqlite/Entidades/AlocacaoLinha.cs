namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

internal sealed class AlocacaoLinha
{
    public string RecebimentoId { get; set; } = string.Empty;

    public int Ordem { get; set; }

    public string VendaId { get; set; } = string.Empty;

    public string ParcelaId { get; set; } = string.Empty;

    public long ValorCentavos { get; set; }
}
