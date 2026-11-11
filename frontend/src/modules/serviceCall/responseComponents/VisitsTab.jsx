import React, { useState, useMemo } from "react";
import {
  MapPin,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Edit3
} from "lucide-react";
import { getTypeColor } from "../ServiceCall";
import { CustomerInfoCell, CustomTooltip } from "./CommonUI";

const VisitsTab = ({
  type = "Field Visit",
  queue,
  currentUser,
  onRefresh,
  employees,
  onAssignFieldVisit,
  onProductClose,
  onOpenRespond,
  onOpenInfo,
  onOpenHistory,
}) => {
  const [subView, setSubView] = useState("assigned"); // "assigned" | "allocated"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const activeProducts = useMemo(() => {
    const list = [];
    (queue || []).forEach((call) => {
      (call.products || []).forEach((p, pIdx) => {
        if (
          p._fieldVisit &&
          p._fieldVisit.status !== "Closed" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed"
        ) {
          list.push({ call, p, pIdx });
        }
      });
    });
    return list;
  }, [queue]);

  const allocatedVisits = useMemo(() => {
    return activeProducts.filter(
      ({ p }) =>
        p._fieldVisit.assignedBy === currentUser?.userId &&
        (p._fieldVisit.assignedTo !== currentUser?.userId || p._fieldVisit.status === "Returned")
    );
  }, [activeProducts, currentUser]);

  const assignedVisits = useMemo(() => {
    return activeProducts.filter(
      ({ p }) =>
        p._fieldVisit.assignedTo === currentUser?.userId &&
        p._fieldVisit.status !== "Returned"
    );
  }, [activeProducts, currentUser]);

  const getUniqueCalls = (visits) => {
    const callMap = new Map();
    visits.forEach(({ call, p, pIdx }) => {
      const id = call._id || call.callId || call.id;
      if (!callMap.has(id)) {
        callMap.set(id, { ...call, _matchingVisitProducts: [{ p, pIdx }] });
      } else {
        callMap.get(id)._matchingVisitProducts.push({ p, pIdx });
      }
    });
    return Array.from(callMap.values());
  };

  const currentCalls = useMemo(() => {
    const visits = subView === "assigned" ? assignedVisits : allocatedVisits;
    return getUniqueCalls(visits);
  }, [subView, assignedVisits, allocatedVisits]);

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentCalls.slice(start, start + pageSize);
  }, [currentCalls, page, pageSize]);

  const totalPages = Math.ceil(currentCalls.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-300 bg-white shrink-0">
        <div className="flex items-center gap-[0.7vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.82vw] font-medium text-slate-800">
            <MapPin className="w-[0.95vw] h-[0.95vw] text-[#1a73e8]" />
            Field Visits Desk
          </span>

          {/* Toggle pills */}
          <div className="flex items-center p-[0.15vw] bg-slate-100 rounded-[0.5vw] border border-slate-300">
            <button
              type="button"
              onClick={() => { setSubView("assigned"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-medium transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "assigned" ? "bg-white text-[#1a73e8] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-medium ${
                subView === "assigned" ? "bg-blue-100 text-[#1a73e8]" : "bg-slate-200 text-slate-700"
              }`}>
                {assignedVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("allocated"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-medium transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "allocated" ? "bg-white text-[#1a73e8] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Allocated by Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-medium ${
                subView === "allocated" ? "bg-blue-100 text-[#1a73e8]" : "bg-slate-200 text-slate-700"
              }`}>
                {allocatedVisits.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-medium text-slate-800">{currentCalls.length}</span> visits
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider">
            <tr>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Visit Date / Time
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer & Site
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="py-[0.7vw] px-[0.7vw] text-center border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[12vw]">
                {subView === "assigned" ? "Objective & Allocated By" : "Assigned Engineer & Status"}
              </th>
              <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[10vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const visitProducts = row._matchingVisitProducts || [{ p: row.products?.[0] || {}, pIdx: 0 }];
                const rowCount = visitProducts.length;
                const rowId = row.id || row._id || row.callId;

                return visitProducts.map(({ p: prod, pIdx: safeIdx }, pIdx) => {
                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="hover:bg-slate-50 transition-colors bg-white text-slate-700"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                        >
                          {(() => {
                            const dateVal = prod._fieldVisit?.visitDate || row.dateTime || row.timestamp || row.createdAt;
                            try {
                              const d = new Date(dateVal);
                              if (isNaN(d.getTime())) return dateVal || "—";
                              return (
                                <div>
                                  <div className="font-semibold text-slate-700">
                                    {d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                  </div>
                                </div>
                              );
                            } catch {
                              return dateVal || "—";
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="font-semibold text-[#1a73e8] text-[0.82vw]">
                            {row.callNumber || row.callNo}
                          </div>
                          <div className="text-[0.65vw] text-slate-500 font-medium mt-[0.1vw]">
                            {rowCount} Visit Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle bg-white"
                        >
                          <CustomerInfoCell row={row} />
                          {row.site && (
                            <div className="text-[0.68vw] text-slate-600 font-medium mt-[0.1vw]">
                              Site: {row.site}
                            </div>
                          )}
                        </td>
                      )}

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle">
                        <CustomTooltip
                          content={
                            <div className="space-y-[0.3vw] text-[0.7vw]">
                              <div><span className="font-semibold text-slate-300">Model:</span> {prod?.productModel || "—"}</div>
                              {prod?.serialNumber && <div><span className="font-semibold text-slate-300">SN:</span> {prod.serialNumber}</div>}
                              {prod?.callDescription && <div><span className="font-semibold text-slate-300">Description:</span> {prod.callDescription}</div>}
                            </div>
                          }
                        >
                          <div className="space-y-[0.15vw] cursor-pointer">
                            <div className="font-medium text-slate-900 text-[0.8vw]">
                              {prod?.productModel || prod?.itemCode || "—"}
                            </div>
                            {prod?.serialNumber && (
                              <div className="text-[0.7vw] text-slate-500 font-mono">
                                SN: {prod.serialNumber}
                              </div>
                            )}
                            {prod?.callDescription && (
                              <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic">
                                {prod.callDescription}
                              </div>
                            )}
                          </div>
                        </CustomTooltip>
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                            if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                            else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                            else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            return (
                              <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle">
                        {subView === "assigned" ? (
                          <div>
                            <div className="text-[0.76vw] font-medium text-slate-800">
                              By: {prod._fieldVisit?.assignedByName || "Lead"}
                            </div>
                            <div className="text-[0.72vw] text-slate-600 italic line-clamp-2 mt-[0.1vw]">
                              {prod._fieldVisit?.diagnosisSummary || "Onsite inspection required"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[0.76vw] font-medium text-slate-800">
                              Assigned to: {prod._fieldVisit?.assignedToName || "Technician"}
                            </div>
                            <span className="inline-block mt-[0.15vw] text-[0.68vw] bg-purple-50 text-purple-700 px-[0.4vw] py-[0.05vw] rounded border border-purple-200 font-medium">
                              {prod._fieldVisit?.status || "In Progress"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-[0.7vw] px-[0.7vw] border-b border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="inline-flex items-center gap-[0.3vw] px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            title="Manage Field Visit / Closure"
                          >
                            <Edit3 className="w-[0.75vw] h-[0.75vw]" />
                            <span>Respond</span>
                          </button>
                          {onOpenInfo && (
                            <button
                              type="button"
                              onClick={() => onOpenInfo(row)}
                              className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                              title="Call Details"
                            >
                              <Info className="w-[0.9vw] h-[0.9vw]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                            title="View History"
                          >
                            <History className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-[4vw] text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                    <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <MapPin className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-medium text-slate-700">No field visits in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">All field visit allocations are up to date.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-300 bg-white shrink-0">
        <div className="text-[0.75vw] text-slate-600 font-medium">
          Showing <span className="font-semibold text-slate-800">{currentCalls.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-semibold text-slate-800">{Math.min(page * pageSize, currentCalls.length)}</span> of{" "}
          <span className="font-semibold text-slate-800">{currentCalls.length}</span> entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-slate-300 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
          </button>
          <div className="flex gap-[0.3vw]">
            {[...Array(totalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-medium transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-[#1a73e8] text-white shadow-2xs"
                      : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-[0.35vw] border border-slate-300 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { VisitsTab };
