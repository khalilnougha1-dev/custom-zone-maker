import logo from "@/assets/sahlapos-logo.png.asset.json";

/** شعار SahlaPos الرسمي — يُستخدم داخل التطبيق وخارجه */
export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="SahlaPos"
      className={`${className} shrink-0 rounded-xl bg-white object-contain p-0.5`}
      loading="eager"
      decoding="async"
    />
  );
}

export default BrandLogo;
