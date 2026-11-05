import React from "react";
import { Phone, Package, CheckCircle, UserCheck } from "lucide-react";
import { KpiCard, PanelHeader, EmptyState } from "./AdminDashboard";

export default function UserDashboard({ stats, navigate }) {
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
                      className={`text-[0.58vw] px-[0.45vw] py-[0.14vw] rounded-[0.25vw] font-bold uppercase tracking-wide ${
                        call.priority === "Critical"
                          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {call.priority}
                    </span>
                    <span className="text-[0.58vw] px-[0.45vw] py-[0.14vw] rounded-[0.25vw] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                      {call.status}
                    </span>
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

