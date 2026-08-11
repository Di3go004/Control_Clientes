import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera una carpeta .next/standalone optimizada para Docker
  // El Dockerfile copia solo esa carpeta a la imagen final
  output: "standalone",
};

export default nextConfig;
