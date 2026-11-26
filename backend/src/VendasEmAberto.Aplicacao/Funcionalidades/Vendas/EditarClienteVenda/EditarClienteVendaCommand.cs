using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;

public sealed record EditarClienteVendaCommand(
    string VendaId,
    string Nome,
    string Cpf,
    string Telefone,
    string? Descricao,
    DateOnly Referencia,
    long RevisaoEsperada) : IRequest<Result<VendaDetalheResposta>>;
