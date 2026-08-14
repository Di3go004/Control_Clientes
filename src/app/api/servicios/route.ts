// ============================================================
// src/app/api/servicios/route.ts
// GET /api/servicios — Lista servicios con detalle de equipo y cliente
//
// Query params opcionales:
//   ?cliente_id=1          → filtra por cliente
//   ?estado=PENDIENTE      → filtra por estado (REALIZADO | PENDIENTE | PROXIMO)
//   ?equipo_id=3           → filtra por equipo
//   ?q=mettler             → búsqueda libre en marca/modelo/serie/cliente
//   ?limit=50              → límite de resultados (default: 100)
//
// Ver también /api/servicios/exportar — mismos filtros, pero en Excel.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import type { EstadoServicio } from "@/types";
import { consultarServicios } from "@/lib/consultarServicios";

const ESTADOS_VALIDOS: EstadoServicio[] = ["REALIZADO", "PENDIENTE", "PROXIMO"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");
    const estado = searchParams.get("estado") as EstadoServicio | null;
    const equipo_id = searchParams.get("equipo_id");
    const q = searchParams.get("q");
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    // Validar estado si se pasa
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    const servicios = await consultarServicios({
      clienteId: cliente_id ? Number(cliente_id) : undefined,
      estado: estado ?? undefined,
      equipoId: equipo_id ? Number(equipo_id) : undefined,
      q: q ?? undefined,
      limit,
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("[GET /api/servicios]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
