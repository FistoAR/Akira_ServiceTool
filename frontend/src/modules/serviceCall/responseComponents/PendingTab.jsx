import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  Clock,
  Eye,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Edit3
} from "lucide-react";
import { getTypeColor } from "../ServiceCall";
import { CustomTooltip, CustomerInfoCell } from "./CommonUI";

const PendingTab = ({
  queue,
  currentUser,
  employees,
  onProductClose,
  onAssignFieldVisit,
  onSupportRequest,
  onProductAttend,
  onOpenRespond,
  onOpenInfo,
  onOpenHistory,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const items = useMemo(() => {
    return (queue || []).filter((e) => {
      const hasUserProducts = (e.products || []).some(
        (p) =>
          (p._assignedEngineerId === currentUser?.userId ||
            p._supportPersonId === currentUser?.userId ||
            p._productClosure?.userId === currentUser?.userId) &&
          p._productClosure?.status === "Pending" &&
          !p._supportRequested,
      );
      return hasUserProducts;
    });
  }, [queue, currentUser]);

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-300 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-medium text-slate-800">
            <AlertCircle className="w-[0.95vw] h-[0.95vw] text-amber-500" />
            Pending Checks Queue
          </span>
          <span className="text-[0.68vw] bg-amber-50 border border-amber-200 text-amber-700 px-[0.45vw] py-[0.1vw] rounded-full font-medium">
            {items.length} Pending
          </span>
        </div>
        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-medium text-slate-800">{items.length}</span> calls
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#E9EDF7] sticky top-0 z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
            <tr>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[10.5vw] whitespace-nowrap">
                Date & Time
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">
                Call No
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">
                Customer
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">
                Product / Issue
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6.5vw] whitespace-nowrap">
                Error Code
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6.5vw] whitespace-nowrap">
                Priority
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">
                Pending Remarks
              </th>
              <th className="py-[0.7vw] px-[0.7vw] text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[9.5vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-[0.8vw]">
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const userProds = (row.products || []).filter(
                  (p) =>
                    (p._assignedEngineerId === currentUser?.userId ||
                      p._supportPersonId === currentUser?.userId ||
                      p._productClosure?.userId === currentUser?.userId) &&
                    p._productClosure?.status === "Pending" &&
                    !p._supportRequested,
                );
                const allProducts =
                  userProds.length > 0 ? userProds : row.products || [{}];
                const rowCount = allProducts.length;
                const rowId = row.id || row._id || row.callId;

                return allProducts.map((prod, pIdx) => {
                  const actualIdx = (row.products || []).findIndex(
                    (p) =>
                      p === prod ||
                      (p.serialNumber &&
                        p.serialNumber === prod.serialNumber),
                  );
                  const safeIdx = actualIdx !== -1 ? actualIdx : pIdx;

                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            try {
                              const d = new Date(
                                row.dateTime || row.timestamp || row.createdAt,
                              );
                              if (isNaN(d.getTime()))
                                return (
                                  <span className="text-[0.74vw] text-slate-800 font-normal">
                                    {row.dateTime || "—"}
                                  </span>
                                );
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
                                  <span className="text-[0.68vw] text-slate-500 mt-[0.14vw]">
                                    {timePart}
                                  </span>
                                </div>
                              );
                            } catch {
                              return (
                                <span className="text-[0.74vw] text-slate-800 font-normal">
                                  {row.dateTime || "—"}
                                </span>
                              );
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
                            {rowCount} Pending Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle bg-white max-w-[14vw]"
                        >
                          <CustomerInfoCell
                            customerName={
                              row.customerName || row.partyDescription
                            }
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
                                  <span className="text-slate-400 font-sans">
                                    SN:{" "}
                                  </span>
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
                          <div className="text-[0.7vw] text-slate-500 line-clamp-1 italic mt-[0.1vw]">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                        {prod?.errorCode ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-[0.45vw] py-[0.12vw] rounded text-[0.72vw] font-mono font-normal">
                            {prod.errorCode}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle =
                              "bg-amber-50 text-amber-700 border-amber-200";
                            if (p === "Urgent" || p === "Critical")
                              badgeStyle =
                                "bg-rose-50 text-rose-700 border-rose-200";
                            else if (p === "High")
                              badgeStyle =
                                "bg-orange-50 text-orange-700 border-orange-200";
                            else if (p === "Low")
                              badgeStyle =
                                "bg-emerald-50 text-emerald-700 border-emerald-200";
                            return (
                              <span
                                className={`inline-flex items-center justify-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}
                              >
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle">
                        <span className="inline-flex items-center gap-[0.25vw] text-amber-700 font-normal text-[0.68vw] bg-amber-50 border border-amber-200 px-[0.45vw] py-[0.08vw] rounded-full mb-[0.15vw]">
                          <AlertCircle className="w-[0.65vw] h-[0.65vw] text-amber-500" />{" "}
                          Pending Check
                        </span>
                        <div className="text-[0.74vw] text-slate-700 font-normal line-clamp-2">
                          {prod._productClosure?.remarks ||
                            "No pending remarks recorded"}
                        </div>
                      </td>

                      <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-center gap-[0.3vw]">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenRespond({
                                entry: row,
                                callId: row.callId || row._id,
                                prod,
                                pIdx: safeIdx,
                              })
                            }
                            className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-[0.25vw]"
                            title="Respond / Resolve"
                          >
                            <Edit3 className="w-[0.7vw] h-[0.7vw]" />
                            Respond
                          </button>
                          {onOpenInfo && (
                            <CustomTooltip
                              text="View Details"
                              position="top"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenInfo(row)}
                                className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
                                title="View Full Call Details"
                              >
                                <Info className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            </CustomTooltip>
                          )}
                          <CustomTooltip
                            text="View Lifecycle History"
                            position="top-end"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenHistory(row)}
                              className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                              title="View History"
                            >
                              <History className="w-[0.9vw] h-[0.9vw]" />
                            </button>
                          </CustomTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-[4vw] text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                    <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <AlertCircle className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-medium text-slate-700">No pending checks in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">All checks and tasks are up to date.</p>
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
          Showing{" "}
          <span className="font-bold text-slate-800">
            {items.length > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-800">
            {Math.min(page * pageSize, items.length)}
          </span>{" "}
          of <span className="font-bold text-slate-800">{items.length}</span>{" "}
          entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
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
                      ? "bg-[#1a73e8] text-white shadow-2xs"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600"
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
            className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { PendingTab };
