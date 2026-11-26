using Microsoft.Data.Sqlite;
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

        return new VendasDbContext(OpcoesVendasDbContext.Criar(args[1], SqliteOpenMode.ReadWrite));
    }
}
