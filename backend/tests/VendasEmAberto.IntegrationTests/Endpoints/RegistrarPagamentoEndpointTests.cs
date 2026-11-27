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
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class RegistrarPagamentoEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-baixa-{Guid.NewGuid():N}");
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
    public async Task PostRecebimento_BaixaPrimeiraPendenteFuturaEAcréscimoPreservaIdsEReabre()
    {
        var segredo = CriarSegredo();
        var gerador = new GeradorSequencial("recebimento-futuro", "recebimento-acrescimo");
        var contador = new ContadorSalvamentos();
        var observacaoUnicode = string.Concat(Enumerable.Repeat("🧾", 20));
        await using (var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IGeradorIdentificadores>();
                services.AddSingleton<IGeradorIdentificadores>(gerador);
                DecorarArmazenamento(services, contador);
            })))
        {
            var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoContado>();
            var vendas = new[]
            {
                CriarVenda("futura", total: 30_000, quantidade: 3, parcelasPagas: 2),
                CriarVenda("acrescimo", total: 10_000, quantidade: 1, parcelasPagas: 0)
            };
            var salvo = await armazenamento.SalvarAsync(
                _caminhoBanco,
                vendas,
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
            contador.Zerar();

            using (var futura = await EnviarAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoPagamento(
                    "futura",
                    "futura-parcela-3",
                    10_000,
                    "2027-03-10",
                    "CartaoDebito",
                    observacaoUnicode,
                    revisao: 1)))
            {
                Assert.AreEqual(HttpStatusCode.OK, futura.StatusCode);
                Assert.AreEqual("no-store", futura.Headers.CacheControl?.ToString());
                Assert.AreEqual("application/json", futura.Content.Headers.ContentType?.MediaType);
                Assert.IsFalse(futura.Headers.Contains("Location"));
                using var documento = JsonDocument.Parse(await futura.Content.ReadAsStringAsync());
                var raiz = documento.RootElement;
                var resumo = raiz.GetProperty("resumo");
                Assert.AreEqual("futura", resumo.GetProperty("id").GetString());
                Assert.AreEqual("2", resumo.GetProperty("revisao").GetString());
                Assert.AreEqual(30_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
                Assert.AreEqual(30_000L, resumo.GetProperty("valorTotalEfetivoCentavos").GetInt64());
                Assert.AreEqual(30_000L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
                Assert.AreEqual(0L, resumo.GetProperty("saldoCentavos").GetInt64());
                Assert.AreEqual(3, resumo.GetProperty("quantidadePaga").GetInt32());

                var parcelas = raiz.GetProperty("parcelas").EnumerateArray().ToArray();
                Assert.AreEqual(3, parcelas.Length);
                Assert.AreEqual("2027-04-15", parcelas[2].GetProperty("vencimento").GetString());
                Assert.AreEqual(10_000L, parcelas[2].GetProperty("valorRecebidoCentavos").GetInt64());
                Assert.AreEqual(0L, parcelas[2].GetProperty("saldoCentavos").GetInt64());
                Assert.AreEqual("2027-03-10", parcelas[2].GetProperty("dataPagamento").GetString());
                Assert.AreEqual("CartaoDebito", parcelas[2].GetProperty("formaPagamento").GetString());

                var recebimentos = raiz.GetProperty("recebimentos").EnumerateArray().ToArray();
                Assert.AreEqual(3, recebimentos.Length);
                Assert.AreEqual("recebimento-futuro", recebimentos[2].GetProperty("id").GetString());
                Assert.AreEqual("2027-03-10", recebimentos[2].GetProperty("data").GetString());
                Assert.AreEqual("CartaoDebito", recebimentos[2].GetProperty("forma").GetString());
                Assert.AreEqual("Individual", recebimentos[2].GetProperty("origem").GetString());
                Assert.AreEqual(10_000L, recebimentos[2].GetProperty("valorCentavos").GetInt64());
                Assert.AreEqual(0L, recebimentos[2].GetProperty("acrescimoCentavos").GetInt64());
                Assert.AreEqual(observacaoUnicode, recebimentos[2].GetProperty("observacao").GetString());
                Assert.AreEqual("futura-parcela-3", recebimentos[2].GetProperty("alocacoes")[0]
                    .GetProperty("parcelaId").GetString());
                Assert.AreEqual(10_000L, recebimentos[2].GetProperty("alocacoes")[0]
                    .GetProperty("valorCentavos").GetInt64());
            }

            using (var acrescimo = await EnviarAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoPagamento(
                    "acrescimo",
                    "acrescimo-parcela-1",
                    11_000,
                    "2027-03-12",
                    "Pix",
                    "Acréscimo 🧾",
                    revisao: 2,
                    incluirIdDeCliente: true)))
            {
                Assert.AreEqual(HttpStatusCode.OK, acrescimo.StatusCode);
                Assert.AreEqual("no-store", acrescimo.Headers.CacheControl?.ToString());
                Assert.IsFalse(acrescimo.Headers.Contains("Location"));
                using var documento = JsonDocument.Parse(await acrescimo.Content.ReadAsStringAsync());
                var raiz = documento.RootElement;
                var resumo = raiz.GetProperty("resumo");
                Assert.AreEqual("3", resumo.GetProperty("revisao").GetString());
                Assert.AreEqual(10_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
                Assert.AreEqual(1_000L, resumo.GetProperty("totalAcrescimosCentavos").GetInt64());
                Assert.AreEqual(11_000L, resumo.GetProperty("valorTotalEfetivoCentavos").GetInt64());
                Assert.AreEqual(11_000L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
                Assert.AreEqual(0L, resumo.GetProperty("saldoCentavos").GetInt64());

                var parcela = raiz.GetProperty("parcelas").EnumerateArray().Single();
                Assert.AreEqual(10_000L, parcela.GetProperty("valorBaseCentavos").GetInt64());
                Assert.AreEqual(11_000L, parcela.GetProperty("valorRecebidoCentavos").GetInt64());
                Assert.AreEqual(1_000L, parcela.GetProperty("acrescimoCentavos").GetInt64());
                Assert.AreEqual(0L, parcela.GetProperty("saldoCentavos").GetInt64());

                var recebimento = raiz.GetProperty("recebimentos").EnumerateArray().Single();
                Assert.AreEqual("recebimento-acrescimo", recebimento.GetProperty("id").GetString());
                Assert.AreNotEqual("id-controlado-pelo-cliente", recebimento.GetProperty("id").GetString());
                Assert.AreEqual("Individual", recebimento.GetProperty("origem").GetString());
                Assert.AreEqual("Pix", recebimento.GetProperty("forma").GetString());
                Assert.AreEqual(11_000L, recebimento.GetProperty("valorCentavos").GetInt64());
                Assert.AreEqual(1_000L, recebimento.GetProperty("acrescimoCentavos").GetInt64());
                Assert.AreEqual("Acréscimo 🧾", recebimento.GetProperty("observacao").GetString());
                Assert.AreEqual("acrescimo-parcela-1", recebimento.GetProperty("alocacoes")[0]
                    .GetProperty("parcelaId").GetString());
            }

            Assert.AreEqual(2, armazenamento.Salvamentos);
            Assert.AreEqual(2, gerador.QuantidadeGerada);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(3L, snapshot.Revisao);
        var vendaFutura = snapshot.Conjunto.Vendas.Single(venda => venda.Id == "futura");
        Assert.AreEqual(30_000L, vendaFutura.ValorTotalBase.Centavos);
        CollectionAssert.AreEqual(
            new[] { "futura-recebimento-1", "futura-recebimento-2", "recebimento-futuro" },
            vendaFutura.Recebimentos.Select(recebimento => recebimento.Id).ToArray());
        Assert.AreEqual("futura-parcela-3", vendaFutura.Recebimentos[2].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(observacaoUnicode, vendaFutura.Recebimentos[2].Observacao);
        var vendaAcrescimo = snapshot.Conjunto.Vendas.Single(venda => venda.Id == "acrescimo");
        Assert.AreEqual("recebimento-acrescimo", vendaAcrescimo.Recebimentos.Single().Id);
        Assert.AreEqual(1_000L, vendaAcrescimo.Recebimentos.Single().Acrescimo.Centavos);
        Assert.AreEqual("acrescimo-parcela-1", vendaAcrescimo.Recebimentos.Single().Alocacoes.Single().ParcelaId);
    }

    [TestMethod]
    public async Task PostRecebimento_FalhasNaoSalvamNemDeslocamPrimeiraPendente()
    {
        var segredo = CriarSegredo();
        var gerador = new GeradorSequencial(
            "recebimento-falha-1",
            "recebimento-falha-2",
            "recebimento-falha-3",
            "recebimento-falha-4",
            "recebimento-final");
        var contador = new ContadorSalvamentos();
        await using (var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IGeradorIdentificadores>();
                services.AddSingleton<IGeradorIdentificadores>(gerador);
                DecorarArmazenamento(services, contador);
            })))
        {
            var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoContado>();
            var vendas = new[]
            {
                CriarVenda("aberta", total: 30_000, quantidade: 3, parcelasPagas: 0),
                CriarVenda("repetida", total: 20_000, quantidade: 2, parcelasPagas: 1),
                CriarVenda("inativa", total: 20_000, quantidade: 2, parcelasPagas: 0, status: StatusAdministrativoVenda.Inativo)
            };
            var salvo = await armazenamento.SalvarAsync(
                _caminhoBanco,
                vendas,
                revisaoEsperada: 0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
            contador.Zerar();

            var casos = new[]
            {
                (Body: CriarCorpoPagamento("aberta", "aberta-parcela-3", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "selecao-nao-sequencial", Campo: "parcelaId"),
                (Body: CriarCorpoPagamento("repetida", "repetida-parcela-1", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "selecao-nao-sequencial", Campo: "parcelaId"),
                (Body: CriarCorpoPagamento("aberta", "aberta-parcela-1", 9_999, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "valor-recebido-inferior-ao-base", Campo: "valorRecebido"),
                (Body: CriarCorpoPagamento("aberta", "aberta-parcela-1", 10_000, "2027-03-16", "Pix", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "dados-recebimento-invalidos", Campo: "data"),
                (Body: CriarCorpoPagamento("aberta", "aberta-parcela-1", 10_000, "2027-03-10", "bitcoin", null, 1), Status: HttpStatusCode.BadRequest, Codigo: "requisicao-invalida", Campo: "forma"),
                (Body: CriarCorpoPagamento("aberta", "aberta-parcela-1", 10_000, "2027-03-10", "Pix", string.Concat(Enumerable.Repeat("🧾", 21)), 1), Status: HttpStatusCode.BadRequest, Codigo: "observacao-longa-demais", Campo: "observacao"),
                (Body: CriarCorpoPagamento("inativa", "inativa-parcela-1", 10_000, "2027-03-10", "Pix", null, 1), Status: HttpStatusCode.UnprocessableEntity, Codigo: "venda-nao-ativa", Campo: "statusAdministrativo")
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
                {"vendaId":"aberta","parcelaId":"aberta-parcela-1","valorRecebidoCentavos":10000,"data":"2027-03-10","forma":2,"referencia":"2027-03-15","revisaoEsperada":"1"}
                """;
            using (var resposta = await EnviarAsync(fixture.Cliente, segredo, semForma))
            {
                Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
                using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
                Assert.AreEqual("forma", problema.RootElement.GetProperty("campo").GetString());
            }

            var valorComTipoIncorreto = """
                {"vendaId":"aberta","parcelaId":"aberta-parcela-1","valorRecebidoCentavos":"10000","data":"2027-03-10","forma":"Pix","referencia":"2027-03-15","revisaoEsperada":"1"}
                """;
            using (var resposta = await EnviarAsync(fixture.Cliente, segredo, valorComTipoIncorreto))
            {
                Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
                using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
                Assert.AreEqual("valorRecebidoCentavos", problema.RootElement.GetProperty("campo").GetString());
            }

            Assert.AreEqual(0, armazenamento.Salvamentos);
            var snapshotSemGravacoes = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
                await armazenamento.CarregarAsync(_caminhoBanco, Referencia)).Valor;
            Assert.AreEqual(1L, snapshotSemGravacoes.Revisao);
            Assert.AreEqual(0, snapshotSemGravacoes.Conjunto.Vendas.Single(venda => venda.Id == "aberta").Recebimentos.Count);
            Assert.AreEqual(1, snapshotSemGravacoes.Conjunto.Vendas.Single(venda => venda.Id == "repetida").Recebimentos.Count);
            Assert.AreEqual(0, snapshotSemGravacoes.Conjunto.Vendas.Single(venda => venda.Id == "inativa").Recebimentos.Count);

            using var sucessoPrimeiraPendente = await EnviarAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoPagamento(
                    "aberta",
                    "aberta-parcela-1",
                    10_000,
                    "2027-03-10",
                    "Pix",
                    null,
                    revisao: 1,
                    incluirIdDeCliente: true));
            Assert.AreEqual(HttpStatusCode.OK, sucessoPrimeiraPendente.StatusCode);
            Assert.AreEqual("no-store", sucessoPrimeiraPendente.Headers.CacheControl?.ToString());
            Assert.IsFalse(sucessoPrimeiraPendente.Headers.Contains("Location"));
            using var detalhe = JsonDocument.Parse(await sucessoPrimeiraPendente.Content.ReadAsStringAsync());
            Assert.AreEqual("2", detalhe.RootElement.GetProperty("resumo").GetProperty("revisao").GetString());
            Assert.AreEqual("recebimento-final",
                detalhe.RootElement.GetProperty("recebimentos").EnumerateArray().Single()
                    .GetProperty("id").GetString());
            Assert.AreEqual("aberta-parcela-1",
                detalhe.RootElement.GetProperty("recebimentos")[0].GetProperty("alocacoes")[0]
                    .GetProperty("parcelaId").GetString());
            Assert.AreEqual(1, armazenamento.Salvamentos);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var final = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, final.Revisao);
        var vendaAberta = final.Conjunto.Vendas.Single(venda => venda.Id == "aberta");
        Assert.AreEqual("aberta-parcela-1", vendaAberta.Recebimentos.Single().Alocacoes.Single().ParcelaId);
        Assert.AreEqual("recebimento-final", vendaAberta.Recebimentos.Single().Id);
        Assert.AreEqual(1, final.Conjunto.Vendas.Single(venda => venda.Id == "repetida").Recebimentos.Count);
        Assert.AreEqual(0, final.Conjunto.Vendas.Single(venda => venda.Id == "inativa").Recebimentos.Count);
    }

    private static string CriarCorpoPagamento(
        string vendaId,
        string parcelaId,
        long valorRecebidoCentavos,
        string data,
        string forma,
        string? observacao,
        long revisao,
        bool incluirIdDeCliente = false)
    {
        var corpo = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["vendaId"] = vendaId,
            ["parcelaId"] = parcelaId,
            ["valorRecebidoCentavos"] = valorRecebidoCentavos,
            ["data"] = data,
            ["forma"] = forma,
            ["observacao"] = observacao,
            ["referencia"] = Referencia.ToString("yyyy-MM-dd"),
            ["revisaoEsperada"] = revisao.ToString(System.Globalization.CultureInfo.InvariantCulture)
        };

        if (incluirIdDeCliente)
        {
            corpo["recebimentoId"] = "id-controlado-pelo-cliente";
        }

        return JsonSerializer.Serialize(corpo);
    }

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string body)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/v1/recebimentos")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Venda CriarVenda(
        string id,
        long total,
        int quantidade,
        int parcelasPagas,
        StatusAdministrativoVenda status = StatusAdministrativoVenda.Ativo)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar($"Cliente {id}", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(total)),
            quantidade,
            Enumerable.Range(1, quantidade).Select(indice => $"{id}-parcela-{indice}").ToArray(),
            Referencia));

        for (var indice = 1; indice <= parcelasPagas; indice++)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento-{indice}",
                $"{id}-parcela-{indice}",
                Sucesso(Dinheiro.Criar(total / quantidade)),
                new DateOnly(2027, 2, indice),
                FormaPagamento.Pix,
                Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

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

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

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
