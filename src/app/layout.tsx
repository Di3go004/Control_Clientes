// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavSidebar from "@/components/NavSidebar";

export const metadata: Metadata = {
  title: "Soluciones Exactas — Órdenes de Trabajo",
  description: "Control de calibración y servicio técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app-layout">
          <NavSidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
