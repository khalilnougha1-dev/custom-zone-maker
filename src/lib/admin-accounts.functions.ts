import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountActionDenial } from "./admin-account-rules";

const UUID = z.string().uuid();
const BAN_FOREVER = "876000h"; // ~100 years

type Result = { ok: true } | { ok: false; error: string };

/** Verifies the caller is an admin and the target is a bannable/deletable customer. */
async function authorize(context: { supabase: any; userId: string }, targetId: string) {
  const { data: mine, error } = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId);
  if (error) return { denial: "تعذّر التحقق من الصلاحيات" as string | null, admin: null as any };
  const callerRoles = (mine || []).map((r: { role: string }) => r.role);
  // Check the caller first so non-admins never reach the privileged client.
  const pre = accountActionDenial({ callerId: context.userId, callerRoles, targetId, targetRoles: [] });
  if (pre) return { denial: pre, admin: null as any };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: theirs, error: e2 } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", targetId);
  if (e2) return { denial: "تعذّر التحقق من الحساب المستهدف", admin: null as any };
  const targetRoles = (theirs || []).map((r) => r.role as string);
  return {
    denial: accountActionDenial({ callerId: context.userId, callerRoles, targetId, targetRoles }),
    admin: supabaseAdmin,
  };
}

export const adminSetUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: UUID, banned: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<Result> => {
    const { denial, admin } = await authorize(context, data.userId);
    if (denial) return { ok: false, error: denial };

    const { error: authErr } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? BAN_FOREVER : "none",
    });
    if (authErr) return { ok: false, error: authErr.message };

    const { error: profErr } = await admin.from("profiles")
      .update({ is_banned: data.banned, banned_at: data.banned ? new Date().toISOString() : null })
      .eq("id", data.userId);
    if (profErr) return { ok: false, error: profErr.message };

    await admin.from("subscription_audit_log").insert({
      target_user_id: data.userId, changed_by: context.userId,
      action: data.banned ? "ban" : "unban",
      old_value: { is_banned: !data.banned }, new_value: { is_banned: data.banned },
    });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: UUID }).parse(d))
  .handler(async ({ data, context }): Promise<Result> => {
    const { denial, admin } = await authorize(context, data.userId);
    if (denial) return { ok: false, error: denial };
    const uid = data.userId;

    const { data: profile } = await admin.from("profiles")
      .select("full_name, business_name, phone").eq("id", uid).maybeSingle();

    // Block sign-in first so nothing new is written while the data is removed.
    await admin.auth.admin.updateUserById(uid, { ban_duration: BAN_FOREVER });

    // Children cascade from sales/purchases/products/trucks; stock rows come after them.
    const owned = [
      "sales", "purchases", "stock_movements", "product_packages", "products", "categories",
      "customers", "suppliers", "expenses", "cash_movements", "cash_transactions", "app_settings",
    ] as const;
    for (const table of owned) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
    }
    for (const table of ["truck_distributions", "trucks"] as const) {
      const { error } = await admin.from(table).delete().eq("owner_id", uid);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
    }
    await admin.from("trucks").update({ driver_user_id: null }).eq("driver_user_id", uid);

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return { ok: false, error: delErr.message };

    await admin.from("subscription_audit_log").insert({
      target_user_id: uid, changed_by: context.userId, action: "delete_account",
      old_value: profile ?? null, new_value: null,
      notes: profile?.full_name || profile?.business_name || null,
    });
    return { ok: true };
  });
