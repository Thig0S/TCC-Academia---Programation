using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
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
        DateOnly referencia,
        DadosEntradaVenda? entrada = null)
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

        var quantidadeFutura = quantidadeParcelas - (entrada is null ? 0 : 1);
        if (quantidadeFutura < 1)
        {
            return Falha(
                "valor-invalido",
                "Informe ao menos uma parcela futura, além da entrada quando houver.",
                "quantidadeParcelas");
        }

        if (entrada is not null &&
            (entrada.Valor.Centavos <= 0 || entrada.Valor.Centavos >= valorTotal.Centavos))
        {
            return Falha(
                "valor-invalido",
                "A entrada deve ser positiva e menor que o total da venda.",
                "entrada");
        }

        var saldoFuturo = valorTotal.Centavos - (entrada?.Valor.Centavos ?? 0);
        if (quantidadeFutura > saldoFuturo)
        {
            return Falha(
                "valor-invalido",
                "Informe ao menos um centavo para cada parcela futura.",
                "quantidadeParcelas");
        }

        if (entrada is not null && entrada.Data != dataVenda)
        {
            return Falha("data-invalida", "A entrada deve usar a data da venda.", "entrada.data");
        }

        if (entrada is not null && !FormasPagamento.EhValida(entrada.Forma))
        {
            return Falha(
                "dados-recebimento-invalidos",
                "Informe uma forma de pagamento aceita para a entrada.",
                "entrada.forma");
        }

        if (parcelasIds is null || parcelasIds.Count != quantidadeParcelas)
        {
            return Falha(
                "valor-invalido",
                "Informe um identificador para cada parcela.",
                "parcelasIds");
        }

        var vencimentosResult = CalendarioCivil.GerarVencimentos(dataVenda, quantidadeFutura);
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

        if (entrada is not null)
        {
            if (string.IsNullOrEmpty(entrada.RecebimentoId))
            {
                return Falha("identificador-invalido", "Informe um identificador para o recebimento da entrada.", "entrada.recebimentoId");
            }

            if (!ids.Add(entrada.RecebimentoId))
            {
                return FalhaConflito(
                    "identificador-duplicado",
                    "Os identificadores da venda, parcelas e recebimentos devem ser únicos.",
                    "entrada.recebimentoId");
            }
        }

        var quociente = saldoFuturo / quantidadeFutura;
        var resto = saldoFuturo % quantidadeFutura;
        var parcelas = new ParcelaVenda[quantidadeParcelas];
        var deslocamento = entrada is null ? 0 : 1;
        if (entrada is not null)
        {
            parcelas[0] = new ParcelaVenda(
                idsParcelas[0],
                1,
                entrada.Valor,
                dataVenda);
        }

        for (var indice = 0; indice < quantidadeFutura; indice++)
        {
            var valorParcela = Dinheiro.Criar(quociente + (indice < resto ? 1 : 0));
            if (valorParcela is not ResultadoDominio<Dinheiro>.Sucesso parcelaValida)
            {
                return ResultadoDominio<Venda>.CriarFalha(
                    ((ResultadoDominio<Dinheiro>.Falha)valorParcela).Erro);
            }

            parcelas[indice + deslocamento] = new ParcelaVenda(
                idsParcelas[indice + deslocamento],
                indice + deslocamento + 1,
                parcelaValida.Valor,
                vencimentos.Valor[indice]);
        }

        RecebimentoVenda[] recebimentos;
        if (entrada is null)
        {
            recebimentos = [];
        }
        else
        {
            recebimentos =
            [
                new RecebimentoVenda(
                    entrada.RecebimentoId,
                    entrada.Data,
                    entrada.Forma,
                    entrada.Valor,
                    OrigemRecebimento.Entrada,
                    default,
                    "",
                    [new AlocacaoPagamento(idsParcelas[0], entrada.Valor)])
            ];
        }

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            id,
            StatusAdministrativoVenda.Ativo,
            cliente,
            dataVenda,
            valorTotal,
            parcelas,
            recebimentos));
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
