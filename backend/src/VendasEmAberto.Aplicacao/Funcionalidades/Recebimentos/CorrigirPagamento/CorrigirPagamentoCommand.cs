using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.CorrigirPagamento;

public sealed record CorrigirPagamentoCommand(
    string VendaId,
    string RecebimentoId,
    long ValorRecebidoCentavos,
    DateOnly Data,
    Dominio.Recebimentos.FormaPagamento Forma,
    string? Observacao,
    DateOnly Referencia,
    long RevisaoEsperada) : IRequest<Result<VendaDetalheResposta>>;
