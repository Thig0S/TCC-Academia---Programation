using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaEdicaoClienteTests
{
    [TestMethod]
    [DataRow(StatusAdministrativoVenda.Ativo, 0)]
    [DataRow(StatusAdministrativoVenda.Ativo, 1)]
    [DataRow(StatusAdministrativoVenda.Ativo, 2)]
    [DataRow(StatusAdministrativoVenda.Inativo, 1)]
    [DataRow(StatusAdministrativoVenda.Inativo, 2)]
    [DataRow(StatusAdministrativoVenda.Prejuizo, 0)]
    [DataRow(StatusAdministrativoVenda.Prejuizo, 1)]
    public void EditarCliente_AlteraSomenteQuatroCamposEPreservaContrato(
        StatusAdministrativoVenda status,
        int parcelasPagas)
    {
        var vendaOriginal = CriarVenda(status, parcelasPagas);
        var outraVenda = CriarVenda(StatusAdministrativoVenda.Ativo, 1, id: "outra-venda");

        var vendaEditada = ObterSucesso(vendaOriginal.EditarCliente(
            "  Novo Cliente  ",
            "987.654.321-00",
            " (21) 98765-4321 ",
            "  descrição atualizada  "));

        Assert.AreEqual("Novo Cliente", vendaEditada.Cliente.Nome);
        Assert.AreEqual("98765432100", vendaEditada.Cliente.Cpf);
        Assert.AreEqual("21987654321", vendaEditada.Cliente.Telefone);
        Assert.AreEqual("descrição atualizada", vendaEditada.Cliente.Descricao);
        Assert.AreEqual(status, vendaEditada.StatusAdministrativo);
        Assert.AreEqual(vendaOriginal.Id, vendaEditada.Id);
        Assert.AreEqual(vendaOriginal.DataVenda, vendaEditada.DataVenda);
        Assert.AreEqual(vendaOriginal.ValorTotalBase.Centavos, vendaEditada.ValorTotalBase.Centavos);
        CollectionAssert.AreEqual(
            vendaOriginal.Parcelas.Select(parcela => (parcela.Id, parcela.Numero, parcela.ValorBase.Centavos, parcela.Vencimento)).ToArray(),
            vendaEditada.Parcelas.Select(parcela => (parcela.Id, parcela.Numero, parcela.ValorBase.Centavos, parcela.Vencimento)).ToArray());
        CollectionAssert.AreEqual(
            vendaOriginal.Recebimentos.Select(recebimento => (recebimento.Id, recebimento.Data, recebimento.Valor.Centavos, recebimento.Origem)).ToArray(),
            vendaEditada.Recebimentos.Select(recebimento => (recebimento.Id, recebimento.Data, recebimento.Valor.Centavos, recebimento.Origem)).ToArray());

        Assert.AreEqual("Cliente Original", vendaOriginal.Cliente.Nome);
        Assert.AreEqual("Cliente Original", outraVenda.Cliente.Nome);
        Assert.AreEqual(1, outraVenda.Recebimentos.Count);
    }

    [TestMethod]
    public void EditarCliente_RejeitaIdentificacaoInvalidaSemAlterarOrigem()
    {
        var vendaOriginal = CriarVenda(StatusAdministrativoVenda.Ativo, 1);
        var cpfOriginal = vendaOriginal.Cliente.Cpf;
        var falha = ObterFalha(vendaOriginal.EditarCliente(
            "Novo Cliente",
            "12345678900",
            "11987654321",
            null));

        Assert.AreEqual("cpf-invalido", falha.Erro.Codigo);
        Assert.AreEqual("Cliente Original", vendaOriginal.Cliente.Nome);
        Assert.AreEqual(cpfOriginal, vendaOriginal.Cliente.Cpf);
        Assert.AreEqual(1, vendaOriginal.Recebimentos.Count);
    }

    [TestMethod]
    public void EditarCliente_NaoPropagaAlteracaoParaOutraVendaComMesmoCpf()
    {
        var primeira = CriarVenda(StatusAdministrativoVenda.Ativo, 0, id: "primeira");
        var segunda = CriarVenda(StatusAdministrativoVenda.Ativo, 0, id: "segunda");
        Assert.AreEqual(primeira.Cliente.Cpf, segunda.Cliente.Cpf);

        var atualizada = ObterSucesso(primeira.EditarCliente(
            "Cliente Individual",
            "98765432100",
            "11987654321",
            null));

        Assert.AreEqual("Cliente Individual", atualizada.Cliente.Nome);
        Assert.AreEqual("Cliente Original", segunda.Cliente.Nome);
        Assert.AreEqual("12345678909", segunda.Cliente.Cpf);
    }

    private static Venda CriarVenda(
        StatusAdministrativoVenda status,
        int parcelasPagas,
        string id = "venda-original")
    {
        var parcelas = new[]
        {
            new DadosReconstrucaoParcela("parcela-1", 1, DinheiroValido(10_000), new DateOnly(2027, 2, 15)),
            new DadosReconstrucaoParcela("parcela-2", 2, DinheiroValido(10_000), new DateOnly(2027, 3, 15))
        };
        var recebimentos = parcelasPagas == 0
            ? Array.Empty<DadosReconstrucaoRecebimento>()
            : new[]
            {
                new DadosReconstrucaoRecebimento(
                    "recebimento-historico",
                    new DateOnly(2027, 2, 20),
                    FormaPagamento.Dinheiro,
                    DinheiroValido(parcelasPagas * 10_000),
                    OrigemRecebimento.HistoricoLote,
                    default,
                    null,
                    parcelas.Take(parcelasPagas)
                        .Select(parcela => new DadosReconstrucaoAlocacao(parcela.Id, parcela.ValorBase))
                        .ToArray())
            };
        var dados = new DadosReconstrucaoVenda(
            id,
            status,
            ClienteValido(),
            new DateOnly(2027, 1, 15),
            DinheiroValido(20_000),
            parcelas,
            recebimentos);

        return ObterSucesso(Venda.Reconstruir(dados, new DateOnly(2027, 3, 15)));
    }

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Original", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static Venda ObterSucesso(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<Venda>.Falha ObterFalha(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Falha>(resultado);
}
