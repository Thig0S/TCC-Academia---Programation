using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;

public sealed record ConsultarVendaQuery(string VendaId, DateOnly Referencia) : IRequest<Result<VendaDetalheResposta>>;
