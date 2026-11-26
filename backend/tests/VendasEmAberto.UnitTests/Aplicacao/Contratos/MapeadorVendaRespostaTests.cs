using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Contratos;

[TestClass]
public sealed class MapeadorVendaRespostaTests
{
    [TestMethod]
    public void MapearDetalhe_PreservaCentavosDatasNulabilidadeEnumsEOrdemSemExporDominio()
    {
        var referencia = new DateOnly(2027, 3, 20);
        var venda = CriarVenda();
        var projecao = Sucesso(venda.Projetar(referencia));

        var resposta = MapeadorVendaResposta.MapearDetalhe(venda, projecao, 7, referencia);

        Assert.AreEqual("venda-1", resposta.Resumo.Id);
        Assert.AreEqual("Ana da Silva", resposta.Resumo.Cliente.Nome);
        Assert.AreEqual("52998224725", resposta.Resumo.Cliente.Cpf);
        Assert.AreEqual("11987654321", resposta.Resumo.Cliente.Telefone);
        Assert.IsNull(resposta.Resumo.Cliente.Descricao);
        Assert.AreEqual(new DateOnly(2027, 1, 15), resposta.Resumo.DataVenda);
        Assert.AreEqual(10_001L, resposta.Resumo.ValorTotalBaseCentavos);
        Assert.AreEqual(0L, resposta.Resumo.TotalAcrescimosCentavos);
        Assert.AreEqual(10_001L, resposta.Resumo.ValorTotalEfetivoCentavos);
        Assert.AreEqual(0L, resposta.Resumo.TotalRecebidoCentavos);
        Assert.AreEqual(10_001L, resposta.Resumo.SaldoCentavos);
        Assert.AreEqual(7L, resposta.Resumo.Revisao);
        Assert.AreEqual(referencia, resposta.Resumo.Referencia);
        Assert.AreEqual(StatusAdministrativoResposta.Ativo, resposta.Resumo.StatusAdministrativo);
        Assert.AreEqual(SituacaoVendaResposta.Atrasada, resposta.Resumo.Situacao);
        Assert.AreEqual("venda-1-parcela-1", resposta.Parcelas[0].Id);
        Assert.AreEqual(10_001L, resposta.Parcelas[0].ValorBaseCentavos);
        Assert.AreEqual(SituacaoParcelaResposta.Atrasada, resposta.Parcelas[0].Situacao);
        Assert.IsNull(resposta.Parcelas[0].DataPagamento);
        Assert.IsNull(resposta.Parcelas[0].FormaPagamento);
        Assert.AreEqual(0, resposta.Recebimentos.Count);

        Assert.IsFalse(typeof(VendaDetalheResposta).Assembly.GetReferencedAssemblies()
            .Any(assembly => assembly.Name?.Contains("EntityFramework", StringComparison.Ordinal) == true));
        AssertDtoTypesAreApplicationOwned();
    }

    [TestMethod]
    public void MapearDetalhe_ProtegeColecoesDeEntradaEDeSaidaContraMutacao()
    {
        var listaParcelas = new List<ParcelaDetalheResposta>
        {
            new("p1", 1, 100, 0, 100, 0, 100, new DateOnly(2027, 2, 15), SituacaoParcelaResposta.EmAberto, null, null)
        };
        var listaAlocacoes = new List<AlocacaoResposta> { new("p1", 100) };
        var listaRecebimentos = new List<RecebimentoDetalheResposta>
        {
            new("r1", new DateOnly(2027, 1, 15), FormaPagamentoResposta.Pix,
                OrigemRecebimentoResposta.Entrada, 100, 0, "", listaAlocacoes)
        };
        var resumo = new VendaResumoResposta(
            "v1", new ClienteResposta("Nome", "cpf", "telefone", null), new DateOnly(2027, 1, 15),
            StatusAdministrativoResposta.Ativo, SituacaoVendaResposta.EmAberto,
            100, 0, 100, 0, 100, 0, 1, null, 1, new DateOnly(2027, 1, 15));
        var detalhe = new VendaDetalheResposta(resumo, listaParcelas, listaRecebimentos);

        listaParcelas.Clear();
        listaRecebimentos.Clear();
        listaAlocacoes.Clear();

        Assert.AreEqual(1, detalhe.Parcelas.Count);
        Assert.AreEqual(1, detalhe.Recebimentos.Count);
        Assert.AreEqual(1, detalhe.Recebimentos[0].Alocacoes.Count);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<ParcelaDetalheResposta>)detalhe.Parcelas).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<RecebimentoDetalheResposta>)detalhe.Recebimentos).Clear());
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<AlocacaoResposta>)detalhe.Recebimentos[0].Alocacoes).Clear());
    }

    [TestMethod]
    public void MapearResumo_RejeitaProjecaoDeOutraVenda()
    {
        var venda = CriarVenda();
        var outra = CriarVenda("outra-venda");
        var projecao = Sucesso(outra.Projetar(new DateOnly(2027, 3, 20)));

        Assert.ThrowsExactly<InvalidOperationException>(() =>
            MapeadorVendaResposta.MapearResumo(venda, projecao, 0, new DateOnly(2027, 3, 20)));
    }

    private static Venda CriarVenda(string id = "venda-1")
    {
        var cliente = Sucesso(DadosClienteVenda.Criar(" Ana da Silva ", "529.982.247-25", "(11) 98765-4321", null));
        var total = Sucesso(Dinheiro.Criar(10_001));
        return Sucesso(Venda.Cadastrar(
            id,
            cliente,
            new DateOnly(2027, 1, 15),
            total,
            1,
            [$"{id}-parcela-1"],
            new DateOnly(2027, 3, 20)));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private static void AssertDtoTypesAreApplicationOwned()
    {
        var tipos = new[]
        {
            typeof(ClienteResposta), typeof(VendaResumoResposta), typeof(VendaDetalheResposta),
            typeof(ParcelaDetalheResposta), typeof(RecebimentoDetalheResposta), typeof(AlocacaoResposta)
        };

        foreach (var tipo in tipos)
        {
            Assert.StartsWith("VendasEmAberto.Aplicacao.Contratos", tipo.Namespace);
            foreach (var propriedade in tipo.GetProperties())
            {
                var tipoPropriedade = propriedade.PropertyType;
                if (tipoPropriedade.IsGenericType)
                {
                    tipoPropriedade = tipoPropriedade.GetGenericArguments().Single();
                }

                Assert.IsFalse(tipoPropriedade.Namespace?.Contains("Dominio", StringComparison.Ordinal) == true);
                Assert.IsFalse(tipoPropriedade.Namespace?.Contains("EntityFramework", StringComparison.Ordinal) == true);
                Assert.IsFalse(tipoPropriedade.Namespace?.Contains("AspNetCore", StringComparison.Ordinal) == true);
                Assert.AreNotEqual("FluentResults", tipoPropriedade.Namespace);
            }
        }
    }
}
