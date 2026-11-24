import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function ensureCameraPermission(manifest) {
  if (/android:name\s*=\s*["']android\.permission\.CAMERA["']/.test(manifest)) return manifest;
  if (!manifest.includes("</manifest>")) throw new Error("Invalid Android manifest");
  return manifest.replace("</manifest>", '    <uses-permission android:name="android.permission.CAMERA" />\n</manifest>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] || "android/app/src/main/AndroidManifest.xml";
  writeFileSync(path, ensureCameraPermission(readFileSync(path, "utf8")));
}