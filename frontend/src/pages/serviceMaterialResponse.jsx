import React, { useState, useEffect, useMemo, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Package,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Send,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Hash,
  Tag,
  Wrench,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronLeft,
  Shield,
  Plus,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io } from "socket.io-client";
import { useNotification } from "../components/NotificationContext";
import { useSocket } from "../contexts/SocketContext";

const API_URL = import.meta.env.VITE_API_URL;

// ── Storage Keys ───────────────────────────────────────────────────────────────
const INWARD_KEY = "service_material_inward_v2";
const EMPLOYEES_KEY = "employees";

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad = (key, fb = []) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray", size = "sm" }) => {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-100 text-slate-600 border-slate-400",
    gray: "bg-gray-100 text-gray-600 border-slate-400",
    black: "bg-gray-900 text-white border-gray-900",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const sizeMap = {
    xs: "text-[0.58vw] px-[0.35vw] py-[0.08vw]",
    sm: "text-[0.65vw] px-[0.45vw] py-[0.12vw]",
    md: "text-[0.72vw] px-[0.55vw] py-[0.15vw]",
  };
  return (
    <span
      className={`${sizeMap[size]} rounded-full border font-semibold whitespace-nowrap inline-flex items-center ${colorMap[color] || colorMap.gray}`}
    >
      {label}
    </span>
  );
};

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Open: {
    color: "gray",
    icon: AlertCircle,
    bg: "bg-gray-100",
    border: "border-gray-400",
    text: "text-gray-700",
  },
  "Under Testing": {
    color: "blue",
    icon: Wrench,
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-800",
  },
  "Repair in Progress": {
    color: "orange",
    icon: Wrench,
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-800",
  },
  Pending: {
    color: "slate",
    icon: Clock,
    bg: "bg-slate-100",
    border: "border-slate-400",
    text: "text-slate-800",
  },
  Completed: {
    color: "green",
    icon: CheckCircle,
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-800",
  },
  "Not Repairable": {
    color: "red",
    icon: AlertTriangle,
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-800",
  },
};

// ── Read-only Input Field ─────────────────────────────────────────────────────
const RefInput = ({ label, value, icon: Icon, span = 1 }) => (
  <div
    className={`flex flex-col gap-[0.25vw] ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : span === 4 ? "col-span-4" : ""}`}
  >
    <label className="text-[0.75vw] font-semibold text-black flex items-start gap-[0.25vw] text-black">
      {/* {Icon && <Icon className="w-[0.8vw] h-[0.8vw]" />} */}
      {label}
    </label>
    <div className="bg-white border border-gray-400 rounded-[0.4vw] py-[0.45vw] px-[0.6vw] text-[0.8vw] text-gray-900 break-words whitespace-normal overflow-hidden">
      {value || "—"}
    </div>
  </div>
);

const STATUS_OPTIONS = [
  "Under Testing",
  "Repair in Progress",
  "Pending",
  "Completed",
  "Not Repairable",
];
const DISPOSITION_OPTIONS = ["Repaired", "Replaced", "Scrap", "Return As Is"];

const STATUS_CHIPS = [
  { label: "All" },
  { label: "Repair in Progress" },
  { label: "Pending" },
  { label: "Not Repairable" },
  { label: "Under Testing" },
  { label: "Hold" },
  { label: "Completed" },
  { label: "Admin Returned" },
];

