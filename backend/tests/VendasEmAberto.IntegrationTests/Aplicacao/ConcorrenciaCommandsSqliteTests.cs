using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConcorrenciaCommandsSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-concorrencia-{Guid.NewGuid():N}");
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
    public async Task Commands_RejeitamRevisaoNegativaEObsoletaAposAlteracaoDeOutraVenda()
    {
        using var provider = CriarProvider(_caminhoBanco);
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var armazenamento = provider.GetRequiredService<IArmazenamentoVendas>();
        var target = VendaComPagamentoInicial();
        var other = CriarVenda("outra", 10_000, 1);
        var untouched = CriarVenda("inalterada", 10_000, 1);
        var salva = await armazenamento.SalvarAsync(_caminhoBanco, [target, other, untouched], 0, Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salva).Valor);

        var sender = provider.GetRequiredService<ISender>();
        var negativas = new MediatR.IRequest<FluentResults.Result<VendasEmAberto.Aplicacao.Contratos.VendaDetalheResposta>>[]
        {
            new CadastrarVendaCommand("Novo cliente", "52998224725", "11987654321", null,
                new DateOnly(2027, 3, 10), 10_000, 1, Referencia, -1),
            new EditarClienteVendaCommand("target", "Novo nome", "52998224725", "11987654321", null, Referencia, -1),
            new AlterarStatusVendaCommand("target", StatusAdministrativoVenda.Inativo, Referencia, -1),
            new RegistrarPagamentoCommand("target", "target-parcela-2", 10_000,
                new DateOnly(2027, 3, 20), FormaPagamento.Pix, null, Referencia, -1),
            new CorrigirPagamentoCommand("target", "target-recebimento", 10_000,
                new DateOnly(2027, 3, 20), FormaPagamento.Pix, null, Referencia, -1)
        };

        foreach (var comando in negativas)
        {
            var resultado = await sender.Send(comando);
            Assert.IsTrue(resultado.IsFailed);
            var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
            Assert.AreEqual("revisao-invalida", erro.Codigo);
            Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
        }

        string? descricao = null;
        var revisao = 1L;
        var comandosObsoletos = new Func<long, MediatR.IRequest<FluentResults.Result<VendasEmAberto.Aplicacao.Contratos.VendaDetalheResposta>>>[]
        {
            esperada => new CadastrarVendaCommand("Nova", "52998224725", "11987654321", null,
                new DateOnly(2027, 3, 10), 10_000, 1, Referencia, esperada),
            esperada => new EditarClienteVendaCommand("target", "Nome alterado", "52998224725", "11987654321", null, Referencia, esperada),
            esperada => new AlterarStatusVendaCommand("target", StatusAdministrativoVenda.Inativo, Referencia, esperada),
            esperada => new RegistrarPagamentoCommand("target", "target-parcela-2", 10_000,
                new DateOnly(2027, 3, 20), FormaPagamento.Pix, null, Referencia, esperada),
            esperada => new CorrigirPagamentoCommand("target", "target-recebimento", 10_000,
                new DateOnly(2027, 3, 20), FormaPagamento.Pix, null, Referencia, esperada)
        };

        foreach (var criarComando in comandosObsoletos)
        {
            descricao = descricao is null ? "atualização independente 1" : $"atualização independente {revisao + 1}";
            var atualizacaoAlheia = await sender.Send(new EditarClienteVendaCommand(
                "outra", "Cliente outra", "52998224725", "11987654321", descricao, Referencia, revisao));
            Assert.IsTrue(atualizacaoAlheia.IsSuccess);
            revisao++;

            var obsoleto = await sender.Send(criarComando(revisao - 1));
            Assert.IsTrue(obsoleto.IsFailed);
            var erro = Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single());
            Assert.AreEqual("conflito-revisao", erro.Codigo);
            Assert.AreEqual(CategoriaErroAplicacao.Conflito, erro.Categoria);
        }

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await armazenamento.CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(6L, snapshot.Revisao);
        Assert.AreEqual(3, snapshot.Conjunto.Vendas.Count);
        var persistida = snapshot.Conjunto.Vendas.Single(venda => venda.Id == "target");
        Assert.AreEqual("Cliente target", persistida.Cliente.Nome);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, persistida.StatusAdministrativo);
        Assert.AreEqual(1, persistida.Recebimentos.Count);
        Assert.AreEqual("target-recebimento", persistida.Recebimentos[0].Id);
        Assert.AreEqual("target-parcela-1", persistida.Recebimentos[0].Alocacoes.Single().ParcelaId);
        Assert.IsFalse(snapshot.Conjunto.Vendas.Any(venda => venda.Cliente.Nome == "Nova"));
        Assert.AreEqual(descricao, snapshot.Conjunto.Vendas.Single(venda => venda.Id == "outra").Cliente.Descricao);
        Assert.AreEqual("Cliente inalterada", snapshot.Conjunto.Vendas[2].Cliente.Nome);
    }

    [TestMethod]
    public async Task DoisHandlersAposCargaSimultanea_ConfirmamUmCommitSemRetryEReabremConjuntoCompletoDoVencedor()
    {
        using (var inicial = CriarProvider(_caminhoBanco))
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salva = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco,
                [CriarVenda("corrente-a", 10_000, 1), CriarVenda("corrente-b", 10_000, 1), CriarVenda("inalterada", 10_000, 1)],
                0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salva).Valor);
        }

        var barreira = new BarreiraDeCarga(2);
        using var consumidorA = CriarProviderComBarreira(_caminhoBanco, barreira);
        using var consumidorB = CriarProviderComBarreira(_caminhoBanco, barreira);
        var envioA = consumidorA.GetRequiredService<ISender>().Send(new EditarClienteVendaCommand(
            "corrente-a", "Vencedor A", "52998224725", "11987654321", null, Referencia, 1));
        var envioB = consumidorB.GetRequiredService<ISender>().Send(new EditarClienteVendaCommand(
            "corrente-b", "Vencedor B", "52998224725", "11987654321", null, Referencia, 1));
        var resultados = await Task.WhenAll(envioA, envioB);

        Assert.AreEqual(2, barreira.Carregamentos);
        Assert.AreEqual(1, resultados.Count(resultado => resultado.IsSuccess));
        Assert.AreEqual(1, resultados.Count(resultado => resultado.IsFailed));
        var conflito = resultados.Single(resultado => resultado.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(conflito.Errors.Single()).Codigo);
        Assert.AreEqual(1, consumidorA.GetRequiredService<ArmazenamentoComBarreira>().Salvamentos);
        Assert.AreEqual(1, consumidorB.GetRequiredService<ArmazenamentoComBarreira>().Salvamentos);

        var respostaVencedora = resultados.Single(resultado => resultado.IsSuccess).Value;
        Assert.AreEqual(2L, respostaVencedora.Resumo.Revisao);
        var nomeVencedor = respostaVencedora.Resumo.Cliente.Nome;
        var nomePerdedor = nomeVencedor == "Vencedor A" ? "Vencedor B" : "Vencedor A";

        using var reaberto = CriarProvider(_caminhoBanco);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(3, snapshot.Conjunto.Vendas.Count);
        Assert.AreEqual(
            nomeVencedor == "Vencedor A" ? "Vencedor A" : "Cliente corrente-a",
            snapshot.Conjunto.Vendas.Single(venda => venda.Id == "corrente-a").Cliente.Nome);
        Assert.AreEqual(
            nomeVencedor == "Vencedor B" ? "Vencedor B" : "Cliente corrente-b",
            snapshot.Conjunto.Vendas.Single(venda => venda.Id == "corrente-b").Cliente.Nome);
        Assert.AreEqual("Cliente inalterada", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "inalterada").Cliente.Nome);
        Assert.IsFalse(snapshot.Conjunto.Vendas.Any(venda => venda.Cliente.Nome == nomePerdedor));
    }

    private ServiceProvider CriarProvider(string caminho) => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(caminho)
        .BuildServiceProvider(validateScopes: true);

    private static ServiceProvider CriarProviderComBarreira(string caminho, BarreiraDeCarga barreira)
    {
        var services = new ServiceCollection()
            .AdicionarAplicacao()
            .AdicionarPersistenciaSqlite(caminho);
        services.AddSingleton(new ArmazenamentoComBarreira(new ArmazenamentoVendasSqlite(), barreira));
        services.AddSingleton<IArmazenamentoVendas>(provider => provider.GetRequiredService<ArmazenamentoComBarreira>());
        return services.BuildServiceProvider(validateScopes: true);
    }

    private Venda VendaComPagamentoInicial()
    {
        var venda = CriarVenda("target", 20_000, 2);
        return Sucesso(venda.RegistrarPagamento(
            "target-recebimento", "target-parcela-1", DinheiroValor(10_000),
            new DateOnly(2027, 2, 10), FormaPagamento.Pix, Referencia));
    }

    private static Venda CriarVenda(string id, long valor, int quantidade) => Sucesso(Venda.Cadastrar(
        id,
        Cliente($"{id}"),
        new DateOnly(2027, 1, 15),
        DinheiroValor(valor),
        quantidade,
        Enumerable.Range(1, quantidade).Select(numero => $"{id}-parcela-{numero}").ToArray(),
        Referencia));

    private static DadosClienteVenda Cliente(string nome) =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class BarreiraDeCarga(int participantes)
    {
        private readonly TaskCompletionSource _liberacao = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _carregamentos;

        public int Carregamentos => Volatile.Read(ref _carregamentos);

        public async Task AguardarAsync(CancellationToken cancellationToken)
        {
            if (Interlocked.Increment(ref _carregamentos) == participantes)
            {
                _liberacao.TrySetResult();
            }

            await _liberacao.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
        }
    }

    private sealed class ArmazenamentoComBarreira(
        IArmazenamentoVendas interno,
        BarreiraDeCarga barreira) : IArmazenamentoVendas
    {
        public int Salvamentos { get; private set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default) =>
            interno.InicializarAsync(caminhoAbsoluto, cancellationToken);

        public async Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            var resultado = await interno.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);
            if (resultado is ResultadoArmazenamento<SnapshotVendas>.Sucesso)
            {
                await barreira.AguardarAsync(cancellationToken);
            }

            return resultado;
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            return interno.SalvarAsync(caminhoAbsoluto, candidatoCompleto, revisaoEsperada, referencia, cancellationToken);
        }
    }
}
