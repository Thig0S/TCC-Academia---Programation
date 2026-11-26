using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Dominio.Recebimentos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Recebimentos.RegistrarPagamento;

public sealed record RegistrarPagamentoCommand(
    string VendaId,
    string ParcelaId,
    long ValorRecebidoCentavos,
    DateOnly Data,
    FormaPagamento Forma,
    string? Observacao,
    DateOnly Referencia,
    long RevisaoEsperada) : IRequest<Result<VendaDetalheResposta>>;
