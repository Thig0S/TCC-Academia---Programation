using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;

[TestClass]
public sealed class ConsultarPeriodoHandlerTests
{
    private static readonly DateOnly Inicio = new(2027, 3, 1);
    private static readonly DateOnly Fim = new(2027, 3, 31);
    private static readonly DateOnly Referencia = new(2027, 4, 2);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-periodo.db");

    [TestMethod]
    public async Task Handle_IncluiDuasBordasEVendasAtivasAbertasQuitadasNaOrdemESomaRecebimentosDeTodasAsVendas()
    {
        var vendas = CriarCenario();
        var armazenamento = new ArmazenamentoFake(CriarConjunto(vendas), 23);
        var handler = CriarHandler(armazenamento);

        var resultado = await handler.Handle(new ConsultarPeriodoQuery(Inicio, Fim, Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        var periodo = resultado.Value;
        Assert.AreEqual(Inicio, periodo.Inicio);
        Assert.AreEqual(Fim, periodo.Fim);
        Assert.AreEqual(38_000L, periodo.RecebidosCentavos);
        Assert.AreEqual(23L, periodo.Revisao);
        Assert.AreEqual(Referencia, periodo.Referencia);
        CollectionAssert.AreEqual(
            new[] { "ativa-aberta-no-periodo", "ativa-borda-inicial", "ativa-borda-final" },
            periodo.Vendas.Select(venda => venda.Id).ToArray());

        var aberta = periodo.Vendas[0];
        Assert.AreEqual(ClienteNome("ativa-aberta-no-periodo"), aberta.Cliente.Nome);
        Assert.AreEqual(StatusAdministrativoResposta.Ativo, aberta.StatusAdministrativo);
        Assert.AreEqual(SituacaoVendaResposta.EmAberto, aberta.Situacao);
        Assert.AreEqual(10_000L, aberta.SaldoCentavos);
        Assert.AreEqual(Referencia, aberta.Referencia);
        Assert.AreEqual(23L, aberta.Revisao);
        Assert.AreEqual(new DateOnly(2027, 3, 1), periodo.Vendas[1].DataVenda);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, periodo.Vendas[1].Situacao);
        Assert.AreEqual(new DateOnly(2027, 3, 31), periodo.Vendas[2].DataVenda);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, periodo.Vendas[2].Situacao);

        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(23L, armazenamento.RevisaoRetornada);
    }

    [TestMethod]
    public async Task Handle_PeriodoVazioRetornaZeroSemVendasEListaProtegida()
    {
        var armazenamento = new ArmazenamentoFake(CriarConjunto([]), 0);
        var resultado = await CriarHandler(armazenamento).Handle(
            new ConsultarPeriodoQuery(Inicio, Fim, Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(Inicio, resultado.Value.Inicio);
        Assert.AreEqual(Fim, resultado.Value.Fim);
        Assert.AreEqual(0L, resultado.Value.RecebidosCentavos);
        Assert.AreEqual(0L, resultado.Value.Revisao);
        Assert.AreEqual(Referencia, resultado.Value.Referencia);
        Assert.AreEqual(0, resultado.Value.Vendas.Count);
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<VendaResumoResposta>)resultado.Value.Vendas).Clear());
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_IntervaloInvertidoRetornaValidacaoSemCarregarOuGravar()
    {
        var armazenamento = new ArmazenamentoFake(CriarConjunto([]), 4);

        var resultado = await CriarHandler(armazenamento).Handle(
            new ConsultarPeriodoQuery(Fim, Inicio, Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
        Assert.AreEqual("periodo-invalido", erro.Codigo);
        Assert.AreEqual("periodo", erro.Campo);
        Assert.AreEqual(0, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    private static ConsultarPeriodoHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static Venda[] CriarCenario()
    {
        var aberta = CriarVenda("ativa-aberta-no-periodo", 10_000, new DateOnly(2027, 3, 15));
        var bordaInicial = Registrar(
            CriarVenda("ativa-borda-inicial", 10_000, Inicio),
            "recebimento-borda-inicial",
            10_000,
            Inicio);
        var bordaFinal = Registrar(
            CriarVenda("ativa-borda-final", 10_000, Fim),
            "recebimento-borda-final",
            10_000,
            Fim);
        var externa = Registrar(
            CriarVenda("ativa-fora-do-periodo", 5_000, new DateOnly(2027, 2, 28)),
            "recebimento-fora-no-periodo",
            5_000,
            new DateOnly(2027, 3, 15));
        var inativa = Sucesso(Registrar(
            CriarVenda("inativa-no-periodo", 6_000, new DateOnly(2027, 3, 10)),
            "recebimento-inativo-na-borda",
            6_000,
            Fim).AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var vendaPrejuizo = Sucesso(Venda.Cadastrar(
            "prejuizo-fora-do-periodo",
            Sucesso(DadosClienteVenda.Criar(ClienteNome("prejuizo-fora-do-periodo"), "52998224725", "11987654321", null)),
            new DateOnly(2027, 2, 20),
            DinheiroValor(14_000),
            2,
            ["prejuizo-parcela-1", "prejuizo-parcela-2"],
            Referencia));
        var prejuizo = Sucesso(Registrar(
            vendaPrejuizo,
            "recebimento-prejuizo-na-borda",
            7_000,
            Inicio).AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [aberta, bordaInicial, bordaFinal, externa, inativa, prejuizo];
    }

    private static Venda CriarVenda(string id, long valor, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Sucesso(DadosClienteVenda.Criar(ClienteNome(id), "52998224725", "11987654321", null)),
        dataVenda,
        DinheiroValor(valor),
        1,
        [$"{id}-parcela"],
        Referencia));

    private static string ClienteNome(string id) => $"Cliente {id}";

    private static Venda Registrar(Venda venda, string recebimentoId, long valor, DateOnly data) => Sucesso(venda.RegistrarPagamento(
        recebimentoId,
        venda.Parcelas[0].Id,
        DinheiroValor(valor),
        data,
        FormaPagamento.Pix,
        Referencia));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static ConjuntoVendas CriarConjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

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
