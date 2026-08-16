import { ReactNode } from "react";
import { Shield, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  title?: string;
  email?: string | null;
  children: ReactNode;
}

export function AdminLayout({ title = "لوحة المسؤول العامة", email, children }: AdminLayoutProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-linear-to-l from-primary to-primary/80 text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <div>
              <div className="font-bold text-base sm:text-lg">{title}</div>
              {email && <div className="text-[11px] opacity-80" dir="ltr">{email}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15 h-8 gap-1 text-xs">
              <a href="/app"><Home className="h-3.5 w-3.5" /> التطبيق</a>
            </Button>
            <Button onClick={handleSignOut} size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15 h-8 gap-1 text-xs">
              <LogOut className="h-3.5 w-3.5" /> خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-border py-4 text-center text-xs text-muted-foreground">
        لوحة الإدارة العامة • SAHLAPOS
      </footer>
    </div>
  );
}
