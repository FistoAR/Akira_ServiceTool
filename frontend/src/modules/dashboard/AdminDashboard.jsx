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
  TrendingUp,
  Clock,
  Sparkles,
  ClipboardList,
} from "lucide-react";

/**
 * Minimal inline Sparkline SVG for KPI cards
 */
function Sparkline({ color = "#6366f1" }) {
  return (
    <svg
      viewBox="0 0 80 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[4.2vw] h-[1.5vw] shrink-0 overflow-visible"
    >
      <path
        d="M2 20 C 14 17, 20 22, 28 13 C 38 4, 46 19, 55 9 C 64 0, 71 11, 78 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * KPI Metric Card with Sparkline & icon box
 */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "indigo",
  alert = false,
  sparkColor = "#6366f1",
}) {
  const accents = {
    indigo: {
      bg: "bg-indigo-50/70",
      text: "text-indigo-600",
      ring: "border-indigo-100",
      spark: "#6366f1",
    },
    blue: {
      bg: "bg-blue-50/70",
      text: "text-blue-600",
      ring: "border-blue-100",
      spark: "#3b82f6",
    },
    amber: {
      bg: "bg-amber-50/70",
      text: "text-amber-600",
      ring: "border-amber-100",
      spark: "#f59e0b",
    },
    red: {
      bg: "bg-rose-50/70",
      text: "text-rose-600",
      ring: "border-rose-200",
      spark: "#f43f5e",
    },
    emerald: {
      bg: "bg-emerald-50/70",
      text: "text-emerald-600",
      ring: "border-emerald-200",
      spark: "#10b981",
    },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      ring: "border-slate-200",
      spark: "#64748b",
    },
  };
  const a = accents[accent] || accents.indigo;
  const isAlert = alert || accent === "red";

  return (
    <div
      className={`relative bg-white rounded-[0.7vw] p-[0.8vw] flex flex-col justify-between border transition-all duration-200
        ${
          isAlert
            ? "border-rose-200 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.08)] bg-rose-50/[0.15]"
            : "border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] hover:shadow-md"
        }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-[0.62vw] font-bold uppercase tracking-wider ${
            isAlert ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <div
          className={`w-[1.7vw] h-[1.7vw] rounded-[0.4vw] flex items-center justify-center border ${a.bg} ${a.text} ${a.ring}`}
        >
          <Icon className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
        </div>
      </div>

      <div className="mt-[0.6vw] flex items-end justify-between gap-[0.4vw]">
        <div>
          <h3
            className={`text-[1.35vw] font-bold leading-none tracking-tight ${
              isAlert ? "text-rose-600" : "text-slate-800"
            }`}
          >
            {value}
          </h3>
          {sub && (
            <p
              className={`text-[0.65vw] mt-[0.3vw] font-medium truncate ${
                isAlert ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {sub}
            </p>
          )}
        </div>
        <div className="pb-[0.1vw]">
          <Sparkline color={a.spark || sparkColor} />
        </div>
      </div>
    </div>
  );
}

export function PanelHeader({ icon: Icon, title, count, actionLabel, onAction, tone = "slate" }) {
  const tones = {
    slate: "text-slate-800",
    indigo: "text-indigo-700",
    red: "text-rose-600",
  };
  return (
    <div className="flex items-center justify-between px-[0.8vw] py-[0.6vw] border-b border-slate-100 flex-shrink-0">
      <h3 className={`text-[0.76vw] font-bold flex items-center gap-[0.4vw] ${tones[tone]}`}>
        <Icon className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
        {title}
        {count !== undefined && (
          <span className="text-[0.65vw] font-semibold px-[0.4vw] py-[0.1vw] rounded-full bg-slate-100 text-slate-600">
            {count}
          </span>
        )}
      </h3>
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-[0.68vw] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.2vw] transition-colors cursor-pointer"
        >
          {actionLabel}
          <ChevronRight className="w-[0.75vw] h-[0.75vw]" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-[1.2vw]">
      <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-slate-50 flex items-center justify-center mb-[0.4vw]">
        <Icon className="w-[1.1vw] h-[1.1vw] text-slate-400" strokeWidth={2} />
      </div>
      <p className="text-[0.68vw] font-medium text-slate-400">{title}</p>
    </div>
  );
}

