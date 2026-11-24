/**
 * Format angka sebagai mata uang Rupiah (IDR)
 * Contoh: 150000 => "Rp 150.000"
 */
export function formatCurrency(
  amount: number | string,
  options?: { compact?: boolean }
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) return "Rp 0";

  if (options?.compact && Math.abs(num) >= 1_000_000) {
    const formatted = (num / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    });
    return `Rp ${formatted}jt`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format tanggal ke format Indonesia
 * Contoh: 2024-11-23 => "23 November 2024"
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "-";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
    ...options,
  };

  return new Intl.DateTimeFormat("id-ID", defaultOptions).format(d);
}

/**
 * Format tanggal dan waktu
 * Contoh: 2024-11-23T10:30:00 => "23 Nov 2024, 10:30"
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format angka dengan pemisah ribuan
 * Contoh: 1500 => "1.500"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Format persentase
 * Contoh: 11 => "11%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

/**
 * Hitung perubahan persentase antara dua nilai
 */
export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Buat slug dari string
 * Contoh: "Toko Berkah Jaya" => "toko-berkah-jaya"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Hitung subtotal sale item
 * Menggunakan Decimal-safe arithmetic (semua input harus sudah di-round)
 */
export function calcItemSubtotal(
  unitPrice: number,
  quantity: number,
  discountAmount = 0
): number {
  return Math.max(0, (unitPrice - discountAmount) * quantity);
}

/**
 * Hitung total transaksi penjualan
 */
export function calcSaleTotal(
  subtotal: number,
  discountAmount: number,
  taxRate: number // dalam persen, contoh: 11 untuk 11%
): { taxAmount: number; total: number } {
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;
  return { taxAmount: Math.round(taxAmount), total: Math.round(total) };
}
