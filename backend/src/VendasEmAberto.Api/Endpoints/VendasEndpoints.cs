using MediatR;
using VendasEmAberto.Api.Contratos;
using VendasEmAberto.Api.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;

namespace VendasEmAberto.Api.Endpoints;

public static class VendasEndpoints
{
    public static RouteGroupBuilder MapVendasEndpoints(this RouteGroupBuilder grupo)
    {
        ArgumentNullException.ThrowIfNull(grupo);
        grupo.MapGet("/vendas", ConsultarColecaoAsync);
        grupo.MapGet("/vendas/detalhe", ConsultarDetalheAsync);
        grupo.MapGet("/periodo", ConsultarPeriodoAsync);
        grupo.MapGet("/resumo", ConsultarResumoAsync);
        return grupo;
    }

    private static async Task<IResult> ConsultarPeriodoAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarPeriodoQuery(
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "inicio"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "fim"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            periodo => Results.Json(MapeadorPeriodoApi.Mapear(periodo)));
    }

    private static async Task<IResult> ConsultarResumoAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarResumoQuery(
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            resumo => Results.Json(MapeadorResumoApi.Mapear(resumo)));
    }

    private static async Task<IResult> ConsultarColecaoAsync(HttpContext contexto, ISender sender)
    {
        var colecaoApi = ParametrosQueryApi.EnumObrigatorio<ColecaoVendasApi>(
            contexto.Request.Query,
            "colecao");
        var consulta = new ConsultarColecaoVendasQuery(
            MapeadorColecaoVendasApi.Mapear(colecaoApi),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            colecao => Results.Json(MapeadorColecaoVendasApi.Mapear(colecao)));
    }

    private static async Task<IResult> ConsultarDetalheAsync(HttpContext contexto, ISender sender)
    {
        var query = new ConsultarVendaQuery(
            ParametrosQueryApi.TextoObrigatorio(contexto.Request.Query, "vendaId"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(query, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            detalhe => Results.Json(MapeadorVendaDetalheApi.Mapear(detalhe)));
    }
}
