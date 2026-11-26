using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class EditarClienteVendaSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-edicao-{Guid.NewGuid():N}");
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
    public async Task EditarViaSender_PreservaContratoHistoricoStatusEOutrasVendasAposReabertura()
    {
        var iniciais = new[]
        {
            CriarVenda("ativa-aberta", StatusAdministrativoVenda.Ativo, "52998224725", paga: false),
            CriarVenda("ativa-quitada", StatusAdministrativoVenda.Ativo, "52998224725", paga: true),
            CriarVenda("inativa", StatusAdministrativoVenda.Inativo, "52998224725", paga: false),
            CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, "52998224725", paga: false),
            CriarVenda("cpf-destino", StatusAdministrativoVenda.Ativo, "11144477735", paga: false)
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
            var alvos = new[] { "ativa-aberta", "ativa-quitada", "inativa", "prejuizo" };
            long revisao = 1;
            foreach (var id in alvos)
            {
                var cpf = id == "ativa-aberta" ? "111.444.777-35" : "529.982.247-25";
                var resposta = await sender.Send(new EditarClienteVendaCommand(
                    id,
                    $" Cliente atualizado {id} ",
                    cpf,
                    "(11) 90000-1111",
                    " descrição Unicode — 🧾 ",
                    Referencia,
                    revisao));

                Assert.IsTrue(resposta.IsSuccess, id);
                revisao++;
                Assert.AreEqual(revisao, resposta.Value.Resumo.Revisao);
                Assert.AreEqual($"Cliente atualizado {id}", resposta.Value.Resumo.Cliente.Nome);
                Assert.AreEqual("11900001111", resposta.Value.Resumo.Cliente.Telefone);
                Assert.AreEqual("descrição Unicode — 🧾", resposta.Value.Resumo.Cliente.Descricao);
            }
        }

        using var reaberto = CriarProvider();
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(5L, snapshot.Revisao);
        Assert.AreEqual(5, snapshot.Conjunto.Vendas.Count);
        CollectionAssert.AreEqual(iniciais.Select(v => v.Id).ToArray(), snapshot.Conjunto.Vendas.Select(v => v.Id).ToArray());

        foreach (var venda in snapshot.Conjunto.Vendas)
        {
            var original = iniciais.Single(v => v.Id == venda.Id);
            Assert.AreEqual(original.StatusAdministrativo, venda.StatusAdministrativo);
            Assert.AreEqual(original.DataVenda, venda.DataVenda);
            Assert.AreEqual(original.ValorTotalBase, venda.ValorTotalBase);
            CollectionAssert.AreEqual(original.Parcelas.Select(p => p.Id).ToArray(), venda.Parcelas.Select(p => p.Id).ToArray());
            CollectionAssert.AreEqual(original.Parcelas.Select(p => p.ValorBase.Centavos).ToArray(), venda.Parcelas.Select(p => p.ValorBase.Centavos).ToArray());
            CollectionAssert.AreEqual(original.Recebimentos.Select(r => r.Id).ToArray(), venda.Recebimentos.Select(r => r.Id).ToArray());
            if (venda.Id == "cpf-destino")
            {
                Assert.AreEqual("Cliente", venda.Cliente.Nome);
                Assert.AreEqual("11144477735", venda.Cliente.Cpf);
            }
        }

        Assert.AreEqual("11144477735", snapshot.Conjunto.Vendas[0].Cliente.Cpf);
        Assert.AreEqual("11144477735", snapshot.Conjunto.Vendas[4].Cliente.Cpf);
        Assert.AreEqual("Cliente atualizado ativa-quitada", snapshot.Conjunto.Vendas[1].Cliente.Nome);
    }

    [TestMethod]
    public async Task ClienteNormalizadoIgualNaoAvancaRevisaoERevisaoObsoletaAindaConflita()
    {
        var venda = CriarVenda("sem-mudanca", StatusAdministrativoVenda.Ativo, "52998224725", paga: false);
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        Assert.IsTrue((await provider.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
            _caminhoBanco, [venda], 0, Referencia)) is ResultadoArmazenamento<long>.Sucesso);
        var sender = provider.GetRequiredService<ISender>();
        var noOp = new EditarClienteVendaCommand(
            venda.Id, " Cliente ", "529.982.247-25", "(11) 98765-4321", "   ", Referencia, 1);

        var resultadoNoOp = await sender.Send(noOp);
        Assert.IsTrue(resultadoNoOp.IsSuccess);
        Assert.AreEqual(1L, resultadoNoOp.Value.Resumo.Revisao);

        var conflito = await sender.Send(noOp with { RevisaoEsperada = 0 });
        Assert.IsTrue(conflito.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(conflito.Errors.Single()).Codigo);

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual("Cliente", snapshot.Conjunto.Vendas.Single().Cliente.Nome);
        Assert.IsNull(snapshot.Conjunto.Vendas.Single().Cliente.Descricao);

        var invalido = await sender.Send(noOp with { Nome = " ", RevisaoEsperada = 1 });
        Assert.IsTrue(invalido.IsFailed);
        var aposFalha = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, aposFalha.Revisao);
        Assert.AreEqual("Cliente", aposFalha.Conjunto.Vendas.Single().Cliente.Nome);

        var ausente = await sender.Send(noOp with { VendaId = "ausente", RevisaoEsperada = 1 });
        Assert.IsTrue(ausente.IsFailed);
        Assert.AreEqual("venda-inexistente", Assert.IsInstanceOfType<ErroAplicacao>(ausente.Errors.Single()).Codigo);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, string cpf, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar("Cliente", cpf, "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento",
                $"{id}-parcela",
                Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1),
                FormaPagamento.Pix,
                Referencia));
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
