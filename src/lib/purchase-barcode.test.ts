import { test } from "node:test";
import { strict as assert } from "node:assert";
import { findPurchaseBarcode } from "./purchase-barcode";

const product = { kind: "product" as const, product: { barcode: "00123456" }, pkg: null };
const carton = { kind: "package" as const, product: product.product, pkg: { barcode: "99887766" } };

test("scanned product barcode selects that product and preserves leading zeroes", () => {
  assert.equal(findPurchaseBarcode([product, carton], " 00123456 "), product);
  assert.equal(findPurchaseBarcode([product, carton], "123456"), undefined);
});
test("scanned carton barcode selects its package rather than the base product", () => {
  assert.equal(findPurchaseBarcode([product, carton], "99887766"), carton);
});
test("unknown, partial, or empty barcodes do not add an unrelated product", () => {
  for (const barcode of ["", "0012", "00000000"]) {
    assert.equal(findPurchaseBarcode([product, carton], barcode), undefined);
  }
});