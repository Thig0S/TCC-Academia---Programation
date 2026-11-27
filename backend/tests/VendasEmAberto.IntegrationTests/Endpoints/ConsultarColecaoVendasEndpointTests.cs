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
public sealed class ConsultarColecaoVendasEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-colecao-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
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
    public async Task GetVendas_RetornaCadaColecaoCompletaNaOrdemOriginalEComResumoIntegral()
    {
        var segredo = ConverterSegredoAleatorio();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);
        var vendas = CriarCenarioMisto();
        var armazenamento = fixture.Servicos.GetRequiredService<IArmazenamentoVendas>();
        var salvamento = await armazenamento.SalvarAsync(
            fixture.CaminhoBanco,
            vendas.Select(item => item.Venda),
            revisaoEsperada: 0,
            Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);

        foreach (var colecao in vendas.Select(item => item.ColecaoEsperada).Distinct(StringComparer.Ordinal))
        {
            var esperadas = vendas.Where(item => item.ColecaoEsperada == colecao)
                .Select(item => item.ResumoEsperado)
                .ToArray();
            using var resposta = await EnviarAsync(
                fixture.Cliente,
                segredo,
                $"?colecao={colecao}&referencia={Referencia:yyyy-MM-dd}");

            Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
            using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            var raiz = documento.RootElement;
            Assert.AreEqual(4, raiz.EnumerateObject().Count());
            Assert.AreEqual(colecao, raiz.GetProperty("colecao").GetString());
            Assert.AreEqual("1", raiz.GetProperty("revisao").GetString());
            Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), raiz.GetProperty("referencia").GetString());

            var resultados = raiz.GetProperty("vendas").EnumerateArray().ToArray();
            Assert.AreEqual(esperadas.Length, resultados.Length, colecao);
            for (var indice = 0; indice < resultados.Length; indice++)
            {
                AssertResumo(resultados[indice], esperadas[indice]);
            }
        }

        foreach (var query in new[]
        {
            $"?referencia={Referencia:yyyy-MM-dd}",
            $"?colecao=0&referencia={Referencia:yyyy-MM-dd}",
            $"?colecao=Desconhecida&referencia={Referencia:yyyy-MM-dd}",
            $"?colecao=abertas&referencia={Referencia:yyyy-MM-dd}",
            $"?colecao=Abertas&colecao=Quitadas&referencia={Referencia:yyyy-MM-dd}",
            "?colecao=Abertas"
        })
        {
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, query);
            Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode, query);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), query);
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString(), query);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(vendas.Length, snapshot.Conjunto.Vendas.Count);
        CollectionAssert.AreEqual(
            vendas.Select(item => item.Venda.Id).ToArray(),
            snapshot.Conjunto.Vendas.Select(item => item.Id).ToArray());
    }

    [TestMethod]
    public async Task GetVendas_BancoVazioRetornaColecaoVaziaSemAvancarRevisao()
    {
        var segredo = ConverterSegredoAleatorio();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);

        using var resposta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?colecao=Quitadas&referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.AreEqual("Quitadas", documento.RootElement.GetProperty("colecao").GetString());
        Assert.AreEqual("0", documento.RootElement.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"),
            documento.RootElement.GetProperty("referencia").GetString());
        Assert.AreEqual(0, documento.RootElement.GetProperty("vendas").GetArrayLength());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private static (string ColecaoEsperada, Venda Venda, ResumoEsperado ResumoEsperado)[] CriarCenarioMisto()
    {
        var abertaAtrasada = CriarVenda("aberta-atrasada", new DateOnly(2027, 1, 15), 12_000, 2);
        var inativaAtrasada = AlterarStatus(
            CriarVenda("inativa-atrasada", new DateOnly(2027, 1, 15), 20_000, 2),
            StatusAdministrativoVenda.Inativo);
        var prejuizoProximo = AlterarStatus(
            CriarVenda("prejuizo-proximo", new DateOnly(2027, 2, 15), 10_000, 1),
            StatusAdministrativoVenda.Prejuizo);
        var quitadaAntiga = Quitar(
            CriarVenda("quitada-antiga", new DateOnly(2027, 1, 15), 10_000, 1),
            new DateOnly(2027, 2, 20));
        var abertaHoje = CriarVenda("aberta-hoje", new DateOnly(2027, 2, 15), 15_000, 1);
        var inativaProxima = AlterarStatus(
            CriarVenda("inativa-proxima", new DateOnly(2027, 2, 15), 12_000, 2),
            StatusAdministrativoVenda.Inativo);
        var prejuizoAberto = AlterarStatus(
            CriarVenda("prejuizo-aberto", new DateOnly(2027, 3, 15), 18_000, 2),
            StatusAdministrativoVenda.Prejuizo);
        var quitadaHoje = Quitar(
            CriarVenda("quitada-hoje", new DateOnly(2027, 2, 15), 8_000, 1),
            Referencia);

        return
        [
            ("Abertas", abertaAtrasada, new("aberta-atrasada", "Ativo", "Atrasada", 12_000, 0, 12_000, 0, 2, new DateOnly(2027, 2, 15), new DateOnly(2027, 1, 15), null)),
            ("Inativas", inativaAtrasada, new("inativa-atrasada", "Inativo", "Atrasada", 20_000, 0, 20_000, 0, 2, new DateOnly(2027, 2, 15), new DateOnly(2027, 1, 15), "cadastro 🧾")),
            ("Prejuizo", prejuizoProximo, new("prejuizo-proximo", "Prejuizo", "ProximosDias", 10_000, 0, 10_000, 0, 1, new DateOnly(2027, 3, 15), new DateOnly(2027, 2, 15), null)),
            ("Quitadas", quitadaAntiga, new("quitada-antiga", "Ativo", "Quitada", 10_000, 10_000, 0, 1, 1, null, new DateOnly(2027, 1, 15), null)),
            ("Abertas", abertaHoje, new("aberta-hoje", "Ativo", "ProximosDias", 15_000, 0, 15_000, 0, 1, new DateOnly(2027, 3, 15), new DateOnly(2027, 2, 15), "hoje")),
            ("Inativas", inativaProxima, new("inativa-proxima", "Inativo", "ProximosDias", 12_000, 0, 12_000, 0, 2, new DateOnly(2027, 3, 15), new DateOnly(2027, 2, 15), null)),
            ("Prejuizo", prejuizoAberto, new("prejuizo-aberto", "Prejuizo", "EmAberto", 18_000, 0, 18_000, 0, 2, new DateOnly(2027, 4, 15), new DateOnly(2027, 3, 15), "perda")),
            ("Quitadas", quitadaHoje, new("quitada-hoje", "Ativo", "Quitada", 8_000, 8_000, 0, 1, 1, null, new DateOnly(2027, 2, 15), null))
        ];
    }

    private static Venda CriarVenda(string id, DateOnly dataVenda, long valorTotalCentavos, int quantidadeParcelas)
    {
        var cliente = Sucesso(DadosClienteVenda.Criar(
            $"Cliente {id}",
            "52998224725",
            "(11) 98765-4321",
            id switch
            {
                "inativa-atrasada" => "cadastro 🧾",
                "aberta-hoje" => "hoje",
                "prejuizo-aberto" => "perda",
                _ => null
            }));
        return Sucesso(Venda.Cadastrar(
            id,
            cliente,
            dataVenda,
            DinheiroValor(valorTotalCentavos),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(indice => $"{id}-parcela-{indice}").ToArray(),
            Referencia));
    }

    private static Venda AlterarStatus(Venda venda, StatusAdministrativoVenda status) =>
        Sucesso(venda.AlterarStatusAdministrativo(status));

    private static Venda Quitar(Venda venda, DateOnly data) =>
        Sucesso(venda.RegistrarPagamento(
            $"{venda.Id}-recebimento",
            venda.Parcelas[0].Id,
            venda.Parcelas[0].ValorBase,
            data,
            FormaPagamento.Pix,
            Referencia));

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string query)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/vendas" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static void AssertResumo(JsonElement json, ResumoEsperado esperado)
    {
        Assert.AreEqual(15, json.EnumerateObject().Count(), esperado.Id);
        Assert.AreEqual(esperado.Id, json.GetProperty("id").GetString());
        Assert.AreEqual("2027-03-15", json.GetProperty("referencia").GetString());
        Assert.AreEqual("1", json.GetProperty("revisao").GetString());
        Assert.AreEqual(esperado.DataVenda.ToString("yyyy-MM-dd"), json.GetProperty("dataVenda").GetString());
        Assert.AreEqual(esperado.StatusAdministrativo, json.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(esperado.Situacao, json.GetProperty("situacao").GetString());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, json.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(0L, json.GetProperty("totalAcrescimosCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, json.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalRecebidoCentavos, json.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, json.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.QuantidadePaga, json.GetProperty("quantidadePaga").GetInt32());
        Assert.AreEqual(esperado.QuantidadeParcelas, json.GetProperty("quantidadeParcelas").GetInt32());
        Assert.AreEqual(
            esperado.ProximoVencimento?.ToString("yyyy-MM-dd"),
            json.GetProperty("proximoVencimento").ValueKind == JsonValueKind.Null
                ? null
                : json.GetProperty("proximoVencimento").GetString());

        var cliente = json.GetProperty("cliente");
        Assert.AreEqual(4, cliente.EnumerateObject().Count());
        Assert.AreEqual($"Cliente {esperado.Id}", cliente.GetProperty("nome").GetString());
        Assert.AreEqual("52998224725", cliente.GetProperty("cpf").GetString());
        Assert.AreEqual("11987654321", cliente.GetProperty("telefone").GetString());
        Assert.AreEqual(
            esperado.Descricao,
            cliente.GetProperty("descricao").ValueKind == JsonValueKind.Null
                ? null
                : cliente.GetProperty("descricao").GetString());
    }

    private static string ConverterSegredoAleatorio() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed record ResumoEsperado(
        string Id,
        string StatusAdministrativo,
        string Situacao,
        long ValorTotalBaseCentavos,
        long TotalRecebidoCentavos,
        long SaldoCentavos,
        int QuantidadePaga,
        int QuantidadeParcelas,
        DateOnly? ProximoVencimento,
        DateOnly DataVenda,
        string? Descricao);
}