const StatsBar = ({
  activeFilter,
  onFilterChange,
  counts,
  totalClaimed,
  itemsPerPage,
  setItemsPerPage,
}) => {
  return (
    <div className="flex items-center justify-between gap-[1vw] w-full flex-wrap">
      <div className="flex items-center gap-[0.75vw] flex-wrap">
        {STATUS_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.label;
          const count = counts[chip.label] || 0;

          return (
            <button
              key={chip.label}
              onClick={() => onFilterChange(chip.label)}
              className={`flex items-center gap-[0.38vw] px-[0.75vw] py-[0.38vw] rounded-full border text-[0.7vw] font-semibold cursor-pointer transition-all duration-150 select-none ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`px-[0.3vw] py-[0.03vw] rounded-full text-[0.6vw] font-semibold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-black/10 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-[1.2vw]">
        <div className="flex items-center gap-[0.5vw]">
          <span className="text-[0.68vw] text-gray-500 font-semibold  tracking-wider">
            Rows per page:
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
            }}
            className="bg-white border border-gray-400 rounded-[0.3vw] px-[0.4vw] py-[0.15vw] text-[0.72vw] font-semibold text-blue-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[0.72vw] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-[0.8vw] py-[0.38vw] rounded-full shadow-sm">
          Total Claimed: {totalClaimed}
        </div>
      </div>
    </div>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-[6vw] bg-white rounded-[0.6vw] border border-gray-400"
  >
    <div className="w-[4vw] h-[4vw] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-[1vw]">
      <Package className="w-[2vw] h-[2vw] text-gray-800" />
    </div>
    <h3 className="text-[1vw] font-semibold text-gray-700 mb-[0.3vw]">
      No Products Assigned
    </h3>
    <p className="text-[0.75vw] text-gray-800 text-center max-w-[18vw]">
      You don't have any inward products assigned to you at the moment.
    </p>
  </motion.div>
);

const ClaimButton = ({ onClaim }) => (
  <button
    onClick={onClaim}
    className="inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.85vw] font-semibold cursor-pointer transition-all bg-emerald-600 text-white shadow-md shadow-emerald-900/10 hover:bg-emerald-700 hover:scale-105 active:scale-95"
  >
    <Plus className="w-[0.75vw] h-[0.75vw]" />
    Claim Item
  </button>
);

// ── Service Info Modal (Read-only) ───────────────────────────────────────────
const ServiceInfoModal = ({ entry, product, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[55vw] max-h-[90vh] rounded-[1vw] shadow-2xl overflow-hidden flex flex-col border border-gray-400"
      >
        <div className="bg-gray-100 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <Info className="w-[1.2vw] h-[1.2vw] text-gray-700" />
            <h3 className="text-[1.1vw] font-semibold text-gray-800  tracking-tight">
              Service Record Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-[2vw] h-[2vw] rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.2vw] bg-gray-50/50">
          {/* Inward Information Card */}
          <div className="space-y-[1vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-400">
            <h4 className="text-[0.85vw] font-semibold text-blue-700 border-b border-blue-100 pb-[0.3vw]">
              Inward Information
            </h4>
            <div className="grid grid-cols-4 gap-[0.8vw]">
              <RefInput label="Registration Date" value={fmtDate(entry.date)} />
              <RefInput label="System Ref No" value={entry.refNo || "—"} />
              <RefInput
                label="Customer Ref No"
                value={entry.refNoCustomer || "—"}
              />
              <RefInput
                label="Internal Ref No"
                value={entry.refNoInternal || "—"}
              />
              <RefInput
                label="Customer"
                value={`${entry.customerName || "—"}${entry.customerCode ? ` (${entry.customerCode})` : ""}`}
                span={2}
              />
              <RefInput label="Category" value={entry.category || "—"} />
              <RefInput label="Unit" value={entry.unit || "—"} />
            </div>
          </div>

          {/* Product Details Card */}
          <div className="space-y-[1vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-400">
            <h4 className="text-[0.85vw] font-semibold text-emerald-700 border-b border-emerald-100 pb-[0.3vw]">
              Product Details
            </h4>
            <div className="grid grid-cols-4 gap-[0.8vw]">
              <div className="col-span-2">
                <RefInput
                  label="Description"
                  value={product.productDescription}
                />
              </div>
              <RefInput label="Code" value={product.productCode} />
              <RefInput label="Qty" value={product.qty || "1"} />
              <RefInput label="Serial Number" value={product.serialNumber} />
              <RefInput label="Board Type" value={product.boardType} />
              <RefInput
                label="Warranty Type"
                value={
                  product.type === "W"
                    ? "Warranty (W)"
                    : product.type === "PW"
                      ? "Post Warranty (PW)"
                      : product.type || "—"
                }
              />
              <RefInput
                label="Expected Delivery Date"
                value={
                  product.expectedDeliveryDate
                    ? fmtDate(product.expectedDeliveryDate)
                    : "—"
                }
              />
            </div>
          </div>

          {product.report && (
            <div className="space-y-[1vw] mt-[1vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-400">
              <h4 className="text-[0.85vw] font-semibold text-gray-800 border-b border-slate-400 pb-[0.3vw]">
                Technical Report
              </h4>
              <div className="grid grid-cols-2 gap-[1vw]">
                <RefInput label="Tested By" value={product.report.testedBy} />
                <RefInput
                  label="Designators"
                  value={product.report.designators}
                />
                <RefInput
                  label="4M Category"
                  value={product.report.fourMCategory}
                />
                <RefInput label="Error Code" value={product.report.errorCode} />
                <RefInput
                  label="Problem Description"
                  value={product.report.problemDescription}
                  span={2}
                />
                <RefInput
                  label="Root Cause"
                  value={product.report.rootCause}
                  span={2}
                />
                <RefInput
                  label="Corrective Action"
                  value={product.report.correctiveAction}
                  span={2}
                />
                <RefInput
                  label="Parts Replaced"
                  value={product.report.partsReplacement}
                  span={2}
                />
                <RefInput label="Status" value={product.report.status} />
                <RefInput
                  label="Disposition"
                  value={product.report.disposition}
                />
                <div className="col-span-2">
                  <label className="text-[0.75vw] font-semibold text-black mb-[0.25vw] block">
                    Technical Image
                  </label>
                  {product.report.image ? (
                    <div className="mt-[0.5vw]">
                      <img
                        src={
                          product.report.image.startsWith("data:") ||
                          product.report.image.startsWith("http")
                            ? product.report.image
                            : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`
                        }
                        alt="Report"
                        className="max-w-[15vw] rounded-[0.4vw] border border-gray-400 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          const url =
                            product.report.image.startsWith("data:") ||
                            product.report.image.startsWith("http")
                              ? product.report.image
                              : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`;
                          // For base64 strings, open in a new window using a clean iframe to bypass browser about:blank restrictions
                          if (url.startsWith("data:")) {
                            const win = window.open();
                            win.document.write(
                              '<iframe src="' +
                                url +
                                '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>',
                            );
                          } else {
                            window.open(url, "_blank");
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-[0.75vw] text-gray-400 italic">
                      No image uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-[1vw] border-t border-slate-400 bg-gray-50 text-right">
          <button
            onClick={onClose}
            className="px-[1.5vw] py-[0.5vw] bg-gray-800 text-white rounded-[0.4vw] font-semibold text-[0.8vw] cursor-pointer"
          >
            Close View
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ServiceMaterialInwardResponse({
  currentUser: propUser,
}) {
  const [entries, setEntries] = useState([]);
  const { socket } = useSocket();
  const { toast } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [infoSelected, setInfoSelected] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [drafts, setDrafts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf"); // "pdf" or "excel"
  const [withHistory, setWithHistory] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showOnlyUnsaved, setShowOnlyUnsaved] = useState(false);
  const [showOnlyUnclaimed, setShowOnlyUnclaimed] = useState(false);
  const [historySelected, setHistorySelected] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
    if (filterStatus !== "All") {
      setShowOnlyUnsaved(false);
      setShowOnlyUnclaimed(false);
    }
  }, [searchTerm, dateFrom, dateTo, filterStatus]);

  const toDateObj = (d) => {
    if (!d) return null;
    const [y, m, day] = d.split("-");
    return new Date(Number(y), Number(m) - 1, Number(day));
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  const getHistoryText = (r) => {
    const empHistory = r.product.report?.history || [];
    const finalHistory = r.product.finalStatusHistory || [];
    const timeline = [];
    empHistory.forEach((h) =>
      timeline.push({
        type: "Employee",
        status: h.status,
        remark: h.remark,
        date: h.timestamp,
      }),
    );
    finalHistory.forEach((h) => {
      const isCompleted = h.status === "Completed";
      timeline.push({
        type: "Admin",
        status: isCompleted ? "Approved" : "Admin Returned",
        remark: h.remarks,
        date: h.timestamp || h.date,
      });
    });
    timeline.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    return timeline
      .map((t, idx) => {
        const stepNum = idx + 1;
        const stepHeader = `${stepNum}) ${fmtDate(t.date)} - ${t.type} (${t.status})`;
        const stepRemark = `   Remarks: ${t.remark || "—"}`;
        return `${stepHeader}\n${stepRemark}`;
      })
      .join("\n\n");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const M = 10;
    const pageWidth = doc.internal.pageSize.width;
    const titleText = "Service Material Report";
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    const textWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - textWidth) / 2, 14);

    doc.setFontSize(8.5);
    doc.setTextColor(80);
    doc.text(
      `Employee: ${currentUser?.name || "—"}  |  Dept: ${currentUser?.department || "—"}`,
      M,
      21,
    );
    doc.text(`Generated: ${new Date().toLocaleString()}`, M, 26);
    const fp = [];
    if (filterStatus !== "All") fp.push(`Status: ${filterStatus}`);
    if (searchTerm) fp.push(`Search: ${searchTerm}`);
    if (dateFrom) fp.push(`From: ${dateFrom}`);
    if (dateTo) fp.push(`To: ${dateTo}`);
    if (fp.length) doc.text(`Filters: ${fp.join(" | ")}`, M, 31);
    const startY = fp.length ? 36 : 31;
    const headers = [
      "S.No",
      "Date",
      "Ref No",
      "Customer Details",
      "Product",
      "Serial No",
      "Board Type",
      "4M Cat.",
      "Error Code",
      "Problem Desc",
      "Root Cause",
      "Parts Replaced",
      "Corrective Action",
      "Disposition",
      "Completion Date",
      "Status",
    ];
    if (withHistory) {
      headers.push("Status History");
    }

    const body = [];
    let lastCustomerKey = null;
    let serialNo = 1;

    myItems.forEach((r) => {
      const customerKey = `${r.entry.customerName}_${r.entry.customerCode}_${r.entry.refNoCustomer}`;
      if (customerKey !== lastCustomerKey) {
        lastCustomerKey = customerKey;
        const customerInfo = [
          r.entry.customerName || "—",
          r.entry.customerCode ? `Code: ${r.entry.customerCode}` : "",
          r.entry.refNoCustomer ? `Cust Ref: ${r.entry.refNoCustomer}` : "",
          r.entry.refNoInternal ? `Int Ref: ${r.entry.refNoInternal}` : "",
          r.entry.category ? `Type: ${r.entry.category}` : "",
          r.entry.unit ? `Unit: ${r.entry.unit}` : "",
        ]
          .filter(Boolean)
          .join("   |   ");

        body.push([
          {
            content: customerInfo,
            colSpan: withHistory ? 17 : 16,
            styles: {
              fillColor: [241, 245, 249],
              fontStyle: "bold",
              textColor: [30, 41, 59],
              halign: "left",
            },
          },
        ]);
      }

      const row = [
        serialNo++,
        fmtDate(r.entry.date),
        r.entry.refNoCustomer || r.entry.refNo || "—",
        "", // Left empty because details are shown in the customer group header row above
        r.product.productDescription || "—",
        r.product.serialNumber || "—",
        r.product.boardType || "—",
        r.product.report?.fourMCategory || "—",
        r.product.report?.errorCode || "—",
        r.product.report?.problemDescription || "—",
        r.product.report?.rootCause || "—",
        r.product.report?.partsReplacement || "—",
        r.product.report?.correctiveAction || "—",
        r.product.report?.disposition || "—",
        r.product.report?.completedDate
          ? fmtDate(r.product.report.completedDate)
          : "—",
        r.product.report?.status || r.product.status || "Open",
      ];
      if (withHistory) {
        row.push(getHistoryText(r));
      }
      body.push(row);
    });

    autoTable(doc, {
      head: [headers],
      body,
      startY,
      theme: "striped",
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: 6.5,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { fontSize: 6, textColor: 40 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
        overflow: "linebreak",
      },
      margin: { top: 10, right: M, bottom: 18, left: M },
    });
    const pc = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} / ${pc}`,
        doc.internal.pageSize.width - 28,
        doc.internal.pageSize.height - M,
      );
      doc.text(
        "Akira Service Tool — Employee Reports",
        M,
        doc.internal.pageSize.height - M,
      );
    }
    doc.save(
      `ServiceReport_${(currentUser?.name || "employee").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  const handleExportExcel = () => {
    if (!myItems.length) return;
    const data = [];
    let lastCustomerKey = null;
    let serialNo = 1;

    myItems.forEach((r) => {
      const customerKey = `${r.entry.customerName}_${r.entry.customerCode}_${r.entry.refNoCustomer}`;
      if (customerKey !== lastCustomerKey) {
        lastCustomerKey = customerKey;
        const customerInfo = [
          r.entry.customerName || "",
          r.entry.customerCode ? `Code: ${r.entry.customerCode}` : "",
          r.entry.refNoCustomer ? `Cust Ref: ${r.entry.refNoCustomer}` : "",
          r.entry.refNoInternal ? `Int Ref: ${r.entry.refNoInternal}` : "",
          r.entry.category ? `Type: ${r.entry.category}` : "",
          r.entry.unit ? `Unit: ${r.entry.unit}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        data.push({
          "S.No": customerInfo,
          Date: "",
          "Ref No": "",
          "Customer Details": "",
          Product: "",
          "Serial No": "",
          "Board Type": "",
          "4M Category": "",
          "Error Code": "",
          "Problem Description": "",
          "Root Cause": "",
          "Parts Replaced": "",
          "Corrective Action": "",
          Disposition: "",
          "Completion Date": "",
          Status: "",
        });
      }

      const row = {
        "S.No": serialNo++,
        Date: fmtDate(r.entry.date),
        "Ref No": r.entry.refNoCustomer || r.entry.refNo || "",
        "Customer Details": "",
        Product: r.product.productDescription || "",
        "Serial No": r.product.serialNumber || "",
        "Board Type": r.product.boardType || "",
        "4M Category": r.product.report?.fourMCategory || "",
        "Error Code": r.product.report?.errorCode || "",
        "Problem Description": r.product.report?.problemDescription || "",
        "Root Cause": r.product.report?.rootCause || "",
        "Parts Replaced": r.product.report?.partsReplacement || "",
        "Corrective Action": r.product.report?.correctiveAction || "",
        Disposition: r.product.report?.disposition || "",
        "Completion Date": r.product.report?.completedDate
          ? fmtDate(r.product.report.completedDate)
          : "",
        Status: r.product.report?.status || r.product.status || "Open",
      };
      if (withHistory) {
        row["Status History"] = getHistoryText(r);
      }
      data.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "My Reports");
    XLSX.writeFile(
      wb,
      `ServiceReport_${(currentUser?.name || "employee").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const getDraft = (productId, product) => {
    if (drafts[productId]) return drafts[productId];
    return {
      testedBy: product.report?.testedBy || "",
      disposition: product.report?.disposition || "",
      fourMCategory: product.report?.fourMCategory || "",
      errorCode: product.report?.errorCode || "",
      problemDescription: product.report?.problemDescription || "",
      rootCause: product.report?.rootCause || "",
      partsReplacement: product.report?.partsReplacement || "",
      correctiveAction: product.report?.correctiveAction || "",
      completedDate: product.report?.completedDate || "",
      status: product.report?.status || "Under Testing",
      currentRemark: "",
      designators: product.report?.designators || "",
      image: product.report?.image || "",
    };
  };

  const handleDraftChange = (productId, product, field, value) => {
    setDrafts((prev) => {
      const existing = prev[productId] || getDraft(productId, product);
      return {
        ...prev,
        [productId]: { ...existing, [field]: value, hasChanges: true },
      };
    });
  };

  const handleImageChange = (productId, product, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDrafts((prev) => {
          const existing = prev[productId] || getDraft(productId, product);
          return {
            ...prev,
            [productId]: {
              ...existing,
              imageFile: file,
              imagePreview: reader.result,
              hasChanges: true,
            },
          };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveRow = async (entry, product, draft, showToastMsg = true) => {
    if (!draft || !draft.hasChanges) return true;

    if (!draft.fourMCategory?.trim()) {
      toast(
        `4M Category is mandatory for ${product.productDescription}`,
        "error",
      );
      return false;
    }
    if (!draft.problemDescription?.trim()) {
      toast(
        `Problem Description is mandatory for ${product.productDescription}`,
        "error",
      );
      return false;
    }
    if (!draft.rootCause?.trim()) {
      toast(
        `Root Cause is mandatory for ${product.productDescription}`,
        "error",
      );
      return false;
    }
    if (!draft.correctiveAction?.trim()) {
      toast(
        `Corrective Action is mandatory for ${product.productDescription}`,
        "error",
      );
      return false;
    }
    if (draft.status === "Completed" && !draft.completedDate) {
      toast(
        `Completed Date is mandatory for ${product.productDescription}`,
        "error",
      );
      return false;
    }

    const historyEntry = {
      status: draft.status,
      disposition: draft.disposition,
      remark: draft.currentRemark,
      timestamp: new Date().toISOString(),
    };

    const updatedReport = {
      testedBy: draft.testedBy,
      disposition: draft.disposition,
      fourMCategory: draft.fourMCategory,
      errorCode: draft.errorCode,
      problemDescription: draft.problemDescription,
      rootCause: draft.rootCause,
      partsReplacement: draft.partsReplacement,
      correctiveAction: draft.correctiveAction,
      completedDate: draft.completedDate,
      status: draft.status,
      currentRemark: draft.currentRemark,
      designators: draft.designators,
      image: product.report?.image || "",
      lastUpdated: new Date().toISOString(),
      history: [...(product.report?.history || []), historyEntry],
    };

    isSavingRef.current = true;
    setSavingStates((prev) => ({ ...prev, [product._pid]: true }));
    try {
      await updateEntry(entry.id, product._pid, updatedReport, draft.imageFile);

      setDrafts((prev) => {
        const next = { ...prev };
        if (next[product._pid]) {
          next[product._pid] = {
            ...next[product._pid],
            hasChanges: false,
            currentRemark: "",
          };
        }
        return next;
      });
      if (showToastMsg) toast("Report saved successfully!");
      if (socket) {
        socket.emit("service-material:change");
      }
      return true;
    } catch (err) {
      if (showToastMsg) toast("Failed to save report.", "error");
      return false;
    } finally {
      setSavingStates((prev) => ({ ...prev, [product._pid]: false }));
      isSavingRef.current = false;
    }
  };

  const handleBulkSave = async () => {
    const productsToSave = [];
    for (const { entry, product } of myItems) {
      const draft = drafts[product._pid];
      if (draft && draft.hasChanges) {
        productsToSave.push({ entry, product, draft });
      }
    }

    if (productsToSave.length === 0) {
      return toast("No changes to save.", "warning");
    }

    isSavingRef.current = true;
    setIsBulkSaving(true);
    try {
      const results = await Promise.all(
        productsToSave.map(({ entry, product, draft }) =>
          saveRow(entry, product, draft, false),
        ),
      );
      const allSuccess = results.every((res) => res);
      if (allSuccess) {
        toast(`Bulk save completed! ${productsToSave.length} items updated.`);
      } else {
        toast("Some items failed validation or saving.", "error");
      }
    } catch (err) {
      toast("An error occurred during bulk save.", "error");
    } finally {
      setIsBulkSaving(false);
      isSavingRef.current = false;
    }
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // Load current user from storage if not provided
  useEffect(() => {
    if (propUser) setCurrentUser(propUser);
  }, [propUser]);

  useEffect(() => {
    if (propUser) return;
    const KEYS = [
      "loggedInUser",
      "currentUser",
      "user",
      "akira_user",
      "auth_user",
    ];
    for (const k of KEYS) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.userId || parsed?.id) {
            setCurrentUser(parsed);
            return;
          }
        } catch {}
      }
    }
  }, [propUser]);

  // Reload data periodically
  const fetchData = async () => {
    try {
      const [materialRes, employeeRes, fourMRes] = await Promise.all([
        axios.get(`${API_URL}/service-material`),
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/master/four-m-categories`),
      ]);
      const mappedEntries = materialRes.data.map((item) => ({
        ...item,
        id: item._id,
      }));
      setEntries(mappedEntries);
      setEmployees(employeeRes.data);
      setFourMCategories(fourMRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setInitialLoading(false);
      setLastSyncTime(new Date());
    }
  };

  useEffect(() => {
    fetchData();

    const socketUrl = API_URL.replace("/api", "");
    const socket = io(socketUrl);

    socket.on("service-materials-changed", () => {
      fetchData();
      if (!isSavingRef.current) {
        playNotificationSound();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Calculate statusCounts and totalClaimed based on current filters
  const { statusCounts, totalClaimed } = useMemo(() => {
    const counts = {
      All: 0,
      "Repair in Progress": 0,
      Pending: 0,
      "Not Repairable": 0,
      "Under Testing": 0,
      Hold: 0,
      Completed: 0,
      "Admin Returned": 0,
    };
    let claimedCount = 0;

    entries.forEach((e) => {
      e.products?.forEach((p) => {
        // Date filter
        const entryDateStr = e.date ? e.date.slice(0, 10) : "";
        if (dateFrom && !dateTo) {
          if (entryDateStr !== dateFrom) return;
        } else {
          const entryDate = entryDateStr ? toDateObj(entryDateStr) : null;
          if (dateFrom && entryDate && entryDate < toDateObj(dateFrom)) return;
          if (dateTo && entryDate && entryDate > toDateObj(dateTo)) return;
        }

        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matches =
            p.productDescription?.toLowerCase().includes(searchLower) ||
            e.customerName?.toLowerCase().includes(searchLower) ||
            (e.refNoCustomer || "").toLowerCase().includes(searchLower) ||
            (e.refNo || "").toLowerCase().includes(searchLower) ||
            (p.serialNumber || "").toLowerCase().includes(searchLower) ||
            (p.boardType || "").toLowerCase().includes(searchLower);
          if (!matches) return;
        }

        const isAssignedToMe =
          p.assignedTo === (currentUser?.userId || currentUser?.id);
        const rawStatus = p.status || p.report?.status || "Open";
        const isUnclaimed = !p.assignedTo;

        // Calculate counts.All with toggles applied
        let matchesAllFilter = false;
        if (isUnclaimed || isAssignedToMe) {
          if (showOnlyUnsaved) {
            if (
              isAssignedToMe &&
              (rawStatus === "Open" || rawStatus === "Assigned")
            ) {
              matchesAllFilter = true;
            }
          } else if (showOnlyUnclaimed) {
            if (isUnclaimed) {
              matchesAllFilter = true;
            }
          } else {
            matchesAllFilter = true;
          }
        }
        if (matchesAllFilter) {
          counts.All++;
        }

        // Calculate other status counts (independent of showOnlyUnsaved / showOnlyUnclaimed)
        if (isAssignedToMe) {
          claimedCount++;
          // Admin returned: employee completed it, admin set a non-Completed final status
          const _isAdminReturned =
            rawStatus === "Completed" &&
            (p.finalStatusHistory?.length ?? 0) > 0 &&
            p.finalStatus !== "Completed";

          if (_isAdminReturned) {
            counts["Admin Returned"]++;
          } else {
            let s = rawStatus === "Open" ? "Pending" : rawStatus;
            if (counts[s] !== undefined) {
              counts[s]++;
            }
          }
        }
      });
    });

    return { statusCounts: counts, totalClaimed: claimedCount };
  }, [
    entries,
    dateFrom,
    dateTo,
    searchTerm,
    currentUser,
    showOnlyUnsaved,
    showOnlyUnclaimed,
  ]);

  // Get products assigned to current user (respecting status tab filtering)
  const myItems = useMemo(() => {
    const res = [];
    entries.forEach((e) => {
      e.products?.forEach((p) => {
        const rawStatus = p.status || p.report?.status || "Open";
        let s = rawStatus === "Open" ? "Pending" : rawStatus;

        const isAssignedToMe =
          p.assignedTo === (currentUser?.userId || currentUser?.id);
        const isUnclaimed = !p.assignedTo;

        // Apply tab filter first
        if (filterStatus === "All") {
          if (!isUnclaimed && !isAssignedToMe) return;

          // In All tab, apply sub-filters
          if (showOnlyUnsaved) {
            if (
              !(
                isAssignedToMe &&
                (rawStatus === "Open" || rawStatus === "Assigned")
              )
            )
              return;
          }
          if (showOnlyUnclaimed) {
            if (!isUnclaimed) return;
          }
        } else if (filterStatus === "Admin Returned") {
          // Admin returned: employee completed, admin set a non-Completed final status
          const _isAdminReturned =
            rawStatus === "Completed" &&
            (p.finalStatusHistory?.length ?? 0) > 0 &&
            p.finalStatus !== "Completed";
          if (!isAssignedToMe || !_isAdminReturned) return;
        } else if (filterStatus === "Completed") {
          const _isAdminReturned =
            rawStatus === "Completed" &&
            (p.finalStatusHistory?.length ?? 0) > 0 &&
            p.finalStatus !== "Completed";
          // Exclude admin-returned from Completed tab
          if (s !== "Completed" || !isAssignedToMe || _isAdminReturned) return;
        } else {
          // In specific status tabs: only show current user's claimed records that match the status tab
          if (s !== filterStatus || !isAssignedToMe) return;
        }

        // Date filter
        const entryDateStr = e.date ? e.date.slice(0, 10) : "";
        if (dateFrom && !dateTo) {
          if (entryDateStr !== dateFrom) return;
        } else {
          const entryDate = entryDateStr ? toDateObj(entryDateStr) : null;
          if (dateFrom && entryDate && entryDate < toDateObj(dateFrom)) return;
          if (dateTo && entryDate && entryDate > toDateObj(dateTo)) return;
        }

        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matches =
            p.productDescription?.toLowerCase().includes(searchLower) ||
            e.customerName?.toLowerCase().includes(searchLower) ||
            (e.refNoCustomer || "").toLowerCase().includes(searchLower) ||
            (e.refNo || "").toLowerCase().includes(searchLower) ||
            (p.serialNumber || "").toLowerCase().includes(searchLower) ||
            (p.boardType || "").toLowerCase().includes(searchLower);
          if (!matches) return;
        }

        res.push({ entry: e, product: p });
      });
    });
    const parseDateStr = (dateStr) => {
      if (!dateStr) return 0;
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      const parsed = new Date(dateStr).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    return res.sort((a, b) => {
      const dA = a.entry.createdAt
        ? new Date(a.entry.createdAt).getTime()
        : parseDateStr(a.entry.date);
      const dB = b.entry.createdAt
        ? new Date(b.entry.createdAt).getTime()
        : parseDateStr(b.entry.date);
      return dB - dA;
    });
  }, [
    entries,
    filterStatus,
    searchTerm,
    dateFrom,
    dateTo,
    currentUser,
    showOnlyUnsaved,
    showOnlyUnclaimed,
  ]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return myItems.slice(startIndex, startIndex + itemsPerPage);
  }, [myItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(myItems.length / itemsPerPage);

  const { errorCodeHistory, problemDescHistory } = useMemo(() => {
    const codes = new Set();
    const descs = new Set();
    entries.forEach((e) => {
      e.products?.forEach((p) => {
        if (p.report?.errorCode) codes.add(p.report.errorCode);
        if (p.report?.problemDescription)
          descs.add(p.report.problemDescription);
      });
    });
    return {
      errorCodeHistory: Array.from(codes),
      problemDescHistory: Array.from(descs),
    };
  }, [entries]);

  // Update handler
  const updateEntry = async (id, productId, report, imageFile) => {
    try {
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("report", JSON.stringify(report));
      if (imageFile) fd.append("image", imageFile);

      const res = await axios.patch(
        `${API_URL}/service-material/${id}/report`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries((prev) => prev.map((e) => (e.id === id ? updatedRow : e)));
      if (socket) {
        socket.emit("service-material:change");
      }
    } catch (err) {
      alert(
        "Failed to update report: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  const claimProduct = async (id, productId) => {
    if (!currentUser) return alert("You must be logged in to claim products.");
    try {
      const res = await axios.patch(
        `${API_URL}/service-material/${id}/claim-product`,
        {
          productId,
          userId: currentUser.userId || currentUser.id,
          userName: currentUser.name,
        },
      );
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries((prev) => prev.map((e) => (e.id === id ? updatedRow : e)));
      if (socket) {
        socket.emit("service-material:change");
      }
    } catch (err) {
      alert(
        "Failed to claim product: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  // Table columns configuration
  const columns = [
    { key: "sno", label: "S. No", align: "text-center" },
    { key: "date", label: "Date", align: "text-left", minW: "min-w-[7vw]" },
    { key: "ref", label: "Ref No", align: "text-left", minW: "min-w-[7vw]" },
    {
      key: "product",
      label: "Product",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "board",
      label: "Board Type",
      align: "text-left",
      minW: "min-w-[8vw]",
    },
    {
      key: "serial",
      label: "Serial No",
      align: "text-left",
      minW: "min-w-[8vw]",
    },
    {
      key: "testedBy",
      label: "Tested By",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "fourM",
      label: "4M Category",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "errorCode",
      label: "Error Code",
      align: "text-left",
      minW: "min-w-[8vw]",
    },
    {
      key: "problemDesc",
      label: "Problem Desc",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "designators",
      label: "Designators",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "rootCause",
      label: "Root Cause",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "partsReplaced",
      label: "Parts Replaced",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "correctiveAction",
      label: "Corrective Action",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "disposition",
      label: "Disposition",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "completionDate",
      label: "Completion Date",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "status",
      label: "Status",
      align: "text-center",
      minW: "min-w-[10vw]",
    },
    {
      key: "remarks",
      label: "Action Remark",
      align: "text-center",
      minW: "min-w-[10vw]",
    },
    { key: "image", label: "Image", align: "text-center", minW: "min-w-[6vw]" },
    { key: "info", label: "Info", align: "text-center" },
    ...(filterStatus !== "All"
      ? [
          {
            key: "history",
            label: "History",
            align: "text-center",
            minW: "min-w-[6vw]",
          },
        ]
      : []),
    ...(filterStatus === "All" || filterStatus === "Admin Returned"
      ? [
          {
            key: "action",
            label: "Action",
            align: "text-center",
            minW: "min-w-[8vw]",
          },
        ]
      : []),
  ];

  return (
    <div className="w-full font-sans">
      <datalist id="errorCodeList">
        {errorCodeHistory?.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>
      <datalist id="problemDescList">
        {problemDescHistory?.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>
      <datalist id="designatorsList">
        {employees?.map((e, i) => (
          <option key={e.userId || e._id || i} value={e.name} />
        ))}
      </datalist>
      {/* ── Search & Date Filters Toolbar ────────────────────────────────────── */}
      <div className="bg-white rounded-[0.7vw] border border-slate-200 shadow-sm mb-[0.9vw] px-[1vw] py-[0.6vw]">
        <div className="flex items-center gap-[0.6vw] flex-wrap">
          {/* Search Input */}
          <div className="relative w-[25vw]">
            <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.78vw] h-[0.78vw] text-gray-400" />
            <input
              type="text"
              placeholder="Search product, customer, ref no…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[1.8vw] pr-[1.6vw] py-[0.38vw] border border-gray-300 rounded-[0.4vw] text-[0.7vw] font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.4vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-[0.65vw] h-[0.65vw]" />
              </button>
            )}
          </div>

          {/* Unsaved & Unclaimed Toggle Buttons */}
          {filterStatus === "All" && (
            <div className="flex items-center gap-[0.5vw]">
              <button
                onClick={() => {
                  setShowOnlyUnsaved((prev) => !prev);
                  if (!showOnlyUnsaved) setShowOnlyUnclaimed(false);
                }}
                className={`flex items-center gap-[0.3vw] px-[0.6vw] py-[0.38vw] rounded-[0.4vw] border text-[0.7vw] font-semibold cursor-pointer transition-all shadow-sm ${
                  showOnlyUnsaved
                    ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-[0.4vw] h-[0.4vw] rounded-full ${showOnlyUnsaved ? "bg-white animate-pulse" : "bg-gray-400"}`}
                />
                <span>Unsaved Records Only</span>
              </button>

              <button
                onClick={() => {
                  setShowOnlyUnclaimed((prev) => !prev);
                  if (!showOnlyUnclaimed) setShowOnlyUnsaved(false);
                }}
                className={`flex items-center gap-[0.3vw] px-[0.6vw] py-[0.38vw] rounded-[0.4vw] border text-[0.7vw] font-semibold cursor-pointer transition-all shadow-sm ${
                  showOnlyUnclaimed
                    ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-[0.4vw] h-[0.4vw] rounded-full ${showOnlyUnclaimed ? "bg-white animate-pulse" : "bg-gray-400"}`}
                />
                <span>Unclaimed Records Only</span>
              </button>
            </div>
          )}

          {/* Date Pickers on the right */}
          <div className="ml-auto flex items-center gap-[0.8vw]">
            {/* Date From */}
            <div className="flex items-center gap-[0.4vw]">
              <span className="text-[0.72vw] font-semibold text-gray-500 whitespace-nowrap">
                From
              </span>
              <div className="relative">
                <Calendar className="absolute left-[0.38vw] top-1/2 -translate-y-1/2 w-[0.7vw] h-[0.7vw] text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-[1.5vw] pr-[0.4vw] py-[0.35vw] border border-gray-300 rounded-[0.38vw] text-[0.68vw] font-medium text-gray-700 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="flex items-center gap-[0.4vw]">
              <span className="text-[0.72vw] font-semibold text-gray-500 whitespace-nowrap">
                To
              </span>
              <div className="relative">
                <Calendar className="absolute left-[0.38vw] top-1/2 -translate-y-1/2 w-[0.7vw] h-[0.7vw] text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-[1.5vw] pr-[0.4vw] py-[0.35vw] border border-gray-300 rounded-[0.38vw] text-[0.68vw] font-medium text-gray-700 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="flex items-center gap-[0.25vw] px-[0.55vw] py-[0.35vw] rounded-[0.38vw] border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 text-[0.68vw] font-semibold transition-all cursor-pointer"
              >
                <X className="w-[0.65vw] h-[0.65vw]" /> Clear
              </button>
            )}
            <div className="flex items-center gap-[0.8vw] flex-shrink-0">
              {/* Last Sync + Refresh */}
              <div className="flex items-center gap-[0.5vw] bg-slate-50 border border-slate-200 px-[0.7vw] py-[0.35vw] rounded-[0.5vw]">
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-[0.6vw] text-slate-400 font-medium tracking-wide">
                    Last Sync
                  </span>
                  <span className="text-[0.7vw] font-semibold text-slate-700 tabular-nums">
                    {lastSyncTime
                      .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .toLowerCase()
                      .replace(/\s+/g, "")}
                  </span>
                </div>
                <button
                  onClick={() => {
                    fetchData();
                    toast("Data refreshed manually");
                  }}
                  className="w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-[0.9vw] h-[0.9vw]" />
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-[0.4vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white px-[0.8vw] py-[0.45vw] rounded-[0.4vw] text-[0.72vw] font-bold shadow-sm transition-all cursor-pointer h-[2.05vw] border-0"
              >
                <Download className="w-[0.9vw] h-[0.9vw]" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-[1vw] gap-[1vw]">
        {/* Left — Status Filter Chips */}
        <div className="flex-1 min-w-0">
          {myItems.length >= 0 && (
            <StatsBar
              counts={statusCounts}
              totalClaimed={totalClaimed}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              activeFilter={filterStatus}
              onFilterChange={setFilterStatus}
            />
          )}
        </div>

        {/* Right — Sync + Refresh */}
      </div>

      {/* Content */}
      {initialLoading ? (
        <div className="bg-white rounded-[0.6vw] border border-gray-400 overflow-hidden shadow-sm flex flex-col h-fit max-h-[72vh]">
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-max border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-blue-50/95 backdrop-blur-md">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} ${col.align} px-[0.8vw] py-[0.8vw] text-[0.82vw] font-semibold text-black whitespace-nowrap border-b border-r border-blue-200 last:border-r-0`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={columns.length} className="text-center py-[6vw]">
                    <div className="flex flex-col items-center gap-[0.7vw]">
                      <Loader2 className="w-[1.8vw] h-[1.8vw] text-blue-600 animate-spin" />
                      <span className="text-[0.82vw] font-semibold text-gray-500">
                        Loading service material data…
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : myItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-[0.6vw] border border-gray-400 overflow-hidden shadow-sm flex flex-col h-fit max-h-[85vh] min-h-[75vh]">
          {/* Table Container with Internal Scroll */}
          <div className="overflow-auto flex-1 min-h-[68vh]">
            <table className="w-full min-w-max border-separate border-spacing-0">
              {/* Table Header */}
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-blue-50/95 backdrop-blur-md">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} ${col.align} px-[0.8vw] py-[0.8vw] text-[0.82vw] font-semibold text-black whitespace-nowrap border-b border-r border-blue-200 last:border-r-0`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  let lastCustomer = null;
                  return paginatedItems.map(({ entry, product }, idx) => {
                    const isNewCustomer = entry.customerName !== lastCustomer;
                    lastCustomer = entry.customerName;

                    const pStatus =
                      product.status || product.report?.status || "Open";
                    const _history = product.report?.history || [];
                    const _lastHistoryRemark =
                      _history.length > 0
                        ? _history[_history.length - 1].remark
                        : "";
                    const pRemark =
                      product.remark ||
                      product.report?.currentRemark ||
                      _lastHistoryRemark ||
                      "—";
                    const statusCfg =
                      STATUS_CONFIG[pStatus] || STATUS_CONFIG["Open"];
                    const StatusIcon = statusCfg.icon;
                    const isHovered = hoveredRow === idx;
                    const isAdminReturnedProduct =
                      pStatus === "Completed" &&
                      (product.finalStatusHistory?.length ?? 0) > 0 &&
                      product.finalStatus !== "Completed";
                    const isClaimedByMe =
                      product.assignedTo ===
                        (currentUser?.userId || currentUser?.id) &&
                      pStatus !== "Completed" &&
                      !isAdminReturnedProduct;
                    // Employee can re-submit from Admin Returned tab
                    const isResubmitting =
                      filterStatus === "Admin Returned" &&
                      isAdminReturnedProduct &&
                      product.assignedTo ===
                        (currentUser?.userId || currentUser?.id);
                    const draft =
                      (isClaimedByMe &&
                        (filterStatus !== "All" ||
                          pStatus === "Open" ||
                          pStatus === "Assigned")) ||
                      isResubmitting
                        ? getDraft(product._pid, product)
                        : null;
                    const hc = (field, val) =>
                      handleDraftChange(product._pid, product, field, val);

                    return (
                      <React.Fragment key={`${entry.id}-${product._pid}`}>
                        {isNewCustomer && (
                          <tr className="bg-slate-50 border-y border-slate-200">
                            <td
                              colSpan={columns.length}
                              className="p-0 border-b border-slate-200 bg-slate-50"
                            >
                              <div className="flex items-center gap-[0.6vw] sticky left-0 w-fit px-[1vw] py-[0.5vw] bg-slate-50 z-10">
                                <div className="w-[0.35vw] h-[1.1vw] bg-slate-400 rounded-full" />
                                <span className="font-bold text-slate-800 text-[0.88vw] tracking-wide">
                                  {entry.customerName}
                                </span>

                                {/* Customer Code */}
                                {entry.customerCode && (
                                  <span className="text-[0.65vw] text-slate-500 font-medium ml-[0.5vw]">
                                    Code: {entry.customerCode}
                                  </span>
                                )}

                                {/* Ref No (Customer) */}
                                {entry.refNoCustomer && (
                                  <span className="text-[0.7vw] font-bold bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                                    Cust Ref: {entry.refNoCustomer}
                                  </span>
                                )}

                                {/* Ref No (Internal) */}
                                {entry.refNoInternal && (
                                  <span className="text-[0.7vw] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                                    Int Ref: {entry.refNoInternal}
                                  </span>
                                )}

                                {/* Category (Cus Type) */}
                                {entry.category && (
                                  <span className="text-[0.7vw] font-semibold text-slate-700 bg-slate-50 border border-gray-600 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                                    Type: {entry.category}
                                  </span>
                                )}

                                {/* Unit */}
                                {entry.unit && (
                                  <span className="text-[0.7vw] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                                    Unit: {entry.unit}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Admin Returned Banner Row */}
                        {isAdminReturnedProduct &&
                          filterStatus === "Admin Returned" && (
                            <tr className="bg-amber-50 border border-amber-300">
                              <td
                                colSpan={columns.length}
                                className="p-0 border-b border-amber-300 bg-amber-50"
                              >
                                <div className="flex items-center gap-[1.2vw] flex-wrap sticky left-0 w-fit px-[1vw] py-[0.6vw] bg-amber-50 z-10">
                                  <div className="flex items-center gap-[0.4vw]">
                                    <span className="inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.2vw] rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-[0.68vw] font-bold">
                                      ↩ Admin Returned
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-[0.5vw] py-[0.15vw] rounded-full border text-[0.65vw] font-semibold ${
                                        product.finalStatus === "Hold"
                                          ? "bg-rose-100 text-rose-800 border-rose-300"
                                          : product.finalStatus ===
                                              "Not Repairable"
                                            ? "bg-slate-200 text-slate-800 border-gray-600"
                                            : "bg-amber-100 text-amber-800 border-amber-300"
                                      }`}
                                    >
                                      {product.finalStatus}
                                    </span>
                                  </div>
                                  {product.finalStatusDate && (
                                    <span className="text-[0.68vw] text-gray-600 font-semibold bg-white border border-amber-200 px-[0.5vw] py-[0.1vw] rounded">
                                      📅{" "}
                                      {(() => {
                                        const dt = new Date(
                                          product.finalStatusDate,
                                        );
                                        if (Number.isNaN(dt.getTime()))
                                          return product.finalStatusDate;
                                        return dt.toLocaleString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        });
                                      })()}
                                    </span>
                                  )}
                                  {product.finalStatusRemarks && (
                                    <span className="text-[0.7vw] text-gray-800 font-semibold bg-white border border-amber-200 px-[0.6vw] py-[0.2vw] rounded-[0.3vw]">
                                      💬 {product.finalStatusRemarks}
                                    </span>
                                  )}
                                  <span className="text-[0.65vw] text-amber-700 font-medium italic ml-auto">
                                    Update status below and save to re-submit
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        <motion.tr
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (idx % itemsPerPage) * 0.03 }}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`transition-all duration-150 ${isHovered ? "bg-blue-50/30" : "bg-white"}`}
                        >
                          {/* S.No */}
                          <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400 bg-white sticky left-0 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                            <span className="inline-flex items-center justify-center w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 text-[0.68vw] font-semibold text-gray-600">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            <div className="flex items-center gap-[0.3vw]">
                              <span className="text-[0.75vw] text-gray-700 font-medium whitespace-nowrap">
                                {entry.date ? fmtDate(entry.date) : "—"}
                              </span>
                            </div>
                          </td>

                          {/* Ref No */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            <span className="text-[0.75vw] font-semibold text-gray-800 whitespace-nowrap">
                              {entry.refNoCustomer || entry.refNo || "—"}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            <div className="min-w-[10vw]">
                              <div
                                className="text-[0.75vw] font-semibold text-gray-800 break-words whitespace-normal"
                                title={product.productDescription}
                              >
                                {product.productDescription}
                              </div>
                              <div className="text-[0.65vw] text-gray-600 mt-[.2vw]">
                                {product.productCode || "—"}
                              </div>
                            </div>
                          </td>

                          {/* Board Type */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            <span className="text-[0.75vw] font-semibold text-gray-700 whitespace-nowrap">
                              {product.boardType || "—"}
                            </span>
                          </td>

                          {/* Serial No */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            <span className="text-[0.75vw] font-semibold text-gray-700 whitespace-nowrap">
                              {product.serialNumber || "—"}
                            </span>
                          </td>

                          {/* Tested By */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <select
                                value={draft.testedBy}
                                onChange={(e) => hc("testedBy", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                              >
                                <option value="">Select</option>
                                {employees
                                  .filter((emp) => emp.role === "User")
                                  .map((e) => (
                                    <option key={e.userId} value={e.name}>
                                      {e.name}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <span className="text-[0.75vw] whitespace-nowrap">
                                {product.report?.testedBy || "—"}
                              </span>
                            )}
                          </td>

                          {/* 4M Category */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <select
                                value={draft.fourMCategory}
                                onChange={(e) =>
                                  hc("fourMCategory", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                              >
                                <option value="">Select</option>
                                {fourMCategories?.map((opt) => (
                                  <option
                                    key={opt._id || opt.id}
                                    value={opt.name}
                                  >
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[0.75vw] whitespace-nowrap">
                                {product.report?.fourMCategory || "—"}
                              </span>
                            )}
                          </td>

                          {/* Error Code */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <input
                                type="text"
                                list="errorCodeList"
                                value={draft.errorCode}
                                onChange={(e) =>
                                  hc("errorCode", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[6vw]"
                                placeholder="Code..."
                              />
                            ) : (
                              <span className="text-[0.75vw] whitespace-nowrap">
                                {product.report?.errorCode || "—"}
                              </span>
                            )}
                          </td>

                          {/* Problem Description */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <input
                                type="text"
                                list="problemDescList"
                                value={draft.problemDescription}
                                onChange={(e) =>
                                  hc("problemDescription", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[10vw]"
                                placeholder="Problem..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.problemDescription || "—"}
                              </span>
                            )}
                          </td>

                          {/* Designators */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <input
                                type="text"
                                list="designatorsList"
                                value={draft.designators}
                                onChange={(e) =>
                                  hc("designators", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                                placeholder="Designator..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.designators || "—"}
                              </span>
                            )}
                          </td>

                          {/* Root Cause */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <textarea
                                value={draft.rootCause}
                                onChange={(e) =>
                                  hc("rootCause", e.target.value)
                                }
                                rows={1}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[10vw] resize-y min-h-[1.5vw]"
                                placeholder="Root Cause..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.rootCause || "—"}
                              </span>
                            )}
                          </td>

                          {/* Parts Replaced */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <textarea
                                value={draft.partsReplacement}
                                onChange={(e) =>
                                  hc("partsReplacement", e.target.value)
                                }
                                rows={1}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[10vw] resize-y min-h-[1.5vw]"
                                placeholder="Parts..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.partsReplacement || "—"}
                              </span>
                            )}
                          </td>

                          {/* Corrective Action */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <textarea
                                value={draft.correctiveAction}
                                onChange={(e) =>
                                  hc("correctiveAction", e.target.value)
                                }
                                rows={1}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[10vw] resize-y min-h-[1.5vw]"
                                placeholder="Action..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.correctiveAction || "—"}
                              </span>
                            )}
                          </td>

                          {/* Disposition */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <select
                                value={draft.disposition}
                                onChange={(e) =>
                                  hc("disposition", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                              >
                                <option value="">Select</option>
                                {DISPOSITION_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.disposition || "—"}
                              </span>
                            )}
                          </td>

                          {/* Completion Date */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <input
                                type="date"
                                value={draft.completedDate}
                                onChange={(e) =>
                                  hc("completedDate", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                              />
                            ) : (
                              <span className="text-[0.75vw] whitespace-nowrap">
                                {product.report?.completedDate
                                  ? fmtDate(product.report.completedDate)
                                  : "—"}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400">
                            {draft ? (
                              <select
                                value={draft.status}
                                onChange={(e) => hc("status", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 font-semibold min-w-[9vw]"
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.25vw] rounded-full border text-[0.68vw] font-semibold whitespace-nowrap ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}
                              >
                                <StatusIcon className="w-[0.8vw] h-[0.8vw]" />
                                {pStatus}
                              </span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400">
                            {draft ? (
                              <input
                                type="text"
                                value={draft.currentRemark}
                                onChange={(e) =>
                                  hc("currentRemark", e.target.value)
                                }
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                                placeholder="Remark..."
                              />
                            ) : (
                              <span className="text-[0.75vw] text-gray-700 font-semibold">
                                {pRemark}
                              </span>
                            )}
                          </td>

                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400 text-center min-w-[8vw]">
                            {draft ? (
                              <div className="flex items-center justify-center gap-[0.5vw]">
                                <input
                                  type="file"
                                  id={`file-${product._pid}`}
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleImageChange(product._pid, product, e)
                                  }
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file-${product._pid}`}
                                  className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.35vw] bg-blue-50 border border-blue-200 text-blue-600 rounded-[0.4vw] cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-sm text-[0.7vw] font-semibold"
                                  title="Upload Image"
                                >
                                  <Upload className="w-[0.8vw] h-[0.8vw]" />
                                  <span>Upload</span>
                                </label>
                                {(draft.imagePreview || draft.image) && (
                                  <div className="w-[2.2vw] h-[2.2vw] rounded-[0.4vw] border border-slate-400 flex-shrink-0 relative group shadow-sm">
                                    <img
                                      src={
                                        draft.imagePreview ||
                                        (draft.image.startsWith("http")
                                          ? draft.image
                                          : `${API_URL?.replace(/\/$/, "") || ""}${draft.image.startsWith("/") ? "" : "/"}${draft.image}`)
                                      }
                                      alt="preview"
                                      className="w-full h-full object-cover rounded-[0.4vw]"
                                    />

                                    {/* Hover Preview Tooltip */}
                                    <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5vw)] z-50 bg-white border border-slate-300 rounded-[0.6vw] shadow-xl p-[0.4vw] w-[12vw] pointer-events-none">
                                      <img
                                        src={
                                          draft.imagePreview ||
                                          (draft.image.startsWith("http")
                                            ? draft.image
                                            : `${API_URL?.replace(/\/$/, "") || ""}${draft.image.startsWith("/") ? "" : "/"}${draft.image}`)
                                        }
                                        alt="hover-preview"
                                        className="w-full h-auto rounded-[0.4vw] object-contain max-h-[12vw]"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : product.report?.image ? (
                              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.4vw] border border-slate-400 relative group shadow-sm mx-auto">
                                <img
                                  src={
                                    product.report.image.startsWith("http")
                                      ? product.report.image
                                      : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`
                                  }
                                  alt="preview"
                                  className="w-full h-full object-cover rounded-[0.4vw]"
                                />

                                {/* Hover Preview Tooltip */}
                                <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5vw)] z-50 bg-white border border-slate-300 rounded-[0.6vw] shadow-xl p-[0.4vw] w-[12vw] pointer-events-none">
                                  <img
                                    src={
                                      product.report.image.startsWith("http")
                                        ? product.report.image
                                        : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`
                                    }
                                    alt="hover-preview"
                                    className="w-full h-auto rounded-[0.4vw] object-contain max-h-[12vw]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[0.75vw] text-gray-400">
                                —
                              </span>
                            )}
                          </td>

                          {/* Info */}
                          <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400">
                            <button
                              onClick={() =>
                                setInfoSelected({ entry, product })
                              }
                              className="text-[0.72vw] text-blue-600 underline hover:text-blue-800 font-semibold transition-all cursor-pointer bg-transparent border-0"
                              title="View Details"
                            >
                              View
                            </button>
                          </td>

                          {/* History */}
                          <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400">
                            {filterStatus !== "All" ? (
                              <button
                                onClick={() =>
                                  setHistorySelected({ entry, product })
                                }
                                className="text-[0.72vw] text-blue-600 underline hover:text-blue-800 font-semibold transition-all cursor-pointer bg-transparent border-0"
                                title="View History"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[0.75vw] text-gray-400">
                                —
                              </span>
                            )}
                          </td>

                          {/* Action — All tab only OR Admin Returned tab save button */}
                          {filterStatus === "All" && (
                            <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400 bg-white sticky right-0 z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                              {product.assignedTo ? (
                                isClaimedByMe ? (
                                  pStatus === "Open" ||
                                  pStatus === "Assigned" ? (
                                    <button
                                      onClick={() =>
                                        saveRow(entry, product, draft)
                                      }
                                      disabled={
                                        !draft?.hasChanges ||
                                        savingStates[product._pid]
                                      }
                                      className={`inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.85vw] font-semibold transition-all ${savingStates[product._pid] ? "bg-blue-400 text-white cursor-not-allowed" : draft?.hasChanges ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-md" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                                    >
                                      {savingStates[product._pid] ? (
                                        <>
                                          <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="w-[0.75vw] h-[0.75vw]" />
                                          Save
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center">
                                      <span
                                        className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.18vw] rounded-full text-[0.65vw] font-bold border ${statusCfg.badge || "bg-gray-100 text-gray-700"}`}
                                      >
                                        <StatusIcon className="w-[0.65vw] h-[0.65vw]" />
                                        {pStatus}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <div className="flex flex-col items-center justify-center">
                                    <span
                                      className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.18vw] rounded-full text-[0.65vw] font-bold border ${statusCfg.badge || "bg-gray-100 text-gray-700"}`}
                                    >
                                      <StatusIcon className="w-[0.65vw] h-[0.65vw]" />
                                      {pStatus}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <ClaimButton
                                  onClaim={() =>
                                    claimProduct(entry.id, product._pid)
                                  }
                                />
                              )}
                            </td>
                          )}
                          {/* Admin Returned tab — Re-submit Save button */}
                          {filterStatus === "Admin Returned" && (
                            <td className="px-[0.8vw] py-[0.7vw] text-center border border-gray-400 bg-white sticky right-0 z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                              {isResubmitting ? (
                                <button
                                  onClick={async () => {
                                    const saved = await saveRow(
                                      entry,
                                      product,
                                      draft,
                                    );
                                    if (saved) {
                                      // Reset finalStatus so admin can review again
                                      try {
                                        await axios.patch(
                                          `${API_URL}/service-material/${entry.id}/product/${product._pid}/final-status`,
                                          {
                                            finalStatus: "Pending",
                                            finalStatusRemarks: "",
                                            finalStatusDate: "",
                                          },
                                        );
                                      } catch (e) {
                                        console.error(
                                          "Failed to reset final status",
                                          e,
                                        );
                                      }
                                    }
                                  }}
                                  disabled={
                                    !draft?.hasChanges ||
                                    savingStates[product._pid]
                                  }
                                  className={`inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.75vw] font-semibold transition-all ${
                                    savingStates[product._pid]
                                      ? "bg-amber-400 text-white cursor-not-allowed"
                                      : draft?.hasChanges
                                        ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-md"
                                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  {savingStates[product._pid] ? (
                                    <>
                                      <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-[0.75vw] h-[0.75vw]" />
                                      Re-Submit
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[0.75vw] text-gray-400">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                        </motion.tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 border-t border-slate-400 px-[1.2vw] py-[0.6vw] flex items-center justify-between">
            <div className="flex items-center gap-[1.5vw]">
              <span className="text-[0.72vw] text-gray-500 font-medium">
                Showing{" "}
                <strong className="text-gray-800">
                  {paginatedItems.length}
                </strong>{" "}
                of <strong className="text-gray-800">{myItems.length}</strong>{" "}
                products
              </span>

              {/* Pagination Controls */}
              <div className="flex items-center gap-[0.6vw] border-l border-gray-400 pl-[1.5vw]">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-[0.3vw] rounded-[0.4vw] bg-white border border-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm group cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-blue-600" />
                </button>

                <div className="flex items-center gap-[0.4vw] px-[0.6vw] py-[0.15vw] bg-blue-50 border border-blue-100 rounded-[0.3vw]">
                  <span className="text-[0.72vw] font-semibold text-blue-700">
                    {currentPage}
                  </span>
                  <span className="text-[0.65vw] font-medium text-blue-300">
                    /
                  </span>
                  <span className="text-[0.72vw] font-semibold text-gray-600">
                    {totalPages || 1}
                  </span>
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="p-[0.3vw] rounded-[0.4vw] bg-white border border-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm group cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-blue-600" />
                </button>
              </div>
            </div>

            {filterStatus !== "Completed" && (
              <button
                onClick={handleBulkSave}
                disabled={isBulkSaving}
                className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.4vw] text-white rounded-[0.4vw] text-[0.75vw] font-semibold shadow-md shadow-emerald-900/20 transition-all ml-[1vw] ${isBulkSaving ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"}`}
              >
                {isBulkSaving ? (
                  <>
                    <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-[0.9vw] h-[0.9vw]" />
                    Bulk Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {infoSelected && (
          <ServiceInfoModal
            entry={infoSelected.entry}
            product={{
              ...infoSelected.product,
              report: {
                ...infoSelected.product.report,
                ...getDraft(infoSelected.product._pid, infoSelected.product),
                image:
                  getDraft(infoSelected.product._pid, infoSelected.product)
                    .imagePreview ||
                  getDraft(infoSelected.product._pid, infoSelected.product)
                    .image ||
                  infoSelected.product.report?.image ||
                  "",
              },
            }}
            onClose={() => setInfoSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {historySelected && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-[2vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[35vw] max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-[1.5vw] py-[1.2vw] border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[1vw] font-semibold text-gray-900 flex items-center gap-[0.4vw]">
                    <Clock className="w-[1.2vw] h-[1.2vw] text-blue-600" />
                    Status History
                  </h3>
                  <p className="text-[0.7vw] text-gray-500 font-medium mt-[0.2vw]">
                    {historySelected.product.productDescription} (
                    {historySelected.product.serialNumber})
                  </p>
                </div>
                <button
                  onClick={() => setHistorySelected(null)}
                  className="p-[0.4vw] rounded-full hover:bg-slate-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              {/* Timeline Area */}
              <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.5vw]">
                {(() => {
                  const empHistory =
                    historySelected.product.report?.history || [];
                  const finalHistory =
                    historySelected.product.finalStatusHistory || [];
                  const timeline = [];

                  // Add employee report history entries
                  empHistory.forEach((h) =>
                    timeline.push({ type: "report", ...h }),
                  );

                  // Add admin final status history entries
                  finalHistory.forEach((h) => {
                    const isCompleted = h.status === "Completed";
                    timeline.push({
                      type: "admin",
                      status: isCompleted ? "Approved" : "Admin Returned",
                      remark: h.remarks,
                      timestamp: h.timestamp || h.date,
                    });
                  });

                  // Sort timeline chronologically (oldest to newest)
                  timeline.sort((a, b) => {
                    const tA = a.timestamp
                      ? new Date(a.timestamp).getTime()
                      : 0;
                    const tB = b.timestamp
                      ? new Date(b.timestamp).getTime()
                      : 0;
                    return tA - tB;
                  });

                  if (timeline.length === 0) {
                    return (
                      <div className="text-center py-[2vw] text-gray-400 italic text-[0.75vw]">
                        No status history recorded yet.
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-[1.5vw] border-l-2 border-blue-100 ml-[0.6vw] space-y-[1.5vw] py-[0.5vw]">
                      {timeline.map((item, index) => {
                        let cfg =
                          STATUS_CONFIG[item.status] || STATUS_CONFIG["Open"];
                        let label = item.status;
                        let remarkText =
                          item.remark || item.currentRemark || "";

                        if (item.type === "admin") {
                          if (item.status === "Approved") {
                            cfg = {
                              icon: CheckCircle,
                              bg: "bg-green-50 text-green-700 border-green-300",
                              border: "border-green-300",
                              text: "text-green-800",
                            };
                          } else {
                            cfg = {
                              icon: AlertTriangle,
                              bg: "bg-amber-50 text-amber-700 border-amber-300",
                              border: "border-amber-300",
                              text: "text-amber-800",
                            };
                          }
                          label = item.adminName
                            ? `${item.status} → ${item.adminName}`
                            : item.status;
                        } else {
                          // Normal report status styling
                          const itemStatus = item.status || "Open";
                          const baseCfg =
                            STATUS_CONFIG[itemStatus] || STATUS_CONFIG["Open"];
                          cfg = {
                            icon: baseCfg.icon,
                            bg: `${baseCfg.bg} ${baseCfg.text} ${baseCfg.border}`,
                            border: baseCfg.border,
                            text: baseCfg.text,
                          };
                        }

                        const Icon = cfg.icon || Clock;

                        return (
                          <div key={index} className="relative">
                            {/* Timeline Node Icon */}
                            <div
                              className={`absolute -left-[2.15vw] top-[0.1vw] w-[1.2vw] h-[1.2vw] rounded-full border-2 border-white flex items-center justify-center shadow-sm ${cfg.bg}`}
                            >
                              <Icon className="w-[0.7vw] h-[0.7vw]" />
                            </div>

                            {/* Card Content */}
                            <div className="bg-slate-50 rounded-[0.5vw] p-[0.8vw] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center justify-between gap-[0.5vw]">
                                <div className="flex items-center gap-[0.4vw]">
                                  <span
                                    className={`px-[0.6vw] py-[0.15vw] rounded-full text-[0.72vw] font-bold tracking-wider border ${cfg.bg}`}
                                  >
                                    {label}
                                  </span>
                                </div>
                                <span className="text-[0.68vw] text-slate-500 font-bold whitespace-nowrap">
                                  {(() => {
                                    const dt = new Date(item.timestamp);
                                    const dStr = dt.toLocaleDateString("en-GB"); // dd/mm/yyyy
                                    const tStr = dt
                                      .toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })
                                      .toLowerCase()
                                      .replace(/\s+/g, "");
                                    return `${dStr}, ${tStr}`;
                                  })()}
                                </span>
                              </div>

                              {remarkText && (
                                <div className="mt-[0.6vw]">
                                  <p className="text-[0.8vw] text-slate-800 font-semibold break-words leading-relaxed">
                                    <span className="text-[0.75vw] font-bold text-slate-400 mr-[0.4vw]">
                                      Remark:
                                    </span>
                                    {remarkText}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-[1vw] border-t border-slate-200 bg-slate-50 text-right">
                <button
                  onClick={() => setHistorySelected(null)}
                  className="px-[1.5vw] py-[0.5vw] bg-gray-800 text-white rounded-[0.4vw] font-semibold text-[0.8vw] cursor-pointer hover:bg-gray-700 transition-all"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Options Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[24vw] p-[1.5vw] flex flex-col gap-[1.2vw]"
            >
              <div>
                <h3 className="text-[1vw] font-bold text-slate-800">
                  Export Options
                </h3>
              </div>

              {/* Form Options */}
              <div className="flex flex-col gap-[1vw]">
                {/* Radio Group */}
                <div className="flex flex-col gap-[0.6vw]">
                  <label className="flex items-center gap-[0.6vw] cursor-pointer text-[0.8vw] font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === "pdf"}
                      onChange={() => setExportFormat("pdf")}
                      className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Export as PDF</span>
                  </label>
                  <label className="flex items-center gap-[0.6vw] cursor-pointer text-[0.8vw] font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === "excel"}
                      onChange={() => setExportFormat("excel")}
                      className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Export as Excel</span>
                  </label>
                </div>

                <hr className="border-slate-200" />

                {/* Checkbox */}
                <label className="flex items-center gap-[0.6vw] cursor-pointer text-[0.8vw] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={withHistory}
                    onChange={(e) => setWithHistory(e.target.checked)}
                    className="w-[1vw] h-[1vw] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>With History</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-[0.6vw] mt-[0.5vw]">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    setWithHistory(false);
                  }}
                  className="px-[1.2vw] py-[0.5vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-[0.78vw] cursor-pointer transition-all border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (exportFormat === "pdf") {
                      handleExportPDF();
                    } else {
                      handleExportExcel();
                    }
                    setShowExportModal(false);
                  }}
                  className="px-[1.5vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-[0.78vw] cursor-pointer transition-all border-0"
                >
                  Export
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
