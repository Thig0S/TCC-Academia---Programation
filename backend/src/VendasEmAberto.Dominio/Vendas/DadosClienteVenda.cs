using System.Text;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed class DadosClienteVenda
{
    public string Nome { get; }

    public string Cpf { get; }

    public string Telefone { get; }

    public string? Descricao { get; }

    private DadosClienteVenda(string nome, string cpf, string telefone, string? descricao)
    {
        Nome = nome;
        Cpf = cpf;
        Telefone = telefone;
        Descricao = descricao;
    }

    public static ResultadoDominio<DadosClienteVenda> Criar(
        string? nome,
        string? cpf,
        string? telefone,
        string? descricao)
    {
        var nomeNormalizado = nome?.Trim();
        if (string.IsNullOrEmpty(nomeNormalizado))
        {
            return Falha("identificacao-obrigatoria", "Informe o nome do cliente.", "nome");
        }

        if (!TentarNormalizarCpf(cpf, out var cpfNormalizado) || !CpfValido(cpfNormalizado))
        {
            return Falha(
                "cpf-invalido",
                "Informe CPF com 11 dígitos e verificadores válidos, sem sequência repetida.",
                "cpf");
        }

        if (!TentarNormalizarTelefone(telefone, out var telefoneNormalizado))
        {
            return Falha(
                "telefone-invalido",
                "Informe telefone com 10 ou 11 dígitos, sem código internacional.",
                "telefone");
        }

        return ResultadoDominio<DadosClienteVenda>.CriarSucesso(new DadosClienteVenda(
            nomeNormalizado,
            cpfNormalizado,
            telefoneNormalizado,
            string.IsNullOrWhiteSpace(descricao) ? null : descricao.Trim()));
    }

    private static bool CpfValido(string cpf)
    {
        if (cpf.Length != 11 || cpf.All(digito => digito == cpf[0]))
        {
            return false;
        }

        for (var tamanho = 9; tamanho <= 10; tamanho++)
        {
            var soma = 0;
            for (var indice = 0; indice < tamanho; indice++)
            {
                soma += (cpf[indice] - '0') * (tamanho + 1 - indice);
            }

            var resto = soma % 11;
            var verificador = resto < 2 ? 0 : 11 - resto;
            if (cpf[tamanho] - '0' != verificador)
            {
                return false;
            }
        }

        return true;
    }

    private static bool TentarNormalizarCpf(string? cpf, out string normalizado) =>
        TentarRemoverFormatacao(cpf, permitirPonto: true, permitirParenteses: false, out normalizado)
        && normalizado.Length == 11;

    private static bool TentarNormalizarTelefone(string? telefone, out string normalizado) =>
        TentarRemoverFormatacao(telefone, permitirPonto: false, permitirParenteses: true, out normalizado)
        && normalizado.Length is 10 or 11;

    private static bool TentarRemoverFormatacao(
        string? valor,
        bool permitirPonto,
        bool permitirParenteses,
        out string normalizado)
    {
        normalizado = string.Empty;
        if (valor is null)
        {
            return false;
        }

        var digitos = new StringBuilder(valor.Length);
        foreach (var caractere in valor)
        {
            if (char.IsWhiteSpace(caractere) || caractere == '-' ||
                (permitirPonto && caractere == '.') ||
                (permitirParenteses && caractere is '(' or ')'))
            {
                continue;
            }

            if (caractere is < '0' or > '9')
            {
                return false;
            }

            digitos.Append(caractere);
        }

        normalizado = digitos.ToString();
        return true;
    }

    private static ResultadoDominio<DadosClienteVenda> Falha(string codigo, string mensagem, string campo) =>
        ResultadoDominio<DadosClienteVenda>.CriarFalha(new ErroDominio(
            CategoriaErroDominio.Validacao,
            codigo,
            mensagem,
            campo));
}
