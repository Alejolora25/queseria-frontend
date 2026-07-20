import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.login(this.form.getRawValue()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl(this.destinationAfterLogin()),
      error: (error: unknown) => this.errorMessage.set(this.messageFor(error)),
    });
  }

  private destinationAfterLogin(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return this.isSafeInternalUrl(returnUrl) ? returnUrl : '/calidad/historico';
  }

  private isSafeInternalUrl(url: string | null): url is string {
    return url !== null && url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
  }

  private messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible iniciar sesión. Intenta nuevamente.';
    }

    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }
    if (error.status === 400 || error.status === 422) {
      return 'Revisa los datos ingresados.';
    }
    if (error.status === 0) {
      return 'No fue posible conectar con el servidor.';
    }
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }
}
