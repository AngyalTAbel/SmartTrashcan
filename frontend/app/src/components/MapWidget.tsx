import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Necessary icon fix for Webpack/Vite issues with React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const houseIcon = new L.Icon({
  iconUrl: '/depot_icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  shadowSize: [41, 41]
});

export function MapWidget() {
  const [bins, setBins] = useState<any[]>([]);
  const [routePath, setRoutePath] = useState<any[]>([]);
  const [routeSummary, setRouteSummary] = useState<any>(null);
  const [depot, setDepot] = useState<any>(null);
  const [lastCriticalIds, setLastCriticalIds] = useState<string>("init"); // Force first fetch

  useEffect(() => {
    const fetchData = async () => {
      try {
        const binsRes = await axios.get('/api/trashcans');
        const currentBins = binsRes.data;
        setBins(currentBins);

        const criticalBins = currentBins.filter((b: any) =>
          (b.current_distance !== null && b.current_distance !== undefined) && 
          b.current_distance <= (b.full_threshold_cm + 10)
        );

        const criticalIds = criticalBins.map((b: any) => b.id).sort().join(',');

        if (criticalIds !== lastCriticalIds) {
          setLastCriticalIds(criticalIds);

          if (criticalBins.length > 0) {
            const routeRes = await axios.get('/api/routes/optimize');
            if (routeRes.data.depot) {
              setDepot(routeRes.data.depot);
            }
            if (routeRes.data.status === "success") {
              setRoutePath(routeRes.data.polyline || []);
              setRouteSummary(routeRes.data.summary);
            }
          } else {
            // Ha nincs kuka, akkor is lekérjük a depót egyszer, ha még nincs
            if (!depot) {
              const routeRes = await axios.get('/api/routes/optimize');
              if (routeRes.data.depot) setDepot(routeRes.data.depot);
            }
            setRoutePath([]);
            setRouteSummary(null);
          }
        }
      } catch (err) {
        console.error("Map data fetch error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [lastCriticalIds, depot]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[400px] relative z-0">
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Live Routing Map (Budapest)</h3>
          {routeSummary ? (
            <p className="text-sm text-slate-500">
              Optimal Route: {routeSummary.total_bins} bins | {routeSummary.distance_km} km | {routeSummary.duration_mins} mins
            </p>
          ) : (
            <p className="text-sm text-slate-500">System Healthy - No collection needed</p>
          )}
        </div>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 z-0">
        <MapContainer center={[47.50, 19.05]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {depot && (
            <Marker position={[depot.lat, depot.lng]} icon={houseIcon}>
              <Popup>
                <strong>Central Collection Depot</strong>

              </Popup>
            </Marker>
          )}

          {bins.map(bin => {
            const isCritical = bin.current_distance && bin.current_distance <= (bin.full_threshold_cm + 10);
            return (
              <Marker
                key={bin.id}
                position={[bin.location_lat, bin.location_lon]}
                icon={isCritical ? redIcon : new L.Icon.Default()}
              >
                <Popup>
                  <strong>{bin.name}</strong> ({bin.id})<br />
                  Current: {bin.current_distance ? `${bin.current_distance.toFixed(1)} cm` : 'Offline'}<br />
                  Limit: {bin.full_threshold_cm} cm
                </Popup>
              </Marker>
            )
          })}

          {routePath.length > 0 && (
            <Polyline positions={routePath} color="#4f46e5" weight={5} opacity={0.7} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
