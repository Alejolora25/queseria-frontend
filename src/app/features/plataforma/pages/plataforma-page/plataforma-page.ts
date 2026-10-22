import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { parseApiError } from '../../../../core/api/api-error';
import { PlataformaApi } from '../../../../core/api/plataforma.api';
import {
  AdministradorPlataforma, AdministradorQueseria, CredencialTemporal,
  DatosQueseria, EstadoQueseria, QueseriaPlataforma,
} from '../../../../core/api/plataforma.models';
import { AuthService } from '../../../../core/auth/auth.service';

type Vista = 'queserias' | 'administradores';
type Dialogo = 'crear-queseria' | 'editar-queseria' | 'ver-queseria' | 'activar-queseria' |
  'desactivar-queseria' | 'regenerar-credencial' | 'crear-administrador' |
  'estado-administrador' | null;

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './plataforma-page.html',
  styleUrl: './plataforma-page.css',
})
export class PlataformaPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlataformaApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly usuario = this.auth.usuarioActual;
  readonly vista = signal<Vista>('queserias');
  readonly dialogo = signal<Dialogo>(null);
  readonly cargando = signal(false);
  readonly cargandoAdministradores = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly queserias = signal<QueseriaPlataforma[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly seleccionada = signal<QueseriaPlataforma | null>(null);
  readonly administradoresQueseria = signal<AdministradorQueseria[]>([]);
  readonly administradoresPlataforma = signal<AdministradorPlataforma[]>([]);
  readonly administradorSeleccionado = signal<AdministradorQueseria | null>(null);
  readonly plataformaAdminSeleccionado = signal<AdministradorPlataforma | null>(null);
  readonly credencial = signal<(CredencialTemporal & { email: string; contexto: string }) | null>(null);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));

  readonly filtros = this.fb.group({
    q: this.fb.nonNullable.control(''),
    estado: this.fb.nonNullable.control(''),
  });
  readonly queseriaForm = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(160)]),
    razonSocial: this.fb.nonNullable.control(''),
    nit: this.fb.nonNullable.control(''),
    direccion: this.fb.nonNullable.control(''),
    ciudad: this.fb.nonNullable.control(''),
    departamento: this.fb.nonNullable.control(''),
    nombreAdministrador: this.fb.nonNullable.control(''),
    emailAdministrador: this.fb.nonNullable.control(''),
  });
  readonly adminForm = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
  });
  readonly motivoForm = this.fb.group({
    motivo: this.fb.nonNullable.control('', Validators.required),
  });

  constructor() { this.cargarQueserias(); }

  irA(vista: Vista): void {
    this.vista.set(vista);
    this.limpiarMensajes();
    if (vista === 'administradores') this.cargarAdministradoresPlataforma();
    else this.cargarQueserias();
  }

  cargarQueserias(pagina = this.pagina()): void {
    this.error.set(null);
    this.cargando.set(true);
    const { q, estado } = this.filtros.getRawValue();
    this.api.listarQueserias({ q, estado: (estado || null) as EstadoQueseria | null,
      page: pagina, size: this.tamano() }).subscribe({
      next: resultado => {
        this.queserias.set(resultado.items ?? []);
        this.total.set(resultado.total ?? 0);
        this.pagina.set(resultado.page);
        this.cargando.set(false);
        const actual = this.seleccionada();
        if (actual) {
          const actualizado = resultado.items?.find(q => q.id === actual.id);
          if (actualizado) this.seleccionada.set(actualizado);
        }
      },
      error: e => this.fallo(e),
    });
  }

  limpiarFiltros(): void {
    this.filtros.reset({ q: '', estado: '' });
    this.cargarQueserias(0);
  }

  cambiarPagina(direccion: -1 | 1): void {
    const destino = this.pagina() + direccion;
    if (destino >= 0 && destino < this.totalPaginas()) this.cargarQueserias(destino);
  }

  seleccionar(queseria: QueseriaPlataforma): void {
    this.seleccionada.set(queseria);
    this.administradoresQueseria.set([]);
    this.cargandoAdministradores.set(true);
    this.error.set(null);
    this.api.listarAdministradoresQueseria(queseria.id).subscribe({
      next: usuarios => {
        if (this.seleccionada()?.id === queseria.id) {
          this.administradoresQueseria.set(usuarios);
          this.cargandoAdministradores.set(false);
        }
      },
      error: e => {
        if (this.seleccionada()?.id === queseria.id) {
          this.cargandoAdministradores.set(false);
          this.fallo(e);
        }
      },
    });
  }

  verQueseria(queseria: QueseriaPlataforma): void {
    this.seleccionar(queseria);
    this.dialogo.set('ver-queseria');
  }

  nuevaQueseria(): void {
    this.queseriaForm.reset();
    this.queseriaForm.controls.nombreAdministrador.addValidators(Validators.required);
    this.queseriaForm.controls.emailAdministrador.addValidators([Validators.required, Validators.email]);
    this.queseriaForm.controls.nombreAdministrador.updateValueAndValidity();
    this.queseriaForm.controls.emailAdministrador.updateValueAndValidity();
    this.limpiarMensajes();
    this.dialogo.set('crear-queseria');
  }

  editarQueseria(queseria: QueseriaPlataforma): void {
    this.seleccionar(queseria);
    this.queseriaForm.controls.nombreAdministrador.clearValidators();
    this.queseriaForm.controls.emailAdministrador.clearValidators();
    this.queseriaForm.controls.nombreAdministrador.updateValueAndValidity();
    this.queseriaForm.controls.emailAdministrador.updateValueAndValidity();
    this.queseriaForm.patchValue({
      nombre: queseria.nombre, razonSocial: queseria.razonSocial ?? '', nit: queseria.nit ?? '',
      direccion: queseria.direccion ?? '', ciudad: queseria.ciudad ?? '',
      departamento: queseria.departamento ?? '', nombreAdministrador: '', emailAdministrador: '',
    });
    this.limpiarMensajes();
    this.dialogo.set('editar-queseria');
  }

  guardarQueseria(): void {
    if (this.queseriaForm.invalid || this.guardando()) {
      this.queseriaForm.markAllAsTouched();
      return;
    }
    const valor = this.queseriaForm.getRawValue();
    const datos: DatosQueseria = {
      nombre: valor.nombre.trim(), razonSocial: this.opcional(valor.razonSocial),
      nit: this.opcional(valor.nit), direccion: this.opcional(valor.direccion),
      ciudad: this.opcional(valor.ciudad), departamento: this.opcional(valor.departamento),
    };
    if (!datos.nombre) { this.error.set('Ingresa el nombre de la quesería.'); return; }
    this.guardando.set(true);
    this.error.set(null);
    if (this.dialogo() === 'crear-queseria') {
      this.api.crearQueseria({ ...datos, nombreAdministrador: valor.nombreAdministrador.trim(),
        emailAdministrador: valor.emailAdministrador.trim() }).subscribe({
        next: respuesta => {
          this.guardando.set(false);
          this.dialogo.set(null);
          this.aviso.set(`Quesería ${respuesta.queseria.nombre} creada.`);
          this.credencial.set({ passwordTemporal: respuesta.passwordTemporal,
            credencialTemporalExpiraEn: respuesta.credencialTemporalExpiraEn,
            email: respuesta.administradorEmail, contexto: `Primer administrador de ${respuesta.queseria.nombre}` });
          this.cargarQueserias(0);
        }, error: e => this.fallo(e),
      });
    } else {
      const actual = this.seleccionada();
      if (!actual) { this.guardando.set(false); return; }
      this.api.actualizarQueseria(actual.id, datos).subscribe({
        next: resultado => {
          this.guardando.set(false);
          this.dialogo.set(null);
          this.seleccionada.set(resultado);
          this.aviso.set('Datos de la quesería actualizados.');
          this.cargarQueserias();
        }, error: e => this.fallo(e),
      });
    }
  }

  prepararDesactivacion(queseria: QueseriaPlataforma): void {
    this.seleccionada.set(queseria);
    this.motivoForm.reset();
    this.limpiarMensajes();
    this.dialogo.set('desactivar-queseria');
  }

  desactivarQueseria(): void {
    const actual = this.seleccionada();
    const motivo = this.motivoForm.controls.motivo.value.trim();
    if (!actual || !motivo || this.guardando()) { this.motivoForm.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.api.desactivarQueseria(actual.id, motivo).subscribe({
      next: resultado => this.estadoQueseriaGuardado(resultado, 'desactivada'),
      error: e => this.fallo(e),
    });
  }

  activarQueseria(queseria: QueseriaPlataforma): void {
    this.seleccionada.set(queseria);
    this.limpiarMensajes();
    this.dialogo.set('activar-queseria');
  }

  confirmarActivacionQueseria(): void {
    const queseria = this.seleccionada();
    if (!queseria || this.guardando()) return;
    this.guardando.set(true);
    this.api.activarQueseria(queseria.id).subscribe({
      next: resultado => this.estadoQueseriaGuardado(resultado, 'activada'),
      error: e => this.fallo(e),
    });
  }

  prepararRegeneracion(administrador: AdministradorQueseria): void {
    this.administradorSeleccionado.set(administrador);
    this.motivoForm.reset();
    this.limpiarMensajes();
    this.dialogo.set('regenerar-credencial');
  }

  regenerarCredencial(): void {
    const queseria = this.seleccionada();
    const administrador = this.administradorSeleccionado();
    const motivo = this.motivoForm.controls.motivo.value.trim();
    if (!queseria || !administrador || !motivo || this.guardando()) {
      this.motivoForm.markAllAsTouched(); return;
    }
    this.guardando.set(true);
    this.api.regenerarCredencial(queseria.id, administrador.usuarioId, motivo).subscribe({
      next: respuesta => {
        this.guardando.set(false);
        this.dialogo.set(null);
        this.credencial.set({ passwordTemporal: respuesta.passwordTemporal,
          credencialTemporalExpiraEn: respuesta.credencialTemporalExpiraEn,
          email: respuesta.email, contexto: `Administrador de ${queseria.nombre}` });
        this.aviso.set('Credencial temporal regenerada. La anterior quedó invalidada.');
      }, error: e => this.fallo(e),
    });
  }

  cargarAdministradoresPlataforma(): void {
    this.error.set(null);
    this.cargando.set(true);
    this.api.listarAdministradoresPlataforma().subscribe({
      next: administradores => { this.administradoresPlataforma.set(administradores); this.cargando.set(false); },
      error: e => this.fallo(e),
    });
  }

  nuevoAdministrador(): void {
    this.adminForm.reset();
    this.limpiarMensajes();
    this.dialogo.set('crear-administrador');
  }

  crearAdministrador(): void {
    if (this.adminForm.invalid || this.guardando()) { this.adminForm.markAllAsTouched(); return; }
    const { nombre, email } = this.adminForm.getRawValue();
    this.guardando.set(true);
    this.api.crearAdministradorPlataforma({ nombre: nombre.trim(), email: email.trim() }).subscribe({
      next: respuesta => {
        this.guardando.set(false);
        this.dialogo.set(null);
        this.credencial.set({ passwordTemporal: respuesta.passwordTemporal,
          credencialTemporalExpiraEn: respuesta.credencialTemporalExpiraEn,
          email: respuesta.administrador.email, contexto: 'Administrador de plataforma' });
        this.aviso.set(`Administrador ${respuesta.administrador.nombre} creado.`);
        this.cargarAdministradoresPlataforma();
      }, error: e => this.fallo(e),
    });
  }

  cambiarEstadoAdministrador(admin: AdministradorPlataforma): void {
    if (admin.id === this.usuario()?.id && admin.activo) return;
    this.plataformaAdminSeleccionado.set(admin);
    this.limpiarMensajes();
    this.dialogo.set('estado-administrador');
  }

  confirmarEstadoAdministrador(): void {
    const admin = this.plataformaAdminSeleccionado();
    if (!admin || this.guardando()) return;
    this.guardando.set(true);
    this.api.cambiarEstadoAdministradorPlataforma(admin.id, !admin.activo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogo.set(null);
        this.aviso.set(`Administrador ${admin.nombre} ${admin.activo ? 'desactivado' : 'activado'}.`);
        this.cargarAdministradoresPlataforma();
      }, error: e => this.fallo(e),
    });
  }

  cerrarDialogo(): void {
    if (this.guardando()) return;
    this.dialogo.set(this.dialogo() === 'regenerar-credencial' ? 'ver-queseria' : null);
    this.error.set(null);
  }
  cerrarCredencial(): void { this.credencial.set(null); }
  cerrarSesion(): void {
    this.cerrarCredencial();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private estadoQueseriaGuardado(queseria: QueseriaPlataforma, accion: string): void {
    this.guardando.set(false);
    this.dialogo.set(null);
    this.seleccionada.set(queseria);
    this.aviso.set(`Quesería ${queseria.nombre} ${accion}.`);
    this.cargarQueserias();
  }

  private opcional(valor: string): string | null { return valor.trim() || null; }
  private limpiarMensajes(): void { this.error.set(null); this.aviso.set(null); }
  private fallo(error: unknown): void {
    this.cargando.set(false);
    this.guardando.set(false);
    const respuesta = parseApiError(error);
    this.error.set(respuesta.status === 401 ? 'La sesión venció. Inicia sesión nuevamente.' : respuesta.message);
  }
}
