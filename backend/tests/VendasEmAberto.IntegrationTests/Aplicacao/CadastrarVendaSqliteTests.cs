using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class CadastrarVendaSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-cadastro-{Guid.NewGuid():N}");
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
    public async Task CadastrarViaSender_ReabrirEmProviderNovoPreservaVendasClienteOrdemDatasValoresEEntrada()
    {
        string primeiraId;
        string segundaId;
        string[] primeiraParcelaIds;
        string[] segundaParcelaIds;
        using (var provider = CriarProvider())
        {
            var preparacao = provider.GetRequiredService<IPreparacaoArmazenamentoVendas>();
            Assert.IsTrue((await preparacao.PrepararAsync()).IsSuccess);
            var sender = provider.GetRequiredService<ISender>();

            var primeira = await sender.Send(new CadastrarVendaCommand(
                " Ana 🪻 da Silva ",
                "529.982.247-25",
                "(11) 98765-4321",
                null,
                new DateOnly(2027, 1, 15),
                10_001,
                3,
                Referencia,
                0));

            Assert.IsTrue(primeira.IsSuccess);
            primeiraId = primeira.Value.Resumo.Id;
            primeiraParcelaIds = primeira.Value.Parcelas.Select(p => p.Id).ToArray();
            Assert.AreEqual(1L, primeira.Value.Resumo.Revisao);
            Assert.AreEqual("Ana 🪻 da Silva", primeira.Value.Resumo.Cliente.Nome);
            Assert.AreEqual("52998224725", primeira.Value.Resumo.Cliente.Cpf);
            Assert.AreEqual("11987654321", primeira.Value.Resumo.Cliente.Telefone);
            Assert.IsNull(primeira.Value.Resumo.Cliente.Descricao);
            Assert.AreEqual(10_001L, primeira.Value.Resumo.ValorTotalBaseCentavos);
            CollectionAssert.AreEqual(new long[] { 3_334, 3_334, 3_333 }, primeira.Value.Parcelas.Select(p => p.ValorBaseCentavos).ToArray());
            CollectionAssert.AreEqual(new[]
            {
                new DateOnly(2027, 2, 15), new DateOnly(2027, 3, 15), new DateOnly(2027, 4, 15)
            }, primeira.Value.Parcelas.Select(p => p.Vencimento).ToArray());
            Assert.AreEqual(0, primeira.Value.Recebimentos.Count);

            var segunda = await sender.Send(new CadastrarVendaCommand(
                "José 🧑🏽‍🦱 Nunes",
                "52998224725",
                "11900001111",
                "Cliente de teste — Δ",
                new DateOnly(2027, 1, 20),
                20_000,
                2,
                Referencia,
                1,
                new EntradaVendaComando(10_000, FormaPagamento.Pix)));

            Assert.IsTrue(segunda.IsSuccess);
            segundaId = segunda.Value.Resumo.Id;
            segundaParcelaIds = segunda.Value.Parcelas.Select(p => p.Id).ToArray();
            Assert.AreEqual(2L, segunda.Value.Resumo.Revisao);
            Assert.AreEqual("52998224725", segunda.Value.Resumo.Cliente.Cpf);
            Assert.AreEqual("Cliente de teste — Δ", segunda.Value.Resumo.Cliente.Descricao);
            Assert.AreEqual(2, segunda.Value.Parcelas.Count);
            Assert.AreEqual(new DateOnly(2027, 1, 20), segunda.Value.Parcelas[0].Vencimento);
            Assert.AreEqual(10_000L, segunda.Value.Parcelas[0].ValorBaseCentavos);
            Assert.AreEqual(10_000L, segunda.Value.Parcelas[0].ValorRecebidoCentavos);
            Assert.AreEqual(0L, segunda.Value.Parcelas[0].SaldoCentavos);
            Assert.AreEqual(new DateOnly(2027, 2, 20), segunda.Value.Parcelas[1].Vencimento);
            Assert.AreEqual(10_000L, segunda.Value.Parcelas[1].ValorBaseCentavos);
            Assert.AreEqual(10_000L, segunda.Value.Parcelas[1].SaldoCentavos);
            Assert.AreEqual(1, segunda.Value.Recebimentos.Count);
            Assert.AreEqual(10_000L, segunda.Value.Recebimentos.Single().ValorCentavos);
            Assert.AreEqual(OrigemRecebimentoResposta.Entrada, segunda.Value.Recebimentos.Single().Origem);
            Assert.AreEqual(1, segunda.Value.Recebimentos.Single().Alocacoes.Count);
        }

        using var providerNovo = CriarProvider();
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await providerNovo.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;

        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(2, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(primeiraId, snapshot.Conjunto.Vendas[0].Id);
        Assert.AreEqual(segundaId, snapshot.Conjunto.Vendas[1].Id);
        Assert.AreEqual("Ana 🪻 da Silva", snapshot.Conjunto.Vendas[0].Cliente.Nome);
        Assert.IsNull(snapshot.Conjunto.Vendas[0].Cliente.Descricao);
        Assert.AreEqual("José 🧑🏽‍🦱 Nunes", snapshot.Conjunto.Vendas[1].Cliente.Nome);
        Assert.AreEqual("Cliente de teste — Δ", snapshot.Conjunto.Vendas[1].Cliente.Descricao);
        Assert.AreEqual(snapshot.Conjunto.Vendas[1].Parcelas[0].Id, snapshot.Conjunto.Vendas[1].Recebimentos.Single().Alocacoes.Single().ParcelaId);
        Assert.AreEqual("52998224725", snapshot.Conjunto.Vendas[0].Cliente.Cpf);
        Assert.AreEqual(snapshot.Conjunto.Vendas[0].Cliente.Cpf, snapshot.Conjunto.Vendas[1].Cliente.Cpf);
        CollectionAssert.AreEqual(
            snapshot.Conjunto.Vendas[0].Parcelas.Select(p => p.Id).ToArray(),
            primeiraParcelaIds);
        CollectionAssert.AreEqual(
            snapshot.Conjunto.Vendas[1].Parcelas.Select(p => p.Id).ToArray(),
            segundaParcelaIds);
        var segundaProjecao = Assert.IsInstanceOfType<ResultadoDominio<ProjecaoVenda>.Sucesso>(
            snapshot.Conjunto.Vendas[1].Projetar(Referencia)).Valor;
        CollectionAssert.AreEqual(
            new long[] { 10_000, 10_000 },
            segundaProjecao.Parcelas.Select(p => p.ValorBase.Centavos).ToArray());
        CollectionAssert.AreEqual(
            new long[] { 10_000, 0 },
            segundaProjecao.Parcelas.Select(p => p.ValorRecebido.Centavos).ToArray());
        CollectionAssert.AreEqual(
            new long[] { 0, 10_000 },
            segundaProjecao.Parcelas.Select(p => p.Saldo.Centavos).ToArray());
        Assert.AreEqual(10_000L, segundaProjecao.TotalRecebido.Centavos);
    }

    [TestMethod]
    public async Task CadastroSemPreparacaoRecusaBancoAusenteSemCriarArquivo()
    {
        using var provider = CriarProvider();
        var resultado = await provider.GetRequiredService<ISender>().Send(new CadastrarVendaCommand(
            "Cliente teste",
            "52998224725",
            "11987654321",
            null,
            new DateOnly(2027, 1, 15),
            100,
            1,
            Referencia,
            0));

        Assert.IsTrue(resultado.IsFailed);
        Assert.AreEqual("banco-ausente", Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single()).Codigo);
        Assert.IsFalse(File.Exists(_caminhoBanco));
    }

    [TestMethod]
    public async Task CadastroComFalhaDeValidacaoDepoisDePrepararNaoAlteraSnapshot()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var sender = provider.GetRequiredService<ISender>();
        var falha = await sender.Send(new CadastrarVendaCommand(
            " ",
            "52998224725",
            "11987654321",
            null,
            new DateOnly(2027, 1, 15),
            100,
            1,
            Referencia,
            0));

        Assert.IsTrue(falha.IsFailed);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);

        var conflito = await sender.Send(new CadastrarVendaCommand(
            "Cliente válido",
            "52998224725",
            "11987654321",
            null,
            new DateOnly(2027, 1, 15),
            100,
            1,
            Referencia,
            9));
        Assert.IsTrue(conflito.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(conflito.Errors.Single()).Codigo);
        var aposConflito = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, aposConflito.Revisao);
        Assert.AreEqual(0, aposConflito.Conjunto.Vendas.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);
}
