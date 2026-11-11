import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Edit3
} from "lucide-react";
import { getTypeColor } from "../ServiceCall";
import { CustomerInfoCell, CustomTooltip } from "./CommonUI";

const SupportRequestsTab = ({
  currentUser,
  onRefresh,
  queue,
  employees,
  onProductClose,
  onAssignFieldVisit,
  onSupportRequest,
  onProductAttend,
  onOpenRespond,
  onOpenInfo,
  onOpenHistory,
}) => {
  const [subView, setSubView] = useState("assigned"); // "assigned" | "asked"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const askedForSupportCalls = useMemo(() => {
    return (queue || []).filter((e) =>
      (e.products || []).some(
        (p) =>
          p._assignedEngineerId === currentUser?.userId &&
          p._supportRequested === true &&
          p._productClosure?.status !== "Pending" &&
          p._productClosure?.status !== "Field Visit Required" &&
          p._productClosure?.status !== "Closed"
      )
    );
  }, [queue, currentUser]);

  const assignedForSupportCalls = useMemo(() => {
    return (queue || []).filter((e) =>
      (e.products || []).some(
        (p) =>
          p._supportPersonId === currentUser?.userId &&
          p._supportRequested === true &&
          !p._resolved &&
          p._productClosure?.status !== "Pending" &&
          p._productClosure?.status !== "Closed" &&
          p._productClosure?.status !== "Field Visit Required"
      )
    );
  }, [queue, currentUser]);

  const currentItems = subView === "assigned" ? assignedForSupportCalls : askedForSupportCalls;

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, page, pageSize]);

  const totalPages = Math.ceil(currentItems.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-300 bg-white shrink-0">
        <div className="flex items-center gap-[0.7vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.82vw] font-medium text-slate-800">
            <HelpCircle className="w-[0.95vw] h-[0.95vw] text-[#1a73e8]" />
            Support Desk
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
                {assignedForSupportCalls.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("asked"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-medium transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "asked" ? "bg-white text-[#1a73e8] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Asked by Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-medium ${
                subView === "asked" ? "bg-blue-100 text-[#1a73e8]" : "bg-slate-200 text-slate-700"
              }`}>
                {askedForSupportCalls.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-medium text-slate-800">{currentItems.length}</span> requests
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider">
            <tr>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Date & Time
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="py-[0.7vw] px-[0.7vw] text-center border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[12vw]">
                {subView === "assigned" ? "Requested By & Notes" : "Support Person & Status"}
              </th>
              <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[9vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-[0.8vw]">
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const targetProds = (row.products || []).filter((p) =>
                  subView === "assigned"
                    ? p._supportPersonId === currentUser?.userId && p._supportRequested
                    : p._assignedEngineerId === currentUser?.userId && p._supportRequested
                );
                const allProducts = targetProds.length > 0 ? targetProds : (row.products || [{}]);
                const rowCount = allProducts.length;
                const rowId = row.id || row._id || row.callId;

                return allProducts.map((prod, pIdx) => {
                  const actualIdx = (row.products || []).findIndex((p) => p === prod || (p.serialNumber && p.serialNumber === prod.serialNumber));
                  const safeIdx = actualIdx !== -1 ? actualIdx : pIdx;

                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="hover:bg-slate-50 transition-colors bg-white text-slate-700"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            try {
                              const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                              if (isNaN(d.getTime())) return <span className="text-[0.74vw] text-slate-800 font-normal">{row.dateTime || "—"}</span>;
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
                                <div className="flex flex-col text-[0.74vw] text-slate-800 font-normal leading-normal">
                                  <span>{datePart}</span>
                                  <span className="text-[0.68vw] text-slate-500 mt-[0.14vw]">{timePart}</span>
                                </div>
                              );
                            } catch {
                              return <span className="text-[0.74vw] text-slate-800 font-normal">{row.dateTime || "—"}</span>;
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenInfo && onOpenInfo(row)}
                            title="View Call Details"
                            className="font-mono text-[0.82vw] font-normal text-slate-800 hover:text-blue-600 block leading-tight select-text text-left cursor-pointer"
                          >
                            {row.callNumber || row.callNo}
                          </button>
                          <div className="text-[0.66vw] text-slate-400 mt-[0.14vw]">
                            {rowCount} Support Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle bg-white max-w-[14vw]"
                        >
                          <CustomerInfoCell
                            customerName={row.customerName || row.partyDescription}
                            contactNumber={row.contactNumber}
                            partyCode={row.partyCode}
                          />
                          {row.customerType && (
                            <div className="mt-[0.2vw]">
                              <span
                                className={`inline-flex items-center justify-center px-[0.55vw] py-[0.1vw] rounded-full text-[0.66vw] font-normal border shadow-2xs whitespace-nowrap ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            </div>
                          )}
                        </td>
                      )}

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle max-w-[14vw]">
                        <CustomTooltip
                          position="top-start"
                          className="max-w-full"
                          content={
                            <div className="flex flex-col gap-[0.15vw] text-left py-[0.05vw]">
                              <div className="font-normal text-slate-200">
                                {prod?.productModel || prod?.itemCode || "—"}
                              </div>
                              {prod?.serialNumber && (
                                <div className="text-[0.64vw] text-sky-300 font-mono border-t border-slate-700/80 pt-[0.15vw] mt-[0.05vw]">
                                  <span className="text-slate-400 font-sans">SN: </span>
                                  <span>{prod.serialNumber}</span>
                                </div>
                              )}
                              {prod?.callDescription && (
                                <div className="text-[0.64vw] text-slate-300 italic border-t border-slate-700/80 pt-[0.15vw] mt-[0.05vw]">
                                  {prod.callDescription}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="font-normal text-slate-800 text-[0.8vw] truncate cursor-default">
                            {prod?.productModel || prod?.itemCode || "—"}
                          </div>
                        </CustomTooltip>
                        {prod?.serialNumber && (
                          <div className="text-[0.66vw] text-slate-400 font-mono mt-[0.1vw]">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-[0.68vw] text-slate-500 italic mt-[0.1vw] truncate">
                            {prod.callDescription}
                          </div>
                        )}
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
                              <span className={`inline-flex items-center justify-center px-[0.55vw] py-[0.1vw] rounded-full text-[0.7vw] font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle">
                        {subView === "assigned" ? (
                          <div className="text-left leading-tight">
                            <div className="text-[0.74vw] font-normal text-slate-800">
                              From: {prod._assignedEngineerName || row.currentEngineerName || "Engineer"}
                            </div>
                            <div className="text-[0.68vw] text-slate-500 italic truncate mt-[0.14vw]">
                              {prod._supportNotes || prod._productClosure?.remarks || "Need support"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-left leading-tight">
                            <div className="text-[0.74vw] font-normal text-slate-800">
                              Assigned to: {prod._supportPersonName || "Support Engineer"}
                            </div>
                            <span className="inline-block mt-[0.15vw] text-[0.64vw] bg-blue-50 text-[#1a73e8] px-[0.4vw] py-[0.05vw] rounded border border-blue-200 font-normal">
                              Awaiting Return
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-[0.7vw] px-[0.7vw] border-b border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            title="Respond to Request"
                          >
                            <Edit3 className="w-[0.7vw] h-[0.7vw]" />
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
                      <HelpCircle className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-medium text-slate-700">No support requests in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">Everything is in sync.</p>
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
          Showing <span className="font-semibold text-slate-800">{currentItems.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-semibold text-slate-800">{Math.min(page * pageSize, currentItems.length)}</span> of{" "}
          <span className="font-semibold text-slate-800">{currentItems.length}</span> entries
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

export { SupportRequestsTab };
