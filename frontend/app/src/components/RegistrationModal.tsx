import React, { useState } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';

export function RegistrationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    id: '', name: '', location_lat: 47.4979, location_lon: 19.0402, max_height_cm: 150, full_threshold_cm: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/trashcans', formData);
      onClose();
      // Form automatically re-renders into UI from 10s fetch loop mapping.
      setFormData({ id: '', name: '', location_lat: 47.4979, location_lon: 19.0402, max_height_cm: 150, full_threshold_cm: 5 });
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.detail || "Registration failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Register IoT Bin</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Device ID (MQTT)</label>
               <input required className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-700" value={formData.id} onChange={e=>setFormData({...formData, id: e.target.value})} placeholder="e.g. 05" />
            </div>
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Common Name</label>
               <input required className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-700" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="e.g. Heroes Sq" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Latitude</label>
               <input required type="number" step="any" className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-700" value={formData.location_lat} onChange={e=>setFormData({...formData, location_lat: parseFloat(e.target.value)})} />
            </div>
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Longitude</label>
               <input required type="number" step="any" className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-700" value={formData.location_lon} onChange={e=>setFormData({...formData, location_lon: parseFloat(e.target.value)})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Max Depth (cm)</label>
               <input required type="number" className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all font-medium text-slate-700" value={formData.max_height_cm} onChange={e=>setFormData({...formData, max_height_cm: parseFloat(e.target.value)})} />
            </div>
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Full At (cm)</label>
               <input required type="number" className="w-full mt-1.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all font-medium text-slate-700" value={formData.full_threshold_cm} onChange={e=>setFormData({...formData, full_threshold_cm: parseFloat(e.target.value)})} />
            </div>
          </div>
          <button disabled={isSubmitting} type="submit" className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-semibold mt-4 shadow-md hover:bg-indigo-600 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {isSubmitting ? "Registering..." : "Add to Network"}
          </button>
        </form>
      </div>
    </div>
  );
}
