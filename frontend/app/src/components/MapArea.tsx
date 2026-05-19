import { X, TrendingUp, Clock, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "../utils";

// Mock Data Generation
const generateBins = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const fullness = Math.random() * 100;
    let status: "safe" | "warning" | "critical" = "safe";
    if (fullness > 80) status = "critical";
    else if (fullness > 50) status = "warning";

    return {
      id: `BIN-${1000 + i}`,
      x: 10 + Math.random() * 80, // percentage position
      y: 10 + Math.random() * 80,
      fullness: Math.round(fullness),
      status,
      distance_cm: Math.round(100 - fullness), // Assuming 100cm is empty
      lastUpdated: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      history: Array.from({ length: 24 }, (_, j) => ({
        time: `${j}:00`,
        level: Math.max(0, fullness - (24 - j) * (Math.random() * 2)), // simulate filling up
      })),
    };
  });
};

const BINS = generateBins(45);

export function MapArea() {
  const [selectedBin, setSelectedBin] = useState<typeof BINS[0] | null>(null);
  const [activeBins, setActiveBins] = useState(BINS);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBins((prev) =>
        prev.map((bin) => {
          // 10% chance to update a bin slightly
          if (Math.random() > 0.9) {
            const newFullness = Math.min(100, bin.fullness + Math.random() * 5);
            let newStatus: "safe" | "warning" | "critical" = "safe";
            if (newFullness > 80) newStatus = "critical";
            else if (newFullness > 50) newStatus = "warning";
            return { ...bin, fullness: Math.round(newFullness), status: newStatus };
          }
          return bin;
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[500px] lg:h-[600px] glass-panel rounded-2xl overflow-hidden border border-border-subtle flex">
      {/* Map Background (Stylized Grid/City) */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      {/* City Map SVG Placeholder - A stylized tech map */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" preserveAspectRatio="none">
        <path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" fill="none" stroke="var(--color-neon-blue)" strokeWidth="0.5" strokeDasharray="4 4" />
        <path d="M 30 10 L 30 90 M 50 10 L 50 90 M 70 10 L 70 90" stroke="var(--color-neon-blue)" strokeWidth="0.2" />
        <path d="M 10 30 L 90 30 M 10 50 L 90 50 M 10 70 L 90 70" stroke="var(--color-neon-blue)" strokeWidth="0.2" />
        {/* Abstract city blocks */}
        <rect x="15%" y="15%" width="20%" height="30%" fill="var(--color-neon-blue)" opacity="0.1" />
        <rect x="45%" y="25%" width="35%" height="15%" fill="var(--color-neon-blue)" opacity="0.1" />
        <rect x="25%" y="60%" width="40%" height="25%" fill="var(--color-neon-blue)" opacity="0.1" />
      </svg>

      {/* Data Points */}
      <div className="absolute inset-0">
        {activeBins.map((bin) => (
          <button
            key={bin.id}
            onClick={() => setSelectedBin(bin)}
            className={cn(
              "absolute w-4 h-4 -ml-2 -mt-2 rounded-full transition-all duration-300 hover:scale-150 z-10",
              bin.status === "safe" && "bg-neon-green glow-green",
              bin.status === "warning" && "bg-neon-orange glow-orange",
              bin.status === "critical" && "bg-neon-red glow-red animate-pulse",
              selectedBin?.id === bin.id && "ring-4 ring-white ring-opacity-50 scale-125"
            )}
            style={{ left: `${bin.x}%`, top: `${bin.y}%` }}
            title={`Bin ${bin.id} - ${bin.fullness}% full`}
          >
            {/* Inner dot for detail */}
            <span className="absolute inset-1 bg-white rounded-full opacity-50"></span>
          </button>
        ))}
      </div>

      {/* Map Overlay Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-20">
        <div className="glass-panel px-4 py-2 rounded-lg text-xs font-mono border border-border-subtle flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-green glow-green"></span> &lt;50%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-orange glow-orange"></span> 50-80%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-red glow-red animate-pulse"></span> &gt;80%</span>
        </div>
      </div>

      {/* Quick Info Side Panel */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-80 glass-panel border-l border-border-subtle transform transition-transform duration-500 ease-in-out z-30 flex flex-col",
          selectedBin ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedBin && (
          <>
            <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-dark/50">
              <h3 className="font-mono text-lg text-white font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-neon-blue" />
                {selectedBin.id}
              </h3>
              <button onClick={() => setSelectedBin(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-panel p-3 rounded-xl border border-border-subtle">
                  <p className="text-xs text-gray-400 font-mono mb-1">Current Fill</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedBin.status === "safe" && "text-neon-green text-glow-green",
                    selectedBin.status === "warning" && "text-neon-orange text-glow-orange",
                    selectedBin.status === "critical" && "text-neon-red text-glow-red"
                  )}>
                    {selectedBin.fullness}%
                  </p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-border-subtle">
                  <p className="text-xs text-gray-400 font-mono mb-1">Distance</p>
                  <p className="text-2xl font-bold text-white">{selectedBin.distance_cm}cm</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-mono text-gray-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> 24h History
                </p>
                <div className="h-32 w-full glass-panel rounded-xl p-2 border border-border-subtle">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedBin.history}>
                      <defs>
                        <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-neon-blue)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--color-neon-blue)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-bg-dark)", borderColor: "var(--color-neon-blue)", fontSize: '12px' }}
                        itemStyle={{ color: "var(--color-neon-blue)" }}
                      />
                      <Area type="monotone" dataKey="level" stroke="var(--color-neon-blue)" fillOpacity={1} fill="url(#colorFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3 font-mono text-sm text-gray-300">
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span>Last Updated</span>
                  <span className="text-white">{new Date(selectedBin.lastUpdated).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span>Battery Level</span>
                  <span className="text-neon-green">87%</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span>Signal Strength</span>
                  <span className="text-neon-blue">-65 dBm</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border-subtle bg-bg-dark/50">
              <button className="w-full py-3 rounded-xl bg-neon-blue/10 border border-neon-blue text-neon-blue font-mono font-bold hover:bg-neon-blue hover:text-bg-dark transition-all duration-300 flex items-center justify-center gap-2 glow-blue">
                <Clock className="w-5 h-5" />
                Predict Fill Time
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
