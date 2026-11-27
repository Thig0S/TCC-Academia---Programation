using System.Globalization;
using System.Security.Cryptography;

namespace VendasEmAberto.Api.Configuracao;

public static class ConfiguracaoBackend
{
    public const string ChavePorta = "Backend:Porta";
    public const string ChaveCaminhoBanco = "Backend:CaminhoBanco";
    public const string VariavelSegredoLocal = "Backend__SegredoLocal";
    public const int PortaPadrao = 5070;
    public const int PortaMinima = 1024;
    public const int PortaMaxima = 65535;

    public static string ObterCaminhoBanco(string? valor)
    {
        const string mensagem = "A configuração Backend:CaminhoBanco deve ser um caminho absoluto com diretório pai existente.";

        if (string.IsNullOrWhiteSpace(valor) || !Path.IsPathFullyQualified(valor))
        {
            throw new InvalidOperationException(mensagem);
        }

        string caminho;
        try
        {
            caminho = Path.GetFullPath(valor);
        }
        catch (Exception excecao) when (excecao is ArgumentException or NotSupportedException or PathTooLongException)
        {
            throw new InvalidOperationException(mensagem);
        }

        var diretorioPai = Path.GetDirectoryName(caminho);
        if (string.IsNullOrEmpty(diretorioPai)
            || !Directory.Exists(diretorioPai)
            || Directory.Exists(caminho))
        {
            throw new InvalidOperationException(mensagem);
        }

        return caminho;
    }

    public static void ValidarSegredoLocal(string? valor)
    {
        var segredo = ObterSegredoLocal(valor);
        CryptographicOperations.ZeroMemory(segredo);
    }

    public static byte[] ObterSegredoLocal(string? valor)
    {
        const string mensagem = "A variável de ambiente Backend__SegredoLocal deve conter Base64 canônico de 32 bytes.";

        if (string.IsNullOrEmpty(valor) || valor.Length != 44 || valor[^1] != '=')
        {
            throw new InvalidOperationException(mensagem);
        }

        byte[] segredo;
        try
        {
            segredo = Convert.FromBase64String(valor);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(mensagem);
        }

        if (segredo.Length != 32
            || !string.Equals(Convert.ToBase64String(segredo), valor, StringComparison.Ordinal))
        {
            CryptographicOperations.ZeroMemory(segredo);
            throw new InvalidOperationException(mensagem);
        }

        return segredo;
    }

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
