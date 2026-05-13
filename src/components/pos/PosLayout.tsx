import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  Menu, X, ShoppingCart, Package, Users, Truck, BarChart3, Wallet,
  Receipt, Settings, LogOut, Printer, TrendingUp, Boxes, FileText, Home, Calculator,
  Shield, TruckIcon, UserCircle, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalculatorDialog } from "@/components/pos/CalculatorDialog";

const NAV = [
  { to: "/app", label: "الرئيسية", icon: Home, exact: true },
  { to: "/app/cash", label: "الصندوق", icon: Calculator },
  { to: "/app/pos", label: "نقطة البيع", icon: ShoppingCart },
  { to: "/app/sales", label: "المبيعات", icon: Receipt },
  { to: "/app/purchases", label: "المشتريات", icon: Truck },
  { to: "/app/products", label: "المنتجات", icon: Package },
  { to: "/app/inventory", label: "المخزون", icon: Boxes },
  { to: "/app/customers", label: "الزبائن", icon: Users },
  { to: "/app/suppliers", label: "الممونين", icon: Truck },
  { to: "/app/expenses", label: "المصاريف", icon: Wallet },
  { to: "/app/finance", label: "الوضعية المالية", icon: TrendingUp },
  { to: "/app/profits", label: "الأرباح", icon: BarChart3 },
  { to: "/app/reports", label: "التقارير", icon: FileText },
  { to: "/app/trucks", label: "الشاحنات والتوزيع", icon: TruckIcon },
  { to: "/app/printer", label: "الطابعة", icon: Printer },
  { to: "/app/settings", label: "الإعدادات", icon: Settings },
  { to: "/app/account", label: "حسابي", icon: UserCircle },
];

const ADMIN_NAV = { to: "/app/admin", label: "لوحة المسؤول", icon: Shield };

export function PosLayout({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [expiryInfo, setExpiryInfo] = useState<{ daysLeft: number | null; isExpired: boolean } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouterState();
  const path = router.location.pathname;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!data?.subscription_expires_at) return;
      const exp = new Date(data.subscription_expires_at);
      const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
      if (days <= 7) setExpiryInfo({ daysLeft: days, isExpired: days <= 0 });
    })();
    const dismissed = sessionStorage.getItem("expiry_banner_dismissed");
    if (dismissed) setBannerDismissed(true);
  }, [user]);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      const roles = (data || []).map((r: { role: string }) => r.role);
      setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("expiry_banner_dismissed", "1");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background">...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top bar — SAHLAPOS purple */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10 transition" aria-label="menu">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{title}</h1>
          <div className="flex items-center gap-1">
            {actions}
            <button onClick={() => setCalcOpen(true)} className="rounded-lg p-2 hover:bg-white/10 transition" aria-label="calculator">
              <Calculator className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <CalculatorDialog open={calcOpen} onOpenChange={setCalcOpen} />

      {expiryInfo && !bannerDismissed && (
        <div className={`sticky top-14 z-30 border-b ${expiryInfo.isExpired ? "bg-destructive/10 border-destructive/30" : "bg-amber-500/10 border-amber-500/30"}`}>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <AlertTriangle className={`h-4 w-4 shrink-0 ${expiryInfo.isExpired ? "text-destructive" : "text-amber-600"}`} />
              <span className={`truncate ${expiryInfo.isExpired ? "text-destructive font-semibold" : "text-amber-900 dark:text-amber-200"}`}>
                {expiryInfo.isExpired
                  ? "انتهى اشتراكك! يرجى التجديد للاستمرار."
                  : `اشتراكك سينتهي خلال ${expiryInfo.daysLeft} ${expiryInfo.daysLeft === 1 ? "يوم" : "أيام"}`}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/app/activate">
                <Button size="sm" className="h-7 text-xs bg-gradient-primary text-primary-foreground">تجديد</Button>
              </Link>
              <button onClick={dismissBanner} className="rounded p-1 hover:bg-foreground/10" aria-label="dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-card shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-primary p-4 text-primary-foreground">
              <div>
                <div className="text-sm opacity-80">مرحبا</div>
                <div className="font-bold truncate max-w-[180px]">{user.email}</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-2">
              {NAV.map((item) => {
                const active = item.exact ? path === item.to : path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                تسجيل الخروج
              </button>
            </nav>
          </aside>
        </>
      )}

      <main className="mx-auto max-w-5xl p-4">{children}</main>

      {/* Activate footer */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur p-3">
        <Link to="/app/activate">
          <Button variant="secondary" className="w-full font-semibold">تفعيل التطبيق</Button>
        </Link>
      </div>
    </div>
  );
}
