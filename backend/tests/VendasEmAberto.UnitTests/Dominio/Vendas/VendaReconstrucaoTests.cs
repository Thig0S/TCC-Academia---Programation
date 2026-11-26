using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Dominio.Vendas;

[TestClass]
public sealed class VendaReconstrucaoTests
{
    private static readonly DateOnly DataVenda = new(2027, 1, 15);
    private static readonly DateOnly Referencia = new(2027, 3, 15);

    [TestMethod]
    public void Reconstruir_AceitaHistoricoEmLoteDeUmaParcela()
    {
        var dados = CriarDadosSemEntrada();

        var venda = ObterSucesso(Venda.Reconstruir(dados, Referencia));

        Assert.AreEqual(3, venda.Parcelas.Count);
        Assert.AreEqual(1, venda.Recebimentos.Count);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, venda.Recebimentos[0].Origem);
        Assert.AreEqual(10_000, venda.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual("parcela-1", venda.Recebimentos[0].Alocacoes[0].ParcelaId);
    }

    [TestMethod]
    public void Reconstruir_AceitaEntradaELoteHistoricoDeDuasParcelas()
    {
        var venda = ObterSucesso(Venda.Reconstruir(CriarDadosComEntradaELote(), Referencia));

        Assert.AreEqual(10, venda.Parcelas.Count);
        Assert.AreEqual(2, venda.Recebimentos.Count);
        Assert.AreEqual(OrigemRecebimento.Entrada, venda.Recebimentos[0].Origem);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, venda.Recebimentos[1].Origem);
        Assert.AreEqual(20_000, venda.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(40_000, venda.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(3, venda.Recebimentos.Sum(recebimento => recebimento.Alocacoes.Count));
        Assert.AreEqual(60_000, venda.Recebimentos.Sum(recebimento => recebimento.Valor.Centavos));
        Assert.AreEqual(200_000, venda.Parcelas.Sum(parcela => parcela.ValorBase.Centavos));
        Assert.AreEqual(140_000, venda.ValorTotalBase.Centavos - venda.Recebimentos.Sum(recebimento => recebimento.Valor.Centavos));
        Assert.AreEqual("parcela-4", venda.Parcelas[3].Id);
        Assert.AreEqual(new DateOnly(2027, 4, 15), venda.Parcelas[3].Vencimento);
    }

    [TestMethod]
    public void Reconstruir_RejeitaSaltoEAlocacaoSemVinculo()
    {
        var dados = CriarDadosComEntradaELote();
        var recebimentosSalto = dados.Recebimentos.ToArray();
        recebimentosSalto[1] = recebimentosSalto[1] with
        {
            Alocacoes = [new("parcela-3", DinheiroValido(20_000))],
            Valor = DinheiroValido(20_000)
        };
        var salto = ObterFalha(Venda.Reconstruir(dados with { Recebimentos = recebimentosSalto }, Referencia));

        var recebimentosSemVinculo = dados.Recebimentos.ToArray();
        recebimentosSemVinculo[1] = recebimentosSemVinculo[1] with
        {
            Alocacoes = [new("parcela-de-outra-venda", DinheiroValido(20_000))],
            Valor = DinheiroValido(20_000)
        };
        var semVinculo = ObterFalha(Venda.Reconstruir(
            dados with { Recebimentos = recebimentosSemVinculo },
            Referencia));

        Assert.AreEqual("historico-invalido", salto.Erro.Codigo);
        Assert.AreEqual("historico-invalido", semVinculo.Erro.Codigo);
    }

    [TestMethod]
    public void Reconstruir_RejeitaPagamentoDuplicadoEValorNaoReconciliado()
    {
        var dados = CriarDadosComEntradaELote();
        var recebimentoDuplicado = new DadosReconstrucaoRecebimento(
            "recebimento-duplicado",
            new DateOnly(2027, 3, 1),
            FormaPagamento.Pix,
            DinheiroValido(20_000),
            OrigemRecebimento.HistoricoLote,
            default,
            null,
            [new("parcela-2", DinheiroValido(20_000))]);
        var duplicado = ObterFalha(Venda.Reconstruir(
            dados with { Recebimentos = [.. dados.Recebimentos, recebimentoDuplicado] },
            Referencia));

        var loteInconsistente = dados.Recebimentos.ToArray();
        loteInconsistente[1] = loteInconsistente[1] with { Valor = DinheiroValido(30_000) };
        var somaInconsistente = ObterFalha(Venda.Reconstruir(
            dados with { Recebimentos = loteInconsistente },
            Referencia));

        Assert.AreEqual("historico-invalido", duplicado.Erro.Codigo);
        Assert.AreEqual("historico-invalido", somaInconsistente.Erro.Codigo);
        Assert.IsNull(typeof(ResultadoDominio<Venda>.Falha).GetProperty("Valor"));
    }

    [TestMethod]
    public void Reconstruir_RejeitaAlocacaoIndividualDiferenteDoValorEfetivo()
    {
        var individualInconsistente = new DadosReconstrucaoRecebimento(
            "individual-inconsistente",
            new DateOnly(2027, 2, 1),
            FormaPagamento.Pix,
            DinheiroValido(11_000),
            OrigemRecebimento.Individual,
            DinheiroValido(1_000),
            "nota",
            [new("parcela-1", DinheiroValido(10_000))]);
        var falha = ObterFalha(Venda.Reconstruir(
            CriarDadosSemEntrada() with { Recebimentos = [individualInconsistente] },
            Referencia));

        Assert.AreEqual("historico-invalido", falha.Erro.Codigo);
        Assert.AreEqual("recebimentos", falha.Erro.Campo);
    }

    [TestMethod]
    public void Reconstruir_RejeitaAlocacaoDeEntradaDeUmCentavo()
    {
        VerificarAlocacaoEntradaInvalida(1);
    }

    [TestMethod]
    public void Reconstruir_RejeitaAlocacaoDeEntradaAbaixoDoValorRecebido()
    {
        VerificarAlocacaoEntradaInvalida(9_999);
    }

    [TestMethod]
    public void Reconstruir_RejeitaAlocacaoDeEntradaAcimaDoValorRecebido()
    {
        VerificarAlocacaoEntradaInvalida(10_001);
    }

    private static void VerificarAlocacaoEntradaInvalida(long centavosAlocados)
    {
        var dadosOriginais = CriarDadosComEntradaDeDuasParcelas(centavosAlocados);
        var recebimentosOriginais = dadosOriginais.Recebimentos.ToArray();
        var alocacoesOriginais = dadosOriginais.Recebimentos[0].Alocacoes.ToArray();

        var resultado = Venda.Reconstruir(dadosOriginais, Referencia);

        var falha = Assert.IsInstanceOfType<ResultadoDominio<Venda>.Falha>(resultado).Erro;
        Assert.AreEqual(CategoriaErroDominio.Validacao, falha.Categoria);
        Assert.AreEqual("historico-invalido", falha.Codigo);
        Assert.AreEqual("recebimentos.alocacoes", falha.Campo);
        Assert.AreEqual("O recebimento da entrada não corresponde à primeira parcela.", falha.Mensagem);
        Assert.IsNull(typeof(ResultadoDominio<Venda>.Falha).GetProperty("Valor"));
        Assert.AreEqual(10_000, dadosOriginais.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(centavosAlocados, dadosOriginais.Recebimentos[0].Alocacoes[0].Valor.Centavos);
        CollectionAssert.AreEqual(recebimentosOriginais, dadosOriginais.Recebimentos.ToArray());
        CollectionAssert.AreEqual(alocacoesOriginais, dadosOriginais.Recebimentos[0].Alocacoes.ToArray());
    }

    [TestMethod]
    public void Reconstruir_AceitaEntradaExataEConciliaProjecaoConjuntoEPeriodo()
    {
        var dadosOriginais = CriarDadosComEntradaDeDuasParcelas(10_000);
        var recebimentosOriginais = dadosOriginais.Recebimentos.ToArray();
        var alocacoesOriginais = dadosOriginais.Recebimentos[0].Alocacoes.ToArray();
        var vendaExistente = ObterSucesso(Venda.Reconstruir(CriarDadosSemEntrada(), Referencia));
        var conjuntoAnterior = ObterSucesso(ConjuntoVendas.Criar([vendaExistente]));

        var venda = ObterSucesso(Venda.Reconstruir(dadosOriginais, Referencia));
        var projecao = ObterSucesso(venda.Projetar(Referencia));
        var conjuntoAceito = ObterSucesso(conjuntoAnterior.AceitarCandidato(
            conjuntoAnterior.Vendas.Append(venda)));
        var periodo = ObterSucesso(conjuntoAceito.ConsultarPeriodo(
            new DateOnly(2027, 1, 1),
            new DateOnly(2027, 1, 31)));

        Assert.AreEqual("venda-entrada-duas-parcelas", venda.Id);
        Assert.AreEqual(OrigemRecebimento.Entrada, venda.Recebimentos[0].Origem);
        Assert.AreEqual("recebimento-entrada-duas-parcelas", venda.Recebimentos[0].Id);
        Assert.AreEqual("parcela-entrada-duas-parcelas", venda.Recebimentos[0].Alocacoes[0].ParcelaId);
        Assert.AreEqual(10_000, venda.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(10_000, venda.Recebimentos[0].Alocacoes[0].Valor.Centavos);
        Assert.AreEqual(20_000, projecao.ValorTotalBase.Centavos);
        Assert.AreEqual(20_000, projecao.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(10_000, projecao.TotalRecebido.Centavos);
        Assert.AreEqual(10_000, projecao.Saldo.Centavos);
        Assert.AreEqual(1, projecao.QuantidadePaga);
        Assert.AreEqual(2, projecao.QuantidadeParcelas);
        Assert.AreEqual(1, conjuntoAnterior.Vendas.Count);
        Assert.AreSame(vendaExistente, conjuntoAnterior.Vendas[0]);
        Assert.AreEqual(2, conjuntoAceito.Vendas.Count);
        Assert.AreEqual(10_000, periodo.Recebidos.Centavos);
        Assert.AreEqual(2, periodo.Vendas.Count);
        CollectionAssert.AreEqual(
            new[] { vendaExistente.Id, venda.Id },
            periodo.Vendas.Select(item => item.Id).ToArray());
        CollectionAssert.AreEqual(recebimentosOriginais, dadosOriginais.Recebimentos.ToArray());
        CollectionAssert.AreEqual(alocacoesOriginais, dadosOriginais.Recebimentos[0].Alocacoes.ToArray());
    }

    [TestMethod]
    public void Reconstruir_RejeitaDataFormaEIdentificadoresInvalidos()
    {
        var dados = CriarDadosComEntradaELote();
        var dataInvalida = dados.Recebimentos.ToArray();
        dataInvalida[1] = dataInvalida[1] with { Data = new DateOnly(2027, 1, 14) };
        var falhaData = ObterFalha(Venda.Reconstruir(dados with { Recebimentos = dataInvalida }, Referencia));

        var formaInvalida = dados.Recebimentos.ToArray();
        formaInvalida[1] = formaInvalida[1] with { Forma = (FormaPagamento)999 };
        var falhaForma = ObterFalha(Venda.Reconstruir(dados with { Recebimentos = formaInvalida }, Referencia));

        var idsInvalidos = dados.Parcelas.ToArray();
        idsInvalidos[0] = idsInvalidos[0] with { Id = "" };
        var falhaIdVazio = ObterFalha(Venda.Reconstruir(dados with { Parcelas = idsInvalidos }, Referencia));

        var idsDuplicados = dados.Parcelas.ToArray();
        idsDuplicados[0] = idsDuplicados[0] with { Id = "venda-sintetica" };
        var falhaIdDuplicado = ObterFalha(Venda.Reconstruir(dados with { Parcelas = idsDuplicados }, Referencia));

        Assert.AreEqual("dados-recebimento-invalidos", falhaData.Erro.Codigo);
        Assert.AreEqual("dados-recebimento-invalidos", falhaForma.Erro.Codigo);
        Assert.AreEqual("identificador-invalido", falhaIdVazio.Erro.Codigo);
        Assert.AreEqual("identificador-duplicado", falhaIdDuplicado.Erro.Codigo);
        Assert.AreEqual(CategoriaErroDominio.Conflito, falhaIdDuplicado.Erro.Categoria);
    }

    [TestMethod]
    public void Reconstruir_CopiaEntradasEProtegeAlocacoesDeSaida()
    {
        var parcelas = CriarDadosSemEntrada().Parcelas.ToArray();
        var alocacoes = new[] { new DadosReconstrucaoAlocacao("parcela-1", DinheiroValido(10_000)) };
        var recebimento = new DadosReconstrucaoRecebimento(
            "lote-sintetico",
            new DateOnly(2027, 2, 1),
            FormaPagamento.Dinheiro,
            DinheiroValido(10_000),
            OrigemRecebimento.HistoricoLote,
            default,
            null,
            alocacoes);
        var recebimentos = new[] { recebimento };
        var dados = CriarDadosSemEntrada() with { Parcelas = parcelas, Recebimentos = recebimentos };
        var venda = ObterSucesso(Venda.Reconstruir(dados, Referencia));

        parcelas[0] = parcelas[0] with { Id = "parcela-alterada" };
        alocacoes[0] = new("parcela-alterada", DinheiroValido(1));
        recebimentos[0] = recebimentos[0] with { Id = "recebimento-alterado" };

        Assert.AreEqual("parcela-1", venda.Parcelas[0].Id);
        Assert.AreEqual("lote-sintetico", venda.Recebimentos[0].Id);
        Assert.AreEqual("parcela-1", venda.Recebimentos[0].Alocacoes[0].ParcelaId);
        Assert.ThrowsExactly<NotSupportedException>(() =>
            ((IList<AlocacaoPagamento>)venda.Recebimentos[0].Alocacoes)[0] = venda.Recebimentos[0].Alocacoes[0]);
    }

    private static DadosReconstrucaoVenda CriarDadosSemEntrada()
    {
        var parcelas = Enumerable.Range(1, 3)
            .Select(numero => new DadosReconstrucaoParcela(
                $"parcela-{numero}",
                numero,
                DinheiroValido(10_000),
                new DateOnly(2027, numero + 1, 15)))
            .ToArray();
        var recebimento = new DadosReconstrucaoRecebimento(
            "lote-uma-parcela",
            new DateOnly(2027, 2, 20),
            FormaPagamento.Dinheiro,
            DinheiroValido(10_000),
            OrigemRecebimento.HistoricoLote,
            default,
            null,
            [new("parcela-1", DinheiroValido(10_000))]);

        return new DadosReconstrucaoVenda(
            "venda-sintetica",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            DataVenda,
            DinheiroValido(30_000),
            parcelas,
            [recebimento]);
    }

    private static DadosReconstrucaoVenda CriarDadosComEntradaELote()
    {
        var parcelas = Enumerable.Range(1, 10)
            .Select(numero => new DadosReconstrucaoParcela(
                $"parcela-{numero}",
                numero,
                DinheiroValido(20_000),
                numero == 1 ? DataVenda : new DateOnly(2027, numero, 15)))
            .ToArray();
        var entrada = new DadosReconstrucaoRecebimento(
            "recebimento-entrada",
            DataVenda,
            FormaPagamento.Dinheiro,
            DinheiroValido(20_000),
            OrigemRecebimento.Entrada,
            default,
            null,
            [new("parcela-1", DinheiroValido(20_000))]);
        var lote = new DadosReconstrucaoRecebimento(
            "recebimento-lote",
            new DateOnly(2027, 2, 20),
            FormaPagamento.Pix,
            DinheiroValido(40_000),
            OrigemRecebimento.HistoricoLote,
            default,
            null,
            [
                new("parcela-2", DinheiroValido(20_000)),
                new("parcela-3", DinheiroValido(20_000))
            ]);

        return new DadosReconstrucaoVenda(
            "venda-sintetica",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            DataVenda,
            DinheiroValido(200_000),
            parcelas,
            [entrada, lote]);
    }

    private static DadosReconstrucaoVenda CriarDadosComEntradaDeDuasParcelas(long centavosAlocados)
    {
        var entrada = new DadosReconstrucaoRecebimento(
            "recebimento-entrada-duas-parcelas",
            DataVenda,
            FormaPagamento.Dinheiro,
            DinheiroValido(10_000),
            OrigemRecebimento.Entrada,
            default,
            null,
            [new("parcela-entrada-duas-parcelas", DinheiroValido(centavosAlocados))]);
        var parcelas = new[]
        {
            new DadosReconstrucaoParcela(
                "parcela-entrada-duas-parcelas",
                1,
                DinheiroValido(10_000),
                DataVenda),
            new DadosReconstrucaoParcela(
                "parcela-futura-duas-parcelas",
                2,
                DinheiroValido(10_000),
                new DateOnly(2027, 2, 15))
        };

        return new DadosReconstrucaoVenda(
            "venda-entrada-duas-parcelas",
            StatusAdministrativoVenda.Ativo,
            ClienteValido(),
            DataVenda,
            DinheiroValido(20_000),
            parcelas,
            [entrada]);
    }

    private static DadosClienteVenda ClienteValido() =>
        Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(
            DadosClienteVenda.Criar("Cliente Sintético", "12345678909", "1198765432", null)).Valor;

    private static Dinheiro DinheiroValido(long centavos) =>
        Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(Dinheiro.Criar(centavos)).Valor;

    private static T ObterSucesso<T>(ResultadoDominio<T> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<T>.Sucesso>(resultado).Valor;

    private static ResultadoDominio<Venda>.Falha ObterFalha(ResultadoDominio<Venda> resultado) =>
        Assert.IsInstanceOfType<ResultadoDominio<Venda>.Falha>(resultado);
}
