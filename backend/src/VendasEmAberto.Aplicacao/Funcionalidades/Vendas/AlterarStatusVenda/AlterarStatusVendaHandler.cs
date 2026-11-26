using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;

public sealed class AlterarStatusVendaHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<AlterarStatusVendaCommand, Result<VendaDetalheResposta>>
{
    public async Task<Result<VendaDetalheResposta>> Handle(
        AlterarStatusVendaCommand comando,
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

        if (comando.NovoStatus is not (StatusAdministrativoVenda.Ativo or
            StatusAdministrativoVenda.Inativo or StatusAdministrativoVenda.Prejuizo))
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "status-invalido",
                "O status administrativo informado não é válido.",
                "statusAdministrativo"));
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

        var vendaAtual = snapshot.Conjunto.Vendas[indice];
        if (vendaAtual.StatusAdministrativo == comando.NovoStatus)
        {
            var projecaoSemMudanca = vendaAtual.Projetar(comando.Referencia);
            if (projecaoSemMudanca is not ResultadoDominio<ProjecaoVenda>.Sucesso sucessoSemMudanca)
            {
                return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecaoSemMudanca).Erro);
            }

            return Result.Ok(MapeadorVendaResposta.MapearDetalhe(
                vendaAtual,
                sucessoSemMudanca.Valor,
                snapshot.Revisao,
                comando.Referencia));
        }

        var resultadoStatus = vendaAtual.AlterarStatusAdministrativo(comando.NovoStatus);
        if (resultadoStatus is not ResultadoDominio<Venda>.Sucesso vendaAlterada)
        {
            return Falha(((ResultadoDominio<Venda>.Falha)resultadoStatus).Erro);
        }

        var vendasCandidatas = snapshot.Conjunto.Vendas.ToArray();
        vendasCandidatas[indice] = vendaAlterada.Valor;
        var candidato = snapshot.Conjunto.AceitarCandidato(vendasCandidatas);
        if (candidato is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
        {
            return Falha(((ResultadoDominio<ConjuntoVendas>.Falha)candidato).Erro);
        }

        var projecao = vendaAlterada.Valor.Projetar(comando.Referencia);
        if (projecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecaoValida)
        {
            return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecao).Erro);
        }

        var resposta = MapeadorVendaResposta.MapearDetalhe(
            vendaAlterada.Valor,
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
