"use client";
// src/app/seguimiento/page.tsx — Vista de seguimiento de equipos y servicios
import { useEffect, useState, useCallback } from "react";
import type { EstadoServicio } from "@/types";

interface ServicioFila {
  id: number;
  nombre_empresa: string;
  region: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  capacidad: string | null;
  frecuencia: string | null;
  fecha: string;
  estado: EstadoServicio;
  tipo_formato: string;
  actividad: string | null;
  tecnico: string | null;
  no_certificado_calibracion: string | null;
  no_correlativo: string | null;
}

const ESTADOS: { valor: EstadoServicio | "TODOS"; label: string }[] = [
  { valor: "TODOS",    label: "Todos" },
  { valor: "REALIZADO", label: "Realizado" },
  { valor: "PROXIMO",  label: "Próximo" },
  { valor: "PENDIENTE", label: "Pendiente" },
];

function badgeClass(estado: EstadoServicio) {
  if (estado === "REALIZADO") return "badge badge-realizado";
  if (estado === "PENDIENTE") return "badge badge-pendiente";
  return "badge badge-proximo";
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Seguimiento() {
  const [servicios, setServicios] = useState<ServicioFila[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoServicio | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado !== "TODOS") params.set("estado", filtroEstado);
    params.set("limit", "200");

    const res = await fetch(`/api/servicios?${params}`);
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const filas = servicios.filter(s => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      s.nombre_empresa?.toLowerCase().includes(q) ||
      s.marca?.toLowerCase().includes(q) ||
      s.modelo?.toLowerCase().includes(q) ||
      s.serie?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <h1>Seguimiento de servicios</h1>
      <p className="subtitle">Historial completo de servicios por equipo. Sin el límite de 5 columnas del Excel.</p>

      {/* Controles */}
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div className="filter-chips" style={{ margin: 0 }}>
          {ESTADOS.map(e => (
            <button
              key={e.valor}
              className={`chip ${filtroEstado === e.valor ? "active" : ""}`}
              onClick={() => setFiltroEstado(e.valor)}
            >
              {e.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="🔍 Buscar cliente, marca, serie…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 240, marginLeft: 12 }}
        />
      </div>

      {/* Contador */}
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>
        {loading ? "Cargando…" : `${filas.length} registro${filas.length !== 1 ? "s" : ""}`}
      </p>

      {/* Tabla */}
      {!loading && filas.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>Sin resultados.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Equipo</th>
              <th>Serie</th>
              <th>Capacidad</th>
              <th>Formato</th>
              <th>Técnico</th>
              <th>Fecha servicio</th>
              <th>Estado</th>
              <th>Certificado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.nombre_empresa}</div>
                  {s.region && <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.region}</div>}
                </td>
                <td>{[s.marca, s.modelo].filter(Boolean).join(" ") || "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.serie ?? <span style={{ color: "var(--muted)" }}>S/S</span>}</td>
                <td style={{ fontSize: 12 }}>{s.capacidad ?? "—"}</td>
                <td><code style={{ fontSize: 11 }}>{s.tipo_formato}</code></td>
                <td style={{ fontSize: 12 }}>{s.tecnico ?? "—"}</td>
                <td style={{ fontSize: 12 }}>{formatFecha(s.fecha)}</td>
                <td><span className={badgeClass(s.estado)}>{s.estado}</span></td>
                <td style={{ fontSize: 11, fontFamily: "monospace" }}>{s.no_certificado_calibracion ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
