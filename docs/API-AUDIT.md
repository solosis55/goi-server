# Auditoría API / backend (marzo 2026)

## Arquitectura actual (conexión)

```
Web (5173) ──proxy──► Goi Server (4000) ──► Neon PostgreSQL
App (Expo) ─────────► Goi Server (4000) ──► Neon
/uploads/* ─────────► Goi Server (4000) ──► disco Goi Web/server/data/uploads
```

Los clientes ya usan `apiFetch` → `:4000`. Express `:4001` **no es necesario** en el flujo normal.

---

## Por qué “carga a ratos” y tarda

| Causa | Impacto | Mitigación aplicada |
|--------|---------|---------------------|
| **Neon remoto** | Cada query suma latencia de red; “cold start” tras inactividad | `npm run db:setup`; primera petición lenta es normal |
| **Feed traía todo `media` JSONB** | Varios MB por listado | Feed sin `media` + hidratación por post en Web |
| **Feed sin `LIMIT` SQL** | Leía todos los posts y filtraba en memoria | `LIMIT` en SQL + filtro visibilidad sin N+1 |
| **Social hub: discover + N×follow status** | 12–48 usuarios × 2 queries = decenas de idas a Neon | Mapa de follows en 1 query; hub en `Promise.all` |
| **`GET /auth/users` N+1** | 1 query por usuario del listado | 1 query de follows del viewer |
| **Web: 9 peticiones en paralelo al abrir feed** | Saturación Neon + timeouts 12s | Timeouts feed/hub subidos en App; feed más ligero |
| **Internet inestable** | Timeouts intermitentes | No es bug de código; reintentar |

---

## Comprobar que todo está bien

1. `cd Goi Server && npm run db:setup` (una vez).
2. `npm run dev` en Goi Server → [http://localhost:4000/api/health/db](http://localhost:4000/api/health/db) → `"db": true`.
3. Web: `npm run dev` → [http://localhost:5173/api/health](http://localhost:5173/api/health).
4. Login `cristian@test.com` / `123456` → feed en &lt;5 s tras calentar Neon.

---

## Candidatos a eliminar o cambiar (confirmación pendiente)

No borrar hasta que confirmes.

### 1. Goi Web `server/` (Express, puerto 4001)

- **Qué es:** API legacy duplicada (`store.json`).
- **Por qué sobra:** Clientes migrados a Goi Server.
- **Acción propuesta:** Dejar de arrancarlo en dev; luego archivar o borrar carpeta `Goi Web/server/`.

### 2. Proxy / env legacy

- `vite.config.ts`: `LEGACY_SERVER` y variable `LEGACY_PORT` (catch-all ya apunta a 4000).
- `Goi Web/src/api/client.ts`: `legacyApiFetch`, `LEGACY_API_BASE_URL` (sin usos en APIs).
- `Goi App/api/client.ts`: `legacyApiFetch` (sin usos si `EXPO_PUBLIC_AUTH_API_URL` vacío).
- **Acción propuesta:** Eliminar código muerto y `LEGACY_*` de `.env.development`.

### 3. `EXPO_PUBLIC_AUTH_API_URL` en `.env` del App

- Si apunta a `:4001`, parte de la app falla.
- **Acción propuesta:** Borrar la variable o igualarla a `EXPO_PUBLIC_API_URL`.

### 4. Scripts / docs que mencionan Express

- `Goi App/scripts/start-qr.ps1` (ya actualizado a Goi Server).
- READMEs que digan “arranca server en Goi Web”.

### 5. Duplicado de datos

- `store.json` vs Neon: solo para migraciones (`npm run db:migrate-*`).
- **Acción propuesta:** Mantener scripts; no usar Express en runtime.

---

## Unificación de puertos (siguiente paso)

Objetivo mínimo en dev:

| Puerto | Servicio |
|--------|----------|
| **4000** | Goi Server (API + uploads) |
| **5173** | Vite (solo UI) |
| **8081** | Metro (solo bundler App) |

Quitar **4001** del día a día.

Opcional producción: un solo proceso (Goi Server sirviendo build de Web) → un solo puerto HTTP.
