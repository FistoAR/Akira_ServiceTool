import React from "react";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Slash,
  X
} from "lucide-react";
import { getProductStatus, PROD_STATUS_CFG } from "./ResponseConstants";
import { getTypeColor } from "../ServiceCall";

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
      <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
                  {/* Top Bar for Escalations */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-[0.5vw]">
                      <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
                        <Shield className="w-[0.95vw] h-[0.95vw] text-indigo-600" />
                        Escalated & Assigned Queue
                      </span>
                      <span className="text-[0.68vw] bg-indigo-50 border border-indigo-200 text-indigo-700 px-[0.45vw] py-[0.1vw] rounded-full font-bold">
                        {myEscalations.length} Active Calls
                      </span>
                    </div>

                    <div className="text-[0.76vw] text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800">{myEscalations.length}</span> calls
                    </div>
                  </div>

                  {/* Table area */}
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
                        <tr className="bg-[#e9edf4]">
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[3.5vw]">
                            S.No
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                            Date & Time
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                            Call No
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                            Customer
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                            Product / Issue
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Error Code
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Priority
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8.5vw]">
                            SLA Timer
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[7.5vw]">
                            Origin Type
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8.5vw]">
                            Status / Level
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[10vw]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
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
                                  className="transition-colors bg-white hover:bg-indigo-50/20"
                                >
                                  {/* S.No */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap text-[0.75vw] font-bold text-slate-600 bg-white"
                                    >
                                      {(escalationPage - 1) * escalationPageSize + rIdx + 1}
                                    </td>
                                  )}

                                  {/* Date & Time */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                                    >
                                      {(() => {
                                        try {
                                          const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                                          if (isNaN(d.getTime())) return row.dateTime || "—";
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
                                          return `${datePart}, ${timePart}`;
                                        } catch {
                                          return row.dateTime || "—";
                                        }
                                      })()}
                                    </td>
                                  )}

                                  {/* Call No */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                                        {row.callNumber || row.callNo}
                                      </div>
                                      <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                                        {rowCount} Product{rowCount > 1 ? "s" : ""}
                                      </div>
                                    </td>
                                  )}

                                  {/* Customer */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                                    >
                                      <div className="font-semibold text-slate-900 text-[0.82vw]">
                                        {row.customerName || row.partyDescription}
                                      </div>
                                      <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                                        {row.partyCode && (
                                          <span className="text-[0.68vw] text-slate-500 font-mono">
                                            {row.partyCode}
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

                                  {/* Product / Issue */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white">
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

                                  {/* Error Code */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white">
                                    {prod?.errorCode ? (
                                      <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.12vw] rounded text-[0.74vw] font-mono font-medium">
                                        {prod.errorCode}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[0.76vw]">-</span>
                                    )}
                                  </td>

                                  {/* Priority */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                                    >
                                      {(() => {
                                        const p = row.priority || "Medium";
                                        let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        if (p === "Urgent" || p === "Critical")
                                          badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                                        else if (p === "High")
                                          badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                                        else if (p === "Low")
                                          badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                        return (
                                          <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                            {p}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                  )}

                                  {/* SLA Timer */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white">
                                    {prod._attended ? (
                                      <span className="inline-flex items-center gap-[0.25vw] text-emerald-700 font-bold text-[0.74vw] bg-emerald-50 border border-emerald-200 px-[0.5vw] py-[0.15vw] rounded-full">
                                        <CheckCircle className="w-[0.75vw] h-[0.75vw]" />
                                        Attended
                                      </span>
                                    ) : callTimer ? (
                                      <span
                                        className={`inline-flex items-center gap-[0.25vw] font-mono text-[0.76vw] font-bold px-[0.55vw] py-[0.18vw] rounded-[0.4vw] border shadow-2xs ${
                                          callTimer.isExpired
                                            ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                                            : "bg-amber-100 text-amber-900 border-amber-300"
                                        }`}
                                      >
                                        <Clock className="w-[0.75vw] h-[0.75vw]" />
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
                                          <span className="inline-flex items-center gap-[0.25vw] text-rose-800 font-bold text-[0.72vw] bg-rose-100 border border-rose-300 px-[0.5vw] py-[0.15vw] rounded-[0.4vw] animate-pulse">
                                            <AlertTriangle className="w-[0.75vw] h-[0.75vw]" /> SLA Expired
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-[0.25vw] font-mono text-[0.76vw] font-bold px-[0.55vw] py-[0.18vw] rounded-[0.4vw] border shadow-2xs bg-amber-100 text-amber-900 border-amber-300">
                                            <Clock className="w-[0.75vw] h-[0.75vw]" />
                                            {formatted}
                                          </span>
                                        );
                                      })()
                                    ) : row.status === "Critical" ? (
                                      <span className="inline-flex items-center gap-[0.25vw] text-rose-800 font-bold text-[0.72vw] bg-rose-100 border border-rose-300 px-[0.5vw] py-[0.15vw] rounded-[0.4vw] animate-pulse">
                                        <AlertTriangle className="w-[0.75vw] h-[0.75vw]" /> SLA Expired
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[0.74vw]">—</span>
                                    )}
                                  </td>

                                  {/* Origin Type */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                                    >
                                      {row.isSelfAssigned || row.registeredBy === loggedInUser?.userId || row.registeredByName === loggedInUser?.name ? (
                                        <span className="inline-flex items-center px-[0.45vw] py-[0.12vw] rounded-full text-[0.66vw] font-bold bg-amber-50 text-amber-700 border border-amber-250">
                                          Self Assigned
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-[0.45vw] py-[0.12vw] rounded-full text-[0.66vw] font-bold bg-indigo-50 text-indigo-700 border border-indigo-250">
                                          Assigned
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  {/* Status / Level */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white">
                                    {(() => {
                                      const lastEsc = prod._escalationHistory?.[prod._escalationHistory.length - 1];
                                      return (
                                        <div>
                                          <div className="font-semibold text-[0.78vw] text-slate-800">
                                            {prod._productClosure?.status || (lastEsc ? `Level ${lastEsc.level || 1}` : "Escalated")}
                                          </div>
                                          <div className="text-[0.68vw] text-slate-500 font-medium">
                                            {prod._assignedEngineerName || row.currentEngineerName || "Assigned"}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                                    <div className="flex items-center justify-center gap-[0.4vw]">
                                      {/* Primary Attend/Action Button */}
                                      {isActionable && !prod._attended && (
                                        <button
                                          type="button"
                                          onClick={() => handleProductAttend(row.callId || row._id, pIdx)}
                                          className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
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
                                          className="flex items-center gap-[0.25vw] px-[0.55vw] py-[0.28vw] rounded-[0.4vw] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[0.72vw] transition-all cursor-pointer"
                                          title="Stop Escalation & Re-assign"
                                        >
                                          <Slash className="w-[0.7vw] h-[0.7vw]" />
                                          Stop Esc.
                                        </button>
                                      )}

                                      {/* Respond / Modal Action */}
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
                                        className="flex items-center gap-[0.25vw] px-[0.55vw] py-[0.28vw] rounded-[0.4vw] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[0.74vw] transition-all cursor-pointer"
                                        title="Respond or Close Product"
                                      >
                                        <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                                        Respond
                                      </button>

                                      {/* History button */}
                                      <button
                                        type="button"
                                        onClick={() => setHistoryModalProduct(row)}
                                        className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                                        title="View Call History"
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
                            <td colSpan="11" className="text-center py-[3vw] text-slate-500">
                              <p className="text-[0.9vw] font-bold text-slate-700">No active calls in your escalation queue</p>
                              <p className="text-[0.75vw] text-slate-400 mt-[0.2vw]">
                                All assigned escalation tasks have been attended or resolved.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
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
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
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
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
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
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
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
                  <option value="">-- Keep Current Assignee (Cancel Timer Only) --</option>
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
