using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Net.Http.Headers;
using Microsoft.Extensions.Options;
using VendasEmAberto.Api.Erros;

namespace VendasEmAberto.Api.Seguranca;

internal sealed class AutenticacaoBearerLocalHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    CredencialBearerLocal credencial)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderNames.Authorization, out var valores)
            || valores.Count != 1
            || !TentarDecodificarBearer(valores[0], out var candidata))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        try
        {
            if (!credencial.Corresponde(candidata))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var identidade = new ClaimsIdentity(Scheme.Name);
            var principal = new ClaimsPrincipal(identidade);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        finally
        {
            CryptographicOperations.ZeroMemory(candidata);
        }
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.WWWAuthenticate = "Bearer";
        return ProblemasApi.AcessoNegado().ExecuteAsync(Context);
    }

    private static bool TentarDecodificarBearer(string? valor, out byte[] candidata)
    {
        candidata = [];
        if (valor is null
            || valor.Contains(',')
            || !AuthenticationHeaderValue.TryParse(valor, out var autenticacao)
            || !string.Equals(autenticacao.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrEmpty(autenticacao.Parameter)
            || autenticacao.Parameter.Length != 44
            || autenticacao.Parameter[^1] != '=')
        {
            return false;
        }

        try
        {
            candidata = Convert.FromBase64String(autenticacao.Parameter);
        }
        catch (FormatException)
        {
            return false;
        }

        if (candidata.Length == 32
            && string.Equals(
                Convert.ToBase64String(candidata),
                autenticacao.Parameter,
                StringComparison.Ordinal))
        {
            return true;
        }

        CryptographicOperations.ZeroMemory(candidata);
        candidata = [];
        return false;
    }
}
