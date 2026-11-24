"use server";

import { db } from "@/lib/db";
import { RegisterSchema, CreateOrganizationSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils/format";
import { auth } from "@/lib/auth";
import { signIn } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export async function registerUser(
  formData: unknown
): Promise<ActionResult<{ userId: string }>> {
  const validated = RegisterSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password } = validated.data;

  // Cek apakah email sudah digunakan
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (existingUser) {
    return {
      success: false,
      error: "Email sudah terdaftar",
      fieldErrors: { email: ["Email sudah digunakan oleh akun lain"] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
    },
    select: { id: true },
  });

  return { success: true, data: { userId: user.id } };
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginUser(
  formData: { email: string; password: string }
): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email atau password salah" };
        default:
          return { success: false, error: "Terjadi kesalahan saat login" };
      }
    }
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// ─── CREATE ORGANIZATION (ONBOARDING) ────────────────────────────────────────

export async function createOrganization(
  formData: unknown
): Promise<ActionResult<{ organizationId: string; slug: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Sesi tidak valid, silakan login kembali" };
  }

  const validated = CreateOrganizationSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, businessType, currency, timezone, phone, address } = validated.data;

  // Cek apakah user sudah punya organisasi
  const existingMembership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { id: true },
  });

  if (existingMembership) {
    return {
      success: false,
      error: "Anda sudah memiliki organisasi. Gunakan fitur pengaturan untuk mengubah profil bisnis.",
    };
  }

  // Buat slug unik
  let slug = slugify(name);
  const existingSlug = await db.organization.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Buat organisasi dan membership dalam satu transaksi
  const result = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: name.trim(),
        slug,
        businessType,
        currency,
        timezone,
        phone,
        address,
      },
      select: { id: true, slug: true },
    });

    await tx.membership.create({
      data: {
        userId: session.user.id,
        organizationId: org.id,
        role: "OWNER",
        isActive: true,
      },
    });

    // Buat kategori pengeluaran default
    await tx.expenseCategory.createMany({
      data: [
        { organizationId: org.id, name: "Operasional" },
        { organizationId: org.id, name: "Gaji & Upah" },
        { organizationId: org.id, name: "Sewa" },
        { organizationId: org.id, name: "Utilitas" },
        { organizationId: org.id, name: "Pemasaran" },
        { organizationId: org.id, name: "Lain-lain" },
      ],
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        organizationId: org.id,
        userId: session.user.id,
        action: "organization.create",
        resourceType: "Organization",
        resourceId: org.id,
        metadata: { name, businessType },
      },
    });

    return org;
  });

  return {
    success: true,
    data: { organizationId: result.id, slug: result.slug },
  };
}
