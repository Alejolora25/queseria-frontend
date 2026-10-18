import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './cambio-password-obligatorio-page.html',
  styleUrl: './cambio-password-obligatorio-page.css',
})
export class CambioPasswordObligatorioPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    passwordActual: ['', Validators.required],
    passwordNueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    confirmacion: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { passwordActual, passwordNueva, confirmacion } = this.form.getRawValue();
    if (passwordNueva !== confirmacion) {
      this.errorMessage.set('La confirmación no coincide con la contraseña nueva.');
      return;
    }
    this.loading.set(true);
    this.auth.cambiarPasswordObligatoria({ passwordActual, passwordNueva }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl(
        this.auth.tipoUsuario() === 'PLATAFORMA' ? '/plataforma' : '/calidad/historico',
      ),
      error: (error: unknown) => this.errorMessage.set(this.messageFor(error)),
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La credencial temporal no es válida o venció.';
      if (error.status === 400 || error.status === 422)
        return 'Revisa la contraseña nueva y vuelve a intentarlo.';
      if (error.status === 0) return 'No fue posible conectar con el servidor.';
    }
    return 'No fue posible cambiar la contraseña. Intenta nuevamente.';
  }
}
