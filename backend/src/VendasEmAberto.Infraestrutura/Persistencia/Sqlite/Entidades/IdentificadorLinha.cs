namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

internal sealed class IdentificadorLinha
{
    public string Id { get; set; } = string.Empty;

    public TipoIdentificadorPersistido Tipo { get; set; }
}
