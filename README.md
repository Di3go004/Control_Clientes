# Soluciones Exactas — Órdenes de Trabajo

App interna para digitalizar el control de equipos y servicios de calibración/servicio técnico: reemplaza el Excel de control, con reconocimiento por IA de las capturas de las órdenes de trabajo en papel.

El plan completo del proyecto está en [Docs/plan_proyecto_ordenes_trabajo.md](Docs/plan_proyecto_ordenes_trabajo.md); el schema de base de datos en [soluciones_exactas_schema.sql](soluciones_exactas_schema.sql).

## Stack

Next.js (App Router) + PostgreSQL + Gemini (reconocimiento de capturas), todo pensado para correr dentro de la red de la empresa, dockerizado.

## Cómo correr esto

Hay dos formas de levantarlo. Las dos necesitan un archivo de variables de entorno con los mismos valores (ver [.env.example](.env.example)) — la diferencia es **cuál archivo** y **el host de la base de datos**, porque Next.js y docker-compose no leen el mismo archivo por defecto.

### Opción A — Todo en Docker (la forma "real", como corre en producción)

1. Copia [.env.example](.env.example) a `.env` (así, sin sufijo — es el que lee `docker-compose`) y rellena los valores reales, usando `db` como host en `DATABASE_URL`.
2. Levanta todo:
   ```bash
   docker compose up --build -d
   ```
   Esto crea el contenedor de Postgres (con el schema ya corrido la primera vez) y el de la app, con un volumen aparte para las imágenes subidas.
3. Abre `http://localhost:3000` (o la IP del equipo, desde otra máquina en la red).
4. Conéctate a la base con DBeaver en `localhost:5432` (o la IP del equipo) con las credenciales del `.env`.

### Opción B — Desarrollo híbrido (Postgres en Docker, Next.js con `npm run dev`)

Útil mientras programas, porque tienes hot-reload.

1. Copia [.env.example](.env.example) a `.env.local` (el que lee Next.js) y rellena los valores reales, usando `localhost` como host en `DATABASE_URL`.
2. Levanta solo la base de datos:
   ```bash
   docker compose up -d db
   ```
3. Corre la app fuera de Docker:
   ```bash
   npm install
   npm run dev
   ```
4. Abre `http://localhost:3000`.

> Si mantienes ambos archivos (`.env` y `.env.local`), mantenlos sincronizados a mano — mismo usuario/contraseña/DB y misma `GEMINI_API_KEY`, solo cambia el host dentro de `DATABASE_URL`.

## Estructura

- `src/app/` — pantallas (App Router) y rutas de API (`src/app/api/*/route.ts`).
- `src/lib/` — cliente de Postgres, cliente de Gemini, prompt de análisis, cálculo de estado.
- `src/types/` — tipos compartidos entre frontend y backend.
- `soluciones_exactas_schema.sql` — schema completo (se corre solo la primera vez que se crea el contenedor de `db`, vía `docker-entrypoint-initdb.d`).
- `seed_data.sql` — datos de prueba opcionales, para correr a mano contra la base si los necesitas.

## Aprender más sobre Next.js

- [Documentación de Next.js](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
