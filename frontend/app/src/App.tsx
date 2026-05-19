/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { TopNav } from "./components/TopNav";
import { OverviewWidget, MetricWidget, AlertsWidget } from "./components/DashboardWidgets";
import { MapWidget } from "./components/MapWidget";
import { TrashcanTable } from "./components/TrashcanTable";
import { PredictionsChart } from "./components/PredictionsChart";
import { RegistrationModal } from "./components/RegistrationModal";
import { EditBinModal } from "./components/EditBinModal";
import { TrendingDown, Truck } from "lucide-react";

export default function App() {
  const [activeBinId, setActiveBinId] = useState("01");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<any>(null);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <TopNav onRegisterClick={() => setIsModalOpen(true)} />
      
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Waste Management</h1>
            <p className="text-slate-500 text-sm mt-1">Monitor bin fill levels, optimize routes, and manage fleet</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-900">12</span>
              <span className="text-sm font-medium text-emerald-500">Active</span>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <span className="text-xs text-slate-400">Trucks</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <OverviewWidget />
            <div className="grid grid-cols-1 gap-6 flex-1">
              <MetricWidget 
                title="System Status" 
                value="Online" 
                subtitle="Sensors actively reporting" 
                trend="Real-time" 
                trendGood 
                icon={Truck} 
              />
              <MetricWidget 
                title="Polling Interval" 
                value="10s" 
                subtitle="Telegraf ingest rate" 
                trend="Optimal" 
                trendGood={true}
                icon={TrendingDown} 
              />
            </div>
          </div>

          {/* Middle Column */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <MapWidget />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <AlertsWidget />
          </div>

          {/* Bottom Row */}
          <div className="lg:col-span-8">
            <TrashcanTable onBinSelect={setActiveBinId} onEditBin={setEditingBin} />
          </div>
          <div className="lg:col-span-4">
            <PredictionsChart activeBinId={activeBinId} />
          </div>
          
        </div>
      </main>
      
      <RegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditBinModal isOpen={!!editingBin} onClose={() => setEditingBin(null)} binData={editingBin} />
    </div>
  );
}


