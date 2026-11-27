using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;

public sealed record ConsultarVisaoGeralQuery(DateOnly Referencia) : IRequest<Result<VisaoGeralResposta>>;
