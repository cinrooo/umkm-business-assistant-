import { z } from "zod";

// ─── AUTH SCHEMAS ─────────────────────────────────────────────────────────────

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ─── ORGANIZATION SCHEMAS ─────────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Nama bisnis minimal 2 karakter")
    .max(100, "Nama bisnis maksimal 100 karakter"),
  businessType: z.string().optional(),
  currency: z.string().default("IDR"),
  timezone: z.string().default("Asia/Jakarta"),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

export const UpdateOrganizationSchema = CreateOrganizationSchema.extend({
  taxRate: z.coerce
    .number()
    .min(0, "Tarif pajak minimal 0%")
    .max(100, "Tarif pajak maksimal 100%")
    .optional(),
  discountRate: z.coerce
    .number()
    .min(0, "Tarif diskon minimal 0%")
    .max(100, "Tarif diskon maksimal 100%")
    .optional(),
  minStockThreshold: z.coerce
    .number()
    .min(0, "Ambang batas stok minimal 0")
    .optional(),
  allowNegativeStock: z.boolean().optional(),
});

// ─── PRODUCT SCHEMAS ──────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi")
    .max(200, "Nama produk maksimal 200 karakter"),
  sku: z
    .string()
    .min(1, "SKU wajib diisi")
    .max(50, "SKU maksimal 50 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "SKU hanya boleh mengandung huruf, angka, - dan _"),
  categoryId: z.string().optional(),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1, "Satuan wajib diisi").max(20).default("pcs"),
  costPrice: z.coerce
    .number()
    .min(0, "Harga modal tidak boleh negatif"),
  sellingPrice: z.coerce
    .number()
    .min(0, "Harga jual tidak boleh negatif"),
  currentStock: z.coerce
    .number()
    .int("Stok harus bilangan bulat")
    .min(0, "Stok awal tidak boleh negatif")
    .default(0),
  minStock: z.coerce.number().int().min(0).optional(),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({
  currentStock: true, // stok diubah via inventory, bukan form produk
});

// ─── CATEGORY SCHEMAS ─────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori wajib diisi")
    .max(100, "Nama kategori maksimal 100 karakter"),
  description: z.string().max(500).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

// ─── INVENTORY SCHEMAS ────────────────────────────────────────────────────────

export const AdjustStockSchema = z.object({
  productId: z.string().cuid("ID produk tidak valid"),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "LOSS"]),
  quantity: z.coerce
    .number()
    .int("Jumlah harus bilangan bulat")
    .refine((n) => n !== 0, "Jumlah tidak boleh 0"),
  reason: z.string().min(1, "Alasan wajib diisi").max(200),
  notes: z.string().max(500).optional(),
});

// ─── SALE SCHEMAS ─────────────────────────────────────────────────────────────

export const SaleItemInputSchema = z.object({
  productId: z.string().cuid("ID produk tidak valid"),
  quantity: z.coerce
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1"),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const CreateSaleSchema = z.object({
  customerId: z.string().optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "DEBIT", "CREDIT", "QRIS", "OTHER"]).default("CASH"),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("PAID"),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1),
  items: z
    .array(SaleItemInputSchema)
    .min(1, "Minimal 1 produk dalam transaksi"),
});

export const CancelSaleSchema = z.object({
  saleId: z.string().cuid("ID transaksi tidak valid"),
  reason: z.string().min(1, "Alasan pembatalan wajib diisi").max(200),
});

// ─── CUSTOMER SCHEMAS ─────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "Nama pelanggan wajib diisi")
    .max(200, "Nama pelanggan maksimal 200 karakter"),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// ─── SUPPLIER SCHEMAS ─────────────────────────────────────────────────────────

export const CreateSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Nama pemasok wajib diisi")
    .max(200, "Nama pemasok maksimal 200 karakter"),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

// ─── EXPENSE SCHEMAS ──────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce
    .number()
    .positive("Jumlah pengeluaran harus lebih dari 0"),
  paymentMethod: z
    .enum(["CASH", "TRANSFER", "DEBIT", "CREDIT", "QRIS", "OTHER"])
    .default("CASH"),
  description: z
    .string()
    .min(1, "Deskripsi pengeluaran wajib diisi")
    .max(200),
  notes: z.string().max(500).optional(),
  expenseDate: z.coerce.date({
    errorMap: () => ({ message: "Tanggal tidak valid" }),
  }),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const CreateExpenseCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori wajib diisi")
    .max(100, "Nama kategori maksimal 100 karakter"),
});

// ─── MEMBER SCHEMAS ───────────────────────────────────────────────────────────

export const InviteMemberSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export const UpdateMemberRoleSchema = z.object({
  membershipId: z.string().cuid(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

// ─── PAGINATION / FILTER SCHEMAS ──────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const DateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
