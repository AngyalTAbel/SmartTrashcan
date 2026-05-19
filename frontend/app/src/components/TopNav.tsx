import React from 'react';
import { Plus } from 'lucide-react';

export function TopNav({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer">
        <img src="/logo.png" alt="Büdipest Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
        <span className="text-xl font-extrabold text-slate-800 tracking-tight">
          Büdipest
        </span>
      </div>
      <div>
        <button 
          onClick={onRegisterClick} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Smart Bin
        </button>
      </div>
    </nav>
  );
}
