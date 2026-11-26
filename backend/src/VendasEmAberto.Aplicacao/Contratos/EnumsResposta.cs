namespace VendasEmAberto.Aplicacao.Contratos;

public enum StatusAdministrativoResposta
{
    Ativo,
    Inativo,
    Prejuizo
}

public enum SituacaoVendaResposta
{
    Quitada,
    Atrasada,
    ProximosDias,
    EmAberto
}

public enum SituacaoParcelaResposta
{
    Paga,
    Atrasada,
    ProximosDias,
    EmAberto
}

public enum FormaPagamentoResposta
{
    Dinheiro,
    Pix,
    CartaoDebito,
    CartaoCredito
}

public enum OrigemRecebimentoResposta
{
    Entrada,
    Individual,
    HistoricoLote
}
