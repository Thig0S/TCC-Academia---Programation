using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;

public sealed record ConsultarRelatorioMensalQuery(int Ano, int Mes, DateOnly Referencia)
    : IRequest<Result<RelatorioMensalResposta>>;
