using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.UnitTests.Dominio.Valores;

[TestClass]
public sealed class ResultadoDominioTests
{
    [TestMethod]
    public void CriarSucesso_DisponibilizaValor()
    {
        var resultado = ResultadoDominio<int>.CriarSucesso(42);

        var sucesso = Assert.IsInstanceOfType<ResultadoDominio<int>.Sucesso>(resultado);
        Assert.AreEqual(42, sucesso.Valor);
    }

    [TestMethod]
    public void CriarFalha_DisponibilizaErroTipadoSemValor()
    {
        var erroEsperado = new ErroDominio(
            CategoriaErroDominio.Validacao,
            "cpf-invalido",
            "Informe um CPF válido.",
            "cpf");

        var resultado = ResultadoDominio<int>.CriarFalha(erroEsperado);

        var falha = Assert.IsInstanceOfType<ResultadoDominio<int>.Falha>(resultado);
        Assert.AreSame(erroEsperado, falha.Erro);
        Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Erro.Categoria);
        Assert.AreEqual("cpf-invalido", falha.Erro.Codigo);
        Assert.AreEqual("cpf", falha.Erro.Campo);
        Assert.IsNull(typeof(ResultadoDominio<int>.Falha).GetProperty("Valor"));
    }
}
