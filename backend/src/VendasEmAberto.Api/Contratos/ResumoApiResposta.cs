namespace VendasEmAberto.Api.Contratos;

public sealed record ResumoApiResposta(
    long TotalEmAbertoCentavos,
    long ValoresEmAtrasoCentavos,
    long RecebidoNoMesCentavos,
    int QuantidadeVendasAtivas,
    RevisaoApi Revisao,
    DateOnly Referencia);
