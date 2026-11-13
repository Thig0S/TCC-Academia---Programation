import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ServicoTema {
  private readonly temaAtual = signal<'dark' | 'light'>('dark');
  readonly tema = this.temaAtual.asReadonly();

  alternar(): void {
    this.temaAtual.update((tema) => (tema === 'dark' ? 'light' : 'dark'));
  }
}
