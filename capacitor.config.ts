import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.sahlapos",
  appName: "SAHLAPOS",
  webDir: "android-shell",
  server: {
    // التطبيق يفتح الموقع المنشور مباشرة
    url: "https://custom-zone-maker.lovable.app",
    cleartext: false,
    androidScheme: "https",
    // إبقاء كل التنقّل داخل التطبيق (Google / Apple / قاعدة البيانات)
    allowNavigation: [
      "*.lovable.app",
      "*.google.com",
      "accounts.google.com",
      "*.googleusercontent.com",
      "*.gstatic.com",
      "appleid.apple.com",
      "*.apple.com",
      "*.supabase.co",
    ],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
