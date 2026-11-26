using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarColecaoVendasSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-colecao-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_SeparaStatusMisturadosCompletoNaOrdemDoSnapshotSemGravar()
    {
        var vendas = new[]
        {
            CriarVenda("aberta-primeira", StatusAdministrativoVenda.Ativo, paga: false),
            CriarVenda("inativa", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("quitada", StatusAdministrativoVenda.Ativo, paga: true),
            CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, paga: false),
            CriarVenda("aberta-segunda", StatusAdministrativoVenda.Ativo, paga: false)
        };

        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco, vendas, 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        using var reaberto = CriarProvider();
        var sender = reaberto.GetRequiredService<ISender>();
        var esperados = new Dictionary<ColecaoVendas, string[]>
        {
            [ColecaoVendas.Abertas] = ["aberta-primeira", "aberta-segunda"],
            [ColecaoVendas.Quitadas] = ["quitada"],
            [ColecaoVendas.Inativas] = ["inativa"],
            [ColecaoVendas.Prejuizo] = ["prejuizo"]
        };

        foreach (var (colecao, ids) in esperados)
        {
            var resultado = await sender.Send(new ConsultarColecaoVendasQuery(colecao, Referencia));
            Assert.IsTrue(resultado.IsSuccess);
            Assert.AreEqual(colecao, resultado.Value.Colecao);
            Assert.AreEqual(1L, resultado.Value.Revisao);
            Assert.AreEqual(Referencia, resultado.Value.Referencia);
            CollectionAssert.AreEqual(ids, resultado.Value.Vendas.Select(v => v.Id).ToArray());
            foreach (var resumo in resultado.Value.Vendas)
            {
                var raiz = vendas.Single(venda => venda.Id == resumo.Id);
                Assert.AreEqual(raiz.Cliente.Nome, resumo.Cliente.Nome);
                Assert.AreEqual(raiz.Cliente.Cpf, resumo.Cliente.Cpf);
                Assert.AreEqual(raiz.Cliente.Telefone, resumo.Cliente.Telefone);
                Assert.AreEqual(raiz.Cliente.Descricao, resumo.Cliente.Descricao);
                Assert.AreEqual(raiz.DataVenda, resumo.DataVenda);
                Assert.AreEqual(1L, resumo.Revisao);
                Assert.AreEqual(Referencia, resumo.Referencia);
                Assert.AreEqual(raiz.StatusAdministrativo.ToString(), resumo.StatusAdministrativo.ToString());
            }
        }

        var respostaProtegida = await sender.Send(new ConsultarColecaoVendasQuery(ColecaoVendas.Abertas, Referencia));
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<VendasEmAberto.Aplicacao.Contratos.VendaResumoResposta>)respostaProtegida.Value.Vendas).Clear());

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(5, snapshot.Conjunto.Vendas.Count);
    }

    [TestMethod]
    public async Task ColecoesDeSnapshotVazioSaoSucessoEEnumDesconhecidoEValidacao()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var sender = provider.GetRequiredService<ISender>();

        var vazia = await sender.Send(new ConsultarColecaoVendasQuery(ColecaoVendas.Abertas, Referencia));
        Assert.IsTrue(vazia.IsSuccess);
        Assert.AreEqual(0, vazia.Value.Vendas.Count);
        Assert.AreEqual(0L, vazia.Value.Revisao);

        var enumInvalido = await sender.Send(new ConsultarColecaoVendasQuery((ColecaoVendas)99, Referencia));
        Assert.IsTrue(enumInvalido.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(enumInvalido.Errors.Single());
        Assert.AreEqual("colecao-invalida", erro.Codigo);
        Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
        Assert.AreEqual("colecao", erro.Campo);

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar($"Cliente {id} 🪻", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento", $"{id}-parcela", Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
