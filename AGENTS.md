# Architecture rules

- Keep purchase camera scanning in a browser-only lifecycle with a dynamically imported ZXing reader, and release camera tracks on close; this avoids SSR camera access and leaves the phone camera available afterward.
- Resolve scanned purchase barcodes by exact product/package barcode in the shared lookup helper; this preserves leading zeros and prevents partial matches from adding the wrong item.