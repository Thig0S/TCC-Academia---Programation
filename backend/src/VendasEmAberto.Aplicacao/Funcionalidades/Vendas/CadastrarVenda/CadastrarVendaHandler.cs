using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Comum.Identificadores;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;

public sealed class CadastrarVendaHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino,
    IGeradorIdentificadores gerador) : IRequestHandler<CadastrarVendaCommand, Result<VendaDetalheResposta>>
{
    public async Task<Result<VendaDetalheResposta>> Handle(
        CadastrarVendaCommand comando,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(comando);
        cancellationToken.ThrowIfCancellationRequested();

        var dadosCliente = DadosClienteVenda.Criar(comando.Nome, comando.Cpf, comando.Telefone, comando.Descricao);
        if (dadosCliente is not ResultadoDominio<DadosClienteVenda>.Sucesso clienteValido)
        {
            return Falha(((ResultadoDominio<DadosClienteVenda>.Falha)dadosCliente).Erro);
        }

        if (comando.RevisaoEsperada < 0)
        {
            return Falha(CriarErro("revisao-invalida", "A revisão esperada não pode ser negativa.", "revisaoEsperada"));
        }

        if (comando.ValorTotalCentavos <= 0)
        {
            return Falha(CriarErro("valor-invalido", "O total da venda deve ser positivo.", "valorTotal"));
        }

        if (comando.DataVenda > comando.Referencia)
        {
            return Falha(CriarErro("data-invalida", "A data da venda não pode ser futura.", "dataVenda"));
        }

        if (comando.QuantidadeParcelas < 1)
        {
            return Falha(CriarErro("valor-invalido", "Informe ao menos uma parcela.", "quantidadeParcelas"));
        }

        if (comando.Entrada is not null && comando.QuantidadeParcelas < 2)
        {
            return Falha(CriarErro(
                "valor-invalido",
                "Informe ao menos uma parcela futura, além da entrada.",
                "quantidadeParcelas"));
        }

        var valorTotal = Dinheiro.Criar(comando.ValorTotalCentavos);
        if (valorTotal is not ResultadoDominio<Dinheiro>.Sucesso totalValido)
        {
            return Falha(((ResultadoDominio<Dinheiro>.Falha)valorTotal).Erro);
        }

        DadosEntradaVenda? dadosEntrada = null;
        if (comando.Entrada is { } entrada)
        {
            var valorEntrada = Dinheiro.Criar(entrada.ValorCentavos);
            if (valorEntrada is not ResultadoDominio<Dinheiro>.Sucesso entradaValida)
            {
                return Falha(((ResultadoDominio<Dinheiro>.Falha)valorEntrada).Erro);
            }

            if (entrada.ValorCentavos <= 0 || entrada.ValorCentavos >= comando.ValorTotalCentavos)
            {
                return Falha(CriarErro(
                    "valor-invalido",
                    "A entrada deve ser positiva e menor que o total da venda.",
                    "entrada"));
            }

            if (!FormasPagamento.EhValida(entrada.Forma))
            {
                return Falha(CriarErro(
                    "dados-recebimento-invalidos",
                    "Informe uma forma de pagamento aceita para a entrada.",
                    "entrada.forma"));
            }

            dadosEntrada = new DadosEntradaVenda(
                "entrada-pendente",
                entradaValida.Valor,
                comando.DataVenda,
                entrada.Forma);
        }

        var quantidadeFutura = comando.QuantidadeParcelas - (dadosEntrada is null ? 0 : 1);
        if (comando.ValorTotalCentavos - (dadosEntrada?.Valor.Centavos ?? 0) < quantidadeFutura)
        {
            return Falha(CriarErro(
                "valor-invalido",
                "Informe ao menos um centavo para cada parcela futura.",
                "quantidadeParcelas"));
        }

        var calendario = CalendarioCivil.GerarVencimentos(comando.DataVenda, quantidadeFutura);
        if (calendario is not ResultadoDominio<IReadOnlyList<DateOnly>>.Sucesso)
        {
            var erroCalendario = ((ResultadoDominio<IReadOnlyList<DateOnly>>.Falha)calendario).Erro;
            return Falha(erroCalendario with { Campo = "dataVenda" });
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            comando.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<VendaDetalheResposta>(
                ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        if (snapshot.Revisao != comando.RevisaoEsperada)
        {
            return Falha(new ErroAplicacao(
                CategoriaErroAplicacao.Conflito,
                "conflito-revisao",
                "A revisão do armazenamento mudou. Recarregue os dados antes de tentar novamente.",
                "revisaoEsperada"));
        }

        var idVenda = gerador.Gerar();
        var idsParcelas = Enumerable.Range(0, comando.QuantidadeParcelas)
            .Select(_ => gerador.Gerar())
            .ToArray();
        if (dadosEntrada is not null)
        {
            dadosEntrada = dadosEntrada with { RecebimentoId = gerador.Gerar() };
        }

        var resultadoVenda = Venda.Cadastrar(
            idVenda,
            clienteValido.Valor,
            comando.DataVenda,
            totalValido.Valor,
            comando.QuantidadeParcelas,
            idsParcelas,
            comando.Referencia,
            dadosEntrada);
        if (resultadoVenda is not ResultadoDominio<Venda>.Sucesso vendaCriada)
        {
            return Falha(((ResultadoDominio<Venda>.Falha)resultadoVenda).Erro);
        }

        var candidato = snapshot.Conjunto.AceitarCandidato(snapshot.Conjunto.Vendas.Append(vendaCriada.Valor));
        if (candidato is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
        {
            return Falha(((ResultadoDominio<ConjuntoVendas>.Falha)candidato).Erro);
        }

        var projecao = vendaCriada.Valor.Projetar(comando.Referencia);
        if (projecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecaoValida)
        {
            return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecao).Erro);
        }

        var resposta = MapeadorVendaResposta.MapearDetalhe(
            vendaCriada.Valor,
            projecaoValida.Valor,
            snapshot.Revisao,
            comando.Referencia);

        var salvo = await armazenamento.SalvarAsync(
            destino.CaminhoAbsoluto,
            conjuntoValido.Valor.Vendas,
            snapshot.Revisao,
            comando.Referencia,
            cancellationToken);
        if (salvo is ResultadoArmazenamento<long>.Falha falhaGravacao)
        {
            return Result.Fail<VendaDetalheResposta>(
                ConversorErrosAplicacao.Converter(falhaGravacao.Erro));
        }

        var revisaoConfirmada = ((ResultadoArmazenamento<long>.Sucesso)salvo).Valor;
        return Result.Ok(new VendaDetalheResposta(
            resposta.Resumo with { Revisao = revisaoConfirmada },
            resposta.Parcelas,
            resposta.Recebimentos));
    }

    private static Result<VendaDetalheResposta> Falha(ErroDominio erro) =>
        Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(erro));

    private static Result<VendaDetalheResposta> Falha(ErroAplicacao erro) =>
        Result.Fail<VendaDetalheResposta>(erro);

    private static ErroDominio CriarErro(string codigo, string mensagem, string campo) =>
        new(CategoriaErroDominio.Validacao, codigo, mensagem, campo);
}
