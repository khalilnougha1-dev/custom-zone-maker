import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UserCircle, Mail, Phone, Building2, Calendar, Shield, KeyRound,
  LogOut, Lock, ChevronLeft, CheckCircle2, XCircle, Crown, Clock, History
} from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/account")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AccountPage,
});

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const [{ data: p }, { data: r }, { data: log }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("subscription_audit_log").select("*").eq("target_user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setProfile(p);
      setRoles((r || []).map((x: any) => x.role));
      setAuditLog(log || []);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) return toast.error(error.message);
    toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك");
  };

  if (authLoading || loading) {
    return <PosLayout title="حسابي"><div className="p-8 text-center text-muted-foreground">جاري التحميل...</div></PosLayout>;
  }

  const expiresAt = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const now = new Date();
  const isExpired = expiresAt && expiresAt < now;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const roleLabels: Record<string, { label: string; color: string; icon: any }> = {
    super_admin: { label: "مسؤول رئيسي", color: "bg-amber-500", icon: Crown },
    admin: { label: "مسؤول", color: "bg-purple-500", icon: Shield },
    user: { label: "مستخدم", color: "bg-blue-500", icon: UserCircle },
    driver: { label: "سائق", color: "bg-emerald-500", icon: UserCircle },
  };

  const actionLabels: Record<string, string> = {
    activate: "تفعيل الحساب",
    deactivate: "تعطيل الحساب",
    extend: "تمديد الاشتراك",
    code_redeemed: "استخدام رمز تفعيل",
  };

  return (
    <PosLayout title="حسابي">
      <div className="space-y-4" dir="rtl">
        {/* User Card */}
        <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
              {(profile?.full_name || user?.email || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">{profile?.full_name || "بدون اسم"}</div>
              {profile?.business_name && (
                <div className="text-sm opacity-90 truncate">{profile.business_name}</div>
              )}
              <div className="text-xs opacity-80 truncate" dir="ltr">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              حالة الاشتراك
            </h3>
            {profile?.is_active ? (
              <Badge className="bg-emerald-500 gap-1"><CheckCircle2 className="h-3 w-3" /> مفعّل</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> معطّل</Badge>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة</span>
              <span className="font-semibold">
                {profile?.subscription_status === "trial" ? "تجريبي" :
                 profile?.subscription_status === "active" ? "نشط" :
                 profile?.subscription_status === "expired" ? "منتهي" : profile?.subscription_status}
              </span>
            </div>
            {expiresAt && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الانتهاء</span>
                  <span className="font-semibold">{expiresAt.toLocaleDateString("ar-DZ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المتبقي</span>
                  <span className={`font-semibold ${isExpired ? "text-destructive" : daysLeft! <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                    {isExpired ? "انتهى" : `${daysLeft} يوم`}
                  </span>
                </div>
              </>
            )}
          </div>
          <Link to="/app/activate">
            <Button className="mt-4 w-full bg-gradient-primary text-primary-foreground gap-2">
              <KeyRound className="h-4 w-4" /> تفعيل / تمديد الاشتراك
            </Button>
          </Link>
        </div>

        {/* Roles */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            الصلاحيات
          </h3>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد صلاحيات</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const info = roleLabels[role] || { label: role, color: "bg-gray-500", icon: UserCircle };
                const Icon = info.icon;
                return (
                  <Badge key={role} className={`${info.color} gap-1`}>
                    <Icon className="h-3 w-3" /> {info.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            المعلومات الشخصية
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span dir="ltr" className="flex-1">{user?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span dir="ltr" className="flex-1">{profile.phone}</span>
              </div>
            )}
            {profile?.business_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{profile.business_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-xs text-muted-foreground">
                مسجّل منذ {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ar-DZ") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            الأمان
          </h3>
          <div className="space-y-2">
            <Button onClick={handlePasswordReset} variant="outline" className="w-full justify-between gap-2">
              <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> تغيير كلمة المرور</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Link to="/app/settings" className="block">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> إعدادات الحساب</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline" className="w-full justify-between gap-2 text-destructive hover:text-destructive">
              <span className="flex items-center gap-2"><LogOut className="h-4 w-4" /> تسجيل الخروج</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Subscription history */}
        {auditLog.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              سجل الاشتراك
            </h3>
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{actionLabels[entry.action] || entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("ar-DZ")}
                    </span>
                  </div>
                  {entry.notes && <div className="mt-1 text-xs text-muted-foreground">{entry.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PosLayout>
  );
}
