using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class ConjuntoVendas
{
    public ResultadoDominio<ProjecaoConjuntoVendas> Projetar(DateOnly referencia)
    {
        var projecoes = new List<ProjecaoVenda>(Vendas.Count);
        foreach (var venda in Vendas)
        {
            var resultado = venda.Projetar(referencia);
            if (resultado is not ResultadoDominio<ProjecaoVenda>.Sucesso sucesso)
            {
                return ResultadoDominio<ProjecaoConjuntoVendas>.CriarFalha(
                    ((ResultadoDominio<ProjecaoVenda>.Falha)resultado).Erro);
            }

            projecoes.Add(sucesso.Valor);
        }

        var abertas = projecoes
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Ativo && venda.Saldo.Centavos > 0)
            .ToArray();
        var quitadas = projecoes
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Ativo && venda.Saldo.Centavos == 0)
            .ToArray();
        var inativas = projecoes
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Inativo)
            .ToArray();
        var prejuizos = projecoes
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Prejuizo)
            .ToArray();

        long totalEmAberto = 0;
        long valoresEmAtraso = 0;
        foreach (var venda in abertas)
        {
            if (!TentarSomar(totalEmAberto, venda.Saldo.Centavos, out totalEmAberto))
            {
                return FalhaLimiteProjecaoConjunto();
            }

            foreach (var parcela in venda.Parcelas.Where(parcela => parcela.Situacao == SituacaoParcelaProjetada.Atrasada))
            {
                if (!TentarSomar(valoresEmAtraso, parcela.ValorBase.Centavos, out valoresEmAtraso))
                {
                    return FalhaLimiteProjecaoConjunto();
                }
            }
        }

        var primeiroDiaDoMes = new DateOnly(referencia.Year, referencia.Month, 1);
        var ultimoDiaDoMes = new DateOnly(
            referencia.Year,
            referencia.Month,
            DateTime.DaysInMonth(referencia.Year, referencia.Month));
        var periodo = ConsultarPeriodo(primeiroDiaDoMes, ultimoDiaDoMes);
        if (periodo is not ResultadoDominio<ConsultaPeriodoVendas>.Sucesso periodoSucesso)
        {
            return ResultadoDominio<ProjecaoConjuntoVendas>.CriarFalha(
                ((ResultadoDominio<ConsultaPeriodoVendas>.Falha)periodo).Erro);
        }

        return ResultadoDominio<ProjecaoConjuntoVendas>.CriarSucesso(new ProjecaoConjuntoVendas(
            projecoes,
            abertas,
            quitadas,
            inativas,
            prejuizos,
            DinheiroValidado(totalEmAberto),
            DinheiroValidado(valoresEmAtraso),
            periodoSucesso.Valor.Recebidos,
            abertas.Length + quitadas.Length));
    }

    public ResultadoDominio<ConsultaPeriodoVendas> ConsultarPeriodo(DateOnly inicio, DateOnly fim)
    {
        if (inicio > fim)
        {
            return ResultadoDominio<ConsultaPeriodoVendas>.CriarFalha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "periodo-invalido",
                "O início do período deve ser anterior ou igual ao fim.",
                "periodo"));
        }

        var vendasNoPeriodo = Vendas
            .Where(venda => venda.DataVenda >= inicio && venda.DataVenda <= fim)
            .ToArray();
        long recebidos = 0;
        foreach (var recebimento in Vendas.SelectMany(venda => venda.Recebimentos))
        {
            if (recebimento.Data >= inicio && recebimento.Data <= fim &&
                !TentarSomar(recebidos, recebimento.Valor.Centavos, out recebidos))
            {
                return FalhaPeriodoLimite();
            }
        }

        return ResultadoDominio<ConsultaPeriodoVendas>.CriarSucesso(new ConsultaPeriodoVendas(
            inicio,
            fim,
            DinheiroValidado(recebidos),
            vendasNoPeriodo));
    }

    private static Dinheiro DinheiroValidado(long centavos) =>
        ((ResultadoDominio<Dinheiro>.Sucesso)Dinheiro.Criar(centavos)).Valor;

    private static ResultadoDominio<ProjecaoConjuntoVendas> FalhaLimiteProjecaoConjunto() =>
        ResultadoDominio<ProjecaoConjuntoVendas>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            "Os totais operacionais do conjunto excedem o limite seguro de centavos.",
            "vendas"));

    private static ResultadoDominio<ConsultaPeriodoVendas> FalhaPeriodoLimite() =>
        ResultadoDominio<ConsultaPeriodoVendas>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            "A soma dos recebimentos do período excede o limite seguro de centavos.",
            "periodo"));
}
