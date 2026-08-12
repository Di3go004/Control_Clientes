// ============================================================
// src/app/api/servicios/[id]/route.ts
// PATCH /api/servicios/:id — edita a mano un servicio ya guardado
//
// El plan del proyecto deja esto como decisión cerrada: el estado se
// calcula solo (fecha vs. hoy) al crear el servicio, pero después debe
// quedar editable a mano sin que el sistema lo sobreescriba. Por eso
// este endpoint solo toca los campos que vengan explícitos en el body
// — nunca recalcula nada por su cuenta.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import type { EstadoServicio } from "@/types";

const ESTADOS_VALIDOS: EstadoServicio[] = ["REALIZADO", "PENDIENTE", "PROXIMO"];

// Campos de `servicios` que se pueden editar a mano desde la app.
const CAMPOS_EDITABLES = ["fecha", "estado", "no_certificado_calibracion", "cotizacion"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servicioId = Number(id);

    if (!Number.isInteger(servicioId) || servicioId <= 0) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();

    if (body.estado !== undefined && !ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    // Solo se actualizan los campos que vengan presentes en el body,
    // y solo si están en la lista blanca de campos editables.
    const campos: Record<string, string | null> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (body[campo] !== undefined) campos[campo] = body[campo];
    }

    const columnas = Object.keys(campos);
    if (columnas.length === 0) {
      return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
    }

    const [servicio] = await sql`
      UPDATE servicios SET ${sql(campos, columnas)}
      WHERE id = ${servicioId}
      RETURNING *
    `;

    if (!servicio) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(servicio);
  } catch (error) {
    console.error("[PATCH /api/servicios/:id]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
