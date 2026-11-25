using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public ResultadoDominio<Venda> AlterarStatusAdministrativo(StatusAdministrativoVenda novoStatus)
    {
        if (novoStatus is not (StatusAdministrativoVenda.Ativo or
            StatusAdministrativoVenda.Inativo or StatusAdministrativoVenda.Prejuizo))
        {
            return ResultadoDominio<Venda>.CriarFalha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "status-invalido",
                "O status administrativo informado não é válido.",
                "statusAdministrativo"));
        }

        if (novoStatus == StatusAdministrativo)
        {
            return ResultadoDominio<Venda>.CriarSucesso(this);
        }

        var transicaoPermitida = (StatusAdministrativo, novoStatus) switch
        {
            (StatusAdministrativoVenda.Ativo, StatusAdministrativoVenda.Inativo) => true,
            (StatusAdministrativoVenda.Ativo, StatusAdministrativoVenda.Prejuizo) => TemSaldoPendente(),
            (StatusAdministrativoVenda.Inativo, StatusAdministrativoVenda.Ativo) => true,
            (StatusAdministrativoVenda.Prejuizo, StatusAdministrativoVenda.Ativo) => true,
            _ => false
        };

        if (!transicaoPermitida)
        {
            return ResultadoDominio<Venda>.CriarFalha(new ErroDominio(
                CategoriaErroDominio.RegraNegocio,
                "transicao-nao-permitida",
                "A transição de status não é permitida para esta venda.",
                "statusAdministrativo"));
        }

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            Id,
            novoStatus,
            Cliente,
            DataVenda,
            ValorTotalBase,
            Parcelas,
            Recebimentos));
    }

    private bool TemSaldoPendente()
    {
        var parcelasPagas = Recebimentos
            .SelectMany(recebimento => recebimento.Alocacoes)
            .Select(alocacao => alocacao.ParcelaId)
            .ToHashSet(StringComparer.Ordinal);
        return Parcelas.Any(parcela => !parcelasPagas.Contains(parcela.Id));
    }
}
