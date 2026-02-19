import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, User, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  operation_location: string | null;
  photo_url: string | null;
}

const EmployeesPage = () => {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    position: "",
    operationLocation: "",
  });

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, position, operation_location, photo_url")
      .eq("role", "employee");
    setEmployees((data as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: form,
    });

    setCreating(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar funcionário");
      return;
    }

    toast.success("Funcionário criado com sucesso!");
    setDialogOpen(false);
    setForm({ email: "", password: "", fullName: "", position: "", operationLocation: "" });
    fetchEmployees();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Funcionários</h1>
            <p className="text-muted-foreground mt-1">Gerencie os membros da sua equipe</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" /> Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Cadastrar Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required placeholder="Nome do funcionário" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Acesso *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="funcionario@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo / Função</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Operador logístico" />
                </div>
                <div className="space-y-2">
                  <Label>Local de Operação</Label>
                  <Input value={form.operationLocation} onChange={(e) => setForm({ ...form, operationLocation: e.target.value })} placeholder="Filial São Paulo" />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Cadastrando..." : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : employees.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione o primeiro membro da sua equipe</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card key={emp.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold text-lg">
                      {emp.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{emp.full_name}</p>
                      {emp.position && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {emp.position}
                        </p>
                      )}
                      {emp.operation_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {emp.operation_location}
                        </p>
                      )}
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

export default EmployeesPage;
