using Microsoft.Data.Sqlite;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

namespace VendasEmAberto.IntegrationTests.Persistencia;

[TestClass]
public sealed class LeitorVendasSqliteTests
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
            $"vendas-em-aberto-read-{Guid.NewGuid():N}");
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
    public async Task Carregar_BancoPreparadoVazioRetornaConjuntoVazioERevisaoAtual()
    {
        await InicializarBancoAsync();
        await ExecutarAsync("UPDATE EstadoArmazenamento SET Revisao = 12 WHERE Id = 1;");

        var resultado = await _leitor.CarregarAsync(_caminhoBanco, new DateOnly(2026, 3, 1));

        var snapshot = ExigirSnapshotValido(resultado);
        Assert.AreEqual(12L, snapshot.Revisao);
        Assert.AreEqual(0, snapshot.Conjunto.Vendas.Count);
        var projecao = ExigirProjecao(snapshot.Conjunto, new DateOnly(2026, 3, 1));
        Assert.AreEqual(0L, projecao.TotalEmAberto.Centavos);
        Assert.AreEqual(0L, projecao.RecebidoNoMes.Centavos);
    }

    [TestMethod]
    public async Task Carregar_ReconstroiCamposHistoricoOrdemDescricaoNulaEUnicodeSemTracking()
    {
        await InicializarBancoAsync();
        await ExecutarAsync("""
            INSERT INTO Identificadores (Id, Tipo) VALUES
                ('venda-a', 0), ('parcela-a-entrada', 1), ('parcela-a-futura', 1),
                ('recebimento-a-entrada', 2), ('recebimento-a-individual', 2),
                ('venda-b', 0), ('parcela-b-unica', 1);

            INSERT INTO Vendas
                (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                 ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES
                ('venda-a', 0, 0, 'Cliente A', '12345678909', '1198765432', 'Descrição preservada', '2026-01-31', 20000),
                ('venda-b', 1, 1, 'Cliente B', '12345678909', '2198765432', NULL, '2026-01-01', 5000);

            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento) VALUES
                ('parcela-a-entrada', 'venda-a', 1, 10000, '2026-01-31'),
                ('parcela-a-futura', 'venda-a', 2, 10000, '2026-02-28'),
                ('parcela-b-unica', 'venda-b', 1, 5000, '2026-02-01');

            INSERT INTO Recebimentos
                (Id, VendaId, Ordem, Data, Forma, Origem, ValorCentavos, AcrescimoCentavos, Observacao)
            VALUES
                ('recebimento-a-entrada', 'venda-a', 0, '2026-01-31', 1, 0, 10000, 0, ''),
                ('recebimento-a-individual', 'venda-a', 1, '2026-02-28', 0, 1, 10500, 500, '🎓✨');

            INSERT INTO Alocacoes (RecebimentoId, Ordem, VendaId, ParcelaId, ValorCentavos) VALUES
                ('recebimento-a-entrada', 0, 'venda-a', 'parcela-a-entrada', 10000),
                ('recebimento-a-individual', 0, 'venda-a', 'parcela-a-futura', 10500);
            """);

        var resultado = await _leitor.CarregarAsync(_caminhoBanco, new DateOnly(2026, 3, 1));

        var snapshot = ExigirSnapshotValido(resultado);
        Assert.AreEqual(0L, snapshot.Revisao);
        Assert.AreEqual(2, snapshot.Conjunto.Vendas.Count);

        var primeira = snapshot.Conjunto.Vendas[0];
        Assert.AreEqual("venda-a", primeira.Id);
        Assert.AreEqual(StatusAdministrativoVenda.Ativo, primeira.StatusAdministrativo);
        Assert.AreEqual("Cliente A", primeira.Cliente.Nome);
        Assert.AreEqual("12345678909", primeira.Cliente.Cpf);
        Assert.AreEqual("1198765432", primeira.Cliente.Telefone);
        Assert.AreEqual("Descrição preservada", primeira.Cliente.Descricao);
        Assert.AreEqual(new DateOnly(2026, 1, 31), primeira.DataVenda);
        Assert.AreEqual(20_000L, primeira.ValorTotalBase.Centavos);
        Assert.AreEqual(1, primeira.Parcelas[0].Numero);
        Assert.AreEqual(10_000L, primeira.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual(new DateOnly(2026, 1, 31), primeira.Parcelas[0].Vencimento);
        Assert.AreEqual(2, primeira.Parcelas[1].Numero);
        Assert.AreEqual(10_000L, primeira.Parcelas[1].ValorBase.Centavos);
        Assert.AreEqual(new DateOnly(2026, 2, 28), primeira.Parcelas[1].Vencimento);
        CollectionAssert.AreEqual(
            new[] { "parcela-a-entrada", "parcela-a-futura" },
            primeira.Parcelas.Select(parcela => parcela.Id).ToArray());
        CollectionAssert.AreEqual(
            new[] { "recebimento-a-entrada", "recebimento-a-individual" },
            primeira.Recebimentos.Select(recebimento => recebimento.Id).ToArray());
        Assert.AreEqual(OrigemRecebimento.Entrada, primeira.Recebimentos[0].Origem);
        Assert.AreEqual(new DateOnly(2026, 1, 31), primeira.Recebimentos[0].Data);
        Assert.AreEqual(FormaPagamento.Pix, primeira.Recebimentos[0].Forma);
        Assert.AreEqual(10_000L, primeira.Recebimentos[0].Valor.Centavos);
        Assert.AreEqual(0L, primeira.Recebimentos[0].Acrescimo.Centavos);
        Assert.AreEqual(string.Empty, primeira.Recebimentos[0].Observacao);
        Assert.AreEqual("parcela-a-entrada", primeira.Recebimentos[0].Alocacoes[0].ParcelaId);
        Assert.AreEqual(10_000L, primeira.Recebimentos[0].Alocacoes[0].Valor.Centavos);
        Assert.AreEqual(OrigemRecebimento.Individual, primeira.Recebimentos[1].Origem);
        Assert.AreEqual(new DateOnly(2026, 2, 28), primeira.Recebimentos[1].Data);
        Assert.AreEqual(FormaPagamento.Dinheiro, primeira.Recebimentos[1].Forma);
        Assert.AreEqual(10_500L, primeira.Recebimentos[1].Valor.Centavos);
        Assert.AreEqual(500L, primeira.Recebimentos[1].Acrescimo.Centavos);
        Assert.AreEqual("🎓✨", primeira.Recebimentos[1].Observacao);
        Assert.AreEqual("parcela-a-futura", primeira.Recebimentos[1].Alocacoes[0].ParcelaId);

        var segunda = snapshot.Conjunto.Vendas[1];
        Assert.AreEqual("venda-b", segunda.Id);
        Assert.AreEqual(StatusAdministrativoVenda.Inativo, segunda.StatusAdministrativo);
        Assert.AreEqual(primeira.Cliente.Cpf, segunda.Cliente.Cpf);
        Assert.AreEqual("Cliente B", segunda.Cliente.Nome);
        Assert.AreEqual("2198765432", segunda.Cliente.Telefone);
        Assert.IsNull(segunda.Cliente.Descricao);
        Assert.AreEqual(new DateOnly(2026, 1, 1), segunda.DataVenda);
        Assert.AreEqual(5_000L, segunda.ValorTotalBase.Centavos);
        Assert.AreEqual(0, segunda.Recebimentos.Count);
        Assert.AreEqual("parcela-b-unica", segunda.Parcelas[0].Id);
        Assert.AreEqual(1, segunda.Parcelas[0].Numero);
        Assert.AreEqual(5_000L, segunda.Parcelas[0].ValorBase.Centavos);
        Assert.AreEqual(new DateOnly(2026, 2, 1), segunda.Parcelas[0].Vencimento);

        var projecao = ExigirProjecao(snapshot.Conjunto, new DateOnly(2026, 3, 1)).Vendas[0];
        Assert.AreEqual(20_000L, projecao.ValorTotalBase.Centavos);
        Assert.AreEqual(20_500L, projecao.ValorTotalEfetivo.Centavos);
        Assert.AreEqual(20_500L, projecao.TotalRecebido.Centavos);
    }

    [TestMethod]
    public async Task Carregar_PreservaDatasCivisExtremasValidas()
    {
        await InicializarBancoAsync();
        await ExecutarAsync("""
            INSERT INTO Identificadores (Id, Tipo) VALUES
                ('venda-minima', 0), ('parcela-minima', 1),
                ('venda-maxima', 0), ('parcela-maxima', 1);

            INSERT INTO Vendas
                (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                 ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES
                ('venda-minima', 0, 0, 'Data mínima', '12345678909', '1198765432', NULL, '0001-01-01', 1),
                ('venda-maxima', 1, 0, 'Data máxima', '12345678909', '2198765432', NULL, '9998-12-31', 1);

            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento) VALUES
                ('parcela-minima', 'venda-minima', 1, 1, '0001-02-01'),
                ('parcela-maxima', 'venda-maxima', 1, 1, '9999-01-31');
            """);

        var resultado = await _leitor.CarregarAsync(_caminhoBanco, DateOnly.MaxValue);

        var vendas = ExigirSnapshotValido(resultado).Conjunto.Vendas;
        Assert.AreEqual(DateOnly.MinValue, vendas[0].DataVenda);
        Assert.AreEqual(DateOnly.MinValue.AddMonths(1), vendas[0].Parcelas[0].Vencimento);
        Assert.AreEqual(new DateOnly(9998, 12, 31), vendas[1].DataVenda);
        Assert.AreEqual(new DateOnly(9999, 1, 31), vendas[1].Parcelas[0].Vencimento);
    }

    [TestMethod]
    public async Task Carregar_PreservaLimiteMaximoDeCentavos()
    {
        await InicializarBancoAsync();
        await ExecutarAsync("""
            INSERT INTO Identificadores (Id, Tipo) VALUES ('venda-limite', 0), ('parcela-limite', 1);
            INSERT INTO Vendas
                (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                 ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
            VALUES
                ('venda-limite', 0, 0, 'Limite', '12345678909', '1198765432', NULL, '2026-01-01', 9007199254740991);
            INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento)
            VALUES ('parcela-limite', 'venda-limite', 1, 9007199254740991, '2026-02-01');
            """);

        var resultado = await _leitor.CarregarAsync(_caminhoBanco, new DateOnly(2026, 3, 1));

        var venda = ExigirSnapshotValido(resultado).Conjunto.Vendas.Single();
        Assert.AreEqual(Dinheiro.LimiteCentavos, venda.ValorTotalBase.Centavos);
        Assert.AreEqual(Dinheiro.LimiteCentavos, venda.Parcelas[0].ValorBase.Centavos);
    }

    private async Task InicializarBancoAsync()
    {
        var resultado = await _inicializador.InicializarAsync(_caminhoBanco);
        Assert.IsInstanceOfType<ResultadoOperacaoArmazenamento.Sucesso>(resultado);
    }

    private async Task ExecutarAsync(string sql)
    {
        await using var conexao = CriarConexao(SqliteOpenMode.ReadWrite);
        await conexao.OpenAsync();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = sql;
        await comando.ExecuteNonQueryAsync();
    }

    private SqliteConnection CriarConexao(SqliteOpenMode modo)
    {
        return new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = _caminhoBanco,
            Mode = modo,
            ForeignKeys = true,
            DefaultTimeout = 5,
            Pooling = false
        }.ToString());
    }

    private SnapshotVendas ExigirSnapshotValido(ResultadoArmazenamento<SnapshotVendas> resultado)
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
}
