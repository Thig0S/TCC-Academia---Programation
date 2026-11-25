using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Recebimentos;

public sealed record DadosEntradaVenda(
    string RecebimentoId,
    Dinheiro Valor,
    DateOnly Data,
    FormaPagamento Forma);
