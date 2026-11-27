using MediatR;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarVisaoGeralSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-visao-geral-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_AposReaberturaConciliaSnapshotLimitesETransicoesAdministrativas()
    {
        var vendas = CriarCenarioPersistido();
        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>()
                .PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>()
                .SalvarAsync(_caminhoBanco, vendas, revisaoEsperada: 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        VisaoGeralResposta anterior;
        using (var reaberto = CriarProvider())
        {
            anterior = await ConsultarAsync(reaberto);

            AssertPainel(anterior, revisao: 1, quantidadeAtivas: 18, emAberto: 41_300, atraso: 20_600);
            Assert.AreEqual(60_500L, anterior.Indicadores.RecebidoNoMesCentavos);
            CollectionAssert.AreEqual(
                new[]
                {
                    "sqlite-proxima-hoje-a-p1", "sqlite-proxima-hoje-b-p1", "sqlite-proxima-hoje-c-p1",
                    "sqlite-proxima-sete-a-p1", "sqlite-proxima-sete-b-p1"
                },
                anterior.ParcelasProximas.Select(item => item.Parcela.Id).ToArray());
            CollectionAssert.AreEqual(
                new[]
                {
                    "venda-inativar-p2", "venda-prejuizo-p2", "sqlite-atrasada-a-p1",
                    "sqlite-atrasada-b-p1", "sqlite-atrasada-c-p1"
                },
                anterior.ParcelasAtrasadas.Select(item => item.Parcela.Id).ToArray());
            Assert.AreEqual(5, anterior.VendasRecentes.Count);
            Assert.IsTrue(anterior.VendasRecentes.All(venda => venda.StatusAdministrativo == StatusAdministrativoResposta.Ativo));
            AssertMetadadosIguais(anterior);

            var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
                await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
            Assert.AreEqual(18, snapshot.Conjunto.Vendas.Count);
            var recebimentos = snapshot.Conjunto.Vendas.SelectMany(venda => venda.Recebimentos).ToArray();
            Assert.AreEqual(6, recebimentos.Length);
            Assert.AreEqual(1, recebimentos.Count(item => item.Origem == OrigemRecebimento.Entrada));
            Assert.AreEqual(1, recebimentos.Count(item => item.Origem == OrigemRecebimento.HistoricoLote));
            Assert.AreEqual(4, recebimentos.Count(item => item.Origem == OrigemRecebimento.Individual));
            Assert.AreEqual(60_500L, recebimentos.Sum(item => item.Valor.Centavos));

            await AlterarStatusAsync(reaberto, "venda-inativar", StatusAdministrativoVenda.Inativo, 1);
            var inativada = await ConsultarAsync(reaberto);
            AssertPainel(inativada, revisao: 2, quantidadeAtivas: 17, emAberto: 31_300, atraso: 10_600);
            Assert.AreEqual(60_500L, inativada.Indicadores.RecebidoNoMesCentavos);
            Assert.IsFalse(inativada.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-inativar"));

            await AlterarStatusAsync(reaberto, "venda-inativar", StatusAdministrativoVenda.Ativo, 2);
            var reativada = await ConsultarAsync(reaberto);
            AssertPainel(reativada, revisao: 3, quantidadeAtivas: 18, emAberto: 41_300, atraso: 20_600);
            Assert.IsTrue(reativada.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-inativar"));

            await AlterarStatusAsync(reaberto, "venda-prejuizo", StatusAdministrativoVenda.Prejuizo, 3);
            var marcadaPrejuizo = await ConsultarAsync(reaberto);
            AssertPainel(marcadaPrejuizo, revisao: 4, quantidadeAtivas: 17, emAberto: 31_300, atraso: 10_600);
            Assert.AreEqual(60_500L, marcadaPrejuizo.Indicadores.RecebidoNoMesCentavos);
            Assert.IsFalse(marcadaPrejuizo.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-prejuizo"));

            await AlterarStatusAsync(reaberto, "venda-prejuizo", StatusAdministrativoVenda.Ativo, 4);
            var reaberta = await ConsultarAsync(reaberto);
            AssertPainel(reaberta, revisao: 5, quantidadeAtivas: 18, emAberto: 41_300, atraso: 20_600);
            Assert.IsTrue(reaberta.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-prejuizo"));
            Assert.AreEqual(60_500L, reaberta.Indicadores.RecebidoNoMesCentavos);
        }

        AssertPainel(anterior, revisao: 1, quantidadeAtivas: 18, emAberto: 41_300, atraso: 20_600);
        Assert.AreEqual(60_500L, anterior.Indicadores.RecebidoNoMesCentavos);
        Assert.IsTrue(anterior.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-inativar"));
        Assert.IsTrue(anterior.ParcelasAtrasadas.Any(item => item.Venda.Id == "venda-prejuizo"));

        using var reabertoFinal = CriarProvider();
        var final = await ConsultarAsync(reabertoFinal);
        AssertPainel(final, revisao: 5, quantidadeAtivas: 18, emAberto: 41_300, atraso: 20_600);
        CollectionAssert.AreEqual(
            anterior.ParcelasProximas.Select(item => item.Parcela.Id).ToArray(),
            final.ParcelasProximas.Select(item => item.Parcela.Id).ToArray());
        Assert.AreEqual(60_500L, final.Indicadores.RecebidoNoMesCentavos);
    }

    [TestMethod]
    public async Task BancoPreparadoVazio_ConsultaViaSenderRetornaListasVaziasSemAvancarRevisao()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>()
            .PrepararAsync()).IsSuccess);

        var resposta = await ConsultarAsync(provider);

        Assert.AreEqual(Referencia, resposta.Referencia);
        Assert.AreEqual(0L, resposta.Revisao);
        Assert.AreEqual(0L, resposta.Indicadores.TotalEmAbertoCentavos);
        Assert.AreEqual(0L, resposta.Indicadores.ValoresEmAtrasoCentavos);
        Assert.AreEqual(0L, resposta.Indicadores.RecebidoNoMesCentavos);
        Assert.AreEqual(0, resposta.Indicadores.QuantidadeVendasAtivas);
        Assert.AreEqual(0, resposta.VendasRecentes.Count);
        Assert.AreEqual(0, resposta.ParcelasProximas.Count);
        Assert.AreEqual(0, resposta.ParcelasAtrasadas.Count);

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static async Task<VisaoGeralResposta> ConsultarAsync(IServiceProvider provider)
    {
        var resultado = await provider.GetRequiredService<ISender>()
            .Send(new ConsultarVisaoGeralQuery(Referencia));
        Assert.IsTrue(resultado.IsSuccess);
        return resultado.Value;
    }

    private static async Task AlterarStatusAsync(
        IServiceProvider provider,
        string vendaId,
        StatusAdministrativoVenda status,
        long revisaoEsperada)
    {
        var resultado = await provider.GetRequiredService<ISender>().Send(new AlterarStatusVendaCommand(
            vendaId,
            status,
            Referencia,
            revisaoEsperada));
        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(revisaoEsperada + 1, resultado.Value.Resumo.Revisao);
    }

    private static void AssertPainel(
        VisaoGeralResposta resposta,
        long revisao,
        int quantidadeAtivas,
        long emAberto,
        long atraso)
    {
        Assert.AreEqual(Referencia, resposta.Referencia);
        Assert.AreEqual(revisao, resposta.Revisao);
        Assert.AreEqual(quantidadeAtivas, resposta.Indicadores.QuantidadeVendasAtivas);
        Assert.AreEqual(emAberto, resposta.Indicadores.TotalEmAbertoCentavos);
        Assert.AreEqual(atraso, resposta.Indicadores.ValoresEmAtrasoCentavos);
        AssertMetadadosIguais(resposta);
    }

    private static void AssertMetadadosIguais(VisaoGeralResposta resposta)
    {
        foreach (var venda in resposta.VendasRecentes)
        {
            Assert.AreEqual(resposta.Referencia, venda.Referencia);
            Assert.AreEqual(resposta.Revisao, venda.Revisao);
        }

        foreach (var item in resposta.ParcelasProximas.Concat(resposta.ParcelasAtrasadas))
        {
            Assert.AreEqual(resposta.Referencia, item.Venda.Referencia);
            Assert.AreEqual(resposta.Revisao, item.Venda.Revisao);
        }
    }

    private static Venda[] CriarCenarioPersistido()
    {
        var entradaELote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "venda-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada e lote"),
            new DateOnly(2027, 3, 1),
            DinheiroValor(30_000),
            [
                new("entrada-lote-p1", 1, DinheiroValor(10_000), new DateOnly(2027, 3, 1)),
                new("entrada-lote-p2", 2, DinheiroValor(10_000), new DateOnly(2027, 4, 1)),
                new("entrada-lote-p3", 3, DinheiroValor(10_000), new DateOnly(2027, 5, 1))
            ],
            [
                new("recebimento-entrada", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(10_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null, [new("entrada-lote-p1", DinheiroValor(10_000))]),
                new("recebimento-lote", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null, [new("entrada-lote-p2", DinheiroValor(10_000))])
            ]), Referencia));

        var individual = Registrar(
            CriarVenda("venda-individual", new DateOnly(2027, 2, 1), 20_000, 2),
            "recebimento-individual",
            10_500,
            new DateOnly(2027, 3, 5));
        var vendaInativar = Registrar(
            CriarVenda("venda-inativar", new DateOnly(2026, 12, 15), 20_000, 2),
            "recebimento-inativar",
            10_000,
            new DateOnly(2027, 3, 6));
        var vendaPrejuizo = Registrar(
            CriarVenda("venda-prejuizo", new DateOnly(2026, 12, 15), 20_000, 2),
            "recebimento-prejuizo",
            10_000,
            new DateOnly(2027, 3, 7));
        var quitada = Registrar(
            CriarVenda("venda-quitada", new DateOnly(2026, 12, 15), 10_000, 1),
            "recebimento-quitada",
            10_000,
            new DateOnly(2027, 3, 8));

        var vendas = new List<Venda> { entradaELote, individual, vendaInativar, vendaPrejuizo, quitada };
        foreach (var rotulo in new[] { "hoje-a", "hoje-b", "hoje-c" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-proxima-{rotulo}", Referencia, 100));
        }

        foreach (var rotulo in new[] { "sete-a", "sete-b", "sete-c" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-proxima-{rotulo}", Referencia.AddDays(7), 100));
        }

        vendas.Add(CriarVendaComVencimento("sqlite-proxima-oito", Referencia.AddDays(8), 100));
        foreach (var rotulo in new[] { "a", "b", "c", "d", "e", "f" })
        {
            vendas.Add(CriarVendaComVencimento($"sqlite-atrasada-{rotulo}", Referencia.AddDays(-1), 100));
        }

        return vendas.ToArray();
    }

    private static Venda CriarVendaComVencimento(string id, DateOnly vencimento, long valorCentavos) =>
        CriarVenda(id, vencimento.AddMonths(-1), valorCentavos, quantidadeParcelas: 1);

    private static Venda CriarVenda(string id, DateOnly dataVenda, long valorCentavos, int quantidadeParcelas) =>
        Sucesso(Venda.Cadastrar(
            id,
            Cliente(id),
            dataVenda,
            DinheiroValor(valorCentavos),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(indice => $"{id}-p{indice}").ToArray(),
            Referencia));

    private static Venda Registrar(Venda venda, string recebimentoId, long valor, DateOnly data) =>
        Sucesso(venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValor(valor),
            data,
            FormaPagamento.Pix,
            Referencia));

    private static DadosClienteVenda Cliente(string nome) =>
        Sucesso(DadosClienteVenda.Criar(nome, "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
