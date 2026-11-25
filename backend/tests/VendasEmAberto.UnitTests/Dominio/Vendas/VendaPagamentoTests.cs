using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaPagamentoTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 2, 15);

    [TestMethod]
    [DataRow(FormaPagamento.Dinheiro)]
    [DataRow(FormaPagamento.Pix)]
    [DataRow(FormaPagamento.CartaoDebito)]
    [DataRow(FormaPagamento.CartaoCredito)]
    public void RegistrarPagamento_AceitaFormaVigenteEValorBase(FormaPagamento forma)
    {
        var vendaOriginal = CriarVenda();

        var vendaAtualizada = ObterSucesso(Registrar(vendaOriginal, forma: forma));

        Assert.AreEqual(1, vendaAtualizada.Recebimentos.Count);
        Assert.AreEqual("recebimento-novo", vendaAtualizada.Recebimentos[0].Id);
        Assert.AreEqual(OrigemRecebimento.Individual, vendaAtualizada.Recebimentos[0].Origem);
        Assert.AreEqual(forma, vendaAtualizada.Recebimentos[0].Forma);
        Assert.AreEqual(10_000, vendaAtualizada.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(0, vendaAtualizada.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual("parcela-1", vendaAtualizada.Recebimentos[0].Alocacoes.Single().ParcelaId);
        Assert.AreEqual(0, vendaOriginal.Recebimentos.Count);
    }

    [TestMethod]
    public void RegistrarPagamento_ComAcrescimoNaoAlteraBaseNemSaldoDeParcelasFuturas()
    {
        var vendaOriginal = CriarVenda();

        var vendaAtualizada = ObterSucesso(Registrar(
            vendaOriginal,
            valor: 11_000,
            referencia: Referencia));

        Assert.AreEqual(20_000, vendaAtualizada.ValorTotalBase.Centavos);
        Assert.AreEqual(10_000, vendaAtualizada.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual(10_000, vendaAtualizada.Parcelas[1].ValorBase.Centavos);
        Assert.AreEqual(1_000, vendaAtualizada.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual(11_000, vendaAtualizada.Recebimentos[0].Alocacoes[0].Valor.Centavos);
        Assert.AreEqual(10_000, vendaAtualizada.Parcelas[1].ValorBase.Centavos);
        Assert.AreEqual(10_000, vendaOriginal.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual(0, vendaOriginal.Recebimentos.Count);
    }

    [TestMethod]
    public void RegistrarPagamento_AceitaAsBordasDeDataDaVendaEReferencia()
    {
        var naVenda = ObterSucesso(Registrar(CriarVenda(), data: DataVenda));
        var naReferencia = ObterSucesso(Registrar(CriarVenda(), data: Referencia));

        Assert.AreEqual(DataVenda, naVenda.Recebimentos[0].Data);
        Assert.AreEqual(Referencia, naReferencia.Recebimentos[0].Data);
    }

    [TestMethod]
    public void RegistrarPagamento_RejeitaValorMenorFormaEDataInvalidas()
    {
        var venda = CriarVenda();
        var valorMenor = ObterFalha(Registrar(venda, valor: 9_999));
        var formaInvalida = ObterFalha(Registrar(venda, forma: (FormaPagamento)999));
        var dataAnterior = ObterFalha(Registrar(venda, data: DataVenda.AddDays(-1)));
        var dataPosterior = ObterFalha(Registrar(venda, data: Referencia.AddDays(1)));

        Assert.AreEqual("valor-recebido-inferior-ao-base", valorMenor.Erro.Codigo);
        Assert.AreEqual("valorRecebido", valorMenor.Erro.Campo);
        Assert.AreEqual("dados-recebimento-invalidos", formaInvalida.Erro.Codigo);
        Assert.AreEqual("dados-recebimento-invalidos", dataAnterior.Erro.Codigo);
        Assert.AreEqual("dados-recebimento-invalidos", dataPosterior.Erro.Codigo);
        Assert.AreEqual(0, venda.Recebimentos.Count);
    }

    [TestMethod]
    public void RegistrarPagamento_RejeitaSaltoEntradaPagaERepeticaoSemAvancarAlvo()
    {
        var venda = CriarVenda();
        var salto = ObterFalha(Registrar(venda, parcelaId: "parcela-2"));
        var vendaComEntrada = CriarVenda(comEntrada: true);
        var entradaPaga = ObterFalha(Registrar(vendaComEntrada, parcelaId: "parcela-1"));

        var primeiraBaixa = ObterSucesso(Registrar(venda));
        var repetida = ObterFalha(Registrar(
            primeiraBaixa,
            recebimentoId: "recebimento-segundo",
            parcelaId: "parcela-1"));

        Assert.AreEqual("selecao-nao-sequencial", salto.Erro.Codigo);
        Assert.AreEqual("selecao-nao-sequencial", entradaPaga.Erro.Codigo);
        Assert.AreEqual("selecao-nao-sequencial", repetida.Erro.Codigo);
        Assert.AreEqual(1, primeiraBaixa.Recebimentos.Count);
        Assert.AreEqual(0, venda.Recebimentos.Count);
    }

    [TestMethod]
    [DataRow(StatusAdministrativoVenda.Inativo)]
    [DataRow(StatusAdministrativoVenda.Prejuizo)]
    public void RegistrarPagamento_RejeitaVendaNaoAtiva(StatusAdministrativoVenda status)
    {
        var falha = ObterFalha(Registrar(CriarVenda(status)));

        Assert.AreEqual("venda-nao-ativa", falha.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, falha.Erro.Categoria);
    }

    [TestMethod]
    public void RegistrarPagamento_RejeitaIdentidadeVaziaOuEmUso()
    {
        var venda = CriarVenda();
        var vazia = ObterFalha(Registrar(venda, recebimentoId: ""));
        var igualVenda = ObterFalha(Registrar(venda, recebimentoId: venda.Id));
        var igualParcela = ObterFalha(Registrar(venda, recebimentoId: "parcela-1"));
        var comEntrada = CriarVenda(comEntrada: true);
        var igualRecebimento = ObterFalha(Registrar(comEntrada, recebimentoId: "recebimento-entrada"));

        Assert.AreEqual("identificador-invalido", vazia.Erro.Codigo);
        Assert.AreEqual("identificador-duplicado", igualVenda.Erro.Codigo);
        Assert.AreEqual("identificador-duplicado", igualParcela.Erro.Codigo);
        Assert.AreEqual("identificador-duplicado", igualRecebimento.Erro.Codigo);
    }

    private static ResultadoDominio<Venda> Registrar(
        Venda venda,
        string recebimentoId = "recebimento-novo",
        string parcelaId = "parcela-1",
        long valor = 10_000,
        DateOnly? data = null,
        FormaPagamento forma = FormaPagamento.Pix,
        DateOnly? referencia = null) =>
        venda.RegistrarPagamento(
            recebimentoId,
            parcelaId,
            DinheiroValido(valor),
            data ?? DataVenda,
            forma,
            referencia ?? Referencia);

    private static Venda CriarVenda(
        StatusAdministrativoVenda status = StatusAdministrativoVenda.Ativo,
        bool comEntrada = false)
    {
        if (status == StatusAdministrativoVenda.Ativo)
        {
            var resultado = Venda.Cadastrar(
                "venda-pagamento",
                ClienteValido(),
                DataVenda,
                DinheiroValido(20_000),
                2,
                ["parcela-1", "parcela-2"],
                Referencia,
                comEntrada
                    ? new DadosEntradaVenda("recebimento-entrada", DinheiroValido(5_000), DataVenda, FormaPagamento.Dinheiro)
                    : null);
            return ObterSucesso(resultado);
        }

        var dados = new DadosReconstrucaoVenda(
            "venda-pagamento",
            status,
            ClienteValido(),
            DataVenda,
            DinheiroValido(20_000),
            [
                new("parcela-1", 1, DinheiroValido(10_000), new DateOnly(2027, 2, 15)),
                new("parcela-2", 2, DinheiroValido(10_000), new DateOnly(2027, 3, 15))
            ],
            []);
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
