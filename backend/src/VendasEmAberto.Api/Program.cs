using VendasEmAberto.Api.Configuracao;
using VendasEmAberto.Api.Contratos;
using VendasEmAberto.Api.Erros;
using System.Net;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Routing;

var builder = WebApplication.CreateBuilder(args);
ConfiguracaoBackend.ValidarAusenciaDeSobrescritaDeEndpoints(
    builder.Configuration,
    args,
    Environment.GetEnvironmentVariables()
        .Cast<System.Collections.DictionaryEntry>()
        .Select(variavel => new KeyValuePair<string, string?>(
            (string)variavel.Key,
            variavel.Value?.ToString())));
var porta = ConfiguracaoBackend.ObterPorta(builder.Configuration[ConfiguracaoBackend.ChavePorta]);
builder.WebHost.ConfigureKestrel(opcoes => opcoes.Listen(IPAddress.Loopback, porta));
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<HandlerExcecaoApi>();
builder.Services.Configure<RouteHandlerOptions>(opcoes => opcoes.ThrowOnBadRequest = true);
builder.Services.ConfigureHttpJsonOptions(opcoes =>
    ContratoApiJson.Configurar(opcoes.SerializerOptions));
var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages(async contexto =>
{
    var resultado = contexto.HttpContext.Response.StatusCode switch
    {
        StatusCodes.Status405MethodNotAllowed => ProblemasApi.MetodoNaoPermitido(),
        StatusCodes.Status413PayloadTooLarge => ProblemasApi.ConteudoMuitoGrande(),
        _ => null
    };

    if (resultado is not null)
    {
        await resultado.ExecuteAsync(contexto.HttpContext);
    }
});

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, _) =>
    {
        context.Response.ContentType = "text/plain";
        await context.Response.WriteAsync("Healthy");
    }
});

app.Run();

public partial class Program { }
