// ============================================================
// src/types/index.ts
// Tipos compartidos entre frontend y backend
// ============================================================

// --- Tablas de la base de datos ---

export interface Cliente {
  id: number;
  nombre_empresa: string;
  cod_cliente: string | null;
  region: string | null;
  direccion: string | null;
  telefono: string | null;
  correo_electronico: string | null;
  created_at: string;
}

export interface Equipo {
  id: number;
  cliente_id: number;
  usuario: string | null;
  area: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  codigo_interno: string | null;
  capacidad: string | null;
  frecuencia: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoFormato =
  | "FO-IPFNA-007"
  | "FO-IPFNA-008"
  | "FO-IPFNA-009"
  | "FO-SE-040"
  | "FO-SE-041"
  | "FO-SE-042"
  | "FO-SE-062"
  | "FO-SE-063";

export type Actividad = "CALIBRACIÓN" | "SERVICIO TÉCNICO";

export type EstadoServicio = "REALIZADO" | "PENDIENTE" | "PROXIMO";

export type FuenteOrden = "captura" | "manual";

export interface OrdenTrabajo {
  id: number;
  cliente_id: number;
  tipo_formato: TipoFormato;
  no_correlativo: string | null;
  fecha: string;
  atencion_de: string | null;
  tecnico: string | null;
  elaboracion: string | null;
  actividad: Actividad | null;
  cod_cliente: string | null;
  descripcion_trabajo: string | null;
  no_certificado_calibracion: string | null;
  cotizacion: string | null;
  observaciones: string | null;
  fuente: FuenteOrden;
  imagen_url: string | null;
  created_at: string;
}

export interface Servicio {
  id: number;
  equipo_id: number;
  orden_trabajo_id: number;
  fecha: string;
  estado: EstadoServicio;
  no_certificado_calibracion: string | null;
  cotizacion: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Payloads de la API ---

/** Un equipo dentro del JSON que llega al endpoint de crear orden */
export interface EquipoInput {
  marca?: string;
  modelo?: string;
  serie?: string | null; // null o "S/S" → equipo sin serie
  capacidad?: string;
  codigo_interno?: string;
  usuario?: string;
  area?: string;
  frecuencia?: string;
}

/** Body del POST /api/ordenes */
export interface CrearOrdenPayload {
  // Datos de la orden
  cliente_id: number;
  tipo_formato: TipoFormato;
  no_correlativo?: string;
  fecha: string; // ISO: "2024-06-15"
  atencion_de?: string;
  tecnico?: string;
  elaboracion?: string;
  actividad?: Actividad;
  cod_cliente?: string;
  descripcion_trabajo?: string;
  no_certificado_calibracion?: string;
  cotizacion?: string;
  observaciones?: string;
  fuente: FuenteOrden;
  imagen_url?: string;
  // Lista de equipos detectados en la orden
  equipos: EquipoInput[];
}

/** Respuesta del GET /api/servicios — join con equipo y cliente */
export interface ServicioConDetalle extends Servicio {
  equipo: Equipo & { cliente: Cliente };
}
