"use client";
// src/app/seguimiento/page.tsx — Vista de seguimiento de equipos y servicios
import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, CheckCircle2, Clock, AlertCircle, Award, Pencil, Check, X, Loader2, FileSpreadsheet } from "lucide-react";
import type { EstadoServicio } from "@/types";
import { calcularProximoServicio, FRECUENCIAS } from "@/lib/calcularProximoServicio";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

interface ServicioFila {
  id: number;
  equipo_id: number;
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
  { valor: "TODOS",     label: "Todos" },
  { valor: "REALIZADO", label: "Realizado" },
  { valor: "PROXIMO",   label: "Próximo" },
  { valor: "PENDIENTE", label: "Pendiente" },
];

// Mismas tres opciones, sin "Todos" — para el <select> de edición en línea.
const OPCIONES_ESTADO: { valor: EstadoServicio; label: string }[] = [
  { valor: "REALIZADO", label: "Realizado" },
  { valor: "PROXIMO",   label: "Próximo" },
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

interface DraftEdicion {
  fecha: string;
  estado: EstadoServicio;
  no_certificado_calibracion: string;
}

export default function Seguimiento() {
  const [servicios, setServicios] = useState<ServicioFila[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoServicio | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  // Edición manual en línea — el plan deja explícito que el estado
  // (calculado solo al crear el servicio) debe quedar editable a mano.
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftEdicion | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [errorEdicion, setErrorEdicion] = useAutoDismiss<string>();

  function iniciarEdicion(fila: ServicioFila) {
    setErrorEdicion(null);
    setEditandoId(fila.id);
    setDraft({
      fecha: fila.fecha.slice(0, 10),
      estado: fila.estado,
      no_certificado_calibracion: fila.no_certificado_calibracion ?? "",
    });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setDraft(null);
  }

  async function guardarEdicion(id: number) {
    if (!draft) return;
    setGuardandoId(id);
    setErrorEdicion(null);

    try {
      const res = await fetch(`/api/servicios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: draft.fecha,
          estado: draft.estado,
          no_certificado_calibracion: draft.no_certificado_calibracion || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setErrorEdicion(d.error ?? "No se pudo guardar el cambio.");
        return;
      }

      const actualizado = await res.json();
      setServicios(prev => prev.map(s => s.id === id
        ? {
            ...s,
            fecha: actualizado.fecha,
            estado: actualizado.estado,
            no_certificado_calibracion: actualizado.no_certificado_calibracion,
          }
        : s
      ));
      setEditandoId(null);
      setDraft(null);
    } catch {
      setErrorEdicion("Error de red al guardar.");
    } finally {
      setGuardandoId(null);
    }
  }

  // Edición de la frecuencia — es un dato del EQUIPO, no del servicio,
  // así que va contra /api/equipos/:id y actualiza todas las filas que
  // compartan ese equipo_id (un mismo equipo puede tener varias filas,
  // una por cada servicio de su historial).
  const [editandoFrecuenciaEquipoId, setEditandoFrecuenciaEquipoId] = useState<number | null>(null);
  const [guardandoFrecuenciaId, setGuardandoFrecuenciaId] = useState<number | null>(null);

  async function guardarFrecuencia(equipoId: number, frecuencia: string) {
    setGuardandoFrecuenciaId(equipoId);
    setErrorEdicion(null);

    try {
      const res = await fetch(`/api/equipos/${equipoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frecuencia: frecuencia || null }),
      });

      if (!res.ok) {
        const d = await res.json();
        setErrorEdicion(d.error ?? "No se pudo guardar la frecuencia.");
        return;
      }

      setServicios(prev => prev.map(s => s.equipo_id === equipoId ? { ...s, frecuencia: frecuencia || null } : s));
      setEditandoFrecuenciaEquipoId(null);
    } catch {
      setErrorEdicion("Error de red al guardar la frecuencia.");
    } finally {
      setGuardandoFrecuenciaId(null);
    }
  }

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

  // cargar() dispara el fetch de /api/servicios cada vez que cambia el
  // filtro de estado; el setState real ocurre después del await, no aquí.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // "Próximo estimado" solo se calcula sobre la fila más reciente REALIZADA
  // de cada equipo — así cada equipo muestra un único próximo estimado, en
  // vez de que cada fila vieja de su historial calcule su propia fecha
  // (que ya habría quedado atrás en el tiempo). Mapa: id de fila → fecha.
  const proximoPorEquipo = useMemo(() => {
    const masReciente = new Map<number, ServicioFila>();
    for (const s of servicios) {
      if (s.estado !== "REALIZADO") continue;
      const actual = masReciente.get(s.equipo_id);
      if (!actual || s.fecha > actual.fecha) masReciente.set(s.equipo_id, s);
    }
    const resultado = new Map<number, string>();
    for (const fila of masReciente.values()) {
      const proxima = calcularProximoServicio(fila.fecha, fila.frecuencia);
      if (proxima) resultado.set(fila.id, proxima);
    }
    return resultado;
  }, [servicios]);

  // Exportar respeta el filtro de estado y la búsqueda actuales — lo que
  // se ve en pantalla es lo que se descarga.
  function urlExportar() {
    const params = new URLSearchParams();
    if (filtroEstado !== "TODOS") params.set("estado", filtroEstado);
    if (busqueda) params.set("q", busqueda);
    return `/api/servicios/exportar?${params}`;
  }

  return (
    <>
      <h1>Seguimiento de servicios</h1>
      <p className="subtitle">Historial completo de servicios registrados por equipo y cliente.</p>

      {/* Controles */}
      <div className="row-between" style={{ marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Campo de búsqueda con ícono */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              color="var(--muted)"
              strokeWidth={2}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            />
            <input
              type="search"
              placeholder="Buscar cliente, marca, serie…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: 260, paddingLeft: 32 }}
            />
          </div>

          <a
            href={urlExportar()}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}
            title="Descarga lo que se ve en esta tabla como Excel"
          >
            <FileSpreadsheet size={14} strokeWidth={2} /> Exportar a Excel
          </a>
        </div>
      </div>

      {errorEdicion && (
        <div className="alert alert-error">
          <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          {errorEdicion}
        </div>
      )}

      {/* Contador */}
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>
        {loading ? "Cargando…" : `${filas.length} registro${filas.length !== 1 ? "s" : ""}`}
      </p>

      {/* Tabla / estados vacíos */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", padding: "20px 0" }}>
          <Clock size={16} strokeWidth={1.8} />
          <span>Cargando registros…</span>
        </div>
      ) : filas.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", padding: "20px 0" }}>
          <AlertCircle size={16} strokeWidth={1.8} />
          <span>Sin resultados para los filtros aplicados.</span>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Equipo</th>
              <th>Serie</th>
              <th>Capacidad</th>
              <th>Frecuencia</th>
              <th>Formato</th>
              <th>Técnico</th>
              <th>Fecha servicio</th>
              <th>Estado</th>
              <th>Próximo estimado</th>
              <th>Certificado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map(s => {
              const d = editandoId === s.id ? draft : null;
              const proximo = proximoPorEquipo.get(s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.nombre_empresa}</div>
                    {s.region && <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.region}</div>}
                  </td>
                  <td>{[s.marca, s.modelo].filter(Boolean).join(" ") || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {s.serie ?? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>S/S</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{s.capacidad ?? "—"}</td>

                  {/* Frecuencia — es del equipo, se guarda apenas cambia el <select> */}
                  <td>
                    {editandoFrecuenciaEquipoId === s.equipo_id ? (
                      <select
                        autoFocus
                        defaultValue={s.frecuencia ?? ""}
                        disabled={guardandoFrecuenciaId === s.equipo_id}
                        onChange={e => guardarFrecuencia(s.equipo_id, e.target.value)}
                        onBlur={() => setEditandoFrecuenciaEquipoId(null)}
                        style={{ fontSize: 12, padding: "4px 6px" }}
                      >
                        <option value="">— Sin asignar —</option>
                        {FRECUENCIAS.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditandoFrecuenciaEquipoId(s.equipo_id)}
                        title="Editar frecuencia de este equipo"
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          fontSize: 12, color: s.frecuencia ? "var(--text-variant)" : "var(--muted)",
                          fontStyle: s.frecuencia ? "normal" : "italic",
                          textDecoration: "underline dotted", textUnderlineOffset: 3,
                        }}
                      >
                        {s.frecuencia ?? "Sin asignar"}
                      </button>
                    )}
                  </td>

                  <td>
                    <code style={{ fontSize: 11, background: "var(--surface-high)", padding: "2px 6px", borderRadius: 3 }}>
                      {s.tipo_formato}
                    </code>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-variant)" }}>{s.tecnico ?? "—"}</td>

                  {/* Fecha — editable */}
                  <td>
                    {d ? (
                      <input
                        type="date"
                        value={d.fecha}
                        onChange={e => setDraft(prev => prev ? { ...prev, fecha: e.target.value } : prev)}
                        style={{ fontSize: 12, padding: "4px 6px" }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-variant)" }}>{formatFecha(s.fecha)}</span>
                    )}
                  </td>

                  {/* Estado — editable */}
                  <td>
                    {d ? (
                      <select
                        value={d.estado}
                        onChange={e => setDraft(prev => prev ? { ...prev, estado: e.target.value as EstadoServicio } : prev)}
                        style={{ fontSize: 12, padding: "4px 6px" }}
                      >
                        {OPCIONES_ESTADO.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className={badgeClass(s.estado)}>{s.estado}</span>
                    )}
                  </td>

                  {/* Próximo estimado — calculado (última fecha REALIZADA + frecuencia), no se guarda en ningún lado */}
                  <td>
                    {proximo ? (
                      <span style={{ fontSize: 12, color: "var(--text-variant)" }}>{formatFecha(proximo)}</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Certificado — editable */}
                  <td>
                    {d ? (
                      <input
                        type="text"
                        value={d.no_certificado_calibracion}
                        placeholder="Sin certificado"
                        onChange={e => setDraft(prev => prev ? { ...prev, no_certificado_calibracion: e.target.value } : prev)}
                        style={{ fontSize: 12, padding: "4px 6px" }}
                      />
                    ) : s.no_certificado_calibracion ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Award size={12} color="var(--realizado-txt)" strokeWidth={2} />
                        <span style={{ fontSize: 11, fontFamily: "monospace" }}>{s.no_certificado_calibracion}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td>
                    {d ? (
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          onClick={() => guardarEdicion(s.id)}
                          disabled={guardandoId === s.id}
                          title="Guardar"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--realizado-txt)", padding: 4, display: "flex", alignItems: "center" }}
                        >
                          {guardandoId === s.id
                            ? <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                            : <Check size={14} strokeWidth={2.5} />
                          }
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          disabled={guardandoId === s.id}
                          title="Cancelar"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", alignItems: "center" }}
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => iniciarEdicion(s)}
                        title="Editar fecha, estado o certificado"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", alignItems: "center" }}
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {!loading && filas.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
          <CheckCircle2 size={13} strokeWidth={2} color="var(--realizado-txt)" />
          {filas.length} registro{filas.length !== 1 ? "s" : ""} encontrado{filas.length !== 1 ? "s" : ""}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
