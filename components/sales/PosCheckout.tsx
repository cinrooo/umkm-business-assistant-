"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/lib/actions/sales";
import { formatCurrency } from "@/lib/utils/format";
import { Search, Plus, Minus, ShoppingCart, Loader2, CheckCircle } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  category: { name: string } | null;
}

interface CustomerItem {
  id: string;
  name: string;
  phone: string | null;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  discountAmount: number;
}

interface PosCheckoutProps {
  products: ProductItem[];
  customers: CustomerItem[];
  taxRate: number;
  allowNegativeStock: boolean;
}

export function PosCheckout({
  products,
  customers,
  taxRate,
  allowNegativeStock,
}: PosCheckoutProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Extract unique category names
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.category?.name === selectedCategory;
    return matchSearch && matchCat;
  });

  // Cart operations
  const addToCart = (product: ProductItem) => {
    setError(null);
    if (!allowNegativeStock && product.currentStock <= 0) {
      setError(`Stok ${product.name} habis`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (!allowNegativeStock && existing.quantity >= product.currentStock) {
          setError(`Maksimal stok ${product.name} adalah ${product.currentStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discountAmount: 0 }];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!allowNegativeStock && product && newQty > product.currentStock) {
      setError(`Stok ${product.name} hanya tersedia ${product.currentStock}`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce(
    (acc, item) => acc + Math.max(0, (item.product.sellingPrice - item.discountAmount) * item.quantity),
    0
  );
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const total = afterDiscount + taxAmount;
  const change = paymentMethod === "CASH" && cashGiven > total ? cashGiven - total : 0;

  const handleCheckout = () => {
    setError(null);
    if (cart.length === 0) {
      setError("Keranjang masih kosong");
      return;
    }

    if (paymentMethod === "CASH" && cashGiven > 0 && cashGiven < total) {
      setError(`Uang tunai kurang. Total tagihan adalah ${formatCurrency(total)}`);
      return;
    }

    // Generate idempotency key
    const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    startTransition(async () => {
      const payload = {
        customerId: customerId || undefined,
        paymentMethod,
        paymentStatus: "PAID" as const,
        discountAmount,
        notes: notes.trim() || undefined,
        idempotencyKey,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discountAmount: item.discountAmount,
        })),
      };

      const res = await createSale(payload);

      if (!res.success) {
        setError(res.error);
        return;
      }

      router.push(`/sales/${res.data.saleId}`);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Kolom Kiri: Katalog Produk (8 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang atau SKU..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Grid Produk */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-gray-500">
              Tidak ada produk yang cocok dengan pencarian
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOutOfStock = !allowNegativeStock && p.currentStock <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isOutOfStock
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 bg-white hover:border-green-500 hover:shadow-sm active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400">{p.sku}</span>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5">{p.name}</h3>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Stok: {p.currentStock} {p.unit}</div>
                      <div className="text-sm font-bold text-green-700">{formatCurrency(p.sellingPrice)}</div>
                    </div>
                    <span className="rounded-lg bg-green-50 p-1.5 text-green-700">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Kolom Kanan: Keranjang & Pembayaran (5 cols) */}
      <div className="lg:col-span-5 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900">Keranjang ({cart.length} item)</h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
            >
              Kosongkan
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Daftar Item di Keranjang */}
        <div className="flex-1 overflow-y-auto max-h-[260px] p-4 divide-y divide-gray-100">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Klik produk di sebelah kiri untuk menambahkan ke keranjang
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(item.product.sellingPrice)} / {item.product.unit}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 cursor-pointer"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 cursor-pointer"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>

                <div className="text-right min-w-[70px]">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(item.product.sellingPrice * item.quantity)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form Checkout & Summary */}
        <div className="border-t border-gray-200 p-5 bg-gray-50/50 space-y-4">
          {/* Pelanggan */}
          <div>
            <label htmlFor="pos-cust" className="block text-xs font-medium text-gray-700 mb-1">
              Pelanggan (Opsional)
            </label>
            <select
              id="pos-cust"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white cursor-pointer"
            >
              <option value="">Pelanggan Umum (Tanpa Nama)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "TRANSFER", "QRIS"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-lg border py-1.5 text-xs font-medium cursor-pointer ${
                    paymentMethod === m
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {m === "CASH" ? "Tunai" : m}
                </button>
              ))}
            </div>
          </div>

          {/* Input Tunai Diterima jika bayar Cash */}
          {paymentMethod === "CASH" && (
            <div>
              <label htmlFor="pos-cash" className="block text-xs font-medium text-gray-700 mb-1">
                Uang Diterima
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-gray-500">Rp</span>
                <input
                  id="pos-cash"
                  type="number"
                  step="1000"
                  value={cashGiven || ""}
                  onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                  placeholder={String(total)}
                  className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-900 bg-white"
                />
              </div>
            </div>
          )}

          {/* Diskon & Catatan Nota */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="pos-discount" className="block text-xs font-medium text-gray-700 mb-1">
                Diskon Nota (Rp)
              </label>
              <input
                id="pos-discount"
                type="number"
                min="0"
                step="500"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs text-gray-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="pos-notes" className="block text-xs font-medium text-gray-700 mb-1">
                Catatan
              </label>
              <input
                id="pos-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Meja 4..."
                className="w-full rounded-lg border border-gray-300 py-1.5 px-2.5 text-xs text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Rincian Finansial */}
          <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal:</span>
              <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Pajak (PPN {taxRate}%):</span>
                <span className="text-gray-900 font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total Tagihan:</span>
              <span className="text-green-700">{formatCurrency(total)}</span>
            </div>
            {paymentMethod === "CASH" && cashGiven >= total && (
              <div className="flex justify-between text-xs font-semibold text-blue-700 pt-1">
                <span>Kembalian:</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isPending || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Memproses Transaksi...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Selesaikan Transaksi ({formatCurrency(total)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
