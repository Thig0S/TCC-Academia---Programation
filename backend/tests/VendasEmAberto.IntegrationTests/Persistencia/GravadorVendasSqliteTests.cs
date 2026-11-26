using Microsoft.Data.Sqlite;
using System.Diagnostics;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class GravadorVendasSqliteTests
{
    private static readonly DateOnly Referencia = new(2027, 4, 30);
    private readonly ArmazenamentoVendasSqlite _armazenamento = new();
    private string _diretorioTemporario = string.Empty;
    private string _caminhoFixture = string.Empty;
    private string _caminhoDestino = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-save-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoFixture = Path.Combine(_diretorioTemporario, "fixture.db");
        _caminhoDestino = Path.Combine(_diretorioTemporario, "destino.db");
    }

    [TestCleanup]
    public void LimparFixture()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    [TestMethod]
    public async Task Salvar_ReabreRoundTripCompletoEIncrementaRevisaoSemDuplicarSnapshotIdentico()
    {
        await PrepararFixtureComHistoricoAsync();
        var resultadoEsperado = await _armazenamento.CarregarAsync(_caminhoFixture, Referencia);
        var snapshotEsperado = ExigirSnapshot(resultadoEsperado);

        var inicializacaoDestino = await _armazenamento.InicializarAsync(_caminhoDestino);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(inicializacaoDestino);

        var primeiraGravacao = await _armazenamento.SalvarAsync(
            _caminhoDestino,
            snapshotEsperado.Conjunto.Vendas,
            snapshotEsperado.Revisao,
            Referencia);
        Assert.AreEqual(1L, ExigirRevisaoSalva(primeiraGravacao));

        var aposReabertura = ExigirSnapshot(
            await _armazenamento.CarregarAsync(_caminhoDestino, Referencia));
        Assert.AreEqual(1L, aposReabertura.Revisao);
        AssertConjuntosIguais(snapshotEsperado.Conjunto, aposReabertura.Conjunto);

        var segundaGravacao = await _armazenamento.SalvarAsync(
            _caminhoDestino,
            snapshotEsperado.Conjunto.Vendas,
            aposReabertura.Revisao,
            Referencia);
        Assert.AreEqual(2L, ExigirRevisaoSalva(segundaGravacao));

        var aposSegundaReabertura = ExigirSnapshot(
            await _armazenamento.CarregarAsync(_caminhoDestino, Referencia));
        Assert.AreEqual(2L, aposSegundaReabertura.Revisao);
        AssertConjuntosIguais(snapshotEsperado.Conjunto, aposSegundaReabertura.Conjunto);
    }

    [TestMethod]
    public async Task Salvar_RecusaOmissaoDeVendaSemAlterarDadosNemRevisao()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        var candidato = inicial.Conjunto.Vendas
            .Where(venda => venda.Id != "venda-inativa")
            .ToArray();

        var resultado = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            candidato,
            inicial.Revisao,
            Referencia);

        ExigirErro(resultado, CodigosErroArmazenamento.ExclusaoNaoPermitida);
        var aposFalha = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(inicial.Revisao, aposFalha.Revisao);
        AssertConjuntosIguais(inicial.Conjunto, aposFalha.Conjunto);
    }

    [TestMethod]
    public async Task Salvar_RecusaAlteracoesDeContratoEntradaLoteEIdentidadeIndividualSemGravar()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        var entrada = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-entrada");
        var lote = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-lote");
        var prejuizo = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-prejuizo");

        var contratoSemParcela = ExigirVenda(Venda.Cadastrar(
            prejuizo.Id,
            prejuizo.Cliente,
            prejuizo.DataVenda,
            prejuizo.ValorTotalBase,
            quantidadeParcelas: 1,
            ["parcela-substituta"],
            Referencia));
        var contratoComBaseAlterada = ReconstruirVenda(
            prejuizo,
            valorTotalBaseCentavos: 12_000,
            parcelas:
            [
                new DadosReconstrucaoParcela(
                    prejuizo.Parcelas[0].Id,
                    1,
                    CriarDinheiro(6_000),
                    prejuizo.Parcelas[0].Vencimento),
                new DadosReconstrucaoParcela(
                    prejuizo.Parcelas[1].Id,
                    2,
                    CriarDinheiro(6_000),
                    prejuizo.Parcelas[1].Vencimento)
            ],
            recebimentos:
            [
                new DadosReconstrucaoRecebimento(
                    "receb-prejuizo",
                    new DateOnly(2027, 4, 1),
                    FormaPagamento.Pix,
                    CriarDinheiro(6_000),
                    OrigemRecebimento.Individual,
                    CriarDinheiro(0),
                    "",
                    [new DadosReconstrucaoAlocacao("prejuizo-parcela-1", CriarDinheiro(6_000))])
            ]);
        var recebimentoRemovido = ReconstruirVenda(prejuizo, recebimentos: []);
        var entradaReescrita = ReconstruirVenda(
            entrada,
            recebimentos: entrada.Recebimentos.Select(recebimento =>
                recebimento.Origem == OrigemRecebimento.Entrada
                    ? NovoDadosRecebimento(recebimento, forma: FormaPagamento.Dinheiro)
                    : NovoDadosRecebimento(recebimento)));
        var loteReescrito = ReconstruirVenda(
            lote,
            recebimentos: lote.Recebimentos.Select(recebimento =>
                recebimento.Origem == OrigemRecebimento.HistoricoLote
                    ? NovoDadosRecebimento(recebimento, data: new DateOnly(2027, 3, 21))
                    : NovoDadosRecebimento(recebimento)));
        var individualComOutraIdentidade = ReconstruirVenda(
            entrada,
            recebimentos: entrada.Recebimentos.Select(recebimento =>
                recebimento.Id == "receb-individual-corrigido"
                    ? NovoDadosRecebimento(recebimento, id: "receb-individual-substituto")
                    : NovoDadosRecebimento(recebimento)));

        (string Descricao, string VendaId, Venda Candidata)[] alteracoes =
        [
            ("remoção/substituição de parcela", prejuizo.Id, contratoSemParcela),
            ("alteração de contrato-base e valores de parcelas", prejuizo.Id, contratoComBaseAlterada),
            ("remoção de recebimento", prejuizo.Id, recebimentoRemovido),
            ("reescrita da entrada", entrada.Id, entradaReescrita),
            ("reescrita de lote histórico", lote.Id, loteReescrito),
            ("perda da identidade do Individual", entrada.Id, individualComOutraIdentidade)
        ];

        foreach (var (descricao, vendaId, vendaCandidata) in alteracoes)
        {
            var candidato = inicial.Conjunto.Vendas
                .Select(venda => venda.Id == vendaId ? vendaCandidata : venda)
                .ToArray();
            var resultado = await _armazenamento.SalvarAsync(
                _caminhoFixture,
                candidato,
                inicial.Revisao,
                Referencia);

            ExigirErro(resultado, CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida, descricao);
            var aposFalha = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
            Assert.AreEqual(inicial.Revisao, aposFalha.Revisao, descricao);
            AssertConjuntosIguais(inicial.Conjunto, aposFalha.Conjunto);
        }
    }

    [TestMethod]
    public async Task Salvar_RecusaColisaoGlobalEOverflowDoCandidatoSemAlterarEstado()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));

        var vendaComIdCompartilhado = CriarVendaSimples("id-global-compartilhado", "parcela-unica-a", 10_000);
        var vendaComParcelaColidente = CriarVendaSimples("venda-b", "id-global-compartilhado", 10_000);
        var colisoes = new[] { vendaComIdCompartilhado, vendaComParcelaColidente };
        var limite = Dinheiro.LimiteCentavos;
        var conjuntoComOverflow = new[]
        {
            CriarVendaSimples("venda-limite-a", "parcela-limite-a", limite),
            CriarVendaSimples("venda-limite-b", "parcela-limite-b", limite)
        };

        foreach (var candidato in new[] { colisoes, conjuntoComOverflow })
        {
            var resultado = await _armazenamento.SalvarAsync(
                _caminhoFixture,
                candidato,
                inicial.Revisao,
                Referencia);
            ExigirErro(resultado, CodigosErroArmazenamento.CandidatoInvalido);

            var aposFalha = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
            Assert.AreEqual(inicial.Revisao, aposFalha.Revisao);
            AssertConjuntosIguais(inicial.Conjunto, aposFalha.Conjunto);
        }
    }

    [TestMethod]
    public async Task Salvar_RecusaTrocarIdentidadeEParcelaAlocadaEntreIndividualSemAlterarEstado()
    {
        var inicializacao = await _armazenamento.InicializarAsync(_caminhoFixture);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(inicializacao);
        var clienteResult = DadosClienteVenda.Criar(
            "Venda de dois pagamentos",
            "12345678909",
            "1198765432",
            null);
        var cliente = Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(clienteResult).Valor;
        var venda = ExigirVenda(Venda.Cadastrar(
            "venda-duas-individuais",
            cliente,
            new DateOnly(2027, 1, 15),
            CriarDinheiro(20_000),
            2,
            ["parcela-individual-1", "parcela-individual-2"],
            Referencia));
        venda = ExigirVenda(venda.RegistrarPagamento(
            "receb-individual-1",
            "parcela-individual-1",
            CriarDinheiro(10_000),
            new DateOnly(2027, 2, 10),
            FormaPagamento.Dinheiro,
            Referencia));
        venda = ExigirVenda(venda.RegistrarPagamento(
            "receb-individual-2",
            "parcela-individual-2",
            CriarDinheiro(10_000),
            new DateOnly(2027, 3, 10),
            FormaPagamento.Pix,
            Referencia));

        var revisaoSalva = ExigirRevisaoSalva(await _armazenamento.SalvarAsync(
            _caminhoFixture,
            [venda],
            0,
            Referencia));
        Assert.AreEqual(1L, revisaoSalva);
        var persistida = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        var primeiro = venda.Recebimentos[0];
        var segundo = venda.Recebimentos[1];
        var candidatoComIdentidadesTrocadas = ReconstruirVenda(
            venda,
            recebimentos:
            [
                new DadosReconstrucaoRecebimento(
                    segundo.Id,
                    segundo.Data,
                    segundo.Forma,
                    segundo.Valor,
                    OrigemRecebimento.Individual,
                    segundo.Acrescimo,
                    segundo.Observacao,
                    [new DadosReconstrucaoAlocacao("parcela-individual-1", segundo.Valor)]),
                new DadosReconstrucaoRecebimento(
                    primeiro.Id,
                    primeiro.Data,
                    primeiro.Forma,
                    primeiro.Valor,
                    OrigemRecebimento.Individual,
                    primeiro.Acrescimo,
                    primeiro.Observacao,
                    [new DadosReconstrucaoAlocacao("parcela-individual-2", primeiro.Valor)])
            ]);

        var resultado = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            [candidatoComIdentidadesTrocadas],
            persistida.Revisao,
            Referencia);

        ExigirErro(resultado, CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida);
        var aposFalha = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(persistida.Revisao, aposFalha.Revisao);
        AssertConjuntosIguais(persistida.Conjunto, aposFalha.Conjunto);
    }

    [TestMethod]
    public async Task Salvar_AceitaEdicaoClienteStatusBaixaECorrecaoPreservandoDemaisVendas()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        var vendaEntrada = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-entrada");
        var vendaInativa = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-inativa");
        var vendaPrejuizo = inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-prejuizo");

        var correcao = ExigirVenda(vendaEntrada.CorrigirPagamento(
            "receb-individual-corrigido",
            CriarDinheiro(10_200),
            new DateOnly(2027, 3, 6),
            FormaPagamento.Pix,
            Referencia,
            inicial.Conjunto.Vendas,
            "ajustado"));
        var vendaEditada = ExigirVenda(correcao.EditarCliente(
            "Entrada Editada",
            "52998224725",
            "1190000000",
            "cliente atualizado"));
        var vendaReativada = ExigirVenda(vendaInativa.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo));
        var prejuizoReativado = ExigirVenda(vendaPrejuizo.AlterarStatusAdministrativo(StatusAdministrativoVenda.Ativo));
        var baixaFinal = ExigirVenda(prejuizoReativado.RegistrarPagamento(
            "receb-prejuizo-final",
            "prejuizo-parcela-2",
            CriarDinheiro(5_000),
            new DateOnly(2027, 4, 10),
            FormaPagamento.Dinheiro,
            Referencia,
            "baixa final"));

        var candidato = inicial.Conjunto.Vendas.Select(venda => venda.Id switch
        {
            "venda-entrada" => vendaEditada,
            "venda-inativa" => vendaReativada,
            "venda-prejuizo" => baixaFinal,
            _ => venda
        }).ToArray();
        var resultado = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            candidato,
            inicial.Revisao,
            Referencia);

        Assert.AreEqual(1L, ExigirRevisaoSalva(resultado));
        var salvo = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(1L, salvo.Revisao);
        CollectionAssert.AreEqual(
            inicial.Conjunto.Vendas.Select(venda => venda.Id).ToArray(),
            salvo.Conjunto.Vendas.Select(venda => venda.Id).ToArray());
        Assert.AreEqual("Entrada Editada", salvo.Conjunto.Vendas[0].Cliente.Nome);
        Assert.AreEqual("cliente atualizado", salvo.Conjunto.Vendas[0].Cliente.Descricao);
        Assert.AreEqual("receb-individual-corrigido", salvo.Conjunto.Vendas[0].Recebimentos[1].Id);
        Assert.AreEqual("parcela-futura", salvo.Conjunto.Vendas[0].Recebimentos[1].Alocacoes[0].ParcelaId);
        Assert.AreEqual(10_200L, salvo.Conjunto.Vendas[0].Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(200L, salvo.Conjunto.Vendas[0].Recebimentos[1].Acrescimo.Centavos);
        Assert.AreEqual(new DateOnly(2027, 3, 6), salvo.Conjunto.Vendas[0].Recebimentos[1].Data);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, salvo.Conjunto.Vendas[2].StatusAdministrativo);
        AssertVendaIgual(
            inicial.Conjunto.Vendas.Single(venda => venda.Id == "venda-lote"),
            salvo.Conjunto.Vendas.Single(venda => venda.Id == "venda-lote"));
        var vendaQuitada = salvo.Conjunto.Vendas.Single(venda => venda.Id == "venda-prejuizo");
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, vendaQuitada.StatusAdministrativo);
        Assert.AreEqual(2, vendaQuitada.Recebimentos.Count);
        Assert.AreEqual("receb-prejuizo-final", vendaQuitada.Recebimentos[1].Id);
        Assert.AreEqual("prejuizo-parcela-2", vendaQuitada.Recebimentos[1].Alocacoes.Single().ParcelaId);
    }

    [TestMethod]
    public async Task Salvar_DoisConsumidoresNaMesmaRevisaoConfirmamUmaUnicaVersaoIntegra()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        var candidatoA = CriarCandidatoComClienteEditado(
            inicial.Conjunto,
            "Concorrente A",
            "52998224725",
            "1190000001");
        var candidatoB = CriarCandidatoComClienteEditado(
            inicial.Conjunto,
            "Concorrente B",
            "11144477735",
            "1190000002");
        var liberar = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ambosProntos = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var prontos = 0;

        Task<ResultadoArmazenamento<long>> SalvarAposBarreiraAsync(Venda[] candidato) => SalvarAposBarreiraLocalAsync(candidato);

        async Task<ResultadoArmazenamento<long>> SalvarAposBarreiraLocalAsync(Venda[] candidato)
        {
            if (Interlocked.Increment(ref prontos) == 2)
            {
                ambosProntos.SetResult();
            }

            await liberar.Task;
            return await _armazenamento.SalvarAsync(
                _caminhoFixture,
                candidato,
                inicial.Revisao,
                Referencia);
        }

        var tarefaA = SalvarAposBarreiraAsync(candidatoA);
        var tarefaB = SalvarAposBarreiraAsync(candidatoB);
        await ambosProntos.Task;
        liberar.SetResult();
        var resultados = await Task.WhenAll(tarefaA, tarefaB);

        Assert.AreEqual(1, resultados.Count(resultado => resultado is ResultadoArmazenamento<long>.Sucesso));
        Assert.AreEqual(1, resultados.Count(resultado =>
            resultado is ResultadoArmazenamento<long>.Falha falha &&
            falha.Erro.Codigo == CodigosErroArmazenamento.ConflitoRevisao));

        var final = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(inicial.Revisao + 1, final.Revisao);
        var vencedor = final.Conjunto.Vendas[0].Cliente.Nome == "Concorrente A"
            ? candidatoA
            : candidatoB;
        Assert.IsTrue(final.Conjunto.Vendas[0].Cliente.Nome is "Concorrente A" or "Concorrente B");
        AssertConjuntosIguais(ExigirConjunto(vencedor), final.Conjunto);

        var tentativaObsoleta = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            vencedor == candidatoA ? candidatoB : candidatoA,
            inicial.Revisao,
            Referencia);
        ExigirErro(tentativaObsoleta, CodigosErroArmazenamento.ConflitoRevisao);
        var aposRecusaObsoleta = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(final.Revisao, aposRecusaObsoleta.Revisao);
        AssertConjuntosIguais(final.Conjunto, aposRecusaObsoleta.Conjunto);
    }

    [TestMethod]
    public async Task Carregar_DuranteEscritaNaoConfirmadaVeSnapshotAnteriorEAposCommitVeSnapshotNovo()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        await using var conexaoEscrita = CriarConexaoSqlite(_caminhoFixture);
        await conexaoEscrita.OpenAsync();
        await using var transacao = conexaoEscrita.BeginTransaction(deferred: false);
        await using (var comando = conexaoEscrita.CreateCommand())
        {
            comando.Transaction = transacao;
            comando.CommandText = """
                UPDATE Vendas SET ClienteNome = 'Alteração ainda não confirmada' WHERE Id = 'venda-entrada';
                UPDATE EstadoArmazenamento SET Revisao = 1 WHERE Id = 1 AND Revisao = 0;
                """;
            Assert.AreEqual(2, await comando.ExecuteNonQueryAsync());
        }

        var duranteEscrita = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(inicial.Revisao, duranteEscrita.Revisao);
        AssertConjuntosIguais(inicial.Conjunto, duranteEscrita.Conjunto);

        await transacao.CommitAsync();
        var aposCommit = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(1L, aposCommit.Revisao);
        Assert.AreEqual("Alteração ainda não confirmada", aposCommit.Conjunto.Vendas[0].Cliente.Nome);
        Assert.AreEqual(inicial.Conjunto.Vendas.Count, aposCommit.Conjunto.Vendas.Count);
        for (var indice = 1; indice < inicial.Conjunto.Vendas.Count; indice++)
        {
            AssertVendaIgual(inicial.Conjunto.Vendas[indice], aposCommit.Conjunto.Vendas[indice]);
        }
    }

    [TestMethod]
    public async Task Salvar_RetornaBancoOcupadoAposTimeoutSemRetryAutomatico()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        await using var bloqueador = CriarConexaoSqlite(_caminhoFixture);
        await bloqueador.OpenAsync();
        await using var transacaoBloqueadora = bloqueador.BeginTransaction(deferred: false);
        var cronometro = Stopwatch.StartNew();

        var resultado = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            inicial.Conjunto.Vendas,
            inicial.Revisao,
            Referencia);

        cronometro.Stop();
        ExigirErro(resultado, CodigosErroArmazenamento.BancoOcupado);
        Assert.IsTrue(
            cronometro.Elapsed >= TimeSpan.FromSeconds(4),
            $"O bloqueio deveria aguardar o timeout configurado de cinco segundos; decorrido: {cronometro.Elapsed}.");
        Assert.IsTrue(
            cronometro.Elapsed < TimeSpan.FromSeconds(12),
            $"A operação parece ter repetido automaticamente após o timeout: {cronometro.Elapsed}.");

        await transacaoBloqueadora.RollbackAsync();
        var aposTimeout = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(inicial.Revisao, aposTimeout.Revisao);
        AssertConjuntosIguais(inicial.Conjunto, aposTimeout.Conjunto);
    }

    [TestMethod]
    public async Task Salvar_RecusaRevisaoLongMaxValueSemOverflowNemAlteracao()
    {
        await PrepararFixtureComHistoricoAsync();
        var inicial = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        await ExecutarSqlAsync("UPDATE EstadoArmazenamento SET Revisao = 9223372036854775807 WHERE Id = 1;");

        var resultado = await _armazenamento.SalvarAsync(
            _caminhoFixture,
            inicial.Conjunto.Vendas,
            long.MaxValue,
            Referencia);

        ExigirErro(resultado, CodigosErroArmazenamento.LimiteRevisaoExcedido);
        var aposLimite = ExigirSnapshot(await _armazenamento.CarregarAsync(_caminhoFixture, Referencia));
        Assert.AreEqual(long.MaxValue, aposLimite.Revisao);
        AssertConjuntosIguais(inicial.Conjunto, aposLimite.Conjunto);
    }

    private async Task PrepararFixtureComHistoricoAsync()
    {
        var inicializacao = await _armazenamento.InicializarAsync(_caminhoFixture);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(inicializacao);
        await ExecutarSqlAsync("""
            INSERT INTO Identificadores (Id, Tipo) VALUES
                ('venda-entrada', 0), ('parcela-entrada', 1), ('parcela-futura', 1),
                ('receb-entrada', 2), ('receb-individual-corrigido', 2),
                ('venda-lote', 0), ('lote-parcela-1', 1), ('lote-parcela-2', 1),
                ('lote-parcela-3', 1), ('lote-parcela-4', 1),
                ('receb-lote-marco', 2), ('receb-individual-fevereiro', 2),
                ('venda-inativa', 0), ('inativa-parcela', 1), ('receb-inativa', 2),
                ('venda-prejuizo', 0), ('prejuizo-parcela-1', 1), ('prejuizo-parcela-2', 1),
                ('receb-prejuizo', 2);

            INSERT INTO Vendas
                (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                 ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES
                ('venda-entrada', 0, 0, 'Entrada', '12345678909', '1198765432', NULL, '2027-01-15', 20000),
                ('venda-lote', 1, 0, 'Lote', '52998224725', '2198765432', 'Histórico em lote', '2027-01-15', 40000),
                ('venda-inativa', 2, 1, 'Inativa', '11144477735', '3198765432', NULL, '2027-01-15', 10000),
                ('venda-prejuizo', 3, 2, 'Prejuízo', '93541134780', '4198765432', NULL, '2027-01-15', 10000);

            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento) VALUES
                ('parcela-entrada', 'venda-entrada', 1, 10000, '2027-01-15'),
                ('parcela-futura', 'venda-entrada', 2, 10000, '2027-02-15'),
                ('lote-parcela-1', 'venda-lote', 1, 10000, '2027-02-15'),
                ('lote-parcela-2', 'venda-lote', 2, 10000, '2027-03-15'),
                ('lote-parcela-3', 'venda-lote', 3, 10000, '2027-04-15'),
                ('lote-parcela-4', 'venda-lote', 4, 10000, '2027-05-15'),
                ('inativa-parcela', 'venda-inativa', 1, 10000, '2027-02-15'),
                ('prejuizo-parcela-1', 'venda-prejuizo', 1, 5000, '2027-02-15'),
                ('prejuizo-parcela-2', 'venda-prejuizo', 2, 5000, '2027-03-15');

            INSERT INTO Recebimentos
                (Id, VendaId, Ordem, Data, Forma, Origem, ValorCentavos, AcrescimoCentavos, Observacao)
            VALUES
                ('receb-entrada', 'venda-entrada', 0, '2027-01-15', 1, 0, 10000, 0, ''),
                ('receb-individual-corrigido', 'venda-entrada', 1, '2027-03-05', 0, 1, 10500, 500, 'corrigido'),
                ('receb-lote-marco', 'venda-lote', 0, '2027-03-20', 0, 2, 20000, 0, ''),
                ('receb-individual-fevereiro', 'venda-lote', 1, '2027-02-15', 1, 1, 11000, 1000, 'fora de ordem'),
                ('receb-inativa', 'venda-inativa', 0, '2027-03-10', 0, 1, 10000, 0, ''),
                ('receb-prejuizo', 'venda-prejuizo', 0, '2027-04-01', 1, 1, 5000, 0, '');

            INSERT INTO Alocacoes (RecebimentoId, Ordem, VendaId, ParcelaId, ValorCentavos) VALUES
                ('receb-entrada', 0, 'venda-entrada', 'parcela-entrada', 10000),
                ('receb-individual-corrigido', 0, 'venda-entrada', 'parcela-futura', 10500),
                ('receb-lote-marco', 0, 'venda-lote', 'lote-parcela-1', 10000),
                ('receb-lote-marco', 1, 'venda-lote', 'lote-parcela-2', 10000),
                ('receb-individual-fevereiro', 0, 'venda-lote', 'lote-parcela-3', 11000),
                ('receb-inativa', 0, 'venda-inativa', 'inativa-parcela', 10000),
                ('receb-prejuizo', 0, 'venda-prejuizo', 'prejuizo-parcela-1', 5000);
            """);
    }

    private async Task ExecutarSqlAsync(string sql)
    {
        await using var conexao = CriarConexaoSqlite(_caminhoFixture);
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
    }

    private static SqliteConnection CriarConexaoSqlite(string caminho) => new(new SqliteConnectionStringBuilder
    {
        DataSource = caminho,
        Mode = SqliteOpenMode.ReadWrite,
        ForeignKeys = true,
        DefaultTimeout = 5,
        Pooling = false
    }.ToString());

    private static Venda ReconstruirVenda(
        Venda original,
        long? valorTotalBaseCentavos = null,
        IEnumerable<DadosReconstrucaoParcela>? parcelas = null,
        IEnumerable<DadosReconstrucaoRecebimento>? recebimentos = null)
    {
        var dados = new DadosReconstrucaoVenda(
            original.Id,
            original.StatusAdministrativo,
            original.Cliente,
            original.DataVenda,
            CriarDinheiro(valorTotalBaseCentavos ?? original.ValorTotalBase.Centavos),
            (parcelas ?? original.Parcelas.Select(parcela => new DadosReconstrucaoParcela(
                parcela.Id,
                parcela.Numero,
                parcela.ValorBase,
                parcela.Vencimento)).ToArray()).ToArray(),
            (recebimentos ?? original.Recebimentos.Select(recebimento => NovoDadosRecebimento(recebimento)))
                .ToArray());

        return ExigirVenda(Venda.Reconstruir(dados, Referencia));
    }

    private static DadosReconstrucaoRecebimento NovoDadosRecebimento(
        RecebimentoVenda recebimento,
        string? id = null,
        DateOnly? data = null,
        FormaPagamento? forma = null) =>
        new(
            id ?? recebimento.Id,
            data ?? recebimento.Data,
            forma ?? recebimento.Forma,
            recebimento.Valor,
            recebimento.Origem,
            recebimento.Acrescimo,
            recebimento.Observacao,
            recebimento.Alocacoes.Select(alocacao => new DadosReconstrucaoAlocacao(
                alocacao.ParcelaId,
                alocacao.Valor)).ToArray());

    private static Venda CriarVendaSimples(string id, string parcelaId, long valorBaseCentavos)
    {
        var resultadoCliente = DadosClienteVenda.Criar(
            $"Cliente {id}",
            "12345678909",
            "1198765432",
            null);
        var cliente = Assert.IsInstanceOfType<ResultadoDominio<DadosClienteVenda>.Sucesso>(resultadoCliente).Valor;
        return ExigirVenda(Venda.Cadastrar(
            id,
            cliente,
            new DateOnly(2027, 1, 15),
            CriarDinheiro(valorBaseCentavos),
            1,
            [parcelaId],
            Referencia));
    }

    private static Venda[] CriarCandidatoComClienteEditado(
        ConjuntoVendas conjunto,
        string nome,
        string cpf,
        string telefone)
    {
        var original = conjunto.Vendas.Single(venda => venda.Id == "venda-entrada");
        var editado = ExigirVenda(original.EditarCliente(nome, cpf, telefone, "concorrente"));
        return conjunto.Vendas
            .Select(venda => venda.Id == original.Id ? editado : venda)
            .ToArray();
    }

    private static ConjuntoVendas ExigirConjunto(IEnumerable<Venda> vendas)
    {
        var resultado = ConjuntoVendas.Criar(vendas);
        if (resultado is ResultadoDominio<ConjuntoVendas>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoDominio<ConjuntoVendas>.Sucesso>(resultado).Valor;
    }

    private static Dinheiro CriarDinheiro(long centavos)
    {
        var resultado = Dinheiro.Criar(centavos);
        if (resultado is ResultadoDominio<Dinheiro>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoDominio<Dinheiro>.Sucesso>(resultado).Valor;
    }

    private static Venda ExigirVenda(ResultadoDominio<Venda> resultado)
    {
        if (resultado is ResultadoDominio<Venda>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoDominio<Venda>.Sucesso>(resultado).Valor;
    }

    private static void ExigirErro(
        ResultadoArmazenamento<long> resultado,
        string codigoEsperado,
        string? contexto = null)
    {
        if (resultado is not ResultadoArmazenamento<long>.Falha falha)
        {
            Assert.Fail($"A operação deveria falhar com '{codigoEsperado}'. {contexto}");
            return;
        }

        Assert.AreEqual(codigoEsperado, falha.Erro.Codigo, contexto);
    }

    private static SnapshotVendas ExigirSnapshot(ResultadoArmazenamento<SnapshotVendas> resultado)
    {
        if (resultado is ResultadoArmazenamento<SnapshotVendas>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(resultado).Valor;
    }

    private static long ExigirRevisaoSalva(ResultadoArmazenamento<long> resultado)
    {
        if (resultado is ResultadoArmazenamento<long>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(resultado).Valor;
    }

    private static void AssertConjuntosIguais(ConjuntoVendas esperado, ConjuntoVendas atual)
    {
        Assert.AreEqual(esperado.Vendas.Count, atual.Vendas.Count);
        for (var indiceVenda = 0; indiceVenda < esperado.Vendas.Count; indiceVenda++)
        {
            AssertVendaIgual(esperado.Vendas[indiceVenda], atual.Vendas[indiceVenda]);
        }
    }

    private static void AssertVendaIgual(Venda esperada, Venda atual)
    {
        Assert.AreEqual(esperada.Id, atual.Id);
        Assert.AreEqual(esperada.StatusAdministrativo, atual.StatusAdministrativo);
        Assert.AreEqual(esperada.Cliente.Nome, atual.Cliente.Nome);
        Assert.AreEqual(esperada.Cliente.Cpf, atual.Cliente.Cpf);
        Assert.AreEqual(esperada.Cliente.Telefone, atual.Cliente.Telefone);
        Assert.AreEqual(esperada.Cliente.Descricao, atual.Cliente.Descricao);
        Assert.AreEqual(esperada.DataVenda, atual.DataVenda);
        Assert.AreEqual(esperada.ValorTotalBase.Centavos, atual.ValorTotalBase.Centavos);

        Assert.AreEqual(esperada.Parcelas.Count, atual.Parcelas.Count);
        for (var indiceParcela = 0; indiceParcela < esperada.Parcelas.Count; indiceParcela++)
        {
            var parcelaEsperada = esperada.Parcelas[indiceParcela];
            var parcelaAtual = atual.Parcelas[indiceParcela];
            Assert.AreEqual(parcelaEsperada.Id, parcelaAtual.Id);
            Assert.AreEqual(parcelaEsperada.Numero, parcelaAtual.Numero);
            Assert.AreEqual(parcelaEsperada.ValorBase.Centavos, parcelaAtual.ValorBase.Centavos);
            Assert.AreEqual(parcelaEsperada.Vencimento, parcelaAtual.Vencimento);
        }

        Assert.AreEqual(esperada.Recebimentos.Count, atual.Recebimentos.Count);
        for (var indiceRecebimento = 0; indiceRecebimento < esperada.Recebimentos.Count; indiceRecebimento++)
        {
            var recebimentoEsperado = esperada.Recebimentos[indiceRecebimento];
            var recebimentoAtual = atual.Recebimentos[indiceRecebimento];
            Assert.AreEqual(recebimentoEsperado.Id, recebimentoAtual.Id);
            Assert.AreEqual(recebimentoEsperado.Data, recebimentoAtual.Data);
            Assert.AreEqual(recebimentoEsperado.Forma, recebimentoAtual.Forma);
            Assert.AreEqual(recebimentoEsperado.Valor.Centavos, recebimentoAtual.Valor.Centavos);
            Assert.AreEqual(recebimentoEsperado.Origem, recebimentoAtual.Origem);
            Assert.AreEqual(recebimentoEsperado.Acrescimo.Centavos, recebimentoAtual.Acrescimo.Centavos);
            Assert.AreEqual(recebimentoEsperado.Observacao, recebimentoAtual.Observacao);
            Assert.AreEqual(recebimentoEsperado.Alocacoes.Count, recebimentoAtual.Alocacoes.Count);
            for (var indiceAlocacao = 0; indiceAlocacao < recebimentoEsperado.Alocacoes.Count; indiceAlocacao++)
            {
                Assert.AreEqual(
                    recebimentoEsperado.Alocacoes[indiceAlocacao].ParcelaId,
                    recebimentoAtual.Alocacoes[indiceAlocacao].ParcelaId);
                Assert.AreEqual(
                    recebimentoEsperado.Alocacoes[indiceAlocacao].Valor.Centavos,
                    recebimentoAtual.Alocacoes[indiceAlocacao].Valor.Centavos);
            }
        }
    }
}
