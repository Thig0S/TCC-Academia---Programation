using FluentResults;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.UnitTests.Aplicacao.Funcionalidades.Comum;

[TestClass]
public sealed class HandlersFalhasCancelamentoTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 31);
    private static readonly string Caminho = Path.Combine(Path.GetTempPath(), "vendas-falhas-cancelamento.db");

    [TestMethod]
    public async Task Commands_ComTokenPreviamenteCanceladoNaoLeemGravamOuGeramIds()
    {
        foreach (var criarOperacao in Operacoes())
        {
            var armazenamento = CriarArmazenamento();
            using var cancelamento = new CancellationTokenSource();
            cancelamento.Cancel();

            await AssertCancelamentoAsync(() => criarOperacao(armazenamento)(cancelamento.Token));

            Assert.AreEqual(0, armazenamento.Carregamentos, "A carga ocorreu antes de observar o cancelamento.");
            Assert.AreEqual(0, armazenamento.Salvamentos);
            Assert.AreEqual(0, armazenamento.IdentificadoresGerados);
        }
    }

    [TestMethod]
    public async Task Commands_CancelamentoAntesDoCommitPropagaSemPublicarRespostaEEncaminhaTokenUmaVez()
    {
        foreach (var criarOperacao in Operacoes())
        {
            var armazenamento = CriarArmazenamento();
            using var cancelamento = new CancellationTokenSource();
            armazenamento.AoSalvar = token =>
            {
                Assert.AreEqual(cancelamento.Token, token);
                cancelamento.Cancel();
                return Task.FromCanceled<ResultadoArmazenamento<long>>(token);
            };

            await AssertCancelamentoAsync(() => criarOperacao(armazenamento)(cancelamento.Token));

            Assert.AreEqual(1, armazenamento.Carregamentos);
            Assert.AreEqual(1, armazenamento.Salvamentos);
            Assert.AreEqual(cancelamento.Token, armazenamento.TokenCarregado);
            Assert.AreEqual(cancelamento.Token, armazenamento.TokenSalvo);
            Assert.IsNotNull(armazenamento.CandidatoRecebido);
        }
    }

    [TestMethod]
    public async Task Commands_CancelamentoDepoisDoCommitConfirmadoMantemSucessoSemRecargaObrigatoria()
    {
        foreach (var criarOperacao in Operacoes())
        {
            var armazenamento = CriarArmazenamento();
            using var cancelamento = new CancellationTokenSource();
            armazenamento.AoSalvar = token =>
            {
                cancelamento.Cancel();
                return Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(5));
            };

            var resultado = await criarOperacao(armazenamento)(cancelamento.Token);

            Assert.IsTrue(resultado.IsSuccess);
            Assert.AreEqual(5L, resultado.Value.Resumo.Revisao);
            Assert.IsTrue(cancelamento.IsCancellationRequested);
            Assert.AreEqual(1, armazenamento.Carregamentos);
            Assert.AreEqual(1, armazenamento.Salvamentos);
            Assert.AreEqual(cancelamento.Token, armazenamento.TokenCarregado);
            Assert.AreEqual(cancelamento.Token, armazenamento.TokenSalvo);
        }
    }

    [TestMethod]
    public async Task Commands_FalhasFisicasEConfirmacaoIndeterminadaNaoRetentamNemDevolvemSucessoCandidato()
    {
        var codigos = new[]
        {
            (CodigosErroArmazenamento.BancoOcupado, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.ArmazenamentoIndisponivel, CategoriaErroAplicacao.Infraestrutura),
            (CodigosErroArmazenamento.ConfirmacaoIndeterminada, CategoriaErroAplicacao.EstadoIndeterminado)
        };

        foreach (var criarOperacao in Operacoes())
        {
            foreach (var (codigo, categoria) in codigos)
            {
                var armazenamento = CriarArmazenamento();
                armazenamento.AoSalvar = _ => Task.FromResult(ResultadoArmazenamento<long>.CriarFalha(
                    new ErroArmazenamento(codigo, "O armazenamento não confirmou a gravação.")));

                var resultado = await criarOperacao(armazenamento)(CancellationToken.None);

                Assert.IsTrue(resultado.IsFailed);
                var erro = Assert.IsInstanceOfType<ErroAplicacao>(resultado.Errors.Single());
                Assert.AreEqual(codigo, erro.Codigo);
                Assert.AreEqual(categoria, erro.Categoria);
                Assert.AreEqual(1, armazenamento.Carregamentos);
                Assert.AreEqual(1, armazenamento.Salvamentos);
                Assert.AreEqual(0, armazenamento.CarregamentosDepoisDeSalvar);
                Assert.IsNotNull(armazenamento.CandidatoRecebido);
                AssertMensagensSemDadosSensiveis(resultado);
            }
        }
    }

    [TestMethod]
    public async Task Commands_ExcecaoDeDependenciaECodigoDeArmazenamentoDesconhecidoPropagamFalhaTecnicaSemSave()
    {
        foreach (var criarOperacao in Operacoes())
        {
            var excecaoEsperada = new InvalidOperationException("erro técnico sintético");
            var armazenamentoComExcecao = CriarArmazenamento();
            armazenamentoComExcecao.AoCarregar = (_, _, _) => Task.FromException<ResultadoArmazenamento<SnapshotVendas>>(excecaoEsperada);

            var observada = await Assert.ThrowsExactlyAsync<InvalidOperationException>(async () =>
                await criarOperacao(armazenamentoComExcecao)(CancellationToken.None));
            Assert.AreSame(excecaoEsperada, observada);
            Assert.AreEqual(1, armazenamentoComExcecao.Carregamentos);
            Assert.AreEqual(0, armazenamentoComExcecao.Salvamentos);
            Assert.IsNull(armazenamentoComExcecao.CandidatoRecebido);

            var armazenamentoComCodigoDesconhecido = CriarArmazenamento();
            armazenamentoComCodigoDesconhecido.AoCarregar = (_, _, _) => Task.FromResult(
                ResultadoArmazenamento<SnapshotVendas>.CriarFalha(new ErroArmazenamento(
                    "codigo-de-armazenamento-nao-reconhecido",
                    "mensagem pública segura")));

            var codigoObservado = await Assert.ThrowsExactlyAsync<InvalidOperationException>(async () =>
                await criarOperacao(armazenamentoComCodigoDesconhecido)(CancellationToken.None));
            Assert.AreEqual("Código de erro de armazenamento não reconhecido.", codigoObservado.Message);
            Assert.AreEqual(1, armazenamentoComCodigoDesconhecido.Carregamentos);
            Assert.AreEqual(0, armazenamentoComCodigoDesconhecido.Salvamentos);
            Assert.IsNull(armazenamentoComCodigoDesconhecido.CandidatoRecebido);
        }
    }

    private static IEnumerable<Func<ArmazenamentoFake, Func<CancellationToken, Task<Result<VendaDetalheResposta>>>>> Operacoes()
    {
        yield return armazenamento => token => new CadastrarVendaHandler(
                armazenamento, new DestinoArmazenamentoVendas(Caminho), new GeradorFake(armazenamento))
            .Handle(new CadastrarVendaCommand(
                "Nova venda", "52998224725", "11987654321", null,
                new DateOnly(2027, 3, 10), 10_000, 1, Referencia, 4), token);

        yield return armazenamento => token => new EditarClienteVendaHandler(
                armazenamento, new DestinoArmazenamentoVendas(Caminho))
            .Handle(new EditarClienteVendaCommand(
                "target", "Cliente alterado", "52998224725", "11987654321", null, Referencia, 4), token);

        yield return armazenamento => token => new AlterarStatusVendaHandler(
                armazenamento, new DestinoArmazenamentoVendas(Caminho))
            .Handle(new AlterarStatusVendaCommand(
                "target", StatusAdministrativoVenda.Inativo, Referencia, 4), token);

        yield return armazenamento => token => new RegistrarPagamentoHandler(
                armazenamento, new DestinoArmazenamentoVendas(Caminho), new GeradorFake(armazenamento))
            .Handle(new RegistrarPagamentoCommand(
                "target", "target-parcela-2", 10_000, new DateOnly(2027, 3, 20),
                FormaPagamento.Pix, null, Referencia, 4), token);

        yield return armazenamento => token => new CorrigirPagamentoHandler(
                armazenamento, new DestinoArmazenamentoVendas(Caminho))
            .Handle(new CorrigirPagamentoCommand(
                "target", "target-recebimento", 10_000, new DateOnly(2027, 3, 20),
                FormaPagamento.Pix, null, Referencia, 4), token);
    }

    private static ArmazenamentoFake CriarArmazenamento() => new(CriarSnapshot(), revisao: 4);

    private static async Task AssertCancelamentoAsync(Func<Task> acao)
    {
        try
        {
            await acao();
            Assert.Fail("Esperava cancelamento propagado.");
        }
        catch (OperationCanceledException)
        {
        }
    }

    private static void AssertMensagensSemDadosSensiveis(ResultBase resultado)
    {
        var mensagens = resultado.Errors
            .SelectMany(error => new[] { error.Message }.Concat(error.Reasons.Select(reason => reason.Message)))
            .ToArray();
        var dadosSensiveis = new[] { "SELECT", "52998224725", "11987654321", Caminho };

        foreach (var mensagem in mensagens)
        {
            foreach (var dado in dadosSensiveis)
            {
                Assert.IsFalse(
                    mensagem.Contains(dado, StringComparison.OrdinalIgnoreCase),
                    $"A mensagem pública expôs dado sensível: {dado}.");
            }
        }
    }

    private static SnapshotVendas CriarSnapshot()
    {
        var venda = Sucesso(Venda.Cadastrar(
            "target",
            Sucesso(DadosClienteVenda.Criar("Cliente target", "52998224725", "11987654321", null)),
            new DateOnly(2027, 1, 15),
            DinheiroValor(20_000),
            2,
            ["target-parcela-1", "target-parcela-2"],
            Referencia));
        venda = Sucesso(venda.RegistrarPagamento(
            "target-recebimento", "target-parcela-1", DinheiroValor(10_000),
            new DateOnly(2027, 2, 10), FormaPagamento.Pix, Referencia));
        return new SnapshotVendas(Sucesso(ConjuntoVendas.Criar([venda])), 4);
    }

    private static Dinheiro DinheiroValor(long centavos) => Sucesso(Dinheiro.Criar(centavos));

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private sealed class GeradorFake(ArmazenamentoFake armazenamento) : IGeradorIdentificadores
    {
        private int _indice;

        public string Gerar()
        {
            armazenamento.IdentificadoresGerados++;
            return $"gerado-{++_indice}";
        }
    }

    private sealed class ArmazenamentoFake(SnapshotVendas snapshot, long revisao) : IArmazenamentoVendas
    {
        public int Carregamentos { get; private set; }

        public int Salvamentos { get; private set; }

        public int CarregamentosDepoisDeSalvar { get; private set; }

        public int IdentificadoresGerados { get; set; }

        public CancellationToken TokenCarregado { get; private set; }

        public CancellationToken TokenSalvo { get; private set; }

        public IReadOnlyList<Venda>? CandidatoRecebido { get; private set; }

        public Func<string, DateOnly, CancellationToken, Task<ResultadoArmazenamento<SnapshotVendas>>>? AoCarregar { get; set; }

        public Func<CancellationToken, Task<ResultadoArmazenamento<long>>>? AoSalvar { get; set; }

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(string caminhoAbsoluto, CancellationToken cancellationToken = default) =>
            Task.FromResult(ResultadoOperacaoArmazenamento.CriarSucesso());

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Carregamentos++;
            TokenCarregado = cancellationToken;
            if (Salvamentos > 0)
            {
                CarregamentosDepoisDeSalvar++;
            }

            return AoCarregar?.Invoke(caminhoAbsoluto, referencia, cancellationToken) ??
                Task.FromResult(ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(snapshot));
        }

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            Salvamentos++;
            CandidatoRecebido = candidatoCompleto.ToArray();
            TokenSalvo = cancellationToken;
            return AoSalvar?.Invoke(cancellationToken) ??
                Task.FromResult(ResultadoArmazenamento<long>.CriarSucesso(revisao + 1));
        }
    }
}
