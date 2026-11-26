using System.Text.Json;
using VendasEmAberto.Api.Contratos;

namespace VendasEmAberto.UnitTests.Api.Contratos;

[TestClass]
public sealed class LeitorObjetoJsonTests
{
    [TestMethod]
    public void CamposObrigatoriosDiferenciamAusenciaNullEValorPadrao()
    {
        var leitor = LeitorObjetoJson.Parse(
            """{"nome":"  Ana  ","descricao":null,"quantidade":0}""",
            "nome",
            "descricao",
            "quantidade",
            "cpf");

        Assert.AreEqual("  Ana  ", leitor.LerTextoObrigatorio("nome"));
        Assert.IsNull(leitor.LerTextoOpcional("descricao"));
        Assert.AreEqual(0, leitor.LerInteiroObrigatorio("quantidade"));
        Assert.IsNull(leitor.LerTextoOpcional("cpf"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() => leitor.LerTextoObrigatorio("cpf"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            LeitorObjetoJson.Parse("""{"nome":null}""", "nome").LerTextoObrigatorio("nome"));
    }

    [TestMethod]
    public void DataAceitaSomenteIsoCivilExatoIncluindoExtremos()
    {
        var leitor = LeitorObjetoJson.Parse(
            """{"inicio":"0001-01-01","fim":"9999-12-31"}""",
            "inicio",
            "fim");

        Assert.AreEqual(DateOnly.MinValue, leitor.LerDataObrigatoria("inicio"));
        Assert.AreEqual(DateOnly.MaxValue, leitor.LerDataObrigatoria("fim"));

        foreach (var valor in new[] { "2027-02-29", "2027-2-09", "2027-02-09T00:00:00Z", "09/02/2027" })
        {
            var invalido = LeitorObjetoJson.Parse($"{{\"data\":{JsonSerializer.Serialize(valor)}}}", "data");
            Assert.ThrowsExactly<ErroEntradaApiException>(() => invalido.LerDataObrigatoria("data"));
        }
    }

    [TestMethod]
    public void CentavosAceitamSomenteInteiroJsonSeguro()
    {
        var valido = LeitorObjetoJson.Parse(
            """{"zero":0,"maximo":9007199254740991}""",
            "zero",
            "maximo");

        Assert.AreEqual(0, valido.LerCentavosObrigatorios("zero"));
        Assert.AreEqual(LeitorObjetoJson.MaximoCentavosSeguros, valido.LerCentavosObrigatorios("maximo"));

        foreach (var json in new[]
        {
            "\"valor\":\"1\"",
            "\"valor\":1.0",
            "\"valor\":1e3",
            "\"valor\":-1",
            "\"valor\":9007199254740992",
            "\"valor\":null"
        })
        {
            var invalido = LeitorObjetoJson.Parse("{" + json + "}", "valor");
            Assert.ThrowsExactly<ErroEntradaApiException>(() => invalido.LerCentavosObrigatorios("valor"));
        }
    }

    [TestMethod]
    public void RevisaoAceitaStringCanonicaAteLongMaximoERejeitaTokenNumerico()
    {
        var leitor = LeitorObjetoJson.Parse(
            """{"segura":"9007199254740993","maxima":"9223372036854775807"}""",
            "segura",
            "maxima");

        Assert.AreEqual(9_007_199_254_740_993, leitor.LerRevisaoObrigatoria("segura"));
        Assert.AreEqual(long.MaxValue, leitor.LerRevisaoObrigatoria("maxima"));

        foreach (var json in new[]
        {
            "\"revisao\":9007199254740993",
            "\"revisao\":\"-1\"",
            "\"revisao\":\"+1\"",
            "\"revisao\":\"01\"",
            "\"revisao\":\" 1\"",
            "\"revisao\":\"9223372036854775808\""
        })
        {
            var invalido = LeitorObjetoJson.Parse("{" + json + "}", "revisao");
            Assert.ThrowsExactly<ErroEntradaApiException>(() => invalido.LerRevisaoObrigatoria("revisao"));
        }
    }

    [TestMethod]
    public void EnumExigeTextoConhecidoExato()
    {
        var leitor = LeitorObjetoJson.Parse("""{"forma":"CartaoCredito"}""", "forma");
        Assert.AreEqual(FormaTeste.CartaoCredito, leitor.LerEnumObrigatorio<FormaTeste>("forma"));

        foreach (var valor in new[] { "1", "cartaoCredito", "Desconhecido" })
        {
            var invalido = LeitorObjetoJson.Parse(
                $"{{\"forma\":{JsonSerializer.Serialize(valor)}}}",
                "forma");
            Assert.ThrowsExactly<ErroEntradaApiException>(() => invalido.LerEnumObrigatorio<FormaTeste>("forma"));
        }

        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            LeitorObjetoJson.Parse("""{"forma":1}""", "forma").LerEnumObrigatorio<FormaTeste>("forma"));
    }

    [TestMethod]
    public void PropriedadesDesconhecidasSaoIgnoradasSemAmpliarCamposEditaveis()
    {
        var leitor = LeitorObjetoJson.Parse(
            """{"nome":"Ana","valorTotalCentavos":999999,"campoExtra":"ignorado"}""",
            "nome");

        Assert.AreEqual("Ana", leitor.LerTextoObrigatorio("nome"));
        Assert.ThrowsExactly<ArgumentException>(() => leitor.LerTextoObrigatorio("valorTotalCentavos"));
    }

    [TestMethod]
    public void ChavesConhecidasDuplicadasSaoRecusadasInclusiveComEscapeJson()
    {
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            LeitorObjetoJson.Parse("""{"nome":"Ana","nome":"Bia"}""", "nome"));
        Assert.ThrowsExactly<ErroEntradaApiException>(() =>
            LeitorObjetoJson.Parse("""{"nome":"Ana","\u006eome":"Bia"}""", "nome"));

        var desconhecidasRepetidas = LeitorObjetoJson.Parse(
            """{"nome":"Ana","extra":1,"extra":2}""",
            "nome");
        Assert.AreEqual("Ana", desconhecidasRepetidas.LerTextoObrigatorio("nome"));
    }

    [TestMethod]
    public void CorpoPrecisaSerObjetoJson()
    {
        foreach (var json in new[] { "", "null", "[]", "{", "\"texto\"" })
        {
            Assert.ThrowsExactly<ErroEntradaApiException>(() => LeitorObjetoJson.Parse(json, "nome"));
        }
    }

    private enum FormaTeste
    {
        Dinheiro,
        Pix,
        CartaoDebito,
        CartaoCredito
    }
}
