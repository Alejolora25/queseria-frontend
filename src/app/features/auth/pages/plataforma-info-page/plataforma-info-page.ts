import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  template: `
    <main class="min-h-dvh grid place-items-center bg-slate-50 p-6">
      <section class="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-semibold">Administración de plataforma</h1>
        <p class="mt-3 text-slate-600">El panel de plataforma estará disponible en una etapa posterior.
          Tu cuenta no tiene acceso a los datos operativos de las queserías.</p>
        <button type="button" class="mt-6 rounded-xl bg-sky-700 px-4 py-2 font-semibold text-white"
          (click)="logout()">Cerrar sesión</button>
      </section>
    </main>
  `,
})
export class PlataformaInfoPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
