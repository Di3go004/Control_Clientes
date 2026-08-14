// ============================================================
// src/lib/coincidirCliente.ts
// Compara el nombre de cliente que detectó Gemini contra la lista de
// clientes ya registrados, para preseleccionarlo en la pantalla de
// revisión — el técnico igual puede cambiarlo si no es el correcto,
// esto solo le ahorra tener que buscarlo a mano cada vez.
//
// Usa distancia de edición (Levenshtein) en vez de comparación exacta
// porque el nombre viene tal cual está escrito en el papel — que a
// veces trae erratas (ej. "Corrrales" con 3 erres) que ya se corrigieron
// al registrar el cliente en la base.
// ============================================================

interface ClienteConNombre {
  id: number;
  nombre_empresa: string;
}

// Qué tan parecidos tienen que ser dos nombres para considerarlos el mismo
// cliente (1 = idénticos). 0.82 deja pasar una letra de más/menos en un
// nombre largo, pero no deja pasar clientes genuinamente distintos.
const UMBRAL_SIMILITUD = 0.82;

// Rango Unicode de los acentos combinados que deja normalize("NFD")
// (0x0300–0x036F) — se filtra por código de carácter, no con una clase
// de regex, para no depender de cómo el editor guarde ese carácter.
const INICIO_DIACRITICOS = 0x0300;
const FIN_DIACRITICOS = 0x036f;

function normalizar(texto: string): string {
  const sinAcentos = Array.from(texto.normalize("NFD"))
    .filter(caracter => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < INICIO_DIACRITICOS || codigo > FIN_DIACRITICOS;
    })
    .join("");

  return sinAcentos
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const dp: number[][] = Array.from({ length: filas }, () => new Array(columnas).fill(0));

  for (let i = 0; i < filas; i++) dp[i][0] = i;
  for (let j = 0; j < columnas; j++) dp[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[filas - 1][columnas - 1];
}

function similitud(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  const largoMax = Math.max(na.length, nb.length);
  return 1 - distanciaLevenshtein(na, nb) / largoMax;
}

/** Devuelve el cliente más parecido a `nombreDetectado`, o null si ninguno pasa el umbral de confianza. */
export function encontrarClienteCoincidente<T extends ClienteConNombre>(
  nombreDetectado: string | null | undefined,
  clientes: T[]
): T | null {
  if (!nombreDetectado) return null;

  let mejor: T | null = null;
  let mejorScore = 0;

  for (const cliente of clientes) {
    const score = similitud(nombreDetectado, cliente.nombre_empresa);
    if (score > mejorScore) {
      mejorScore = score;
      mejor = cliente;
    }
  }

  return mejorScore >= UMBRAL_SIMILITUD ? mejor : null;
}
