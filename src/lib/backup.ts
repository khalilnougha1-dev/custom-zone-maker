import { supabase } from "@/integrations/supabase/client";

// Tables exported per-user. Order matters for restore (parents before children).
const USER_TABLES = [
  "app_settings",
  "categories",
  "customers",
  "suppliers",
  "products",
  "expenses",
  "cash_movements",
  "cash_transactions",
  "stock_movements",
  "sales",
  "purchases",
] as const;
const OWNER_TABLES = ["trucks", "truck_distributions"] as const;

// Child tables (filtered via parent join in RLS)
const CHILD_TABLES = ["sale_items", "purchase_items"] as const;

export type BackupFile = {
  app: "sahlapos";
  version: 1;
  exported_at: string;
  user_id: string;
  data: Record<string, any[]>;
};

export async function exportBackup(userId: string): Promise<BackupFile> {
  const data: Record<string, any[]> = {};
  for (const t of USER_TABLES) {
    const { data: rows, error } = await supabase.from(t as any).select("*").eq("user_id", userId);
    if (error) throw new Error(`${t}: ${error.message}`);
    data[t] = rows || [];
  }
  for (const t of OWNER_TABLES) {
    const { data: rows, error } = await supabase.from(t as any).select("*").eq("owner_id", userId);
    if (error) throw new Error(`${t}: ${error.message}`);
    data[t] = rows || [];
  }
  for (const t of CHILD_TABLES) {
    const { data: rows, error } = await supabase.from(t as any).select("*");
    if (error) throw new Error(`${t}: ${error.message}`);
    data[t] = rows || [];
  }
  return {
    app: "sahlapos",
    version: 1,
    exported_at: new Date().toISOString(),
    user_id: userId,
    data,
  };
}

