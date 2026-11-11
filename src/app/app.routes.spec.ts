import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { routes } from './app.routes';

describe('application routes', () => {
  it('should protect the calidad parent and redirect its empty path to historico', () => {
    const calidadRoute = routes.find(route => route.path === 'calidad');
    const emptyChild = calidadRoute?.children?.find(route => route.path === '');

    expect(calidadRoute?.canActivate).toContain(authGuard);
    expect(calidadRoute?.canActivateChild).toContain(authGuard);
    expect(emptyChild?.pathMatch).toBe('full');
    expect(emptyChild?.redirectTo).toBe('historico');
  });

  it('should protect proveedores', () => {
    const proveedoresRoute = routes.find(route => route.path === 'proveedores');

    expect(proveedoresRoute?.canActivate).toContain(authGuard);
  });

  it('reserva las consultas de Producción a los tres roles de quesería', () => {
    for (const path of ['produccion', 'produccion/catalogos/:tipo',
      'produccion/lotes', 'produccion/producciones/:id']) {
      const route = routes.find(r => r.path === path);
      expect(route?.canActivate).withContext(path).toContain(authGuard);
      expect(route?.canActivate).withContext(path).toContain(roleGuard);
      expect(route?.data?.['roles']).withContext(path).toEqual(['ADMIN', 'OPERADOR', 'LECTOR']);
    }
    expect(routes.find(route => route.path === 'produccion')?.loadComponent).toBeDefined();
  });

  it('reserva apertura y edición de lotes a ADMIN y OPERADOR', () => {
    for (const path of ['produccion/nueva', 'produccion/en-proceso',
      'produccion/producciones/:id/editar']) {
      const route = routes.find(r => r.path === path);
      expect(route?.canActivate).toContain(authGuard);
      expect(route?.canActivate).toContain(roleGuard);
      expect(route?.data?.['roles']).toEqual(['ADMIN', 'OPERADOR']);
    }
  });

  it('should keep login restricted to unauthenticated users', () => {
    const loginRoute = routes.find(route => route.path === 'login');

    expect(loginRoute?.canActivate).toContain(guestGuard);
  });

  it('should allow only ADMIN and OPERADOR to load samples', () => {
    const calidadRoute = routes.find(route => route.path === 'calidad');
    const cargarRoute = calidadRoute?.children?.find(route => route.path === 'cargar');

    expect(cargarRoute?.canActivate).toContain(roleGuard);
    expect(cargarRoute?.data?.['roles']).toEqual(['ADMIN', 'OPERADOR']);
  });

  it('should reserve admin for authenticated ADMIN users', () => {
    const adminRoute = routes.find(route => route.path === 'admin');
    const emptyAdminRoute = adminRoute?.children?.find(route => route.path === '');
    const usuariosRoute = adminRoute?.children?.find(route => route.path === 'usuarios');

    expect(adminRoute?.canActivate).toContain(authGuard);
    expect(adminRoute?.canActivate).toContain(roleGuard);
    expect(adminRoute?.data?.['roles']).toEqual(['ADMIN']);
    expect(emptyAdminRoute?.redirectTo).toBe('usuarios');
    expect(usuariosRoute?.loadComponent).toBeDefined();
  });
});
