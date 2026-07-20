import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolUsuario } from './auth.models';
import { AuthService } from './auth.service';
import { AuthFeedbackService } from './auth-feedback.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(AuthFeedbackService);

  if (!authService.autenticado()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const allowedRoles = route.data['roles'];
  if (isRoleList(allowedRoles) && allowedRoles.some(role => authService.tieneRol(role))) {
    return true;
  }

  feedback.accessDenied();

  return router.createUrlTree(['/calidad/historico']);
};

function isRoleList(value: unknown): value is readonly RolUsuario[] {
  return Array.isArray(value) && value.length > 0;
}
