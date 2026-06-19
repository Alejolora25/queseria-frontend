
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp } from '../../../../core/api/models';
import { environment } from '../../../../../environments/environment';
import { ProveedorFormDialogComponent } from '../../components/proveedor-form-dialog/proveedor-form-dialog';

type UiState = 'idle' | 'loading' | 'saving';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule
],
  template: `
    <div class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button class="w-full sm:w-auto" mat-stroked-button (click)="nuevo()" [disabled]="busy()">Nuevo proveedor</button>
        <button class="w-full sm:w-auto" mat-raised-button color="primary" (click)="buscar(0)" [disabled]="busy()">
            <span class="inline-flex items-center gap-2">
              @if (state() === 'loading') {
                <mat-progress-spinner diameter="18" mode="indeterminate" />
              }
              Consultar
            </span>
          </button>
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
    
          <div class="flex flex-col gap-2 sm:flex-row">
            <button class="w-full sm:w-auto" mat-stroked-button (click)="limpiar()" [disabled]="busy()">Limpiar</button>
            <button class="w-full sm:w-auto" mat-stroked-button (click)="buscar(0)" [disabled]="busy()">Aplicar</button>
          </div>
    
          @if (error()) {
            <div class="app-alert app-alert-error">
              <div class="font-medium">No se pudo cargar</div>
              <div>{{ error() }}</div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    
      @if (success()) {
        <div class="app-alert app-alert-success">
          {{ success() }}
        </div>
      }
    
      <!-- Lista móvil -->
      <div class="providers-mobile-list space-y-3">
        @for (r of items(); track r.id) {
          <mat-card class="app-card">
            <mat-card-content class="app-card-content space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-base font-semibold text-slate-950">{{ r.nombre }}</div>
                  <div class="mt-1 text-sm text-slate-500">
                    {{ r.tipoIdentificacion }} {{ r.identificacion }}
                  </div>
                </div>
                <span
                  class="app-badge shrink-0"
                  [class.app-badge-success]="r.activo"
                  [class.app-badge-neutral]="!r.activo"
                >
                  {{ r.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <div class="flex flex-col gap-2 pt-1">
                <button mat-stroked-button (click)="editar(r)" [disabled]="busy()">Editar</button>
                @if (!r.activo) {
                  <button
                    mat-stroked-button
                    color="primary"
                    (click)="activar(r)"
                    [disabled]="busy()"
                  >
                    Activar
                  </button>
                }
                @if (r.activo) {
                  <button
                    mat-stroked-button
                    color="warn"
                    (click)="desactivar(r)"
                    [disabled]="busy()"
                  >
                    Desactivar
                  </button>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <mat-card class="app-card">
          <mat-card-content class="p-0">
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

      <!-- Tabla desktop -->
      <mat-card class="app-card providers-desktop-table">
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
                    @if (!r.activo) {
                      <button
                        mat-stroked-button
                        color="primary"
                        (click)="activar(r)"
                        [disabled]="busy()"
                        >
                        Activar
                      </button>
                    }
                    @if (r.activo) {
                      <button
                        mat-stroked-button
                        color="warn"
                        (click)="desactivar(r)"
                        [disabled]="busy()"
                        >
                        Desactivar
                      </button>
                    }
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
  private dialog = inject(MatDialog);

  readonly state = signal<UiState>('idle');
  readonly busy = computed(() => this.state() !== 'idle');

  readonly items = signal<ProveedorResp[]>([]);
  readonly total = signal(0);

  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    q: [''],
    // null => no filtra
    activo: [null as boolean | null],
    limit: [environment.defaultPageSize],
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
    this.abrirFormulario();
  }

  editar(proveedor: ProveedorResp) {
    this.abrirFormulario(proveedor);
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

  private cambiarEstado(proveedor: ProveedorResp, activo: boolean) {
    this.error.set(null);
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

  private abrirFormulario(proveedor: ProveedorResp | null = null) {
    this.error.set(null);
    this.success.set(null);

    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      data: { proveedor },
      width: 'min(92vw, 560px)',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((guardado?: ProveedorResp) => {
      if (!guardado) return;

      this.success.set(
        proveedor
          ? `Proveedor ${guardado.nombre} actualizado.`
          : `Proveedor ${guardado.nombre} creado.`
      );
      this.buscar(this.offset());
    });
  }
}
