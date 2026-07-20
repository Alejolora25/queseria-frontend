import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';

import { parseApiError } from '../../../../core/api/api-error';
import { UsuariosApi } from '../../../../core/api/usuarios.api';
import { UsuarioAdmin } from '../../../../core/api/usuarios.models';
import { RolUsuario } from '../../../../core/auth/auth.models';

export interface UsuarioRolesDialogData { usuario: UsuarioAdmin; }

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, SelectModule],
  template: `
    <div class="p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div><h2 class="text-xl font-semibold tracking-tight">Cambiar rol</h2><p class="mt-1 text-sm text-muted-color">{{ usuario.nombre }} · {{ usuario.email }}</p></div>
        <p-button icon="pi pi-times" [text]="true" [rounded]="true" ariaLabel="Cerrar" (onClick)="cancelar()" [disabled]="busy()" />
      </div>
      <form class="mt-5" [formGroup]="form">
        <div class="flex flex-col gap-2">
          <label for="rol" class="font-semibold">Rol asignado</label>
          <p-select inputId="rol" [options]="roleOptions" optionLabel="label" optionValue="value" appendTo="body" scrollHeight="12rem" [filter]="true" filterPlaceholder="Buscar rol" [fluid]="true" [formControl]="form.controls.rol" [invalid]="form.controls.rol.touched && form.controls.rol.invalid" />
          @if (form.controls.rol.touched && form.controls.rol.invalid) { <small class="text-red-600">El usuario debe conservar exactamente un rol.</small> }
        </div>
      </form>
      <div class="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">El nuevo rol se reflejará plenamente cuando el usuario vuelva a iniciar sesión.</div>
      @if (error()) { <div class="app-alert app-alert-error mt-4"><div class="font-medium">No se pudo actualizar el rol</div><div>{{ error() }}</div></div> }
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="cancelar()" [disabled]="busy()" />
        <p-button label="Guardar rol" icon="pi pi-save" (onClick)="guardar()" [loading]="busy()" [disabled]="form.invalid || busy()" />
      </div>
    </div>
  `,
})
export class UsuarioRolesDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsuariosApi);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<UsuarioRolesDialogData>);
  readonly usuario = this.config.data!.usuario;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly roleOptions: { label: string; value: RolUsuario }[] = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Operador', value: 'OPERADOR' },
    { label: 'Lector', value: 'LECTOR' },
  ];
  readonly form = this.fb.nonNullable.group({
    rol: this.fb.control<RolUsuario | null>(this.usuario.roles[0] ?? null, Validators.required),
  });

  cancelar() { this.ref.close(); }
  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set(null);
    this.api.cambiarRol(this.usuario.id, this.form.getRawValue().rol!).subscribe({
      next: usuario => { this.busy.set(false); this.ref.close(usuario); },
      error: err => { this.busy.set(false); this.error.set(parseApiError(err).message); },
    });
  }
}
