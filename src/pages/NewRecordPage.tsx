import { useState } from "react";
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
}

const NewRecordPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<string>("");
  const [form, setForm] = useState({
    recordDate: new Date().toISOString().slice(0, 16),
    vehicleBrand: "",
    vehicleModel: "",
    vehicleColor: "",
    vehiclePlate: "",
    notes: "",
  });
  const [cargos, setCargos] = useState<Cargo[]>([{ description: "", quantity: 1, unit: "kg" }]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const addCargo = () => setCargos([...cargos, { description: "", quantity: 1, unit: "kg" }]);

  const removeCargo = (i: number) => {
    if (cargos.length > 1) setCargos(cargos.filter((_, idx) => idx !== i));
  };

  const updateCargo = (i: number, key: keyof Cargo, value: string | number) => {
    const updated = [...cargos];
    (updated[i] as any)[key] = value;
    setCargos(updated);
  };

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
        toast.success("Localização obtida!");
      },
      () => {
        toast.error("Não foi possível obter a localização");
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operationType) {
      toast.error("Selecione o tipo de operação");
      return;
    }

    if (!form.vehiclePlate.trim()) {
      toast.error("Preencha a placa do veículo");
      return;
    }

    if (cargos.some((c) => !c.description.trim())) {
      toast.error("Preencha a descrição de todas as cargas");
      return;
    }

    setLoading(true);

    const { data: record, error: recordError } = await supabase
      .from("material_records")
      .insert({
        user_id: user!.id,
        company_id: profile!.company_id,
        operation_type: operationType,
        record_date: new Date(form.recordDate).toISOString(),
        vehicle_brand: form.vehicleBrand || null,
        vehicle_model: form.vehicleModel || null,
        vehicle_color: form.vehicleColor || null,
        vehicle_plate: form.vehiclePlate,
        notes: form.notes || null,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
      })
      .select()
      .single();

    if (recordError) {
      toast.error("Erro ao criar registro: " + recordError.message);
      setLoading(false);
      return;
    }

    // Insert cargos
    const { error: cargoError } = await supabase
      .from("record_cargos")
      .insert(
        cargos.map((c) => ({
          record_id: record.id,
          description: c.description,
          quantity: c.quantity,
          unit: c.unit,
        }))
      );

    setLoading(false);

    if (cargoError) {
      toast.error("Registro criado mas erro nas cargas: " + cargoError.message);
    } else {
      toast.success("Registro criado com sucesso!");
    }
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
                  <button
                    type="button"
                    onClick={() => setOperationType("entry")}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      operationType === "entry"
                        ? "border-success bg-success/10 text-success"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="text-lg font-semibold">↓ Entrada</div>
                    <div className="text-xs opacity-75">Material chegando</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationType("exit")}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      operationType === "exit"
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="text-lg font-semibold">↑ Saída</div>
                    <div className="text-xs opacity-75">Material saindo</div>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.recordDate}
                  onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                  required
                />
              </div>

              {/* Vehicle */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Dados do Transporte</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Placa *</Label>
                    <Input value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })} required placeholder="ABC-1234" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Marca</Label>
                    <Input value={form.vehicleBrand} onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })} placeholder="Mercedes-Benz" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Modelo</Label>
                    <Input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Atego 2426" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Cor</Label>
                    <Input value={form.vehicleColor} onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })} placeholder="Branco" />
                  </div>
                </div>
              </div>

              {/* Cargos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Cargas</Label>
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
                    <div className="space-y-2">
                      <Label className="text-sm">Descrição *</Label>
                      <Input value={cargo.description} onChange={(e) => updateCargo(i, "description", e.target.value)} placeholder="Areia lavada, cimento, etc." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Quantidade *</Label>
                        <Input type="number" min={0} step="0.01" value={cargo.quantity} onChange={(e) => updateCargo(i, "quantity", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Unidade *</Label>
                        <Select value={cargo.unit} onValueChange={(v) => updateCargo(i, "unit", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kg</SelectItem>
                            <SelectItem value="ton">Tonelada</SelectItem>
                            <SelectItem value="m3">m³</SelectItem>
                            <SelectItem value="unidade">Unidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geolocation */}
              <div className="space-y-2">
                <Label>Geolocalização</Label>
                <Button type="button" variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  {gettingLocation ? "Obtendo..." : location ? `📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Capturar Localização"}
                </Button>
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
