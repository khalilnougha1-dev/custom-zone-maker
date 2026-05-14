import { createFileRoute } from "@tanstack/react-router";
import { PurchaseEditor } from "@/components/purchases/PurchaseEditor";

export const Route = createFileRoute("/app/purchases_/new")({ component: () => <PurchaseEditor /> });
