// ============================================================
// src/app/api/equipos/[id]/route.ts
// PATCH /api/equipos/:id — edita un equipo ya existente
//
// Pensado sobre todo para poder asignar/corregir la frecuencia de
// equipos que ya se cargaron sin ese dato (ni el ingreso manual ni la
// revisión de IA lo pedían hasta ahora) — pero permite corregir
// cualquiera de los campos editables de la tabla `equipos`.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// Campos de `equipos` que se pueden editar a mano desde la app.
// cliente_id no está — mover un equipo a otro cliente es un caso
// aparte que no está resuelto todavía (¿qué pasa con su historial?).
const CAMPOS_EDITABLES = [
  "usuario",
  "area",
  "marca",
  "modelo",
  "serie",
  "codigo_interno",
  "capacidad",
  "frecuencia",
  "notas",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const equipoId = Number(id);

    if (!Number.isInteger(equipoId) || equipoId <= 0) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();

    const campos: Record<string, string | null> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (body[campo] !== undefined) campos[campo] = body[campo];
    }

    const columnas = Object.keys(campos);
    if (columnas.length === 0) {
      return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
    }

    // Normaliza serie igual que al crear el equipo: "S/S"/vacío → null,
    // nunca se guarda como número (ver resolverEquipo en /api/ordenes).
    if (typeof campos.serie === "string") {
      const limpio = campos.serie.trim().toUpperCase();
      campos.serie = limpio === "S/S" || limpio === "" || limpio === "N/A" ? null : campos.serie.trim();
    }

    const [equipo] = await sql`
      UPDATE equipos SET ${sql(campos, columnas)}
      WHERE id = ${equipoId}
      RETURNING *
    `;

    if (!equipo) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(equipo);
  } catch (error) {
    // Violación de UNIQUE en serie (ya existe otro equipo con esa serie)
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe otro equipo con ese número de serie" },
        { status: 409 }
      );
    }
    console.error("[PATCH /api/equipos/:id]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
