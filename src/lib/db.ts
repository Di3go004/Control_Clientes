// ============================================================
// src/lib/db.ts
// Cliente de PostgreSQL compartido para toda la app.
// Usa postgres.js (https://github.com/porsager/postgres)
// ============================================================

import postgres from "postgres";

// En desarrollo Next.js recarga módulos con hot-reload,
// lo que crearía una nueva conexión por cada recarga.
// El patrón globalThis evita ese problema.
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    // postgres.js abre un pool automáticamente
    max: 10,              // máximo de conexiones simultáneas
    idle_timeout: 20,     // segundos antes de cerrar una conexión idle
    connect_timeout: 10,  // segundos de espera para establecer la conexión
    // Desactiva el SSL en red local (el tráfico no sale de la empresa)
    ssl: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export default sql;
