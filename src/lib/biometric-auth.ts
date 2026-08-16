import { supabase } from "@/integrations/supabase/client";

const KEY = "sahlapos.biometric";

export type BiometricRecord = {
  credentialId: string;
  email: string;
  userId: string;
  refreshToken?: string;
  savedAt: number;
};

const NATIVE_CREDENTIAL_SERVER = "app.lovable.sahlapos.biometric";

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function getBiometricRecord(): BiometricRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BiometricRecord) : null;
  } catch {
    return null;
  }
}

export function clearBiometric() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  void nativeBiometric().then((NB) =>
    NB?.deleteCredentials({ server: NATIVE_CREDENTIAL_SERVER }).catch(() => {}),
  );
}

function isNative() {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

async function nativeBiometric() {
  if (!isNative()) return null;
  try {
    const mod = await import("capacitor-native-biometric");
    return mod.NativeBiometric;
  } catch {
    return null;
  }
}

/** تحقق بالبصمة عبر مكوّن أندرويد الأصلي (WebAuthn غير مدعوم داخل WebView) */
async function nativeVerify(): Promise<boolean> {
  const NB = await nativeBiometric();
  if (!NB) return false;
  try {
    await NB.verifyIdentity({
      reason: "الدخول إلى SAHLAPOS",
      title: "تأكيد الهوية",
      subtitle: "استعمل بصمة الهاتف",
      negativeButtonText: "إلغاء",
    });
    return true;
  } catch {
    return false;
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const NB = await nativeBiometric();
  if (NB) {
    try {
      const res = await NB.isAvailable({ useFallback: true });
      return !!res.isAvailable;
    } catch {
      return false;
    }
  }
  if (!("credentials" in navigator) || typeof PublicKeyCredential === "undefined") return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** يسجّل بصمة الجهاز ويربطها بالحساب الحالي (أول مستخدم يسجّل الدخول) */
export async function enrollBiometric(): Promise<boolean> {
  if (!(await isBiometricSupported())) return false;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user?.email || !session.refresh_token) return false;

  const existing = getBiometricRecord();
  if (isNative()) {
    const NB = await nativeBiometric();
    if (!NB) return false;
    if (existing && existing.userId !== session.user.id) return false;
    const ok = await nativeVerify();
    if (!ok) return false;
    await NB?.setCredentials({
      username: session.user.id,
      password: session.refresh_token,
      server: NATIVE_CREDENTIAL_SERVER,
    });
    localStorage.setItem(
      KEY,
      JSON.stringify({
        credentialId: "native",
        email: session.user.email,
        userId: session.user.id,
        savedAt: Date.now(),
      } satisfies BiometricRecord),
    );
    return true;
  }
  if (existing && existing.userId === session.user.id) {
    // تحديث الرمز فقط
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...existing, refreshToken: session.refresh_token, savedAt: Date.now() }),
    );
    return true;
  }
  if (existing) return false; // الجهاز مرتبط بحساب آخر

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(session.user.id);

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "SAHLAPOS", id: window.location.hostname },
      user: { id: userId, name: session.user.email, displayName: session.user.email },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred) return false;

  const record: BiometricRecord = {
    credentialId: b64(cred.rawId),
    email: session.user.email,
    userId: session.user.id,
    refreshToken: session.refresh_token,
    savedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(record));
  return true;
}

/** يطلب البصمة ثم يفتح جلسة الحساب المرتبط (يعمل أوفلاين إن كانت الجلسة محفوظة) */
export async function biometricSignIn(): Promise<{ ok: boolean; error?: string }> {
  const record = getBiometricRecord();
  if (!record) return { ok: false, error: "لا توجد بصمة مسجّلة على هذا الجهاز" };

  if (isNative()) {
    const ok = await nativeVerify();
    if (!ok) return { ok: false, error: "فشل التحقق من البصمة" };
  } else
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: fromB64(record.credentialId) }],
        userVerification: "required",
        timeout: 60000,
        rpId: window.location.hostname,
      },
    });
    if (!assertion) return { ok: false, error: "تعذّر التحقق من البصمة" };
  } catch {
    return { ok: false, error: "فشل التحقق من البصمة" };
  }

  // جلسة محفوظة محليًا؟ ادخل مباشرة (يعمل بدون إنترنت)
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id === record.userId) return { ok: true };

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "يلزم الاتصال بالإنترنت لأول فتح بعد تسجيل الخروج" };
  }

  let refreshToken = record.refreshToken;
  if (isNative()) {
    const NB = await nativeBiometric();
    try {
      const credentials = await NB?.getCredentials({ server: NATIVE_CREDENTIAL_SERVER });
      if (!credentials || credentials.username !== record.userId) {
        return { ok: false, error: "الحساب المحفوظ لا يطابق بصمة هذا الهاتف" };
      }
      refreshToken = credentials.password;
    } catch {
      return { ok: false, error: "أعد تسجيل الدخول عبر Google لربط الحساب بالبصمة" };
    }
  }
  if (!refreshToken) {
    return { ok: false, error: "أعد تسجيل الدخول عبر Google لربط الحساب بالبصمة" };
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !refreshed.session) {
    return { ok: false, error: "انتهت صلاحية الجلسة، سجّل الدخول بكلمة المرور مرة واحدة" };
  }
  const rec = getBiometricRecord();
  if (rec && isNative()) {
    const NB = await nativeBiometric();
    await NB?.setCredentials({
      username: rec.userId,
      password: refreshed.session.refresh_token,
      server: NATIVE_CREDENTIAL_SERVER,
    });
  } else if (rec) {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...rec, refreshToken: refreshed.session.refresh_token, savedAt: Date.now() }),
    );
  }
  return { ok: true };
}
