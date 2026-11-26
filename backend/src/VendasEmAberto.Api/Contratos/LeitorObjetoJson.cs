using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace VendasEmAberto.Api.Contratos;

public sealed class LeitorObjetoJson
{
    public const long MaximoCentavosSeguros = 9_007_199_254_740_991;

    private readonly JsonElement _objeto;
    private readonly HashSet<string> _camposConhecidos;

    public LeitorObjetoJson(JsonElement objeto, IEnumerable<string> camposConhecidos)
    {
        ArgumentNullException.ThrowIfNull(camposConhecidos);

        if (objeto.ValueKind != JsonValueKind.Object)
        {
            throw new ErroEntradaApiException(null);
        }

        _objeto = objeto;
        _camposConhecidos = camposConhecidos.ToHashSet(StringComparer.Ordinal);

        var encontrados = new HashSet<string>(StringComparer.Ordinal);
        foreach (var propriedade in objeto.EnumerateObject())
        {
            if (_camposConhecidos.Contains(propriedade.Name) && !encontrados.Add(propriedade.Name))
            {
                throw new ErroEntradaApiException(propriedade.Name);
            }
        }
    }

    public static LeitorObjetoJson Parse(string json, params string[] camposConhecidos)
    {
        try
        {
            using var documento = JsonDocument.Parse(json);
            return new LeitorObjetoJson(documento.RootElement.Clone(), camposConhecidos);
        }
        catch (JsonException)
        {
            throw new ErroEntradaApiException(null);
        }
    }

    public static async ValueTask<LeitorObjetoJson> LerAsync(
        HttpRequest requisicao,
        IEnumerable<string> camposConhecidos,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(requisicao);

        try
        {
            using var documento = await JsonDocument.ParseAsync(
                requisicao.Body,
                cancellationToken: cancellationToken);
            return new LeitorObjetoJson(documento.RootElement.Clone(), camposConhecidos);
        }
        catch (JsonException)
        {
            throw new ErroEntradaApiException(null);
        }
    }

    public string LerTextoObrigatorio(string campo)
    {
        var valor = LerPropriedadeObrigatoria(campo);
        if (valor.ValueKind != JsonValueKind.String || valor.GetString() is not { } texto)
        {
            throw new ErroEntradaApiException(campo);
        }

        return texto;
    }

    public string? LerTextoOpcional(string campo)
    {
        var valor = LerPropriedadeOpcional(campo);
        if (valor is null || valor.Value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (valor.Value.ValueKind != JsonValueKind.String || valor.Value.GetString() is not { } texto)
        {
            throw new ErroEntradaApiException(campo);
        }

        return texto;
    }

    public DateOnly LerDataObrigatoria(string campo)
    {
        var texto = LerTextoObrigatorio(campo);
        if (!DateOnly.TryParseExact(
            texto,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var data))
        {
            throw new ErroEntradaApiException(campo);
        }

        return data;
    }

    public long LerCentavosObrigatorios(string campo)
    {
        var valor = LerPropriedadeObrigatoria(campo);
        if (!TentarLerInteiroJson(valor, out var centavos) || centavos > MaximoCentavosSeguros)
        {
            throw new ErroEntradaApiException(campo);
        }

        return centavos;
    }

    public int LerInteiroObrigatorio(string campo, int minimo = 0, int maximo = int.MaxValue)
    {
        var valor = LerPropriedadeObrigatoria(campo);
        if (!TentarLerInteiroJson(valor, out var inteiro)
            || inteiro < minimo
            || inteiro > maximo)
        {
            throw new ErroEntradaApiException(campo);
        }

        return (int)inteiro;
    }

    public long LerRevisaoObrigatoria(string campo)
    {
        var texto = LerTextoObrigatorio(campo);
        if (!RevisaoApi.TentarLer(texto, out var revisao))
        {
            throw new ErroEntradaApiException(campo);
        }

        return revisao;
    }

    public TEnum LerEnumObrigatorio<TEnum>(string campo)
        where TEnum : struct, Enum
    {
        var texto = LerTextoObrigatorio(campo);
        if (!Enum.GetNames<TEnum>().Contains(texto, StringComparer.Ordinal))
        {
            throw new ErroEntradaApiException(campo);
        }

        return Enum.Parse<TEnum>(texto, ignoreCase: false);
    }

    public LeitorObjetoJson LerObjetoObrigatorio(string campo, params string[] camposConhecidos)
    {
        var valor = LerPropriedadeObrigatoria(campo);
        if (valor.ValueKind != JsonValueKind.Object)
        {
            throw new ErroEntradaApiException(campo);
        }

        return new LeitorObjetoJson(valor, camposConhecidos);
    }

    private JsonElement LerPropriedadeObrigatoria(string campo)
    {
        ValidarCampoConhecido(campo);
        if (!_objeto.TryGetProperty(campo, out var valor))
        {
            throw new ErroEntradaApiException(campo);
        }

        return valor;
    }

    private JsonElement? LerPropriedadeOpcional(string campo)
    {
        ValidarCampoConhecido(campo);
        return _objeto.TryGetProperty(campo, out var valor) ? valor : null;
    }

    private void ValidarCampoConhecido(string campo)
    {
        if (!_camposConhecidos.Contains(campo))
        {
            throw new ArgumentException("O campo não foi declarado como conhecido para este contrato.", nameof(campo));
        }
    }

    private static bool TentarLerInteiroJson(JsonElement valor, out long inteiro)
    {
        inteiro = default;
        if (valor.ValueKind != JsonValueKind.Number)
        {
            return false;
        }

        var texto = valor.GetRawText();
        if (texto.Length == 0 || texto.Any(caractere => caractere is < '0' or > '9'))
        {
            return false;
        }

        return long.TryParse(texto, NumberStyles.None, CultureInfo.InvariantCulture, out inteiro);
    }
}
