import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('authentication guards', () => {
  let authenticated: boolean;
  let pendingPassword: boolean;
  let actorType: 'PLATAFORMA' | 'QUESERIA' | null;
  let router: Router;

  beforeEach(() => {
    authenticated = false;
    pendingPassword = false;
    actorType = null;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            autenticado: () => authenticated,
            debeCambiarPassword: () => pendingPassword,
            tipoUsuario: () => actorType,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should allow an authenticated user into a private route', () => {
    authenticated = true;

    expect(runAuthGuard('/proveedores')).toBeTrue();
  });

  it('should redirect an unauthenticated user and preserve returnUrl', () => {
    const result = runAuthGuard('/proveedores?activo=true') as UrlTree;

    expect(router.serializeUrl(result)).toBe(
      '/login?returnUrl=%2Fproveedores%3Factivo%3Dtrue',
    );
  });

  it('should discard an unsafe returnUrl', () => {
    const result = runAuthGuard('https://sitio-malicioso.example') as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('should allow an unauthenticated user into login', () => {
    expect(runGuestGuard()).toBeTrue();
  });

  it('should redirect an authenticated user away from login', () => {
    authenticated = true;
    const result = runGuestGuard() as UrlTree;

    expect(router.serializeUrl(result)).toBe('/calidad/historico');
  });

  it('redirects a temporary session away from operational routes', () => {
    authenticated = true;
    pendingPassword = true;
    expect(router.serializeUrl(runAuthGuard('/proveedores') as UrlTree))
      .toBe('/cambiar-password-obligatoria');
  });

  it('redirects PLATFORM_ADMIN away from Calidad', () => {
    authenticated = true;
    actorType = 'PLATAFORMA';
    expect(router.serializeUrl(runAuthGuard('/calidad/historico') as UrlTree))
      .toBe('/plataforma');
  });

  function runAuthGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot,
    )) as boolean | UrlTree;
  }

  function runGuestGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => guestGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/login' } as RouterStateSnapshot,
    )) as boolean | UrlTree;
  }
});
