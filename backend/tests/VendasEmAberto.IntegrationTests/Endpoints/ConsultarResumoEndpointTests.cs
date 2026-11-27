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
public sealed class ConsultarResumoEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);

    [TestMethod]
    public async Task GetResumo_ConciliaIndicadoresDeStatusMistosEContaEntradaUmaUnicaVez()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);
        var armazenamento = fixture.Servicos.GetRequiredService<IArmazenamentoVendas>();
        var vendas = CriarCenarioMisto();
        var salvamento = await armazenamento.SalvarAsync(
            fixture.CaminhoBanco,
            vendas,
            revisaoEsperada: 0,
            Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);

        using var resposta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        Assert.AreEqual(6, raiz.EnumerateObject().Count());
        Assert.AreEqual(20_000L, raiz.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual("20000", raiz.GetProperty("totalEmAbertoCentavos").GetRawText());
        Assert.AreEqual(10_000L, raiz.GetProperty("valoresEmAtrasoCentavos").GetInt64());
        Assert.AreEqual("10000", raiz.GetProperty("valoresEmAtrasoCentavos").GetRawText());
        Assert.AreEqual(50_000L, raiz.GetProperty("recebidoNoMesCentavos").GetInt64());
        Assert.AreEqual("50000", raiz.GetProperty("recebidoNoMesCentavos").GetRawText());
        Assert.AreEqual(3, raiz.GetProperty("quantidadeVendasAtivas").GetInt32());
        Assert.AreEqual("1", raiz.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), raiz.GetProperty("referencia").GetString());

        using var referenciaAusente = await EnviarAsync(fixture.Cliente, segredo, "");
        Assert.AreEqual(HttpStatusCode.BadRequest, referenciaAusente.StatusCode);
        Assert.AreEqual("no-store", referenciaAusente.Headers.CacheControl?.ToString());
        using var problema = JsonDocument.Parse(await referenciaAusente.Content.ReadAsStringAsync());
        Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(5, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(50_000L, snapshot.Conjunto.Vendas
            .SelectMany(venda => venda.Recebimentos)
            .Sum(recebimento => recebimento.Valor.Centavos));
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.SelectMany(venda => venda.Recebimentos)
            .Count(recebimento => recebimento.Origem == OrigemRecebimento.Entrada));
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.SelectMany(venda => venda.Recebimentos)
            .Count(recebimento => recebimento.Origem == OrigemRecebimento.HistoricoLote));
    }

    [TestMethod]
    public async Task GetResumo_BancoVazioRetornaZerosSemAvancarRevisao()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);

        using var resposta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?referencia={Referencia:yyyy-MM-dd}");

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.AreEqual(0L, documento.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(0L, documento.RootElement.GetProperty("valoresEmAtrasoCentavos").GetInt64());
        Assert.AreEqual(0L, documento.RootElement.GetProperty("recebidoNoMesCentavos").GetInt64());
        Assert.AreEqual(0, documento.RootElement.GetProperty("quantidadeVendasAtivas").GetInt32());
        Assert.AreEqual("0", documento.RootElement.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"),
            documento.RootElement.GetProperty("referencia").GetString());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    [TestMethod]
    public async Task GetResumo_PreservaLimiteSeguroDeCentavosComoInteiroAntesEDepoisDeReceber()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(segredoLocal: segredo);
        var armazenamento = fixture.Servicos.GetRequiredService<IArmazenamentoVendas>();
        var venda = CriarVenda("limite-centavos", Dinheiro.LimiteCentavos, 1, new DateOnly(2027, 2, 16));

        var primeiroSalvamento = await armazenamento.SalvarAsync(
            fixture.CaminhoBanco,
            [venda],
            revisaoEsperada: 0,
            Referencia);
        Assert.AreEqual(1L,
            Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(primeiroSalvamento).Valor);

        using (var aberta = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?referencia={Referencia:yyyy-MM-dd}"))
        {
            Assert.AreEqual(HttpStatusCode.OK, aberta.StatusCode);
            Assert.AreEqual("no-store", aberta.Headers.CacheControl?.ToString());
            using var documento = JsonDocument.Parse(await aberta.Content.ReadAsStringAsync());
            Assert.AreEqual(Dinheiro.LimiteCentavos,
                documento.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64());
            Assert.AreEqual("9007199254740991",
                documento.RootElement.GetProperty("totalEmAbertoCentavos").GetRawText());
            Assert.AreEqual("1", documento.RootElement.GetProperty("revisao").GetString());
        }

        var quitada = Sucesso(venda.RegistrarPagamento(
            "limite-centavos-recebimento",
            venda.Parcelas[0].Id,
            DinheiroValor(Dinheiro.LimiteCentavos),
            Referencia,
            FormaPagamento.Pix,
            Referencia));
        var segundoSalvamento = await armazenamento.SalvarAsync(
            fixture.CaminhoBanco,
            [quitada],
            revisaoEsperada: 1,
            Referencia);
        Assert.AreEqual(2L,
            Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(segundoSalvamento).Valor);

        using (var paga = await EnviarAsync(
            fixture.Cliente,
            segredo,
            $"?referencia={Referencia:yyyy-MM-dd}"))
        {
            Assert.AreEqual(HttpStatusCode.OK, paga.StatusCode);
            Assert.AreEqual("no-store", paga.Headers.CacheControl?.ToString());
            using var documento = JsonDocument.Parse(await paga.Content.ReadAsStringAsync());
            Assert.AreEqual(0L, documento.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64());
            Assert.AreEqual(Dinheiro.LimiteCentavos,
                documento.RootElement.GetProperty("recebidoNoMesCentavos").GetInt64());
            Assert.AreEqual("9007199254740991",
                documento.RootElement.GetProperty("recebidoNoMesCentavos").GetRawText());
            Assert.AreEqual("2", documento.RootElement.GetProperty("revisao").GetString());
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(fixture.CaminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(Dinheiro.LimiteCentavos, snapshot.Conjunto.Vendas[0].Recebimentos.Single().Valor.Centavos);
    }

    private static Venda[] CriarCenarioMisto()
    {
        var ativaEntradaELote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "ativa-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada/Lote"),
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

        var ativaAtrasada = CriarVenda("ativa-atrasada", 10_000, 1, new DateOnly(2027, 1, 15));
        var ativaQuitada = Registrar(
            CriarVenda("ativa-quitada", 10_000, 1, new DateOnly(2027, 1, 15)),
            "recebimento-ativa",
            10_000,
            new DateOnly(2027, 3, 5));
        var inativa = Sucesso(Registrar(
                CriarVenda("inativa", 20_000, 2, new DateOnly(2027, 1, 15)),
                "recebimento-inativa",
                10_000,
                new DateOnly(2027, 3, 7))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizo = Sucesso(Registrar(
                CriarVenda("prejuizo", 20_000, 2, new DateOnly(2027, 1, 15)),
                "recebimento-prejuizo",
                10_000,
                new DateOnly(2027, 3, 8))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [ativaEntradaELote, ativaAtrasada, ativaQuitada, inativa, prejuizo];
    }

    private static Venda CriarVenda(string id, long valor, int quantidade, DateOnly dataVenda) => Sucesso(
        Venda.Cadastrar(
            id,
            Cliente(id),
            dataVenda,
            DinheiroValor(valor),
            quantidade,
            Enumerable.Range(1, quantidade).Select(indice => $"{id}-p{indice}").ToArray(),
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
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/resumo" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static DadosClienteVenda Cliente(string nome) =>
        Sucesso(DadosClienteVenda.Criar(nome, "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
