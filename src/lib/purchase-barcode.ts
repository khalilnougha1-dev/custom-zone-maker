type BarcodeEntry = {
  kind: "product" | "package";
  product: { barcode?: string | null };
  pkg: { barcode?: string | null } | null;
};

export function findPurchaseBarcode<T extends BarcodeEntry>(entries: T[], code: string): T | undefined {
  const barcode = code.trim();
  if (!barcode) return undefined;
  return entries.find(entry => {
    const value = entry.kind === "package" ? entry.pkg?.barcode : entry.product.barcode;
    return value?.trim() === barcode;
  });
}