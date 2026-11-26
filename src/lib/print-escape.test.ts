import { test } from "node:test";
import { strict as assert } from "node:assert";
import { escHtml } from "./print-receipt";

test("printer name is printed as text", () => {
  assert.equal(escHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
});
