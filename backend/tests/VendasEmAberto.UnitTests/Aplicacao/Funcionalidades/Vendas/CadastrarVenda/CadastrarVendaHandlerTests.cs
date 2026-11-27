using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;

[TestClass]
public sealed class CadastrarVendaHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-teste.db");

    [TestMethod]
    public async Task Handle_DistribuiCentavosGeraIdsDistintosPreservaOutrasVendasEGravaUmaVez()
    {
        var existente = CriarVenda("existente", 2_000);
        var armazenamento = new ArmazenamentoFake(Conjunto([existente]), revisao: 4);
        var gerador = new GeradorFake("nova", "p1", "p2", "p3");
        var handler = CriarHandler(armazenamento, gerador);
        using var cancellation = new CancellationTokenSource();

        var resultado = await handler.Handle(Comando(valor: 10_000, parcelas: 3, revisao: 4), cancellation.Token);

        Assert.IsTrue(resultado.IsSuccess);
        var detalhe = resultado.Value;
        Assert.AreEqual(5L, detalhe.Resumo.Revisao);
        Assert.AreEqual(Referencia, detalhe.Resumo.Referencia);
        Assert.AreEqual("nova", detalhe.Resumo.Id);
        CollectionAssert.AreEqual(new[] { "p1", "p2", "p3" }, detalhe.Parcelas.Select(p => p.Id).ToArray());
        CollectionAssert.AreEqual(new long[] { 3_334, 3_333, 3_333 }, detalhe.Parcelas.Select(p => p.ValorBaseCentavos).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            new DateOnly(2027, 4, 1), new DateOnly(2027, 5, 1), new DateOnly(2027, 6, 1)
        }, detalhe.Parcelas.Select(p => p.Vencimento).ToArray());
        Assert.AreEqual(2, armazenamento.CandidatoSalvo!.Count);
        Assert.AreEqual("existente", armazenamento.CandidatoSalvo[0].Id);
        Assert.AreEqual("nova", armazenamento.CandidatoSalvo[1].Id);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(1, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Caminho, armazenamento.CaminhoSalvo);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaSalva);
        Assert.AreEqual(4L, armazenamento.RevisaoSalva);
        Assert.AreEqual(cancellation.Token, armazenamento.TokenCarregado);
        Assert.AreEqual(cancellation.Token, armazenamento.TokenSalvo);
        Assert.AreEqual(4, gerador.QuantidadeGerada);
        Assert.AreEqual(gerador.QuantidadeGerada, gerador.ValoresGerados.Distinct(StringComparer.Ordinal).Count());
    }

    [TestMethod]
    public async Task Handle_ComEntradaGravaEntradaUmaVezEParcelasFuturasNaOrdem()
    {
        var armazenamento = new ArmazenamentoFake(Conjunto([]), revisao: 0);
        var gerador = new GeradorFake("venda", "p-entrada", "p-futura", "recebimento-entrada");
        var handler = CriarHandler(armazenamento, gerador);
        var comando = Comando(valor: 20_000, parcelas: 2, revisao: 0) with
        {
            Entrada = new EntradaVendaComando(10_000, FormaPagamento.Pix)
        };

        var resultado = await handler.Handle(comando, CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(2, resultado.Value.Parcelas.Count);
        CollectionAssert.AreEqual(new[] { "p-entrada", "p-futura" }, resultado.Value.Parcelas.Select(p => p.Id).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 10_000 }, resultado.Value.Parcelas.Select(p => p.ValorBaseCentavos).ToArray());
        Assert.AreEqual(1, resultado.Value.Recebimentos.Count);
        var entrada = resultado.Value.Recebimentos[0];
        Assert.AreEqual("recebimento-entrada", entrada.Id);
        Assert.AreEqual(OrigemRecebimentoResposta.Entrada, entrada.Origem);
        Assert.AreEqual(FormaPagamentoResposta.Pix, entrada.Forma);
        Assert.AreEqual(10_000L, entrada.ValorCentavos);
        Assert.AreEqual("p-entrada", entrada.Alocacoes.Single().ParcelaId);
        Assert.AreEqual(4, gerador.QuantidadeGerada);
        Assert.AreEqual(1, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_RevisaoObsoletaFalhaPrimaGeracaoIdsESalvamento()
    {
        var armazenamento = new ArmazenamentoFake(Conjunto([]), revisao: 8);
        var gerador = new GeradorFake("nao-gerar");
        var handler = CriarHandler(armazenamento, gerador);

        var resultado = await handler.Handle(Comando(valor: 100, parcelas: 1, revisao: 7), CancellationToken.None);

        Assert.IsTrue(resultado.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
        Assert.AreEqual("conflito-revisao", erro.Codigo);
        Assert.AreEqual(CategoriaErroAplicacao.Conflito, erro.Categoria);
        Assert.AreEqual(0, gerador.QuantidadeGerada);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_ValidacoesDeIdentificacaoValorQuantidadeEntradaECalendarioNaoCarregamNemGeramIds()
    {
        var comandos = new[]
        {
            Comando() with { Nome = " " },
            Comando() with { ValorTotalCentavos = 0 },
            Comando() with { ValorTotalCentavos = Dinheiro.LimiteCentavos + 1 },
            Comando() with { QuantidadeParcelas = 0 },
            Comando() with { QuantidadeParcelas = 1, Entrada = new EntradaVendaComando(10, FormaPagamento.Pix) },
            Comando() with { DataVenda = new DateOnly(9999, 11, 1), Referencia = new DateOnly(9999, 11, 1), QuantidadeParcelas = 3 }
        };

        foreach (var comando in comandos)
        {
            var armazenamento = new ArmazenamentoFake(Conjunto([]), revisao: comando.RevisaoEsperada);
            var gerador = new GeradorFake();
            var resultado = await CriarHandler(armazenamento, gerador).Handle(comando, CancellationToken.None);

            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(0, armazenamento.Carregamentos);
            Assert.AreEqual(0, armazenamento.Salvamentos);
            Assert.AreEqual(0, gerador.QuantidadeGerada);
        }
    }

    [TestMethod]
    public async Task Handle_CalendarioForaDoLimiteApontaCampoDataVendaDoCommand()
    {
        var armazenamento = new ArmazenamentoFake(Conjunto([]), revisao: 0);
        var gerador = new GeradorFake();
        var comando = Comando() with
        {
            DataVenda = new DateOnly(9999, 12, 31),
            Referencia = new DateOnly(9999, 12, 31)
        };

        var resultado = await CriarHandler(armazenamento, gerador).Handle(comando, CancellationToken.None);

        Assert.IsTrue(resultado.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
        Assert.AreEqual("data-invalida", erro.Codigo);
        Assert.AreEqual("dataVenda", erro.Campo);
        Assert.AreEqual(0, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(0, gerador.QuantidadeGerada);
    }

    [TestMethod]
    public async Task Handle_IdGeradoColidenteOuOverflowNoConjuntoFalhaSemSaveNemRespostaCandidata()
    {
        var existente = CriarVenda("existente", 2_000);
        var armazenamentoColisao = new ArmazenamentoFake(Conjunto([existente]), 1);
        var colisao = await CriarHandler(armazenamentoColisao, new GeradorFake("existente", "p1"))
            .Handle(Comando(valor: 100, parcelas: 1, revisao: 1), CancellationToken.None);
        Assert.IsTrue(colisao.IsFailed);
        Assert.AreEqual("identificador-duplicado", Assert.IsInstanceOfType<ErroAplicacao>(colisao.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoColisao.Salvamentos);

        var vendaNoLimite = Sucesso(CriarVenda("limite", Dinheiro.LimiteCentavos)
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var armazenamentoLimite = new ArmazenamentoFake(Conjunto([vendaNoLimite]), 2);
        var overflow = await CriarHandler(armazenamentoLimite, new GeradorFake("nova", "nova-parcela"))
            .Handle(Comando(valor: 1, parcelas: 1, revisao: 2), CancellationToken.None);
        Assert.IsTrue(overflow.IsFailed);
        Assert.AreEqual("limite-financeiro-excedido", Assert.IsInstanceOfType<ErroAplicacao>(overflow.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoLimite.Salvamentos);
    }

    private static CadastrarVendaHandler CriarHandler(ArmazenamentoFake armazenamento, GeradorFake gerador) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho), gerador);

    private static CadastrarVendaCommand Comando(
        long valor = 100,
        int parcelas = 1,
        long revisao = 0) => new(
            "Cliente de teste",
            "52998224725",
            "11987654321",
            null,
            new DateOnly(2027, 3, 1),
            valor,
            parcelas,
            Referencia,
            revisao);

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) =>
        Sucesso(ConjuntoVendas.Criar(vendas));

    private static Venda CriarVenda(string id, long valor) => Sucesso(Venda.Cadastrar(
        id,
        Sucesso(DadosClienteVenda.Criar("Cliente existente", "52998224725", "11987654321", null)),
        new DateOnly(2027, 1, 1),
        Sucesso(Dinheiro.Criar(valor)),
        1,
        [$"{id}-parcela"],
        Referencia));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class GeradorFake(params string[] valores) : IGeradorIdentificadores
    {
        private int _indice;

        public int QuantidadeGerada => _indice;

        public IReadOnlyList<string> ValoresGerados => valores.Take(_indice).ToArray();

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

        public string? CaminhoSalvo { get; private set; }

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
            CaminhoSalvo = caminhoAbsoluto;
            RevisaoSalva = revisaoEsperada;
            ReferenciaSalva = referencia;
            TokenSalvo = cancellationToken;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
