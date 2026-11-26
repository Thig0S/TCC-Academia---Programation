using FluentResults;
using MediatR;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

public sealed record ConsultarColecaoVendasQuery(ColecaoVendas Colecao, DateOnly Referencia)
    : IRequest<Result<ColecaoVendasResposta>>;
