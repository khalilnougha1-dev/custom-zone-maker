import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  Menu, X, ShoppingCart, Package, Users, Truck, BarChart3, Wallet,
  Receipt, Settings, LogOut, Printer, TrendingUp, Boxes, FileText, Home, Calculator
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "الرئيسية", icon: Home, exact: true },
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
  { to: "/app/printer", label: "الطابعة", icon: Printer },
  { to: "/app/settings", label: "الإعدادات", icon: Settings },
];

export function PosLayout({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const router = useRouterState();
  const path = router.location.pathname;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => { setOpen(false); }, [path]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background">...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top bar — KuaiPOS purple */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10 transition" aria-label="menu">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{title}</h1>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>

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
