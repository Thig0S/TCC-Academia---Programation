using System.Text.Json;
using System.Text.Json.Serialization;

namespace VendasEmAberto.Api.Contratos;

public static class ContratoApiJson
{
    public static void Configurar(JsonSerializerOptions opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        opcoes.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        opcoes.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;

        if (!opcoes.Converters.Any(conversor => conversor is DateOnlyApiJsonConverter))
        {
            opcoes.Converters.Add(new DateOnlyApiJsonConverter());
        }

        if (!opcoes.Converters.Any(conversor => conversor is RevisaoApiJsonConverter))
        {
            opcoes.Converters.Add(new RevisaoApiJsonConverter());
        }

        if (!opcoes.Converters.Any(conversor => conversor is JsonStringEnumConverter))
        {
            opcoes.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
        }
    }

    public static JsonSerializerOptions CriarOpcoes()
    {
        var opcoes = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Configurar(opcoes);
        return opcoes;
    }
}
