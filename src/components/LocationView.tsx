import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationViewProps {
  latitude: number;
  longitude: number;
}

const LocationView = ({ latitude, longitude }: LocationViewProps) => {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
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
        
        if (response.ok) {
          const data = await response.json();
          if (data?.token) setMapboxToken(data.token);
        }
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Reverse geocoding using Mapbox
    const fetchAddress = async () => {
      if (!mapboxToken) {
        // Fallback: mostrar coordenadas enquanto token não carrega
        if (isMounted) {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&language=pt&types=address,poi,neighborhood,locality,place&limit=1`
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (isMounted) {
          if (data.features && data.features.length > 0) {
            const placeName = data.features[0].place_name;
            // Limpar: remover Brasil/CEP
            const parts = placeName.split(',').map((p: string) => p.trim());
            const filtered = parts.filter((part: string) => {
              const lower = part.toLowerCase();
              return !lower.includes('brazil') && !lower.includes('brasil') && !/^\d{5}-?\d{3}$/.test(part);
            });
            setAddress(filtered.join(', ') || placeName);
          } else {
            setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching address from Mapbox:", err);
        if (isMounted) {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLoading(false);
        }
      }
    };

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, mapboxToken]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span className="leading-relaxed">{loading ? "Identificando endereço..." : address}</span>
      </div>
      <div className="w-full h-56 rounded-lg border shadow-sm overflow-hidden relative z-0">
        {mapboxToken ? (
          <MapContainer 
            center={[latitude, longitude]} 
            zoom={15} 
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
          >
            <TileLayer
              attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`}
            />
            <Marker position={[latitude, longitude]}>
              <Popup>{address || "Localização"}</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
            Carregando mapa...
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationView;
