using Microsoft.Data.Sqlite;
using VendasEmAberto.Aplicacao.Persistencia;
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
        await using var conexao = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = _caminhoFixture,
            Mode = SqliteOpenMode.ReadWrite,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString());
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
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
            var vendaEsperada = esperado.Vendas[indiceVenda];
            var vendaAtual = atual.Vendas[indiceVenda];
            Assert.AreEqual(vendaEsperada.Id, vendaAtual.Id);
            Assert.AreEqual(vendaEsperada.StatusAdministrativo, vendaAtual.StatusAdministrativo);
            Assert.AreEqual(vendaEsperada.Cliente.Nome, vendaAtual.Cliente.Nome);
            Assert.AreEqual(vendaEsperada.Cliente.Cpf, vendaAtual.Cliente.Cpf);
            Assert.AreEqual(vendaEsperada.Cliente.Telefone, vendaAtual.Cliente.Telefone);
            Assert.AreEqual(vendaEsperada.Cliente.Descricao, vendaAtual.Cliente.Descricao);
            Assert.AreEqual(vendaEsperada.DataVenda, vendaAtual.DataVenda);
            Assert.AreEqual(vendaEsperada.ValorTotalBase.Centavos, vendaAtual.ValorTotalBase.Centavos);

            Assert.AreEqual(vendaEsperada.Parcelas.Count, vendaAtual.Parcelas.Count);
            for (var indiceParcela = 0; indiceParcela < vendaEsperada.Parcelas.Count; indiceParcela++)
            {
                var parcelaEsperada = vendaEsperada.Parcelas[indiceParcela];
                var parcelaAtual = vendaAtual.Parcelas[indiceParcela];
                Assert.AreEqual(parcelaEsperada.Id, parcelaAtual.Id);
                Assert.AreEqual(parcelaEsperada.Numero, parcelaAtual.Numero);
                Assert.AreEqual(parcelaEsperada.ValorBase.Centavos, parcelaAtual.ValorBase.Centavos);
                Assert.AreEqual(parcelaEsperada.Vencimento, parcelaAtual.Vencimento);
            }

            Assert.AreEqual(vendaEsperada.Recebimentos.Count, vendaAtual.Recebimentos.Count);
            for (var indiceRecebimento = 0; indiceRecebimento < vendaEsperada.Recebimentos.Count; indiceRecebimento++)
            {
                var recebimentoEsperado = vendaEsperada.Recebimentos[indiceRecebimento];
                var recebimentoAtual = vendaAtual.Recebimentos[indiceRecebimento];
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
}
