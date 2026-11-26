using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;

[TestClass]
public sealed class EditarClienteVendaHandlerTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-edicao.db");

    [TestMethod]
    public async Task Handle_EditaClienteEmTodosStatusPreservandoContratoHistoricoEOutrasVendas()
    {
        var vendas = new[]
        {
            CriarVenda("ativa-aberta", StatusAdministrativoVenda.Ativo, paga: false),
            CriarVenda("ativa-quitada", StatusAdministrativoVenda.Ativo, paga: true),
            CriarVenda("inativa", StatusAdministrativoVenda.Inativo, paga: false),
            CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, paga: false),
            CriarVenda("outra-venda", StatusAdministrativoVenda.Ativo, paga: false)
        };

        foreach (var idAlvo in new[] { "ativa-aberta", "ativa-quitada", "inativa", "prejuizo" })
        {
            var armazenamento = new ArmazenamentoFake(Conjunto(vendas), revisao: 5);
            var handler = new EditarClienteVendaHandler(armazenamento, new DestinoArmazenamentoVendas(Caminho));
            var resultado = await handler.Handle(Comando(idAlvo, revisao: 5), CancellationToken.None);

            Assert.IsTrue(resultado.IsSuccess, idAlvo);
            Assert.AreEqual(6L, resultado.Value.Resumo.Revisao);
            Assert.AreEqual("Nome atualizado", resultado.Value.Resumo.Cliente.Nome);
            Assert.AreEqual("52998224725", resultado.Value.Resumo.Cliente.Cpf);
            Assert.AreEqual("11900001111", resultado.Value.Resumo.Cliente.Telefone);
            Assert.AreEqual("Nova descrição", resultado.Value.Resumo.Cliente.Descricao);
            Assert.AreEqual(1, armazenamento.Salvamentos);
            var candidatoSalvo = armazenamento.CandidatoSalvo!;
            Assert.AreEqual(vendas.Length, candidatoSalvo.Count);

            var indice = Array.FindIndex(vendas, venda => venda.Id == idAlvo);
            Assert.AreEqual(idAlvo, candidatoSalvo[indice].Id);
            Assert.AreEqual("Nome atualizado", candidatoSalvo[indice].Cliente.Nome);
            Assert.AreEqual(vendas[indice].ValorTotalBase, candidatoSalvo[indice].ValorTotalBase);
            CollectionAssert.AreEqual(
                vendas[indice].Parcelas.Select(p => p.Id).ToArray(),
                candidatoSalvo[indice].Parcelas.Select(p => p.Id).ToArray());
            CollectionAssert.AreEqual(
                vendas[indice].Recebimentos.Select(r => r.Id).ToArray(),
                candidatoSalvo[indice].Recebimentos.Select(r => r.Id).ToArray());
            foreach (var outra in candidatoSalvo.Where(v => v.Id != idAlvo))
            {
                Assert.AreEqual(vendas.Single(v => v.Id == outra.Id).Cliente.Nome, outra.Cliente.Nome);
            }
        }
    }

    [TestMethod]
    public async Task Handle_CpfJaUsadoPorOutraVendaNaoPropagaEdicaoParaEla()
    {
        var alvo = CriarVenda("alvo", StatusAdministrativoVenda.Ativo, paga: false);
        var outra = CriarVenda("outra", StatusAdministrativoVenda.Ativo, paga: false);
        var armazenamento = new ArmazenamentoFake(Conjunto([alvo, outra]), 2);
        var comando = Comando("alvo", revisao: 2) with { Nome = "Nome no alvo", Cpf = "11144477735" };

        var resultado = await CriarHandler(armazenamento).Handle(comando, CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual("11144477735", resultado.Value.Resumo.Cliente.Cpf);
        var candidato = armazenamento.CandidatoSalvo!;
        Assert.AreEqual("Cliente", candidato.Single(v => v.Id == "outra").Cliente.Nome);
        Assert.AreEqual(alvo.ValorTotalBase, candidato.Single(v => v.Id == "alvo").ValorTotalBase);
    }

    [TestMethod]
    public async Task Handle_ClienteNormalizadoIdenticoRetornaSnapshotSemSalvarERevisaoObsoletaFalhaAntesDoNoOp()
    {
        var venda = CriarVenda("venda", StatusAdministrativoVenda.Ativo, paga: false);
        var comandoNoOp = new EditarClienteVendaCommand(
            "venda", " Cliente ", "529.982.247-25", "(11) 98765-4321", "   ", Referencia, 3);
        var armazenamento = new ArmazenamentoFake(Conjunto([venda]), 3);
        var resultado = await CriarHandler(armazenamento).Handle(comandoNoOp, CancellationToken.None);

        Assert.IsTrue(resultado.IsSuccess);
        Assert.AreEqual(3L, resultado.Value.Resumo.Revisao);
        Assert.AreEqual(0, armazenamento.Salvamentos);
        Assert.IsNull(armazenamento.CandidatoSalvo);

        var armazenamentoObsoleto = new ArmazenamentoFake(Conjunto([venda]), 4);
        var obsoleto = await CriarHandler(armazenamentoObsoleto).Handle(comandoNoOp, CancellationToken.None);
        Assert.IsTrue(obsoleto.IsFailed);
        Assert.AreEqual("conflito-revisao", Assert.IsInstanceOfType<ErroAplicacao>(obsoleto.Errors.Single()).Codigo);
        Assert.AreEqual(0, armazenamentoObsoleto.Salvamentos);
    }

    [TestMethod]
    public async Task Handle_ClienteInvalidoOuVendaAusenteFalhaSemGravar()
    {
        var venda = CriarVenda("venda", StatusAdministrativoVenda.Ativo, paga: false);
        var armazenamentoInvalido = new ArmazenamentoFake(Conjunto([venda]), 0);
        var invalido = await CriarHandler(armazenamentoInvalido).Handle(
            Comando("venda", revisao: 0) with { Cpf = "00000000000" },
            CancellationToken.None);
        Assert.IsTrue(invalido.IsFailed);
        Assert.AreEqual(0, armazenamentoInvalido.Carregamentos);
        Assert.AreEqual(0, armazenamentoInvalido.Salvamentos);

        var armazenamentoAusente = new ArmazenamentoFake(Conjunto([venda]), 0);
        var ausente = await CriarHandler(armazenamentoAusente).Handle(
            Comando("id-ausente", revisao: 0),
            CancellationToken.None);
        Assert.IsTrue(ausente.IsFailed);
        var erro = Assert.IsInstanceOfType<ErroAplicacao>(ausente.Errors.Single());
        Assert.AreEqual(CategoriaErroAplicacao.Inexistencia, erro.Categoria);
        Assert.AreEqual("venda-inexistente", erro.Codigo);
        Assert.AreEqual(0, armazenamentoAusente.Salvamentos);
    }

    private static EditarClienteVendaHandler CriarHandler(ArmazenamentoFake armazenamento) =>
        new(armazenamento, new DestinoArmazenamentoVendas(Caminho));

    private static EditarClienteVendaCommand Comando(string id, long revisao) => new(
        id,
        "Nome atualizado",
        "52998224725",
        "11900001111",
        "Nova descrição",
        Referencia,
        revisao);

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, bool paga)
    {
        var venda = Sucesso(Venda.Cadastrar(
            id,
            Sucesso(DadosClienteVenda.Criar("Cliente", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recibo",
                $"{id}-parcela",
                Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1),
                FormaPagamento.Pix,
                Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

    private static ConjuntoVendas Conjunto(IEnumerable<Venda> vendas) => Sucesso(ConjuntoVendas.Criar(vendas));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class ArmazenamentoFake(ConjuntoVendas conjunto, long revisao) : IArmazenamentoVendas
    {
        public int Carregamentos { get; private set; }

        public int Salvamentos { get; private set; }

        public IReadOnlyList<Venda>? CandidatoSalvo { get; private set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default) =>
            Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            return Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(new SnapshotVendas(conjunto, revisao)));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            CandidatoSalvo = candidatoCompleto.ToArray();
            return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
