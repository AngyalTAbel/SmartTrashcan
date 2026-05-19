import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Factory } from "lucide-react";
import axios from "axios";
import { cn } from "../utils";

export function OverviewWidget() {
  const [stats, setStats] = useState({ total: 0, critical: 0, healthy: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/trashcans');
        const bins = res.data;
        let critical = 0;
        let healthy = 0;
        bins.forEach((b: any) => {
           if (b.current_distance && b.current_distance <= b.full_threshold_cm + 10) critical++;
           else if (b.current_distance) healthy++;
        });
        setStats({ total: bins.length, critical, healthy });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-50 p-2.5 rounded-xl">
          <Factory className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">System Overview</h3>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
          <span className="text-slate-600 font-medium">Total Tracked Bins</span>
          <span className="text-xl font-bold text-slate-900">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-700 rounded-xl">
          <span className="font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Healthy</span>
          <span className="text-xl font-bold">{stats.healthy}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-rose-50 text-rose-700 rounded-xl">
          <span className="font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Critical (Needs Pickup)</span>
          <span className="text-xl font-bold">{stats.critical}</span>
        </div>
      </div>
    </div>
  );
}

export function MetricWidget({ title, value, subtitle, trend, trendGood, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-slate-50 p-2.5 rounded-xl">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        {trend && (
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg", trendGood ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
        </div>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/trashcans');
        const critical = res.data.filter((b: any) => b.current_distance && b.current_distance <= b.full_threshold_cm + 10);
        setAlerts(critical);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlerts();
    const inv = setInterval(fetchAlerts, 10000);
    return () => clearInterval(inv);
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Live Priority Alerts</h3>
        </div>
        <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">{alerts.length} Warnings</span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-slate-500 text-sm italic text-center mt-10">No critical alerts right now. Routing clear.</div>
        ) : (
          alerts.map((alert: any) => (
            <div key={alert.id} className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-3 hover:bg-rose-100 transition-colors cursor-pointer group">
              <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-rose-500" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-rose-900 transition-colors">{alert.name} ({alert.id})</p>
                <p className="text-xs text-slate-600 mt-1">Status: Critically Full. Distance: {alert.current_distance?.toFixed(1)}cm (Limit: {alert.full_threshold_cm}cm).</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
