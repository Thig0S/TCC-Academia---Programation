using VendasEmAberto.Api.Configuracao;
using System.Net;

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
var app = builder.Build();

app.Run();
