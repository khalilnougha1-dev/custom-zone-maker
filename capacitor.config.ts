import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.sahlapos",
  appName: "SAHLAPOS",
  webDir: "android-shell",
  server: {
    // التطبيق يفتح صفحة تسجيل الدخول مباشرة بعد شاشة البداية
    url: "https://pos.sahlapay.dz/login",
    cleartext: false,
    androidScheme: "https",
    // إبقاء كل التنقّل داخل التطبيق (تسجيل الدخول عبر Google/Apple/Supabase)
    allowNavigation: [
      "pos.sahlapay.dz",
      "sahlapay.dz",
      "*.sahlapay.dz",
      "custom-zone-maker.lovable.app",
      "*.lovable.app",
      "dpvxhydfwmgxeyhtrwdk.supabase.co",
      "*.supabase.co",
      "accounts.google.com",
      "appleid.apple.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
  android: {
    allowMixedContent: false,
    // ضروري لتسجيل الدخول داخل WebView
    appendUserAgent: "Chrome/120.0.0.0 Mobile SahlaposApp",
    webContentsDebuggingEnabled: false,
  },
};

export default config;
