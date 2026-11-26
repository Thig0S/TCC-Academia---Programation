using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal static class OpcoesVendasDbContext
{
    public static DbContextOptions<VendasDbContext> Criar(string caminho, SqliteOpenMode modo)
    {
        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = caminho,
            Mode = modo,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString();

        return new DbContextOptionsBuilder<VendasDbContext>()
            .UseSqlite(connectionString)
            .Options;
    }
}
