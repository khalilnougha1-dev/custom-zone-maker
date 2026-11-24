import { createFileRoute } from "@tanstack/react-router";
import { PurchaseEditor } from "@/components/purchases/PurchaseEditor";

export const Route = createFileRoute("/app/purchases_/new")({
  head: () => ({ meta: [
    { title: "شراء جديد | SahlaPos" },
    { name: "description", content: "إضافة مشتريات المنتجات والكرطون ومسح الباركود في SahlaPos." },
    { property: "og:title", content: "شراء جديد | SahlaPos" },
    { property: "og:description", content: "إضافة مشتريات المنتجات والكرطون ومسح الباركود في SahlaPos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <PurchaseEditor />,
});
