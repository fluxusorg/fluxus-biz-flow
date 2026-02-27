import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoIcon from "@/assets/logo-icon.png";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    companyName: "", cnpj: "", headquartersAddress: "",
    managerName: "", managerPosition: "",
  });
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranch, setNewBranch] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const addBranch = () => { if (newBranch.trim()) { setBranches((prev) => [...prev, newBranch.trim()]); setNewBranch(""); } };
  const removeBranch = (index: number) => setBranches((prev) => prev.filter((_, i) => i !== index));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (form.password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
    setLoading(true);

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `company-logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, logoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase.functions.invoke("register-company", {
      body: {
        email: form.email, password: form.password,
        companyName: form.companyName, cnpj: form.cnpj,
        headquartersAddress: form.headquartersAddress, branchAddresses: branches,
        managerName: form.managerName, managerPosition: form.managerPosition, logoUrl,
      },
    });

    setLoading(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Erro ao cadastrar"); return; }
    toast.success("Empresa cadastrada com sucesso! Faça login.");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src={logoIcon} alt="Fluxus" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold font-display">Fluxus</span>
            </div>
            <h2 className="text-2xl font-bold font-display">Cadastro da Empresa</h2>
            <p className="text-muted-foreground text-sm">Crie a conta master da sua empresa no Fluxus</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Logo da Empresa</Label>
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
                  <p className="text-xs text-muted-foreground">Clique para enviar a logo da empresa (opcional)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input value={form.companyName} onChange={(e) => updateForm("companyName", e.target.value)} required placeholder="Empresa LTDA" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input value={form.cnpj} onChange={(e) => updateForm("cnpj", e.target.value)} required placeholder="00.000.000/0000-00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço da Sede Matriz</Label>
                <Textarea value={form.headquartersAddress} onChange={(e) => updateForm("headquartersAddress", e.target.value)} placeholder="Rua, número, cidade, estado" rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Filiais</Label>
                <div className="flex gap-2">
                  <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Endereço da filial" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBranch())} />
                  <Button type="button" variant="outline" size="icon" onClick={addBranch}><Plus className="w-4 h-4" /></Button>
                </div>
                {branches.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-md">
                    <span className="flex-1">{b}</span>
                    <button type="button" onClick={() => removeBranch(i)}><X className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Gerenciador *</Label>
                  <Input value={form.managerName} onChange={(e) => updateForm("managerName", e.target.value)} required placeholder="João Silva" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo na Empresa *</Label>
                  <Input value={form.managerPosition} onChange={(e) => updateForm("managerPosition", e.target.value)} required placeholder="Gerente de Operações" />
                </div>
              </div>

              <hr className="my-4 border-border" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail de Acesso *</Label>
                  <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required placeholder="gerente@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} required placeholder="Mínimo 6 caracteres" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar Senha *</Label>
                <Input type="password" value={form.confirmPassword} onChange={(e) => updateForm("confirmPassword", e.target.value)} required placeholder="Repita a senha" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar Empresa"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
