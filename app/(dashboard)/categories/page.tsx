import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/actions/categories";
import { PageHeader } from "@/components/shared/PageHeader";
import { CategoryList } from "@/components/categories/CategoryList";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await getCategories();

  return (
    <div className="p-6">
      <PageHeader
        title="Kategori Produk"
        description="Kelola kategori untuk mengelompokkan produk Anda"
      />

      <CategoryList initialCategories={categories} />
    </div>
  );
}
