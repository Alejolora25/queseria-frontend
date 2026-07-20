import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.autenticado()) return true;

  const returnUrl = safeInternalUrl(state.url);
  return router.createUrlTree(['/login'], {
    queryParams: returnUrl ? { returnUrl } : undefined,
  });
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.autenticado()
    ? router.createUrlTree(['/calidad/historico'])
    : true;
};

function safeInternalUrl(url: string): string | null {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://') ? url : null;
}
