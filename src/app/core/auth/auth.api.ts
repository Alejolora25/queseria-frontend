import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CambioPasswordObligatoriaRequest, CambioPasswordResponse, LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', request);
  }

  cambiarPasswordObligatoria(request: CambioPasswordObligatoriaRequest): Observable<CambioPasswordResponse> {
    return this.http.post<CambioPasswordResponse>('/api/v1/auth/cambiar-password-obligatoria', request);
  }
}
