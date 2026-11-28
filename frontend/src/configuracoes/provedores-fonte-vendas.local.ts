import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { FONTE_VENDAS, FONTE_VENDAS_LOCAL } from '../app/nucleo/dados/fonte-vendas';
import { FonteVendasHttp } from '../app/nucleo/dados/fonte-vendas-http';
import { MODO_APLICACAO } from '../app/nucleo/configuracao/modo-aplicacao';

export const provedoresFonteVendas: (Provider | EnvironmentProviders)[] = [
  { provide: MODO_APLICACAO, useValue: 'local' },
  provideHttpClient(),
  { provide: FONTE_VENDAS_LOCAL, useExisting: FonteVendasHttp },
  { provide: FONTE_VENDAS, useExisting: FONTE_VENDAS_LOCAL },
];
