using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class FalhasTecnicasTests
{
    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task Excecao_Inesperada_RetornaProblemDetailsSemDetalhesSensiveis(string ambiente)
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment(ambiente);
                builder.ConfigureTestServices(services =>
                    services.AddSingleton<IStartupFilter, FalhaDeTesteStartupFilter>());
            });
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false
        });
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/__test/failure");
        requisicao.Headers.Accept.ParseAdd("application/problem+json");

        using var resposta = await client.SendAsync(requisicao);
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.AreEqual(HttpStatusCode.InternalServerError, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        StringAssert.Contains(corpo, "\"status\":500");
        Assert.IsFalse(corpo.Contains("segredo-de-teste", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("appsettings", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("FalhaSensivel", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("configuration", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains(" at ", StringComparison.Ordinal));
    }
}

internal sealed class FalhaDeTesteStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            next(app);

            app.Use(async (context, proximo) =>
            {
                if (context.Request.Path == "/__test/failure")
                {
                    throw new InvalidOperationException("FalhaSensivel segredo-de-teste; appsettings interno.");
                }

                await proximo();
            });
        };
    }
}
