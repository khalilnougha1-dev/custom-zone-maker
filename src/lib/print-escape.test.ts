import { expect, test } from "vitest";
import { escHtml } from "./print-receipt";
test("printer name is printed as text", () => { expect(escHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;'); });
