"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  UpdateOrganizationSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
} from "@/lib/validations";
import type { UserRole } from "@prisma/client";
import type { Permission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

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

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function getOrganizationSettings() {
  const membership = await requireMembership("org:settings");

  const org = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      currency: true,
      timezone: true,
      logoUrl: true,
      address: true,
      phone: true,
      email: true,
      taxNumber: true,
      taxRate: true,
      discountRate: true,
      minStockThreshold: true,
      allowNegativeStock: true,
    },
  });

  if (!org) throw new Error("Organisasi tidak ditemukan");

  return {
    ...org,
    taxRate: Number(org.taxRate),
    discountRate: Number(org.discountRate),
    userRole: membership.role,
  };
}

export async function updateOrganizationSettings(formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("org:settings");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengubah pengaturan organisasi" };
  }

  const validated = UpdateOrganizationSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: membership.organizationId },
      data: {
        ...(validated.data.name && { name: validated.data.name.trim() }),
        ...(validated.data.businessType !== undefined && { businessType: validated.data.businessType || null }),
        ...(validated.data.currency && { currency: validated.data.currency }),
        ...(validated.data.timezone && { timezone: validated.data.timezone }),
        ...(validated.data.phone !== undefined && { phone: validated.data.phone?.trim() || null }),
        ...(validated.data.address !== undefined && { address: validated.data.address?.trim() || null }),
        ...(validated.data.taxRate !== undefined && { taxRate: new Decimal(validated.data.taxRate) }),
        ...(validated.data.discountRate !== undefined && { discountRate: new Decimal(validated.data.discountRate) }),
        ...(validated.data.minStockThreshold !== undefined && { minStockThreshold: validated.data.minStockThreshold }),
        ...(validated.data.allowNegativeStock !== undefined && { allowNegativeStock: validated.data.allowNegativeStock }),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "organization.update_settings",
        resourceType: "Organization",
        resourceId: membership.organizationId,
        metadata: validated.data,
      },
    });
  });

  return { success: true, data: undefined };
}

export async function getMembers() {
  const membership = await requireMembership("member:read");

  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.memberInvite.findMany({
      where: {
        organizationId: membership.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    currentUserRole: membership.role,
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
    })),
    invites: invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
  };
}

export async function inviteMember(formData: unknown): Promise<ActionResult<{ inviteUrl: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("member:manage");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengundang anggota" };
  }

  const validated = InviteMemberSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, role } = validated.data;
  const targetEmail = email.toLowerCase().trim();

  // Cek apakah sudah jadi member
  const existingMember = await db.membership.findFirst({
    where: {
      organizationId: membership.organizationId,
      user: { email: targetEmail },
    },
  });

  if (existingMember) {
    return {
      success: false,
      error: "Pengguna dengan email ini sudah menjadi anggota organisasi",
      fieldErrors: { email: ["Sudah menjadi anggota"] },
    };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // berlaku 7 hari

  const invite = await db.memberInvite.create({
    data: {
      organizationId: membership.organizationId,
      email: targetEmail,
      role,
      expiresAt,
    },
  });

  const session = await auth();

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      userId: session?.user?.id,
      action: "member.invite",
      resourceType: "MemberInvite",
      resourceId: invite.id,
      metadata: { email: targetEmail, role },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite?token=${invite.token}`;

  return { success: true, data: { inviteUrl } };
}

export async function updateMemberRole(formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("member:manage");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengubah role anggota" };
  }

  const validated = UpdateMemberRoleSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: "Data tidak valid" };
  }

  const targetMember = await db.membership.findFirst({
    where: {
      id: validated.data.membershipId,
      organizationId: membership.organizationId,
    },
  });

  if (!targetMember) {
    return { success: false, error: "Anggota tidak ditemukan" };
  }

  if (targetMember.role === "OWNER") {
    return { success: false, error: "Role OWNER tidak dapat diubah" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: validated.data.membershipId },
      data: { role: validated.data.role },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "member.update_role",
        resourceType: "Membership",
        resourceId: targetMember.id,
        metadata: { oldRole: targetMember.role, newRole: validated.data.role },
      },
    });
  });

  return { success: true, data: undefined };
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("member:manage");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengeluarkan anggota" };
  }

  const targetMember = await db.membership.findFirst({
    where: { id: membershipId, organizationId: membership.organizationId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!targetMember) {
    return { success: false, error: "Anggota tidak ditemukan" };
  }

  if (targetMember.role === "OWNER") {
    return { success: false, error: "Pemilik organisasi (OWNER) tidak dapat dihapus" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membershipId } });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "member.remove",
        resourceType: "Membership",
        resourceId: membershipId,
        metadata: { name: targetMember.user.name, email: targetMember.user.email },
      },
    });
  });

  return { success: true, data: undefined };
}

export async function getAuditLogs(params?: { page?: number; pageSize?: number }) {
  const membership = await requireMembership("auditlog:view");
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = params?.pageSize ?? 30;
  const skip = (page - 1) * pageSize;

  const [items, total] = await db.$transaction([
    db.auditLog.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.auditLog.count({
      where: { organizationId: membership.organizationId },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
