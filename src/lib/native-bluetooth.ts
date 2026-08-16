/**
 * جسر بلوتوث أصلي داخل تطبيق أندرويد (Capacitor).
 * WebView على أندرويد لا يدعم Web Bluetooth، لذلك نوفّر واجهة
 * navigator.bluetooth مبنية على إضافة @capacitor-community/bluetooth-le
 * حتى يعمل نفس كود الطباعة داخل التطبيق بدون تعديل.
 */

let installing: Promise<boolean> | null = null;

function toDataView(value: any): DataView {
  if (value instanceof DataView) return value;
  if (value instanceof ArrayBuffer) return new DataView(value);
  const view = value as Uint8Array;
  return new DataView(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export async function installNativeBluetooth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if ((navigator as any).__sahlaNativeBt) return true;
  if (!isNativeApp()) return false;
  if (installing) return installing;

  installing = (async () => {
    const { BleClient } = await import("@capacitor-community/bluetooth-le");
    await BleClient.initialize({ androidNeverForLocation: true });

    class NativeCharacteristic {
      uuid: string;
      properties: any;
      private deviceId: string;
      private serviceUuid: string;

      constructor(deviceId: string, serviceUuid: string, uuid: string, properties: any) {
        this.deviceId = deviceId;
        this.serviceUuid = serviceUuid;
        this.uuid = uuid;
        this.properties = properties || {};
      }

      async writeValueWithoutResponse(value: any) {
        await BleClient.writeWithoutResponse(this.deviceId, this.serviceUuid, this.uuid, toDataView(value));
      }

      async writeValue(value: any) {
        await BleClient.write(this.deviceId, this.serviceUuid, this.uuid, toDataView(value));
      }
    }

    class NativeService {
      uuid: string;
      private deviceId: string;
      private chars: NativeCharacteristic[];

      constructor(deviceId: string, uuid: string, chars: NativeCharacteristic[]) {
        this.deviceId = deviceId;
        this.uuid = uuid;
        this.chars = chars;
      }

      async getCharacteristic(uuid: string) {
        const found = this.chars.find((c) => c.uuid.toLowerCase() === String(uuid).toLowerCase());
        if (!found) throw new Error("characteristic not found");
        return found;
      }

      async getCharacteristics() {
        return this.chars;
      }
    }

    class NativeGatt {
      connected = false;
      private device: NativeDevice;

      constructor(device: NativeDevice) {
        this.device = device;
      }

      async connect() {
        if (!this.connected) {
          await BleClient.connect(this.device.id, () => {
            this.connected = false;
            this.device.__emit("gattserverdisconnected");
          });
          this.connected = true;
        }
        return this;
      }

      disconnect() {
        if (!this.connected) return;
        this.connected = false;
        BleClient.disconnect(this.device.id).catch(() => {});
      }

      private async loadServices() {
        const services = await BleClient.getServices(this.device.id);
        return services.map(
          (s: any) =>
            new NativeService(
              this.device.id,
              s.uuid,
              (s.characteristics || []).map(
                (c: any) => new NativeCharacteristic(this.device.id, s.uuid, c.uuid, c.properties),
              ),
            ),
        );
      }

      async getPrimaryServices() {
        return this.loadServices();
      }

      async getPrimaryService(uuid: string) {
        const services = await this.loadServices();
        const found = services.find((s) => s.uuid.toLowerCase() === String(uuid).toLowerCase());
        if (!found) throw new Error("service not found");
        return found;
      }
    }

    class NativeDevice {
      id: string;
      name: string;
      gatt: NativeGatt;
      private listeners: Record<string, Array<() => void>> = {};

      constructor(id: string, name: string) {
        this.id = id;
        this.name = name || "Bluetooth Printer";
        this.gatt = new NativeGatt(this);
      }

      addEventListener(type: string, cb: () => void) {
        (this.listeners[type] ||= []).push(cb);
      }

      __emit(type: string) {
        (this.listeners[type] || []).forEach((cb) => {
          try {
            cb();
          } catch {}
        });
      }
    }

    const cache = new Map<string, NativeDevice>();
    const getDevice = (id: string, name?: string) => {
      const existing = cache.get(id);
      if (existing) return existing;
      const created = new NativeDevice(id, name || "Bluetooth Printer");
      cache.set(id, created);
      return created;
    };

    (navigator as any).bluetooth = {
      async getAvailability() {
        return true;
      },
      async requestDevice(options: any = {}) {
        const picked = await BleClient.requestDevice({
          optionalServices: options.optionalServices || [],
          ...(options.filters?.[0]?.services ? { services: options.filters[0].services } : {}),
        });
        return getDevice(picked.deviceId, picked.name);
      },
      async getDevices() {
        try {
          const stored = localStorage.getItem("sahla.printer.active");
          if (!stored) return [];
          const devices = await BleClient.getDevices([stored]);
          return devices.map((d: any) => getDevice(d.deviceId, d.name));
        } catch {
          return [];
        }
      },
    };

    (navigator as any).__sahlaNativeBt = true;
    return true;
  })();

  try {
    return await installing;
  } catch (e) {
    installing = null;
    console.warn("[native-bt] install failed", e);
    return false;
  }
}

/** طلب أذونات البلوتوث المطلوبة على أندرويد 12+ وتشغيل البلوتوث إن كان مطفأ. */
export async function ensureBlePermissions(): Promise<{ ok: boolean; message: string }> {
  if (!isNativeApp()) {
    return { ok: true, message: "خارج التطبيق: يُستخدم بلوتوث المتصفح" };
  }
  try {
    const { BleClient } = await import("@capacitor-community/bluetooth-le");
    await BleClient.initialize({ androidNeverForLocation: true });
    let enabled = true;
    try {
      enabled = await BleClient.isEnabled();
    } catch {}
    if (!enabled) {
      try {
        await BleClient.requestEnable();
      } catch {
        return { ok: false, message: "البلوتوث مطفأ — فعّله من إعدادات الهاتف" };
      }
    }
    // يفتح نافذة أذونات SCAN/CONNECT على أندرويد 12+
    await BleClient.requestLEScan({ allowDuplicates: false }, () => {});
    await new Promise((r) => setTimeout(r, 400));
    await BleClient.stopLEScan().catch(() => {});
    return { ok: true, message: "الأذونات ممنوحة والبلوتوث مفعّل" };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || "تعذّر منح أذونات البلوتوث" };
  }
}

export type ScannedBleDevice = { id: string; name: string; rssi?: number };

/** مسح أجهزة BLE مع عرض أسمائها داخل التطبيق (بدل نافذة النظام). */
export async function scanNativeDevices(
  onDevice: (d: ScannedBleDevice) => void,
  durationMs = 10_000,
): Promise<() => void> {
  const { BleClient } = await import("@capacitor-community/bluetooth-le");
  await BleClient.initialize({ androidNeverForLocation: true });
  await BleClient.requestLEScan({ allowDuplicates: false }, (result: any) => {
    const name = result?.device?.name || result?.localName || "";
    onDevice({ id: result.device.deviceId, name: name || "جهاز بدون اسم", rssi: result.rssi });
  });
  const stop = () => {
    BleClient.stopLEScan().catch(() => {});
  };
  const timer = setTimeout(stop, durationMs);
  return () => {
    clearTimeout(timer);
    stop();
  };
}
