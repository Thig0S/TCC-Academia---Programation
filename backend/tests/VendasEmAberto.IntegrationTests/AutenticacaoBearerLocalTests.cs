using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VendasEmAberto.Api.Erros;
using VendasEmAberto.Api.Seguranca;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class AutenticacaoBearerLocalTests
{
    private const string CorpoValido = "{\"falha\":false}";

    [TestMethod]
    public async Task CredencialAusenteIncorretaOuDuplicada_Retorna401SeguroSemExecutarHandler()
    {
        var segredo = RandomNumberGenerator.GetBytes(32);
        var segredoTexto = Convert.ToBase64String(segredo);
        var incorreto = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        await using var host = await CriarHostAsync(segredo);

        using var ausente = await EnviarAsync(host.Cliente, CorpoValido);
        using var invalido = await EnviarAsync(host.Cliente, CorpoValido, incorreto);
        using var duplicado = await EnviarAsync(host.Cliente, CorpoValido, segredoTexto, incorreto);

        await AssertAcessoNegadoAsync(ausente);
        await AssertAcessoNegadoAsync(invalido, incorreto, segredoTexto);
        await AssertAcessoNegadoAsync(duplicado, segredoTexto, incorreto);
        Assert.AreEqual(0, host.Contador.Chamadas);
        Assert.IsFalse(host.Logs.Contains(segredoTexto, StringComparison.Ordinal));
        Assert.IsFalse(host.Logs.Contains(incorreto, StringComparison.Ordinal));
    }

    [TestMethod]
    public async Task AutenticacaoOcorreAntesDoBindingERespostaComercialNaoPodeSerArmazenada()
    {
        var segredo = RandomNumberGenerator.GetBytes(32);
        var segredoTexto = Convert.ToBase64String(segredo);
        await using var host = await CriarHostAsync(segredo);

        using var naoAutenticado = await EnviarAsync(host.Cliente, "{");
        using var autenticadoComBodyInvalido = await EnviarAsync(host.Cliente, "{", segredoTexto);
        using var sucesso = await EnviarAsync(host.Cliente, CorpoValido, segredoTexto);
        using var falha = await EnviarAsync(host.Cliente, "{\"falha\":true}", segredoTexto);

        await AssertAcessoNegadoAsync(naoAutenticado, segredoTexto);
        Assert.AreEqual(HttpStatusCode.BadRequest, autenticadoComBodyInvalido.StatusCode);
        Assert.AreEqual("no-store", autenticadoComBodyInvalido.Headers.CacheControl?.ToString());
        using (var problema = JsonDocument.Parse(await autenticadoComBodyInvalido.Content.ReadAsStringAsync()))
        {
            Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
        }

        Assert.AreEqual(HttpStatusCode.OK, sucesso.StatusCode);
        Assert.AreEqual("no-store", sucesso.Headers.CacheControl?.ToString());
        Assert.AreEqual(HttpStatusCode.BadRequest, falha.StatusCode);
        Assert.AreEqual("no-store", falha.Headers.CacheControl?.ToString());
        Assert.AreEqual(2, host.Contador.Chamadas);
        Assert.IsFalse(host.Logs.Contains(segredoTexto, StringComparison.Ordinal));
    }

    [TestMethod]
    public async Task SegredoAnteriorERecusadoAposNovaInicializacaoComCredencialDiferente()
    {
        var segredoAnterior = RandomNumberGenerator.GetBytes(32);
        var textoAnterior = Convert.ToBase64String(segredoAnterior);
        var segredoAtual = RandomNumberGenerator.GetBytes(32);
        var textoAtual = Convert.ToBase64String(segredoAtual);

        await using (var hostAnterior = await CriarHostAsync(segredoAnterior))
        {
            using var resposta = await EnviarAsync(hostAnterior.Cliente, CorpoValido, textoAnterior);
            Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        }

        await using var hostAtual = await CriarHostAsync(segredoAtual);
        using var antiga = await EnviarAsync(hostAtual.Cliente, CorpoValido, textoAnterior);
        using var atual = await EnviarAsync(hostAtual.Cliente, CorpoValido, textoAtual);

        await AssertAcessoNegadoAsync(antiga, textoAnterior, textoAtual);
        Assert.AreEqual(HttpStatusCode.OK, atual.StatusCode);
        Assert.AreEqual(1, hostAtual.Contador.Chamadas);
        Assert.IsFalse(hostAtual.Logs.Contains(textoAnterior, StringComparison.Ordinal));
        Assert.IsFalse(hostAtual.Logs.Contains(textoAtual, StringComparison.Ordinal));
    }

    private static async Task<HostAutenticacaoLocal> CriarHostAsync(byte[] segredo)
    {
        var capturadorLogs = new CapturadorLogs();
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.Logging.AddProvider(capturadorLogs);
        builder.Services.AdicionarAutenticacaoBearerLocal(segredo);
        builder.Services.AddSingleton<ContadorHandler>();
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<HandlerExcecaoApi>();
        builder.Services.Configure<RouteHandlerOptions>(opcoes => opcoes.ThrowOnBadRequest = true);

        var aplicacao = builder.Build();
        aplicacao.UseExceptionHandler();
        aplicacao.UseRouting();
        aplicacao.UseProtecaoApiLocal();
        aplicacao.MapGet("/health", () => Results.Text("Healthy", "text/plain"));
        aplicacao.MapGrupoComercial().MapPost(
            "/teste",
            (RequisicaoTeste requisicao, ContadorHandler contador) =>
            {
                contador.Incrementar();
                return requisicao.Falha
                    ? ProblemasApi.RequisicaoInvalida("nome")
                    : Results.Ok(new { resultado = "ok" });
            });

        await aplicacao.StartAsync();
        return new HostAutenticacaoLocal(
            aplicacao,
            aplicacao.GetTestClient(),
            aplicacao.Services.GetRequiredService<ContadorHandler>(),
            capturadorLogs);
    }

    private static async Task<HttpResponseMessage> EnviarAsync(
        HttpClient cliente,
        string corpo,
        params string[] credenciais)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/v1/teste")
        {
            Content = new StringContent(corpo, Encoding.UTF8, "application/json")
        };

        if (credenciais.Length == 1)
        {
            requisicao.Headers.TryAddWithoutValidation("Authorization", $"Bearer {credenciais[0]}");
        }
        else if (credenciais.Length > 1)
        {
            requisicao.Headers.TryAddWithoutValidation(
                "Authorization",
                credenciais.Select(credencial => $"Bearer {credencial}"));
        }

        return await cliente.SendAsync(requisicao);
    }

    private static async Task AssertAcessoNegadoAsync(
        HttpResponseMessage resposta,
        params string[] credenciais)
    {
        Assert.AreEqual(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("Bearer", resposta.Headers.WwwAuthenticate.Single().Scheme);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.IsFalse(resposta.Headers.Contains("Set-Cookie"));
        Assert.IsFalse(resposta.Headers.Contains("Location"));

        var corpo = await resposta.Content.ReadAsStringAsync();
        using var problema = JsonDocument.Parse(corpo);
        Assert.AreEqual("about:blank", problema.RootElement.GetProperty("type").GetString());
        Assert.AreEqual(401, problema.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual("acesso-local-negado", problema.RootElement.GetProperty("codigo").GetString());
        Assert.AreEqual(
            "A credencial local é ausente ou inválida.",
            problema.RootElement.GetProperty("detail").GetString());

        foreach (var credencial in credenciais)
        {
            Assert.IsFalse(corpo.Contains(credencial, StringComparison.Ordinal));
        }
    }

    private sealed class HostAutenticacaoLocal(
        WebApplication aplicacao,
        HttpClient cliente,
        ContadorHandler contador,
        CapturadorLogs capturadorLogs) : IAsyncDisposable
    {
        public HttpClient Cliente { get; } = cliente;

        public ContadorHandler Contador { get; } = contador;

        public string Logs => capturadorLogs.Conteudo;

        public async ValueTask DisposeAsync()
        {
            Cliente.Dispose();
            await aplicacao.DisposeAsync();
        }
    }

    private sealed class CapturadorLogs : ILoggerProvider
    {
        private readonly ConcurrentQueue<string> _mensagens = new();

        public string Conteudo => string.Join(Environment.NewLine, _mensagens);

        public ILogger CreateLogger(string categoryName) => new CapturadorLogger(_mensagens);

        public void Dispose()
        {
        }

        private sealed class CapturadorLogger(ConcurrentQueue<string> mensagens) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                mensagens.Enqueue(formatter(state, exception));
                if (exception is not null)
                {
                    mensagens.Enqueue(exception.ToString());
                }
            }
        }
    }

    private sealed class ContadorHandler
    {
        private int _chamadas;

        public int Chamadas => Volatile.Read(ref _chamadas);

        public void Incrementar() => Interlocked.Increment(ref _chamadas);
    }

    private sealed record RequisicaoTeste(bool Falha);
}
