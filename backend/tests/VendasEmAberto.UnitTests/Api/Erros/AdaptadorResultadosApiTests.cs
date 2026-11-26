using System.Text.Json;
using FluentResults;
using Microsoft.AspNetCore.Http;
using VendasEmAberto.Api.Erros;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.UnitTests.Api.Erros;

[TestClass]
public sealed class AdaptadorResultadosApiTests
{
    [TestMethod]
    public async Task ErrosConhecidosMapeiamCategoriasComStatusCodigoECampoSeguros()
    {
        var casos = new (ErroAplicacao Erro, int Status, string Codigo, string? Campo)[]
        {
            (ErroDominio(CategoriaErroDominio.Validacao, "cpf-invalido", "CPF inválido.", "cpf"), 400, "cpf-invalido", "cpf"),
            (ErroDominio(CategoriaErroDominio.Inexistencia, "venda-inexistente", "Venda não encontrada.", "vendaId"), 404, "venda-inexistente", "vendaId"),
            (ErroArmazenamento(CodigosErroArmazenamento.ConflitoRevisao, "Conflito seguro."), 409, "conflito-revisao", null),
            (ErroDominio(CategoriaErroDominio.RegraNegocio, "transicao-nao-permitida", "Transição não permitida.", "novoStatus"), 422, "transicao-nao-permitida", "novoStatus"),
            (ErroArmazenamento(CodigosErroArmazenamento.BancoOcupado, "C:\\dados\\privados.sqlite SQL confidencial"), 503, "banco-ocupado", null)
        };

        foreach (var (erro, status, codigo, campo) in casos)
        {
            var resultado = Result.Fail<int>(erro);
            var resposta = await Executar(AdaptadorResultadosApi.Adaptar(resultado, valor => TypedResults.Ok(valor)));

            AssertProblem(resposta, status, codigo, campo);
            Assert.IsFalse(resposta.Json.ToString().Contains("privados.sqlite", StringComparison.OrdinalIgnoreCase));
            Assert.IsFalse(resposta.Json.ToString().Contains("SQL confidencial", StringComparison.OrdinalIgnoreCase));
        }
    }

