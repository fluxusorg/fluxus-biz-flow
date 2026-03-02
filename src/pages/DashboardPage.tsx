import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, ArrowUpCircle, ArrowDownCircle, Plus, Search, CalendarDays, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DashboardPage = () => {
  const { profile, company } = useAuth();
  const isMaster = profile?.role === "master";
  const [stats, setStats] = useState({ total: 0, entries: 0, exits: 0, employees: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      // Basic stats
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

      // Chart data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: recentRecords } = await supabase
        .from("material_records")
        .select("created_at, operation_type")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentRecords) {
        const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const chartMap = new Map();

        // Initialize last 7 days
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateKey = d.toISOString().split('T')[0];
          const dayName = days[d.getDay()];
          chartMap.set(dateKey, { name: dayName, entrada: 0, saida: 0, fullDate: dateKey });
        }

        recentRecords.forEach(record => {
          const dateKey = new Date(record.created_at).toISOString().split('T')[0];
          if (chartMap.has(dateKey)) {
            const entry = chartMap.get(dateKey);
            if (record.operation_type === 'entry') entry.entrada += 1;
            else entry.saida += 1;
          }
        });

        setChartData(Array.from(chartMap.values()));
      }
    };

    fetchStats();
  }, [profile, isMaster]);

  const statCards = [
    { 
      label: "Total de Registros", 
      value: stats.total, 
      icon: FileText, 
      color: "text-primary",
      bg: "bg-primary/10",
      desc: "Todas as operações"
    },
    { 
      label: "Entradas", 
      value: stats.entries, 
      icon: ArrowDownCircle, 
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      desc: "Materiais recebidos"
    },
    { 
      label: "Saídas", 
      value: stats.exits, 
      icon: ArrowUpCircle, 
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      desc: "Materiais despachados"
    },
    ...(isMaster
      ? [{ 
          label: "Funcionários", 
          value: stats.employees, 
          icon: Users, 
          color: "text-violet-500",
          bg: "bg-violet-500/10",
          desc: "Equipe ativa"
        }]
      : []),
  ];

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Olá, {profile?.full_name?.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {isMaster
                ? `Visão geral de ${company?.name}`
                : `Acompanhe suas atividades recentes`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/records">
              <Button variant="outline" className="gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </Button>
            </Link>
            <Link to="/new-record">
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                Novo Registro
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold font-display tracking-tight">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12%
                  </span>
                  <span>vs. mês anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-xl">Fluxo Semanal</CardTitle>
                  <CardDescription>Entradas e saídas nos últimos 7 dias</CardDescription>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar 
                      name="Entradas"
                      dataKey="entrada" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30}
                    />
                    <Bar 
                      name="Saídas"
                      dataKey="saida" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-display text-xl">Atividade Recente</CardTitle>
              <CardDescription>Últimas operações registradas</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2">
              <RecentRecords />
            </CardContent>
          </Card>
        </div>
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
        .limit(6);
      setRecords(data || []);
    };
    fetch();
  }, []);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Nenhum registro encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((r, i) => (
        <div key={r.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
          <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
            r.operation_type === "entry" 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-blue-500/10 text-blue-500"
          }`}>
            {r.operation_type === "entry" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                {r.vehicle_plate}
              </p>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {new Date(r.record_date).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {r.vehicle_brand} {r.vehicle_model}
            </p>
            {r.driver_name && (
              <div className="flex items-center gap-1 mt-1.5">
                <Users className="w-3 h-3 text-muted-foreground/70" />
                <p className="text-xs text-muted-foreground/80 truncate">{r.driver_name}</p>
              </div>
            )}
          </div>
        </div>
      ))}
      <Link to="/records" className="block text-center">
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground mt-2">
          Ver todos os registros
        </Button>
      </Link>
    </div>
  );
};

export default DashboardPage;
