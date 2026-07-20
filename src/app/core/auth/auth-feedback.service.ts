import { Injectable, signal } from '@angular/core';

export interface AuthFeedback {
  title: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class AuthFeedbackService {
  private readonly feedbackState = signal<AuthFeedback | null>(null);
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  readonly feedback = this.feedbackState.asReadonly();

  accessDenied(): void {
    this.show('Acceso denegado', 'No tienes permisos para acceder a esta sección.', 5000);
  }

  permissionDenied(): void {
    this.show('Permiso insuficiente', 'No tienes permisos para realizar esta acción.', 5000);
  }

  sessionExpired(): void {
    this.show('Sesión finalizada', 'Tu sesión expiró. Inicia sesión nuevamente.', 6000);
  }

  dismiss(): void {
    if (this.clearTimer !== null) clearTimeout(this.clearTimer);
    this.clearTimer = null;
    this.feedbackState.set(null);
  }

  private show(title: string, detail: string, life: number): void {
    this.dismiss();
    this.feedbackState.set({ title, detail });
    this.clearTimer = setTimeout(() => this.dismiss(), life);
  }
}
