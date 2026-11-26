using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;

[TestClass]
public sealed class RegistrarPagamentoHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-pagamento.db");

    [TestMethod]
    public async Task Handle_RegistraAcréscimoNaParcelaFuturaPreservaSaldoBaseEGravaConjuntoUmaVez()
    {
        var outraVenda = CriarVenda("outra", 5_000, quantidade: 1);
        var venda = CriarVenda("alvo", 20_000, quantidade: 2);
        venda = Sucesso(venda.RegistrarPagamento(
            "entrada-ou-pagamento-1", "alvo-parcela-1", Sucesso(Dinheiro.Criar(10_000)),
            new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        var armazenamento = new ArmazenamentoFake(Conjunto([outraVenda, venda]), 6);
        var gerador = new GeradorFake("recebimento-novo");
        using var cancellation = new CancellationTokenSource();
        var handler = CriarHandler(armazenamento, gerador);

        var resultado = await handler.Handle(Comando("alvo", "alvo-parcela-2", 11_000, 6), cancellation.Token);

        Assert.IsTrue(resultado.IsSuccess);
        var detalhe = resultado.Value;
        Assert.AreEqual(7L, detalhe.Resumo.Revisao);
        Assert.AreEqual(Referencia, detalhe.Resumo.Referencia);
        Assert.AreEqual(20_000L, detalhe.Resumo.ValorTotalBaseCentavos);
        Assert.AreEqual(1_000L, detalhe.Resumo.TotalAcrescimosCentavos);
        Assert.AreEqual(21_000L, detalhe.Resumo.ValorTotalEfetivoCentavos);
        Assert.AreEqual(21_000L, detalhe.Resumo.TotalRecebidoCentavos);
        Assert.AreEqual(0L, detalhe.Resumo.SaldoCentavos);
        Assert.AreEqual("alvo-parcela-2", detalhe.Parcelas[1].Id);
        Assert.AreEqual(10_000L, detalhe.Parcelas[1].ValorBaseCentavos);
        Assert.AreEqual(11_000L, detalhe.Parcelas[1].ValorRecebidoCentavos);
        Assert.AreEqual(1_000L, detalhe.Parcelas[1].AcrescimoCentavos);
        Assert.AreEqual(0L, detalhe.Parcelas[1].SaldoCentavos);
        Assert.AreEqual(new DateOnly(2027, 2, 1), detalhe.Parcelas[0].DataPagamento);
        Assert.AreEqual(new DateOnly(2027, 3, 1), detalhe.Parcelas[1].DataPagamento);
        Assert.AreEqual(2, detalhe.Recebimentos.Count);
        Assert.AreEqual("recebimento-novo", detalhe.Recebimentos[1].Id);
        Assert.AreEqual(OrigemRecebimentoResposta.Individual, detalhe.Recebimentos[1].Origem);
        Assert.AreEqual("alvo-parcela-2", detalhe.Recebimentos[1].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(1, armazenamento.Salvamentos);
        Assert.AreEqual(2, armazenamento.CandidatoSalvo!.Count);
        Assert.AreEqual("outra", armazenamento.CandidatoSalvo[0].Id);
        Assert.AreEqual("alvo", armazenamento.CandidatoSalvo[1].Id);
        Assert.AreEqual(6L, armazenamento.RevisaoSalva);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaSalva);
        Assert.AreEqual(cancellation.Token, armazenamento.TokenCarregado);
        Assert.AreEqual(cancellation.Token, armazenamento.TokenSalvo);
        Assert.AreEqual(1, gerador.QuantidadeGerada);
    }

    [TestMethod]
    public async Task Handle_UsaParcelaExplicitamenteENaoDeslocaSelecaoQuandoHaRepeticao()
    {
        var venda = CriarVenda("venda", 20_000, quantidade: 2);
        venda = Sucesso(venda.RegistrarPagamento(
            "recibo-1", "venda-parcela-1", Sucesso(Dinheiro.Criar(10_000)),
            new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        var comandos = new[]
        {
            Comando("venda", "venda-parcela-1", 10_000, 1),
            Comando("venda", "desconhecida", 10_000, 1),
            Comando("outra", "venda-parcela-2", 10_000, 1)
        };

        foreach (var comando in comandos)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([venda, CriarVenda("outra", 1_000, 1)]), 1);
            var gerador = new GeradorFake("id-consumido");
            var resultado = await CriarHandler(armazenamento, gerador).Handle(comando, CancellationToken.None);

            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual("selecao-nao-sequencial", Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
            Assert.AreEqual(0, armazenamento.Salvamentos);
            Assert.IsNull(armazenamento.CandidatoSalvo);
        }
    }

    [TestMethod]
    public async Task Handle_RejeitaVendaAusenteOuNaoAtivaEValorAbaixoDaBase()
    {
        var venda = CriarVenda("venda", 10_000, quantidade: 1);
        var casos = new[]
        {
            (Conjunto([venda]), Comando("ausente", "venda-parcela-1", 10_000, 0), "venda-inexistente"),
            (Conjunto([Sucesso(venda.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo))]), Comando("venda", "venda-parcela-1", 10_000, 0), "venda-nao-ativa"),
            (Conjunto([venda]), Comando("venda", "venda-parcela-1", 9_999, 0), "valor-recebido-inferior-ao-base"),
            (Conjunto([venda]), Comando("venda", "venda-parcela-1", 10_000, 0) with { Data = new DateOnly(2027, 1, 14) }, "dados-recebimento-invalidos")
        };

        foreach (var (conjunto, comando, codigo) in casos)
        {
            var armazenamento = new ArmazenamentoFake(conjunto, 0);
            var resultado = await CriarHandler(armazenamento, new GeradorFake("novo"))
                .Handle(comando, CancellationToken.None);
            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(codigo, Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
            Assert.AreEqual(0, armazenamento.Salvamentos);
        }
    }

    [TestMethod]
    public async Task Handle_ValidaRevisaoFormaDataEObservacaoUnicodeSemGravar()
    {
        var venda = CriarVenda("venda", 10_000, 1);
        var casos = new[]
        {
            (Comando("venda", "venda-parcela-1", 10_000, -1), "revisao-invalida"),
            (Comando("venda", "venda-parcela-1", Dinheiro.LimiteCentavos + 1, 0), "limite-financeiro-excedido"),
            (Comando("venda", "venda-parcela-1", 10_000, 0) with { Forma = (FormaPagamento)999 }, "dados-recebimento-invalidos"),
            (Comando("venda", "venda-parcela-1", 10_000, 0) with { Data = new DateOnly(2027, 3, 16) }, "dados-recebimento-invalidos"),
            (Comando("venda", "venda-parcela-1", 10_000, 0) with { Observacao = string.Concat(Enumerable.Repeat("🧾", 21)) }, "observacao-longa-demais")
        };

        foreach (var (comando, codigo) in casos)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 0);
            var gerador = new GeradorFake("nao-gerar");
            var resultado = await CriarHandler(armazenamento, gerador).Handle(comando, CancellationToken.None);
            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(codigo, Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
            Assert.AreEqual(0, armazenamento.Carregamentos);
            Assert.AreEqual(0, armazenamento.Salvamentos);
            Assert.AreEqual(0, gerador.QuantidadeGerada);
        }

        var validoUnicodes = new string(Enumerable.Repeat("🧾", 20).SelectMany(s => s).ToArray());
        var limite = await CriarHandler(new ArmazenamentoFake(Conjunto([venda]), 0), new GeradorFake("id"))
            .Handle(Comando("venda", "venda-parcela-1", 10_000, 0) with { Observacao = validoUnicodes }, CancellationToken.None);
        Assert.IsTrue(limite.IsSuccess);
    }

    [TestMethod]
    public async Task Handle_RevisaoAntigaConflitaAntesDoGeradorERepeticaoVigenteNaoAvancaParcela()
    {
        var venda = CriarVenda("venda", 20_000, 2);
        venda = Sucesso(venda.RegistrarPagamento(
            "recibo-1", "venda-parcela-1", Sucesso(Dinheiro.Criar(10_000)),
            new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 2);
        var gerador = new GeradorFake("id");

        var obsoleto = await CriarHandler(armazenamento, gerador)
            .Handle(Comando("venda", "venda-parcela-2", 10_000, 1), CancellationToken.None);
        Assert.IsTrue(obsoleto.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single()).Codigo);
        Assert.AreEqual(0, gerador.QuantidadeGerada);
        Assert.AreEqual(0, armazenamento.Salvamentos);

        var armazenamentoAtual = new ArmazenamentoFake(Conjunto([venda]), 2);
        var geradorAtual = new GeradorFake("id-atual");
        var repetido = await CriarHandler(armazenamentoAtual, geradorAtual)
            .Handle(Comando("venda", "venda-parcela-1", 10_000, 2), CancellationToken.None);
        Assert.IsTrue(repetido.IsFailed);
        Assert.AreEqual("selecao-nao-sequencial", Assert.IsInstanceOfType<ErroAplicacao>(repetido.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoAtual.Salvamentos);
        Assert.AreEqual(1, geradorAtual.QuantidadeGerada);
    }

    private static RegistrarPagamentoHandler CriarHandler(ArmazenamentoFake armazenamento, GeradorFake gerador) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho), gerador);

    private static RegistrarPagamentoCommand Comando(string vendaId, string parcelaId, long valor, long revisao) => new(
        vendaId,
        parcelaId,
        valor,
        new DateOnly(2027, 3, 1),
        FormaPagamento.Pix,
        null,
        Referencia,
        revisao);

    private static Venda CriarVenda(string id, long valor, int quantidade)
    {
        var ids = Enumerable.Range(1, quantidade).Select(i => $"{id}-parcela-{i}").ToArray();
        return Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar("Cliente", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(valor)),
            quantidade,
            ids,
            Referencia));
    }

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class GeradorFake(params string[] valores) : IGeradorIdentificadores
    {
        private int _indice;

        public int QuantidadeGerada => _indice;

        public string Gerar() => _indice < valores.Length
            ? valores[_indice++]
            : throw new AssertFailedException("Gerador determinístico esgotado.");
    }

    private sealed class ArmazenamentoFake(ConjuntoVendas conjunto, long revisao) : IArmazenamentoVendas
    {
        public int Carregamentos { get; private set; }

        public int Salvamentos { get; private set; }

        public IReadOnlyList<Venda>? CandidatoSalvo { get; private set; }

        public string? CaminhoCarregado { get; private set; }

        public DateOnly ReferenciaCarregada { get; private set; }

        public DateOnly ReferenciaSalva { get; private set; }

        public long RevisaoSalva { get; private set; }

        public CancellationToken TokenCarregado { get; private set; }

        public CancellationToken TokenSalvo { get; private set; }

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
            TokenCarregado = cancellationToken;
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
            RevisaoSalva = revisaoEsperada;
            ReferenciaSalva = referencia;
            TokenSalvo = cancellationToken;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
