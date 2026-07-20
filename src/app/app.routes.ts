import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'calidad/historico' },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page')
        .then(m => m.LoginPageComponent),
  },

  {
    path: 'calidad',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'historico',
      },
      {
        path: 'cargar',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'OPERADOR'] },
        loadComponent: () =>
          import('./features/calidad/pages/carga-muestra-page/carga-muestra-page')
            .then(m => m.CargaMuestraPageComponent),
      },
      {
        path: 'historico',
        loadComponent: () =>
          import('./features/calidad/pages/historico-page/historico-page')
            .then(m => m.HistoricoPageComponent),
      },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./features/calidad/pages/dashboard-resumen-page/dashboard-resumen-page')
            .then(m => m.DashboardResumenPageComponent),
      },
    ],
  },

  {
    path: 'proveedores',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/proveedores/pages/proveedores-page/proveedores-page')
        .then(m => m.ProveedoresPageComponent),
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/pages/usuarios-page/usuarios-page')
            .then(m => m.UsuariosPageComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'calidad/historico' },
];
