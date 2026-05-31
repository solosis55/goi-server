import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 520 }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Goi Server</h1>
      <p style={{ color: "#555", lineHeight: 1.5 }}>
        Backend REST de <strong>Goi</strong> (Next.js + PostgreSQL en Neon). Los clientes{" "}
        <strong>Goi App</strong> y <strong>Goi Web</strong> consumen las rutas bajo{" "}
        <code>/api</code>.
      </p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <Link href="/api/health">GET /api/health</Link> — servidor vivo
        </li>
        <li>
          <Link href="/api/health/db">GET /api/health/db</Link> — prueba Neon (<code>SELECT 1</code>)
        </li>
        <li>
          <Link href="/api/posts">GET /api/posts</Link> — listar publicaciones (CRUD Fase 7)
        </li>
      </ul>
    </main>
  );
}
