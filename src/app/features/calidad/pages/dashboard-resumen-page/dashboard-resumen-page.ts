import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';


import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { AnaliticasApi } from '../../../../core/api/analiticas.api';
import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp, ResumenProveedorResp } from '../../../../core/api/models';

type UiState = 'idle' | 'searchingProveedor' | 'loadingResumen';
type EstadoCalidad = 'ACEPTABLE' | 'ALERTA' | 'RECHAZAR';

interface EstadoResumenView {
  key: EstadoCalidad;
  label: string;
  badgeClass: string;
  dotClass: string;
  barClass: string;
  count: number;
  percent: number;
}

interface PromedioResumenView {
  label: string;
  value: number | null | undefined;
  formatted: string;
  percent: number;
  barClass: string;
  hint: string;
}

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
  ],
  template: `
    <div class="space-y-5">
      <div class="app-card">
        <div class="app-card-content-lg space-y-4">
          <div>
            <h2 class="text-lg font-bold">Proveedor</h2>
            <p class="mt-1 text-sm text-slate-600">
              Busca un proveedor para consultar sus indicadores de calidad en el rango seleccionado.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(320px,1fr)_auto_auto] lg:items-start">
            <div class="app-field">
              <label class="text-sm font-semibold">Tipo</label>
              <p-select [options]="['CC', 'NIT']" [formControl]="buscarForm.controls.tipoIdentificacion" />
            </div>

            <div class="app-field">
              <label class="text-sm font-semibold">Identificación</label>
              <input
                pInputText
                [formControl]="buscarForm.controls.identificacion"
                placeholder="Ej: 900123456"
              />
            </div>

            <button
              pButton

              class="w-full lg:w-auto lg:self-end"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                @if (state() === 'searchingProveedor') {
                  <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                }
                Buscar
              </span>
            </button>

            <button pButton class="w-full lg:w-auto lg:self-end" (click)="reset()" [disabled]="busy()">
              Limpiar
            </button>
          </div>

          @if (bannerError()) {
            <div class="app-alert app-alert-error">
              <div class="font-medium">Error</div>
              <div>{{ bannerError() }}</div>
            </div>
          }

          @if (proveedor()) {
            <div class="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Proveedor seleccionado</div>
                  <div class="mt-1 text-lg font-bold text-slate-950">{{ proveedor()!.nombre }}</div>
                  <div class="mt-1 text-sm text-slate-600">
                    {{ proveedor()!.tipoIdentificacion }} {{ proveedor()!.identificacion }}
                  </div>
                </div>
                <span class="app-badge app-badge-neutral self-start sm:self-center">ID: {{ proveedor()!.id }}</span>
              </div>
            </div>
          }
        </div>
      </div>

      @if (proveedor()) {
        <div class="app-card">
          <div class="app-card-content-lg space-y-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-lg font-bold">Rango de análisis</h2>
                <p class="mt-1 text-sm text-slate-600">
                  Ajusta el periodo para ver promedios y distribución de estados.
                </p>
              </div>

              <button
                pButton

                class="w-full lg:w-auto"
                (click)="cargarResumen()"
                [disabled]="busy() || filtrosForm.invalid"
              >
                <span class="inline-flex items-center gap-2">
                  @if (state() === 'loadingResumen') {
                    <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                  }
                  Consultar resumen
                </span>
              </button>
            </div>

            <form class="grid grid-cols-1 gap-3 md:grid-cols-2" [formGroup]="filtrosForm">
              <div class="app-field">
                <label class="text-sm font-semibold">Desde (Instant ISO - Z)</label>
                <input pInputText [formControl]="filtrosForm.controls.desde" />
              </div>
              <div class="app-field">
                <label class="text-sm font-semibold">Hasta (Instant ISO - Z)</label>
                <input pInputText [formControl]="filtrosForm.controls.hasta" />
              </div>
            </form>

            @if (resumenError()) {
              <div class="app-alert app-alert-error">
                <div class="font-medium">No se pudo cargar</div>
                <div>{{ resumenError() }}</div>
              </div>
            }
          </div>
        </div>
      }

      @if (resumen()) {
        <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <article class="app-card dashboard-kpi-card p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">KPI promedio</div>
                <div class="mt-3 text-5xl font-black leading-none text-slate-950">
                  {{ pct(resumen()!.promedios.kpi) }}
                </div>
                <p class="mt-2 text-sm text-slate-600">1.00 equivale a 100% de cumplimiento.</p>
              </div>
              <span class="app-badge" [class]="kpiBadgeClass()">{{ kpiLabel() }}</span>
            </div>

            <div class="mt-6 dashboard-kpi-progress" role="img" aria-label="KPI promedio">
              <div class="dashboard-kpi-progress-fill" [style.width.%]="kpiPercent()"></div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-2xl border border-white/70 bg-white/70 p-3">
                <div class="text-xs text-slate-500">KPI decimal</div>
                <div class="mt-1 font-bold">{{ n(resumen()!.promedios.kpi) }}</div>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/70 p-3">
                <div class="text-xs text-slate-500">Muestras</div>
                <div class="mt-1 font-bold">{{ resumen()!.distribucionEstados.totalEstados }}</div>
              </div>
            </div>
          </article>

          <article class="app-card p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 class="text-lg font-bold">Distribución de estados</h2>
                <p class="mt-1 text-sm text-slate-600">
                  Resumen de muestras aceptables, en alerta y rechazadas.
                </p>
              </div>
              <span class="app-badge app-badge-neutral self-start lg:self-center">
                Total: {{ resumen()!.distribucionEstados.totalEstados }}
              </span>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
              <div class="dashboard-donut mx-auto" [style.background]="donutBackground()">
                <div class="dashboard-donut-inner">
                  <div class="text-3xl font-black">{{ resumen()!.distribucionEstados.totalEstados }}</div>
                  <div class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">muestras</div>
                </div>
              </div>

              <div class="space-y-3">
                @for (estado of estadoCards(); track estado.key) {
                  <div class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <span class="h-3 w-3 rounded-full" [class]="estado.dotClass"></span>
                        <div>
                          <div class="font-bold">{{ estado.label }}</div>
                          <div class="text-sm text-slate-600">{{ estado.count }} registros</div>
                        </div>
                      </div>
                      <span class="app-badge" [class]="estado.badgeClass">{{ estado.percent }}%</span>
                    </div>
                    <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div class="h-full rounded-full" [class]="estado.barClass" [style.width.%]="estado.percent"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </article>
        </section>

        <section class="app-card p-5">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-bold">Promedios de composición</h2>
              <p class="mt-1 text-sm text-slate-600">
                Lectura rápida de grasa, proteína, sólidos totales y sólidos no grasos.
              </p>
            </div>
            <span class="app-badge app-badge-neutral self-start sm:self-auto">Valores promedio</span>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            @for (metric of promedioCards(); track metric.label) {
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-bold text-slate-950">{{ metric.label }}</div>
                    <div class="mt-1 text-xs text-slate-500">{{ metric.hint }}</div>
                  </div>
                  <div class="text-2xl font-black text-slate-950">{{ metric.formatted }}</div>
                </div>
                <div class="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full" [class]="metric.barClass" [style.width.%]="metric.percent"></div>
                </div>
              </div>
            }
          </div>
        </section>
      }
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
    // Instant (Z). Para que sea facil: default "mes actual".
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
        if (!p || (p as any).id == null) {
          this.bannerError.set('Proveedor no existe (respuesta vacia del backend)');
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
    if (v == null) return '-';
    const num = typeof v === 'number' ? v : Number(v);
    if (Number.isNaN(num)) return '-';
    return num.toFixed(2);
  }

  pct(v: number | null | undefined): string {
    if (v == null) return '-';
    const num = Number(v);
    if (Number.isNaN(num)) return '-';
    return `${Math.round(num * 100)}%`;
  }

  pctPart(kind: EstadoCalidad): number {
    const d = this.resumen()?.distribucionEstados;
    if (!d || !d.totalEstados) return 0;
    const val = d[kind] ?? 0;
    return Math.round((val / d.totalEstados) * 100);
  }

  kpiPercent(): number {
    const kpi = this.resumen()?.promedios.kpi;
    if (kpi == null || Number.isNaN(Number(kpi))) return 0;
    return this.clamp(Math.round(Number(kpi) * 100), 0, 100);
  }

  kpiLabel(): string {
    const kpi = this.kpiPercent();
    if (kpi >= 80) return 'Favorable';
    if (kpi >= 50) return 'Atencion';
    return 'Critico';
  }

  kpiBadgeClass(): string {
    const kpi = this.kpiPercent();
    if (kpi >= 80) return 'app-badge-success';
    if (kpi >= 50) return 'app-badge-warning';
    return 'app-badge-danger';
  }

  estadoCards(): EstadoResumenView[] {
    const d = this.resumen()?.distribucionEstados;
    return [
      {
        key: 'ACEPTABLE',
        label: 'Aceptable',
        badgeClass: 'app-badge-success',
        dotClass: 'bg-emerald-500',
        barClass: 'bg-emerald-500',
        count: d?.ACEPTABLE ?? 0,
        percent: this.pctPart('ACEPTABLE'),
      },
      {
        key: 'ALERTA',
        label: 'Alerta',
        badgeClass: 'app-badge-warning',
        dotClass: 'bg-amber-500',
        barClass: 'bg-amber-500',
        count: d?.ALERTA ?? 0,
        percent: this.pctPart('ALERTA'),
      },
      {
        key: 'RECHAZAR',
        label: 'Rechazar',
        badgeClass: 'app-badge-danger',
        dotClass: 'bg-red-500',
        barClass: 'bg-red-500',
        count: d?.RECHAZAR ?? 0,
        percent: this.pctPart('RECHAZAR'),
      },
    ];
  }

  promedioCards(): PromedioResumenView[] {
    const p = this.resumen()?.promedios;
    return [
      {
        label: 'Grasa',
        value: p?.grasa,
        formatted: this.n(p?.grasa),
        percent: this.scaleMetric(p?.grasa, 5),
        barClass: 'bg-sky-600',
        hint: 'Referencia visual sobre 5.00',
      },
      {
        label: 'Proteina',
        value: p?.proteina,
        formatted: this.n(p?.proteina),
        percent: this.scaleMetric(p?.proteina, 4),
        barClass: 'bg-indigo-500',
        hint: 'Referencia visual sobre 4.00',
      },
      {
        label: 'Solidos totales',
        value: p?.solidosTotales,
        formatted: this.n(p?.solidosTotales),
        percent: this.scaleMetric(p?.solidosTotales, 14),
        barClass: 'bg-emerald-500',
        hint: 'Referencia visual sobre 14.00',
      },
      {
        label: 'SNG',
        value: p?.sng,
        formatted: this.n(p?.sng),
        percent: this.scaleMetric(p?.sng, 10),
        barClass: 'bg-cyan-500',
        hint: 'Referencia visual sobre 10.00',
      },
    ];
  }

  donutBackground(): string {
    const aceptable = this.pctPart('ACEPTABLE');
    const alerta = this.pctPart('ALERTA');
    const aceptableEnd = aceptable;
    const alertaEnd = aceptable + alerta;

    if (!this.resumen()?.distribucionEstados.totalEstados) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    return `conic-gradient(
      #10b981 0% ${aceptableEnd}%,
      #f59e0b ${aceptableEnd}% ${alertaEnd}%,
      #ef4444 ${alertaEnd}% 100%
    )`;
  }

  private scaleMetric(value: number | null | undefined, max: number): number {
    if (value == null || Number.isNaN(Number(value)) || max <= 0) return 0;
    return this.clamp(Math.round((Number(value) / max) * 100), 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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
