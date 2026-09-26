#!/usr/bin/env bash
# ============================================
# بناء تطبيق SahlaPos محلياً — مجاني 100%
# يعمل على Linux و macOS (للويندوز استخدم build-apk.bat)
# المتطلبات: Node.js 22 + JDK 21 + Android SDK
# ============================================
set -e

echo "==> 1/5 تثبيت الحزم..."
npm install --legacy-peer-deps

echo "==> 2/5 إنشاء مشروع أندرويد..."
if [ ! -d android ]; then
  npx cap add android
fi

echo "==> 3/5 توليد الأيقونة وشاشة البداية..."
npm install --no-save --legacy-peer-deps @capacitor/assets@3
npx capacitor-assets generate --android --assetPath resources \
  --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#ffffff' \
  --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#ffffff' || true

echo "==> 4/5 مزامنة Capacitor..."
npx cap sync android

echo "==> 5/5 بناء APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon

APK=$(ls app/build/outputs/apk/debug/*.apk | head -1)
echo ""
echo "============================================"
echo "تم! ملف التطبيق جاهز هنا:"
echo "  android/$APK"
echo "انسخه إلى هاتفك وثبّته مباشرة."
echo "============================================"
