using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;

public sealed class ConsultarVendaHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<ConsultarVendaQuery, Result<VendaDetalheResposta>>
{
    public async Task<Result<VendaDetalheResposta>> Handle(
        ConsultarVendaQuery consulta,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(consulta);
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(consulta.VendaId))
        {
            return Result.Fail<VendaDetalheResposta>(new ErroAplicacao(
                CategoriaErroAplicacao.Validacao,
                "identificador-invalido",
                "Informe o identificador da venda.",
                "vendaId"));
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            consulta.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<VendaDetalheResposta>(
                ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var venda = snapshot.Conjunto.Vendas.SingleOrDefault(v =>
            StringComparer.Ordinal.Equals(v.Id, consulta.VendaId));
        if (venda is null)
        {
            return Result.Fail<VendaDetalheResposta>(new ErroAplicacao(
                CategoriaErroAplicacao.Inexistencia,
                "venda-inexistente",
                "A venda solicitada não foi encontrada.",
                "vendaId"));
        }

        var resultadoProjecao = venda.Projetar(consulta.Referencia);
        if (resultadoProjecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecao)
        {
            return Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(
                ((ResultadoDominio<ProjecaoVenda>.Falha)resultadoProjecao).Erro));
        }

        var resposta = MapeadorVendaResposta.MapearDetalhe(
            venda,
            projecao.Valor,
            snapshot.Revisao,
            consulta.Referencia);
        return Result.Ok(resposta);
    }
}
