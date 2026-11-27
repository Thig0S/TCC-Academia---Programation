using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class CorrigirPagamentoEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-correcao-{Guid.NewGuid():N}");
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
    public async Task PutRecebimento_CorrigeAcréscimoDataEObservacaoPreservandoIdentidadeEReabre()
    {
        var segredo = CriarSegredo();
        var contador = new ContadorSalvamentos();
        await using (var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador))))
        {
            var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoContado>();
            var alvo = CriarVenda("alvo", 30_000, 3);
            alvo = Registrar(alvo, "recibo-a", "alvo-parcela-1", 11_000, new DateOnly(2027, 2, 10), FormaPagamento.Pix, "nota original");
            alvo = Registrar(alvo, "recibo-b", "alvo-parcela-2", 10_000, new DateOnly(2027, 2, 12), FormaPagamento.Dinheiro, "segunda nota");
            var outra = Registrar(
                CriarVenda("outra", 10_000, 1),
                "recibo-outra",
                "outra-parcela-1",
                10_000,
                new DateOnly(2027, 2, 15),
                FormaPagamento.Pix,
                null);
            var salvo = await armazenamento.SalvarAsync(
                _caminhoBanco,
                [alvo, outra],
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
            contador.Zerar();

            const string body = """
                {
                  "vendaId":"alvo",
                  "recebimentoId":"recibo-a",
                  "valorRecebidoCentavos":10500,
                  "data":"2027-03-10",
                  "forma":"CartaoCredito",
                  "observacao":"Corrigido em março ✅",
                  "referencia":"2027-03-31",
                  "revisaoEsperada":"1"
                }
                """;
            using (var resposta = await EnviarAsync(fixture.Cliente, segredo, body))
            {
                Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
                Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
                Assert.IsFalse(resposta.Headers.Contains("Location"));
                using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                AssertDetalheCorrigido(documento.RootElement, revisao: 2);
            }

            const string bodyIdentico = """
                {
                  "vendaId":"alvo",
                  "recebimentoId":"recibo-a",
                  "valorRecebidoCentavos":10500,
                  "data":"2027-03-10",
                  "forma":"CartaoCredito",
                  "observacao":"Corrigido em março ✅",
                  "referencia":"2027-03-31",
                  "revisaoEsperada":"2"
                }
                """;
            using (var repetido = await EnviarAsync(fixture.Cliente, segredo, bodyIdentico))
            {
                Assert.AreEqual(HttpStatusCode.OK, repetido.StatusCode);
                Assert.AreEqual("no-store", repetido.Headers.CacheControl?.ToString());
                Assert.IsFalse(repetido.Headers.Contains("Location"));
                using var documento = JsonDocument.Parse(await repetido.Content.ReadAsStringAsync());
                AssertDetalheCorrigido(documento.RootElement, revisao: 3);
                Assert.AreEqual(2, documento.RootElement.GetProperty("recebimentos").GetArrayLength());
            }

            Assert.AreEqual(2, armazenamento.Salvamentos);

            using (var fevereiro = await EnviarGetAsync(
                fixture.Cliente,
                segredo,
                "/api/v1/periodo?inicio=2027-02-01&fim=2027-02-28&referencia=2027-03-31"))
            {
                Assert.AreEqual(HttpStatusCode.OK, fevereiro.StatusCode);
                Assert.AreEqual("no-store", fevereiro.Headers.CacheControl?.ToString());
                using var documento = JsonDocument.Parse(await fevereiro.Content.ReadAsStringAsync());
                Assert.AreEqual(20_000L, documento.RootElement.GetProperty("recebidosCentavos").GetInt64());
                Assert.AreEqual("3", documento.RootElement.GetProperty("revisao").GetString());
            }

            using (var marco = await EnviarGetAsync(
                fixture.Cliente,
                segredo,
                "/api/v1/periodo?inicio=2027-03-01&fim=2027-03-31&referencia=2027-03-31"))
            {
                Assert.AreEqual(HttpStatusCode.OK, marco.StatusCode);
                Assert.AreEqual("no-store", marco.Headers.CacheControl?.ToString());
                using var documento = JsonDocument.Parse(await marco.Content.ReadAsStringAsync());
                Assert.AreEqual(10_500L, documento.RootElement.GetProperty("recebidosCentavos").GetInt64());
                Assert.AreEqual("3", documento.RootElement.GetProperty("revisao").GetString());
            }
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(3L, snapshot.Revisao);
        Assert.AreEqual(2, snapshot.Conjunto.Vendas.Count);

        var persistida = snapshot.Conjunto.Vendas[0];
        Assert.AreEqual("alvo", persistida.Id);
        Assert.AreEqual(30_000L, persistida.ValorTotalBase.Centavos);
        Assert.AreEqual(3, persistida.Parcelas.Count);
        Assert.AreEqual(2, persistida.Recebimentos.Count);
        Assert.AreEqual("recibo-a", persistida.Recebimentos[0].Id);
        Assert.AreEqual("alvo-parcela-1", persistida.Recebimentos[0].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_500L, persistida.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(500L, persistida.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual(new DateOnly(2027, 3, 10), persistida.Recebimentos[0].Data);
        Assert.AreEqual(FormaPagamento.CartaoCredito, persistida.Recebimentos[0].Forma);
        Assert.AreEqual("Corrigido em março ✅", persistida.Recebimentos[0].Observacao);
        Assert.AreEqual("recibo-b", persistida.Recebimentos[1].Id);
        Assert.AreEqual(new DateOnly(2027, 2, 12), persistida.Recebimentos[1].Data);
        Assert.AreEqual(10_000L, persistida.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual("alvo-parcela-2", persistida.Recebimentos[1].Alocacoes.Single().ParcelaId);
        Assert.AreEqual("recibo-outra", snapshot.Conjunto.Vendas[1].Recebimentos.Single().Id);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[1].Recebimentos.Single().Valor.Centavos);
    }

    [TestMethod]
    public async Task PutRecebimento_FalhasTipadasNaoSalvamNemAlteramHistorico()
    {
        var segredo = CriarSegredo();
        var contador = new ContadorSalvamentos();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador)));
        var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoContado>();

        var alvo = Registrar(
            CriarVenda("alvo", 20_000, 2),
            "recibo-a",
            "alvo-parcela-1",
            10_000,
            new DateOnly(2027, 2, 10),
            FormaPagamento.Pix,
            "original");
        var externa = Registrar(
            CriarVenda("externa", 10_000, 1),
            "recibo-externo",
            "externa-parcela-1",
            10_000,
            new DateOnly(2027, 2, 11),
            FormaPagamento.Pix,
            null);
        var entrada = CriarVendaComEntrada();
        var lote = CriarVendaComLote();
        var inativa = Sucesso(Registrar(
            CriarVenda("inativa", 20_000, 2),
            "inativa-recibo",
            "inativa-parcela-1",
            10_000,
            new DateOnly(2027, 2, 12),
            FormaPagamento.Pix,
            null).AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var vendas = new[] { alvo, externa, entrada, lote, inativa };
        var salvo = await armazenamento.SalvarAsync(
            _caminhoBanco,
            vendas,
            revisaoEsperada: 0,
            Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        contador.Zerar();

        var casos = new[]
        {
            (Body: CriarCorpo("alvo", "nao-existe", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.NotFound, Codigo: "recebimento-inexistente", Campo: "recebimentoId"),
            (Body: CriarCorpo("alvo", "recibo-externo", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "recebimento-de-outra-venda", Campo: "recebimentoId"),
            (Body: CriarCorpo("entrada", "recibo-entrada", 5_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "recebimento-historico-nao-editavel", Campo: "recebimentoId"),
            (Body: CriarCorpo("lote", "recibo-lote", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "recebimento-historico-nao-editavel", Campo: "recebimentoId"),
            (Body: CriarCorpo("inativa", "inativa-recibo", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "venda-nao-ativa", Campo: "statusAdministrativo"),
            (Body: CriarCorpo("alvo", "recibo-a", 9_999, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "valor-recebido-inferior-ao-base", Campo: "valorRecebido"),
            (Body: CriarCorpo("alvo", "recibo-a", 10_000, "2027-04-01", "Pix", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "dados-recebimento-invalidos", Campo: "data"),
            (Body: CriarCorpo("alvo", "recibo-a", 10_000, "2027-03-10", "bitcoin", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "requisicao-invalida", Campo: "forma"),
            (Body: CriarCorpo("alvo", "recibo-a", 10_000, "2027-03-10", "Pix", string.Concat(Enumerable.Repeat("😀", 21)), 1), Status: HttpStatusCode.BadRequest, Codigo: "observacao-longa-demais", Campo: "observacao"),
            (Body: CriarCorpo("alvo", "recibo-a", 10_000, "2027-03-10", "Pix", null, 0), Status: HttpStatusCode.Conflict, Codigo: "conflito-revisao", Campo: "revisaoEsperada")
        };

        foreach (var caso in casos)
        {
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, caso.Body);
            Assert.AreEqual(caso.Status, resposta.StatusCode, caso.Codigo);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), caso.Codigo);
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual(caso.Codigo, problema.RootElement.GetProperty("codigo").GetString());
            Assert.AreEqual(caso.Campo, problema.RootElement.GetProperty("campo").GetString());
            Assert.AreEqual(0, armazenamento.Salvamentos, caso.Codigo);
        }

        var semForma = """
            {"vendaId":"alvo","recebimentoId":"recibo-a","valorRecebidoCentavos":10000,"data":"2027-03-10","forma":0,"referencia":"2027-03-31","revisaoEsperada":"1"}
            """;
        using (var resposta = await EnviarAsync(fixture.Cliente, segredo, semForma))
        {
            Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
            Assert.AreEqual("forma", problema.RootElement.GetProperty("campo").GetString());
        }

        Assert.AreEqual(0, armazenamento.Salvamentos);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual("recibo-a", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "alvo").Recebimentos.Single().Id);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas.Single(venda => venda.Id == "alvo").Recebimentos.Single().Valor.Centavos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    private static void AssertDetalheCorrigido(JsonElement detalhe, long revisao)
    {
        var resumo = detalhe.GetProperty("resumo");
        Assert.AreEqual("alvo", resumo.GetProperty("id").GetString());
        Assert.AreEqual(revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            resumo.GetProperty("revisao").GetString());
        Assert.AreEqual("2027-03-31", resumo.GetProperty("referencia").GetString());
        Assert.AreEqual(30_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(500L, resumo.GetProperty("totalAcrescimosCentavos").GetInt64());
        Assert.AreEqual(30_500L, resumo.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(20_500L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(10_000L, resumo.GetProperty("saldoCentavos").GetInt64());

        var parcelas = detalhe.GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.AreEqual(3, parcelas.Length);
        Assert.AreEqual("alvo-parcela-1", parcelas[0].GetProperty("id").GetString());
        Assert.AreEqual(10_000L, parcelas[0].GetProperty("valorBaseCentavos").GetInt64());
        Assert.AreEqual(10_500L, parcelas[0].GetProperty("valorRecebidoCentavos").GetInt64());
        Assert.AreEqual(500L, parcelas[0].GetProperty("acrescimoCentavos").GetInt64());
        Assert.AreEqual(0L, parcelas[0].GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual("alvo-parcela-2", parcelas[1].GetProperty("id").GetString());
        Assert.AreEqual(10_000L, parcelas[1].GetProperty("valorRecebidoCentavos").GetInt64());
        Assert.AreEqual(0L, parcelas[1].GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual("alvo-parcela-3", parcelas[2].GetProperty("id").GetString());
        Assert.AreEqual(10_000L, parcelas[2].GetProperty("saldoCentavos").GetInt64());

        var recebimentos = detalhe.GetProperty("recebimentos").EnumerateArray().ToArray();
        Assert.AreEqual(2, recebimentos.Length);
        Assert.AreEqual("recibo-a", recebimentos[0].GetProperty("id").GetString());
        Assert.AreEqual("2027-03-10", recebimentos[0].GetProperty("data").GetString());
        Assert.AreEqual("CartaoCredito", recebimentos[0].GetProperty("forma").GetString());
        Assert.AreEqual("Individual", recebimentos[0].GetProperty("origem").GetString());
        Assert.AreEqual(10_500L, recebimentos[0].GetProperty("valorCentavos").GetInt64());
        Assert.AreEqual(500L, recebimentos[0].GetProperty("acrescimoCentavos").GetInt64());
        Assert.AreEqual("Corrigido em março ✅", recebimentos[0].GetProperty("observacao").GetString());
        Assert.AreEqual("alvo-parcela-1", recebimentos[0].GetProperty("alocacoes")[0]
            .GetProperty("parcelaId").GetString());
        Assert.AreEqual("recibo-b", recebimentos[1].GetProperty("id").GetString());
        Assert.AreEqual("2027-02-12", recebimentos[1].GetProperty("data").GetString());
        Assert.AreEqual(10_000L, recebimentos[1].GetProperty("valorCentavos").GetInt64());
        Assert.AreEqual("alvo-parcela-2", recebimentos[1].GetProperty("alocacoes")[0]
            .GetProperty("parcelaId").GetString());
    }

    private static string CriarCorpo(
        string vendaId,
        string recebimentoId,
        long valorRecebidoCentavos,
        string data,
        string forma,
        string? observacao,
        long revisao)
    {
        return JsonSerializer.Serialize(new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["vendaId"] = vendaId,
            ["recebimentoId"] = recebimentoId,
            ["valorRecebidoCentavos"] = valorRecebidoCentavos,
            ["data"] = data,
            ["forma"] = forma,
            ["observacao"] = observacao,
            ["referencia"] = Referencia.ToString("yyyy-MM-dd"),
            ["revisaoEsperada"] = revisao.ToString(System.Globalization.CultureInfo.InvariantCulture)
        });
    }

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string body)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Put, "/api/v1/recebimentos")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static async Task<HttpResponseMessage> EnviarGetAsync(HttpClient cliente, string segredo, string caminho)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, caminho);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Venda CriarVenda(string id, long valor, int quantidade) => Sucesso(Venda.Cadastrar(
        id,
        Sucesso(DadosClienteVenda.Criar($"Cliente {id}", "52998224725", "11987654321", null)),
        new DateOnly(2027, 1, 15),
        Sucesso(Dinheiro.Criar(valor)),
        quantidade,
        Enumerable.Range(1, quantidade).Select(indice => $"{id}-parcela-{indice}").ToArray(),
        Referencia));

    private static Venda CriarVendaComEntrada() => Sucesso(Venda.Cadastrar(
        "entrada",
        Cliente(),
        new DateOnly(2027, 1, 15),
        DinheiroValor(20_000),
        2,
        ["entrada-parcela-1", "entrada-parcela-2"],
        Referencia,
        new DadosEntradaVenda("recibo-entrada", DinheiroValor(5_000), new DateOnly(2027, 1, 15), FormaPagamento.Pix)));

    private static Venda CriarVendaComLote() => Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
        "lote",
        StatusAdministrativoVenda.Ativo,
        Cliente(),
        new DateOnly(2027, 1, 15),
        DinheiroValor(20_000),
        [
            new("lote-parcela-1", 1, DinheiroValor(10_000), new DateOnly(2027, 2, 15)),
            new("lote-parcela-2", 2, DinheiroValor(10_000), new DateOnly(2027, 3, 15))
        ],
        [
            new("recibo-lote", new DateOnly(2027, 2, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                OrigemRecebimento.HistoricoLote, DinheiroValor(0), null,
                [new("lote-parcela-1", DinheiroValor(10_000))])
        ]), Referencia));

    private static Venda Registrar(
        Venda venda,
        string recebimentoId,
        string parcelaId,
        long valor,
        DateOnly data,
        FormaPagamento forma,
        string? observacao) =>
        Sucesso(venda.RegistrarPagamento(
            recebimentoId,
            parcelaId,
            DinheiroValor(valor),
            data,
            forma,
            Referencia,
            observacao));

    private static DadosClienteVenda Cliente() =>
        Sucesso(DadosClienteVenda.Criar("Cliente sintético", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private static void DecorarArmazenamento(IServiceCollection servicos, ContadorSalvamentos contador)
    {
        var registroOriginal = servicos.Last(registro => registro.ServiceType == typeof(IArmazenamentoVendas));
        var fabricaOriginal = registroOriginal.ImplementationFactory
            ?? throw new InvalidOperationException("O registro SQLite esperado não é uma fábrica.");
        servicos.Remove(registroOriginal);
        servicos.AddSingleton(contador);
        servicos.AddSingleton<ArmazenamentoContado>(provider => new ArmazenamentoContado(
            (IArmazenamentoVendas)fabricaOriginal(provider),
            contador));
        servicos.AddSingleton<IArmazenamentoVendas>(provider =>
            provider.GetRequiredService<ArmazenamentoContado>());
    }

    private sealed class ContadorSalvamentos
    {
        private int _salvamentos;

        public int Salvamentos => Volatile.Read(ref _salvamentos);

        public void Zerar() => Interlocked.Exchange(ref _salvamentos, 0);

        public void Registrar() => Interlocked.Increment(ref _salvamentos);
    }

    private sealed class ArmazenamentoContado(
        IArmazenamentoVendas interno,
        ContadorSalvamentos contador) : IArmazenamentoVendas
    {
        public int Salvamentos => contador.Salvamentos;

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
            string caminhoAbsoluto,
            CancellationToken cancellationToken = default) =>
            interno.InicializarAsync(caminhoAbsoluto, cancellationToken);

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default) =>
            interno.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            contador.Registrar();
            return interno.SalvarAsync(
                caminhoAbsoluto,
                candidatoCompleto,
                revisaoEsperada,
                referencia,
                cancellationToken);
        }
    }
}
