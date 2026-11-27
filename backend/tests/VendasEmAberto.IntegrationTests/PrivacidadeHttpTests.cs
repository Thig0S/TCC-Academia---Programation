using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace VendasEmAberto.IntegrationTests;

[TestClass]
public sealed class PrivacidadeHttpTests
{
    private static readonly string SegredoValido = Convert.ToBase64String(
        Encoding.ASCII.GetBytes("SEGREDO-MARCADOR-0123456789ABCDE"));

    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task ExcecaoComMarcadoresPrivados_Retorna500GenericoESemVazamentoEmLogsDoHost(string ambiente)
    {
        const string cpf = "cpf-MARCADOR-52998224725";
        const string telefone = "telefone-MARCADOR-11987654321";
        const string caminho = "caminho-MARCADOR-7f4d8";
        const string sql = "sql-MARCADOR-SELECT-privado";
        const string excecao = "excecao-MARCADOR-InvalidOperationException";
        var logs = new CapturadorLogs();
        var mensagemExcecao = string.Join(
            " | ",
            SegredoValido,
            cpf,
            telefone,
            caminho,
            sql,
            excecao);

        await using var fixture = await HostApiFixture.CriarAsync(
            ambiente,
            builder =>
            {
                builder.ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.SetMinimumLevel(LogLevel.Trace);
                    logging.AddProvider(logs);
                });
                builder.ConfigureTestServices(services =>
                    services.AddSingleton<IStartupFilter>(new FalhaPrivadaStartupFilter(mensagemExcecao)));
            },
            segredoLocal: SegredoValido);

        using var requisicao = new HttpRequestMessage(
            HttpMethod.Post,
            $"/api/v1/__test/falha-privada/{caminho}?cpf={Uri.EscapeDataString(cpf)}&telefone={Uri.EscapeDataString(telefone)}")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { cpf, telefone }),
                Encoding.UTF8,
                "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", SegredoValido);

        using var resposta = await fixture.Cliente.SendAsync(requisicao);
        var corpo = await resposta.Content.ReadAsStringAsync();
        var logsCapturados = logs.Conteudo;
        using var problema = JsonDocument.Parse(corpo);

        Assert.AreEqual(HttpStatusCode.InternalServerError, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.IsFalse(resposta.Headers.Contains("Set-Cookie"));
        Assert.IsFalse(resposta.Headers.Contains("Location"));
        Assert.AreEqual(500, problema.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual("falha-interna", problema.RootElement.GetProperty("codigo").GetString());
        Assert.IsFalse(problema.RootElement.TryGetProperty("instance", out _));

        foreach (var marcador in new[] { SegredoValido, cpf, telefone, caminho, sql, excecao })
        {
            Assert.IsFalse(corpo.Contains(marcador, StringComparison.Ordinal), $"A resposta publicou: {marcador}");
            Assert.IsFalse(logsCapturados.Contains(marcador, StringComparison.Ordinal), $"Um log publicou: {marcador}");
        }
    }

    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task SemBearerEJsonMalformadoNoHostReal_Retorna401AntesDoBinding(string ambiente)
    {
        const string marcadorSegredo = "segredo-MARCADOR-401";
        const string marcadorCpf = "cpf-MARCADOR-BODY-401";
        const string marcadorTelefone = "telefone-MARCADOR-BODY-401";
        var logs = new CapturadorLogs();

        await using var fixture = await HostApiFixture.CriarAsync(
            ambiente,
            builder => builder.ConfigureLogging(logging =>
            {
                logging.ClearProviders();
                logging.SetMinimumLevel(LogLevel.Trace);
                logging.AddProvider(logs);
            }),
            segredoLocal: SegredoValido);

        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/v1/vendas")
        {
            Content = new StringContent(
                $"{{\"cpf\":\"{marcadorCpf}\",\"telefone\":\"{marcadorTelefone}\",",
                Encoding.UTF8,
                "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", marcadorSegredo);

        using var resposta = await fixture.Cliente.SendAsync(requisicao);
        var corpo = await resposta.Content.ReadAsStringAsync();
        var logsCapturados = logs.Conteudo;
        using var problema = JsonDocument.Parse(corpo);

        Assert.AreEqual(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("Bearer", resposta.Headers.WwwAuthenticate.Single().Scheme);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.IsFalse(resposta.Headers.Contains("Set-Cookie"));
        Assert.IsFalse(resposta.Headers.Contains("Location"));
        Assert.AreEqual(401, problema.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual("acesso-local-negado", problema.RootElement.GetProperty("codigo").GetString());
        foreach (var marcador in new[] { marcadorSegredo, marcadorCpf, marcadorTelefone })
        {
            Assert.IsFalse(corpo.Contains(marcador, StringComparison.Ordinal));
            Assert.IsFalse(logsCapturados.Contains(marcador, StringComparison.Ordinal));
        }
    }

    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task BancoAusenteAposInicializacao_Retorna503HttpSemCaminhoNoProblema(string ambiente)
    {
        await using var fixture = await HostApiFixture.CriarAsync(
            ambiente,
            segredoLocal: SegredoValido);
        SqliteConnection.ClearAllPools();
        File.Delete(fixture.CaminhoBanco);
        Assert.IsFalse(File.Exists(fixture.CaminhoBanco));

        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/resumo?referencia=2027-03-15");
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", SegredoValido);
        using var resposta = await fixture.Cliente.SendAsync(requisicao);
        var corpo = await resposta.Content.ReadAsStringAsync();
        using var problema = JsonDocument.Parse(corpo);

        Assert.AreEqual(HttpStatusCode.ServiceUnavailable, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual(503, problema.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual("banco-ausente", problema.RootElement.GetProperty("codigo").GetString());
        Assert.IsFalse(corpo.Contains(fixture.CaminhoBanco, StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(problema.RootElement.TryGetProperty("instance", out _));
        Assert.IsFalse(File.Exists(fixture.CaminhoBanco));
    }

    [TestMethod]
    [DataRow("Development")]
    [DataRow("Production")]
    public async Task CategoriasComerciaisMantemStatusEProblemDetailsNosDoisAmbientes(string ambiente)
    {
        await using var fixture = await HostApiFixture.CriarAsync(
            ambiente,
            segredoLocal: SegredoValido);

        using (var referenciaAusente = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Get,
            "/api/v1/resumo",
            SegredoValido)))
        {
            await AssertProblemaAsync(referenciaAusente, HttpStatusCode.BadRequest, "requisicao-invalida");
        }

        using (var inexistente = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Get,
            "/api/v1/vendas/detalhe?vendaId=ausente&referencia=2027-03-15",
            SegredoValido)))
        {
            await AssertProblemaAsync(inexistente, HttpStatusCode.NotFound, "venda-inexistente");
        }

        using var cadastro = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Post,
            "/api/v1/vendas",
            SegredoValido,
            """{"nome":"Cliente sintético","cpf":"52998224725","telefone":"11987654321","descricao":null,"dataVenda":"2027-01-15","valorTotalCentavos":10000,"quantidadeParcelas":1,"referencia":"2027-03-15","revisaoEsperada":"0"}"""));
        Assert.AreEqual(HttpStatusCode.Created, cadastro.StatusCode);
        Assert.AreEqual("no-store", cadastro.Headers.CacheControl?.ToString());
        using var cadastroJson = JsonDocument.Parse(await cadastro.Content.ReadAsStringAsync());
        var vendaId = cadastroJson.RootElement.GetProperty("resumo").GetProperty("id").GetString()
            ?? throw new AssertFailedException("O cadastro HTTP não devolveu ID.");

        using (var conflito = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Put,
            "/api/v1/vendas/cliente",
            SegredoValido,
            JsonSerializer.Serialize(new
            {
                vendaId,
                nome = "Cliente obsoleto",
                cpf = "52998224725",
                telefone = "11987654321",
                descricao = (string?)null,
                referencia = "2027-03-15",
                revisaoEsperada = "0"
            }))))
        {
            await AssertProblemaAsync(conflito, HttpStatusCode.Conflict, "conflito-revisao");
        }

        using (var inativada = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Put,
            "/api/v1/vendas/status",
            SegredoValido,
            JsonSerializer.Serialize(new
            {
                vendaId,
                novoStatus = "Inativo",
                referencia = "2027-03-15",
                revisaoEsperada = "1"
            }))))
        {
            Assert.AreEqual(HttpStatusCode.OK, inativada.StatusCode);
            Assert.AreEqual("no-store", inativada.Headers.CacheControl?.ToString());
        }

        using (var regra = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Put,
            "/api/v1/vendas/status",
            SegredoValido,
            JsonSerializer.Serialize(new
            {
                vendaId,
                novoStatus = "Prejuizo",
                referencia = "2027-03-15",
                revisaoEsperada = "2"
            }))))
        {
            await AssertProblemaAsync(regra, HttpStatusCode.UnprocessableEntity, "transicao-nao-permitida");
        }

        using (var tipoConteudo = await fixture.Cliente.SendAsync(CriarRequisicao(
            HttpMethod.Post,
            "/api/v1/vendas",
            SegredoValido,
            "{}",
            "text/plain")))
        {
            await AssertProblemaAsync(tipoConteudo, HttpStatusCode.UnsupportedMediaType, "tipo-conteudo-nao-suportado");
        }
    }

    private static HttpRequestMessage CriarRequisicao(
        HttpMethod metodo,
        string caminho,
        string segredo,
        string? corpo = null,
        string tipoConteudo = "application/json")
    {
        var requisicao = new HttpRequestMessage(metodo, caminho);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        if (corpo is not null)
        {
            requisicao.Content = new StringContent(corpo, Encoding.UTF8, tipoConteudo);
        }

        return requisicao;
    }

    private static async Task AssertProblemaAsync(
        HttpResponseMessage resposta,
        HttpStatusCode status,
        string codigo)
    {
        var corpo = await resposta.Content.ReadAsStringAsync();
        using var problema = JsonDocument.Parse(corpo);

        Assert.AreEqual(status, resposta.StatusCode);
        Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual((int)status, problema.RootElement.GetProperty("status").GetInt32());
        Assert.AreEqual(codigo, problema.RootElement.GetProperty("codigo").GetString());
        Assert.IsFalse(problema.RootElement.TryGetProperty("instance", out _));
    }

    private sealed class FalhaPrivadaStartupFilter(string mensagemExcecao) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Use(async (context, proximo) =>
            {
                if (context.Request.Path.StartsWithSegments("/api/v1/__test/falha-privada"))
                {
                    throw new InvalidOperationException(mensagemExcecao);
                }

                await proximo();
            });
        };
    }

    private sealed class CapturadorLogs : ILoggerProvider, ISupportExternalScope
    {
        private readonly ConcurrentQueue<string> _mensagens = new();
        private IExternalScopeProvider _escopos = new LoggerExternalScopeProvider();

        public string Conteudo => string.Join(Environment.NewLine, _mensagens);

        public ILogger CreateLogger(string categoryName) => new CapturadorLogger(this, categoryName);

        public void SetScopeProvider(IExternalScopeProvider scopeProvider) => _escopos = scopeProvider;

        public void Dispose()
        {
        }

        private void Registrar<TState>(
            string categoria,
            LogLevel nivel,
            EventId evento,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var registro = new StringBuilder()
                .Append(categoria)
                .Append(' ')
                .Append(nivel)
                .Append(' ')
                .Append(evento.Id)
                .Append(' ')
                .Append(state)
                .Append(' ')
                .Append(formatter(state, exception));

            _escopos.ForEachScope(
                static (escopo, texto) => texto.Append(" [scope: ").Append(escopo).Append(']'),
                registro);

            if (exception is not null)
            {
                registro.Append(' ').Append(exception);
            }

            _mensagens.Enqueue(registro.ToString());
        }

        private sealed class CapturadorLogger(CapturadorLogs owner, string categoryName) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull =>
                owner._escopos.Push(state);

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                owner.Registrar(categoryName, logLevel, eventId, state, exception, formatter);
        }
    }
}
