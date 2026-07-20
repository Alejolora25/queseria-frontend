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
