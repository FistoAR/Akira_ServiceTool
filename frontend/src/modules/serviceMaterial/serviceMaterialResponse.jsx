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
  ChevronDown,
  Shield,
  Plus,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  Save,
  Filter,
  ListFilter,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io } from "socket.io-client";
import { useNotification } from "../../components/NotificationContext";
import { useSocket } from "../../contexts/SocketContext";
import { processUploadFile } from "../../utils/fileUploadHelper";

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
                <RefInput label="FQA By" value={product.report.fqaBy} />
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
                  label="PV"
                  value={product.report.pv || (product.report.pvCv ? product.report.pvCv.split(',')[0]?.trim() : "")}
                />
                <RefInput
                  label="CV"
                  value={product.report.cv || (product.report.pvCv ? product.report.pvCv.split(',')[1]?.trim() : "")}
                />
                <RefInput
                  label="Root Cause"
                  value={product.report.rootCause}
                  span={2}
                />
                <RefInput
                  label="Fault Parts"
                  value={product.report.faultParts}
                  span={2}
                />
                <RefInput
                  label="Parts Replaced"
                  value={product.report.partsReplacement}
                  span={2}
                />
                <RefInput
                  label="Corrective Action"
                  value={product.report.correctiveAction}
                  span={2}
                />
                <RefInput label="Time (Hours)" value={product.report.timeInHours} />
                <RefInput label="Material Cost" value={product.report.materialCost} />
                <RefInput label="Man Power Cost" value={product.report.manpowerCost != null ? `₹${Number(product.report.manpowerCost).toFixed(2)}` : "—"} />
                <RefInput label="Status" value={product.report.status} />
                <RefInput
                  label="Disposition"
                  value={product.report.disposition}
                />
                <div className="col-span-2">
                  <label className="text-[0.75vw] font-semibold text-black mb-[0.25vw] block">
                    Technical Attachment (Image / PDF)
                  </label>
                  {product.report.image ? (
                    <div className="mt-[0.5vw]">
                      {product.report.image.toLowerCase().endsWith(".pdf") ? (
                        <button
                          type="button"
                          onClick={() => {
                            const url = product.report.image.startsWith("http")
                              ? product.report.image
                              : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`;
                            setDocPreviewModal({
                              url,
                              title: `${product.productDescription || "Product"} - Technical PDF`,
                              isPdf: true,
                            });
                          }}
                          className="inline-flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-[0.4vw] text-[0.75vw] font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-[1vw] h-[1vw] text-red-600" />
                          <span>View PDF Document</span>
                        </button>
                      ) : (
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
                            setDocPreviewModal({
                              url,
                              title: `${product.productDescription || "Product"} - Technical Image`,
                              isPdf: false,
                            });
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-[0.75vw] text-gray-400 italic">
                      No document uploaded
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
      {/* In-App Document Preview Modal (for Image & PDF without navigating away) */}
      <AnimatePresence>
        {docPreviewModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[110] p-[1.5vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[75vw] max-w-[1100px] h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] bg-slate-900 text-white">
                <div className="flex items-center gap-[0.6vw]">
                  {docPreviewModal.isPdf ? (
                    <FileText className="w-[1.2vw] h-[1.2vw] text-red-400" />
                  ) : (
                    <Eye className="w-[1.2vw] h-[1.2vw] text-blue-400" />
                  )}
                  <h3 className="text-[0.9vw] font-bold text-white tracking-wide">
                    {docPreviewModal.title || (docPreviewModal.isPdf ? "PDF Document Preview" : "Image Preview")}
                  </h3>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <a
                    href={docPreviewModal.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.72vw] text-slate-300 hover:text-white flex items-center gap-[0.3vw] px-[0.6vw] py-[0.25vw] rounded bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <Download className="w-[0.8vw] h-[0.8vw]" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocPreviewModal(null)}
                    className="text-slate-400 hover:text-white p-[0.3vw] rounded-full hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-[1.1vw] h-[1.1vw]" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden p-[1vw]">
                {docPreviewModal.isPdf ? (
                  <iframe
                    src={`${docPreviewModal.url}#toolbar=1&navpanes=0`}
                    title="PDF Document"
                    className="w-full h-full rounded-[0.4vw] border border-slate-300 bg-white shadow-inner"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-[1vw]">
                    <img
                      src={docPreviewModal.url}
                      alt="Attachment Preview"
                      className="max-h-full max-w-full object-contain rounded-[0.4vw] shadow-md border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf"); // "pdf" or "excel"
  const [withHistory, setWithHistory] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serialFilter, setSerialFilter] = useState("");
  const [showSerialFilterModal, setShowSerialFilterModal] = useState(false);
  const [tempSerialInput, setTempSerialInput] = useState("");
  const [showOnlyUnsaved, setShowOnlyUnsaved] = useState(false);

  // Parsed array of active serial tokens for badges/filtering
  const activeSerials = useMemo(() => {
    if (!serialFilter || !serialFilter.trim()) return [];
    return serialFilter
      .split(/[,\s\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [serialFilter]);

  const removeSerialToken = (tokenToRemove) => {
    const updated = activeSerials.filter((s) => s !== tokenToRemove);
    setSerialFilter(updated.join(", "));
  };

  const clearAllSerials = () => {
    setSerialFilter("");
    setTempSerialInput("");
  };

  const openSerialModal = () => {
    setTempSerialInput(
      activeSerials.length > 0 ? activeSerials.join("\n") : ""
    );
    setShowSerialFilterModal(true);
  };

  const applySerialModal = () => {
    const tokens = tempSerialInput
      .split(/[,\s\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokens));
    setSerialFilter(uniqueTokens.join(", "));
    setShowSerialFilterModal(false);
  };
  const [showOnlyUnclaimed, setShowOnlyUnclaimed] = useState(false);
  const [historySelected, setHistorySelected] = useState(null);
  const [docPreviewModal, setDocPreviewModal] = useState(null); // { url, title, isPdf }
  const [editReportModal, setEditReportModal] = useState(null);
  const [editReason, setEditReason] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Drag-and-fill states
  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    setCurrentPage(1);
    if (filterStatus !== "All") {
      setShowOnlyUnsaved(false);
      setShowOnlyUnclaimed(false);
    }
  }, [searchTerm, dateFrom, dateTo, serialFilter, filterStatus]);

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
          "Tested By": "",
          "FQA By": "",
          "4M Category": "",
          "Error Code": "",
          "Problem Description": "",
          "PV, CV": "",
          "Root Cause": "",
          "Fault Parts": "",
          "Parts Replaced": "",
          "Corrective Action": "",
          "Time (Hours)": "",
          "Material Cost": "",
          "Man Power Cost": "",
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
        "Tested By": r.product.report?.testedBy || "",
        "FQA By": r.product.report?.fqaBy || "",
        "4M Category": r.product.report?.fourMCategory || "",
        "Error Code": r.product.report?.errorCode || "",
        "Problem Description": r.product.report?.problemDescription || "",
        PV: r.product.report?.pv || (r.product.report?.pvCv ? r.product.report.pvCv.split(',')[0]?.trim() : ""),
        CV: r.product.report?.cv || (r.product.report?.pvCv ? r.product.report.pvCv.split(',')[1]?.trim() : ""),
        "Root Cause": r.product.report?.rootCause || "",
        "Fault Parts": r.product.report?.faultParts || "",
        "Parts Replaced": r.product.report?.partsReplacement || "",
        "Corrective Action": r.product.report?.correctiveAction || "",
        "Time (Hours)": r.product.report?.timeInHours || "",
        "Material Cost": r.product.report?.materialCost ? `₹${r.product.report.materialCost}` : "",
        "Man Power Cost": r.product.report?.manpowerCost != null ? `₹${Number(r.product.report.manpowerCost).toFixed(2)}` : "",
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
    const initialStatus =
      product.report?.status &&
      product.report.status !== "Open" &&
      product.report.status !== "Assigned"
        ? product.report.status
        : "";
    return {
      testedBy: product.report?.testedBy || "",
      fqaBy: product.report?.fqaBy || "",
      timeInHours: product.report?.timeInHours || "",
      materialCost: product.report?.materialCost || "",
      manpowerCost: product.report?.manpowerCost != null ? product.report.manpowerCost : "",
      pvCv: product.report?.pvCv || "",
      pv: product.report?.pv || (product.report?.pvCv ? product.report.pvCv.split(',')[0]?.trim() : ""),
      cv: product.report?.cv || (product.report?.pvCv ? product.report.pvCv.split(',')[1]?.trim() : ""),
      faultParts: product.report?.faultParts || "",
      disposition: product.report?.disposition || "",
      fourMCategory: product.report?.fourMCategory || "",
      errorCode: product.report?.errorCode || "",
      problemDescription: product.report?.problemDescription || "",
      rootCause: product.report?.rootCause || "",
      partsReplacement: product.report?.partsReplacement || "",
      correctiveAction: product.report?.correctiveAction || "",
      completedDate: product.report?.completedDate || "",
      status: initialStatus,
      currentRemark: "",
      designators: product.report?.designators || "",
      image: product.report?.image || "",
    };
  };

  const handleDraftChange = (productId, product, field, value) => {
    setDrafts((prev) => {
      const existing = prev[productId] || getDraft(productId, product);
      const updated = { ...existing, [field]: value, hasChanges: true };

      // Auto calculate manpower cost if timeInHours changed
      if (field === "timeInHours") {
        const timeVal = parseFloat(value);
        const userCtc = parseFloat(currentUser?.ctc || 0);
        if (!isNaN(timeVal) && timeVal > 0 && userCtc > 0) {
          const cost = (userCtc / (26 * 8)) * timeVal;
          updated.manpowerCost = Math.round(cost * 100) / 100;
        } else if (isNaN(timeVal) || timeVal <= 0) {
          updated.manpowerCost = 0;
        }
      }

      return {
        ...prev,
        [productId]: updated,
      };
    });
  };

  const handleImageChange = async (productId, product, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processUploadFile(file);
      if (!processed) return;

      setDrafts((prev) => {
        const existing = prev[productId] || getDraft(productId, product);
        return {
          ...prev,
          [productId]: {
            ...existing,
            imageFile: processed.file,
            imagePreview: processed.preview,
            isPdf: processed.isPdf,
            fileName: processed.name,
            hasChanges: true,
          },
        };
      });

      toast(`File "${file.name}" ready for upload (optimized).`, "success");
    } catch (err) {
      toast(
        err.message ||
          "The uploaded document is too large. Please compress and upload under 5MB.",
        "error"
      );
    } finally {
      // Clear input so user can re-select same file if needed
      e.target.value = "";
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
    if (!draft.status?.trim()) {
      toast(`Status is mandatory for ${product.productDescription}`, "error");
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

    // Auto calculate manpower cost if not already computed
    let manpowerCost = draft.manpowerCost;
    if (draft.timeInHours && (manpowerCost === "" || manpowerCost == null)) {
      const timeVal = parseFloat(draft.timeInHours);
      const userCtc = parseFloat(currentUser?.ctc || 0);
      if (!isNaN(timeVal) && timeVal > 0 && userCtc > 0) {
        manpowerCost = Math.round(((userCtc / (26 * 8)) * timeVal) * 100) / 100;
      }
    }

    const updatedReport = {
      testedBy: draft.testedBy,
      fqaBy: draft.fqaBy,
      timeInHours: draft.timeInHours,
      materialCost: draft.materialCost,
      manpowerCost: manpowerCost != null && manpowerCost !== "" ? Number(manpowerCost) : 0,
      pv: draft.pv || "",
      cv: draft.cv || "",
      pvCv: [draft.pv, draft.cv].filter(Boolean).join(", ") || draft.pvCv || "",
      faultParts: draft.faultParts,
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

  const hasAnyDraftChanges = useMemo(() => {
    return Object.values(drafts).some((d) => d && d.hasChanges);
  }, [drafts]);

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

        // Multi-Serial Number Filter
        if (serialFilter && serialFilter.trim()) {
          const serials = serialFilter
            .split(/[,\s\n]+/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
          if (serials.length > 0) {
            const pSerial = (p.serialNumber || "").trim().toUpperCase();
            const matched = serials.some((target) => pSerial.includes(target));
            if (!matched) return;
          }
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
    serialFilter,
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

        // Multi-Serial Number Filter
        if (serialFilter && serialFilter.trim()) {
          const serials = serialFilter
            .split(/[,\s\n]+/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
          if (serials.length > 0) {
            const pSerial = (p.serialNumber || "").trim().toUpperCase();
            const matched = serials.some((target) => pSerial.includes(target));
            if (!matched) return;
          }
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
    serialFilter,
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
  const EDITABLE_COL_FIELDS = {
    testedBy: "testedBy",
    fqaBy: "fqaBy",
    fourM: "fourMCategory",
    errorCode: "errorCode",
    problemDesc: "problemDescription",
    pv: "pv",
    cv: "cv",
    designators: "designators",
    rootCause: "rootCause",
    faultParts: "faultParts",
    partsReplaced: "partsReplacement",
    correctiveAction: "correctiveAction",
    timeInHours: "timeInHours",
    materialCost: "materialCost",
    disposition: "disposition",
    completionDate: "completedDate",
    status: "status",
    remarks: "currentRemark",
  };

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
      key: "fqaBy",
      label: "FQA By",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "fourM",
      label: (
        <span>
          4M Category <span className="text-red-500 font-black ml-[0.1vw]">*</span>
        </span>
      ),
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
      label: (
        <span>
          Problem Desc <span className="text-red-500 font-black ml-[0.1vw]">*</span>
        </span>
      ),
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "pv",
      label: "PV",
      align: "text-left",
      minW: "min-w-[7vw]",
    },
    {
      key: "cv",
      label: "CV",
      align: "text-left",
      minW: "min-w-[7vw]",
    },
    {
      key: "designators",
      label: "Designators",
      align: "text-left",
      minW: "min-w-[10vw]",
    },
    {
      key: "rootCause",
      label: (
        <span>
          Root Cause <span className="text-red-500 font-black ml-[0.1vw]">*</span>
        </span>
      ),
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "faultParts",
      label: "Fault Parts",
      align: "text-left",
      minW: "min-w-[11vw]",
    },
    {
      key: "partsReplaced",
      label: "Parts Replaced",
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "correctiveAction",
      label: (
        <span>
          Corrective Action <span className="text-red-500 font-black ml-[0.1vw]">*</span>
        </span>
      ),
      align: "text-left",
      minW: "min-w-[12vw]",
    },
    {
      key: "timeInHours",
      label: "Time (Hrs)",
      align: "text-center",
      minW: "min-w-[7vw]",
    },
    {
      key: "materialCost",
      label: "Material Cost",
      align: "text-right",
      minW: "min-w-[8vw]",
    },
    {
      key: "manpowerCost",
      label: "Man Power Cost",
      align: "text-right",
      minW: "min-w-[9vw]",
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
      label: (
        <span>
          Status <span className="text-red-500 font-black ml-[0.1vw]">*</span>
        </span>
      ),
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
    {
      key: "action",
      label: "Action",
      align: "text-center",
      minW: "min-w-[8vw]",
    },
  ];

  const handleCellMouseDown = (rowIndex, colKey, e) => {
    if (!EDITABLE_COL_FIELDS[colKey]) return;
    setSelection({
      startRow: rowIndex,
      endRow: rowIndex,
      colKey,
    });
    setIsSelecting(true);
  };

  const handleFillHandleMouseDown = (e, rowIndex, colKey) => {
    e.stopPropagation();
    e.preventDefault();
    setSelection({
      startRow: rowIndex,
      endRow: rowIndex,
      colKey,
    });
    setIsFilling(true);
  };

  const handleCellMouseEnter = (rowIndex, colKey) => {
    if (isFilling && selection && selection.colKey === colKey) {
      setSelection((prev) => ({
        ...prev,
        endRow: rowIndex,
      }));
    }
  };

  const handleMouseUp = () => {
    if (isFilling && selection) {
      const { startRow, endRow, colKey } = selection;
      const field = EDITABLE_COL_FIELDS[colKey];
      if (field) {
        const sourceItem = paginatedItems[startRow];
        if (sourceItem) {
          const sourceDraft = drafts[sourceItem.product._pid] || getDraft(sourceItem.product._pid, sourceItem.product);
          const sourceValue = sourceDraft[field];

          const minR = Math.min(startRow, endRow);
          const maxR = Math.max(startRow, endRow);

          for (let r = minR; r <= maxR; r++) {
            if (r === startRow) continue;
            const targetItem = paginatedItems[r];
            if (targetItem) {
              const pid = targetItem.product._pid;
              handleDraftChange(pid, targetItem.product, field, sourceValue);
            }
          }
          toast(`Filled ${field} down from row ${minR + 1} to ${maxR + 1}`);
        }
      }
    }
    setIsSelecting(false);
    setIsFilling(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isFilling, selection, paginatedItems, drafts]);

  const getCellClass = (rowIndex, colKey) => {
    let cls = "px-[0.8vw] py-[0.7vw] border border-gray-400 relative ";
    if (!selection || selection.colKey !== colKey) return cls;
    const { startRow, endRow } = selection;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    if (rowIndex >= minR && rowIndex <= maxR) {
      cls += " bg-blue-50/40 border-blue-500 z-10";
      if (rowIndex === minR) cls += " border-t-2";
      if (rowIndex === maxR) cls += " border-b-2";
    }
    return cls;
  };

  const renderFillHandle = (rowIndex, colKey) => {
    if (!selection || selection.colKey !== colKey) return null;
    const { startRow, endRow } = selection;
    const maxR = Math.max(startRow, endRow);
    if (rowIndex === maxR) {
      return (
        <div
          data-fill-handle="true"
          onMouseDown={(e) => handleFillHandleMouseDown(e, startRow, colKey)}
          className="absolute bottom-[-4px] right-[-4px] w-[9px] h-[9px] bg-blue-600 border border-white cursor-crosshair z-[60] shadow-sm rounded-sm hover:scale-125 transition-transform"
          title="Drag down to fill value in column"
        />
      );
    }
    return null;
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans overflow-hidden pb-[0.4vw]">
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
      {/* ── Search & Filter Controls Toolbar ────────────────────────────────────── */}
      <div className="bg-white rounded-[0.7vw] border border-slate-200 shadow-sm mb-[0.6vw] px-[0.8vw] py-[0.45vw] flex-shrink-0 transition-all">
        <div className="flex items-center justify-between gap-[0.6vw] flex-nowrap w-full text-[0.7vw]">
          {/* Left Controls: Search, Serials & More Filters Toggle */}
          <div className="flex items-center gap-[0.5vw] flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-[18vw] min-w-[200px] flex-shrink-0">
              <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.78vw] h-[0.78vw] text-gray-400" />
              <input
                type="text"
                placeholder="Search product, customer, ref no…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-[1.8vw] pr-[1.6vw] py-[0.38vw] border border-gray-300 rounded-[0.4vw] text-[0.72vw] font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
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

            {/* Multi-Serial Number Filter Button & Quick Display */}
            <div className="flex items-center gap-[0.35vw] flex-shrink-0">
              <button
                type="button"
                onClick={openSerialModal}
                className={`flex items-center gap-[0.4vw] px-[0.65vw] py-[0.38vw] rounded-[0.4vw] border text-[0.72vw] font-semibold cursor-pointer transition-all shadow-sm ${
                  activeSerials.length > 0
                    ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                    : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50/60 hover:border-indigo-300"
                }`}
                title="Filter by multiple serial numbers (Batch / List / Paste)"
              >
                <ListFilter className="w-[0.85vw] h-[0.85vw]" />
                <span>Filter Serials</span>
                {activeSerials.length > 0 && (
                  <span className="px-[0.35vw] py-[0.05vw] rounded-full text-[0.6vw] font-bold bg-white text-indigo-700 shadow-xs">
                    {activeSerials.length}
                  </span>
                )}
              </button>

              {/* Show active serial chips for quick removal right in toolbar */}
              {activeSerials.length > 0 && (
                <div className="flex items-center gap-[0.25vw] max-w-[14vw] overflow-x-auto scrollbar-none py-[0.1vw]">
                  {activeSerials.slice(0, 2).map((sn) => (
                    <span
                      key={sn}
                      className="inline-flex items-center gap-[0.2vw] px-[0.4vw] py-[0.18vw] rounded-[0.3vw] bg-indigo-50 border border-indigo-200 text-indigo-800 text-[0.65vw] font-semibold shadow-2xs whitespace-nowrap"
                    >
                      <span>{sn}</span>
                      <button
                        type="button"
                        onClick={() => removeSerialToken(sn)}
                        className="text-indigo-400 hover:text-indigo-700 cursor-pointer ml-[0.1vw]"
                        title={`Remove ${sn}`}
                      >
                        <X className="w-[0.55vw] h-[0.55vw]" />
                      </button>
                    </span>
                  ))}
                  {activeSerials.length > 2 && (
                    <button
                      type="button"
                      onClick={openSerialModal}
                      className="text-[0.62vw] text-indigo-600 font-bold bg-indigo-50 px-[0.35vw] py-[0.18vw] rounded-[0.3vw] border border-indigo-200 hover:bg-indigo-100 cursor-pointer whitespace-nowrap"
                    >
                      +{activeSerials.length - 2} more
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAllSerials}
                    className="text-[0.62vw] text-red-500 hover:text-red-700 font-semibold px-[0.25vw] cursor-pointer whitespace-nowrap"
                    title="Clear serial filter"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* More Filters Toggle Button (wraps Unclaimed, Unsaved, and Dates) */}
            <button
              type="button"
              onClick={() => setShowFiltersPanel((p) => !p)}
              className={`flex items-center gap-[0.4vw] px-[0.7vw] py-[0.38vw] rounded-[0.4vw] border text-[0.72vw] font-semibold cursor-pointer transition-all shadow-sm flex-shrink-0 ${
                showFiltersPanel || (dateFrom || dateTo || showOnlyUnclaimed || showOnlyUnsaved)
                  ? "bg-blue-50 border-blue-300 text-blue-700 shadow-blue-50"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title="Toggle Date and Status Filters"
            >
              <Filter className="w-[0.8vw] h-[0.8vw] text-blue-600" />
              <span>Filters</span>
              {(dateFrom || dateTo || showOnlyUnclaimed || showOnlyUnsaved) && (
                <span className="w-[0.42vw] h-[0.42vw] rounded-full bg-blue-600 animate-pulse" />
              )}
              <ChevronDown
                className={`w-[0.75vw] h-[0.75vw] text-slate-400 transition-transform duration-200 ${
                  showFiltersPanel ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>

            {/* Quick Active Filter Badges */}
            <div className="flex items-center gap-[0.3vw] flex-wrap overflow-hidden">
              {showOnlyUnclaimed && (
                <span className="inline-flex items-center gap-[0.25vw] px-[0.45vw] py-[0.15vw] rounded-[0.3vw] bg-blue-50 border border-blue-200 text-blue-700 text-[0.65vw] font-bold shadow-2xs whitespace-nowrap">
                  Unclaimed Only
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnclaimed(false)}
                    className="hover:text-blue-900 cursor-pointer"
                  >
                    <X className="w-[0.55vw] h-[0.55vw]" />
                  </button>
                </span>
              )}
              {showOnlyUnsaved && (
                <span className="inline-flex items-center gap-[0.25vw] px-[0.45vw] py-[0.15vw] rounded-[0.3vw] bg-purple-50 border border-purple-200 text-purple-700 text-[0.65vw] font-bold shadow-2xs whitespace-nowrap">
                  Unsaved Only
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnsaved(false)}
                    className="hover:text-purple-900 cursor-pointer"
                  >
                    <X className="w-[0.55vw] h-[0.55vw]" />
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-[0.25vw] px-[0.45vw] py-[0.15vw] rounded-[0.3vw] bg-amber-50 border border-amber-200 text-amber-700 text-[0.65vw] font-bold shadow-2xs whitespace-nowrap">
                  📅 {dateFrom || "Start"} → {dateTo || "End"}
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="hover:text-amber-900 cursor-pointer"
                  >
                    <X className="w-[0.55vw] h-[0.55vw]" />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Export */}
          <div className="flex items-center gap-[0.5vw] flex-shrink-0 ml-auto">
            {/* Export Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-[0.35vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white px-[0.7vw] py-[0.38vw] rounded-[0.4vw] text-[0.7vw] font-bold shadow-sm transition-all cursor-pointer h-[1.9vw] border-0 whitespace-nowrap flex-shrink-0"
            >
              <Download className="w-[0.8vw] h-[0.8vw]" />
              Export Report
            </button>
          </div>
        </div>

        {/* Collapsible Filters Tray (shown below button when clicked) */}
        <AnimatePresence>
          {showFiltersPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100 mt-[0.45vw] pt-[0.45vw]"
            >
              <div className="flex items-center justify-between gap-[1vw] flex-wrap bg-slate-50/70 p-[0.6vw] rounded-[0.5vw] border border-slate-200/70">
                {/* Left Side: Unsaved & Unclaimed Toggles */}
                <div className="flex items-center gap-[0.6vw] flex-wrap">
                  <span className="text-[0.68vw] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Views:
                  </span>
                  {filterStatus === "All" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOnlyUnclaimed((prev) => !prev);
                          if (!showOnlyUnclaimed) setShowOnlyUnsaved(false);
                        }}
                        className={`flex items-center gap-[0.3vw] px-[0.65vw] py-[0.35vw] rounded-[0.4vw] border text-[0.7vw] font-semibold cursor-pointer transition-all shadow-xs ${
                          showOnlyUnclaimed
                            ? "bg-blue-600 border-blue-600 text-white shadow-blue-200"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-[0.4vw] h-[0.4vw] rounded-full ${
                            showOnlyUnclaimed ? "bg-white animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <span>Unclaimed Records Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowOnlyUnsaved((prev) => !prev);
                          if (!showOnlyUnsaved) setShowOnlyUnclaimed(false);
                        }}
                        className={`flex items-center gap-[0.3vw] px-[0.65vw] py-[0.35vw] rounded-[0.4vw] border text-[0.7vw] font-semibold cursor-pointer transition-all shadow-xs ${
                          showOnlyUnsaved
                            ? "bg-blue-600 border-blue-600 text-white shadow-blue-200"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-[0.4vw] h-[0.4vw] rounded-full ${
                            showOnlyUnsaved ? "bg-white animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <span>Unsaved Records Only</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[0.68vw] text-slate-400 italic">
                      (Available when 'All' tab is selected)
                    </span>
                  )}
                </div>

                {/* Right Side: Date Range Filter */}
                <div className="flex items-center gap-[0.6vw] flex-wrap ml-auto">
                  <span className="text-[0.68vw] font-bold text-slate-500 uppercase tracking-wider">
                    Date Range:
                  </span>
                  {/* From Date */}
                  <div className="flex items-center gap-[0.3vw]">
                    <span className="text-[0.68vw] font-semibold text-slate-600">From</span>
                    <div className="relative">
                      <Calendar className="absolute left-[0.35vw] top-1/2 -translate-y-1/2 w-[0.68vw] h-[0.68vw] text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="pl-[1.4vw] pr-[0.3vw] py-[0.3vw] border border-slate-300 rounded-[0.38vw] text-[0.68vw] font-medium text-slate-700 outline-none focus:border-blue-500 bg-white shadow-2xs w-[7.8vw]"
                      />
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="flex items-center gap-[0.3vw]">
                    <span className="text-[0.68vw] font-semibold text-slate-600">To</span>
                    <div className="relative">
                      <Calendar className="absolute left-[0.35vw] top-1/2 -translate-y-1/2 w-[0.68vw] h-[0.68vw] text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="pl-[1.4vw] pr-[0.3vw] py-[0.3vw] border border-slate-300 rounded-[0.38vw] text-[0.68vw] font-medium text-slate-700 outline-none focus:border-blue-500 bg-white shadow-2xs w-[7.8vw]"
                      />
                    </div>
                  </div>

                  {/* Clear Date Filter Button */}
                  {(dateFrom || dateTo || showOnlyUnclaimed || showOnlyUnsaved) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setShowOnlyUnclaimed(false);
                        setShowOnlyUnsaved(false);
                      }}
                      className="flex items-center gap-[0.2vw] px-[0.55vw] py-[0.3vw] rounded-[0.38vw] border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-[0.68vw] font-bold transition-all cursor-pointer shadow-2xs ml-[0.3vw]"
                    >
                      <X className="w-[0.65vw] h-[0.65vw]" /> Reset All
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-[0.6vw] gap-[1vw] flex-shrink-0">
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
        <div className="bg-white rounded-[0.6vw] border border-gray-400 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
          <div ref={tableContainerRef} className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-max border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-[#e9edf4]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} ${col.align} px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-slate-800 whitespace-nowrap border-b-2 border-r border-slate-300 last:border-r-0 sticky top-0 z-30 bg-[#e9edf4]`}
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
        <div className="bg-white rounded-[0.6vw] border border-gray-400 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
          {/* Table Container with Internal Scroll */}
          <div ref={tableContainerRef} className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-max border-separate border-spacing-0">
              {/* Table Header */}
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-[#e9edf4]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} ${col.align} px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-slate-800 whitespace-nowrap border-b-2 border-r border-slate-300 last:border-r-0 sticky top-0 z-30 bg-[#e9edf4]`}
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
                    const rawStatus =
                      product.status || product.report?.status || "Open";
                    const isUnsavedRecord =
                      rawStatus === "Open" ||
                      rawStatus === "Assigned" ||
                      !product.report?.status ||
                      product.report?.status === "Open" ||
                      product.report?.status === "Assigned";

                    const isClaimedByMe =
                      product.assignedTo ===
                        (currentUser?.userId || currentUser?.id) &&
                      !isAdminReturnedProduct;
                    // Employee can re-submit from Admin Returned tab
                    const isResubmitting =
                      filterStatus === "Admin Returned" &&
                      isAdminReturnedProduct &&
                      product.assignedTo ===
                        (currentUser?.userId || currentUser?.id);
                    // Allow inline editing when claimed by me (except when already in Completed tab or pending final admin approval)
                    const canEditInline =
                      (isClaimedByMe && filterStatus !== "Completed") || isResubmitting;
                    const draft =
                      canEditInline
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
                              className="p-0 border-b border-slate-200 bg-slate-50 sticky top-[2.4vw] z-20 shadow-xs"
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
                          <td
                            className={getCellClass(idx, "testedBy")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "testedBy", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "testedBy")}
                          >
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
                            {renderFillHandle(idx, "testedBy")}
                          </td>

                          {/* FQA By */}
                          <td
                            className={getCellClass(idx, "fqaBy")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "fqaBy", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "fqaBy")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.fqaBy || ""}
                                onChange={(e) => hc("fqaBy", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[8vw]"
                                placeholder="FQA By..."
                              />
                            ) : (
                              <span className="text-[0.75vw] whitespace-nowrap">
                                {product.report?.fqaBy || "—"}
                              </span>
                            )}
                            {renderFillHandle(idx, "fqaBy")}
                          </td>

                          {/* 4M Category */}
                          <td
                            className={getCellClass(idx, "fourM")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "fourM", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "fourM")}
                          >
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
                            {renderFillHandle(idx, "fourM")}
                          </td>

                          {/* Error Code */}
                          <td
                            className={getCellClass(idx, "errorCode")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "errorCode", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "errorCode")}
                          >
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
                            {renderFillHandle(idx, "errorCode")}
                          </td>

                          {/* Problem Description */}
                          <td
                            className={getCellClass(idx, "problemDesc")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "problemDesc", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "problemDesc")}
                          >
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
                            {renderFillHandle(idx, "problemDesc")}
                          </td>

                          {/* PV */}
                          <td
                            className={getCellClass(idx, "pv")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "pv", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "pv")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.pv !== undefined ? draft.pv : (draft.pvCv ? draft.pvCv.split(',')[0]?.trim() : "")}
                                onChange={(e) => hc("pv", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[6vw]"
                                placeholder="PV..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.pv || (product.report?.pvCv ? product.report.pvCv.split(',')[0]?.trim() : "—")}
                              </span>
                            )}
                            {renderFillHandle(idx, "pv")}
                          </td>

                          {/* CV */}
                          <td
                            className={getCellClass(idx, "cv")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "cv", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "cv")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.cv !== undefined ? draft.cv : (draft.pvCv ? draft.pvCv.split(',')[1]?.trim() : "")}
                                onChange={(e) => hc("cv", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[6vw]"
                                placeholder="CV..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.cv || (product.report?.pvCv ? product.report.pvCv.split(',')[1]?.trim() : "—")}
                              </span>
                            )}
                            {renderFillHandle(idx, "cv")}
                          </td>

                          {/* Designators */}
                          <td
                            className={getCellClass(idx, "designators")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "designators", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "designators")}
                          >
                            {draft ? (
                              <input
                                type="text"
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
                            {renderFillHandle(idx, "designators")}
                          </td>

                          {/* Root Cause */}
                          <td
                            className={getCellClass(idx, "rootCause")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "rootCause", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "rootCause")}
                          >
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
                            {renderFillHandle(idx, "rootCause")}
                          </td>

                          {/* Fault Parts */}
                          <td
                            className={getCellClass(idx, "faultParts")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "faultParts", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "faultParts")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.faultParts || ""}
                                onChange={(e) => hc("faultParts", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 min-w-[9vw]"
                                placeholder="Fault Parts..."
                              />
                            ) : (
                              <span className="text-[0.75vw]">
                                {product.report?.faultParts || "—"}
                              </span>
                            )}
                            {renderFillHandle(idx, "faultParts")}
                          </td>

                          {/* Parts Replaced */}
                          <td
                            className={getCellClass(idx, "partsReplaced")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "partsReplaced", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "partsReplaced")}
                          >
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
                            {renderFillHandle(idx, "partsReplaced")}
                          </td>

                          {/* Corrective Action */}
                          <td
                            className={getCellClass(idx, "correctiveAction")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "correctiveAction", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "correctiveAction")}
                          >
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
                            {renderFillHandle(idx, "correctiveAction")}
                          </td>

                          {/* Time (in hours) */}
                          <td
                            className={getCellClass(idx, "timeInHours")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "timeInHours", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "timeInHours")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.timeInHours || ""}
                                onChange={(e) => hc("timeInHours", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 text-center min-w-[5vw]"
                                placeholder="Hrs e.g. 2.5"
                              />
                            ) : (
                              <span className="text-[0.75vw] font-medium whitespace-nowrap">
                                {product.report?.timeInHours ? `${product.report.timeInHours} hrs` : "—"}
                              </span>
                            )}
                            {renderFillHandle(idx, "timeInHours")}
                          </td>

                          {/* Material Cost */}
                          <td
                            className={getCellClass(idx, "materialCost")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "materialCost", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "materialCost")}
                          >
                            {draft ? (
                              <input
                                type="text"
                                value={draft.materialCost || ""}
                                onChange={(e) => hc("materialCost", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 text-right min-w-[6vw]"
                                placeholder="Cost e.g. 1500"
                              />
                            ) : (
                              <span className="text-[0.75vw] font-medium whitespace-nowrap">
                                {product.report?.materialCost ? `₹${product.report.materialCost}` : "—"}
                              </span>
                            )}
                            {renderFillHandle(idx, "materialCost")}
                          </td>

                          {/* Man Power Cost */}
                          <td className="px-[0.8vw] py-[0.7vw] text-right border border-gray-400">
                            <span className="text-[0.75vw] font-semibold text-emerald-700 whitespace-nowrap">
                              {draft && draft.manpowerCost != null && draft.manpowerCost !== ""
                                ? `₹${Number(draft.manpowerCost).toFixed(2)}`
                                : product.report?.manpowerCost != null
                                ? `₹${Number(product.report.manpowerCost).toFixed(2)}`
                                : "—"}
                            </span>
                          </td>

                          {/* Disposition */}
                          <td
                            className={getCellClass(idx, "disposition")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "disposition", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "disposition")}
                          >
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
                            {renderFillHandle(idx, "disposition")}
                          </td>

                          {/* Completion Date */}
                          <td
                            className={getCellClass(idx, "completionDate")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "completionDate", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "completionDate")}
                          >
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
                            {renderFillHandle(idx, "completionDate")}
                          </td>

                          {/* Status */}
                          <td
                            className={getCellClass(idx, "status")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "status", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "status")}
                          >
                            {draft ? (
                              <select
                                value={draft.status}
                                onChange={(e) => hc("status", e.target.value)}
                                className="w-full text-[0.75vw] border border-gray-400 rounded p-[0.3vw] outline-none focus:border-blue-500 font-semibold min-w-[9vw]"
                              >
                                <option value="">Select</option>
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
                            {renderFillHandle(idx, "status")}
                          </td>

                          {/* Remarks */}
                          <td
                            className={getCellClass(idx, "remarks")}
                            onMouseDown={(e) => handleCellMouseDown(idx, "remarks", e)}
                            onMouseEnter={() => handleCellMouseEnter(idx, "remarks")}
                          >
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
                            {renderFillHandle(idx, "remarks")}
                          </td>

                          <td className="px-[0.8vw] py-[0.7vw] border border-gray-400 text-center min-w-[8vw]">
                            {draft ? (
                              <div className="flex items-center justify-center gap-[0.5vw]">
                                <input
                                  type="file"
                                  id={`file-${product._pid}`}
                                  accept="image/*,application/pdf,.pdf"
                                  onChange={(e) =>
                                    handleImageChange(product._pid, product, e)
                                  }
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file-${product._pid}`}
                                  className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.35vw] bg-blue-50 border border-blue-200 text-blue-600 rounded-[0.4vw] cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-sm text-[0.7vw] font-semibold"
                                  title="Upload Image or PDF"
                                >
                                  <Upload className="w-[0.8vw] h-[0.8vw]" />
                                  <span>Upload</span>
                                </label>
                                {(draft.imagePreview || draft.imageFile || draft.image) && (
                                  <div className="w-[2.2vw] h-[2.2vw] rounded-[0.4vw] border border-slate-400 flex-shrink-0 relative group shadow-sm flex items-center justify-center bg-white overflow-hidden">
                                    {draft.isPdf || (draft.image && draft.image.toLowerCase().endsWith(".pdf")) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const url = draft.image
                                            ? draft.image.startsWith("http")
                                              ? draft.image
                                              : `${API_URL?.replace(/\/$/, "") || ""}${draft.image.startsWith("/") ? "" : "/"}${draft.image}`
                                            : draft.imagePreview || "";
                                          setDocPreviewModal({
                                            url,
                                            title: draft.fileName || `${product.productDescription || "Product"} - Technical PDF`,
                                            isPdf: true,
                                          });
                                        }}
                                        className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer border-0"
                                        title={draft.fileName || "PDF Document"}
                                      >
                                        <FileText className="w-[1.1vw] h-[1.1vw]" />
                                        <span className="text-[0.45vw] font-bold">PDF</span>
                                      </button>
                                    ) : (
                                      <>
                                        <img
                                          src={
                                            draft.imagePreview ||
                                            (draft.image.startsWith("http")
                                              ? draft.image
                                              : `${API_URL?.replace(/\/$/, "") || ""}${draft.image.startsWith("/") ? "" : "/"}${draft.image}`)
                                          }
                                          alt="preview"
                                          className="w-full h-full object-cover rounded-[0.4vw] cursor-pointer"
                                          onClick={() => {
                                            const url = draft.imagePreview ||
                                              (draft.image.startsWith("http")
                                                ? draft.image
                                                : `${API_URL?.replace(/\/$/, "") || ""}${draft.image.startsWith("/") ? "" : "/"}${draft.image}`);
                                            setDocPreviewModal({
                                              url,
                                              title: `${product.productDescription || "Product"} - Technical Image`,
                                              isPdf: false,
                                            });
                                          }}
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
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : product.report?.image ? (
                              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.4vw] border border-slate-400 relative group shadow-sm mx-auto flex items-center justify-center bg-white overflow-hidden">
                                {product.report.image.toLowerCase().endsWith(".pdf") ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = product.report.image.startsWith("http")
                                        ? product.report.image
                                        : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`;
                                      setDocPreviewModal({
                                        url,
                                        title: `${product.productDescription || "Product"} - Technical PDF`,
                                        isPdf: true,
                                      });
                                    }}
                                    className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer border-0"
                                    title="View PDF"
                                  >
                                    <FileText className="w-[1.1vw] h-[1.1vw]" />
                                    <span className="text-[0.45vw] font-bold">PDF</span>
                                  </button>
                                ) : (
                                  <>
                                    <img
                                      src={
                                        product.report.image.startsWith("http")
                                          ? product.report.image
                                          : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`
                                      }
                                      alt="preview"
                                      className="w-full h-full object-cover rounded-[0.4vw] cursor-pointer"
                                      onClick={() => {
                                        const url = product.report.image.startsWith("http")
                                          ? product.report.image
                                          : `${API_URL?.replace(/\/$/, "") || ""}${product.report.image.startsWith("/") ? "" : "/"}${product.report.image}`;
                                        setDocPreviewModal({
                                          url,
                                          title: `${product.productDescription || "Product"} - Technical Image`,
                                          isPdf: false,
                                        });
                                      }}
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
                                  </>
                                )}
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

                          {/* Action — Save button per record */}
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
                                    <Save className="w-[0.75vw] h-[0.75vw]" />
                                    Re-Submit
                                  </>
                                )}
                              </button>
                            ) : isClaimedByMe && draft ? (
                              <button
                                onClick={() => saveRow(entry, product, draft)}
                                disabled={
                                  !draft?.hasChanges ||
                                  savingStates[product._pid]
                                }
                                className={`inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.75vw] font-semibold transition-all ${
                                  savingStates[product._pid]
                                    ? "bg-blue-400 text-white cursor-not-allowed"
                                    : draft?.hasChanges
                                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-md"
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
                                    <Save className="w-[0.75vw] h-[0.75vw]" />
                                    Save
                                  </>
                                )}
                              </button>
                            ) : !product.assignedTo ? (
                              <ClaimButton
                                onClaim={() =>
                                  claimProduct(entry.id, product._pid)
                                }
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-[0.4vw]">
                                <span
                                  className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.18vw] rounded-full text-[0.65vw] font-bold border ${statusCfg.badge || "bg-gray-100 text-gray-700"}`}
                                >
                                  <StatusIcon className="w-[0.65vw] h-[0.65vw]" />
                                  {pStatus}
                                </span>
                                {(product.report || pStatus !== "Open") && (
                                  <button
                                    onClick={() => {
                                      setEditReportModal({
                                        entry,
                                        product,
                                        draft: { ...getDraft(product._pid, product) },
                                      });
                                      setEditReason("");
                                    }}
                                    className="flex items-center gap-[0.2vw] px-[0.5vw] py-[0.25vw] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-[0.3vw] text-[0.68vw] font-semibold transition-all shadow-sm cursor-pointer"
                                    title="Edit Report"
                                  >
                                    <Edit3 className="w-[0.65vw] h-[0.65vw]" />
                                    <span>Edit</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 border-t border-slate-400 px-[1.2vw] py-[0.6vw] flex items-center justify-between flex-shrink-0">
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
                disabled={isBulkSaving || !hasAnyDraftChanges}
                className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.75vw] font-semibold transition-all ml-[1vw] ${
                  isBulkSaving
                    ? "bg-emerald-400 text-white cursor-not-allowed"
                    : hasAnyDraftChanges
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-900/20"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                }`}
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
                    {hasAnyDraftChanges && (
                      <span className="ml-[0.2vw] px-[0.35vw] py-[0.05vw] bg-white/20 text-white rounded-full text-[0.65vw] font-bold">
                        {
                          Object.values(drafts).filter((d) => d && d.hasChanges)
                            .length
                        }
                      </span>
                    )}
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

                  // Add closure edit history entries if present
                  const closureEdits = historySelected.product._closureEdits || [];
                  closureEdits.forEach((ce) => {
                    timeline.push({
                      type: "closureEdit",
                      status: "Report Edited",
                      remark: ce.reason || "Report modified",
                      adminName: ce.editedByName,
                      role: ce.role,
                      diffs: ce.diffs,
                      timestamp: ce.editedAt,
                    });
                  });

                  // Add general inward edit history entries if relevant to this product
                  const inwardEdits = historySelected.entry.editHistory || [];
                  inwardEdits.forEach((ie) => {
                    const relevantDiffs = (ie.diffs || []).filter(
                      (d) => d.field.includes(historySelected.product.productCode || "") || d.field.includes("Product")
                    );
                    if (relevantDiffs.length > 0) {
                      timeline.push({
                        type: "closureEdit",
                        status: "Inward Edited",
                        remark: ie.reason || "Material record updated",
                        adminName: ie.editedByName,
                        role: ie.role,
                        diffs: relevantDiffs,
                        timestamp: ie.editedAt,
                      });
                    }
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

                        if (item.type === "closureEdit") {
                          cfg = {
                            icon: Edit3,
                            bg: "bg-purple-50 text-purple-700 border-purple-300",
                            border: "border-purple-300",
                            text: "text-purple-800",
                          };
                          label = `${item.status} (${item.role || "User"}: ${item.adminName || "—"})`;
                        } else if (item.type === "admin") {
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

                              {item.diffs && item.diffs.length > 0 && (
                                <div className="mt-[0.5vw] p-[0.5vw] bg-white rounded-[0.4vw] border border-purple-100 text-[0.72vw]">
                                  <span className="font-bold text-purple-700 block mb-[0.2vw]">
                                    Field Changes:
                                  </span>
                                  <div className="space-y-[0.2vw]">
                                    {item.diffs.map((d, di) => (
                                      <div key={di} className="flex items-center gap-[0.4vw] flex-wrap text-slate-600">
                                        <span className="font-semibold text-slate-800 bg-slate-100 px-[0.3vw] py-[0.05vw] rounded">
                                          {d.field}
                                        </span>
                                        <span className="text-red-500 line-through">
                                          {d.originalValue || "—"}
                                        </span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-emerald-600 font-semibold">
                                          {d.editedValue || "—"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
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

      {/* Edit Report Modal */}
      <AnimatePresence>
        {editReportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-[2vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[55vw] max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-[1.5vw] py-[1vw] border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[1.1vw] font-bold text-slate-800 flex items-center gap-[0.5vw]">
                    <Edit3 className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                    Edit Submitted Report
                  </h3>
                  <p className="text-[0.72vw] text-slate-500 font-medium">
                    {editReportModal.product.productDescription} ({editReportModal.product.serialNumber})
                  </p>
                </div>
                <button
                  onClick={() => setEditReportModal(null)}
                  className="p-[0.4vw] rounded-full hover:bg-slate-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1vw]">
                <div className="grid grid-cols-3 gap-[0.8vw]">
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Status</label>
                    <select
                      value={editReportModal.draft.status || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, status: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="">Select</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Tested By</label>
                    <input
                      type="text"
                      value={editReportModal.draft.testedBy || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, testedBy: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">FQA By</label>
                    <input
                      type="text"
                      value={editReportModal.draft.fqaBy || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, fqaBy: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">4M Category</label>
                    <select
                      value={editReportModal.draft.fourMCategory || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, fourMCategory: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      {fourMCategories?.map((opt) => (
                        <option key={opt._id || opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Error Code</label>
                    <input
                      type="text"
                      value={editReportModal.draft.errorCode || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, errorCode: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">PV</label>
                    <input
                      type="text"
                      value={editReportModal.draft.pv !== undefined ? editReportModal.draft.pv : (editReportModal.draft.pvCv ? editReportModal.draft.pvCv.split(',')[0]?.trim() : "")}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, pv: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">CV</label>
                    <input
                      type="text"
                      value={editReportModal.draft.cv !== undefined ? editReportModal.draft.cv : (editReportModal.draft.pvCv ? editReportModal.draft.pvCv.split(',')[1]?.trim() : "")}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, cv: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[0.8vw]">
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Problem Description</label>
                    <textarea
                      rows={2}
                      value={editReportModal.draft.problemDescription || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, problemDescription: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Root Cause</label>
                    <textarea
                      rows={2}
                      value={editReportModal.draft.rootCause || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, rootCause: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Fault Parts</label>
                    <input
                      type="text"
                      value={editReportModal.draft.faultParts || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, faultParts: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Parts Replaced</label>
                    <textarea
                      rows={2}
                      value={editReportModal.draft.partsReplacement || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, partsReplacement: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Corrective Action</label>
                    <textarea
                      rows={2}
                      value={editReportModal.draft.correctiveAction || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, correctiveAction: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-[0.8vw]">
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Time (Hours)</label>
                    <input
                      type="text"
                      value={editReportModal.draft.timeInHours || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const timeVal = parseFloat(val);
                        const userCtc = parseFloat(currentUser?.ctc || 0);
                        let manpower = 0;
                        if (!isNaN(timeVal) && timeVal > 0 && userCtc > 0) {
                          manpower = Math.round(((userCtc / (26 * 8)) * timeVal) * 100) / 100;
                        }
                        setEditReportModal((prev) => ({
                          ...prev,
                          draft: {
                            ...prev.draft,
                            timeInHours: val,
                            manpowerCost: manpower,
                          }
                        }));
                      }}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Material Cost (₹)</label>
                    <input
                      type="text"
                      value={editReportModal.draft.materialCost || ""}
                      onChange={(e) => setEditReportModal((prev) => ({
                        ...prev,
                        draft: { ...prev.draft, materialCost: e.target.value }
                      }))}
                      className="w-full text-[0.75vw] border border-gray-300 rounded p-[0.35vw] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.72vw] font-bold text-slate-700 mb-[0.2vw] block">Man Power Cost (₹)</label>
                    <div className="w-full text-[0.75vw] bg-slate-100 border border-gray-300 rounded p-[0.35vw] font-semibold text-emerald-700">
                      ₹{Number(editReportModal.draft.manpowerCost || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Edit Reason input */}
                <div className="bg-amber-50/60 border border-amber-200 rounded-[0.5vw] p-[0.8vw]">
                  <label className="text-[0.75vw] font-bold text-amber-900 mb-[0.2vw] block">
                    Reason for Editing (Required for change tracking)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason for modifying this technical report..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full text-[0.75vw] border border-amber-300 rounded p-[0.38vw] bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-[0.8vw]">
                <button
                  type="button"
                  onClick={() => setEditReportModal(null)}
                  className="px-[1.2vw] py-[0.45vw] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-bold text-[0.75vw] cursor-pointer transition-all border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={async () => {
                    setIsSubmittingEdit(true);
                    try {
                      const res = await axios.patch(
                        `${API_URL}/service-material/${editReportModal.entry.id}/product/${editReportModal.product._pid}/edit-report`,
                        {
                          report: editReportModal.draft,
                          reason: editReason,
                          editedBy: currentUser?.userId || currentUser?.id,
                          editedByName: currentUser?.name || "User",
                          role: currentUser?.role || "Employee",
                        }
                      );
                      toast("Report edited and audit changes logged successfully!");
                      const updatedRow = { ...res.data, id: res.data._id };
                      setEntries((prev) => prev.map((e) => (e.id === editReportModal.entry.id ? updatedRow : e)));
                      setEditReportModal(null);
                      if (socket) {
                        socket.emit("service-material:change");
                      }
                    } catch (err) {
                      toast(err.response?.data?.message || "Failed to update report", "error");
                    } finally {
                      setIsSubmittingEdit(false);
                    }
                  }}
                  className="flex items-center gap-[0.4vw] px-[1.5vw] py-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-[0.75vw] cursor-pointer transition-all shadow-md border-0"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-[0.8vw] h-[0.8vw] animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-[0.8vw] h-[0.8vw]" />
                      Save Modifications
                    </>
                  )}
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

      {/* Multi-Serial Filter Modal */}
      <AnimatePresence>
        {showSerialFilterModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center z-[70] p-[1vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[30vw] max-w-[500px] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-[1.2vw] py-[0.9vw] bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <ListFilter className="w-[1vw] h-[1vw]" />
                  </div>
                  <div>
                    <h3 className="text-[0.95vw] font-bold text-slate-900 leading-tight">
                      Filter by Serial Numbers
                    </h3>
                    <p className="text-[0.68vw] text-slate-500 font-medium">
                      Paste or enter multiple serial numbers to filter the records
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSerialFilterModal(false)}
                  className="w-[1.6vw] h-[1.6vw] rounded-full hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-[0.9vw] h-[0.9vw]" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-[1.2vw] flex flex-col gap-[0.8vw]">
                <div>
                  <div className="flex items-center justify-between mb-[0.3vw]">
                    <label className="text-[0.72vw] font-bold text-slate-700">
                      Serial Numbers (one per line, comma or space separated)
                    </label>
                    {tempSerialInput.trim() && (
                      <span className="text-[0.65vw] font-semibold text-indigo-600 bg-indigo-50 px-[0.4vw] py-[0.1vw] rounded">
                        {
                          tempSerialInput
                            .split(/[,\s\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean).length
                        }{" "}
                        detected
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={tempSerialInput}
                    onChange={(e) => setTempSerialInput(e.target.value)}
                    placeholder="Example:&#10;NB2326Jhjh&#10;CSF2326xJjkjh&#10;FGF2326xJjkjh"
                    className="w-full p-[0.7vw] border border-slate-300 rounded-[0.5vw] text-[0.75vw] font-mono font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y shadow-inner placeholder:font-sans placeholder:text-slate-400"
                    autoFocus
                  />
                  <p className="text-[0.65vw] text-slate-500 mt-[0.3vw]">
                    Tip: You can copy a column of serial numbers directly from Excel or Google Sheets and paste here.
                  </p>
                </div>

                {/* Quick actions inside modal */}
                <div className="flex items-center justify-between pt-[0.4vw] border-t border-slate-100 text-[0.7vw]">
                  <button
                    type="button"
                    onClick={() => setTempSerialInput("")}
                    className="text-slate-500 hover:text-red-600 font-semibold flex items-center gap-[0.3vw] cursor-pointer"
                  >
                    <Trash2 className="w-[0.75vw] h-[0.75vw]" />
                    <span>Clear text</span>
                  </button>
                  <span className="text-slate-400 text-[0.65vw]">
                    Matching is case-insensitive
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-[0.6vw] px-[1.2vw] py-[0.8vw] bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSerialFilterModal(false)}
                  className="px-[1.2vw] py-[0.45vw] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-[0.4vw] font-semibold text-[0.75vw] cursor-pointer transition-all shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllSerials();
                    setShowSerialFilterModal(false);
                  }}
                  className="px-[1vw] py-[0.45vw] bg-red-50 hover:bg-red-100 text-red-600 rounded-[0.4vw] font-semibold text-[0.75vw] cursor-pointer transition-all"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={applySerialModal}
                  className="px-[1.5vw] py-[0.45vw] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[0.4vw] font-semibold text-[0.75vw] cursor-pointer transition-all shadow-sm"
                >
                  Apply Filter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* In-App Document Preview Modal (for Image & PDF without navigating away) */}
      <AnimatePresence>
        {docPreviewModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[110] p-[1.5vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[75vw] max-w-[1100px] h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-[1.2vw] py-[0.8vw] bg-slate-900 text-white">
                <div className="flex items-center gap-[0.6vw]">
                  {docPreviewModal.isPdf ? (
                    <FileText className="w-[1.2vw] h-[1.2vw] text-red-400" />
                  ) : (
                    <Eye className="w-[1.2vw] h-[1.2vw] text-blue-400" />
                  )}
                  <h3 className="text-[0.9vw] font-bold text-white tracking-wide">
                    {docPreviewModal.title || (docPreviewModal.isPdf ? "PDF Document Preview" : "Image Preview")}
                  </h3>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <a
                    href={docPreviewModal.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.72vw] text-slate-300 hover:text-white flex items-center gap-[0.3vw] px-[0.6vw] py-[0.25vw] rounded bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <Download className="w-[0.8vw] h-[0.8vw]" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocPreviewModal(null)}
                    className="text-slate-400 hover:text-white p-[0.3vw] rounded-full hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-[1.1vw] h-[1.1vw]" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden p-[1vw]">
                {docPreviewModal.isPdf ? (
                  <iframe
                    src={`${docPreviewModal.url}#toolbar=1&navpanes=0`}
                    title="PDF Document"
                    className="w-full h-full rounded-[0.4vw] border border-slate-300 bg-white shadow-inner"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-[1vw]">
                    <img
                      src={docPreviewModal.url}
                      alt="Attachment Preview"
                      className="max-h-full max-w-full object-contain rounded-[0.4vw] shadow-md border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
