"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications";
import { formatDate } from "@/lib/utils/format";
import { Bell, AlertTriangle, ShoppingCart, CheckCheck, UserPlus, Info } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function NotificationCenter({ notifications, unreadCount }: NotificationCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      await markNotificationAsRead(id);
      router.refresh();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      router.refresh();
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
      case "NEW_SALE":
        return <ShoppingCart className="h-4 w-4 text-green-600" aria-hidden="true" />;
      case "MEMBER_INVITE":
        return <UserPlus className="h-4 w-4 text-blue-600" aria-hidden="true" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca`
            : "Semua notifikasi sudah dibaca"}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Tandai Semua Sudah Dibaca
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <Bell className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada notifikasi</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Peringatan stok menipis dan aktivitas bisnis lainnya akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                n.isRead ? "bg-white" : "bg-green-50/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white border border-gray-100 p-2 shadow-xs mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{n.title}</h4>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-green-600" aria-label="Belum dibaca" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    {formatDate(n.createdAt, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkOne(n.id)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer whitespace-nowrap"
                >
                  Tandai dibaca
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
