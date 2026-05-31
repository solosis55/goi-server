# Seguridad de la API — Goi Server

Documento de la práctica (Fase 7): **inyección SQL**, **consultas parametrizadas** y **variables de entorno**. Adaptado de NoteFlow a **Goi** (`posts`, `users`, Neon).

---

## 1. Qué es la inyección SQL

**Inyección SQL** ocurre cuando datos controlados por el usuario se **concatenan** dentro de una cadena SQL. El atacante puede cerrar comillas, añadir sentencias nuevas y hacer que la base de datos ejecute código que no era la intención del desarrollador.

### Ejemplo vulnerable (no usar en Goi)

Supón un endpoint que busca publicaciones por texto en el título o contenido, construyendo la query a mano:

```javascript
// ❌ VULNERABLE: concatenación directa
const search = req.body.search;
// Un atacante podría enviar:  '; DROP TABLE posts;--
const sql =
  "SELECT * FROM posts WHERE content LIKE '%" + search + "%'";
await db.query(sql);
```

Si el servidor ejecuta eso tal cual, el input malicioso puede:

- **Borrar datos** (`DROP TABLE posts`)
- **Leer datos ajenos** (`OR '1'='1`)
- **Modificar filas** que no debería tocar

En Goi esto afectaría al feed, comentarios, cuentas, etc. Por eso **Goi App** y **Goi Web** nunca construyen SQL: solo envían JSON al **Goi Server**, y el servidor es quien habla con Neon.

### Ejemplo concreto en dominio Goi

Usuario malintencionado publica un comentario cuyo “contenido” en realidad es un payload SQL en un endpoint mal diseñado:

```text
'; DELETE FROM post_comments WHERE '1'='1
```

Con concatenación, esa cadena deja de ser “texto del comentario” y pasa a ser **parte del comando SQL**.

---

## 2. Cómo lo evitan las consultas parametrizadas

En **consultas parametrizadas**, la estructura SQL y los **valores** van separados. PostgreSQL trata `$1`, `$2`, … siempre como **datos**, nunca como fragmentos de comando.

### Forma segura (la que usa Goi Server)

En `lib/db.ts`:

```typescript
// ✅ SEGURO: placeholders $1, $2 y array de valores
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
```

Ejemplo al buscar posts de un usuario:

```typescript
const userId = req.body.userId; // aunque venga raro, solo es un valor
const rows = await query(
  "SELECT id, content FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
  [userId]
);
```

Aunque `userId` contenga comillas o `DROP TABLE`, la base de datos lo interpreta como **un literal** en el parámetro `$1`, no como SQL ejecutable.

### Reglas en Goi Server

| Hacer | No hacer |
|-------|----------|
| `query("... WHERE id = $1", [id])` | `` query(`... WHERE id = '${id}'`) `` |
| Validar input con **Zod** antes del SQL | Confiar en el cliente móvil o web |
| Devolver mensajes genéricos al cliente | Enviar el error crudo de PostgreSQL |

---

## 3. Variables de entorno y la connection string

### Qué es una variable de entorno

Es un valor de configuración que vive **fuera del código fuente**, inyectado al arrancar el proceso (localmente en `.env.local`, en producción en el panel del hosting).

En Goi Server:

```env
DATABASE_URL=postgresql://usuario:contraseña@ep-....neon.tech/neondb?sslmode=require
```

Next.js carga `.env.local` en desarrollo; el código lee `process.env.DATABASE_URL` en `lib/db.ts`.

### Por qué la connection string nunca debe estar en el código

| Riesgo | Consecuencia |
|--------|----------------|
| Subes el repo a GitHub con la URL | Cualquiera puede conectar a tu Neon |
| La incluyes en **Goi App** o **Goi Web** | La extraen del bundle / APK / JS del navegador |
| Compartes capturas o logs | Filtración de credenciales |

La connection string es equivalente a la **llave maestra** de la base de datos: lectura, escritura y borrado de todas las tablas (`users`, `posts`, `post_comments`, …).

### Buenas prácticas en este proyecto

| Archivo | ¿En git? | Contenido |
|---------|----------|-----------|
| `.env.example` | ✅ Sí | Plantilla vacía (`DATABASE_URL=`) |
| `.env.local` | ❌ No | URL real de Neon |
| `lib/db.ts` | ✅ Sí | Solo `process.env.DATABASE_URL`, sin secretos hardcodeados |

Los clientes (**Goi App**, **Goi Web**) solo conocen la URL pública del API (`http://localhost:4000/api` en dev), **nunca** `DATABASE_URL`.

---

## 4. Resumen

```
Goi App / Goi Web  →  JWT + JSON  →  Goi Server  →  query($1, [valor])  →  Neon
                                              ↑
                                    DATABASE_URL solo en .env.local
```

1. **Inyección SQL:** concatenar input del usuario en SQL es peligroso.  
2. **Parametrización:** `$1`, `$2` + array de valores en `lib/db.ts`.  
3. **Secretos:** connection string en variables de entorno, no en código ni en apps cliente.

---

## Referencias en el repo

- `lib/db.ts` — helper `query()` parametrizado  
- `.env.example` — plantilla sin secretos  
- `docs/backend-teoria.md` — arquitectura cliente / API / BD  
