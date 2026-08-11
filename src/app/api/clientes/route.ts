// ============================================================
// src/app/api/clientes/route.ts
// GET /api/clientes — Lista todos los clientes
// POST /api/clientes — Crea un nuevo cliente
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const clientes = await sql`
      SELECT * FROM clientes
      ORDER BY nombre_empresa ASC
    `;
    return NextResponse.json(clientes);
  } catch (error) {
    console.error("[GET /api/clientes]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.nombre_empresa) {
      return NextResponse.json(
        { error: "nombre_empresa es requerido" },
        { status: 400 }
      );
    }

    const [cliente] = await sql`
      INSERT INTO clientes (nombre_empresa, cod_cliente, region, direccion, telefono, correo_electronico)
      VALUES (
        ${body.nombre_empresa},
        ${body.cod_cliente ?? null},
        ${body.region ?? null},
        ${body.direccion ?? null},
        ${body.telefono ?? null},
        ${body.correo_electronico ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("[POST /api/clientes]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
