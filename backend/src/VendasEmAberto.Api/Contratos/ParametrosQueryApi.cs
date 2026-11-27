using System.Globalization;

namespace VendasEmAberto.Api.Contratos;

public static class ParametrosQueryApi
{
    public static string TextoObrigatorio(IQueryCollection query, string nome)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (!query.TryGetValue(nome, out var valores)
            || valores.Count != 1
            || valores[0] is not { Length: > 0 } valor)
        {
            throw new ErroEntradaApiException(nome);
        }

        return valor;
    }

    public static DateOnly DataObrigatoria(IQueryCollection query, string nome)
    {
        var texto = TextoObrigatorio(query, nome);
        if (!DateOnly.TryParseExact(
            texto,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var data))
        {
            throw new ErroEntradaApiException(nome);
        }

        return data;
    }

    public static int InteiroObrigatorio(
        IQueryCollection query,
        string nome,
        int minimo = 0,
        int maximo = int.MaxValue)
    {
        var texto = TextoObrigatorio(query, nome);
        if (!int.TryParse(texto, NumberStyles.None, CultureInfo.InvariantCulture, out var valor)
            || valor < minimo
            || valor > maximo)
        {
            throw new ErroEntradaApiException(nome);
        }

        return valor;
    }

    public static TEnum EnumObrigatorio<TEnum>(IQueryCollection query, string nome)
        where TEnum : struct, Enum
    {
        var texto = TextoObrigatorio(query, nome);
        if (!Enum.GetNames<TEnum>().Contains(texto, StringComparer.Ordinal))
        {
            throw new ErroEntradaApiException(nome);
        }

        return Enum.Parse<TEnum>(texto, ignoreCase: false);
    }
}
