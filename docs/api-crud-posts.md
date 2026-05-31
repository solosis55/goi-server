# CRUD de publicaciones — Goi Server

Equivalente en **Goi** del bloque de práctica **Endpoints CRUD de notas** (NoteFlow).

| NoteFlow (práctica) | Goi Server |
|---------------------|------------|
| `GET /api/notes` | `GET /api/posts` |
| `POST /api/notes` | `POST /api/posts` |
| `GET /api/notes/:id` | `GET /api/posts/:id` |
| `PATCH /api/notes/:id` | `PATCH /api/posts/:id` |
| `DELETE /api/notes/:id` | `DELETE /api/posts/:id` |

Tabla: **`posts`** (≈ `notes`). Los comentarios hijos (`post_comments`) se borran solos con **`ON DELETE CASCADE`**.

---

## Preparación

```bash
npm run dev          # http://localhost:4000
npm run db:seed      # usuario demo → copia userId
```

---

## Respuestas de prueba (documentación)

Base URL: `http://localhost:4000`

### `GET /api/posts`

**200** — lista (puede ser `[]` al inicio)

```json
[]
```

Tras crear posts:

```json
[
  {
    "id": "uuid…",
    "userId": "uuid…",
    "content": "Primera sesión compartida 💪",
    "format": "standard",
    "visibility": "public",
    "sessionId": null,
    "createdAt": "2026-05-26T12:00:00.000Z",
    "updatedAt": "2026-05-26T12:00:00.000Z"
  }
]
```

### `POST /api/posts`

**Body (JSON):**

```json
{
  "userId": "<uuid del npm run db:seed>",
  "content": "Hola desde Goi Server",
  "format": "standard",
  "visibility": "public"
}
```

**201 Created** — cuerpo = publicación creada (mismo shape que arriba).

**400** — validación Zod o `userId` inexistente:

```json
{
  "code": "POST_INVALID_INPUT",
  "message": "Datos no válidos",
  "details": { … }
}
```

### `GET /api/posts/:id`

**200** — una publicación.  
**404**:

```json
{
  "code": "POST_NOT_FOUND",
  "message": "La publicación no existe"
}
```

### `PATCH /api/posts/:id`

**Body (parcial):**

```json
{
  "content": "Texto actualizado"
}
```

**200** — publicación actualizada.

### `DELETE /api/posts/:id`

**204 No Content** — sin cuerpo (como pide la práctica).  
**404** si el id no existe.

---

## Probar con curl (Windows PowerShell)

```powershell
# Listar
curl http://localhost:4000/api/posts

# Crear (sustituye USER_ID)
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d "{\"userId\":\"USER_ID\",\"content\":\"Prueba CRUD Goi\"}"

# Una publicación
curl http://localhost:4000/api/posts/POST_ID

# Actualizar
curl -X PATCH http://localhost:4000/api/posts/POST_ID `
  -H "Content-Type: application/json" `
  -d "{\"content\":\"Editado\"}"

# Borrar (204)
curl -X DELETE http://localhost:4000/api/posts/POST_ID -i
```

También puedes usar **Bruno**, **Insomnia** o el cliente HTTP de Cursor.

**Atajo:** archivo [`test.http`](../test.http) en la raíz del repo (REST Client — Send Request sobre cada bloque).

---

## Validación (Zod)

| Campo | Reglas |
|-------|--------|
| `userId` | UUID obligatorio (FK a `users`) |
| `content` | 1–280 caracteres |
| `format` | `standard` \| `training` |
| `visibility` | `public` \| `followers` \| `private` |

Consultas SQL con **`$1`, `$2`** vía `lib/db.ts` (ver `docs/seguridad-api.md`).

---

## Comentarios + JOIN (≈ checklist items)

| NoteFlow | Goi Server |
|----------|------------|
| `GET/POST /api/notes/:id/checklist-items` | `GET/POST /api/posts/:id/comments` |
| `PATCH/DELETE /api/checklist-items/:itemId` | `PATCH/DELETE /api/comments/:id` |

**POST comentario** (`/api/posts/{postId}/comments`):

```json
{
  "userId": "<uuid demo>",
  "content": "¡Buen entreno!"
}
```

**GET /api/posts** ahora devuelve cada post con:

```json
{
  "id": "…",
  "content": "…",
  "comments": [ { "id": "…", "content": "…" } ],
  "tags": []
}
```

SQL del JOIN: **`sql/queries.sql`** · Teoría: **`docs/backend-teoria.md` § 11**.

Si acabas de actualizar el repo, ejecuta **`npm run db:schema`** para crear **`post_tags`**.
