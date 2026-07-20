import { TestBed } from '@angular/core/testing';

import { SesionPersistida } from './auth.models';
import { AUTH_SESSION_STORAGE_KEY, AuthSessionStorage } from './auth-session.storage';

describe('AuthSessionStorage', () => {
  const session: SesionPersistida = {
    accessToken: 'jwt-token',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    usuario: {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@queseria.local',
      roles: ['ADMIN'],
      queseriaId: null,
    },
  };

  let storage: AuthSessionStorage;

  beforeEach(() => {
    window.sessionStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(AuthSessionStorage);
  });

  afterEach(() => window.sessionStorage.clear());

  it('should save, read and clear the session', () => {
    storage.write(session);

    expect(storage.read()).toEqual(session);

    storage.clear();
    expect(storage.read()).toBeNull();
  });

  it('should remove malformed JSON', () => {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, '{sesion-invalida');

    expect(storage.read()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('should reject a session with invalid roles', () => {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
      ...session,
      usuario: { ...session.usuario, roles: ['SUPERADMIN'] },
    }));

    expect(storage.read()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});
