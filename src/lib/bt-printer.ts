// Web Bluetooth ESC/POS printing for thermal printers (Xprinter XP-P323B and similar)
// Uses raster bitmap (GS v 0) so Arabic and any language render correctly.

import html2canvas from "html2canvas";

// Common ESC/POS BLE service/characteristic combinations
const SERVICE_CANDIDATES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // most Xprinter / generic ESC/POS
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

const WRITE_CANDIDATES = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000fee8-0000-1000-8000-00805f9b34fb",
  "49535343-8841-43f4-a8d4-ecbe34729bb3",
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
];

const ACTIVE_KEY = "sahla.bt.printerId";
const NAME_KEY = "sahla.bt.printerName";

declare global {
  interface Navigator {
    bluetooth?: any;
  }
}

export function isWebBluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

export function getRememberedPrinterName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function clearRememberedPrinter() {
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(NAME_KEY);
}

export async function pairPrinter(): Promise<{ id: string; name: string }> {
  if (!isWebBluetoothSupported()) {
    throw new Error("متصفحك لا يدعم Web Bluetooth. استخدم Chrome على أندرويد.");
  }
  const device = await navigator.bluetooth!.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_CANDIDATES,
  });
  localStorage.setItem(ACTIVE_KEY, device.id);
  localStorage.setItem(NAME_KEY, device.name || "Bluetooth Printer");
  return { id: device.id, name: device.name || "Bluetooth Printer" };
}

async function getRememberedDevice(): Promise<any | null> {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id || !navigator.bluetooth?.getDevices) return null;
  try {
    const devices = await navigator.bluetooth.getDevices();
    return devices.find((d: any) => d.id === id) || null;
  } catch {
    return null;
  }
}

async function connectAndFindCharacteristic(device: any) {
  if (!device.gatt) throw new Error("الجهاز لا يدعم GATT");
  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        return c;
      }
    }
  }
  // Fallback to known UUIDs
  for (const sUuid of SERVICE_CANDIDATES) {
    try {
      const svc = await server.getPrimaryService(sUuid);
      for (const wUuid of WRITE_CANDIDATES) {
        try {
          const c = await svc.getCharacteristic(wUuid);
          return c;
        } catch {}
      }
    } catch {}
  }
  throw new Error("تعذر إيجاد قناة الكتابة على الطابعة");
}

async function writeChunks(characteristic: any, bytes: Uint8Array) {
  const chunkSize = 180; // safe MTU for BLE
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.slice(i, i + chunkSize);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(slice);
    } else {
      await characteristic.writeValue(slice);
    }
    // small delay to avoid printer buffer overrun
    await new Promise((r) => setTimeout(r, 20));
  }
}

// Render an HTML element to a 1-bit raster matching the printer's pixel width
async function htmlToRaster(
  el: HTMLElement,
  paperPx = 384, // 58mm = 384, 80mm = 576
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const canvas = await html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: paperPx / el.offsetWidth,
    useCORS: true,
  });

  // Resize to exact width if needed
  const targetW = paperPx;
  const ratio = targetW / canvas.width;
  const targetH = Math.round(canvas.height * ratio);

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(canvas, 0, 0, targetW, targetH);

  const img = ctx.getImageData(0, 0, targetW, targetH).data;
  const widthBytes = targetW / 8;
  const raster = new Uint8Array(widthBytes * targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const i = (y * targetW + x) * 4;
      // luminance
      const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      const black = lum < 160 ? 1 : 0;
      if (black) {
        const byteIndex = y * widthBytes + Math.floor(x / 8);
        raster[byteIndex] |= 1 << (7 - (x % 8));
      }
    }
  }
  return { bytes: raster, width: targetW, height: targetH };
}

function buildEscPosImage(raster: Uint8Array, width: number, height: number): Uint8Array {
  const widthBytes = width / 8;
  const header = new Uint8Array([
    0x1b, 0x40, // ESC @ initialize
    0x1d, 0x76, 0x30, 0x00, // GS v 0 m=0 (normal)
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ]);
  const feed = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]); // feed + GS V B (cut)
  const out = new Uint8Array(header.length + raster.length + feed.length);
  out.set(header, 0);
  out.set(raster, header.length);
  out.set(feed, header.length + raster.length);
  return out;
}

export async function printHtmlBluetooth(
  html: string,
  paperWidthPx = 384,
): Promise<void> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth غير مدعوم");
  }

  // Try remembered device first; if browser didn't surface it, re-pick (user gesture from print click)
  let device = await getRememberedDevice();
  if (!device) {
    const picked = await navigator.bluetooth!.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_CANDIDATES,
    });
    localStorage.setItem(ACTIVE_KEY, picked.id);
    localStorage.setItem(NAME_KEY, picked.name || "Bluetooth Printer");
    device = picked;
  }

  // Render HTML inside an isolated iframe so app-level oklch tokens don't leak in
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${paperWidthPx}px;height:10px;border:0;background:#fff;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      *,*::before,*::after{box-sizing:border-box;color:#000 !important;background:transparent !important;border-color:#000 !important;}
      html,body{margin:0;padding:0;background:#fff !important;color:#000 !important;font-family:Arial,sans-serif;}
    </style></head><body>${html}</body></html>`);
    doc.close();

    // wait for layout
    await new Promise((r) => setTimeout(r, 50));
    const body = doc.body as HTMLElement;
    iframe.style.height = body.scrollHeight + "px";

    const raster = await htmlToRaster(body, paperWidthPx);
    const escposBytes = buildEscPosImage(raster.bytes, raster.width, raster.height);

    const characteristic = await connectAndFindCharacteristic(device);
    await writeChunks(characteristic, escposBytes);

    try {
      device.gatt?.disconnect();
    } catch {}
  } finally {
    iframe.remove();
  }
}
