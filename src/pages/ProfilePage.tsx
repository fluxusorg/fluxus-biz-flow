import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
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
      console.log("Starting photo upload...", photoFile.name);
      const ext = photoFile.name.split(".").pop();
      const path = `${user!.id}/profile/${Date.now()}.${ext}`;
      const { error: uploadError, data: uploadData } = await supabase.storage.from("uploads").upload(path, photoFile);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Erro ao enviar foto: ${uploadError.message}`);
        // If upload fails, we probably shouldn't continue with a broken/old URL if the user intended to change it
        setSaving(false);
        return;
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
        console.log("Photo uploaded successfully. URL:", photoUrl);
      }
    }

    const payload = { ...form, photo_url: photoUrl };
    console.log("Saving profile with payload:", payload);

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
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
