// ============================================================
// src/lib/consultarServicios.ts
// Query compartida entre GET /api/servicios (para la pantalla de
// Seguimiento) y GET /api/servicios/exportar (para el Excel) — mismos
// filtros, mismas columnas, para que lo que se ve en pantalla sea
// exactamente lo que se exporta.
// ============================================================

import sql from "@/lib/db";

export interface FiltrosServicios {
  clienteId?: number;
  estado?: string;
  equipoId?: number;
  q?: string;
  limit?: number;
}

export async function consultarServicios(filtros: FiltrosServicios) {
  const { clienteId, estado, equipoId, q, limit = 100 } = filtros;

  return sql`
    SELECT
      s.id,
      s.fecha,
      s.estado,
      s.no_certificado_calibracion,
      s.cotizacion,
      s.created_at,
      s.updated_at,
      -- Equipo
      e.id            AS equipo_id,
      e.usuario,
      e.area,
      e.marca,
      e.modelo,
      e.serie,
      e.capacidad,
      e.codigo_interno,
      e.frecuencia,
      -- Cliente
      c.id            AS cliente_id,
      c.nombre_empresa,
      c.region,
      c.cod_cliente,
      -- Orden de trabajo
      ot.id           AS orden_id,
      ot.tipo_formato,
      ot.no_correlativo,
      ot.actividad,
      ot.tecnico
    FROM servicios s
    JOIN equipos e         ON s.equipo_id = e.id
    JOIN clientes c        ON e.cliente_id = c.id
    JOIN ordenes_trabajo ot ON s.orden_trabajo_id = ot.id
    WHERE
      ${clienteId ? sql`e.cliente_id = ${clienteId}` : sql`TRUE`}
      AND ${estado ? sql`s.estado = ${estado}` : sql`TRUE`}
      AND ${equipoId ? sql`s.equipo_id = ${equipoId}` : sql`TRUE`}
      AND ${
        q
          ? sql`(
              e.marca ILIKE ${"%" + q + "%"} OR
              e.modelo ILIKE ${"%" + q + "%"} OR
              e.serie ILIKE ${"%" + q + "%"} OR
              c.nombre_empresa ILIKE ${"%" + q + "%"}
            )`
          : sql`TRUE`
      }
    ORDER BY s.fecha DESC
    LIMIT ${limit}
  `;
}
