import { createFileRoute } from "@tanstack/react-router";
import { PurchaseEditor } from "@/components/purchases/PurchaseEditor";

export const Route = createFileRoute("/app/purchases_/$purchaseId")({
  component: EditPage,
});

function EditPage() {
  const { purchaseId } = Route.useParams();
  return <PurchaseEditor purchaseId={purchaseId} />;
}
