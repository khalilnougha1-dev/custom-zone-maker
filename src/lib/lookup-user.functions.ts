import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const lookupUserByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = data.email.trim().toLowerCase();
    if (!email) return { user: null as null | { id: string; email: string } };
    // page through users (small projects). For larger, use filter via admin API.
    let page = 1;
    while (page <= 10) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) => (u.email || "").toLowerCase() === email);
      if (found) return { user: { id: found.id, email: found.email || "" } };
      if (list.users.length < 200) break;
      page++;
    }
    return { user: null };
  });
