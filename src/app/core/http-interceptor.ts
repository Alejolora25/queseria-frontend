import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export function apiBaseUrlInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const isAbsolute = /^https?:\/\//i.test(req.url);

  const apiReq = isAbsolute ? req : req.clone({ url: `${environment.apiBaseUrl}${req.url}` });

  return next(apiReq);
}
