-- ============================================================
-- seed_data.sql — Datos de prueba para desarrollo
-- Soluciones Exactas, S.A.
-- Basado en clientes reales mencionados en el plan del proyecto
-- ============================================================

-- ------------------------------------------------------------
-- Clientes de prueba
-- ------------------------------------------------------------
INSERT INTO clientes (nombre_empresa, cod_cliente, region, direccion, telefono, correo_electronico) VALUES
  ('Guatemala de Moldeados, S.A.',  'CLI-001', 'SOEXSA',    'Zona Industrial, Guatemala',          '2234-5678', 'contacto@guatemoldeados.com'),
  ('Arrocera Los Corrales, S.A.',   'CLI-002', 'ESQUIPULAS', 'Km. 224, Esquipulas, Chiquimula',    '7943-1234', 'operaciones@loscorrales.com'),
  ('ONA Industrial',                'CLI-003', 'JALAPA',     'Barrio El Centro, Jalapa',            '7922-4567', 'ona@onaindustrial.com');

-- ------------------------------------------------------------
-- Equipos de prueba (con y sin número de serie)
-- ------------------------------------------------------------
INSERT INTO equipos (cliente_id, usuario, area, marca, modelo, serie, codigo_interno, capacidad, frecuencia) VALUES
  -- Guatemala de Moldeados
  (1, 'Ing. Morales',  'Producción',  'Mettler Toledo', 'ICS445',    'B123456789',  'EQ-001', '150 x 0.05 kg',   'SEMESTRAL'),
  (1, 'Ing. Morales',  'Bodega',      'Ohaus',          'Defender',  'C987654321',  'EQ-002', '300 x 0.1 kg',    'ANUAL'),
  -- Arrocera Los Corrales
  (2, 'Lic. Pérez',    'Báscula patio','Rice Lake',     'RL1200',    'RL20240015',  'EQ-003', '10 000 x 2 kg',   'SEMESTRAL'),
  (2, 'Lic. Pérez',    'Planta',      'Fairbanks',      'FB2000',    NULL,          'EQ-004', '5 000 x 1 kg',    'CUATRIMESTRAL'),  -- equipo S/S
  -- ONA Industrial
  (3, 'Sr. Castillo',  'Recepción',   'Adam Equipment', 'GBC',       'AE20230088',  'EQ-005', '30 x 0.001 kg',   'ANUAL');

-- ------------------------------------------------------------
-- Una orden de trabajo de prueba (ingreso manual, calibración)
-- ------------------------------------------------------------
INSERT INTO ordenes_trabajo (
  cliente_id, tipo_formato, no_correlativo, fecha,
  atencion_de, tecnico, elaboracion,
  actividad, cod_cliente, descripcion_trabajo,
  no_certificado_calibracion, fuente
) VALUES (
  1,
  'FO-IPFNA-007',
  'OT-2024-0001',
  '2024-06-15',
  'Ing. Morales',
  'Técnico A. García',
  'A. García',
  'CALIBRACIÓN',
  'CLI-001',
  'Báscula Mettler Toledo ICS445, Serie B123456789, 150x0.05kg / Báscula Ohaus Defender, Serie C987654321, 300x0.1kg',
  'CERT-2024-0045',
  'manual'
);

-- ------------------------------------------------------------
-- Servicios vinculados a esa orden (uno por equipo)
-- El estado se calcula vs. hoy — ajusta las fechas según convenga
-- ------------------------------------------------------------
INSERT INTO servicios (equipo_id, orden_trabajo_id, fecha, estado, no_certificado_calibracion) VALUES
  (1, 1, '2024-06-15', 'REALIZADO', 'CERT-2024-0045'),
  (2, 1, '2024-06-15', 'REALIZADO', 'CERT-2024-0046');

-- Verificación rápida
SELECT 'clientes'        AS tabla, COUNT(*) AS filas FROM clientes
UNION ALL
SELECT 'equipos',        COUNT(*) FROM equipos
UNION ALL
SELECT 'ordenes_trabajo',COUNT(*) FROM ordenes_trabajo
UNION ALL
SELECT 'servicios',      COUNT(*) FROM servicios;
