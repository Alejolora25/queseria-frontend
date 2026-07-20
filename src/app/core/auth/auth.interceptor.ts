import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AuthFeedbackService } from './auth-feedback.service';

const PUBLIC_BACKEND_PATHS = ['/api/v1/auth/login', '/actuator/health'];

@Injectable({ providedIn: 'root' })
export class AuthUnauthorizedHandler {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(AuthFeedbackService);
  private redirectInProgress = false;

  handle(): void {
    this.authService.logout();

    if (this.redirectInProgress || this.router.url.startsWith('/login')) return;

    this.feedback.sessionExpired();

    const returnUrl = this.safeReturnUrl(this.router.url);
    this.redirectInProgress = true;
    void this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    }).finally(() => {
      this.redirectInProgress = false;
    });
  }

  private safeReturnUrl(url: string): string | null {
    return url.startsWith('/') && !url.startsWith('//') && !url.includes('://') ? url : null;
  }
}

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const unauthorizedHandler = inject(AuthUnauthorizedHandler);
  const feedback = inject(AuthFeedbackService);
  const isProtectedBackendRequest = isBackendRequest(req.url) && !isPublicBackendRequest(req.url);
  const token = authService.accessToken();
  const authorizedRequest = isProtectedBackendRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (
        isProtectedBackendRequest
        && error instanceof HttpErrorResponse
        && error.status === 401
      ) {
        unauthorizedHandler.handle();
      }
      if (
        isProtectedBackendRequest
        && error instanceof HttpErrorResponse
        && error.status === 403
      ) {
        feedback.permissionDenied();
      }
      return throwError(() => error);
    }),
  );
}

function isBackendRequest(requestUrl: string): boolean {
  const backendUrl = parseUrl(environment.apiBaseUrl);
  const targetUrl = parseUrl(requestUrl);
  if (!backendUrl || !targetUrl || backendUrl.origin !== targetUrl.origin) return false;

  const basePath = backendUrl.pathname.replace(/\/+$/, '');
  return basePath.length === 0
    || targetUrl.pathname === basePath
    || targetUrl.pathname.startsWith(`${basePath}/`);
}

function isPublicBackendRequest(requestUrl: string): boolean {
  const backendUrl = parseUrl(environment.apiBaseUrl);
  const targetUrl = parseUrl(requestUrl);
  if (!backendUrl || !targetUrl) return false;

  const basePath = backendUrl.pathname.replace(/\/+$/, '');
  return PUBLIC_BACKEND_PATHS.some(path => targetUrl.pathname === `${basePath}${path}`);
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
