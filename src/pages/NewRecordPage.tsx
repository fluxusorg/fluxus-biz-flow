import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, MapPin, Camera } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Cargo {
  description: string;
  quantity: number;
  unit: string;
  stock_product_id: string;
}

interface StockProduct { id: string; name: string; unit: string; }
interface Vehicle { id: string; plate: string; brand: string | null; model: string | null; color: string | null; }
interface Supplier { id: string; name: string; type: string; }

const getBrasiliaDatetime = () => {
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const diff = brasiliaOffset - (-localOffset);
  const brasilia = new Date(now.getTime() + diff * 60000);
  return brasilia.toISOString().slice(0, 16);
};

const NewRecordPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<string>("");
  const [form, setForm] = useState({ recordDate: getBrasiliaDatetime(), notes: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [originDestType, setOriginDestType] = useState<string>("");
  const [originDestSupplierId, setOriginDestSupplierId] = useState<string>("");
  const [cargos, setCargos] = useState<Cargo[]>([{ description: "", quantity: 1, unit: "kg", stock_product_id: "" }]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [stockRes, vehicleRes, supplierRes, tokenRes] = await Promise.all([
        supabase.from("stock_products").select("id, name, unit").order("name"),
        supabase.from("vehicles").select("*").order("plate"),
        supabase.from("suppliers").select("*").order("name"),
        supabase.functions.invoke("get-mapbox-token"),
      ]);
      setStockProducts((stockRes.data as StockProduct[]) || []);
      setVehicles((vehicleRes.data as Vehicle[]) || []);
      setSuppliers((supplierRes.data as Supplier[]) || []);
      if (tokenRes.data?.token) setMapboxToken(tokenRes.data.token);
    };
    fetchData();
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;
    
    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-47.9292, -15.7801], // Brasília
        zoom: 4,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapRef.current = map;
    };
    initMap();
    
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [mapboxToken]);

  useEffect(() => {
    if (!location || !mapRef.current) return;
    const applyLocation = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (markerRef.current) markerRef.current.remove();
      const marker = new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([location.lng, location.lat])
        .addTo(mapRef.current);
      markerRef.current = marker;
      mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 15 });
    };
    applyLocation();
  }, [location]);

  const addCargo = () => setCargos([...cargos, { description: "", quantity: 1, unit: "kg", stock_product_id: "" }]);
  const removeCargo = (i: number) => { if (cargos.length > 1) setCargos(cargos.filter((_, idx) => idx !== i)); };

  const selectStockProduct = (i: number, productId: string) => {
    const product = stockProducts.find((p) => p.id === productId);
    if (product) {
      const updated = [...cargos];
      updated[i] = { ...updated[i], description: product.name, unit: product.unit, stock_product_id: product.id };
      setCargos(updated);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const getLocation = async () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setGettingLocation(false);
        toast.success("Localização obtida!");

        if (mapRef.current) {
          const mapboxgl = (await import("mapbox-gl")).default;
          if (markerRef.current) markerRef.current.remove();
          const marker = new mapboxgl.Marker({ color: "#22c55e" })
            .setLngLat([coords.lng, coords.lat])
            .addTo(mapRef.current);
          markerRef.current = marker;
          mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 15 });
        }
      },
      () => { toast.error("Não foi possível obter a localização"); setGettingLocation(false); }
    );
  };

  const filteredSuppliers = suppliers.filter((s) => s.type === originDestType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationType) { toast.error("Selecione o tipo de operação"); return; }
    if (!selectedVehicleId) { toast.error("Selecione um veículo"); return; }
    if (!originDestType || !originDestSupplierId) {
      toast.error(operationType === "entry" ? "Informe a origem da mercadoria" : "Informe o destino da mercadoria");
      return;
    }
    if (cargos.some((c) => !c.stock_product_id)) { toast.error("Selecione o produto do estoque para todas as cargas"); return; }
    if (!photoFile) { toast.error("A foto da carga é obrigatória"); return; }

    setLoading(true);

    const ext = photoFile.name.split(".").pop();
    const path = `${user!.id}/records/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("uploads").upload(path, photoFile);
    if (uploadError) { toast.error("Erro ao enviar foto: " + uploadError.message); setLoading(false); return; }
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    const photoUrl = urlData.publicUrl;

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);

    const brasiliaDate = new Date(form.recordDate + ":00");
    brasiliaDate.setHours(brasiliaDate.getHours() + 3);

    const { data: record, error: recordError } = await supabase
      .from("material_records")
      .insert({
        user_id: user!.id,
        company_id: profile!.company_id,
        operation_type: operationType,
        record_date: brasiliaDate.toISOString(),
        vehicle_plate: vehicle?.plate || "",
        vehicle_brand: vehicle?.brand || null,
        vehicle_model: vehicle?.model || null,
        vehicle_color: vehicle?.color || null,
        vehicle_id: selectedVehicleId,
        origin_type: operationType === "entry" ? originDestType : null,
        origin_supplier_id: operationType === "entry" ? originDestSupplierId : null,
        destination_type: operationType === "exit" ? originDestType : null,
        destination_supplier_id: operationType === "exit" ? originDestSupplierId : null,
        notes: form.notes || null,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (recordError) { toast.error("Erro ao criar registro: " + recordError.message); setLoading(false); return; }

    const { error: cargoError } = await supabase
      .from("record_cargos")
      .insert(cargos.map((c) => ({
        record_id: record.id, description: c.description, quantity: c.quantity, unit: c.unit,
        stock_product_id: c.stock_product_id || null,
      })));

    setLoading(false);
    if (cargoError) toast.error("Registro criado mas erro nas cargas: " + cargoError.message);
    else toast.success("Registro criado com sucesso!");
    navigate("/records");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/records" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar aos registros
        </Link>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">Novo Registro de Material</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Operation Type */}
              <div className="space-y-2">
                <Label>Tipo de Operação *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { setOperationType("entry"); setOriginDestType(""); setOriginDestSupplierId(""); }}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${operationType === "entry" ? "border-success bg-success/10 text-success" : "border-border hover:border-muted-foreground"}`}>
                    <div className="text-lg font-semibold">↓ Entrada</div>
                    <div className="text-xs opacity-75">Material chegando</div>
                  </button>
                  <button type="button" onClick={() => { setOperationType("exit"); setOriginDestType(""); setOriginDestSupplierId(""); }}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${operationType === "exit" ? "border-warning bg-warning/10 text-warning" : "border-border hover:border-muted-foreground"}`}>
                    <div className="text-lg font-semibold">↑ Saída</div>
                    <div className="text-xs opacity-75">Material saindo</div>
                  </button>
                </div>
              </div>

              {/* Origin / Destination */}
              {operationType && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                  <Label className="text-base font-semibold">
                    {operationType === "entry" ? "De onde está chegando? *" : "Para onde está indo? *"}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setOriginDestType("external"); setOriginDestSupplierId(""); }}
                      className={`p-3 rounded-lg border-2 text-center transition-all text-sm ${originDestType === "external" ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-muted-foreground"}`}>
                      Externo
                    </button>
                    <button type="button" onClick={() => { setOriginDestType("internal"); setOriginDestSupplierId(""); }}
                      className={`p-3 rounded-lg border-2 text-center transition-all text-sm ${originDestType === "internal" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground"}`}>
                      Interno
                    </button>
                  </div>
                  {originDestType && (
                    <Select value={originDestSupplierId} onValueChange={setOriginDestSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                      <SelectContent>
                        {filteredSuppliers.length === 0 ? (
                          <SelectItem value="_none" disabled>Nenhum local cadastrado</SelectItem>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Date (Brasília) */}
              <div className="space-y-2">
                <Label>Data e Hora (Horário de Brasília) *</Label>
                <Input type="datetime-local" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} required />
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Veículo *</Label>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado pelo gerenciador.</p>
                ) : (
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o veículo..." /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} — {[v.brand, v.model, v.color].filter(Boolean).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Photo - MANDATORY */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Foto da Carga *</Label>
                <label className="cursor-pointer block">
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${photoPreview ? "border-success" : "border-border hover:border-primary"}`}>
                    {photoPreview ? (
                      <div className="space-y-2">
                        <img src={photoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                        <p className="text-sm text-success font-medium">Foto selecionada ✓</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-10 h-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Clique para tirar ou selecionar uma foto</p>
                        <p className="text-xs text-destructive">Obrigatório</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>

              {/* Cargos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Cargas *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCargo}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Carga
                  </Button>
                </div>
                {cargos.map((cargo, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/50 border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Carga {i + 1}</span>
                      {cargos.length > 1 && (
                        <button type="button" onClick={() => removeCargo(i)}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>

                    {/* Stock product selection - MANDATORY */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Selecionar do Estoque *</Label>
                      {stockProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado no estoque pelo gerenciador.</p>
                      ) : (
                        <Select value={cargo.stock_product_id} onValueChange={(v) => selectStockProduct(i, v)}>
                          <SelectTrigger><SelectValue placeholder="Escolher produto do estoque..." /></SelectTrigger>
                          <SelectContent>
                            {stockProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {cargo.stock_product_id && (
                      <p className="text-sm text-muted-foreground">Produto: <span className="font-medium text-foreground">{cargo.description}</span></p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Quantidade *</Label>
                        <Input type="number" min={0} step="0.01" value={cargo.quantity} onChange={(e) => {
                          const updated = [...cargos];
                          updated[i] = { ...updated[i], quantity: parseFloat(e.target.value) || 0 };
                          setCargos(updated);
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Unidade</Label>
                        <Input value={cargo.unit} readOnly className="bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geolocation with Mapbox */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Geolocalização</Label>
                <Button type="button" variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  {gettingLocation ? "Obtendo..." : location ? `📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Capturar Localização"}
                </Button>
                {mapboxToken && (
                  <div ref={mapContainerRef} className="w-full h-48 sm:h-64 rounded-lg overflow-hidden border mt-2" />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." rows={3} />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Registrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NewRecordPage;
