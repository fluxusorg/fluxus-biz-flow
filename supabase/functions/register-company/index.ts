import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, companyName, cnpj, headquartersAddress, branchAddresses, managerName, managerPosition, logoUrl, redirectTo } = await req.json();

    if (!email || !password || !companyName || !cnpj || !managerName || !managerPosition) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        cnpj,
        headquarters_address: headquartersAddress || null,
        branch_addresses: branchAddresses || [],
        manager_name: managerName,
        manager_position: managerPosition,
        logo_url: logoUrl || null,
      })
      .select()
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return new Response(JSON.stringify({ error: `Erro ao criar empresa: ${companyError.message}`, details: companyError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: typeof redirectTo === "string" ? redirectTo : undefined,
    });

    if (inviteError || !inviteData?.user?.id) {
      console.error("Auth invite error:", inviteError);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(JSON.stringify({ error: `Erro ao enviar convite: ${inviteError?.message || "Falha ao convidar usuário"}`, details: inviteError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = inviteData.user.id;

    if (password) {
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (pwError) {
        console.error("Password update error:", pwError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from("companies").delete().eq("id", company.id);
        return new Response(JSON.stringify({ error: `Erro ao definir senha: ${pwError.message}`, details: pwError }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        company_id: company.id,
        role: "master",
        full_name: managerName,
        position: managerPosition,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}`, details: profileError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, companyId: company.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
