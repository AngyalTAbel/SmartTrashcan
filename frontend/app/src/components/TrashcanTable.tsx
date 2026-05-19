import React, { useEffect, useState } from "react";
import { cn } from "../utils";
import axios from "axios";
import { Trash2, Edit3 } from "lucide-react";

export function TrashcanTable({ onBinSelect, onEditBin }: { onBinSelect: (id: string) => void, onEditBin: (bin: any) => void }) {
  const [bins, setBins] = useState<any[]>([]);

  const fetchBins = async () => {
    try {
      const res = await axios.get('/api/trashcans');
      setBins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBins();
    const interval = setInterval(fetchBins, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to completely delete Bin ${id} and all its sensor history?`)) {
      try {
        await axios.delete(`/api/trashcans/${id}`);
        fetchBins();
      } catch (err: any) {
        alert("Delete failed: " + err.response?.data?.detail);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, bin: any) => {
    e.stopPropagation();
    onEditBin(bin);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Live Bin Directory</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-3 text-sm font-medium text-slate-500">Bin ID & Name</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Fill Level</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Distance</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Threshold</th>
              <th className="pb-3 text-sm font-medium text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bins.map((bin) => {
              const depth = bin.max_height_cm - bin.full_threshold_cm;
              let fillPercent = 0;
              if (bin.current_distance) {
                 fillPercent = Math.max(0, Math.min(100, ((bin.max_height_cm - bin.current_distance) / depth) * 100));
              }
              const isCritical = bin.current_distance && bin.current_distance <= (bin.full_threshold_cm + 10);

              return (
              <tr key={bin.id} onClick={() => onBinSelect(bin.id)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                <td className="py-4">
                  <div className="font-medium text-slate-900">{bin.id}</div>
                  <div className="text-xs text-slate-500">{bin.name}</div>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", isCritical ? "bg-rose-500" : (fillPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"))} 
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{Math.round(fillPercent)}%</span>
                  </div>
                </td>
                <td className="py-4 text-sm font-medium text-slate-700">
                  {bin.current_distance ? `${bin.current_distance.toFixed(1)} cm` : 'Offline'}
                </td>
                <td className="py-4 text-sm text-slate-500">{bin.full_threshold_cm} cm</td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleEdit(e, bin)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit Bin"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={(e) => handleDelete(e, bin.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Delete Bin"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
