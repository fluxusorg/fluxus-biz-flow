import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, profile, company } = useAuth();
  const isMaster = profile?.role === "master";
  const [form, setForm] = useState({
    full_name: "",
    position: "",
    operation_location: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        position: profile.position || "",
        operation_location: profile.operation_location || "",
      });
      setPhotoPreview(profile.photo_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (isMaster) {
      const fetchRequests = async () => {
        const { data } = await supabase
          .from("profile_edit_requests")
          .select("*, profiles(full_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        setPendingRequests(data || []);
      };
      fetchRequests();
    }
  }, [isMaster]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Informe seu nome"); return; }
    setSaving(true);

    let photoUrl = profile?.photo_url || null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${user!.id}/profile/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, photoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    if (isMaster) {
      // Master can update directly
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name,
        position: form.position || null,
        operation_location: form.operation_location || null,
        photo_url: photoUrl,
      }).eq("id", user!.id);
      setSaving(false);
      if (error) toast.error(error.message);
      else toast.success("Perfil atualizado!");
    } else {
      // Employee submits edit request
      const { error } = await supabase.from("profile_edit_requests").insert({
        profile_id: user!.id,
        company_id: profile!.company_id,
        requested_changes: { ...form, photo_url: photoUrl },
      });
      setSaving(false);
      if (error) toast.error(error.message);
      else toast.success("Solicitação de alteração enviada para aprovação do gerenciador!");
    }
  };

  const handleApprove = async (req: any) => {
    const changes = req.requested_changes as Record<string, any>;
    const { error: updateError } = await supabase.from("profiles").update({
      full_name: changes.full_name,
      position: changes.position || null,
      operation_location: changes.operation_location || null,
      photo_url: changes.photo_url || null,
    }).eq("id", req.profile_id);

    if (updateError) { toast.error(updateError.message); return; }

    await supabase.from("profile_edit_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    toast.success("Alteração aprovada!");
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleReject = async (req: any) => {
    await supabase.from("profile_edit_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    toast.success("Alteração rejeitada");
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold font-display">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">
            {isMaster ? "Edite suas informações" : "Alterações precisam de aprovação do gerenciador"}
          </p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                <div>
                  <p className="font-semibold">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{isMaster ? "Gerenciador" : "Funcionário"}</p>
                  <p className="text-xs text-muted-foreground">{company?.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Seu cargo" />
                </div>
                <div className="space-y-2">
                  <Label>Local de Operação</Label>
                  <Input value={form.operation_location} onChange={(e) => setForm({ ...form, operation_location: e.target.value })} placeholder="Filial / Unidade" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : isMaster ? "Salvar Alterações" : "Enviar para Aprovação"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pending edit requests for master */}
        {isMaster && pendingRequests.length > 0 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Clock className="w-5 h-5" /> Solicitações de Alteração Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRequests.map((req) => {
                const changes = req.requested_changes as Record<string, any>;
                return (
                  <div key={req.id} className="p-4 rounded-lg bg-muted/50 border space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{req.profiles?.full_name || "Funcionário"}</p>
                      <Badge variant="outline">Pendente</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      {changes.full_name && <p><span className="text-muted-foreground">Nome:</span> {changes.full_name}</p>}
                      {changes.position && <p><span className="text-muted-foreground">Cargo:</span> {changes.position}</p>}
                      {changes.operation_location && <p><span className="text-muted-foreground">Local:</span> {changes.operation_location}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(req)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(req)}>
                        <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
