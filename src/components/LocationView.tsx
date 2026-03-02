import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";

interface LocationViewProps {
  latitude: number;
  longitude: number;
}

const LocationView = ({ latitude, longitude }: LocationViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // Use any to avoid type issues with dynamic import
  const [token, setToken] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error) throw error;
        if (data?.token) setToken(data.token);
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
        // Fallback or handle error
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    // Reverse geocoding to get address
    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=address`
        );
        const data = await response.json();
        if (isMounted) {
          if (data.features && data.features.length > 0) {
            setAddress(data.features[0].place_name);
          } else {
            setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching address:", err);
        if (isMounted) {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLoading(false);
        }
      }
    };

    fetchAddress();

    // Initialize map
    const initMap = async () => {
      if (mapContainer.current && !map.current) {
        try {
          const mapboxgl = (await import("mapbox-gl")).default;
          await import("mapbox-gl/dist/mapbox-gl.css");

          mapboxgl.accessToken = token;
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [longitude, latitude],
            zoom: 15,
            interactive: false, // Static-like view
            attributionControl: false,
          });

          new mapboxgl.Marker({ color: "#10B981" }) // Emerald-500
            .setLngLat([longitude, latitude])
            .addTo(map.current);
        } catch (error) {
          console.error("Error initializing map:", error);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      map.current?.remove();
      map.current = null;
    };
  }, [token, latitude, longitude]);

  if (!token) {
    return <div className="h-40 bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span className="leading-relaxed">{loading ? "Identificando endereço..." : address}</span>
      </div>
      <div 
        ref={mapContainer} 
        className="w-full h-56 rounded-lg border shadow-sm overflow-hidden relative"
      >
        {/* Overlay to prevent interaction if desired, though interactive: false handles most */}
        <div className="absolute inset-0 pointer-events-none z-10 rounded-lg shadow-inner" />
      </div>
    </div>
  );
};

export default LocationView;
