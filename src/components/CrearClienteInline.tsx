"use client";
// src/components/CrearClienteInline.tsx
// Mini-formulario para dar de alta un cliente nuevo sin salir de la
// pantalla donde se está armando la orden (manual o revisión de IA).
// Se usa cuando el cliente todavía no existe en /api/clientes.
import { useState } from "react";
import { Loader2, Save, X, AlertCircle } from "lucide-react";
import type { Cliente } from "@/types";

interface Props {
  nombreSugerido?: string | null;
  onCreado: (cliente: Cliente) => void;
  onCancelar: () => void;
}

export default function CrearClienteInline({ nombreSugerido, onCreado, onCancelar }: Props) {
  const [nombreEmpresa, setNombreEmpresa] = useState(nombreSugerido ?? "");
  const [codCliente, setCodCliente] = useState("");
  const [region, setRegion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!nombreEmpresa.trim()) {
      setError("El nombre de la empresa es requerido.");
      return;
    }
    setGuardando(true);
    setError(null);

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_empresa: nombreEmpresa.trim(),
          cod_cliente: codCliente || undefined,
          region: region || undefined,
          direccion: direccion || undefined,
          telefono: telefono || undefined,
          correo_electronico: correo || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "No se pudo crear el cliente.");
        return;
      }

      const nuevo: Cliente = await res.json();
      onCreado(nuevo);
    } catch {
      setError("Error de red al crear el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="equipo-card" style={{ marginTop: 8 }}>
      <div className="equipo-header">
        <strong style={{ fontSize: 13 }}>Cliente nuevo</strong>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onCancelar}
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <X size={12} strokeWidth={2} /> Cancelar
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 10 }}>
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      <div className="form-grid cols-2" style={{ gap: 10 }}>
        <div className="field span-2">
          <label>Empresa *</label>
          <input value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} />
        </div>
        <div className="field">
          <label>Cód. cliente</label>
          <input value={codCliente} onChange={e => setCodCliente(e.target.value)} />
        </div>
        <div className="field">
          <label>Región</label>
          <input value={region} onChange={e => setRegion(e.target.value)} placeholder="ej. SOEXSA" />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} />
        </div>
        <div className="field">
          <label>Correo</label>
          <input value={correo} onChange={e => setCorreo(e.target.value)} />
        </div>
        <div className="field span-2">
          <label>Dirección</label>
          <input value={direccion} onChange={e => setDireccion(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={guardar}
          disabled={guardando}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {guardando
            ? <><Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Guardando…</>
            : <><Save size={13} strokeWidth={2} /> Guardar cliente</>
          }
        </button>
      </div>
    </div>
  );
}
