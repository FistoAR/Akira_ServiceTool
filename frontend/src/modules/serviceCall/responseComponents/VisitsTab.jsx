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
    <div className="bg-white rounded-xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-300 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" />
            Field Visits Desk
          </span>

          {/* Toggle pills */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => { setSubView("assigned"); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                subView === "assigned" ? "bg-white text-[#1a73e8] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${
                subView === "assigned" ? "bg-blue-100 text-[#1a73e8]" : "bg-slate-200 text-slate-700"
              }`}>
                {assignedVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("allocated"); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                subView === "allocated" ? "bg-white text-[#1a73e8] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Allocated by Me</span>
              <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${
                subView === "allocated" ? "bg-blue-100 text-[#1a73e8]" : "bg-slate-200 text-slate-700"
              }`}>
                {allocatedVisits.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-700 font-medium">
          Showing <span className="font-medium text-slate-800">{currentCalls.length}</span> visits
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-36">
                Visit Date / Time
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-32">
                Call No
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-[187px]">
                Customer & Site
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-52">
                Product / Issue
              </th>
              <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap min-w-[94px]">
                Priority
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-44">
                {subView === "assigned" ? "Objective & Allocated By" : "Assigned Engineer & Status"}
              </th>
              <th className="py-2.5 px-2.5 text-center sticky right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-36">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
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
                          className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const dateVal = prod._fieldVisit?.visitDate || row.dateTime || row.timestamp || row.createdAt;
                            try {
                              const d = new Date(dateVal);
                              if (isNaN(d.getTime())) return <span className="text-xs text-slate-800 font-normal">{dateVal || "—"}</span>;
                              const datePart = d.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              });
                              const timePart = d.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                              return (
                                <div className="flex flex-col text-xs text-slate-800 font-normal leading-normal">
                                  <span>{datePart}</span>
                                  <span className="text-sm text-slate-700 mt-0.5">{timePart}</span>
                                </div>
                              );
                            } catch {
                              return <span className="text-xs text-slate-800 font-normal">{dateVal || "—"}</span>;
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenInfo && onOpenInfo(row)}
                            title="View Call Details"
                            className="font-mono text-xs font-normal text-slate-800 hover:text-blue-600 block leading-tight select-text text-left cursor-pointer"
                          >
                            {row.callNumber || row.callNo}
                          </button>
                          <div className="text-sm text-slate-700 mt-0.5">
                            {rowCount} Visit Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle bg-white max-w-52"
                        >
                          <CustomerInfoCell
                            customerName={row.customerName || row.partyDescription}
                            contactNumber={row.contactNumber}
                            partyCode={row.partyCode}
                          />
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {row.site && (
                              <span className="text-sm text-slate-700 font-normal">
                                Site: {row.site}
                              </span>
                            )}
                            {row.customerType && (
                              <span
                                className={`inline-flex items-center justify-center px-2 py-px rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle max-w-52">
                        <CustomTooltip
                          position="top-start"
                          className="max-w-full"
                          content={
                            <div className="flex flex-col gap-0.5 text-left py-px">
                              <div className="font-normal text-slate-200">
                                {prod?.productModel || prod?.itemCode || "—"}
                              </div>
                              {prod?.serialNumber && (
                                <div className="text-xs text-sky-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                  <span className="text-slate-700 font-sans">SN: </span>
                                  <span>{prod.serialNumber}</span>
                                </div>
                              )}
                              {prod?.callDescription && (
                                <div className="text-xs text-slate-600 italic border-t border-slate-700/80 pt-0.5 mt-px">
                                  {prod.callDescription}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="font-normal text-slate-800 text-xs truncate cursor-default">
                            {prod?.productModel || prod?.itemCode || "—"}
                          </div>
                        </CustomTooltip>
                        {prod?.serialNumber && (
                          <div className="text-sm text-slate-700 font-mono mt-px">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-sm text-slate-700 italic mt-px truncate">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                            if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                            else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                            else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            return (
                              <span className={`inline-flex items-center justify-center px-2 py-px rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle">
                        {subView === "assigned" ? (
                          <div className="text-left leading-tight">
                            <div className="text-xs font-normal text-slate-800">
                              By: {prod._fieldVisit?.assignedByName || "Lead"}
                            </div>
                            <div className="text-sm text-slate-700 italic truncate mt-0.5">
                              {prod._fieldVisit?.diagnosisSummary || "Onsite inspection required"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-left leading-tight">
                            <div className="text-xs font-normal text-slate-800">
                              Assigned to: {prod._fieldVisit?.assignedToName || "Technician"}
                            </div>
                            <span className="inline-block mt-0.5 text-xs bg-purple-50 text-purple-700 px-1.5 py-px rounded border border-purple-200 font-normal">
                              {prod._fieldVisit?.status || "In Progress"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 border-b border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            title="Manage Field Visit / Closure"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Respond</span>
                          </button>
                          {onOpenInfo && (
                            <button
                              type="button"
                              onClick={() => onOpenInfo(row)}
                              className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                              title="Call Details"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                            title="View History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-14 text-slate-700">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <MapPin className="w-6 h-6 text-slate-700" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No field visits in this queue</p>
                    <p className="text-xs text-slate-700">All field visit allocations are up to date.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-300 bg-white shrink-0">
        <div className="text-xs text-slate-600 font-medium">
          Showing <span className="font-semibold text-slate-800">{currentCalls.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-semibold text-slate-800">{Math.min(page * pageSize, currentCalls.length)}</span> of{" "}
          <span className="font-semibold text-slate-800">{currentCalls.length}</span> entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-medium transition-all cursor-pointer ${
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
            className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { VisitsTab };
