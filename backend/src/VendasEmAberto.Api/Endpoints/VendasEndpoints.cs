using MediatR;
using System.Globalization;
using VendasEmAberto.Api.Contratos;
using VendasEmAberto.Api.Erros;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarResumo;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.AlterarStatusVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarPeriodo;
using VendasEmAberto.Aplicacao.Funcionalidades.Relatorios.ConsultarRelatorioMensal;
using VendasEmAberto.Aplicacao.Funcionalidades.VisaoGeral.ConsultarVisaoGeral;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Api.Endpoints;

public static class VendasEndpoints
{
    public static RouteGroupBuilder MapVendasEndpoints(this RouteGroupBuilder grupo)
    {
        ArgumentNullException.ThrowIfNull(grupo);
        grupo.MapPost("/vendas", CadastrarVendaAsync);
        grupo.MapPut("/vendas/cliente", EditarClienteAsync);
        grupo.MapPut("/vendas/status", AlterarStatusAsync);
        grupo.MapGet("/vendas", ConsultarColecaoAsync);
        grupo.MapGet("/vendas/detalhe", ConsultarDetalheAsync);
        grupo.MapGet("/periodo", ConsultarPeriodoAsync);
        grupo.MapGet("/relatorios/mensal", ConsultarRelatorioMensalAsync);
        grupo.MapGet("/resumo", ConsultarResumoAsync);
        grupo.MapGet("/visao-geral", ConsultarVisaoGeralAsync);
        return grupo;
    }

    private static async Task<IResult> CadastrarVendaAsync(HttpContext contexto, ISender sender)
    {
        if (!contexto.Request.HasJsonContentType())
        {
            return ProblemasApi.TipoConteudoNaoSuportado();
        }

        var corpo = await LeitorObjetoJson.LerAsync(
            contexto.Request,
            [
                "nome",
                "cpf",
                "telefone",
                "descricao",
                "dataVenda",
                "valorTotalCentavos",
                "quantidadeParcelas",
                "referencia",
                "revisaoEsperada",
                "entrada"
            ],
            contexto.RequestAborted);

        var entrada = corpo.LerObjetoOpcional("entrada", "valorCentavos", "forma");
        var comando = new CadastrarVendaCommand(
            corpo.LerTextoObrigatorio("nome"),
            corpo.LerTextoObrigatorio("cpf"),
            corpo.LerTextoObrigatorio("telefone"),
            corpo.LerTextoOpcional("descricao"),
            corpo.LerDataObrigatoria("dataVenda"),
            corpo.LerCentavosObrigatorios("valorTotalCentavos"),
            corpo.LerInteiroObrigatorio("quantidadeParcelas"),
            corpo.LerDataObrigatoria("referencia"),
            corpo.LerRevisaoObrigatoria("revisaoEsperada"),
            entrada is null
                ? null
                : new EntradaVendaComando(
                    entrada.LerCentavosObrigatorios("valorCentavos"),
                    Mapear(entrada.LerEnumObrigatorio<FormaPagamentoApi>("forma"))));
        var resultado = await sender.Send(comando, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(resultado, detalhe =>
        {
            var location = "/api/v1/vendas/detalhe?vendaId="
                + Uri.EscapeDataString(detalhe.Resumo.Id)
                + "&referencia="
                + detalhe.Resumo.Referencia.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            return Results.Created(location, MapeadorVendaDetalheApi.Mapear(detalhe));
        });
    }

    private static async Task<IResult> EditarClienteAsync(HttpContext contexto, ISender sender)
    {
        if (!contexto.Request.HasJsonContentType())
        {
            return ProblemasApi.TipoConteudoNaoSuportado();
        }

        var corpo = await LeitorObjetoJson.LerAsync(
            contexto.Request,
            ["vendaId", "nome", "cpf", "telefone", "descricao", "referencia", "revisaoEsperada"],
            contexto.RequestAborted);
        var comando = new EditarClienteVendaCommand(
            corpo.LerTextoObrigatorio("vendaId"),
            corpo.LerTextoObrigatorio("nome"),
            corpo.LerTextoObrigatorio("cpf"),
            corpo.LerTextoObrigatorio("telefone"),
            corpo.LerTextoOpcional("descricao"),
            corpo.LerDataObrigatoria("referencia"),
            corpo.LerRevisaoObrigatoria("revisaoEsperada"));
        var resultado = await sender.Send(comando, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            detalhe => Results.Json(MapeadorVendaDetalheApi.Mapear(detalhe)));
    }

    private static async Task<IResult> AlterarStatusAsync(HttpContext contexto, ISender sender)
    {
        if (!contexto.Request.HasJsonContentType())
        {
            return ProblemasApi.TipoConteudoNaoSuportado();
        }

        var corpo = await LeitorObjetoJson.LerAsync(
            contexto.Request,
            ["vendaId", "novoStatus", "referencia", "revisaoEsperada"],
            contexto.RequestAborted);
        var comando = new AlterarStatusVendaCommand(
            corpo.LerTextoObrigatorio("vendaId"),
            Mapear(corpo.LerEnumObrigatorio<StatusAdministrativoApi>("novoStatus")),
            corpo.LerDataObrigatoria("referencia"),
            corpo.LerRevisaoObrigatoria("revisaoEsperada"));
        var resultado = await sender.Send(comando, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            detalhe => Results.Json(MapeadorVendaDetalheApi.Mapear(detalhe)));
    }

    private static async Task<IResult> ConsultarPeriodoAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarPeriodoQuery(
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "inicio"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "fim"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            periodo => Results.Json(MapeadorPeriodoApi.Mapear(periodo)));
    }

