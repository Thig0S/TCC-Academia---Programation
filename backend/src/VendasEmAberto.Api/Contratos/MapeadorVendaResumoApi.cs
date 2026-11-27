using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Api.Contratos;

public static class MapeadorVendaResumoApi
{
    public static VendaResumoApiResposta Mapear(VendaResumoResposta resumo)
    {
        ArgumentNullException.ThrowIfNull(resumo);

        return new VendaResumoApiResposta(
            resumo.Id,
            new ClienteApiResposta(
                resumo.Cliente.Nome,
                resumo.Cliente.Cpf,
                resumo.Cliente.Telefone,
                resumo.Cliente.Descricao),
            resumo.DataVenda,
            Mapear(resumo.StatusAdministrativo),
            Mapear(resumo.Situacao),
            resumo.ValorTotalBaseCentavos,
            resumo.TotalAcrescimosCentavos,
            resumo.ValorTotalEfetivoCentavos,
            resumo.TotalRecebidoCentavos,
            resumo.SaldoCentavos,
            resumo.QuantidadePaga,
            resumo.QuantidadeParcelas,
            resumo.ProximoVencimento,
            new RevisaoApi(resumo.Revisao),
            resumo.Referencia);
    }

    private static StatusAdministrativoApi Mapear(StatusAdministrativoResposta status) => status switch
    {
        StatusAdministrativoResposta.Ativo => StatusAdministrativoApi.Ativo,
        StatusAdministrativoResposta.Inativo => StatusAdministrativoApi.Inativo,
        StatusAdministrativoResposta.Prejuizo => StatusAdministrativoApi.Prejuizo,
        _ => throw new InvalidOperationException("Status administrativo da resposta não reconhecido.")
    };

    private static SituacaoVendaApi Mapear(SituacaoVendaResposta situacao) => situacao switch
    {
        SituacaoVendaResposta.Quitada => SituacaoVendaApi.Quitada,
        SituacaoVendaResposta.Atrasada => SituacaoVendaApi.Atrasada,
        SituacaoVendaResposta.ProximosDias => SituacaoVendaApi.ProximosDias,
        SituacaoVendaResposta.EmAberto => SituacaoVendaApi.EmAberto,
        _ => throw new InvalidOperationException("Situação da venda na resposta não reconhecida.")
    };
}
