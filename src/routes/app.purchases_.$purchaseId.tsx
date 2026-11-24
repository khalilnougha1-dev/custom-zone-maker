import { createFileRoute } from "@tanstack/react-router";
import { PurchaseEditor } from "@/components/purchases/PurchaseEditor";

export const Route = createFileRoute("/app/purchases_/$purchaseId")({
  head: () => ({ meta: [
    { title: "تعديل المشتريات | SahlaPos" },
    { name: "description", content: "تعديل منتجات وكميات عملية الشراء في SahlaPos." },
    { property: "og:title", content: "تعديل المشتريات | SahlaPos" },
    { property: "og:description", content: "تعديل منتجات وكميات عملية الشراء في SahlaPos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EditPage,
});

function EditPage() {
  const { purchaseId } = Route.useParams();
  return <PurchaseEditor purchaseId={purchaseId} />;
}
