using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;

public sealed class ConsultarRelatorioMensalHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino)
    : IRequestHandler<ConsultarRelatorioMensalQuery, Result<RelatorioMensalResposta>>
{
    public async Task<Result<RelatorioMensalResposta>> Handle(
        ConsultarRelatorioMensalQuery consulta,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(consulta);
        cancellationToken.ThrowIfCancellationRequested();

        if (consulta.Ano is < 1 or > 9999)
        {
            return Falha("ano-invalido", "Informe um ano entre 1 e 9999.", "ano");
        }

        if (consulta.Mes is < 1 or > 12)
        {
            return Falha("mes-invalido", "Informe um mês entre 1 e 12.", "mes");
        }

        var mesSelecionado = new DateOnly(consulta.Ano, consulta.Mes, 1);
        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            consulta.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<RelatorioMensalResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var resultadoRelatorio = snapshot.Conjunto.GerarRelatorioMensal(consulta.Referencia, mesSelecionado);
        if (resultadoRelatorio is not ResultadoDominio<RelatorioMensalVendas>.Sucesso relatorioValido)
        {
            return Result.Fail<RelatorioMensalResposta>(ConversorErrosAplicacao.Converter(
                ((ResultadoDominio<RelatorioMensalVendas>.Falha)resultadoRelatorio).Erro));
        }

        var relatorio = relatorioValido.Valor;
        var raizesPorId = snapshot.Conjunto.Vendas.ToDictionary(venda => venda.Id, StringComparer.Ordinal);
        VendaResumoResposta Resumo(ProjecaoVenda projecao) => MapeadorVendaResposta.MapearResumo(
            raizesPorId[projecao.Id],
            projecao,
            snapshot.Revisao,
            consulta.Referencia);

        return Result.Ok(new RelatorioMensalResposta(
            relatorio.Referencia,
            relatorio.InicioMes,
            relatorio.FimMes,
            snapshot.Revisao,
            relatorio.Recebimentos.Select(item => new RecebimentoMensalResposta(
                item.Id,
                Resumo(item.Venda),
                MapeadorVendaResposta.Mapear(item.Origem),
                item.Data,
                MapeadorVendaResposta.Mapear(item.Forma),
                item.Valor.Centavos)),
            relatorio.RecebimentosDiarios.Select(item => new RecebimentoDiarioResposta(
                item.Data,
                item.Total.Centavos)),
            relatorio.VendasDoMes.Select(Resumo),
            relatorio.Saldos.Select(item => new SaldoMensalResposta(
                Resumo(item.Venda),
                item.Saldo.Centavos,
                item.PrimeiroVencimentoPendente)),
            relatorio.ParcelasAtrasadas.Select(item => new ParcelaAtrasadaResposta(
                Resumo(item.Venda),
                MapeadorVendaResposta.MapearParcela(item.Parcela))),
            relatorio.ParcelasPrejuizo.Select(item => new ParcelaPrejuizoResposta(
                Resumo(item.Venda),
                MapeadorVendaResposta.MapearParcela(item.Parcela),
                item.IncluirNoTotal)),
            relatorio.TotalRecebido.Centavos,
            relatorio.QuantidadeVendasMes,
            relatorio.TotalVendasMes.Centavos,
            relatorio.TotalEmAberto.Centavos,
            relatorio.TotalAtrasado.Centavos,
            relatorio.TotalPrejuizo.Centavos));
    }

    private static Result<RelatorioMensalResposta> Falha(string codigo, string mensagem, string campo) =>
        Result.Fail<RelatorioMensalResposta>(new ErroAplicacao(
            CategoriaErroAplicacao.Validacao,
            codigo,
            mensagem,
            campo));
}
