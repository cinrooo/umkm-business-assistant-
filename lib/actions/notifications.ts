"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import type { Permission } from "@/lib/permissions";

type MembershipData = {
  id: string;
  organizationId: string;
  role: UserRole;
};

async function requireMembership(permission: Permission): Promise<MembershipData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, organizationId: true, role: true },
  });

  if (!membership) throw new Error("Unauthorized");
  if (!hasPermission(membership.role, permission)) throw new Error("Forbidden");
  return membership;
}

export async function getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const membership = await requireMembership("notification:read");
  const session = await auth();
  const limit = params?.limit ?? 30;

  const where = {
    organizationId: membership.organizationId,
    OR: [
      { userId: null }, // notifikasi untuk seluruh org
      { userId: session?.user?.id }, // notifikasi personal
    ],
    ...(params?.unreadOnly && { isRead: false }),
  };

  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({
      where: {
        organizationId: membership.organizationId,
        isRead: false,
        OR: [
          { userId: null },
          { userId: session?.user?.id },
        ],
      },
    }),
  ]);

  return {
    items,
    unreadCount,
  };
}

export async function markNotificationAsRead(id: string) {
  const membership = await requireMembership("notification:read");

  await db.notification.updateMany({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const membership = await requireMembership("notification:read");
  const session = await auth();

  await db.notification.updateMany({
    where: {
      organizationId: membership.organizationId,
      isRead: false,
      OR: [
        { userId: null },
        { userId: session?.user?.id },
      ],
    },
    data: { isRead: true },
  });

  return { success: true };
}
