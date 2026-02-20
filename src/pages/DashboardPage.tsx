import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const DashboardPage = () => {
  const { profile, company } = useAuth();
  const isMaster = profile?.role === "master";
  const [stats, setStats] = useState({ total: 0, entries: 0, exits: 0, employees: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const { count: total } = await supabase
        .from("material_records")
        .select("*", { count: "exact", head: true });

      const { count: entries } = await supabase
        .from("material_records")
        .select("*", { count: "exact", head: true })
        .eq("operation_type", "entry");

      const { count: exits } = await supabase
        .from("material_records")
        .select("*", { count: "exact", head: true })
        .eq("operation_type", "exit");

      let employeeCount = 0;
      if (isMaster) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "employee");
        employeeCount = count || 0;
      }

      setStats({
        total: total || 0,
        entries: entries || 0,
        exits: exits || 0,
        employees: employeeCount,
      });
    };

    fetchStats();
  }, [profile, isMaster]);

  const statCards = [
    { label: "Total de Registros", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Entradas", value: stats.entries, icon: ArrowDownCircle, color: "text-success" },
    { label: "Saídas", value: stats.exits, icon: ArrowUpCircle, color: "text-warning" },
    ...(isMaster
      ? [{ label: "Funcionários", value: stats.employees, icon: Users, color: "text-accent" }]
      : []),
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">
            Olá, {profile?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {isMaster
              ? `Painel de gestão • ${company?.name}`
              : `Seus registros de operação`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentRecords />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

const RecentRecords = () => {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("material_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecords(data || []);
    };
    fetch();
  }, []);

  if (records.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Nenhum registro encontrado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.operation_type === "entry" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            {r.operation_type === "entry" ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.vehicle_plate} — {r.vehicle_brand} {r.vehicle_model}</p>
            <p className="text-xs text-muted-foreground">
              {r.operation_type === "entry" ? "Entrada" : "Saída"} • {new Date(r.record_date).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardPage;
