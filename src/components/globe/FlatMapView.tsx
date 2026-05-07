import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

interface FlatMapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description?: string | null;
  category: string;
}

interface FlatMapViewProps {
  pins: FlatMapPin[];
  onPinClick?: (pin: FlatMapPin) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  visited: "#26d9a0",
  memory: "#8b5cf6",
  checkin: "#3b82f6",
  wishlist: "#f97316",
  tip: "#eab308",
};

function MapBounds({ pins }: { pins: FlatMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    }
  }, [pins, map]);
  return null;
}

export default function FlatMapView({ pins, onPinClick }: FlatMapViewProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="h-full w-full z-0"
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapBounds pins={pins} />
      {pins.map((pin) => (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={7}
          pathOptions={{
            fillColor: CATEGORY_COLORS[pin.category] || "#26d9a0",
            fillOpacity: 0.85,
            color: CATEGORY_COLORS[pin.category] || "#26d9a0",
            weight: 2,
            opacity: 0.4,
          }}
          eventHandlers={{ click: () => onPinClick?.(pin) }}
        >
          <Popup>
            <div className="text-xs p-1 min-w-[120px]">
              <p className="font-semibold text-foreground">{pin.label}</p>
              {pin.description && (
                <p className="text-muted-foreground mt-0.5">{pin.description}</p>
              )}
              <span
                className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                style={{ background: CATEGORY_COLORS[pin.category] + "22", color: CATEGORY_COLORS[pin.category] }}
              >
                {pin.category}
              </span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
