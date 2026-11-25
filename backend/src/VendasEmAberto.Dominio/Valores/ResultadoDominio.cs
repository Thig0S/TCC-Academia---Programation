namespace VendasEmAberto.Dominio.Valores;

public abstract record ResultadoDominio<T>
{
    private ResultadoDominio()
    {
    }

    public sealed record Sucesso(T Valor) : ResultadoDominio<T>;

    public sealed record Falha(ErroDominio Erro) : ResultadoDominio<T>;

    public static ResultadoDominio<T> CriarSucesso(T valor) => new Sucesso(valor);

    public static ResultadoDominio<T> CriarFalha(ErroDominio erro) => new Falha(erro);
}
