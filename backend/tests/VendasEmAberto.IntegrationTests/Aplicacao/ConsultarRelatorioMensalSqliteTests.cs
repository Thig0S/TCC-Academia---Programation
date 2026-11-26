using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using VendasEmAberto.Aplicacao.Composicao;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Composicao;

namespace VendasEmAberto.IntegrationTests.Aplicacao;

[TestClass]
public sealed class ConsultarRelatorioMensalSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 4, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-relatorio-mensal-{Guid.NewGuid():N}");
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
    public async Task ConsultarViaSender_MapeiaRelatorioCompletoEReconciliavelSemAlterarSnapshot()
    {
        var vendas = CriarCenario();
        using (var inicial = CriarProvider())
        {
            Assert.IsTrue((await inicial.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
            var salvo = await inicial.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(_caminhoBanco, vendas, 0, Referencia);
            Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        }

        using var reaberto = CriarProvider();
        var sender = reaberto.GetRequiredService<ISender>();
        var resultado = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 3, Referencia));

        Assert.IsTrue(resultado.IsSuccess);
        var relatorio = resultado.Value;
        Assert.AreEqual(Referencia, relatorio.Referencia);
        Assert.AreEqual(1L, relatorio.Revisao);
        Assert.AreEqual(new DateOnly(2027, 3, 1), relatorio.InicioMes);
        Assert.AreEqual(new DateOnly(2027, 3, 31), relatorio.FimMes);
        Assert.AreEqual(101_000L, relatorio.TotalRecebidoCentavos);
        Assert.AreEqual(2, relatorio.QuantidadeVendasMes);
        Assert.AreEqual(221_000L, relatorio.TotalVendasMesCentavos);
        Assert.AreEqual(170_000L, relatorio.TotalEmAbertoCentavos);
        Assert.AreEqual(20_000L, relatorio.TotalAtrasadoCentavos);
        Assert.AreEqual(10_000L, relatorio.TotalPrejuizoCentavos);
        CollectionAssert.AreEqual(
            new[] { "entrada", "lote", "recebimento-ativo", "recebimento-inativo", "recebimento-prejuizo", "entrada-prejuizo" },
            relatorio.Recebimentos.Select(item => item.Id).ToArray());
        CollectionAssert.AreEqual(
            new[]
            {
                OrigemRecebimentoResposta.Entrada,
                OrigemRecebimentoResposta.HistoricoLote,
                OrigemRecebimentoResposta.Individual,
                OrigemRecebimentoResposta.Individual,
                OrigemRecebimentoResposta.Individual,
                OrigemRecebimentoResposta.Entrada
            },
            relatorio.Recebimentos.Select(item => item.Origem).ToArray());
        Assert.AreEqual("Cliente Entrada/Lote", relatorio.Recebimentos[0].Venda.Cliente.Nome);
        Assert.AreEqual(1L, relatorio.Recebimentos[0].Venda.Revisao);
        Assert.AreEqual(Referencia, relatorio.Recebimentos[0].Venda.Referencia);
        Assert.AreEqual(31, relatorio.RecebimentosDiarios.Count);
        Assert.AreEqual(101_000L, relatorio.RecebimentosDiarios.Sum(item => item.TotalCentavos));
        Assert.AreEqual(20_000L, relatorio.RecebimentosDiarios[0].TotalCentavos);
        Assert.AreEqual(40_000L, relatorio.RecebimentosDiarios[^1].TotalCentavos);
        CollectionAssert.AreEqual(
            new[] { "ativa-entrada-lote", "ativa-individual" },
            relatorio.VendasDoMes.Select(item => item.Id).ToArray());
        Assert.AreEqual(3, relatorio.Saldos.Count);
        CollectionAssert.AreEqual(
            new[] { "ativa-atrasada", "ativa-individual", "ativa-entrada-lote" },
            relatorio.Saldos.Select(item => item.Venda.Id).ToArray());
        Assert.IsTrue(relatorio.Saldos.Any(item => item.Venda.Id == "ativa-entrada-lote" && item.SaldoCentavos == 140_000L));
        Assert.AreEqual(2, relatorio.ParcelasAtrasadas.Count);
        CollectionAssert.AreEqual(
            new[] { "ativa-atrasada-parcela-1", "ativa-atrasada-parcela-2" },
            relatorio.ParcelasAtrasadas.Select(item => item.Parcela.Id).ToArray());
        CollectionAssert.AreEqual(
            new[]
            {
                ("prejuizo-pago", false),
                ("prejuizo-entrada", false),
                ("prejuizo-sem-recebimento", true)
            },
            relatorio.ParcelasPrejuizo.Select(item => (item.Venda.Id, item.IncluirNoTotal)).ToArray());

        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<RecebimentoMensalResposta>)relatorio.Recebimentos).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<RecebimentoDiarioResposta>)relatorio.RecebimentosDiarios).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<VendaResumoResposta>)relatorio.VendasDoMes).Clear());

        var vazio = await sender.Send(new ConsultarRelatorioMensalQuery(2024, 2, Referencia));
        Assert.IsTrue(vazio.IsSuccess);
        Assert.AreEqual(new DateOnly(2024, 2, 1), vazio.Value.InicioMes);
        Assert.AreEqual(new DateOnly(2024, 2, 29), vazio.Value.FimMes);
        Assert.AreEqual(29, vazio.Value.RecebimentosDiarios.Count);
        Assert.IsTrue(vazio.Value.RecebimentosDiarios.All(item => item.TotalCentavos == 0));
        Assert.AreEqual(0L, vazio.Value.TotalRecebidoCentavos);
        Assert.AreEqual(0, vazio.Value.QuantidadeVendasMes);
        Assert.AreEqual(170_000L, vazio.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(Referencia, vazio.Value.Referencia);
        Assert.AreEqual(1L, vazio.Value.Revisao);

        var invalidoAno = await sender.Send(new ConsultarRelatorioMensalQuery(0, 1, Referencia));
        var invalidoMes = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 13, Referencia));
        Assert.IsTrue(invalidoAno.IsFailed);
        Assert.AreEqual("ano-invalido", Assert.IsInstanceOfType<ErroAplicacao>(invalidoAno.Errors.Single()).Codigo);
        Assert.IsTrue(invalidoMes.IsFailed);
        Assert.AreEqual("mes-invalido", Assert.IsInstanceOfType<ErroAplicacao>(invalidoMes.Errors.Single()).Codigo);

        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual(7, snapshot.Conjunto.Vendas.Count);
    }

    [TestMethod]
    public async Task ParametrosValidosNosExtremosDoCalendarioESemMesOuAnoImpossivel()
    {
        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var sender = provider.GetRequiredService<ISender>();
        var consultas = new[]
        {
            (1, 1, DateOnly.MinValue, new DateOnly(1, 1, 31), 31),
            (9999, 12, new DateOnly(9999, 12, 1), DateOnly.MaxValue, 31)
        };

        foreach (var (ano, mes, inicio, fim, dias) in consultas)
        {
            var resultado = await sender.Send(new ConsultarRelatorioMensalQuery(ano, mes, DateOnly.MaxValue));
            Assert.IsTrue(resultado.IsSuccess);
            Assert.AreEqual(inicio, resultado.Value.InicioMes);
            Assert.AreEqual(fim, resultado.Value.FimMes);
            Assert.AreEqual(dias, resultado.Value.RecebimentosDiarios.Count);
            Assert.AreEqual(0L, resultado.Value.TotalRecebidoCentavos);
            Assert.AreEqual(DateOnly.MaxValue, resultado.Value.Referencia);
        }
    }

    [TestMethod]
    public async Task CorrecaoViaSenderMoveRecebimentoEntreMesesSemMudarPosicaoNaReferencia()
    {
        var referencia = new DateOnly(2027, 4, 30);
        var venda = Sucesso(Venda.Cadastrar(
            "correcao-mensal",
            Cliente("Correção mensal"),
            new DateOnly(2027, 1, 15),
            DinheiroValor(20_000),
            2,
            ["correcao-parcela-1", "correcao-parcela-2"],
            referencia));
        venda = Sucesso(venda.RegistrarPagamento(
            "recebimento-estavel", "correcao-parcela-1", DinheiroValor(11_000),
            new DateOnly(2027, 3, 31), FormaPagamento.Pix, referencia));

        using var provider = CriarProvider();
        Assert.IsTrue((await provider.GetRequiredService<IPreparacaoArmazenamentoVendas>().PrepararAsync()).IsSuccess);
        var salvo = await provider.GetRequiredService<IArmazenamentoVendas>().SalvarAsync(
            _caminhoBanco, [venda], 0, referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(salvo).Valor);
        var sender = provider.GetRequiredService<ISender>();

        var correcao = await sender.Send(new CorrigirPagamentoCommand(
            "correcao-mensal", "recebimento-estavel", 11_000, new DateOnly(2027, 4, 1),
            FormaPagamento.Pix, null, referencia, 1));
        Assert.IsTrue(correcao.IsSuccess);
        Assert.AreEqual(2L, correcao.Value.Resumo.Revisao);

        var marco = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 3, referencia));
        var abril = await sender.Send(new ConsultarRelatorioMensalQuery(2027, 4, referencia));
        Assert.IsTrue(marco.IsSuccess);
        Assert.IsTrue(abril.IsSuccess);
        Assert.AreEqual(0L, marco.Value.TotalRecebidoCentavos);
        Assert.AreEqual(11_000L, abril.Value.TotalRecebidoCentavos);
        Assert.AreEqual("recebimento-estavel", abril.Value.Recebimentos.Single().Id);
        Assert.AreEqual(new DateOnly(2027, 4, 1), abril.Value.Recebimentos.Single().Data);
        Assert.AreEqual(2L, marco.Value.Revisao);
        Assert.AreEqual(2L, abril.Value.Revisao);
        Assert.AreEqual(referencia, marco.Value.Referencia);
        Assert.AreEqual(referencia, abril.Value.Referencia);
        Assert.AreEqual(marco.Value.TotalEmAbertoCentavos, abril.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(marco.Value.TotalAtrasadoCentavos, abril.Value.TotalAtrasadoCentavos);
        Assert.AreEqual(marco.Value.TotalPrejuizoCentavos, abril.Value.TotalPrejuizoCentavos);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await provider.GetRequiredService<IArmazenamentoVendas>().CarregarAsync(_caminhoBanco, referencia)).Valor;
        Assert.AreEqual(2L, snapshot.Revisao);
        Assert.AreEqual(new DateOnly(2027, 4, 1), snapshot.Conjunto.Vendas.Single().Recebimentos.Single().Data);
    }

    private ServiceProvider CriarProvider() => new ServiceCollection()
        .AdicionarAplicacao()
        .AdicionarPersistenciaSqlite(_caminhoBanco)
        .BuildServiceProvider(validateScopes: true);

    private static Venda[] CriarCenario()
    {
        var entradaELote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "ativa-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada/Lote"),
            new DateOnly(2027, 3, 1),
            DinheiroValor(200_000),
            Enumerable.Range(1, 10).Select(numero => new DadosReconstrucaoParcela(
                $"entrada-lote-p{numero}", numero, DinheiroValor(20_000),
                numero == 1 ? new DateOnly(2027, 3, 1) : new DateOnly(2027, numero + 2, 1))).ToArray(),
            [
                new("entrada", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(20_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null, [new("entrada-lote-p1", DinheiroValor(20_000))]),
                new("lote", new DateOnly(2027, 3, 31), FormaPagamento.Dinheiro, DinheiroValor(40_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null,
                    [new("entrada-lote-p2", DinheiroValor(20_000)), new("entrada-lote-p3", DinheiroValor(20_000))])
            ]), Referencia));

        var ativaIndividual = Sucesso(CriarVenda("ativa-individual", 20_000, 2, new DateOnly(2027, 3, 5))
            .RegistrarPagamento("recebimento-ativo", "ativa-individual-parcela-1", DinheiroValor(11_000),
                new DateOnly(2027, 3, 10), FormaPagamento.Pix, Referencia));
        var ativaAtrasada = CriarVenda("ativa-atrasada", 20_000, 2, new DateOnly(2027, 1, 15));
        var inativaBase = Sucesso(CriarVenda("inativa", 10_000, 1, new DateOnly(2027, 3, 6))
            .RegistrarPagamento("recebimento-inativo", "inativa-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 11), FormaPagamento.Dinheiro, Referencia));
        var inativa = Sucesso(inativaBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoBase = Sucesso(CriarVenda("prejuizo-pago", 20_000, 2, new DateOnly(2027, 3, 7))
            .RegistrarPagamento("recebimento-prejuizo", "prejuizo-pago-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 12), FormaPagamento.CartaoCredito, Referencia));
        var prejuizoPago = Sucesso(prejuizoBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoEntradaBase = Sucesso(Venda.Cadastrar(
            "prejuizo-entrada", Cliente("Prejuízo entrada"), new DateOnly(2027, 3, 9), DinheiroValor(20_000), 2,
            ["prejuizo-entrada-p1", "prejuizo-entrada-p2"], Referencia,
            new DadosEntradaVenda("entrada-prejuizo", DinheiroValor(10_000), new DateOnly(2027, 3, 9), FormaPagamento.Pix)));
        var prejuizoEntrada = Sucesso(prejuizoEntradaBase.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoSemRecebimento = Sucesso(CriarVenda("prejuizo-sem-recebimento", 10_000, 1, new DateOnly(2027, 3, 8))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [entradaELote, ativaIndividual, ativaAtrasada, inativa, prejuizoPago, prejuizoEntrada, prejuizoSemRecebimento];
    }

    private static Venda CriarVenda(string id, long total, int quantidade, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(id),
        dataVenda,
        DinheiroValor(total),
        quantidade,
        Enumerable.Range(1, quantidade).Select(numero => $"{id}-parcela-{numero}").ToArray(),
        Referencia));

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");
}
