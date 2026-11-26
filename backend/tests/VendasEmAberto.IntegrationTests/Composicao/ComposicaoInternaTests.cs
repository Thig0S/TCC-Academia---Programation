using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Composicao;

[TestClass]
public sealed class ComposicaoInternaTests
{
    private string _diretorioTemporario = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-composicao-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
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
    public async Task ComporEConsultarDestinoAusente_NaoCriaArquivoEExplicitaBancoAusente()
    {
        var caminho = Path.Combine(_diretorioTemporario, "ausente.db");
        using var provider = CriarProvider(caminho);

        var sender = provider.GetRequiredService<ISender>();
        var armazenamento = provider.GetRequiredService<IArmazenamentoVendas>();
        var resultado = await armazenamento.CarregarAsync(caminho, new DateOnly(2027, 1, 1));

        Assert.IsNotNull(sender);
        Assert.IsFalse(File.Exists(caminho));
        Assert.AreEqual(
            CodigosErroArmazenamento.BancoAusente,
            Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Falha>(resultado).Erro.Codigo);
        Assert.IsFalse(File.Exists(caminho));
    }

    [TestMethod]
    public async Task PrepararRepetidamente_PreservaRevisaoEVendaEUsaSomenteServicoExplicito()
    {
        var caminho = Path.Combine(_diretorioTemporario, "preparado.db");
        using var provider = CriarProvider(caminho);
        var preparacao = provider.GetRequiredService<IPreparacaoArmazenamentoVendas>();
        var armazenamento = provider.GetRequiredService<IArmazenamentoVendas>();
        var referencia = new DateOnly(2027, 2, 1);

        Assert.IsTrue((await preparacao.PrepararAsync()).IsSuccess);
        var carregado = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(caminho, referencia)).Valor;
        Assert.AreEqual(0L, carregado.Revisao);
        Assert.AreEqual(0, carregado.Conjunto.Vendas.Count);

        var cliente = Sucesso(DadosClienteVenda.Criar("Cliente Sintético", "52998224725", "11987654321", null));
        var dinheiro = Sucesso(Dinheiro.Criar(10_000));
        var venda = Sucesso(Venda.Cadastrar(
            "venda-composicao",
            cliente,
            new DateOnly(2027, 1, 1),
            dinheiro,
            1,
            ["parcela-composicao"],
            referencia));
        var conjunto = Sucesso(ConjuntoVendas.Criar([venda]));
        var salvo = Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(
            await armazenamento.SalvarAsync(caminho, conjunto.Vendas, 0, referencia));
        Assert.AreEqual(1L, salvo.Valor);

        Assert.IsTrue((await preparacao.PrepararAsync()).IsSuccess);
        var reaberto = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(caminho, referencia)).Valor;

        Assert.AreEqual(1L, reaberto.Revisao);
        Assert.AreEqual("venda-composicao", reaberto.Conjunto.Vendas.Single().Id);
    }

    [TestMethod]
    public void ProvidersIndependentes_ResolvemLifetimesSemCompartilharDestinoOuEstado()
    {
        var primeiroCaminho = Path.Combine(_diretorioTemporario, "primeiro.db");
        var segundoCaminho = Path.Combine(_diretorioTemporario, "segundo.db");
        using var primeiro = CriarProvider(primeiroCaminho);
        using var segundo = CriarProvider(segundoCaminho);

        var destinoPrimeiro = primeiro.GetRequiredService<DestinoArmazenamentoVendas>();
        var destinoSegundo = segundo.GetRequiredService<DestinoArmazenamentoVendas>();
        var geradorPrimeiro = primeiro.GetRequiredService<IGeradorIdentificadores>();
        var geradorSegundo = segundo.GetRequiredService<IGeradorIdentificadores>();
        var armazenamentoPrimeiro = primeiro.GetRequiredService<IArmazenamentoVendas>();
        var armazenamentoSegundo = segundo.GetRequiredService<IArmazenamentoVendas>();
        var preparacaoPrimeira = primeiro.GetRequiredService<IPreparacaoArmazenamentoVendas>();

        Assert.AreSame(destinoPrimeiro, primeiro.GetRequiredService<DestinoArmazenamentoVendas>());
        Assert.AreSame(geradorPrimeiro, primeiro.GetRequiredService<IGeradorIdentificadores>());
        Assert.AreNotSame(armazenamentoPrimeiro, primeiro.GetRequiredService<IArmazenamentoVendas>());
        Assert.AreNotSame(preparacaoPrimeira, primeiro.GetRequiredService<IPreparacaoArmazenamentoVendas>());
        Assert.AreNotSame(destinoPrimeiro, destinoSegundo);
        Assert.AreNotSame(geradorPrimeiro, geradorSegundo);
        Assert.AreNotSame(armazenamentoPrimeiro, armazenamentoSegundo);
        Assert.AreEqual(primeiroCaminho, destinoPrimeiro.CaminhoAbsoluto);
        Assert.AreEqual(segundoCaminho, destinoSegundo.CaminhoAbsoluto);
        Assert.IsTrue(Guid.TryParseExact(geradorPrimeiro.Gerar(), "N", out _));
        Assert.IsFalse(File.Exists(primeiroCaminho));
        Assert.IsFalse(File.Exists(segundoCaminho));
    }

    private static ServiceProvider CriarProvider(string caminho) => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(caminho)
        .BuildServiceProvider(validateScopes: true);

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
