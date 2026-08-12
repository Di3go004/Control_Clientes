// ============================================================
// src/app/uploads/[archivo]/route.ts
// GET /uploads/:archivo — sirve las imágenes de capturas guardadas
// por /api/analizar en el volumen local.
//
// Next.js solo sirve estáticos automáticamente desde `public/`. El
// volumen de uploads vive fuera de `public/` a propósito (es un
// volumen Docker independiente, /app/uploads, montado aparte de la
// build de la app) — por eso hace falta esta ruta para poder verlas.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Mismo patrón que genera /api/analizar: captura_<timestamp>.<ext>
// Validar contra esto evita path traversal (../, rutas absolutas, etc.)
// vía el parámetro de la URL.
const NOMBRE_VALIDO = /^captura_\d+\.(jpe?g|png|webp)$/i;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ archivo: string }> }
) {
  const { archivo } = await params;

  if (!NOMBRE_VALIDO.test(archivo)) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const extension = archivo.split(".").pop()!.toLowerCase();
  const rutaCompleta = path.join(process.cwd(), "uploads", archivo);

  try {
    const buffer = await readFile(rutaCompleta);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        // El nombre incluye un timestamp único — nunca cambia una vez creado.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
