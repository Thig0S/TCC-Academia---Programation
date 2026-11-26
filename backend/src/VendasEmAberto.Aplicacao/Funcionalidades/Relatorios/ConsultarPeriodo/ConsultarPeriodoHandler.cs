using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;

public sealed class ConsultarPeriodoHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<ConsultarPeriodoQuery, Result<PeriodoResposta>>
{
    public async Task<Result<PeriodoResposta>> Handle(
        ConsultarPeriodoQuery consulta,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(consulta);
        cancellationToken.ThrowIfCancellationRequested();

        if (consulta.Inicio > consulta.Fim)
        {
            return Result.Fail<PeriodoResposta>(new ErroAplicacao(
                CategoriaErroAplicacao.Validacao,
                "periodo-invalido",
                "O início do período deve ser anterior ou igual ao fim.",
                "periodo"));
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            consulta.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<PeriodoResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var periodo = snapshot.Conjunto.ConsultarPeriodo(consulta.Inicio, consulta.Fim);
        if (periodo is not ResultadoDominio<ConsultaPeriodoVendas>.Sucesso periodoValido)
        {
            return Result.Fail<PeriodoResposta>(ConversorErrosAplicacao.Converter(
                ((ResultadoDominio<ConsultaPeriodoVendas>.Falha)periodo).Erro));
        }

        var resumos = new List<VendaResumoResposta>(periodoValido.Valor.Vendas.Count);
        foreach (var venda in periodoValido.Valor.Vendas)
        {
            var resultadoProjecao = venda.Projetar(consulta.Referencia);
            if (resultadoProjecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecao)
            {
                return Result.Fail<PeriodoResposta>(ConversorErrosAplicacao.Converter(
                    ((ResultadoDominio<ProjecaoVenda>.Falha)resultadoProjecao).Erro));
            }

            resumos.Add(MapeadorVendaResposta.MapearResumo(
                venda,
                projecao.Valor,
                snapshot.Revisao,
                consulta.Referencia));
        }

        return Result.Ok(new PeriodoResposta(
            periodoValido.Valor.Inicio,
            periodoValido.Valor.Fim,
            periodoValido.Valor.Recebidos.Centavos,
            snapshot.Revisao,
            consulta.Referencia,
            resumos));
    }
}
