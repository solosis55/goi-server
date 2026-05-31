# Scripts SQL — Goi Server

## `schema.sql`

Crea las **tres tablas iniciales** del dominio Goi:

| Tabla | Rol (analogía NoteFlow) |
|-------|-------------------------|
| `users` | Cuentas |
| `posts` | Publicaciones (`notes`) |
| `post_comments` | Comentarios (`checklist_items` / relación 1-N) |

## Cómo aplicarlo

### Opción A — Consola Neon (recomendada en la práctica)

1. [Neon Dashboard](https://console.neon.tech) → tu proyecto → **SQL Editor**
2. Abre `schema.sql`, copia todo el contenido
3. **Run**
4. Comprueba en **Tables** que existen `users`, `posts`, `post_comments`

### Opción B — Desde el repo

Con `.env.local` configurado:

```bash
npm run db:schema
```

## Re-ejecutar

El script usa `CREATE TABLE IF NOT EXISTS`: es idempotente para tablas nuevas.  
Si cambias columnas más adelante, usarás migraciones `ALTER` (fase posterior).
