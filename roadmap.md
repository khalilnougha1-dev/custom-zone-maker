# Barcode scan sweep

## Supplier alignment and sale scanner

- [x] Place supplier names at the right edge with separate balance and edit/delete controls; verified at 320, 360, 430, and 1280px.
- [x] Verify the existing red new-sale scanner opens and decodes 00123456 using a simulated camera in the signed-in account without saving a sale. No scanner code change was needed; physical Android permission remains dependent on the updated APK.

## Mobile editor layout

## Inventory typography

- [x] Separate product name, reference, price, and stock with readable mobile typography; give header tools their own mobile row so the title and logo remain readable.
- [x] Verify signed-in inventory search and long values at 320–430px and desktop widths without changing data.

- [x] Fit product and package fields, sale modes, images, and barcode controls inside narrow phone screens.
- [x] Verify new product/package drafts at 320, 360, 390, 430, and 1280px widths, plus the existing product editor at 360px, in the signed-in account without saving data. Confirm no horizontal overflow and inspect mobile screenshots. Existing package-edit save behavior is unchanged and was not exercised.

- [x] Reuse camera scanning in purchases, POS, product editors, and package editors.
- [x] Verify Android camera declaration across GitHub and local build paths.
- [x] Test barcode lookup, scanner lifecycle, and signed-in mobile flows without saving transactions.

## Reviewed surfaces

- New/edit purchases: shared editor already opens the camera; repeated decoding verified against the signed-in account with an unknown barcode.
- New/edit sales: replaced manual-only scan button with the camera and kept the existing add-entry/stock checks; camera decoding verified without saving a sale.
- New/edit products: wired inactive camera button to update the draft; continuous mode keeps scanning, latest code is shown, and closing releases tracks. Verified on mobile and desktop.
- New/edit packages: wired inactive camera button to update the draft; shared scanner appears above nested editors. Verified adding a package draft without saving. Existing package-edit save path was read, not exercised.
- Manual entry and search: read product/package/POS/purchase paths; retained manual entry and substring search, while scanner lookup remains exact.
- Database definitions: read product/package barcode text columns and their update trigger; no camera or barcode-decoding job/function exists in the searched migrations. No stored data changed.
- Offline: POS already loads cached products/packages containing their barcode; scanner has no network decode call. First-time offline loading was not exercised.
- Android: read Capacitor video permission handler and template manifest; added missing CAMERA declaration through the shared script in GitHub/Linux/macOS/Windows build paths. Script tests passed; APK building and physical-phone camera consent remain unverified.

## External follow-up

- Publish web changes, then build/install a new APK for its added camera declaration. Physical phone and Windows/macOS build execution require the user's device.