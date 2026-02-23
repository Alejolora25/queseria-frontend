import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'calidad/historico' },

  {
    path: 'calidad',
    children: [
      {
        path: 'cargar',
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
    loadComponent: () =>
      import('./features/proveedores/pages/proveedores-page/proveedores-page')
        .then(m => m.ProveedoresPageComponent),
  },

  { path: '**', redirectTo: 'calidad/historico' },
];
