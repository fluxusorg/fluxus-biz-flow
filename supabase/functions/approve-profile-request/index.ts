import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
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
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is master
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "master") {
      return new Response(JSON.stringify({ error: "Apenas gerenciadores podem aprovar alterações" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "ID da solicitação não fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the request
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("profile_edit_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !requestData) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestData.company_id !== callerProfile.company_id) {
      return new Response(JSON.stringify({ error: "Solicitação pertence a outra empresa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const changes = requestData.requested_changes as Record<string, any>;
    
    // Prepare update payload
    const updatePayload: any = {
      full_name: changes.full_name,
      position: changes.position || null,
      operation_location: changes.operation_location || null,
    };
    
    // Explicitly handle photo_url
    if (changes.photo_url !== undefined) {
      updatePayload.photo_url = changes.photo_url;
    }

    console.log("Updating profile", requestData.profile_id, "with", updatePayload);

    // Update profile using Admin client (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", requestData.profile_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar perfil: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark request as approved
    const { error: statusError } = await supabaseAdmin
      .from("profile_edit_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    if (statusError) {
      return new Response(JSON.stringify({ error: "Perfil atualizado, mas erro ao marcar solicitação: " + statusError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
