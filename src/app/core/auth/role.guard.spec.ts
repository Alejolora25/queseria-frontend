import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';

import { RolUsuario } from './auth.models';
import { AuthService } from './auth.service';
import { AuthFeedbackService } from './auth-feedback.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authenticated: boolean;
  let roles: RolUsuario[];
  let accessDeniedSpy: jasmine.Spy;

  beforeEach(() => {
    authenticated = true;
    roles = [];
    accessDeniedSpy = jasmine.createSpy('accessDenied');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthFeedbackService, useValue: { accessDenied: accessDeniedSpy } },
        {
          provide: AuthService,
          useValue: {
            autenticado: () => authenticated,
            tieneRol: (role: RolUsuario) => roles.includes(role),
          },
        },
      ],
    });
  });

  it('redirects unauthenticated users to login preserving the destination', () => {
    authenticated = false;

    const result = executeGuard(['ADMIN'], '/admin');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>))
      .toBe('/login?returnUrl=%2Fadmin');
    expect(accessDeniedSpy).not.toHaveBeenCalled();
  });

  it('allows an ADMIN to enter an ADMIN route', () => {
    roles = ['ADMIN'];

    expect(executeGuard(['ADMIN'], '/admin')).toBeTrue();
  });

  it('allows an OPERADOR when the route accepts ADMIN or OPERADOR', () => {
    roles = ['OPERADOR'];

    expect(executeGuard(['ADMIN', 'OPERADOR'], '/calidad/cargar')).toBeTrue();
  });

  it('redirects a LECTOR to a permitted route', () => {
    roles = ['LECTOR'];

    const result = executeGuard(['ADMIN', 'OPERADOR'], '/calidad/cargar');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>))
      .toBe('/calidad/historico');
    expect(accessDeniedSpy).toHaveBeenCalled();
  });

  it('denies access when the route has no valid role configuration', () => {
    roles = ['ADMIN'];

    const result = executeGuard([], '/admin');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>))
      .toBe('/calidad/historico');
  });

  function executeGuard(allowedRoles: RolUsuario[], url: string) {
    const route = { data: { roles: allowedRoles } } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;

    return TestBed.runInInjectionContext(() => roleGuard(route, state));
  }
});
