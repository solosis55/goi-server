# Auth — emails, tokens de desarrollo y enlaces (Web / App)

Documentación de **Fase 1** para operadores y clientes.  
API base prod: `https://goi-server.onrender.com/api` · Web: `https://go-i.vercel.app`

**Última actualización:** mayo 2026

---

## Variables de entorno (Goi Server)

| Variable | Prod (Render) | Dev local |
|----------|---------------|-----------|
| `RESEND_API_KEY` | Obligatoria para enviar correos | Opcional; sin ella no hay email real |
| `EMAIL_FROM` | Remitente verificado en Resend | Igual o `onboarding@resend.dev` (sandbox) |
| `WEB_APP_URL` | `https://go-i.vercel.app` | `http://localhost:5173` |
| `GOI_PUBLIC_API_URL` | `https://goi-server.onrender.com/api` | Misma URL o local `:4000/api` |
| `AUTH_RESET_RETURN_TOKEN` | **`false` o sin definir** | `true` solo si quieres tokens en JSON sin Resend |

### `AUTH_RESET_RETURN_TOKEN` (ítem backlog 1.3)

Controla qué pasa cuando **no** hay `RESEND_API_KEY`:

| Modo | Comportamiento |
|------|----------------|
| **Prod** | `RESEND_API_KEY` configurada → siempre email real. **No** uses `AUTH_RESET_RETURN_TOKEN=true` en Render. |
| **Dev sin Resend** | `AUTH_RESET_RETURN_TOKEN=true` → la API devuelve el token en JSON (`devResetToken` / `devVerificationToken`) para copiar el enlace en la UI. |
| **Dev sin ninguno** | Registro/forgot/resend responden OK pero **no envían correo** ni devuelven token (solo `console.warn` en el server). |

**Clientes (Web / App):** en `import.meta.env.DEV` / `__DEV__`, si la respuesta trae `devResetToken` o `devVerificationToken`, muestran un bloque con el enlace para pruebas locales.

**Web en desarrollo:** `.env.development` apunta a Render por defecto para que forgot/verify envíen correo igual que la App. Para API 100 % local: `.env.local` con `VITE_API_URL=/api` (sin emails).

**App en desarrollo:** `EXPO_PUBLIC_API_URL=https://goi-server.onrender.com/api` en `.env` (o lo fija `scripts/start-qr.ps1` si detecta URL `https://`).

---

## Enlaces en correos (ítem backlog 1.4)

Los cuerpos se generan en `lib/email/authEmailBodies.ts`.

### Verificación de email (registro / reenvío)

| Destino | URL | Uso |
|---------|-----|-----|
| **Botón del correo (prod)** | `GET {GOI_PUBLIC_API_URL}/auth/verify-email?token=TOKEN` | Verifica en servidor y redirige a la web |
| Web (fallback / dev) | `{WEB_APP_URL}/?verify=TOKEN` | La SPA llama `POST /auth/verify-email` |
| App (deep link) | `goi://verify-email?token=TOKEN` | Pantalla `app/verify-email.tsx` |

**Tras verificar por API:** redirect a `{WEB_APP_URL}/?verified=1` (éxito) o `?verifyError=1` (token inválido/caducado).

**Caducidad:** 24 h.

### Restablecer contraseña (forgot)

| Destino | URL | Uso |
|---------|-----|-----|
| **Botón del correo (prod)** | `GET {GOI_PUBLIC_API_URL}/auth/reset-password?token=TOKEN` | Redirige a la web con el token |
| Web | `{WEB_APP_URL}/?reset=TOKEN` | Formulario “Nueva contraseña” en `AuthPage` → `POST /auth/reset-password` |
| App (deep link) | `goi://reset-password?token=TOKEN` | Pantalla `app/reset-password.tsx` |

**Caducidad:** 1 h.

### Legales (App → navegador)

No van por email; la App abre en el sistema:

- Privacidad: `https://go-i.vercel.app/privacidad`
- Aviso legal: `https://go-i.vercel.app/aviso-legal`

Definido en `Goi App/constants/legalUrls.ts`.

---

## Flujos API (resumen)

```
Registro     POST /auth/register          → crea cuenta (sin enviar email)
             POST /auth/resend-verification → el cliente lo llama justo después del registro
Login        POST /auth/login             → 403 AUTH_EMAIL_NOT_VERIFIED si no verificado
Reenvío      POST /auth/resend-verification
Verify       GET  /auth/verify-email?token=   (email) + POST /auth/verify-email { token }
Forgot       POST /auth/forgot-password   { email }
Reset        GET  /auth/reset-password?token= (email) + POST /auth/reset-password { token, password }
```

**Importante:** el correo de verificación se envía siempre vía `resend-verification` (Web y App lo llaman tras un registro exitoso). Así register y reenvío manual usan el mismo camino Resend.

Contraseña mínima: **8 caracteres** (server + Web + App).

---

## Sesión expirada `AUTH_SESSION_STALE` (ítem 1.13)

Ocurre cuando el JWT es válido pero el **usuario ya no existe** en Neon (cuenta borrada, otro entorno, etc.). El server responde `401` + código `AUTH_SESSION_STALE` en escrituras (p. ej. crear post, like).

| Cliente | Comportamiento |
|---------|----------------|
| **Web** | `apiFetch` emite `auth:expired` con `detail.code` → `AuthContext` limpia `localStorage` → pantalla login con mensaje (`sessionStorage` `goi:sessionExpired`) |
| **App** | `apiFetch` limpia sesión + `AuthNavigationSync` → `/login?sessionExpired=1&stale=1` |

**Prueba manual:** inicia sesión → borra tu usuario en Neon (`delete-user-by-email.mjs`) → intenta crear un post o dar like → debe volver al login con mensaje claro.

---

## Usuarios demo en prod (ítem 1.15)

No debe haber cuentas `*@test.com` ni `*@goi.test` en Neon compartida.

```bash
cd Goi Server
npm run db:audit-demo-users    # listar
npm run db:remove-demo-users   # eliminar
```

`npm run db:seed` es **solo desarrollo local** (inserta `demo@goi.test`).

---

## Sandbox Resend

En modo sandbox, Resend solo entrega a direcciones autorizadas en el dashboard. Para pruebas reales usa el Hotmail verificado o añade el destinatario en Resend.

---

## Referencias en clientes

| Repo | Archivo |
|------|---------|
| Goi Web | `src/pages/AuthPage.tsx`, `src/api/authApi.ts` |
| Goi App | `app/register.tsx`, `app/login.tsx`, `app/forgot-password.tsx`, `app/reset-password.tsx`, `app/verify-email.tsx` |
| Paridad tipos/errores | `Goi App/docs/auth-paridad-web-app.md` |
