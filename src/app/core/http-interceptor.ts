import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export function apiBaseUrlInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const isAbsolute = /^https?:\/\//i.test(req.url);

  const apiReq = isAbsolute ? req : req.clone({ url: `${environment.apiBaseUrl}${req.url}` });

  return next(apiReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        console.error('HTTP Error:', err.status, err.message, err.error);
      }
      return throwError(() => err);
    }),
  );
}