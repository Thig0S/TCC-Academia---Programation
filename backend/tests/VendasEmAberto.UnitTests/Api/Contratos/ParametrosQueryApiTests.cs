using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using VendasEmAberto.Api.Contratos;

namespace VendasEmAberto.UnitTests.Api.Contratos;

[TestClass]
public sealed class ParametrosQueryApiTests
{
    [TestMethod]
    public void TextoObrigatorioPreservaIdOpacoSemTrimOuDecodificacaoAdicional()
    {
        const string id = "  pasta%2Fvenda+?x#ação/  ";
        var query = CriarQuery(("vendaId", new StringValues(id)));

        Assert.AreEqual(id, ParametrosQueryApi.TextoObrigatorio(query, "vendaId"));
    }

    [TestMethod]
    public void ParametroQueryObrigatorioAusenteVazioOuDuplicadoERecusado()
    {
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            ParametrosQueryApi.TextoObrigatorio(new QueryCollection(), "referencia"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            ParametrosQueryApi.TextoObrigatorio(CriarQuery(("referencia", new StringValues(""))), "referencia"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            ParametrosQueryApi.TextoObrigatorio(
                CriarQuery(("referencia", new StringValues(["2027-02-01", "2027-02-02"]))),
                "referencia"));
    }

    [TestMethod]
    public void DataQueryExigeIsoExatoEPermiteLimitesCivis()
    {
        Assert.AreEqual(
            DateOnly.MinValue,
            ParametrosQueryApi.DataObrigatoria(CriarQuery(("data", new StringValues("0001-01-01"))), "data"));
        Assert.AreEqual(
            DateOnly.MaxValue,
            ParametrosQueryApi.DataObrigatoria(CriarQuery(("data", new StringValues("9999-12-31"))), "data"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            ParametrosQueryApi.DataObrigatoria(CriarQuery(("data", new StringValues("2027-02-09T00:00:00Z"))), "data"));
    }

    [TestMethod]
    public void EnumQueryExigeNomeTextualConhecido()
    {
        var query = CriarQuery(("colecao", new StringValues("Prejuizo")));
        Assert.AreEqual(ColecaoTeste.Prejuizo, ParametrosQueryApi.EnumObrigatorio<ColecaoTeste>(query, "colecao"));

        foreach (var valor in new[] { "2", "prejuizo", "Outra" })
        {
            Assert.ThrowsExactly<ErroEntradaApiException>(() =>
                ParametrosQueryApi.EnumObrigatorio<ColecaoTeste>(
                    CriarQuery(("colecao", new StringValues(valor))),
                    "colecao"));
        }
    }

    private static QueryCollection CriarQuery(params (string Nome, StringValues Valor)[] itens) =>
        new(itens.ToDictionary(item => item.Nome, item => item.Valor, StringComparer.OrdinalIgnoreCase));

    private enum ColecaoTeste
    {
        Abertas,
        Quitadas,
        Inativas,
        Prejuizo
    }
}
