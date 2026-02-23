import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Truck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
}

const VehiclesPage = () => {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plate: "", brand: "", model: "", color: "" });

  const fetchVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("*").order("plate");
    setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const resetForm = () => { setForm({ plate: "", brand: "", model: "", color: "" }); setEditing(null); };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ plate: v.plate, brand: v.brand || "", model: v.model || "", color: v.color || "" });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate.trim()) { toast.error("Informe a placa do veículo"); return; }
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from("vehicles").update({
        plate: form.plate.toUpperCase(), brand: form.brand || null, model: form.model || null, color: form.color || null,
      }).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Veículo atualizado!");
    } else {
      const { error } = await supabase.from("vehicles").insert({
        company_id: profile!.company_id, plate: form.plate.toUpperCase(),
        brand: form.brand || null, model: form.model || null, color: form.color || null,
      });
      if (error) toast.error(error.message); else toast.success("Veículo cadastrado!");
    }

    setSaving(false); setDialogOpen(false); resetForm(); fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este veículo?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Veículo excluído"); fetchVehicles(); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Veículos</h1>
            <p className="text-muted-foreground mt-1">Gerencie os veículos cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Novo Veículo</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">{editing ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} required placeholder="ABC-1234" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Mercedes-Benz" />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Atego 2426" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Branco" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : vehicles.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum veículo cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <Card key={v.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-lg">{v.plate}</p>
                        <p className="text-sm text-muted-foreground">
                          {[v.brand, v.model, v.color].filter(Boolean).join(" • ") || "Sem detalhes"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default VehiclesPage;
