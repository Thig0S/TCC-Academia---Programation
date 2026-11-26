namespace VendasEmAberto.Aplicacao.Persistencia;

public abstract record ResultadoArmazenamento<T>
{
    private ResultadoArmazenamento()
    {
    }

    public sealed record Sucesso(T Valor) : ResultadoArmazenamento<T>;

    public sealed record Falha(ErroArmazenamento Erro) : ResultadoArmazenamento<T>;

    public static ResultadoArmazenamento<T> CriarSucesso(T valor)
    {
        ArgumentNullException.ThrowIfNull(valor);
        return new Sucesso(valor);
    }

    public static ResultadoArmazenamento<T> CriarFalha(ErroArmazenamento erro)
    {
        ArgumentNullException.ThrowIfNull(erro);
        return new Falha(erro);
    }
}
