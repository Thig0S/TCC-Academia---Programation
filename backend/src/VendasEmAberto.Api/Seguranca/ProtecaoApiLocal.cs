using Microsoft.AspNetCore.Authentication;

namespace VendasEmAberto.Api.Seguranca;

public static class ProtecaoApiLocal
{
    public const string EsquemaBearer = "BearerLocal";
    public const string PrefixoComercial = "/api/v1";

    public static IServiceCollection AdicionarAutenticacaoBearerLocal(
        this IServiceCollection servicos,
        byte[] segredo)
    {
        ArgumentNullException.ThrowIfNull(servicos);
        ArgumentNullException.ThrowIfNull(segredo);

        servicos.AddSingleton(new CredencialBearerLocal(segredo));
        servicos
            .AddAuthentication(opcoes =>
            {
                opcoes.DefaultAuthenticateScheme = EsquemaBearer;
                opcoes.DefaultChallengeScheme = EsquemaBearer;
                opcoes.DefaultForbidScheme = EsquemaBearer;
            })
            .AddScheme<AuthenticationSchemeOptions, AutenticacaoBearerLocalHandler>(
                EsquemaBearer,
                _ => { });
        servicos.AddAuthorization();
        return servicos;
    }

    public static IApplicationBuilder UseProtecaoApiLocal(this IApplicationBuilder aplicacao)
    {
        ArgumentNullException.ThrowIfNull(aplicacao);

        aplicacao.Use(async (contexto, proximo) =>
        {
            if (contexto.Request.Path.StartsWithSegments(PrefixoComercial, StringComparison.OrdinalIgnoreCase))
            {
                contexto.Response.OnStarting(static estado =>
                {
                    var resposta = (HttpResponse)estado;
                    resposta.Headers.CacheControl = "no-store";
                    return Task.CompletedTask;
                }, contexto.Response);
            }

            await proximo(contexto);
        });
        aplicacao.UseAuthentication();
        aplicacao.UseAuthorization();
        return aplicacao;
    }

    public static RouteGroupBuilder MapGrupoComercial(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);
        return endpoints.MapGroup(PrefixoComercial).RequireAuthorization();
    }
}
