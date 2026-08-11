// ============================================================
// src/app/api/servicios/route.ts
// GET /api/servicios — Lista servicios con detalle de equipo y cliente
//
// Query params opcionales:
//   ?cliente_id=1          → filtra por cliente
//   ?estado=PENDIENTE      → filtra por estado (REALIZADO | PENDIENTE | PROXIMO)
//   ?equipo_id=3           → filtra por equipo
//   ?limit=50              → límite de resultados (default: 100)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { EstadoServicio } from "@/types";

const ESTADOS_VALIDOS: EstadoServicio[] = ["REALIZADO", "PENDIENTE", "PROXIMO"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");
    const estado = searchParams.get("estado") as EstadoServicio | null;
    const equipo_id = searchParams.get("equipo_id");
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    // Validar estado si se pasa
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    const servicios = await sql`
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
        ${cliente_id ? sql`e.cliente_id = ${Number(cliente_id)}` : sql`TRUE`}
        AND ${estado ? sql`s.estado = ${estado}` : sql`TRUE`}
        AND ${equipo_id ? sql`s.equipo_id = ${Number(equipo_id)}` : sql`TRUE`}
      ORDER BY s.fecha DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("[GET /api/servicios]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
