# Frontend de Quesería

Aplicación Angular 20 que consume el único backend modular de Quesería.

## Requisitos

- Node.js compatible con Angular 20.
- Dependencias instaladas mediante `npm ci`.
- Backend local disponible en `http://localhost:8080`.

## Desarrollo local

```powershell
npm ci
npm start
```

La aplicación queda disponible en `http://localhost:4200`. La URL del backend
local está definida en `src/environments/environment.ts`.

## Construcción de producción

```powershell
npm run build
```

Los artefactos se generan en `dist/queseria-frontend`. La URL productiva está en
`src/environments/environment.production.ts`.

El hostname productivo contiene el nombre histórico `calidad-leche-service`
porque identifica el servicio desplegado en Render; no representa un módulo ni
una carpeta actual del backend.

## Pruebas

```powershell
npm test
```

## Contratos con el backend

La reorganización interna del backend no cambia las rutas públicas. Las pantallas
de administración y selección de proveedores continúan usando:

```text
/api/v1/proveedores
/api/v1/proveedores/{id}
/api/v1/proveedores/{id}/activar
/api/v1/proveedores/{id}/desactivar
```
