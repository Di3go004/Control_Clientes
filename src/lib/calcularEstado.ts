// ============================================================
// src/lib/calcularEstado.ts
// Calcula el estado de un servicio en función de su fecha vs hoy.
//
// Reglas (según el plan del proyecto):
//   - fecha < hoy              → REALIZADO
//   - fecha en los próximos 30 días → PROXIMO
//   - fecha > 30 días desde hoy    → PENDIENTE
// ============================================================

import type { EstadoServicio } from "@/types";

const DIAS_PROXIMO = 30;

export function calcularEstado(fechaServicio: string | Date): EstadoServicio {
  const fecha =
    fechaServicio instanceof Date
      ? fechaServicio
      : new Date(fechaServicio + "T00:00:00"); // forzar interpretación local

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffMs = fecha.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return "REALIZADO";
  if (diffDias <= DIAS_PROXIMO) return "PROXIMO";
  return "PENDIENTE";
}
