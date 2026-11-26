using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarResumoSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-resumo-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_ResumoReconciliaAbertasAtrasadasERecebimentosDeTodosStatus()
    {
        var vendas = CriarCenario();
        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco, vendas, 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        using var reaberto = CriarProvider();
        var resultado = await reaberto.GetRequiredService<ISender>()
            .Send(new ConsultarResumoQuery(Referencia));

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(20_000L, resultado.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(10_000L, resultado.Value.ValoresEmAtrasoCentavos);
        Assert.AreEqual(50_000L, resultado.Value.RecebidoNoMesCentavos);
        Assert.AreEqual(3, resultado.Value.QuantidadeVendasAtivas);
        Assert.AreEqual(1L, resultado.Value.Revisao);
        Assert.AreEqual(Referencia, resultado.Value.Referencia);

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(5, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(2, snapshot.Conjunto.Vendas[0].Recebimentos.Count);
        Assert.AreEqual(OrigemRecebimento.Entrada, snapshot.Conjunto.Vendas[0].Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, snapshot.Conjunto.Vendas[0].Recebimentos[1].Origem);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[0].Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(10_000L, snapshot.Conjunto.Vendas[0].Recebimentos[1].Valor.Centavos);
    }

    [TestMethod]
    public async Task ConjuntoPreparadoVazio_RetornaResumoZeradoSemAlterarRevisao()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);

        var resultado = await provider.GetRequiredService<ISender>()
            .Send(new ConsultarResumoQuery(Referencia));

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(0L, resultado.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(0L, resultado.Value.ValoresEmAtrasoCentavos);
        Assert.AreEqual(0L, resultado.Value.RecebidoNoMesCentavos);
        Assert.AreEqual(0, resultado.Value.QuantidadeVendasAtivas);
        Assert.AreEqual(0L, resultado.Value.Revisao);
        Assert.AreEqual(Referencia, resultado.Value.Referencia);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

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

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
