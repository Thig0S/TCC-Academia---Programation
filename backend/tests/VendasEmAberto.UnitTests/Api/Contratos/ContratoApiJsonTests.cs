using System.Text.Json;
using VendasEmAberto.Api.Contratos;

namespace VendasEmAberto.UnitTests.Api.Contratos;

[TestClass]
public sealed class ContratoApiJsonTests
{
    private static readonly JsonSerializerOptions Opcoes = ContratoApiJson.CriarOpcoes();

    [TestMethod]
    public void Serializar_UsaCamelCaseDataIsoRevisaoTextualESemConversorGlobalDeLong()
    {
        var resposta = new RespostaTeste(
            9_007_199_254_740_991,
            new RevisaoApi(long.MaxValue),
            new DateOnly(9999, 12, 31),
            SituacaoTeste.Ativo);

        var json = JsonSerializer.Serialize(resposta, Opcoes);

        StringAssert.Contains(json, "\"valorCentavos\":9007199254740991");
        StringAssert.Contains(json, "\"revisao\":\"9223372036854775807\"");
        StringAssert.Contains(json, "\"data\":\"9999-12-31\"");
        StringAssert.Contains(json, "\"situacao\":\"Ativo\"");
    }

    [TestMethod]
    public void LerRevisaoJson_AceitaStringCanonicaComPrecisaoCompleta()
    {
        var acimaDoInteiroSeguro = JsonSerializer.Deserialize<RevisaoApi>("\"9007199254740993\"", Opcoes);
        var maxima = JsonSerializer.Deserialize<RevisaoApi>("\"9223372036854775807\"", Opcoes);
        var zero = JsonSerializer.Deserialize<RevisaoApi>("\"0\"", Opcoes);

        Assert.AreEqual(9_007_199_254_740_993, acimaDoInteiroSeguro.Valor);
        Assert.AreEqual(long.MaxValue, maxima.Valor);
        Assert.AreEqual(0, zero.Valor);
    }

    [TestMethod]
    [DataRow("-1")]
    [DataRow("+1")]
    [DataRow("01")]
    [DataRow(" 1")]
    [DataRow("9223372036854775808")]
    public void LerRevisaoJson_RejeitaRepresentacaoNaoCanonica(string valor)
    {
        Assert.ThrowsExactly<JsonException>(() =>
            JsonSerializer.Deserialize<RevisaoApi>(JsonSerializer.Serialize(valor), Opcoes));
    }

    [TestMethod]
    public void LerRevisaoJson_RejeitaTokenNumerico()
    {
        Assert.ThrowsExactly<JsonException>(() => JsonSerializer.Deserialize<RevisaoApi>("9007199254740993", Opcoes));
    }

    [TestMethod]
    [DataRow("\"0001-01-01\"", 1, 1, 1)]
    [DataRow("\"9999-12-31\"", 9999, 12, 31)]
    public void LerDataJson_AceitaExtremosIso(string json, int ano, int mes, int dia)
    {
        var data = JsonSerializer.Deserialize<DateOnly>(json, Opcoes);

        Assert.AreEqual(new DateOnly(ano, mes, dia), data);
    }

    [TestMethod]
    [DataRow("\"2027-02-29\"")]
    [DataRow("\"2027-2-09\"")]
    [DataRow("\"2027-02-09T00:00:00Z\"")]
    [DataRow("20270209")]
    public void LerDataJson_RejeitaFormatoNaoCivilExato(string json)
    {
        Assert.ThrowsExactly<JsonException>(() => JsonSerializer.Deserialize<DateOnly>(json, Opcoes));
    }

    private sealed record RespostaTeste(
        long ValorCentavos,
        RevisaoApi Revisao,
        DateOnly Data,
        SituacaoTeste Situacao);

    private enum SituacaoTeste
    {
        Ativo
    }
}
