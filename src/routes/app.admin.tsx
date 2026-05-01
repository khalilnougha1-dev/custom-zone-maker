import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Plus, Copy, Check, X, KeyRound, Users as UsersIcon, MessageCircle, Send, RefreshCw, LogOut, Home, AlertTriangle, CalendarClock, History, CalendarPlus } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAdminAccess = async () => {
      if (authLoading) return;

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const [{ data: adminRole, error: adminError }, { data: superAdminRole, error: superAdminError }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      if (cancelled) return;

      const error = adminError || superAdminError;
      if (error) {
        setRoleError(error.message);
        setIsAdmin(false);
        return;
      }

      setRoleError(null);
      setIsAdmin(Boolean(adminRole || superAdminRole));
    };

    checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const load = async () => {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from("activation_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setCodes(c || []);
    setUsers(u || []);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const generateCode = async () => {
    setLoading(true);
    const code = Array.from({ length: 4 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase()
    ).join("-");
    const { error } = await supabase.from("activation_codes").insert({
      code, duration_days: days, notes, created_by: user!.id
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم توليد الرمز");
    setOpen(false); setNotes("");
    load();
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success("تم نسخ الرمز");
  };

  const toggleUser = async (u: any) => {
    const { error } = await supabase.from("profiles").update({
      is_active: !u.is_active,
      subscription_expires_at: !u.is_active
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : u.subscription_expires_at
    }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(u.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    load();
  };

  if (authLoading || isAdmin === null) {
    return <PosLayout title="لوحة المسؤول"><div className="p-8 text-center text-muted-foreground">جاري التحقق...</div></PosLayout>;
  }

  if (!user) {
    return (
      <PosLayout title="لوحة المسؤول">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center" dir="rtl">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-600" />
          <h3 className="text-lg font-bold">يجب تسجيل الدخول أولاً</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            للوصول إلى لوحة المسؤول، يرجى تسجيل الدخول بحساب يملك صلاحيات الإدارة.
          </p>
          <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
            <a href="/auth">تسجيل الدخول</a>
          </Button>
        </div>
      </PosLayout>
    );
  }

  if (!isAdmin) {
    const handleRetry = async () => {
      setIsAdmin(null);
      setRoleError(null);
      await supabase.auth.refreshSession();
      window.location.reload();
    };

    const handleSignOut = async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    };

    return (
      <PosLayout title="لوحة المسؤول">
        <div className="space-y-4" dir="rtl">
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <Shield className="mx-auto mb-3 h-12 w-12 text-destructive" />
            <h3 className="text-lg font-bold text-destructive">غير مصرح بالدخول</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {roleError
                ? "تعذر التحقق من الصلاحيات حالياً. قد يكون هناك مشكلة في الاتصال."
                : "هذا الحساب لا يملك صلاحية الوصول إلى لوحة المسؤول."}
            </p>
            <div className="mt-4 rounded-lg bg-background/50 p-3 text-right text-xs">
              <div className="font-semibold text-foreground mb-1">معلومات الحساب:</div>
              <div className="text-muted-foreground">📧 {user.email}</div>
              <div className="text-muted-foreground mt-1">🆔 <span dir="ltr" className="font-mono">{user.id.slice(0, 8)}...</span></div>
              {roleError && (
                <div className="mt-2 text-destructive/80">⚠️ {roleError}</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              خطوات لحل المشكلة
            </h4>
            <ol className="space-y-2.5 text-sm text-muted-foreground list-decimal list-inside marker:text-primary marker:font-bold">
              <li>تأكّد من تسجيل الدخول بالحساب الصحيح المخوّل بصلاحيات الإدارة.</li>
              <li>إذا كنت قد حصلت على الصلاحيات حديثاً، جرّب تحديث الجلسة بالضغط على زر <span className="font-semibold text-foreground">"إعادة المحاولة"</span> أدناه.</li>
              <li>إذا لم تنجح المحاولة، قم بـ <span className="font-semibold text-foreground">تسجيل الخروج ثم الدخول مجدداً</span> لتحديث رموز الصلاحيات.</li>
              <li>إذا استمرت المشكلة، تواصل مع المسؤول الرئيسي لمنح حسابك صلاحية <span className="font-mono text-xs text-foreground">admin</span> أو <span className="font-mono text-xs text-foreground">super_admin</span>.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" /> تسجيل خروج
            </Button>
            <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground">
              <a href="/app"><Home className="h-4 w-4" /> الرئيسية</a>
            </Button>
          </div>
        </div>
      </PosLayout>
    );
  }

  return (
    <PosLayout title="لوحة المسؤول">
      <Tabs defaultValue="codes" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="codes" className="gap-2"><KeyRound className="h-4 w-4" /> رموز التفعيل</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><UsersIcon className="h-4 w-4" /> المستخدمين</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-3">
          <Button onClick={() => setOpen(true)} className="w-full bg-gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> توليد رمز تفعيل جديد
          </Button>
          {codes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد رموز بعد
            </div>
          )}
          {codes.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-lg font-bold text-primary tracking-wider">{c.code}</div>
                {c.is_used ? (
                  <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" /> مستخدم</Badge>
                ) : (
                  <Badge className="bg-emerald-500 gap-1">متاح</Badge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.duration_days} يوم</span>
                <span>{new Date(c.created_at).toLocaleDateString("ar-DZ")}</span>
              </div>
              {c.notes && <div className="mt-2 text-xs text-muted-foreground">{c.notes}</div>}
              {!c.is_used && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyCode(c.code)} className="flex-1 gap-1">
                    <Copy className="h-3 w-3" /> نسخ
                  </Button>
                  <Button size="sm" asChild className="flex-1 bg-[#25D366] hover:bg-[#1ebe57] gap-1">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`رمز التفعيل: ${c.code} (صالح ${c.duration_days} يوم)`)}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3 w-3" /> واتساب
                    </a>
                  </Button>
                  <Button size="sm" asChild className="flex-1 bg-[#229ED9] hover:bg-[#1c87b9] gap-1">
                    <a href={`https://t.me/share/url?url=&text=${encodeURIComponent(`رمز التفعيل: ${c.code} (صالح ${c.duration_days} يوم)`)}`} target="_blank" rel="noreferrer">
                      <Send className="h-3 w-3" /> تليغرام
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          {users.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا يوجد مستخدمين
            </div>
          )}
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{u.full_name || u.business_name || "بدون اسم"}</div>
                  {u.business_name && <div className="text-xs text-muted-foreground truncate">{u.business_name}</div>}
                  {u.phone && <div className="text-xs text-muted-foreground" dir="ltr">{u.phone}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {u.is_active ? (
                    <Badge className="bg-emerald-500">مُفعّل</Badge>
                  ) : (
                    <Badge variant="secondary">معطّل</Badge>
                  )}
                  <Button size="sm" variant={u.is_active ? "destructive" : "default"} onClick={() => toggleUser(u)} className="h-7 text-xs">
                    {u.is_active ? <><X className="h-3 w-3 ml-1" /> تعطيل</> : <><Check className="h-3 w-3 ml-1" /> تفعيل</>}
                  </Button>
                </div>
              </div>
              {u.subscription_expires_at && (
                <div className="mt-2 text-xs text-muted-foreground">
                  ينتهي: {new Date(u.subscription_expires_at).toLocaleDateString("ar-DZ")}
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>توليد رمز تفعيل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>مدة الصلاحية (أيام)</Label>
              <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 30)} />
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلا: لزبون فلان" />
            </div>
            <Button onClick={generateCode} disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              توليد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
