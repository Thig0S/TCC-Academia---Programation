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
}
