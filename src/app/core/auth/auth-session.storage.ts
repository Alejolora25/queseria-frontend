import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { RolUsuario, SesionPersistida, UsuarioSesion } from './auth.models';

export const AUTH_SESSION_STORAGE_KEY = 'queseria.auth.session.v1';

const VALID_ROLES: readonly RolUsuario[] = ['ADMIN', 'OPERADOR', 'LECTOR'];

@Injectable({ providedIn: 'root' })
export class AuthSessionStorage {
  private readonly document = inject(DOCUMENT);

  read(): SesionPersistida | null {
    const storage = this.storage();
    if (!storage) return null;

    try {
      const rawSession = storage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (!rawSession) return null;

      const session: unknown = JSON.parse(rawSession);
      if (!this.isValidSession(session)) {
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  write(session: SesionPersistida): void {
    try {
      this.storage()?.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // La sesión continúa en memoria si el navegador bloquea sessionStorage.
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // No hay información adicional que limpiar si el almacenamiento no está disponible.
    }
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.sessionStorage ?? null;
    } catch {
      return null;
    }
  }

  private isValidSession(value: unknown): value is SesionPersistida {
    if (!this.isRecord(value)) return false;

    return typeof value['accessToken'] === 'string'
      && value['accessToken'].trim().length > 0
      && typeof value['expiresIn'] === 'number'
      && Number.isFinite(value['expiresIn'])
      && value['expiresIn'] > 0
      && typeof value['expiresAt'] === 'number'
      && Number.isFinite(value['expiresAt'])
      && value['expiresAt'] > 0
      && this.isValidUser(value['usuario']);
  }

  private isValidUser(value: unknown): value is UsuarioSesion {
    if (!this.isRecord(value)) return false;

    const queseriaId = value['queseriaId'];
    return typeof value['id'] === 'number'
      && Number.isFinite(value['id'])
      && typeof value['nombre'] === 'string'
      && typeof value['email'] === 'string'
      && Array.isArray(value['roles'])
      && value['roles'].every(role => VALID_ROLES.includes(role as RolUsuario))
      && (queseriaId === null || (typeof queseriaId === 'number' && Number.isFinite(queseriaId)));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
