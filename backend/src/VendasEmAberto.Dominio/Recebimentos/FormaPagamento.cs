namespace VendasEmAberto.Dominio.Recebimentos;

public enum FormaPagamento
{
    Dinheiro,
    Pix,
    CartaoDebito,
    CartaoCredito
}

public static class FormasPagamento
{
    public static bool EhValida(FormaPagamento forma) => forma is
        FormaPagamento.Dinheiro or
        FormaPagamento.Pix or
        FormaPagamento.CartaoDebito or
        FormaPagamento.CartaoCredito;
}
