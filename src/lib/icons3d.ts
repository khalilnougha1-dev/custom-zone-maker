import pos from "@/assets/icons3d/pos.png";
import sales from "@/assets/icons3d/sales.png";
import purchases from "@/assets/icons3d/purchases.png";
import products from "@/assets/icons3d/products.png";
import inventory from "@/assets/icons3d/inventory.png";
import customers from "@/assets/icons3d/customers.png";
import suppliers from "@/assets/icons3d/suppliers.png";
import expenses from "@/assets/icons3d/expenses.png";
import finance from "@/assets/icons3d/finance.png";
import profits from "@/assets/icons3d/profits.png";
import reports from "@/assets/icons3d/reports.png";
import settings from "@/assets/icons3d/settings.png";

/** أيقونات ثلاثية الأبعاد حسب مسار الصفحة */
export const ICONS_3D: Record<string, string> = {
  "/app/pos": pos,
  "/app/cash": finance,
  "/app/sales": sales,
  "/app/customer-payments": sales,
  "/app/purchases": purchases,
  "/app/products": products,
  "/app/inventory": inventory,
  "/app/customers": customers,
  "/app/suppliers": suppliers,
  "/app/expenses": expenses,
  "/app/finance": finance,
  "/app/profits": profits,
  "/app/reports": reports,
  "/app/trucks": purchases,
  "/app/settings": settings,
};
