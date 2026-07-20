import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthApi } from './auth.api';
import { AuthSessionStorage } from './auth-session.storage';
import {
  LoginRequest,
  LoginResponse,
  RolUsuario,
  SesionPersistida,
  UsuarioSesion,
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly sessionStorage = inject(AuthSessionStorage);
  private readonly usuarioState = signal<UsuarioSesion | null>(null);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly expiresInState = signal<number | null>(null);
  private readonly expiresAtState = signal<number | null>(null);
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly usuarioActual = this.usuarioState.asReadonly();
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly expiresIn = this.expiresInState.asReadonly();
  readonly expiresAt = this.expiresAtState.asReadonly();
  readonly autenticado = computed(
    () => this.usuarioState() !== null && this.accessTokenState() !== null,
  );
  readonly roles = computed<readonly RolUsuario[]>(() => this.usuarioState()?.roles ?? []);

  constructor() {
    this.restoreSession();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    const normalizedRequest: LoginRequest = {
      email: request.email.trim().toLowerCase(),
      password: request.password,
    };

    return this.authApi.login(normalizedRequest).pipe(
      tap(response => this.startSession(response)),
    );
  }

  logout(): void {
    this.cancelExpirationTimer();
    this.sessionStorage.clear();
    this.usuarioState.set(null);
    this.accessTokenState.set(null);
    this.expiresInState.set(null);
    this.expiresAtState.set(null);
  }

  tieneRol(rol: RolUsuario): boolean {
    return this.roles().includes(rol);
  }

  private startSession(response: LoginResponse): void {
    const session: SesionPersistida = {
      accessToken: response.accessToken,
      expiresIn: response.expiresIn,
      expiresAt: Date.now() + response.expiresIn * 1_000,
      usuario: response.usuario,
    };

    this.sessionStorage.write(session);
    this.applySession(session);
  }

  private restoreSession(): void {
    const session = this.sessionStorage.read();
    if (!session) return;

    if (session.expiresAt <= Date.now()) {
      this.sessionStorage.clear();
      return;
    }
    this.applySession(session);
  }

  private applySession(session: SesionPersistida): void {
    this.usuarioState.set(session.usuario);
    this.accessTokenState.set(session.accessToken);
    this.expiresInState.set(session.expiresIn);
    this.expiresAtState.set(session.expiresAt);
    this.scheduleExpiration(session.expiresAt);
  }

  private scheduleExpiration(expiresAt: number): void {
    this.cancelExpirationTimer();
    const remainingTime = Math.max(0, expiresAt - Date.now());
    this.expirationTimer = setTimeout(() => this.logout(), remainingTime);
  }

  private cancelExpirationTimer(): void {
    if (this.expirationTimer === null) return;
    clearTimeout(this.expirationTimer);
    this.expirationTimer = null;
  }
}
