"use client";
// src/app/page.tsx — Dashboard / Inicio
import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, PenLine, ArrowRight, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";

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

function ActividadBadge({ actividad }: { actividad: string | null }) {
  if (!actividad) return <span style={{ color: "var(--muted)" }}>—</span>;
  const isCalib = actividad.includes("CALIBR");
  return (
    <span className={`badge ${isCalib ? "badge-proximo" : "badge-pendiente"}`}>
      {actividad}
    </span>
  );
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

      {/* Tarjetas de acceso rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
        <Link href="/subir" style={{ textDecoration: "none" }}>
          <div className="card" style={{
            cursor: "pointer",
            borderLeft: "4px solid var(--primary-mid)",
            transition: "box-shadow .15s, transform .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(6,0,124,.1)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              (e.currentTarget as HTMLDivElement).style.transform = "";
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: "var(--surface-high)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              <Camera size={20} color="var(--primary-mid)" strokeWidth={1.8} />
            </div>
            <h2 style={{ color: "var(--primary-mid)", marginBottom: 6 }}>Subir captura</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: "18px" }}>
              Fotografía o escanea la orden de trabajo. La IA extrae los datos automáticamente.
            </p>
          </div>
        </Link>

        <Link href="/manual" style={{ textDecoration: "none" }}>
          <div className="card" style={{
            cursor: "pointer",
            borderLeft: "4px solid var(--secondary)",
            transition: "box-shadow .15s, transform .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(25,101,132,.1)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              (e.currentTarget as HTMLDivElement).style.transform = "";
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: "var(--surface-high)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              <PenLine size={20} color="var(--secondary)" strokeWidth={1.8} />
            </div>
            <h2 style={{ color: "var(--secondary)", marginBottom: 6 }}>Ingreso manual</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: "18px" }}>
              Ingresa los datos directamente desde el formulario. Elige el tipo de formato primero.
            </p>
          </div>
        </Link>
      </div>

      {/* Encabezado órdenes recientes */}
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} color="var(--text-variant)" strokeWidth={1.8} />
          <h2 style={{ margin: 0 }}>Órdenes recientes</h2>
        </div>
        <Link href="/seguimiento" className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Ver seguimiento <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", padding: "20px 0" }}>
          <Clock size={16} strokeWidth={1.8} />
          <span>Cargando órdenes…</span>
        </div>
      ) : ordenes.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", padding: "20px 0" }}>
          <AlertCircle size={16} strokeWidth={1.8} />
          <span>No hay órdenes registradas aún.</span>
        </div>
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
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {o.no_correlativo
                    ? <span style={{ fontWeight: 600, color: "var(--primary-mid)" }}>{o.no_correlativo}</span>
                    : <span style={{ color: "var(--muted)" }}>—</span>
                  }
                </td>
                <td style={{ fontWeight: 500 }}>{o.nombre_empresa}</td>
                <td><code style={{ fontSize: 11, background: "var(--surface-high)", padding: "2px 6px", borderRadius: 3 }}>{o.tipo_formato}</code></td>
                <td><ActividadBadge actividad={o.actividad} /></td>
                <td style={{ color: "var(--text-variant)" }}>{formatFecha(o.fecha)}</td>
                <td style={{ color: "var(--text-variant)" }}>{o.tecnico ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Indicador de estado al final */}
      {!loading && ordenes.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
          <CheckCircle2 size={13} strokeWidth={2} color="var(--realizado-txt)" />
          {ordenes.length} orden{ordenes.length !== 1 ? "es" : ""} mostrada{ordenes.length !== 1 ? "s" : ""}
        </div>
      )}
    </>
  );
}
