import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-barra-navegacao',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-navegacao.html',
  styleUrl: './barra-navegacao.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraNavegacao {
  protected readonly modulos = [
    { rota: '/visao-geral', nome: 'Visão Geral', icone: 'M3 11 12 3 21 11 M5 10v11h5v-7h4v7h5V10' },
    { rota: '/vendas', nome: 'Vendas', icone: 'M2 3h3l3 12h11l3-9H6 M9 20h.01 M18 20h.01' },
    { rota: '/relatorios', nome: 'Relatórios', icone: 'M4 3v18h17 M9 17V9 M14 17V5 M19 17v-5' },
    {
      rota: '/configuracoes',
      nome: 'Configurações',
      icone: 'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M10 15v6',
    },
  ];
}
