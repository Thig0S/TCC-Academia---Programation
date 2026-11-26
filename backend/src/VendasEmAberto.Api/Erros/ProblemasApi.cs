using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VendasEmAberto.Api.Contratos;

namespace VendasEmAberto.Api.Erros;

public static class ProblemasApi
{
    private static readonly JsonSerializerOptions OpcoesJson = ContratoApiJson.CriarOpcoes();

    public static IResult RequisicaoInvalida(string? campo = null) => Criar(
        StatusCodes.Status400BadRequest,
        "requisicao-invalida",
        "A requisição contém valores inválidos.",
        CampoSeguro(campo));

    public static IResult AcessoNegado() => Criar(
        StatusCodes.Status401Unauthorized,
        "acesso-local-negado",
        "A credencial local é ausente ou inválida.");

    public static IResult TipoConteudoNaoSuportado() => Criar(
        StatusCodes.Status415UnsupportedMediaType,
        "tipo-conteudo-nao-suportado",
        "O tipo de conteúdo da requisição não é suportado.");

    public static IResult MetodoNaoPermitido() => Criar(
        StatusCodes.Status405MethodNotAllowed,
        "metodo-nao-permitido",
        "O método HTTP não é permitido para este recurso.");

    public static IResult ConteudoMuitoGrande() => Criar(
        StatusCodes.Status413PayloadTooLarge,
        "conteudo-muito-grande",
        "O conteúdo da requisição excede o limite permitido.");

    public static IResult FalhaInterna() => Criar(
        StatusCodes.Status500InternalServerError,
        "falha-interna",
        "Ocorreu uma falha inesperada.");

    internal static IResult FalhaInternaIndeterminada() => Criar(
        StatusCodes.Status500InternalServerError,
        "confirmacao-indeterminada",
        "Não foi possível confirmar o resultado da operação. Verifique o estado antes de continuar.",
        resultadoOperacao: "indeterminado");

    internal static IResult Criar(
        int status,
        string codigo,
        string detalhe,
        string? campo = null,
        IReadOnlyList<ErroValidacaoApi>? erros = null,
        string? resultadoOperacao = null) =>
        new ResultadoProblemaApi(CriarDetalhes(status, codigo, detalhe, campo, erros, resultadoOperacao));

    private static ProblemDetails CriarDetalhes(
        int status,
        string codigo,
        string detalhe,
        string? campo,
        IReadOnlyList<ErroValidacaoApi>? erros,
        string? resultadoOperacao)
    {
        var problema = new ProblemDetails
        {
            Type = "about:blank",
            Title = Titulo(status),
            Status = status,
            Detail = detalhe
        };
        problema.Extensions["codigo"] = codigo;

        if (campo is not null)
        {
            problema.Extensions["campo"] = campo;
        }

        if (erros is not null)
        {
            problema.Extensions["erros"] = erros;
        }

        if (resultadoOperacao is not null)
        {
            problema.Extensions["resultadoOperacao"] = resultadoOperacao;
        }

        return problema;
    }

    private static string Titulo(int status) => status switch
    {
        StatusCodes.Status400BadRequest => "Requisição inválida",
        StatusCodes.Status401Unauthorized => "Acesso local negado",
        StatusCodes.Status404NotFound => "Recurso não encontrado",
        StatusCodes.Status405MethodNotAllowed => "Método não permitido",
        StatusCodes.Status409Conflict => "Conflito",
        StatusCodes.Status413PayloadTooLarge => "Conteúdo muito grande",
        StatusCodes.Status415UnsupportedMediaType => "Tipo de conteúdo não suportado",
        StatusCodes.Status422UnprocessableEntity => "Regra de negócio não atendida",
        StatusCodes.Status503ServiceUnavailable => "Serviço indisponível",
        _ => "Falha interna"
    };

    private static string? CampoSeguro(string? campo) =>
        campo is not null && AdaptadorResultadosApi.CampoConhecido(campo) ? campo : null;

    private sealed class ResultadoProblemaApi(ProblemDetails problema) : IResult
    {
        public async Task ExecuteAsync(HttpContext httpContext)
        {
            ArgumentNullException.ThrowIfNull(httpContext);
            httpContext.Response.StatusCode = problema.Status ?? StatusCodes.Status500InternalServerError;
            httpContext.Response.ContentType = "application/problem+json";
            httpContext.Response.Headers.CacheControl = "no-store";

            await JsonSerializer.SerializeAsync(
                httpContext.Response.Body,
                problema,
                OpcoesJson,
                httpContext.RequestAborted);
        }
    }
}

public sealed record ErroValidacaoApi(string Codigo, string Mensagem, string? Campo);
