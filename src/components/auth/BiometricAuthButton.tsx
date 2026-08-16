import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  biometricSignIn,
  getBiometricRecord,
  isBiometricSupported,
  type BiometricRecord,
} from "@/lib/biometric-auth";

export function BiometricAuthButton() {
  const navigate = useNavigate();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [record, setRecord] = useState<BiometricRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isBiometricSupported().then(setSupported).catch(() => setSupported(false));
    setRecord(getBiometricRecord());
  }, []);

  const handle = async () => {
    if (supported === false) {
      toast.error("فعّل بصمة الهاتف من إعدادات الجهاز ثم أعد فتح التطبيق");
      return;
    }
    if (!record) {
      toast.info("سجّل الدخول بالبريد أو Google أول مرة لربط هذا الحساب بالبصمة");
      return;
    }
    setLoading(true);
    const res = await biometricSignIn();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "فشل الدخول بالبصمة");
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="mt-3 space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2"
        onClick={handle}
        disabled={loading || supported === null}
      >
        <Fingerprint className="h-4 w-4" />
        {loading
          ? "جارٍ التحقق…"
          : supported === null
            ? "جارٍ فحص بصمة الهاتف…"
            : "الدخول ببصمة الهاتف"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {supported === false
          ? "البصمة غير مفعّلة على هذا الهاتف"
          : record
          ? `مرتبط بالحساب: ${record.email}`
          : "سجّل الدخول مرة واحدة لتفعيل الدخول ببصمة الهاتف"}
      </p>
    </div>
  );
}
