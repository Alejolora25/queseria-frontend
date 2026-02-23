import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import { AnaliticaMuestraDocResp } from '../../../../core/api/models';

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule],
  template: `
    <div class="p-4 w-[92vw] max-w-3xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-lg font-semibold">Analítica de muestra</div>
          <div class="text-sm text-slate-600">
            sampleId: {{ data.sampleId }} · proveedorId: {{ data.proveedorId }}
          </div>
          <div class="text-xs text-slate-500 mt-1">
            {{ data.timestamp }}
          </div>
        </div>

        <button mat-stroked-button mat-dialog-close>Cerrar</button>
      </div>

      <mat-divider class="my-4"></mat-divider>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="rounded-2xl border bg-white p-3">
          <div class="text-xs text-slate-500">KPI calidad</div>
          <div class="text-2xl font-semibold">
            {{ pct(data.kpiCalidad) }}
          </div>
          <div class="text-xs text-slate-500">({{ n(data.kpiCalidad) }})</div>
        </div>

        <div class="rounded-2xl border bg-white p-3 md:col-span-2">
          <div class="text-xs text-slate-500">Flags</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              *ngFor="let f of (data.flags ?? [])"
              class="text-xs rounded-full border px-2 py-1 bg-slate-50"
            >
              {{ f }}
            </span>
            <span *ngIf="!data.flags?.length" class="text-sm text-slate-600">—</span>
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-2xl border bg-white p-3">
        <div class="font-semibold mb-2">Base (valores)</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div><span class="text-slate-500">Grasa:</span> {{ n(data.base?.grasa) }}</div>
          <div><span class="text-slate-500">Proteína:</span> {{ n(data.base?.proteina) }}</div>
          <div><span class="text-slate-500">Lactosa:</span> {{ n(data.base?.lactosa) }}</div>
          <div><span class="text-slate-500">ST:</span> {{ n(data.base?.solidosTotales) }}</div>
          <div><span class="text-slate-500">Densidad:</span> {{ n(data.base?.densidad) }}</div>
          <div><span class="text-slate-500">°D:</span> {{ n(data.base?.acidezDornic) }}</div>
          <div><span class="text-slate-500">°C:</span> {{ n(data.base?.temperaturaC) }}</div>
          <div><span class="text-slate-500">SNG:</span> {{ n(data.base?.sng) }}</div>
          <div><span class="text-slate-500">Agua%:</span> {{ n(data.base?.aguaPct) }}</div>
        </div>
      </div>

      <div class="mt-4 rounded-2xl border bg-white p-3">
        <div class="font-semibold mb-2">Evaluación</div>

        <ng-container *ngIf="entries().length; else noEval">
          <div class="space-y-3">
            <div *ngFor="let e of entries()" class="rounded-xl border p-3">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold">{{ e.key }}</div>
                <span class="text-xs rounded-full border px-2 py-1 bg-slate-50">{{ e.estado }}</span>
              </div>

              <ul class="mt-2 list-disc pl-5 text-sm text-slate-700" *ngIf="e.mensajes?.length">
                <li *ngFor="let m of e.mensajes">{{ m }}</li>
              </ul>

              <div class="text-sm text-slate-500 mt-2" *ngIf="!e.mensajes?.length">Sin mensajes</div>
            </div>
          </div>
        </ng-container>

        <ng-template #noEval>
          <div class="text-sm text-slate-600">Sin evaluación disponible</div>
        </ng-template>
      </div>
    </div>
  `,
})
export class AnaliticaDialogComponent {
  data = inject<AnaliticaMuestraDocResp>(MAT_DIALOG_DATA);

  entries() {
    const map = this.data?.evaluacion?.porParametro ?? {};
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
}