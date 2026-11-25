namespace VendasEmAberto.Dominio.Valores;

public static class CalendarioCivil
{
    private const long MesesNoCalendario = 9_999L * 12;

    public static ResultadoDominio<DateOnly> AdicionarMeses(DateOnly dataBase, int meses)
    {
        if (!TentarCalcularMes(dataBase, meses, out var resultado))
        {
            return FalhaData("O vencimento ultrapassa o calendário civil permitido.");
        }

        return ResultadoDominio<DateOnly>.CriarSucesso(resultado);
    }

    public static ResultadoDominio<IReadOnlyList<DateOnly>> GerarVencimentos(
        DateOnly dataBase,
        int quantidade)
    {
        if (quantidade < 1)
        {
            return ResultadoDominio<IReadOnlyList<DateOnly>>.CriarFalha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "valor-invalido",
                "Informe uma quantidade positiva de parcelas.",
                "quantidadeParcelas"));
        }

        // Confere o último mês antes de alocar, inclusive para quantidades enormes.
        if (!TentarCalcularMes(dataBase, quantidade, out _))
        {
            return FalhaVencimentos("O último vencimento ultrapassa o calendário civil permitido.");
        }

        var vencimentos = new DateOnly[quantidade];
        for (var indice = 1; indice <= quantidade; indice++)
        {
            _ = TentarCalcularMes(dataBase, indice, out vencimentos[indice - 1]);
        }

        return ResultadoDominio<IReadOnlyList<DateOnly>>.CriarSucesso(Array.AsReadOnly(vencimentos));
    }

    public static bool DentroDosProximosDias(DateOnly data, DateOnly referencia, int diasMaximos)
    {
        var diferencaDias = data.DayNumber - referencia.DayNumber;
        return diasMaximos >= 0 && diferencaDias >= 0 && diferencaDias <= diasMaximos;
    }

    private static bool TentarCalcularMes(DateOnly dataBase, int meses, out DateOnly resultado)
    {
        var indiceMes = (long)(dataBase.Year - 1) * 12 + dataBase.Month - 1 + meses;
        if (indiceMes < 0 || indiceMes >= MesesNoCalendario)
        {
            resultado = default;
            return false;
        }

        var ano = (int)(indiceMes / 12) + 1;
        var mes = (int)(indiceMes % 12) + 1;
        var dia = Math.Min(dataBase.Day, DiasNoMes(ano, mes));
        resultado = new DateOnly(ano, mes, dia);
        return true;
    }

    private static int DiasNoMes(int ano, int mes) => mes switch
    {
        2 => ano % 4 == 0 && (ano % 100 != 0 || ano % 400 == 0) ? 29 : 28,
        4 or 6 or 9 or 11 => 30,
        _ => 31
    };

    private static ResultadoDominio<DateOnly> FalhaData(string mensagem) =>
        ResultadoDominio<DateOnly>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "data-invalida",
            mensagem,
            "dataBase"));

    private static ResultadoDominio<IReadOnlyList<DateOnly>> FalhaVencimentos(string mensagem) =>
        ResultadoDominio<IReadOnlyList<DateOnly>>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "data-invalida",
            mensagem,
            "dataBase"));
}
