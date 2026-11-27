using FluentResults;
using VendasEmAberto.Aplicacao.Comum.Erros;

namespace VendasEmAberto.Api.Erros;

public static class AdaptadorResultadosApi
{
    private static readonly HashSet<string> CodigosConhecidos = new(StringComparer.Ordinal)
    {
        "alteracao-historico-nao-permitida",
        "ano-invalido",
        "armazenamento-indisponivel",
        "banco-ausente",
        "banco-ocupado",
        "caminho-invalido",
        "candidato-invalido",
        "colecao-invalida",
        "confirmacao-indeterminada",
        "conflito-revisao",
        "conjunto-vendas-invalido",
        "cpf-invalido",
        "dados-persistidos-invalidos",
        "dados-recebimento-invalidos",
        "data-invalida",
        "entrada-pendente",
        "exclusao-nao-permitida",
        "historico-invalido",
        "identificacao-obrigatoria",
        "identificador-duplicado",
        "identificador-invalido",
        "limite-financeiro-excedido",
        "limite-revisao-excedido",
        "mes-invalido",
        "observacao-longa-demais",
        "periodo-invalido",
        "recebimento-de-outra-venda",
        "recebimento-historico-nao-editavel",
        "recebimento-inexistente",
        "revisao-invalida",
        "schema-incompativel",
        "selecao-nao-sequencial",
        "status-invalido",
        "telefone-invalido",
        "transicao-nao-permitida",
        "valor-invalido",
        "valor-recebido-inferior-ao-base",
        "venda-inexistente",
        "venda-nao-ativa"
    };

    private static readonly HashSet<string> CamposConhecidos = new(StringComparer.Ordinal)
    {
        "ano",
        "cliente",
        "colecao",
        "cpf",
        "data",
        "dataVenda",
        "descricao",
        "entrada",
        "entrada.data",
        "entrada.recebimentoId",
        "fim",
        "forma",
        "historico",
        "inicio",
        "id",
        "mes",
        "nome",
        "novoStatus",
        "observacao",
        "parcelaId",
        "parcelas",
        "parcelas.id",
        "periodo",
        "quantidadeParcelas",
        "recebimentoId",
        "recebimentos",
        "recebimentos.alocacoes",
        "recebimentos.data",
        "recebimentos.forma",
        "recebimentos.id",
        "recebimentos.origem",
        "recebimentos.valor",
        "referencia",
        "relatorio",
        "revisaoEsperada",
        "status",
        "statusAdministrativo",
        "telefone",
        "valor",
        "valorRecebido",
        "valorRecebidoCentavos",
        "valorTotal",
        "valorTotalBase",
        "vendaId",
        "vendas"
    };

    public static IResult Adaptar<T>(Result<T> resultado, Func<T, IResult> mapearSucesso)
    {
        ArgumentNullException.ThrowIfNull(resultado);
        ArgumentNullException.ThrowIfNull(mapearSucesso);

        return resultado.IsSuccess
            ? mapearSucesso(resultado.Value)
            : MapearFalha(resultado.Errors);
    }

    public static IResult Adaptar(Result resultado, Func<IResult> mapearSucesso)
    {
        ArgumentNullException.ThrowIfNull(resultado);
        ArgumentNullException.ThrowIfNull(mapearSucesso);

        return resultado.IsSuccess
            ? mapearSucesso()
            : MapearFalha(resultado.Errors);
    }

    internal static IResult MapearFalha(IReadOnlyCollection<IError> erros)
    {
        if (erros.Count == 0)
        {
            return ProblemasApi.FalhaInterna();
        }

        var errosAplicacao = new List<ErroAplicacao>(erros.Count);
        foreach (var erro in erros)
        {
            if (erro is not ErroAplicacao erroAplicacao
                || !Enum.IsDefined(erroAplicacao.Categoria)
                || !CodigosConhecidos.Contains(erroAplicacao.Codigo)
                || (erroAplicacao.Campo is not null && !CampoConhecido(erroAplicacao.Campo)))
            {
                return ProblemasApi.FalhaInterna();
            }

            errosAplicacao.Add(erroAplicacao);
        }

        if (errosAplicacao.Count > 1)
        {
            if (errosAplicacao.Any(erro => erro.Categoria != CategoriaErroAplicacao.Validacao))
            {
                return ProblemasApi.FalhaInterna();
            }

            return ProblemasApi.Criar(
                StatusCodes.Status400BadRequest,
                "erros-validacao",
                "Um ou mais campos da requisição não são válidos.",
                erros: errosAplicacao.Select(erro =>
                    new ErroValidacaoApi(erro.Codigo, erro.Message, erro.Campo)).ToArray());
        }

        var erroUnico = errosAplicacao[0];
        return erroUnico.Categoria switch
        {
            CategoriaErroAplicacao.Validacao => ProblemasApi.Criar(
                StatusCodes.Status400BadRequest,
                erroUnico.Codigo,
                erroUnico.Message,
                erroUnico.Campo),
            CategoriaErroAplicacao.Inexistencia => ProblemasApi.Criar(
                StatusCodes.Status404NotFound,
                erroUnico.Codigo,
                erroUnico.Message,
                erroUnico.Campo),
            CategoriaErroAplicacao.Conflito => ProblemasApi.Criar(
                StatusCodes.Status409Conflict,
                erroUnico.Codigo,
                erroUnico.Message,
                erroUnico.Campo),
            CategoriaErroAplicacao.RegraNegocio => ProblemasApi.Criar(
                StatusCodes.Status422UnprocessableEntity,
                erroUnico.Codigo,
                erroUnico.Message,
                erroUnico.Campo),
            CategoriaErroAplicacao.Infraestrutura => ProblemasApi.Criar(
                StatusCodes.Status503ServiceUnavailable,
                erroUnico.Codigo,
                "O armazenamento não está disponível.",
                erroUnico.Campo),
            CategoriaErroAplicacao.EstadoIndeterminado when
                erroUnico.Codigo == "confirmacao-indeterminada" => ProblemasApi.FalhaInternaIndeterminada(),
            _ => ProblemasApi.FalhaInterna()
        };
    }

    internal static bool CampoConhecido(string campo) => CamposConhecidos.Contains(campo);
}
