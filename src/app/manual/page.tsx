"use client";
// src/app/manual/page.tsx — Ingreso manual de órdenes de trabajo
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TipoFormato, Actividad, Cliente } from "@/types";

const FORMATOS: { codigo: TipoFormato; label: string; grupo: string }[] = [
  { codigo: "FO-IPFNA-007", label: "007 – Calibración", grupo: "Calibración" },
  { codigo: "FO-IPFNA-008", label: "008 – Calibración", grupo: "Calibración" },
  { codigo: "FO-IPFNA-009", label: "009 – Calibración", grupo: "Calibración" },
  { codigo: "FO-SE-040",    label: "040 – Servicio técnico", grupo: "Servicio técnico" },
  { codigo: "FO-SE-041",    label: "041 – Servicio técnico", grupo: "Servicio técnico" },
  { codigo: "FO-SE-042",    label: "042 – Servicio técnico", grupo: "Servicio técnico" },
  { codigo: "FO-SE-062",    label: "062 – Equipo especial", grupo: "Equipo especial" },
  { codigo: "FO-SE-063",    label: "063 – Equipo especial", grupo: "Equipo especial" },
];

const GRUPOS = ["Calibración", "Servicio técnico", "Equipo especial"];
const ACTIVIDADES: Actividad[] = ["CALIBRACIÓN", "SERVICIO TÉCNICO"];

type EquipoForm = { marca: string; modelo: string; serie: string; capacidad: string; codigo_interno: string };
const equipoVacio = (): EquipoForm => ({ marca: "", modelo: "", serie: "", capacidad: "", codigo_interno: "" });

export default function IngresoManual() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formato, setFormato] = useState<TipoFormato | "">("");
  const [clienteId, setClienteId] = useState<number | "">("");
  const [actividad, setActividad] = useState<Actividad | "">("");
  const [fecha, setFecha] = useState("");
  const [noCorrelativo, setNoCorrelativo] = useState("");
  const [atencionDe, setAtencionDe] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [elaboracion, setElaboracion] = useState("");
  const [codCliente, setCodCliente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [noCertificado, setNoCertificado] = useState("");
  const [cotizacion, setCotizacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [equipos, setEquipos] = useState<EquipoForm[]>([equipoVacio()]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(setClientes);
  }, []);

  const formatoInfo = FORMATOS.find(f => f.codigo === formato);
  const esCalibración = formatoInfo?.grupo === "Calibración";

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
        tecnico: tecnico || undefined,
        elaboracion: elaboracion || undefined,
        actividad: actividad || undefined,
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

  if (exito) return <div className="alert alert-success">✅ Orden guardada correctamente. Redirigiendo…</div>;

  return (
    <>
      <h1>Ingreso manual</h1>
      <p className="subtitle">Ingresa los datos de la orden directamente. Elige el formato primero.</p>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Selector de formato */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Tipo de formato</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {GRUPOS.map(grupo => (
            <div key={grupo}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{grupo}</p>
              {FORMATOS.filter(f => f.grupo === grupo).map(f => (
                <button
                  key={f.codigo}
                  className={`btn btn-sm ${formato === f.codigo ? "btn-primary" : "btn-secondary"}`}
                  style={{ display: "block", width: "100%", marginBottom: 4, textAlign: "left" }}
                  onClick={() => setFormato(f.codigo)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ))}
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
                <select value={clienteId} onChange={e => setClienteId(Number(e.target.value) || "")}>
                  <option value="">— Selecciona —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Actividad</label>
                <select value={actividad} onChange={e => setActividad(e.target.value as Actividad)}>
                  <option value="">— Selecciona —</option>
                  {ACTIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
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
                <label>Técnico</label>
                <input value={tecnico} onChange={e => setTecnico(e.target.value)} />
              </div>
              <div className="field">
                <label>Elaborado por</label>
                <input value={elaboracion} onChange={e => setElaboracion(e.target.value)} />
              </div>
              <div className="field">
                <label>Cód. cliente</label>
                <input value={codCliente} onChange={e => setCodCliente(e.target.value)} />
              </div>
              {esCalibración && (
                <div className="field">
                  <label>No. certificado de calibración</label>
                  <input value={noCertificado} onChange={e => setNoCertificado(e.target.value)} placeholder="CERT-2024-001" />
                </div>
              )}
              {!esCalibración && (
                <div className="field">
                  <label>Cotización</label>
                  <input value={cotizacion} onChange={e => setCotizacion(e.target.value)} />
                </div>
              )}
              <div className="field span-3">
                <label>Descripción del trabajo</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} />
              </div>
              <div className="field span-3">
                <label>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} style={{ minHeight: 56 }} />
              </div>
            </div>
          </div>

          {/* Equipos */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Equipos ({equipos.length})</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setEquipos(prev => [...prev, equipoVacio()])}>+ Agregar equipo</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {equipos.map((eq, idx) => (
                <div key={idx} className="equipo-card">
                  <div className="equipo-header">
                    <strong style={{ fontSize: 13 }}>Equipo {idx + 1}</strong>
                    {equipos.length > 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => setEquipos(prev => prev.filter((_, i) => i !== idx))}>× Quitar</button>
                    )}
                  </div>
                  <div className="form-grid cols-2" style={{ gap: 10 }}>
                    <div className="field"><label>Marca</label><input value={eq.marca} onChange={e => setEquipoField(idx, "marca", e.target.value)} /></div>
                    <div className="field"><label>Modelo</label><input value={eq.modelo} onChange={e => setEquipoField(idx, "modelo", e.target.value)} /></div>
                    <div className="field"><label>Serie</label><input value={eq.serie} placeholder="S/S si no tiene" onChange={e => setEquipoField(idx, "serie", e.target.value)} /></div>
                    <div className="field"><label>Capacidad</label><input value={eq.capacidad} onChange={e => setEquipoField(idx, "capacidad", e.target.value)} /></div>
                    <div className="field span-2"><label>Código interno</label><input value={eq.codigo_interno} onChange={e => setEquipoField(idx, "codigo_interno", e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => router.push("/")}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando…" : "💾 Guardar orden"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
