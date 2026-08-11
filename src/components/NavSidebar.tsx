"use client";
// src/components/NavSidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import Imglogo from "../assets/logo.png";
import Image from "next/image";

export default function NavSidebar() {
  const path = usePathname();
  const isActive = (href: string) =>
    path === href || (href !== "/" && path.startsWith(href));

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <Image src={Imglogo} alt="Logo" width={150} height={150} />
      </div>
      <Link href="/"           className={isActive("/") && path === "/" ? "active" : ""}>🏠 Inicio</Link>
      <Link href="/subir"      className={isActive("/subir")      ? "active" : ""}>📷 Subir captura</Link>
      <Link href="/manual"     className={isActive("/manual")     ? "active" : ""}>✏️ Ingreso manual</Link>
      <Link href="/seguimiento"className={isActive("/seguimiento") ? "active" : ""}>📋 Seguimiento</Link>
    </nav>
  );
}
