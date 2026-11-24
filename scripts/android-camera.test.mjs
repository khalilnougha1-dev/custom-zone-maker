import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureCameraPermission } from "./android-camera.mjs";

test("camera access is declared without changing existing permissions", () => {
  const original = '<manifest><uses-permission android:name="android.permission.INTERNET" /></manifest>';
  const result = ensureCameraPermission(original);
  assert.equal((result.match(/android.permission.CAMERA/g) || []).length, 1);
  assert.ok(result.includes('<uses-permission android:name="android.permission.INTERNET" />'));
  assert.equal(result.replace('    <uses-permission android:name="android.permission.CAMERA" />\n', ''), original);
});
test("repeated platform sync never duplicates the camera permission", () => {
  const once = ensureCameraPermission('<manifest></manifest>');
  assert.equal(ensureCameraPermission(once), once);
});
test("invalid manifests stop the build instead of silently omitting camera permission", () => {
  assert.throws(() => ensureCameraPermission('<application />'), /Invalid Android manifest/);
});