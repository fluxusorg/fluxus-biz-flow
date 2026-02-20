import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, ArrowDownCircle, ArrowUpCircle, Truck, Calendar, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RecordsPage = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase
        .from("material_records")
        .select("*, record_cargos(*)")
        .order("created_at", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    fetchRecords();
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
              <Button><Plus className="w-4 h-4 mr-2" /> Novo Registro</Button>
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
              <Card
                key={r.id}
                className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedRecord(r)}
              >
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
                        {r.photo_url && <Image className="w-4 h-4 text-muted-foreground" />}
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

        {/* Record detail dialog */}
        <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Detalhes do Registro</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedRecord.operation_type === "entry" ? "default" : "secondary"}>
                    {selectedRecord.operation_type === "entry" ? "Entrada" : "Saída"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedRecord.record_date).toLocaleString("pt-BR")}
                  </span>
                </div>

                {selectedRecord.photo_url && (
                  <img src={selectedRecord.photo_url} alt="Foto da carga" className="w-full rounded-lg object-cover max-h-64" />
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Placa:</span> <span className="font-mono font-semibold">{selectedRecord.vehicle_plate}</span></div>
                  <div><span className="text-muted-foreground">Marca:</span> {selectedRecord.vehicle_brand || "N/A"}</div>
                  <div><span className="text-muted-foreground">Modelo:</span> {selectedRecord.vehicle_model || "N/A"}</div>
                  <div><span className="text-muted-foreground">Cor:</span> {selectedRecord.vehicle_color || "N/A"}</div>
                </div>

                {selectedRecord.record_cargos?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Cargas</h4>
                    {selectedRecord.record_cargos.map((c: any) => (
                      <div key={c.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                        <span>{c.description}</span>
                        <span className="text-muted-foreground">{c.quantity} {c.unit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRecord.latitude && selectedRecord.longitude && (
                  <p className="text-xs text-muted-foreground">📍 {selectedRecord.latitude.toFixed(5)}, {selectedRecord.longitude.toFixed(5)}</p>
                )}

                {selectedRecord.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Observações</h4>
                    <p className="text-sm text-muted-foreground">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default RecordsPage;
