using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.Infraestrutura.Composicao;

public static class PersistenciaSqliteServiceCollectionExtensions
{
    public static IServiceCollection AdicionarPersistenciaSqlite(
        this IServiceCollection servicos,
        string caminhoAbsoluto)
    {
        ArgumentNullException.ThrowIfNull(servicos);
        var destino = new DestinoArmazenamentoVendas(caminhoAbsoluto);

        servicos.AddSingleton(destino);
        servicos.AddSingleton<IGeradorIdentificadores, GeradorIdentificadoresGuid>();
        servicos.AddTransient<IArmazenamentoVendas>(_ => new ArmazenamentoVendasSqlite());
        return servicos;
    }
}
