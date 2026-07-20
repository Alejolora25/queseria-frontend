import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { parseApiError } from '../../../../core/api/api-error';
import { UsuariosApi } from '../../../../core/api/usuarios.api';
import { UsuarioAdmin } from '../../../../core/api/usuarios.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';
import { UsuarioFormDialogComponent } from '../../components/usuario-form-dialog/usuario-form-dialog';
import { UsuarioRolesDialogComponent } from '../../components/usuario-roles-dialog/usuario-roles-dialog';

type UiState = 'idle' | 'loading' | 'saving';
type TagSeverity = 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';

@Component({
  standalone: true,
  providers: [DialogService, ConfirmationService],
  imports: [ReactiveFormsModule, ButtonModule, CardModule, ConfirmDialogModule, DynamicDialogModule, InputTextModule, PaginatorModule, SelectModule, TableModule, TagModule],
  styles: `
    .usuarios-mobile-list { display: block; }
    .usuarios-desktop-table { display: none; }
    @media (min-width: 768px) { .usuarios-mobile-list { display: none; } .usuarios-desktop-table { display: block; } }
  `,
  template: `
    <p-confirmdialog />
    <div class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <p-button styleClass="w-full sm:w-auto" label="Nuevo usuario" icon="pi pi-user-plus" [outlined]="true" (onClick)="nuevo()" [disabled]="busy()" />
        <p-button styleClass="w-full sm:w-auto" label="Consultar" icon="pi pi-search" (onClick)="buscar(0)" [loading]="state() === 'loading'" [disabled]="busy()" />
      </div>

      <p-card styleClass="app-card">
        <form class="grid grid-cols-1 gap-4 md:grid-cols-3" [formGroup]="form">
          <div class="flex flex-col gap-2"><label for="usuarios-q" class="font-semibold">Búsqueda</label><input id="usuarios-q" pInputText placeholder="Nombre o correo..." [formControl]="form.controls.q" /></div>
          <div class="flex flex-col gap-2"><label for="usuarios-activo" class="font-semibold">Estado</label><p-select inputId="usuarios-activo" [options]="estadoOptions" optionLabel="label" optionValue="value" [formControl]="form.controls.activo" /></div>
          <div class="flex flex-col gap-2"><label for="usuarios-limit" class="font-semibold">Tamaño de página</label><p-select inputId="usuarios-limit" [options]="pageSizeOptions" [formControl]="form.controls.limit" /></div>
        </form>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row"><p-button label="Limpiar" icon="pi pi-filter-slash" [text]="true" (onClick)="limpiar()" [disabled]="busy()" /><p-button label="Aplicar filtros" icon="pi pi-filter" [outlined]="true" (onClick)="buscar(0)" [disabled]="busy()" /></div>
        @if (error()) { <div class="app-alert app-alert-error mt-4"><div class="font-medium">No se pudo completar la operación</div><div>{{ error() }}</div></div> }
      </p-card>
      @if (success()) { <div class="app-alert app-alert-success">{{ success() }}</div> }

      <div class="usuarios-mobile-list space-y-3">
        @for (usuario of items(); track usuario.id) {
          <p-card styleClass="app-card">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="truncate text-base font-semibold">{{ usuario.nombre }}</div><div class="mt-1 break-all text-sm text-muted-color">{{ usuario.email }}</div></div><p-tag [value]="usuario.activo ? 'Activo' : 'Inactivo'" [severity]="usuario.activo ? 'success' : 'secondary'" /></div>
            <div class="mt-3 flex flex-wrap gap-2">@for (rol of usuario.roles; track rol) { <p-tag [value]="etiquetaRol(rol)" [severity]="severidadRol(rol)" /> }</div>
            @if (esUsuarioActual(usuario)) { <div class="mt-3 text-xs text-muted-color"><i class="pi pi-info-circle mr-1"></i>Tu propia cuenta se protege desde esta pantalla.</div> }
            <div class="mt-4 flex flex-col gap-2">
              <p-button label="Cambiar rol" icon="pi pi-shield" [outlined]="true" (onClick)="cambiarRol(usuario)" [disabled]="busy() || esUsuarioActual(usuario)" />
              @if (usuario.activo) { <p-button label="Desactivar" icon="pi pi-ban" severity="danger" [outlined]="true" (onClick)="confirmarEstado(usuario, false)" [disabled]="busy() || esUsuarioActual(usuario)" /> }
              @else { <p-button label="Activar" icon="pi pi-check" severity="success" [outlined]="true" (onClick)="confirmarEstado(usuario, true)" [disabled]="busy()" /> }
            </div>
          </p-card>
        } @empty { <p-card styleClass="app-card"><div class="py-6 text-center text-muted-color">No se encontraron usuarios.</div></p-card> }
        <p-paginator [first]="offset()" [rows]="limit()" [totalRecords]="total()" [rowsPerPageOptions]="pageSizeOptions" (onPageChange)="onPage($event)" />
      </div>

      <p-card styleClass="app-card usuarios-desktop-table">
        <p-table [value]="items()" [loading]="state() === 'loading'" [tableStyle]="{ 'min-width': '64rem' }">
          <ng-template #header><tr><th>ID</th><th>Usuario</th><th>Roles</th><th>Estado</th><th>Acciones</th></tr></ng-template>
          <ng-template #body let-usuario><tr>
            <td>{{ usuario.id }}</td>
            <td><div class="font-medium">{{ usuario.nombre }}</div><div class="text-sm text-muted-color">{{ usuario.email }}</div>@if (esUsuarioActual(usuario)) { <div class="mt-1 text-xs text-primary">Tu cuenta</div> }</td>
            <td><div class="flex flex-wrap gap-2">@for (rol of usuario.roles; track rol) { <p-tag [value]="etiquetaRol(rol)" [severity]="severidadRol(rol)" /> }</div></td>
            <td><p-tag [value]="usuario.activo ? 'Activo' : 'Inactivo'" [severity]="usuario.activo ? 'success' : 'secondary'" /></td>
            <td><div class="flex flex-wrap gap-2"><p-button icon="pi pi-shield" label="Cambiar rol" size="small" [outlined]="true" (onClick)="cambiarRol(usuario)" [disabled]="busy() || esUsuarioActual(usuario)" />@if (usuario.activo) { <p-button icon="pi pi-ban" label="Desactivar" size="small" severity="danger" [text]="true" (onClick)="confirmarEstado(usuario, false)" [disabled]="busy() || esUsuarioActual(usuario)" /> } @else { <p-button icon="pi pi-check" label="Activar" size="small" severity="success" [text]="true" (onClick)="confirmarEstado(usuario, true)" [disabled]="busy()" /> }</div></td>
          </tr></ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="py-8 text-center text-muted-color">No se encontraron usuarios.</td></tr></ng-template>
        </p-table>
        <div class="border-t border-surface px-4 py-3 text-sm text-muted-color">Mostrando <strong>{{ items().length }}</strong> de <strong>{{ total() }}</strong></div>
        <p-paginator [first]="offset()" [rows]="limit()" [totalRecords]="total()" [rowsPerPageOptions]="pageSizeOptions" (onPageChange)="onPage($event)" />
      </p-card>
    </div>
  `,
})
export class UsuariosPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsuariosApi);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(DialogService);
  private readonly confirmation = inject(ConfirmationService);
  readonly state = signal<UiState>('idle');
  readonly busy = computed(() => this.state() !== 'idle');
  readonly items = signal<UsuarioAdmin[]>([]);
  readonly total = signal(0);
  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly estadoOptions = [{ label: 'Todos', value: null }, { label: 'Activos', value: true }, { label: 'Inactivos', value: false }];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly form = this.fb.group({ q: this.fb.nonNullable.control(''), activo: this.fb.control<boolean | null>(null), limit: this.fb.nonNullable.control(environment.defaultPageSize) });

  constructor() { this.buscar(0); }
  esUsuarioActual(usuario: UsuarioAdmin) { return this.authService.usuarioActual()?.id === usuario.id; }
  etiquetaRol(rol: string) { return ({ ADMIN: 'Administrador', OPERADOR: 'Operador', LECTOR: 'Lector' } as Record<string, string>)[rol] ?? rol; }
  severidadRol(rol: string): TagSeverity { return rol === 'ADMIN' ? 'danger' : rol === 'OPERADOR' ? 'info' : 'secondary'; }
  limpiar() { this.form.reset({ q: '', activo: null, limit: environment.defaultPageSize }); this.buscar(0); }
  nuevo() { this.abrirCreacion(); }

  buscar(offset: number) {
    this.error.set(null);
    const { q, activo, limit } = this.form.getRawValue();
    this.limit.set(limit); this.offset.set(offset); this.state.set('loading');
    this.api.listar({ q, activo, limit, offset }).subscribe({
      next: page => { this.state.set('idle'); this.items.set(page.items ?? []); this.total.set(page.total ?? 0); },
      error: err => { this.state.set('idle'); this.error.set(parseApiError(err).message); },
    });
  }

  onPage(event: PaginatorState) {
    const rows = event.rows ?? this.limit();
    if (rows !== this.limit()) this.form.controls.limit.setValue(rows);
    this.buscar(event.first ?? 0);
  }

  cambiarRol(usuario: UsuarioAdmin) {
    if (this.esUsuarioActual(usuario)) return;
    this.error.set(null); this.success.set(null);
    const ref = this.dialog.open(UsuarioRolesDialogComponent, { data: { usuario }, width: 'min(92vw, 520px)', modal: true, closable: false, showHeader: false });
    ref?.onClose.subscribe((actualizado?: UsuarioAdmin) => { if (actualizado) { this.success.set(`Rol de ${actualizado.nombre} actualizado.`); this.buscar(this.offset()); } });
  }

  confirmarEstado(usuario: UsuarioAdmin, activo: boolean) {
    if (!activo && this.esUsuarioActual(usuario)) return;
    this.confirmation.confirm({
      header: activo ? 'Activar usuario' : 'Desactivar usuario',
      message: `¿Confirmas que deseas ${activo ? 'activar' : 'desactivar'} a ${usuario.nombre}?`,
      icon: activo ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
      acceptLabel: activo ? 'Activar' : 'Desactivar', rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: activo ? 'success' : 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.cambiarEstado(usuario, activo),
    });
  }

  private abrirCreacion() {
    this.error.set(null); this.success.set(null);
    const ref = this.dialog.open(UsuarioFormDialogComponent, { width: 'min(92vw, 580px)', modal: true, closable: false, showHeader: false });
    ref?.onClose.subscribe((creado?: UsuarioAdmin) => { if (creado) { this.success.set(`Usuario ${creado.nombre} creado.`); this.buscar(0); } });
  }

  private cambiarEstado(usuario: UsuarioAdmin, activo: boolean) {
    this.error.set(null); this.success.set(null); this.state.set('saving');
    (activo ? this.api.activar(usuario.id) : this.api.desactivar(usuario.id)).subscribe({
      next: actualizado => { this.state.set('idle'); this.success.set(`Usuario ${actualizado.nombre} ${activo ? 'activado' : 'desactivado'}.`); this.buscar(this.offset()); },
      error: err => { this.state.set('idle'); this.error.set(parseApiError(err).message); },
    });
  }
}
