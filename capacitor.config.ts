import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.sahlapos",
  appName: "SAHLAPOS",
  webDir: "android-shell",
  server: {
    // التطبيق يفتح الموقع المنشور مباشرة (الموقع يحتاج خادم)
    url: "https://custom-zone-maker.lovable.app",
    cleartext: false,
    androidScheme: "https",
    // إبقاء كل التنقّل داخل التطبيق (تسجيل الدخول عبر Google/Apple/Supabase)
    allowNavigation: [
      "custom-zone-maker.lovable.app",
      "*.lovable.app",
      "accounts.google.com",
      "*.google.com",
      "*.googleusercontent.com",
      "*.gstatic.com",
      "appleid.apple.com",
      "*.apple.com",
      "dpvxhydfwmgxeyhtrwdk.supabase.co",
      "*.supabase.co",
    ],
  },
  android: {
    allowMixedContent: false,
    // ضروري لتسجيل الدخول داخل WebView
    appendUserAgent: "Chrome/120.0.0.0 Mobile SahlaposApp",
    webContentsDebuggingEnabled: false,
  },
};

export default config;
