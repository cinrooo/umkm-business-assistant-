import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { organization: { select: { name: true } } },
  });

  if (!membership) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - hanya tampil di md ke atas */}
      <div className="hidden md:flex">
        <Sidebar organizationName={membership.organization.name} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pb-16 md:pb-0"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
