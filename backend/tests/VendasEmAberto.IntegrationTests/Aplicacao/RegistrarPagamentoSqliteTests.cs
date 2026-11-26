using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class RegistrarPagamentoSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-pagamento-{Guid.NewGuid():N}");
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
    public async Task RegistrarViaSender_BaixaPrimeiraPendenteMesmoFuturaEAcréscimoReabreFiel()
    {
        var vendaFutura = CriarVenda("futura", 30_000, 3);
        vendaFutura = Sucesso(vendaFutura.RegistrarPagamento(
            "recibo-historico-1", "futura-parcela-1", Sucesso(Dinheiro.Criar(10_000)),
            new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        vendaFutura = Sucesso(vendaFutura.RegistrarPagamento(
            "recibo-historico-2", "futura-parcela-2", Sucesso(Dinheiro.Criar(10_000)),
            new DateOnly(2027, 2, 2), FormaPagamento.Dinheiro, Referencia));
        var vendaAcrescimo = CriarVenda("acrescimo", 10_000, 1);

        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco, [vendaFutura, vendaAcrescimo], 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        string idPagamentoFuturo;
        string idPagamentoComAcrescimo;
        using (var provider = CriarProvider())
        {
            var sender = provider.GetRequiredService<ISender>();
            var futuro = await sender.Send(new RegistrarPagamentoCommand(
                "futura", "futura-parcela-3", 10_000,
                new DateOnly(2027, 3, 10), FormaPagamento.CartaoDebito,
                "Baixa futura ✅", Referencia, 1));
            Assert.IsTrue(futuro.IsSuccess);
            Assert.AreEqual(2L, futuro.Value.Resumo.Revisao);
            Assert.AreEqual(3, futuro.Value.Resumo.QuantidadePaga);
            Assert.AreEqual(10_000L, futuro.Value.Parcelas[2].ValorRecebidoCentavos);
            Assert.AreEqual(0L, futuro.Value.Parcelas[2].SaldoCentavos);
            Assert.AreEqual(new DateOnly(2027, 4, 15), futuro.Value.Parcelas[2].Vencimento);
            Assert.AreEqual("Baixa futura ✅", futuro.Value.Recebimentos.Last().Observacao);
            idPagamentoFuturo = futuro.Value.Recebimentos.Last().Id;

            var acrescimo = await sender.Send(new RegistrarPagamentoCommand(
                "acrescimo", "acrescimo-parcela-1", 11_000,
                new DateOnly(2027, 3, 12), FormaPagamento.Pix,
                "Acréscimo aplicado", Referencia, 2));
            Assert.IsTrue(acrescimo.IsSuccess);
            Assert.AreEqual(3L, acrescimo.Value.Resumo.Revisao);
            Assert.AreEqual(10_000L, acrescimo.Value.Parcelas.Single().ValorBaseCentavos);
            Assert.AreEqual(11_000L, acrescimo.Value.Parcelas.Single().ValorRecebidoCentavos);
            Assert.AreEqual(1_000L, acrescimo.Value.Parcelas.Single().AcrescimoCentavos);
            Assert.AreEqual(0L, acrescimo.Value.Parcelas.Single().SaldoCentavos);
            Assert.AreEqual(11_000L, acrescimo.Value.Resumo.ValorTotalEfetivoCentavos);
            Assert.AreEqual(1_000L, acrescimo.Value.Resumo.TotalAcrescimosCentavos);
            Assert.AreEqual("acrescimo-parcela-1", acrescimo.Value.Recebimentos.Single().Alocacoes.Single().ParcelaId);
            idPagamentoComAcrescimo = acrescimo.Value.Recebimentos.Single().Id;
        }

        using var reaberto = CriarProvider();
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(3L, snapshot.Revisao);
        var persistidaFutura = snapshot.Conjunto.Vendas.Single(v => v.Id == "futura");
        Assert.AreEqual(3, persistidaFutura.Recebimentos.Count);
        Assert.AreEqual(idPagamentoFuturo, persistidaFutura.Recebimentos[2].Id);
        Assert.AreEqual(OrigemRecebimento.Individual, persistidaFutura.Recebimentos[2].Origem);
        Assert.AreEqual("futura-parcela-3", persistidaFutura.Recebimentos[2].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_000L, persistidaFutura.Recebimentos[2].Valor.Centavos);
        Assert.AreEqual(30_000L, persistidaFutura.ValorTotalBase.Centavos);

        var persistidaAcrescimo = snapshot.Conjunto.Vendas.Single(v => v.Id == "acrescimo");
        Assert.AreEqual(idPagamentoComAcrescimo, persistidaAcrescimo.Recebimentos.Single().Id);
        Assert.AreEqual(1_000L, persistidaAcrescimo.Recebimentos.Single().Acrescimo.Centavos);
        var projecao = Sucesso(persistidaAcrescimo.Projetar(Referencia));
        Assert.AreEqual(10_000L, projecao.ValorTotalBase.Centavos);
        Assert.AreEqual(11_000L, projecao.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(11_000L, projecao.TotalRecebido.Centavos);
        Assert.AreEqual(0L, projecao.Saldo.Centavos);
    }

    [TestMethod]
    public async Task FalhaDeSelecaoOuVendaNaoAtivaNaoAlteraDadosPersistidos()
    {
        var aberta = CriarVenda("aberta", 30_000, 3);
        var inativa = Sucesso(CriarVenda("inativa", 10_000, 1)
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var salvo = await provider.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
            _caminhoBanco, [aberta, inativa], 0, Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        var sender = provider.GetRequiredService<ISender>();

        foreach (var comando in new[]
        {
            new RegistrarPagamentoCommand("aberta", "aberta-parcela-3", 10_000, new DateOnly(2027, 3, 10), FormaPagamento.Pix, null, Referencia, 1),
            new RegistrarPagamentoCommand("inativa", "inativa-parcela-1", 10_000, new DateOnly(2027, 3, 10), FormaPagamento.Pix, null, Referencia, 1)
        })
        {
            var resultado = await sender.Send(comando);
            Assert.IsTrue(resultado.IsFailed);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Single(v => v.Id == "aberta").Recebimentos.Count);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, snapshot.Conjunto.Vendas.Single(v => v.Id == "inativa").StatusAdministrativo);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Single(v => v.Id == "inativa").Recebimentos.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda CriarVenda(string id, long valor, int quantidade) => Sucesso(Venda.Cadastrar(
        id,
        Sucesso(DadosClienteVenda.Criar("Cliente", "52998224725", "11987654321", null)),
        new DateOnly(2027, 1, 15),
        Sucesso(Dinheiro.Criar(valor)),
        quantidade,
        Enumerable.Range(1, quantidade).Select(i => $"{id}-parcela-{i}").ToArray(),
        Referencia));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
