import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock } from "lucide-react";
import axios from "axios";

export function PredictionsChart({ activeBinId = "01" }: { activeBinId?: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    if (!activeBinId) return;
    
    const fetchData = async () => {
      try {
        const [histRes, predRes] = await Promise.all([
          axios.get(`/api/trashcans/${activeBinId}/history`),
          axios.get(`/api/trashcans/${activeBinId}/prediction`).catch(() => ({ data: null }))
        ]);
        
        const formatted = histRes.data.map((d: any) => {
          const date = new Date(d.time);
          return {
            timeStr: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
            distance: d.distance_cm
          };
        });
        setHistory(formatted);
        setPrediction(predRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const inv = setInterval(fetchData, 10000);
    return () => clearInterval(inv);
  }, [activeBinId]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Bin {activeBinId} Prediction</h3>
        </div>
      </div>
      
      {prediction && prediction.predicted_full_timestamp ? (
         <div className="mb-4 bg-indigo-50 text-indigo-900 p-3 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold">Predicted Empty (Full Threshold)</p>
              <p className="font-bold">{new Date(prediction.predicted_full_timestamp * 1000).toLocaleString()}</p>
            </div>
         </div>
      ) : (
         <div className="mb-4 bg-slate-50 p-3 rounded-xl flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">{prediction?.message || "Not filling up currently."}</p>
         </div>
      )}

      <div className="flex-1 w-full mt-2 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="timeStr" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
            <YAxis 
               axisLine={false} 
               tickLine={false} 
               tick={{ fill: '#64748b', fontSize: 12 }} 
               reversed={true} 
               domain={['dataMin - 10', 'dataMax + 10']} 
            />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="distance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDist)" name="Distance (cm)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
