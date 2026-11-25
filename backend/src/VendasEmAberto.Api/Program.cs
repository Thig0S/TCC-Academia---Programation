using VendasEmAberto.Api.Configuracao;

var builder = WebApplication.CreateBuilder(args);
ConfiguracaoBackend.ValidarAusenciaDeSobrescritaDeEndpoints(
    builder.Configuration,
    args,
    Environment.GetEnvironmentVariables()
        .Cast<System.Collections.DictionaryEntry>()
        .Select(variavel => new KeyValuePair<string, string?>(
            (string)variavel.Key,
            variavel.Value?.ToString())));
var app = builder.Build();

app.Run();
