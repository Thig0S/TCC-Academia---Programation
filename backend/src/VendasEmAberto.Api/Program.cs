using VendasEmAberto.Api.Configuracao;
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
builder.WebHost.ConfigureKestrel(opcoes => opcoes.Listen(IPAddress.Loopback, porta));
builder.Services.AddHealthChecks();
var app = builder.Build();

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
