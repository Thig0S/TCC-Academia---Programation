namespace VendasEmAberto.Dominio.Valores;

public readonly record struct Dinheiro
{
    public const long LimiteCentavos = 9_007_199_254_740_991;

    public long Centavos { get; }

    private Dinheiro(long centavos)
    {
        Centavos = centavos;
    }

    public static ResultadoDominio<Dinheiro> Criar(long centavos)
    {
        if (centavos < 0)
        {
            return Falha("valor-invalido", "Informe um valor de centavos não negativo.");
        }

        if (centavos > LimiteCentavos)
        {
            return Falha("limite-financeiro-excedido", "O valor excede o limite seguro de centavos.");
        }

        return ResultadoDominio<Dinheiro>.CriarSucesso(new Dinheiro(centavos));
    }

    public ResultadoDominio<Dinheiro> Somar(Dinheiro outro)
    {
        if (outro.Centavos > LimiteCentavos - Centavos)
        {
            return Falha("limite-financeiro-excedido", "A soma excede o limite seguro de centavos.");
        }

        return ResultadoDominio<Dinheiro>.CriarSucesso(new Dinheiro(Centavos + outro.Centavos));
    }

    public ResultadoDominio<Dinheiro> Subtrair(Dinheiro outro)
    {
        if (outro.Centavos > Centavos)
        {
            return Falha("valor-invalido", "A subtração não pode produzir centavos negativos.");
        }

        return ResultadoDominio<Dinheiro>.CriarSucesso(new Dinheiro(Centavos - outro.Centavos));
    }

    private static ResultadoDominio<Dinheiro> Falha(string codigo, string mensagem) =>
        ResultadoDominio<Dinheiro>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            codigo,
            mensagem,
            "valor"));
}
