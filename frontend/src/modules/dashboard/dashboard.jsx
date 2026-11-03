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
  RefreshCw,
  ChevronRight,
  Calendar,
  CheckSquare,
  UserCheck,
  Boxes,
  Timer,
} from "lucide-react";
import useEscalationWorker from "../../service/useEscalationWorker";

const API_URL = import.meta.env.VITE_API_URL;

/* ─────────────────────────────────────────────────────────────────────────────
   Reusable primitives
───────────────────────────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, icon: Icon, accent = "indigo", alert = false }) {
  const accents = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
    slate: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-100" },
  };
  const a = accents[accent] || accents.indigo;

  return (
    <div
      className={`group relative bg-white rounded-[0.65vw] px-[1vw] py-[0.85vw] flex flex-col justify-between
        ring-1 ${alert ? "ring-red-200" : "ring-slate-200"}
        shadow-[0_1px_2px_rgba(15,23,42,0.04)]
        hover:shadow-[0_4px_14px_rgba(15,23,42,0.07)] hover:-translate-y-[0.05vw]
        transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[0.62vw] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <div className={`w-[1.9vw] h-[1.9vw] rounded-[0.45vw] flex items-center justify-center ${a.bg} ${a.text} ring-1 ${a.ring}`}>
          <Icon className="w-[0.95vw] h-[0.95vw]" strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-[0.5vw]">
        <h3 className={`text-[1.55vw] font-bold leading-none tracking-tight ${alert ? "text-red-600" : "text-slate-800"}`}>
          {value}
        </h3>
        {sub && (
          <p className="text-[0.62vw] text-slate-400 mt-[0.3vw] font-medium truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, count, actionLabel, onAction, tone = "slate" }) {
  const tones = {
    slate: "text-slate-800",
    indigo: "text-indigo-700",
    red: "text-red-700",
  };
  return (
    <div className="flex items-center justify-between px-[1vw] py-[0.65vw] border-b border-slate-100 flex-shrink-0">
      <h3 className={`text-[0.8vw] font-bold flex items-center gap-[0.45vw] ${tones[tone]}`}>
        <Icon className="w-[0.9vw] h-[0.9vw]" strokeWidth={2.2} />
        {title}
        {count !== undefined && (
          <span className="text-[0.62vw] font-semibold px-[0.4vw] py-[0.08vw] rounded-full bg-slate-100 text-slate-600">
            {count}
          </span>
        )}
      </h3>
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-[0.65vw] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.2vw] transition-colors"
        >
          {actionLabel}
          <ChevronRight className="w-[0.7vw] h-[0.7vw]" />
        </button>
      )}
    </div>
  );
}

function ProgressRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline text-[0.7vw] mb-[0.28vw]">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-800 font-bold tabular-nums">
          {value}
          <span className="text-slate-400 font-semibold ml-[0.3vw] text-[0.62vw]">{pct}%</span>
        </span>
      </div>
      <div className="w-full h-[0.4vw] bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-[1vw]">
      <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-emerald-50 flex items-center justify-center mb-[0.5vw]">
        <Icon className="w-[1.2vw] h-[1.2vw] text-emerald-500" strokeWidth={2} />
      </div>
      <p className="text-[0.72vw] font-semibold text-slate-500">{title}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const { timers } = useEscalationWorker();

  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("loggedInUser") ||
        localStorage.getItem("loggedInUser") ||
        "null"
      );
    } catch {
      return null;
    }
  }, []);

  const isEngineer =
    loggedInUser?.role === "Support Engineer" ||
    loggedInUser?.role === "Service Engineer";

  const [calls, setCalls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchData = async () => {
    try {
      const [callsRes, materialsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/service-material`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/master/customers`).catch(() => ({ data: [] })),
      ]);
      setCalls(callsRes.data || []);
      setMaterials(materialsRes.data || []);
      setCustomers(customersRes.data || []);
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

  /* ── Aggregations ──────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const userId = loggedInUser?.userId || loggedInUser?.id;

    const callStatus = {
      Registered: calls.filter((c) => c.status === "Registered").length,
      Assigned: calls.filter((c) => c.status === "Assigned").length,
      Open: calls.filter((c) => c.status === "Open").length,
      Pending: calls.filter((c) => c.status === "Pending").length,
      Resolved: calls.filter((c) => c.status === "Resolved").length,
      Critical: calls.filter(
        (c) => c.status === "Critical" || c.status === "Critical_Unresolved"
      ).length,
      Escalated: calls.filter((c) => c.status === "Escalated").length,
    };

    let unclaimedMaterials = 0;
    let claimedMaterials = 0;
    let completedMaterials = 0;
    let approvedMaterials = 0;
    let deniedMaterials = 0;
    const pendingAdminReviews = [];
    const myClaimedProducts = [];

    materials.forEach((entry) => {
      (entry.products || []).forEach((p) => {
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
        if (finalStatus === "Completed") approvedMaterials++;
        else if (finalStatus === "Admin Returned") deniedMaterials++;
      });
    });

    const criticalCalls = calls.filter((c) => {
      if (c.status === "Resolved" || c.status === "Closed") return false;
      const hasActiveUnattended = (c.products || []).some(
        (p) => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended
      );
      if (!hasActiveUnattended) return false;
      const timer = timers.find((t) => t.callId === c._id || t.callId === c.callId);
      return (
        c.status === "Critical" ||
        c.status === "Critical_Unresolved" ||
        c.priority === "Critical" ||
        timer?.isExpired
      );
    });

    const activeEscalated = calls.filter(
      (c) => c.status === "Escalated" && c.status !== "Resolved"
    );

    const myCalls = calls.filter((c) => {
      if (c.currentEngineerId === userId) return true;
      return (
        c.products &&
        c.products.some((p) => p._assignedEngineerId === userId && !p._resolved)
      );
    });
    const myPendingCalls = myCalls.filter((c) => c.status !== "Resolved");

    const myCompletedMaterials = materials.reduce(
      (sum, entry) =>
        sum +
        (entry.products || []).filter(
          (p) =>
            p.assignedTo === userId &&
            (p.status === "Completed" || p.report?.status === "Completed")
        ).length,
      0
    );

    return {
      totalCalls: calls.length,
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
      myClaimedProducts,
      myCompletedMaterials,
    };
  }, [calls, materials, timers, loggedInUser]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="w-full h-[90vh] flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-[2.4vw] h-[2.4vw] animate-spin text-indigo-500 mb-[0.8vw]" />
        <p className="text-[0.8vw] font-semibold">Syncing dashboard…</p>
      </div>
    );
  }

  const totalRegisteredCalls =
    stats.callStatus.Registered +
    stats.callStatus.Assigned +
    stats.callStatus.Open +
    stats.callStatus.Pending +
    stats.callStatus.Escalated +
    stats.callStatus.Critical;

  /* ── Layout shell (fixed, non-scrollable) ──────────────────────────────── */
  return (
    <div className="w-full h-[90vh] flex flex-col overflow-hidden px-[0.75vw] pt-[0.5vw] pb-[0.75vw] font-sans text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between mb-[0.9vw] flex-shrink-0">
        <div>
          <h1 className="text-[1.4vw] font-bold tracking-tight leading-tight text-slate-900">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {loggedInUser?.name || "User"}
            </span>
          </h1>
          <p className="text-[0.68vw] font-medium text-slate-500 mt-[0.15vw] flex items-center gap-[0.35vw]">
            <Calendar className="w-[0.75vw] h-[0.75vw]" />
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <span className="text-slate-300">•</span>
            Operational overview
          </p>
        </div>

        <button
          onClick={fetchData}
          className="group flex items-center gap-[0.35vw] text-[0.65vw] font-semibold text-slate-600
            bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-600
            rounded-[0.45vw] px-[0.75vw] py-[0.45vw] transition-all
            shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_2px_8px_rgba(79,70,229,0.08)]"
        >
          <RefreshCw className="w-[0.7vw] h-[0.7vw] group-hover:rotate-180 transition-transform duration-500" />
          Live · {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </button>
      </header>

      {/* Body — fixed grid */}
      {isEngineer ? (
        <EngineerView
          stats={stats}
          navigate={navigate}
        />
      ) : (
        <AdminView
          stats={stats}
          totalRegisteredCalls={totalRegisteredCalls}
          customersCount={customers.length}
          navigate={navigate}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Engineer view
───────────────────────────────────────────────────────────────────────────── */

function EngineerView({ stats, navigate }) {
  return (
    <div className="flex-1 flex flex-col gap-[0.9vw] min-h-0">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-[0.9vw] flex-shrink-0">
        <KpiCard
          label="Assigned Calls"
          value={stats.myPendingCalls.length}
          sub="Requires your attention"
          icon={Phone}
          accent="blue"
        />
        <KpiCard
          label="Claimed Materials"
          value={stats.myClaimedProducts.length}
          sub="Pending resolution"
          icon={Package}
          accent="indigo"
        />
        <KpiCard
          label="Completed"
          value={stats.myCompletedMaterials}
          sub="Awaiting admin approval"
          icon={CheckCircle}
          accent="emerald"
        />
        <KpiCard
          label="Resolved Calls"
          value={stats.myCalls.filter((c) => c.status === "Resolved").length}
          sub="Closed issues"
          icon={UserCheck}
          accent="slate"
        />
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-2 gap-[0.9vw] flex-1 min-h-0">
        {/* Pending Calls */}
        <section className="bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col min-h-0 overflow-hidden">
          <PanelHeader
            icon={Phone}
            title="Pending Service Calls"
            count={stats.myPendingCalls.length}
            actionLabel="Workspace"
            onAction={() => navigate("/serviceCallResponse")}
            tone="indigo"
          />
          <div className="flex-1 min-h-0 overflow-y-auto px-[0.7vw] py-[0.6vw] space-y-[0.5vw] custom-scrollbar">
            {stats.myPendingCalls.length === 0 ? (
              <EmptyState icon={CheckCircle} title="All caught up — no pending calls" />
            ) : (
              stats.myPendingCalls.map((call) => (
                <div
                  key={call._id}
                  onClick={() => navigate("/serviceCallResponse")}
                  className="group px-[0.75vw] py-[0.55vw] rounded-[0.5vw] ring-1 ring-slate-200 bg-white
                    hover:ring-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer
                    flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[0.72vw] font-bold text-indigo-700">
                      {call.callNumber}
                    </p>
                    <p className="text-[0.68vw] text-slate-700 font-semibold mt-[0.1vw] truncate max-w-[16vw]">
                      {call.customerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-[0.35vw] flex-shrink-0">
                    <span
                      className={`text-[0.58vw] px-[0.45vw] py-[0.14vw] rounded-[0.25vw] font-bold uppercase tracking-wide ${call.priority === "Critical"
                          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {call.priority}
                    </span>
                    <span className="text-[0.58vw] px-[0.45vw] py-[0.14vw] rounded-[0.25vw] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                      {call.status}
                    </span>
                    <ChevronRight className="w-[0.7vw] h-[0.7vw] text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-[0.1vw] transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Claimed Materials */}
        <section className="bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col min-h-0 overflow-hidden">
          <PanelHeader
            icon={Package}
            title="Claimed Materials"
            count={stats.myClaimedProducts.length}
            actionLabel="Workspace"
            onAction={() => navigate("/serviceMaterialResponse")}
            tone="indigo"
          />
          <div className="flex-1 min-h-0 overflow-y-auto px-[0.7vw] py-[0.6vw] space-y-[0.5vw] custom-scrollbar">
            {stats.myClaimedProducts.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No claimed materials at the moment" />
            ) : (
              stats.myClaimedProducts.map(({ entry, product }) => (
                <div
                  key={product._pid}
                  onClick={() => navigate("/serviceMaterialResponse")}
                  className="group px-[0.75vw] py-[0.55vw] rounded-[0.5vw] ring-1 ring-slate-200 bg-white
                    hover:ring-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer
                    flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[0.72vw] text-slate-800 truncate max-w-[16vw]">
                      {product.productDescription || "Product Item"}
                    </p>
                    <p className="text-[0.6vw] text-slate-500 mt-[0.1vw] truncate max-w-[16vw]">
                      SN: {product.serialNumber || "N/A"} · {entry.customerName || "N/A"}
                    </p>
                  </div>
                  <span className="text-[0.58vw] px-[0.45vw] py-[0.14vw] rounded-[0.25vw] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 ring-1 ring-amber-200 flex-shrink-0">
                    {product.status || "Claimed"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin / Supervisor view
───────────────────────────────────────────────────────────────────────────── */

function AdminView({ stats, totalRegisteredCalls, customersCount, navigate }) {
  const matTotal =
    stats.unclaimedMaterials +
    stats.claimedMaterials +
    stats.approvedMaterials +
    stats.deniedMaterials || 1;

  return (
    <div className="flex-1 flex flex-col gap-[0.9vw] min-h-0">
      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-[0.9vw] flex-shrink-0">
        <KpiCard
          label="Registered Calls"
          value={totalRegisteredCalls}
          sub={`${stats.callStatus.Resolved} resolved`}
          icon={Phone}
          accent="blue"
        />
        <KpiCard
          label="Escalated"
          value={stats.activeEscalated.length}
          sub="Active chains"
          icon={ArrowUpRight}
          accent="amber"
        />
        <KpiCard
          label="SLA Breached"
          value={stats.criticalCalls.length}
          sub="Immediate action"
          icon={AlertTriangle}
          accent="red"
          alert={stats.criticalCalls.length > 0}
        />
        <KpiCard
          label="Pending Approvals"
          value={stats.completedMaterials}
          sub="Materials to review"
          icon={CheckSquare}
          accent="indigo"
        />
        <KpiCard
          label="Customers"
          value={customersCount}
          sub="Active client base"
          icon={Users}
          accent="slate"
        />
      </div>

      {/* Middle: breakdowns */}
      <div className="grid grid-cols-2 gap-[0.9vw] flex-shrink-0 h-[16.5vw]">
        <section className="bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          <PanelHeader icon={Activity} title="Service Calls Breakdown" tone="indigo" />
          <div className="flex-1 px-[1vw] py-[0.85vw] flex flex-col justify-center gap-[0.62vw]">
            <ProgressRow
              label="Registered / Unassigned"
              value={stats.callStatus.Registered}
              total={stats.totalCalls || 1}
              color="#94a3b8"
            />
            <ProgressRow
              label="Open / In Progress"
              value={
                stats.callStatus.Open +
                stats.callStatus.Assigned +
                stats.callStatus.Pending
              }
              total={stats.totalCalls || 1}
              color="#3b82f6"
            />
            <ProgressRow
              label="Escalated"
              value={stats.callStatus.Escalated}
              total={stats.totalCalls || 1}
              color="#eab308"
            />
            <ProgressRow
              label="Critical / Breached"
              value={stats.callStatus.Critical}
              total={stats.totalCalls || 1}
              color="#ef4444"
            />
            <ProgressRow
              label="Resolved"
              value={stats.callStatus.Resolved}
              total={stats.totalCalls || 1}
              color="#10b981"
            />
          </div>
        </section>

        <section className="bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          <PanelHeader icon={Boxes} title="Service Materials Breakdown" tone="indigo" />
          <div className="flex-1 px-[1vw] py-[0.85vw] flex flex-col justify-center gap-[0.62vw]">
            <ProgressRow
              label="Unclaimed Inwards"
              value={stats.unclaimedMaterials}
              total={matTotal}
              color="#94a3b8"
            />
            <ProgressRow
              label="Claimed & Pending"
              value={stats.claimedMaterials - stats.completedMaterials}
              total={matTotal}
              color="#3b82f6"
            />
            <ProgressRow
              label="Resolved (Review Needed)"
              value={stats.completedMaterials}
              total={matTotal}
              color="#8b5cf6"
            />
            <ProgressRow
              label="Approved by Admin"
              value={stats.approvedMaterials}
              total={matTotal}
              color="#10b981"
            />
            <ProgressRow
              label="Denied by Admin"
              value={stats.deniedMaterials}
              total={matTotal}
              color="#ef4444"
            />
          </div>
        </section>
      </div>

      {/* Bottom: approvals + SLA — fills remaining space */}
      <div className="grid grid-cols-3 gap-[0.9vw] flex-1 min-h-0">
        {/* Approvals table */}
        <section className="col-span-2 bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          <PanelHeader
            icon={CheckSquare}
            title="Materials Awaiting Approval"
            count={stats.pendingAdminReviews.length}
            actionLabel="Review"
            onAction={() => navigate("/serviceMaterial")}
            tone="indigo"
          />
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {stats.pendingAdminReviews.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No pending reviews — all clear!"
              />
            ) : (
              <table className="w-full text-left border-collapse text-[0.7vw]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="px-[0.8vw] py-[0.5vw] font-semibold text-slate-500 uppercase tracking-wider text-[0.6vw]">
                      Product
                    </th>
                    <th className="px-[0.8vw] py-[0.5vw] font-semibold text-slate-500 uppercase tracking-wider text-[0.6vw]">
                      Customer
                    </th>
                    <th className="px-[0.8vw] py-[0.5vw] font-semibold text-slate-500 uppercase tracking-wider text-[0.6vw]">
                      Assigned To
                    </th>
                    <th className="px-[0.8vw] py-[0.5vw] font-semibold text-slate-500 uppercase tracking-wider text-[0.6vw]">
                      Serial
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pendingAdminReviews.map(({ entry, product }) => (
                    <tr
                      key={product._pid}
                      onClick={() => navigate("/serviceMaterial")}
                      className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-[0.8vw] py-[0.55vw] font-semibold text-slate-800 max-w-[12vw] truncate">
                        {product.productDescription || "—"}
                      </td>
                      <td className="px-[0.8vw] py-[0.55vw] text-slate-600 truncate max-w-[10vw]">
                        {entry.customerName || "—"}
                      </td>
                      <td className="px-[0.8vw] py-[0.55vw] text-indigo-700 font-semibold">
                        {product.assignedToName || "—"}
                      </td>
                      <td className="px-[0.8vw] py-[0.55vw] font-mono text-slate-500">
                        {product.serialNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* SLA breaches */}
        <section className="col-span-1 bg-white rounded-[0.7vw] ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-[1vw] py-[0.65vw] border-b border-slate-100 flex-shrink-0 bg-red-50/50">
            <h3 className="text-[0.8vw] font-bold flex items-center gap-[0.45vw] text-red-700">
              <AlertTriangle className="w-[0.9vw] h-[0.9vw]" strokeWidth={2.2} />
              Active SLA Breaches
              <span className="text-[0.62vw] font-semibold px-[0.4vw] py-[0.08vw] rounded-full bg-red-100 text-red-700">
                {stats.criticalCalls.length}
              </span>
            </h3>
            <button
              onClick={() => navigate("/serviceCallEscalations")}
              className="text-[0.65vw] font-semibold text-red-600 hover:text-red-800 transition-colors"
            >
              Manage
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-[0.7vw] py-[0.6vw] space-y-[0.45vw] custom-scrollbar">
            {stats.criticalCalls.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-emerald-50 flex items-center justify-center mb-[0.5vw]">
                  <Shield className="w-[1.1vw] h-[1.1vw] text-emerald-500" />
                </div>
                <p className="text-[0.7vw] font-semibold text-slate-500">
                  No SLA breaches — system healthy
                </p>
              </div>
            ) : (
              stats.criticalCalls.slice(0, 6).map((call) => (
                <div
                  key={call._id}
                  onClick={() => navigate("/serviceCallEscalations")}
                  className="px-[0.7vw] py-[0.5vw] rounded-[0.45vw] ring-1 ring-red-200 bg-red-50/40
                    hover:bg-red-50 hover:ring-red-300 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-[0.7vw] text-red-800">
                      {call.callNumber}
                    </span>
                    <span className="text-[0.55vw] bg-red-100 text-red-800 px-[0.35vw] py-[0.08vw] rounded font-bold uppercase tracking-wide">
                      Breach
                    </span>
                  </div>
                  <p className="text-[0.65vw] text-slate-700 font-semibold truncate mt-[0.15vw]">
                    {call.customerName}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}