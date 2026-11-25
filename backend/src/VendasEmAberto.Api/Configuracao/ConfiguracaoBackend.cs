using System.Globalization;

namespace VendasEmAberto.Api.Configuracao;

public static class ConfiguracaoBackend
{
    public const string ChavePorta = "Backend:Porta";
    public const int PortaPadrao = 5070;
    public const int PortaMinima = 1024;
    public const int PortaMaxima = 65535;

    public static int ObterPorta(string? valor)
    {
        if (valor is null)
        {
            return PortaPadrao;
        }

        if (!int.TryParse(valor, NumberStyles.None, CultureInfo.InvariantCulture, out var porta)
            || porta is < PortaMinima or > PortaMaxima)
        {
            throw new FormatException(
                $"A configuração {ChavePorta} deve ser um número inteiro entre {PortaMinima} e {PortaMaxima}.");
        }

        return porta;
    }

    public static void ValidarAusenciaDeSobrescritaDeEndpoints(
        IConfiguration configuracao,
        IEnumerable<string> argumentos,
        IEnumerable<KeyValuePair<string, string?>> variaveisAmbiente)
    {
        var argumentosConcorrentes = argumentos.Any(ArgumentoConfiguraEndpoint);
        var configuracaoConcorrente = TemValor(configuracao, "urls")
            || TemValor(configuracao, "http_ports")
            || TemValor(configuracao, "https_ports")
            || configuracao.GetSection("Kestrel:Endpoints").GetChildren().Any();
        var ambienteConcorrente = variaveisAmbiente.Any(VariavelConfiguraEndpoint);

        if (argumentosConcorrentes || configuracaoConcorrente || ambienteConcorrente)
        {
            throw new InvalidOperationException(
                $"Não configure URLs ou endpoints de hosting/Kestrel. Use somente {ChavePorta} (variável Backend__Porta). O backend aceita apenas loopback.");
        }
    }

    private static bool ArgumentoConfiguraEndpoint(string argumento)
    {
        var chave = argumento.TrimStart('-').Split('=', 2)[0];

        return EhChaveDeEndpoint(chave);
    }

    private static bool VariavelConfiguraEndpoint(KeyValuePair<string, string?> variavel)
    {
        if (string.IsNullOrWhiteSpace(variavel.Value))
        {
            return false;
        }

        var nome = variavel.Key;
        return nome.Equals("ASPNETCORE_URLS", StringComparison.OrdinalIgnoreCase)
            || nome.Equals("DOTNET_URLS", StringComparison.OrdinalIgnoreCase)
            || nome.Equals("ASPNETCORE_HTTP_PORTS", StringComparison.OrdinalIgnoreCase)
            || nome.Equals("ASPNETCORE_HTTPS_PORTS", StringComparison.OrdinalIgnoreCase)
            || nome.Equals("DOTNET_HTTP_PORTS", StringComparison.OrdinalIgnoreCase)
            || nome.Equals("DOTNET_HTTPS_PORTS", StringComparison.OrdinalIgnoreCase)
            || nome.StartsWith("KESTREL__ENDPOINTS__", StringComparison.OrdinalIgnoreCase);
    }

    private static bool EhChaveDeEndpoint(string chave)
    {
        return chave.Equals("urls", StringComparison.OrdinalIgnoreCase)
            || chave.Equals("http_ports", StringComparison.OrdinalIgnoreCase)
            || chave.Equals("https_ports", StringComparison.OrdinalIgnoreCase)
            || chave.StartsWith("Kestrel:Endpoints:", StringComparison.OrdinalIgnoreCase);
    }

    private static bool TemValor(IConfiguration configuracao, string chave)
    {
        return !string.IsNullOrWhiteSpace(configuracao[chave]);
    }
}
