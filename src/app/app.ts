
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { RolUsuario } from './core/auth/auth.models';
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
  protected readonly showApplicationShell = computed(() => !this.currentUrl().startsWith('/login'));
  protected readonly authFeedback = this.authFeedbackService.feedback;
  protected readonly usuarioActual = this.authService.usuarioActual;
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
    return this.allNavItems.find(item => url.startsWith(item.route)) ?? this.allNavItems[2];
  });

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

  private etiquetaRol(role: RolUsuario): string {
    return ({ ADMIN: 'Administrador', OPERADOR: 'Operador', LECTOR: 'Lector' })[role];
  }
}
