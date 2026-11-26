using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;

namespace VendasEmAberto.Aplicacao.Composicao;

public static class AplicacaoServiceCollectionExtensions
{
    public static IServiceCollection AdicionarAplicacao(this IServiceCollection servicos)
    {
        ArgumentNullException.ThrowIfNull(servicos);

        servicos.AddMediatR(configuracao =>
            configuracao.RegisterServicesFromAssembly(typeof(AplicacaoServiceCollectionExtensions).Assembly));
        servicos.AddTransient<IPreparacaoArmazenamentoVendas, PreparacaoArmazenamentoVendas>();
        return servicos;
    }
}
