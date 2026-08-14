"use client";
// src/app/manual/page.tsx — Ingreso manual de órdenes de trabajo
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Gauge, Wrench, Cpu, UserPlus } from "lucide-react";
import type { TipoFormato, Actividad, Cliente } from "@/types";
import { FRECUENCIAS } from "@/lib/calcularProximoServicio";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import CrearClienteInline from "@/components/CrearClienteInline";

// La actividad de cada formato es fija — no la elige quien llena la orden.
// "grupo" define si lleva tabla de equipos repetible (Servicio técnico y
// Equipo especial sí; Calibración pura no) y es independiente de
// "actividad": el 062 lleva tabla de equipos PERO su actividad es
// calibración, no servicio técnico — por eso están separados.
const FORMATOS: { codigo: TipoFormato; label: string; grupo: string; actividad: Actividad }[] = [
  { codigo: "FO-IPFNA-007", label: "007 – Calibración", grupo: "Calibración", actividad: "CALIBRACIÓN" },
  { codigo: "FO-IPFNA-008", label: "008 – Calibración", grupo: "Calibración", actividad: "CALIBRACIÓN" },
  { codigo: "FO-IPFNA-009", label: "009 – Calibración", grupo: "Calibración", actividad: "CALIBRACIÓN" },
  { codigo: "FO-SE-040",    label: "040 – Servicio técnico", grupo: "Servicio técnico", actividad: "SERVICIO TÉCNICO" },
  { codigo: "FO-SE-041",    label: "041 – Servicio técnico", grupo: "Servicio técnico", actividad: "SERVICIO TÉCNICO" },
  { codigo: "FO-SE-042",    label: "042 – Servicio técnico", grupo: "Servicio técnico", actividad: "SERVICIO TÉCNICO" },
  { codigo: "FO-SE-062",    label: "062 – Equipo especial (calibración)", grupo: "Equipo especial", actividad: "CALIBRACIÓN" },
  { codigo: "FO-SE-063",    label: "063 – Equipo especial (servicio técnico)", grupo: "Equipo especial", actividad: "SERVICIO TÉCNICO" },
];

const GRUPOS = ["Calibración", "Servicio técnico", "Equipo especial"];

type EquipoForm = {
  marca: string; modelo: string; serie: string; capacidad: string; codigo_interno: string;
  frecuencia: string; usuario: string; area: string;
};
const equipoVacio = (): EquipoForm => ({
  marca: "", modelo: "", serie: "", capacidad: "", codigo_interno: "",
  frecuencia: "", usuario: "", area: "",
});