    private static async Task<IResult> ConsultarResumoAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarResumoQuery(
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            resumo => Results.Json(MapeadorResumoApi.Mapear(resumo)));
    }

    private static async Task<IResult> ConsultarRelatorioMensalAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarRelatorioMensalQuery(
            ParametrosQueryApi.InteiroObrigatorio(contexto.Request.Query, "ano", 1, 9999),
            ParametrosQueryApi.InteiroObrigatorio(contexto.Request.Query, "mes", 1, 12),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            relatorio => Results.Json(MapeadorRelatorioMensalApi.Mapear(relatorio)));
    }

    private static async Task<IResult> ConsultarVisaoGeralAsync(HttpContext contexto, ISender sender)
    {
        var consulta = new ConsultarVisaoGeralQuery(
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            visaoGeral => Results.Json(MapeadorVisaoGeralApi.Mapear(visaoGeral)));
    }

    private static async Task<IResult> ConsultarColecaoAsync(HttpContext contexto, ISender sender)
    {
        var colecaoApi = ParametrosQueryApi.EnumObrigatorio<ColecaoVendasApi>(
            contexto.Request.Query,
            "colecao");
        var consulta = new ConsultarColecaoVendasQuery(
            MapeadorColecaoVendasApi.Mapear(colecaoApi),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(consulta, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            colecao => Results.Json(MapeadorColecaoVendasApi.Mapear(colecao)));
    }

    private static async Task<IResult> ConsultarDetalheAsync(HttpContext contexto, ISender sender)
    {
        var query = new ConsultarVendaQuery(
            ParametrosQueryApi.TextoObrigatorio(contexto.Request.Query, "vendaId"),
            ParametrosQueryApi.DataObrigatoria(contexto.Request.Query, "referencia"));
        var resultado = await sender.Send(query, contexto.RequestAborted);

        return AdaptadorResultadosApi.Adaptar(
            resultado,
            detalhe => Results.Json(MapeadorVendaDetalheApi.Mapear(detalhe)));
    }

    private static FormaPagamento Mapear(FormaPagamentoApi forma) => forma switch
    {
        FormaPagamentoApi.Dinheiro => FormaPagamento.Dinheiro,
        FormaPagamentoApi.Pix => FormaPagamento.Pix,
        FormaPagamentoApi.CartaoDebito => FormaPagamento.CartaoDebito,
        FormaPagamentoApi.CartaoCredito => FormaPagamento.CartaoCredito,
        _ => throw new InvalidOperationException("Forma de pagamento do cadastro não reconhecida.")
    };

    private static StatusAdministrativoVenda Mapear(StatusAdministrativoApi status) => status switch
    {
        StatusAdministrativoApi.Ativo => StatusAdministrativoVenda.Ativo,
        StatusAdministrativoApi.Inativo => StatusAdministrativoVenda.Inativo,
        StatusAdministrativoApi.Prejuizo => StatusAdministrativoVenda.Prejuizo,
        _ => throw new InvalidOperationException("Status administrativo da requisição não reconhecido.")
    };
}
