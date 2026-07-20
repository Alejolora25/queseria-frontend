
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

import { AnaliticaMuestraDocResp } from '../../../../core/api/models';

@Component({
  standalone: true,
  imports: [ButtonModule, DividerModule],
  template: `
    <div class="max-h-[88vh] w-[min(92vw,880px)] overflow-auto p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="app-badge app-badge-neutral mb-3">Analítica</div>
          <div class="text-xl font-semibold tracking-tight">Muestra #{{ data.sampleId }}</div>
          <div class="mt-1 text-sm text-slate-600">
            Proveedor #{{ data.proveedorId }}
          </div>
          <div class="text-xs text-slate-500 mt-1">
            {{ data.timestamp }}
          </div>
        </div>
    
        <p-button styleClass="w-full sm:w-auto" label="Cerrar" icon="pi pi-times" [outlined]="true" (onClick)="close()" />
      </div>
    
      <p-divider />
    
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="app-metric-card">
          <div class="text-xs text-slate-500">KPI calidad</div>
          <div class="text-2xl font-semibold">
            {{ pct(data.kpiCalidad) }}
          </div>
          <div class="text-xs text-slate-500">({{ n(data.kpiCalidad) }})</div>
        </div>
    
        <div class="app-metric-card md:col-span-2">
          <div class="text-xs text-slate-500">Flags</div>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (f of (data.flags ?? []); track f) {
              <span
                class="app-badge app-badge-neutral"
                >
                {{ f }}
              </span>
            }
            @if (!data.flags?.length) {
              <span class="text-sm text-slate-600">—</span>
            }
          </div>
        </div>
      </div>
    
      <div class="app-panel mt-4 p-4">
        <div class="font-semibold mb-2">Base (valores)</div>
        <div class="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-4">
          <div class="app-metric-card p-3"><span class="text-slate-500">Grasa</span><div class="font-semibold">{{ n(data.base?.grasa) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">Proteína</span><div class="font-semibold">{{ n(data.base?.proteina) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">Lactosa</span><div class="font-semibold">{{ n(data.base?.lactosa) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">ST</span><div class="font-semibold">{{ n(data.base?.solidosTotales) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">Densidad</span><div class="font-semibold">{{ n(data.base?.densidad) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">°D</span><div class="font-semibold">{{ n(data.base?.acidezDornic) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">°C</span><div class="font-semibold">{{ n(data.base?.temperaturaC) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">SNG</span><div class="font-semibold">{{ n(data.base?.sng) }}</div></div>
          <div class="app-metric-card p-3"><span class="text-slate-500">Agua%</span><div class="font-semibold">{{ n(data.base?.aguaPct) }}</div></div>
        </div>
      </div>
    
      <div class="app-panel mt-4 p-4">
        <div class="font-semibold mb-2">Evaluación</div>
    
        @if (evaluacionEntries.length) {
          <div class="space-y-3">
            @for (e of evaluacionEntries; track e.key) {
              <div class="app-metric-card">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-semibold">{{ e.key }}</div>
                  <span class="app-badge app-badge-neutral">{{ e.estado }}</span>
                </div>
                @if (e.mensajes.length) {
                  <ul class="mt-2 list-disc pl-5 text-sm text-slate-700">
                    @for (m of e.mensajes; track m) {
                      <li>{{ m }}</li>
                    }
                  </ul>
                }
                @if (!e.mensajes.length) {
                  <div class="text-sm text-slate-500 mt-2">Sin mensajes</div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="text-sm text-slate-600">Sin evaluación disponible</div>
        }
    
      </div>
    </div>
    `,
})
export class AnaliticaDialogComponent {
  private readonly config = inject(DynamicDialogConfig<AnaliticaMuestraDocResp>);
  private readonly ref = inject(DynamicDialogRef);
  data = this.config.data!;
  readonly evaluacionEntries = this.buildEvaluacionEntries();

  private buildEvaluacionEntries() {
    const map = (this.data?.evaluacion?.porParametro ?? {}) as Record<
      string,
      { estado?: string | null; mensajes?: string[] | null }
    >;
    return Object.entries(map).map(([key, v]) => ({
      key,
      estado: v?.estado ?? '—',
      mensajes: v?.mensajes ?? [],
    }));
  }

  n(v: number | null | undefined): string {
    if (v == null) return '—';
    const num = Number(v);
    if (Number.isNaN(num)) return '—';
    return num.toFixed(2);
  }

  pct(v: number | null | undefined): string {
    if (v == null) return '—';
    const num = Number(v);
    if (Number.isNaN(num)) return '—';
    return `${Math.round(num * 100)}%`;
  }

  close() { this.ref.close(); }
}
