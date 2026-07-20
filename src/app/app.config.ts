import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { QueseriaPreset } from './core/theme/queseria-preset';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';

import { routes } from './app.routes';
import { apiBaseUrlInterceptor } from './core/http-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: QueseriaPreset, options: { darkModeSelector: '.app-dark', cssLayer: { name: 'primeng', order: 'theme, base, primeng' } } },
      ripple: true,
    }),
    provideAppInitializer(() => void inject(AuthService)),
    provideRouter(routes),

    provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
  ]
};
