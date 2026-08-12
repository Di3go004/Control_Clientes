"use client";
// ============================================================
// src/hooks/useAutoDismiss.ts
// Como useState, pero el valor se borra solo después de un tiempo —
// pensado para los banners de error/aviso, que no deben quedarse
// pegados en pantalla para siempre esperando a que alguien los cierre.
//
// Mismo tuple [valor, setValor] que useState, así que es un reemplazo
// directo en cualquier componente que ya tenga `useState<string|null>(null)`
// para un mensaje de error.
// ============================================================

import { useEffect, useRef, useState } from "react";

export function useAutoDismiss<T>(ms = 5000): [T | null, (valor: T | null) => void] {
  const [valor, setValorInterno] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setValor(nuevo: T | null) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setValorInterno(nuevo);
    if (nuevo !== null) {
      timeoutRef.current = setTimeout(() => setValorInterno(null), ms);
    }
  }

  // Limpia el timeout pendiente si el componente se desmonta antes de que dispare.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [valor, setValor];
}
