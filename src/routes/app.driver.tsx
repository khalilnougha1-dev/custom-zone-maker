import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck as TruckIcon, Check, Clock, X as XIcon, LogOut, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/driver")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: DriverPage
});

function DriverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [truck, setTruck] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: t } = await supabase.from("trucks").select("*").eq("driver_user_id", user.id).maybeSingle();
    setTruck(t);
    if (t) {
      const { data: d } = await supabase.from("truck_distributions").select("*").eq("truck_id", t.id).order("created_at", { ascending: false });
      setItems(d || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("truck_distributions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background">جاري التحميل...</div>;

  if (!truck) {
    return (
      <div className="min-h-screen bg-muted/30 p-4" dir="rtl">
        <div className="mx-auto max-w-md mt-20">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-8 text-center">
            <TruckIcon className="mx-auto mb-3 h-12 w-12 text-amber-600" />
            <h3 className="text-lg font-bold">لا توجد شاحنة مرتبطة</h3>
            <p className="mt-2 text-sm text-muted-foreground">لم يقم المسؤول بربط حسابك بأي شاحنة بعد</p>
            <Button onClick={logout} variant="outline" className="mt-4 gap-2"><LogOut className="h-4 w-4" /> تسجيل الخروج</Button>
          </div>
        </div>
      </div>
    );
  }

  const totals = items.reduce((acc, i) => ({
    pending: acc.pending + (i.status === "pending" ? 1 : 0),
    delivered: acc.delivered + (i.status === "delivered" ? 1 : 0),
    total: acc.total + Number(i.total || 0),
  }), { pending: 0, delivered: 0, total: 0 });

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <TruckIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs opacity-80">لوحة السائق</div>
              <div className="font-bold">{truck.name}</div>
            </div>
          </div>
          <button onClick={logout} className="rounded-lg p-2 hover:bg-white/10" aria-label="logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl bg-card border border-border p-4 mb-4 shadow-sm">
          <div className="text-sm text-muted-foreground mb-2">معلومات الشاحنة</div>
          {truck.plate_number && <div className="flex items-center gap-2 text-sm" dir="ltr"><MapPin className="h-4 w-4" /> {truck.plate_number}</div>}
          {truck.driver_phone && <div className="flex items-center gap-2 text-sm" dir="ltr"><Phone className="h-4 w-4" /> {truck.driver_phone}</div>}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <div className="text-xs text-muted-foreground">قيد الانتظار</div>
            <div className="font-mono text-2xl font-bold text-amber-600">{totals.pending}</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <div className="text-xs text-muted-foreground">مُسلّم</div>
            <div className="font-mono text-2xl font-bold text-emerald-600">{totals.delivered}</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <div className="text-xs text-muted-foreground">المجموع</div>
            <div className="font-mono text-lg font-bold text-primary">{totals.total.toFixed(0)}</div>
          </div>
        </div>

        <h2 className="font-bold mb-2">قائمة التوزيعات</h2>
        <div className="space-y-2">
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد توزيعات حاليا
            </div>
          )}
          {items.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{i.product_name}</div>
                  {i.customer_name && <div className="text-sm text-muted-foreground mt-1">📍 {i.customer_name}</div>}
                  <div className="mt-1 text-sm">
                    الكمية: <span className="font-bold">{i.quantity}</span>
                    {" • "}السعر: <span className="font-bold">{Number(i.unit_price).toFixed(2)}</span>
                    {" • "}المجموع: <span className="font-bold text-primary">{Number(i.total).toFixed(2)}</span>
                  </div>
                  {i.notes && <div className="mt-1 text-xs text-muted-foreground">📝 {i.notes}</div>}
                </div>
                {i.status === "delivered" ? (
                  <Badge className="bg-emerald-500 gap-1"><Check className="h-3 w-3" /> مُسلّم</Badge>
                ) : i.status === "cancelled" ? (
                  <Badge variant="destructive" className="gap-1"><XIcon className="h-3 w-3" /> ملغى</Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> انتظار</Badge>
                )}
              </div>
              {i.status === "pending" && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button onClick={() => setStatus(i.id, "delivered")} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                    <Check className="h-4 w-4" /> تم التسليم
                  </Button>
                  <Button onClick={() => setStatus(i.id, "cancelled")} variant="outline" className="gap-1">
                    <XIcon className="h-4 w-4" /> إلغاء
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
