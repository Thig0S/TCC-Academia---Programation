using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed class ConjuntoVendas
{
    public IReadOnlyList<Venda> Vendas { get; }

    private ConjuntoVendas(IEnumerable<Venda> vendas)
    {
        Vendas = Array.AsReadOnly(vendas.ToArray());
    }

    public static ResultadoDominio<ConjuntoVendas> Criar(IEnumerable<Venda> vendas) =>
        PrepararCandidato(vendas);

    public ResultadoDominio<ConjuntoVendas> AceitarCandidato(IEnumerable<Venda> candidato) =>
        PrepararCandidato(candidato);

    private static ResultadoDominio<ConjuntoVendas> PrepararCandidato(IEnumerable<Venda> vendas)
    {
        if (vendas is null)
        {
            return FalhaConjunto(
                CategoriaErroDominio.Validacao,
                "conjunto-vendas-invalido",
                "Informe uma coleção de vendas válida.",
                "vendas");
        }

        var vendasMaterializadas = vendas.ToArray();
        if (vendasMaterializadas.Any(venda => venda is null))
        {
            return FalhaConjunto(
                CategoriaErroDominio.Validacao,
                "conjunto-vendas-invalido",
                "A coleção não pode conter vendas ausentes.",
                "vendas");
        }

        var ids = new HashSet<string>(StringComparer.Ordinal);
        long totalBase = 0;
        long totalEfetivo = 0;
        long totalRecebido = 0;
        long saldo = 0;
        foreach (var venda in vendasMaterializadas)
        {
            if (!AdicionarId(venda.Id, "vendas.id", ids, out var erroId))
            {
                return ResultadoDominio<ConjuntoVendas>.CriarFalha(erroId);
            }

            foreach (var parcela in venda.Parcelas)
            {
                if (!AdicionarId(parcela.Id, "parcelas.id", ids, out erroId))
                {
                    return ResultadoDominio<ConjuntoVendas>.CriarFalha(erroId);
                }
            }

            long acrescimosDaVenda = 0;
            long recebidoDaVenda = 0;
            foreach (var recebimento in venda.Recebimentos)
            {
                if (!AdicionarId(recebimento.Id, "recebimentos.id", ids, out erroId))
                {
                    return ResultadoDominio<ConjuntoVendas>.CriarFalha(erroId);
                }

                if (!TentarSomar(recebidoDaVenda, recebimento.Valor.Centavos, out recebidoDaVenda) ||
                    (recebimento.Origem == OrigemRecebimento.Individual &&
                        !TentarSomar(acrescimosDaVenda, recebimento.Acrescimo.Centavos, out acrescimosDaVenda)))
                {
                    return FalhaLimiteConjunto();
                }
            }

            if (!TentarSomar(venda.ValorTotalBase.Centavos, acrescimosDaVenda, out var efetivoDaVenda) ||
                recebidoDaVenda > efetivoDaVenda)
            {
                return FalhaLimiteConjunto();
            }

            var saldoDaVenda = efetivoDaVenda - recebidoDaVenda;
            if (!TentarSomar(totalBase, venda.ValorTotalBase.Centavos, out totalBase) ||
                !TentarSomar(totalEfetivo, efetivoDaVenda, out totalEfetivo) ||
                !TentarSomar(totalRecebido, recebidoDaVenda, out totalRecebido) ||
                !TentarSomar(saldo, saldoDaVenda, out saldo))
            {
                return FalhaLimiteConjunto();
            }
        }

        return ResultadoDominio<ConjuntoVendas>.CriarSucesso(new ConjuntoVendas(vendasMaterializadas));
    }

    private static bool AdicionarId(
        string id,
        string campo,
        ISet<string> ids,
        out ErroDominio erro)
    {
        if (string.IsNullOrEmpty(id))
        {
            erro = new ErroDominio(
                CategoriaErroDominio.Validacao,
                "identificador-invalido",
                "Os identificadores das vendas e de seus registros são obrigatórios.",
                campo);
            return false;
        }

        if (!ids.Add(id))
        {
            erro = new ErroDominio(
                CategoriaErroDominio.Conflito,
                "identificador-duplicado",
                "Os identificadores devem ser únicos entre todas as vendas e seus registros.",
                campo);
            return false;
        }

        erro = null!;
        return true;
    }

    private static bool TentarSomar(long atual, long valor, out long resultado)
    {
        if (valor < 0 || valor > Dinheiro.LimiteCentavos - atual)
        {
            resultado = atual;
            return false;
        }

        resultado = atual + valor;
        return true;
    }

    private static ResultadoDominio<ConjuntoVendas> FalhaLimiteConjunto() =>
        FalhaConjunto(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            "Os totais financeiros do conjunto excedem o limite seguro de centavos.",
            "vendas");

    private static ResultadoDominio<ConjuntoVendas> FalhaConjunto(
        CategoriaErroDominio categoria,
        string codigo,
        string mensagem,
        string campo) =>
        ResultadoDominio<ConjuntoVendas>.CriarFalha(new ErroDominio(categoria, codigo, mensagem, campo));
}
