// ============================================================
// src/lib/calcularProximoServicio.ts
// Proyecta la fecha del próximo servicio a partir de la frecuencia
// asignada al equipo y la fecha de su último servicio REALIZADO.
//
// Es un cálculo de solo lectura para mostrar en Seguimiento — NO crea
// ni modifica ningún registro en la base de datos. Si ese servicio
// proyectado se termina haciendo, queda como un registro real recién
// cuando alguien lo suba/capture, igual que cualquier otro.
// ============================================================

// Meses entre servicios según la frecuencia. Si agregan una opción
// nueva al <select> de los formularios, hay que sumarla aquí también
// (están en el mismo archivo a propósito, para que no se desincronicen).
const MESES_POR_FRECUENCIA: Record<string, number> = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  CUATRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
  BIANUAL: 24,
};

// Lista para los <select> de frecuencia — un solo lugar de verdad,
// que comparten manual/page.tsx, revisar/page.tsx y Seguimiento.
export const FRECUENCIAS: { valor: string; label: string }[] = [
  { valor: "MENSUAL", label: "Mensual" },
  { valor: "BIMESTRAL", label: "Bimestral" },
  { valor: "TRIMESTRAL", label: "Trimestral" },
  { valor: "CUATRIMESTRAL", label: "Cuatrimestral" },
  { valor: "SEMESTRAL", label: "Semestral" },
  { valor: "ANUAL", label: "Anual" },
  { valor: "BIANUAL", label: "Bianual (cada 2 años)" },
];

/**
 * Devuelve la fecha estimada del próximo servicio (YYYY-MM-DD), o null si
 * la frecuencia no viene asignada o no se reconoce.
 */
export function calcularProximoServicio(
  ultimaFecha: string | Date,
  frecuencia: string | null | undefined
): string | null {
  if (!frecuencia) return null;

  const meses = MESES_POR_FRECUENCIA[frecuencia.trim().toUpperCase()];
  if (!meses) return null;

  // postgres.js devuelve columnas DATE como objetos Date del lado del
  // servidor, pero como string ISO ya del lado del cliente (después de
  // pasar por JSON) — mismo patrón defensivo que calcularEstado.ts.
  const fecha =
    ultimaFecha instanceof Date
      ? new Date(ultimaFecha.getTime())
      : new Date(ultimaFecha.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(fecha.getTime())) return null;

  fecha.setMonth(fecha.getMonth() + meses);
  return fecha.toISOString().slice(0, 10);
}
