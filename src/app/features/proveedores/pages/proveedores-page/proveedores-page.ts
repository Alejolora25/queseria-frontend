import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

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

type UiState = 'idle' | 'loading';

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
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h2 class="text-xl font-semibold">Proveedores</h2>

        <button mat-raised-button color="primary" (click)="buscar(0)" [disabled]="busy()">
          <span class="inline-flex items-center gap-2">
            <mat-progress-spinner *ngIf="state() === 'loading'" diameter="18" mode="indeterminate" />
            Consultar
          </span>
        </button>
      </div>

      <!-- Filtros -->
      <mat-card class="rounded-2xl">
        <mat-card-content class="p-4 space-y-3">
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

          <div *ngIf="error()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div class="font-medium text-red-700">No se pudo cargar</div>
            <div class="text-red-700">{{ error() }}</div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla -->
      <mat-card class="rounded-2xl">
        <mat-card-content class="p-0">
          <div class="overflow-auto rounded-2xl border bg-white">
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
                    class="text-xs rounded-full px-2 py-1 border bg-white"
                    [class.border-emerald-200]="r.activo"
                    [class.text-emerald-700]="r.activo"
                    [class.bg-emerald-50]="r.activo"
                    [class.border-slate-200]="!r.activo"
                    [class.text-slate-700]="!r.activo"
                  >
                    {{ r.activo ? 'Activo' : 'Inactivo' }}
                  </span>
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

  readonly form = this.fb.nonNullable.group({
    q: [''],
    // null => no filtra
    activo: [null as boolean | null],
    limit: [environment.defaultPageSize],
  });

  readonly displayedColumns = ['id', 'nombre', 'identificacion', 'activo'];

  constructor() {
    // carga inicial
    this.buscar(0);
  }

  limpiar() {
    this.form.reset({ q: '', activo: null, limit: environment.defaultPageSize });
    this.buscar(0);
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