using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.ConsultarColecaoVendas;

public sealed class ConsultarColecaoVendasHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<ConsultarColecaoVendasQuery, Result<ColecaoVendasResposta>>
{
    public async Task<Result<ColecaoVendasResposta>> Handle(
        ConsultarColecaoVendasQuery consulta,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(consulta);
        cancellationToken.ThrowIfCancellationRequested();

        if (consulta.Colecao is not (ColecaoVendas.Abertas or ColecaoVendas.Quitadas or
            ColecaoVendas.Inativas or ColecaoVendas.Prejuizo))
        {
            return Result.Fail<ColecaoVendasResposta>(new ErroAplicacao(
                CategoriaErroAplicacao.Validacao,
                "colecao-invalida",
                "Informe uma coleção de vendas conhecida.",
                "colecao"));
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            consulta.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<ColecaoVendasResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        var resumos = new List<VendaResumoResposta>();
        foreach (var venda in snapshot.Conjunto.Vendas)
        {
            var resultadoProjecao = venda.Projetar(consulta.Referencia);
            if (resultadoProjecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecao)
            {
                return Result.Fail<ColecaoVendasResposta>(ConversorErrosAplicacao.Converter(
                    ((ResultadoDominio<ProjecaoVenda>.Falha)resultadoProjecao).Erro));
            }

            if (!PertenceA(consulta.Colecao, projecao.Valor))
            {
                continue;
            }

            resumos.Add(MapeadorVendaResposta.MapearResumo(
                venda,
                projecao.Valor,
                snapshot.Revisao,
                consulta.Referencia));
        }

        return Result.Ok(new ColecaoVendasResposta(
            consulta.Colecao,
            snapshot.Revisao,
            consulta.Referencia,
            resumos));
    }

    private static bool PertenceA(ColecaoVendas colecao, ProjecaoVenda projecao) => colecao switch
    {
        ColecaoVendas.Abertas => projecao.StatusAdministrativo == StatusAdministrativoVenda.Ativo &&
            projecao.Saldo.Centavos > 0,
        ColecaoVendas.Quitadas => projecao.StatusAdministrativo == StatusAdministrativoVenda.Ativo &&
            projecao.Saldo.Centavos == 0,
        ColecaoVendas.Inativas => projecao.StatusAdministrativo == StatusAdministrativoVenda.Inativo,
        ColecaoVendas.Prejuizo => projecao.StatusAdministrativo == StatusAdministrativoVenda.Prejuizo,
        _ => throw new InvalidOperationException("Coleção de vendas não reconhecida.")
    };
}
