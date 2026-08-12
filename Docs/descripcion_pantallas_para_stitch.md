# Descripción de pantallas para Stitch — App Órdenes de Trabajo (Tablet y Desktop)

Cómo usar este documento: pega primero el bloque "Sistema de diseño" (o mantenlo visible) antes de pedir cada pantalla. La barra lateral se describe una sola vez porque es igual en las 5 pantallas — inclúyela en cada prompt individual junto con la sección de la pantalla correspondiente.

Tamaños sugeridos para generar en Stitch: **Tablet ≈ 1024px** de ancho, **Desktop ≈ 1440px** de ancho.

---

## Sistema de diseño — "Precision Logic" (usar en TODAS las pantallas)

**Paleta:**
- Primario (navy): `#06007c` — texto/íconos sobre él: blanco `#ffffff`
- Primario claro (chips, fondos suaves): `#e1e0ff` — texto/ícono sobre él: `#3336a9`
- Secundario (azul): `#196584` — contenedor secundario claro: `#99dafe` — texto sobre él: `#10617f`
- Fondo de pantalla: `#fcf8ff`
- Superficie de tarjetas: blanco `#ffffff`
- Superficie sutil (encabezados de tabla, hover): `#f5f2fc` / `#efecf7`
- Texto principal: `#1b1b22`
- Texto secundario: `#464653`
- Borde / línea divisoria: `#c7c5d5`
- Estado "Realizado" (éxito): fondo `#dcecdc`, texto `#1b4d1f`
- Estado "Pendiente" (advertencia): fondo `#fce8c7`, texto `#5c3d05`
- Estado "Próximo": contenedor secundario (`#99dafe` fondo, `#10617f` texto)
- Error: `#ba1a1a`, fondo de error `#ffdad6`

**Tipografía:** Inter en toda la app. Títulos de pantalla 24px semibold · subtítulos 14px regular gris · títulos de tarjeta 16px medium · cuerpo/descripciones 13px regular gris · etiquetas de estado 12px semibold MAYÚSCULAS con tracking, en píldora de radio completo.

**Formas:** tarjetas y modales 8px de radio · botones e inputs 4px de radio · badges/estados en píldora.

**Layout (regla de la paleta para estos tamaños):** cuadrícula fluida de 12 columnas. En tablet y desktop las listas van como **tabla de datos**, no como tarjetas apiladas (eso es solo para celular). Navegación principal en **barra lateral fija**, no barra superior.

**Estilo de tabla de datos** (aplica a cualquier pantalla con listas): encabezado con fondo `#f5f2fc` y texto navy en mayúsculas estilo label (12px, tracking). Filas con zebra striping sutil (blanco / `#f5f2fc` alternado). Hover de fila en `#efecf7`. Padding vertical de celda cómodo (16px).

---

## Barra lateral (igual en las 5 pantallas)

Barra lateral izquierda, fija, color navy `#06007c`. Logo circular arriba. Debajo, dos accesos de navegación con ícono: **"Nueva orden"** (ícono de documento con un +) y **"Seguimiento"** (ícono de lista/gráfico).

- **En desktop (~1440px):** la barra mide ~260px de ancho; cada acceso muestra ícono + etiqueta de texto en blanco.
- **En tablet (~1024px):** la barra se colapsa a ~72px de ancho, mostrando solo los íconos centrados, sin texto.

El área de contenido a la derecha de la barra usa la cuadrícula de 12 columnas con márgenes de 32-40px.

---

## Pantalla 1 — Nueva orden de trabajo (entrada)

[Incluir la barra lateral de arriba] + área de contenido:

Título "Nueva orden de trabajo" (24px semibold) y subtítulo "Elige cómo quieres registrar los datos" (14px gris).

Las dos opciones van **lado a lado**, no apiladas — cada una ocupa ~6 de las 12 columnas: tarjeta "Subir captura" (ícono cámara, chip `#e1e0ff`) a la izquierda, tarjeta "Ingreso manual" (ícono lápiz, chip `#99dafe`) a la derecha. Cada una con título, descripción y chevron.

Debajo, sección "Órdenes recientes" con "Ver todas" a la derecha del título. En vez de lista de tarjetas: una **tabla de datos** con columnas Cliente | Equipo | Fecha | Estado (estilo de tabla descrito arriba; la columna Estado muestra la píldora de color correspondiente).

---

## Pantalla 2 — Subir captura

[Incluir la barra lateral] + área de contenido:

Título "Subir captura".

La zona de carga (borde punteado, radio 8px, ícono de cámara/nube, texto "Toca o arrastra la captura aquí") se **centra dentro de una tarjeta de ancho máximo limitado (~640px)**, con espacio en blanco generoso alrededor — no ocupa todo el ancho de la pantalla.

Vista previa (con imagen ya seleccionada): misma tarjeta centrada, mostrando la imagen con una "×" para quitarla.

Botón primario "Analizar captura" dentro de ese mismo ancho máximo, no de ancho completo.

---

## Pantalla 3 — Revisar datos extraídos

[Incluir la barra lateral] + área de contenido:

Título "Revisar datos" + aviso pequeño con ícono ("Verifica que los datos sean correctos antes de guardar"), fondo `#e1e0ff`, texto `#3336a9`.

El formulario usa la cuadrícula: campos del encabezado en 2-3 columnas por fila (ej. Empresa | Atención de | Técnico en una fila; Fecha | Actividad | Cód. Cliente en la siguiente) en vez de uno debajo del otro.

Sección "Equipos detectados": en vez de tarjetas apiladas, **2 tarjetas de equipo por fila**, cada una con sus campos (Marca, Modelo, Serie, Capacidad, Código interno) en 2 columnas internas.

Certificado de calibración (si aplica) y Cotización como campos normales dentro de la grid.

Botón "Guardar orden" alineado a la derecha del área de contenido, no de ancho completo.

---

## Pantalla 4 — Ingreso manual

[Incluir la barra lateral] + área de contenido:

Título "Ingreso manual".

Selector de formato agrupado (Calibración / Servicio técnico / Equipo especial) como tarjetas de opción en fila o dropdown ancho, aprovechando el espacio horizontal.

Una vez elegido el formato, el formulario sigue el mismo tratamiento de cuadrícula multi-columna que la Pantalla 3 — encabezado en 2-3 columnas, y checklist de equipo/repuestos en 2 columnas cuando el formato lo requiere (grupos "Servicio técnico" y "Equipo especial"; el grupo "Calibración" muestra en su lugar el campo de certificado).

Botón "Guardar orden" alineado a la derecha.

---

## Pantalla 5 — Vista de seguimiento

[Incluir la barra lateral] + área de contenido:

Título "Seguimiento".

Barra de búsqueda (ícono de lupa) + chips de filtro por estado ("Todos / Realizado / Pendiente / Próximo", el activo resaltado en navy) en una sola fila horizontal.

Contenido principal: **tabla de datos de ancho completo** con columnas Cliente | Equipo | Último servicio | Próximo servicio | Estado, con el estilo de tabla descrito en el sistema de diseño. Clic en una fila abriría el historial completo de ese equipo (vista secundaria).

---

## Qué cambia entre tablet y desktop

En las 5 pantallas, lo único que realmente cambia es: el ancho de la barra lateral (72px con solo íconos en tablet, 260px con etiquetas en desktop) y, si Stitch lo ajusta solo, el número de columnas visibles por fila en las cuadrículas (por ejemplo, los campos del formulario podrían pasar de 3 a 2 columnas en tablet si se ven apretados). El contenido, la tabla en vez de tarjetas, y la barra lateral en vez de barra superior aplican igual en ambos tamaños.
