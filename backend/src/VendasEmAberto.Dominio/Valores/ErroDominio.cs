namespace VendasEmAberto.Dominio.Valores;

public sealed record ErroDominio(
    CategoriaErroDominio Categoria,
    string Codigo,
    string Mensagem,
    string? Campo = null);
