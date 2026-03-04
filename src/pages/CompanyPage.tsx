import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Hash, Pencil, Camera, MapPin, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const CompanyPage = () => {
  const { company } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: company?.name || "",
    headquarters_address: (company as any)?.headquarters_address || "",
    manager_name: (company as any)?.manager_name || "",
    manager_position: (company as any)?.manager_position || "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);

  if (!company) return null;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let logoUrl = company.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `company-logos/${company.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, logoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("companies").update({
      name: form.name,
      headquarters_address: form.headquarters_address || null,
      manager_name: form.manager_name,
      manager_position: form.manager_position,
      logo_url: logoUrl,
    }).eq("id", company.id);

    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Empresa atualizada!"); setDialogOpen(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Dados da Empresa</h1>
            <p className="text-muted-foreground mt-1 text-sm">Informações da sua organização</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-2" /> Editar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Editar Empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  <p className="text-xs text-muted-foreground">Logo da empresa</p>
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Endereço Sede</Label>
                  <Textarea value={form.headquarters_address} onChange={(e) => setForm({ ...form, headquarters_address: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome Gerenciador</Label>
                    <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input value={form.manager_position} onChange={(e) => setForm({ ...form, manager_position: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded-xl gradient-primary flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-primary-foreground" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold font-display">{company.name}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {company.cnpj}
                </p>
              </div>
            </div>

            {((company as any)?.headquarters_address || (company as any)?.manager_name) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                {(company as any)?.headquarters_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço Sede</p>
                      <p className="text-sm">{(company as any).headquarters_address}</p>
                    </div>
                  </div>
                )}
                {(company as any)?.manager_name && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Gerenciador</p>
                      <p className="text-sm">{(company as any).manager_name} — {(company as any).manager_position}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CompanyPage;
