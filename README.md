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

Producción tiene rutas para resumen, cuatro catálogos, apertura, edición,
histórico y detalle de lotes. `ADMIN` administra catálogos y puede corregir
lotes cerrados; `OPERADOR` registra y cierra lotes; `LECTOR` consulta. El
recorrido visual local por roles y dos queserías ya fue aprobado. El contrato
funcional vigente está en
[`backend/CONTRATO_PRODUCCION.md`](../../backend/CONTRATO_PRODUCCION.md).

La reorganización interna del backend no cambia las rutas públicas. Las pantallas
de administración y selección de proveedores continúan usando:

```text
/api/v1/proveedores
/api/v1/proveedores/{id}
/api/v1/proveedores/{id}/activar
/api/v1/proveedores/{id}/desactivar
```

La sección `/produccion` pertenece al área operativa y admite `ADMIN`,
`OPERADOR` y `LECTOR`; nunca a `PLATFORM_ADMIN`. Su vista inicial consulta el
resumen de Producción. Los contratos de catálogos y lotes están en
`src/app/core/api/produccion.models.ts` y `produccion.api.ts`. La quesería se
obtiene en el backend desde el token; las solicitudes Angular no la envían.
Para mostrar cifras locales, la base de trabajo debe tener aplicadas las
migraciones V10 y V11. Los formularios de catálogos y lotes ya están disponibles.

En **Producción → Catálogos** se administran productos, insumos, subproductos
y operarios. `ADMIN` puede crear, editar, activar y desactivar; `OPERADOR` y
`LECTOR` consultan y filtran. Cada catálogo ofrece búsqueda, estado y
paginación, con tarjetas en móvil. Desactivar un elemento conserva su
información en los lotes históricos.

`ADMIN` y `OPERADOR` pueden abrir lotes desde **Nuevo lote** y retomar su
edición desde **En proceso**. El formulario busca opciones activas con
paginación, admite varios proveedores y cero o más insumos, y calcula una
vista previa de litros y kg esperados. La edición mantiene los nombres y
referencias históricos ya guardados aunque se desactiven después de abrir el
lote; la fecha y el código permanecen fijos. La API confirma los resultados
guardados. `LECTOR` no ve enlaces de escritura. Las pantallas de cierre,
pérdida, corrección auditada e histórico están disponibles.
