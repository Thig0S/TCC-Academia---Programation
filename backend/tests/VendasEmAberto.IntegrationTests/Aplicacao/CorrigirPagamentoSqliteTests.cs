using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class CorrigirPagamentoSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-correcao-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "vendas.db");
    }

    [TestCleanup]
    public void Limpar()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    [TestMethod]
    public async Task CorrigirViaSender_MoveRecebimentoEntreMesesSemMudarIdentidadeOuSaldoAlheioEReabreFiel()
    {
        var venda = CriarVendaQuitadaEComSaldo();
        var outra = Registrar(CriarVenda("outra", 10_000, 1), "recibo-de-outra-venda", "outra-parcela-1", 10_000, new DateOnly(2027, 2, 15));
        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco, [venda, outra], 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        string idOriginal;
        string idParcela;
        using (var provider = CriarProvider())
        {
            var sender = provider.GetRequiredService<ISender>();
            var correção = await sender.Send(new CorrigirPagamentoCommand(
                "alvo", "recibo-a", 10_500, new DateOnly(2027, 3, 10),
                FormaPagamento.CartaoCredito, "Corrigido em março ✅", Referencia, 1));

            Assert.IsTrue(correção.IsSuccess);
            Assert.AreEqual(2L, correção.Value.Resumo.Revisao);
            Assert.AreEqual(500L, correção.Value.Resumo.TotalAcrescimosCentavos);
            Assert.AreEqual(20_500L, correção.Value.Resumo.TotalRecebidoCentavos);
            Assert.AreEqual(30_500L, correção.Value.Resumo.ValorTotalEfetivoCentavos);
            Assert.AreEqual(10_000L, correção.Value.Resumo.SaldoCentavos);
            Assert.AreEqual(3, correção.Value.Parcelas.Count);
            Assert.AreEqual(10_500L, correção.Value.Parcelas[0].ValorRecebidoCentavos);
            Assert.AreEqual(500L, correção.Value.Parcelas[0].AcrescimoCentavos);
            Assert.AreEqual(0L, correção.Value.Parcelas[0].SaldoCentavos);
            Assert.AreEqual(10_000L, correção.Value.Parcelas[1].ValorRecebidoCentavos);
            Assert.AreEqual(0L, correção.Value.Parcelas[1].SaldoCentavos);
            Assert.AreEqual(0L, correção.Value.Parcelas[2].ValorRecebidoCentavos);
            Assert.AreEqual(10_000L, correção.Value.Parcelas[2].SaldoCentavos);
            Assert.AreEqual(2, correção.Value.Recebimentos.Count);
            Assert.AreEqual(new DateOnly(2027, 3, 10), correção.Value.Recebimentos[0].Data);
            Assert.AreEqual(OrigemRecebimentoResposta.Individual, correção.Value.Recebimentos[0].Origem);
            Assert.AreEqual("Corrigido em março ✅", correção.Value.Recebimentos[0].Observacao);
            Assert.AreEqual("recibo-b", correção.Value.Recebimentos[1].Id);
            Assert.AreEqual(new DateOnly(2027, 2, 12), correção.Value.Recebimentos[1].Data);
            idOriginal = correção.Value.Recebimentos[0].Id;
            idParcela = correção.Value.Recebimentos[0].Alocacoes.Single().ParcelaId;
            Assert.AreEqual("alvo-parcela-1", idParcela);
            Assert.AreEqual(10_500L, correção.Value.Recebimentos[0].Alocacoes.Single().ValorCentavos);

            var mesmoPayload = await sender.Send(new CorrigirPagamentoCommand(
                "alvo", "recibo-a", 10_500, new DateOnly(2027, 3, 10),
                FormaPagamento.CartaoCredito, "Corrigido em março ✅", Referencia, 2));
            Assert.IsTrue(mesmoPayload.IsSuccess);
            Assert.AreEqual(3L, mesmoPayload.Value.Resumo.Revisao);
            Assert.AreEqual(2, mesmoPayload.Value.Recebimentos.Count);
            Assert.AreEqual(idOriginal, mesmoPayload.Value.Recebimentos[0].Id);
        }

        using var reaberto = CriarProvider();
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(3L, snapshot.Revisao);
        Assert.AreEqual(2, snapshot.Conjunto.Vendas.Count);
        var persistida = snapshot.Conjunto.Vendas[0];
        Assert.AreEqual("alvo", persistida.Id);
        Assert.AreEqual(2, persistida.Recebimentos.Count);
        Assert.AreEqual(idOriginal, persistida.Recebimentos[0].Id);
        Assert.AreEqual(idParcela, persistida.Recebimentos[0].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_500L, persistida.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(500L, persistida.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual(new DateOnly(2027, 3, 10), persistida.Recebimentos[0].Data);
        Assert.AreEqual("recibo-b", persistida.Recebimentos[1].Id);
        Assert.AreEqual(new DateOnly(2027, 2, 12), persistida.Recebimentos[1].Data);
        Assert.AreEqual(30_000L, persistida.ValorTotalBase.Centavos);
        var projecao = Sucesso(persistida.Projetar(Referencia));
        Assert.AreEqual(30_000L, projecao.ValorTotalBase.Centavos);
        Assert.AreEqual(30_500L, projecao.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(20_500L, projecao.TotalRecebido.Centavos);
        Assert.AreEqual(10_000L, projecao.Saldo.Centavos);
        Assert.AreEqual("recibo-de-outra-venda", snapshot.Conjunto.Vendas[1].Recebimentos.Single().Id);
    }

    [TestMethod]
    public async Task CorrecoesInexistentesEstrangeirasHistoricasENaoAtivasFalhamSemMudarRevisao()
    {
        var alvo = CriarVendaQuitadaEComSaldo();
        var externa = Registrar(CriarVenda("externa", 10_000, 1), "recibo-externo", "externa-parcela-1", 10_000, new DateOnly(2027, 2, 15));
        var entrada = CriarVendaComEntrada();
        var lote = CriarVendaComLote();
        var inativa = Sucesso(Registrar(
            CriarVenda("inativa", 20_000, 2),
            "inativa-recibo",
            "inativa-parcela-1",
            11_000,
            new DateOnly(2027, 2, 10)).AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));

        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var salvo = await provider.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
            _caminhoBanco, [alvo, externa, entrada, lote, inativa], 0, Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        var sender = provider.GetRequiredService<ISender>();
        var casos = new[]
        {
            ("alvo", "desconhecido", 10_500L, "recebimento-inexistente"),
            ("alvo", "recibo-externo", 10_500L, "recebimento-de-outra-venda"),
            ("entrada", "recibo-entrada", 5_000L, "recebimento-historico-nao-editavel"),
            ("lote", "recibo-lote", 10_000L, "recebimento-historico-nao-editavel"),
            ("inativa", "inativa-recibo", 10_500L, "venda-nao-ativa")
        };

        foreach (var (vendaId, recebimentoId, valor, codigo) in casos)
        {
            var resultado = await sender.Send(new CorrigirPagamentoCommand(
                vendaId, recebimentoId, valor, new DateOnly(2027, 3, 10),
                FormaPagamento.Pix, null, Referencia, 1));
            Assert.IsTrue(resultado.IsFailed);
            Assert.AreEqual(codigo, Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(11_000L, snapshot.Conjunto.Vendas.Single(v => v.Id == "alvo").Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(11_000L, snapshot.Conjunto.Vendas.Single(v => v.Id == "inativa").Recebimentos[0].Valor.Centavos);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda CriarVendaQuitadaEComSaldo()
    {
        var venda = CriarVenda("alvo", 30_000, 3);
        venda = Registrar(venda, "recibo-a", "alvo-parcela-1", 11_000, new DateOnly(2027, 2, 10));
        return Registrar(venda, "recibo-b", "alvo-parcela-2", 10_000, new DateOnly(2027, 2, 12));
    }

    private static Venda CriarVendaComEntrada() => Sucesso(Venda.Cadastrar(
        "entrada", Cliente(), new DateOnly(2027, 1, 15), DinheiroValor(20_000), 2,
        ["entrada-parcela-1", "entrada-parcela-2"], Referencia,
        new DadosEntradaVenda("recibo-entrada", DinheiroValor(5_000), new DateOnly(2027, 1, 15), FormaPagamento.Pix)));

    private static Venda CriarVendaComLote() => Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
        "lote",
        StatusAdministrativoVenda.Ativo,
        Cliente(),
        new DateOnly(2027, 1, 15),
        DinheiroValor(20_000),
        [
            new("lote-parcela-1", 1, DinheiroValor(10_000), new DateOnly(2027, 2, 15)),
            new("lote-parcela-2", 2, DinheiroValor(10_000), new DateOnly(2027, 3, 15))
        ],
        [
            new("recibo-lote", new DateOnly(2027, 2, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                OrigemRecebimento.HistoricoLote, DinheiroValor(0), null,
                [new("lote-parcela-1", DinheiroValor(10_000))])
        ]), Referencia));

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

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
