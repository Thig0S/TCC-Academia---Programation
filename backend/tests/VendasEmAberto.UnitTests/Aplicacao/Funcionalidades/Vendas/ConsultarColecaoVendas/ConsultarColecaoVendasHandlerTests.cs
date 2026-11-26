using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

[TestClass]
public sealed class ConsultarColecaoVendasHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-colecao.db");

    [TestMethod]
    public async Task Handle_SeparaColecoesCompletasEmOrdemDaOrigemEMapeiaClienteRevisaoEReferencia()
    {
        var vendas = new[]
        {
            CriarVenda("aberta-a", StatusAdministrativoVenda.Ativo, paga: false),
            CriarVenda("inativa", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("quitada", StatusAdministrativoVenda.Ativo, paga: true),
            CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, paga: false),
            CriarVenda("aberta-b", StatusAdministrativoVenda.Ativo, paga: false)
        };
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar(vendas), 12);
        var handler = CriarHandler(armazenamento);
        var esperado = new Dictionary<ColecaoVendas, string[]>
        {
            [ColecaoVendas.Abertas] = ["aberta-a", "aberta-b"],
            [ColecaoVendas.Quitadas] = ["quitada"],
            [ColecaoVendas.Inativas] = ["inativa"],
            [ColecaoVendas.Prejuizo] = ["prejuizo"]
        };

        foreach (var (colecao, ids) in esperado)
        {
            var resultado = await handler.Handle(new ConsultarColecaoVendasQuery(colecao, Referencia), CancellationToken.None);
            Assert.IsTrue(resultado.IsSuccess);
            Assert.AreEqual(colecao, resultado.Value.Colecao);
            Assert.AreEqual(12L, resultado.Value.Revisao);
            Assert.AreEqual(Referencia, resultado.Value.Referencia);
            CollectionAssert.AreEqual(ids, resultado.Value.Vendas.Select(v => v.Id).ToArray());
            foreach (var resumo in resultado.Value.Vendas)
            {
                var raiz = vendas.Single(v => v.Id == resumo.Id);
                Assert.AreEqual(raiz.Cliente.Nome, resumo.Cliente.Nome);
                Assert.AreEqual(raiz.Cliente.Cpf, resumo.Cliente.Cpf);
                Assert.AreEqual(raiz.Cliente.Telefone, resumo.Cliente.Telefone);
                Assert.AreEqual(raiz.Cliente.Descricao, resumo.Cliente.Descricao);
                Assert.AreEqual(raiz.DataVenda, resumo.DataVenda);
                Assert.AreEqual(12L, resumo.Revisao);
                Assert.AreEqual(Referencia, resumo.Referencia);
            }
        }

        Assert.AreEqual(4, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.AreEqual(Caminho, armazenamento.CaminhosCarregados.Distinct(StringComparer.Ordinal).Single());
        CollectionAssert.AreEqual(Enumerable.Repeat(Referencia, 4).ToArray(), armazenamento.ReferenciasCarregadas.ToArray());
        CollectionAssert.AreEqual(Enumerable.Repeat(12L, 4).ToArray(), armazenamento.RevisoesRetornadas.ToArray());
    }

    [TestMethod]
    public async Task Handle_ConjuntoVazioRetornaColecaoProtegidaEEnumInvalidoFalhaAntesDaCarga()
    {
        var armazenamento = new ArmazenamentoFake(ConjuntoVendas.Criar([]), 0);
        var handler = CriarHandler(armazenamento);
        var vazio = await handler.Handle(new ConsultarColecaoVendasQuery(ColecaoVendas.Prejuizo, Referencia), CancellationToken.None);

        Assert.IsTrue(vazio.IsSuccess);
        Assert.AreEqual(0, vazio.Value.Vendas.Count);
        Assert.AreEqual(0L, vazio.Value.Revisao);
        Assert.AreEqual(Referencia, vazio.Value.Referencia);
        Assert.ThrowsExactly<NotSupportedException>(() => ((IList<VendasEmAberto.Aplicacao.Contratos.VendaResumoResposta>)vazio.Value.Vendas).Clear());
        Assert.AreEqual(1, armazenamento.Carregamentos);

        var invalido = await handler.Handle(
            new ConsultarColecaoVendasQuery((ColecaoVendas)99, Referencia),
            CancellationToken.None);
        Assert.IsTrue(invalido.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(invalido.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Validacao, erro.Categoria);
        Assert.AreEqual("colecao-invalida", erro.Codigo);
        Assert.AreEqual("colecao", erro.Campo);
        Assert.AreEqual(1, armazenamento.Carregamentos);
        Assert.AreEqual(0, armazenamento.Inicializacoes);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    private static ConsultarColecaoVendasHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar($"Cliente {id} 🪻", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento", $"{id}-parcela", Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1), FormaPagamento.Pix, Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ResultadoDominio<ConjuntoVendas> conjunto, long revisao) : IArmazenamentoVendas
    {
        private readonly SnapshotVendas _snapshot = new(Sucesso(conjunto), revisao);

        public int Carregamentos { get; private set; }

        public int Inicializacoes { get; private set; }

        public int Salvamentos { get; private set; }

        public List<string> CaminhosCarregados { get; } = [];

        public List<DateOnly> ReferenciasCarregadas { get; } = [];

        public List<long> RevisoesRetornadas { get; } = [];

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default)
        {
            Inicializacoes++;
            return Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());
        }

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            CaminhosCarregados.Add(caminhoAbsoluto);
            ReferenciasCarregadas.Add(referencia);
            RevisoesRetornadas.Add(_snapshot.Revisao);
            return Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(_snapshot));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
