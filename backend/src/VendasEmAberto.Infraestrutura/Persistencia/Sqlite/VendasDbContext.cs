using Microsoft.EntityFrameworkCore;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

public sealed class VendasDbContext(DbContextOptions<VendasDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(VendasDbContext).Assembly);
    }
}
