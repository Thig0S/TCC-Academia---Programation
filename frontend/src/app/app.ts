import {
  afterNextRender,
  AfterRenderRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { BarraNavegacao } from './compartilhado/componentes/barra-navegacao/barra-navegacao';
import { ServicoTema } from './nucleo/configuracao/servico-tema';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, BarraNavegacao],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-bs-theme]': 'servicoTema.tema()' },
})
export class App {
  protected readonly servicoTema = inject(ServicoTema);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private focoPendente?: AfterRenderRef;
  private ultimoDestino?: string;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
      if (evento instanceof NavigationStart) this.focoPendente?.destroy();
      if (!(evento instanceof NavigationEnd)) return;
      const mudou =
        this.ultimoDestino !== undefined && this.ultimoDestino !== evento.urlAfterRedirects;
      this.ultimoDestino = evento.urlAfterRedirects;
      if (!mudou) return;
      this.focoPendente = afterNextRender(
        () => {
          if (this.router.lastSuccessfulNavigation()?.id === evento.id) {
            this.elemento.nativeElement.querySelector<HTMLElement>('main h1')?.focus();
          }
        },
        { injector: this.injector },
      );
    });
  }
}
