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
      className="w-[60px] h-5.5 shrink-0 overflow-visible"
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
      className={`relative bg-white rounded-xl p-3 flex flex-col justify-between border transition-all duration-200
        ${
          isAlert
            ? "border-rose-200 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.08)] bg-rose-50/[0.15]"
            : "border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] hover:shadow-md"
        }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isAlert ? "text-rose-600" : "text-slate-700"
          }`}
        >
          {label}
        </p>
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center border ${a.bg} ${a.text} ${a.ring}`}
        >
          <Icon className="w-3 h-3" strokeWidth={2} />
        </div>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-1.5">
        <div>
          <h3
            className={`text-base font-bold leading-none tracking-tight ${
              isAlert ? "text-rose-600" : "text-slate-800"
            }`}
          >
            {value}
          </h3>
          {sub && (
            <p
              className={`text-xs mt-1 font-normal truncate ${
                isAlert ? "text-rose-500" : "text-slate-700"
              }`}
            >
              {sub}
            </p>
          )}
        </div>
        <div className="pb-px">
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
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
      <h3 className={`text-xs font-semibold flex items-center gap-1.5 ${tones[tone]}`}>
        <Icon className="w-3 h-3" strokeWidth={2} />
        {title}
        {count !== undefined && (
          <span className="text-xs font-normal px-1.5 py-px rounded-full bg-slate-100 text-slate-600">
            {count}
          </span>
        )}
      </h3>
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
        >
          {actionLabel}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-4">
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-1.5">
        <Icon className="w-4 h-4 text-slate-700" strokeWidth={2} />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
    </div>
  );
}

/**
 * Relative time formatter for breach alerts (e.g., "Breached just now", "5 days ago")
 */
function formatBreachTime(call) {
  try {
    const timeVal =
      call.breachedAt ||
      call.escalatedAt ||
      call.updatedAt ||
      call.dateTime ||
      call.createdAt;
    if (!timeVal) return "Immediate action";

    const diffMs = Date.now() - new Date(timeVal).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Immediate action";

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return "Breached just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch {
    return "Immediate action";
  }
}

/**
 * Clean SVG Donut Chart with center label
 */
function DonutChart({ segments, total, label = "Total Calls", size = 160 }) {
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const validSegments = segments.filter((s) => s.value > 0);

  return (
    <div
      className="relative flex items-center justify-center shrink-0 w-[141px] h-[141px]"
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
        <span className="text-xl font-bold leading-none text-slate-800">
          {total}
        </span>
        <span className="text-sm font-medium text-slate-700 mt-1">
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
    stats.inProgressMaterials +
    stats.completedMaterials +
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
      label: "Claimed & In Progress",
      value: stats.inProgressMaterials || 0,
      color: "#3b82f6", // Blue
    },
    {
      label: "Completed (Review Needed)",
      value: stats.completedMaterials || 0,
      color: "#8b5cf6", // Violet
    },
    {
      label: "Approved by Admin",
      value: stats.approvedMaterials || 0,
      color: "#10b981", // Green
    },
    {
      label: "Returned by Admin",
      value: stats.deniedMaterials || 0,
      color: "#ef4444", // Red
    },
  ];

  const totalCallsCount = stats.totalCalls || totalRegisteredCalls || 0;
  const totalMaterialsCount = matTotal || 0;

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
      {/* ── 1. Top KPI Cards Row ────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 flex-shrink-0">
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
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* Card: Service Calls Breakdown */}
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-3 py-2.5 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs flex-shrink-0">
            <Activity className="w-3 h-3" strokeWidth={2} />
            <span>Service Calls Breakdown</span>
          </div>

          <div className="flex items-center justify-between gap-5.5 my-auto px-2.5 flex-1 min-h-0">
            {/* Donut Chart */}
            <DonutChart
              segments={callSegments}
              total={totalCallsCount}
              label="Total Calls"
              size={160}
            />

            {/* Legend & Stats Table */}
            <div className="flex-1 space-y-2">
              {callSegments.map((item, idx) => {
                const pct =
                  totalCallsCount > 0
                    ? Math.round((item.value / totalCallsCount) * 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800 font-mono text-xs">
                        {item.value}
                      </span>
                      <span className="text-slate-700 font-mono text-xs w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => navigate("/serviceCall")}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer group"
            >
              <span>View all service calls</span>
              <span className="group-hover:translate-x-0.5 transition-transform">
                &rarr;
              </span>
            </button>
          </div>
        </section>

        {/* Card: Service Materials Breakdown */}
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-3 py-2.5 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs flex-shrink-0">
            <Boxes className="w-3 h-3" strokeWidth={2} />
            <span>Service Materials Breakdown</span>
          </div>

          <div className="flex items-center justify-between gap-5.5 my-auto px-2.5 flex-1 min-h-0">
            {/* Donut Chart */}
            <DonutChart
              segments={materialSegments}
              total={totalMaterialsCount}
              label="Total Items"
              size={160}
            />

            {/* Legend & Stats Table */}
            <div className="flex-1 space-y-2">
              {materialSegments.map((item, idx) => {
                const pct =
                  totalMaterialsCount > 0
                    ? Math.round((item.value / totalMaterialsCount) * 100)
                    : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800 font-mono text-xs">
                        {item.value}
                      </span>
                      <span className="text-slate-700 font-mono text-xs w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => navigate("/serviceMaterial")}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer group"
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
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* Materials Awaiting Approval */}
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-3 py-2.5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs">
              <CheckSquare className="w-3 h-3" strokeWidth={2} />
              <span>Materials Awaiting Approval</span>
              <span className="ml-1 px-1.5 py-px rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                {stats.pendingAdminReviews.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/serviceMaterial")}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Review all</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-1.5 min-h-0 overflow-y-auto">
            {stats.pendingAdminReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center my-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mb-1.5 text-indigo-500 shadow-2xs">
                  <ClipboardList className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <h4 className="text-xs font-semibold text-slate-700">
                  No pending reviews — all clear!
                </h4>
                <p className="text-xs text-slate-700 mt-px">
                  Great job! There are currently no materials awaiting approval.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-1 overflow-y-auto max-h-full custom-scrollbar">
                {stats.pendingAdminReviews.map(({ entry, product }) => (
                  <div
                    key={product._pid}
                    onClick={() => navigate("/serviceMaterial")}
                    className="flex items-center justify-between p-1.5 rounded-md border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {product.productDescription || "—"}
                      </div>
                      <div className="text-xs text-slate-700">
                        {entry.customerName || "—"} • SN:{" "}
                        {product.serialNumber || "—"}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-px rounded">
                      {product.assignedToName || "Assigned"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Active SLA Breaches */}
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] px-3 py-2.5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-xs">
              <AlertTriangle className="w-3 h-3" strokeWidth={2} />
              <span>Active SLA Breaches</span>
              <span className="ml-1 px-1.5 py-px rounded-full bg-rose-100 text-rose-700 font-medium text-xs">
                {stats.criticalCalls.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/serviceCall/escalations")}
              className="text-sm font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Manage all</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-start py-1.5 min-h-0 overflow-y-auto">
            {stats.criticalCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center my-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-1.5 text-emerald-600">
                  <Shield className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <h4 className="text-xs font-semibold text-slate-700">
                  No SLA breaches — system healthy
                </h4>
                <p className="text-xs text-slate-700 mt-px">
                  All current service calls are operating within expected time limits.
                </p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto max-h-full custom-scrollbar pr-px">
                {stats.criticalCalls.map((call) => (
                  <div
                    key={call._id || call.callNumber}
                    onClick={() => navigate("/serviceCall/escalations")}
                    className="flex items-center justify-between p-1.5 rounded-md border border-rose-100 bg-rose-50/30 hover:bg-rose-50/70 hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-medium text-rose-600 text-sm">
                        {call.callNumber}
                      </div>
                      <div className="text-sm font-medium text-slate-700 mt-px">
                        {call.customerName || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wide text-rose-600 bg-rose-100/70 border border-rose-200 px-1.5 py-px rounded">
                        BREACH
                      </span>
                      <div className="text-xs text-slate-700 mt-px">
                        {formatBreachTime(call)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
