using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;

[TestClass]
public sealed class ConsultarVisaoGeralHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 16);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-visao-geral.db");

    [TestMethod]
    public async Task Handle_UsaUmSnapshotParaIndicadoresStatusMistosEResumosIndependentes()
    {
        var armazenamento = new ArmazenamentoFake(Conjunto(CriarCenarioIndicadores()), revisao: 14);
        var handler = CriarHandler(armazenamento);

        var resultado = await handler.Handle(new ConsultarVisaoGeralQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        var resposta = resultado.Value;
        Assert.AreEqual(Referencia, resposta.Referencia);
        Assert.AreEqual(14L, resposta.Revisao);
        Assert.AreEqual(20_000L, resposta.Indicadores.TotalEmAbertoCentavos);
        Assert.AreEqual(10_000L, resposta.Indicadores.ValoresEmAtrasoCentavos);
        Assert.AreEqual(50_000L, resposta.Indicadores.RecebidoNoMesCentavos);
        Assert.AreEqual(3, resposta.Indicadores.QuantidadeVendasAtivas);
        CollectionAssert.AreEqual(
            new[] { "ativa-entrada-lote", "ativa-atrasada", "ativa-quitada" },
            resposta.VendasRecentes.Select(venda => venda.Id).ToArray());
        Assert.AreEqual(0, resposta.ParcelasProximas.Count);
        Assert.AreEqual(1, resposta.ParcelasAtrasadas.Count);
        Assert.AreEqual(
            SituacaoVendaResposta.Quitada,
            resposta.VendasRecentes.Single(venda => venda.Id == "ativa-quitada").Situacao);
        Assert.AreEqual("ativa-atrasada", resposta.ParcelasAtrasadas[0].Venda.Id);
        Assert.AreEqual("ativa-atrasada-p1", resposta.ParcelasAtrasadas[0].Parcela.Id);
        Assert.IsFalse(resposta.VendasRecentes.Any(venda => venda.Id is "inativa" or "prejuizo"));
        AssertMetadadosIguais(resposta);

        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhoCarregado);
        Assert.AreEqual(Referencia, armazenamento.ReferenciaCarregada);
        Assert.AreEqual(14L, armazenamento.RevisaoRetornada);
    }

    [TestMethod]
    public async Task Handle_SelecionaElegiveisOrdenaEmpatesEAplicaLimiteAposOrdenacao()
    {
        var vendas = CriarCenarioOrdenacao();
        var armazenamento = new ArmazenamentoFake(Conjunto(vendas), revisao: 23);
        var resultado = await CriarHandler(armazenamento)
            .Handle(new ConsultarVisaoGeralQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        var resposta = resultado.Value;
        CollectionAssert.AreEqual(
            new[] { "recente-quitada", "recente-a", "recente-b", "recente-c", "recente-d" },
            resposta.VendasRecentes.Select(venda => venda.Id).ToArray());
        CollectionAssert.AreEqual(
            new[] { "ordem-a-p1", "ordem-b-p1", "ordem-c-p1", "ordem-e-p1", "ordem-f-p1" },
            resposta.ParcelasProximas.Select(item => item.Parcela.Id).ToArray());
        CollectionAssert.AreEqual(
            new[]
            {
                "ordem-atrasada-a-p1", "ordem-atrasada-b-p1", "ordem-atrasada-c-p1",
                "ordem-atrasada-d-p1", "ordem-atrasada-e-p1"
            },
            resposta.ParcelasAtrasadas.Select(item => item.Parcela.Id).ToArray());
        Assert.AreEqual(205L, resposta.Indicadores.RecebidoNoMesCentavos);
        Assert.AreEqual("ordem-a", resposta.ParcelasProximas[0].Venda.Id);
        Assert.AreEqual("ordem-a", resposta.ParcelasProximas[0].Venda.Cliente.Nome);
        Assert.AreEqual(new DateOnly(2027, 2, 16), resposta.ParcelasProximas[0].Venda.DataVenda);
        Assert.AreEqual(1, resposta.ParcelasProximas[0].Parcela.Numero);
        Assert.AreEqual(Referencia, resposta.ParcelasProximas[0].Parcela.Vencimento);
        Assert.AreEqual(100L, resposta.ParcelasProximas[0].Parcela.ValorBaseCentavos);
        Assert.AreEqual(5, resposta.VendasRecentes.Count);
        Assert.AreEqual(5, resposta.ParcelasProximas.Count);
        Assert.AreEqual(5, resposta.ParcelasAtrasadas.Count);
        Assert.AreEqual(SituacaoVendaResposta.Quitada, resposta.VendasRecentes[0].Situacao);
        Assert.IsFalse(resposta.VendasRecentes.Any(venda => venda.Id is "recente-inativa" or "ordem-inativa"));
        Assert.IsFalse(resposta.ParcelasProximas.Concat(resposta.ParcelasAtrasadas)
            .Any(item => item.Parcela.Id is "ordem-paga-p1" or "ordem-fora-janela-p1" or "ordem-inativa-p1" or "ordem-prejuizo-p1"));
        Assert.IsTrue(resposta.ParcelasProximas.All(item =>
            item.Parcela.Situacao == SituacaoParcelaResposta.ProximosDias
            && item.Parcela.SaldoCentavos == 100));
        Assert.IsTrue(resposta.ParcelasAtrasadas.All(item =>
            item.Parcela.Situacao == SituacaoParcelaResposta.Atrasada
            && item.Parcela.SaldoCentavos == 100));
        AssertMetadadosIguais(resposta);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_ConjuntoVazioEResumosComElegibilidadeIndependenteSaoImutaveis()
    {
        var vazio = await CriarHandler(new ArmazenamentoFake(Conjunto([]), revisao: 0))
            .Handle(new ConsultarVisaoGeralQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(vazio.IsSuccess);
        Assert.AreEqual(0L, vazio.Value.Indicadores.TotalEmAbertoCentavos);
        Assert.AreEqual(0L, vazio.Value.Indicadores.ValoresEmAtrasoCentavos);
        Assert.AreEqual(0L, vazio.Value.Indicadores.RecebidoNoMesCentavos);
        Assert.AreEqual(0, vazio.Value.Indicadores.QuantidadeVendasAtivas);
        Assert.AreEqual(0L, vazio.Value.Revisao);
        Assert.AreEqual(0, vazio.Value.VendasRecentes.Count);
        Assert.AreEqual(0, vazio.Value.ParcelasProximas.Count);
        Assert.AreEqual(0, vazio.Value.ParcelasAtrasadas.Count);

        var somenteProximas = CriarVenda("somente-proximas", new DateOnly(2027, 2, 17));
        var respostaProximas = await CriarHandler(
                new ArmazenamentoFake(Conjunto([somenteProximas]), revisao: 1))
            .Handle(new ConsultarVisaoGeralQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(respostaProximas.IsSuccess);
        Assert.AreEqual(1, respostaProximas.Value.VendasRecentes.Count);
        Assert.AreEqual(1, respostaProximas.Value.ParcelasProximas.Count);
        Assert.AreEqual(0, respostaProximas.Value.ParcelasAtrasadas.Count);

        var somenteAtrasadas = CriarVenda("somente-atrasadas", new DateOnly(2027, 2, 15));
        var respostaAtrasadas = await CriarHandler(
                new ArmazenamentoFake(Conjunto([somenteAtrasadas]), revisao: 2))
            .Handle(new ConsultarVisaoGeralQuery(Referencia), CancellationToken.None);

        Assert.IsTrue(respostaAtrasadas.IsSuccess);
        Assert.AreEqual(1, respostaAtrasadas.Value.VendasRecentes.Count);
        Assert.AreEqual(0, respostaAtrasadas.Value.ParcelasProximas.Count);
        Assert.AreEqual(1, respostaAtrasadas.Value.ParcelasAtrasadas.Count);

        var resposta = respostaProximas.Value;
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<VendaResumoResposta>)resposta.VendasRecentes).Add(resposta.VendasRecentes[0]));
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ParcelaVisaoGeralResposta>)resposta.ParcelasProximas).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ParcelaVisaoGeralResposta>)resposta.ParcelasAtrasadas).Clear());

        var fonte = new List<VendaResumoResposta> { resposta.VendasRecentes[0] };
        var protegida = new VisaoGeralResposta(
            resposta.Referencia,
            resposta.Revisao,
            resposta.Indicadores,
            fonte,
            resposta.ParcelasProximas,
            resposta.ParcelasAtrasadas);
        fonte.Clear();
        Assert.AreEqual(1, protegida.VendasRecentes.Count);
    }

    [TestMethod]
    public async Task Handle_UsaClassificacaoDominioSemTransbordarNosExtremosDoCalendario()
    {
        var inicio = DateOnly.MinValue;
        var fim = DateOnly.MaxValue;
        var vendaInicio = CriarVenda("calendario-inicio", inicio, referencia: inicio);
        var vendaFim = CriarVenda(
            "calendario-fim",
            new DateOnly(9999, 10, 31),
            quantidadeParcelas: 2,
            referencia: fim);

        var respostaInicio = await CriarHandler(new ArmazenamentoFake(Conjunto([vendaInicio]), 4))
            .Handle(new ConsultarVisaoGeralQuery(inicio), CancellationToken.None);
        var respostaFim = await CriarHandler(new ArmazenamentoFake(Conjunto([vendaFim]), 5))
            .Handle(new ConsultarVisaoGeralQuery(fim), CancellationToken.None);

        Assert.IsTrue(respostaInicio.IsSuccess);
        Assert.AreEqual(inicio, respostaInicio.Value.Referencia);
        Assert.AreEqual(0, respostaInicio.Value.ParcelasProximas.Count);
        Assert.AreEqual(0, respostaInicio.Value.ParcelasAtrasadas.Count);
        Assert.IsTrue(respostaFim.IsSuccess);
        Assert.AreEqual(fim, respostaFim.Value.Referencia);
        Assert.AreEqual(fim, respostaFim.Value.ParcelasProximas.Single().Parcela.Vencimento);
        Assert.AreEqual(new DateOnly(9999, 11, 30), respostaFim.Value.ParcelasAtrasadas.Single().Parcela.Vencimento);
        Assert.AreEqual(5L, respostaFim.Value.Revisao);
        AssertMetadadosIguais(respostaFim.Value);
    }

    private static ConsultarVisaoGeralHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static Venda[] CriarCenarioIndicadores()
    {
        var ativaEntradaLote = Sucesso(Venda.Reconstruir(new DadosReconstrucaoVenda(
            "ativa-entrada-lote",
            StatusAdministrativoVenda.Ativo,
            Cliente("Entrada/Lote"),
            new DateOnly(2027, 3, 1),
            DinheiroValor(30_000),
            [
                new("entrada-lote-p1", 1, DinheiroValor(10_000), new DateOnly(2027, 3, 1)),
                new("entrada-lote-p2", 2, DinheiroValor(10_000), new DateOnly(2027, 4, 1)),
                new("entrada-lote-p3", 3, DinheiroValor(10_000), new DateOnly(2027, 5, 1))
            ],
            [
                new("entrada-unica", new DateOnly(2027, 3, 1), FormaPagamento.Pix, DinheiroValor(10_000),
                    OrigemRecebimento.Entrada, DinheiroValor(0), null, [new("entrada-lote-p1", DinheiroValor(10_000))]),
                new("lote-unico", new DateOnly(2027, 3, 10), FormaPagamento.Dinheiro, DinheiroValor(10_000),
                    OrigemRecebimento.HistoricoLote, DinheiroValor(0), null, [new("entrada-lote-p2", DinheiroValor(10_000))])
            ]), Referencia));

        var ativaAtrasada = CriarVenda("ativa-atrasada", new DateOnly(2026, 12, 15), valorParcelaCentavos: 10_000);
        var ativaQuitada = Pagar(
            CriarVenda("ativa-quitada", new DateOnly(2026, 12, 15), valorParcelaCentavos: 10_000),
            "recebimento-ativa");
        var inativa = Sucesso(Pagar(
                CriarVenda("inativa", new DateOnly(2026, 12, 15), quantidadeParcelas: 2, valorParcelaCentavos: 10_000),
                "recebimento-inativa")
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizo = Sucesso(Pagar(
                CriarVenda("prejuizo", new DateOnly(2026, 12, 15), quantidadeParcelas: 2, valorParcelaCentavos: 10_000),
                "recebimento-prejuizo")
            .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        return [ativaEntradaLote, ativaAtrasada, ativaQuitada, inativa, prejuizo];
    }

    private static Venda[] CriarCenarioOrdenacao()
    {
        var vendas = new List<Venda>
        {
            Pagar(CriarVenda("recente-quitada", Referencia), "recente-pagamento"),
            CriarVenda("recente-a", new DateOnly(2027, 3, 15)),
            CriarVenda("recente-b", new DateOnly(2027, 3, 15)),
            CriarVenda("recente-c", new DateOnly(2027, 3, 14)),
            CriarVenda("recente-d", new DateOnly(2027, 3, 13)),
            CriarVenda("recente-e", new DateOnly(2027, 3, 12)),
            CriarVenda("recente-f", new DateOnly(2027, 3, 11)),
            CriarVenda("recente-g", new DateOnly(2027, 3, 10)),
            Sucesso(CriarVenda("recente-inativa", Referencia)
                .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo)),
            CriarVendaComVencimento("ordem-a", Referencia),
            CriarVendaComVencimento("ordem-b", Referencia),
            CriarVendaComVencimento("ordem-c", Referencia),
            Pagar(CriarVendaComVencimento("ordem-paga", Referencia), "ordem-paga-recebimento", adicional: 5),
            CriarVendaComVencimento("ordem-e", Referencia.AddDays(7)),
            CriarVendaComVencimento("ordem-f", Referencia.AddDays(7)),
            CriarVendaComVencimento("ordem-g", Referencia.AddDays(7)),
            CriarVendaComVencimento("ordem-fora-janela", Referencia.AddDays(8)),
            CriarVendaComVencimento("ordem-atrasada-a", Referencia.AddDays(-1)),
            CriarVendaComVencimento("ordem-atrasada-b", Referencia.AddDays(-1)),
            CriarVendaComVencimento("ordem-atrasada-c", Referencia.AddDays(-1)),
            CriarVendaComVencimento("ordem-atrasada-d", Referencia.AddDays(-1)),
            CriarVendaComVencimento("ordem-atrasada-e", Referencia.AddDays(-1)),
            CriarVendaComVencimento("ordem-atrasada-f", Referencia.AddDays(-1)),
            Sucesso(CriarVendaComVencimento("ordem-inativa", Referencia.AddDays(-1))
                .AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo)),
            Sucesso(CriarVendaComVencimento("ordem-prejuizo", Referencia)
                .AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo))
        };

        return vendas.ToArray();
    }

    private static Venda CriarVendaComVencimento(string id, DateOnly vencimento) =>
        CriarVenda(id, vencimento.AddMonths(-1));

    private static Venda CriarVenda(
        string id,
        DateOnly dataVenda,
        int quantidadeParcelas = 1,
        long valorParcelaCentavos = 100,
        DateOnly? referencia = null) => Sucesso(
        Venda.Cadastrar(
            id,
            Cliente(id),
            dataVenda,
            DinheiroValor(valorParcelaCentavos * quantidadeParcelas),
            quantidadeParcelas,
            Enumerable.Range(1, quantidadeParcelas).Select(indice => $"{id}-p{indice}").ToArray(),
            referencia ?? Referencia));

    private static Venda Pagar(Venda venda, string recebimentoId, long adicional = 0)
    {
        var pagamento = venda.RegistrarPagamento(
            recebimentoId,
            venda.Parcelas[0].Id,
            DinheiroValor(venda.Parcelas[0].ValorBase.Centavos + adicional),
            Referencia,
            FormaPagamento.Pix,
            Referencia);
        return Sucesso(pagamento);
    }

    private static DadosClienteVenda Cliente(string nome = "Cliente sintético") =>
        Sucesso(DadosClienteVenda.Criar(nome, "52998224725", "11987654321", null));

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

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

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
            string caminhoAbsoluto,
            CancellationToken cancellationToken = default)
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
