namespace VendasEmAberto.Aplicacao.Contratos;

public sealed record VendaResumoResposta(
    string Id,
    ClienteResposta Cliente,
    DateOnly DataVenda,
    StatusAdministrativoResposta StatusAdministrativo,
    SituacaoVendaResposta Situacao,
    long ValorTotalBaseCentavos,
    long TotalAcrescimosCentavos,
    long ValorTotalEfetivoCentavos,
    long TotalRecebidoCentavos,
    long SaldoCentavos,
    int QuantidadePaga,
    int QuantidadeParcelas,
    DateOnly? ProximoVencimento,
    long Revisao,
    DateOnly Referencia);
