"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Profil Bisnis", href: "/settings" },
  { label: "Tim & Akses", href: "/settings/members" },
  { label: "Audit Log", href: "/settings/audit-log" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="flex space-x-6" aria-label="Menu Pengaturan">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2",
                isActive
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