export default function IngresoManual() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formato, setFormato] = useState<TipoFormato | "">("");
  const [clienteId, setClienteId] = useState<number | "">("");
  const [fecha, setFecha] = useState("");
  const [noCorrelativo, setNoCorrelativo] = useState("");
  const [atencionDe, setAtencionDe] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correoElectronico, setCorreoElectronico] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [elaboracion, setElaboracion] = useState("");
  const [codCliente, setCodCliente] = useState("");
  const [mostrarClienteNuevo, setMostrarClienteNuevo] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [noCertificado, setNoCertificado] = useState("");
  const [cotizacion, setCotizacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [equipos, setEquipos] = useState<EquipoForm[]>([equipoVacio()]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useAutoDismiss<string>();
  const [exito, setExito] = useState(false);

  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(setClientes);
  }, []);

  const formatoInfo = FORMATOS.find(f => f.codigo === formato);
  const actividadFija = formatoInfo?.actividad ?? null;
  // Los formatos IPFNA (grupo "Calibración") no llevan tabla de equipo/repuestos
  // en el papel — siempre es un solo instrumento por orden. Equipo especial
  // (062/063) sí lleva tabla, aunque el 062 también sea de actividad
  // CALIBRACIÓN — por eso esto va por "grupo", no por "actividad".
  const permiteMultiplesEquipos = formatoInfo?.grupo !== "Calibración";

  // Al elegir un formato, si es de calibración y ya había más de un equipo
  // cargado (por haber tenido antes un formato de servicio técnico
  // seleccionado), recorta a uno solo para no dejar el formulario inconsistente.
  function seleccionarFormato(f: (typeof FORMATOS)[number]) {
    setFormato(f.codigo);
    if (f.grupo === "Calibración") {
      setEquipos(prev => (prev.length > 1 ? prev.slice(0, 1) : prev));
    }
  }

  // Al elegir un cliente, precarga los datos que ya se tienen guardados de
  // él (código, teléfono, correo, dirección) en los campos de la orden —
  // siguen siendo editables por si el contacto de esta visita es distinto.
  function seleccionarCliente(id: number | "") {
    setClienteId(id);
    if (id === "") return;
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    setCodCliente(cliente.cod_cliente ?? "");
    setTelefono(cliente.telefono ?? "");
    setCorreoElectronico(cliente.correo_electronico ?? "");
    setDireccion(cliente.direccion ?? "");
  }

  function agregarClienteNuevo(nuevo: Cliente) {
    setClientes(prev => [...prev, nuevo].sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa)));
    seleccionarCliente(nuevo.id);
    setMostrarClienteNuevo(false);
  }

  function setEquipoField(idx: number, key: keyof EquipoForm, val: string) {
    setEquipos(prev => { const eq = [...prev]; eq[idx] = { ...eq[idx], [key]: val }; return eq; });
  }

  async function handleGuardar() {
    if (!clienteId) { setError("Selecciona el cliente."); return; }
    if (!formato) { setError("Selecciona el formato."); return; }
    if (!fecha) { setError("Ingresa la fecha."); return; }
    if (equipos.length === 0) { setError("Agrega al menos un equipo."); return; }

    setGuardando(true);
    setError(null);

    try {
      const payload = {
        cliente_id: Number(clienteId),
        tipo_formato: formato,
        no_correlativo: noCorrelativo || undefined,
        fecha,
        atencion_de: atencionDe || undefined,
        telefono: telefono || undefined,
        correo_electronico: correoElectronico || undefined,
        direccion: direccion || undefined,
        tecnico: tecnico || undefined,
        elaboracion: elaboracion || undefined,
        actividad: actividadFija ?? undefined,
        cod_cliente: codCliente || undefined,
        descripcion_trabajo: descripcion || undefined,
        no_certificado_calibracion: noCertificado || undefined,
        cotizacion: cotizacion || undefined,
        observaciones: observaciones || undefined,
        fuente: "manual" as const,
        equipos: equipos.map(eq => ({
          marca: eq.marca || null,
          modelo: eq.modelo || null,
          serie: eq.serie || null,
          capacidad: eq.capacidad || null,
          codigo_interno: eq.codigo_interno || null,
          frecuencia: eq.frecuencia || null,
          usuario: eq.usuario || null,
          area: eq.area || null,
        })),
      };

      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al guardar.");
        return;
      }

      setExito(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Error de red.");
    } finally {
      setGuardando(false);
    }
  }

  if (exito) return (
    <div className="alert alert-success">
      <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
      Orden guardada correctamente. Redirigiendo…
    </div>
  );

  return (
    <>
      <h1>Ingreso manual</h1>
      <p className="subtitle">Ingresa los datos de la orden directamente. Elige el formato primero.</p>
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* ── Selector de formato ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Selecciona el tipo de formato</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {GRUPOS.map((grupo, gi) => {
            const icono = [Gauge, Wrench, Cpu][gi];
            const Icono = icono;
            const colores = [
              { borde: "var(--primary-mid)", fondo: "rgba(6,0,124,.06)", txt: "var(--primary-mid)" },
              { borde: "var(--secondary)",   fondo: "rgba(25,101,132,.06)", txt: "var(--secondary)" },
              { borde: "#6b21a8",            fondo: "rgba(107,33,168,.06)", txt: "#6b21a8" },
            ][gi];
            const formatosDel = FORMATOS.filter(f => f.grupo === grupo);
            const seleccionadoEnGrupo = formatosDel.find(f => f.codigo === formato);

            return (
              <div key={grupo} className="card" style={{
                padding: 0,
                overflow: "hidden",
                border: seleccionadoEnGrupo ? `2px solid ${colores.borde}` : "1px solid var(--border)",
                transition: "border-color .15s",
              }}>
                {/* Cabecera del grupo */}
                <div style={{
                  padding: "14px 16px 12px",
                  background: seleccionadoEnGrupo ? colores.fondo : "var(--surface-low)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background .15s",
                }}>
                  <Icono size={16} color={colores.borde} strokeWidth={1.8} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: colores.txt }}>
                    {grupo}
                  </span>
                </div>

                {/* Lista de formatos */}
                <div style={{ padding: "8px" }}>
                  {formatosDel.map(f => {
                    const activo = formato === f.codigo;
                    return (
                      <button
                        key={f.codigo}
                        onClick={() => seleccionarFormato(f)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 10px",
                          marginBottom: 4,
                          borderRadius: "var(--radius-sm)",
                          border: activo ? `1px solid ${colores.borde}` : "1px solid transparent",
                          background: activo ? colores.fondo : "transparent",
                          color: activo ? colores.txt : "var(--text)",
                          fontSize: 13,
                          fontWeight: activo ? 600 : 400,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all .12s",
                          textAlign: "left",
                        }}
                        onMouseEnter={e => {
                          if (!activo) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-high)";
                        }}
                        onMouseLeave={e => {
                          if (!activo) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <span><code style={{ fontSize: 11, opacity: .65, marginRight: 6 }}>{f.codigo}</code>{f.label.split(" – ")[1]}</span>
                        {activo && <CheckCircle2 size={14} color={colores.borde} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario principal */}
      {formato && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Encabezado — <code style={{ fontSize: 13 }}>{formato}</code></h2>
            <div className="form-grid">
              <div className="field">
                <label>Cliente *</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select style={{ flex: 1 }} value={clienteId} onChange={e => seleccionarCliente(Number(e.target.value) || "")}>
                    <option value="">— Selecciona —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setMostrarClienteNuevo(v => !v)}
                    title="Dar de alta un cliente nuevo"
                    style={{ padding: "0 10px" }}
                  >
                    <UserPlus size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="field">
                <label>Actividad</label>
                {/* Fija según el formato — no se elige a mano, cada código
                    de formato es siempre la misma actividad. */}
                <input value={actividadFija ?? "— Elige un formato —"} readOnly style={{ background: "var(--surface-low)", color: "var(--text-variant)" }} />
              </div>
              <div className="field">
                <label>Fecha *</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div className="field">
                <label>No. correlativo</label>
                <input value={noCorrelativo} onChange={e => setNoCorrelativo(e.target.value)} placeholder="OT-2024-001" />
              </div>
              <div className="field">
                <label>Atención de</label>
                <input value={atencionDe} onChange={e => setAtencionDe(e.target.value)} />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input value={correoElectronico} onChange={e => setCorreoElectronico(e.target.value)} />
              </div>
              <div className="field">
                <label>Técnico</label>
                <input value={tecnico} onChange={e => setTecnico(e.target.value)} />
              </div>
              <div className="field">
                <label>Elaborado por</label>
                <input value={elaboracion} onChange={e => setElaboracion(e.target.value)} />
              </div>
              <div className="field">
                <label>Dirección</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>
              <div className="field">
                <label>Cód. cliente</label>
                <input value={codCliente} onChange={e => setCodCliente(e.target.value)} />
              </div>
              {/* Calibración lleva certificado Y cotización — el papel trae los dos.
                  Servicio técnico solo lleva cotización. Esto va por actividad,
                  no por grupo: el 062 es "Equipo especial" pero es calibración. */}
              {actividadFija === "CALIBRACIÓN" && (
                <div className="field">
                  <label>No. certificado de calibración</label>
                  <input value={noCertificado} onChange={e => setNoCertificado(e.target.value)} placeholder="CERT-2024-001" />
                </div>
              )}
              <div className="field">
                <label>Cotización</label>
                <input value={cotizacion} onChange={e => setCotizacion(e.target.value)} />
              </div>
              <div className="field span-3">
                <label>Descripción del trabajo</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} />
              </div>
              <div className="field span-3">
                <label>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} style={{ minHeight: 56 }} />
              </div>
            </div>

            {mostrarClienteNuevo && (
              <CrearClienteInline
                onCreado={agregarClienteNuevo}
                onCancelar={() => setMostrarClienteNuevo(false)}
              />
            )}
          </div>

          {/* Equipos */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Equipos ({equipos.length})</h2>
              {permiteMultiplesEquipos ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setEquipos(prev => [...prev, equipoVacio()])} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Plus size={13} strokeWidth={2.5} /> Agregar equipo
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Este formato es de un solo equipo</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {equipos.map((eq, idx) => (
                <div key={idx} className="equipo-card">
                  <div className="equipo-header">
                    <strong style={{ fontSize: 13 }}>Equipo {idx + 1}</strong>
                    {equipos.length > 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => setEquipos(prev => prev.filter((_, i) => i !== idx))} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Trash2 size={12} strokeWidth={2} /> Quitar
                      </button>
                    )}
                  </div>
                  <div className="form-grid cols-2" style={{ gap: 10 }}>
                    <div className="field"><label>Marca</label><input value={eq.marca} onChange={e => setEquipoField(idx, "marca", e.target.value)} /></div>
                    <div className="field"><label>Modelo</label><input value={eq.modelo} onChange={e => setEquipoField(idx, "modelo", e.target.value)} /></div>
                    <div className="field"><label>Serie</label><input value={eq.serie} placeholder="S/S si no tiene" onChange={e => setEquipoField(idx, "serie", e.target.value)} /></div>
                    <div className="field"><label>Capacidad</label><input value={eq.capacidad} onChange={e => setEquipoField(idx, "capacidad", e.target.value)} /></div>
                    <div className="field"><label>Código interno</label><input value={eq.codigo_interno} onChange={e => setEquipoField(idx, "codigo_interno", e.target.value)} /></div>
                    <div className="field">
                      <label>Frecuencia</label>
                      <select value={eq.frecuencia} onChange={e => setEquipoField(idx, "frecuencia", e.target.value)}>
                        <option value="">— Sin asignar —</option>
                        {FRECUENCIAS.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="field"><label>Usuario</label><input value={eq.usuario} placeholder="Responsable de este equipo" onChange={e => setEquipoField(idx, "usuario", e.target.value)} /></div>
                    <div className="field"><label>Ubicación</label><input value={eq.area} placeholder="ej. Producción" onChange={e => setEquipoField(idx, "area", e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => router.push("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <X size={15} strokeWidth={2} /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {guardando
                ? <><Loader2 size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Guardando…</>
                : <><Save size={15} strokeWidth={2} /> Guardar orden</>
              }
            </button>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </>
  );
}
