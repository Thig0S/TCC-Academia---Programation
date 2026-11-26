using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace VendasEmAberto.Api.Contratos;

[JsonConverter(typeof(RevisaoApiJsonConverter))]
public readonly record struct RevisaoApi
{
    public long Valor { get; }

    public RevisaoApi(long valor)
    {
        if (valor < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(valor));
        }

        Valor = valor;
    }

    public override string ToString() => Valor.ToString(CultureInfo.InvariantCulture);

    internal static bool TentarLer(string? texto, out long valor)
    {
        valor = default;

        if (string.IsNullOrEmpty(texto)
            || (texto.Length > 1 && texto[0] == '0')
            || texto.Any(caractere => caractere is < '0' or > '9'))
        {
            return false;
        }

        return long.TryParse(texto, NumberStyles.None, CultureInfo.InvariantCulture, out valor);
    }
}

public sealed class RevisaoApiJsonConverter : JsonConverter<RevisaoApi>
{
    public override RevisaoApi Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String
            || !RevisaoApi.TentarLer(reader.GetString(), out var valor))
        {
            throw new JsonException("A revisão deve ser uma string decimal canônica.");
        }

        return new RevisaoApi(valor);
    }

    public override void Write(Utf8JsonWriter writer, RevisaoApi value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}
