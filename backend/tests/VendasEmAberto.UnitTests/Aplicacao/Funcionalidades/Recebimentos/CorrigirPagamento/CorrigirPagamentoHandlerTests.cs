using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;

[TestClass]
public sealed class CorrigirPagamentoHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-correcao.db");

    [TestMethod]
    public async Task Handle_CorrigePagamentoQuitadoPreservaIdentidadeAlocacaoOrdemESaldoDosDemais()
    {
        var venda = CriarVendaQuitada();
        var outra = CriarVenda("outra", 5_000, 1);
        var armazenamento = new ArmazenamentoFake(Conjunto([venda, outra]), revisao: 8);
        var handler = CriarHandler(armazenamento);

        var resultado = await handler.Handle(Comando("venda", "recibo-a", 10_500, 8), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        var detalhe = resultado.Value;
        Assert.AreEqual(9L, detalhe.Resumo.Revisao);
        Assert.AreEqual(Referencia, detalhe.Resumo.Referencia);
        Assert.AreEqual(20_000L, detalhe.Resumo.ValorTotalBaseCentavos);
        Assert.AreEqual(500L, detalhe.Resumo.TotalAcrescimosCentavos);
        Assert.AreEqual(20_500L, detalhe.Resumo.ValorTotalEfetivoCentavos);
        Assert.AreEqual(20_500L, detalhe.Resumo.TotalRecebidoCentavos);
        Assert.AreEqual(0L, detalhe.Resumo.SaldoCentavos);
        Assert.AreEqual(2, detalhe.Recebimentos.Count);
        Assert.AreEqual("recibo-a", detalhe.Recebimentos[0].Id);
        Assert.AreEqual("recibo-b", detalhe.Recebimentos[1].Id);
        Assert.AreEqual(new DateOnly(2027, 3, 10), detalhe.Recebimentos[0].Data);
        Assert.AreEqual(OrigemRecebimentoResposta.Individual, detalhe.Recebimentos[0].Origem);
        Assert.AreEqual(10_500L, detalhe.Recebimentos[0].ValorCentavos);
        Assert.AreEqual(500L, detalhe.Recebimentos[0].AcrescimoCentavos);
        Assert.AreEqual("nota corrigida", detalhe.Recebimentos[0].Observacao);
        Assert.AreEqual("venda-parcela-1", detalhe.Recebimentos[0].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_500L, detalhe.Recebimentos[0].Alocacoes.Single().ValorCentavos);
        Assert.AreEqual("venda-parcela-2", detalhe.Recebimentos[1].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_000L, detalhe.Recebimentos[1].ValorCentavos);
        Assert.AreEqual(10_000L, detalhe.Parcelas[1].ValorBaseCentavos);
        Assert.AreEqual(10_000L, detalhe.Parcelas[1].ValorRecebidoCentavos);
        Assert.AreEqual(0L, detalhe.Parcelas[1].SaldoCentavos);

        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(1, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Caminho, armazenamento.CaminhoSalvo);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaSalva);
        Assert.AreEqual(8L, armazenamento.RevisaoSalva);
        Assert.AreEqual(2, armazenamento.CandidatoSalvo!.Count);
        Assert.AreEqual("venda", armazenamento.CandidatoSalvo[0].Id);
        Assert.AreEqual("outra", armazenamento.CandidatoSalvo[1].Id);
        Assert.AreEqual("recibo-a", armazenamento.CandidatoSalvo[0].Recebimentos[0].Id);
        Assert.AreEqual("recibo-b", armazenamento.CandidatoSalvo[0].Recebimentos[1].Id);
        Assert.AreEqual(5_000L, armazenamento.CandidatoSalvo[1].ValorTotalBase.Centavos);
    }

    [TestMethod]
    public async Task Handle_CorrecaoIdenticaTambemGravaUmaVezEIncrementaRevisaoSemDuplicar()
    {
        var venda = CriarVendaQuitada();
        var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 4);

        var resultado = await CriarHandler(armazenamento).Handle(
            Comando("venda", "recibo-a", 11_000, 4) with
            {
                Data = new DateOnly(2027, 2, 10),
                Forma = FormaPagamento.Pix,
                Observacao = "nota original"
            },
            CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(5L, resultado.Value.Resumo.Revisao);
        Assert.AreEqual(2, resultado.Value.Recebimentos.Count);
        Assert.AreEqual("recibo-a", resultado.Value.Recebimentos[0].Id);
        Assert.AreEqual("recibo-b", resultado.Value.Recebimentos[1].Id);
        Assert.AreEqual(1, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_DistingueRecebimentoInexistenteDePertencenteAOutraVenda()
    {
        var alvo = CriarVendaQuitada();
        var outra = Registrar(CriarVenda("outra", 10_000, 1), "recibo-externo", "outra-parcela-1", 10_000, new DateOnly(2027, 2, 10));

        var armazenamentoAusente = new ArmazenamentoFake(Conjunto([alvo, outra]), 1);
        var ausente = await CriarHandler(armazenamentoAusente).Handle(
            Comando("venda", "nao-existe", 10_000, 1), CancellationToken.None);
        Assert.IsTrue(ausente.IsFailed);
        var erroAusente = Assert.IsInstanceOfType<ErroAplicacao>(ausente.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Inexistencia, erroAusente.Categoria);
        Assert.AreEqual("recebimento-inexistente", erroAusente.Codigo);
        Assert.AreEqual(0, armazenamentoAusente.Salvamentos);

        var armazenamentoOutra = new ArmazenamentoFake(Conjunto([alvo, outra]), 1);
        var deOutra = await CriarHandler(armazenamentoOutra).Handle(
            Comando("venda", "recibo-externo", 10_000, 1), CancellationToken.None);
        Assert.IsTrue(deOutra.IsFailed);
        var erroOutra = Assert.IsInstanceOfType<ErroAplicacao>(deOutra.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.RegraNegocio, erroOutra.Categoria);
        Assert.AreEqual("recebimento-de-outra-venda", erroOutra.Codigo);
        Assert.AreEqual(0, armazenamentoOutra.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_RejeitaVendaAusenteNaoAtivaEntradaELoteSemGravar()
    {
        var venda = CriarVendaQuitada();
        var inativa = Sucesso(venda.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var entrada = CriarVendaComEntrada();
        var lote = CriarVendaComLote();
        var casos = new[]
        {
            (Conjunto([venda]), Comando("ausente", "recibo-a", 10_500, 0), "venda-inexistente"),
            (Conjunto([inativa]), Comando("venda", "recibo-a", 10_500, 0), "venda-nao-ativa"),
            (Conjunto([entrada]), Comando("entrada", "recibo-entrada", 5_000, 0), "recebimento-historico-nao-editavel"),
            (Conjunto([lote]), Comando("lote", "recibo-lote", 10_000, 0), "recebimento-historico-nao-editavel")
        };

        foreach (var (conjunto, comando, codigo) in casos)
        {
            var armazenamento = new ArmazenamentoFake(conjunto, 0);
            var resultado = await CriarHandler(armazenamento).Handle(comando, CancellationToken.None);
            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(codigo, Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
            Assert.AreEqual(0, armazenamento.Salvamentos);
        }
    }

    [TestMethod]
    public async Task Handle_DadosInvalidosERevisaoObsoletaFalhamAntesDeSave()
    {
        var venda = CriarVendaQuitada();
        var casos = new[]
        {
            (Comando("venda", "recibo-a", -1, 0), "valor-invalido"),
            (Comando("venda", "recibo-a", 10_500, 0) with { Forma = (FormaPagamento)999 }, "dados-recebimento-invalidos"),
            (Comando("venda", "recibo-a", 10_500, 0) with { Data = new DateOnly(2027, 4, 1) }, "dados-recebimento-invalidos"),
            (Comando("venda", "recibo-a", 10_500, 0) with { Observacao = string.Concat(Enumerable.Repeat("😀", 21)) }, "observacao-longa-demais")
        };

        foreach (var (comando, codigo) in casos)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 0);
            var resultado = await CriarHandler(armazenamento).Handle(comando, CancellationToken.None);
            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(codigo, Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
            Assert.AreEqual(0, armazenamento.Carregamentos);
            Assert.AreEqual(0, armazenamento.Salvamentos);
        }

        var armazenamentoDataAnterior = new ArmazenamentoFake(Conjunto([venda]), 0);
        var dataAnterior = await CriarHandler(armazenamentoDataAnterior).Handle(
            Comando("venda", "recibo-a", 10_500, 0) with { Data = new DateOnly(2027, 1, 14) },
            CancellationToken.None);
        Assert.IsTrue(dataAnterior.IsFailed);
        Assert.AreEqual("dados-recebimento-invalidos", Assert.IsInstanceOfType<ErroAplicacao>(dataAnterior.Errors.Single()).Codigo);
        Assert.AreEqual(1, armazenamentoDataAnterior.Carregamentos);
        Assert.AreEqual(0, armazenamentoDataAnterior.Salvamentos);

        var armazenamentoObsoleto = new ArmazenamentoFake(Conjunto([venda]), 2);
        var obsoleto = await CriarHandler(armazenamentoObsoleto).Handle(
            Comando("venda", "recibo-a", 10_500, 1), CancellationToken.None);
        Assert.IsTrue(obsoleto.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoObsoleto.Salvamentos);
    }

    private static CorrigirPagamentoHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static CorrigirPagamentoCommand Comando(string vendaId, string recebimentoId, long valor, long revisao) => new(
        vendaId,
        recebimentoId,
        valor,
        new DateOnly(2027, 3, 10),
        FormaPagamento.CartaoCredito,
        "nota corrigida",
        Referencia,
        revisao);

    private static Venda CriarVendaQuitada()
    {
        var venda = CriarVenda("venda", 20_000, 2);
        venda = Registrar(venda, "recibo-a", "venda-parcela-1", 11_000, new DateOnly(2027, 2, 10));
        return Registrar(venda, "recibo-b", "venda-parcela-2", 10_000, new DateOnly(2027, 2, 11));
    }

    private static Venda CriarVendaComEntrada() => Sucesso(Venda.Cadastrar(
        "entrada",
        Cliente(),
        new DateOnly(2027, 1, 15),
        DinheiroValor(20_000),
        2,
        ["entrada-parcela-1", "entrada-parcela-2"],
        Referencia,
        new DadosEntradaVenda("recibo-entrada", DinheiroValor(5_000), new DateOnly(2027, 1, 15), FormaPagamento.Pix)));

    private static Venda CriarVendaComLote()
    {
        return Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "lote",
            StatusAdministrativoVenda.Ativo,
            Cliente(),
            new DateOnly(2027, 1, 15),
            DinheiroValor(20_000),
            [
                new("parcela-1", 1, DinheiroValor(10_000), new DateOnly(2027, 2, 15)),
                new("parcela-2", 2, DinheiroValor(10_000), new DateOnly(2027, 3, 15))
            ],
            [
                new(
                    "recibo-lote",
                    new DateOnly(2027, 2, 10),
                    FormaPagamento.Dinheiro,
                    DinheiroValor(10_000),
                    OrigemRecebimento.HistoricoLote,
                    DinheiroValor(0),
                    null,
                    [new("parcela-1", DinheiroValor(10_000))])
            ]), Referencia));
    }

    private static Venda CriarVenda(string id, long valor, int parcelas) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(),
        new DateOnly(2027, 1, 15),
        DinheiroValor(valor),
        parcelas,
        Enumerable.Range(1, parcelas).Select(i => $"{id}-parcela-{i}").ToArray(),
        Referencia));

    private static Venda Registrar(Venda venda, string recebimentoId, string parcelaId, long valor, DateOnly data) =>
        Sucesso(venda.RegistrarPagamento(
            recebimentoId, parcelaId, DinheiroValor(valor), data, FormaPagamento.Pix, Referencia, "nota original"));

    private static DadosClienteVenda Cliente() =>
        Sucesso(DadosClienteVenda.Criar("Cliente sintético", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ConjuntoVendas conjunto, long revisao) : IArmazenamentoVendas
    {
        public int Carregamentos { get; private set; }

        public int Salvamentos { get; private set; }

        public IReadOnlyList<Venda>? CandidatoSalvo { get; private set; }

        public string? CaminhoCarregado { get; private set; }

        public string? CaminhoSalvo { get; private set; }

        public DateOnly ReferenciaCarregada { get; private set; }

        public DateOnly ReferenciaSalva { get; private set; }

        public long RevisaoSalva { get; private set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default) =>
            Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            CaminhoCarregado = caminhoAbsoluto;
            ReferenciaCarregada = referencia;
            return Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(new SnapshotVendas(conjunto, revisao)));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            CandidatoSalvo = candidatoCompleto.ToArray();
            CaminhoSalvo = caminhoAbsoluto;
            RevisaoSalva = revisaoEsperada;
            ReferenciaSalva = referencia;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
