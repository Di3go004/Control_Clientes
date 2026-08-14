"use client";
// src/components/NavSidebar.tsx
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Camera, PenLine, ClipboardList } from "lucide-react";
import Imglogo from "../assets/logo.png";

const NAV_ITEMS = [
  { href: "/",            label: "Inicio",          icon: LayoutDashboard },
  { href: "/subir",       label: "Subir captura",   icon: Camera },
  { href: "/manual",      label: "Ingreso manual",  icon: PenLine },
  { href: "/seguimiento", label: "Seguimiento",     icon: ClipboardList },
];

export default function NavSidebar() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <Image
          src={Imglogo}
          alt="Soluciones Exactas S.A."
          width={140}
          height={140}
          style={{ objectFit: "contain" }}
          loading="eager"
        />
      </div>

      {/* ── Navegación ── */}
      <div className="sidebar-nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </div>

      {/* ── Footer copyright ── */}
      <div className="sidebar-footer">
        © 2026 Soluciones Exactas S.A.<br />
        Todos los derechos reservados.
      </div>
    </nav>
  );
}
