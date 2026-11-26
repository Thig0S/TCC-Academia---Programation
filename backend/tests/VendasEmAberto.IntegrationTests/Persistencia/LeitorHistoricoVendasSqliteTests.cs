using Microsoft.Data.Sqlite;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class LeitorHistoricoVendasSqliteTests
{
    private readonly InicializadorSqlite _inicializador = new();
    private readonly LeitorVendasSqlite _leitor = new();
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void InicializarFixture()
    {
        _diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-em-aberto-history-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "persistencia.db");
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
    public async Task Carregar_PreservaEntradaLoteCorrecaoOrdemStatusEOraculosMensais()
    {
        var inicializacao = await _inicializador.InicializarAsync(_caminhoBanco);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(inicializacao);
        await ExecutarAsync("""
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

        var referencia = new DateOnly(2027, 4, 30);
        var resultado = await _leitor.CarregarAsync(_caminhoBanco, referencia);
        var snapshot = ExigirSnapshot(resultado);
        Assert.AreEqual(0L, snapshot.Revisao);
        CollectionAssert.AreEqual(
            new[] { "venda-entrada", "venda-lote", "venda-inativa", "venda-prejuizo" },
            snapshot.Conjunto.Vendas.Select(venda => venda.Id).ToArray());

        var projecao = ExigirProjecao(snapshot.Conjunto, referencia);
        Assert.AreEqual(1, projecao.Abertas.Count);
        Assert.AreEqual("venda-lote", projecao.Abertas[0].Id);
        Assert.AreEqual(1, projecao.Quitadas.Count);
        Assert.AreEqual("venda-entrada", projecao.Quitadas[0].Id);
        Assert.AreEqual(1, projecao.Inativas.Count);
        Assert.AreEqual("venda-inativa", projecao.Inativas[0].Id);
        Assert.AreEqual(1, projecao.Prejuizos.Count);
        Assert.AreEqual("venda-prejuizo", projecao.Prejuizos[0].Id);
        Assert.AreEqual(10_000L, projecao.TotalEmAberto.Centavos);

        var entrada = snapshot.Conjunto.Vendas[0];
        Assert.AreEqual(20_000L, entrada.ValorTotalBase.Centavos);
        Assert.AreEqual("receb-entrada", entrada.Recebimentos[0].Id);
        Assert.AreEqual(OrigemRecebimento.Entrada, entrada.Recebimentos[0].Origem);
        Assert.AreEqual(10_000L, entrada.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual("parcela-entrada", entrada.Recebimentos[0].Alocacoes[0].ParcelaId);
        Assert.AreEqual("receb-individual-corrigido", entrada.Recebimentos[1].Id);
        Assert.AreEqual(OrigemRecebimento.Individual, entrada.Recebimentos[1].Origem);
        Assert.AreEqual(new DateOnly(2027, 3, 5), entrada.Recebimentos[1].Data);
        Assert.AreEqual(10_500L, entrada.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(500L, entrada.Recebimentos[1].Acrescimo.Centavos);
        Assert.AreEqual("parcela-futura", entrada.Recebimentos[1].Alocacoes[0].ParcelaId);

        var vendaLote = snapshot.Conjunto.Vendas[1];
        Assert.AreEqual("receb-lote-marco", vendaLote.Recebimentos[0].Id);
        Assert.AreEqual(OrigemRecebimento.HistoricoLote, vendaLote.Recebimentos[0].Origem);
        Assert.AreEqual(2, vendaLote.Recebimentos[0].Alocacoes.Count);
        Assert.AreEqual("lote-parcela-1", vendaLote.Recebimentos[0].Alocacoes[0].ParcelaId);
        Assert.AreEqual("lote-parcela-2", vendaLote.Recebimentos[0].Alocacoes[1].ParcelaId);
        Assert.AreEqual(20_000L, vendaLote.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(10_000L, vendaLote.Recebimentos[0].Alocacoes[0].Valor.Centavos);
        Assert.AreEqual(10_000L, vendaLote.Recebimentos[0].Alocacoes[1].Valor.Centavos);
        Assert.AreEqual("receb-individual-fevereiro", vendaLote.Recebimentos[1].Id);
        Assert.IsTrue(vendaLote.Recebimentos[1].Data < vendaLote.Recebimentos[0].Data);
        Assert.AreEqual(OrigemRecebimento.Individual, vendaLote.Recebimentos[1].Origem);
        Assert.AreEqual(11_000L, vendaLote.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(1_000L, vendaLote.Recebimentos[1].Acrescimo.Centavos);
        Assert.AreEqual("lote-parcela-3", vendaLote.Recebimentos[1].Alocacoes[0].ParcelaId);
        Assert.AreEqual(11_000L, vendaLote.Recebimentos[1].Alocacoes[0].Valor.Centavos);
        Assert.AreEqual(31_000L, ExigirProjecao(snapshot.Conjunto, referencia).Vendas[1].TotalRecebido.Centavos);
        Assert.AreEqual(1_000L, ExigirProjecao(snapshot.Conjunto, referencia).Vendas[1].TotalAcrescimos.Centavos);
        Assert.AreEqual(41_000L, ExigirProjecao(snapshot.Conjunto, referencia).Vendas[1].ValorTotalEfetivo.Centavos);
        Assert.AreEqual(10_000L, ExigirProjecao(snapshot.Conjunto, referencia).Vendas[1].Saldo.Centavos);

        var vendaInativa = snapshot.Conjunto.Vendas[2];
        Assert.AreEqual("receb-inativa", vendaInativa.Recebimentos.Single().Id);
        Assert.AreEqual(OrigemRecebimento.Individual, vendaInativa.Recebimentos.Single().Origem);
        Assert.AreEqual("inativa-parcela", vendaInativa.Recebimentos.Single().Alocacoes.Single().ParcelaId);

        var vendaPrejuizo = snapshot.Conjunto.Vendas[3];
        Assert.AreEqual("receb-prejuizo", vendaPrejuizo.Recebimentos.Single().Id);
        Assert.AreEqual(OrigemRecebimento.Individual, vendaPrejuizo.Recebimentos.Single().Origem);
        Assert.AreEqual("prejuizo-parcela-1", vendaPrejuizo.Recebimentos.Single().Alocacoes.Single().ParcelaId);

        var relatorioMarco = ExigirRelatorio(
            snapshot.Conjunto,
            referencia,
            new DateOnly(2027, 3, 15));
        Assert.AreEqual(3, relatorioMarco.Recebimentos.Count);
        CollectionAssert.AreEqual(
            new[] { "receb-individual-corrigido", "receb-lote-marco", "receb-inativa" },
            relatorioMarco.Recebimentos.Select(recebimento => recebimento.Id).ToArray());
        Assert.AreEqual(40_500L, relatorioMarco.TotalRecebido.Centavos);
        Assert.AreEqual(10_500L, relatorioMarco.RecebimentosDiarios[4].Total.Centavos);
        Assert.AreEqual(10_000L, relatorioMarco.RecebimentosDiarios[9].Total.Centavos);
        Assert.AreEqual(20_000L, relatorioMarco.RecebimentosDiarios[19].Total.Centavos);
        Assert.AreEqual(
            relatorioMarco.TotalRecebido.Centavos,
            relatorioMarco.RecebimentosDiarios.Sum(item => item.Total.Centavos));
        Assert.AreEqual(0L, relatorioMarco.TotalPrejuizo.Centavos);

        var relatorioFevereiro = ExigirRelatorio(
            snapshot.Conjunto,
            referencia,
            new DateOnly(2027, 2, 1));
        Assert.AreEqual(11_000L, relatorioFevereiro.TotalRecebido.Centavos);
        Assert.IsFalse(relatorioFevereiro.Recebimentos.Any(
            recebimento => recebimento.Id == "receb-individual-corrigido"));
    }

    private async Task ExecutarAsync(string sql)
    {
        await using var conexao = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = _caminhoBanco,
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

    private static ProjecaoConjuntoVendas ExigirProjecao(ConjuntoVendas conjunto, DateOnly referencia)
    {
        var resultado = conjunto.Projetar(referencia);
        if (resultado is ResultadoDominio<ProjecaoConjuntoVendas>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoDominio<ProjecaoConjuntoVendas>.Sucesso>(resultado).Valor;
    }

    private static RelatorioMensalVendas ExigirRelatorio(
        ConjuntoVendas conjunto,
        DateOnly referencia,
        DateOnly mes)
    {
        var resultado = conjunto.GerarRelatorioMensal(referencia, mes);
        if (resultado is ResultadoDominio<RelatorioMensalVendas>.Falha falha)
        {
            Assert.Fail($"{falha.Erro.Codigo}: {falha.Erro.Mensagem}");
        }

        return Assert.IsInstanceOfType<ResultadoDominio<RelatorioMensalVendas>.Sucesso>(resultado).Valor;
    }
}
