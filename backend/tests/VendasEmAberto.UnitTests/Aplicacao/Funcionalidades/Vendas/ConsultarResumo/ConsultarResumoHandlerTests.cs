using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;

[TestClass]
public sealed class ConsultarResumoHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-resumo.db");

    [TestMethod]
    public async Task Handle_ProjetaTotaisOperacionaisAtivasERecebimentosMensaisDeTodosStatusUmaVez()
    {
        var conjunto = Conjunto(CriarCenario());
        var armazenamento = new ArmazenamentoFake(conjunto, revisao: 14);
        var handler = CriarHandler(armazenamento);

        var resultado = await handler.Handle(new ConsultarResumoQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(20_000L, resultado.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(10_000L, resultado.Value.ValoresEmAtrasoCentavos);
        Assert.AreEqual(50_000L, resultado.Value.RecebidoNoMesCentavos);
        Assert.AreEqual(3, resultado.Value.QuantidadeVendasAtivas);
        Assert.AreEqual(14L, resultado.Value.Revisao);
        Assert.AreEqual(Referencia, resultado.Value.Referencia);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(14L, armazenamento.RevisaoRetornada);
    }

    [TestMethod]
    public async Task Handle_ConjuntoVazioRetornaZerosELimiteSeguroEhRepresentadoSemOverflow()
    {
        var vazioArmazenamento = new ArmazenamentoFake(Conjunto([]), revisao: 0);
        var vazio = await CriarHandler(vazioArmazenamento)
            .Handle(new ConsultarResumoQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(vazio.IsSuccess);
        Assert.AreEqual(0L, vazio.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(0L, vazio.Value.ValoresEmAtrasoCentavos);
        Assert.AreEqual(0L, vazio.Value.RecebidoNoMesCentavos);
        Assert.AreEqual(0, vazio.Value.QuantidadeVendasAtivas);
        Assert.AreEqual(0L, vazio.Value.Revisao);

        var vendaNoLimite = Sucesso(Venda.Cadastrar(
            "limite",
            Cliente(),
            new DateOnly(2027, 1, 15),
            DinheiroValor(Dinheiro.LimiteCentavos),
            1,
            ["limite-parcela"],
            Referencia));
        var limiteArmazenamento = new ArmazenamentoFake(Conjunto([vendaNoLimite]), 3);
        var limite = await CriarHandler(limiteArmazenamento)
            .Handle(new ConsultarResumoQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(limite.IsSuccess);
        Assert.AreEqual(Dinheiro.LimiteCentavos, limite.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(Dinheiro.LimiteCentavos, limite.Value.ValoresEmAtrasoCentavos);
        Assert.AreEqual(0L, limite.Value.RecebidoNoMesCentavos);
        Assert.AreEqual(1, limite.Value.QuantidadeVendasAtivas);
        Assert.AreEqual(1, limiteArmazenamento.Carregamentos);
        Assert.AreEqual(0, limiteArmazenamento.Salvamentos);
    }

    private static ConsultarResumoHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static Venda[] CriarCenario()
    {
        var ativaEntradaLote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
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
                new("entrada-unica", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(10_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null, [new("entrada-lote-p1", DinheiroValor(10_000))]),
                new("lote-unico", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null, [new("entrada-lote-p2", DinheiroValor(10_000))])
            ]), Referencia));

        var ativaAtrasada = CriarVenda("ativa-atrasada", 10_000, 1, new DateOnly(2027, 1, 15));
        var ativaQuitada = Registrar(CriarVenda("ativa-quitada", 10_000, 1, new DateOnly(2027, 1, 15)),
            "recebimento-ativa", 10_000, new DateOnly(2027, 3, 5));
        var inativa = Sucesso(Registrar(CriarVenda("inativa", 20_000, 2, new DateOnly(2027, 1, 15)),
            "recebimento-inativa", 10_000, new DateOnly(2027, 3, 7))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizo = Sucesso(Registrar(CriarVenda("prejuizo", 20_000, 2, new DateOnly(2027, 1, 15)),
            "recebimento-prejuizo", 10_000, new DateOnly(2027, 3, 8))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [ativaEntradaLote, ativaAtrasada, ativaQuitada, inativa, prejuizo];
    }

    private static Venda CriarVenda(string id, long valor, int quantidade, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(id),
        dataVenda,
        DinheiroValor(valor),
        quantidade,
        Enumerable.Range(1, quantidade).Select(i => $"{id}-p{i}").ToArray(),
        Referencia));

    private static Venda Registrar(Venda venda, string id, long valor, DateOnly data) => Sucesso(venda.RegistrarPagamento(
        id, venda.Parcelas[0].Id, DinheiroValor(valor), data, FormaPagamento.Pix, Referencia));

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar(nome, "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ConjuntoVendas conjunto, long revisao) : IArmazenamentoVendas
    {
        private readonly SnapshotVendas _snapshot = new(conjunto, revisao);

        public int Carregamentos { get; private set; }

        public int Inicializacoes { get; private set; }

        public int Salvamentos { get; private set; }

        public string? CaminhoCarregado { get; private set; }

        public DateOnly ReferenciaCarregada { get; private set; }

        public long RevisaoRetornada { get; private set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default)
        {
            Inicializacoes++;
            return Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());
        }

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            CaminhoCarregado = caminhoAbsoluto;
            ReferenciaCarregada = referencia;
            RevisaoRetornada = _snapshot.Revisao;
            return Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(_snapshot));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
