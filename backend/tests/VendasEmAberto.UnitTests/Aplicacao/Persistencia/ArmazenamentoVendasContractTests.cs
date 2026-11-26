using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Persistencia;

[TestClass]
public sealed class ArmazenamentoVendasContractTests
{
    [TestMethod]
    public void ResultadoOperacao_RepresentaSucessoSemPayload()
    {
        var resultado = ResultadoOperacaoArmazenamento.CriarSucesso();

        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
    }

    [TestMethod]
    public void ResultadoOperacao_FalhaContemErroSemValor()
    {
        var erroEsperado = CriarErro(CodigosErroArmazenamento.BancoOcupado);

        var resultado = ResultadoOperacaoArmazenamento.CriarFalha(erroEsperado);

        var falha = Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Falha>(resultado);
        Assert.AreSame(erroEsperado, falha.Erro);
        Assert.IsNull(typeof(ResultadoOperacaoArmazenamento.Falha).GetProperty("Valor"));
    }

    [TestMethod]
    public void ResultadoComValor_FalhaNaoExpoeValor()
    {
        var erroEsperado = CriarErro(CodigosErroArmazenamento.DadosPersistidosInvalidos);
        ResultadoArmazenamento<SnapshotVendas> resultado =
            ResultadoArmazenamento<SnapshotVendas>.CriarFalha(erroEsperado);

        var falha = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Falha>(resultado);
        Assert.AreSame(erroEsperado, falha.Erro);
        Assert.IsNull(typeof(ResultadoArmazenamento<SnapshotVendas>.Falha).GetProperty("Valor"));
    }

    [TestMethod]
    public void ResultadoComValor_SucessoExpoeValorTipado()
    {
        var snapshot = new SnapshotVendas(CriarConjuntoVendas(), 7);

        var resultado = ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(snapshot);

        var sucesso = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(resultado);
        Assert.AreSame(snapshot, sucesso.Valor);
    }

    [TestMethod]
    public void CodigosErroArmazenamento_SaoEstaveisConformeDec038()
    {
        var codigos = new[]
        {
            CodigosErroArmazenamento.CaminhoInvalido,
            CodigosErroArmazenamento.BancoAusente,
            CodigosErroArmazenamento.SchemaIncompativel,
            CodigosErroArmazenamento.DadosPersistidosInvalidos,
            CodigosErroArmazenamento.CandidatoInvalido,
            CodigosErroArmazenamento.ConflitoRevisao,
            CodigosErroArmazenamento.ExclusaoNaoPermitida,
            CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida,
            CodigosErroArmazenamento.BancoOcupado,
            CodigosErroArmazenamento.ArmazenamentoIndisponivel,
            CodigosErroArmazenamento.LimiteRevisaoExcedido,
            CodigosErroArmazenamento.ConfirmacaoIndeterminada
        };

        CollectionAssert.AreEqual(
            new[]
            {
                "caminho-invalido",
                "banco-ausente",
                "schema-incompativel",
                "dados-persistidos-invalidos",
                "candidato-invalido",
                "conflito-revisao",
                "exclusao-nao-permitida",
                "alteracao-historico-nao-permitida",
                "banco-ocupado",
                "armazenamento-indisponivel",
                "limite-revisao-excedido",
                "confirmacao-indeterminada"
            },
            codigos);
    }

    [TestMethod]
    public void SnapshotVendas_ConservaConjuntoImutavelEImpoeRevisaoNaoNegativa()
    {
        var vendas = new List<Venda> { CriarVenda() };
        var conjuntoResultado = ConjuntoVendas.Criar(vendas);
        var conjunto = Assert.IsInstanceOfType<ResultadoDominio<ConjuntoVendas>.Sucesso>(conjuntoResultado).Valor;

        var snapshot = new SnapshotVendas(conjunto, 3);
        vendas.Clear();

        Assert.AreEqual(3, snapshot.Revisao);
        Assert.AreSame(conjunto, snapshot.Conjunto);
        Assert.AreEqual(1, snapshot.Conjunto.Vendas.Count);
        Assert.IsFalse(typeof(SnapshotVendas).GetProperty(nameof(SnapshotVendas.Revisao))!.CanWrite);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<Venda>)snapshot.Conjunto.Vendas).Clear());
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new SnapshotVendas(conjunto, -1));
        Assert.ThrowsExactly<ArgumentNullException>(() => new SnapshotVendas(null!, 0));
    }

    private static ErroArmazenamento CriarErro(string codigo) =>
        new(codigo, "Não foi possível concluir a operação de armazenamento.");

    private static ConjuntoVendas CriarConjuntoVendas()
    {
        var resultado = ConjuntoVendas.Criar([CriarVenda()]);
        return Assert.IsInstanceOfType<ResultadoDominio<ConjuntoVendas>.Sucesso>(resultado).Valor;
    }

    private static Venda CriarVenda()
    {
        var clienteResultado = DadosClienteVenda.Criar(
            "Cliente Sintético",
            "12345678909",
            "1198765432",
            null);
        var cliente = Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(clienteResultado).Valor;
        var dinheiroResultado = Dinheiro.Criar(100);
        var dinheiro = Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(dinheiroResultado).Valor;
        var vendaResultado = Venda.Cadastrar(
            "venda-sintetica",
            cliente,
            new DateOnly(2027, 1, 15),
            dinheiro,
            1,
            ["parcela-sintetica"],
            new DateOnly(2027, 1, 15));

        return Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(vendaResultado).Valor;
    }
}
