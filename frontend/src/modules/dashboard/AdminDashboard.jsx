import React from "react";
import {
  Users,
  Phone,
  AlertTriangle,
  CheckSquare,
  ArrowUpRight,
  Activity,
  Boxes,
  Shield,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

export function KpiCard({ label, value, sub, icon: Icon, accent = "indigo", alert = false }) {
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

export function PanelHeader({ icon: Icon, title, count, actionLabel, onAction, tone = "slate" }) {
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
          className="text-[0.65vw] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.2vw] transition-colors cursor-pointer"
        >
          {actionLabel}
          <ChevronRight className="w-[0.7vw] h-[0.7vw]" />
        </button>
      )}
    </div>
  );
}

export function ProgressRow({ label, value, total, color = "#3b82f6" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-[0.25vw]">
      <div className="flex items-center justify-between text-[0.68vw]">
        <span className="text-slate-600 font-medium truncate max-w-[14vw]">{label}</span>
        <div className="flex items-center gap-[0.4vw]">
          <span className="font-bold text-slate-800 font-mono">{value}</span>
          <span className="text-slate-400 text-[0.6vw] font-mono">{pct}%</span>
        </div>
      </div>
      <div className="h-[0.32vw] w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-[2vw]">
      <div className="w-[2vw] h-[2vw] rounded-full bg-slate-50 flex items-center justify-center mb-[0.4vw]">
        <Icon className="w-[1vw] h-[1vw] text-slate-400" />
      </div>
      <p className="text-[0.68vw] font-medium text-slate-400">{title}</p>
    </div>
  );
}

export default function AdminDashboard({ stats, totalRegisteredCalls, customersCount, navigate }) {
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

      {/* Bottom: approvals + SLA */}
      <div className="grid grid-cols-3 gap-[0.9vw] flex-1 min-h-0">
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
              onClick={() => navigate("/serviceCall/escalations")}
              className="text-[0.65vw] font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
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
                  onClick={() => navigate("/serviceCall/escalations")}
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
