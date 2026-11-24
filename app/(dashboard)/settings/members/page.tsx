import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembers } from "@/lib/actions/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { MemberList } from "@/components/settings/MemberList";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { members, invites, currentUserRole } = await getMembers();

  return (
    <div className="p-6">
      <PageHeader
        title="Manajemen Tim & Hak Akses"
        description="Atur peran dan izin staf operasional bisnis Anda (RBAC)"
      />

      <SettingsNav />

      <MemberList
        members={members}
        invites={invites}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
