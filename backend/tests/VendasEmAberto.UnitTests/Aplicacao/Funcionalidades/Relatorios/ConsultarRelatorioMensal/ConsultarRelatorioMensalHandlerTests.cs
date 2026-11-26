using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;

[TestClass]
public sealed class ConsultarRelatorioMensalHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-relatorio-mensal.db");

    [TestMethod]
    public async Task Handle_MapeiaTodasAsSecoesVinculosTotaisSerieCompletaEPrejuizoSeparado()
    {
        var conjunto = CriarConjuntoComStatusMisturados();
        var armazenamento = new ArmazenamentoFake(conjunto, 17);
        var resultado = await CriarHandler(armazenamento).Handle(
            new ConsultarRelatorioMensalQuery(2027, 3, Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        var relatorio = resultado.Value;
        Assert.AreEqual(Referencia, relatorio.Referencia);
        Assert.AreEqual(17L, relatorio.Revisao);
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
        Assert.AreEqual(6, relatorio.Recebimentos.Count);
        Assert.AreEqual("ativa-entrada-lote", relatorio.Recebimentos[0].Venda.Id);
        Assert.AreEqual("Cliente Entrada/Lote", relatorio.Recebimentos[0].Venda.Cliente.Nome);
        Assert.AreEqual(17L, relatorio.Recebimentos[0].Venda.Revisao);
        Assert.AreEqual(Referencia, relatorio.Recebimentos[0].Venda.Referencia);
        Assert.AreEqual(OrigemRecebimentoResposta.Entrada, relatorio.Recebimentos[0].Origem);
        Assert.AreEqual(FormaPagamentoResposta.Pix, relatorio.Recebimentos[0].Forma);
        Assert.AreEqual(20_000L, relatorio.Recebimentos[0].ValorCentavos);
        Assert.AreEqual(OrigemRecebimentoResposta.HistoricoLote, relatorio.Recebimentos[1].Origem);
        Assert.AreEqual(40_000L, relatorio.Recebimentos[1].ValorCentavos);
        Assert.AreEqual(OrigemRecebimentoResposta.Individual, relatorio.Recebimentos[2].Origem);
        Assert.AreEqual(11_000L, relatorio.Recebimentos[2].ValorCentavos);
        Assert.AreEqual(StatusAdministrativoResposta.Inativo, relatorio.Recebimentos[3].Venda.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoResposta.Prejuizo, relatorio.Recebimentos[4].Venda.StatusAdministrativo);

        Assert.AreEqual(31, relatorio.RecebimentosDiarios.Count);
        Assert.AreEqual(new DateOnly(2027, 3, 1), relatorio.RecebimentosDiarios[0].Data);
        Assert.AreEqual(20_000L, relatorio.RecebimentosDiarios[0].TotalCentavos);
        Assert.AreEqual(new DateOnly(2027, 3, 31), relatorio.RecebimentosDiarios[^1].Data);
        Assert.AreEqual(40_000L, relatorio.RecebimentosDiarios[^1].TotalCentavos);
        Assert.AreEqual(101_000L, relatorio.RecebimentosDiarios.Sum(item => item.TotalCentavos));

        CollectionAssert.AreEqual(
            new[] { "ativa-entrada-lote", "ativa-individual" },
            relatorio.VendasDoMes.Select(item => item.Id).ToArray());
        Assert.AreEqual(200_000L, relatorio.VendasDoMes[0].ValorTotalBaseCentavos);
        Assert.AreEqual(21_000L, relatorio.VendasDoMes[1].ValorTotalEfetivoCentavos);
        Assert.IsTrue(relatorio.Saldos.Any(item => item.Venda.Id == "ativa-entrada-lote" && item.SaldoCentavos == 140_000L));
        Assert.AreEqual("Cliente ativa-individual", relatorio.Saldos.Single(item => item.Venda.Id == "ativa-individual").Venda.Cliente.Nome);
        Assert.AreEqual(10_000L, relatorio.Saldos.Single(item => item.Venda.Id == "ativa-individual").SaldoCentavos);
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
        Assert.AreEqual(3, relatorio.ParcelasPrejuizo.Count);
        Assert.AreEqual(10_000L, relatorio.ParcelasPrejuizo[0].Parcela.ValorBaseCentavos);
        Assert.AreEqual("Cliente prejuizo-pago", relatorio.ParcelasPrejuizo[0].Venda.Cliente.Nome);

        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<RecebimentoMensalResposta>)relatorio.Recebimentos).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<RecebimentoDiarioResposta>)relatorio.RecebimentosDiarios).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<ParcelaPrejuizoResposta>)relatorio.ParcelasPrejuizo).Clear());
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(17L, armazenamento.RevisaoRetornada);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_CorrecaoEntreMesesMoveSomenteMovimentoMantendoReferenciaEPosicao()
    {
        var vendaOriginal = Sucesso(CriarVenda("correcao", 20_000, 2, new DateOnly(2027, 1, 15))
            .RegistrarPagamento("recebimento-estavel", "correcao-parcela-1", DinheiroValor(11_000),
                new DateOnly(2027, 3, 31), FormaPagamento.Pix, new DateOnly(2027, 4, 30)));
        var vendaCorrigida = Sucesso(vendaOriginal.CorrigirPagamento(
            "recebimento-estavel", DinheiroValor(11_000), new DateOnly(2027, 4, 1), FormaPagamento.Pix,
            new DateOnly(2027, 4, 30), [vendaOriginal]));
        var conjunto = CriarConjunto([vendaCorrigida]);
        var armazenamento = new ArmazenamentoFake(conjunto, 5);
        var handler = CriarHandler(armazenamento);

        var marco = await handler.Handle(new ConsultarRelatorioMensalQuery(2027, 3, new DateOnly(2027, 4, 30)), CancellationToken.None);
        var abril = await handler.Handle(new ConsultarRelatorioMensalQuery(2027, 4, new DateOnly(2027, 4, 30)), CancellationToken.None);

        Assert.IsTrue(marco.IsSuccess);
        Assert.IsTrue(abril.IsSuccess);
        Assert.AreEqual(0L, marco.Value.TotalRecebidoCentavos);
        Assert.AreEqual(11_000L, abril.Value.TotalRecebidoCentavos);
        Assert.AreEqual("recebimento-estavel", abril.Value.Recebimentos.Single().Id);
        Assert.AreEqual(new DateOnly(2027, 4, 1), abril.Value.Recebimentos.Single().Data);
        Assert.AreEqual(new DateOnly(2027, 4, 30), marco.Value.Referencia);
        Assert.AreEqual(marco.Value.TotalEmAbertoCentavos, abril.Value.TotalEmAbertoCentavos);
        Assert.AreEqual(marco.Value.TotalAtrasadoCentavos, abril.Value.TotalAtrasadoCentavos);
        Assert.AreEqual(marco.Value.TotalPrejuizoCentavos, abril.Value.TotalPrejuizoCentavos);
        Assert.AreEqual(2, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_MapeiaMesVazioEExtremosDoCalendarioSemOverflow()
    {
        var armazenamento = new ArmazenamentoFake(CriarConjunto([]), 0);
        var handler = CriarHandler(armazenamento);
        var meses = new[]
        {
            (2024, 2, new DateOnly(2024, 2, 1), new DateOnly(2024, 2, 29), 29),
            (2027, 12, new DateOnly(2027, 12, 1), new DateOnly(2027, 12, 31), 31),
            (2028, 1, new DateOnly(2028, 1, 1), new DateOnly(2028, 1, 31), 31),
            (1, 1, DateOnly.MinValue, new DateOnly(1, 1, 31), 31),
            (9999, 12, new DateOnly(9999, 12, 1), DateOnly.MaxValue, 31)
        };

        foreach (var (ano, mes, inicio, fim, dias) in meses)
        {
            var resultado = await handler.Handle(
                new ConsultarRelatorioMensalQuery(ano, mes, DateOnly.MaxValue), CancellationToken.None);

            Assert.IsTrue(resultado.IsSuccess);
            Assert.AreEqual(inicio, resultado.Value.InicioMes);
            Assert.AreEqual(fim, resultado.Value.FimMes);
            Assert.AreEqual(DateOnly.MaxValue, resultado.Value.Referencia);
            Assert.AreEqual(0L, resultado.Value.Revisao);
            Assert.AreEqual(dias, resultado.Value.RecebimentosDiarios.Count);
            Assert.AreEqual(inicio, resultado.Value.RecebimentosDiarios[0].Data);
            Assert.AreEqual(fim, resultado.Value.RecebimentosDiarios[^1].Data);
            Assert.IsTrue(resultado.Value.RecebimentosDiarios.All(item => item.TotalCentavos == 0));
            Assert.AreEqual(0L, resultado.Value.TotalEmAbertoCentavos);
            Assert.AreEqual(0, resultado.Value.QuantidadeVendasMes);
        }

        Assert.AreEqual(meses.Length, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_AnoOuMesInvalidoFalhaAntesDeCarregar()
    {
        var armazenamento = new ArmazenamentoFake(CriarConjunto([]), 0);
        var handler = CriarHandler(armazenamento);
        var casos = new[]
        {
            (0, 1, "ano-invalido", "ano"),
            (10_000, 1, "ano-invalido", "ano"),
            (2027, 0, "mes-invalido", "mes"),
            (2027, 13, "mes-invalido", "mes")
        };

        foreach (var (ano, mes, codigo, campo) in casos)
        {
            var resultado = await handler.Handle(new ConsultarRelatorioMensalQuery(ano, mes, Referencia), CancellationToken.None);

            Assert.IsTrue(resultado.IsFailed);
            var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
            Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
            Assert.AreEqual(codigo, erro.Codigo);
            Assert.AreEqual(campo, erro.Campo);
        }

        Assert.AreEqual(0, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    private static ConsultarRelatorioMensalHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static ConjuntoVendas CriarConjuntoComStatusMisturados()
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
        var inativa = Sucesso(Sucesso(CriarVenda("inativa", 10_000, 1, new DateOnly(2027, 3, 6))
            .RegistrarPagamento("recebimento-inativo", "inativa-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 11), FormaPagamento.Dinheiro, Referencia))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoPago = Sucesso(Sucesso(CriarVenda("prejuizo-pago", 20_000, 2, new DateOnly(2027, 3, 7))
            .RegistrarPagamento("recebimento-prejuizo", "prejuizo-pago-parcela-1", DinheiroValor(10_000),
                new DateOnly(2027, 3, 12), FormaPagamento.CartaoCredito, Referencia))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var vendaPrejuizoEntrada = Sucesso(Venda.Cadastrar(
            "prejuizo-entrada", Cliente("Prejuízo entrada"), new DateOnly(2027, 3, 9), DinheiroValor(20_000), 2,
            ["prejuizo-entrada-p1", "prejuizo-entrada-p2"], Referencia,
            new DadosEntradaVenda("entrada-prejuizo", DinheiroValor(10_000), new DateOnly(2027, 3, 9), FormaPagamento.Pix)));
        var prejuizoEntrada = Sucesso(vendaPrejuizoEntrada.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoSemRecebimento = Sucesso(CriarVenda("prejuizo-sem-recebimento", 10_000, 1, new DateOnly(2027, 3, 8))
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return CriarConjunto([entradaELote, ativaIndividual, ativaAtrasada, inativa, prejuizoPago, prejuizoEntrada, prejuizoSemRecebimento]);
    }

    private static Venda CriarVenda(string id, long total, int parcelas, DateOnly dataVenda) => Sucesso(Venda.Cadastrar(
        id,
        Cliente(id),
        dataVenda,
        DinheiroValor(total),
        parcelas,
        Enumerable.Range(1, parcelas).Select(numero => $"{id}-parcela-{numero}").ToArray(),
        Referencia));

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar($"Cliente {nome}", "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static ConjuntoVendas CriarConjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ConjuntoVendas conjunto, long revisao) : IArmazenamentoVendas
    {
        private readonly SnapshotVendas _snapshot = new(conjunto, revisao);

        public int Carregamentos { get; private set; }

        public int Inicializacoes { get; private set; }

        public int Salvamentos { get; private set; }

        public string? CaminhoCarregado { get; private set; }

        public DateOnly ReferenciaCarregada { get; private set; }

        public long RevisaoRetornada { get; private set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default)
        {
            Inicializacoes++;
            return Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());
        }

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            CaminhoCarregado = caminhoAbsoluto;
            ReferenciaCarregada = referencia;
            RevisaoRetornada = _snapshot.Revisao;
            return Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(_snapshot));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
