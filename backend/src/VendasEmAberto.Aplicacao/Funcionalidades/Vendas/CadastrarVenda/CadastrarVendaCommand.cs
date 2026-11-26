using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Contratos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;

public sealed record CadastrarVendaCommand(
    string Nome,
    string Cpf,
    string Telefone,
    string? Descricao,
    DateOnly DataVenda,
    long ValorTotalCentavos,
    int QuantidadeParcelas,
    DateOnly Referencia,
    long RevisaoEsperada,
    EntradaVendaComando? Entrada = null) : IRequest<Result<VendaDetalheResposta>>;
