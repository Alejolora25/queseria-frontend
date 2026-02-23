import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ResumenProveedorResp } from './models';
import { Observable } from 'rxjs';
import { AnaliticaMuestraDocResp } from './models';

@Injectable({ providedIn: 'root' })
export class AnaliticasApi {
  private http = inject(HttpClient);

  resumenProveedor(params: { proveedorId: number; desde: string; hasta: string }): Observable<ResumenProveedorResp> {
    const httpParams = new HttpParams().set('desde', params.desde).set('hasta', params.hasta);

    return this.http.get<ResumenProveedorResp>(`/api/v1/analiticas/proveedor/${params.proveedorId}/resumen`, {
      params: httpParams,
    });
  }

  porMuestra(sampleId: number) {
    return this.http.get<AnaliticaMuestraDocResp>(`/api/v1/analiticas/muestra/${sampleId}`);
  }
}