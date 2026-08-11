// ============================================================
// src/app/api/equipos/route.ts
// GET /api/equipos — Lista equipos con datos del cliente
//
// Query params opcionales:
//   ?cliente_id=1     → filtra por cliente
//   ?serie=ABC123     → busca por número de serie
//   ?q=mettler        → búsqueda libre en marca/modelo/serie
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");
    const serie = searchParams.get("serie");
    const q = searchParams.get("q");

    const equipos = await sql`
      SELECT
        e.*,
        c.nombre_empresa,
        c.region,
        c.cod_cliente
      FROM equipos e
      JOIN clientes c ON e.cliente_id = c.id
      WHERE
        ${cliente_id ? sql`e.cliente_id = ${Number(cliente_id)}` : sql`TRUE`}
        AND ${serie ? sql`e.serie = ${serie}` : sql`TRUE`}
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
      ORDER BY c.nombre_empresa, e.marca, e.modelo
    `;

    return NextResponse.json(equipos);
  } catch (error) {
    console.error("[GET /api/equipos]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
