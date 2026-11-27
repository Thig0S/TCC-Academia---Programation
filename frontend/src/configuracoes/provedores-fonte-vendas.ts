import { Provider } from '@angular/core';
import { FonteVendasDemonstracao } from '../app/nucleo/dados/fonte-vendas-demonstracao';
import { FONTE_VENDAS } from '../app/nucleo/dados/fonte-vendas';

export const provedoresFonteVendas: Provider[] = [
  { provide: FONTE_VENDAS, useExisting: FonteVendasDemonstracao },
];
