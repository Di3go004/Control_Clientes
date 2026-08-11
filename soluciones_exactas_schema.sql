-- ============================================================
-- Base de datos: Control de Órdenes de Trabajo y Calibración
-- Soluciones Exactas, S.A.
-- Motor: PostgreSQL 14+
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: clientes
-- Una fila por empresa cliente. Reemplaza las hojas separadas
-- por región (Esquipulas, Cobán, Jalapa) del Excel original:
-- ahora la región es solo un dato, no una hoja distinta.
-- ------------------------------------------------------------
CREATE TABLE clientes (
    id                  SERIAL PRIMARY KEY,
    nombre_empresa      TEXT NOT NULL,
    cod_cliente         TEXT UNIQUE,
    region              TEXT,              -- ej. 'SOEXSA', 'ESQUIPULAS', 'COBÁN', 'JALAPA'
    direccion           TEXT,
    telefono            TEXT,
    correo_electronico  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE clientes IS 'Empresas cliente. Un cliente puede tener muchos equipos y muchas órdenes de trabajo.';
COMMENT ON COLUMN clientes.region IS 'Agrupación operativa/geográfica del cliente. Sustituye a las hojas por región del Excel.';
COMMENT ON COLUMN clientes.direccion IS 'Dirección principal del cliente. Si un cliente tiene varias fincas/sitios físicos, se puede separar en una tabla "sitios" más adelante.';

-- ------------------------------------------------------------
-- Tabla: equipos
-- Una fila por báscula/balanza/indicador físico, para siempre.
-- Se crea o se reutiliza según el match por número de serie.
-- ------------------------------------------------------------
CREATE TABLE equipos (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    usuario         TEXT,               -- contacto/responsable actual del equipo (de "Atención de")
    area            TEXT,               -- departamento/ubicación interna (de "Ubicación del equipo")
    marca           TEXT,
    modelo          TEXT,
    serie           TEXT UNIQUE,        -- llave de coincidencia. NULL permitido (equipos "S/S", sin serie)
    codigo_interno  TEXT,
    capacidad       TEXT,               -- ej. '6 000 x 1 kg' — se deja como texto libre, el formato varía mucho
    frecuencia      TEXT,               -- ej. 'SEMESTRAL', 'ANUAL', 'CUATRIMESTRAL' — la elige el usuario de la app
    notas           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE equipos IS 'Identidad permanente de cada báscula/balanza. serie es la llave usada para decidir si un equipo de una nueva orden ya existe o es nuevo.';
COMMENT ON COLUMN equipos.serie IS 'Número de serie, siempre como texto (evita el problema de Excel convirtiendo series numéricas a notación científica). Único cuando existe; varios equipos sin serie pueden tener NULL al mismo tiempo.';

-- ------------------------------------------------------------
-- Tabla: ordenes_trabajo
-- Una fila por documento/captura subida. Guarda el encabezado
-- tal como aparece en el papel/Excel, como rastro de auditoría.
-- ------------------------------------------------------------
CREATE TABLE ordenes_trabajo (
    id                          SERIAL PRIMARY KEY,
    cliente_id                  INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    tipo_formato                TEXT NOT NULL CHECK (tipo_formato IN (
                                    'FO-IPFNA-007', 'FO-IPFNA-008', 'FO-IPFNA-009',
                                    'FO-SE-040', 'FO-SE-041', 'FO-SE-042',
                                    'FO-SE-062', 'FO-SE-063'
                                 )),
    no_correlativo              TEXT,
    fecha                       DATE NOT NULL,
    atencion_de                 TEXT,
    tecnico                     TEXT,
    elaboracion                 TEXT,
    actividad                   TEXT CHECK (actividad IN ('CALIBRACIÓN', 'SERVICIO TÉCNICO')),
    cod_cliente                 TEXT,
    descripcion_trabajo         TEXT,       -- texto crudo tal como se extrajo/capturó (marca/modelo/serie/capacidad por equipo)
    no_certificado_calibracion  TEXT,       -- normalmente solo aplica si actividad = 'CALIBRACIÓN'
    cotizacion                  TEXT,
    observaciones                TEXT,
    fuente                       TEXT NOT NULL DEFAULT 'captura' CHECK (fuente IN ('captura', 'manual')),
    imagen_url                   TEXT,      -- referencia a la captura original subida, para poder revisarla despues
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ordenes_trabajo IS 'Un registro por documento subido (captura o ingreso manual). Es el rastro de auditoría de cada orden, sin importar cuántos equipos mencione.';
COMMENT ON COLUMN ordenes_trabajo.fuente IS 'Indica si el registro vino de reconocimiento automático de imagen o de captura manual.';

-- ------------------------------------------------------------
-- Tabla: servicios
-- Una fila por cada visita/servicio realizado a un equipo.
-- Sin límite de 5 como en el Excel — el historial crece solo.
-- Una orden con 4 básculas genera 4 filas aquí.
-- ------------------------------------------------------------
CREATE TABLE servicios (
    id                          SERIAL PRIMARY KEY,
    equipo_id                   INTEGER NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
    orden_trabajo_id            INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE RESTRICT,
    fecha                       DATE NOT NULL,
    estado                      TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('REALIZADO', 'PENDIENTE', 'PROXIMO')),
    no_certificado_calibracion  TEXT,
    cotizacion                  TEXT,
    google_calendar_event_id    TEXT,       -- reservado para la integración futura con Google Calendar
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE servicios IS 'Historial de visitas por equipo. Reemplaza las columnas fijas 1er-5to servicio del Excel con filas ilimitadas.';
COMMENT ON COLUMN servicios.estado IS 'Valor por defecto de respaldo. En la práctica la aplicación lo calcula (fecha vs. hoy) al crear/actualizar, pero queda editable a mano sin que se sobreescriba solo.';
COMMENT ON COLUMN servicios.google_calendar_event_id IS 'Se llena solo si se activa la integración con Google Calendar. No es parte del alcance inicial.';

-- ------------------------------------------------------------
-- Trigger genérico: mantiene updated_at al día en cada UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipos_updated_at
    BEFORE UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_servicios_updated_at
    BEFORE UPDATE ON servicios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Índices — aceleran los joins y búsquedas más comunes
-- ------------------------------------------------------------
CREATE INDEX idx_equipos_cliente_id          ON equipos(cliente_id);
CREATE INDEX idx_ordenes_trabajo_cliente_id  ON ordenes_trabajo(cliente_id);
CREATE INDEX idx_servicios_equipo_id         ON servicios(equipo_id);
CREATE INDEX idx_servicios_orden_trabajo_id  ON servicios(orden_trabajo_id);
CREATE INDEX idx_servicios_fecha             ON servicios(fecha);
CREATE INDEX idx_servicios_estado            ON servicios(estado);
