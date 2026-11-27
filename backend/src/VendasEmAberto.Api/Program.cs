using VendasEmAberto.Api.Configuracao;
using VendasEmAberto.Api.Contratos;
using VendasEmAberto.Api.Erros;
using VendasEmAberto.Api.Endpoints;
using VendasEmAberto.Api.Seguranca;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Infraestrutura.Composicao;
using System.Net;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

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
var caminhoBanco = ConfiguracaoBackend.ObterCaminhoBanco(
    builder.Configuration[ConfiguracaoBackend.ChaveCaminhoBanco]);
var segredoLocal = ConfiguracaoBackend.ObterSegredoLocal(
    Environment.GetEnvironmentVariable(ConfiguracaoBackend.VariavelSegredoLocal));

builder.WebHost.ConfigureKestrel(opcoes => opcoes.Listen(IPAddress.Loopback, porta));
builder.Services
    .AdicionarAplicacao()
    .AdicionarPersistenciaSqlite(caminhoBanco);
builder.Services.AddHealthChecks();
builder.Services.AdicionarAutenticacaoBearerLocal(segredoLocal);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<HandlerExcecaoApi>();
builder.Services.Configure<RouteHandlerOptions>(opcoes => opcoes.ThrowOnBadRequest = true);
builder.Services.ConfigureHttpJsonOptions(opcoes =>
    ContratoApiJson.Configurar(opcoes.SerializerOptions));
var app = builder.Build();

await using (var escopo = app.Services.CreateAsyncScope())
{
    var preparacao = escopo.ServiceProvider.GetRequiredService<IPreparacaoArmazenamentoVendas>();
    FluentResults.Result resultado;
    try
    {
        resultado = await preparacao.PrepararAsync(app.Lifetime.ApplicationStopping);
    }
    catch (OperationCanceledException)
    {
        throw;
    }
    catch
    {
        app.Logger.LogCritical("Ocorreu uma falha inesperada na preparação; a API não será iniciada.");
        throw new InvalidOperationException("A API não foi iniciada porque o armazenamento não pôde ser preparado.");
    }

    if (resultado.IsFailed)
    {
        app.Logger.LogCritical("A preparação do armazenamento falhou; a API não será iniciada.");
        throw new InvalidOperationException("A API não foi iniciada porque o armazenamento não pôde ser preparado.");
    }
}

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
app.UseProtecaoApiLocal();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, _) =>
    {
        context.Response.ContentType = "text/plain";
        await context.Response.WriteAsync("Healthy");
    }
});
app.MapGrupoComercial().MapVendasEndpoints();

app.Run();

public partial class Program { }
