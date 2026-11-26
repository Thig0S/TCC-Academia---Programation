using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarVendaSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-consulta-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_AposReaberturaMapeiaHistoricoCompletoSemAlterarRevisao()
    {
        var venda = CriarVendaComHistorico();
        using (var providerInicial = CriarProvider())
        {
            Assert.IsTrue((await providerInicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await providerInicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
                _caminhoBanco,
                [venda],
                0,
                Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        using var providerReaberto = CriarProvider();
        var sender = providerReaberto.GetRequiredService<ISender>();
        var resposta = await sender.Send(new ConsultarVendaQuery("venda-consulta", Referencia));

        Assert.IsTrue(resposta.IsSuccess);
        var detalhe = resposta.Value;
        Assert.AreEqual(1L, detalhe.Resumo.Revisao);
        Assert.AreEqual(Referencia, detalhe.Resumo.Referencia);
        Assert.AreEqual("Raquel 🧑🏽‍🚀 Duarte", detalhe.Resumo.Cliente.Nome);
        Assert.AreEqual("52998224725", detalhe.Resumo.Cliente.Cpf);
        Assert.AreEqual("11987654321", detalhe.Resumo.Cliente.Telefone);
        Assert.IsNull(detalhe.Resumo.Cliente.Descricao);
        Assert.AreEqual(new DateOnly(2027, 1, 15), detalhe.Resumo.DataVenda);
        Assert.AreEqual(StatusAdministrativoResposta.Ativo, detalhe.Resumo.StatusAdministrativo);
        Assert.AreEqual(40_000L, detalhe.Resumo.ValorTotalBaseCentavos);
        Assert.AreEqual(1_000L, detalhe.Resumo.TotalAcrescimosCentavos);
        Assert.AreEqual(41_000L, detalhe.Resumo.ValorTotalEfetivoCentavos);
        Assert.AreEqual(41_000L, detalhe.Resumo.TotalRecebidoCentavos);
        Assert.AreEqual(0L, detalhe.Resumo.SaldoCentavos);

        CollectionAssert.AreEqual(new[] { "parcela-1", "parcela-2", "parcela-3", "parcela-4" },
            detalhe.Parcelas.Select(p => p.Id).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            new DateOnly(2027, 1, 15), new DateOnly(2027, 2, 15),
            new DateOnly(2027, 3, 15), new DateOnly(2027, 4, 15)
        }, detalhe.Parcelas.Select(p => p.Vencimento).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 10_000, 10_000, 10_000 },
            detalhe.Parcelas.Select(p => p.ValorBaseCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 10_000, 10_000, 10_000, 11_000 },
            detalhe.Parcelas.Select(p => p.ValorRecebidoCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 0, 0, 0, 1_000 },
            detalhe.Parcelas.Select(p => p.AcrescimoCentavos).ToArray());
        CollectionAssert.AreEqual(new long[] { 0, 0, 0, 0 },
            detalhe.Parcelas.Select(p => p.SaldoCentavos).ToArray());

        CollectionAssert.AreEqual(new[] { "recebimento-entrada", "recebimento-lote", "recebimento-individual" },
            detalhe.Recebimentos.Select(r => r.Id).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            OrigemRecebimentoResposta.Entrada,
            OrigemRecebimentoResposta.HistoricoLote,
            OrigemRecebimentoResposta.Individual
        }, detalhe.Recebimentos.Select(r => r.Origem).ToArray());
        CollectionAssert.AreEqual(new[]
        {
            new DateOnly(2027, 1, 15), new DateOnly(2027, 3, 10), new DateOnly(2027, 2, 10)
        }, detalhe.Recebimentos.Select(r => r.Data).ToArray());
        Assert.AreEqual("🧾 nota — Unicode", detalhe.Recebimentos[2].Observacao);
        CollectionAssert.AreEqual(new[] { "parcela-1" }, detalhe.Recebimentos[0].Alocacoes.Select(a => a.ParcelaId).ToArray());
        CollectionAssert.AreEqual(new[] { "parcela-2", "parcela-3" }, detalhe.Recebimentos[1].Alocacoes.Select(a => a.ParcelaId).ToArray());
        CollectionAssert.AreEqual(new[] { "parcela-4" }, detalhe.Recebimentos[2].Alocacoes.Select(a => a.ParcelaId).ToArray());

        var colecao = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await providerReaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, colecao.Revisao);
        Assert.AreEqual(1, colecao.Conjunto.Vendas.Count);
        Assert.IsFalse(File.Exists(Path.Combine(_diretorioTemporario, "qualquer-outro.db")));
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<ParcelaDetalheResposta>)detalhe.Parcelas).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<RecebimentoDetalheResposta>)detalhe.Recebimentos).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<AlocacaoResposta>)detalhe.Recebimentos[1].Alocacoes).Clear());
        Assert.AreEqual(3, detalhe.Recebimentos.Count);
    }

    [TestMethod]
    public async Task ConsultarVendaAusenteDistingueAusenciaDeFalhaDeArmazenamento()
    {
        using var provider = CriarProvider();
        var consultaSemBanco = await provider.GetRequiredService<ISender>()
            .Send(new ConsultarVendaQuery("ausente", Referencia));

        Assert.IsTrue(consultaSemBanco.IsFailed);
        Assert.AreEqual("banco-ausente", Assert.IsInstanceOfType<ErroAplicacao>(consultaSemBanco.Errors.Single()).Codigo);
        Assert.IsFalse(File.Exists(_caminhoBanco));

        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var consultaVendaAusente = await provider.GetRequiredService<ISender>()
            .Send(new ConsultarVendaQuery("ausente", Referencia));
        Assert.IsTrue(consultaVendaAusente.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(consultaVendaAusente.Errors.Single());
        Assert.AreEqual("venda-inexistente", erro.Codigo);
        Assert.AreEqual(VendasEmAberto.Aplicacao.Comum.Erros.CategoriaErroAplicacao.Inexistencia, erro.Categoria);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda CriarVendaComHistorico()
    {
        var cliente = Sucesso(DadosClienteVenda.Criar("Raquel 🧑🏽‍🚀 Duarte", "52998224725", "(11) 98765-4321", null));
        var dinheiro = (long centavos) => Sucesso(Dinheiro.Criar(centavos));
        return Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "venda-consulta",
            StatusAdministrativoVenda.Ativo,
            cliente,
            new DateOnly(2027, 1, 15),
            dinheiro(40_000),
            [
                new("parcela-1", 1, dinheiro(10_000), new DateOnly(2027, 1, 15)),
                new("parcela-2", 2, dinheiro(10_000), new DateOnly(2027, 2, 15)),
                new("parcela-3", 3, dinheiro(10_000), new DateOnly(2027, 3, 15)),
                new("parcela-4", 4, dinheiro(10_000), new DateOnly(2027, 4, 15))
            ],
            [
                new("recebimento-entrada", new DateOnly(2027, 1, 15), FormaPagamento.Pix, dinheiro(10_000),
                    OrigemRecebimento.Entrada, dinheiro(0), null, [new("parcela-1", dinheiro(10_000))]),
                new("recebimento-lote", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, dinheiro(20_000),
                    OrigemRecebimento.HistoricoLote, dinheiro(0), null,
                    [new("parcela-2", dinheiro(10_000)), new("parcela-3", dinheiro(10_000))]),
                new("recebimento-individual", new DateOnly(2027, 2, 10), FormaPagamento.CartaoCredito, dinheiro(11_000),
                    OrigemRecebimento.Individual, dinheiro(1_000), "🧾 nota — Unicode", [new("parcela-4", dinheiro(11_000))])
            ]), Referencia));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
