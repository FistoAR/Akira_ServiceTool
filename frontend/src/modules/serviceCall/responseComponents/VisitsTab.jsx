import React, { useState, useMemo } from "react";
import {
  MapPin,
  Clock,
  Eye,
  History,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const VisitsTab = ({
  type = "Field Visit",
  queue,
  currentUser,
  onRefresh,
  employees,
  onAssignFieldVisit,
  onProductClose,
  onOpenRespond,
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

  const handleCloseVisit = async (callId, pIdx) => {
    try {
      await axios.patch(
        `${API_URL}/service-calls/field-visit/${callId}/close`,
        {
          productIdx: pIdx,
          closedBy: currentUser?.userId,
          closedByName: currentUser?.name,
        }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to close field visit");
    }
  };

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.7vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
            <MapPin className="w-[0.95vw] h-[0.95vw] text-purple-600" />
            Field Visits Desk
          </span>

          {/* Toggle pills */}
          <div className="flex items-center p-[0.2vw] bg-slate-200/70 rounded-[0.5vw] border border-slate-300">
            <button
              type="button"
              onClick={() => { setSubView("assigned"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "assigned" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "assigned" ? "bg-purple-100 text-purple-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {assignedVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("allocated"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "allocated" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Allocated by Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "allocated" ? "bg-indigo-100 text-indigo-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {allocatedVisits.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{currentCalls.length}</span> visits
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
            <tr className="bg-[#e9edf4]">
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Visit Date / Time
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer & Site
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[12vw]">
                {subView === "assigned" ? "Objective & Allocated By" : "Assigned Engineer & Status"}
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[10vw]">
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
                      className="transition-colors bg-white hover:bg-purple-50/20"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                        >
                          {(() => {
                            const dateVal = prod._fieldVisit?.visitDate || row.dateTime || row.timestamp || row.createdAt;
                            try {
                              const d = new Date(dateVal);
                              if (isNaN(d.getTime())) return dateVal || "—";
                              return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                            } catch {
                              return dateVal || "—";
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                            {row.callNumber || row.callNo}
                          </div>
                          <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                            {rowCount} Visit Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                        >
                          <div className="font-semibold text-slate-900 text-[0.82vw]">
                            {row.customerName || row.partyDescription}
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                            {row.site && (
                              <span className="text-[0.68vw] text-slate-600 font-medium">
                                Site: {row.site}
                              </span>
                            )}
                            {row.customerType && (
                              <span
                                className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        <div className="font-medium text-slate-850 text-[0.8vw]">
                          {prod?.productModel || prod?.itemCode || "—"}
                        </div>
                        {prod?.serialNumber && (
                          <div className="text-[0.68vw] text-slate-500 font-mono">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
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

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        {subView === "assigned" ? (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-slate-800">
                              By: {prod._fieldVisit?.assignedByName || "Lead"}
                            </div>
                            <div className="text-[0.72vw] text-slate-600 italic line-clamp-2 mt-[0.1vw]">
                              {prod._fieldVisit?.diagnosisSummary || "Onsite inspection required"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-purple-800">
                              Assigned to: {prod._fieldVisit?.assignedToName || "Technician"}
                            </div>
                            <span className="inline-block mt-[0.15vw] text-[0.68vw] bg-purple-50 text-purple-700 px-[0.4vw] py-[0.05vw] rounded border border-purple-200 font-medium">
                              {prod._fieldVisit?.status || "In Progress"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Manage Field Visit / Closure"
                          >
                            <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                            title="View History"
                          >
                            <History className="w-[0.95vw] h-[0.95vw]" />
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
                    <p className="text-[0.9vw] font-bold text-slate-700">No field visits in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">All field visit allocations are up to date.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
        <div className="text-[0.75vw] text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-800">{currentCalls.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-bold text-slate-800">{Math.min(page * pageSize, currentCalls.length)}</span> of{" "}
          <span className="font-bold text-slate-800">{currentCalls.length}</span> entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
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
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-purple-400 hover:text-purple-600"
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
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { VisitsTab };
