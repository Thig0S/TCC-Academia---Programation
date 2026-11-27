using System.Net;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class RotasNaoImplementadasTests
{
    [TestMethod]
    public async Task RotasComerciais_Retornam404SemLoginOuRedirecionamento()
    {
        await using var fixture = await HostApiFixture.CriarAsync();
        var client = fixture.Cliente;

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
        await using var fixture = await HostApiFixture.CriarAsync();
        var client = fixture.Cliente;

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
        await using var fixture = await HostApiFixture.CriarAsync(ambiente);
        var client = fixture.Cliente;

        using var resposta = await client.GetAsync("/__test/failure");

        Assert.AreEqual(HttpStatusCode.NotFound, resposta.StatusCode);
    }

    [TestMethod]
    public async Task OrigemWebArbitraria_NaoRecebePermissaoCors()
    {
        await using var fixture = await HostApiFixture.CriarAsync();
        var client = fixture.Cliente;
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/health");
        requisicao.Headers.Add("Origin", "https://origem-invalida.example");

        using var resposta = await client.SendAsync(requisicao);

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.IsFalse(resposta.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
