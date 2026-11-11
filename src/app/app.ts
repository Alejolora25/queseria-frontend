
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { RolSesion, RolUsuario } from './core/auth/auth.models';
import { AuthService } from './core/auth/auth.service';
import { AuthFeedbackService } from './core/auth/auth-feedback.service';

interface NavigationItem {
  label: string;
  description: string;
  route: string;
  icon: string;
  roles: readonly RolUsuario[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('queseria-frontend');
  protected readonly mobileMenuOpen = signal(false);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authFeedbackService = inject(AuthFeedbackService);
  private readonly currentUrl = signal(this.router.url);
  protected readonly showApplicationShell = computed(() =>
    !this.currentUrl().startsWith('/login')
    && !this.currentUrl().startsWith('/cambiar-password-obligatoria')
    && !this.currentUrl().startsWith('/plataforma'),
  );
  protected readonly authFeedback = this.authFeedbackService.feedback;
  protected readonly usuarioActual = this.authService.usuarioActual;
  protected readonly nombreQueseria = computed(() =>
    this.usuarioActual()?.nombreQueseria?.trim() || 'Quesería',
  );
  protected readonly inicialUsuario = computed(() =>
    this.usuarioActual()?.nombre.trim().charAt(0).toUpperCase() || 'U',
  );
  protected readonly etiquetaRolActual = computed(() => {
    const role = this.usuarioActual()?.roles[0];
    return role ? this.etiquetaRol(role) : 'Sin rol';
  });

  private readonly allNavItems: readonly NavigationItem[] = [
    {
      label: 'Proveedores',
      description: 'Gestión de productores',
      route: '/proveedores',
      icon: 'pi pi-users',
      roles: ['ADMIN', 'OPERADOR', 'LECTOR'],
    },
    {
      label: 'Cargar muestra',
      description: 'Registro y evaluación',
      route: '/calidad/cargar',
      icon: 'pi pi-plus-circle',
      roles: ['ADMIN', 'OPERADOR'],
    },
    {
      label: 'Histórico',
      description: 'Muestras registradas',
      route: '/calidad/historico',
      icon: 'pi pi-history',
      roles: ['ADMIN', 'OPERADOR', 'LECTOR'],
    },
    {
      label: 'Resumen',
      description: 'Indicadores de calidad',
      route: '/calidad/resumen',
      icon: 'pi pi-chart-line',
      roles: ['ADMIN', 'OPERADOR', 'LECTOR'],
    },
    {
      label: 'Producción',
      description: 'Lotes y rendimiento',
      route: '/produccion',
      icon: 'pi pi-box',
      roles: ['ADMIN', 'OPERADOR', 'LECTOR'],
    },
    {
      label: 'Catálogos',
      description: 'Productos, insumos y equipo',
      route: '/produccion/catalogos',
      icon: 'pi pi-list',
      roles: ['ADMIN', 'OPERADOR', 'LECTOR'],
    },
    {
      label: 'Nuevo lote',
      description: 'Registrar producción',
      route: '/produccion/nueva',
      icon: 'pi pi-plus-circle',
      roles: ['ADMIN', 'OPERADOR'],
    },
    {
      label: 'En proceso',
      description: 'Continuar lotes abiertos',
      route: '/produccion/en-proceso',
      icon: 'pi pi-pencil',
      roles: ['ADMIN', 'OPERADOR'],
    },
    {
      label: 'Administración',
      description: 'Usuarios y roles',
      route: '/admin/usuarios',
      icon: 'pi pi-shield',
      roles: ['ADMIN'],
    },
  ];

  protected readonly navItems = computed(() => this.allNavItems.filter(item =>
    item.roles.some(role => this.authService.tieneRol(role)),
  ));

  protected readonly currentPage = computed(() => {
    const url = this.currentUrl();
    return [...this.allNavItems].sort((a, b) => b.route.length - a.route.length)
      .find(item => url.startsWith(item.route)) ?? this.allNavItems[2];
  });
  protected readonly currentSection = computed(() =>
    this.currentUrl().startsWith('/produccion') ? 'Producción' : 'Calidad de leche',
  );

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.mobileMenuOpen.set(false);
      }
    });
  }

  protected toggleMobileMenu() {
    this.mobileMenuOpen.update(open => !open);
  }

  protected closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  protected cerrarSesion() {
    this.authFeedbackService.dismiss();
    this.authService.logout();
    this.mobileMenuOpen.set(false);
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  protected cerrarAviso() {
    this.authFeedbackService.dismiss();
  }

  private etiquetaRol(role: RolSesion): string {
    return ({ ADMIN: 'Administrador', OPERADOR: 'Operador', LECTOR: 'Lector',
      PLATFORM_ADMIN: 'Administrador de plataforma' })[role];
  }
}
