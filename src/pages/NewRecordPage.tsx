import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Cargo {
  description: string;
  quantity: number;
  unit: string;
  stock_product_id: string;
}

interface StockProduct { id: string; name: string; unit: string; }
interface Vehicle { id: string; plate: string; brand: string | null; model: string | null; color: string | null; }
interface Supplier { id: string; name: string; type: string; }

const getLocalDatetime = () => {
  const now = new Date();
  // Return local datetime in ISO format without timezone offset (for datetime-local input)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Component to update map view when location changes
const MapUpdater = ({ center }: { center: { lat: number; lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 15);
    }
  }, [center, map]);
  return null;
};

const NewRecordPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<string>("");
  const [form, setForm] = useState({ recordDate: getLocalDatetime(), notes: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  
  // New State for explicit Origin/Destination
  const [originType, setOriginType] = useState<string>(""); // "internal" | "external"
  const [originId, setOriginId] = useState<string>("");
  const [destType, setDestType] = useState<string>(""); // "internal" | "external"
  const [destId, setDestId] = useState<string>("");

  const [cargos, setCargos] = useState<Cargo[]>([{ description: "", quantity: 1, unit: "kg", stock_product_id: "" }]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token on mount
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/get-mapbox-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
        });
        
        console.log("Mapbox token response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Mapbox token error response:", errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        if (data?.token) setMapboxToken(data.token);
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
      }
    };
    fetchMapboxToken();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [stockRes, vehicleRes, supplierRes] = await Promise.all([
        supabase.from("stock_products").select("id, name, unit").order("name"),
        supabase.from("vehicles").select("*").order("plate"),
        supabase.from("suppliers").select("*").order("name"),
      ]);
      setStockProducts((stockRes.data as StockProduct[]) || []);
      setVehicles((vehicleRes.data as Vehicle[]) || []);
      setSuppliers((supplierRes.data as Supplier[]) || []);
    };
    fetchData();
  }, []);

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
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      setGettingLocation(false);
      return;
    }

    const getPosition = (opts: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });
    };

    const processPosition = async (pos: GeolocationPosition) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(coords);
      
      // Verificar se tem token do Mapbox
      let token = mapboxToken;
      if (!token) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          const response = await fetch(`${supabaseUrl}/functions/v1/get-mapbox-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": anonKey,
              "Authorization": `Bearer ${anonKey}`,
            },
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data = await response.json();
          if (data?.token) {
            token = data.token;
            setMapboxToken(data.token);
          }
        } catch (e) {
          console.error('Error fetching Mapbox token:', e);
        }
      }
      
      // Se não tem token, usar coordenadas como fallback
      if (!token) {
        setAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        toast.success("Localização obtida (sem token Mapbox)!");
        setGettingLocation(false);
        return;
      }
      
      try {
        // Mapbox Reverse Geocoding API - formato: longitude,latitude
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${token}&language=pt&types=address,poi,neighborhood,locality,place&limit=1`
        );
        
        if (!response.ok) {
          throw new Error(`Mapbox API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Mapbox response:", data);
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const placeName = feature.place_name;
          
          // Limpar o nome do lugar: remove país e código postal quando possível
          let cleanAddress = placeName;
          
          // Remover "Brazil" ou código postal no final
          const addressParts = placeName.split(',').map(p => p.trim());
          const filteredParts = addressParts.filter(part => {
            const lower = part.toLowerCase();
            return !lower.includes('brazil') && 
                   !lower.includes('brasil') && 
                   !/^\d{5}-?\d{3}$/.test(part); // Remove CEP se estiver sozinho
          });
          
          if (filteredParts.length > 0) {
            cleanAddress = filteredParts.join(', ');
          }
          
          setAddress(cleanAddress);
          toast.success("Localização e endereço obtidos!");
        } else {
          setAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
          toast.success("Localização obtida (sem detalhes de endereço)");
        }
      } catch (error) {
        console.error("Error fetching address from Mapbox:", error);
        // Fallback para coordenadas
        setAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        toast.success("Localização obtida (endereço indisponível)");
      }
      setGettingLocation(false);
    };

    try {
      // First attempt: High Accuracy with short timeout
      try {
        const pos = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        await processPosition(pos);
        return;
      } catch (err) {
        console.warn("High accuracy failed, retrying with low accuracy...", err);
      }

      // Second attempt: Low Accuracy with longer timeout
      const pos = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
      await processPosition(pos);
    } catch (finalErr: any) {
      console.error("Final geolocation error:", finalErr);
      toast.error("Não foi possível obter a localização. Verifique se o GPS está ativado e se o navegador tem permissão.");
      setGettingLocation(false);
    }
  };

  const handleOperationChange = (type: string) => {
    setOperationType(type);
    setOriginType(""); setOriginId("");
    setDestType(""); setDestId("");
    
    // Auto-set constraints based on logic
    if (type === "entry") {
      setDestType("internal"); // Entry always goes to Internal
    } else if (type === "exit") {
      setOriginType("internal"); // Exit always comes from Internal
    }
  };

  const filteredOriginSuppliers = suppliers.filter((s) => s.type === originType);
  const filteredDestSuppliers = suppliers.filter((s) => s.type === destType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationType) { toast.error("Selecione o tipo de operação"); return; }
    if (!selectedVehicleId) { toast.error("Selecione um veículo"); return; }
    
    // Validate Origin/Dest
    if (!originType || !originId) { toast.error("Informe a origem da mercadoria"); return; }
    if (!destType || !destId) { toast.error("Informe o destino da mercadoria"); return; }

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

    // Use device's local timezone - convert datetime-local to ISO string
    const localDate = new Date(form.recordDate);
    const recordDateIso = localDate.toISOString();

    const { data: record, error: recordError } = await supabase
      .from("material_records")
      .insert({
        user_id: user!.id,
        company_id: profile!.company_id,
        operation_type: operationType,
        record_date: recordDateIso,
        vehicle_plate: vehicle?.plate || "",
        vehicle_brand: vehicle?.brand || null,
        vehicle_model: vehicle?.model || null,
        vehicle_color: vehicle?.color || null,
        vehicle_id: selectedVehicleId,
        origin_type: originType,
        origin_supplier_id: originId,
        destination_type: destType,
        destination_supplier_id: destId,
        notes: form.notes || null,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        address: address || null, // Saving captured address text
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
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
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
                  <button type="button" onClick={() => handleOperationChange("entry")}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${operationType === "entry" ? "border-success bg-success/10 text-success" : "border-border hover:border-muted-foreground"}`}>
                    <div className="text-lg font-semibold">↓ Entrada</div>
                    <div className="text-xs opacity-75">Material chegando</div>
                  </button>
                  <button type="button" onClick={() => handleOperationChange("exit")}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${operationType === "exit" ? "border-warning bg-warning/10 text-warning" : "border-border hover:border-muted-foreground"}`}>
                    <div className="text-lg font-semibold">↑ Saída</div>
                    <div className="text-xs opacity-75">Material saindo</div>
                  </button>
                </div>
              </div>

              {/* Origin / Destination Logic */}
              {operationType && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* ORIGIN */}
                  <div className="flex flex-col h-full space-y-3 p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-base font-semibold">De onde está vindo? (Origem) *</Label>
                    
                    {/* Origin Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" 
                        onClick={() => { setOriginType("external"); setOriginId(""); }}
                        disabled={operationType === "exit"} // Exit always comes from Internal
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${originType === "external" ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:border-muted-foreground"} ${operationType === "exit" ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                        Externo
                      </button>
                      <button type="button" 
                        onClick={() => { setOriginType("internal"); setOriginId(""); }}
                        disabled={operationType === "exit"} // Pre-selected for Exit
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${originType === "internal" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-muted-foreground"}`}>
                        Interno
                      </button>
                    </div>

                    {/* Origin Supplier Selection */}
                    {originType && (
                      <Select value={originId} onValueChange={setOriginId}>
                        <SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                        <SelectContent>
                          {filteredOriginSuppliers.length === 0 ? (
                            <SelectItem value="_none" disabled>Nenhum local disponível</SelectItem>
                          ) : (
                            filteredOriginSuppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}

                    {/* GEOLOCATION FOR EXIT (Origin is where I am) */}
                    {operationType === "exit" && (
                      <div className="pt-2 border-t mt-auto">
                         <Label className="text-sm font-semibold mb-2 block mt-2">Confirmar Local de Saída (Sua Localização)</Label>
                         <Button type="button" variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full h-auto min-h-[44px] py-3 px-4 flex flex-col items-center gap-2 whitespace-normal bg-background">
                          <div className="flex items-center gap-2 shrink-0">
                            <MapPin className="w-4 h-4" />
                            <span>{gettingLocation ? "Obtendo localização..." : location ? "Atualizar Localização" : "Capturar Localização"}</span>
                          </div>
                          {location && (
                            <span className="text-xs text-muted-foreground font-normal text-center break-words w-full">
                              {address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                            </span>
                          )}
                        </Button>
                        {location && mapboxToken && (
                          <div className="w-full h-32 rounded-lg overflow-hidden border mt-2 z-0 relative">
                            <MapContainer 
                              center={[location.lat, location.lng]} 
                              zoom={15} 
                              style={{ width: "100%", height: "100%" }}
                              scrollWheelZoom={false}
                            >
                              <TileLayer
                                attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`}
                              />
                              <Marker position={[location.lat, location.lng]}>
                                <Popup>Local de Saída</Popup>
                              </Marker>
                              <MapUpdater center={location} />
                            </MapContainer>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DESTINATION */}
                  <div className="flex flex-col h-full space-y-3 p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-base font-semibold">Para onde vai? (Destino) *</Label>
                    
                    {/* Destination Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" 
                        onClick={() => { setDestType("external"); setDestId(""); }}
                        disabled={operationType === "entry"} // Entry always goes to Internal
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${destType === "external" ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:border-muted-foreground"} ${operationType === "entry" ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                        Externo
                      </button>
                      <button type="button" 
                        onClick={() => { setDestType("internal"); setDestId(""); }}
                        disabled={operationType === "entry"} // Pre-selected for Entry
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${destType === "internal" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-muted-foreground"}`}>
                        Interno
                      </button>
                    </div>

                    {/* Destination Supplier Selection */}
                    {destType && (
                      <Select value={destId} onValueChange={setDestId}>
                        <SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                        <SelectContent>
                          {filteredDestSuppliers.length === 0 ? (
                            <SelectItem value="_none" disabled>Nenhum local disponível</SelectItem>
                          ) : (
                            filteredDestSuppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}

                    {/* GEOLOCATION FOR ENTRY (Destination is where I am) */}
                    {operationType === "entry" && (
                      <div className="pt-2 border-t mt-auto">
                         <Label className="text-sm font-semibold mb-2 block mt-2">Confirmar Local de Entrada (Sua Localização)</Label>
                         <Button type="button" variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full h-auto min-h-[44px] py-3 px-4 flex flex-col items-center gap-2 whitespace-normal bg-background">
                          <div className="flex items-center gap-2 shrink-0">
                            <MapPin className="w-4 h-4" />
                            <span>{gettingLocation ? "Obtendo localização..." : location ? "Atualizar Localização" : "Capturar Localização"}</span>
                          </div>
                          {location && (
                            <span className="text-xs text-muted-foreground font-normal text-center break-words w-full">
                              {address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                            </span>
                          )}
                        </Button>
                        {location && mapboxToken && (
                          <div className="w-full h-32 rounded-lg overflow-hidden border mt-2 z-0 relative">
                            <MapContainer 
                              center={[location.lat, location.lng]} 
                              zoom={15} 
                              style={{ width: "100%", height: "100%" }}
                              scrollWheelZoom={false}
                            >
                              <TileLayer
                                attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`}
                              />
                              <Marker position={[location.lat, location.lng]}>
                                <Popup>Local de Entrada</Popup>
                              </Marker>
                              <MapUpdater center={location} />
                            </MapContainer>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date (Device Local Time) */}
              <div className="space-y-2">
                <Label>Data e Hora (Horário local do dispositivo)</Label>
                <Input type="datetime-local" value={form.recordDate} readOnly className="bg-muted cursor-not-allowed" required />
                <p className="text-xs text-muted-foreground">Horário capturado automaticamente do dispositivo</p>
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

              {/* Geolocation moved to Origin/Destination sections */}

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
