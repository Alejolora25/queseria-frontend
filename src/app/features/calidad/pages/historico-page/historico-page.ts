import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

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
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { parseApiError } from '../../../../core/api/api-error';
import { MuestraResp, ProveedorResp } from '../../../../core/api/models';
import { environment } from '../../../../../environments/environment';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AnaliticasApi } from '../../../../core/api/analiticas.api';
import { AnaliticaDialogComponent } from '../../components/analitica-dialog/analitica-dialog';

type UiState = 'idle' | 'searchingProveedor' | 'loadingHistorico';

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
    MatDialogModule,
  ],
  template: `
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Histórico</h2>

      <!-- Buscar proveedor -->
      <mat-card class="rounded-2xl">
        <mat-card-content class="p-4 space-y-3">
          <div class="flex items-start gap-4 flex-wrap">
            <mat-form-field class="w-full sm:w-56" appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select [formControl]="buscarForm.controls.tipoIdentificacion">
                <mat-option value="CC">CC</mat-option>
                <mat-option value="NIT">NIT</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="flex-1 min-w-[240px]" appearance="outline">
              <mat-label>Identificación</mat-label>
              <input matInput [formControl]="buscarForm.controls.identificacion" placeholder="Ej: NIT-123" />
              <mat-error *ngIf="buscarForm.controls.identificacion.invalid">Requerido</mat-error>
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="mt-1"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner
                  *ngIf="state() === 'searchingProveedor'"
                  diameter="18"
                  mode="indeterminate"
                />
                Buscar
              </span>
            </button>

            <button mat-stroked-button class="mt-1" (click)="reset()" [disabled]="busy()">
              Limpiar
            </button>
          </div>

          <div *ngIf="bannerError()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div class="font-medium text-red-700">Error</div>
            <div class="text-red-700">{{ bannerError() }}</div>
          </div>

          <div *ngIf="proveedor()" class="pt-2">
            <mat-divider />
            <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm text-slate-600">Proveedor</div>
                <div class="font-semibold">
                  {{ proveedor()!.nombre }} — {{ proveedor()!.tipoIdentificacion }} {{ proveedor()!.identificacion }}
                </div>
              </div>
              <span class="text-xs rounded-full px-2 py-1 border bg-white">
                ID: {{ proveedor()!.id }}
              </span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Filtros histórico -->
      <mat-card *ngIf="proveedor()" class="rounded-2xl">
        <mat-card-content class="p-4 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="font-semibold">Filtros</div>

            <button
              mat-raised-button
              color="primary"
              (click)="cargarHistorico(0)"
              [disabled]="busy() || filtrosForm.invalid"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner
                  *ngIf="state() === 'loadingHistorico'"
                  diameter="18"
                  mode="indeterminate"
                />
                Consultar
              </span>
            </button>
          </div>

          <form class="grid grid-cols-1 md:grid-cols-3 gap-3" [formGroup]="filtrosForm">
            <mat-form-field appearance="outline">
              <mat-label>Desde (ISO)</mat-label>
              <input matInput [formControl]="filtrosForm.controls.desde" />
              <mat-error *ngIf="filtrosForm.controls.desde.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasta (ISO)</mat-label>
              <input matInput [formControl]="filtrosForm.controls.hasta" />
              <mat-error *ngIf="filtrosForm.controls.hasta.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tamaño de página</mat-label>
              <mat-select [formControl]="filtrosForm.controls.limit">
                <mat-option [value]="10">10</mat-option>
                <mat-option [value]="20">20</mat-option>
                <mat-option [value]="50">50</mat-option>
                <mat-option [value]="100">100</mat-option>
              </mat-select>
            </mat-form-field>
          </form>

          <!-- Error histórico -->
          <div *ngIf="histError()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div class="font-medium text-red-700">No se pudo cargar</div>
            <div class="text-red-700">{{ histError() }}</div>
          </div>
          <!-- Error analítica (arriba de la tabla) -->
          <div *ngIf="analiticaError()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <div class="font-medium text-red-700">Analítica</div>
              <div class="text-red-700">{{ analiticaError() }}</div>
          </div>

          <!-- Tabla -->
          <div class="overflow-auto rounded-2xl border bg-white">
            <table mat-table [dataSource]="items()" class="min-w-[900px]">

              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let r">{{ r.fechaMuestra }}</td>
              </ng-container>

              <ng-container matColumnDef="volumen">
                <th mat-header-cell *matHeaderCellDef>Vol (L)</th>
                <td mat-cell *matCellDef="let r">{{ r.volumenLitros ?? '' }}</td>
              </ng-container>

              <ng-container matColumnDef="precio">
                <th mat-header-cell *matHeaderCellDef>Precio/L</th>
                <td mat-cell *matCellDef="let r">{{ r.precioLitro ?? '' }}</td>
              </ng-container>

              <ng-container matColumnDef="grasa">
                <th mat-header-cell *matHeaderCellDef>Grasa</th>
                <td mat-cell *matCellDef="let r">{{ r.grasa }}</td>
              </ng-container>

              <ng-container matColumnDef="proteina">
                <th mat-header-cell *matHeaderCellDef>Prot</th>
                <td mat-cell *matCellDef="let r">{{ r.proteina }}</td>
              </ng-container>

              <ng-container matColumnDef="st">
                <th mat-header-cell *matHeaderCellDef>ST</th>
                <td mat-cell *matCellDef="let r">{{ r.solidosTotales }}</td>
              </ng-container>

              <ng-container matColumnDef="densidad">
                <th mat-header-cell *matHeaderCellDef>Dens</th>
                <td mat-cell *matCellDef="let r">{{ r.densidad }}</td>
              </ng-container>

              <ng-container matColumnDef="dornic">
                <th mat-header-cell *matHeaderCellDef>°D</th>
                <td mat-cell *matCellDef="let r">{{ r.acidezDornic }}</td>
              </ng-container>

              <ng-container matColumnDef="temp">
                <th mat-header-cell *matHeaderCellDef>°C</th>
                <td mat-cell *matCellDef="let r">{{ r.temperaturaC }}</td>
              </ng-container>

              <ng-container matColumnDef="obs">
                <th mat-header-cell *matHeaderCellDef>Obs</th>
                <td mat-cell *matCellDef="let r">{{ r.observaciones ?? '' }}</td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let r">
                  <button mat-stroked-button (click)="verAnalitica(r.id)" [disabled]="busy()">Ver analítica</button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
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
export class HistoricoPageComponent {
  private fb = inject(FormBuilder);
  private proveedoresApi = inject(ProveedoresApi);
  private muestrasApi = inject(MuestrasApi);

  private analiticasApi = inject(AnaliticasApi);
  private dialog = inject(MatDialog);

  readonly analiticaError = signal<string | null>(null);

  readonly state = signal<UiState>('idle');
  readonly proveedor = signal<ProveedorResp | null>(null);

  readonly bannerError = signal<string | null>(null);
  readonly histError = signal<string | null>(null);

  readonly items = signal<MuestraResp[]>([]);
  readonly total = signal(0);

  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);

  readonly busy = computed(() => this.state() !== 'idle');

  readonly buscarForm = this.fb.nonNullable.group({
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly filtrosForm = this.fb.nonNullable.group({
    desde: [this.startOfMonthIso(), Validators.required],
    hasta: [this.nowIso(), Validators.required],
    limit: [environment.defaultPageSize, Validators.required],
  });

  readonly displayedColumns = [
    'fecha',
    'volumen',
    'precio',
    'grasa',
    'proteina',
    'st',
    'densidad',
    'dornic',
    'temp',
    'obs',
    'acciones',
  ];

  reset() {
    this.state.set('idle');
    this.proveedor.set(null);
    this.bannerError.set(null);
    this.histError.set(null);
    this.analiticaError.set(null); 
    this.items.set([]);
    this.total.set(0);
    this.offset.set(0);

    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.filtrosForm.reset({
      desde: this.startOfMonthIso(),
      hasta: this.nowIso(),
      limit: environment.defaultPageSize,
    });
    this.limit.set(environment.defaultPageSize);
  }

  buscarProveedor() {
    this.analiticaError.set(null);
    this.bannerError.set(null);
    this.histError.set(null);
    this.items.set([]);
    this.total.set(0);
    this.offset.set(0);

    const ident = this.buscarForm.controls.identificacion.value.trim();
    if (!ident) return;

    this.state.set('searchingProveedor');
    this.proveedoresApi.porIdentificacion(ident).subscribe({
      next: (p) => {
        this.state.set('idle');
        this.proveedor.set(p);
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.bannerError.set(parsed.status === 404 ? 'Proveedor no existe' : parsed.message);
      },
    });
  }

  cargarHistorico(offset: number) {
    this.analiticaError.set(null);
    this.histError.set(null);

    const p = this.proveedor();
    if (!p) return;

    const desde = this.filtrosForm.controls.desde.value;
    const hasta = this.filtrosForm.controls.hasta.value;
    const limit = this.filtrosForm.controls.limit.value;

    this.limit.set(limit);
    this.offset.set(offset);

    this.state.set('loadingHistorico');
    this.muestrasApi
      .historico({
        proveedorId: p.id,
        desde,
        hasta,
        limit,
        offset,
      })
      .subscribe({
        next: (page) => {
          this.state.set('idle');
          this.items.set(page.items ?? []);
          this.total.set(page.total ?? 0);
        },
        error: (err) => {
          this.state.set('idle');
          const parsed = parseApiError(err);
          this.histError.set(parsed.message);
        },
      });
  }

  onPage(ev: PageEvent) {
    const newOffset = ev.pageIndex * ev.pageSize;

    // si cambió el pageSize, volvemos a 0
    if (ev.pageSize !== this.limit()) {
      this.filtrosForm.controls.limit.setValue(ev.pageSize);
      this.cargarHistorico(0);
      return;
    }

    this.cargarHistorico(newOffset);
  }

  verAnalitica(sampleId: number) {
    this.analiticaError.set(null);

    this.analiticasApi.porMuestra(sampleId).subscribe({
      next: (doc) => {
        // Si el backend devuelve 200 sin body, doc podría venir undefined/null según implementación.
        if (!doc) {
          this.analiticaError.set('No hay analítica registrada para esta muestra.');
          return;
        }

        this.dialog.open(AnaliticaDialogComponent, {
          data: doc,
          maxWidth: '90vw',
          width: '900px',
        });
      },
      error: (err) => {
        const parsed = parseApiError(err);
        this.analiticaError.set(parsed.status === 404 ? 'No hay analítica para esta muestra' : parsed.message);
      },
    });
  }

  private nowIso(): string {
    const now = new Date();
    return this.toOffsetIso(now);
  }

  private startOfMonthIso(): string {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return this.toOffsetIso(d);
  }

  private toOffsetIso(date: Date): string {
    const pad = (x: number) => String(x).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}-05:00`;
  }
}