import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.autenticado()) {
    if (authService.debeCambiarPassword())
      return router.createUrlTree(['/cambiar-password-obligatoria']);
    if (authService.tipoUsuario() === 'PLATAFORMA')
      return router.createUrlTree(['/plataforma']);
    return true;
  }

  const returnUrl = safeInternalUrl(state.url);
  return router.createUrlTree(['/login'], {
    queryParams: returnUrl ? { returnUrl } : undefined,
  });
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.autenticado()) return true;
  if (authService.debeCambiarPassword())
    return router.createUrlTree(['/cambiar-password-obligatoria']);
  return router.createUrlTree([authService.tipoUsuario() === 'PLATAFORMA'
    ? '/plataforma' : '/calidad/historico']);
};

export const pendingPasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (auth.debeCambiarPassword()) return true;
  return router.createUrlTree([auth.tipoUsuario() === 'PLATAFORMA'
    ? '/plataforma' : '/calidad/historico']);
};

export const platformInfoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (auth.debeCambiarPassword())
    return router.createUrlTree(['/cambiar-password-obligatoria']);
  return auth.tipoUsuario() === 'PLATAFORMA'
    ? true : router.createUrlTree(['/calidad/historico']);
};

function safeInternalUrl(url: string): string | null {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://') ? url : null;
}
