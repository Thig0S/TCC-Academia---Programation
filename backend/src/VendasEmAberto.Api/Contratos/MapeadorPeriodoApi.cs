using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorPeriodoApi
{
    public static PeriodoApiResposta Mapear(PeriodoResposta periodo)
    {
        ArgumentNullException.ThrowIfNull(periodo);

        return new PeriodoApiResposta(
            periodo.Inicio,
            periodo.Fim,
            periodo.RecebidosCentavos,
            new RevisaoApi(periodo.Revisao),
            periodo.Referencia,
            periodo.Vendas.Select(MapeadorVendaResumoApi.Mapear));
    }
}
