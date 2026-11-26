using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;

public sealed class ConsultarResumoHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<ConsultarResumoQuery, Result<ResumoResposta>>
{
    public async Task<Result<ResumoResposta>> Handle(
        ConsultarResumoQuery consulta,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(consulta);
        cancellationToken.ThrowIfCancellationRequested();

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            consulta.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<ResumoResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var resultadoProjecao = snapshot.Conjunto.Projetar(consulta.Referencia);
        if (resultadoProjecao is not ResultadoDominio<ProjecaoConjuntoVendas>.Sucesso projecao)
        {
            return Result.Fail<ResumoResposta>(ConversorErrosAplicacao.Converter(
                ((ResultadoDominio<ProjecaoConjuntoVendas>.Falha)resultadoProjecao).Erro));
        }

        return Result.Ok(new ResumoResposta(
            projecao.Valor.TotalEmAberto.Centavos,
            projecao.Valor.ValoresEmAtraso.Centavos,
            projecao.Valor.RecebidoNoMes.Centavos,
            projecao.Valor.VendasCadastradas,
            snapshot.Revisao,
            consulta.Referencia));
    }
}
