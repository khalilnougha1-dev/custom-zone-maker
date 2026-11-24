# Architecture rules

- Reuse the camera scanner in purchases, POS, and product/package editors with a dynamically imported ZXing reader and release tracks on close; this avoids SSR camera access and leaves the camera available afterward.
- Resolve sale and purchase barcodes by exact product/package barcode in the shared lookup helper; this preserves leading zeros and prevents partial matches from adding the wrong item.
- In editor continuous-scan mode keep the camera open and update the draft's single barcode to the last scan; the schema stores one barcode and existing records must not be rewritten automatically.
- Run the shared Android camera manifest step after Capacitor sync in every APK build path; WebView video capture needs the manifest declaration as well as the user's runtime consent.
- Mount the full-screen product editor in a body portal so its nested package editor is above the POS header; the page main area creates a lower stacking context that otherwise blocks editor buttons.
- Use the shared EditorRow grid for product/package fields and expand complex controls to a full mobile row; constrained minmax tracks prevent fixed-width inputs and image tools from overflowing phones.
- In PosLayout, place page actions in a separate mobile header row when present and retain a single desktop row; titles and the brand logo must not compete with dense toolbars.