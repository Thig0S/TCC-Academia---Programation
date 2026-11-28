import { Provider } from '@angular/core';
import { FonteVendasDemonstracao } from '../app/nucleo/dados/fonte-vendas-demonstracao';
import { FONTE_VENDAS } from '../app/nucleo/dados/fonte-vendas';
import { MODO_APLICACAO } from '../app/nucleo/configuracao/modo-aplicacao';

export const provedoresFonteVendas: Provider[] = [
  { provide: MODO_APLICACAO, useValue: 'demonstrativo' },
  { provide: FONTE_VENDAS, useExisting: FonteVendasDemonstracao },
];
