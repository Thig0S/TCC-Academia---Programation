using FluentResults;

namespace VendasEmAberto.Aplicacao.Comum.Erros;

public sealed class ErroAplicacao : Error
{
    public CategoriaErroAplicacao Categoria { get; }

    public string Codigo { get; }

    public string? Campo { get; }

    internal ErroAplicacao(
        CategoriaErroAplicacao categoria,
        string codigo,
        string mensagem,
        string? campo = null)
        : base(ValidarMensagem(mensagem))
    {
        if (!Enum.IsDefined(categoria))
        {
            throw new ArgumentOutOfRangeException(nameof(categoria));
        }

        if (string.IsNullOrWhiteSpace(codigo))
        {
            throw new ArgumentException("Informe um código de erro.", nameof(codigo));
        }

        Categoria = categoria;
        Codigo = codigo;
        Campo = campo;
    }

    private static string ValidarMensagem(string mensagem) =>
        string.IsNullOrWhiteSpace(mensagem)
            ? throw new ArgumentException("Informe uma mensagem pública.", nameof(mensagem))
            : mensagem;
}
