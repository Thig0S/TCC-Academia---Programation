using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Projecoes;

public sealed record ProjecaoParcelaVenda(
    string Id,
    int Numero,
    Dinheiro ValorBase,
    Dinheiro Acrescimo,
    Dinheiro ValorEfetivo,
    Dinheiro ValorRecebido,
    Dinheiro Saldo,
    DateOnly Vencimento,
    SituacaoParcelaProjetada Situacao,
    DateOnly? DataPagamento,
    FormaPagamento? FormaPagamento);
