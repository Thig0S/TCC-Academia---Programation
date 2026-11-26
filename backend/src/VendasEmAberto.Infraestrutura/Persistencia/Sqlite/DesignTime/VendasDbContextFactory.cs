using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.DesignTime;

public sealed class VendasDbContextFactory : IDesignTimeDbContextFactory<VendasDbContext>
{
    public VendasDbContext CreateDbContext(string[] args)
    {
        if (args.Length != 2 || args[0] != "--database" || !Path.IsPathFullyQualified(args[1]))
        {
            throw new ArgumentException(
                "Informe --database seguido de um caminho absoluto.",
                nameof(args));
        }

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = args[1],
            Mode = SqliteOpenMode.ReadWrite,
            ForeignKeys = true,
            DefaultTimeout = 5
        }.ToString();

        var options = new DbContextOptionsBuilder<VendasDbContext>()
            .UseSqlite(connectionString)
            .Options;

        return new VendasDbContext(options);
    }
}
