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

// Reintentos cuando Gemini responde "modelo saturado" (503/UNAVAILABLE) o
// "límite de uso alcanzado" (429/RESOURCE_EXHAUSTED) — según la propia
// Google, son picos de demanda normalmente temporales. También reintenta
// cuando el JSON sale incompleto (ver analizarImagenConReintento). Probado
// en vivo: de 5 llamadas a la misma imagen, 4 necesitaron 1-2 reintentos
// por JSON incompleto y 1 se quedó sin intentos con el tope anterior de 3
// — por eso quedó en 4.
const INTENTOS_GEMINI = 4;
const ESPERA_BASE_MS = 2000;

function detalleErrorGemini(error: unknown): { status?: number; mensaje: string } {
  if (!error || typeof error !== "object") return { mensaje: "" };
  const status = "status" in error ? (error as { status: unknown }).status : undefined;
  const mensaje = "message" in error ? String((error as { message: unknown }).message) : "";
  return { status: typeof status === "number" ? status : undefined, mensaje };
}

// Caso especial dentro de los 429: la capa gratis de Google AI Studio da un
// número fijo de análisis AL DÍA (confirmado en producción: 20/día para
// gemini-3.5-flash — el mensaje de error trae "GenerateRequestsPerDayPerProjectPerModel-FreeTier").
// Reintentar acá no sirve de nada, no se va a liberar en un par de segundos.
function esCuotaDiariaAgotada(error: unknown): boolean {
  const { status, mensaje } = detalleErrorGemini(error);
  return status === 429 && /PerDay/i.test(mensaje);
}

// 503 (modelo saturado) o 429 que NO sea la cuota diaria (ej. ráfaga corta
// de solicitudes) — estos sí vale la pena reintentar en unos segundos.
function esErrorTemporal(error: unknown): boolean {
  if (esCuotaDiariaAgotada(error)) return false;
  const { status, mensaje } = detalleErrorGemini(error);
  if (status === 503 || status === 429) return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(mensaje);
}

function esperar(intento: number) {
  return new Promise(resolve => setTimeout(resolve, intento * ESPERA_BASE_MS));
}

interface ResultadoAnalisisGemini {
  datosExtraidos: Record<string, unknown> | null;
  textoRespuesta: string;
  finishReason: unknown;
}

/**
 * Llama a Gemini y reintenta hasta INTENTOS_GEMINI veces cuando:
 *   a) Gemini responde 503/429 (saturado) — se reintenta la llamada tal cual.
 *   b) Gemini responde 200 pero el texto no parsea como JSON — pasa de vez
 *      en cuando, incluso con responseMimeType:"application/json" (el
 *      modelo a veces corta el JSON a medias aunque reporte finishReason
 *      "STOP", no solo con "MAX_TOKENS"). Como no es determinístico, volver
 *      a pedirle la misma imagen casi siempre da un JSON completo la
 *      siguiente vez — confirmado probando la misma captura varias veces.
 */
async function analizarImagenConReintento(
  params: Parameters<typeof gemini.models.generateContent>[0]
): Promise<ResultadoAnalisisGemini> {
  let ultimoIntento: ResultadoAnalisisGemini | null = null;

  for (let intento = 1; intento <= INTENTOS_GEMINI; intento++) {
    const quedanIntentos = intento < INTENTOS_GEMINI;
    let respuesta;

    try {
      respuesta = await gemini.models.generateContent(params);
    } catch (error) {
      if (!esErrorTemporal(error) || !quedanIntentos) throw error;
      console.warn(`[/api/analizar] Gemini saturado, reintentando (${intento}/${INTENTOS_GEMINI})…`);
      await esperar(intento);
      continue;
    }

    const textoRespuesta = respuesta.text ?? "";
    const finishReason = respuesta.candidates?.[0]?.finishReason;
    const datosExtraidos = extraerJSON(textoRespuesta);

    if (datosExtraidos) {
      return { datosExtraidos, textoRespuesta, finishReason };
    }

    ultimoIntento = { datosExtraidos: null, textoRespuesta, finishReason };
    if (quedanIntentos) {
      // Sin espera: no es un problema de saturación (eso ya se maneja arriba),
      // así que no hay razón para no pedirle de inmediato que lo intente de nuevo.
      console.warn(`[/api/analizar] JSON no parseable (razón: ${finishReason}), reintentando (${intento}/${INTENTOS_GEMINI})…`);
    }
  }

  // Se agotaron los intentos sin conseguir un JSON válido.
  return ultimoIntento!;
}

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

    // 4 y 5. Enviar a Gemini y parsear el JSON — reintenta sola si Gemini
    // está saturado o si el JSON sale incompleto (ver analizarImagenConReintento).
    const { datosExtraidos, textoRespuesta, finishReason } = await analizarImagenConReintento({
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
        temperature: 0.1, // Evitar 0 absoluto, a veces causa cortes abruptos en algunos modelos
        responseMimeType: "application/json", // Fuerza JSON nativo — menos casos para extraerJSON()
        // Eliminamos maxOutputTokens para usar el máximo por defecto del modelo
      },
    });

    if (!datosExtraidos) {
      console.error(`[/api/analizar] Respuesta de Gemini no parseable tras ${INTENTOS_GEMINI} intentos. Razón de corte:`, finishReason);
      console.error("Último texto devuelto:", textoRespuesta);
      return NextResponse.json(
        {
          error: `Gemini devolvió una respuesta incompleta ${INTENTOS_GEMINI} veces seguidas. Intenta de nuevo — normalmente en el siguiente intento sale bien.`,
          rawResponse: textoRespuesta,
          finishReason,
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

    if (esCuotaDiariaAgotada(error)) {
      return NextResponse.json(
        {
          error: "Se acabó la cuota gratis de Gemini por hoy. Vuelve a intentar más tarde o mañana — mientras tanto puedes usar \"Ingreso manual\".",
        },
        { status: 429 }
      );
    }

    if (esErrorTemporal(error)) {
      return NextResponse.json(
        { error: "Gemini está saturado ahorita. Espera unos segundos y presiona \"Analizar captura\" de nuevo." },
        { status: 503 }
      );
    }

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
