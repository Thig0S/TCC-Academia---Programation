using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class ConsultarPeriodoEndpointTests
{
    private static readonly DateOnly Inicio = new(2027, 3, 1);
    private static readonly DateOnly Fim = new(2027, 3, 31);
    private static readonly DateOnly Referencia = new(2027, 4, 2);

    [TestMethod]
    public async Task GetPeriodo_UsaBordasInclusivasERecebimentosDeTodosOsStatusPorDataEfetiva()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);
        var armazenamento = fixture.Servicos.GetRequiredService<IArmazenamentoVendas>();
        var vendas = CriarCenario();
        var salvamento = await armazenamento.SalvarAsync(
            fixture.CaminhoBanco,
            vendas,
            revisaoEsperada: 0,
            Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);

        using var resposta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?inicio={Inicio:yyyy-MM-dd}&fim={Fim:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        Assert.AreEqual(6, raiz.EnumerateObject().Count());
        Assert.AreEqual(Inicio.ToString("yyyy-MM-dd"), raiz.GetProperty("inicio").GetString());
        Assert.AreEqual(Fim.ToString("yyyy-MM-dd"), raiz.GetProperty("fim").GetString());
        Assert.AreEqual(38_000L, raiz.GetProperty("recebidosCentavos").GetInt64());
        Assert.AreEqual("38000", raiz.GetProperty("recebidosCentavos").GetRawText());
        Assert.AreEqual("1", raiz.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), raiz.GetProperty("referencia").GetString());

        var resumos = raiz.GetProperty("vendas").EnumerateArray().ToArray();
        Assert.AreEqual(3, resumos.Length);
        AssertResumo(resumos[0], new ResumoEsperado(
            "ativa-aberta-no-periodo",
            "2027-03-15",
            "EmAberto",
            10_000,
            0,
            10_000,
            0,
            1,
            "2027-04-15"));
        AssertResumo(resumos[1], new ResumoEsperado(
            "ativa-borda-inicial",
            "2027-03-01",
            "Quitada",
            10_000,
            10_000,
            0,
            1,
            1,
            null));
        AssertResumo(resumos[2], new ResumoEsperado(
            "ativa-borda-final",
            "2027-03-31",
            "Quitada",
            10_000,
            10_000,
            0,
            1,
            1,
            null));

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(6, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(38_000L, snapshot.Conjunto.Vendas
            .SelectMany(venda => venda.Recebimentos)
            .Where(recebimento => recebimento.Data >= Inicio && recebimento.Data <= Fim)
            .Sum(recebimento => recebimento.Valor.Centavos));
        Assert.IsTrue(snapshot.Conjunto.Vendas.Any(venda =>
            venda.Id == "ativa-fora-do-periodo" && venda.DataVenda < Inicio));
        Assert.IsTrue(snapshot.Conjunto.Vendas.Any(venda =>
            venda.Id == "inativa-no-periodo" && venda.StatusAdministrativo == StatusAdministrativoVenda.Inativo));
        Assert.IsTrue(snapshot.Conjunto.Vendas.Any(venda =>
            venda.Id == "prejuizo-fora-do-periodo" && venda.StatusAdministrativo == StatusAdministrativoVenda.Prejuizo));
    }

    [TestMethod]
    public async Task GetPeriodo_VazioRetornaRepresentacaoCompletaEParametrosInvalidosNaoEscrevem()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);
        var queryValida = $"?inicio={Inicio:yyyy-MM-dd}&fim={Fim:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}";

        using (var vazia = await EnviarAsync(fixture.Cliente, segredo, queryValida))
        {
            Assert.AreEqual(HttpStatusCode.OK, vazia.StatusCode);
            Assert.AreEqual("no-store", vazia.Headers.CacheControl?.ToString());
            using var documento = JsonDocument.Parse(await vazia.Content.ReadAsStringAsync());
            Assert.AreEqual(Inicio.ToString("yyyy-MM-dd"), documento.RootElement.GetProperty("inicio").GetString());
            Assert.AreEqual(Fim.ToString("yyyy-MM-dd"), documento.RootElement.GetProperty("fim").GetString());
            Assert.AreEqual(0L, documento.RootElement.GetProperty("recebidosCentavos").GetInt64());
            Assert.AreEqual("0", documento.RootElement.GetProperty("revisao").GetString());
            Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"),
                documento.RootElement.GetProperty("referencia").GetString());
            Assert.AreEqual(0, documento.RootElement.GetProperty("vendas").GetArrayLength());
        }

        foreach (var query in new[]
        {
            $"?fim={Fim:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}",
            $"?inicio={Inicio:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}",
            $"?inicio={Inicio:yyyy-MM-dd}&fim={Fim:yyyy-MM-dd}",
            "?inicio=2027-02-30&fim=2027-03-31&referencia=2027-04-02",
            $"?inicio={Fim:yyyy-MM-dd}&fim={Inicio:yyyy-MM-dd}&referencia={Referencia:yyyy-MM-dd}"
        })
        {
            using var invalida = await EnviarAsync(fixture.Cliente, segredo, query);
            Assert.AreEqual(HttpStatusCode.BadRequest, invalida.StatusCode, query);
            Assert.AreEqual("no-store", invalida.Headers.CacheControl?.ToString(), query);
            using var problema = JsonDocument.Parse(await invalida.Content.ReadAsStringAsync());
            var codigoEsperado = query.StartsWith($"?inicio={Fim:yyyy-MM-dd}", StringComparison.Ordinal)
                ? "periodo-invalido"
                : "requisicao-invalida";
            Assert.AreEqual(codigoEsperado, problema.RootElement.GetProperty("codigo").GetString(), query);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private static Venda[] CriarCenario()
    {
        var aberta = CriarVenda("ativa-aberta-no-periodo", 10_000, new DateOnly(2027, 3, 15));
        var bordaInicial = Registrar(
            CriarVenda("ativa-borda-inicial", 10_000, Inicio),
            "recebimento-borda-inicial",
            10_000,
            Inicio);
        var bordaFinal = Registrar(
            CriarVenda("ativa-borda-final", 10_000, Fim),
            "recebimento-borda-final",
            10_000,
            Fim);
        var foraDoPeriodo = Registrar(
            CriarVenda("ativa-fora-do-periodo", 5_000, new DateOnly(2027, 2, 28)),
            "recebimento-fora-no-periodo",
            5_000,
            new DateOnly(2027, 3, 15));
        var inativa = Sucesso(Registrar(
                CriarVenda("inativa-no-periodo", 6_000, new DateOnly(2027, 3, 10)),
                "recebimento-inativo-na-borda",
                6_000,
                Fim)
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoBase = Sucesso(Venda.Cadastrar(
            "prejuizo-fora-do-periodo",
            Cliente("prejuizo-fora-do-periodo"),
            new DateOnly(2027, 2, 20),
            DinheiroValor(14_000),
            2,
            ["prejuizo-parcela-1", "prejuizo-parcela-2"],
            Referencia));
        var prejuizo = Sucesso(Registrar(
                prejuizoBase,
                "recebimento-prejuizo-na-borda",
                7_000,
                Inicio)
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [aberta, bordaInicial, bordaFinal, foraDoPeriodo, inativa, prejuizo];
    }

    private static Venda CriarVenda(string id, long valor, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(id),
        dataVenda,
        DinheiroValor(valor),
        1,
        [$"{id}-parcela"],
        Referencia));

    private static Venda Registrar(Venda venda, string recebimentoId, long valor, DateOnly data) => Sucesso(
        venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValor(valor),
            data,
            FormaPagamento.Pix,
            Referencia));

    private static async Task<HttpResponseMessage> EnviarAsync(
        HttpClient cliente,
        string segredo,
        string query)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/periodo" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static void AssertResumo(JsonElement json, ResumoEsperado esperado)
    {
        Assert.AreEqual(15, json.EnumerateObject().Count(), esperado.Id);
        Assert.AreEqual(esperado.Id, json.GetProperty("id").GetString());
        Assert.AreEqual(esperado.DataVenda, json.GetProperty("dataVenda").GetString());
        Assert.AreEqual("Ativo", json.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(esperado.Situacao, json.GetProperty("situacao").GetString());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, json.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(0L, json.GetProperty("totalAcrescimosCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, json.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalRecebidoCentavos, json.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, json.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.QuantidadePaga, json.GetProperty("quantidadePaga").GetInt32());
        Assert.AreEqual(esperado.QuantidadeParcelas, json.GetProperty("quantidadeParcelas").GetInt32());
        Assert.AreEqual(esperado.ProximoVencimento, json.GetProperty("proximoVencimento").ValueKind == JsonValueKind.Null
            ? null
            : json.GetProperty("proximoVencimento").GetString());
        Assert.AreEqual("1", json.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), json.GetProperty("referencia").GetString());

        var cliente = json.GetProperty("cliente");
        Assert.AreEqual(4, cliente.EnumerateObject().Count());
        Assert.AreEqual($"Cliente {esperado.Id}", cliente.GetProperty("nome").GetString());
        Assert.AreEqual("52998224725", cliente.GetProperty("cpf").GetString());
        Assert.AreEqual("11987654321", cliente.GetProperty("telefone").GetString());
        Assert.AreEqual(JsonValueKind.Null, cliente.GetProperty("descricao").ValueKind);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static DadosClienteVenda Cliente(string nome) =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed record ResumoEsperado(
        string Id,
        string DataVenda,
        string Situacao,
        long ValorTotalBaseCentavos,
        long TotalRecebidoCentavos,
        long SaldoCentavos,
        int QuantidadePaga,
        int QuantidadeParcelas,
        string? ProximoVencimento);
}
