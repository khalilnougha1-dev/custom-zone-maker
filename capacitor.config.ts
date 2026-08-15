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
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
