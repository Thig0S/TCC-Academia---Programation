using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed class Venda
{
    public string Id { get; }

    public StatusAdministrativoVenda StatusAdministrativo { get; }

    public DadosClienteVenda Cliente { get; }

    public DateOnly DataVenda { get; }

    public Dinheiro ValorTotalBase { get; }

    public IReadOnlyList<ParcelaVenda> Parcelas { get; }

    public IReadOnlyList<RecebimentoVenda> Recebimentos { get; }

    private Venda(
        string id,
        StatusAdministrativoVenda statusAdministrativo,
        DadosClienteVenda cliente,
        DateOnly dataVenda,
        Dinheiro valorTotalBase,
        IEnumerable<ParcelaVenda> parcelas,
        IEnumerable<RecebimentoVenda> recebimentos)
    {
        Id = id;
        StatusAdministrativo = statusAdministrativo;
        Cliente = cliente;
        DataVenda = dataVenda;
        ValorTotalBase = valorTotalBase;
        Parcelas = Array.AsReadOnly(parcelas.ToArray());
        Recebimentos = Array.AsReadOnly(recebimentos.ToArray());
    }

    public static ResultadoDominio<Venda> Cadastrar(
        string id,
        DadosClienteVenda cliente,
        DateOnly dataVenda,
        Dinheiro valorTotal,
        int quantidadeParcelas,
        IReadOnlyList<string> parcelasIds,
        DateOnly referencia)
    {
        if (string.IsNullOrEmpty(id))
        {
            return Falha("identificador-invalido", "Informe um identificador de venda.", "id");
        }

        if (cliente is null)
        {
            return Falha("identificacao-obrigatoria", "Informe os dados do cliente.", "cliente");
        }

        if (valorTotal.Centavos <= 0)
        {
            return Falha("valor-invalido", "O total da venda deve ser positivo.", "valorTotal");
        }

        if (dataVenda > referencia)
        {
            return Falha("data-invalida", "A data da venda não pode ser futura.", "dataVenda");
        }

        if (quantidadeParcelas < 1 || quantidadeParcelas > valorTotal.Centavos)
        {
            return Falha(
                "valor-invalido",
                "Informe ao menos um centavo para cada parcela futura.",
                "quantidadeParcelas");
        }

        if (parcelasIds is null || parcelasIds.Count != quantidadeParcelas)
        {
            return Falha(
                "valor-invalido",
                "Informe um identificador para cada parcela.",
                "parcelasIds");
        }

        var vencimentosResult = CalendarioCivil.GerarVencimentos(dataVenda, quantidadeParcelas);
        if (vencimentosResult is not ResultadoDominio<IReadOnlyList<DateOnly>>.Sucesso vencimentos)
        {
            return ResultadoDominio<Venda>.CriarFalha(
                ((ResultadoDominio<IReadOnlyList<DateOnly>>.Falha)vencimentosResult).Erro);
        }

        var idsParcelas = parcelasIds.ToArray();
        var ids = new HashSet<string>(StringComparer.Ordinal) { id };
        foreach (var parcelaId in idsParcelas)
        {
            if (string.IsNullOrEmpty(parcelaId))
            {
                return Falha(
                    "identificador-invalido",
                    "Informe um identificador não vazio para cada parcela.",
                    "parcelasIds");
            }

            if (!ids.Add(parcelaId))
            {
                return FalhaConflito(
                    "identificador-duplicado",
                    "Os identificadores da venda e das parcelas devem ser únicos.",
                    "parcelasIds");
            }
        }

        var quociente = valorTotal.Centavos / quantidadeParcelas;
        var resto = valorTotal.Centavos % quantidadeParcelas;
        var parcelas = new ParcelaVenda[quantidadeParcelas];
        for (var indice = 0; indice < quantidadeParcelas; indice++)
        {
            var valorParcela = Dinheiro.Criar(quociente + (indice < resto ? 1 : 0));
            if (valorParcela is not ResultadoDominio<Dinheiro>.Sucesso parcelaValida)
            {
                return ResultadoDominio<Venda>.CriarFalha(
                    ((ResultadoDominio<Dinheiro>.Falha)valorParcela).Erro);
            }

            parcelas[indice] = new ParcelaVenda(
                idsParcelas[indice],
                indice + 1,
                parcelaValida.Valor,
                vencimentos.Valor[indice]);
        }

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            id,
            StatusAdministrativoVenda.Ativo,
            cliente,
            dataVenda,
            valorTotal,
            parcelas,
            []));
    }

    private static ResultadoDominio<Venda> Falha(string codigo, string mensagem, string campo) =>
        ResultadoDominio<Venda>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            codigo,
            mensagem,
            campo));

    private static ResultadoDominio<Venda> FalhaConflito(string codigo, string mensagem, string campo) =>
        ResultadoDominio<Venda>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Conflito,
            codigo,
            mensagem,
            campo));
}
