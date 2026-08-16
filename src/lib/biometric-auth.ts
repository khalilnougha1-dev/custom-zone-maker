import { supabase } from "@/integrations/supabase/client";

const RECORD_KEY = "sahlapos.biometric";
const REFRESH_TOKEN_KEY = "sahlapos.biometric.refresh-token";

export type BiometricRecord = {
  credentialId: string;
  email: string;
  userId: string;
  refreshToken?: string;
  savedAt: number;
};

function isNative() {
  return typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
}

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSecureRefreshToken() {
  if (!isNative()) return null;
  try {
    const { SecureStoragePlugin } = await import("capacitor-secure-storage-plugin");
    const result = await SecureStoragePlugin.get({ key: REFRESH_TOKEN_KEY });
    return result.value || null;
  } catch {
    return null;
  }
}

async function setSecureRefreshToken(refreshToken: string) {
  const { SecureStoragePlugin } = await import("capacitor-secure-storage-plugin");
  await SecureStoragePlugin.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
}

async function verifyNativeBiometric() {
  try {
    const { AndroidBiometryStrength, BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    await BiometricAuth.authenticate({
      reason: "الدخول إلى SAHLAPOS",
      cancelTitle: "إلغاء",
      allowDeviceCredential: false,
      androidTitle: "تأكيد الهوية",
      androidSubtitle: "استعمل بصمة الهاتف",
      androidConfirmationRequired: false,
      androidBiometryStrength: AndroidBiometryStrength.weak,
    });
    return true;
  } catch {
    return false;
  }
}

export function getBiometricRecord(): BiometricRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    return raw ? (JSON.parse(raw) as BiometricRecord) : null;
  } catch {
    return null;
  }
}

export function clearBiometric() {
  if (typeof window !== "undefined") localStorage.removeItem(RECORD_KEY);
  if (isNative()) {
    void import("capacitor-secure-storage-plugin")
      .then(({ SecureStoragePlugin }) => SecureStoragePlugin.remove({ key: REFRESH_TOKEN_KEY }))
      .catch(() => undefined);
  }
}

export async function isBiometricSupported() {
  if (typeof window === "undefined") return false;
  if (isNative()) {
    try {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
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

/** يربط حساب المستخدم الحالي ببصمة هذا الهاتف ويحفظ رمز الجلسة في مخزن Android المشفّر. */
export async function enrollBiometric() {
  if (!(await isBiometricSupported())) return false;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user.email || !session.refresh_token) return false;

  const existing = getBiometricRecord();
  if (existing && existing.userId !== session.user.id) return false;

  if (isNative()) {
    if (!(await verifyNativeBiometric())) return false;
    await setSecureRefreshToken(session.refresh_token);
    localStorage.setItem(
      RECORD_KEY,
      JSON.stringify({
        credentialId: "native",
        email: session.user.email,
        userId: session.user.id,
        savedAt: Date.now(),
      } satisfies BiometricRecord),
    );
    return true;
  }

  if (existing) {
    localStorage.setItem(
      RECORD_KEY,
      JSON.stringify({ ...existing, refreshToken: session.refresh_token, savedAt: Date.now() }),
    );
    return true;
  }

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "SAHLAPOS", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(session.user.id),
        name: session.user.email,
        displayName: session.user.email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!credential) return false;

  localStorage.setItem(
    RECORD_KEY,
    JSON.stringify({
      credentialId: b64(credential.rawId),
      email: session.user.email,
      userId: session.user.id,
      refreshToken: session.refresh_token,
      savedAt: Date.now(),
    } satisfies BiometricRecord),
  );
  return true;
}

export async function biometricSignIn(): Promise<{ ok: boolean; error?: string }> {
  const record = getBiometricRecord();
  if (!record) return { ok: false, error: "سجّل الدخول عبر Google أول مرة لربط الحساب بالبصمة" };

  if (isNative()) {
    if (!(await verifyNativeBiometric())) return { ok: false, error: "لم يتم التحقق من بصمة الهاتف" };
  } else {
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: "public-key", id: fromB64(record.credentialId) }],
          userVerification: "required",
          timeout: 60_000,
          rpId: window.location.hostname,
        },
      });
      if (!assertion) return { ok: false, error: "تعذّر التحقق من البصمة" };
    } catch {
      return { ok: false, error: "فشل التحقق من البصمة" };
    }
  }

  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id === record.userId) return { ok: true };
  if (navigator.onLine === false) {
    return { ok: false, error: "يلزم الإنترنت بعد تسجيل الخروج لإنشاء الجلسة مرة واحدة" };
  }

  const refreshToken = isNative() ? await getSecureRefreshToken() : record.refreshToken;
  if (!refreshToken) {
    clearBiometric();
    return { ok: false, error: "سجّل الدخول عبر Google من جديد ثم فعّل البصمة" };
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || data.session.user.id !== record.userId) {
    clearBiometric();
    return { ok: false, error: "انتهت الجلسة المحفوظة، سجّل الدخول عبر Google من جديد" };
  }

  if (isNative()) await setSecureRefreshToken(data.session.refresh_token);
  else {
    localStorage.setItem(
      RECORD_KEY,
      JSON.stringify({ ...record, refreshToken: data.session.refresh_token, savedAt: Date.now() }),
    );
  }
  return { ok: true };
}