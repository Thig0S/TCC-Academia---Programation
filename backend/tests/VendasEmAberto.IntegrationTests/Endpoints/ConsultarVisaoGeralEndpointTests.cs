using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class ConsultarVisaoGeralEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-visao-geral-{Guid.NewGuid():N}");
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
    public async Task GetVisaoGeral_MapeiaEnvelopeCompletoComUmaCargaESemMutacao()
    {
        var segredo = CriarSegredo();
        var vendas = CriarCenarioPersistido().ToList();
        var quitadaRecente = CriarVenda(
            "sqlite-recente-quitada", new DateOnly(2027, 3, 14), 100, quantidadeParcelas: 1);
        vendas.Add(Registrar(quitadaRecente, "sqlite-recente-quitada-pagamento", 100, Referencia));

        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var salvamento = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, vendas, revisaoEsperada: 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);
        }

        using var baselineProvider = CriarProviderBaseline();
        var baseline = await baselineProvider.GetRequiredService<ISender>()
            .Send(new ConsultarVisaoGeralQuery(Referencia));
        Assert.IsTrue(baseline.IsSuccess);

        var contador = new ContadorArmazenamento();
        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador)));
        var armazenamentoContado = reaberto.Servicos.GetRequiredService<ArmazenamentoContado>();
        contador.Zerar();

        using var resposta = await EnviarAsync(reaberto.Cliente, segredo, $"?referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        AssertVisaoGeral(raiz, baseline.Value);

        Assert.AreEqual(17, raiz.GetProperty("indicadores").GetProperty("quantidadeVendasAtivas").GetInt32());
        Assert.AreEqual(21_300L, raiz.GetProperty("indicadores").GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(600L, raiz.GetProperty("indicadores").GetProperty("valoresEmAtrasoCentavos").GetInt64());
        Assert.AreEqual(60_600L, raiz.GetProperty("indicadores").GetProperty("recebidoNoMesCentavos").GetInt64());
        CollectionAssert.AreEqual(
            new[]
            {
                "sqlite-recente-quitada", "venda-entrada-lote", "sqlite-proxima-oito",
                "sqlite-proxima-sete-a", "sqlite-proxima-sete-b"
            },
            raiz.GetProperty("vendasRecentes").EnumerateArray()
                .Select(item => item.GetProperty("id").GetString()).ToArray());
        Assert.AreEqual("Quitada", raiz.GetProperty("vendasRecentes")[0].GetProperty("situacao").GetString());
        CollectionAssert.AreEqual(
            new[]
            {
                "sqlite-proxima-hoje-a-p1", "sqlite-proxima-hoje-b-p1", "sqlite-proxima-hoje-c-p1",
                "sqlite-proxima-sete-a-p1", "sqlite-proxima-sete-b-p1"
            },
            raiz.GetProperty("parcelasProximas").EnumerateArray()
                .Select(item => item.GetProperty("parcela").GetProperty("id").GetString()).ToArray());
        CollectionAssert.AreEqual(
            new[]
            {
                "sqlite-atrasada-a-p1", "sqlite-atrasada-b-p1", "sqlite-atrasada-c-p1",
                "sqlite-atrasada-d-p1", "sqlite-atrasada-e-p1"
            },
            raiz.GetProperty("parcelasAtrasadas").EnumerateArray()
                .Select(item => item.GetProperty("parcela").GetProperty("id").GetString()).ToArray());

        Assert.AreEqual(1, armazenamentoContado.Carregamentos);
        Assert.AreEqual(0, armazenamentoContado.Inicializacoes);
        Assert.AreEqual(0, armazenamentoContado.Salvamentos);

        using var referenciaInvalida = await EnviarAsync(reaberto.Cliente, segredo, "?referencia=2027-02-30");
        Assert.AreEqual(HttpStatusCode.BadRequest, referenciaInvalida.StatusCode);
        Assert.AreEqual("no-store", referenciaInvalida.Headers.CacheControl?.ToString());
        using var problema = JsonDocument.Parse(await referenciaInvalida.Content.ReadAsStringAsync());
        Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
        Assert.AreEqual(1, armazenamentoContado.Carregamentos);
        Assert.AreEqual(0, armazenamentoContado.Salvamentos);
    }

    [TestMethod]
    public async Task GetVisaoGeral_BancoVazioRetornaIndicadoresZeroEBlocosVazios()
    {
        var segredo = CriarSegredo();
        var caminhoVazio = Path.Combine(_diretorioTemporario, "vazio.sqlite");
        var contador = new ContadorArmazenamento();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: caminhoVazio,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador)));
        var armazenamentoContado = fixture.Servicos.GetRequiredService<ArmazenamentoContado>();
        contador.Zerar();

        using var resposta = await EnviarAsync(fixture.Cliente, segredo, $"?referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        Assert.AreEqual(6, raiz.EnumerateObject().Count());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), raiz.GetProperty("referencia").GetString());
        Assert.AreEqual("0", raiz.GetProperty("revisao").GetString());
        var indicadores = raiz.GetProperty("indicadores");
        Assert.AreEqual(4, indicadores.EnumerateObject().Count());
        Assert.AreEqual(0L, indicadores.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(0L, indicadores.GetProperty("valoresEmAtrasoCentavos").GetInt64());
        Assert.AreEqual(0L, indicadores.GetProperty("recebidoNoMesCentavos").GetInt64());
        Assert.AreEqual(0, indicadores.GetProperty("quantidadeVendasAtivas").GetInt32());
        Assert.AreEqual(0, raiz.GetProperty("vendasRecentes").GetArrayLength());
        Assert.AreEqual(0, raiz.GetProperty("parcelasProximas").GetArrayLength());
        Assert.AreEqual(0, raiz.GetProperty("parcelasAtrasadas").GetArrayLength());
        Assert.AreEqual(1, armazenamentoContado.Carregamentos);
        Assert.AreEqual(0, armazenamentoContado.Salvamentos);

        using var referenciaAusente = await EnviarAsync(fixture.Cliente, segredo, "");
        Assert.AreEqual(HttpStatusCode.BadRequest, referenciaAusente.StatusCode);
        Assert.AreEqual("no-store", referenciaAusente.Headers.CacheControl?.ToString());
        Assert.AreEqual(1, armazenamentoContado.Carregamentos);
        Assert.AreEqual(0, armazenamentoContado.Salvamentos);
    }

    private static void AssertVisaoGeral(JsonElement json, VisaoGeralResposta esperado)
    {
        Assert.AreEqual(6, json.EnumerateObject().Count());
        Assert.AreEqual(esperado.Referencia.ToString("yyyy-MM-dd"), json.GetProperty("referencia").GetString());
        Assert.AreEqual(esperado.Revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            json.GetProperty("revisao").GetString());

        var indicadores = json.GetProperty("indicadores");
        Assert.AreEqual(4, indicadores.EnumerateObject().Count());
        Assert.AreEqual(esperado.Indicadores.TotalEmAbertoCentavos,
            indicadores.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(esperado.Indicadores.ValoresEmAtrasoCentavos,
            indicadores.GetProperty("valoresEmAtrasoCentavos").GetInt64());
        Assert.AreEqual(esperado.Indicadores.RecebidoNoMesCentavos,
            indicadores.GetProperty("recebidoNoMesCentavos").GetInt64());
        Assert.AreEqual(esperado.Indicadores.QuantidadeVendasAtivas,
            indicadores.GetProperty("quantidadeVendasAtivas").GetInt32());

        AssertResumos(json.GetProperty("vendasRecentes"), esperado.VendasRecentes);
        AssertParcelas(json.GetProperty("parcelasProximas"), esperado.ParcelasProximas);
        AssertParcelas(json.GetProperty("parcelasAtrasadas"), esperado.ParcelasAtrasadas);

        var revisao = json.GetProperty("revisao").GetString();
        var referencia = json.GetProperty("referencia").GetString();
        foreach (var venda in json.GetProperty("vendasRecentes").EnumerateArray()
            .Concat(json.GetProperty("parcelasProximas").EnumerateArray().Select(item => item.GetProperty("venda")))
            .Concat(json.GetProperty("parcelasAtrasadas").EnumerateArray().Select(item => item.GetProperty("venda"))))
        {
            Assert.AreEqual(revisao, venda.GetProperty("revisao").GetString());
            Assert.AreEqual(referencia, venda.GetProperty("referencia").GetString());
        }
    }

    private static void AssertResumos(JsonElement json, IReadOnlyList<VendaResumoResposta> esperados)
    {
        var atuais = json.EnumerateArray().ToArray();
        Assert.AreEqual(esperados.Count, atuais.Length);
        for (var indice = 0; indice < atuais.Length; indice++)
        {
            AssertResumo(atuais[indice], esperados[indice]);
        }
    }

    private static void AssertParcelas(JsonElement json, IReadOnlyList<ParcelaVisaoGeralResposta> esperados)
    {
        var atuais = json.EnumerateArray().ToArray();
        Assert.AreEqual(esperados.Count, atuais.Length);
        for (var indice = 0; indice < atuais.Length; indice++)
        {
            var atual = atuais[indice];
            var baseline = esperados[indice];
            Assert.AreEqual(2, atual.EnumerateObject().Count());
            AssertResumo(atual.GetProperty("venda"), baseline.Venda);
            AssertParcela(atual.GetProperty("parcela"), baseline.Parcela);
        }
    }

    private static void AssertResumo(JsonElement atual, VendaResumoResposta esperado)
    {
        Assert.AreEqual(15, atual.EnumerateObject().Count());
        Assert.AreEqual(esperado.Id, atual.GetProperty("id").GetString());
        var cliente = atual.GetProperty("cliente");
        Assert.AreEqual(4, cliente.EnumerateObject().Count());
        Assert.AreEqual(esperado.Cliente.Nome, cliente.GetProperty("nome").GetString());
        Assert.AreEqual(esperado.Cliente.Cpf, cliente.GetProperty("cpf").GetString());
        Assert.AreEqual(esperado.Cliente.Telefone, cliente.GetProperty("telefone").GetString());
        Assert.AreEqual(esperado.Cliente.Descricao, cliente.GetProperty("descricao").ValueKind == JsonValueKind.Null
            ? null
            : cliente.GetProperty("descricao").GetString());
        Assert.AreEqual(esperado.DataVenda.ToString("yyyy-MM-dd"), atual.GetProperty("dataVenda").GetString());
        Assert.AreEqual(esperado.StatusAdministrativo.ToString(), atual.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(esperado.Situacao.ToString(), atual.GetProperty("situacao").GetString());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, atual.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalAcrescimosCentavos, atual.GetProperty("totalAcrescimosCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorTotalEfetivoCentavos, atual.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalRecebidoCentavos, atual.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, atual.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.QuantidadePaga, atual.GetProperty("quantidadePaga").GetInt32());
        Assert.AreEqual(esperado.QuantidadeParcelas, atual.GetProperty("quantidadeParcelas").GetInt32());
        AssertDataOuNull(atual.GetProperty("proximoVencimento"), esperado.ProximoVencimento);
        Assert.AreEqual(esperado.Revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            atual.GetProperty("revisao").GetString());
        Assert.AreEqual(esperado.Referencia.ToString("yyyy-MM-dd"), atual.GetProperty("referencia").GetString());
    }

    private static void AssertParcela(JsonElement atual, ParcelaDetalheResposta esperado)
    {
        Assert.AreEqual(11, atual.EnumerateObject().Count());
        Assert.AreEqual(esperado.Id, atual.GetProperty("id").GetString());
        Assert.AreEqual(esperado.Numero, atual.GetProperty("numero").GetInt32());
        Assert.AreEqual(esperado.ValorBaseCentavos, atual.GetProperty("valorBaseCentavos").GetInt64());
        Assert.AreEqual(esperado.AcrescimoCentavos, atual.GetProperty("acrescimoCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorEfetivoCentavos, atual.GetProperty("valorEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorRecebidoCentavos, atual.GetProperty("valorRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, atual.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.Vencimento.ToString("yyyy-MM-dd"), atual.GetProperty("vencimento").GetString());
        Assert.AreEqual(esperado.Situacao.ToString(), atual.GetProperty("situacao").GetString());
        AssertDataOuNull(atual.GetProperty("dataPagamento"), esperado.DataPagamento);
        var forma = atual.GetProperty("formaPagamento");
        Assert.AreEqual(esperado.FormaPagamento?.ToString(), forma.ValueKind == JsonValueKind.Null ? null : forma.GetString());
    }

    private static void AssertDataOuNull(JsonElement atual, DateOnly? esperado) =>
        Assert.AreEqual(
            esperado?.ToString("yyyy-MM-dd"),
            atual.ValueKind == JsonValueKind.Null ? null : atual.GetString());

    private static void DecorarArmazenamento(IServiceCollection servicos, ContadorArmazenamento contador)
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

    private ServiceProvider CriarProviderBaseline() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string query)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/visao-geral" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Venda[] CriarCenarioPersistido()
    {
        var entradaELote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "venda-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada e lote"),
            new DateOnly(2027, 3, 1),
            DinheiroValor(30_000),
            [
                new("entrada-lote-p1", 1, DinheiroValor(10_000), new DateOnly(2027, 3, 1)),
                new("entrada-lote-p2", 2, DinheiroValor(10_000), new DateOnly(2027, 4, 1)),
                new("entrada-lote-p3", 3, DinheiroValor(10_000), new DateOnly(2027, 5, 1))
            ],
            [
                new("recebimento-entrada", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(10_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null,
                    [new("entrada-lote-p1", DinheiroValor(10_000))]),
                new("recebimento-lote", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null,
                    [new("entrada-lote-p2", DinheiroValor(10_000))])
            ]), Referencia));

        var individual = Registrar(
            CriarVenda("venda-individual", new DateOnly(2027, 2, 1), 20_000, 2),
            "recebimento-individual",
            10_500,
            new DateOnly(2027, 3, 5));
        var vendaInativar = Sucesso(Registrar(
            CriarVenda("venda-inativar", new DateOnly(2026, 12, 15), 20_000, 2),
            "recebimento-inativar",
            10_000,
            new DateOnly(2027, 3, 6))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var vendaPrejuizo = Sucesso(Registrar(
            CriarVenda("venda-prejuizo", new DateOnly(2026, 12, 15), 20_000, 2),
            "recebimento-prejuizo",
            10_000,
            new DateOnly(2027, 3, 7))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var quitada = Registrar(
            CriarVenda("venda-quitada", new DateOnly(2026, 12, 15), 10_000, 1),
            "recebimento-quitada",
            10_000,
            new DateOnly(2027, 3, 8));

        var vendas = new List<Venda> { entradaELote, individual, vendaInativar, vendaPrejuizo, quitada };
        foreach (var rotulo in new[] { "hoje-a", "hoje-b", "hoje-c" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-proxima-{rotulo}", Referencia, 100));
        }

        foreach (var rotulo in new[] { "sete-a", "sete-b", "sete-c" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-proxima-{rotulo}", Referencia.AddDays(7), 100));
        }

        vendas.Add(CriarVendaComVencimento("sqlite-proxima-oito", Referencia.AddDays(8), 100));
        foreach (var rotulo in new[] { "a", "b", "c", "d", "e", "f" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-atrasada-{rotulo}", Referencia.AddDays(-1), 100));
        }

        return vendas.ToArray();
    }

    private static Venda CriarVendaComVencimento(string id, DateOnly vencimento, long valorCentavos) =>
        CriarVenda(id, vencimento.AddMonths(-1), valorCentavos, quantidadeParcelas: 1);

    private static Venda CriarVenda(string id, DateOnly dataVenda, long valorCentavos, int quantidadeParcelas) =>
        Sucesso(Venda.Cadastrar(
            id,
            Cliente(id),
            dataVenda,
            DinheiroValor(valorCentavos),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(indice => $"{id}-p{indice}").ToArray(),
            Referencia));

    private static Venda Registrar(Venda venda, string recebimentoId, long valor, DateOnly data) =>
        Sucesso(venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValor(valor),
            data,
            FormaPagamento.Pix,
            Referencia));

    private static DadosClienteVenda Cliente(string nome) =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ContadorArmazenamento
    {
        private int _carregamentos;
        private int _inicializacoes;
        private int _salvamentos;

        public int Carregamentos => Volatile.Read(ref _carregamentos);

        public int Inicializacoes => Volatile.Read(ref _inicializacoes);

        public int Salvamentos => Volatile.Read(ref _salvamentos);

        public void Zerar()
        {
            Interlocked.Exchange(ref _carregamentos, 0);
            Interlocked.Exchange(ref _inicializacoes, 0);
            Interlocked.Exchange(ref _salvamentos, 0);
        }

        public void RegistrarCarga() => Interlocked.Increment(ref _carregamentos);

        public void RegistrarInicializacao() => Interlocked.Increment(ref _inicializacoes);

        public void RegistrarSalvamento() => Interlocked.Increment(ref _salvamentos);
    }

    private sealed class ArmazenamentoContado(
        IArmazenamentoVendas interno,
        ContadorArmazenamento contador) : IArmazenamentoVendas
    {
        public int Carregamentos => contador.Carregamentos;

        public int Inicializacoes => contador.Inicializacoes;

        public int Salvamentos => contador.Salvamentos;

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
            string caminhoAbsoluto,
            CancellationToken cancellationToken = default)
        {
            contador.RegistrarInicializacao();
            return interno.InicializarAsync(caminhoAbsoluto, cancellationToken);
        }

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            contador.RegistrarCarga();
            return interno.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            contador.RegistrarSalvamento();
            return interno.SalvarAsync(
                caminhoAbsoluto,
                candidatoCompleto,
                revisaoEsperada,
                referencia,
                cancellationToken);
        }
    }
}
