using FluentResults;
using VendasEmAberto.Aplicacao.Comum.Erros;

namespace VendasEmAberto.Aplicacao.Persistencia;

internal sealed class PreparacaoArmazenamentoVendas(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IPreparacaoArmazenamentoVendas
{
    public async Task<Result> PrepararAsync(CancellationToken cancellationToken = default)
    {
        var resultado = await armazenamento.InicializarAsync(destino.CaminhoAbsoluto, cancellationToken);
        return ConversorErrosAplicacao.Converter(resultado);
    }
}
