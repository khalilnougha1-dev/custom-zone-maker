@echo off
REM ============================================
REM بناء تطبيق SahlaPos محلياً على ويندوز — مجاني 100%%
REM المتطلبات: Node.js 22 + JDK 21 + Android Studio
REM ============================================

echo ==^> 1/5 تثبيت الحزم...
call npm install --legacy-peer-deps
if errorlevel 1 goto :fail

echo ==^> 2/5 إنشاء مشروع أندرويد...
if not exist android (
  call npx cap add android
  if errorlevel 1 goto :fail
)

echo ==^> 3/5 توليد الأيقونة وشاشة البداية...
call npm install --no-save --legacy-peer-deps @capacitor/assets@3
call npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor "#ffffff" --iconBackgroundColorDark "#ffffff" --splashBackgroundColor "#ffffff" --splashBackgroundColorDark "#ffffff"

echo ==^> 4/5 مزامنة Capacitor...
call npx cap sync android
if errorlevel 1 goto :fail

echo ==^> 5/5 بناء APK...
cd android
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 goto :fail

echo.
echo ============================================
echo تم! ملف التطبيق جاهز هنا:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo انسخه إلى هاتفك وثبّته مباشرة.
echo ============================================
goto :eof

:fail
echo.
echo فشل البناء — انظر إلى رسالة الخطأ بالأعلى.
exit /b 1
