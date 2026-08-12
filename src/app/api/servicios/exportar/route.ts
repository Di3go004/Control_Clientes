// ============================================================
// src/app/api/servicios/exportar/route.ts
// GET /api/servicios/exportar — descarga un Excel (.xlsx) con el
// historial de servicios: una fila por servicio, sin límite de
// columnas (a propósito — ver Docs/plan_proyecto_ordenes_trabajo.md,
// esto reemplaza el Excel de control que tenía tope de 5 servicios).
//
// Acepta los mismos filtros que GET /api/servicios (cliente_id,
// estado, equipo_id, q) para exportar exactamente lo que se está
// viendo en la pantalla de Seguimiento.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { EstadoServicio } from "@/types";
import { consultarServicios } from "@/lib/consultarServicios";
import { calcularProximoServicio } from "@/lib/calcularProximoServicio";

const ESTADOS_VALIDOS: EstadoServicio[] = ["REALIZADO", "PENDIENTE", "PROXIMO"];

// Mismos colores que las badges de estado en la app (ver globals.css).
const COLOR_ESTADO: Record<string, string> = {
  REALIZADO: "FFDCECDC",
  PENDIENTE: "FFFCE8C7",
  PROXIMO: "FF99DAFE",
};

interface FilaServicio {
  id: number;
  fecha: string | Date;
  estado: EstadoServicio;
  no_certificado_calibracion: string | null;
  cotizacion: string | null;
  equipo_id: number;
  usuario: string | null;
  area: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  capacidad: string | null;
  codigo_interno: string | null;
  frecuencia: string | null;
  nombre_empresa: string;
  region: string | null;
  tipo_formato: string;
  no_correlativo: string | null;
  actividad: string | null;
  tecnico: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");
    const estado = searchParams.get("estado") as EstadoServicio | null;
    const equipo_id = searchParams.get("equipo_id");
    const q = searchParams.get("q");

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Valores válidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    const filas = (await consultarServicios({
      clienteId: cliente_id ? Number(cliente_id) : undefined,
      estado: estado ?? undefined,
      equipoId: equipo_id ? Number(equipo_id) : undefined,
      q: q ?? undefined,
      limit: 10000,
    })) as unknown as FilaServicio[];

    // "Próximo estimado" solo tiene sentido en la fila más reciente
    // REALIZADA de cada equipo — si se calculara en cada fila histórica,
    // las filas viejas mostrarían una fecha "próxima" que ya pasó hace rato.
    const masRecientePorEquipo = new Map<number, FilaServicio>();
    for (const f of filas) {
      if (f.estado !== "REALIZADO") continue;
      const actual = masRecientePorEquipo.get(f.equipo_id);
      if (!actual || f.fecha > actual.fecha) masRecientePorEquipo.set(f.equipo_id, f);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Soluciones Exactas";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Seguimiento");
    sheet.columns = [
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Región", key: "region", width: 14 },
      { header: "Usuario", key: "usuario", width: 20 },
      { header: "Área", key: "area", width: 18 },
      { header: "Marca", key: "marca", width: 16 },
      { header: "Modelo", key: "modelo", width: 16 },
      { header: "Serie", key: "serie", width: 16 },
      { header: "Código interno", key: "codigo_interno", width: 14 },
      { header: "Capacidad", key: "capacidad", width: 16 },
      { header: "Frecuencia", key: "frecuencia", width: 14 },
      { header: "Formato", key: "tipo_formato", width: 14 },
      { header: "Actividad", key: "actividad", width: 16 },
      { header: "Técnico", key: "tecnico", width: 16 },
      { header: "Fecha de servicio", key: "fecha", width: 16 },
      { header: "Estado", key: "estado", width: 12 },
      { header: "Próximo servicio estimado", key: "proximo", width: 22 },
      { header: "Certificado", key: "certificado", width: 24 },
      { header: "Cotización", key: "cotizacion", width: 18 },
      { header: "No. correlativo", key: "no_correlativo", width: 14 },
    ];

    // Encabezado con los colores de Precision Logic
    const encabezado = sheet.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF06007C" } };
    encabezado.alignment = { vertical: "middle" };

    for (const f of filas) {
      const esMasReciente = masRecientePorEquipo.get(f.equipo_id)?.id === f.id;
      const proximo = esMasReciente ? calcularProximoServicio(f.fecha, f.frecuencia) : null;

      const fila = sheet.addRow({
        cliente: f.nombre_empresa,
        region: f.region ?? "",
        usuario: f.usuario ?? "",
        area: f.area ?? "",
        marca: f.marca ?? "",
        modelo: f.modelo ?? "",
        serie: f.serie ?? "S/S",
        codigo_interno: f.codigo_interno ?? "",
        capacidad: f.capacidad ?? "",
        frecuencia: f.frecuencia ?? "",
        tipo_formato: f.tipo_formato,
        actividad: f.actividad ?? "",
        tecnico: f.tecnico ?? "",
        fecha: new Date(f.fecha),
        estado: f.estado,
        proximo: proximo ? new Date(proximo) : "",
        certificado: f.no_certificado_calibracion ?? "",
        cotizacion: f.cotizacion ?? "",
        no_correlativo: f.no_correlativo ?? "",
      });

      fila.getCell("fecha").numFmt = "dd/mm/yyyy";
      fila.getCell("proximo").numFmt = "dd/mm/yyyy";

      const colorEstado = COLOR_ESTADO[f.estado];
      if (colorEstado) {
        fila.getCell("estado").fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorEstado } };
      }
    }

    sheet.autoFilter = { from: "A1", to: "S1" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const fechaArchivo = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="seguimiento_${fechaArchivo}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/servicios/exportar]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
