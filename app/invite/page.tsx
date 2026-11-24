import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Building } from "lucide-react";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-gray-900">Token Undangan Tidak Ditemukan</h1>
          <p className="mt-1 text-xs text-gray-500">Link undangan tidak valid atau format salah.</p>
        </div>
      </div>
    );
  }

  const invite = await db.memberInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true, businessType: true } } },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-gray-900">Undangan Kedaluwarsa atau Tidak Valid</h1>
          <p className="mt-1 text-xs text-gray-500">
            Link undangan ini sudah melewati batas waktu 7 hari atau telah diterima sebelumnya.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  // Jika belum login, arahkan ke login/register dengan callbackUrl
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <Building className="mx-auto h-10 w-10 text-green-600 mb-3" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900">Undangan Bergabung Tim</h1>
          <p className="mt-1 text-sm text-gray-600">
            Anda diundang untuk bergabung dengan <strong>{invite.organization.name}</strong> sebagai{" "}
            <strong>{invite.role}</strong>.
          </p>

          <div className="mt-6 space-y-2">
            <Link
              href={`/login?callbackUrl=/invite?token=${token}`}
              className="block w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Masuk dengan Akun yang Ada
            </Link>
            <Link
              href={`/register?callbackUrl=/invite?token=${token}`}
              className="block w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Buat Akun Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Jika sudah login, masukkan user ke organisasi
  await db.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: invite.organizationId,
        },
      },
      update: {
        role: invite.role,
        isActive: true,
      },
      create: {
        userId: session.user.id,
        organizationId: invite.organizationId,
        role: invite.role,
        isActive: true,
      },
    });

    await tx.memberInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  redirect("/dashboard");
}
