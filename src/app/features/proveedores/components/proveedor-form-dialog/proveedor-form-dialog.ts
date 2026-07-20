import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp } from '../../../../core/api/models';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';

export interface ProveedorFormDialogData {
  proveedor?: ProveedorResp | null;
  initialValues?: { nombre?: string | null; tipoIdentificacion?: string | null; identificacion?: string | null };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <div class="p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-xl font-semibold tracking-tight">{{ proveedor ? 'Editar proveedor' : 'Crear proveedor' }}</h2><p class="mt-1 text-sm text-muted-color">{{ proveedor ? 'Actualiza los datos principales del proveedor.' : 'Registra un nuevo proveedor para la quesería.' }}</p></div><p-button icon="pi pi-times" [text]="true" [rounded]="true" ariaLabel="Cerrar" (onClick)="cancelar()" [disabled]="busy()" /></div>
      <form class="mt-5 grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="flex flex-col gap-2"><label for="nombre" class="font-semibold">Nombre</label><input id="nombre" pInputText [formControl]="form.controls.nombre" [invalid]="form.controls.nombre.touched && form.controls.nombre.invalid" />@if (form.controls.nombre.touched && form.controls.nombre.invalid) { <small class="text-red-600">El nombre es obligatorio.</small> }</div>
        <div class="flex flex-col gap-2"><label for="tipo" class="font-semibold">Tipo</label><p-select inputId="tipo" [options]="tipos" [formControl]="form.controls.tipoIdentificacion" /></div>
        <div class="flex flex-col gap-2"><label for="identificacion" class="font-semibold">Identificación</label><input id="identificacion" pInputText [formControl]="form.controls.identificacion" [invalid]="form.controls.identificacion.touched && form.controls.identificacion.invalid" />@if (form.controls.identificacion.touched && form.controls.identificacion.invalid) { <small class="text-red-600">La identificación es obligatoria.</small> }</div>
      </form>
      @if (error()) { <div class="app-alert app-alert-error mt-4"><div class="font-medium">No se pudo guardar</div><div>{{ error() }}</div>@if (fields()) { <ul class="mt-2 list-disc pl-5 text-xs">@for (item of fieldErrorsList(fields()!); track item.field) { <li><strong>{{ item.field }}:</strong> {{ item.messages.join(', ') }}</li> }</ul> }</div> }
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="cancelar()" [disabled]="busy()" /><p-button label="Guardar" icon="pi pi-save" (onClick)="guardar()" [loading]="busy()" [disabled]="form.invalid || busy()" /></div>
    </div>
  `,
})
export class ProveedorFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProveedoresApi);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<ProveedorFormDialogData>);
  private readonly data = this.config.data ?? {};
  protected readonly proveedor = this.data.proveedor ?? null;
  protected readonly tipos = ['CC', 'NIT', 'CE'];
  protected readonly error = signal<string | null>(null);
  protected readonly fields = signal<Record<string, string[]> | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.proveedor?.nombre ?? this.data.initialValues?.nombre ?? '', Validators.required],
    tipoIdentificacion: [this.proveedor?.tipoIdentificacion ?? this.data.initialValues?.tipoIdentificacion ?? 'CC', Validators.required],
    identificacion: [this.proveedor?.identificacion ?? this.data.initialValues?.identificacion ?? '', Validators.required],
  });

  protected cancelar() { this.ref.close(); }
  protected guardar() {
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    this.error.set(null); this.fields.set(null); this.busy.set(true);
    const v = this.form.getRawValue();
    const payload = { nombre: v.nombre.trim(), tipoIdentificacion: v.tipoIdentificacion, identificacion: v.identificacion.trim() };
    (this.proveedor ? this.api.actualizar(this.proveedor.id, payload) : this.api.crear(payload)).subscribe({
      next: proveedor => { this.busy.set(false); this.ref.close(proveedor); },
      error: err => { this.busy.set(false); const parsed = parseApiError(err); this.error.set(parsed.message); this.fields.set(parsed.fields ?? null); },
    });
  }
  protected fieldErrorsList(fields: Record<string, string[]>) { return Object.entries(fields).map(([field, messages]) => ({ field, messages })); }
}
