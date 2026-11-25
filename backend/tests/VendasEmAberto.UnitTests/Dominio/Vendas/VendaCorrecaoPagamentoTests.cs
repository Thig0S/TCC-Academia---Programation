using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaCorrecaoPagamentoTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 2, 28);

    [TestMethod]
    public void CorrigirPagamento_AlteraRecebimentoQuitadoSemDuplicarEPreservaContrato()
    {
        var vendaOriginal = CriarVenda();
        var comPrimeiro = ObterSucesso(Registrar(
            vendaOriginal,
            "recebimento-1",
            "venda-correcao-parcela-1",
            11_000,
            DataVenda,
            FormaPagamento.Pix,
            "nota original"));
        var quitada = ObterSucesso(Registrar(
            comPrimeiro,
            "recebimento-2",
            "venda-correcao-parcela-2",
            10_000,
            new DateOnly(2027, 1, 20),
            FormaPagamento.Dinheiro,
            "outro recebimento"));

        var corrigida = ObterSucesso(Corrigir(
            quitada,
            "recebimento-1",
            10_500,
            new DateOnly(2027, 2, 5),
            FormaPagamento.CartaoCredito,
            "nota corrigida"));
        var corrigidaNovamente = ObterSucesso(Corrigir(
            corrigida,
            "recebimento-1",
            10_500,
            new DateOnly(2027, 2, 5),
            FormaPagamento.CartaoCredito,
            "nota corrigida"));

        var recebimentoCorrigido = corrigidaNovamente.Recebimentos[0];
        Assert.AreEqual(2, corrigidaNovamente.Recebimentos.Count);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, corrigidaNovamente.StatusAdministrativo);
        Assert.AreEqual("recebimento-1", recebimentoCorrigido.Id);
        Assert.AreEqual(OrigemRecebimento.Individual, recebimentoCorrigido.Origem);
        Assert.AreEqual("venda-correcao-parcela-1", recebimentoCorrigido.Alocacoes.Single().ParcelaId);
        Assert.AreEqual(10_500, recebimentoCorrigido.Valor.Centavos);
        Assert.AreEqual(10_500, recebimentoCorrigido.Alocacoes.Single().Valor.Centavos);
        Assert.AreEqual(500, recebimentoCorrigido.Acrescimo.Centavos);
        Assert.AreEqual(new DateOnly(2027, 2, 5), recebimentoCorrigido.Data);
        Assert.AreEqual(FormaPagamento.CartaoCredito, recebimentoCorrigido.Forma);
        Assert.AreEqual("nota corrigida", recebimentoCorrigido.Observacao);
        Assert.AreEqual(20_000, corrigidaNovamente.ValorTotalBase.Centavos);
        Assert.AreEqual("venda-correcao-parcela-1", corrigidaNovamente.Parcelas[0].Id);
        Assert.AreEqual(10_000, corrigidaNovamente.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual("venda-correcao-parcela-2", corrigidaNovamente.Parcelas[1].Id);
        Assert.AreEqual(10_000, corrigidaNovamente.Parcelas[1].ValorBase.Centavos);
        Assert.AreEqual("recebimento-2", corrigidaNovamente.Recebimentos[1].Id);
        Assert.AreEqual(10_000, corrigidaNovamente.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual("outro recebimento", corrigidaNovamente.Recebimentos[1].Observacao);
        Assert.AreEqual(20_500, corrigidaNovamente.Recebimentos.Sum(item => item.Valor.Centavos));
        Assert.AreEqual(500, corrigidaNovamente.Recebimentos.Sum(item => item.Acrescimo.Centavos));

        Assert.AreEqual(11_000, quitada.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual("nota original", quitada.Recebimentos[0].Observacao);
        Assert.AreEqual(new DateOnly(2027, 1, 15), quitada.Recebimentos[0].Data);
        Assert.AreEqual(2, quitada.Recebimentos.Count);
    }

    [TestMethod]
    public void CorrigirPagamento_Aceita20EscalaresENormalizaObservacaoAusente()
    {
        var vendaComPagamento = CriarVendaComIndividual();
        var observacao = string.Concat(Enumerable.Repeat("😀", 20));

        var comLimite = ObterSucesso(Corrigir(
            vendaComPagamento,
            "recebimento-individual",
            10_000,
            new DateOnly(2027, 2, 1),
            FormaPagamento.Pix,
            observacao));
        var semObservacao = ObterSucesso(Corrigir(
            comLimite,
            "recebimento-individual",
            10_000,
            new DateOnly(2027, 2, 1),
            FormaPagamento.Pix,
            null));

        Assert.AreEqual(observacao, comLimite.Recebimentos[0].Observacao);
        Assert.AreEqual(40, comLimite.Recebimentos[0].Observacao.Length);
        Assert.AreEqual("", semObservacao.Recebimentos[0].Observacao);
        Assert.AreEqual(1, semObservacao.Recebimentos.Count);
        Assert.AreEqual("recebimento-individual", semObservacao.Recebimentos[0].Id);
    }

    [TestMethod]
    public void CorrigirPagamento_RejeitaNotaLongaValorMenorFormaEDataSemMutacao()
    {
        var venda = CriarVendaComIndividual();
        var observacaoLonga = string.Concat(Enumerable.Repeat("😀", 21));
        var notaLonga = ObterFalha(Corrigir(
            venda,
            "recebimento-individual",
            10_000,
            observacao: observacaoLonga));
        var abaixoDaBase = ObterFalha(Corrigir(
            venda,
            "recebimento-individual",
            9_999));
        var formaInvalida = ObterFalha(Corrigir(
            venda,
            "recebimento-individual",
            10_000,
            forma: (FormaPagamento)999));
        var dataAnterior = ObterFalha(Corrigir(
            venda,
            "recebimento-individual",
            10_000,
            data: DataVenda.AddDays(-1)));
        var dataPosterior = ObterFalha(Corrigir(
            venda,
            "recebimento-individual",
            10_000,
            data: Referencia.AddDays(1)));

        Assert.AreEqual("observacao-longa-demais", notaLonga.Erro.Codigo);
        Assert.AreEqual("observacao", notaLonga.Erro.Campo);
        Assert.AreEqual("valor-recebido-inferior-ao-base", abaixoDaBase.Erro.Codigo);
        Assert.AreEqual("valorRecebido", abaixoDaBase.Erro.Campo);
        Assert.AreEqual("dados-recebimento-invalidos", formaInvalida.Erro.Codigo);
        Assert.AreEqual("dados-recebimento-invalidos", dataAnterior.Erro.Codigo);
        Assert.AreEqual("dados-recebimento-invalidos", dataPosterior.Erro.Codigo);
        Assert.AreEqual(1, venda.Recebimentos.Count);
        Assert.AreEqual(11_000, venda.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(1_000, venda.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual("nota original", venda.Recebimentos[0].Observacao);
    }

    [TestMethod]
    public void CorrigirPagamento_RejeitaEntradaELoteHistorico()
    {
        var entrada = CriarVendaComEntrada();
        var lote = CriarVendaComLote();

        var falhaEntrada = ObterFalha(Corrigir(
            entrada,
            "recebimento-entrada",
            5_000));
        var falhaLote = ObterFalha(Corrigir(
            lote,
            "recebimento-lote",
            10_000));

        Assert.AreEqual("recebimento-historico-nao-editavel", falhaEntrada.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, falhaEntrada.Erro.Categoria);
        Assert.AreEqual("recebimento-historico-nao-editavel", falhaLote.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, falhaLote.Erro.Categoria);
        Assert.AreEqual(OrigemRecebimento.Entrada, entrada.Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, lote.Recebimentos[0].Origem);
        Assert.AreEqual("recebimento-entrada", entrada.Recebimentos[0].Id);
        Assert.AreEqual("recebimento-lote", lote.Recebimentos[0].Id);
    }

    [TestMethod]
    public void CorrigirPagamento_DistingueRecebimentoInexistenteEDaOutraVenda()
    {
        var vendaAlvo = CriarVenda("venda-alvo");
        var vendaOutra = ObterSucesso(Registrar(
            CriarVenda("venda-outra"),
            "recebimento-outra",
            "venda-outra-parcela-1",
            10_000,
            DataVenda,
            FormaPagamento.Pix,
            ""));

        var inexistente = ObterFalha(Corrigir(
            vendaAlvo,
            "nao-existe",
            10_000));
        var deOutraVenda = ObterFalha(Corrigir(
            vendaAlvo,
            "recebimento-outra",
            10_000,
            vendasConhecidas: [vendaAlvo, vendaOutra]));

        Assert.AreEqual("recebimento-inexistente", inexistente.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Inexistencia, inexistente.Erro.Categoria);
        Assert.AreEqual("recebimento-de-outra-venda", deOutraVenda.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, deOutraVenda.Erro.Categoria);
        Assert.AreEqual(0, vendaAlvo.Recebimentos.Count);
        Assert.AreEqual(1, vendaOutra.Recebimentos.Count);
        Assert.AreEqual("recebimento-outra", vendaOutra.Recebimentos[0].Id);
    }

    [TestMethod]
    [DataRow(StatusAdministrativoVenda.Inativo)]
    [DataRow(StatusAdministrativoVenda.Prejuizo)]
    public void CorrigirPagamento_RejeitaVendaNaoAtivaSemAlterarHistorico(StatusAdministrativoVenda status)
    {
        var venda = CriarVendaComIndividual(status);

        var falha = ObterFalha(Corrigir(venda, "recebimento-individual", 10_500));

        Assert.AreEqual("venda-nao-ativa", falha.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, falha.Erro.Categoria);
        Assert.AreEqual(status, venda.StatusAdministrativo);
        Assert.AreEqual(1, venda.Recebimentos.Count);
        Assert.AreEqual(11_000, venda.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(1_000, venda.Recebimentos[0].Acrescimo.Centavos);
    }

    private static ResultadoDominio<Venda> Corrigir(
        Venda venda,
        string recebimentoId,
        long valor,
        DateOnly? data = null,
        FormaPagamento forma = FormaPagamento.Pix,
        string? observacao = null,
        IReadOnlyCollection<Venda>? vendasConhecidas = null) =>
        venda.CorrigirPagamento(
            recebimentoId,
            DinheiroValido(valor),
            data ?? DataVenda,
            forma,
            Referencia,
            vendasConhecidas ?? [venda],
            observacao);

    private static ResultadoDominio<Venda> Registrar(
        Venda venda,
        string recebimentoId,
        string parcelaId,
        long valor,
        DateOnly data,
        FormaPagamento forma,
        string observacao) =>
        venda.RegistrarPagamento(
            recebimentoId,
            parcelaId,
            DinheiroValido(valor),
            data,
            forma,
            Referencia,
            observacao);

    private static Venda CriarVenda(string id = "venda-correcao") => ObterSucesso(Venda.Cadastrar(
        id,
        ClienteValido(),
        DataVenda,
        DinheiroValido(20_000),
        2,
        [$"{id}-parcela-1", $"{id}-parcela-2"],
        Referencia));

    private static Venda CriarVendaComEntrada() => ObterSucesso(Venda.Cadastrar(
        "venda-com-entrada",
        ClienteValido(),
        DataVenda,
        DinheiroValido(20_000),
        2,
        ["entrada-parcela-1", "entrada-parcela-2"],
        Referencia,
        new DadosEntradaVenda(
            "recebimento-entrada",
            DinheiroValido(5_000),
            DataVenda,
            FormaPagamento.Dinheiro)));

    private static Venda CriarVendaComIndividual(StatusAdministrativoVenda status = StatusAdministrativoVenda.Ativo)
    {
        var dados = new DadosReconstrucaoVenda(
            "venda-com-individual",
            status,
            ClienteValido(),
            DataVenda,
            DinheiroValido(20_000),
            [
                new("individual-parcela-1", 1, DinheiroValido(10_000), new DateOnly(2027, 2, 15)),
                new("individual-parcela-2", 2, DinheiroValido(10_000), new DateOnly(2027, 3, 15))
            ],
            [
                new(
                    "recebimento-individual",
                    DataVenda,
                    FormaPagamento.Pix,
                    DinheiroValido(11_000),
                    OrigemRecebimento.Individual,
                    DinheiroValido(1_000),
                    "nota original",
                    [new("individual-parcela-1", DinheiroValido(11_000))])
            ]);

        return ObterSucesso(Venda.Reconstruir(dados, Referencia));
    }

    private static Venda CriarVendaComLote()
    {
        var dados = new DadosReconstrucaoVenda(
            "venda-com-lote",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            DataVenda,
            DinheiroValido(20_000),
            [
                new("lote-parcela-1", 1, DinheiroValido(10_000), new DateOnly(2027, 2, 15)),
                new("lote-parcela-2", 2, DinheiroValido(10_000), new DateOnly(2027, 3, 15))
            ],
            [
                new(
                    "recebimento-lote",
                    DataVenda,
                    FormaPagamento.Dinheiro,
                    DinheiroValido(10_000),
                    OrigemRecebimento.HistoricoLote,
                    default,
                    null,
                    [new("lote-parcela-1", DinheiroValido(10_000))])
            ]);

        return ObterSucesso(Venda.Reconstruir(dados, Referencia));
    }

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static Venda ObterSucesso(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<Venda>.Falha ObterFalha(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Falha>(resultado);
}
