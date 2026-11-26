namespace VendasEmAberto.Aplicacao.Persistencia;

public sealed record ErroArmazenamento
{
    public string Codigo { get; }

    public string Mensagem { get; }

    public ErroArmazenamento(string codigo, string mensagem)
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            throw new ArgumentException("Informe um código de erro.", nameof(codigo));
        }

        if (string.IsNullOrWhiteSpace(mensagem))
        {
            throw new ArgumentException("Informe uma mensagem segura.", nameof(mensagem));
        }

        Codigo = codigo;
        Mensagem = mensagem;
    }
}
