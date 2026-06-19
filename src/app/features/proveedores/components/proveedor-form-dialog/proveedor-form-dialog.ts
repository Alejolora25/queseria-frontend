import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { parseApiError } from '../../../../core/api/api-error';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { ProveedorResp } from '../../../../core/api/models';

export interface ProveedorFormDialogData {
  proveedor?: ProveedorResp | null;
}

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <div class="w-[min(92vw,560px)] p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">
            {{ proveedor ? 'Editar proveedor' : 'Crear proveedor' }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ proveedor ? 'Actualiza los datos principales del proveedor.' : 'Registra un nuevo proveedor para la queseria.' }}
          </p>
        </div>
      </div>

      <form class="mt-5 grid grid-cols-1 gap-3" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput [formControl]="form.controls.nombre" />
          @if (form.controls.nombre.invalid) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select [formControl]="form.controls.tipoIdentificacion">
            <mat-option value="CC">CC</mat-option>
            <mat-option value="NIT">NIT</mat-option>
            <mat-option value="CE">CE</mat-option>
          </mat-select>
          @if (form.controls.tipoIdentificacion.invalid) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Identificación</mat-label>
          <input matInput [formControl]="form.controls.identificacion" />
          @if (form.controls.identificacion.invalid) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>
      </form>

      @if (error()) {
        <div class="app-alert app-alert-error mt-2">
          <div class="font-medium">No se pudo guardar</div>
          <div>{{ error() }}</div>
          @if (fields()) {
            <div class="mt-2 text-xs">
              <div class="font-medium">Detalles:</div>
              <ul class="list-disc pl-5">
                @for (item of fieldErrorsList(fields()!); track item.field) {
                  <li>
                    <span class="font-medium">{{ item.field }}:</span> {{ item.messages.join(', ') }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }

      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button mat-stroked-button type="button" mat-dialog-close [disabled]="busy()">
          Cancelar
        </button>
        <button
          mat-raised-button
          color="primary"
          type="button"
          (click)="guardar()"
          [disabled]="form.invalid || busy()"
        >
          <span class="inline-flex items-center gap-2">
            @if (busy()) {
              <mat-progress-spinner diameter="18" mode="indeterminate" />
            }
            Guardar
          </span>
        </button>
      </div>
    </div>
  `,
})
export class ProveedorFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly dialogRef = inject(MatDialogRef<ProveedorFormDialogComponent, ProveedorResp>);
  private readonly data = inject<ProveedorFormDialogData>(MAT_DIALOG_DATA);

  protected readonly proveedor = this.data.proveedor ?? null;
  protected readonly error = signal<string | null>(null);
  protected readonly fields = signal<Record<string, string[]> | null>(null);
  protected readonly busy = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.proveedor?.nombre ?? '', Validators.required],
    tipoIdentificacion: [this.proveedor?.tipoIdentificacion ?? 'CC', Validators.required],
    identificacion: [this.proveedor?.identificacion ?? '', Validators.required],
  });

  protected guardar() {
    this.error.set(null);
    this.fields.set(null);

    const v = this.form.getRawValue();
    const payload = {
      nombre: v.nombre.trim(),
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion: v.identificacion.trim(),
    };

    const request = this.proveedor
      ? this.proveedoresApi.actualizar(this.proveedor.id, payload)
      : this.proveedoresApi.crear(payload);

    this.busy.set(true);
    request.subscribe({
      next: (proveedor) => {
        this.busy.set(false);
        this.dialogRef.close(proveedor);
      },
      error: (err) => {
        this.busy.set(false);
        const parsed = parseApiError(err);
        this.error.set(parsed.message);
        this.fields.set(parsed.fields ?? null);
      },
    });
  }

  protected fieldErrorsList(fields: Record<string, string[]>) {
    return Object.entries(fields).map(([field, messages]) => ({ field, messages }));
  }
}
