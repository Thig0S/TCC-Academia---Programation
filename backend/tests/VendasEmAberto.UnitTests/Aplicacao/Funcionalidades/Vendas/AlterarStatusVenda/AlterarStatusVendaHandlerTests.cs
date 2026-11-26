using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;

[TestClass]
public sealed class AlterarStatusVendaHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-status.db");

    [TestMethod]
    public async Task Handle_AceitaTransicoesPermitidasEPreservaHistorico()
    {
        var cenarios = new[]
        {
            (CriarVenda("ativo-prejuizo", StatusAdministrativoVenda.Ativo, paga: false), StatusAdministrativoVenda.Prejuizo),
            (CriarVenda("inativo-ativo", StatusAdministrativoVenda.Inativo, paga: false), StatusAdministrativoVenda.Ativo),
            (CriarVenda("prejuizo-ativo", StatusAdministrativoVenda.Prejuizo, paga: false), StatusAdministrativoVenda.Ativo),
            (CriarVenda("ativo-inativo", StatusAdministrativoVenda.Ativo, paga: false), StatusAdministrativoVenda.Inativo)
        };

        foreach (var (venda, novoStatus) in cenarios)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 4);
            var resposta = await CriarHandler(armazenamento).Handle(
                new AlterarStatusVendaCommand(venda.Id, novoStatus, Referencia, 4),
                CancellationToken.None);

            Assert.IsTrue(resposta.IsSuccess, venda.Id);
            Assert.AreEqual(novoStatus.ToString(), resposta.Value.Resumo.StatusAdministrativo.ToString());
            Assert.AreEqual(5L, resposta.Value.Resumo.Revisao);
            Assert.AreEqual(1, armazenamento.Salvamentos);
            var alterada = armazenamento.CandidatoSalvo!.Single();
            Assert.AreEqual(venda.Id, alterada.Id);
            Assert.AreEqual(venda.Cliente.Nome, alterada.Cliente.Nome);
            Assert.AreEqual(venda.ValorTotalBase, alterada.ValorTotalBase);
            CollectionAssert.AreEqual(venda.Parcelas.Select(p => p.Id).ToArray(), alterada.Parcelas.Select(p => p.Id).ToArray());
            CollectionAssert.AreEqual(venda.Recebimentos.Select(r => r.Id).ToArray(), alterada.Recebimentos.Select(r => r.Id).ToArray());
        }
    }

    [TestMethod]
    public async Task Handle_RejeitaTransicoesNaoPermitidasSemSalvar()
    {
        var cenarios = new[]
        {
            (CriarVenda("inativo", StatusAdministrativoVenda.Inativo, paga: false), StatusAdministrativoVenda.Prejuizo),
            (CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, paga: false), StatusAdministrativoVenda.Inativo),
            (CriarVenda("quitada", StatusAdministrativoVenda.Ativo, paga: true), StatusAdministrativoVenda.Prejuizo)
        };

        foreach (var (venda, novoStatus) in cenarios)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 2);
            var resultado = await CriarHandler(armazenamento).Handle(
                new AlterarStatusVendaCommand(venda.Id, novoStatus, Referencia, 2),
                CancellationToken.None);

            Assert.IsTrue(resultado.IsFailed);
            var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
            Assert.AreEqual(CategoriaErroAplicacao.RegraNegocio, erro.Categoria);
            Assert.AreEqual("transicao-nao-permitida", erro.Codigo);
            Assert.AreEqual(0, armazenamento.Salvamentos);
            Assert.IsNull(armazenamento.CandidatoSalvo);
        }
    }

    [TestMethod]
    public async Task Handle_MesmoStatusEhNoOpMasRevisaoObsoletaConflitaAntesDoNoOp()
    {
        var venda = CriarVenda("no-op", StatusAdministrativoVenda.Inativo, paga: false);
        var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 7);
        var handler = CriarHandler(armazenamento);

        var resultado = await handler.Handle(
            new AlterarStatusVendaCommand(venda.Id, StatusAdministrativoVenda.Inativo, Referencia, 7),
            CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(7L, resultado.Value.Resumo.Revisao);
        Assert.AreEqual(StatusAdministrativoResposta.Inativo, resultado.Value.Resumo.StatusAdministrativo);
        Assert.AreEqual(0, armazenamento.Salvamentos);

        var obsoletoArmazenamento = new ArmazenamentoFake(Conjunto([venda]), 8);
        var obsoleto = await CriarHandler(obsoletoArmazenamento).Handle(
            new AlterarStatusVendaCommand(venda.Id, StatusAdministrativoVenda.Inativo, Referencia, 7),
            CancellationToken.None);
        Assert.IsTrue(obsoleto.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single()).Codigo);
        Assert.AreEqual(0, obsoletoArmazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_StatusInvalidoFalhaAntesDaCargaEVendaAusenteEhInexistente()
    {
        var armazenamentoInvalido = new ArmazenamentoFake(Conjunto([]), 0);
        var invalido = await CriarHandler(armazenamentoInvalido).Handle(
            new AlterarStatusVendaCommand("venda", (StatusAdministrativoVenda)999, Referencia, 0),
            CancellationToken.None);
        Assert.IsTrue(invalido.IsFailed);
        Assert.AreEqual("status-invalido", Assert.IsInstanceOfType<ErroAplicacao>(invalido.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoInvalido.Carregamentos);

        var armazenamentoAusente = new ArmazenamentoFake(Conjunto([]), 0);
        var ausente = await CriarHandler(armazenamentoAusente).Handle(
            new AlterarStatusVendaCommand("ausente", StatusAdministrativoVenda.Ativo, Referencia, 0),
            CancellationToken.None);
        Assert.IsTrue(ausente.IsFailed);
        Assert.AreEqual("venda-inexistente", Assert.IsInstanceOfType<ErroAplicacao>(ausente.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoAusente.Salvamentos);
    }

    private static AlterarStatusVendaHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar("Cliente", "52998224725", "11987654321", "descrição")),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recibo", $"{id}-parcela", Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

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

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default) =>
            Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
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
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
