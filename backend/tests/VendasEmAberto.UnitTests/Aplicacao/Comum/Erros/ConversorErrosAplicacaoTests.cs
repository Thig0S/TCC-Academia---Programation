using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.UnitTests.Aplicacao.Comum.Erros;

[TestClass]
public sealed class ConversorErrosAplicacaoTests
{
    [TestMethod]
    public void Converter_ErroDominioPreservaCategoriaCodigoMensagemECampo()
    {
        var entradas = new[]
        {
            (CategoriaErroDominio.Validacao, CategoriaErroAplicacao.Validacao),
            (CategoriaErroDominio.Inexistencia, CategoriaErroAplicacao.Inexistencia),
            (CategoriaErroDominio.Conflito, CategoriaErroAplicacao.Conflito),
            (CategoriaErroDominio.RegraNegocio, CategoriaErroAplicacao.RegraNegocio)
        };

        foreach (var (categoriaDominio, categoriaAplicacao) in entradas)
        {
            var erro = ConversorErrosAplicacao.Converter(new ErroDominio(
                categoriaDominio,
                "codigo-conhecido",
                "Mensagem pública em português.",
                "campo"));

            Assert.AreEqual(categoriaAplicacao, erro.Categoria);
            Assert.AreEqual("codigo-conhecido", erro.Codigo);
            Assert.AreEqual("Mensagem pública em português.", erro.Message);
            Assert.AreEqual("campo", erro.Campo);
        }
    }

    [TestMethod]
    public void Converter_MapeiaTodosOsCodigosDeArmazenamentoConhecidos()
    {
        var entradas = new (string Codigo, CategoriaErroAplicacao Categoria)[]
        {
            (CodigosErroArmazenamento.CaminhoInvalido, CategoriaErroAplicacao.Validacao),
            (CodigosErroArmazenamento.CandidatoInvalido, CategoriaErroAplicacao.Validacao),
            (CodigosErroArmazenamento.ConflitoRevisao, CategoriaErroAplicacao.Conflito),
            (CodigosErroArmazenamento.ExclusaoNaoPermitida, CategoriaErroAplicacao.Conflito),
            (CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida, CategoriaErroAplicacao.Conflito),
            (CodigosErroArmazenamento.BancoAusente, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.SchemaIncompativel, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.DadosPersistidosInvalidos, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.BancoOcupado, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.ArmazenamentoIndisponivel, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.LimiteRevisaoExcedido, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.ConfirmacaoIndeterminada, CategoriaErroAplicacao.EstadoIndeterminado)
        };

        foreach (var (codigo, categoria) in entradas)
        {
            var erro = ConversorErrosAplicacao.Converter(new ErroArmazenamento(codigo, "Falha pública segura."));

            Assert.AreEqual(categoria, erro.Categoria, codigo);
            Assert.AreEqual(codigo, erro.Codigo);
            Assert.AreEqual("Falha pública segura.", erro.Message);
            Assert.IsNull(erro.Campo);
        }
    }

    [TestMethod]
    public void Converter_CodigoDeArmazenamentoDesconhecidoPropagaFalhaTecnica()
    {
        var erro = new ErroArmazenamento("codigo-futuro", "Mensagem segura.");

        var excecao = Assert.ThrowsExactly<InvalidOperationException>(() =>
            ConversorErrosAplicacao.Converter(erro));

        Assert.AreEqual("Código de erro de armazenamento não reconhecido.", excecao.Message);
    }

    [TestMethod]
    public void Converter_CategoriaDeDominioDesconhecidaPropagaFalhaTecnica()
    {
        var erro = new ErroDominio((CategoriaErroDominio)999, "erro", "Mensagem segura.");

        Assert.ThrowsExactly<InvalidOperationException>(() => ConversorErrosAplicacao.Converter(erro));
    }

    [TestMethod]
    public void Converter_ResultadoFalhoNaoAcessaValorNemPublicaCandidato()
    {
        var resultado = ResultadoDominio<string>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "valor-invalido",
            "Valor inválido.",
            "valor"));

        var convertido = ConversorErrosAplicacao.Converter(resultado);

        Assert.IsTrue(convertido.IsFailed);
        Assert.IsInstanceOfType<ErroAplicacao>(convertido.Errors.Single());
        Assert.AreEqual("valor-invalido", ((ErroAplicacao)convertido.Errors.Single()).Codigo);
    }

    [TestMethod]
    public void Converter_ArmazenamentoFalhoNaoPublicaSnapshotComoSucesso()
    {
        var resultado = ResultadoArmazenamento<string>.CriarFalha(new ErroArmazenamento(
            CodigosErroArmazenamento.BancoAusente,
            "Banco não encontrado."));

        var convertido = ConversorErrosAplicacao.Converter(resultado);

        Assert.IsTrue(convertido.IsFailed);
        Assert.IsInstanceOfType<ErroAplicacao>(convertido.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Infraestrutura, ((ErroAplicacao)convertido.Errors.Single()).Categoria);
    }
}
