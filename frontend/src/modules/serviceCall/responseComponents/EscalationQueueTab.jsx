import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Shield,
  Clock,
  User,
  Phone,
  CheckCircle,
  AlertTriangle,
  Flame,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Slash,
  RotateCcw,
  X
} from "lucide-react";
import { getProductStatus, PROD_STATUS_CFG } from "./ResponseConstants";
import { getTypeColor } from "../ServiceCall";
import { CustomTooltip, CustomerInfoCell } from "./CommonUI";

export const EscalationQueueTab = ({
  myEscalations,
  escalationPaginatedCalls,
  escalationPage,
  setEscalationPage,
  escalationTotalPages,
  escalationPageSize,
  loggedInUser,
  employees,
  timers,
  activeActionMenuId,
  setActiveActionMenuId,
  actionMenuCoords,
  setActionMenuCoords,
  handleProductAttend,
  onOpenRespond,
  onOpenInfo,
  setReverseModalItem,
  setSummaryModalRow,
  setHistoryModalProduct,
  setEditingReportItem,
  setEditForm,
  handleDeleteCall,
  onCancelEscalation,
}) => {
  const [cancelModal, setCancelModal] = React.useState(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [newAssignee, setNewAssignee] = React.useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = React.useState(false);
  const isAdmin = loggedInUser?.department === "Admin" || loggedInUser?.role === "Admin" || loggedInUser?.role === "admin";

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        {/* Top Bar for Escalations */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-300 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Escalated & Assigned Queue
            </span>
            <span className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-px rounded-full font-medium">
              {myEscalations.length} Active Calls
            </span>
          </div>

          <div className="text-xs text-slate-700 font-medium">
            Showing <span className="font-bold text-slate-800">{myEscalations.length}</span> calls
          </div>
        </div>

        {/* Table area */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#E9EDF7] sticky top-0 z-20 border-b border-slate-300 text-slate-700 font-bold text-xs">
              <tr>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[43px] whitespace-nowrap">
                  S.No
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 w-[151px] whitespace-nowrap">
                  Date & Time
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 w-[130px] whitespace-nowrap">
                  Call No
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 w-[202px] whitespace-nowrap">
                  Customer
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 w-[202px] whitespace-nowrap">
                  Product / Issue
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[94px] whitespace-nowrap">
                  Error Code
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[94px] whitespace-nowrap">
                  Priority
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[122px] whitespace-nowrap">
                  SLA Timer
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[101px] whitespace-nowrap">
                  Origin
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-2.5 text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[137px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {escalationPaginatedCalls.length > 0 ? (
                escalationPaginatedCalls.map((row, rIdx) => {
                  const allProducts =
                    row._products?.length > 0
                      ? row._products
                      : row.products?.length > 0
                        ? row.products
                        : [{}];

                  const rowCount = allProducts.length;
                  const rowId = row.id || row._id || row.callId;
                  const callTimer = timers.find((t) => t.callNumber === row.callNumber);

                  return allProducts.map((prod, pIdx) => {
                    const isAttended = prod._attended || row.status === "Resolved";
                    const isActionable =
                      (loggedInUser?.department === "Admin" || prod._assignedEngineerId === loggedInUser?.userId) &&
                      !prod._resolved &&
                      prod._productClosure?.status !== "Closed";

                    return (
                      <tr
                        key={`${rowId}-${pIdx}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* S.No */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle text-center font-normal text-slate-700 bg-white whitespace-nowrap text-xs"
                          >
                            {(escalationPage - 1) * escalationPageSize + rIdx + 1}
                          </td>
                        )}

                        {/* Date & Time */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                          >
                            {(() => {
                              try {
                                const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                                if (isNaN(d.getTime())) return <span className="text-xs text-slate-800 font-normal">{row.dateTime || "—"}</span>;
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
                                return <span className="text-xs text-slate-800 font-normal">{row.dateTime || "—"}</span>;
                              }
                            })()}
                          </td>
                        )}

                        {/* Call No */}
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
                              {rowCount} Product{rowCount > 1 ? "s" : ""}
                            </div>
                          </td>
                        )}

                        {/* Customer */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle bg-white max-w-[202px]"
                          >
                            <CustomerInfoCell
                              customerName={row.customerName || row.partyDescription}
                              contactNumber={row.contactNumber}
                              partyCode={row.partyCode}
                            />
                            {row.customerType && (
                              <div className="mt-1">
                                <span
                                  className={`inline-flex items-center justify-center px-2 py-px rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${getTypeColor(
                                    row.customerType,
                                  )}`}
                                >
                                  {row.customerType}
                                </span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Product / Issue */}
                        <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle max-w-[202px]">
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
                            <div className="text-sm text-slate-700 line-clamp-1 italic mt-px">
                              {prod.callDescription}
                            </div>
                          )}
                        </td>

                        {/* Error Code */}
                        <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          {prod?.errorCode ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-sm font-mono font-normal">
                              {prod.errorCode}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-normal">—</span>
                          )}
                        </td>

                        {/* Priority */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                          >
                            {(() => {
                              const p = row.priority || "Medium";
                              let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                              if (p === "Urgent" || p === "Critical")
                                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                              else if (p === "High")
                                badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
                              else if (p === "Low")
                                badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                              return (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                  {p}
                                </span>
                              );
                            })()}
                          </td>
                        )}

                        {/* SLA Timer */}
                        <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {prod._attended ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-normal text-sm bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                                <CheckCircle className="w-3 h-3" />
                                Attended
                              </span>
                            ) : callTimer ? (
                              <span
                                className={`inline-flex items-center gap-1 font-mono text-sm font-normal px-2 py-0.5 rounded-full border shadow-2xs ${
                                  prod._isReverseEscalated
                                    ? callTimer.isExpired
                                      ? "bg-rose-100 text-rose-800 border-rose-400 animate-pulse"
                                      : "bg-rose-50 text-rose-800 border-rose-200 shadow-2xs"
                                    : callTimer.isExpired
                                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {prod._isReverseEscalated && (
                                  <span
                                    title={`Reverse Escalated${prod._reverseEscalatedFromName ? ` by ${prod._reverseEscalatedFromName}` : ""}${prod._reverseEscalationReason ? `: ${prod._reverseEscalationReason}` : ""}`}
                                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-rose-200/80 text-rose-800 font-bold text-xs border border-rose-300 select-none cursor-help mr-px"
                                  >
                                    R
                                  </span>
                                )}
                                <Clock className="w-2.5 h-2.5" />
                                {callTimer.remainingFormatted}
                              </span>
                            ) : (prod._isReverseEscalated && prod._deadline && !prod._attended) ? (
                              (() => {
                                const remainingMs = Math.max(0, new Date(prod._deadline) - new Date());
                                const hours = Math.floor(remainingMs / 3600000);
                                const minutes = Math.floor((remainingMs % 3600000) / 60000);
                                const seconds = Math.floor((remainingMs % 60000) / 1000);
                                const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                                const isExpired = remainingMs === 0;

                                return isExpired ? (
                                  <span className="inline-flex items-center gap-1 text-rose-700 font-normal text-sm bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                                    <AlertTriangle className="w-2.5 h-2.5" /> SLA Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-mono text-sm font-normal px-2 py-0.5 rounded-full border shadow-2xs bg-rose-50 text-rose-800 border-rose-200">
                                    <span
                                      title={`Reverse Escalated${prod._reverseEscalatedFromName ? ` by ${prod._reverseEscalatedFromName}` : ""}${prod._reverseEscalationReason ? `: ${prod._reverseEscalationReason}` : ""}`}
                                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-rose-200/80 text-rose-800 font-bold text-xs border border-rose-300 select-none cursor-help mr-px"
                                    >
                                      R
                                    </span>
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatted}
                                  </span>
                                );
                              })()
                            ) : row.status === "Critical" ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-normal text-sm bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                                <AlertTriangle className="w-2.5 h-2.5" /> SLA Expired
                              </span>
                            ) : (
                              <span className="text-slate-600 font-normal text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Origin Type */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                          >
                            {row.isSelfAssigned || row.registeredBy === loggedInUser?.userId || row.registeredByName === loggedInUser?.name ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs whitespace-nowrap">
                                Self Assigned
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs whitespace-nowrap">
                                Assigned
                              </span>
                            )}
                          </td>
                        )}

                        {/* Status / Level */}
                        <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          {(() => {
                            const lastEsc = prod._escalationHistory?.[prod._escalationHistory.length - 1];
                            const statusText = prod._productClosure?.status || (lastEsc ? `Level ${lastEsc.level || 1}` : "Escalated");
                            return (
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-800 font-normal">
                                    {statusText}
                                  </span>
                                  {prod._isReverseEscalated && (
                                    <span
                                      title={`Reverse Escalated${prod._reverseEscalatedFromName ? ` from ${prod._reverseEscalatedFromName}` : ""}`}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-xs font-normal bg-rose-50 text-rose-700 border border-rose-200"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      Rev
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-700 font-normal mt-px">
                                  {prod._assignedEngineerName || row.currentEngineerName || "Assigned"}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2.5 px-2.5 border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center justify-center gap-1">
                            {/* Primary Attend/Action Button */}
                            {isActionable && !prod._attended && (
                              <button
                                type="button"
                                onClick={() => handleProductAttend(row.callId || row._id, pIdx)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1"
                                title="Attend to halt auto-escalation timer"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Attend
                              </button>
                            )}

                            {/* Admin Stop Escalation Button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModal({
                                    callId: row.callId || row._id,
                                    callNumber: row.callNumber,
                                    prod,
                                    pIdx,
                                    currentAssignee: prod._assignedEngineerName || row.currentEngineerName,
                                  });
                                  setCancelReason("");
                                  setNewAssignee("");
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-sm font-normal transition-all cursor-pointer shadow-2xs whitespace-nowrap flex items-center gap-1"
                                title="Stop Escalation & Re-assign"
                              >
                                <Slash className="w-2.5 h-2.5" />
                                Stop Esc.
                              </button>
                            )}

                            {/* Respond / Modal Action */}
                            {((row.isSelfAssigned || row.noEscalation || row.registeredBy === loggedInUser?.userId || row.registeredByName === loggedInUser?.name) || prod._attended || row.status === "Resolved" || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenRespond({
                                    entry: row,
                                    callId: row.callId || row._id,
                                    prod,
                                    pIdx,
                                  });
                                }}
                                className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1"
                                title="Respond or Close Product"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                Respond
                              </button>
                            )}

                            {/* Info button */}
                            {onOpenInfo && (
                              <CustomTooltip text="View Call Details" position="top">
                                <button
                                  type="button"
                                  onClick={() => onOpenInfo(row)}
                                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
                                  title="View Full Call Details"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </CustomTooltip>
                            )}

                            {/* History button */}
                            <CustomTooltip text="View Lifecycle History" position="top-end">
                              <button
                                type="button"
                                onClick={() => setHistoryModalProduct(row)}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                title="View Call History"
                              >
                                <History className="w-3.5 h-3.5" />
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
                  <td colSpan="11" className="py-[10vh] text-center text-slate-700 font-bold">
                    No active calls in your escalation queue. All assigned tasks have been attended or resolved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-300 bg-white shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Showing{" "}
            <span className="font-bold text-slate-800">
              {myEscalations.length > 0 ? (escalationPage - 1) * escalationPageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(escalationPage * escalationPageSize, myEscalations.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800">
              {myEscalations.length}
            </span>{" "}
            entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEscalationPage((p) => Math.max(1, p - 1))}
              disabled={escalationPage === 1}
              className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-1">
              {[...Array(escalationTotalPages)].map((_, i) => {
                const pNum = i + 1;
                return (
                  <button
                    key={pNum}
                    onClick={() => setEscalationPage(pNum)}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${
                      escalationPage === pNum
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
              onClick={() =>
                setEscalationPage((p) => Math.min(escalationTotalPages, p + 1))
              }
              disabled={escalationPage === escalationTotalPages || escalationTotalPages === 0}
              className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Cancel / Stop Escalation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3.5">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-[461px] overflow-hidden flex flex-col font-sans">
            <div className="px-4 py-3 border-b border-slate-200 bg-rose-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                  <Slash className="w-3.5 h-3.5 text-rose-600" />
                  Stop / Cancel Escalation
                </h3>
                <div className="text-sm text-rose-700 font-mono mt-px">
                  {cancelModal.callNumber} • Product: {cancelModal.prod?.productModel || cancelModal.prod?.itemCode || 'Product'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="p-1 text-slate-700 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!cancelReason.trim()) return;
                setIsSubmittingCancel(true);
                try {
                  const selectedEmp = employees.find((emp) => emp.userId === newAssignee);
                  if (onCancelEscalation) {
                    await onCancelEscalation({
                      callId: cancelModal.callId,
                      pIdx: cancelModal.pIdx,
                      reason: cancelReason,
                      newAssigneeId: selectedEmp?.userId || null,
                      newAssigneeName: selectedEmp?.name || null,
                      newDepartment: selectedEmp?.department || null,
                    });
                  }
                  setCancelModal(null);
                } finally {
                  setIsSubmittingCancel(false);
                }
              }}
              className="p-4 flex flex-col gap-3"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                <span className="font-bold">Current Assignee:</span>{" "}
                <span className="text-indigo-700 font-semibold">{cancelModal.currentAssignee || "None"}</span>
                <p className="text-sm text-slate-700 mt-1">
                  Stopping the escalation will halt the timer and notify the current engineer.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Stopping Escalation *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Handled over phone directly, false escalation, reassigning to senior tech..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Re-assign To (Optional)
                </label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                >
                  <option value="">-- Return to Call Assignment Page (Unassigned) --</option>
                  {(employees || []).map((emp) => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.name} ({emp.department || "Service"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModal(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingCancel ? "Stopping..." : "Confirm & Stop Escalation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
