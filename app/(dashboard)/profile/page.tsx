import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileView } from "@/components/profile/ProfileView";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, membership] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true },
    }),
    db.membership.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: {
        organization: { select: { name: true, businessType: true } },
      },
    }),
  ]);

  if (!user || !membership) redirect("/onboarding");

  return (
    <div className="p-6">
      <PageHeader
        title="Profil Pengguna"
        description="Informasi akun pengguna dan sesi aktif organisasi bisnis"
      />

      <ProfileView
        user={user}
        organization={{
          name: membership.organization.name,
          businessType: membership.organization.businessType,
          role: membership.role,
          joinedAt: membership.joinedAt,
        }}
      />
    </div>
  );
}
