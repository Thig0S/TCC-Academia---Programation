namespace VendasEmAberto.Api.Contratos;

public sealed class ErroEntradaApiException : Exception
{
    public const string CodigoRequisicaoInvalida = "requisicao-invalida";

    public string? Campo { get; }

    public ErroEntradaApiException(string? campo)
        : base("A requisição contém valores inválidos.")
    {
        Campo = campo;
    }
}
