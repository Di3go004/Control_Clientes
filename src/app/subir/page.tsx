"use client";
// src/app/subir/page.tsx — Subir captura y analizar con Gemini
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SubirCaptura() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleArchivo(file: File) {
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleArchivo(file);
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

      // Guardar resultado en sessionStorage y navegar a revisión
      sessionStorage.setItem("analisis_resultado", JSON.stringify(data));
      router.push("/revisar");
    } catch {
      setError("Error de red. Verifica tu conexión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <h1>Subir captura</h1>
      <p className="subtitle">La IA analiza la imagen y extrae los datos. Tú los revisas antes de guardar.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Zona de carga */}
      {!preview ? (
        <div
          className="upload-zone"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
          <p style={{ fontWeight: 600 }}>Haz clic o arrastra la captura aquí</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>JPG, PNG o WEBP · máximo 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleArchivo(e.target.files[0]); }}
          />
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <img src={preview} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 4 }} />
          <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>{archivo?.name}</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 16, gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setArchivo(null); setPreview(null); }}
            >
              × Quitar imagen
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAnalizar}
              disabled={cargando}
            >
              {cargando ? "⏳ Analizando…" : "🔍 Analizar captura"}
            </button>
          </div>
          {cargando && (
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
              Enviando a Gemini… esto puede tardar unos segundos.
            </p>
          )}
        </div>
      )}
    </>
  );
}
