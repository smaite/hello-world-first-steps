import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an owner
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is owner
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleData || roleData.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owner can reset the app" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all non-owner user IDs to delete from auth
    const { data: nonOwnerRoles } = await adminClient.from("user_roles").select("user_id").neq("role", "owner");
    const nonOwnerIds = (nonOwnerRoles || []).map((r: any) => r.user_id);

    // Delete data from all tables (order matters for foreign keys)
    const tables = [
      "bank_transactions",
      "credit_transactions",
      "staff_settlements",
      "staff_cash_tracker",
      "staff_salaries",
      "staff_permissions",
      "daily_reports",
      "expenses",
      "money_receivings",
      "notifications",
      "user_activity",
      "remembered_devices",
      "login_otps",
      "transactions",
      "customers",
      "bank_accounts",
    ];

    for (const table of tables) {
      await adminClient.from(table).delete().gte("created_at", "1970-01-01");
    }

    // Reset exchange settings to defaults
    await adminClient.from("exchange_settings").delete().gte("id", "00000000-0000-0000-0000-000000000000");

    // Delete non-owner profiles, roles, then auth users
    for (const uid of nonOwnerIds) {
      await adminClient.from("user_roles").delete().eq("user_id", uid);
      await adminClient.from("profiles").delete().eq("id", uid);
      await adminClient.auth.admin.deleteUser(uid);
    }

    return new Response(JSON.stringify({ success: true, deleted_users: nonOwnerIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
