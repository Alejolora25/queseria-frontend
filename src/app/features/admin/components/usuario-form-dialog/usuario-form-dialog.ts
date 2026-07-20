import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { parseApiError } from '../../../../core/api/api-error';
import { UsuariosApi } from '../../../../core/api/usuarios.api';
import { RolUsuario } from '../../../../core/auth/auth.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <div class="p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">Crear usuario</h2>
          <p class="mt-1 text-sm text-muted-color">Registra el acceso y el rol inicial.</p>
        </div>
        <p-button icon="pi pi-times" [text]="true" [rounded]="true" ariaLabel="Cerrar" (onClick)="cancelar()" [disabled]="busy()" />
      </div>

      <form class="mt-5 grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="flex flex-col gap-2">
          <label for="usuario-nombre" class="font-semibold">Nombre</label>
          <input id="usuario-nombre" pInputText autocomplete="name" [formControl]="form.controls.nombre" [invalid]="form.controls.nombre.touched && form.controls.nombre.invalid" />
          @if (form.controls.nombre.touched && form.controls.nombre.invalid) { <small class="text-red-600">Ingresa un nombre de máximo 120 caracteres.</small> }
        </div>
        <div class="flex flex-col gap-2">
          <label for="usuario-email" class="font-semibold">Correo electrónico</label>
          <input id="usuario-email" pInputText type="email" autocomplete="email" [formControl]="form.controls.email" [invalid]="form.controls.email.touched && form.controls.email.invalid" />
          @if (form.controls.email.touched && form.controls.email.invalid) { <small class="text-red-600">Ingresa un correo electrónico válido.</small> }
        </div>
        <div class="flex flex-col gap-2">
          <label for="usuario-password" class="font-semibold">Contraseña temporal</label>
          <input id="usuario-password" pInputText type="password" autocomplete="new-password" [formControl]="form.controls.password" [invalid]="form.controls.password.touched && form.controls.password.invalid" />
          <small class="text-muted-color">Debe tener entre 8 y 72 caracteres.</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="usuario-roles" class="font-semibold">Rol</label>
          <p-select inputId="usuario-roles" [options]="roleOptions" optionLabel="label" optionValue="value" placeholder="Selecciona un rol" appendTo="body" scrollHeight="12rem" [filter]="true" filterPlaceholder="Buscar rol" [fluid]="true" [formControl]="form.controls.rol" [invalid]="form.controls.rol.touched && form.controls.rol.invalid" />
          @if (form.controls.rol.touched && form.controls.rol.invalid) { <small class="text-red-600">Selecciona exactamente un rol.</small> }
        </div>
      </form>

      @if (error()) {
        <div class="app-alert app-alert-error mt-4">
          <div class="font-medium">No se pudo crear el usuario</div><div>{{ error() }}</div>
          @if (fields()) { <ul class="mt-2 list-disc pl-5 text-xs">@for (item of fieldErrorsList(fields()!); track item.field) { <li><strong>{{ item.field }}:</strong> {{ item.messages.join(', ') }}</li> }</ul> }
        </div>
      }

      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="cancelar()" [disabled]="busy()" />
        <p-button label="Crear usuario" icon="pi pi-user-plus" (onClick)="guardar()" [loading]="busy()" [disabled]="form.invalid || busy()" />
      </div>
    </div>
  `,
})
export class UsuarioFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsuariosApi);
  private readonly ref = inject(DynamicDialogRef);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly fields = signal<Record<string, string[]> | null>(null);
  readonly roleOptions: { label: string; value: RolUsuario }[] = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Operador', value: 'OPERADOR' },
    { label: 'Lector', value: 'LECTOR' },
  ];
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    rol: this.fb.control<RolUsuario | null>(null, Validators.required),
  });

  cancelar() { this.ref.close(); }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set(null); this.fields.set(null);
    const value = this.form.getRawValue();
    this.api.crear({
      nombre: value.nombre.trim(),
      email: value.email.trim().toLowerCase(),
      password: value.password,
      roles: [value.rol!],
    }).subscribe({
      next: usuario => { this.busy.set(false); this.form.controls.password.setValue(''); this.ref.close(usuario); },
      error: err => { this.busy.set(false); const parsed = parseApiError(err); this.error.set(parsed.message); this.fields.set(parsed.fields ?? null); },
    });
  }

  fieldErrorsList(fields: Record<string, string[]>) {
    return Object.entries(fields).map(([field, messages]) => ({ field, messages }));
  }
}
