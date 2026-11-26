using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal static class OpcoesVendasDbContext
{
    public static string CriarStringConexao(string caminho, SqliteOpenMode modo) =>
        new SqliteConnectionStringBuilder
        {
            DataSource = caminho,
            Mode = modo,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString();

    public static DbContextOptions<VendasDbContext> Criar(string caminho, SqliteOpenMode modo)
    {
        return new DbContextOptionsBuilder<VendasDbContext>()
            .UseSqlite(CriarStringConexao(caminho, modo))
            .Options;
    }
}
