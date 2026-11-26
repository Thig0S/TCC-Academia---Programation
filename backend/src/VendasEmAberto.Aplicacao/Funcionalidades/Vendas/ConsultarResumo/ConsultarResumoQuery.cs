using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;

public sealed record ConsultarResumoQuery(DateOnly Referencia) : IRequest<Result<ResumoResposta>>;
