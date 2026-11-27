using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;

public sealed class ConsultarVisaoGeralHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino)
    : IRequestHandler<ConsultarVisaoGeralQuery, Result<VisaoGeralResposta>>
{
    private const int LimiteResumo = 5;

    public async Task<Result<VisaoGeralResposta>> Handle(
        ConsultarVisaoGeralQuery consulta,
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
            return Result.Fail<VisaoGeralResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var resultadoProjecao = snapshot.Conjunto.Projetar(consulta.Referencia);
        if (resultadoProjecao is not ResultadoDominio<ProjecaoConjuntoVendas>.Sucesso sucessoProjecao)
        {
            return Result.Fail<VisaoGeralResposta>(ConversorErrosAplicacao.Converter(
                ((ResultadoDominio<ProjecaoConjuntoVendas>.Falha)resultadoProjecao).Erro));
        }

        var projecao = sucessoProjecao.Valor;
        var vendas = snapshot.Conjunto.Vendas;
        var vendasProjetadas = projecao.Vendas;
        var vendasRecentes = Enumerable.Range(0, vendas.Count)
            .Where(indice => vendasProjetadas[indice].StatusAdministrativo == StatusAdministrativoVenda.Ativo)
            .OrderByDescending(indice => vendas[indice].DataVenda)
            .ThenBy(indice => indice)
            .Take(LimiteResumo)
            .Select(indice => MapeadorVendaResposta.MapearResumo(
                vendas[indice],
                vendasProjetadas[indice],
                snapshot.Revisao,
                consulta.Referencia))
            .ToArray();

        var parcelasProximas = SelecionarParcelas(
            SituacaoParcelaProjetada.ProximosDias,
            vendas,
            vendasProjetadas,
            snapshot.Revisao,
            consulta.Referencia);
        var parcelasAtrasadas = SelecionarParcelas(
            SituacaoParcelaProjetada.Atrasada,
            vendas,
            vendasProjetadas,
            snapshot.Revisao,
            consulta.Referencia);

        return Result.Ok(new VisaoGeralResposta(
            consulta.Referencia,
            snapshot.Revisao,
            new IndicadoresVisaoGeralResposta(
                projecao.TotalEmAberto.Centavos,
                projecao.ValoresEmAtraso.Centavos,
                projecao.RecebidoNoMes.Centavos,
                projecao.VendasCadastradas),
            vendasRecentes,
            parcelasProximas,
            parcelasAtrasadas));
    }

    private static IReadOnlyList<ParcelaVisaoGeralResposta> SelecionarParcelas(
        SituacaoParcelaProjetada situacao,
        IReadOnlyList<Venda> vendas,
        IReadOnlyList<ProjecaoVenda> vendasProjetadas,
        long revisao,
        DateOnly referencia) => Enumerable.Range(0, vendas.Count)
        .Where(indiceVenda => vendasProjetadas[indiceVenda].StatusAdministrativo == StatusAdministrativoVenda.Ativo)
        .SelectMany(indiceVenda => Enumerable.Range(0, vendasProjetadas[indiceVenda].Parcelas.Count)
            .Select(indiceParcela => new ParcelaSelecionada(
                indiceVenda,
                indiceParcela,
                vendasProjetadas[indiceVenda].Parcelas[indiceParcela])))
        .Where(item => item.Parcela.Situacao == situacao)
        .OrderBy(item => item.Parcela.Vencimento)
        .ThenBy(item => item.IndiceVenda)
        .ThenBy(item => item.IndiceParcela)
        .Take(LimiteResumo)
        .Select(item => new ParcelaVisaoGeralResposta(
            MapeadorVendaResposta.MapearResumo(
                vendas[item.IndiceVenda],
                vendasProjetadas[item.IndiceVenda],
                revisao,
                referencia),
            MapeadorVendaResposta.MapearParcela(item.Parcela)))
        .ToArray();

    private sealed record ParcelaSelecionada(
        int IndiceVenda,
        int IndiceParcela,
        ProjecaoParcelaVenda Parcela);
}
