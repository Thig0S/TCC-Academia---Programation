using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace VendasEmAberto.Api.Contratos;

public sealed class DateOnlyApiJsonConverter : JsonConverter<DateOnly>
{
    private const string Formato = "yyyy-MM-dd";

    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String
            || !DateOnly.TryParseExact(
                reader.GetString(),
                Formato,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var data))
        {
            throw new JsonException("A data deve usar o formato ISO yyyy-MM-dd.");
        }

        return data;
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString(Formato, CultureInfo.InvariantCulture));
}
