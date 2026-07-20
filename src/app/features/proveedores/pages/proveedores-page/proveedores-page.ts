import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { parseApiError } from '../../../../core/api/api-error';
import { ProveedorResp } from '../../../../core/api/models';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';
import { ProveedorFormDialogComponent } from '../../components/proveedor-form-dialog/proveedor-form-dialog';

type UiState = 'idle' | 'loading' | 'saving';

@Component({
  standalone: true,
  providers: [DialogService],
  imports: [
    ReactiveFormsModule, ButtonModule, CardModule, DynamicDialogModule, InputTextModule,
    PaginatorModule, ProgressSpinnerModule, SelectModule, TableModule, TagModule,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        @if (puedeGestionarProveedores()) {
          <p-button styleClass="w-full sm:w-auto" label="Nuevo proveedor" icon="pi pi-plus" [outlined]="true" (onClick)="nuevo()" [disabled]="busy()" />
        }
        <p-button styleClass="w-full sm:w-auto" label="Consultar" icon="pi pi-search" (onClick)="buscar(0)" [loading]="state() === 'loading'" [disabled]="busy()" />
      </div>

      <p-card class="app-card">
        <form class="grid grid-cols-1 gap-4 md:grid-cols-3" [formGroup]="form">
          <div class="flex flex-col gap-2"><label for="q" class="font-semibold">Búsqueda</label><input id="q" pInputText placeholder="Nombre / identificación..." [formControl]="form.controls.q" /></div>
          <div class="flex flex-col gap-2"><label for="activo" class="font-semibold">Estado</label><p-select inputId="activo" [options]="estadoOptions" optionLabel="label" optionValue="value" [formControl]="form.controls.activo" /></div>
          <div class="flex flex-col gap-2"><label for="limit" class="font-semibold">Tamaño de página</label><p-select inputId="limit" [options]="pageSizeOptions" [formControl]="form.controls.limit" /></div>
        </form>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row"><p-button label="Limpiar" icon="pi pi-filter-slash" [text]="true" (onClick)="limpiar()" [disabled]="busy()" /><p-button label="Aplicar filtros" icon="pi pi-filter" [outlined]="true" (onClick)="buscar(0)" [disabled]="busy()" /></div>
        @if (error()) { <div class="app-alert app-alert-error mt-4"><div class="font-medium">No se pudo cargar</div><div>{{ error() }}</div></div> }
      </p-card>

      @if (success()) { <div class="app-alert app-alert-success">{{ success() }}</div> }

      <div class="providers-mobile-list space-y-3">
        @for (r of items(); track r.id) {
          <p-card class="app-card">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="truncate text-base font-semibold">{{ r.nombre }}</div><div class="mt-1 text-sm text-muted-color">{{ r.tipoIdentificacion }} {{ r.identificacion }}</div></div><p-tag [value]="r.activo ? 'Activo' : 'Inactivo'" [severity]="r.activo ? 'success' : 'secondary'" /></div>
            @if (puedeGestionarProveedores()) {
              <div class="mt-4 flex flex-col gap-2"><p-button label="Editar" icon="pi pi-pencil" [outlined]="true" (onClick)="editar(r)" [disabled]="busy()" />@if (r.activo) { <p-button label="Desactivar" icon="pi pi-ban" severity="danger" [outlined]="true" (onClick)="desactivar(r)" [disabled]="busy()" /> } @else { <p-button label="Activar" icon="pi pi-check" severity="success" [outlined]="true" (onClick)="activar(r)" [disabled]="busy()" /> }</div>
            }
          </p-card>
        }
        <p-paginator [first]="offset()" [rows]="limit()" [totalRecords]="total()" [rowsPerPageOptions]="pageSizeOptions" (onPageChange)="onPage($event)" />
      </div>

      <p-card class="app-card providers-desktop-table">
        <p-table [value]="items()" [loading]="state() === 'loading'" [tableStyle]="{ 'min-width': '56rem' }">
          <ng-template #header><tr><th>ID</th><th>Nombre</th><th>Identificación</th><th>Estado</th>@if (puedeGestionarProveedores()) { <th>Acciones</th> }</tr></ng-template>
          <ng-template #body let-r><tr><td>{{ r.id }}</td><td class="font-medium">{{ r.nombre }}</td><td>{{ r.tipoIdentificacion }} {{ r.identificacion }}</td><td><p-tag [value]="r.activo ? 'Activo' : 'Inactivo'" [severity]="r.activo ? 'success' : 'secondary'" /></td>@if (puedeGestionarProveedores()) { <td><div class="flex flex-wrap gap-2"><p-button icon="pi pi-pencil" label="Editar" size="small" [outlined]="true" (onClick)="editar(r)" [disabled]="busy()" />@if (r.activo) { <p-button icon="pi pi-ban" label="Desactivar" size="small" severity="danger" [text]="true" (onClick)="desactivar(r)" [disabled]="busy()" /> } @else { <p-button icon="pi pi-check" label="Activar" size="small" severity="success" [text]="true" (onClick)="activar(r)" [disabled]="busy()" /> }</div></td> }</tr></ng-template>
          <ng-template #emptymessage><tr><td [attr.colspan]="puedeGestionarProveedores() ? 5 : 4" class="py-8 text-center text-muted-color">No se encontraron proveedores.</td></tr></ng-template>
        </p-table>
        <div class="border-t border-surface px-4 py-3 text-sm text-muted-color">Mostrando <strong>{{ items().length }}</strong> de <strong>{{ total() }}</strong></div>
        <p-paginator [first]="offset()" [rows]="limit()" [totalRecords]="total()" [rowsPerPageOptions]="pageSizeOptions" (onPageChange)="onPage($event)" />
      </p-card>
    </div>
  `,
})
export class ProveedoresPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly dialog = inject(DialogService);
  private readonly authService = inject(AuthService);
  readonly state = signal<UiState>('idle');
  readonly busy = computed(() => this.state() !== 'idle');
  readonly puedeGestionarProveedores = computed(() =>
    this.authService.tieneRol('ADMIN') || this.authService.tieneRol('OPERADOR'),
  );
  readonly items = signal<ProveedorResp[]>([]);
  readonly total = signal(0);
  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly estadoOptions = [{ label: 'Todos', value: null }, { label: 'Activos', value: true }, { label: 'Inactivos', value: false }];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly form = this.fb.group({ q: this.fb.nonNullable.control(''), activo: this.fb.control<boolean | null>(null), limit: this.fb.nonNullable.control(environment.defaultPageSize) });

  constructor() { this.buscar(0); }
  limpiar() { this.form.reset({ q: '', activo: null, limit: environment.defaultPageSize }); this.buscar(0); }
  nuevo() { if (this.puedeGestionarProveedores()) this.abrirFormulario(); }
  editar(proveedor: ProveedorResp) { if (this.puedeGestionarProveedores()) this.abrirFormulario(proveedor); }
  activar(proveedor: ProveedorResp) { if (this.puedeGestionarProveedores()) this.cambiarEstado(proveedor, true); }
  desactivar(proveedor: ProveedorResp) { if (this.puedeGestionarProveedores()) this.cambiarEstado(proveedor, false); }

  buscar(offset: number) {
    this.error.set(null);
    const { q, activo, limit } = this.form.getRawValue();
    this.limit.set(limit); this.offset.set(offset); this.state.set('loading');
    this.proveedoresApi.listar({ q, activo, limit, offset }).subscribe({
      next: page => { this.state.set('idle'); this.items.set(page.items ?? []); this.total.set(page.total ?? 0); },
      error: err => { this.state.set('idle'); this.error.set(parseApiError(err).message); },
    });
  }

  onPage(event: PaginatorState) {
    const rows = event.rows ?? this.limit();
    if (rows !== this.limit()) this.form.controls.limit.setValue(rows);
    this.buscar(event.first ?? 0);
  }

  private cambiarEstado(proveedor: ProveedorResp, activo: boolean) {
    this.error.set(null); this.success.set(null); this.state.set('saving');
    (activo ? this.proveedoresApi.activar(proveedor.id) : this.proveedoresApi.desactivar(proveedor.id)).subscribe({
      next: actualizado => { this.state.set('idle'); this.success.set(`Proveedor ${actualizado.nombre} ${activo ? 'activado' : 'desactivado'}.`); this.buscar(this.offset()); },
      error: err => { this.state.set('idle'); this.error.set(parseApiError(err).message); },
    });
  }

  private abrirFormulario(proveedor: ProveedorResp | null = null) {
    this.error.set(null); this.success.set(null);
    const ref = this.dialog.open(ProveedorFormDialogComponent, { data: { proveedor }, width: 'min(92vw, 560px)', modal: true, closable: false, showHeader: false });
    if (!ref) return;
    ref.onClose.subscribe((guardado?: ProveedorResp) => {
      if (!guardado) return;
      this.success.set(`Proveedor ${guardado.nombre} ${proveedor ? 'actualizado' : 'creado'}.`);
      this.buscar(this.offset());
    });
  }
}
