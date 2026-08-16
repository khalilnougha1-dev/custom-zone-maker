import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import {
  disableBiometric,
  enrollBiometric,
  isBiometricEnabled,
  isBiometricSupported,
} from "@/lib/biometric-auth";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const [s, setS] = useState<any>({
    business_name: "", language: "ar", first_day_of_week: "saturday",
    enable_vat_sales: false, vat_sales_rate: 17, enable_vat_purchases: false, vat_purchases_rate: 17,
    enable_discount: true, enable_multi_price: false, wholesale_discount_pct: 5, semi_wholesale_discount_pct: 2.5,
    round_prices: false, show_product_images: true, number_products_in_list: false,
    print_language: "ar", printer_type: "58mm", print_margin: 0, print_partial_total: true,
    receipt_footer: "شكرا", auto_print: false,
  });
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setS(data);
    });
  }, [user]);

  useEffect(() => {
    setBiometricEnabled(isBiometricEnabled());
    void isBiometricSupported()
      .then(setBiometricSupported)
      .catch(() => setBiometricSupported(false));
  }, []);

  const toggleBiometric = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    try {
      if (biometricEnabled) {
        await disableBiometric();
        setBiometricEnabled(false);
        toast.success("تم تعطيل بصمة التطبيق على هذا الهاتف");
        return;
      }
      if (biometricSupported === false) {
        toast.error("البصمة غير متاحة أو غير مفعّلة في إعدادات الهاتف");
        return;
      }
      const enabled = await enrollBiometric();
      if (!enabled) {
        toast.error("تعذّر تفعيل البصمة. تأكد من وجود بصمة مسجلة في الهاتف ثم حاول مجددًا");
        return;
      }
      setBiometricEnabled(true);
      toast.success("تم تفعيل بصمة التطبيق لهذا الحساب");
    } finally {
      setBiometricLoading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    const payload = { ...s, user_id: user.id, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("app_settings").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الإعدادات");
  };

  const Section = ({ title }: { title: string }) => (
    <div className="text-destructive font-semibold text-right pt-4 pb-1">{title}</div>
  );

  const Row = ({ title, desc, control }: any) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="pt-1">{control}</div>
      <div className="flex-1 text-right">
        <div className="font-semibold text-sm">{title}</div>
        {desc && <div className="text-xs text-muted-foreground mt-1">{desc}</div>}
      </div>
    </div>
  );

  return (
    <PosLayout title="الإعدادات" actions={
      <button onClick={save} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold hover:bg-white/25">حفظ</button>
    }>
      <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
        <Section title="خصائص عامة" />
        <Row title="اللغة" desc="لغة التطبيق" control={<div />} />
        <Row title="ترقيم المنتجات في القائمة" control={<Switch checked={s.number_products_in_list} onCheckedChange={(v) => setS({ ...s, number_products_in_list: v })} />} />
        <div className="py-3 border-b border-border">
          <Label className="text-right block">الاسم التجاري</Label>
          <Input value={s.business_name || ""} onChange={(e) => setS({ ...s, business_name: e.target.value })} placeholder="لم يتم تحديد قيمة" className="mt-1" />
        </div>
        <Row title="أول يوم في الأسبوع" desc="السبت" control={<div />} />

        <Section title="الأمان" />
        <div className="border-b border-border py-3 text-right">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-end gap-2 font-semibold">
                <span>الدخول ببصمة التطبيق</span>
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ترتبط بهذا الحساب داخل SAHLAPOS وعلى هذا الهاتف فقط، وليست مرتبطة ببصمة Google.
              </p>
            </div>
            <Switch
              checked={biometricEnabled}
              disabled={biometricLoading || biometricSupported === false}
              onCheckedChange={() => void toggleBiometric()}
              aria-label="تفعيل الدخول ببصمة التطبيق"
            />
          </div>
          {biometricSupported === false && (
            <p className="mt-2 text-xs text-destructive">
              فعّل بصمة الهاتف من إعدادات الجهاز ثم أعد فتح التطبيق.
            </p>
          )}
        </div>

        <Row
          title="الرسم على القيمة المضافة بالنسبة للمبيعات"
          desc="السماح بإدخال الرسم على القيمة المضافة في فاتورات البيع"
          control={<Switch checked={s.enable_vat_sales} onCheckedChange={(v) => setS({ ...s, enable_vat_sales: v })} />}
        />
        {s.enable_vat_sales && (
          <div className="py-3 border-b border-border">
            <Label className="text-right block text-muted-foreground text-xs">قيمة الرسم على القيمة المضافة بالنسبة للمبيعات (بالنسبة المئوية)</Label>
            <Input type="number" value={s.vat_sales_rate} onChange={(e) => setS({ ...s, vat_sales_rate: Number(e.target.value) })} className="mt-1" />
          </div>
        )}
        <Row
          title="الرسم على القيمة المضافة بالنسبة للمشتريات"
          desc="السماح بإدخال الرسم على القيمة المضافة في فاتورات الشراء"
          control={<Switch checked={s.enable_vat_purchases} onCheckedChange={(v) => setS({ ...s, enable_vat_purchases: v })} />}
        />
        <Row
          title="الخصم"
          desc="السماح بتطبيق خصم على المبلغ الإجمالي لعملية البيع"
          control={<Switch checked={s.enable_discount} onCheckedChange={(v) => setS({ ...s, enable_discount: v })} />}
        />
        <Row
          title="تعدد الأسعار"
          desc="تفعيل هذه الخاصية يسمح بتطبيق أسعار بيع مختلفة (تجزئة، جملة، نصف جملة)"
          control={<Switch checked={s.enable_multi_price} onCheckedChange={(v) => setS({ ...s, enable_multi_price: v })} />}
        />
        <Row
          title="تقريب الأسعار"
          desc="تقريب الأسعار المقترحة"
          control={<Switch checked={s.round_prices} onCheckedChange={(v) => setS({ ...s, round_prices: v })} />}
        />
        <Row
          title="إظهار صور المنتجات"
          desc="إظهار صور المنتجات في القائمة"
          control={<Switch checked={s.show_product_images} onCheckedChange={(v) => setS({ ...s, show_product_images: v })} />}
        />

        <Section title="الطباعة" />

        <div className="py-3 border-b border-border text-right">
          <Label className="block font-semibold">لغة الطباعة</Label>
          <Select value={s.print_language || "ar"} onValueChange={(v) => setS({ ...s, print_language: v })}>
            <SelectTrigger className="mt-2 h-11 bg-card border-primary/40 text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">الفرنسية</SelectItem>
              <SelectItem value="en">الإنجليزية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Row title="نظام الطباعة" desc="بسيط" control={<div />} />

        <div className="py-3 border-b border-border text-right">
          <Label className="block font-semibold">نوع الطابعة</Label>
          <Select value={s.printer_type || "58mm"} onValueChange={(v) => setS({ ...s, printer_type: v })}>
            <SelectTrigger className="mt-2 h-11 bg-card border-primary/40 text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="58mm">58 مم</SelectItem>
              <SelectItem value="80mm">80 مم</SelectItem>
              <SelectItem value="a4">A4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="py-3 border-b border-border">
          <Label className="text-right block">الهامش</Label>
          <Input type="number" value={s.print_margin} onChange={(e) => setS({ ...s, print_margin: Number(e.target.value) })} className="mt-1" />
        </div>
        <Row
          title="طبع المجموع الجزئي"
          desc="طبع المجموع الجزئي لكل منتج في وصل البيع"
          control={<Switch checked={s.print_partial_total} onCheckedChange={(v) => setS({ ...s, print_partial_total: v })} />}
        />
        <div className="py-3 border-b border-border">
          <Label className="text-right block">النص المطبوع في أسفل الوصل</Label>
          <Input value={s.receipt_footer} onChange={(e) => setS({ ...s, receipt_footer: e.target.value })} className="mt-1" />
        </div>
        <Row
          title="طبع تلقائي"
          desc="طباعة وصل البيع تلقائيا بعد الحفظ"
          control={<Switch checked={s.auto_print} onCheckedChange={(v) => setS({ ...s, auto_print: v })} />}
        />
      </div>

      <Button onClick={save} className="w-full mt-4 bg-gradient-primary text-primary-foreground font-bold">حفظ الإعدادات</Button>
    </PosLayout>
  );
}
