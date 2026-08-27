import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — SahlaPos" },
      { name: "description", content: "سياسة خصوصية تطبيق SahlaPos: البيانات التي نجمعها، طريقة استخدامها وحمايتها، وحقوقك في حذف حسابك." },
      { property: "og:title", content: "سياسة الخصوصية — SahlaPos" },
      { property: "og:description", content: "كيف يجمع تطبيق SahlaPos بياناتك ويحميها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="mt-2 space-y-2 text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: 27 أوت 2026</p>

        <p className="mt-6 leading-relaxed text-muted-foreground">
          يوضّح هذا المستند كيفية جمع تطبيق <strong>SahlaPos</strong> (نقطة بيع وتسيير المبيعات والمخزون)
          للبيانات واستخدامها وحمايتها. باستخدامك للتطبيق فإنك توافق على ما ورد في هذه السياسة.
        </p>

        <S title="1. البيانات التي نجمعها">
          <ul className="list-disc space-y-1 pr-5">
            <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، واسم النشاط التجاري.</li>
            <li>بيانات العمل التي تُدخلها أنت: المنتجات، الزبائن، الموردون، المبيعات، المشتريات، المخزون والمصاريف.</li>
            <li>بيانات تقنية محدودة: نوع الجهاز ونظام التشغيل وسجلات الأخطاء لتحسين الأداء.</li>
          </ul>
        </S>

        <S title="2. كيف نستخدم البيانات">
          <p>تُستخدم البيانات حصراً لتشغيل التطبيق: حفظ عملياتك، إصدار الوصولات والتقارير، مزامنة بياناتك بين أجهزتك، والدعم الفني. لا نبيع بياناتك ولا نشاركها مع معلنين.</p>
        </S>

        <S title="3. الأذونات على الهاتف">
          <ul className="list-disc space-y-1 pr-5">
            <li><strong>البلوتوث والموقع التقريبي:</strong> مطلوبان من نظام أندرويد للبحث عن الطابعة الحرارية والاتصال بها فقط. لا نجمع موقعك الجغرافي ولا نخزّنه.</li>
            <li><strong>البصمة / القياسات الحيوية:</strong> لقفل التطبيق محلياً على جهازك. لا تغادر بصمتك الجهاز أبداً.</li>
            <li><strong>التخزين:</strong> لحفظ النسخ الاحتياطية والوصولات على جهازك.</li>
            <li><strong>الإنترنت:</strong> لمزامنة بياناتك مع الخادم الآمن.</li>
          </ul>
        </S>

        <S title="4. حفظ البيانات وحمايتها">
          <p>تُخزَّن البيانات على خوادم آمنة مع التشفير أثناء النقل (HTTPS) وسياسات عزل صارمة تمنع أي مستخدم من الاطلاع على بيانات مستخدم آخر. الوصول محمي بكلمة مرور و/أو تسجيل دخول عبر Google.</p>
        </S>

        <S title="5. حذف الحساب والبيانات">
          <p>يمكنك طلب حذف حسابك وكل بياناتك نهائياً بمراسلتنا على البريد أدناه، ويُنفَّذ الطلب خلال 30 يوماً كحد أقصى.</p>
        </S>

        <S title="6. الأطفال">
          <p>التطبيق موجّه للتجار وأصحاب الأنشطة التجارية وليس للأطفال دون 13 سنة.</p>
        </S>

        <S title="7. التعديلات">
          <p>قد نحدّث هذه السياسة، وسيظهر تاريخ التحديث في أعلى الصفحة.</p>
        </S>

        <S title="8. الاتصال بنا">
          <p>للاستفسار أو طلب حذف البيانات: <a className="text-primary underline" href="mailto:contact@sahlapay.dz">contact@sahlapay.dz</a></p>
        </S>
      </main>
      <Footer />
    </div>
  );
}
