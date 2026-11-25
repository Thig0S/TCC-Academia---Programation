using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public ResultadoDominio<Venda> EditarCliente(
        string? nome,
        string? cpf,
        string? telefone,
        string? descricao)
    {
        var clienteResult = DadosClienteVenda.Criar(nome, cpf, telefone, descricao);
        if (clienteResult is not ResultadoDominio<DadosClienteVenda>.Sucesso clienteValido)
        {
            return ResultadoDominio<Venda>.CriarFalha(
                ((ResultadoDominio<DadosClienteVenda>.Falha)clienteResult).Erro);
        }

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            Id,
            StatusAdministrativo,
            clienteValido.Valor,
            DataVenda,
            ValorTotalBase,
            Parcelas,
            Recebimentos));
    }
}
