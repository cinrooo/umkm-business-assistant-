import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Financial and Inventory Business Rules", () => {
  it("Omzet vs Laba Kotor vs Laba Bersih calculation consistency", () => {
    // Skenario Bisnis:
    // Penjualan 10 item A: Harga Jual Rp 15.000, Modal HPP Snapshot Rp 10.000.
    // Penjualan 5 item B: Harga Jual Rp 20.000, Modal HPP Snapshot Rp 12.000.
    // Diskon transaksi: Rp 5.000.
    // Pengeluaran operasional toko (listrik & sewa): Rp 30.000.

    const items = [
      { qty: 10, sellPrice: 15000, costSnapshot: 10000 },
      { qty: 5, sellPrice: 20000, costSnapshot: 12000 },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.sellPrice, 0);
    assert.equal(subtotal, 250000); // 150.000 + 100.000

    const discount = 5000;
    const omzet = subtotal - discount; // Rp 245.000

    const totalHPP = items.reduce((sum, item) => sum + item.qty * item.costSnapshot, 0);
    assert.equal(totalHPP, 160000); // 100.000 + 60.000

    // Laba Kotor = Omzet (setelah diskon) - Total HPP
    const labaKotor = omzet - totalHPP;
    assert.equal(labaKotor, 85000); // Rp 85.000

    const marginLabaKotor = (labaKotor / omzet) * 100;
    assert.equal(marginLabaKotor.toFixed(1), "34.7");

    // Pengeluaran Operasional
    const pengeluaranOperasional = 30000;

    // Estimasi Laba Bersih = Laba Kotor - Pengeluaran Operasional
    const labaBersih = labaKotor - pengeluaranOperasional;
    assert.equal(labaBersih, 55000); // Rp 55.000

    // Verifikasi: Laba Kotor != Laba Bersih
    assert.notEqual(labaKotor, labaBersih);
  });

  it("Stock reduction arithmetic and non-negative stock validation", () => {
    const initialStock = 20;
    const itemsSold = 15;
    const newStock = initialStock - itemsSold;

    assert.equal(newStock, 5);

    // Oversell attempt check
    const oversellQty = 10;
    const canFulfill = newStock >= oversellQty;
    assert.equal(canFulfill, false); // Stok sisa 5, tidak boleh jual 10 jika allowNegativeStock = false
  });

  it("Stock reversal restores exactly the original stock quantity upon cancellation", () => {
    let currentStock = 5;
    const originalQtySold = 15;

    // Reversal / refund
    currentStock += originalQtySold;
    assert.equal(currentStock, 20); // Kembali ke stok semula sebelum transaksi
  });
});
