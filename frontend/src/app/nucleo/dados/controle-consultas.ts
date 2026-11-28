import { Injectable, signal } from '@angular/core';

/** Epoch de invalidação, sem guardar dados comerciais nem respostas de consulta. */
@Injectable({ providedIn: 'root' })
export class ControleConsultas {
  private readonly valorInterno = signal(0);
  readonly geracao = this.valorInterno.asReadonly();

  invalidarTodas(): number {
    const proxima = this.valorInterno() + 1;
    this.valorInterno.set(proxima);
    return proxima;
  }
}
