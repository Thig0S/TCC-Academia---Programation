using VendasEmAberto.Dominio.Recebimentos;

namespace VendasEmAberto.Aplicacao.Funcionalidades.Vendas.CadastrarVenda;

public sealed record EntradaVendaComando(long ValorCentavos, FormaPagamento Forma);
