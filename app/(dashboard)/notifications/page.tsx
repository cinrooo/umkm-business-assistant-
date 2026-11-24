import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotifications } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/shared/PageHeader";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { items, unreadCount } = await getNotifications({ limit: 40 });

  return (
    <div className="p-6">
      <PageHeader
        title="Pusat Notifikasi"
        description="Pemberitahuan stok menipis, peringatan sistem, dan pembaruan tim"
      />

      <NotificationCenter notifications={items} unreadCount={unreadCount} />
    </div>
  );
}
