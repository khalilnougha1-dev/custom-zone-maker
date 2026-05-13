import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { I18nProvider } from "@/components/I18nProvider";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SAHLAPOS — نظام نقاط البيع الذكي" },
      { name: "description", content: "منصة متكاملة لإدارة المبيعات، المخزون، الزبائن، والمشتريات." },
      { property: "og:title", content: "SAHLAPOS — نظام نقاط البيع الذكي" },
      { name: "twitter:title", content: "SAHLAPOS — نظام نقاط البيع الذكي" },
      { property: "og:description", content: "منصة متكاملة لإدارة المبيعات، المخزون، الزبائن، والمشتريات." },
      { name: "twitter:description", content: "منصة متكاملة لإدارة المبيعات، المخزون، الزبائن، والمشتريات." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80727949-72ad-4b50-9c0f-3ab0f5ec9a81/id-preview-fd966185--c4779272-19cc-4e87-959f-a75116596f33.lovable.app-1777602011236.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80727949-72ad-4b50-9c0f-3ab0f5ec9a81/id-preview-fd966185--c4779272-19cc-4e87-959f-a75116596f33.lovable.app-1777602011236.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <I18nProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </I18nProvider>
  );
}
