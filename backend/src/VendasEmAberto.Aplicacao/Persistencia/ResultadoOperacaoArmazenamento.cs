namespace VendasEmAberto.Aplicacao.Persistencia;

public abstract record ResultadoOperacaoArmazenamento
{
    private ResultadoOperacaoArmazenamento()
    {
    }

    public sealed record Sucesso : ResultadoOperacaoArmazenamento;

    public sealed record Falha(ErroArmazenamento Erro) : ResultadoOperacaoArmazenamento;

    public static ResultadoOperacaoArmazenamento CriarSucesso() => new Sucesso();

    public static ResultadoOperacaoArmazenamento CriarFalha(ErroArmazenamento erro)
    {
        ArgumentNullException.ThrowIfNull(erro);
        return new Falha(erro);
    }
}
