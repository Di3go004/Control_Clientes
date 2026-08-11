"use client";
// src/app/page.tsx — Dashboard / Inicio
import Link from "next/link";
import { useEffect, useState } from "react";

interface OrdenReciente {
  id: number;
  nombre_empresa: string;
  tipo_formato: string;
  fecha: string;
  tecnico: string | null;
  actividad: string | null;
  no_correlativo: string | null;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Home() {
  const [ordenes, setOrdenes] = useState<OrdenReciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ordenes")
      .then((r) => r.json())
      .then((data) => setOrdenes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1>Órdenes de Trabajo</h1>
      <p className="subtitle">Selecciona cómo deseas registrar una nueva orden.</p>

      {/* Opciones de entrada */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <Link href="/subir" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer", borderLeft: "4px solid #06007c" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
            <h2>Subir captura</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Fotografía o escanea la orden de trabajo. La IA extrae los datos automáticamente.
            </p>
          </div>
        </Link>
        <Link href="/manual" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer", borderLeft: "4px solid #196584" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✏️</div>
            <h2>Ingreso manual</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Ingresa los datos directamente desde el formulario. Elige el tipo de formato primero.
            </p>
          </div>
        </Link>
      </div>

      {/* Órdenes recientes */}
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Órdenes recientes</h2>
        <Link href="/seguimiento" className="btn btn-secondary btn-sm">Ver seguimiento completo →</Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : ordenes.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No hay órdenes registradas aún.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Correlativo</th>
              <th>Cliente</th>
              <th>Formato</th>
              <th>Actividad</th>
              <th>Fecha</th>
              <th>Técnico</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{o.no_correlativo ?? "—"}</td>
                <td>{o.nombre_empresa}</td>
                <td><code style={{ fontSize: 11 }}>{o.tipo_formato}</code></td>
                <td>{o.actividad ?? "—"}</td>
                <td>{formatFecha(o.fecha)}</td>
                <td>{o.tecnico ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
