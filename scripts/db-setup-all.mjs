/**
 * Aplica todas las migraciones de esquema en Neon (orden correcto).
 * Ejecutar una vez por entorno o tras pull con cambios en sql/.
 *
 * Uso: npm run db:setup
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  "node scripts/ensure-user-profile-columns.mjs",
  "node scripts/ensure-social-tables.mjs",
  "node scripts/ensure-auth-profile-extras.mjs",
  "node scripts/ensure-user-geo-columns.mjs",
];

console.log("Configurando esquema Neon para Goi Server…\n");

for (const cmd of steps) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

console.log("\nListo. Reinicia Goi Server (npm run dev) y recarga Web/App.");
