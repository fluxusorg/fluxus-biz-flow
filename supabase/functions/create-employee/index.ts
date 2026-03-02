import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    const url = new URL(req.url);
    console.log(JSON.stringify({ requestId, stage: "start", method: req.method, pathname: url.pathname }));

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn(JSON.stringify({ requestId, stage: "auth.header", error: "missing_authorization_header" }));
      return new Response(JSON.stringify({ error: "Não autorizado", stage: "auth.header", requestId }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the calling user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.warn(JSON.stringify({ requestId, stage: "auth.getUser", userError: userError?.message || null }));
      return new Response(JSON.stringify({ error: "Não autorizado", stage: "auth.getUser", requestId, details: userError?.message || null }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is master
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (callerProfileError) {
      console.error(JSON.stringify({ requestId, stage: "db.callerProfile", error: callerProfileError.message, userId: user.id }));
      return new Response(JSON.stringify({ error: "Erro ao validar permissões", stage: "db.callerProfile", requestId, details: callerProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!callerProfile || callerProfile.role !== "master") {
      console.warn(JSON.stringify({ requestId, stage: "auth.role", error: "not_master", userId: user.id, role: callerProfile?.role || null }));
      return new Response(JSON.stringify({ error: "Apenas gerenciadores podem criar funcionários", stage: "auth.role", requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (_e) {
      console.warn(JSON.stringify({ requestId, stage: "request.json", error: "invalid_json" }));
      return new Response(JSON.stringify({ error: "Payload inválido", stage: "request.json", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, position, operationLocation } = payload || {};

    if (!email || !password || !fullName) {
      console.warn(JSON.stringify({ requestId, stage: "request.validate", error: "missing_required_fields", hasEmail: !!email, hasPassword: !!password, hasFullName: !!fullName }));
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos", stage: "request.validate", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(JSON.stringify({ requestId, stage: "auth.createUser.start", callerUserId: user.id, companyId: callerProfile.company_id }));

    // Create auth user for employee
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error(JSON.stringify({ requestId, stage: "auth.createUser", error: authError.message, status: (authError as any).status || null }));
      return new Response(JSON.stringify({ error: authError.message, stage: "auth.createUser", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(JSON.stringify({ requestId, stage: "db.profile.insert.start", employeeUserId: authData.user.id, companyId: callerProfile.company_id }));

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        company_id: callerProfile.company_id,
        role: "employee",
        full_name: fullName,
        position: position || null,
        operation_location: operationLocation || null,
      });

    if (profileError) {
      console.error(JSON.stringify({ requestId, stage: "db.profile.insert", error: profileError.message, employeeUserId: authData.user.id }));
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: profileError.message, stage: "db.profile.insert", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(JSON.stringify({ requestId, stage: "success", employeeUserId: authData.user.id }));
    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error(JSON.stringify({ stage: "catch", error: message }));
    return new Response(JSON.stringify({ error: message, stage: "catch" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
