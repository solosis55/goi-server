# Goi Server

API REST de **Goi** (red social + deporte). Stack: **Next.js** (App Router) + **PostgreSQL** en [Neon](https://neon.tech).

Clientes:

- **Goi App** — Expo / React Native (`EXPO_PUBLIC_API_URL`)
- **Goi Web** — Vite / React (`VITE_API_URL`)

El backend anterior (`Goi Web/server/` con Express + `store.json`) se irá migrando dominio a dominio hacia este repo.

---

## Requisitos

- Node.js 20+
- Cuenta Neon con connection string (región EU recomendada: Frankfurt)

---

## Arranque en local

```bash
cd "Goi Server"
npm install
cp .env.example .env.local
# Edita .env.local y pega DATABASE_URL de Neon (Show password → Copy snippet)
npm run dev
```

Servidor en **http://localhost:4000**

| Ruta | Descripción |
|------|-------------|
| `GET /api/health` | API viva (no usa BD) |
| `GET /api/health/db` | `SELECT 1` contra Neon |

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí (para BD) | URL PostgreSQL de Neon (`?sslmode=require`) |

**Nunca** commitees `.env.local`.

---

## Producción (Render)

| URL | Uso |
|-----|-----|
| `https://goi-server.onrender.com/api` | API (App + Web) |
| `https://goi-server.onrender.com/api/health` | Health check |

Variables en el dashboard Render: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `GOI_UPLOADS_PATH=/tmp/goi-uploads`, `GOI_DATA_DIR=/tmp/goi-data`.

- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `npx next start -H 0.0.0.0 -p $PORT`

Blueprint de referencia: [`render.yaml`](./render.yaml). Tras cambios en schema: `npm run db:setup` contra la misma `DATABASE_URL`.

---

## Documentación

- [`docs/backend-teoria.md`](./docs/backend-teoria.md) — patrón cliente-servidor, REST, códigos HTTP (entrega práctica Fase 7)
- [`docs/seguridad-api.md`](./docs/seguridad-api.md) — inyección SQL, consultas parametrizadas, variables de entorno
- [`docs/api-crud-posts.md`](./docs/api-crud-posts.md) — CRUD `/api/posts` (≈ notas en la práctica)

---

## Scripts

| Comando | Acción |
|---------|--------|
| `npm run dev` | Desarrollo en puerto 4000 |
| `npm run build` | Build producción |
| `npm run start` | Servidor producción |
| `npm run db:schema` | Crea tablas `users`, `posts`, `post_comments` en Neon |

---

## Esquema de base de datos (Fase 7)

1. Abre [`sql/schema.sql`](./sql/schema.sql)
2. **Neon → SQL Editor** → pega y **Run**  
   — o — `npm run db:schema`
3. Verifica en Neon → **Tables** las tres tablas
4. Lee el ERD en [`docs/backend-teoria.md`](./docs/backend-teoria.md) § 10
5. Prueba la API con [`test.http`](./test.http) (REST Client)
