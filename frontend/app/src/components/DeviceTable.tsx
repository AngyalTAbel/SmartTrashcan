import { cn } from "../utils";

const DEVICES = [
  { id: "CAM7845", name: "Sony Camera", zone: "zone A", category: "Camera", condition: "Excellent", connectivity: "High", uptime: "5 days 2 hrs", status: "Online" },
  { id: "LIGS21452", name: "Street light", zone: "zone A", category: "Light", condition: "Moderate", connectivity: "Medium", uptime: "46 days 17 hrs", status: "Online" },
  { id: "LIGS21417", name: "Street light", zone: "zone B", category: "Light", condition: "Moderate", connectivity: "Low", uptime: "74 days 5 hrs", status: "Offline" },
  { id: "SEN78641", name: "Temp. Sensor", zone: "zone F", category: "Sensor", condition: "Low", connectivity: "None", uptime: "0hrs", status: "Offline" },
  { id: "TRA51248", name: "Traffic light", zone: "zone D", category: "Traffic light", condition: "Excellent", connectivity: "High", uptime: "20 days 17 hrs", status: "Online" },
];

export function DeviceTable() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">All Devices</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by name, id" 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Add New
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-3 text-sm font-medium text-slate-500">Devices</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Zone</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Category</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Condition</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Connectivity</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Up-time</th>
              <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {DEVICES.map((device) => (
              <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4">
                  <div className="font-medium text-slate-900">{device.name}</div>
                  <div className="text-xs text-slate-500">{device.id}</div>
                </td>
                <td className="py-4 text-sm text-slate-600">{device.zone}</td>
                <td className="py-4 text-sm text-slate-600">{device.category}</td>
                <td className="py-4 text-sm">
                  <span className={cn(
                    "font-medium",
                    device.condition === "Excellent" && "text-emerald-600",
                    device.condition === "Moderate" && "text-amber-600",
                    device.condition === "Low" && "text-rose-600"
                  )}>
                    {device.condition}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-4 rounded-full", device.connectivity !== "None" ? "bg-emerald-500" : "bg-slate-200")}></div>
                    <div className={cn("w-1.5 h-5 rounded-full", (device.connectivity === "Medium" || device.connectivity === "High") ? "bg-emerald-500" : "bg-slate-200")}></div>
                    <div className={cn("w-1.5 h-6 rounded-full", device.connectivity === "High" ? "bg-emerald-500" : "bg-slate-200")}></div>
                  </div>
                </td>
                <td className="py-4 text-sm text-slate-600">{device.uptime}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", device.status === "Online" ? "bg-emerald-500" : "bg-rose-500")}></span>
                    <span className="text-sm font-medium text-slate-700">{device.status}</span>
                    <svg className="w-4 h-4 text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
