# Plan del Proyecto: App de Órdenes de Trabajo — Soluciones Exactas

Este documento reúne todo lo que definimos en la planeación y lo organiza en fases para que lo puedas ir implementando en tu editor de código, en orden. Cada fase depende de que la anterior esté funcionando, así que conviene no saltarse el orden aunque tengas ganas de llegar directo a las pantallas.

---

## Resumen de fases

| Fase | Qué se construye | Depende de |
|---|---|---|
| 0 | Stack y entorno de desarrollo | — |
| 1 | Base de datos | Fase 0 |
| 2 | Backend base (API + lógica de negocio) | Fase 1 |
| 3 | Reconocimiento de capturas con IA | Fase 2 |
| 4 | Frontend / pantallas | Fase 2 y 3 |
| 5 | Integración con Google Calendar (extra) | Fase 3 |
| 6 | Pruebas y lanzamiento | Todas |

---

## Decisiones ya tomadas (referencia rápida)

Para no tener que releer toda la conversación mientras programas:

- **8 formatos, 3 grupos.** IPFNA-007/008/009 (calibración pura, sin tabla de equipo/repuestos) · SE-040/041/042 (servicio técnico estándar) · SE-062/063 (equipo especial, gran capacidad). Los 3 grupos se distinguen por el código del formato, que siempre es visible en la captura.
- **Match de equipos: por número de serie.** Si la serie ya existe en `equipos`, el nuevo registro se agrega como un servicio más de ese equipo. Si no existe (o el equipo no tiene serie, "S/S"), se crea un equipo nuevo. La serie se guarda siempre como texto, nunca como número (Excel convierte series numéricas a notación científica y rompe el match).
- **Estado del servicio: automático pero editable.** Se calcula solo (fecha contra hoy) al crear o actualizar el registro, pero el campo queda editable a mano sin que el sistema lo sobreescriba después.
- **Zona de captura:** de cada orden solo importan los encabezados, la descripción del trabajo a realizar, el número de certificado de calibración (si aplica) y la cotización.
- **Base de datos:** ya diseñada y entregada — 4 tablas (`clientes`, `equipos`, `ordenes_trabajo`, `servicios`). Archivo: `soluciones_exactas_schema.sql`.
- **Sistema de diseño:** "Precision Logic" — navy oscuro `#06007c` como primario, radios de 8px en tarjetas, pills en mayúsculas para estados, tipografía Inter. Ya aplicado a la primera pantalla en Figma.
- **Stack recomendado (actualizado a despliegue local):** Next.js + Postgres, todo dockerizado y corriendo en un equipo dentro de la red de la empresa — sin servicios cloud de por medio, salvo la llamada saliente a la API de Gemini (capa gratis) para el reconocimiento. Un solo `docker-compose up` levanta la app y la base de datos juntas. Las imágenes de las capturas se guardan en un volumen local, no en storage en la nube. La base de datos la administras tú directo con DBeaver.
- **Acceso:** por IP:puerto dentro de la red de la empresa, igual que tu otra app. Confirmado: la captura siempre se sube desde la oficina (se genera ahí mismo al llenar la orden), así que la red local alcanza sin necesidad de VPN.

---

## Fase 0 — Stack y entorno

**Objetivo:** Docker levantando la app y la base de datos juntas, con un solo comando.

**Nota sobre acceso:** confirmado — la captura siempre se sube desde la oficina, así que la red local de la empresa alcanza sin VPN de por medio. Cualquiera conectado al wifi llega a la app por IP:puerto.

- [ ] Instalar Docker Desktop (o Docker Engine) en el equipo que va a quedar corriendo la app dentro de la empresa
- [ ] Crear el proyecto: `npx create-next-app@latest`
- [ ] Escribir un `docker-compose.yml` con dos servicios: `app` (tu Next.js) y `db` (imagen oficial `postgres`), con un volumen para que los datos de Postgres persistan entre reinicios del contenedor
- [ ] Montar `soluciones_exactas_schema.sql` en `/docker-entrypoint-initdb.d/` del servicio `db` — la imagen oficial de Postgres lo corre sola la primera vez que se crea el contenedor, así la base queda lista sin pasos manuales
- [ ] Exponer el puerto de Postgres (`5432:5432`) para conectarte con DBeaver directo a `localhost:5432` (o a la IP del equipo, si te conectas desde otra máquina)
- [ ] Crear un volumen aparte para las imágenes de las capturas subidas (esto reemplaza el bucket de storage en la nube — ya no hace falta nada externo para esto)
- [ ] Conseguir una API key de Gemini en Google AI Studio (aistudio.google.com) — sin tarjeta de crédito, es la única llamada que sale a internet en todo el esquema, el resto vive dentro de la red local
- [ ] Asignar una IP fija (o reserva DHCP desde el router) al equipo que corre la app, para que la dirección no cambie cuando el router se reinicie
- [ ] Repositorio Git inicializado desde el día uno

---

## Fase 1 — Base de datos

**Objetivo:** las 4 tablas creadas y probadas con datos reales.

- [ ] Conectar DBeaver a `localhost:5432` y verificar que las tablas, los `CHECK` constraints y los triggers de `updated_at` se crearon bien (el schema ya corrió solo al levantar el contenedor por primera vez, en la Fase 0)
- [ ] Insertar 2-3 clientes reales de prueba (Guatemala de Moldeados, Arrocera Los Corrales, ONA — ya tienes sus datos de los formatos que revisamos)
- [ ] Insertar un par de equipos y servicios a mano, para tener con qué probar antes de que exista cualquier UI

---

## Fase 2 — Backend base

**Objetivo:** poder guardar y leer datos por API, todavía sin IA ni pantallas — probando con JSON armado a mano.

