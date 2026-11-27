import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { FONTE_VENDAS, FONTE_VENDAS_LOCAL } from '../app/nucleo/dados/fonte-vendas';
import { FonteVendasHttp } from '../app/nucleo/dados/fonte-vendas-http';

export const provedoresFonteVendas: (Provider | EnvironmentProviders)[] = [
  provideHttpClient(),
  { provide: FONTE_VENDAS_LOCAL, useExisting: FonteVendasHttp },
  { provide: FONTE_VENDAS, useExisting: FONTE_VENDAS_LOCAL },
];
