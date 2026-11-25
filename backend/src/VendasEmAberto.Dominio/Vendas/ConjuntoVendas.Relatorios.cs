using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class ConjuntoVendas
{
    public ResultadoDominio<RelatorioMensalVendas> GerarRelatorioMensal(
        DateOnly referencia,
        DateOnly? mesSelecionado = null)
    {
        var projecaoResult = Projetar(referencia);
        if (projecaoResult is not ResultadoDominio<ProjecaoConjuntoVendas>.Sucesso projecaoSucesso)
        {
            return ResultadoDominio<RelatorioMensalVendas>.CriarFalha(
                ((ResultadoDominio<ProjecaoConjuntoVendas>.Falha)projecaoResult).Erro);
        }

        var mes = mesSelecionado ?? referencia;
        var inicioMes = new DateOnly(mes.Year, mes.Month, 1);
        var fimMes = new DateOnly(mes.Year, mes.Month, DateTime.DaysInMonth(mes.Year, mes.Month));
        var periodoResult = ConsultarPeriodo(inicioMes, fimMes);
        if (periodoResult is not ResultadoDominio<ConsultaPeriodoVendas>.Sucesso periodoSucesso)
        {
            return ResultadoDominio<RelatorioMensalVendas>.CriarFalha(
                ((ResultadoDominio<ConsultaPeriodoVendas>.Falha)periodoResult).Erro);
        }

        var projecao = projecaoSucesso.Valor;
        var vendasPorId = projecao.Vendas.ToDictionary(venda => venda.Id, StringComparer.Ordinal);
        var recebimentos = new List<RecebimentoRelatorio>();
        var totaisPorDia = new Dictionary<DateOnly, long>();
        long totalRecebido = 0;
        foreach (var venda in Vendas)
        {
            foreach (var recebimento in venda.Recebimentos)
            {
                if (recebimento.Data < inicioMes || recebimento.Data > fimMes)
                {
                    continue;
                }

                if (!TentarSomar(totalRecebido, recebimento.Valor.Centavos, out totalRecebido))
                {
                    return FalhaLimiteRelatorio("A soma dos recebimentos mensais excede o limite seguro de centavos.");
                }

                var totalDoDia = totaisPorDia.GetValueOrDefault(recebimento.Data);
                if (!TentarSomar(totalDoDia, recebimento.Valor.Centavos, out totalDoDia))
                {
                    return FalhaLimiteRelatorio("A soma diária dos recebimentos excede o limite seguro de centavos.");
                }

                totaisPorDia[recebimento.Data] = totalDoDia;
                recebimentos.Add(new RecebimentoRelatorio(
                    recebimento.Id,
                    vendasPorId[venda.Id],
                    recebimento.Origem,
                    recebimento.Data,
                    recebimento.Forma,
                    recebimento.Valor));
            }
        }

        if (totalRecebido != periodoSucesso.Valor.Recebidos.Centavos)
        {
            return FalhaRelatorioInvalido("O detalhamento mensal diverge da soma civil do período.");
        }

        var diasNoMes = DateTime.DaysInMonth(mes.Year, mes.Month);
        var recebimentosDiarios = new RecebimentoDiarioRelatorio[diasNoMes];
        long somaDiaria = 0;
        for (var dia = 1; dia <= diasNoMes; dia++)
        {
            var data = new DateOnly(mes.Year, mes.Month, dia);
            var totalDoDia = totaisPorDia.GetValueOrDefault(data);
            if (!TentarSomar(somaDiaria, totalDoDia, out somaDiaria))
            {
                return FalhaLimiteRelatorio("A série diária excede o limite seguro de centavos.");
            }

            recebimentosDiarios[dia - 1] = new RecebimentoDiarioRelatorio(data, DinheiroValidado(totalDoDia));
        }

        if (somaDiaria != totalRecebido)
        {
            return FalhaRelatorioInvalido("A série diária diverge do total de recebimentos do período.");
        }

        var vendasOriginaisPorId = Vendas.ToDictionary(venda => venda.Id, StringComparer.Ordinal);
        var vendasDoMes = projecao.Vendas
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Ativo &&
                vendasOriginaisPorId[venda.Id].DataVenda >= inicioMes &&
                vendasOriginaisPorId[venda.Id].DataVenda <= fimMes)
            .ToArray();
        long totalVendasMes = 0;
        foreach (var venda in vendasDoMes)
        {
            if (!TentarSomar(totalVendasMes, venda.ValorTotalEfetivo.Centavos, out totalVendasMes))
            {
                return FalhaLimiteRelatorio("A soma das vendas do mês excede o limite seguro de centavos.");
            }
        }

        var saldos = projecao.Abertas
            .Select(venda => new SaldoRelatorio(venda, venda.Saldo, venda.ProximoVencimento))
            .OrderBy(item => item.PrimeiroVencimentoPendente.HasValue ? 0 : 1)
            .ThenBy(item => item.PrimeiroVencimentoPendente ?? DateOnly.MaxValue)
            .ToArray();
        var parcelasAtrasadas = projecao.Vendas
            .Where(venda => venda.StatusAdministrativo == StatusAdministrativoVenda.Ativo)
            .SelectMany(venda => venda.Parcelas
                .Where(parcela => parcela.Situacao == SituacaoParcelaProjetada.Atrasada)
                .Select(parcela => new ParcelaAtrasadaRelatorio(venda, parcela)))
            .OrderBy(item => item.Parcela.Vencimento)
            .ToArray();
        var parcelasPrejuizo = projecao.Prejuizos
            .SelectMany(venda => venda.Parcelas
                .Where(parcela => parcela.Situacao != SituacaoParcelaProjetada.Paga)
                .Select(parcela => new ParcelaPrejuizoRelatorio(
                    venda,
                    parcela,
                    vendasOriginaisPorId[venda.Id].Recebimentos.Count == 0)))
            .ToArray();

        long totalPrejuizo = 0;
        foreach (var parcela in parcelasPrejuizo.Where(item => item.IncluirNoTotal))
        {
            if (!TentarSomar(totalPrejuizo, parcela.Parcela.ValorBase.Centavos, out totalPrejuizo))
            {
                return FalhaLimiteRelatorio("O total separado de Prejuízo excede o limite seguro de centavos.");
            }
        }

        long totalAtrasado = 0;
        foreach (var parcela in parcelasAtrasadas)
        {
            if (!TentarSomar(totalAtrasado, parcela.Parcela.ValorBase.Centavos, out totalAtrasado))
            {
                return FalhaLimiteRelatorio("O total de parcelas atrasadas excede o limite seguro de centavos.");
            }
        }

        return ResultadoDominio<RelatorioMensalVendas>.CriarSucesso(new RelatorioMensalVendas(
            referencia,
            inicioMes,
            fimMes,
            recebimentos,
            recebimentosDiarios,
            vendasDoMes,
            saldos,
            parcelasAtrasadas,
            parcelasPrejuizo,
            DinheiroValidado(totalRecebido),
            vendasDoMes.Length,
            DinheiroValidado(totalVendasMes),
            projecao.TotalEmAberto,
            DinheiroValidado(totalAtrasado),
            DinheiroValidado(totalPrejuizo)));
    }

    private static ResultadoDominio<RelatorioMensalVendas> FalhaLimiteRelatorio(string mensagem) =>
        ResultadoDominio<RelatorioMensalVendas>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "limite-financeiro-excedido",
            mensagem,
            "relatorio"));

    private static ResultadoDominio<RelatorioMensalVendas> FalhaRelatorioInvalido(string mensagem) =>
        ResultadoDominio<RelatorioMensalVendas>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            "historico-invalido",
            mensagem,
            "relatorio"));
}
