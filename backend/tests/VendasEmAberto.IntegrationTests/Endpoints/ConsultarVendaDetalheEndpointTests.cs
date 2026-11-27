using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class ConsultarVendaDetalheEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private const string VendaId = "venda/%+?#🧾";
    private const string ParcelaEntradaId = "parcela-entrada/%+?#🧾";
    private const string RecebimentoEntradaId = "recebimento-entrada/%+?#🧾";
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-detalhe-{Guid.NewGuid():N}");
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
    public async Task GetVendaDetalhe_AposReaberturaMapeiaTodosOsCamposEPreservaIdsCodificados()
    {
        var (fixture, segredo) = await CriarHostComVendaAsync();
        await using (fixture)
        {
            using var resposta = await EnviarAsync(
                fixture.Cliente,
                segredo,
                $"?vendaId={Uri.EscapeDataString(VendaId)}&referencia={Referencia:yyyy-MM-dd}");
            Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
            Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            Assert.IsFalse(resposta.Headers.Contains("Set-Cookie"));
            Assert.IsFalse(resposta.Headers.Contains("Location"));

            using var documentoEsperado = JsonDocument.Parse("""
                {
                  "resumo": {
                    "id": "venda/%+?#🧾",
                    "cliente": {
                      "nome": "Raquel 🧑🏽‍🚀 Duarte",
                      "cpf": "52998224725",
                      "telefone": "11987654321",
                      "descricao": null
                    },
                    "dataVenda": "2027-01-15",
                    "statusAdministrativo": "Ativo",
                    "situacao": "Quitada",
                    "valorTotalBaseCentavos": 40000,
                    "totalAcrescimosCentavos": 1000,
                    "valorTotalEfetivoCentavos": 41000,
                    "totalRecebidoCentavos": 41000,
                    "saldoCentavos": 0,
                    "quantidadePaga": 4,
                    "quantidadeParcelas": 4,
                    "proximoVencimento": null,
                    "revisao": "1",
                    "referencia": "2027-03-15"
                  },
                  "parcelas": [
                    {
                      "id": "parcela-entrada/%+?#🧾",
                      "numero": 1,
                      "valorBaseCentavos": 10000,
                      "acrescimoCentavos": 0,
                      "valorEfetivoCentavos": 10000,
                      "valorRecebidoCentavos": 10000,
                      "saldoCentavos": 0,
                      "vencimento": "2027-01-15",
                      "situacao": "Paga",
                      "dataPagamento": "2027-01-15",
                      "formaPagamento": "Pix"
                    },
                    {
                      "id": "parcela-2",
                      "numero": 2,
                      "valorBaseCentavos": 10000,
                      "acrescimoCentavos": 0,
                      "valorEfetivoCentavos": 10000,
                      "valorRecebidoCentavos": 10000,
                      "saldoCentavos": 0,
                      "vencimento": "2027-02-15",
                      "situacao": "Paga",
                      "dataPagamento": "2027-03-10",
                      "formaPagamento": "Dinheiro"
                    },
                    {
                      "id": "parcela-3",
                      "numero": 3,
                      "valorBaseCentavos": 10000,
                      "acrescimoCentavos": 0,
                      "valorEfetivoCentavos": 10000,
                      "valorRecebidoCentavos": 10000,
                      "saldoCentavos": 0,
                      "vencimento": "2027-03-15",
                      "situacao": "Paga",
                      "dataPagamento": "2027-03-10",
                      "formaPagamento": "Dinheiro"
                    },
                    {
                      "id": "parcela-4",
                      "numero": 4,
                      "valorBaseCentavos": 10000,
                      "acrescimoCentavos": 1000,
                      "valorEfetivoCentavos": 11000,
                      "valorRecebidoCentavos": 11000,
                      "saldoCentavos": 0,
                      "vencimento": "2027-04-15",
                      "situacao": "Paga",
                      "dataPagamento": "2027-02-10",
                      "formaPagamento": "CartaoCredito"
                    }
                  ],
                  "recebimentos": [
                    {
                      "id": "recebimento-entrada/%+?#🧾",
                      "data": "2027-01-15",
                      "forma": "Pix",
                      "origem": "Entrada",
                      "valorCentavos": 10000,
                      "acrescimoCentavos": 0,
                      "observacao": "",
                      "alocacoes": [
                        { "parcelaId": "parcela-entrada/%+?#🧾", "valorCentavos": 10000 }
                      ]
                    },
                    {
                      "id": "recebimento-lote",
                      "data": "2027-03-10",
                      "forma": "Dinheiro",
                      "origem": "HistoricoLote",
                      "valorCentavos": 20000,
                      "acrescimoCentavos": 0,
                      "observacao": "",
                      "alocacoes": [
                        { "parcelaId": "parcela-2", "valorCentavos": 10000 },
                        { "parcelaId": "parcela-3", "valorCentavos": 10000 }
                      ]
                    },
                    {
                      "id": "recebimento-individual",
                      "data": "2027-02-10",
                      "forma": "CartaoCredito",
                      "origem": "Individual",
                      "valorCentavos": 11000,
                      "acrescimoCentavos": 1000,
                      "observacao": "🧾 nota — Unicode",
                      "alocacoes": [
                        { "parcelaId": "parcela-4", "valorCentavos": 11000 }
                      ]
                    }
                  ]
                }
                """);
            using var documentoResposta = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            AssertJsonIgual(documentoEsperado.RootElement, documentoResposta.RootElement, "$ ");

            var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
                await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                    .CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
            Assert.AreEqual(1L, snapshot.Revisao);
            Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count);
            Assert.AreEqual(VendaId, snapshot.Conjunto.Vendas[0].Id);
        }
    }

    [TestMethod]
    public async Task GetVendaDetalhe_EntradaAusenteVaziaOuReferenciaAusenteRetorna400EIdInexistente404()
    {
        var (fixture, segredo) = await CriarHostComVendaAsync();
        await using (fixture)
        {
            foreach (var query in new[]
            {
                $"?referencia={Referencia:yyyy-MM-dd}",
                $"?vendaId=&referencia={Referencia:yyyy-MM-dd}",
                $"?vendaId={Uri.EscapeDataString(VendaId)}",
                $"?vendaId={Uri.EscapeDataString(VendaId)}&referencia={Referencia:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}"
            })
            {
                using var resposta = await EnviarAsync(fixture.Cliente, segredo, query);
                Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode, query);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), query);
                using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
            }

            using var inexistente = await EnviarAsync(
                fixture.Cliente,
                segredo,
                "?vendaId=nao-encontrada&referencia=2027-03-15");
            Assert.AreEqual(HttpStatusCode.NotFound, inexistente.StatusCode);
            Assert.AreEqual("no-store", inexistente.Headers.CacheControl?.ToString());
            using var detalheInexistente = JsonDocument.Parse(await inexistente.Content.ReadAsStringAsync());
            Assert.AreEqual("venda-inexistente", detalheInexistente.RootElement.GetProperty("codigo").GetString());

            var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
                await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                    .CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
            Assert.AreEqual(1L, snapshot.Revisao);
            Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count);
        }
    }

    private async Task<(HostApiFixture Fixture, string Segredo)> CriarHostComVendaAsync()
    {
        var segredo = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        var venda = CriarVendaComHistorico();
        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var resultado = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, [venda], revisaoEsperada: 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(resultado).Valor);
        }

        var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        return (reaberto, segredo);
    }

    private static async Task<HttpResponseMessage> EnviarAsync(
        HttpClient cliente,
        string segredo,
        string query)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/vendas/detalhe" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static Venda CriarVendaComHistorico()
    {
        var dinheiro = (long centavos) => Sucesso(Dinheiro.Criar(centavos));
        var cliente = Sucesso(DadosClienteVenda.Criar("Raquel 🧑🏽‍🚀 Duarte", "52998224725", "(11) 98765-4321", null));
        return Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            VendaId,
            StatusAdministrativoVenda.Ativo,
            cliente,
            new DateOnly(2027, 1, 15),
            dinheiro(40_000),
            [
                new(ParcelaEntradaId, 1, dinheiro(10_000), new DateOnly(2027, 1, 15)),
                new("parcela-2", 2, dinheiro(10_000), new DateOnly(2027, 2, 15)),
                new("parcela-3", 3, dinheiro(10_000), new DateOnly(2027, 3, 15)),
                new("parcela-4", 4, dinheiro(10_000), new DateOnly(2027, 4, 15))
            ],
            [
                new(RecebimentoEntradaId, new DateOnly(2027, 1, 15), FormaPagamento.Pix, dinheiro(10_000),
                    OrigemRecebimento.Entrada, dinheiro(0), null, [new(ParcelaEntradaId, dinheiro(10_000))]),
                new("recebimento-lote", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, dinheiro(20_000),
                    OrigemRecebimento.HistoricoLote, dinheiro(0), null,
                    [new("parcela-2", dinheiro(10_000)), new("parcela-3", dinheiro(10_000))]),
                new("recebimento-individual", new DateOnly(2027, 2, 10), FormaPagamento.CartaoCredito, dinheiro(11_000),
                    OrigemRecebimento.Individual, dinheiro(1_000), "🧾 nota — Unicode", [new("parcela-4", dinheiro(11_000))])
            ]), Referencia));
    }

    private static void AssertJsonIgual(JsonElement esperado, JsonElement obtido, string caminho)
    {
        Assert.AreEqual(esperado.ValueKind, obtido.ValueKind, caminho);
        switch (esperado.ValueKind)
        {
            case JsonValueKind.Object:
                {
                    var propriedadesEsperadas = esperado.EnumerateObject().ToArray();
                    var propriedadesObtidas = obtido.EnumerateObject()
                        .ToDictionary(item => item.Name, item => item.Value, StringComparer.Ordinal);
                    Assert.AreEqual(propriedadesEsperadas.Length, propriedadesObtidas.Count, caminho);
                    foreach (var propriedade in propriedadesEsperadas)
                    {
                        Assert.IsTrue(propriedadesObtidas.TryGetValue(propriedade.Name, out var valor),
                            $"Propriedade ausente em {caminho}: {propriedade.Name}");
                        AssertJsonIgual(propriedade.Value, valor, $"{caminho}.{propriedade.Name}");
                    }

                    break;
                }
            case JsonValueKind.Array:
                {
                    var itensEsperados = esperado.EnumerateArray().ToArray();
                    var itensObtidos = obtido.EnumerateArray().ToArray();
                    Assert.AreEqual(itensEsperados.Length, itensObtidos.Length, caminho);
                    for (var indice = 0; indice < itensEsperados.Length; indice++)
                    {
                        AssertJsonIgual(itensEsperados[indice], itensObtidos[indice], $"{caminho}[{indice}]");
                    }

                    break;
                }
            case JsonValueKind.String:
                Assert.AreEqual(esperado.GetString(), obtido.GetString(), caminho);
                break;
            case JsonValueKind.Number:
                Assert.AreEqual(esperado.GetRawText(), obtido.GetRawText(), caminho);
                break;
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
                break;
            default:
                Assert.Fail($"Tipo JSON não esperado em {caminho}: {esperado.ValueKind}.");
                break;
        }
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
