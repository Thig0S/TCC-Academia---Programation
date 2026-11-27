using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorColecaoVendasApi
{
    public static ColecaoVendasApiResposta Mapear(ColecaoVendasResposta colecao) =>
        new(
            Mapear(colecao.Colecao),
            new RevisaoApi(colecao.Revisao),
            colecao.Referencia,
            colecao.Vendas.Select(MapeadorVendaResumoApi.Mapear));

    public static ColecaoVendas Mapear(ColecaoVendasApi colecao) => colecao switch
    {
        ColecaoVendasApi.Abertas => ColecaoVendas.Abertas,
        ColecaoVendasApi.Quitadas => ColecaoVendas.Quitadas,
        ColecaoVendasApi.Inativas => ColecaoVendas.Inativas,
        ColecaoVendasApi.Prejuizo => ColecaoVendas.Prejuizo,
        _ => throw new InvalidOperationException("Coleção HTTP de vendas não reconhecida.")
    };

    private static ColecaoVendasApi Mapear(ColecaoVendas colecao) => colecao switch
    {
        ColecaoVendas.Abertas => ColecaoVendasApi.Abertas,
        ColecaoVendas.Quitadas => ColecaoVendasApi.Quitadas,
        ColecaoVendas.Inativas => ColecaoVendasApi.Inativas,
        ColecaoVendas.Prejuizo => ColecaoVendasApi.Prejuizo,
        _ => throw new InvalidOperationException("Coleção interna de vendas não reconhecida.")
    };
}