- [ ] Configurar el cliente de Postgres del lado del servidor (ej. con `pg` o un ORM como Prisma), apuntando al `DATABASE_URL` del contenedor `db`
- [ ] Endpoint para crear una orden confirmada: recibe el JSON ya revisado (venga del flujo de IA o del ingreso manual) y lo procesa
- [ ] Dentro de ese endpoint: por cada equipo mencionado, buscar en `equipos` por `serie` → si existe, usar ese `equipo_id`; si no, crear el equipo primero
- [ ] Calcular el `estado` del servicio automáticamente al insertar (fecha vs. hoy)
- [ ] Endpoints de lectura: listar equipos, listar servicios con filtros (por cliente, por estado) — esto es lo que va a alimentar la vista de seguimiento en la Fase 4
- [ ] Probar todo el flujo con Postman/Insomnia o un script simple, mandando JSON de prueba a mano

---

## Fase 3 — Reconocimiento de capturas (IA)

**Objetivo:** de una imagen subida, obtener JSON estructurado listo para revisar.

Esta es la parte más nueva del proyecto, así que probablemente sea donde más vas a iterar.

**Modelo y costo:** Gemini Flash / Flash-Lite, usando la capa gratis de Google AI Studio — sin tarjeta de crédito, con límites de uso diario muy por encima del volumen que vas a procesar. Se usa con una API key generada en aistudio.google.com.

**A tener en cuenta:** en la capa gratis, Google puede usar las capturas que mandes para entrenar sus modelos — vale la pena documentarlo, ya que esas imágenes incluyen nombres de clientes y datos de sus equipos. Si en algún momento eso deja de ser aceptable, migrar a Claude Haiku de pago (unos centavos al mes, ver decisión anterior) es un cambio contenido — solo se toca esta fase, el resto del sistema no depende de qué modelo esté detrás.

- [ ] Endpoint que reciba la imagen subida
- [ ] Guardar la imagen en el volumen local y conservar la ruta (ya está contemplado en `ordenes_trabajo.imagen_url`, para trazabilidad)
- [ ] Armar el prompt para la API de Gemini: mandar la imagen y pedir **explícitamente** que devuelva solo JSON — con los campos del encabezado, la actividad, el certificado/cotización si aplica, y que identifique cuál de los 8 formatos es (por el código FO-XXX visible)
- [ ] Pedirle también que separe la "descripción del trabajo" en una lista de equipos individuales (marca, modelo, serie, capacidad, código) — el patrón de texto es bastante consistente entre formatos, así que esto debería funcionar bien desde el primer intento
- [ ] Devolver ese JSON al frontend para revisión — **nunca guardar directo sin que alguien confirme**, al menos mientras afinas la precisión
- [ ] Ir probando con capturas reales variadas (buena luz, mala luz, distintos formatos) e ir ajustando el prompt según los errores que veas — y estar atento al límite diario de la capa gratis por si el volumen real termina siendo mayor al esperado

---

## Fase 4 — Frontend / pantallas

**Objetivo:** las pantallas que ya empezamos a diseñar, conectadas al backend real.

- [ ] **Pantalla de entrada** — ya armada en Figma con la paleta Precision Logic aplicada. Archivo: [Soluciones Exactas - App Órdenes de Trabajo](https://www.figma.com/design/KyYp10nckdgZw88iprd8Vi)
- [ ] **Subir captura** — selector de imagen, preview, botón de confirmar → llama al endpoint de la Fase 3
- [ ] **Revisión de datos extraídos** — formulario pre-llenado con lo que devolvió la IA, todo editable, botón de guardar → llama al endpoint de la Fase 2
- [ ] **Ingreso manual** — selector de cuál de los 8 formatos, y que aparezcan los campos según el grupo (recuerda: Grupo A/IPFNA no lleva tabla de equipo/repuestos; Grupo B/C sí)
- [ ] **Vista de seguimiento** — lista de equipos con su historial de servicios y estado; este es el reemplazo directo de tu Excel de control, sin el límite de 5 columnas
- [ ] Aplicar los tokens de Precision Logic de forma consistente — si usas Tailwind, conviene definir los colores/radios una sola vez en la config para que todos los componentes los hereden

---

## Fase 5 — Google Calendar (extra)

**Objetivo:** que cada fecha de servicio guardada cree o actualice un evento automáticamente.

- [ ] Configurar credenciales OAuth en Google Cloud Console
- [ ] Al guardar un servicio con fecha, crear un evento en el calendario configurado
- [ ] Guardar el `google_calendar_event_id` (ya reservado en el esquema) en el registro del servicio
- [ ] Si la fecha de un servicio se edita después, actualizar el evento existente usando ese ID en vez de crear uno duplicado

---

## Fase 6 — Pruebas y lanzamiento

- [ ] Probar con al menos una captura real de cada uno de los 8 formatos
- [ ] Probar el caso de equipo sin serie (S/S) — debe crear equipo nuevo cada vez, sin romper nada
- [ ] Probar que el matching funcione cuando el mismo equipo aparece en una segunda orden distinta
- [ ] Dar de alta a los técnicos que van a usar la app
- [ ] Capacitación rápida (15-20 min) antes de soltarlo en campo

---

## Notas finales

- El archivo `soluciones_exactas_schema.sql` y este plan están pensados para usarse juntos — el schema es la Fase 1 lista para copiar y pegar.
- No hace falta terminar una fase al 100% antes de asomarte a la siguiente, pero sí necesitas que **funcione lo suficiente** como para no estar construyendo sobre algo roto.
- Si en algún punto quieres retomar las pantallas en Figma, el archivo queda ahí disponible con la paleta ya aplicada — no hace falta empezar de cero.