/**
 * Clean SVG Donut Chart with center label
 */
function DonutChart({ segments, total, label = "Total Calls", size = 130 }) {
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const validSegments = segments.filter((s) => s.value > 0);

  return (
    <div
      className="relative flex items-center justify-center shrink-0 w-[7.5vw] h-[7.5vw]"
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full -rotate-90 transform"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {validSegments.length === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#cbd5e1"
            strokeWidth={strokeWidth}
            fill="none"
          />
        ) : (
          validSegments.map((seg, idx) => {
            const pct = total > 0 ? seg.value / total : 0;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += pct;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                fill="none"
                strokeLinecap="butt"
                className="transition-all duration-700 ease-out"
              />
            );
          })
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-[1.25vw] font-bold leading-none text-slate-800">
          {total}
        </span>
        <span className="text-[0.6vw] font-medium text-slate-400 mt-[0.2vw]">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard({
  stats,
  totalRegisteredCalls,
  customersCount,
  navigate,
}) {
  const matTotal =
    stats.unclaimedMaterials +
    stats.claimedMaterials +
    stats.approvedMaterials +
    stats.deniedMaterials;

  // Segments for Service Calls Donut Breakdown
  const callSegments = [
    {
      label: "Registered / Unassigned",
      value: stats.callStatus.Registered || 0,
      color: "#3b82f6", // Blue
    },
    {
      label: "Open / In Progress",
      value:
        (stats.callStatus.Open || 0) +
        (stats.callStatus.Assigned || 0) +
        (stats.callStatus.Pending || 0),
      color: "#2563eb", // Deep blue
    },
    {
      label: "Escalated",
      value: stats.callStatus.Escalated || 0,
      color: "#f59e0b", // Amber / Orange
    },
    {
      label: "Critical / Breached",
      value: stats.callStatus.Critical || 0,
      color: "#ef4444", // Red
    },
    {
      label: "Resolved",
      value: stats.callStatus.Resolved || 0,
      color: "#10b981", // Green
    },
  ];

  // Segments for Service Materials Donut Breakdown
  const materialSegments = [
    {
      label: "Unclaimed Inwards",
      value: stats.unclaimedMaterials || 0,
      color: "#94a3b8", // Slate
    },
    {
      label: "Claimed & Pending",
      value: Math.max(0, stats.claimedMaterials - stats.completedMaterials),
      color: "#3b82f6", // Blue
    },
    {
      label: "Resolved (Review Needed)",
      value: stats.completedMaterials || 0,
      color: "#8b5cf6", // Violet
    },
    {
      label: "Approved by Admin",
      value: stats.approvedMaterials || 0,
      color: "#10b981", // Green
    },
    {
      label: "Denied by Admin",
      value: stats.deniedMaterials || 0,
      color: "#ef4444", // Red
    },
  ];

  const totalCallsCount = stats.totalCalls || totalRegisteredCalls || 0;
  const totalMaterialsCount = matTotal || 0;

  return (
    <div className="flex-1 flex flex-col gap-[0.55vw] min-h-0 overflow-hidden">
      {/* ── 1. Top KPI Cards Row ────────────────────────────── */}
      <div className="grid grid-cols-5 gap-[0.55vw] flex-shrink-0">
        <KpiCard
          label="REGISTERED CALLS"
          value={totalRegisteredCalls}
          sub={`${stats.callStatus.Resolved || 0} resolved`}
          icon={Phone}
          accent="blue"
        />
        <KpiCard
          label="ESCALATED"
          value={stats.activeEscalated.length}
          sub="Active chains"
          icon={ArrowUpRight}
          accent="amber"
        />
        <KpiCard
          label="SLA BREACHED"
          value={stats.criticalCalls.length}
          sub="Immediate action"
          icon={AlertTriangle}
          accent="red"
          alert={stats.criticalCalls.length > 0}
        />
        <KpiCard
          label="PENDING APPROVALS"
          value={stats.completedMaterials}
          sub="Materials to review"
          icon={CheckSquare}
          accent="indigo"
        />
        <KpiCard
          label="CUSTOMERS"
          value={customersCount}
          sub="Active client base"
          icon={Users}
          accent="slate"
        />
      </div>

      {/* ── 2. Middle Row: Donut Chart Breakdowns ────────────── */}
      <div className="grid grid-cols-2 gap-[0.55vw] flex-1 min-h-0">
        {/* Card: Service Calls Breakdown */}
        <section className="bg-white rounded-[0.7vw] border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-[0.8vw] py-[0.6vw] flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center gap-[0.4vw] text-indigo-700 font-bold text-[0.76vw] flex-shrink-0">
            <Activity className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
            <span>Service Calls Breakdown</span>
          </div>

          <div className="flex items-center justify-between gap-[1.2vw] my-auto px-[0.4vw] flex-1 min-h-0">
            {/* Donut Chart */}
            <DonutChart
              segments={callSegments}
              total={totalCallsCount}
              label="Total Calls"
            />

            {/* Legend & Stats Table */}
            <div className="flex-1 space-y-[0.3vw]">
              {callSegments.map((item, idx) => {
                const pct =
                  totalCallsCount > 0
                    ? Math.round((item.value / totalCallsCount) * 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[0.68vw]"
                  >
                    <div className="flex items-center gap-[0.4vw]">
                      <span
                        className="w-[0.5vw] h-[0.5vw] rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="font-bold text-slate-800 font-mono text-[0.68vw]">
                        {item.value}
                      </span>
                      <span className="text-slate-400 font-mono text-[0.68vw] w-[1.8vw] text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-[0.4vw] border-t border-slate-100 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => navigate("/serviceCall")}
              className="text-[0.68vw] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.3vw] transition-colors cursor-pointer group"
            >
              <span>View all service calls</span>
              <span className="group-hover:translate-x-0.5 transition-transform">
                &rarr;
              </span>
            </button>
          </div>
        </section>

        {/* Card: Service Materials Breakdown */}
        <section className="bg-white rounded-[0.7vw] border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-[0.8vw] py-[0.6vw] flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center gap-[0.4vw] text-indigo-700 font-bold text-[0.76vw] flex-shrink-0">
            <Boxes className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
            <span>Service Materials Breakdown</span>
          </div>

          <div className="flex items-center justify-between gap-[1.2vw] my-auto px-[0.4vw] flex-1 min-h-0">
            {/* Donut Chart */}
            <DonutChart
              segments={materialSegments}
              total={totalMaterialsCount}
              label="Total Items"
            />

            {/* Legend & Stats Table */}
            <div className="flex-1 space-y-[0.3vw]">
              {materialSegments.map((item, idx) => {
                const pct =
                  totalMaterialsCount > 0
                    ? Math.round((item.value / totalMaterialsCount) * 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[0.68vw]"
                  >
                    <div className="flex items-center gap-[0.4vw]">
                      <span
                        className="w-[0.5vw] h-[0.5vw] rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="font-bold text-slate-800 font-mono text-[0.68vw]">
                        {item.value}
                      </span>
                      <span className="text-slate-400 font-mono text-[0.68vw] w-[1.8vw] text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-[0.4vw] border-t border-slate-100 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => navigate("/serviceMaterial")}
              className="text-[0.68vw] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.3vw] transition-colors cursor-pointer group"
            >
              <span>View materials</span>
              <span className="group-hover:translate-x-0.5 transition-transform">
                &rarr;
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* ── 3. Bottom Row: Approvals & SLA Breaches ────────────── */}
      <div className="grid grid-cols-2 gap-[0.55vw] flex-1 min-h-0">
        {/* Materials Awaiting Approval */}
        <section className="bg-white rounded-[0.7vw] border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-[0.8vw] py-[0.6vw] flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-[0.35vw] border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-[0.4vw] text-indigo-700 font-bold text-[0.76vw]">
              <CheckSquare className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
              <span>Materials Awaiting Approval</span>
              <span className="ml-[0.2vw] px-[0.45vw] py-[0.1vw] rounded-full bg-slate-100 text-slate-600 font-bold text-[0.65vw]">
                {stats.pendingAdminReviews.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/serviceMaterial")}
              className="text-[0.68vw] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-[0.2vw] transition-colors cursor-pointer"
            >
              <span>Review all</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-[0.35vw] min-h-0 overflow-y-auto">
            {stats.pendingAdminReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center my-auto">
                <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mb-[0.35vw] text-indigo-500 shadow-2xs">
                  <ClipboardList className="w-[1.1vw] h-[1.1vw]" strokeWidth={1.8} />
                </div>
                <h4 className="text-[0.76vw] font-bold text-slate-700">
                  No pending reviews — all clear!
                </h4>
                <p className="text-[0.65vw] text-slate-400 mt-[0.1vw]">
                  Great job! There are currently no materials awaiting approval.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-[0.3vw] overflow-y-auto max-h-full custom-scrollbar">
                {stats.pendingAdminReviews.map(({ entry, product }) => (
                  <div
                    key={product._pid}
                    onClick={() => navigate("/serviceMaterial")}
                    className="flex items-center justify-between p-[0.4vw] rounded-[0.4vw] border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-[0.68vw]">
                        {product.productDescription || "—"}
                      </div>
                      <div className="text-[0.62vw] text-slate-500">
                        {entry.customerName || "—"} • SN:{" "}
                        {product.serialNumber || "—"}
                      </div>
                    </div>
                    <span className="text-[0.62vw] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-[0.4vw] py-[0.1vw] rounded">
                      {product.assignedToName || "Assigned"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Active SLA Breaches */}
        <section className="bg-white rounded-[0.7vw] border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-[0.8vw] py-[0.6vw] flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-[0.35vw] border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-[0.4vw] text-rose-600 font-bold text-[0.76vw]">
              <AlertTriangle className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
              <span>Active SLA Breaches</span>
              <span className="ml-[0.2vw] px-[0.45vw] py-[0.1vw] rounded-full bg-rose-100 text-rose-700 font-bold text-[0.65vw]">
                {stats.criticalCalls.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/serviceCall/escalations")}
              className="text-[0.68vw] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-[0.2vw] transition-colors cursor-pointer"
            >
              <span>Manage all</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-start py-[0.35vw] min-h-0 overflow-y-auto">
            {stats.criticalCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center my-auto">
                <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-[0.35vw] text-emerald-600">
                  <Shield className="w-[1.1vw] h-[1.1vw]" strokeWidth={1.8} />
                </div>
                <h4 className="text-[0.76vw] font-bold text-slate-700">
                  No SLA breaches — system healthy
                </h4>
                <p className="text-[0.65vw] text-slate-400 mt-[0.1vw]">
                  All current service calls are operating within expected time limits.
                </p>
              </div>
            ) : (
              <div className="space-y-[0.3vw] overflow-y-auto max-h-full custom-scrollbar pr-[0.1vw]">
                {stats.criticalCalls.map((call) => (
                  <div
                    key={call._id || call.callNumber}
                    onClick={() => navigate("/serviceCall/escalations")}
                    className="flex items-center justify-between p-[0.45vw] rounded-[0.4vw] border border-rose-100 bg-rose-50/30 hover:bg-rose-50/70 hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-rose-600 text-[0.68vw]">
                        {call.callNumber}
                      </div>
                      <div className="text-[0.68vw] font-semibold text-slate-700 mt-[0.05vw]">
                        {call.customerName || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[0.58vw] font-extrabold uppercase tracking-wide text-rose-600 bg-rose-100/70 border border-rose-200 px-[0.35vw] py-[0.1vw] rounded">
                        BREACH
                      </span>
                      <div className="text-[0.62vw] text-slate-400 mt-[0.05vw]">
                        Immediate action
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 4. Bottom Info Notification Bar ───────────────────── */}
      <div className="flex items-center gap-[0.4vw] px-[0.7vw] py-[0.3vw] bg-indigo-50/50 border border-indigo-100/80 rounded-[0.45vw] text-[0.68vw] text-indigo-900/80 flex-shrink-0">
        <Sparkles className="w-[0.75vw] h-[0.75vw] text-indigo-500 shrink-0" strokeWidth={2} />
        <span>
          Keep an eye on SLA breaches and pending approvals to maintain seamless operations.
        </span>
      </div>
    </div>
  );
}
