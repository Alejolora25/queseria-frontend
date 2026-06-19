
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('queseria-frontend');
  protected readonly mobileMenuOpen = signal(false);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  protected readonly navItems = [
    {
      label: 'Proveedores',
      description: 'Gestión de productores',
      route: '/proveedores',
      icon: 'groups',
    },
    {
      label: 'Cargar muestra',
      description: 'Registro y evaluación',
      route: '/calidad/cargar',
      icon: 'add_circle',
    },
    {
      label: 'Histórico',
      description: 'Muestras registradas',
      route: '/calidad/historico',
      icon: 'history',
    },
    {
      label: 'Resumen',
      description: 'Indicadores de calidad',
      route: '/calidad/resumen',
      icon: 'monitoring',
    },
  ];

  protected readonly currentPage = computed(() => {
    const url = this.currentUrl();
    return this.navItems.find(item => url.startsWith(item.route)) ?? this.navItems[2];
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
}
