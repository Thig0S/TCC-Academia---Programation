using FluentResults;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Aplicacao.Comum.Erros;

public static class ConversorErrosAplicacao
{
    public static ErroAplicacao Converter(ErroDominio erro)
    {
        ArgumentNullException.ThrowIfNull(erro);

        var categoria = erro.Categoria switch
        {
            CategoriaErroDominio.Validacao => CategoriaErroAplicacao.Validacao,
            CategoriaErroDominio.Inexistencia => CategoriaErroAplicacao.Inexistencia,
            CategoriaErroDominio.Conflito => CategoriaErroAplicacao.Conflito,
            CategoriaErroDominio.RegraNegocio => CategoriaErroAplicacao.RegraNegocio,
            _ => throw new InvalidOperationException("Categoria de erro de domínio não reconhecida.")
        };

        return new ErroAplicacao(categoria, erro.Codigo, erro.Mensagem, erro.Campo);
    }

    public static ErroAplicacao Converter(ErroArmazenamento erro)
    {
        ArgumentNullException.ThrowIfNull(erro);

        var categoria = erro.Codigo switch
        {
            CodigosErroArmazenamento.CaminhoInvalido or
            CodigosErroArmazenamento.CandidatoInvalido => CategoriaErroAplicacao.Validacao,
            CodigosErroArmazenamento.ConflitoRevisao or
            CodigosErroArmazenamento.ExclusaoNaoPermitida or
            CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida => CategoriaErroAplicacao.Conflito,
            CodigosErroArmazenamento.BancoAusente or
            CodigosErroArmazenamento.SchemaIncompativel or
            CodigosErroArmazenamento.DadosPersistidosInvalidos or
            CodigosErroArmazenamento.BancoOcupado or
            CodigosErroArmazenamento.ArmazenamentoIndisponivel or
            CodigosErroArmazenamento.LimiteRevisaoExcedido => CategoriaErroAplicacao.Infraestrutura,
            CodigosErroArmazenamento.ConfirmacaoIndeterminada => CategoriaErroAplicacao.EstadoIndeterminado,
            _ => throw new InvalidOperationException("Código de erro de armazenamento não reconhecido.")
        };

        return new ErroAplicacao(categoria, erro.Codigo, erro.Mensagem);
    }

    public static Result<T> Converter<T>(ResultadoDominio<T> resultado) => resultado switch
    {
        ResultadoDominio<T>.Sucesso sucesso => Result.Ok(sucesso.Valor),
        ResultadoDominio<T>.Falha falha => Result.Fail<T>(Converter(falha.Erro)),
        _ => throw new InvalidOperationException("Resultado de domínio não reconhecido.")
    };

    public static Result<T> Converter<T>(ResultadoArmazenamento<T> resultado) => resultado switch
    {
        ResultadoArmazenamento<T>.Sucesso sucesso => Result.Ok(sucesso.Valor),
        ResultadoArmazenamento<T>.Falha falha => Result.Fail<T>(Converter(falha.Erro)),
        _ => throw new InvalidOperationException("Resultado de armazenamento não reconhecido.")
    };

    public static Result Converter(ResultadoOperacaoArmazenamento resultado) => resultado switch
    {
        ResultadoOperacaoArmazenamento.Sucesso => Result.Ok(),
        ResultadoOperacaoArmazenamento.Falha falha => Result.Fail(Converter(falha.Erro)),
        _ => throw new InvalidOperationException("Resultado de armazenamento não reconhecido.")
    };
}
