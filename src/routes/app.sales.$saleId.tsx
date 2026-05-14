import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/sales/$saleId")({
  component: () => <Outlet />,
});
