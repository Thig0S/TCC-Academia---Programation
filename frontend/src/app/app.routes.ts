import { Routes } from '@angular/router';

const produto = 'Mercadão dos Óculos - Vendas em Aberto';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
  {
    path: 'visao-geral',
    title: `Visão Geral | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/visao-geral/visao-geral').then((m) => m.VisaoGeral),
  },
  {
    path: 'vendas/quitadas',
    title: `Vendas quitadas | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/vendas/listar-vendas-quitadas/listar-vendas-quitadas').then(
        (m) => m.ListarVendasQuitadas,
      ),
  },
  {
    path: 'vendas/inativas',
    title: `Vendas inativas | ${produto}`,
    data: { statusAdministrativo: 'Inativo' },
    loadComponent: () =>
      import('./funcionalidades/vendas/listar-vendas-administrativas/listar-vendas-administrativas').then(
        (m) => m.ListarVendasAdministrativas,
      ),
  },
  {
    path: 'vendas/prejuizo',
    title: `Vendas em Prejuízo | ${produto}`,
    data: { statusAdministrativo: 'Prejuízo' },
    loadComponent: () =>
      import('./funcionalidades/vendas/listar-vendas-administrativas/listar-vendas-administrativas').then(
        (m) => m.ListarVendasAdministrativas,
      ),
  },
  {
    path: 'vendas',
    title: `Vendas | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/vendas/listar-vendas/listar-vendas').then((m) => m.ListarVendas),
  },
  {
    path: 'relatorios',
    title: `Relatórios | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/relatorios/relatorios').then((m) => m.Relatorios),
  },
  {
    path: 'configuracoes',
    title: `Configurações | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/configuracoes/configuracoes').then((m) => m.Configuracoes),
  },
  {
    path: 'vendas/nova',
    title: `Nova venda | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/vendas/cadastrar-venda/cadastrar-venda').then(
        (m) => m.CadastrarVenda,
      ),
  },
  {
    path: 'vendas/:id/editar',
    title: `Editar dados do cliente | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/vendas/editar-venda/editar-venda').then((m) => m.EditarVenda),
  },
  {
    path: 'vendas/:id',
    title: `Detalhes da venda | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/vendas/detalhes-venda/detalhes-venda').then((m) => m.DetalhesVenda),
  },
  {
    path: '**',
    title: `Página não encontrada | ${produto}`,
    loadComponent: () =>
      import('./funcionalidades/nao-encontrada/nao-encontrada').then((m) => m.NaoEncontrada),
  },
];
