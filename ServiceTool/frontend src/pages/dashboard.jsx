import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Package,
  Activity,
  Shield,
  Zap,
  Layers,
  RefreshCw,
  ChevronRight,
  Calendar,
  CheckSquare,
  FileText,
  UserCheck
} from "lucide-react";
import useEscalationWorker from "../service/useEscalationWorker";

const API_URL = import.meta.env.VITE_API_URL;

// ── Shared UI Components ───────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, colorClass, borderClass, textClass }) {
  return (
    <div className={`bg-white border ${borderClass || 'border-slate-200'} rounded-[0.8vw] p-[1.2vw] shadow-sm flex items-center justify-between transition-all hover:shadow-md`}>
      <div className="flex-1 min-w-0">
        <p className="text-[0.75vw] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className={`text-[1.8vw] font-black leading-none mt-[0.4vw] ${textClass || 'text-slate-800'}`}>{value}</h3>
        {sub && <p className="text-[0.7vw] text-slate-400 mt-[0.3vw] truncate">{sub}</p>}
      </div>
      <div className={`w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center ${colorClass || 'bg-slate-100'}`}>
        <Icon className="w-[1.3vw] h-[1.3vw] text-current" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { timers, isWorkerReady } = useEscalationWorker();

  // Auth State
  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    } catch { return null; }
  }, []);

  const isAdminOrSup = loggedInUser?.role === "Admin" || loggedInUser?.role === "Supervisor";
  const isEngineer = loggedInUser?.role === "Support Engineer" || loggedInUser?.role === "Service Engineer";

  // Raw Database Data States
  const [calls, setCalls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchData = async () => {
    try {
      const callsRes = await axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] }));
      const materialsRes = await axios.get(`${API_URL}/service-material`).catch(() => ({ data: [] }));
      const customersRes = await axios.get(`${API_URL}/master/customers`).catch(() => ({ data: [] }));

      setCalls(callsRes.data);
      setMaterials(materialsRes.data);
      setCustomers(customersRes.data);
      setLastSync(new Date());
    } catch (e) {
      console.error("Failed to sync dashboard metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  // ── Metrics Aggregations ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const userId = loggedInUser?.userId || loggedInUser?.id;

    // --- Service Calls ---
    const totalCalls = calls.length;
    const callStatus = {
      Registered: calls.filter(c => c.status === "Registered").length,
      Assigned: calls.filter(c => c.status === "Assigned").length,
      Open: calls.filter(c => c.status === "Open").length,
      Pending: calls.filter(c => c.status === "Pending").length,
      Resolved: calls.filter(c => c.status === "Resolved").length,
      Critical: calls.filter(c => c.status === "Critical" || c.status === "Critical_Unresolved").length,
      Escalated: calls.filter(c => c.status === "Escalated").length,
    };

    // --- Service Materials ---
    let unclaimedMaterials = 0;
    let claimedMaterials = 0;
    let completedMaterials = 0; // Completed by employee but pending admin review
    let approvedMaterials = 0;  // Completed in finalStatus
    let deniedMaterials = 0;    // Admin Returned in finalStatus

    const pendingAdminReviews = [];
    const myClaimedProducts = [];

    materials.forEach(entry => {
      (entry.products || []).forEach(p => {
        const rawStatus = p.status || p.report?.status || "Open";
        const finalStatus = p.finalStatus || "Pending";

        if (!p.assignedTo) {
          unclaimedMaterials++;
        } else {
          claimedMaterials++;
          if (p.assignedTo === userId && rawStatus !== "Completed") {
            myClaimedProducts.push({ entry, product: p });
          }
        }

        if (rawStatus === "Completed" && finalStatus === "Pending") {
          completedMaterials++;
          pendingAdminReviews.push({ entry, product: p });
        }

        if (finalStatus === "Completed") {
          approvedMaterials++;
        } else if (finalStatus === "Admin Returned") {
          deniedMaterials++;
        }
      });
    });

    // --- Active Escalations & SLA ---
    // Count active calls that have active timer or are critical
    const criticalCalls = calls.filter(c => {
      if (c.status === "Resolved" || c.status === "Closed") return false;
      const hasActiveUnattended = (c.products || []).some(p => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended);
      if (!hasActiveUnattended) return false;
      const timer = timers.find(t => t.callId === c._id || t.callId === c.callId);
      return c.status === "Critical" || c.status === "Critical_Unresolved" || c.priority === "Critical" || timer?.isExpired;
    });

    const activeEscalated = calls.filter(c => c.status === "Escalated" && c.status !== "Resolved");

    // --- Engineer Queue ---
    const myCalls = calls.filter(c => {
      if (c.currentEngineerId === userId) return true;
      return c.products && c.products.some(p => p._assignedEngineerId === userId && !p._resolved);
    });

    const myPendingCalls = myCalls.filter(c => c.status !== "Resolved");

    return {
      totalCalls,
      callStatus,
      unclaimedMaterials,
      claimedMaterials,
      completedMaterials,
      approvedMaterials,
      deniedMaterials,
      pendingAdminReviews,
      criticalCalls,
      activeEscalated,
      myCalls,
      myPendingCalls,
      myClaimedProducts
    };
  }, [calls, materials, timers, loggedInUser]);

  // Greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center font-sans text-slate-600">
        <RefreshCw className="w-[3vw] h-[3vw] animate-spin text-indigo-650 mb-[1vw]" />
        <p className="text-[1vw] font-bold">Syncing dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto font-sans text-[0.85vw] max-h-[85vh] custom-scrollbar pb-[2vw] px-[0.5vw]">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-[1.5vw] mt-[0.5vw]">
        <div>
          <h1 className="text-[1.8vw] font-black text-slate-800 tracking-tight leading-tight">
            {getGreeting()}, <span className="text-indigo-650">{loggedInUser?.name || "Akira User"}</span>.
          </h1>
          <p className="text-[0.8vw] font-semibold text-slate-500 mt-[0.2vw] flex items-center gap-[0.4vw]">
            <Calendar className="w-[0.9vw] h-[0.9vw]" /> 
            Live tool metrics for active operations.
          </p>
        </div>
        
        <button 
          onClick={fetchData} 
          className="flex items-center gap-[0.4vw] text-[0.7vw] font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-300 shadow-sm rounded-[0.4vw] px-[0.8vw] py-[0.5vw] cursor-pointer transition-all hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className="w-[0.8vw] h-[0.8vw]" />
          Live Sync • {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </button>
      </div>

      {isEngineer ? (
        // ── ENGINEER DASHBOARD ──
        <div className="flex flex-col gap-[1.5vw]">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <MetricCard 
              label="My Assigned Calls" 
              value={stats.myPendingCalls.length} 
              sub="Requires your attention" 
              icon={Phone} 
              colorClass="bg-blue-50 text-blue-600" 
              borderClass="border-blue-200" 
            />
            <MetricCard 
              label="My Claimed Materials" 
              value={stats.myClaimedProducts.length} 
              sub="Pending resolution" 
              icon={Package} 
              colorClass="bg-indigo-50 text-indigo-600" 
              borderClass="border-indigo-200" 
            />
            <MetricCard 
              label="Completed Materials" 
              value={materials.reduce((sum, entry) => sum + (entry.products || []).filter(p => p.assignedTo === loggedInUser?.userId && (p.status === "Completed" || p.report?.status === "Completed")).length, 0)} 
              sub="Waiting admin approval" 
              icon={CheckCircle} 
              colorClass="bg-emerald-50 text-emerald-600" 
              borderClass="border-emerald-200" 
            />
            <MetricCard 
              label="Resolved Calls" 
              value={stats.myCalls.filter(c => c.status === "Resolved").length} 
              sub="Closed / resolved issues" 
              icon={UserCheck} 
              colorClass="bg-slate-50 text-slate-600" 
              borderClass="border-slate-200" 
            />
          </div>

          <div className="grid grid-cols-2 gap-[1.2vw]">
            {/* My Active Service Calls */}
            <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm flex flex-col h-[28vw]">
              <div className="px-[1.2vw] py-[0.9vw] border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-[0.95vw] font-black text-slate-800 flex items-center gap-[0.4vw]">
                  <Phone className="w-[1vw] h-[1vw] text-blue-600" />
                  My Pending Service Calls ({stats.myPendingCalls.length})
                </h3>
                <button 
                  onClick={() => navigate('/serviceCallResponse')}
                  className="text-[0.7vw] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View Workspace
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-[0.6vw] custom-scrollbar">
                {stats.myPendingCalls.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle className="w-[2vw] h-[2vw] text-emerald-500 mb-[0.5vw]" />
                    <p className="font-bold text-[0.85vw]">No pending calls</p>
                  </div>
                ) : (
                  <div className="space-y-[0.5vw]">
                    {stats.myPendingCalls.map((call, idx) => (
                      <div 
                        key={call._id} 
                        onClick={() => navigate('/serviceCallResponse')}
                        className="p-[0.8vw] rounded-[0.6vw] border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono text-[0.8vw] font-bold text-indigo-650">{call.callNumber}</p>
                          <p className="text-[0.72vw] text-slate-700 font-bold mt-[0.1vw] truncate max-w-[15vw]">{call.customerName}</p>
                        </div>
                        <div className="flex items-center gap-[0.4vw]">
                          <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded font-bold ${call.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-200 text-slate-700'}`}>
                            {call.priority}
                          </span>
                          <span className="text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {call.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* My Active Service Materials */}
            <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm flex flex-col h-[28vw]">
              <div className="px-[1.2vw] py-[0.9vw] border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-[0.95vw] font-black text-slate-800 flex items-center gap-[0.4vw]">
                  <Package className="w-[1vw] h-[1vw] text-indigo-600" />
                  My Claimed Materials ({stats.myClaimedProducts.length})
                </h3>
                <button 
                  onClick={() => navigate('/serviceMaterialResponse')}
                  className="text-[0.7vw] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View Workspace
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-[0.6vw] custom-scrollbar">
                {stats.myClaimedProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle className="w-[2vw] h-[2vw] text-emerald-500 mb-[0.5vw]" />
                    <p className="font-bold text-[0.85vw]">No claimed material items</p>
                  </div>
                ) : (
                  <div className="space-y-[0.5vw]">
                    {stats.myClaimedProducts.map(({ entry, product }) => (
                      <div 
                        key={product._pid}
                        onClick={() => navigate('/serviceMaterialResponse')}
                        className="p-[0.8vw] rounded-[0.6vw] border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-[0.8vw] text-slate-800 truncate max-w-[15vw]">
                            {product.productDescription || "Product Item"}
                          </p>
                          <p className="text-[0.68vw] text-slate-500 mt-[0.1vw]">
                            SN: {product.serialNumber || 'N/A'} • Customer: {entry.customerName || 'N/A'}
                          </p>
                        </div>
                        <span className="text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {product.status || 'Claimed'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ── ADMIN / SUPERVISOR DASHBOARD ──
        <div className="flex flex-col gap-[1.5vw]">
          {/* Top Metric Stats */}
          <div className="grid grid-cols-5 gap-[1vw]">
            <MetricCard 
              label="Registered Calls" 
              value={stats.callStatus.Registered + stats.callStatus.Assigned + stats.callStatus.Open + stats.callStatus.Pending + stats.callStatus.Escalated + stats.callStatus.Critical} 
              sub={`${stats.callStatus.Resolved} resolved calls`} 
              icon={Phone} 
              colorClass="bg-blue-50 text-blue-600" 
            />
            <MetricCard 
              label="Escalated Calls" 
              value={stats.activeEscalated.length} 
              sub="Active escalation chains" 
              icon={ArrowUpRight} 
              colorClass="bg-amber-50 text-amber-600" 
            />
            <MetricCard 
              label="SLA Breached" 
              value={stats.criticalCalls.length} 
              sub="Requires immediate action" 
              icon={AlertTriangle} 
              colorClass="bg-red-50 text-red-600" 
              borderClass="border-red-200" 
              textClass="text-red-700" 
            />
            <MetricCard 
              label="Pending Approvals" 
              value={stats.completedMaterials} 
              sub="Materials waiting review" 
              icon={CheckSquare} 
              colorClass="bg-indigo-50 text-indigo-600" 
              borderClass="border-indigo-200" 
            />
            <MetricCard 
              label="Customers" 
              value={customers.length} 
              sub="Registered client base" 
              icon={Users} 
              colorClass="bg-slate-50 text-slate-600" 
            />
          </div>

          {/* Graphs / Breakdowns Grid */}
          <div className="grid grid-cols-2 gap-[1.2vw]">
            {/* Service Call Statuses */}
            <div className="bg-white border border-slate-300 rounded-[0.8vw] p-[1.2vw] shadow-sm flex flex-col">
              <h3 className="text-[0.95vw] font-black text-slate-800 flex items-center gap-[0.4vw] mb-[1vw]">
                <Activity className="w-[1.1vw] h-[1.1vw] text-indigo-600" />
                Service Calls Breakdown
              </h3>
              <div className="space-y-[0.8vw]">
                {[
                  { label: "Registered / Unassigned", val: stats.callStatus.Registered, color: "#94a3b8" },
                  { label: "Open / In Progress", val: stats.callStatus.Open + stats.callStatus.Assigned + stats.callStatus.Pending, color: "#3b82f6" },
                  { label: "Escalated", val: stats.callStatus.Escalated, color: "#eab308" },
                  { label: "Critical / Breached", val: stats.callStatus.Critical, color: "#ef4444" },
                  { label: "Resolved", val: stats.callStatus.Resolved, color: "#10b981" },
                ].map(({ label, val, color }) => {
                  const total = stats.totalCalls || 1;
                  const pct = Math.round((val / total) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center text-[0.78vw] mb-[0.2vw] font-bold">
                        <span className="text-slate-600">{label}</span>
                        <span className="text-slate-800">{val} ({pct}%)</span>
                      </div>
                      <div className="w-full h-[0.5vw] bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Materials Statuses */}
            <div className="bg-white border border-slate-300 rounded-[0.8vw] p-[1.2vw] shadow-sm flex flex-col">
              <h3 className="text-[0.95vw] font-black text-slate-800 flex items-center gap-[0.4vw] mb-[1vw]">
                <Package className="w-[1.1vw] h-[1.1vw] text-indigo-600" />
                Service Materials Breakdown
              </h3>
              <div className="space-y-[0.8vw]">
                {[
                  { label: "Unclaimed Inwards", val: stats.unclaimedMaterials, color: "#94a3b8" },
                  { label: "Claimed & Pending", val: stats.claimedMaterials - stats.completedMaterials, color: "#3b82f6" },
                  { label: "Resolved (Review Needed)", val: stats.completedMaterials, color: "#8b5cf6" },
                  { label: "Approved by Admin", val: stats.approvedMaterials, color: "#10b981" },
                  { label: "Denied by Admin", val: stats.deniedMaterials, color: "#ef4444" },
                ].map(({ label, val, color }) => {
                  const total = (stats.unclaimedMaterials + stats.claimedMaterials + stats.approvedMaterials + stats.deniedMaterials) || 1;
                  const pct = Math.round((val / total) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center text-[0.78vw] mb-[0.2vw] font-bold">
                        <span className="text-slate-600">{label}</span>
                        <span className="text-slate-800">{val} ({pct}%)</span>
                      </div>
                      <div className="w-full h-[0.5vw] bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[1.2vw]">
            {/* Pending Admin Review Decisions */}
            <div className="col-span-2 bg-white border border-slate-300 rounded-[0.8vw] shadow-sm flex flex-col h-[22vw]">
              <div className="px-[1.2vw] py-[0.9vw] border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-[0.95vw] font-black text-slate-800 flex items-center gap-[0.4vw]">
                  <CheckSquare className="w-[1vw] h-[1vw] text-indigo-650" />
                  Service Materials Awaiting Admin Approval ({stats.pendingAdminReviews.length})
                </h3>
                <button 
                  onClick={() => navigate('/serviceMaterial')}
                  className="text-[0.7vw] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Go to Action
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-[0.6vw] custom-scrollbar">
                {stats.pendingAdminReviews.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle className="w-[2.2vw] h-[2.2vw] text-emerald-500 mb-[0.5vw]" />
                    <p className="font-bold text-[0.85vw]">No pending reviews. All clear!</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[0.78vw]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="p-[0.6vw] font-bold text-slate-500">Product</th>
                        <th className="p-[0.6vw] font-bold text-slate-500">Customer</th>
                        <th className="p-[0.6vw] font-bold text-slate-500">Assigned To</th>
                        <th className="p-[0.6vw] font-bold text-slate-500">Serial No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.pendingAdminReviews.map(({ entry, product }) => (
                        <tr 
                          key={product._pid}
                          onClick={() => navigate('/serviceMaterial')}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="p-[0.6vw] font-bold text-slate-800 max-w-[12vw] truncate">
                            {product.productDescription || "Unknown Description"}
                          </td>
                          <td className="p-[0.6vw] text-slate-700 truncate max-w-[10vw]">
                            {entry.customerName || "—"}
                          </td>
                          <td className="p-[0.6vw] text-indigo-700 font-bold">
                            {product.assignedToName || "—"}
                          </td>
                          <td className="p-[0.6vw] font-mono font-bold text-slate-600">
                            {product.serialNumber || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Critical SLA/Escalation List */}
            <div className="col-span-1 bg-white border border-slate-300 rounded-[0.8vw] shadow-sm flex flex-col h-[22vw]">
              <div className="px-[1.2vw] py-[0.9vw] border-b border-slate-200 flex items-center justify-between bg-red-50/20">
                <h3 className="text-[0.95vw] font-black text-red-700 flex items-center gap-[0.4vw]">
                  <AlertTriangle className="w-[1vw] h-[1vw]" />
                  Active SLA Breaches ({stats.criticalCalls.length})
                </h3>
                <button 
                  onClick={() => navigate('/serviceCallEscalations')}
                  className="text-[0.7vw] font-bold text-red-700 hover:text-red-900 transition-colors"
                >
                  Manage
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-[0.6vw] custom-scrollbar">
                {stats.criticalCalls.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Shield className="w-[2vw] h-[2vw] text-emerald-500 mb-[0.5vw]" />
                    <p className="font-bold text-[0.85vw]">No SLA breaches active</p>
                  </div>
                ) : (
                  <div className="space-y-[0.5vw]">
                    {stats.criticalCalls.slice(0, 5).map(call => (
                      <div 
                        key={call._id} 
                        onClick={() => navigate('/serviceCallEscalations')}
                        className="p-[0.6vw] rounded-[0.4vw] border border-red-200 bg-red-50/20 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-[0.8vw] text-red-800">{call.callNumber}</span>
                          <span className="text-[0.68vw] bg-red-100 text-red-800 px-[0.4vw] rounded font-bold">BREACH</span>
                        </div>
                        <p className="text-[0.72vw] text-slate-700 font-bold truncate mt-[0.1vw]">{call.customerName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
