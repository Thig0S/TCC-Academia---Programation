using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarPeriodoSqliteTests
{
    private static readonly DateOnly Inicio = new(2027, 3, 1);
    private static readonly DateOnly Fim = new(2027, 3, 31);
    private static readonly DateOnly Referencia = new(2027, 4, 2);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-periodo-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_PeriodoInclusivoFiltraSomenteVendasAtivasMasSomaRecebimentosDeTodosStatus()
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
        var sender = reaberto.GetRequiredService<ISender>();
        var resultado = await sender.Send(new ConsultarPeriodoQuery(Inicio, Fim, Referencia));

        Assert.IsTrue(resultado.IsSuccess);
        var periodo = resultado.Value;
        Assert.AreEqual(Inicio, periodo.Inicio);
        Assert.AreEqual(Fim, periodo.Fim);
        Assert.AreEqual(38_000L, periodo.RecebidosCentavos);
        Assert.AreEqual(1L, periodo.Revisao);
        Assert.AreEqual(Referencia, periodo.Referencia);
        CollectionAssert.AreEqual(
            new[] { "ativa-aberta-no-periodo", "ativa-borda-inicial", "ativa-borda-final" },
            periodo.Vendas.Select(venda => venda.Id).ToArray());
        Assert.AreEqual("Cliente ativa-aberta-no-periodo", periodo.Vendas[0].Cliente.Nome);
        Assert.AreEqual(StatusAdministrativoResposta.Ativo, periodo.Vendas[0].StatusAdministrativo);
        Assert.AreEqual(SituacaoVendaResposta.EmAberto, periodo.Vendas[0].Situacao);
        Assert.AreEqual(10_000L, periodo.Vendas[0].SaldoCentavos);
        Assert.AreEqual(1L, periodo.Vendas[0].Revisao);
        Assert.AreEqual(Referencia, periodo.Vendas[0].Referencia);
        Assert.AreEqual(Inicio, periodo.Vendas[1].DataVenda);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, periodo.Vendas[1].Situacao);
        Assert.AreEqual(Fim, periodo.Vendas[2].DataVenda);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, periodo.Vendas[2].Situacao);
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<VendasEmAberto.Aplicacao.Contratos.VendaResumoResposta>)periodo.Vendas).Clear());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(6, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual("ativa-fora-do-periodo", snapshot.Conjunto.Vendas[3].Id);
        Assert.AreEqual("inativa-no-periodo", snapshot.Conjunto.Vendas[4].Id);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, snapshot.Conjunto.Vendas[4].StatusAdministrativo);
        Assert.AreEqual("prejuizo-fora-do-periodo", snapshot.Conjunto.Vendas[5].Id);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, snapshot.Conjunto.Vendas[5].StatusAdministrativo);
    }

    [TestMethod]
    public async Task ColecaoVaziaRetornaZeroEIntervaloInvertidoFalhaSemAlterarRevisao()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var sender = provider.GetRequiredService<ISender>();

        var vazia = await sender.Send(new ConsultarPeriodoQuery(Inicio, Fim, Referencia));
        Assert.IsTrue(vazia.IsSuccess);
        Assert.AreEqual(Inicio, vazia.Value.Inicio);
        Assert.AreEqual(Fim, vazia.Value.Fim);
        Assert.AreEqual(0L, vazia.Value.RecebidosCentavos);
        Assert.AreEqual(0L, vazia.Value.Revisao);
        Assert.AreEqual(Referencia, vazia.Value.Referencia);
        Assert.AreEqual(0, vazia.Value.Vendas.Count);

        var invertida = await sender.Send(new ConsultarPeriodoQuery(Fim, Inicio, Referencia));
        Assert.IsTrue(invertida.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(invertida.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
        Assert.AreEqual("periodo-invalido", erro.Codigo);
        Assert.AreEqual("periodo", erro.Campo);

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
        var aberta = CriarVenda("ativa-aberta-no-periodo", 10_000, new DateOnly(2027, 3, 15));
        var bordaInicial = Registrar(CriarVenda("ativa-borda-inicial", 10_000, Inicio), "recebimento-borda-inicial", 10_000, Inicio);
        var bordaFinal = Registrar(CriarVenda("ativa-borda-final", 10_000, Fim), "recebimento-borda-final", 10_000, Fim);
        var externa = Registrar(CriarVenda("ativa-fora-do-periodo", 5_000, new DateOnly(2027, 2, 28)),
            "recebimento-fora-no-periodo", 5_000, new DateOnly(2027, 3, 15));
        var inativa = Sucesso(Registrar(CriarVenda("inativa-no-periodo", 6_000, new DateOnly(2027, 3, 10)),
            "recebimento-inativo-na-borda", 6_000, Fim).AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoBase = Sucesso(Venda.Cadastrar(
            "prejuizo-fora-do-periodo",
            Cliente("prejuizo-fora-do-periodo"),
            new DateOnly(2027, 2, 20),
            DinheiroValor(14_000),
            2,
            ["prejuizo-parcela-1", "prejuizo-parcela-2"],
            Referencia));
        var prejuizo = Sucesso(Registrar(prejuizoBase, "recebimento-prejuizo-na-borda", 7_000, Inicio)
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [aberta, bordaInicial, bordaFinal, externa, inativa, prejuizo];
    }

    private static Venda CriarVenda(string id, long valor, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id, Cliente(id), dataVenda, DinheiroValor(valor), 1, [$"{id}-parcela"], Referencia));

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Venda Registrar(Venda venda, string recebimentoId, long valor, DateOnly data) => Sucesso(venda.RegistrarPagamento(
        recebimentoId, venda.Parcelas[0].Id, DinheiroValor(valor), data, FormaPagamento.Pix, Referencia));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
