using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using System.Net;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class RotasNaoImplementadasTests
{
    [TestMethod]
    public async Task RotasComerciais_Retornam404SemLoginOuRedirecionamento()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false
        });

        foreach (var rota in new[] { "/vendas", "/pagamentos" })
        {
            using var resposta = await client.GetAsync(rota);

            Assert.AreEqual(HttpStatusCode.NotFound, resposta.StatusCode, rota);
            Assert.IsFalse(resposta.Headers.Contains("Set-Cookie"), rota);
            Assert.IsFalse(resposta.Headers.Contains("Location"), rota);
        }
    }

    [TestMethod]
    public async Task RotasDeTemplateEOpenApi_NaoExistem()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        foreach (var rota in new[] { "/weatherforecast", "/openapi/v1.json", "/swagger" })
        {
            using var resposta = await client.GetAsync(rota);

            Assert.AreEqual(HttpStatusCode.NotFound, resposta.StatusCode, rota);
        }
    }

    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task RotaDeFalhaUsadaPelosTestes_NaoExisteNoHost(string ambiente)
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment(ambiente));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        using var resposta = await client.GetAsync("/__test/failure");

        Assert.AreEqual(HttpStatusCode.NotFound, resposta.StatusCode);
    }

    [TestMethod]
    public async Task OrigemWebArbitraria_NaoRecebePermissaoCors()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/health");
        requisicao.Headers.Add("Origin", "https://origem-invalida.example");

        using var resposta = await client.SendAsync(requisicao);

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.IsFalse(resposta.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
