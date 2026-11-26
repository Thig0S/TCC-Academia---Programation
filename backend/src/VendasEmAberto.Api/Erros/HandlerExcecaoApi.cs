using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using VendasEmAberto.Api.Contratos;

namespace VendasEmAberto.Api.Erros;

public sealed class HandlerExcecaoApi : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        ArgumentNullException.ThrowIfNull(exception);

        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        var problema = exception switch
        {
            ErroEntradaApiException erro => ProblemasApi.RequisicaoInvalida(erro.Campo),
            BadHttpRequestException erro => ProblemaBinding(erro.StatusCode),
            _ => ProblemasApi.FalhaInterna()
        };

        httpContext.Response.Clear();
        await problema.ExecuteAsync(httpContext);
        return true;
    }

    private static IResult ProblemaBinding(int status) => status switch
    {
        StatusCodes.Status400BadRequest => ProblemasApi.RequisicaoInvalida(),
        StatusCodes.Status405MethodNotAllowed => ProblemasApi.MetodoNaoPermitido(),
        StatusCodes.Status413PayloadTooLarge => ProblemasApi.ConteudoMuitoGrande(),
        StatusCodes.Status415UnsupportedMediaType => ProblemasApi.TipoConteudoNaoSuportado(),
        _ => ProblemasApi.FalhaInterna()
    };
}
