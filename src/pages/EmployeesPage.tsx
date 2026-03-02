import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, User, MapPin, Briefcase, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  operation_location: string | null;
  photo_url: string | null;
}

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    position: "",
    operationLocation: "",
  });

  const invokeFunction = async (name: string, body: any) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const getValidAccessToken = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let token = sessionData.session?.access_token;
      if (!token) return null;

      const { error: userErr } = await supabase.auth.getUser();
      if (!userErr) return token;

      console.warn("Token seems invalid (getUser failed), trying refresh...");
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      
      if (refreshErr) {
        console.error("Session refresh failed:", refreshErr);
        await supabase.auth.signOut(); // Force clear local session if refresh fails
        return null;
      }
      
      if (refreshed.session?.access_token) {
        console.log("Session refreshed successfully");
        return refreshed.session.access_token;
      }
      
      return null;
    };

    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const call = async (token: string) => {
      // Log for debugging
      console.log("Calling Edge Function:", name);
      console.log("Token (first 10 chars):", token?.substring(0, 10));
      
      // Removed ?apikey= param to match working Node script exactly
      // Relying on headers only
      return fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": anonKey,
        },
        body: JSON.stringify(body),
      });
    };

    let res = await call(accessToken);
    if (res.status === 401) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      const newToken = refreshed.session?.access_token;
      if (newToken) {
        res = await call(newToken);
      }
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const stage = json?.stage ? ` [${json.stage}]` : "";
      const requestId = json?.requestId ? ` (${json.requestId})` : "";
      throw new Error((json?.error || `Erro ao executar função (${res.status})`) + stage + requestId);
    }
    return json;
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, position, operation_location, photo_url")
      .eq("role", "employee");
    setEmployees((data as Employee[]) || []);
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from("profile_edit_requests")
      .select("*, profiles(full_name, photo_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingRequests(data || []);
  };

  useEffect(() => {
    fetchEmployees();
    fetchPendingRequests();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await invokeFunction("create-employee", form);
      toast.success("Funcionário criado com sucesso!");
      setDialogOpen(false);
      setForm({ email: "", password: "", fullName: "", position: "", operationLocation: "" });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar funcionário");
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (req: any) => {
    try {
      console.log("Approving request via Edge Function:", req.id);
      
      // Use our robust invocation helper
      await invokeFunction("approve-profile-request", { requestId: req.id });

      toast.success("Alteração aprovada com sucesso!");
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      fetchEmployees(); // Refresh list
    } catch (err: any) {
      console.error("Error approving request:", err);
      toast.error(err.message || "Erro ao aprovar solicitação");
    }
  };

  const handleReject = async (req: any) => {
    await supabase
      .from("profile_edit_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);

    toast.success("Alteração rejeitada");
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Funcionários</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os membros da sua equipe
              {pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center">
                  <Badge variant="secondary">{pendingRequests.length} pendente(s)</Badge>
                </span>
              )}
            </p>
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
                    <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold text-lg overflow-hidden shrink-0">
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full object-cover" />
                      ) : (
                        emp.full_name.charAt(0)
                      )}
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

        {pendingRequests.length > 0 && (
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold text-sm overflow-hidden shrink-0">
                          {changes.photo_url ? (
                            <img src={changes.photo_url} alt="Nova foto" className="w-full h-full object-cover" />
                          ) : req.profiles?.photo_url ? (
                            <img src={req.profiles.photo_url} alt="Foto atual" className="w-full h-full object-cover opacity-50" />
                          ) : (
                            (req.profiles?.full_name || "?").charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{req.profiles?.full_name || "Funcionário"}</p>
                          {changes.photo_url && <p className="text-xs text-green-600 font-medium">Solicitou nova foto</p>}
                        </div>
                      </div>
                      <Badge variant="outline">Pendente</Badge>
                    </div>
                    <div className="text-sm space-y-1 mt-2">
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

export default EmployeesPage;
