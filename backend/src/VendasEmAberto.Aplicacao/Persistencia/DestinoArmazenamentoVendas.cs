namespace VendasEmAberto.Aplicacao.Persistencia;

public sealed class DestinoArmazenamentoVendas
{
    public string CaminhoAbsoluto { get; }

    public DestinoArmazenamentoVendas(string caminhoAbsoluto)
    {
        if (string.IsNullOrWhiteSpace(caminhoAbsoluto) || !Path.IsPathFullyQualified(caminhoAbsoluto))
        {
            throw new ArgumentException("Informe um caminho absoluto válido para o banco.", nameof(caminhoAbsoluto));
        }

        try
        {
            CaminhoAbsoluto = Path.GetFullPath(caminhoAbsoluto);
        }
        catch (Exception excecao) when (excecao is ArgumentException or NotSupportedException or PathTooLongException)
        {
            throw new ArgumentException("Informe um caminho absoluto válido para o banco.", nameof(caminhoAbsoluto));
        }
    }
}
