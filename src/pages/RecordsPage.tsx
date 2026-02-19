import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, ArrowDownCircle, ArrowUpCircle, Truck, Calendar } from "lucide-react";

const RecordsPage = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const query = supabase
        .from("material_records")
        .select("*, record_cargos(*), profiles!material_records_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      const { data } = await query;
      setRecords(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Registros</h1>
            <p className="text-muted-foreground mt-1">Entrada e saída de materiais</p>
          </div>
          {profile?.role === "employee" && (
            <Link to="/new-record">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Novo Registro
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : records.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <Card key={r.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      r.operation_type === "entry" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {r.operation_type === "entry" ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={r.operation_type === "entry" ? "default" : "secondary"}>
                          {r.operation_type === "entry" ? "Entrada" : "Saída"}
                        </Badge>
                        <span className="text-sm font-mono font-semibold">{r.vehicle_plate}</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Veículo:</span>{" "}
                        {[r.vehicle_brand, r.vehicle_model, r.vehicle_color].filter(Boolean).join(" • ") || "N/A"}
                      </p>
                      {r.record_cargos && r.record_cargos.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {r.record_cargos.length} carga(s):{" "}
                          {r.record_cargos.map((c: any) => `${c.description} (${c.quantity} ${c.unit})`).join(", ")}
                        </p>
                      )}
                      {r.profiles?.full_name && (
                        <p className="text-xs text-muted-foreground">Operador: {r.profiles.full_name}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm flex items-center gap-1 text-muted-foreground justify-end">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.record_date).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.record_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
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

export default RecordsPage;
