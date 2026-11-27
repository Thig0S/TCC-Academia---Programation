using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorResumoApi
{
    public static ResumoApiResposta Mapear(ResumoResposta resumo)
    {
        ArgumentNullException.ThrowIfNull(resumo);

        return new ResumoApiResposta(
            resumo.TotalEmAbertoCentavos,
            resumo.ValoresEmAtrasoCentavos,
            resumo.RecebidoNoMesCentavos,
            resumo.QuantidadeVendasAtivas,
            new RevisaoApi(resumo.Revisao),
            resumo.Referencia);
    }
}
