import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AdministradorPlataforma, AdministradorQueseria, AltaAdministradorPlataformaResponse,
  AltaQueseriaRequest, AltaQueseriaResponse, CredencialRegeneradaResponse,
  DatosQueseria, EstadoQueseria, QueseriaPlataforma, QueseriasPage,
} from './plataforma.models';

@Injectable({ providedIn: 'root' })
export class PlataformaApi {
  private readonly http = inject(HttpClient);
  private readonly queseriasUrl = '/api/v1/platform/queserias';
  private readonly administradoresUrl = '/api/v1/platform/administradores';

  listarQueserias(args: { q: string; estado: EstadoQueseria | null; page: number; size: number }) {
    const params: Record<string, string> = {
      q: args.q.trim(), page: String(args.page), size: String(args.size),
    };
    if (args.estado) params['estado'] = args.estado;
    return this.http.get<QueseriasPage>(this.queseriasUrl, { params });
  }

  consultarQueseria(id: number) {
    return this.http.get<QueseriaPlataforma>(`${this.queseriasUrl}/${id}`);
  }

  crearQueseria(request: AltaQueseriaRequest) {
    return this.http.post<AltaQueseriaResponse>(this.queseriasUrl, request);
  }

  actualizarQueseria(id: number, request: DatosQueseria) {
    return this.http.put<QueseriaPlataforma>(`${this.queseriasUrl}/${id}`, request);
  }

  activarQueseria(id: number) {
    return this.http.patch<QueseriaPlataforma>(`${this.queseriasUrl}/${id}/activar`, {});
  }

  desactivarQueseria(id: number, motivo: string) {
    return this.http.patch<QueseriaPlataforma>(`${this.queseriasUrl}/${id}/desactivar`, { motivo });
  }

  listarAdministradoresQueseria(id: number) {
    return this.http.get<AdministradorQueseria[]>(`${this.queseriasUrl}/${id}/administradores`);
  }

  regenerarCredencial(id: number, usuarioId: number, motivo: string) {
    return this.http.post<CredencialRegeneradaResponse>(
      `${this.queseriasUrl}/${id}/administradores/${usuarioId}/regenerar-credencial`, { motivo },
    );
  }

  listarAdministradoresPlataforma() {
    return this.http.get<AdministradorPlataforma[]>(this.administradoresUrl);
  }

  crearAdministradorPlataforma(request: { nombre: string; email: string }) {
    return this.http.post<AltaAdministradorPlataformaResponse>(this.administradoresUrl, request);
  }

  cambiarEstadoAdministradorPlataforma(id: number, activo: boolean) {
    return this.http.patch<AdministradorPlataforma>(
      `${this.administradoresUrl}/${id}/${activo ? 'activar' : 'desactivar'}`, {},
    );
  }

  regenerarCredencialAdministradorPlataforma(id: number, motivo: string) {
    return this.http.post<CredencialRegeneradaResponse>(
      `${this.administradoresUrl}/${id}/regenerar-credencial`, { motivo },
    );
  }
}
