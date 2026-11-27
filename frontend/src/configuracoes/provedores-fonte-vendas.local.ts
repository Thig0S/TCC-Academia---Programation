import { Provider } from '@angular/core';
import { FONTE_VENDAS, FONTE_VENDAS_LOCAL } from '../app/nucleo/dados/fonte-vendas';

export const provedoresFonteVendas: Provider[] = [
  { provide: FONTE_VENDAS, useExisting: FONTE_VENDAS_LOCAL },
];
