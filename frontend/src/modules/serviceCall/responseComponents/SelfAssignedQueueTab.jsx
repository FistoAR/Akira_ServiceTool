import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Square,
  UserCheck,
  User,
  Phone,
  PhoneCall,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  History,
  Info,
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { getProductStatus, PROD_STATUS_CFG } from "./ResponseConstants";
import { getTypeColor, getStatusCfg, deriveCallStatus } from "../ServiceCall";
import { CustomTooltip, CustomerInfoCell } from "./CommonUI";

export const SelfAssignedQueueTab = ({
  selectedItems,
  setSelectedItems,
  onBulkDelete,
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
  onOpenInfo,
}) => {
  const [internalSelected, setInternalSelected] = React.useState(new Set());
  const selected = selectedItems || internalSelected;
  const setSelected = setSelectedItems || setInternalSelected;

  const isPageSelected =
    selfAssignedPaginatedCalls.length > 0 &&
    selfAssignedPaginatedCalls.every((r) => selected.has(r.id || r._id || r.callId));

  const isAllFilteredSelected =
    selfAssignedFilteredCalls.length > 0 &&
    selfAssignedFilteredCalls.every((r) => selected.has(r.id || r._id || r.callId));

  const toggleSelect = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  const toggleSelectPage = () => {
    const s = new Set(selected);
    if (isPageSelected) {
      selfAssignedPaginatedCalls.forEach((r) => s.delete(r.id || r._id || r.callId));
    } else {
      selfAssignedPaginatedCalls.forEach((r) => s.add(r.id || r._id || r.callId));
    }
    setSelected(s);
  };

  const selectAllFiltered = () => {
    const s = new Set(selected);
    selfAssignedFilteredCalls.forEach((r) => s.add(r.id || r._id || r.callId));
    setSelected(s);
  };

  const clearAllSelected = () => {
    setSelected(new Set());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Status chips bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-300 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.3vw] bg-white p-[0.25vw] rounded-full border border-slate-200/90 shadow-2xs overflow-x-auto">
          {[
            { label: "All", dot: "bg-slate-400" },
            { label: "Assigned", dot: "bg-indigo-500" },
            { label: "Pending", dot: "bg-amber-500" },
            { label: "Supporting", dot: "bg-sky-500" },
            { label: "Field Visit", dot: "bg-purple-500" },
            { label: "Resolved", dot: "bg-emerald-500" },
          ].map(({ label, dot }) => {
            const isActive = selfAssignedStatus === label;
            const count =
              label === "All"
                ? selfAssignedRawCalls.length
                : selfAssignedRawCalls.filter((c) => {
                    const products = c.products || c._products || [{}];
                    return (
                      products.some((prod) => {
                        const rawStatus = getProductStatus(prod, c.status);
                        const mappedLabel =
                          getStatusCfg(rawStatus).label || "Registered";
                        return mappedLabel === label;
                      }) || c.status === label
                    );
                  }).length;

            return (
              <button
                key={label}
                onClick={() => {
                  setSelfAssignedStatus(label);
                  setSelfAssignedPage(1);
                }}
                className={`flex items-center gap-[0.35vw] px-[0.72vw] py-[0.28vw] rounded-full text-[0.75vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#1a73e8] text-white shadow-xs font-semibold"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {label !== "All" && (
                  <span
                    className={`w-[0.4vw] h-[0.4vw] rounded-full shrink-0 ${
                      isActive ? "bg-white" : dot
                    }`}
                  />
                )}
                <span
                  className={
                    isActive
                      ? "text-white font-medium"
                      : "text-slate-700 font-medium"
                  }
                >
                  {label}
                </span>
                <span
                  className={`text-[0.68vw] font-medium ml-[0.1vw] transition-all ${
                    isActive
                      ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                      : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-[0.6vw]">
          {selected.size > 0 && (
            <div className="flex items-center gap-[0.4vw] bg-blue-50 border border-blue-200 px-[0.6vw] py-[0.18vw] rounded-full text-[0.72vw] text-blue-800 font-medium animate-fadeIn">
              <span>{selected.size} selected</span>
              {onBulkDelete && (
                <button
                  type="button"
                  onClick={() => onBulkDelete(Array.from(selected))}
                  className="text-rose-600 hover:text-rose-800 font-medium ml-[0.3vw] cursor-pointer flex items-center gap-[0.2vw]"
                  title="Delete selected calls"
                >
                  <Trash2 className="w-[0.75vw] h-[0.75vw]" />
                  <span>Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={clearAllSelected}
                className="text-slate-400 hover:text-slate-600 ml-[0.2vw] cursor-pointer"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}

          <div className="text-[0.74vw] text-slate-500 font-medium whitespace-nowrap pl-[0.3vw] flex items-center gap-[0.3vw]">
            <span>Showing</span>
            <span className="font-medium text-slate-800 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded text-[0.72vw]">
              {selfAssignedFilteredCalls.length}
            </span>
            <span>calls</span>
          </div>
        </div>
      </div>

      {/* Table area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#E9EDF7] sticky top-0 z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
            <tr>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[3%] text-center">
                <button
                  type="button"
                  onClick={toggleSelectPage}
                  className="flex items-center justify-center w-full cursor-pointer"
                  title={isPageSelected ? "Deselect page" : "Select page"}
                >
                  {isPageSelected ? (
                    <CheckSquare className="w-[1vw] h-[1vw] text-blue-600" />
                  ) : (
                    <Square className="w-[1vw] h-[1vw] text-slate-400 hover:text-slate-500" />
                  )}
                </button>
              </th>
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
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9.5vw] whitespace-nowrap">
                Caller Details
              </th>
              <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6.5vw] whitespace-nowrap">
                Priority
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
            {isPageSelected &&
              selfAssignedFilteredCalls.length >
                selfAssignedPaginatedCalls.length && (
                <tr>
                  <td
                    colSpan={12}
                    className="bg-blue-50/80 border-b border-blue-200 px-[1.2vw] py-[0.45vw] text-center text-[0.76vw] text-slate-700 font-medium"
                  >
                    {!isAllFilteredSelected ? (
                      <span>
                        All{" "}
                        <span className="font-bold">
                          {selfAssignedPaginatedCalls.length}
                        </span>{" "}
                        calls on this page are selected.{" "}
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer ml-[0.3vw]"
                        >
                          Select all {selfAssignedFilteredCalls.length} calls in
                          queue
                        </button>
                      </span>
                    ) : (
                      <span>
                        All{" "}
                        <span className="font-bold">
                          {selfAssignedFilteredCalls.length}
                        </span>{" "}
                        calls across all pages are selected.{" "}
                        <button
                          type="button"
                          onClick={clearAllSelected}
                          className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer ml-[0.3vw]"
                        >
                          Clear selection
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )}

            {selfAssignedPaginatedCalls.length > 0 ? (
              selfAssignedPaginatedCalls.map((row, rIdx) => {
                const effectiveStatus = row.status;
                const allProducts =
                  row._products?.length > 0
                    ? row._products
                    : row.products?.length > 0
                      ? row.products
                      : [{}];

                let displayProducts = allProducts;
                if (selfAssignedStatus !== "All") {
                  displayProducts = allProducts.filter((prod) => {
                    const rawStatus = getProductStatus(prod, effectiveStatus);
                    const mappedLabel =
                      getStatusCfg(rawStatus).label || "Registered";
                    return (
                      mappedLabel === selfAssignedStatus ||
                      effectiveStatus === selfAssignedStatus
                    );
                  });
                }

                const rowCount = displayProducts.length;
                const rowId = row.id || row._id || row.callId;
                if (rowCount === 0) return null;

                return displayProducts.map((prod, pIdx) => {
                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Checkbox */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle bg-white w-[3%]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelect(rowId)}
                            className="flex items-center justify-center w-full cursor-pointer"
                          >
                            {selected.has(rowId) ? (
                              <CheckSquare className="w-[1vw] h-[1vw] text-blue-600" />
                            ) : (
                              <Square className="w-[1vw] h-[1vw] text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* S.No */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap text-[0.76vw] font-normal text-slate-700 bg-white"
                        >
                          {(selfAssignedPage - 1) * selfAssignedPageSize +
                            rIdx +
                            1}
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

                      {/* Call No */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenInfo) onOpenInfo(row);
                              else if (onOpenRespond)
                                onOpenRespond({
                                  entry: row,
                                  callId: row.callId || row._id,
                                  prod: row.products?.[0] || {},
                                  pIdx: 0,
                                });
                            }}
                            title="Respond / View Details"
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

                      {/* Caller Details */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="flex items-center gap-[0.4vw]">
                            <Phone className="w-[0.85vw] h-[0.85vw] text-slate-400 shrink-0" />
                            <div>
                              <div className="text-[0.78vw] font-normal text-slate-800">
                                {row.contactNumber || "+91 —"}
                              </div>
                              <div className="text-[0.66vw] text-slate-400 capitalize mt-[0.05vw]">
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

                      {/* Origin Type */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {row.isSelfAssigned ||
                          row.registeredBy === loggedInUser?.userId ||
                          row.registeredByName === loggedInUser?.name ? (
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

                      {/* Status */}
                      <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white">
                        {(() => {
                          const status = getProductStatus(
                            prod,
                            effectiveStatus,
                          );
                          const cfg = getStatusCfg(status);
                          return (
                            <span className="inline-flex items-center gap-[0.35vw] text-[0.74vw] font-normal text-slate-700">
                              <span
                                className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`}
                              />
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]"
                        >
                          <div className="flex items-center justify-center gap-[0.3vw]">
                            {/* Respond Button */}
                            <button
                              type="button"
                              onClick={() => {
                                onOpenRespond &&
                                  onOpenRespond({
                                    entry: row,
                                    callId: row.callId || row._id,
                                    prod: row.products?.[0] || {},
                                    pIdx: 0,
                                  });
                              }}
                              className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-[0.25vw]"
                              title="Respond / Resolve"
                            >
                              <Edit3 className="w-[0.7vw] h-[0.7vw]" />
                              Respond
                            </button>

                            {/* Info Button */}
                            <CustomTooltip
                              text="View Details"
                              position="top"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenInfo) onOpenInfo(row);
                                  else if (setSummaryModalRow)
                                    setSummaryModalRow(row);
                                }}
                                className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
                                title="View Call Summary"
                              >
                                <Info className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            </CustomTooltip>

                            {/* Lifecycle History Button */}
                            <CustomTooltip
                              text="View Lifecycle History"
                              position="top-end"
                            >
                              <button
                                type="button"
                                onClick={() => setHistoryModalProduct(row)}
                                className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                title="View Call History"
                              >
                                <History className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            </CustomTooltip>

                            {/* Delete Call */}
                            <CustomTooltip text="Delete Call" position="top-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModalState({
                                    isOpen: true,
                                    row: row,
                                  })
                                }
                                className="p-[0.35vw] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer"
                                title="Delete Call"
                              >
                                <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                              </button>
                            </CustomTooltip>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td
                  colSpan={12}
                  className="py-[10vh] text-center text-slate-400 font-bold"
                >
                  No self-assigned calls found.
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
            {selfAssignedFilteredCalls.length === 0
              ? 0
              : (selfAssignedPage - 1) * selfAssignedPageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-800">
            {Math.min(
              selfAssignedPage * selfAssignedPageSize,
              selfAssignedFilteredCalls.length,
            )}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-800">
            {selfAssignedFilteredCalls.length}
          </span>{" "}
          entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setSelfAssignedPage((p) => Math.max(1, p - 1))}
            disabled={selfAssignedPage === 1}
            className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
          >
            <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
          </button>
          <div className="flex gap-[0.3vw]">
            {[...Array(selfAssignedTotalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setSelfAssignedPage(pNum)}
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                    selfAssignedPage === pNum
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
              setSelfAssignedPage((p) =>
                Math.min(selfAssignedTotalPages, p + 1),
              )
            }
            disabled={
              selfAssignedPage === selfAssignedTotalPages ||
              selfAssignedTotalPages === 0
            }
            className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};
