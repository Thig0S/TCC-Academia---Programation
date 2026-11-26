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

namespace VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;

public sealed class RegistrarPagamentoHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino,
    IGeradorIdentificadores gerador) : IRequestHandler<RegistrarPagamentoCommand, Result<VendaDetalheResposta>>
{
    public async Task<Result<VendaDetalheResposta>> Handle(
        RegistrarPagamentoCommand comando,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(comando);
        cancellationToken.ThrowIfCancellationRequested();

        if (comando.RevisaoEsperada < 0)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "revisao-invalida",
                "A revisão esperada não pode ser negativa.",
                "revisaoEsperada"));
        }

        if (string.IsNullOrWhiteSpace(comando.VendaId))
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "identificador-invalido",
                "Informe o identificador da venda.",
                "vendaId"));
        }

        if (string.IsNullOrWhiteSpace(comando.ParcelaId))
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "identificador-invalido",
                "Informe o identificador da parcela.",
                "parcelaId"));
        }

        var valor = Dinheiro.Criar(comando.ValorRecebidoCentavos);
        if (valor is not ResultadoDominio<Dinheiro>.Sucesso valorValido)
        {
            return Falha(((ResultadoDominio<Dinheiro>.Falha)valor).Erro);
        }

        if (!FormasPagamento.EhValida(comando.Forma))
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "dados-recebimento-invalidos",
                "Informe forma de pagamento aceita.",
                "forma"));
        }

        if (comando.Data > comando.Referencia)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "dados-recebimento-invalidos",
                "A data do recebimento não pode ser posterior à referência.",
                "data"));
        }

        if ((comando.Observacao ?? string.Empty).EnumerateRunes().Count() > 20)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "observacao-longa-demais",
                "A observação deve ter no máximo 20 caracteres.",
                "observacao"));
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            comando.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        if (snapshot.Revisao != comando.RevisaoEsperada)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Conflito,
                "conflito-revisao",
                "A revisão do armazenamento mudou. Recarregue os dados antes de tentar novamente.",
                "revisaoEsperada"));
        }

        var indice = -1;
        for (var i = 0; i < snapshot.Conjunto.Vendas.Count; i++)
        {
            if (StringComparer.Ordinal.Equals(snapshot.Conjunto.Vendas[i].Id, comando.VendaId))
            {
                indice = i;
                break;
            }
        }

        if (indice < 0)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Inexistencia,
                "venda-inexistente",
                "A venda solicitada não foi encontrada.",
                "vendaId"));
        }

        var vendaAtualizada = snapshot.Conjunto.Vendas[indice].RegistrarPagamento(
            gerador.Gerar(),
            comando.ParcelaId,
            valorValido.Valor,
            comando.Data,
            comando.Forma,
            comando.Referencia,
            comando.Observacao);
        if (vendaAtualizada is not ResultadoDominio<Venda>.Sucesso vendaValida)
        {
            return Falha(((ResultadoDominio<Venda>.Falha)vendaAtualizada).Erro);
        }

        var vendasCandidatas = snapshot.Conjunto.Vendas.ToArray();
        vendasCandidatas[indice] = vendaValida.Valor;
        var candidato = snapshot.Conjunto.AceitarCandidato(vendasCandidatas);
        if (candidato is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
        {
            return Falha(((ResultadoDominio<ConjuntoVendas>.Falha)candidato).Erro);
        }

        var projecao = vendaValida.Valor.Projetar(comando.Referencia);
        if (projecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecaoValida)
        {
            return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecao).Erro);
        }

        var resposta = MapeadorVendaResposta.MapearDetalhe(
            vendaValida.Valor,
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
            return Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(falhaGravacao.Erro));
        }

        var revisaoConfirmada = ((ResultadoArmazenamento<long>.Sucesso)salvo).Valor;
        return Result.Ok(new VendaDetalheResposta(
            resposta.Resumo with { Revisao = revisaoConfirmada },
            resposta.Parcelas,
            resposta.Recebimentos));
    }

    private static Result<VendaDetalheResposta> Falha(ErroDominio erro) =>
        Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(erro));
}
