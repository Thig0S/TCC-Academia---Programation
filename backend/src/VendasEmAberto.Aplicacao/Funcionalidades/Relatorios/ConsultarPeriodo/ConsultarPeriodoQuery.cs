using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;

public sealed record ConsultarPeriodoQuery(DateOnly Inicio, DateOnly Fim, DateOnly Referencia)
    : IRequest<Result<PeriodoResposta>>;
