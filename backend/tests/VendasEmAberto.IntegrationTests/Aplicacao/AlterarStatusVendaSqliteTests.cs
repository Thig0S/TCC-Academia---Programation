using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class AlterarStatusVendaSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-status-{Guid.NewGuid():N}");
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
    public async Task AlterarStatusViaSender_AplicaMatrizNoOpEConflitoSemPerderHistorico()
    {
        var iniciais = new[]
        {
            CriarVenda("ativa-aberta", StatusAdministrativoVenda.Ativo, paga: false),
            CriarVenda("ativa-quitada", StatusAdministrativoVenda.Ativo, paga: true),
            CriarVenda("inativa-ativa", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("inativa-rejeicao", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("prejuizo-ativo", StatusAdministrativoVenda.Prejuizo, paga: false),
            CriarVenda("prejuizo-rejeicao", StatusAdministrativoVenda.Prejuizo, paga: false)
        };

        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco, iniciais, 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        using (var provider = CriarProvider())
        {
            var sender = provider.GetRequiredService<ISender>();
            var primeiro = await sender.Send(Comando("ativa-aberta", StatusAdministrativoVenda.Prejuizo, 1));
            Assert.IsTrue(primeiro.IsSuccess);
            Assert.AreEqual(StatusAdministrativoResposta.Prejuizo, primeiro.Value.Resumo.StatusAdministrativo);
            Assert.AreEqual(2L, primeiro.Value.Resumo.Revisao);

            var retornoInativa = await sender.Send(Comando("inativa-ativa", StatusAdministrativoVenda.Ativo, 2));
            Assert.IsTrue(retornoInativa.IsSuccess);
            Assert.AreEqual(StatusAdministrativoResposta.Ativo, retornoInativa.Value.Resumo.StatusAdministrativo);
            Assert.AreEqual(3L, retornoInativa.Value.Resumo.Revisao);

            var retornoPrejuizo = await sender.Send(Comando("prejuizo-ativo", StatusAdministrativoVenda.Ativo, 3));
            Assert.IsTrue(retornoPrejuizo.IsSuccess);
            Assert.AreEqual(StatusAdministrativoResposta.Ativo, retornoPrejuizo.Value.Resumo.StatusAdministrativo);
            Assert.AreEqual(4L, retornoPrejuizo.Value.Resumo.Revisao);

            foreach (var (id, status) in new[]
            {
                ("ativa-quitada", StatusAdministrativoVenda.Prejuizo),
                ("inativa-rejeicao", StatusAdministrativoVenda.Prejuizo),
                ("prejuizo-rejeicao", StatusAdministrativoVenda.Inativo)
            })
            {
                var rejeitada = await sender.Send(Comando(id, status, 4));
                Assert.IsTrue(rejeitada.IsFailed, id);
                Assert.AreEqual("transicao-nao-permitida", Assert.IsInstanceOfType<ErroAplicacao>(rejeitada.Errors.Single()).Codigo);
            }

            var noOp = await sender.Send(Comando("ativa-aberta", StatusAdministrativoVenda.Prejuizo, 4));
            Assert.IsTrue(noOp.IsSuccess);
            Assert.AreEqual(4L, noOp.Value.Resumo.Revisao);

            var obsoleto = await sender.Send(Comando("ativa-aberta", StatusAdministrativoVenda.Prejuizo, 3));
            Assert.IsTrue(obsoleto.IsFailed);
            Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single()).Codigo);
        }

        using var reaberto = CriarProvider();
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(4L, snapshot.Revisao);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, snapshot.Conjunto.Vendas.Single(v => v.Id == "ativa-aberta").StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, snapshot.Conjunto.Vendas.Single(v => v.Id == "inativa-ativa").StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, snapshot.Conjunto.Vendas.Single(v => v.Id == "prejuizo-ativo").StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, snapshot.Conjunto.Vendas.Single(v => v.Id == "ativa-quitada").StatusAdministrativo);
        foreach (var original in iniciais)
        {
            var reaberta = snapshot.Conjunto.Vendas.Single(v => v.Id == original.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(p => p.Id).ToArray(), reaberta.Parcelas.Select(p => p.Id).ToArray());
            CollectionAssert.AreEqual(original.Recebimentos.Select(r => r.Id).ToArray(), reaberta.Recebimentos.Select(r => r.Id).ToArray());
            CollectionAssert.AreEqual(original.Recebimentos.SelectMany(r => r.Alocacoes).Select(a => a.ParcelaId).ToArray(),
                reaberta.Recebimentos.SelectMany(r => r.Alocacoes).Select(a => a.ParcelaId).ToArray());
        }
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static AlterarStatusVendaCommand Comando(string id, StatusAdministrativoVenda status, long revisao) =>
        new(id, status, Referencia, revisao);

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar("Cliente", "52998224725", "11987654321", null)),
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
