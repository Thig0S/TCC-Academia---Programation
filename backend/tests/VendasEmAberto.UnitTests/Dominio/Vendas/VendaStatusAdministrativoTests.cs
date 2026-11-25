using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaStatusAdministrativoTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 2, 28);

    [TestMethod]
    public void AlterarStatusAdministrativo_AplicaMatrizPermitidaSemAlterarHistorico()
    {
        var original = CriarVendaParcialComEntrada();
        var outraVenda = CriarVenda("outra-venda");

        var inativa = ObterSucesso(original.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var reativada = ObterSucesso(inativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo));
        var prejuizo = ObterSucesso(reativada.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var reaberta = ObterSucesso(prejuizo.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo));

        Assert.AreEqual(StatusAdministrativoVenda.Inativo, inativa.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, reativada.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, prejuizo.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, reaberta.StatusAdministrativo);
        AssertEstadoFinanceiroIgual(original, inativa);
        AssertEstadoFinanceiroIgual(original, reativada);
        AssertEstadoFinanceiroIgual(original, prejuizo);
        AssertEstadoFinanceiroIgual(original, reaberta);
        Assert.AreEqual(2, reaberta.Recebimentos.Count);
        Assert.AreEqual(OrigemRecebimento.Entrada, reaberta.Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.Individual, reaberta.Recebimentos[1].Origem);
        Assert.AreEqual(0, outraVenda.Recebimentos.Count);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, outraVenda.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, original.StatusAdministrativo);
    }

    [TestMethod]
    public void AlterarStatusAdministrativo_StatusAtualEhNoOpParaTodosOsEstados()
    {
        var ativa = CriarVendaParcialComEntrada();
        var inativa = ObterSucesso(ativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizo = ObterSucesso(ativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        var ativoSemMudanca = ObterSucesso(ativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo));
        var inativoSemMudanca = ObterSucesso(inativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoSemMudanca = ObterSucesso(prejuizo.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));

        Assert.AreSame(ativa, ativoSemMudanca);
        Assert.AreSame(inativa, inativoSemMudanca);
        Assert.AreSame(prejuizo, prejuizoSemMudanca);
    }

    [TestMethod]
    public void AlterarStatusAdministrativo_RejeitaTransicaoDiretaStatusInvalidoEPrejuizoQuitado()
    {
        var ativa = CriarVendaParcialComEntrada();
        var inativa = ObterSucesso(ativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizo = ObterSucesso(ativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var quitada = CriarVendaQuitada();

        var inativoParaPrejuizo = ObterFalha(inativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var prejuizoParaInativo = ObterFalha(prejuizo.AlterarStatusAdministrativo(StatusAdministrativoVenda.Inativo));
        var prejuizoSemSaldo = ObterFalha(quitada.AlterarStatusAdministrativo(StatusAdministrativoVenda.Prejuizo));
        var statusInvalido = ObterFalha(ativa.AlterarStatusAdministrativo((StatusAdministrativoVenda)999));

        Assert.AreEqual("transicao-nao-permitida", inativoParaPrejuizo.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, inativoParaPrejuizo.Erro.Categoria);
        Assert.AreEqual("transicao-nao-permitida", prejuizoParaInativo.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.RegraNegocio, prejuizoParaInativo.Erro.Categoria);
        Assert.AreEqual("transicao-nao-permitida", prejuizoSemSaldo.Erro.Codigo);
        Assert.AreEqual("status-invalido", statusInvalido.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Validacao, statusInvalido.Erro.Categoria);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, inativa.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Prejuizo, prejuizo.StatusAdministrativo);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, quitada.StatusAdministrativo);
        Assert.AreEqual(2, prejuizo.Recebimentos.Count);
        Assert.AreEqual(2, quitada.Recebimentos.Count);
        AssertEstadoFinanceiroIgual(ativa, inativa);
        AssertEstadoFinanceiroIgual(ativa, prejuizo);
        Assert.AreEqual("quitada-recebimento-1", quitada.Recebimentos[0].Id);
        Assert.AreEqual("quitada-recebimento-2", quitada.Recebimentos[1].Id);
        Assert.AreEqual(20_000, quitada.ValorTotalBase.Centavos);
    }

    private static Venda CriarVendaParcialComEntrada()
    {
        var venda = ObterSucesso(Venda.Cadastrar(
            "venda-status",
            ClienteValido(),
            DataVenda,
            DinheiroValido(30_000),
            3,
            ["status-parcela-1", "status-parcela-2", "status-parcela-3"],
            Referencia,
            new DadosEntradaVenda(
                "status-entrada",
                DinheiroValido(10_000),
                DataVenda,
                FormaPagamento.Dinheiro)));

        return ObterSucesso(venda.RegistrarPagamento(
            "status-individual",
            "status-parcela-2",
            DinheiroValido(11_000),
            new DateOnly(2027, 1, 20),
            FormaPagamento.Pix,
            Referencia,
            "nota preservada"));
    }

    private static Venda CriarVendaQuitada()
    {
        var venda = CriarVenda("venda-quitada");
        var primeira = ObterSucesso(venda.RegistrarPagamento(
            "quitada-recebimento-1",
            "venda-quitada-parcela-1",
            DinheiroValido(10_000),
            DataVenda,
            FormaPagamento.Pix,
            Referencia));
        return ObterSucesso(primeira.RegistrarPagamento(
            "quitada-recebimento-2",
            "venda-quitada-parcela-2",
            DinheiroValido(10_000),
            DataVenda,
            FormaPagamento.Pix,
            Referencia));
    }

    private static Venda CriarVenda(string id) => ObterSucesso(Venda.Cadastrar(
        id,
        ClienteValido(),
        DataVenda,
        DinheiroValido(20_000),
        2,
        [$"{id}-parcela-1", $"{id}-parcela-2"],
        Referencia));

    private static void AssertEstadoFinanceiroIgual(Venda original, Venda atualizada)
    {
        Assert.AreEqual(original.Id, atualizada.Id);
        Assert.AreSame(original.Cliente, atualizada.Cliente);
        Assert.AreEqual(original.DataVenda, atualizada.DataVenda);
        Assert.AreEqual(original.ValorTotalBase, atualizada.ValorTotalBase);
        CollectionAssert.AreEqual(original.Parcelas.ToArray(), atualizada.Parcelas.ToArray());
        CollectionAssert.AreEqual(original.Recebimentos.ToArray(), atualizada.Recebimentos.ToArray());
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
