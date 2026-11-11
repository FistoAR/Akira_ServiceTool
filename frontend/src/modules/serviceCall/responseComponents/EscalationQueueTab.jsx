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
        <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-300 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-[0.5vw]">
            <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-medium text-slate-800">
              <Shield className="w-[0.95vw] h-[0.95vw] text-indigo-600" />
              Escalated & Assigned Queue
            </span>
            <span className="text-[0.68vw] bg-indigo-50 border border-indigo-200 text-indigo-700 px-[0.45vw] py-[0.1vw] rounded-full font-medium">
              {myEscalations.length} Active Calls
            </span>
          </div>

          <div className="text-[0.76vw] text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{myEscalations.length}</span> calls
          </div>
        </div>

        {/* Table area */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#E9EDF7] sticky top-0 z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
              <tr>
                <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">
                  S.No
                </th>
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
                <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[8.5vw] whitespace-nowrap">
                  SLA Timer
                </th>
                <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">
                  Origin
                </th>
                <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">
                  Status
                </th>
                <th className="py-[0.7vw] px-[0.7vw] text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[9.5vw]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-[0.8vw]">
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
                            className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle text-center font-normal text-slate-700 bg-white whitespace-nowrap text-[0.76vw]"
                          >
                            {(escalationPage - 1) * escalationPageSize + rIdx + 1}
                          </td>
                        )}

                        {/* Date & Time */}
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

                        {/* Call No */}
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
                              {rowCount} Product{rowCount > 1 ? "s" : ""}
                            </div>
                          </td>
                        )}

                        {/* Customer */}
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

                        {/* Product / Issue */}
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
                            <div className="text-[0.7vw] text-slate-500 line-clamp-1 italic mt-[0.1vw]">
                              {prod.callDescription}
                            </div>
                          )}
                        </td>

                        {/* Error Code */}
                        <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          {prod?.errorCode ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-[0.45vw] py-[0.12vw] rounded text-[0.72vw] font-mono font-normal">
                              {prod.errorCode}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>

                        {/* Priority */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
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
                                <span className={`inline-flex items-center justify-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                  {p}
                                </span>
                              );
                            })()}
                          </td>
                        )}

                        {/* SLA Timer */}
                        <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          <div className="inline-flex items-center justify-center gap-[0.35vw]">
                            {prod._attended ? (
                              <span className="inline-flex items-center gap-[0.25vw] text-emerald-700 font-normal text-[0.7vw] bg-emerald-50 border border-emerald-200 px-[0.55vw] py-[0.12vw] rounded-full shadow-2xs">
                                <CheckCircle className="w-[0.75vw] h-[0.75vw]" />
                                Attended
                              </span>
                            ) : callTimer ? (
                              <span
                                className={`inline-flex items-center gap-[0.3vw] font-mono text-[0.72vw] font-normal px-[0.55vw] py-[0.12vw] rounded-full border shadow-2xs ${
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
                                    className="inline-flex items-center justify-center w-[1vw] h-[1vw] rounded bg-rose-200/80 text-rose-800 font-bold text-[0.6vw] border border-rose-300 select-none cursor-help mr-[0.1vw]"
                                  >
                                    R
                                  </span>
                                )}
                                <Clock className="w-[0.7vw] h-[0.7vw]" />
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
                                  <span className="inline-flex items-center gap-[0.25vw] text-rose-700 font-normal text-[0.7vw] bg-rose-50 border border-rose-200 px-[0.55vw] py-[0.12vw] rounded-full animate-pulse shadow-2xs">
                                    <AlertTriangle className="w-[0.7vw] h-[0.7vw]" /> SLA Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-[0.3vw] font-mono text-[0.72vw] font-normal px-[0.55vw] py-[0.12vw] rounded-full border shadow-2xs bg-rose-50 text-rose-800 border-rose-200">
                                    <span
                                      title={`Reverse Escalated${prod._reverseEscalatedFromName ? ` by ${prod._reverseEscalatedFromName}` : ""}${prod._reverseEscalationReason ? `: ${prod._reverseEscalationReason}` : ""}`}
                                      className="inline-flex items-center justify-center w-[1vw] h-[1vw] rounded bg-rose-200/80 text-rose-800 font-bold text-[0.6vw] border border-rose-300 select-none cursor-help mr-[0.1vw]"
                                    >
                                      R
                                    </span>
                                    <Clock className="w-[0.7vw] h-[0.7vw]" />
                                    {formatted}
                                  </span>
                                );
                              })()
                            ) : row.status === "Critical" ? (
                              <span className="inline-flex items-center gap-[0.25vw] text-rose-700 font-normal text-[0.7vw] bg-rose-50 border border-rose-200 px-[0.55vw] py-[0.12vw] rounded-full animate-pulse shadow-2xs">
                                <AlertTriangle className="w-[0.7vw] h-[0.7vw]" /> SLA Expired
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal text-[0.75vw]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Origin Type */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                          >
                            {row.isSelfAssigned || row.registeredBy === loggedInUser?.userId || row.registeredByName === loggedInUser?.name ? (
                              <span className="inline-flex items-center justify-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs whitespace-nowrap">
                                Self Assigned
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs whitespace-nowrap">
                                Assigned
                              </span>
                            )}
                          </td>
                        )}

                        {/* Status / Level */}
                        <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                          {(() => {
                            const lastEsc = prod._escalationHistory?.[prod._escalationHistory.length - 1];
                            const statusText = prod._productClosure?.status || (lastEsc ? `Level ${lastEsc.level || 1}` : "Escalated");
                            return (
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center gap-[0.3vw]">
                                  <span className="text-[0.75vw] text-slate-800 font-normal">
                                    {statusText}
                                  </span>
                                  {prod._isReverseEscalated && (
                                    <span
                                      title={`Reverse Escalated${prod._reverseEscalatedFromName ? ` from ${prod._reverseEscalatedFromName}` : ""}`}
                                      className="inline-flex items-center gap-[0.15vw] px-[0.35vw] py-[0.05vw] rounded text-[0.62vw] font-normal bg-rose-50 text-rose-700 border border-rose-200"
                                    >
                                      <RotateCcw className="w-[0.6vw] h-[0.6vw]" />
                                      Rev
                                    </span>
                                  )}
                                </div>
                                <div className="text-[0.66vw] text-slate-400 font-normal mt-[0.1vw]">
                                  {prod._assignedEngineerName || row.currentEngineerName || "Assigned"}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center justify-center gap-[0.3vw]">
                            {/* Primary Attend/Action Button */}
                            {isActionable && !prod._attended && (
                              <button
                                type="button"
                                onClick={() => handleProductAttend(row.callId || row._id, pIdx)}
                                className="px-[0.7vw] py-[0.3vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-[0.25vw]"
                                title="Attend to halt auto-escalation timer"
                              >
                                <CheckCircle className="w-[0.75vw] h-[0.75vw]" />
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
                                className="px-[0.6vw] py-[0.25vw] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-[0.68vw] font-normal transition-all cursor-pointer shadow-2xs whitespace-nowrap flex items-center gap-[0.2vw]"
                                title="Stop Escalation & Re-assign"
                              >
                                <Slash className="w-[0.65vw] h-[0.65vw]" />
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
                                className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-[0.25vw]"
                                title="Respond or Close Product"
                              >
                                <Edit3 className="w-[0.7vw] h-[0.7vw]" />
                                Respond
                              </button>
                            )}

                            {/* Info button */}
                            {onOpenInfo && (
                              <CustomTooltip text="View Call Details" position="top">
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

                            {/* History button */}
                            <CustomTooltip text="View Lifecycle History" position="top-end">
                              <button
                                type="button"
                                onClick={() => setHistoryModalProduct(row)}
                                className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                title="View Call History"
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
                  <td colSpan="11" className="py-[10vh] text-center text-slate-400 font-bold">
                    No active calls in your escalation queue. All assigned tasks have been attended or resolved.
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
          <div className="flex items-center gap-[0.5vw]">
            <button
              onClick={() => setEscalationPage((p) => Math.max(1, p - 1))}
              disabled={escalationPage === 1}
              className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
            </button>
            <div className="flex gap-[0.3vw]">
              {[...Array(escalationTotalPages)].map((_, i) => {
                const pNum = i + 1;
                return (
                  <button
                    key={pNum}
                    onClick={() => setEscalationPage(pNum)}
                    className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
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
              className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Cancel / Stop Escalation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-full max-w-[32vw] overflow-hidden flex flex-col font-sans">
            <div className="px-[1.2vw] py-[0.85vw] border-b border-slate-200 bg-rose-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-[0.95vw] font-bold text-rose-900 flex items-center gap-[0.4vw]">
                  <Slash className="w-[1vw] h-[1vw] text-rose-600" />
                  Stop / Cancel Escalation
                </h3>
                <div className="text-[0.72vw] text-rose-700 font-mono mt-[0.1vw]">
                  {cancelModal.callNumber} • Product: {cancelModal.prod?.productModel || cancelModal.prod?.itemCode || 'Product'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="p-[0.3vw] text-slate-400 hover:text-slate-600 rounded-[0.4vw] hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-[1vw] h-[1vw]" />
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
              className="p-[1.2vw] flex flex-col gap-[0.85vw]"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-[0.5vw] p-[0.7vw] text-[0.74vw] text-slate-700">
                <span className="font-bold">Current Assignee:</span>{" "}
                <span className="text-indigo-700 font-semibold">{cancelModal.currentAssignee || "None"}</span>
                <p className="text-[0.7vw] text-slate-500 mt-[0.2vw]">
                  Stopping the escalation will halt the timer and notify the current engineer.
                </p>
              </div>

              <div>
                <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.25vw]">
                  Reason for Stopping Escalation *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Handled over phone directly, false escalation, reassigning to senior tech..."
                  className="w-full px-[0.7vw] py-[0.45vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.25vw]">
                  Re-assign To (Optional)
                </label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-[0.7vw] py-[0.45vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                >
                  <option value="">-- Return to Call Assignment Page (Unassigned) --</option>
                  {(employees || []).map((emp) => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.name} ({emp.department || "Service"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-[0.5vw] flex items-center justify-end gap-[0.6vw] border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModal(null)}
                  className="px-[0.9vw] py-[0.4vw] text-[0.78vw] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-[0.4vw] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="px-[1.1vw] py-[0.4vw] text-[0.78vw] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-[0.4vw] transition-colors cursor-pointer flex items-center gap-[0.35vw] shadow-sm disabled:opacity-50"
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
