import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Plus, ArrowDownCircle, ArrowUpCircle, Truck, Calendar, Image, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LocationView from "@/components/LocationView";

interface FilterState {
  vehiclePlate: string;
  productName: string;
  employeeId: string;
  destinationType: string;
  destinationSupplierId: string;
}

const RecordsPage = () => {
  const { profile } = useAuth();
  const isMaster = profile?.role === "master";
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string }[]>([]);
  const [stockProducts, setStockProducts] = useState<{ id: string; name: string }[]>([]);
  const [suppliersList, setSuppliersList] = useState<{ id: string; name: string; type: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    vehiclePlate: "", productName: "", employeeId: "", destinationType: "", destinationSupplierId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [recordsRes, suppliersRes, employeesRes, vehiclesRes, stockRes] = await Promise.all([
        supabase.from("material_records").select("*, record_cargos(*)").order("created_at", { ascending: false }),
        supabase.from("suppliers").select("id, name, type"),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("vehicles").select("id, plate").order("plate"),
        supabase.from("stock_products").select("id, name").order("name"),
      ]);
      setRecords(recordsRes.data || []);
      const map: Record<string, string> = {};
      (suppliersRes.data || []).forEach((s: any) => { map[s.id] = s.name; });
      setSuppliers(map);
      setSuppliersList((suppliersRes.data || []) as any);
      setEmployees((employeesRes.data || []) as any);
      setVehicles((vehiclesRes.data || []) as any);
      setStockProducts((stockRes.data || []) as any);
      setLoading(false);
    };
    fetchData();
  }, []);

  const getOriginDest = (r: any) => {
    if (r.operation_type === "entry" && r.origin_supplier_id) {
      return `Origem: ${r.origin_type === "external" ? "Externo" : "Interno"} — ${suppliers[r.origin_supplier_id] || ""}`;
    }
    if (r.operation_type === "exit" && r.destination_supplier_id) {
      return `Destino: ${r.destination_type === "external" ? "Externo" : "Interno"} — ${suppliers[r.destination_supplier_id] || ""}`;
    }
    return null;
  };

  const employeeMap = Object.fromEntries(employees.map(e => [e.id, e.full_name]));

  const filteredRecords = records.filter((r) => {
    if (filters.vehiclePlate && !r.vehicle_plate?.toLowerCase().includes(filters.vehiclePlate.toLowerCase())) return false;
    if (filters.employeeId && r.user_id !== filters.employeeId) return false;
    if (filters.productName) {
      const hasProduct = r.record_cargos?.some((c: any) => c.description?.toLowerCase().includes(filters.productName.toLowerCase()));
      if (!hasProduct) return false;
    }
    if (filters.destinationType) {
      if (filters.destinationType === "external" || filters.destinationType === "internal") {
        const matchOrigin = r.origin_type === filters.destinationType;
        const matchDest = r.destination_type === filters.destinationType;
        if (!matchOrigin && !matchDest) return false;
      }
    }
    if (filters.destinationSupplierId) {
      if (r.origin_supplier_id !== filters.destinationSupplierId && r.destination_supplier_id !== filters.destinationSupplierId) return false;
    }
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== "");
  const clearFilters = () => setFilters({ vehiclePlate: "", productName: "", employeeId: "", destinationType: "", destinationSupplierId: "" });

  const filteredSuppliersForFilter = filters.destinationType
    ? suppliersList.filter(s => s.type === filters.destinationType)
    : suppliersList;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Registros</h1>
            <p className="text-muted-foreground mt-1 text-sm">Entrada e saída de materiais</p>
          </div>
          <div className="flex items-center gap-2">
            {isMaster && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-1" /> Filtros
                {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />}
              </Button>
            )}
            {profile?.role === "employee" && (
              <Link to="/new-record">
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Registro</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && isMaster && (
          <Card className="border shadow-sm">
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filtrar Registros</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" /> Limpar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Placa do Veículo</Label>
                  <Input placeholder="Ex: ABC-1234" value={filters.vehiclePlate} onChange={(e) => setFilters({ ...filters, vehiclePlate: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Mercadoria</Label>
                  <Input placeholder="Ex: Areia, Cimento" value={filters.productName} onChange={(e) => setFilters({ ...filters, productName: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Funcionário</Label>
                  <Select value={filters.employeeId} onValueChange={(v) => setFilters({ ...filters, employeeId: v === "_all" ? "" : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo Origem/Destino</Label>
                  <Select value={filters.destinationType} onValueChange={(v) => setFilters({ ...filters, destinationType: v === "_all" ? "" : v, destinationSupplierId: "" })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos</SelectItem>
                      <SelectItem value="external">Externo</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fornecedor/Local</Label>
                  <Select value={filters.destinationSupplierId} onValueChange={(v) => setFilters({ ...filters, destinationSupplierId: v === "_all" ? "" : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos</SelectItem>
                      {filteredSuppliersForFilter.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredRecords.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{hasActiveFilters ? "Nenhum registro encontrado com os filtros aplicados" : "Nenhum registro encontrado"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((r) => (
              <Card key={r.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedRecord(r)}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${r.operation_type === "entry" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {r.operation_type === "entry" ? <ArrowDownCircle className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowUpCircle className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={r.operation_type === "entry" ? "default" : "secondary"}>
                          {r.operation_type === "entry" ? "Entrada" : "Saída"}
                        </Badge>
                        <span className="text-sm font-mono font-semibold">{r.vehicle_plate}</span>
                        {r.photo_url && <Image className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      {isMaster && employeeMap[r.user_id] && (
                        <p className="text-xs text-muted-foreground">Funcionário: {employeeMap[r.user_id]}</p>
                      )}
                      {getOriginDest(r) && (
                        <p className="text-sm text-muted-foreground">{getOriginDest(r)}</p>
                      )}
                      {r.record_cargos && r.record_cargos.length > 0 && (
                        <p className="text-sm text-muted-foreground truncate">
                          {r.record_cargos.length} carga(s): {r.record_cargos.map((c: any) => `${c.description} (${c.quantity} ${c.unit})`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm flex items-center gap-1 text-muted-foreground justify-end">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.record_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.record_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Detalhes do Registro</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedRecord.operation_type === "entry" ? "default" : "secondary"}>
                    {selectedRecord.operation_type === "entry" ? "Entrada" : "Saída"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedRecord.record_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                </div>

                {isMaster && employeeMap[selectedRecord.user_id] && (
                  <p className="text-sm"><span className="text-muted-foreground">Funcionário:</span> {employeeMap[selectedRecord.user_id]}</p>
                )}

                {selectedRecord.photo_url && (
                  <img src={selectedRecord.photo_url} alt="Foto da carga" className="w-full rounded-lg object-cover max-h-64" />
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Placa:</span> <span className="font-mono font-semibold">{selectedRecord.vehicle_plate}</span></div>
                  <div><span className="text-muted-foreground">Marca:</span> {selectedRecord.vehicle_brand || "N/A"}</div>
                  <div><span className="text-muted-foreground">Modelo:</span> {selectedRecord.vehicle_model || "N/A"}</div>
                  <div><span className="text-muted-foreground">Cor:</span> {selectedRecord.vehicle_color || "N/A"}</div>
                </div>

                {getOriginDest(selectedRecord) && (
                  <p className="text-sm font-medium">{getOriginDest(selectedRecord)}</p>
                )}

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
                  <LocationView latitude={selectedRecord.latitude} longitude={selectedRecord.longitude} />
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
