import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Server/client-side guard for admin-only routes. Verifies the user is
 * authenticated AND holds an `admin` or `super_admin` role before the
 * component renders. Used in route `beforeLoad`.
 */
export async function requireAdmin(redirectToOnDeny: string = "/app") {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/login" });
  }
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const isAdmin = (roles || []).some(
    (r: { role: string }) => r.role === "admin" || r.role === "super_admin"
  );
  if (!isAdmin) {
    throw redirect({ to: redirectToOnDeny });
  }
}
