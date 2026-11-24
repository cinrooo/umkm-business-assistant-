import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrganizationSettings } from "@/lib/actions/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgSettings = await getOrganizationSettings();

  return (
    <div className="p-6">
      <PageHeader
        title="Pengaturan Bisnis"
        description="Kelola profil usaha, mata uang, pajak, dan batasan operasional toko"
      />

      <SettingsNav />

      <SettingsForm initialData={orgSettings} />
    </div>
  );
}
