using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public ResultadoDominio<Venda> CorrigirPagamento(
        string recebimentoId,
        Dinheiro valorRecebido,
        DateOnly data,
        FormaPagamento forma,
        DateOnly referencia,
        IReadOnlyCollection<Venda> vendasConhecidas,
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

        if (vendasConhecidas is null || vendasConhecidas.Any(venda => venda is null))
        {
            return FalhaPagamento(
                CategoriaErroDominio.Validacao,
                "conjunto-vendas-invalido",
                "Informe vendas conhecidas válidas para localizar o recebimento.",
                "vendasConhecidas");
        }

        var outrasVendas = vendasConhecidas
            .Where(venda => venda.Id != Id)
            .ToArray();
        var recebimento = Recebimentos.FirstOrDefault(item => item.Id == recebimentoId);
        var existeEmOutraVenda = outrasVendas
            .SelectMany(venda => venda.Recebimentos)
            .Any(item => item.Id == recebimentoId);

        if (recebimento is null)
        {
            return existeEmOutraVenda
                ? FalhaPagamento(
                    CategoriaErroDominio.RegraNegocio,
                    "recebimento-de-outra-venda",
                    "O recebimento pertence a outra venda.",
                    "recebimentoId")
                : ResultadoDominio<Venda>.CriarFalha(new ErroDominio(
                    CategoriaErroDominio.Inexistencia,
                    "recebimento-inexistente",
                    "O recebimento informado não existe nesta venda.",
                    "recebimentoId"));
        }

        if (existeEmOutraVenda)
        {
            return FalhaPagamento(
                CategoriaErroDominio.Conflito,
                "identificador-duplicado",
                "O identificador do recebimento aparece em mais de uma venda.",
                "recebimentoId");
        }

        if (recebimento.Origem != OrigemRecebimento.Individual)
        {
            return FalhaPagamento(
                CategoriaErroDominio.RegraNegocio,
                "recebimento-historico-nao-editavel",
                "Somente pagamentos individuais podem ser corrigidos.",
                "recebimentoId");
        }

        var alocacao = recebimento.Alocacoes[0];
        var parcela = Parcelas.First(item => item.Id == alocacao.ParcelaId);
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
                "Somente pagamentos de vendas Ativas podem ser corrigidos.",
                "statusAdministrativo");
        }

        var acrescimoResult = Dinheiro.Criar(valorRecebido.Centavos - parcela.ValorBase.Centavos);
        if (acrescimoResult is not ResultadoDominio<Dinheiro>.Sucesso acrescimoValido)
        {
            return ResultadoDominio<Venda>.CriarFalha(
                ((ResultadoDominio<Dinheiro>.Falha)acrescimoResult).Erro);
        }

        long totalPago = 0;
        long totalAcrescimos = 0;
        foreach (var item in Recebimentos)
        {
            var valorAtual = item.Id == recebimentoId ? valorRecebido.Centavos : item.Valor.Centavos;
            var acrescimoAtual = item.Id == recebimentoId
                ? acrescimoValido.Valor.Centavos
                : item.Acrescimo.Centavos;
            if (!TentarSomar(totalPago, valorAtual, out totalPago) ||
                !TentarSomar(totalAcrescimos, acrescimoAtual, out totalAcrescimos))
            {
                return FalhaLimitePagamento("A correção faria os totais da venda excederem o limite seguro.");
            }
        }

        if (!TentarSomar(ValorTotalBase.Centavos, totalAcrescimos, out var totalEfetivo) ||
            totalPago > totalEfetivo)
        {
            return FalhaLimitePagamento("A correção faria os totais da venda excederem o limite seguro.");
        }

        var recebimentoCorrigido = new RecebimentoVenda(
            recebimento.Id,
            data,
            forma,
            valorRecebido,
            OrigemRecebimento.Individual,
            acrescimoValido.Valor,
            observacaoNormalizada,
            [new AlocacaoPagamento(alocacao.ParcelaId, valorRecebido)]);

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            Id,
            StatusAdministrativo,
            Cliente,
            DataVenda,
            ValorTotalBase,
            Parcelas,
            Recebimentos.Select(item => item.Id == recebimentoId ? recebimentoCorrigido : item)));
    }
}
