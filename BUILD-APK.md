# بناء تطبيق SahlaPos محلياً — مجاني 100% بدون GitHub

هذه الطريقة تبني الـ APK على حاسوبك مباشرة. لا تحتاج GitHub Actions ولا أي دفع.

## المتطلبات (تُثبَّت مرة واحدة فقط)

1. **Node.js 22** — من https://nodejs.org
2. **JDK 21** — من https://adoptium.net (اختر Temurin 21)
3. **Android Studio** — من https://developer.android.com/studio
   - أثناء التثبيت تأكد من تثبيت **Android SDK** و **Command-line Tools**
   - بعد الفتح: More Actions → SDK Manager → ثبّت **Android SDK Platform 34** و **Android SDK Build-Tools**

## خطوات البناء

### على ويندوز
1. افتح مجلد المشروع في الطرفية (Terminal أو CMD)
2. نفّذ:
   ```
   build-apk.bat
   ```

### على Linux أو macOS
1. افتح مجلد المشروع في الطرفية
2. نفّذ:
   ```bash
   chmod +x build-apk.sh
   ./build-apk.sh
   ```

## النتيجة

بعد نجاح البناء تجد ملف التطبيق هنا:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
انسخه إلى هاتفك (عبر USB أو البريد أو أي وسيلة) وثبّته مباشرة.

## ملاحظات

- **نسخة debug** تعمل للاستخدام الشخصي والتجربة. لرفع التطبيق على Google Play تحتاج نسخة release موقّعة (نفس مفتاح التوقيع الموجود في أسرار GitHub).
- أول بناء يأخذ وقتاً أطول (10–20 دقيقة) لأنه ينزّل مكتبات أندرويد. البناءات التالية أسرع بكثير.
- إن ظهر خطأ `ANDROID_HOME is not set`: عيّن متغير البيئة `ANDROID_HOME` إلى مسار SDK (عادة `C:\Users\اسمك\AppData\Local\Android\Sdk` على ويندوز).
- التطبيق يفتح الموقع مباشرة، لذلك أي تحديث ويب يصل المستخدمين **بدون** إعادة بناء الـ APK. أعد البناء فقط عند تغيير الطابعة/البلوتوث/الأيقونة.
