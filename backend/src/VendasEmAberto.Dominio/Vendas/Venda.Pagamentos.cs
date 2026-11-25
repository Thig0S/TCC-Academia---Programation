using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public ResultadoDominio<Venda> RegistrarPagamento(
        string recebimentoId,
        string parcelaId,
        Dinheiro valorRecebido,
        DateOnly data,
        FormaPagamento forma,
        DateOnly referencia,
        string? observacao = null)
    {
        if (string.IsNullOrEmpty(recebimentoId))
        {
            return FalhaPagamento(
                CategoriaErroDominio.Validacao,
                "identificador-invalido",
                "Informe um identificador para o recebimento.",
                "recebimentoId");
        }

        var parcela = Parcelas.FirstOrDefault(item => item.Id == parcelaId);
        if (parcela is null)
        {
            return FalhaPagamento(
                CategoriaErroDominio.RegraNegocio,
                "selecao-nao-sequencial",
                "A parcela informada não é a primeira pendente da venda.",
                "parcelaId");
        }

        if (IdentificadoresDoAgregado().Contains(recebimentoId, StringComparer.Ordinal))
        {
            return FalhaPagamento(
                CategoriaErroDominio.Conflito,
                "identificador-duplicado",
                "O identificador do recebimento já está em uso.",
                "recebimentoId");
        }

        if (valorRecebido.Centavos < parcela.ValorBase.Centavos)
        {
            return FalhaPagamento(
                CategoriaErroDominio.Validacao,
                "valor-recebido-inferior-ao-base",
                "O valor recebido deve ser igual ou superior ao valor-base da parcela.",
                "valorRecebido");
        }

        if (!FormasPagamento.EhValida(forma) || data < DataVenda || data > referencia)
        {
            return FalhaPagamento(
                CategoriaErroDominio.Validacao,
                "dados-recebimento-invalidos",
                "Informe forma aceita e data entre a venda e a referência da sessão.",
                !FormasPagamento.EhValida(forma) ? "forma" : "data");
        }

        if (!TentarNormalizarObservacao(observacao, out var observacaoNormalizada))
        {
            return FalhaPagamento(
                CategoriaErroDominio.Validacao,
                "observacao-longa-demais",
                "A observação deve ter no máximo 20 caracteres.",
                "observacao");
        }

        if (StatusAdministrativo != StatusAdministrativoVenda.Ativo)
        {
            return FalhaPagamento(
                CategoriaErroDominio.RegraNegocio,
                "venda-nao-ativa",
                "Somente vendas Ativas podem receber novos pagamentos.",
                "statusAdministrativo");
        }

        var parcelasPagas = Recebimentos
            .SelectMany(recebimento => recebimento.Alocacoes)
            .Select(alocacao => alocacao.ParcelaId)
            .ToHashSet(StringComparer.Ordinal);
        var primeiraPendente = Parcelas
            .Where(item => !parcelasPagas.Contains(item.Id))
            .OrderBy(item => item.Numero)
            .FirstOrDefault();
        if (primeiraPendente is null || primeiraPendente.Id != parcela.Id)
        {
            return FalhaPagamento(
                CategoriaErroDominio.RegraNegocio,
                "selecao-nao-sequencial",
                "Somente a primeira parcela pendente pode ser recebida.",
                "parcelaId");
        }

        long totalPagoAtual = 0;
        long acrescimosAtuais = 0;
        foreach (var recebimento in Recebimentos)
        {
            if (!TentarSomar(totalPagoAtual, recebimento.Valor.Centavos, out totalPagoAtual) ||
                (recebimento.Origem == OrigemRecebimento.Individual &&
                    !TentarSomar(acrescimosAtuais, recebimento.Acrescimo.Centavos, out acrescimosAtuais)))
            {
                return FalhaLimitePagamento("Os totais atuais da venda excedem o limite seguro.");
            }
        }

        var acrescimo = valorRecebido.Centavos - parcela.ValorBase.Centavos;
        if (!TentarSomar(totalPagoAtual, valorRecebido.Centavos, out _) ||
            !TentarSomar(acrescimosAtuais, acrescimo, out var totalAcrescimos) ||
            !TentarSomar(ValorTotalBase.Centavos, totalAcrescimos, out _))
        {
            return FalhaLimitePagamento("O pagamento faria os totais da venda excederem o limite seguro.");
        }

        var acrescimoResult = Dinheiro.Criar(acrescimo);
        if (acrescimoResult is not ResultadoDominio<Dinheiro>.Sucesso acrescimoValido)
        {
            return ResultadoDominio<Venda>.CriarFalha(
                ((ResultadoDominio<Dinheiro>.Falha)acrescimoResult).Erro);
        }

        var recebimentoNovo = new RecebimentoVenda(
            recebimentoId,
            data,
            forma,
            valorRecebido,
            OrigemRecebimento.Individual,
            acrescimoValido.Valor,
            observacaoNormalizada,
            [new AlocacaoPagamento(parcela.Id, valorRecebido)]);

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            Id,
            StatusAdministrativo,
            Cliente,
            DataVenda,
            ValorTotalBase,
            Parcelas,
            Recebimentos.Append(recebimentoNovo)));
    }

    private IEnumerable<string> IdentificadoresDoAgregado() =>
        [Id, .. Parcelas.Select(parcela => parcela.Id), .. Recebimentos.Select(recebimento => recebimento.Id)];

    private static ResultadoDominio<Venda> FalhaPagamento(
        CategoriaErroDominio categoria,
        string codigo,
        string mensagem,
        string campo) =>
        ResultadoDominio<Venda>.CriarFalha(new ErroDominio(categoria, codigo, mensagem, campo));

    private static ResultadoDominio<Venda> FalhaLimitePagamento(string mensagem) =>
        FalhaPagamento(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            mensagem,
            "valorRecebido");

    private static bool TentarNormalizarObservacao(string? observacao, out string normalizada)
    {
        normalizada = observacao ?? "";
        return normalizada.EnumerateRunes().Count() <= 20;
    }
}
