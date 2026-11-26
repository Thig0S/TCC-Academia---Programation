using FluentResults;
using MediatR;
using VendasEmAberto.Aplicacao.Comum.Erros;
using VendasEmAberto.Aplicacao.Contratos;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.EditarClienteVenda;

public sealed class EditarClienteVendaHandler(
    IArmazenamentoVendas armazenamento,
    DestinoArmazenamentoVendas destino) : IRequestHandler<EditarClienteVendaCommand, Result<VendaDetalheResposta>>
{
    public async Task<Result<VendaDetalheResposta>> Handle(
        EditarClienteVendaCommand comando,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(comando);
        cancellationToken.ThrowIfCancellationRequested();

        if (comando.RevisaoEsperada < 0)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "revisao-invalida",
                "A revisão esperada não pode ser negativa.",
                "revisaoEsperada"));
        }

        if (string.IsNullOrWhiteSpace(comando.VendaId))
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Validacao,
                "identificador-invalido",
                "Informe o identificador da venda.",
                "vendaId"));
        }

        var cliente = DadosClienteVenda.Criar(comando.Nome, comando.Cpf, comando.Telefone, comando.Descricao);
        if (cliente is not ResultadoDominio<DadosClienteVenda>.Sucesso clienteValido)
        {
            return Falha(((ResultadoDominio<DadosClienteVenda>.Falha)cliente).Erro);
        }

        var carregado = await armazenamento.CarregarAsync(
            destino.CaminhoAbsoluto,
            comando.Referencia,
            cancellationToken);
        if (carregado is ResultadoArmazenamento<SnapshotVendas>.Falha falhaCarregamento)
        {
            return Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(falhaCarregamento.Erro));
        }

        var snapshot = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)carregado).Valor;
        if (snapshot.Revisao != comando.RevisaoEsperada)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Conflito,
                "conflito-revisao",
                "A revisão do armazenamento mudou. Recarregue os dados antes de tentar novamente.",
                "revisaoEsperada"));
        }

        var indice = -1;
        for (var i = 0; i < snapshot.Conjunto.Vendas.Count; i++)
        {
            if (StringComparer.Ordinal.Equals(snapshot.Conjunto.Vendas[i].Id, comando.VendaId))
            {
                indice = i;
                break;
            }
        }

        if (indice < 0)
        {
            return Falha(new ErroDominio(
                CategoriaErroDominio.Inexistencia,
                "venda-inexistente",
                "A venda solicitada não foi encontrada.",
                "vendaId"));
        }

        var vendaAtual = snapshot.Conjunto.Vendas[indice];
        if (ClienteEquivalente(vendaAtual.Cliente, clienteValido.Valor))
        {
            var projecaoSemMudanca = vendaAtual.Projetar(comando.Referencia);
            if (projecaoSemMudanca is not ResultadoDominio<ProjecaoVenda>.Sucesso sucessoSemMudanca)
            {
                return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecaoSemMudanca).Erro);
            }

            return Result.Ok(MapeadorVendaResposta.MapearDetalhe(
                vendaAtual,
                sucessoSemMudanca.Valor,
                snapshot.Revisao,
                comando.Referencia));
        }

        var resultadoEdicao = vendaAtual.EditarCliente(
            clienteValido.Valor.Nome,
            clienteValido.Valor.Cpf,
            clienteValido.Valor.Telefone,
            clienteValido.Valor.Descricao);
        if (resultadoEdicao is not ResultadoDominio<Venda>.Sucesso vendaEditada)
        {
            return Falha(((ResultadoDominio<Venda>.Falha)resultadoEdicao).Erro);
        }

        var vendasCandidatas = snapshot.Conjunto.Vendas.ToArray();
        vendasCandidatas[indice] = vendaEditada.Valor;
        var candidato = snapshot.Conjunto.AceitarCandidato(vendasCandidatas);
        if (candidato is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
        {
            return Falha(((ResultadoDominio<ConjuntoVendas>.Falha)candidato).Erro);
        }

        var projecao = vendaEditada.Valor.Projetar(comando.Referencia);
        if (projecao is not ResultadoDominio<ProjecaoVenda>.Sucesso projecaoValida)
        {
            return Falha(((ResultadoDominio<ProjecaoVenda>.Falha)projecao).Erro);
        }

        var resposta = MapeadorVendaResposta.MapearDetalhe(
            vendaEditada.Valor,
            projecaoValida.Valor,
            snapshot.Revisao,
            comando.Referencia);
        var salvo = await armazenamento.SalvarAsync(
            destino.CaminhoAbsoluto,
            conjuntoValido.Valor.Vendas,
            snapshot.Revisao,
            comando.Referencia,
            cancellationToken);
        if (salvo is ResultadoArmazenamento<long>.Falha falhaGravacao)
        {
            return Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(falhaGravacao.Erro));
        }

        var revisaoConfirmada = ((ResultadoArmazenamento<long>.Sucesso)salvo).Valor;
        return Result.Ok(new VendaDetalheResposta(
            resposta.Resumo with { Revisao = revisaoConfirmada },
            resposta.Parcelas,
            resposta.Recebimentos));
    }

    private static bool ClienteEquivalente(DadosClienteVenda atual, DadosClienteVenda candidato) =>
        StringComparer.Ordinal.Equals(atual.Nome, candidato.Nome) &&
        StringComparer.Ordinal.Equals(atual.Cpf, candidato.Cpf) &&
        StringComparer.Ordinal.Equals(atual.Telefone, candidato.Telefone) &&
        StringComparer.Ordinal.Equals(atual.Descricao, candidato.Descricao);

    private static Result<VendaDetalheResposta> Falha(ErroDominio erro) =>
        Result.Fail<VendaDetalheResposta>(ConversorErrosAplicacao.Converter(erro));
}
