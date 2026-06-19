import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp } from '../../../../core/api/models';
import { environment } from '../../../../../environments/environment';

type UiState = 'idle' | 'loading' | 'saving';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,

    MatTableModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-end gap-2 flex-wrap">
        <div class="flex gap-2">
          <button mat-stroked-button (click)="nuevo()" [disabled]="busy()">Nuevo proveedor</button>
          <button mat-raised-button color="primary" (click)="buscar(0)" [disabled]="busy()">
            <span class="inline-flex items-center gap-2">
              <mat-progress-spinner *ngIf="state() === 'loading'" diameter="18" mode="indeterminate" />
              Consultar
            </span>
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <mat-card class="app-card">
        <mat-card-content class="app-card-content space-y-3">
          <form class="grid grid-cols-1 md:grid-cols-3 gap-3" [formGroup]="form">
            <mat-form-field appearance="outline">
              <mat-label>Búsqueda</mat-label>
              <input matInput placeholder="Nombre / identificación..." [formControl]="form.controls.q" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Activo</mat-label>
              <mat-select [formControl]="form.controls.activo">
                <mat-option [value]="null">Todos</mat-option>
                <mat-option [value]="true">Activos</mat-option>
                <mat-option [value]="false">Inactivos</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tamaño de página</mat-label>
              <mat-select [formControl]="form.controls.limit">
                <mat-option [value]="10">10</mat-option>
                <mat-option [value]="20">20</mat-option>
                <mat-option [value]="50">50</mat-option>
                <mat-option [value]="100">100</mat-option>
              </mat-select>
            </mat-form-field>
          </form>

          <div class="flex gap-2">
            <button mat-stroked-button (click)="limpiar()" [disabled]="busy()">Limpiar</button>
            <button mat-stroked-button (click)="buscar(0)" [disabled]="busy()">Aplicar</button>
          </div>

          <div *ngIf="error()" class="app-alert app-alert-error">
            <div class="font-medium">No se pudo cargar</div>
            <div>{{ error() }}</div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Crear / editar -->
      <mat-card *ngIf="formVisible()" class="app-card">
        <mat-card-content class="app-card-content space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="font-semibold">
              {{ proveedorEditando() ? 'Editar proveedor' : 'Crear proveedor' }}
            </div>
            <button mat-stroked-button (click)="cancelarFormulario()" [disabled]="busy()">Cancelar</button>
          </div>

          <form class="grid grid-cols-1 md:grid-cols-3 gap-3" [formGroup]="proveedorForm">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput [formControl]="proveedorForm.controls.nombre" />
              <mat-error *ngIf="proveedorForm.controls.nombre.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select [formControl]="proveedorForm.controls.tipoIdentificacion">
                <mat-option value="CC">CC</mat-option>
                <mat-option value="NIT">NIT</mat-option>
                <mat-option value="CE">CE</mat-option>
              </mat-select>
              <mat-error *ngIf="proveedorForm.controls.tipoIdentificacion.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Identificación</mat-label>
              <input matInput [formControl]="proveedorForm.controls.identificacion" />
              <mat-error *ngIf="proveedorForm.controls.identificacion.invalid">Requerido</mat-error>
            </mat-form-field>
          </form>

          <div *ngIf="formError()" class="app-alert app-alert-error">
            <div class="font-medium">No se pudo guardar</div>
            <div>{{ formError() }}</div>

            <div *ngIf="formFields()" class="mt-2 text-xs text-slate-700">
              <div class="font-medium">Detalles:</div>
              <ul class="list-disc pl-5">
                <li *ngFor="let item of fieldErrorsList(formFields()!)">
                  <span class="font-medium">{{ item.field }}:</span> {{ item.messages.join(', ') }}
                </li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              mat-raised-button
              color="primary"
              (click)="guardarProveedor()"
              [disabled]="proveedorForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner *ngIf="state() === 'saving'" diameter="18" mode="indeterminate" />
                Guardar
              </span>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <div *ngIf="success()" class="app-alert app-alert-success">
        {{ success() }}
      </div>

      <!-- Tabla -->
      <mat-card class="app-card">
        <mat-card-content class="p-0">
          <div class="app-table-frame overflow-auto">
            <table mat-table [dataSource]="items()" class="min-w-[900px]">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let r">{{ r.id }}</td>
              </ng-container>

              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let r" class="font-medium">{{ r.nombre }}</td>
              </ng-container>

              <ng-container matColumnDef="identificacion">
                <th mat-header-cell *matHeaderCellDef>Identificación</th>
                <td mat-cell *matCellDef="let r">{{ r.tipoIdentificacion }} {{ r.identificacion }}</td>
              </ng-container>

              <ng-container matColumnDef="activo">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let r">
                  <span
                    class="app-badge"
                    [class.app-badge-success]="r.activo"
                    [class.app-badge-neutral]="!r.activo"
                  >
                    {{ r.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let r">
                  <div class="flex flex-wrap gap-2">
                    <button mat-stroked-button (click)="editar(r)" [disabled]="busy()">Editar</button>
                    <button
                      mat-stroked-button
                      color="primary"
                      *ngIf="!r.activo"
                      (click)="activar(r)"
                      [disabled]="busy()"
                    >
                      Activar
                    </button>
                    <button
                      mat-stroked-button
                      color="warn"
                      *ngIf="r.activo"
                      (click)="desactivar(r)"
                      [disabled]="busy()"
                    >
                      Desactivar
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div class="p-3 flex items-center justify-between text-sm text-slate-600">
            <div>Total: <span class="font-medium text-slate-900">{{ total() }}</span></div>
            <div>
              Mostrando
              <span class="font-medium text-slate-900">{{ items().length }}</span>
              de
              <span class="font-medium text-slate-900">{{ total() }}</span>
            </div>
          </div>

          <mat-paginator
            [length]="total()"
            [pageSize]="limit()"
            [pageSizeOptions]="[10,20,50,100]"
            (page)="onPage($event)"
          ></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ProveedoresPageComponent {
  private fb = inject(FormBuilder);
  private proveedoresApi = inject(ProveedoresApi);

  readonly state = signal<UiState>('idle');
  readonly busy = computed(() => this.state() !== 'idle');

  readonly items = signal<ProveedorResp[]>([]);
  readonly total = signal(0);

  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);

  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formFields = signal<Record<string, string[]> | null>(null);
  readonly success = signal<string | null>(null);
  readonly formVisible = signal(false);
  readonly proveedorEditando = signal<ProveedorResp | null>(null);

  readonly form = this.fb.nonNullable.group({
    q: [''],
    // null => no filtra
    activo: [null as boolean | null],
    limit: [environment.defaultPageSize],
  });

  readonly proveedorForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly displayedColumns = ['id', 'nombre', 'identificacion', 'activo', 'acciones'];

  constructor() {
    // carga inicial
    this.buscar(0);
  }

  limpiar() {
    this.form.reset({ q: '', activo: null, limit: environment.defaultPageSize });
    this.buscar(0);
  }

  nuevo() {
    this.formError.set(null);
    this.formFields.set(null);
    this.success.set(null);
    this.proveedorEditando.set(null);
    this.proveedorForm.reset({ nombre: '', tipoIdentificacion: 'CC', identificacion: '' });
    this.formVisible.set(true);
  }

  editar(proveedor: ProveedorResp) {
    this.formError.set(null);
    this.formFields.set(null);
    this.success.set(null);
    this.proveedorEditando.set(proveedor);
    this.proveedorForm.reset({
      nombre: proveedor.nombre,
      tipoIdentificacion: proveedor.tipoIdentificacion,
      identificacion: proveedor.identificacion,
    });
    this.formVisible.set(true);
  }

  cancelarFormulario() {
    this.formVisible.set(false);
    this.proveedorEditando.set(null);
    this.formError.set(null);
    this.formFields.set(null);
  }

  guardarProveedor() {
    this.formError.set(null);
    this.formFields.set(null);
    this.success.set(null);

    const v = this.proveedorForm.getRawValue();
    const payload = {
      nombre: v.nombre.trim(),
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion: v.identificacion.trim(),
    };

    const actual = this.proveedorEditando();
    const request = actual
      ? this.proveedoresApi.actualizar(actual.id, payload)
      : this.proveedoresApi.crear(payload);

    this.state.set('saving');
    request.subscribe({
      next: (proveedor) => {
        this.state.set('idle');
        this.formVisible.set(false);
        this.proveedorEditando.set(null);
        this.success.set(
          actual
            ? `Proveedor ${proveedor.nombre} actualizado.`
            : `Proveedor ${proveedor.nombre} creado.`
        );
        this.buscar(this.offset());
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.formError.set(parsed.message);
        this.formFields.set(parsed.fields ?? null);
      },
    });
  }

  activar(proveedor: ProveedorResp) {
    this.cambiarEstado(proveedor, true);
  }

  desactivar(proveedor: ProveedorResp) {
    this.cambiarEstado(proveedor, false);
  }

  buscar(offset: number) {
    this.error.set(null);

    const q = this.form.controls.q.value ?? '';
    const activo = this.form.controls.activo.value;
    const limit = this.form.controls.limit.value ?? environment.defaultPageSize;

    this.limit.set(limit);
    this.offset.set(offset);

    this.state.set('loading');
    this.proveedoresApi
      .listar({ q, activo, limit, offset })
      .subscribe({
        next: (page) => {
          this.state.set('idle');
          this.items.set(page.items ?? []);
          this.total.set(page.total ?? 0);
        },
        error: (err) => {
          this.state.set('idle');
          const parsed = parseApiError(err);
          this.error.set(parsed.message);
        },
      });
  }

  fieldErrorsList(fields: Record<string, string[]>) {
    return Object.entries(fields).map(([field, messages]) => ({ field, messages }));
  }

  private cambiarEstado(proveedor: ProveedorResp, activo: boolean) {
    this.error.set(null);
    this.formError.set(null);
    this.success.set(null);

    const request = activo
      ? this.proveedoresApi.activar(proveedor.id)
      : this.proveedoresApi.desactivar(proveedor.id);

    this.state.set('saving');
    request.subscribe({
      next: (actualizado) => {
        this.state.set('idle');
        this.success.set(
          activo
            ? `Proveedor ${actualizado.nombre} activado.`
            : `Proveedor ${actualizado.nombre} desactivado.`
        );
        this.buscar(this.offset());
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.error.set(parsed.message);
      },
    });
  }

  onPage(ev: PageEvent) {
    const newOffset = ev.pageIndex * ev.pageSize;

    if (ev.pageSize !== this.limit()) {
      this.form.controls.limit.setValue(ev.pageSize);
      this.buscar(0);
      return;
    }

    this.buscar(newOffset);
  }
}
