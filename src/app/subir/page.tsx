"use client";
// src/app/subir/page.tsx — Subir captura y analizar con Gemini
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, X, ScanSearch, Loader2, AlertCircle, FileImage, CheckCircle2 } from "lucide-react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

export default function SubirCaptura() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useAutoDismiss<string>();
  const [isDragging, setIsDragging] = useState(false);

  function handleArchivo(file: File) {
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleArchivo(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }

  async function handleAnalizar() {
    if (!archivo) return;
    setCargando(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("imagen", archivo);

      const res = await fetch("/api/analizar", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al analizar la imagen.");
        if (data.rawResponse) console.warn("Respuesta de Gemini:", data.rawResponse);
        return;
      }

      sessionStorage.setItem("analisis_resultado", JSON.stringify(data));
      router.push("/revisar");
    } catch {
      setError("Error de red. Verifica tu conexión.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    function preventGlobal(e: DragEvent) { e.preventDefault(); }
    window.addEventListener("dragover", preventGlobal);
    window.addEventListener("drop", preventGlobal);
    return () => {
      window.removeEventListener("dragover", preventGlobal);
      window.removeEventListener("drop", preventGlobal);
    };
  }, []);

  return (
    /* Contenedor centrado — igual que el diseño Stitch */
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)" }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Encabezado ── */}
        <div>
          <h1 style={{ marginBottom: 6 }}>Subir captura</h1>
          <p style={{ fontSize: 14, color: "var(--text-variant)", lineHeight: "20px" }}>
            Sube la fotografía o escaneo de la orden de trabajo. La IA extrae los datos automáticamente.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* ── Tarjeta exterior (blanca con sombra) ── */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 1px 6px rgba(0,0,0,.06)",
        }}>

          {!preview ? (
            /* ── Zona de drop ── */
            <>
              <div
                onClick={() => inputRef.current?.click()}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  width: "100%",
                  border: `2px dashed ${isDragging ? "var(--primary-mid)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "52px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: isDragging ? "rgba(6,0,124,.04)" : "var(--surface-low)",
                  transition: "border-color .2s, background .2s",
                  gap: 0,
                }}
              >
                {/* Ícono en círculo */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: isDragging ? "rgba(6,0,124,.1)" : "#e1e0ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                  transform: isDragging ? "scale(1.1)" : "scale(1)",
                  transition: "transform .2s, background .2s",
                }}>
                  <CloudUpload size={28} color="var(--primary-mid)" strokeWidth={1.8} />
                </div>

                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  {isDragging ? "¡Suelta la imagen aquí!" : "Toca o arrastra la captura aquí"}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                  Archivos soportados: PNG, JPG, WEBP · Máx. 10 MB
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleArchivo(e.target.files[0]); }}
                />
              </div>

              {/* Botón de acción separado (como en Stitch) */}
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px 24px", fontSize: 14 }}
                onClick={() => inputRef.current?.click()}
              >
                <FileImage size={16} strokeWidth={2} />
                Seleccionar archivo
              </button>
            </>
          ) : (
            /* ── Vista previa ── */
            <>
              <div style={{ width: "100%", position: "relative" }}>
                <img
                  src={preview}
                  alt="Vista previa"
                  style={{
                    width: "100%", maxHeight: 380,
                    objectFit: "contain",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>

              {/* Nombre del archivo */}
              <div style={{
                width: "100%",
                background: "var(--surface-low)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <CheckCircle2 size={15} color="var(--realizado-txt)" strokeWidth={2} />
                <span style={{ fontSize: 12, color: "var(--text-variant)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {archivo?.name}
                </span>
                <button
                  onClick={() => { setArchivo(null); setPreview(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex", alignItems: "center" }}
                  title="Quitar imagen"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Botones de acción */}
              <div style={{ width: "100%", display: "flex", gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => { setArchivo(null); setPreview(null); }}
                >
                  <X size={15} strokeWidth={2} />
                  Cambiar imagen
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: "center", padding: "12px 24px", fontSize: 14 }}
                  onClick={handleAnalizar}
                  disabled={cargando}
                >
                  {cargando
                    ? <><Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Analizando con IA…</>
                    : <><ScanSearch size={16} strokeWidth={2} /> Analizar captura</>
                  }
                </button>
              </div>

              {cargando && (
                <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                  Enviando a Gemini… esto puede tardar unos segundos.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Ayuda contextual ── */}
        {!preview && (
          <div style={{
            display: "flex",
            gap: 16,
            padding: "14px 20px",
            background: "#e1e0ff",
            borderRadius: 8,
            alignItems: "flex-start",
          }}>
            <ScanSearch size={18} color="var(--primary-mid)" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-mid)", marginBottom: 2 }}>¿Qué extrae la IA?</p>
              <p style={{ fontSize: 12, color: "#3336a9", lineHeight: "18px" }}>
                Cliente, formato, correlativo, fecha, técnico, actividad y la lista completa de equipos con sus series y capacidades.
                Podrás revisar y editar antes de guardar.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
