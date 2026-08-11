// ============================================================
// src/app/api/analizar/route.ts
// POST /api/analizar
//
// Recibe una imagen (multipart/form-data, campo: "imagen"),
// la guarda en /uploads/, la analiza con Gemini y devuelve
// el JSON estructurado para que el usuario lo revise antes
// de guardar. NUNCA guarda nada en la base de datos — eso
// lo hace el usuario al confirmar en el frontend.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import gemini, { MODELO } from "@/lib/gemini";
import { PROMPT_ANALISIS } from "@/lib/promptAnalisis";

// Tipos de imagen aceptados
const MIME_TYPES_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;
type MimePermitido = (typeof MIME_TYPES_PERMITIDOS)[number];

// Tamaño máximo: 10 MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Leer el form-data
    const formData = await req.formData();
    const archivo = formData.get("imagen") as File | null;

    if (!archivo) {
      return NextResponse.json(
        { error: 'El campo "imagen" es requerido' },
        { status: 400 }
      );
    }

    // 2. Validar tipo y tamaño
    if (!MIME_TYPES_PERMITIDOS.includes(archivo.type as MimePermitido)) {
      return NextResponse.json(
        { error: `Tipo de archivo no soportado. Usa: ${MIME_TYPES_PERMITIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    if (archivo.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "La imagen no puede superar los 10 MB" },
        { status: 400 }
      );
    }

    // 3. Guardar la imagen en el volumen local /uploads/
    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const extension = archivo.type.split("/")[1]; // jpeg, png, webp
    const nombreArchivo = `captura_${timestamp}.${extension}`;
    const rutaCompleta = path.join(uploadDir, nombreArchivo);
    const rutaRelativa = `/uploads/${nombreArchivo}`; // para guardar en imagen_url

    await writeFile(rutaCompleta, buffer);

    // 4. Enviar a Gemini con el prompt de análisis
    const base64 = buffer.toString("base64");

    const respuesta = await gemini.models.generateContent({
      model: MODELO,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: archivo.type as MimePermitido,
                data: base64,
              },
            },
            {
              text: PROMPT_ANALISIS,
            },
          ],
        },
      ],
      config: {
        temperature: 0,       // máxima determinismo — no queremos creatividad
        maxOutputTokens: 2048,
      },
    });

    const textoRespuesta = respuesta.text ?? "";

    // 5. Parsear el JSON devuelto por Gemini
    const datosExtraidos = extraerJSON(textoRespuesta);

    if (!datosExtraidos) {
      console.error("[/api/analizar] Respuesta de Gemini no parseable:", textoRespuesta);
      return NextResponse.json(
        {
          error: "Gemini no devolvió un JSON válido. Intenta con una imagen más nítida.",
          rawResponse: textoRespuesta, // incluido para debug durante la iteración
        },
        { status: 422 }
      );
    }

    // 6. Devolver los datos para revisión + la ruta de la imagen guardada
    return NextResponse.json({
      imagen_url: rutaRelativa,
      datos: datosExtraidos,
    });

  } catch (error) {
    console.error("[POST /api/analizar]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------
// Helper: extrae el primer objeto JSON válido del texto de Gemini.
// A veces Gemini añade ```json ... ``` aunque le pidas que no.
// ----------------------------------------------------------------
function extraerJSON(texto: string): Record<string, unknown> | null {
  try {
    // Intento directo primero
    return JSON.parse(texto);
  } catch {
    // Buscar JSON entre bloques de código markdown
    const match = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // silencioso
      }
    }

    // Buscar el primer { ... } en el texto
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio !== -1 && fin !== -1) {
      try {
        return JSON.parse(texto.slice(inicio, fin + 1));
      } catch {
        // silencioso
      }
    }

    return null;
  }
}
