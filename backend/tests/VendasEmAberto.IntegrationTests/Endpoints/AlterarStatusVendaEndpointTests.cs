using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class AlterarStatusVendaEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-status-{Guid.NewGuid():N}");
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
    public async Task PutStatus_AplicaMatrizNoOpEConflitosPreservaHistoricoEAtualizaUniversosDeConsulta()
    {
        var segredo = CriarSegredo();
        var iniciais = new[]
        {
            CriarVenda("ativa-aberta", StatusAdministrativoVenda.Ativo, paga: true),
            CriarVenda("ativa-quitada", StatusAdministrativoVenda.Ativo, paga: true, quitada: true),
            CriarVenda("inativa-ativa", StatusAdministrativoVenda.Inativo, paga: true),
            CriarVenda("prejuizo-ativo", StatusAdministrativoVenda.Prejuizo, paga: true),
            CriarVenda("inativa-rejeicao", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("prejuizo-rejeicao", StatusAdministrativoVenda.Prejuizo, paga: true)
        };

        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var salvo = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, iniciais, revisaoEsperada: 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        await using (var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var transicoesPermitidas = new[]
            {
                (Id: "ativa-aberta", Status: "Prejuizo", Revisao: 1L, NovaRevisao: 2L),
                (Id: "inativa-ativa", Status: "Ativo", Revisao: 2L, NovaRevisao: 3L),
                (Id: "inativa-ativa", Status: "Inativo", Revisao: 3L, NovaRevisao: 4L),
                (Id: "prejuizo-ativo", Status: "Ativo", Revisao: 4L, NovaRevisao: 5L)
            };

            foreach (var transicao in transicoesPermitidas)
            {
                using var resposta = await EnviarStatusAsync(
                    fixture.Cliente,
                    segredo,
                    CriarCorpoStatus(transicao.Id, transicao.Status, transicao.Revisao));

                Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode, transicao.Id);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), transicao.Id);
                Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType, transicao.Id);
                using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                AssertDetalheStatus(
                    documento.RootElement,
                    transicao.Id,
                    transicao.Status,
                    transicao.NovaRevisao);
            }

            using (var noOp = await EnviarStatusAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoStatus("prejuizo-ativo", "Ativo", revisao: 5)))
            {
                Assert.AreEqual(HttpStatusCode.OK, noOp.StatusCode);
                Assert.AreEqual("no-store", noOp.Headers.CacheControl?.ToString());
                using var documento = JsonDocument.Parse(await noOp.Content.ReadAsStringAsync());
                AssertDetalheStatus(documento.RootElement, "prejuizo-ativo", "Ativo", 5);
            }

            using (var conflitoNoOp = await EnviarStatusAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoStatus("prejuizo-ativo", "Ativo", revisao: 4)))
            {
                Assert.AreEqual(HttpStatusCode.Conflict, conflitoNoOp.StatusCode);
                Assert.AreEqual("no-store", conflitoNoOp.Headers.CacheControl?.ToString());
                using var problema = JsonDocument.Parse(await conflitoNoOp.Content.ReadAsStringAsync());
                Assert.AreEqual("conflito-revisao", problema.RootElement.GetProperty("codigo").GetString());
                Assert.AreEqual("revisaoEsperada", problema.RootElement.GetProperty("campo").GetString());
            }

            foreach (var corpoInvalido in new[]
            {
                """
                {"vendaId":"prejuizo-ativo","novoStatus":"prejuizo","referencia":"2027-03-15","revisaoEsperada":"5"}
                """,
                """
                {"vendaId":"prejuizo-ativo","novoStatus":1,"referencia":"2027-03-15","revisaoEsperada":"5"}
                """
            })
            {
                using var resposta = await EnviarStatusAsync(fixture.Cliente, segredo, corpoInvalido);
                Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
                using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());
                Assert.AreEqual("novoStatus", problema.RootElement.GetProperty("campo").GetString());
            }

            var transicoesProibidas = new[]
            {
                (Id: "inativa-rejeicao", Status: "Prejuizo"),
                (Id: "prejuizo-rejeicao", Status: "Inativo"),
                (Id: "ativa-quitada", Status: "Prejuizo")
            };
            foreach (var transicao in transicoesProibidas)
            {
                using var resposta = await EnviarStatusAsync(
                    fixture.Cliente,
                    segredo,
                    CriarCorpoStatus(transicao.Id, transicao.Status, revisao: 5));
                Assert.AreEqual(HttpStatusCode.UnprocessableEntity, resposta.StatusCode, transicao.Id);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), transicao.Id);
                using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                Assert.AreEqual("transicao-nao-permitida", problema.RootElement.GetProperty("codigo").GetString());
                Assert.AreEqual("statusAdministrativo", problema.RootElement.GetProperty("campo").GetString());
            }

            using (var resumo = await EnviarGetAsync(
                fixture.Cliente,
                segredo,
                $"/api/v1/resumo?referencia={Referencia:yyyy-MM-dd}"))
            {
                Assert.AreEqual(HttpStatusCode.OK, resumo.StatusCode);
                Assert.AreEqual("no-store", resumo.Headers.CacheControl?.ToString());
                using var documento = JsonDocument.Parse(await resumo.Content.ReadAsStringAsync());
                var raiz = documento.RootElement;
                Assert.AreEqual(10_000L, raiz.GetProperty("totalEmAbertoCentavos").GetInt64());
                Assert.AreEqual(0L, raiz.GetProperty("valoresEmAtrasoCentavos").GetInt64());
                Assert.AreEqual(50_000L, raiz.GetProperty("recebidoNoMesCentavos").GetInt64());
                Assert.AreEqual(2, raiz.GetProperty("quantidadeVendasAtivas").GetInt32());
                Assert.AreEqual("5", raiz.GetProperty("revisao").GetString());
            }

            using (var visaoGeral = await EnviarGetAsync(
                fixture.Cliente,
                segredo,
                $"/api/v1/visao-geral?referencia={Referencia:yyyy-MM-dd}"))
            {
                Assert.AreEqual(HttpStatusCode.OK, visaoGeral.StatusCode);
                Assert.AreEqual("no-store", visaoGeral.Headers.CacheControl?.ToString());
                using var documento = JsonDocument.Parse(await visaoGeral.Content.ReadAsStringAsync());
                var raiz = documento.RootElement;
                var indicadores = raiz.GetProperty("indicadores");
                Assert.AreEqual("5", raiz.GetProperty("revisao").GetString());
                Assert.AreEqual(10_000L, indicadores.GetProperty("totalEmAbertoCentavos").GetInt64());
                Assert.AreEqual(50_000L, indicadores.GetProperty("recebidoNoMesCentavos").GetInt64());
                Assert.AreEqual(2, indicadores.GetProperty("quantidadeVendasAtivas").GetInt32());
                CollectionAssert.AreEquivalent(
                    new[] { "ativa-quitada", "prejuizo-ativo" },
                    raiz.GetProperty("vendasRecentes").EnumerateArray()
                        .Select(venda => venda.GetProperty("id").GetString()).ToArray());
            }
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(5L, snapshot.Revisao);
        Assert.AreEqual(6, snapshot.Conjunto.Vendas.Count);

        var statusEsperados = new Dictionary<string, StatusAdministrativoVenda>(StringComparer.Ordinal)
        {
            ["ativa-aberta"] = StatusAdministrativoVenda.Prejuizo,
            ["ativa-quitada"] = StatusAdministrativoVenda.Ativo,
            ["inativa-ativa"] = StatusAdministrativoVenda.Inativo,
            ["prejuizo-ativo"] = StatusAdministrativoVenda.Ativo,
            ["inativa-rejeicao"] = StatusAdministrativoVenda.Inativo,
            ["prejuizo-rejeicao"] = StatusAdministrativoVenda.Prejuizo
        };
        foreach (var venda in snapshot.Conjunto.Vendas)
        {
            var original = iniciais.Single(item => item.Id == venda.Id);
            Assert.AreEqual(statusEsperados[venda.Id], venda.StatusAdministrativo, venda.Id);
            Assert.AreEqual(original.ValorTotalBase.Centavos, venda.ValorTotalBase.Centavos, venda.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(parcela => parcela.Id).ToArray(),
                venda.Parcelas.Select(parcela => parcela.Id).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(parcela => parcela.ValorBase.Centavos).ToArray(),
                venda.Parcelas.Select(parcela => parcela.ValorBase.Centavos).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(parcela => parcela.Vencimento).ToArray(),
                venda.Parcelas.Select(parcela => parcela.Vencimento).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Recebimentos.Select(recebimento => recebimento.Id).ToArray(),
                venda.Recebimentos.Select(recebimento => recebimento.Id).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Recebimentos.Select(recebimento => recebimento.Data).ToArray(),
                venda.Recebimentos.Select(recebimento => recebimento.Data).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Recebimentos.Select(recebimento => recebimento.Valor.Centavos).ToArray(),
                venda.Recebimentos.Select(recebimento => recebimento.Valor.Centavos).ToArray(), venda.Id);
            CollectionAssert.AreEqual(
                original.Recebimentos.SelectMany(recebimento => recebimento.Alocacoes)
                    .Select(alocacao => alocacao.ParcelaId).ToArray(),
                venda.Recebimentos.SelectMany(recebimento => recebimento.Alocacoes)
                    .Select(alocacao => alocacao.ParcelaId).ToArray(),
                venda.Id);
        }

        Assert.AreEqual(50_000L, snapshot.Conjunto.Vendas
            .SelectMany(venda => venda.Recebimentos)
            .Sum(recebimento => recebimento.Valor.Centavos));
    }

    private static void AssertDetalheStatus(
        JsonElement detalhe,
        string id,
        string status,
        long revisao)
    {
        var resumo = detalhe.GetProperty("resumo");
        Assert.AreEqual(id, resumo.GetProperty("id").GetString());
        Assert.AreEqual(status, resumo.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            resumo.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), resumo.GetProperty("referencia").GetString());
        Assert.AreEqual(10_000L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual($"{id}-recebimento", detalhe.GetProperty("recebimentos")[0].GetProperty("id").GetString());
    }

    private static string CriarCorpoStatus(string vendaId, string novoStatus, long revisao) =>
        JsonSerializer.Serialize(new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["vendaId"] = vendaId,
            ["novoStatus"] = novoStatus,
            ["referencia"] = Referencia.ToString("yyyy-MM-dd"),
            ["revisaoEsperada"] = revisao.ToString(System.Globalization.CultureInfo.InvariantCulture)
        });

    private static async Task<HttpResponseMessage> EnviarStatusAsync(HttpClient cliente, string segredo, string body)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Put, "/api/v1/vendas/status")
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

    private static Venda CriarVenda(
        string id,
        StatusAdministrativoVenda status,
        bool paga,
        bool quitada = false)
    {
        var total = quitada ? 10_000 : 20_000;
        var quantidade = quitada ? 1 : 2;
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar($"Cliente {id}", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(total)),
            quantidade,
            Enumerable.Range(1, quantidade).Select(indice => $"{id}-parcela-{indice}").ToArray(),
            Referencia));

        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento",
                $"{id}-parcela-1",
                Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 3, 5),
                FormaPagamento.Pix,
                Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
