namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class SessaoVendasSqlite(VendasDbContext contexto) : IAsyncDisposable
{
    public VendasDbContext Contexto { get; } = contexto;

    public ValueTask DisposeAsync() => Contexto.DisposeAsync();
}
