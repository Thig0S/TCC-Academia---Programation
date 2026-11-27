using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class ConcorrenciaCommandsEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-protocolo-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "vendas.sqlite");
    }

    [TestCleanup]
    public void Limpar()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    [TestMethod]
    public async Task DoisClientesHttpNaMesmaRevisao_ConfirmamUmCommitEReabremConjuntoDoVencedor()
    {
        var segredo = CriarSegredo();
        var barreira = new BarreiraDeLeitura(participantes: 2);
        var armazenamento = new ArmazenamentoHttpInstrumentado(barreira);
        string nomeVencedor;

        await using (var fixture = await CriarFixtureAsync(segredo, armazenamento))
        using (var segundoCliente = fixture.CriarCliente())
        {
            var salvamentoInicial = await armazenamento.SalvarAsync(
                _caminhoBanco,
                [CriarVenda("alvo-a"), CriarVenda("alvo-b"), CriarVenda("inalterada")],
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamentoInicial).Valor);
            armazenamento.ZerarContadores();

            using var requisicaoA = CriarRequisicaoEditarCliente("alvo-a", "Comando A", segredo, revisao: 1);
            using var requisicaoB = CriarRequisicaoEditarCliente("alvo-b", "Comando B", segredo, revisao: 1);
            var envioA = fixture.Cliente.SendAsync(requisicaoA);
            var envioB = segundoCliente.SendAsync(requisicaoB);
            using var respostaA = await envioA.WaitAsync(TimeSpan.FromSeconds(20));
            using var respostaB = await envioB.WaitAsync(TimeSpan.FromSeconds(20));

            Assert.AreEqual(2, barreira.LeiturasLiberadas);
            Assert.AreEqual(2, armazenamento.Leituras);
            Assert.AreEqual(2, armazenamento.TentativasSalvamento);
            var respostas = new[] { respostaA, respostaB };
            Assert.AreEqual(1, respostas.Count(resposta => resposta.StatusCode == HttpStatusCode.OK));
            Assert.AreEqual(1, respostas.Count(resposta => resposta.StatusCode == HttpStatusCode.Conflict));
            foreach (var resposta in respostas)
            {
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            }

            using var documentoVencedor = JsonDocument.Parse(await respostas
                .Single(resposta => resposta.StatusCode == HttpStatusCode.OK)
                .Content.ReadAsStringAsync());
            var resumo = documentoVencedor.RootElement.GetProperty("resumo");
            Assert.AreEqual("2", resumo.GetProperty("revisao").GetString());
            nomeVencedor = resumo.GetProperty("cliente").GetProperty("nome").GetString()!;
            Assert.IsTrue(nomeVencedor is "Comando A" or "Comando B");

            using var documentoConflito = JsonDocument.Parse(await respostas
                .Single(resposta => resposta.StatusCode == HttpStatusCode.Conflict)
                .Content.ReadAsStringAsync());
            Assert.AreEqual("conflito-revisao", documentoConflito.RootElement.GetProperty("codigo").GetString());
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(3, snapshot.Conjunto.Vendas.Count);
        var vendaA = snapshot.Conjunto.Vendas.Single(venda => venda.Id == "alvo-a");
        var vendaB = snapshot.Conjunto.Vendas.Single(venda => venda.Id == "alvo-b");
        Assert.AreEqual("inalterada", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "inalterada").Id);
        Assert.AreEqual("Cliente inalterada", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "inalterada").Cliente.Nome);
        if (nomeVencedor == "Comando A")
        {
            Assert.AreEqual("Comando A", vendaA.Cliente.Nome);
            Assert.AreEqual("Cliente alvo-b", vendaB.Cliente.Nome);
        }
        else
        {
            Assert.AreEqual("Cliente alvo-a", vendaA.Cliente.Nome);
            Assert.AreEqual("Comando B", vendaB.Cliente.Nome);
        }
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count(venda => venda.Cliente.Nome is "Comando A" or "Comando B"));
    }

    [TestMethod]
    public async Task CancelamentoHttpDentroDaTransacaoSqlite_NaoConfirmaCandidatoNemViraErroComercial()
    {
        var segredo = CriarSegredo();
        var intervencao = new IntervencaoTransacionalHttp();
        var armazenamento = new ArmazenamentoHttpInstrumentado(intervencao: intervencao);

        await using (var fixture = await CriarFixtureAsync(segredo, armazenamento))
        {
            var inicial = await armazenamento.SalvarAsync(
                _caminhoBanco,
                [CriarVenda("alvo")],
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(inicial).Valor);
            armazenamento.ZerarContadores();
            intervencao.Armar(ModoIntervencao.CancelarAntesDoCommit);

            using var cancelamentoCliente = new CancellationTokenSource();
            using var requisicao = CriarRequisicaoEditarCliente("alvo", "Não confirmado", segredo, revisao: 1);
            var envio = fixture.Cliente.SendAsync(requisicao, cancelamentoCliente.Token);
            await intervencao.PrimeiraAlteracaoTransacional.Task.WaitAsync(TimeSpan.FromSeconds(15));
            Assert.IsFalse(intervencao.CommitExecutado);
            cancelamentoCliente.Cancel();

            try
            {
                using var resposta = await envio.WaitAsync(TimeSpan.FromSeconds(15));
                Assert.Fail($"Um pedido cancelado antes do commit retornou HTTP {(int)resposta.StatusCode}.");
            }
            catch (OperationCanceledException)
            {
                // O cliente cancelou o transporte; o protocolo do endpoint não inventa um Problem Details de negócio.
            }

            await armazenamento.SalvamentoConcluido.WaitAsync(TimeSpan.FromSeconds(15));
            Assert.IsTrue(intervencao.TokenCanceladoAntesDoCommit);
            Assert.IsFalse(intervencao.CommitExecutado);
            Assert.AreEqual(1, armazenamento.Leituras);
            Assert.AreEqual(1, armazenamento.TentativasSalvamento);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual("Cliente alvo", snapshot.Conjunto.Vendas.Single().Cliente.Nome);
    }

    [TestMethod]
    public async Task CancelamentoDoTokenDepoisDoCommitConfirmado_MantemSucessoHttpERevisaoConfirmada()
    {
        var segredo = CriarSegredo();
        var cancelamentoRequestAborted = new CancelamentoRequestAborted();
        var intervencao = new IntervencaoTransacionalHttp(cancelamentoRequestAborted);
        var armazenamento = new ArmazenamentoHttpInstrumentado(intervencao: intervencao);

        await using (var fixture = await CriarFixtureAsync(
            segredo,
            armazenamento,
            builder => builder.ConfigureTestServices(services =>
            {
                services.AddSingleton(cancelamentoRequestAborted);
                services.AddSingleton<IStartupFilter, SubstituirRequestAbortedStartupFilter>();
            })))
        {
            var inicial = await armazenamento.SalvarAsync(
                _caminhoBanco,
                [CriarVenda("alvo")],
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(inicial).Valor);
            armazenamento.ZerarContadores();
            intervencao.Armar(ModoIntervencao.CancelarDepoisDoCommit);

            using var resposta = await EnviarEditarClienteAsync(
                fixture.Cliente,
                CriarRequisicaoEditarCliente("alvo", "Commit confirmado", segredo, revisao: 1));
            Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual("Commit confirmado", documento.RootElement.GetProperty("resumo")
                .GetProperty("cliente").GetProperty("nome").GetString());
            Assert.AreEqual("2", documento.RootElement.GetProperty("resumo").GetProperty("revisao").GetString());
            Assert.IsTrue(intervencao.CommitExecutado);
            Assert.IsTrue(intervencao.TokenCanceladoDepoisDoCommit);
            Assert.AreEqual(1, armazenamento.Leituras);
            Assert.AreEqual(1, armazenamento.TentativasSalvamento);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual("Commit confirmado", snapshot.Conjunto.Vendas.Single().Cliente.Nome);
    }

    [TestMethod]
    public async Task ConfirmacaoIndeterminadaDepoisDeCommit_Retorna500SemRetryOuRecargaDoHandler()
    {
        var segredo = CriarSegredo();
        var intervencao = new IntervencaoTransacionalHttp();
        var armazenamento = new ArmazenamentoHttpInstrumentado(intervencao: intervencao);

        await using (var fixture = await CriarFixtureAsync(segredo, armazenamento))
        {
            var inicial = await armazenamento.SalvarAsync(
                _caminhoBanco,
                [CriarVenda("alvo")],
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(inicial).Valor);
            armazenamento.ZerarContadores();
            intervencao.Armar(ModoIntervencao.PerderConfirmacaoDepoisDoCommit);

            using var resposta = await EnviarEditarClienteAsync(
                fixture.Cliente,
                CriarRequisicaoEditarCliente("alvo", "Commit sem resposta conhecida", segredo, revisao: 1));
            var corpo = await resposta.Content.ReadAsStringAsync();
            using var problema = JsonDocument.Parse(corpo);

            Assert.AreEqual(HttpStatusCode.InternalServerError, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            Assert.AreEqual("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
            Assert.AreEqual(500, problema.RootElement.GetProperty("status").GetInt32());
            Assert.AreEqual("confirmacao-indeterminada", problema.RootElement.GetProperty("codigo").GetString());
            Assert.AreEqual("indeterminado", problema.RootElement.GetProperty("resultadoOperacao").GetString());
            Assert.IsFalse(problema.RootElement.TryGetProperty("revisao", out _));
            Assert.IsFalse(corpo.Contains("rollback", StringComparison.OrdinalIgnoreCase));
            Assert.IsFalse(corpo.Contains("Commit sem resposta conhecida", StringComparison.Ordinal));
            Assert.IsTrue(intervencao.CommitExecutado);
            Assert.AreEqual(1, armazenamento.Leituras);
            Assert.AreEqual(1, armazenamento.TentativasSalvamento);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual("Commit sem resposta conhecida", snapshot.Conjunto.Vendas.Single().Cliente.Nome);
    }

    private async Task<HostApiFixture> CriarFixtureAsync(
        string segredo,
        ArmazenamentoHttpInstrumentado armazenamento,
        Action<IWebHostBuilder>? configurar = null) =>
        await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.RemoveAll<IArmazenamentoVendas>();
                    services.AddSingleton<IArmazenamentoVendas>(armazenamento);
                });
                configurar?.Invoke(builder);
            });

    private static HttpRequestMessage CriarRequisicaoEditarCliente(
        string vendaId,
        string nome,
        string segredo,
        long revisao)
    {
        var body = JsonSerializer.Serialize(new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["vendaId"] = vendaId,
            ["nome"] = nome,
            ["cpf"] = "52998224725",
            ["telefone"] = "11987654321",
            ["descricao"] = null,
            ["referencia"] = Referencia.ToString("yyyy-MM-dd"),
            ["revisaoEsperada"] = revisao.ToString(System.Globalization.CultureInfo.InvariantCulture)
        });
        var requisicao = new HttpRequestMessage(HttpMethod.Put, "/api/v1/vendas/cliente")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return requisicao;
    }

    private static async Task<HttpResponseMessage> EnviarEditarClienteAsync(
        HttpClient cliente,
        HttpRequestMessage requisicao) => await cliente.SendAsync(requisicao);

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Venda CriarVenda(string id) =>
        Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar($"Cliente {id}", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela-1"],
            Referencia));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class BarreiraDeLeitura(int participantes)
    {
        private readonly TaskCompletionSource _liberacao = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _leiturasLiberadas;

        public int LeiturasLiberadas => Volatile.Read(ref _leiturasLiberadas);

        public async Task AguardarAsync(CancellationToken cancellationToken)
        {
            if (Interlocked.Increment(ref _leiturasLiberadas) == participantes)
            {
                _liberacao.TrySetResult();
            }

            await _liberacao.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
        }
    }

    private sealed class CancelamentoRequestAborted
    {
        private readonly CancellationTokenSource _fonte = new();

        public CancellationToken Token => _fonte.Token;

        public void Cancelar() => _fonte.Cancel();
    }

    private sealed class SubstituirRequestAbortedStartupFilter(
        CancelamentoRequestAborted cancelamento) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (contexto, proximo) =>
            {
                if (contexto.Request.Path.StartsWithSegments("/api/v1"))
                {
                    contexto.RequestAborted = cancelamento.Token;
                }

                await proximo(contexto);
            });
            next(app);
        };
    }

    private enum ModoIntervencao
    {
        Desarmada,
        CancelarAntesDoCommit,
        CancelarDepoisDoCommit,
        PerderConfirmacaoDepoisDoCommit
    }

    private sealed class IntervencaoTransacionalHttp(
        CancelamentoRequestAborted? cancelamentoRequestAborted = null) :
        IIntervencaoTransacionalGravacaoSqlite
    {
        private int _modo;
        private int _commitExecutado;
        private int _tokenCanceladoAntesDoCommit;
        private int _tokenCanceladoDepoisDoCommit;

        public TaskCompletionSource PrimeiraAlteracaoTransacional { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public bool CommitExecutado => Volatile.Read(ref _commitExecutado) == 1;

        public bool TokenCanceladoAntesDoCommit => Volatile.Read(ref _tokenCanceladoAntesDoCommit) == 1;

        public bool TokenCanceladoDepoisDoCommit => Volatile.Read(ref _tokenCanceladoDepoisDoCommit) == 1;

        public void Armar(ModoIntervencao modo)
        {
            Interlocked.Exchange(ref _commitExecutado, 0);
            Interlocked.Exchange(ref _tokenCanceladoAntesDoCommit, 0);
            Interlocked.Exchange(ref _tokenCanceladoDepoisDoCommit, 0);
            Interlocked.Exchange(ref _modo, (int)modo);
        }

        public async Task DepoisDaPrimeiraAlteracaoAsync(CancellationToken cancellationToken)
        {
            if (Volatile.Read(ref _modo) != (int)ModoIntervencao.CancelarAntesDoCommit)
            {
                return;
            }

            PrimeiraAlteracaoTransacional.TrySetResult();
            try
            {
                await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                Interlocked.Exchange(ref _tokenCanceladoAntesDoCommit, 1);
                throw;
            }
        }

        public async Task ConfirmarAsync(IDbContextTransaction transacao, CancellationToken cancellationToken)
        {
            var modo = (ModoIntervencao)Volatile.Read(ref _modo);
            if (modo == ModoIntervencao.CancelarAntesDoCommit)
            {
                throw new InvalidOperationException("O teste esperava cancelamento antes da confirmação.");
            }

            await transacao.CommitAsync(cancellationToken);
            Interlocked.Exchange(ref _commitExecutado, 1);

            if (modo == ModoIntervencao.CancelarDepoisDoCommit)
            {
                (cancelamentoRequestAborted
                    ?? throw new InvalidOperationException("O token tardio de RequestAborted não foi configurado."))
                    .Cancelar();
                Interlocked.Exchange(ref _tokenCanceladoDepoisDoCommit, cancellationToken.IsCancellationRequested ? 1 : 0);
            }
            else if (modo == ModoIntervencao.PerderConfirmacaoDepoisDoCommit)
            {
                throw new IOException("acknowledgement synthetic lost after SQLite commit");
            }
        }
    }

    private sealed class ArmazenamentoHttpInstrumentado : IArmazenamentoVendas
    {
        private readonly ArmazenamentoVendasSqlite _interno = new();
        private readonly GravadorVendasSqlite _gravador;
        private readonly BarreiraDeLeitura? _barreira;
        private int _leituras;
        private int _tentativasSalvamento;
        private TaskCompletionSource _salvamentoConcluido =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public ArmazenamentoHttpInstrumentado(
            BarreiraDeLeitura? barreira = null,
            IntervencaoTransacionalHttp? intervencao = null)
        {
            _barreira = barreira;
            _gravador = intervencao is null
                ? new GravadorVendasSqlite()
                : new GravadorVendasSqlite(intervencao);
        }

        public int Leituras => Volatile.Read(ref _leituras);

        public int TentativasSalvamento => Volatile.Read(ref _tentativasSalvamento);

        public Task SalvamentoConcluido => _salvamentoConcluido.Task;

        public void ZerarContadores()
        {
            Interlocked.Exchange(ref _leituras, 0);
            Interlocked.Exchange(ref _tentativasSalvamento, 0);
            _salvamentoConcluido = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
            string caminhoAbsoluto,
            CancellationToken cancellationToken = default) =>
            _interno.InicializarAsync(caminhoAbsoluto, cancellationToken);

        public async Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref _leituras);
            var resultado = await _interno.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);
            if (resultado is ResultadoArmazenamento<SnapshotVendas>.Sucesso && _barreira is not null)
            {
                await _barreira.AguardarAsync(cancellationToken);
            }

            return resultado;
        }

        public async Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref _tentativasSalvamento);
            try
            {
                return await _gravador.SalvarAsync(
                    caminhoAbsoluto,
                    candidatoCompleto,
                    revisaoEsperada,
                    referencia,
                    cancellationToken);
            }
            finally
            {
                _salvamentoConcluido.TrySetResult();
            }
        }
    }
}