export function downloadBackup(file: BackupFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.download = `sahlapos-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearUserData(userId: string) {
  await supabase.from("stock_movements").delete().eq("user_id", userId);
  await supabase.from("truck_distributions").delete().eq("owner_id", userId);
  await supabase.from("cash_transactions").delete().eq("user_id", userId);
  await supabase.from("cash_movements").delete().eq("user_id", userId);
  await supabase.from("expenses").delete().eq("user_id", userId);
  await supabase.from("sales").delete().eq("user_id", userId);
  await supabase.from("purchases").delete().eq("user_id", userId);
  await supabase.from("trucks").delete().eq("owner_id", userId);
  await supabase.from("products").delete().eq("user_id", userId);
  await supabase.from("suppliers").delete().eq("user_id", userId);
  await supabase.from("customers").delete().eq("user_id", userId);
  await supabase.from("categories").delete().eq("user_id", userId);
  await supabase.from("app_settings").delete().eq("user_id", userId);
}

async function insertChunked(table: string, rows: any[]) {
  if (!rows?.length) return;
  const size = 200;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table as any).insert(chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export type ProgressCb = (step: { label: string; current: number; total: number }) => void;

export async function restoreBackup(file: BackupFile, userId: string, onProgress?: ProgressCb) {
  if (!file || file.app !== "sahlapos" || !file.data) {
    throw new Error("ملف النسخة الاحتياطية غير صالح");
  }
  const remap = (rows: any[] | undefined) =>
    (rows || []).map((r) => {
      const out = { ...r };
      if ("user_id" in r) out.user_id = userId;
      if ("owner_id" in r) out.owner_id = userId;
      return out;
    });

  const products = remap(file.data.products);
  const manualMoves = (file.data.stock_movements || []).filter(
    (m: any) => m.movement_type === "adjustment" || m.reference_type === "manual"
  );

  const steps: Array<{ label: string; run: () => Promise<void> }> = [
    { label: "حذف البيانات الحالية", run: () => clearUserData(userId) },
    { label: "استرداد الإعدادات", run: () => insertChunked("app_settings", remap(file.data.app_settings)) },
    { label: "استرداد الفئات", run: () => insertChunked("categories", remap(file.data.categories)) },
    { label: "استرداد العملاء", run: () => insertChunked("customers", remap(file.data.customers)) },
    { label: "استرداد الموردين", run: () => insertChunked("suppliers", remap(file.data.suppliers)) },
    { label: "استرداد المنتجات", run: () => insertChunked("products", products.map((p: any) => ({ ...p, stock_quantity: 0 }))) },
    { label: "استرداد الشاحنات", run: () => insertChunked("trucks", remap(file.data.trucks)) },
    { label: "استرداد المصاريف", run: () => insertChunked("expenses", remap(file.data.expenses)) },
    { label: "استرداد فواتير البيع", run: () => insertChunked("sales", remap(file.data.sales)) },
    { label: "استرداد بنود البيع", run: () => insertChunked("sale_items", file.data.sale_items || []) },
    { label: "استرداد فواتير الشراء", run: () => insertChunked("purchases", remap(file.data.purchases)) },
    { label: "استرداد بنود الشراء", run: () => insertChunked("purchase_items", file.data.purchase_items || []) },
    { label: "استرداد حركات الصندوق", run: () => insertChunked("cash_movements", remap(file.data.cash_movements)) },
    { label: "استرداد المعاملات النقدية", run: () => insertChunked("cash_transactions", remap(file.data.cash_transactions)) },
    { label: "استرداد توزيعات الشاحنات", run: () => insertChunked("truck_distributions", remap(file.data.truck_distributions)) },
    { label: "استرداد التعديلات اليدوية للمخزون", run: () => insertChunked("stock_movements", remap(manualMoves)) },
    { label: "ضبط الكميات النهائية للمخزون", run: async () => {
      for (const p of products) {
        await supabase.from("products").update({ stock_quantity: p.stock_quantity }).eq("id", p.id);
      }
    } },
  ];

  const total = steps.length;
  for (let i = 0; i < steps.length; i++) {
    onProgress?.({ label: steps[i].label, current: i, total });
    await steps[i].run();
  }
  onProgress?.({ label: "تم الانتهاء", current: total, total });
}

export async function importBackupFromFile(file: File, userId: string, onProgress?: ProgressCb) {
  onProgress?.({ label: "قراءة الملف", current: 0, total: 1 });
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  await restoreBackup(parsed, userId, onProgress);
}

// ---------- Google Drive (per-user OAuth via Google Identity Services) ----------

const DRIVE_FILE_NAME = "sahlapos-backup.json";
const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("فشل تحميل Google"));
    document.head.appendChild(s);
  });
}

export function getGoogleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

async function getDriveAccessToken(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("لم يتم إعداد ربط Google Drive بعد. يرجى التواصل مع الدعم.");
  }
  await loadScript(GIS_SRC);
  return new Promise((resolve, reject) => {
    // @ts-ignore
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function findDriveBackup(token: string): Promise<{ id: string; modifiedTime: string; size?: string } | null> {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive: ${res.status}`);
  const j = await res.json();
  return j.files?.[0] || null;
}

export async function getDriveBackupInfo(): Promise<{ modifiedTime: string; size?: string } | null> {
  const token = await getDriveAccessToken();
  const f = await findDriveBackup(token);
  if (!f) return null;
  return { modifiedTime: f.modifiedTime, size: f.size };
}

export async function uploadToGoogleDrive(file: BackupFile) {
  const token = await getDriveAccessToken();
  const existingId = await findDriveBackupFileId(token);

  const metadata = { name: DRIVE_FILE_NAME, mimeType: "application/json" };
  const boundary = "-------sahlapos" + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(file) +
    `\r\n--${boundary}--`;

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload: ${res.status} ${await res.text()}`);
}

export async function downloadFromGoogleDrive(): Promise<BackupFile> {
  const token = await getDriveAccessToken();
  const id = await findDriveBackupFileId(token);
  if (!id) throw new Error("لم يتم العثور على نسخة احتياطية في Google Drive");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download: ${res.status}`);
  return (await res.json()) as BackupFile;
}