    [TestMethod]
    public async Task ErrosDeValidacaoCoerentesSaoConsolidadosSemSerializarResult()
    {
        var erros = new List<IError>
        {
            ErroDominio(CategoriaErroDominio.Validacao, "cpf-invalido", "CPF inválido.", "cpf"),
            ErroDominio(CategoriaErroDominio.Validacao, "telefone-invalido", "Telefone inválido.", "telefone")
        };
        var resposta = await Executar(AdaptadorResultadosApi.Adaptar(
            Result.Fail<int>(erros),
            _ => throw new AssertFailedException("O resultado em falha não deve ler Value nem mapear sucesso.")));

        AssertProblem(resposta, 400, "erros-validacao", null);
        Assert.AreEqual(2, resposta.Json.GetProperty("erros").GetArrayLength());
        Assert.AreEqual("cpf-invalido", resposta.Json.GetProperty("erros")[0].GetProperty("codigo").GetString());
        Assert.AreEqual("telefone", resposta.Json.GetProperty("erros")[1].GetProperty("campo").GetString());
        Assert.IsFalse(resposta.Json.TryGetProperty("instance", out _));
        Assert.IsFalse(resposta.Json.ToString().Contains("Reasons", StringComparison.OrdinalIgnoreCase));
        Assert.IsFalse(resposta.Json.ToString().Contains("Value", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    public async Task FalhaIndeterminadaTemCodigoEExtensaoSemRevisaoOuSucesso()
    {
        var erro = ErroArmazenamento(CodigosErroArmazenamento.ConfirmacaoIndeterminada, "mensagem interna omitida");
        var resposta = await Executar(AdaptadorResultadosApi.Adaptar(
            Result.Fail<int>(erro),
            _ => throw new AssertFailedException("O resultado indeterminado não pode ser tratado como sucesso.")));

        AssertProblem(resposta, 500, "confirmacao-indeterminada", null);
        Assert.AreEqual("indeterminado", resposta.Json.GetProperty("resultadoOperacao").GetString());
        Assert.IsFalse(resposta.Json.ToString().Contains("mensagem interna omitida", StringComparison.Ordinal));
        Assert.IsFalse(resposta.Json.TryGetProperty("revisao", out _));
    }

    [TestMethod]
    public async Task CategoriasMisturadasCodigoOuErroDesconhecidoViraramFalhaGenerica()
    {
        var categoriasMistas = Result.Fail<int>(new List<IError>
        {
            ErroDominio(CategoriaErroDominio.Validacao, "cpf-invalido", "CPF inválido.", "cpf"),
            ErroArmazenamento(CodigosErroArmazenamento.ConflitoRevisao, "conflito")
        });
        var codigoDesconhecido = Result.Fail<int>(ErroDominio(
            CategoriaErroDominio.Validacao,
            "marcador-secreto-desconhecido",
            "mensagem com marcador-secreto",
            "cpf"));
        var erroNaoTipado = Result.Fail<int>(new Error("excecao SQL privada marcador-excecao"));

        foreach (var resultado in new[] { categoriasMistas, codigoDesconhecido, erroNaoTipado })
        {
            var resposta = await Executar(AdaptadorResultadosApi.Adaptar(resultado, _ => TypedResults.Ok()));
            AssertProblem(resposta, 500, "falha-interna", null);
            Assert.IsFalse(resposta.Json.ToString().Contains("marcador-secreto", StringComparison.OrdinalIgnoreCase));
            Assert.IsFalse(resposta.Json.ToString().Contains("SQL privada", StringComparison.OrdinalIgnoreCase));
        }
    }

    [TestMethod]
    public async Task CampoDesconhecidoNaoEExpostoMesmoEmErroTipado()
    {
        var erro = ErroDominio(CategoriaErroDominio.Validacao, "cpf-invalido", "mensagem segura", "marcador-campo");
        var resposta = await Executar(AdaptadorResultadosApi.Adaptar(Result.Fail<int>(erro), _ => TypedResults.Ok()));

        AssertProblem(resposta, 500, "falha-interna", null);
        Assert.IsFalse(resposta.Json.ToString().Contains("marcador-campo", StringComparison.Ordinal));
    }

    [TestMethod]
    public async Task FalhaTecnicaDeAutenticacaoRetorna401SemRedirecionamentoOuCache()
    {
        var resposta = await Executar(ProblemasApi.AcessoNegado());

        AssertProblem(resposta, 401, "acesso-local-negado", null);
        Assert.AreEqual("application/problem+json", resposta.ContentType);
        Assert.AreEqual("no-store", resposta.CacheControl);
        Assert.IsFalse(resposta.Json.TryGetProperty("instance", out _));
    }

    [TestMethod]
    public async Task FalhaNaoAcessaValueNemInvocaMapeadorDeSucesso()
    {
        var invocado = false;
        var resultado = Result.Fail<int>(new Error("erro interno"));

        var adaptado = AdaptadorResultadosApi.Adaptar(resultado, _ =>
        {
            invocado = true;
            return TypedResults.Ok();
        });
        var resposta = await Executar(adaptado);

        Assert.IsFalse(invocado);
        AssertProblem(resposta, 500, "falha-interna", null);
    }

    private static ErroAplicacao ErroDominio(
        CategoriaErroDominio categoria,
        string codigo,
        string mensagem,
        string? campo = null) =>
        ConversorErrosAplicacao.Converter(new ErroDominio(categoria, codigo, mensagem, campo));

    private static ErroAplicacao ErroArmazenamento(string codigo, string mensagem) =>
        ConversorErrosAplicacao.Converter(new ErroArmazenamento(codigo, mensagem));

    private static async Task<RespostaExecutada> Executar(IResult resultado)
    {
        var contexto = new DefaultHttpContext();
        contexto.Response.Body = new MemoryStream();
        await resultado.ExecuteAsync(contexto);
        contexto.Response.Body.Position = 0;

        using var documento = await JsonDocument.ParseAsync(contexto.Response.Body);
        return new RespostaExecutada(
            contexto.Response.StatusCode,
            contexto.Response.ContentType,
            contexto.Response.Headers.CacheControl.ToString(),
            documento.RootElement.Clone());
    }

    private static void AssertProblem(RespostaExecutada resposta, int status, string codigo, string? campo)
    {
        Assert.AreEqual(status, resposta.Status);
        Assert.AreEqual(status, resposta.Json.GetProperty("status").GetInt32());
        Assert.AreEqual("about:blank", resposta.Json.GetProperty("type").GetString());
        Assert.AreEqual(codigo, resposta.Json.GetProperty("codigo").GetString());
        Assert.AreEqual("application/problem+json", resposta.ContentType);
        Assert.AreEqual("no-store", resposta.CacheControl);

        if (campo is null)
        {
            Assert.IsFalse(resposta.Json.TryGetProperty("campo", out _));
        }
        else
        {
            Assert.AreEqual(campo, resposta.Json.GetProperty("campo").GetString());
        }
    }

    private sealed record RespostaExecutada(
        int Status,
        string? ContentType,
        string CacheControl,
        JsonElement Json);
}
