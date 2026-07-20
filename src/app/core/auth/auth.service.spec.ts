import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { AuthApi } from './auth.api';
import { AuthSessionStorage } from './auth-session.storage';
import { LoginRequest, LoginResponse, SesionPersistida } from './auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const response: LoginResponse = {
    accessToken: 'jwt-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    usuario: {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@queseria.local',
      roles: ['ADMIN', 'LECTOR'],
      queseriaId: null,
    },
  };

  let service: AuthService;
  let loginSpy: jasmine.Spy<(request: LoginRequest) => Observable<LoginResponse>>;
  let readSpy: jasmine.Spy<() => SesionPersistida | null>;
  let writeSpy: jasmine.Spy<(session: SesionPersistida) => void>;
  let clearSpy: jasmine.Spy<() => void>;

  function configure(restoredSession: SesionPersistida | null = null): void {
    loginSpy = jasmine.createSpy('login');
    readSpy = jasmine.createSpy('read').and.returnValue(restoredSession);
    writeSpy = jasmine.createSpy('write');
    clearSpy = jasmine.createSpy('clear');

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthApi, useValue: { login: loginSpy } },
        {
          provide: AuthSessionStorage,
          useValue: { read: readSpy, write: writeSpy, clear: clearSpy },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  }

  afterEach(() => service?.logout());

  it('should start without an authenticated user', () => {
    configure();

    expect(service.usuarioActual()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.expiresAt()).toBeNull();
    expect(service.autenticado()).toBeFalse();
    expect(service.roles()).toEqual([]);
  });

  it('should normalize email and persist a successful login', () => {
    configure();
    loginSpy.and.returnValue(of(response));
    const beforeLogin = Date.now();

    service.login({ email: '  ADMIN@Queseria.Local ', password: 'Admin123*' }).subscribe();

    expect(loginSpy).toHaveBeenCalledWith({
      email: 'admin@queseria.local',
      password: 'Admin123*',
    });
    const persistedSession = writeSpy.calls.mostRecent().args[0];
    expect(persistedSession.accessToken).toBe('jwt-token');
    expect(persistedSession.usuario).toEqual(response.usuario);
    expect(persistedSession.expiresIn).toBe(3600);
    expect(persistedSession.expiresAt).toBeGreaterThanOrEqual(beforeLogin + 3_600_000);
    expect(service.usuarioActual()).toEqual(response.usuario);
    expect(service.accessToken()).toBe('jwt-token');
    expect(service.autenticado()).toBeTrue();
    expect(service.tieneRol('ADMIN')).toBeTrue();
    expect(service.tieneRol('OPERADOR')).toBeFalse();
  });

  it('should restore a valid stored session', () => {
    const storedSession: SesionPersistida = {
      accessToken: response.accessToken,
      expiresIn: response.expiresIn,
      expiresAt: Date.now() + 60_000,
      usuario: response.usuario,
    };

    configure(storedSession);

    expect(service.usuarioActual()).toEqual(response.usuario);
    expect(service.accessToken()).toBe(response.accessToken);
    expect(service.expiresAt()).toBe(storedSession.expiresAt);
    expect(service.autenticado()).toBeTrue();
  });

  it('should discard an expired stored session', () => {
    configure({
      accessToken: response.accessToken,
      expiresIn: response.expiresIn,
      expiresAt: Date.now() - 1,
      usuario: response.usuario,
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(service.usuarioActual()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.autenticado()).toBeFalse();
  });

  it('should not replace or persist the current session when login fails', () => {
    configure();
    loginSpy.and.returnValue(of(response));
    service.login({ email: response.usuario.email, password: 'correcta' }).subscribe();
    writeSpy.calls.reset();

    loginSpy.and.returnValue(throwError(() => new Error('Credenciales inválidas')));
    service.login({ email: 'otro@queseria.local', password: 'incorrecta' }).subscribe({
      error: () => undefined,
    });

    expect(writeSpy).not.toHaveBeenCalled();
    expect(service.usuarioActual()).toEqual(response.usuario);
    expect(service.accessToken()).toBe('jwt-token');
    expect(service.autenticado()).toBeTrue();
  });

  it('should clear persisted and in-memory data on logout', () => {
    configure();
    loginSpy.and.returnValue(of(response));
    service.login({ email: response.usuario.email, password: 'correcta' }).subscribe();

    service.logout();

    expect(clearSpy).toHaveBeenCalled();
    expect(service.usuarioActual()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.expiresIn()).toBeNull();
    expect(service.expiresAt()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.autenticado()).toBeFalse();
  });
});
