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
    await BleClient.initialize({ androidNeverForLocation: false });

    class NativeCharacteristic {
      uuid: string;
      properties: any;
      __sahlaNative = true;
      maxChunkSize = 20;
      private deviceId: string;
      private serviceUuid: string;

      constructor(
        deviceId: string,
        serviceUuid: string,
        uuid: string,
        properties: any,
        maxChunkSize = 20,
      ) {
        this.deviceId = deviceId;
        this.serviceUuid = serviceUuid;
        this.uuid = uuid;
        this.properties = properties || {};
        this.maxChunkSize = maxChunkSize;
      }

      async writeValueWithoutResponse(value: any) {
        await BleClient.writeWithoutResponse(
          this.deviceId,
          this.serviceUuid,
          this.uuid,
          toDataView(value),
        );
      }

      async writeValue(value: any) {
        await BleClient.write(this.deviceId, this.serviceUuid, this.uuid, toDataView(value));
      }
    }

    const isWritableCharacteristic = (characteristic: any) => {
      const properties = characteristic?.properties || {};
      return !!(properties.write || properties.writeWithoutResponse);
    };

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
        const found = this.chars.find(
          (c) => c.uuid.toLowerCase() === String(uuid).toLowerCase() && isWritableCharacteristic(c),
        );
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
      private maxChunkSize = 20;

      constructor(device: NativeDevice) {
        this.device = device;
      }

      async connect() {
        if (!this.connected) {
          // Android GATT is unreliable when a connection starts while scanning is
          // still being stopped. Close any scan, release a stale GATT instance,
          // then give the Bluetooth stack a short settling period.
          await BleClient.stopLEScan().catch(() => {});
          await BleClient.disconnect(this.device.id).catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 700));

          try {
            await BleClient.connect(
              this.device.id,
              () => {
                this.connected = false;
                this.device.__emit("gattserverdisconnected");
              },
              { timeout: 12_000, skipDescriptorDiscovery: false },
            );
            this.connected = true;

            // Use the actual negotiated MTU. Many Android printers legitimately
            // stay at 23 bytes, so writes must then remain at 20 payload bytes.
            try {
              const mtu = await BleClient.getMtu(this.device.id);
              this.maxChunkSize = Math.max(20, Math.min(64, Number(mtu || 23) - 3));
            } catch {
              this.maxChunkSize = 20;
            }

            try {
              const mod = await import("@capacitor-community/bluetooth-le");
              await BleClient.requestConnectionPriority(
                this.device.id,
                mod.ConnectionPriority.CONNECTION_PRIORITY_HIGH,
              );
            } catch {}
          } catch (error) {
            this.connected = false;
            await BleClient.disconnect(this.device.id).catch(() => {});
            const raw = error instanceof Error ? error.message : String(error || "");
            if (/status\s*147|\b147\b/i.test(raw)) {
              throw new Error(
                "تعذّر فتح قناة BLE (خطأ 147). أطفئ الطابعة وشغّلها، أغلق أي تطبيق طباعة آخر، ثم أعد الاتصال.",
              );
            }
            throw error;
          }
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
              (s.characteristics || [])
                .filter(isWritableCharacteristic)
                .map(
                  (c: any) =>
                    new NativeCharacteristic(
                      this.device.id,
                      s.uuid,
                      c.uuid,
                      c.properties,
                      this.maxChunkSize,
                    ),
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
        let stored: string | null = null;
        let storedName = "Bluetooth Printer";
        try {
          stored = localStorage.getItem("sahla.bt.printerId");
          storedName = localStorage.getItem("sahla.bt.printerName") || storedName;
        } catch {}
        if (!stored) return [];
        try {
          const devices = await BleClient.getDevices([stored]);
          if (devices.length)
            return devices.map((d: any) => getDevice(d.deviceId, d.name || storedName));
        } catch {}
        // مهم: نرجّع الجهاز المحفوظ دائمًا حتى لا تفتح نافذة "Scanning..." النظامية
        return [getDevice(stored, storedName)];
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
    // ملاحظة: نطلب أيضًا إذن الموقع لأن أندرويد 11 وما دونه يشترطه لعمل البحث
    await BleClient.initialize({ androidNeverForLocation: false });
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
    // يفتح نافذة أذونات SCAN/CONNECT على أندرويد 12+ (والموقع على الأقدم)
    await BleClient.requestLEScan({ allowDuplicates: true }, () => {});
    await new Promise((r) => setTimeout(r, 500));
    await BleClient.stopLEScan().catch(() => {});
    return { ok: true, message: "الأذونات ممنوحة والبلوتوث مفعّل" };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || "تعذّر منح أذونات البلوتوث" };
  }
}

export type ScannedBleDevice = { id: string; name: string; rssi?: number; bonded?: boolean };

/** الأجهزة المقترنة مسبقًا من إعدادات الهاتف (تظهر فورًا بدون بحث). */
export async function getBondedNativeDevices(): Promise<ScannedBleDevice[]> {
  if (!isNativeApp()) return [];
  try {
    const { BleClient } = await import("@capacitor-community/bluetooth-le");
    await BleClient.initialize({ androidNeverForLocation: false });
    const anyClient = BleClient as any;
    const list: any[] = (await anyClient.getBondedDevices?.([])) || [];
    return list.map((d) => ({
      id: d.deviceId,
      name: d.name || "جهاز مقترن",
      bonded: true,
    }));
  } catch {
    return [];
  }
}

/** مسح أجهزة BLE مع عرض أسمائها داخل التطبيق (بدل نافذة النظام). */
export async function scanNativeDevices(
  onDevice: (d: ScannedBleDevice) => void,
  durationMs = 20_000,
): Promise<() => void> {
  const { BleClient } = await import("@capacitor-community/bluetooth-le");
  await BleClient.initialize({ androidNeverForLocation: false });

  // أظهر الأجهزة المقترنة أولًا (مثل XP-P323B المقترنة من إعدادات الهاتف)
  for (const d of await getBondedNativeDevices()) onDevice(d);

  const mod = await import("@capacitor-community/bluetooth-le");
  await BleClient.requestLEScan(
    { allowDuplicates: true, scanMode: mod.ScanMode.SCAN_MODE_LOW_LATENCY },
    (result: any) => {
      const name = result?.device?.name || result?.localName || "";
      onDevice({
        id: result.device.deviceId,
        name: name || `جهاز ${String(result.device.deviceId).slice(-5)}`,
        rssi: result.rssi,
      });
    },
  );
  const stop = () => {
    BleClient.stopLEScan().catch(() => {});
  };
  const timer = setTimeout(stop, durationMs);
  return () => {
    clearTimeout(timer);
    stop();
  };
}
