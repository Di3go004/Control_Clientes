// ============================================================
// src/app/api/ordenes/route.ts
// POST /api/ordenes — Crea una orden de trabajo confirmada
//
// Flujo:
//   1. Valida el payload
//   2. Por cada equipo en la lista:
//      - Busca por número de serie en la tabla `equipos`
//      - Si existe → usa ese equipo_id
//      - Si no existe (o serie es null/S/S) → crea el equipo
//   3. Calcula el estado del servicio (fecha vs hoy)
//   4. Inserta en ordenes_trabajo
//   5. Inserta un registro en servicios por cada equipo
//   6. Devuelve la orden creada con sus servicios
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { calcularEstado } from "@/lib/calcularEstado";
import type { CrearOrdenPayload, EquipoInput } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: CrearOrdenPayload = await req.json();

    // --- Validación básica ---
    if (!body.cliente_id || !body.tipo_formato || !body.fecha || !body.fuente) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: cliente_id, tipo_formato, fecha, fuente" },
        { status: 400 }
      );
    }

    if (!body.equipos || body.equipos.length === 0) {
      return NextResponse.json(
        { error: "La orden debe incluir al menos un equipo" },
        { status: 400 }
      );
    }

    // --- Ejecutar todo en una transacción ---
    const resultado = await sql.begin(async (tx) => {

      // 1. Insertar la orden de trabajo
      const [orden] = await tx`
        INSERT INTO ordenes_trabajo (
          cliente_id, tipo_formato, no_correlativo, fecha,
          atencion_de, telefono, correo_electronico, direccion,
          tecnico, elaboracion, actividad,
          cod_cliente, descripcion_trabajo,
          no_certificado_calibracion, cotizacion, observaciones,
          fuente, imagen_url
        ) VALUES (
          ${body.cliente_id},
          ${body.tipo_formato},
          ${body.no_correlativo ?? null},
          ${body.fecha},
          ${body.atencion_de ?? null},
          ${body.telefono ?? null},
          ${body.correo_electronico ?? null},
          ${body.direccion ?? null},
          ${body.tecnico ?? null},
          ${body.elaboracion ?? null},
          ${body.actividad ?? null},
          ${body.cod_cliente ?? null},
          ${body.descripcion_trabajo ?? null},
          ${body.no_certificado_calibracion ?? null},
          ${body.cotizacion ?? null},
          ${body.observaciones ?? null},
          ${body.fuente},
          ${body.imagen_url ?? null}
        )
        RETURNING *
      `;

      // 2. Procesar cada equipo: buscar o crear
      const serviciosInsertados = [];

      for (const equipoInput of body.equipos) {
        const equipo_id = await resolverEquipo(tx, body.cliente_id, equipoInput);

        // 3. Calcular estado automáticamente
        const estado = calcularEstado(body.fecha);

        // 4. Insertar servicio
        const [servicio] = await tx`
          INSERT INTO servicios (
            equipo_id, orden_trabajo_id, fecha, estado,
            no_certificado_calibracion, cotizacion
          ) VALUES (
            ${equipo_id},
            ${orden.id},
            ${body.fecha},
            ${estado},
            ${body.no_certificado_calibracion ?? null},
            ${body.cotizacion ?? null}
          )
          RETURNING *
        `;

        serviciosInsertados.push(servicio);
      }

      return { orden, servicios: serviciosInsertados };
    });

    return NextResponse.json(resultado, { status: 201 });

  } catch (error) {
    console.error("[POST /api/ordenes]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------
// GET /api/ordenes — Lista órdenes recientes (últimas 50)
// ----------------------------------------------------------------
export async function GET() {
  try {
    const ordenes = await sql`
      SELECT
        ot.*,
        c.nombre_empresa,
        c.region
      FROM ordenes_trabajo ot
      JOIN clientes c ON ot.cliente_id = c.id
      ORDER BY ot.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error("[GET /api/ordenes]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------
// Helper: busca un equipo por serie o crea uno nuevo
// ----------------------------------------------------------------
async function resolverEquipo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  cliente_id: number,
  input: EquipoInput
): Promise<number> {
  const serie = normalizarSerie(input.serie);

  // Si tiene serie válida, buscar primero
  if (serie) {
    const [existente] = await tx`
      SELECT id FROM equipos WHERE serie = ${serie} LIMIT 1
    `;
    if (existente) return existente.id;
  }

  // No existe (o es S/S) → crear equipo nuevo
  const [nuevo] = await tx`
    INSERT INTO equipos (
      cliente_id, marca, modelo, serie, capacidad,
      codigo_interno, usuario, area, frecuencia
    ) VALUES (
      ${cliente_id},
      ${input.marca ?? null},
      ${input.modelo ?? null},
      ${serie},
      ${input.capacidad ?? null},
      ${input.codigo_interno ?? null},
      ${input.usuario ?? null},
      ${input.area ?? null},
      ${input.frecuencia ?? null}
    )
    RETURNING id
  `;

  return nuevo.id;
}

/** Normaliza el número de serie: convierte "S/S", vacío o null → null */
function normalizarSerie(serie: string | null | undefined): string | null {
  if (!serie) return null;
  const limpio = serie.trim().toUpperCase();
  if (limpio === "S/S" || limpio === "" || limpio === "N/A") return null;
  return serie.trim(); // conservar capitalización original
}
