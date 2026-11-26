using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
        StringAssert.Contains(corpo, "\"codigo\":\"falha-interna\"");
        StringAssert.Contains(corpo, "\"detail\":\"Ocorreu uma falha inesperada.\"");
        Assert.IsFalse(corpo.Contains("segredo-de-teste", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("appsettings", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("FalhaSensivel", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains("configuration", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(corpo.Contains(" at ", StringComparison.Ordinal));
        Assert.IsFalse(corpo.Contains("instance", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    [DataRow("Development", 400, "requisicao-invalida")]
    [DataRow("Development", 405, "metodo-nao-permitido")]
    [DataRow("Development", 413, "conteudo-muito-grande")]
    [DataRow("Development", 415, "tipo-conteudo-nao-suportado")]
    [DataRow("Production", 400, "requisicao-invalida")]
    [DataRow("Production", 405, "metodo-nao-permitido")]
    [DataRow("Production", 413, "conteudo-muito-grande")]
    [DataRow("Production", 415, "tipo-conteudo-nao-suportado")]
    public async Task BadHttpRequest_PreservaStatusEProblemDetailsNosDoisAmbientes(
        string ambiente,
        int status,
        string codigo)
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment(ambiente);
                builder.ConfigureTestServices(services =>
                    services.AddSingleton<IStartupFilter, BadHttpRequestStartupFilter>());
            });
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false
        });

        using var resposta = await client.GetAsync($"/__test/bad-request/{status}");
        var corpo = await resposta.Content.ReadAsStringAsync();
        using var documento = System.Text.Json.JsonDocument.Parse(corpo);

        Assert.AreEqual((HttpStatusCode)status, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual(status, documento.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual(codigo, documento.RootElement.GetProperty("codigo").GetString());
        StringAssert.Contains(resposta.Headers.CacheControl?.ToString() ?? string.Empty, "no-store");
        Assert.IsFalse(corpo.Contains("marcador-excecao-sensivel", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(documento.RootElement.TryGetProperty("instance", out _));
    }
}

internal sealed class BadHttpRequestStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        next(app);

        app.Use(async (context, proximo) =>
        {
            var prefixo = "/__test/bad-request/";
            if (context.Request.Path.StartsWithSegments("/__test/bad-request"))
            {
                var status = int.Parse(context.Request.Path.Value![prefixo.Length..], System.Globalization.CultureInfo.InvariantCulture);
                throw new BadHttpRequestException("marcador-excecao-sensivel", status);
            }

            await proximo();
        });
    };
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
