"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Layers,
  BarChart3,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  FileText,
  Bell,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Produk",
    href: "/products",
    icon: Package,
  },
  {
    label: "Kategori",
    href: "/categories",
    icon: Layers,
  },
  {
    label: "Inventaris",
    href: "/inventory",
    icon: BarChart3,
  },
  {
    label: "Penjualan",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    label: "Pelanggan",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Pemasok",
    href: "/suppliers",
    icon: Truck,
  },
  {
    label: "Pengeluaran",
    href: "/expenses",
    icon: Receipt,
  },
  {
    label: "Laporan",
    href: "/reports",
    icon: FileText,
  },
];

const BOTTOM_NAV_ITEMS = [
  { label: "Notifikasi", href: "/notifications", icon: Bell },
  { label: "Pengaturan", href: "/settings", icon: Settings },
  { label: "Profil", href: "/profile", icon: User },
];

interface SidebarProps {
  organizationName?: string;
}

export function Sidebar({ organizationName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
      aria-label="Navigasi utama"
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-gray-200 px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        {/* Brand mark: solid green square — unique to this product */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white"
          aria-hidden="true"
        >
          U
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-gray-900">
            {organizationName ?? "UMKM Assistant"}
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Menu navigasi">
        <ul className="space-y-0.5 px-2" role="list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1",
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    collapsed ? "justify-center" : "gap-3"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-green-600" : "text-gray-500"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-gray-200 py-3">
        <ul className="space-y-0.5 px-2" role="list">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1",
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    collapsed ? "justify-center" : "gap-3"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-green-600" : "text-gray-500"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        className={cn(
          "absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
