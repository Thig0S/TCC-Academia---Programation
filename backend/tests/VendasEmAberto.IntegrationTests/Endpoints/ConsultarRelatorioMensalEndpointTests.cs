using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class ConsultarRelatorioMensalEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 4, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-relatorio-mensal-{Guid.NewGuid():N}");
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
    public async Task GetRelatorioMensal_MapeiaTodosOsCamposEConciliaSecoesAposReabrirSqlite()
    {
        var segredo = CriarSegredo();
        var vendas = CriarCenarioCompleto();
        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var salvamento = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, vendas, revisaoEsperada: 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var sender = reaberto.Servicos.GetRequiredService<ISender>();
        var consulta = new ConsultarRelatorioMensalQuery(2027, 3, Referencia);
        var baseline = await sender.Send(consulta);
        Assert.IsTrue(baseline.IsSuccess);

        using var resposta = await EnviarAsync(reaberto.Cliente, segredo, 2027, 3, Referencia);

        Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
        Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
        Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var raiz = documento.RootElement;
        AssertRelatorioCompleto(raiz, baseline.Value);

        Assert.AreEqual(101_000L, raiz.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual("101000", raiz.GetProperty("totalRecebidoCentavos").GetRawText());
        Assert.AreEqual(2, raiz.GetProperty("quantidadeVendasMes").GetInt32());
        Assert.AreEqual(221_000L, raiz.GetProperty("totalVendasMesCentavos").GetInt64());
        Assert.AreEqual(170_000L, raiz.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(20_000L, raiz.GetProperty("totalAtrasadoCentavos").GetInt64());
        Assert.AreEqual(10_000L, raiz.GetProperty("totalPrejuizoCentavos").GetInt64());
        Assert.AreEqual("1", raiz.GetProperty("revisao").GetString());

        var recebimentos = raiz.GetProperty("recebimentos").EnumerateArray().ToArray();
        CollectionAssert.AreEqual(
            new[] { "entrada", "lote", "recebimento-ativo", "recebimento-inativo", "recebimento-prejuizo", "entrada-prejuizo" },
            recebimentos.Select(item => item.GetProperty("id").GetString()).ToArray());
        CollectionAssert.AreEqual(
            new[] { "Entrada", "HistoricoLote", "Individual", "Individual", "Individual", "Entrada" },
            recebimentos.Select(item => item.GetProperty("origem").GetString()).ToArray());
        Assert.AreEqual("Cliente Entrada/Lote", recebimentos[0].GetProperty("venda").GetProperty("cliente").GetProperty("nome").GetString());
        Assert.AreEqual("1", recebimentos[0].GetProperty("venda").GetProperty("revisao").GetString());

        var diarios = raiz.GetProperty("recebimentosDiarios").EnumerateArray().ToArray();
        Assert.AreEqual(31, diarios.Length);
        Assert.AreEqual(101_000L, diarios.Sum(item => item.GetProperty("totalCentavos").GetInt64()));
        Assert.AreEqual("2027-03-01", diarios[0].GetProperty("data").GetString());
        Assert.AreEqual(20_000L, diarios[0].GetProperty("totalCentavos").GetInt64());
        Assert.AreEqual("2027-03-31", diarios[^1].GetProperty("data").GetString());
        Assert.AreEqual(40_000L, diarios[^1].GetProperty("totalCentavos").GetInt64());

        CollectionAssert.AreEqual(
            new[] { "ativa-entrada-lote", "ativa-individual" },
            raiz.GetProperty("vendasDoMes").EnumerateArray()
                .Select(item => item.GetProperty("id").GetString()).ToArray());
        CollectionAssert.AreEqual(
            new[] { "ativa-atrasada", "ativa-individual", "ativa-entrada-lote" },
            raiz.GetProperty("saldos").EnumerateArray()
                .Select(item => item.GetProperty("venda").GetProperty("id").GetString()).ToArray());
        CollectionAssert.AreEqual(
            new[] { "ativa-atrasada-parcela-1", "ativa-atrasada-parcela-2" },
            raiz.GetProperty("parcelasAtrasadas").EnumerateArray()
                .Select(item => item.GetProperty("parcela").GetProperty("id").GetString()).ToArray());
        CollectionAssert.AreEqual(
            new[] { ("prejuizo-pago", false), ("prejuizo-entrada", false), ("prejuizo-sem-recebimento", true) },
            raiz.GetProperty("parcelasPrejuizo").EnumerateArray()
                .Select(item => (
                    item.GetProperty("venda").GetProperty("id").GetString(),
                    item.GetProperty("incluirNoTotal").GetBoolean()))
                .ToArray());

        var semMovimento = await sender.Send(new ConsultarRelatorioMensalQuery(2024, 2, Referencia));
        Assert.IsTrue(semMovimento.IsSuccess);
        using var respostaSemMovimento = await EnviarAsync(reaberto.Cliente, segredo, 2024, 2, Referencia);
        Assert.AreEqual(HttpStatusCode.OK, respostaSemMovimento.StatusCode);
        using var documentoSemMovimento = JsonDocument.Parse(await respostaSemMovimento.Content.ReadAsStringAsync());
        AssertRelatorioCompleto(documentoSemMovimento.RootElement, semMovimento.Value);
        Assert.AreEqual("2027-04-15", documentoSemMovimento.RootElement.GetProperty("referencia").GetString());
        Assert.AreEqual("2024-02-01", documentoSemMovimento.RootElement.GetProperty("inicioMes").GetString());
        Assert.AreEqual("2024-02-29", documentoSemMovimento.RootElement.GetProperty("fimMes").GetString());
        Assert.AreEqual(29, documentoSemMovimento.RootElement.GetProperty("recebimentosDiarios").GetArrayLength());
        Assert.IsTrue(documentoSemMovimento.RootElement.GetProperty("recebimentosDiarios")
            .EnumerateArray().All(item => item.GetProperty("totalCentavos").GetInt64() == 0));
        Assert.AreEqual(170_000L, documentoSemMovimento.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(7, snapshot.Conjunto.Vendas.Count);
    }

    [TestMethod]
    public async Task GetRelatorioMensal_CorrecaoIndividualMoveRecebimentoEntreMesesSemAlterarPosicaoNaReferencia()
    {
        var segredo = CriarSegredo();
        var referencia = new DateOnly(2027, 4, 30);
        var venda = Sucesso(Venda.Cadastrar(
            "correcao-mensal",
            Cliente("Correção mensal"),
            new DateOnly(2027, 1, 15),
            DinheiroValor(20_000),
            2,
            ["correcao-parcela-1", "correcao-parcela-2"],
            referencia));
        venda = Sucesso(venda.RegistrarPagamento(
            "recebimento-estavel",
            "correcao-parcela-1",
            DinheiroValor(11_000),
            new DateOnly(2027, 3, 31),
            FormaPagamento.Pix,
            referencia));

        await using (var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo))
        {
            var salvamento = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, [venda], revisaoEsperada: 0, referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvamento).Valor);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var sender = reaberto.Servicos.GetRequiredService<ISender>();
        var correcao = await sender.Send(new CorrigirPagamentoCommand(
            "correcao-mensal",
            "recebimento-estavel",
            11_000,
            new DateOnly(2027, 4, 1),
            FormaPagamento.Pix,
            null,
            referencia,
            1));
        Assert.IsTrue(correcao.IsSuccess);
        Assert.AreEqual(2L, correcao.Value.Resumo.Revisao);

        var marco = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 3, referencia));
        var abril = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 4, referencia));
        using var respostaMarco = await EnviarAsync(reaberto.Cliente, segredo, 2027, 3, referencia);
        using var respostaAbril = await EnviarAsync(reaberto.Cliente, segredo, 2027, 4, referencia);
        Assert.AreEqual(HttpStatusCode.OK, respostaMarco.StatusCode);
        Assert.AreEqual(HttpStatusCode.OK, respostaAbril.StatusCode);
        Assert.AreEqual("no-store", respostaMarco.Headers.CacheControl?.ToString());
        Assert.AreEqual("no-store", respostaAbril.Headers.CacheControl?.ToString());
        using var jsonMarco = JsonDocument.Parse(await respostaMarco.Content.ReadAsStringAsync());
        using var jsonAbril = JsonDocument.Parse(await respostaAbril.Content.ReadAsStringAsync());
        AssertRelatorioCompleto(jsonMarco.RootElement, marco.Value);
        AssertRelatorioCompleto(jsonAbril.RootElement, abril.Value);
        Assert.AreEqual(0, jsonMarco.RootElement.GetProperty("recebimentos").GetArrayLength());
        Assert.AreEqual(0L, jsonMarco.RootElement.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(1, jsonAbril.RootElement.GetProperty("recebimentos").GetArrayLength());
        Assert.AreEqual("recebimento-estavel", jsonAbril.RootElement.GetProperty("recebimentos")[0].GetProperty("id").GetString());
        Assert.AreEqual("2027-04-01", jsonAbril.RootElement.GetProperty("recebimentos")[0].GetProperty("data").GetString());
        Assert.AreEqual("Individual", jsonAbril.RootElement.GetProperty("recebimentos")[0].GetProperty("origem").GetString());
        Assert.AreEqual(11_000L, jsonAbril.RootElement.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual("2", jsonMarco.RootElement.GetProperty("revisao").GetString());
        Assert.AreEqual("2", jsonAbril.RootElement.GetProperty("revisao").GetString());
        Assert.AreEqual(referencia.ToString("yyyy-MM-dd"), jsonMarco.RootElement.GetProperty("referencia").GetString());
        Assert.AreEqual(referencia.ToString("yyyy-MM-dd"), jsonAbril.RootElement.GetProperty("referencia").GetString());
        Assert.AreEqual(jsonMarco.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64(),
            jsonAbril.RootElement.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(jsonMarco.RootElement.GetProperty("totalAtrasadoCentavos").GetInt64(),
            jsonAbril.RootElement.GetProperty("totalAtrasadoCentavos").GetInt64());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(new DateOnly(2027, 4, 1), snapshot.Conjunto.Vendas.Single().Recebimentos.Single().Data);
    }

    [TestMethod]
    public async Task GetRelatorioMensal_AceitaBissextoELimitesDoCalendarioERejeitaParametrosSemEscrever()
    {
        var segredo = CriarSegredo();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var sender = fixture.Servicos.GetRequiredService<ISender>();
        var consultas = new[]
        {
            (Ano: 2024, Mes: 2, Dias: 29, Referencia: new DateOnly(2027, 4, 15)),
            (Ano: 1, Mes: 1, Dias: 31, Referencia: DateOnly.MinValue),
            (Ano: 9999, Mes: 12, Dias: 31, Referencia: DateOnly.MaxValue)
        };

        foreach (var (ano, mes, dias, referencia) in consultas)
        {
            var baseline = await sender.Send(new ConsultarRelatorioMensalQuery(ano, mes, referencia));
            Assert.IsTrue(baseline.IsSuccess);
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, ano, mes, referencia);
            Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString());
            using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            AssertRelatorioCompleto(documento.RootElement, baseline.Value);
            Assert.AreEqual(dias, documento.RootElement.GetProperty("recebimentosDiarios").GetArrayLength());
            Assert.AreEqual("0", documento.RootElement.GetProperty("revisao").GetString());
            Assert.AreEqual(referencia.ToString("yyyy-MM-dd"),
                documento.RootElement.GetProperty("referencia").GetString());
            var diasJson = documento.RootElement.GetProperty("recebimentosDiarios").EnumerateArray().ToArray();
            Assert.AreEqual(1, DateOnly.Parse(diasJson[0].GetProperty("data").GetString()!).Day);
            Assert.AreEqual(dias, DateOnly.Parse(diasJson[^1].GetProperty("data").GetString()!).Day);
            Assert.IsTrue(diasJson.All(item => item.GetProperty("totalCentavos").GetInt64() == 0));
        }

        var consultasInvalidas = new[]
        {
            "?mes=3&referencia=2027-04-15",
            "?ano=2027&referencia=2027-04-15",
            "?ano=2027&mes=3",
            "?ano=0&mes=3&referencia=2027-04-15",
            "?ano=10000&mes=3&referencia=2027-04-15",
            "?ano=2027&mes=0&referencia=2027-04-15",
            "?ano=2027&mes=13&referencia=2027-04-15",
            "?ano=abc&mes=3&referencia=2027-04-15",
            "?ano=2027&mes=3&referencia=2027-02-30",
            "?ano=2027&ano=2028&mes=3&referencia=2027-04-15"
        };

        foreach (var query in consultasInvalidas)
        {
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, query);
            Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode, query);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), query);
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual("requisicao-invalida", problema.RootElement.GetProperty("codigo").GetString(), query);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, new DateOnly(2027, 4, 15))).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private static void AssertRelatorioCompleto(JsonElement json, RelatorioMensalResposta esperado)
    {
        Assert.AreEqual(16, json.EnumerateObject().Count());
        Assert.AreEqual(esperado.Referencia.ToString("yyyy-MM-dd"), json.GetProperty("referencia").GetString());
        Assert.AreEqual(esperado.InicioMes.ToString("yyyy-MM-dd"), json.GetProperty("inicioMes").GetString());
        Assert.AreEqual(esperado.FimMes.ToString("yyyy-MM-dd"), json.GetProperty("fimMes").GetString());
        Assert.AreEqual(esperado.Revisao.ToString(System.Globalization.CultureInfo.InvariantCulture), json.GetProperty("revisao").GetString());

        var recebimentos = json.GetProperty("recebimentos").EnumerateArray().ToArray();
        Assert.AreEqual(esperado.Recebimentos.Count, recebimentos.Length);
        for (var indice = 0; indice < recebimentos.Length; indice++)
        {
            var atual = recebimentos[indice];
            var baseline = esperado.Recebimentos[indice];
            Assert.AreEqual(6, atual.EnumerateObject().Count());
            Assert.AreEqual(baseline.Id, atual.GetProperty("id").GetString());
            Assert.AreEqual(baseline.Origem.ToString(), atual.GetProperty("origem").GetString());
            Assert.AreEqual(baseline.Data.ToString("yyyy-MM-dd"), atual.GetProperty("data").GetString());
            Assert.AreEqual(baseline.Forma.ToString(), atual.GetProperty("forma").GetString());
            Assert.AreEqual(baseline.ValorCentavos, atual.GetProperty("valorCentavos").GetInt64());
            AssertResumo(atual.GetProperty("venda"), baseline.Venda);
        }

        var diarios = json.GetProperty("recebimentosDiarios").EnumerateArray().ToArray();
        Assert.AreEqual(esperado.RecebimentosDiarios.Count, diarios.Length);
        for (var indice = 0; indice < diarios.Length; indice++)
        {
            Assert.AreEqual(2, diarios[indice].EnumerateObject().Count());
            Assert.AreEqual(esperado.RecebimentosDiarios[indice].Data.ToString("yyyy-MM-dd"),
                diarios[indice].GetProperty("data").GetString());
            Assert.AreEqual(esperado.RecebimentosDiarios[indice].TotalCentavos,
                diarios[indice].GetProperty("totalCentavos").GetInt64());
        }

        AssertListaResumos(json.GetProperty("vendasDoMes"), esperado.VendasDoMes);

        var saldos = json.GetProperty("saldos").EnumerateArray().ToArray();
        Assert.AreEqual(esperado.Saldos.Count, saldos.Length);
        for (var indice = 0; indice < saldos.Length; indice++)
        {
            var atual = saldos[indice];
            var baseline = esperado.Saldos[indice];
            Assert.AreEqual(3, atual.EnumerateObject().Count());
            AssertResumo(atual.GetProperty("venda"), baseline.Venda);
            Assert.AreEqual(baseline.SaldoCentavos, atual.GetProperty("saldoCentavos").GetInt64());
            AssertDataOuNull(atual.GetProperty("primeiroVencimentoPendente"), baseline.PrimeiroVencimentoPendente);
        }

        AssertListaParcelas(json.GetProperty("parcelasAtrasadas"), esperado.ParcelasAtrasadas);

        var prejuizos = json.GetProperty("parcelasPrejuizo").EnumerateArray().ToArray();
        Assert.AreEqual(esperado.ParcelasPrejuizo.Count, prejuizos.Length);
        for (var indice = 0; indice < prejuizos.Length; indice++)
        {
            var atual = prejuizos[indice];
            var baseline = esperado.ParcelasPrejuizo[indice];
            Assert.AreEqual(3, atual.EnumerateObject().Count());
            AssertResumo(atual.GetProperty("venda"), baseline.Venda);
            AssertParcela(atual.GetProperty("parcela"), baseline.Parcela);
            Assert.AreEqual(baseline.IncluirNoTotal, atual.GetProperty("incluirNoTotal").GetBoolean());
        }

        Assert.AreEqual(esperado.TotalRecebidoCentavos, json.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.QuantidadeVendasMes, json.GetProperty("quantidadeVendasMes").GetInt32());
        Assert.AreEqual(esperado.TotalVendasMesCentavos, json.GetProperty("totalVendasMesCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalEmAbertoCentavos, json.GetProperty("totalEmAbertoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalAtrasadoCentavos, json.GetProperty("totalAtrasadoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalPrejuizoCentavos, json.GetProperty("totalPrejuizoCentavos").GetInt64());
    }

    private static void AssertListaResumos(JsonElement json, IReadOnlyList<VendaResumoResposta> esperados)
    {
        var atuais = json.EnumerateArray().ToArray();
        Assert.AreEqual(esperados.Count, atuais.Length);
        for (var indice = 0; indice < atuais.Length; indice++)
        {
            AssertResumo(atuais[indice], esperados[indice]);
        }
    }

    private static void AssertListaParcelas(
        JsonElement json,
        IReadOnlyList<ParcelaAtrasadaResposta> esperados)
    {
        var atuais = json.EnumerateArray().ToArray();
        Assert.AreEqual(esperados.Count, atuais.Length);
        for (var indice = 0; indice < atuais.Length; indice++)
        {
            var atual = atuais[indice];
            Assert.AreEqual(2, atual.EnumerateObject().Count());
            AssertResumo(atual.GetProperty("venda"), esperados[indice].Venda);
            AssertParcela(atual.GetProperty("parcela"), esperados[indice].Parcela);
        }
    }

    private static void AssertResumo(JsonElement json, VendaResumoResposta esperado)
    {
        Assert.AreEqual(15, json.EnumerateObject().Count());
        Assert.AreEqual(esperado.Id, json.GetProperty("id").GetString());
        var cliente = json.GetProperty("cliente");
        Assert.AreEqual(4, cliente.EnumerateObject().Count());
        Assert.AreEqual(esperado.Cliente.Nome, cliente.GetProperty("nome").GetString());
        Assert.AreEqual(esperado.Cliente.Cpf, cliente.GetProperty("cpf").GetString());
        Assert.AreEqual(esperado.Cliente.Telefone, cliente.GetProperty("telefone").GetString());
        Assert.AreEqual(esperado.Cliente.Descricao, cliente.GetProperty("descricao").ValueKind == JsonValueKind.Null
            ? null
            : cliente.GetProperty("descricao").GetString());
        Assert.AreEqual(esperado.DataVenda.ToString("yyyy-MM-dd"), json.GetProperty("dataVenda").GetString());
        Assert.AreEqual(esperado.StatusAdministrativo.ToString(), json.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(esperado.Situacao.ToString(), json.GetProperty("situacao").GetString());
        Assert.AreEqual(esperado.ValorTotalBaseCentavos, json.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalAcrescimosCentavos, json.GetProperty("totalAcrescimosCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorTotalEfetivoCentavos, json.GetProperty("valorTotalEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.TotalRecebidoCentavos, json.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, json.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.QuantidadePaga, json.GetProperty("quantidadePaga").GetInt32());
        Assert.AreEqual(esperado.QuantidadeParcelas, json.GetProperty("quantidadeParcelas").GetInt32());
        AssertDataOuNull(json.GetProperty("proximoVencimento"), esperado.ProximoVencimento);
        Assert.AreEqual(esperado.Revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            json.GetProperty("revisao").GetString());
        Assert.AreEqual(esperado.Referencia.ToString("yyyy-MM-dd"), json.GetProperty("referencia").GetString());
    }

    private static void AssertParcela(JsonElement json, ParcelaDetalheResposta esperado)
    {
        Assert.AreEqual(11, json.EnumerateObject().Count());
        Assert.AreEqual(esperado.Id, json.GetProperty("id").GetString());
        Assert.AreEqual(esperado.Numero, json.GetProperty("numero").GetInt32());
        Assert.AreEqual(esperado.ValorBaseCentavos, json.GetProperty("valorBaseCentavos").GetInt64());
        Assert.AreEqual(esperado.AcrescimoCentavos, json.GetProperty("acrescimoCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorEfetivoCentavos, json.GetProperty("valorEfetivoCentavos").GetInt64());
        Assert.AreEqual(esperado.ValorRecebidoCentavos, json.GetProperty("valorRecebidoCentavos").GetInt64());
        Assert.AreEqual(esperado.SaldoCentavos, json.GetProperty("saldoCentavos").GetInt64());
        Assert.AreEqual(esperado.Vencimento.ToString("yyyy-MM-dd"), json.GetProperty("vencimento").GetString());
        Assert.AreEqual(esperado.Situacao.ToString(), json.GetProperty("situacao").GetString());
        AssertDataOuNull(json.GetProperty("dataPagamento"), esperado.DataPagamento);
        var forma = json.GetProperty("formaPagamento");
        Assert.AreEqual(esperado.FormaPagamento?.ToString(), forma.ValueKind == JsonValueKind.Null ? null : forma.GetString());
    }

    private static void AssertDataOuNull(JsonElement json, DateOnly? esperado) =>
        Assert.AreEqual(
            esperado?.ToString("yyyy-MM-dd"),
            json.ValueKind == JsonValueKind.Null ? null : json.GetString());

    private static Venda[] CriarCenarioCompleto()
    {
        var entradaELote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "ativa-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada/Lote"),
            new DateOnly(2027, 3, 1),
            DinheiroValor(200_000),
            Enumerable.Range(1, 10).Select(numero => new DadosReconstrucaoParcela(
                $"entrada-lote-p{numero}",
                numero,
                DinheiroValor(20_000),
                numero == 1 ? new DateOnly(2027, 3, 1) : new DateOnly(2027, numero + 2, 1))).ToArray(),
            [
                new("entrada", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(20_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null,
                    [new("entrada-lote-p1", DinheiroValor(20_000))]),
                new("lote", new DateOnly(2027, 3, 31), FormaPagamento.Dinheiro, DinheiroValor(40_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null,
                    [new("entrada-lote-p2", DinheiroValor(20_000)), new("entrada-lote-p3", DinheiroValor(20_000))])
            ]), Referencia));

        var ativaIndividual = Sucesso(CriarVenda(
                "ativa-individual", 20_000, 2, new DateOnly(2027, 3, 5))
            .RegistrarPagamento(
                "recebimento-ativo", "ativa-individual-parcela-1", DinheiroValor(11_000),
                new DateOnly(2027, 3, 10), FormaPagamento.Pix, Referencia));
        var ativaAtrasada = CriarVenda("ativa-atrasada", 20_000, 2, new DateOnly(2027, 1, 15));
        var inativaBase = Sucesso(CriarVenda("inativa", 10_000, 1, new DateOnly(2027, 3, 6))
            .RegistrarPagamento(
                "recebimento-inativo", "inativa-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 11), FormaPagamento.Dinheiro, Referencia));
        var inativa = Sucesso(inativaBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoBase = Sucesso(CriarVenda("prejuizo-pago", 20_000, 2, new DateOnly(2027, 3, 7))
            .RegistrarPagamento(
                "recebimento-prejuizo", "prejuizo-pago-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 12), FormaPagamento.CartaoCredito, Referencia));
        var prejuizoPago = Sucesso(prejuizoBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoEntradaBase = Sucesso(Venda.Cadastrar(
            "prejuizo-entrada",
            Cliente("Prejuízo entrada"),
            new DateOnly(2027, 3, 9),
            DinheiroValor(20_000),
            2,
            ["prejuizo-entrada-p1", "prejuizo-entrada-p2"],
            Referencia,
            new DadosEntradaVenda("entrada-prejuizo", DinheiroValor(10_000), new DateOnly(2027, 3, 9), FormaPagamento.Pix)));
        var prejuizoEntrada = Sucesso(prejuizoEntradaBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoSemRecebimento = Sucesso(CriarVenda(
                "prejuizo-sem-recebimento", 10_000, 1, new DateOnly(2027, 3, 8))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [entradaELote, ativaIndividual, ativaAtrasada, inativa, prejuizoPago, prejuizoEntrada, prejuizoSemRecebimento];
    }

    private static Venda CriarVenda(string id, long total, int quantidade, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(id),
        dataVenda,
        DinheiroValor(total),
        quantidade,
        Enumerable.Range(1, quantidade).Select(numero => $"{id}-parcela-{numero}").ToArray(),
        Referencia));

    private static async Task<HttpResponseMessage> EnviarAsync(
        HttpClient cliente,
        string segredo,
        int ano,
        int mes,
        DateOnly referencia) =>
        await EnviarAsync(cliente, segredo,
            $"?ano={ano}&mes={mes}&referencia={referencia:yyyy-MM-dd}");

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string query)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/v1/relatorios/mensal" + query);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
