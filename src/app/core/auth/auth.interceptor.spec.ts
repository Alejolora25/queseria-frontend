import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { apiBaseUrlInterceptor } from '../http-interceptor';
import { AuthUnauthorizedHandler, authInterceptor } from './auth.interceptor';
import { AuthFeedbackService } from './auth-feedback.service';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let token: string | null;
  let logoutSpy: jasmine.Spy<() => void>;
  let navigateSpy: jasmine.Spy;
  let routerUrl: string;
  let sessionExpiredSpy: jasmine.Spy;
  let permissionDeniedSpy: jasmine.Spy;

  beforeEach(() => {
    token = 'jwt-token';
    routerUrl = '/proveedores';
    logoutSpy = jasmine.createSpy('logout');
    navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);
    sessionExpiredSpy = jasmine.createSpy('sessionExpired');
    permissionDeniedSpy = jasmine.createSpy('permissionDenied');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: () => token,
            logout: logoutSpy,
          },
        },
        {
          provide: Router,
          useValue: {
            get url() { return routerUrl; },
            navigate: navigateSpy,
          },
        },
        {
          provide: AuthFeedbackService,
          useValue: {
            sessionExpired: sessionExpiredSpy,
            permissionDenied: permissionDeniedSpy,
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should add Bearer to protected backend requests', () => {
    http.get('/api/v1/proveedores').subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/proveedores`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('should not add Authorization without a stored token', () => {
    token = null;
    http.get('/api/v1/muestras').subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/muestras`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
  });

  it('should never send the token to an external domain', () => {
    http.get('https://example.com/resource').subscribe();

    const request = httpTesting.expectOne('https://example.com/resource');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('should keep login public and let the page handle its 401', () => {
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/login`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush(
      { message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(sessionExpiredSpy).not.toHaveBeenCalled();
    expect(permissionDeniedSpy).not.toHaveBeenCalled();
  });

  it('should keep health public', () => {
    http.get('/actuator/health').subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/actuator/health`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ status: 'UP' });
  });

  it('should clear the session and redirect after a protected 401', () => {
    http.get('/api/v1/proveedores').subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/proveedores`);

    request.flush(
      { message: 'Token inválido o expirado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/proveedores' },
    });
    expect(sessionExpiredSpy).toHaveBeenCalled();
  });

  it('should not clear the session or redirect after a 403', () => {
    http.get('/api/v1/proveedores').subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/proveedores`);

    request.flush(
      { message: 'Permiso insuficiente' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(permissionDeniedSpy).toHaveBeenCalled();
  });

  it('should avoid duplicate redirects for simultaneous 401 responses', () => {
    let finishNavigation: ((value: boolean) => void) | undefined;
    navigateSpy.and.returnValue(new Promise<boolean>(resolve => {
      finishNavigation = resolve;
    }));
    const handler = TestBed.inject(AuthUnauthorizedHandler);

    handler.handle();
    handler.handle();

    expect(logoutSpy).toHaveBeenCalledTimes(2);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);
    finishNavigation?.(true);
  });
});
