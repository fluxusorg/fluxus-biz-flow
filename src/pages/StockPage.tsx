import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StockProduct {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  current_quantity: number;
  minimum_quantity: number | null;
}

const StockPage = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "unidade",
    current_quantity: 0,
    minimum_quantity: 0,
  });

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("stock_products")
      .select("*")
      .order("name");
    setProducts((data as StockProduct[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", unit: "unidade", current_quantity: 0, minimum_quantity: 0 });
    setEditingProduct(null);
  };

  const openEdit = (p: StockProduct) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      unit: p.unit,
      current_quantity: p.current_quantity,
      minimum_quantity: p.minimum_quantity || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do produto"); return; }
    setSaving(true);

    if (editingProduct) {
      const { error } = await supabase
        .from("stock_products")
        .update({
          name: form.name,
          description: form.description || null,
          unit: form.unit,
          current_quantity: form.current_quantity,
          minimum_quantity: form.minimum_quantity,
        })
        .eq("id", editingProduct.id);
      if (error) toast.error(error.message);
      else toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase
        .from("stock_products")
        .insert({
          company_id: profile!.company_id,
          name: form.name,
          description: form.description || null,
          unit: form.unit,
          current_quantity: form.current_quantity,
          minimum_quantity: form.minimum_quantity,
        });
      if (error) toast.error(error.message);
      else toast.success("Produto cadastrado!");
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("stock_products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Produto excluído"); fetchProducts(); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Estoque</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus produtos e materiais</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Areia lavada" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do produto" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="ton">Tonelada</SelectItem>
                        <SelectItem value="m3">m³</SelectItem>
                        <SelectItem value="unidade">Unidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd. Atual</Label>
                    <Input type="number" min={0} step="0.01" value={form.current_quantity} onChange={(e) => setForm({ ...form, current_quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Qtd. Mínima (alerta)</Label>
                  <Input type="number" min={0} step="0.01" value={form.minimum_quantity} onChange={(e) => setForm({ ...form, minimum_quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : editingProduct ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : products.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum produto cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-display ${p.minimum_quantity && p.current_quantity <= p.minimum_quantity ? "text-destructive" : "text-foreground"}`}>
                      {p.current_quantity}
                    </span>
                    <span className="text-sm text-muted-foreground">{p.unit}</span>
                  </div>
                  {p.minimum_quantity !== null && p.minimum_quantity > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Mínimo: {p.minimum_quantity} {p.unit}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StockPage;
