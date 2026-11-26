namespace VendasEmAberto.Aplicacao.Contratos;

public sealed record ClienteResposta(
    string Nome,
    string Cpf,
    string Telefone,
    string? Descricao);
