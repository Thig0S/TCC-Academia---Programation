namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal static class CaminhoBancoSqlite
{
    public static bool TentarNormalizar(
        string caminhoAbsoluto,
        out string caminho,
        out string mensagem)
    {
        caminho = string.Empty;
        mensagem = "Informe um caminho absoluto válido para o banco.";

        if (string.IsNullOrWhiteSpace(caminhoAbsoluto) || !Path.IsPathFullyQualified(caminhoAbsoluto))
        {
            return false;
        }

        try
        {
            caminho = Path.GetFullPath(caminhoAbsoluto);
            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (NotSupportedException)
        {
            return false;
        }
        catch (PathTooLongException)
        {
            return false;
        }
    }
}
