import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import {
  UserCheck,
  User,
  Phone,
  PhoneCall,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  History,
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { getProductStatus, PROD_STATUS_CFG } from "./ResponseConstants";
import { getTypeColor, getStatusCfg, deriveCallStatus } from "../ServiceCall";

export const SelfAssignedQueueTab = ({
  selfAssignedRawCalls,
  selfAssignedStatus,
  setSelfAssignedStatus,
  setSelfAssignedPage,
  selfAssignedPaginatedCalls,
  selfAssignedPage,
  selfAssignedTotalPages,
  selfAssignedPageSize,
  selfAssignedFilteredCalls = [],
  loggedInUser,
  employees,
  activeActionMenuId,
  setActiveActionMenuId,
  actionMenuCoords,
  setActionMenuCoords,
  onOpenRespond,
  setSummaryModalRow,
  setHistoryModalProduct,
  setEditingReportItem,
  setEditForm,
  handleDeleteCall,
  setDeleteModalState,
  setEditingCall,
  setView,
}) => {
  return (
                <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
                  {/* Status chips bar */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="flex gap-[0.4vw] flex-wrap items-center">
                      {[
                        { label: "All", dot: "bg-slate-400" },
                        { label: "Assigned", dot: "bg-indigo-500" },
                        { label: "Pending", dot: "bg-amber-500" },
                        { label: "Supporting", dot: "bg-cyan-500" },
                        { label: "Field Visit", dot: "bg-teal-500" },
                        { label: "Resolved", dot: "bg-emerald-500" },
                      ].map(({ label, dot }) => {
                        const isActive = selfAssignedStatus === label;
                        const count = label === "All"
                          ? selfAssignedRawCalls.length
                          : selfAssignedRawCalls.filter((c) => {
                              const products = c.products || c._products || [{}];
                              return products.some((prod) => {
                                const rawStatus = getProductStatus(prod, c.status);
                                const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
                                return mappedLabel === label;
                              }) || c.status === label;
                            }).length;

                        return (
                          <button
                            key={label}
                            onClick={() => {
                              setSelfAssignedStatus(label);
                              setSelfAssignedPage(1);
                            }}
                            className={`flex items-center gap-[0.4vw] px-[0.75vw] py-[0.32vw] rounded-full text-[0.78vw] font-semibold cursor-pointer transition-all ${
                              isActive
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            <span className={`w-[0.45vw] h-[0.45vw] rounded-full shrink-0 ${isActive ? "bg-white" : dot}`} />
                            <span>{label}</span>
                            <span
                              className={`text-[0.72vw] px-[0.4vw] py-[0.05vw] rounded-full font-bold ml-[0.1vw] ${
                                isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[0.78vw] text-slate-500 font-medium whitespace-nowrap pl-[0.5vw]">
                      Showing <span className="font-bold text-slate-800">{selfAssignedFilteredCalls.length}</span> calls
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
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                            Product / Issue
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Error Code
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                            Caller Details
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Priority
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[7.5vw]">
                            Origin Type
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8vw]">
                            Status
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[6vw]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selfAssignedPaginatedCalls.length > 0 ? (
                          selfAssignedPaginatedCalls.map((row, rIdx) => {
                            const allProducts =
                              row._products?.length > 0
                                ? row._products
                                : row.products?.length > 0
                                  ? row.products
                                  : [{}];

                            let displayProducts = allProducts;
                            let effectiveStatus = row.status;
                            if (selfAssignedStatus !== "All") {
                              displayProducts = allProducts.filter((prod) => {
                                const rawStatus = getProductStatus(prod, effectiveStatus);
                                const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
                                return mappedLabel === selfAssignedStatus;
                              });
                              if (displayProducts.length === 0 && row.status === selfAssignedStatus) {
                                displayProducts = allProducts;
                              }
                            }

                            const rowCount = displayProducts.length;
                            const rowId = row.id || row._id || row.callId;
                            if (rowCount === 0) return null;

                            return displayProducts.map((prod, pIdx) => {
                              const isResolved =
                                effectiveStatus === "Resolved" ||
                                deriveCallStatus(allProducts, effectiveStatus) === "resolved";
                              const bgClass = isResolved
                                ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                                : "hover:bg-slate-50/70";

                              return (
                                <tr
                                  key={`${rowId}-${pIdx}`}
                                  className="transition-colors bg-white hover:bg-slate-50/70"
                                >
                                  {/* S.No */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap text-[0.75vw] font-bold text-slate-600 bg-white"
                                    >
                                      {(selfAssignedPage - 1) * selfAssignedPageSize + rIdx + 1}
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
                                    <div className="font-medium text-slate-800 text-[0.8vw]">
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

                                  {/* Caller Details */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="flex items-center gap-[0.4vw]">
                                        <Phone className="w-[0.9vw] h-[0.9vw] text-slate-400 shrink-0" />
                                        <div>
                                          <div className="text-[0.8vw] font-medium text-slate-700">
                                            {row.contactNumber || "+91 —"}
                                          </div>
                                          <div className="text-[0.68vw] text-slate-500 capitalize">
                                            {row.mode || "Phone"}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  )}

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

                                  {/* Status */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white">
                                    {(() => {
                                      const status = getProductStatus(prod, effectiveStatus);
                                      const cfg = getStatusCfg(status);
                                      return (
                                        <span className="inline-flex items-center gap-[0.4vw] text-[0.8vw] font-medium text-slate-700">
                                          <span className={`w-[0.5vw] h-[0.5vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                                          {cfg.label}
                                        </span>
                                      );
                                    })()}
                                  </td>

                                  {/* Actions (3-Dot Menu) */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]"
                                    >
                                      <div className="relative inline-block text-left action-menu-container">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (activeActionMenuId === rowId) {
                                              setActiveActionMenuId(null);
                                              setActionMenuCoords(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setActionMenuCoords({
                                                top: rect.bottom + 4,
                                                right: window.innerWidth - rect.right,
                                              });
                                              setActiveActionMenuId(rowId);
                                            }
                                          }}
                                          className="p-[0.4vw] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                          title="Actions"
                                        >
                                          <MoreVertical className="w-[1.1vw] h-[1.1vw]" />
                                        </button>

                                        {/* Action Dropdown Menu via Portal to avoid overflow clipping */}
                                        {activeActionMenuId === rowId && actionMenuCoords && ReactDOM.createPortal(
                                          <div
                                            className="action-menu-portal fixed z-[9999]"
                                            style={{
                                              top: `${actionMenuCoords.top}px`,
                                              right: `${actionMenuCoords.right}px`,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <motion.div
                                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                              animate={{ opacity: 1, scale: 1, y: 0 }}
                                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                              transition={{ duration: 0.12 }}
                                              className="min-w-[10vw] w-max whitespace-nowrap bg-white rounded-[0.5vw] shadow-2xl border border-slate-200 py-[0.4vw] text-left"
                                            >
                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setSummaryModalRow(row);
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                              >
                                                <ClipboardList className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>View Summary</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setEditingCall({
                                                    ...row,
                                                    id: row._id || row.callId || row.id,
                                                    products: row.products || [],
                                                    _editing: true,
                                                  });
                                                  setView("form");
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                              >
                                                <Edit3 className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>Edit Call</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setHistoryModalProduct(row);
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                              >
                                                <History className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>Call History</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setDeleteModalState({
                                                    isOpen: true,
                                                    row: row,
                                                  });
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border-t border-slate-100"
                                              >
                                                <Trash2 className="w-[0.9vw] h-[0.9vw] shrink-0 text-rose-500" />
                                                <span>Delete Call</span>
                                              </button>
                                            </motion.div>
                                          </div>,
                                          document.body
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-[12vh] text-center border-b border-slate-200">
                              <div className="flex flex-col items-center justify-center gap-[0.8vw]">
                                <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                  <PhoneCall className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                                </div>
                                <div className="text-[0.95vw] font-bold text-slate-800">
                                  No self-assigned calls found
                                </div>
                                <div className="text-[0.76vw] text-slate-500 max-w-[22vw]">
                                  No calls match your active filters. Try adjusting your dates, search query or status tab.
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-[1vw] py-[0.55vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="text-[0.75vw] text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-800">
                        {selfAssignedFilteredCalls.length === 0
                          ? 0
                          : (selfAssignedPage - 1) * selfAssignedPageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-slate-800">
                        {Math.min(
                          selfAssignedPage * selfAssignedPageSize,
                          selfAssignedFilteredCalls.length,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-800">
                        {selfAssignedFilteredCalls.length}
                      </span>{" "}
                      entries
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <button
                        onClick={() => setSelfAssignedPage((p) => Math.max(1, p - 1))}
                        disabled={selfAssignedPage === 1}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                      <div className="flex gap-[0.3vw]">
                        {[...Array(selfAssignedTotalPages)].map((_, i) => {
                          const pNum = i + 1;
                          if (
                            selfAssignedTotalPages > 5 &&
                            (pNum < selfAssignedPage - 1 || pNum > selfAssignedPage + 1) &&
                            pNum !== 1 &&
                            pNum !== selfAssignedTotalPages
                          ) {
                            if (pNum === selfAssignedPage - 2 || pNum === selfAssignedPage + 2)
                              return <span key={pNum} className="px-1 text-slate-400 text-[0.75vw]">...</span>;
                            return null;
                          }
                          return (
                            <button
                              key={pNum}
                              onClick={() => setSelfAssignedPage(pNum)}
                              className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                                selfAssignedPage === pNum
                                  ? "bg-teal-600 text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-600"
                              }`}
                            >
                              {pNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() =>
                          setSelfAssignedPage((p) => Math.min(selfAssignedTotalPages, p + 1))
                        }
                        disabled={selfAssignedPage === selfAssignedTotalPages || selfAssignedTotalPages === 0}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                    </div>
                  </div>
                </div>
  );
};
