using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed record DadosReconstrucaoVenda(
    string Id,
    StatusAdministrativoVenda StatusAdministrativo,
    DadosClienteVenda Cliente,
    DateOnly DataVenda,
    Dinheiro ValorTotalBase,
    IReadOnlyList<DadosReconstrucaoParcela> Parcelas,
    IReadOnlyList<DadosReconstrucaoRecebimento> Recebimentos);

public sealed record DadosReconstrucaoParcela(
    string Id,
    int Numero,
    Dinheiro ValorBase,
    DateOnly Vencimento);

public sealed record DadosReconstrucaoAlocacao(string ParcelaId, Dinheiro Valor);

public sealed record DadosReconstrucaoRecebimento(
    string Id,
    DateOnly Data,
    FormaPagamento Forma,
    Dinheiro Valor,
    OrigemRecebimento Origem,
    Dinheiro Acrescimo,
    string? Observacao,
    IReadOnlyList<DadosReconstrucaoAlocacao> Alocacoes);
