import { Routes } from '@angular/router';

import { authGuard, guestGuard, pendingPasswordGuard, platformInfoGuard } from './core/auth/auth.guard';
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
    path: 'cambiar-password-obligatoria',
    canActivate: [pendingPasswordGuard],
    loadComponent: () => import('./features/auth/pages/cambio-password-obligatorio-page/cambio-password-obligatorio-page')
      .then(m => m.CambioPasswordObligatorioPageComponent),
  },
  {
    path: 'plataforma',
    canActivate: [platformInfoGuard],
    loadComponent: () => import('./features/plataforma/pages/plataforma-page/plataforma-page')
      .then(m => m.PlataformaPageComponent),
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
    path: 'produccion',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR', 'LECTOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/produccion-inicio-page/produccion-inicio-page')
        .then(m => m.ProduccionInicioPageComponent),
  },
  {
    path: 'produccion/catalogos',
    pathMatch: 'full',
    redirectTo: '/produccion/catalogos/productos',
  },
  {
    path: 'produccion/catalogos/:tipo',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR', 'LECTOR'] },
    loadComponent: () =>
      import('./features/produccion/catalogos/catalogos-page/catalogos-page')
        .then(m => m.CatalogosProduccionPageComponent),
  },
  {
    path: 'produccion/nueva',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/nueva-produccion-page/nueva-produccion-page')
        .then(m => m.NuevaProduccionPageComponent),
  },
  {
    path: 'produccion/en-proceso',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/producciones-en-proceso-page/producciones-en-proceso-page')
        .then(m => m.ProduccionesEnProcesoPageComponent),
  },
  {
    path: 'produccion/lotes',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR', 'LECTOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/lotes-produccion-page/lotes-produccion-page')
        .then(m => m.LotesProduccionPageComponent),
  },
  {
    path: 'produccion/producciones/:id/editar',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/editar-produccion-page/editar-produccion-page')
        .then(m => m.EditarProduccionPageComponent),
  },
  {
    path: 'produccion/producciones/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OPERADOR', 'LECTOR'] },
    loadComponent: () =>
      import('./features/produccion/pages/detalle-produccion-page/detalle-produccion-page')
        .then(m => m.DetalleProduccionPageComponent),
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
