// ============================================================
// src/lib/gemini.ts
// Cliente de Gemini compartido para toda la app.
// Modelo: ver constante MODELO abajo — es el único lugar que hay
// que tocar para cambiar de versión (ej. si Google retira una).
// ============================================================

import { GoogleGenAI } from "@google/genai";

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenAI | undefined;
};

const gemini =
  globalForGemini.gemini ??
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

if (process.env.NODE_ENV !== "production") {
  globalForGemini.gemini = gemini;
}

export const MODELO = "gemini-3.5-flash";

export default gemini;
