import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Shield, Plus, Copy, Check, X, KeyRound, Users as UsersIcon, MessageCircle, Send, RefreshCw, LogOut, Home, AlertTriangle, CalendarClock, History, CalendarPlus, Download, Search, TrendingUp, UserCheck, UserX, Database } from "lucide-react";
import { AdminUserDataPanel } from "./AdminUserDataPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminPanelProps {
  /** Wrapper layout component (e.g. PosLayout or AdminLayout) */
  Layout: ComponentType<{ title?: string; email?: string | null; children: ReactNode }>;
  layoutTitle?: string;
}

export function AdminPanel({ Layout, layoutTitle = "لوحة المسؤول" }: AdminPanelProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [isPermanent, setIsPermanent] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [extendUser, setExtendUser] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendNotes, setExtendNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "disabled">("all");

  useEffect(() => {
    let cancelled = false;
    const checkAdminAccess = async () => {
      if (authLoading) return;
      if (!user) { setIsAdmin(false); return; }
      const { data: roles, error } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      if (cancelled) return;
      if (error) { setRoleError(error.message); setIsAdmin(false); return; }
      const roleNames = (roles || []).map((item) => item.role);
      setRoleError(null);
      setIsAdmin(roleNames.includes("admin") || roleNames.includes("super_admin"));
    };
    checkAdminAccess();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const load = async () => {
    const [{ data: c }, { data: u }, { data: log }] = await Promise.all([
      supabase.from("activation_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setCodes(c || []); setUsers(u || []); setAuditLog(log || []);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const logAudit = async (targetUserId: string, action: string, oldValue: any, newValue: any, noteText?: string) => {
    await supabase.from("subscription_audit_log").insert({
      target_user_id: targetUserId, changed_by: user!.id, action,
      old_value: oldValue, new_value: newValue, notes: noteText || null,
    });
  };

  const generateCode = async () => {
    if (!deviceId.trim() || deviceId.trim().length !== 16) {
      return toast.error("الرقم التعريفي يجب أن يكون 16 خانة");
    }
    setLoading(true);
    const code = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");
    const { error } = await supabase.from("activation_codes").insert({
      code,
      duration_days: isPermanent ? 36500 : days,
      is_permanent: isPermanent,
      device_id: deviceId.trim().toLowerCase(),
      notes,
      created_by: user!.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم توليد الرمز");
    setOpen(false); setNotes(""); setDeviceId(""); setIsPermanent(false); setDays(30); load();
  };

  const copyCode = (c: string) => { navigator.clipboard.writeText(c); toast.success("تم نسخ الرمز"); };

  const toggleUser = async (u: any) => {
    const newActive = !u.is_active;
    const newExpiresAt = newActive && (!u.subscription_expires_at || new Date(u.subscription_expires_at) < new Date())
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : u.subscription_expires_at;
    const { error } = await supabase.from("profiles").update({
      is_active: newActive, subscription_expires_at: newExpiresAt,
      subscription_status: newActive ? "active" : "expired",
    }).eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit(u.id, newActive ? "activate" : "deactivate",
      { is_active: u.is_active, expires_at: u.subscription_expires_at },
      { is_active: newActive, expires_at: newExpiresAt });
    toast.success(u.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
    load();
  };

  const extendSubscription = async () => {
    if (!extendUser) return;
    const baseDate = extendUser.subscription_expires_at && new Date(extendUser.subscription_expires_at) > new Date()
      ? new Date(extendUser.subscription_expires_at) : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("profiles").update({
      subscription_expires_at: newExpiresAt, is_active: true, subscription_status: "active",
    }).eq("id", extendUser.id);
    if (error) return toast.error(error.message);
    await logAudit(extendUser.id, "extend",
      { expires_at: extendUser.subscription_expires_at },
      { expires_at: newExpiresAt, days_added: extendDays }, extendNotes);
    toast.success(`تم تمديد الاشتراك ${extendDays} يوم`);
    setExtendUser(null); setExtendNotes(""); setExtendDays(30);
    load();
  };

  const userById = (id: string) => users.find((u) => u.id === id);

  const stats = useMemo(() => {
    const now = new Date();
    const total = users.length;
    const active = users.filter((u) => u.is_active && (!u.subscription_expires_at || new Date(u.subscription_expires_at) > now)).length;
    const expired = users.filter((u) => u.subscription_expires_at && new Date(u.subscription_expires_at) <= now).length;
    const expiringSoon = users.filter((u) => {
      if (!u.subscription_expires_at) return false;
      const exp = new Date(u.subscription_expires_at);
      const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      return days > 0 && days <= 7;
    }).length;
    const availableCodes = codes.filter((c) => !c.is_used).length;
    return { total, active, expired, expiringSoon, availableCodes };
  }, [users, codes]);

  const filteredUsers = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay = `${u.full_name || ""} ${u.business_name || ""} ${u.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const expired = u.subscription_expires_at && new Date(u.subscription_expires_at) <= now;
      if (filter === "active") return u.is_active && !expired;
      if (filter === "expired") return expired;
      if (filter === "disabled") return !u.is_active;
      return true;
    });
  }, [users, search, filter]);

  const exportCSV = () => {
    const headers = ["الاسم", "النشاط التجاري", "الهاتف", "الحالة", "تاريخ الانتهاء", "الأيام المتبقية", "تاريخ التسجيل"];
    const now = new Date();
    const rows = filteredUsers.map((u) => {
      const exp = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
      const days = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null;
      const status = !u.is_active ? "معطّل" : exp && exp <= now ? "منتهي" : "نشط";
      return [u.full_name || "", u.business_name || "", u.phone || "", status,
        exp ? exp.toLocaleDateString("ar-DZ") : "",
        days != null ? (days < 0 ? "منتهي" : `${days}`) : "",
        u.created_at ? new Date(u.created_at).toLocaleDateString("ar-DZ") : ""];
    });
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${rows.length} مستخدم`);
  };

  if (authLoading || isAdmin === null) {
    return <Layout title={layoutTitle} email={user?.email}><div className="p-8 text-center text-muted-foreground">جاري التحقق...</div></Layout>;
  }

  if (!user) {
    return (
      <Layout title={layoutTitle}>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center" dir="rtl">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-600" />
          <h3 className="text-lg font-bold">يجب تسجيل الدخول أولاً</h3>
          <p className="mt-2 text-sm text-muted-foreground">للوصول إلى لوحة المسؤول، يرجى تسجيل الدخول بحساب يملك صلاحيات الإدارة.</p>
          <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground"><a href="/auth">تسجيل الدخول</a></Button>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    const handleRetry = async () => {
      setIsAdmin(null); setRoleError(null);
      await supabase.auth.refreshSession();
      window.location.reload();
    };
    const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = "/auth"; };
    return (
      <Layout title={layoutTitle} email={user.email}>
        <div className="space-y-4" dir="rtl">
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <Shield className="mx-auto mb-3 h-12 w-12 text-destructive" />
            <h3 className="text-lg font-bold text-destructive">غير مصرح بالدخول</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {roleError ? "تعذر التحقق من الصلاحيات حالياً." : "هذا الحساب لا يملك صلاحية الوصول إلى لوحة المسؤول."}
            </p>
            <div className="mt-4 rounded-lg bg-background/50 p-3 text-right text-xs">
              <div className="font-semibold text-foreground mb-1">معلومات الحساب:</div>
              <div className="text-muted-foreground">📧 {user.email}</div>
              <div className="text-muted-foreground mt-1">🆔 <span dir="ltr" className="font-mono">{user.id.slice(0, 8)}...</span></div>
              {roleError && <div className="mt-2 text-destructive/80">⚠️ {roleError}</div>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={handleRetry} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</Button>
            <Button onClick={handleSignOut} variant="outline" className="gap-2"><LogOut className="h-4 w-4" /> تسجيل خروج</Button>
            <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground"><a href="/app"><Home className="h-4 w-4" /> الرئيسية</a></Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={layoutTitle} email={user.email}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <UsersIcon className="mx-auto mb-1 h-5 w-5 text-primary" />
          <div className="text-xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">المستخدمين</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
          <UserCheck className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
          <div className="text-xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-xs text-muted-foreground">نشطين</div>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center">
          <UserX className="mx-auto mb-1 h-5 w-5 text-destructive" />
          <div className="text-xl font-bold text-destructive">{stats.expired}</div>
          <div className="text-xs text-muted-foreground">منتهية</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-amber-600" />
          <div className="text-xl font-bold text-amber-600">{stats.expiringSoon}</div>
          <div className="text-xs text-muted-foreground">قارب الانتهاء</div>
        </div>
      </div>

      <Tabs defaultValue="codes" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="codes" className="gap-1 text-xs"><KeyRound className="h-3 w-3" /> الرموز</TabsTrigger>
          <TabsTrigger value="users" className="gap-1 text-xs"><UsersIcon className="h-3 w-3" /> المستخدمين</TabsTrigger>
          <TabsTrigger value="data" className="gap-1 text-xs"><Database className="h-3 w-3" /> البيانات</TabsTrigger>
          <TabsTrigger value="subs" className="gap-1 text-xs"><CalendarClock className="h-3 w-3" /> الاشتراكات</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 text-xs"><History className="h-3 w-3" /> السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-3">
          <Button onClick={() => setOpen(true)} className="w-full bg-gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> توليد رمز تفعيل جديد
          </Button>
          {codes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد رموز بعد</div>
          )}
          {codes.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-lg font-bold text-primary tracking-wider">{c.code}</div>
                {c.is_used ? (
                  <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" /> مستخدم</Badge>
                ) : (<Badge className="bg-emerald-500 gap-1">متاح</Badge>)}
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
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-9" />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {([
                ["all", "الكل", stats.total],
                ["active", "نشط", stats.active],
                ["expired", "منتهي", stats.expired],
                ["disabled", "معطّل", stats.total - stats.active - stats.expired],
              ] as const).map(([key, label, count]) => (
                <Button key={key} size="sm" variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`h-8 text-xs whitespace-nowrap ${filter === key ? "bg-gradient-primary text-primary-foreground" : ""}`}>
                  {label} ({count})
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={exportCSV} className="h-8 text-xs gap-1 mr-auto whitespace-nowrap">
                <Download className="h-3 w-3" /> تصدير
              </Button>
            </div>
          </div>
          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {users.length === 0 ? "لا يوجد مستخدمين" : "لا توجد نتائج مطابقة"}
            </div>
          )}
          {filteredUsers.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{u.full_name || u.business_name || "بدون اسم"}</div>
                  {u.business_name && <div className="text-xs text-muted-foreground truncate">{u.business_name}</div>}
                  {u.phone && <div className="text-xs text-muted-foreground" dir="ltr">{u.phone}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {u.is_active ? <Badge className="bg-emerald-500">مُفعّل</Badge> : <Badge variant="secondary">معطّل</Badge>}
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

        <TabsContent value="subs" className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-9" />
          </div>
          {filteredUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {users.length === 0 ? "لا توجد اشتراكات" : "لا توجد نتائج مطابقة"}
            </div>
          )}
          {filteredUsers.map((u) => {
            const expiresAt = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
            const now = new Date();
            const isExpired = expiresAt && expiresAt < now;
            const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null;
            return (
              <div key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{u.full_name || u.business_name || "بدون اسم"}</div>
                    {u.phone && <div className="text-xs text-muted-foreground" dir="ltr">{u.phone}</div>}
                  </div>
                  {u.is_active && !isExpired ? <Badge className="bg-emerald-500">نشط</Badge>
                    : isExpired ? <Badge variant="destructive">منتهي</Badge>
                    : <Badge variant="secondary">معطّل</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-muted-foreground">تاريخ الانتهاء</div>
                    <div className="font-semibold">{expiresAt ? expiresAt.toLocaleDateString("ar-DZ") : "—"}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-muted-foreground">المتبقي</div>
                    <div className={`font-semibold ${isExpired ? "text-destructive" : daysLeft != null && daysLeft <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                      {expiresAt ? (isExpired ? "انتهى" : `${daysLeft} يوم`) : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setExtendUser(u); setExtendDays(30); }} className="flex-1 gap-1">
                    <CalendarPlus className="h-3 w-3" /> تمديد
                  </Button>
                  <Button size="sm" variant={u.is_active ? "destructive" : "default"} onClick={() => toggleUser(u)} className="flex-1 gap-1">
                    {u.is_active ? <><X className="h-3 w-3" /> تعطيل</> : <><Check className="h-3 w-3" /> تفعيل</>}
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          {auditLog.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد تغييرات مسجلة</div>
          )}
          {auditLog.map((entry) => {
            const target = userById(entry.target_user_id);
            const actor = userById(entry.changed_by);
            const actionLabels: Record<string, { label: string; color: string }> = {
              activate: { label: "تفعيل", color: "bg-emerald-500" },
              deactivate: { label: "تعطيل", color: "bg-destructive" },
              extend: { label: "تمديد", color: "bg-blue-500" },
              code_redeemed: { label: "رمز تفعيل", color: "bg-purple-500" },
            };
            const info = actionLabels[entry.action] || { label: entry.action, color: "bg-gray-500" };
            return (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge className={info.color}>{info.label}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("ar-DZ")}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">الحساب: </span>
                  <span className="font-semibold">{target?.full_name || target?.business_name || entry.target_user_id.slice(0, 8)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  بواسطة: {actor?.full_name || actor?.business_name || entry.changed_by.slice(0, 8)}
                </div>
                {entry.new_value?.expires_at && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ينتهي في: {new Date(entry.new_value.expires_at).toLocaleDateString("ar-DZ")}
                    {entry.new_value.days_added && ` (+${entry.new_value.days_added} يوم)`}
                  </div>
                )}
                {entry.notes && <div className="text-xs mt-1 italic">{entry.notes}</div>}
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="data">
          <AdminUserDataPanel users={users} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>توليد رمز تفعيل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الرقم التعريفي للجهاز (16 خانة)</Label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 16))}
                placeholder="مثال: e6ee32ecce6c477a"
                className="font-mono ltr text-left"
                dir="ltr"
                maxLength={16}
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                أطلبه من المستخدم — يظهر له في صفحة "تفعيل التطبيق"
              </div>
            </div>

            <div>
              <Label>مدة الاشتراك</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {([
                  ["شهر", 30, false],
                  ["3 أشهر", 90, false],
                  ["سنة", 365, false],
                  ["دائم", 0, true],
                ] as const).map(([label, d, perm]) => {
                  const selected = perm ? isPermanent : !isPermanent && days === d;
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => { setIsPermanent(perm); if (!perm) setDays(d); }}
                      className={`h-9 text-xs ${selected ? "bg-gradient-primary text-primary-foreground" : ""}`}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلا: لزبون فلان" />
            </div>
            <Button onClick={generateCode} disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              توليد الرمز
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!extendUser} onOpenChange={(o) => !o && setExtendUser(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تمديد الاشتراك</DialogTitle></DialogHeader>
          {extendUser && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="font-semibold">{extendUser.full_name || extendUser.business_name || "بدون اسم"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ينتهي حالياً: {extendUser.subscription_expires_at ? new Date(extendUser.subscription_expires_at).toLocaleDateString("ar-DZ") : "—"}
                </div>
              </div>
              <div>
                <Label>عدد الأيام للإضافة</Label>
                <Input type="number" value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)} />
                <div className="mt-2 flex gap-1">
                  {[7, 30, 90, 365].map((d) => (
                    <Button key={d} type="button" size="sm" variant="outline" onClick={() => setExtendDays(d)} className="flex-1 text-xs">{d} يوم</Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Input value={extendNotes} onChange={(e) => setExtendNotes(e.target.value)} placeholder="سبب التمديد..." />
              </div>
              <Button onClick={extendSubscription} className="w-full bg-gradient-primary text-primary-foreground gap-2">
                <CalendarPlus className="h-4 w-4" /> تمديد {extendDays} يوم
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
