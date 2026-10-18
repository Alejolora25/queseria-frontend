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

El usuario `PLATFORM_ADMIN` entra a `/plataforma`. Desde allí puede consultar,
crear, editar, activar y desactivar queserías; consultar sus administradores y
regenerar una credencial temporal con motivo; y gestionar administradores de
plataforma. La contraseña temporal se muestra únicamente al crearla o
regenerarla. Un administrador de quesería continúa entrando al área operativa,
sin acceso a este panel. Para probar el panel local, reinicia el backend con el
cambio de API y usa la cuenta de plataforma ya migrada.

Las comprobaciones automatizadas se ejecutan con `npm run test:headless`.

La reorganización interna del backend no cambia las rutas públicas. Las pantallas
de administración y selección de proveedores continúan usando:

```text
/api/v1/proveedores
/api/v1/proveedores/{id}
/api/v1/proveedores/{id}/activar
/api/v1/proveedores/{id}/desactivar
```
