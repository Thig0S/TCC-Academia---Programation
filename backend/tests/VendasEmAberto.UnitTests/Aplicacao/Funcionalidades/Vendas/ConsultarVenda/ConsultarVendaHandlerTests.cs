using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;

[TestClass]
public sealed class ConsultarVendaHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-consulta.db");

    [TestMethod]
    public async Task Handle_ConsultaDetalheCompletoPreservaIdentidadesOrdemOrigemDatasEReferenciaSemEscrita()
    {
        var venda = CriarVendaComHistorico();
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar([venda]));
        var handler = new ConsultarVendaHandler(armazenamento, new DestinoArmazenamentoVendas(Caminho));
        using var cancellation = new CancellationTokenSource();

        var resultado = await handler.Handle(new ConsultarVendaQuery(venda.Id, Referencia), cancellation.Token);

        Assert.IsTrue(resultado.IsSuccess);
        var detalhe = resultado.Value;
        Assert.AreEqual(19L, detalhe.Resumo.Revisao);
        Assert.AreEqual(Referencia, detalhe.Resumo.Referencia);
        Assert.AreEqual("venda-sintetica", detalhe.Resumo.Id);
        Assert.AreEqual("Máría 🧪 da Silva", detalhe.Resumo.Cliente.Nome);
        Assert.AreEqual("52998224725", detalhe.Resumo.Cliente.Cpf);
        Assert.AreEqual("11987654321", detalhe.Resumo.Cliente.Telefone);
        Assert.AreEqual("descrição — Unicode", detalhe.Resumo.Cliente.Descricao);
        Assert.AreEqual(new DateOnly(2027, 1, 15), detalhe.Resumo.DataVenda);
        Assert.AreEqual(StatusAdministrativoResposta.Ativo, detalhe.Resumo.StatusAdministrativo);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, detalhe.Resumo.Situacao);
        Assert.AreEqual(40_000L, detalhe.Resumo.ValorTotalBaseCentavos);
        Assert.AreEqual(1_000L, detalhe.Resumo.TotalAcrescimosCentavos);
        Assert.AreEqual(41_000L, detalhe.Resumo.ValorTotalEfetivoCentavos);
        Assert.AreEqual(41_000L, detalhe.Resumo.TotalRecebidoCentavos);
        Assert.AreEqual(0L, detalhe.Resumo.SaldoCentavos);
        Assert.AreEqual(4, detalhe.Resumo.QuantidadePaga);
        Assert.AreEqual(4, detalhe.Resumo.QuantidadeParcelas);
        Assert.IsNull(detalhe.Resumo.ProximoVencimento);
        CollectionAssert.AreEqual(
            new[] { "p1", "p2", "p3", "p4" },
            detalhe.Parcelas.Select(p => p.Id).ToArray());
        CollectionAssert.AreEqual(
            new long[] { 10_000, 10_000, 10_000, 10_000 },
            detalhe.Parcelas.Select(p => p.ValorBaseCentavos).ToArray());
        CollectionAssert.AreEqual(
            new long[] { 10_000, 10_000, 10_000, 11_000 },
            detalhe.Parcelas.Select(p => p.ValorEfetivoCentavos).ToArray());
        CollectionAssert.AreEqual(
            new long[] { 10_000, 10_000, 10_000, 11_000 },
            detalhe.Parcelas.Select(p => p.ValorRecebidoCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 0, 0, 0, 1_000 }, detalhe.Parcelas.Select(p => p.AcrescimoCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 0, 0, 0, 0 }, detalhe.Parcelas.Select(p => p.SaldoCentavos).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            new DateOnly(2027, 1, 15), new DateOnly(2027, 2, 15),
            new DateOnly(2027, 3, 15), new DateOnly(2027, 4, 15)
        }, detalhe.Parcelas.Select(p => p.Vencimento).ToArray());
        Assert.AreEqual(SituacaoParcelaResposta.Paga, detalhe.Parcelas[0].Situacao);
        Assert.AreEqual(new DateOnly(2027, 1, 15), detalhe.Parcelas[0].DataPagamento);
        Assert.AreEqual(FormaPagamentoResposta.Pix, detalhe.Parcelas[0].FormaPagamento);
        Assert.AreEqual(SituacaoParcelaResposta.Paga, detalhe.Parcelas[3].Situacao);
        Assert.AreEqual(new DateOnly(2027, 2, 10), detalhe.Parcelas[3].DataPagamento);
        Assert.AreEqual(FormaPagamentoResposta.CartaoCredito, detalhe.Parcelas[3].FormaPagamento);

        CollectionAssert.AreEqual(new[] { "r-entrada", "r-lote", "r-individual" }, detalhe.Recebimentos.Select(r => r.Id).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            new DateOnly(2027, 1, 15), new DateOnly(2027, 3, 10), new DateOnly(2027, 2, 10)
        }, detalhe.Recebimentos.Select(r => r.Data).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            OrigemRecebimentoResposta.Entrada,
            OrigemRecebimentoResposta.HistoricoLote,
            OrigemRecebimentoResposta.Individual
        }, detalhe.Recebimentos.Select(r => r.Origem).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            FormaPagamentoResposta.Pix,
            FormaPagamentoResposta.Dinheiro,
            FormaPagamentoResposta.CartaoCredito
        }, detalhe.Recebimentos.Select(r => r.Forma).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 20_000, 11_000 },
            detalhe.Recebimentos.Select(r => r.ValorCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 0, 0, 1_000 },
            detalhe.Recebimentos.Select(r => r.AcrescimoCentavos).ToArray());
        Assert.AreEqual("🧾 pago", detalhe.Recebimentos[2].Observacao);
        CollectionAssert.AreEqual(new[] { "p1" }, detalhe.Recebimentos[0].Alocacoes.Select(a => a.ParcelaId).ToArray());
        CollectionAssert.AreEqual(new[] { "p2", "p3" }, detalhe.Recebimentos[1].Alocacoes.Select(a => a.ParcelaId).ToArray());
        CollectionAssert.AreEqual(new[] { "p4" }, detalhe.Recebimentos[2].Alocacoes.Select(a => a.ParcelaId).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000 }, detalhe.Recebimentos[0].Alocacoes.Select(a => a.ValorCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 10_000 }, detalhe.Recebimentos[1].Alocacoes.Select(a => a.ValorCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 11_000 }, detalhe.Recebimentos[2].Alocacoes.Select(a => a.ValorCentavos).ToArray());

        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(cancellation.Token, armazenamento.TokenCarregado);
    }

    [TestMethod]
    public async Task Handle_IdVazioFalhaAntesDeCarregar()
    {
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar([]));
        var resultado = await new ConsultarVendaHandler(armazenamento, new DestinoArmazenamentoVendas(Caminho))
            .Handle(new ConsultarVendaQuery(" ", Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
        Assert.AreEqual("identificador-invalido", erro.Codigo);
        Assert.AreEqual("vendaId", erro.Campo);
        Assert.AreEqual(0, armazenamento.Carregamentos);
    }

    [TestMethod]
    public async Task Handle_IdAusenteNoSnapshotFalhaComoInexistenciaSemEscrita()
    {
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar([]));
        var resultado = await new ConsultarVendaHandler(armazenamento, new DestinoArmazenamentoVendas(Caminho))
            .Handle(new ConsultarVendaQuery("id-ausente", Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Inexistencia, erro.Categoria);
        Assert.AreEqual("venda-inexistente", erro.Codigo);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_ConsultaPosteriorNaoAlteraRespostaJaRetornada()
    {
        var venda = CriarVendaComHistorico();
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar([venda]));
        var handler = new ConsultarVendaHandler(armazenamento, new DestinoArmazenamentoVendas(Caminho));
        var antes = (await handler.Handle(new ConsultarVendaQuery(venda.Id, Referencia), CancellationToken.None)).Value;
        var editada = Sucesso(venda.EditarCliente("Nome posterior", "52998224725", "11987654321", "outro texto"));
        armazenamento.SubstituirSnapshot(ConjuntoVendas.Criar([editada]), 20);
        var depois = (await handler.Handle(new ConsultarVendaQuery(venda.Id, Referencia), CancellationToken.None)).Value;

        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<ParcelaDetalheResposta>)antes.Parcelas).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<AlocacaoResposta>)antes.Recebimentos[0].Alocacoes).Clear());
        Assert.AreEqual(4, antes.Parcelas.Count);
        Assert.AreEqual("Máría 🧪 da Silva", antes.Resumo.Cliente.Nome);
        Assert.AreEqual(19L, antes.Resumo.Revisao);
        Assert.AreEqual("Nome posterior", depois.Resumo.Cliente.Nome);
        Assert.AreEqual(20L, depois.Resumo.Revisao);
        Assert.AreEqual("r-lote", depois.Recebimentos[1].Id);
        Assert.AreEqual("🧾 pago", depois.Recebimentos[2].Observacao);
        Assert.AreEqual(2, armazenamento.Carregamentos);
    }

    private static Venda CriarVendaComHistorico()
    {
        var cliente = Sucesso(DadosClienteVenda.Criar(
            "Máría 🧪 da Silva", "52998224725", "(11) 98765-4321", "descrição — Unicode"));
        var dinheiro = (long centavos) => Sucesso(Dinheiro.Criar(centavos));
        return Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "venda-sintetica",
            StatusAdministrativoVenda.Ativo,
            cliente,
            new DateOnly(2027, 1, 15),
            dinheiro(40_000),
            [
                new("p1", 1, dinheiro(10_000), new DateOnly(2027, 1, 15)),
                new("p2", 2, dinheiro(10_000), new DateOnly(2027, 2, 15)),
                new("p3", 3, dinheiro(10_000), new DateOnly(2027, 3, 15)),
                new("p4", 4, dinheiro(10_000), new DateOnly(2027, 4, 15))
            ],
            [
                new("r-entrada", new DateOnly(2027, 1, 15), FormaPagamento.Pix, dinheiro(10_000),
                    OrigemRecebimento.Entrada, dinheiro(0), null, [new("p1", dinheiro(10_000))]),
                new("r-lote", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, dinheiro(20_000),
                    OrigemRecebimento.HistoricoLote, dinheiro(0), null,
                    [new("p2", dinheiro(10_000)), new("p3", dinheiro(10_000))]),
                new("r-individual", new DateOnly(2027, 2, 10), FormaPagamento.CartaoCredito, dinheiro(11_000),
                    OrigemRecebimento.Individual, dinheiro(1_000), "🧾 pago", [new("p4", dinheiro(11_000))])
            ]), Referencia));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ResultadoDominio<ConjuntoVendas> conjunto) : IArmazenamentoVendas
    {
        private SnapshotVendas _snapshot = new(Sucesso(conjunto), 19);

        public void SubstituirSnapshot(ResultadoDominio<ConjuntoVendas> conjunto, long revisao) =>
            _snapshot = new SnapshotVendas(Sucesso(conjunto), revisao);

        public int Carregamentos { get; private set; }

        public int Inicializacoes { get; private set; }

        public int Salvamentos { get; private set; }

        public string? CaminhoCarregado { get; private set; }

        public DateOnly ReferenciaCarregada { get; private set; }

        public CancellationToken TokenCarregado { get; private set; }

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
            TokenCarregado = cancellationToken;
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
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisaoEsperada + 1));
        }
    }
}
