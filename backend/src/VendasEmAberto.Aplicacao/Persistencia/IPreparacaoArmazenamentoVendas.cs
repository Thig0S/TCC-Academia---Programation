using FluentResults;

namespace VendasEmAberto.Aplicacao.Persistencia;

public interface IPreparacaoArmazenamentoVendas
{
    Task<Result> PrepararAsync(CancellationToken cancellationToken = default);
}
