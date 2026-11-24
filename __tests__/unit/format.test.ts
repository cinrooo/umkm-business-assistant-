import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCurrency,
  formatNumber,
  calcItemSubtotal,
  calcSaleTotal,
  calcPercentChange,
  slugify,
} from "../../lib/utils/format";

describe("Format & Calculation Utilities", () => {
  it("formatCurrency formats IDR numbers correctly", () => {
    assert.match(formatCurrency(150000), /150\.000/);
    assert.match(formatCurrency(0), /0/);
  });

  it("formatCurrency compact formats millions correctly", () => {
    const compact = formatCurrency(2500000, { compact: true });
    assert.equal(compact.includes("jt"), true);
  });

  it("formatNumber adds thousands separators in id-ID format", () => {
    assert.equal(formatNumber(1500), "1.500");
    assert.equal(formatNumber(2500000), "2.500.000");
  });

  it("slugify generates clean URL-safe slugs", () => {
    assert.equal(slugify("Toko Berkah Jaya 123!"), "toko-berkah-jaya-123");
    assert.equal(slugify("Kopi & Roti"), "kopi-roti");
  });

  it("calcItemSubtotal calculates accurately with item discount", () => {
    // 5 items @ Rp 10.000 with Rp 1.000 discount each = Rp 45.000
    const subtotal = calcItemSubtotal(10000, 5, 1000);
    assert.equal(subtotal, 45000);

    // Negative prevention
    const zeroSubtotal = calcItemSubtotal(5000, 2, 6000);
    assert.equal(zeroSubtotal, 0);
  });

  it("calcSaleTotal applies transaction discount and tax accurately", () => {
    // Subtotal Rp 100.000, Diskon Rp 10.000, PPN 11%
    // Dasar pengenaan pajak = Rp 90.000
    // Pajak = 11% * 90.000 = Rp 9.900
    // Total = 90.000 + 9.900 = Rp 99.900
    const result = calcSaleTotal(100000, 10000, 11);
    assert.equal(result.taxAmount, 9900);
    assert.equal(result.total, 99900);
  });

  it("calcPercentChange handles growth and zero baselines", () => {
    assert.equal(calcPercentChange(150, 100), 50); // 50% increase
    assert.equal(calcPercentChange(50, 100), -50); // 50% decrease
    assert.equal(calcPercentChange(100, 0), 100);
  });
});
