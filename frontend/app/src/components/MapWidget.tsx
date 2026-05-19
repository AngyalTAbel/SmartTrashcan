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

export function MapWidget() {
  const [bins, setBins] = useState<any[]>([]);
  const [route, setRoute] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [binsRes, routeRes] = await Promise.all([
          axios.get('/api/trashcans'),
          axios.get('/api/routes/optimize').catch(() => ({ data: { route: [] } }))
        ]);
        setBins(binsRes.data);
        setRoute(routeRes.data.route || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const routePositions = route.map(r => [r.location_lat, r.location_lon]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[400px] relative z-0">
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <h3 className="text-lg font-semibold text-slate-900">Live Routing Map (Budapest)</h3>
      </div>
      
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 z-0">
        <MapContainer center={[47.498, 19.04]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {bins.map(bin => {
             const isCritical = bin.current_distance && bin.current_distance <= (bin.full_threshold_cm + 10);
             return (
               <Marker 
                 key={bin.id} 
                 position={[bin.location_lat, bin.location_lon]}
                 icon={isCritical ? redIcon : new L.Icon.Default()}
               >
                 <Popup>
                   <strong>{bin.name}</strong> ({bin.id})<br/>
                   Distance: {bin.current_distance ? `${bin.current_distance.toFixed(1)} cm` : 'Offline'}
                 </Popup>
               </Marker>
             )
          })}

          {routePositions.length > 0 && (
            <Polyline positions={routePositions as any} color="#4f46e5" weight={5} dashArray="10, 10" />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
