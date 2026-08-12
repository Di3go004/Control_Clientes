"use client";
// src/app/revisar/page.tsx — Revisión y confirmación de datos extraídos por IA
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import type { DatosExtraidos, EquipoExtraido, TipoFormato, Actividad, Cliente } from "@/types";
import { FRECUENCIAS } from "@/lib/calcularProximoServicio";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

const FORMATOS: TipoFormato[] = [
  "FO-IPFNA-007","FO-IPFNA-008","FO-IPFNA-009",
  "FO-SE-040","FO-SE-041","FO-SE-042","FO-SE-062","FO-SE-063",
];

const ACTIVIDADES: Actividad[] = ["CALIBRACIÓN","SERVICIO TÉCNICO"];

type FormState = Omit<DatosExtraidos, "equipos"> & {
  cliente_id: number | "";
  equipos: EquipoExtraido[];
};

export default function RevisarDatos() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useAutoDismiss<string>();
  const [exito, setExito] = useState(false);

  useEffect(() => {
    // Cargar clientes para el selector
    fetch("/api/clientes").then(r => r.json()).then(setClientes);

    // Recuperar resultado del análisis
    const raw = sessionStorage.getItem("analisis_resultado");
    if (!raw) { router.replace("/subir"); return; }

    const { datos, imagen_url }: { datos: DatosExtraidos; imagen_url: string } = JSON.parse(raw);
    // Deriva el estado inicial del formulario a partir de sessionStorage al
    // montar — junto con el redirect de arriba, es un solo efecto de "cargar
    // lo que vino de /subir", no algo separable en render puro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImagenUrl(imagen_url);
    setForm({ ...datos, cliente_id: "" });
  }, [router]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function setEquipo(idx: number, key: keyof EquipoExtraido, value: string) {
    setForm(prev => {
      if (!prev) return prev;
      const eq = [...prev.equipos];
      eq[idx] = { ...eq[idx], [key]: value || null };
      return { ...prev, equipos: eq };
    });
  }

  function addEquipo() {
    setForm(prev => prev ? { ...prev, equipos: [...prev.equipos, { marca: null, modelo: null, serie: null, capacidad: null, codigo_interno: null, frecuencia: null }] } : prev);
  }

  function removeEquipo(idx: number) {
    setForm(prev => prev ? { ...prev, equipos: prev.equipos.filter((_, i) => i !== idx) } : prev);
  }

  async function handleGuardar() {
    if (!form) return;
    if (!form.cliente_id) { setError("Selecciona el cliente antes de guardar."); return; }
    if (!form.tipo_formato) { setError("Selecciona el formato."); return; }
    if (!form.fecha) { setError("Ingresa la fecha."); return; }
    if (form.equipos.length === 0) { setError("Agrega al menos un equipo."); return; }

    setGuardando(true);
    setError(null);

    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        tipo_formato: form.tipo_formato,
        no_correlativo: form.no_correlativo,
        fecha: form.fecha,
        atencion_de: form.atencion_de,
        tecnico: form.tecnico,
        elaboracion: form.elaboracion,
        actividad: form.actividad,
        cod_cliente: form.cod_cliente,
        descripcion_trabajo: form.descripcion_trabajo,
        no_certificado_calibracion: form.no_certificado_calibracion,
        cotizacion: form.cotizacion,
        observaciones: form.observaciones,
        fuente: "captura" as const,
        imagen_url: imagenUrl,
        equipos: form.equipos,
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

      sessionStorage.removeItem("analisis_resultado");
      setExito(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Error de red.");
    } finally {
      setGuardando(false);
    }
  }

  if (!form) return <p style={{ color: "var(--muted)" }}>Cargando datos…</p>;
  if (exito) return (
    <div className="alert alert-success">
      <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
      Orden guardada correctamente. Redirigiendo…
    </div>
  );

  return (
    <>
      <h1>Revisar datos extraídos</h1>
      <div className="alert alert-info">
        <Info size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        Verifica que los datos sean correctos antes de guardar. Puedes editar cualquier campo.
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* --- Captura original: compararla contra lo extraído antes de guardar --- */}
      {imagenUrl && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Captura original</h2>
          <img
            src={imagenUrl}
            alt="Captura original de la orden de trabajo"
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "contain",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface-low)",
            }}
          />
        </div>
      )}

      {/* --- Encabezado --- */}
      <div className="card">
        <h2>Encabezado de la orden</h2>
        <div className="form-grid">
          <div className="field">
            <label>Cliente *</label>
            <select value={form.cliente_id} onChange={e => setField("cliente_id", Number(e.target.value) || "")}>
              <option value="">— Selecciona cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
            </select>
            {form.nombre_cliente && <small style={{ color: "var(--muted)", marginTop: 2 }}>Gemini detectó: &quot;{form.nombre_cliente}&quot;</small>}
          </div>
          <div className="field">
            <label>Tipo de formato *</label>
            <select value={form.tipo_formato ?? ""} onChange={e => setField("tipo_formato", e.target.value as TipoFormato)}>
              <option value="">— Selecciona —</option>
              {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label>No. correlativo</label>
            <input value={form.no_correlativo ?? ""} onChange={e => setField("no_correlativo", e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha *</label>
            <input type="date" value={form.fecha ?? ""} onChange={e => setField("fecha", e.target.value)} />
          </div>
          <div className="field">
            <label>Actividad</label>
            <select value={form.actividad ?? ""} onChange={e => setField("actividad", e.target.value as Actividad)}>
              <option value="">— Selecciona —</option>
              {ACTIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Atención de</label>
            <input value={form.atencion_de ?? ""} onChange={e => setField("atencion_de", e.target.value)} />
          </div>
          <div className="field">
            <label>Técnico</label>
            <input value={form.tecnico ?? ""} onChange={e => setField("tecnico", e.target.value)} />
          </div>
          <div className="field">
            <label>Elaborado por</label>
            <input value={form.elaboracion ?? ""} onChange={e => setField("elaboracion", e.target.value)} />
          </div>
          <div className="field">
            <label>Cód. cliente</label>
            <input value={form.cod_cliente ?? ""} onChange={e => setField("cod_cliente", e.target.value)} />
          </div>
          <div className="field">
            <label>No. certificado de calibración</label>
            <input value={form.no_certificado_calibracion ?? ""} onChange={e => setField("no_certificado_calibracion", e.target.value)} />
          </div>
          <div className="field">
            <label>Cotización</label>
            <input value={form.cotizacion ?? ""} onChange={e => setField("cotizacion", e.target.value)} />
          </div>
          <div className="field span-3">
            <label>Descripción del trabajo (texto original)</label>
            <textarea value={form.descripcion_trabajo ?? ""} onChange={e => setField("descripcion_trabajo", e.target.value)} />
          </div>
          <div className="field span-3">
            <label>Observaciones</label>
            <textarea value={form.observaciones ?? ""} onChange={e => setField("observaciones", e.target.value)} style={{ minHeight: 56 }} />
          </div>
        </div>
      </div>

      {/* --- Equipos --- */}
      <div className="card section-gap">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Equipos detectados ({form.equipos.length})</h2>
          <button className="btn btn-secondary btn-sm" onClick={addEquipo} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} strokeWidth={2.5} /> Agregar equipo
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {form.equipos.map((eq, idx) => (
            <div key={idx} className="equipo-card">
              <div className="equipo-header">
                <strong style={{ fontSize: 13 }}>Equipo {idx + 1}</strong>
                {form.equipos.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => removeEquipo(idx)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Trash2 size={12} strokeWidth={2} /> Quitar
                  </button>
                )}
              </div>
              <div className="form-grid cols-2" style={{ gap: 10 }}>
                <div className="field"><label>Marca</label><input value={eq.marca ?? ""} onChange={e => setEquipo(idx, "marca", e.target.value)} /></div>
                <div className="field"><label>Modelo</label><input value={eq.modelo ?? ""} onChange={e => setEquipo(idx, "modelo", e.target.value)} /></div>
                <div className="field"><label>Serie</label><input value={eq.serie ?? ""} placeholder="S/S si no tiene" onChange={e => setEquipo(idx, "serie", e.target.value)} /></div>
                <div className="field"><label>Capacidad</label><input value={eq.capacidad ?? ""} onChange={e => setEquipo(idx, "capacidad", e.target.value)} /></div>
                <div className="field"><label>Código interno</label><input value={eq.codigo_interno ?? ""} onChange={e => setEquipo(idx, "codigo_interno", e.target.value)} /></div>
                <div className="field">
                  <label>Frecuencia</label>
                  <select value={eq.frecuencia ?? ""} onChange={e => setEquipo(idx, "frecuencia", e.target.value)}>
                    <option value="">— Sin asignar —</option>
                    {FRECUENCIAS.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20, gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => router.push("/subir")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Volver
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
  );
}
