using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.UnitTests.Dominio.Valores;

[TestClass]
public sealed class CalendarioCivilTests
{
    [TestMethod]
    [DataRow(1900, 31, 28)]
    [DataRow(2000, 31, 29)]
    public void AdicionarMeses_RespeitaAnosBissextos(int ano, int diaBase, int diaEsperado)
    {
        var dataBase = new DateOnly(ano, 1, diaBase);

        var vencimento = ObterSucesso(CalendarioCivil.AdicionarMeses(dataBase, 1));

        Assert.AreEqual(new DateOnly(ano, 2, diaEsperado), vencimento);
    }

    [TestMethod]
    public void GerarVencimentos_UsaSempreDiaDaDataBaseOriginal()
    {
        var vencimentos = ObterSucesso(
            CalendarioCivil.GerarVencimentos(new DateOnly(2027, 1, 31), 2));

        CollectionAssert.AreEqual(
            new[] { new DateOnly(2027, 2, 28), new DateOnly(2027, 3, 31) },
            vencimentos.ToArray());
    }

    [TestMethod]
    public void GerarVencimentos_AceitaLimitesDoCalendario()
    {
        var primeiroAno = ObterSucesso(
            CalendarioCivil.GerarVencimentos(new DateOnly(1, 12, 1), 1));
        var ultimoAno = ObterSucesso(
            CalendarioCivil.GerarVencimentos(new DateOnly(9999, 11, 30), 1));

        CollectionAssert.AreEqual(new[] { new DateOnly(2, 1, 1) }, primeiroAno.ToArray());
        CollectionAssert.AreEqual(new[] { new DateOnly(9999, 12, 30) }, ultimoAno.ToArray());
    }

    [TestMethod]
    public void GerarVencimentos_RejeitaAlcanceAntesDeAlocar()
    {
        var falhaLimite = ObterFalha(
            CalendarioCivil.GerarVencimentos(new DateOnly(9999, 12, 31), 1));
        var falhaQuantidade = ObterFalha(
            CalendarioCivil.GerarVencimentos(new DateOnly(2027, 1, 31), int.MaxValue));

        Assert.AreEqual("data-invalida", falhaLimite.Erro.Codigo);
        Assert.AreEqual("data-invalida", falhaQuantidade.Erro.Codigo);
        Assert.AreEqual("dataBase", falhaQuantidade.Erro.Campo);
    }

    [TestMethod]
    public void DentroDosProximosDias_UsaDiferencaInclusivaSemAvancarReferencia()
    {
        var referencia = new DateOnly(2027, 4, 10);

        Assert.IsTrue(CalendarioCivil.DentroDosProximosDias(referencia, referencia, 7));
        Assert.IsTrue(CalendarioCivil.DentroDosProximosDias(referencia.AddDays(7), referencia, 7));
        Assert.IsFalse(CalendarioCivil.DentroDosProximosDias(referencia.AddDays(8), referencia, 7));
        Assert.IsFalse(CalendarioCivil.DentroDosProximosDias(referencia.AddDays(-1), referencia, 7));
    }

    [TestMethod]
    public void DentroDosProximosDias_NaoTransbordaNaReferenciaMaxima()
    {
        var maximo = DateOnly.MaxValue;

        Assert.IsTrue(CalendarioCivil.DentroDosProximosDias(maximo, maximo, 7));
        Assert.IsFalse(CalendarioCivil.DentroDosProximosDias(maximo.AddDays(-1), maximo, 7));
    }

    private static DateOnly ObterSucesso(ResultadoDominio<DateOnly> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<DateOnly>.Sucesso>(resultado).Valor;

    private static IReadOnlyList<DateOnly> ObterSucesso(
        ResultadoDominio<IReadOnlyList<DateOnly>> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<IReadOnlyList<DateOnly>>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<DateOnly>.Falha ObterFalha(ResultadoDominio<DateOnly> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<DateOnly>.Falha>(resultado);

    private static ResultadoDominio<IReadOnlyList<DateOnly>>.Falha ObterFalha(
        ResultadoDominio<IReadOnlyList<DateOnly>> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<IReadOnlyList<DateOnly>>.Falha>(resultado);
}
