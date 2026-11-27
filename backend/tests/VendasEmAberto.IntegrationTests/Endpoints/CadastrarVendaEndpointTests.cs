using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class CadastrarVendaEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-cadastro-{Guid.NewGuid():N}");
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
    public async Task PostVenda_CadastraParcelasRetornaLocationCodificadaEConsultaAposReinicio()
    {
        const string idVenda = "venda/%+?#🧾";
        const string idParcela1 = "parcela/1%+?#";
        const string idParcela2 = "parcela-2";
        const string idParcela3 = "parcela-3";
        var segredo = CriarSegredo();
        var gerador = new GeradorSequencial(idVenda, idParcela1, idParcela2, idParcela3);
        string location;

        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IGeradorIdentificadores>();
                services.AddSingleton<IGeradorIdentificadores>(gerador);
            })))
        {
            using var resposta = await EnviarAsync(
                inicial.Cliente,
                segredo,
                CriarCorpoCadastro(
                    valorTotalCentavos: 10_000,
                    quantidadeParcelas: 3,
                    camposExtras: true,
                    incluirEntrada: false));

            Assert.AreEqual(HttpStatusCode.Created, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
            Assert.IsTrue(resposta.Headers.Location?.IsAbsoluteUri is false);
            location = resposta.Headers.Location!.OriginalString;
            Assert.AreEqual(
                "/api/v1/vendas/detalhe?vendaId=" + Uri.EscapeDataString(idVenda)
                    + "&referencia=2027-03-15",
                location);

            using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            var raiz = documento.RootElement;
            var resumo = raiz.GetProperty("resumo");
            Assert.AreEqual(idVenda, resumo.GetProperty("id").GetString());
            Assert.AreEqual("1", resumo.GetProperty("revisao").GetString());
            Assert.AreEqual("2027-03-15", resumo.GetProperty("referencia").GetString());
            Assert.AreEqual("Cliente HTTP 🪻", resumo.GetProperty("cliente").GetProperty("nome").GetString());
            Assert.AreEqual("52998224725", resumo.GetProperty("cliente").GetProperty("cpf").GetString());
            Assert.AreEqual("11987654321", resumo.GetProperty("cliente").GetProperty("telefone").GetString());
            Assert.IsNull(resumo.GetProperty("cliente").GetProperty("descricao").GetString());
            Assert.AreEqual(10_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
            Assert.AreEqual(10_000L, resumo.GetProperty("valorTotalEfetivoCentavos").GetInt64());

            var parcelas = raiz.GetProperty("parcelas").EnumerateArray().ToArray();
            CollectionAssert.AreEqual(new[] { idParcela1, idParcela2, idParcela3 },
                parcelas.Select(parcela => parcela.GetProperty("id").GetString()).ToArray());
            CollectionAssert.AreEqual(new long[] { 3_334, 3_333, 3_333 },
                parcelas.Select(parcela => parcela.GetProperty("valorBaseCentavos").GetInt64()).ToArray());
            CollectionAssert.AreEqual(new[] { 1, 2, 3 },
                parcelas.Select(parcela => parcela.GetProperty("numero").GetInt32()).ToArray());
            CollectionAssert.AreEqual(
                new[] { "2027-02-15", "2027-03-15", "2027-04-15" },
                parcelas.Select(parcela => parcela.GetProperty("vencimento").GetString()).ToArray());
            Assert.AreEqual(0, raiz.GetProperty("recebimentos").GetArrayLength());
            Assert.AreEqual(4, gerador.QuantidadeGerada);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, location);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        using var detalhe = await reaberto.Cliente.SendAsync(requisicao);

        Assert.AreEqual(HttpStatusCode.OK, detalhe.StatusCode);
        Assert.AreEqual("no-store", detalhe.Headers.CacheControl?.ToString());
        using var jsonDetalhe = JsonDocument.Parse(await detalhe.Content.ReadAsStringAsync());
        Assert.AreEqual(idVenda, jsonDetalhe.RootElement.GetProperty("resumo").GetProperty("id").GetString());
        Assert.AreEqual("1", jsonDetalhe.RootElement.GetProperty("resumo").GetProperty("revisao").GetString());
        CollectionAssert.AreEqual(new[] { idParcela1, idParcela2, idParcela3 },
            jsonDetalhe.RootElement.GetProperty("parcelas").EnumerateArray()
                .Select(parcela => parcela.GetProperty("id").GetString()).ToArray());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(idVenda, snapshot.Conjunto.Vendas.Single().Id);
    }

    [TestMethod]
    public async Task PostVenda_ComEntradaAlocaUmaVezESemSomarEntradaDuasVezes()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);

        using var resposta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            CriarCorpoCadastro(
                valorTotalCentavos: 20_000,
                quantidadeParcelas: 2,
                entradaJson: """{"valorCentavos":10000,"forma":"Pix"}"""));

        Assert.AreEqual(HttpStatusCode.Created, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        var resumo = raiz.GetProperty("resumo");
        Assert.AreEqual("1", resumo.GetProperty("revisao").GetString());
        Assert.AreEqual(20_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(20_000L, resumo.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(10_000L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(10_000L, resumo.GetProperty("saldoCentavos").GetInt64());

        var parcelas = raiz.GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.AreEqual(2, parcelas.Length);
        CollectionAssert.AreEqual(new long[] { 10_000, 10_000 },
            parcelas.Select(parcela => parcela.GetProperty("valorBaseCentavos").GetInt64()).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 0 },
            parcelas.Select(parcela => parcela.GetProperty("valorRecebidoCentavos").GetInt64()).ToArray());
        Assert.AreEqual(10_000L, parcelas.Sum(parcela => parcela.GetProperty("valorRecebidoCentavos").GetInt64()));

        var recebimentos = raiz.GetProperty("recebimentos").EnumerateArray().ToArray();
        Assert.AreEqual(1, recebimentos.Length);
        Assert.AreEqual("Entrada", recebimentos[0].GetProperty("origem").GetString());
        Assert.AreEqual("Pix", recebimentos[0].GetProperty("forma").GetString());
        Assert.AreEqual(10_000L, recebimentos[0].GetProperty("valorCentavos").GetInt64());
        Assert.AreEqual(1, recebimentos[0].GetProperty("alocacoes").GetArrayLength());
        Assert.AreEqual(parcelas[0].GetProperty("id").GetString(),
            recebimentos[0].GetProperty("alocacoes")[0].GetProperty("parcelaId").GetString());
        Assert.AreEqual("1", raiz.GetProperty("resumo").GetProperty("revisao").GetString());
    }

    [TestMethod]
    public async Task PostVenda_EntradasInvalidasNaoSalvamCandidatoNemAvancamRevisao()
    {
        var segredo = CriarSegredo();
        var contador = new ContadorSalvamentos();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador)));
        var armazenamentoContado = fixture.Servicos.GetRequiredService<ArmazenamentoComContador>();
        contador.Zerar();

        var casos = new[]
        {
            (Body: CriarCorpoCadastro(cpf: "00000000000"), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "cpf-invalido"),
            (Body: CriarCorpoCadastro(entradaJson: """{"valorCentavos":10000,"forma":"Pix"}"""), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "valor-invalido"),
            (Body: CriarCorpoCadastro(entradaJson: """{"valorCentavos":20000,"forma":"Pix"}"""), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "valor-invalido"),
            (Body: CriarCorpoCadastro(dataVenda: "9999-12-31", referencia: "9999-12-31", valorTotalCentavos: 10_000, quantidadeParcelas: 1), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "data-invalida"),
            (Body: CriarCorpoCadastro(revisaoEsperadaJson: "\"00\""), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "requisicao-invalida"),
            (Body: CriarCorpoCadastro(revisaoEsperadaJson: "\"1\""), ContentType: "application/json", Status: HttpStatusCode.Conflict, Codigo: "conflito-revisao"),
            (Body: CriarCorpoCadastro(entradaJson: """{"valorCentavos":1000,"forma":"pix"}"""), ContentType: "application/json", Status: HttpStatusCode.BadRequest, Codigo: "requisicao-invalida")
        };

        foreach (var caso in casos)
        {
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, caso.Body, caso.ContentType);
            Assert.AreEqual(caso.Status, resposta.StatusCode, caso.Body);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), caso.Body);
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual(caso.Codigo, problema.RootElement.GetProperty("codigo").GetString(), caso.Body);
        }

        using (var tipoNaoSuportado = await EnviarAsync(
            fixture.Cliente,
            segredo,
            CriarCorpoCadastro(),
            "text/plain"))
        {
            Assert.AreEqual(HttpStatusCode.UnsupportedMediaType, tipoNaoSuportado.StatusCode);
            Assert.AreEqual("no-store", tipoNaoSuportado.Headers.CacheControl?.ToString());
            using var problema = JsonDocument.Parse(await tipoNaoSuportado.Content.ReadAsStringAsync());
            Assert.AreEqual("tipo-conteudo-nao-suportado", problema.RootElement.GetProperty("codigo").GetString());
        }

        Assert.AreEqual(0, armazenamentoContado.Salvamentos);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(0, armazenamentoContado.Salvamentos);
    }

    private static string CriarCorpoCadastro(
        long valorTotalCentavos = 10_000,
        int quantidadeParcelas = 3,
        string cpf = "52998224725",
        string dataVenda = "2027-01-15",
        string referencia = "2027-03-15",
        string revisaoEsperadaJson = "\"0\"",
        string entradaJson = "null",
        bool camposExtras = false,
        bool incluirEntrada = true)
    {
        var camposExtrasJson = camposExtras
            ? "\"id\":\"id-controlado-pelo-cliente\",\"statusAdministrativo\":\"Prejuizo\",\"valorRecebidoCentavos\":999999,"
            : string.Empty;
        var entradaCampoJson = incluirEntrada ? $",\n  \"entrada\":{entradaJson}" : string.Empty;

        return $$"""
            {
              {{camposExtrasJson}}
              "nome":" Cliente HTTP 🪻 ",
              "cpf":"{{cpf}}",
              "telefone":"(11) 98765-4321",
              "descricao":null,
              "dataVenda":"{{dataVenda}}",
              "valorTotalCentavos":{{valorTotalCentavos}},
              "quantidadeParcelas":{{quantidadeParcelas}},
              "referencia":"{{referencia}}",
              "revisaoEsperada":{{revisaoEsperadaJson}}{{entradaCampoJson}}
            }
            """;
    }

    private static async Task<HttpResponseMessage> EnviarAsync(
        HttpClient cliente,
        string segredo,
        string body,
        string contentType = "application/json")
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/v1/vendas")
        {
            Content = new StringContent(body, Encoding.UTF8, contentType)
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static void DecorarArmazenamento(IServiceCollection servicos, ContadorSalvamentos contador)
    {
        var registroOriginal = servicos.Last(registro => registro.ServiceType == typeof(IArmazenamentoVendas));
        var fabricaOriginal = registroOriginal.ImplementationFactory
            ?? throw new InvalidOperationException("O registro SQLite esperado não é uma fábrica.");
        servicos.Remove(registroOriginal);
        servicos.AddSingleton(contador);
        servicos.AddSingleton<ArmazenamentoComContador>(provider => new ArmazenamentoComContador(
            (IArmazenamentoVendas)fabricaOriginal(provider),
            contador));
        servicos.AddSingleton<IArmazenamentoVendas>(provider =>
            provider.GetRequiredService<ArmazenamentoComContador>());
    }

    private sealed class GeradorSequencial(params string[] identificadores) : IGeradorIdentificadores
    {
        private int _indice;

        public int QuantidadeGerada => Volatile.Read(ref _indice);

        public string Gerar()
        {
            var indice = Interlocked.Increment(ref _indice) - 1;
            return indice < identificadores.Length
                ? identificadores[indice]
                : throw new InvalidOperationException("O gerador sintético não possui outro identificador.");
        }
    }

    private sealed class ContadorSalvamentos
    {
        private int _salvamentos;

        public int Salvamentos => Volatile.Read(ref _salvamentos);

        public void Zerar() => Interlocked.Exchange(ref _salvamentos, 0);

        public void Registrar() => Interlocked.Increment(ref _salvamentos);
    }

    private sealed class ArmazenamentoComContador(
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
