# ============================================================
# Dockerfile — App Next.js (Soluciones Exactas)
# Multi-stage build: dependencies → builder → runner
# ============================================================

# Etapa 1: instalar dependencias
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de manifiesto primero (aprovecha caché de Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Etapa 2: build de producción
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables requeridas en tiempo de build
ARG DATABASE_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Etapa 3: imagen final (solo lo necesario para correr)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar solo los archivos necesarios del build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Carpeta para las imágenes subidas (el volumen Docker se monta aquí)
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
