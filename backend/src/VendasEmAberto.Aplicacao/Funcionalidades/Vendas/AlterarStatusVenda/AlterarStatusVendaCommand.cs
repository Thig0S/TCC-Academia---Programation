using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;

public sealed record AlterarStatusVendaCommand(
    string VendaId,
    StatusAdministrativoVenda NovoStatus,
    DateOnly Referencia,
    long RevisaoEsperada) : IRequest<Result<VendaDetalheResposta>>;
