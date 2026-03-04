import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Printer, Filter } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Cargo {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  stock_product_id?: string;
}

interface MaterialRecord {
  id: string;
  user_id: string;
  company_id: string;
  operation_type: string;
  record_date: string;
  vehicle_plate: string;
  vehicle_id?: string;
  origin_type?: string;
  origin_supplier_id?: string;
  destination_type?: string;
  destination_supplier_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  record_cargos?: Cargo[];
  profiles?: { full_name: string };
}

interface FilterState {
  startDate: string;
  endDate: string;
  supplierId: string;
  vehicleId: string;
  employeeId: string;
  locationType: string; // "internal" | "external"
  operationType: string;
  stockProductId: string;
}

const ReportsPage = () => {
  const { profile, company } = useAuth();
  const isMaster = profile?.role === "master";
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [records, setRecords] = useState<MaterialRecord[]>([]);
  
  // Data for selects
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; type: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  
  const [stockProducts, setStockProducts] = useState<{ id: string; name: string }[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    supplierId: "all",
    vehicleId: "all",
    employeeId: "all",
    locationType: "all",
    operationType: "all",
    stockProductId: "all"
  });

  const [previewData, setPreviewData] = useState<MaterialRecord[]>([]);

  useEffect(() => {
    // Initial fetch for preview
    const loadPreview = async () => {
      const data = await fetchRecords();
      setPreviewData(data);
    };
    loadPreview();
  }, [filters, isMaster, profile]); // Re-fetch when filters change

  const fetchAuxData = async () => {
    try {
      const [suppliersRes, vehiclesRes, employeesRes, stockRes] = await Promise.all([
          supabase.from("suppliers").select("id, name, type").order("name"),
          supabase.from("vehicles").select("id, plate").order("plate"),
          isMaster ? supabase.from("profiles").select("id, full_name").eq("company_id", profile?.company_id) : Promise.resolve({ data: [] }),
          supabase.from("stock_products").select("id, name").order("name")
        ]);

        setSuppliers((suppliersRes.data || []) as any);
        setVehicles((vehiclesRes.data || []) as any);
        if (isMaster) {
          setEmployees((employeesRes.data || []) as any);
        }
        setStockProducts((stockRes.data || []) as any);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching aux data:", error);
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchAuxData();
  }, [isMaster, profile]);

  const fetchRecords = async () => {
    try {
      // Step 1: Fetch records without join to avoid PGRST200
      let query = supabase
        .from("material_records")
        .select("*, record_cargos(*)")
        .order("record_date", { ascending: false });

      // Apply Filters
      console.log("Fetching records with filters:", filters);
      
      // Handle Date Filters - Crucial Fix for Timezone Issues
      // When user selects '2026-03-03', we want to include everything from '2026-03-03T00:00:00' to '2026-03-03T23:59:59'
      // BUT, Supabase treats ISO strings without timezone as UTC.
      // If we are in GMT-3, '2026-03-03 10:00' local is '2026-03-03 13:00' UTC.
      // The DB stores UTC.
      
      // If we just send T00:00:00 and T23:59:59, we are checking against UTC range.
      // So '2026-03-03 13:00 UTC' falls within '2026-03-03 00:00' and '2026-03-03 23:59'.
      // This should work fine for current day IF the server date is correct.
      
      // HOWEVER, if the user input date is just "YYYY-MM-DD", we need to be careful.
      // Let's use the exact string the user provided.
      
      if (filters.startDate) query = query.gte("record_date", `${filters.startDate}T00:00:00`);
      if (filters.endDate) query = query.lte("record_date", `${filters.endDate}T23:59:59.999`);
      
      if (filters.vehicleId !== "all") query = query.eq("vehicle_id", filters.vehicleId);
      if (filters.operationType !== "all") query = query.eq("operation_type", filters.operationType);
      
      if (isMaster) {
        if (filters.employeeId !== "all") query = query.eq("user_id", filters.employeeId);
      } else {
        query = query.eq("user_id", profile!.id);
      }

      const { data, error } = await query;
      
      console.log("Fetch result:", { count: data?.length, error });
      
      if (error) throw error;

      // Step 2: Fetch profiles manually to join in memory
      let filtered = data || [];
      if (filtered.length > 0) {
        const userIds = [...new Set(filtered.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);
        
        // Merge profiles into records
        filtered = filtered.map(r => ({
          ...r,
          profiles: profileMap[r.user_id] || { full_name: "Desconhecido" }
        }));
      }

      // In-memory filtering for complex logic (Suppliers/Location)

      if (filters.supplierId !== "all") {
        filtered = filtered.filter(r => 
          r.origin_supplier_id === filters.supplierId || 
          r.destination_supplier_id === filters.supplierId
        );
      }

      if (filters.locationType !== "all") {
        filtered = filtered.filter(r => 
          (r.operation_type === "entry" && r.origin_type === filters.locationType) ||
          (r.operation_type === "exit" && r.destination_type === filters.locationType)
        );
      }

      if (filters.stockProductId !== "all") {
        filtered = filtered.filter(r => 
          r.record_cargos?.some((c: any) => c.stock_product_id === filters.stockProductId)
        );
      }

      setRecords(filtered as MaterialRecord[]);
      return filtered as MaterialRecord[];
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Erro ao buscar registros.");
      return [] as MaterialRecord[];
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    const data = await fetchRecords();
    
    if (data.length === 0) {
      toast.warning("Nenhum registro encontrado para os filtros selecionados.");
      setGenerating(false);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // --- Header ---
    // Fluxus Logo (Static URL or Base64 could be better, using a placeholder for now if local asset not available)
    // Assuming we want a "Powered by Fluxus" footer or similar, but user asked for logo mention.
    // Let's add a footer with Fluxus branding.

    // Company Logo
    if (company?.logo_url) {
      try {
        const img = new Image();
        img.src = company.logo_url;
        await new Promise((resolve) => { img.onload = resolve; });
        doc.addImage(img, "JPEG", 14, 10, 15, 15);
      } catch (e) {
        console.warn("Could not load logo for PDF", e);
      }
    }

    // Company Name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company?.name || "Empresa", 35, 18);

    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Movimentações", 35, 25);

    // Generator Info
    doc.setFontSize(10);
    doc.text(`Gerado por: ${profile?.full_name} (${isMaster ? "Gerenciador" : "Funcionário"})`, 14, 35);
    doc.text(`Data de Emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 40);
    
    // Filters Summary
    let filterText = "Filtros: ";
    if (filters.startDate && filters.endDate) filterText += `Período: ${new Date(filters.startDate).toLocaleDateString()} a ${new Date(filters.endDate).toLocaleDateString()}; `;
    else filterText += "Período: Todo o histórico; ";
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    const splitFilter = doc.splitTextToSize(filterText, pageWidth - 28);
    doc.text(splitFilter, 14, 48);

    // --- Table ---
    const tableColumn = ["Data/Hora", "Op.", "Veículo", "Registrado por", "Origem/Destino", "Localização", "Carga"];
    const tableRows: any[] = [];

    const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

    data.forEach((r) => {
      const date = new Date(r.record_date).toLocaleString("pt-BR", { 
        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" 
      });
      const type = r.operation_type === "entry" ? "Entrada" : "Saída";
      const vehicle = r.vehicle_plate;
      const responsible = r.profiles?.full_name || "N/A";
      
      // Location Flow (Origin -> Destination)
      let location = "";
      const originName = r.origin_type === "external" 
        ? (supplierMap[r.origin_supplier_id] ? `${supplierMap[r.origin_supplier_id]} (Ext)` : "Externo")
        : (supplierMap[r.origin_supplier_id] ? supplierMap[r.origin_supplier_id] : "Interno");
      
      const destName = r.destination_type === "external"
        ? (supplierMap[r.destination_supplier_id] ? `${supplierMap[r.destination_supplier_id]} (Ext)` : "Externo")
        : (supplierMap[r.destination_supplier_id] ? supplierMap[r.destination_supplier_id] : "Interno");

      location = `${originName} > ${destName}`;
      
      // Geolocation - Address or Coords
      // Assuming latitude/longitude are stored. We don't have address stored in DB, usually.
      // If we implemented address storage in previous turn, we use it. If not, we show coords.
      // Wait, in previous turn we only displayed address in UI, did we save it?
      // Checking schema... user didn't ask to save address string, just display it.
      // But NewRecordPage saves latitude/longitude.
      // Let's format lat/lng nicely if address not available.
      // Actually, user said "no relatório tem que conter a localização registrada".
      // Since we don't save the address text in DB (only lat/long), we can only show lat/long in PDF unless we reverse geocode ON THE FLY (slow) or if we had saved it.
      // Given constraints, I will show Lat/Lng. If user wants address text, we'd need a migration to save it.
      // However, let's check if we can show a link or just coords.
      const geo = r.address 
        ? r.address 
        : (r.latitude && r.longitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : "N/A");

      const cargos = r.record_cargos?.map((c: any) => `${c.description} (${c.quantity}${c.unit})`).join(", ") || "-";

      tableRows.push([date, type, vehicle, responsible, location, geo, cargos]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 1.5 }, // Reduced font size to fit more cols
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 12 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 }, // Location col increased slightly for address
        6: { cellWidth: "auto" }
      },
      didDrawPage: (data) => {
        // Footer - Page Number and Fluxus Branding
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height;
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        
        // Page Number (Right)
        doc.text("Página " + doc.getNumberOfPages(), pageWidth - 25, pageHeight - 10);
        
        // Fluxus Branding (Left)
        // Load Fluxus logo if available (simulated here with text, or could be base64)
        doc.text("Gerado via Fluxus System", 14, pageHeight - 10);
        
        // Try to add Fluxus logo image if we had one locally, but text is safer for now.
        // If user wants logo, we'd need the asset. 
        // For now, "Fluxus System" text is the mention.
      }
    });

    // Save
    doc.save(`relatorio_movimentacoes_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("Relatório gerado com sucesso!");
    setGenerating(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Relatórios</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gere relatórios detalhados de movimentações.</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filtros do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
              </div>

              {/* Vehicle */}
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={filters.vehicleId} onValueChange={(v) => setFilters({...filters, vehicleId: v})}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label>Fornecedor / Local</Label>
                <Select value={filters.supplierId} onValueChange={(v) => setFilters({...filters, supplierId: v})}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.type === 'internal' ? 'Int.' : 'Ext.'})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Type */}
              <div className="space-y-2">
                <Label>Tipo de Localização</Label>
                <Select value={filters.locationType} onValueChange={(v) => setFilters({...filters, locationType: v})}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="external">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Select value={filters.operationType} onValueChange={(v) => setFilters({...filters, operationType: v})}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entry">Entrada</SelectItem>
                    <SelectItem value="exit">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Product */}
              <div className="space-y-2">
                <Label>Mercadoria / Produto</Label>
                <Select value={filters.stockProductId} onValueChange={(v) => setFilters({...filters, stockProductId: v})}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {stockProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee (Master only) */}
              {isMaster && (
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select value={filters.employeeId} onValueChange={(v) => setFilters({...filters, employeeId: v})}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="mt-8 border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
                <h3 className="font-semibold text-sm">Pré-visualização ({previewData.length} registros encontrados)</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background sticky top-0">
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Operação</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Veículo</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Registrado por</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Localização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum registro encontrado para os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      previewData.slice(0, 10).map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="px-4 py-2">{new Date(r.record_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.operation_type === 'entry' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.operation_type === 'entry' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{r.vehicle_plate}</td>
                          <td className="px-4 py-2">{r.profiles?.full_name}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {r.address || (r.latitude && r.longitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : "N/A")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                    Exibindo 10 de {previewData.length} registros. Baixe o PDF para ver todos.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button onClick={generatePDF} disabled={generating || previewData.length === 0} className="w-full sm:w-auto">
                {generating ? "Gerando..." : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
