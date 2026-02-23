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

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { AnaliticasApi } from '../../../../core/api/analiticas.api';
import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp, ResumenProveedorResp } from '../../../../core/api/models';

type UiState = 'idle' | 'searchingProveedor' | 'loadingResumen';

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
  ],
  template: `
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Resumen</h2>

      <!-- Proveedor -->
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
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="mt-1"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner *ngIf="state() === 'searchingProveedor'" diameter="18" mode="indeterminate" />
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
              <span class="text-xs rounded-full px-2 py-1 border bg-white">ID: {{ proveedor()!.id }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Filtros -->
      <mat-card *ngIf="proveedor()" class="rounded-2xl">
        <mat-card-content class="p-4 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="font-semibold">Rango</div>

            <button
              mat-raised-button
              color="primary"
              (click)="cargarResumen()"
              [disabled]="busy() || filtrosForm.invalid"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner *ngIf="state() === 'loadingResumen'" diameter="18" mode="indeterminate" />
                Consultar
              </span>
            </button>
          </div>

          <form class="grid grid-cols-1 md:grid-cols-2 gap-3" [formGroup]="filtrosForm">
            <mat-form-field appearance="outline">
              <mat-label>Desde (Instant ISO - Z)</mat-label>
              <input matInput [formControl]="filtrosForm.controls.desde" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasta (Instant ISO - Z)</mat-label>
              <input matInput [formControl]="filtrosForm.controls.hasta" />
            </mat-form-field>
          </form>

          <div *ngIf="resumenError()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div class="font-medium text-red-700">No se pudo cargar</div>
            <div class="text-red-700">{{ resumenError() }}</div>
          </div>

          <!-- Resumen -->
          <div *ngIf="resumen()" class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-2xl border bg-white p-4">
              <div class="text-sm text-slate-600">KPI promedio</div>
              <div class="text-3xl font-semibold mt-1">{{ pct(resumen()!.promedios.kpi) }}</div>
              <div class="text-xs text-slate-500 mt-1">1.00 = 100%</div>
            </div>

            <div class="rounded-2xl border bg-white p-4 md:col-span-2">
              <div class="text-sm text-slate-600">Promedios</div>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">Grasa</div>
                  <div class="font-semibold">{{ n(resumen()!.promedios.grasa) }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">Proteína</div>
                  <div class="font-semibold">{{ n(resumen()!.promedios.proteina) }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">ST</div>
                  <div class="font-semibold">{{ n(resumen()!.promedios.solidosTotales) }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">SNG</div>
                  <div class="font-semibold">{{ n(resumen()!.promedios.sng) }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">KPI</div>
                  <div class="font-semibold">{{ n(resumen()!.promedios.kpi) }}</div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border bg-white p-4 md:col-span-3">
              <div class="text-sm text-slate-600">Distribución de estados</div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3">
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">ACEPTABLE</div>
                  <div class="font-semibold">{{ resumen()!.distribucionEstados.ACEPTABLE }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">ALERTA</div>
                  <div class="font-semibold">{{ resumen()!.distribucionEstados.ALERTA }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">RECHAZAR</div>
                  <div class="font-semibold">{{ resumen()!.distribucionEstados.RECHAZAR }}</div>
                </div>
                <div class="rounded-xl border p-3">
                  <div class="text-xs text-slate-500">TOTAL</div>
                  <div class="font-semibold">{{ resumen()!.distribucionEstados.totalEstados }}</div>
                </div>
              </div>

              <!-- barra simple -->
              <div class="mt-4 h-3 rounded-full overflow-hidden border bg-slate-50">
                <div class="h-full flex">
                  <div class="h-full bg-emerald-500/70" [style.width.%]="pctPart('ACEPTABLE')"></div>
                  <div class="h-full bg-amber-500/70" [style.width.%]="pctPart('ALERTA')"></div>
                  <div class="h-full bg-red-500/70" [style.width.%]="pctPart('RECHAZAR')"></div>
                </div>
              </div>
              <div class="text-xs text-slate-500 mt-2">
                (Verde=ACEPTABLE, Amarillo=ALERTA, Rojo=RECHAZAR)
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class DashboardResumenPageComponent {
  private fb = inject(FormBuilder);
  private proveedoresApi = inject(ProveedoresApi);
  private analiticasApi = inject(AnaliticasApi);

  readonly state = signal<UiState>('idle');

  readonly proveedor = signal<ProveedorResp | null>(null);
  readonly resumen = signal<ResumenProveedorResp | null>(null);

  readonly bannerError = signal<string | null>(null);
  readonly resumenError = signal<string | null>(null);

  readonly busy = computed(() => this.state() !== 'idle');

  readonly buscarForm = this.fb.nonNullable.group({
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly filtrosForm = this.fb.nonNullable.group({
    // Instant (Z). Para que sea fácil: default “mes actual”
    desde: [this.startOfMonthZ(), Validators.required],
    hasta: [this.nowZ(), Validators.required],
  });

  reset() {
    this.state.set('idle');
    this.proveedor.set(null);
    this.resumen.set(null);
    this.bannerError.set(null);
    this.resumenError.set(null);
    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.filtrosForm.reset({ desde: this.startOfMonthZ(), hasta: this.nowZ() });
  }

  buscarProveedor() {
    this.bannerError.set(null);
    this.resumenError.set(null);
    this.resumen.set(null);

    const ident = this.buscarForm.controls.identificacion.value.trim();
    if (!ident) return;

    this.state.set('searchingProveedor');
    this.proveedoresApi.porIdentificacion(ident).subscribe({
      next: (p) => {
        this.state.set('idle');
        // si backend devuelve 200 vacío, HttpClient NO entra aquí con p=null automáticamente.
        // pero por si acaso, protegemos:
        if (!p || (p as any).id == null) {
          this.bannerError.set('Proveedor no existe (respuesta vacía del backend)');
          this.proveedor.set(null);
          return;
        }
        this.proveedor.set(p);
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.bannerError.set(parsed.message);
      },
    });
  }

  cargarResumen() {
    this.resumenError.set(null);
    this.resumen.set(null);

    const p = this.proveedor();
    if (!p) return;

    const desde = this.filtrosForm.controls.desde.value;
    const hasta = this.filtrosForm.controls.hasta.value;

    this.state.set('loadingResumen');
    this.analiticasApi.resumenProveedor({ proveedorId: p.id, desde, hasta }).subscribe({
      next: (r) => {
        this.state.set('idle');
        this.resumen.set(r);
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.resumenError.set(parsed.message);
      },
    });
  }

  n(v: number | null | undefined): string {
    if (v == null) return '—';
    const num = typeof v === 'number' ? v : Number(v);
    if (Number.isNaN(num)) return '—';
    return num.toFixed(2);
  }

  pct(v: number | null | undefined): string {
    if (v == null) return '—';
    const num = Number(v);
    if (Number.isNaN(num)) return '—';
    return `${Math.round(num * 100)}%`;
  }

  pctPart(kind: 'ACEPTABLE' | 'ALERTA' | 'RECHAZAR'): number {
    const d = this.resumen()?.distribucionEstados;
    if (!d || !d.totalEstados) return 0;
    const val = d[kind] ?? 0;
    return Math.round((val / d.totalEstados) * 100);
  }

  private nowZ(): string {
    return new Date().toISOString();
  }

  private startOfMonthZ(): string {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
}