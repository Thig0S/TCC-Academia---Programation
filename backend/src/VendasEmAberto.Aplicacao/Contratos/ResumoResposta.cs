namespace VendasEmAberto.Aplicacao.Contratos;

public sealed record ResumoResposta(
    long TotalEmAbertoCentavos,
    long ValoresEmAtrasoCentavos,
    long RecebidoNoMesCentavos,
    int QuantidadeVendasAtivas,
    long Revisao,
    DateOnly Referencia);
