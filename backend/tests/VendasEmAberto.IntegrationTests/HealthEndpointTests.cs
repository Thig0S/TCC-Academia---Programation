using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class HealthEndpointTests
{
    [TestMethod]
    public async Task Health_RetornaHealthyEmTextoSemCookiesOuMutacao()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        using var primeiraResposta = await client.GetAsync("/health");
        var primeiroCorpo = await primeiraResposta.Content.ReadAsStringAsync();
        using var segundaResposta = await client.GetAsync("/health");
        var segundoCorpo = await segundaResposta.Content.ReadAsStringAsync();

        Assert.AreEqual(HttpStatusCode.OK, primeiraResposta.StatusCode);
        Assert.AreEqual("text/plain", primeiraResposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("Healthy", primeiroCorpo);
        Assert.AreEqual(HttpStatusCode.OK, segundaResposta.StatusCode);
        Assert.AreEqual("text/plain", segundaResposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("Healthy", segundoCorpo);
        Assert.IsFalse(primeiraResposta.Headers.Contains("Set-Cookie"));
        Assert.IsFalse(segundaResposta.Headers.Contains("Set-Cookie"));
    }
}
