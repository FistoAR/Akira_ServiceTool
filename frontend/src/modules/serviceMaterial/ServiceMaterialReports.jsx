import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx-js-style";
import {
  Package,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  FileText,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Search,
  Filter,
  Columns,
  History,
  Info,
  CheckSquare,
  Square,
  Loader2,
  Check,
  CheckCircle2,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import { useSocket } from "../../contexts/SocketContext";
import CustomDropdown from "../../components/CustomDropdown";

const API_URL = import.meta.env.VITE_API_URL;

// Helpers
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

const toDateObj = (d) => {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day));
};

// Customer Type Badge Style
const getCustomerTypeBadgeStyle = (type) => {
  switch (type) {
    case "OEM":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "End Customer":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Distributor":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Dealer":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

// Status Configuration matching Service Call pill styling
const getMaterialStatusBadge = (status, finalStatus) => {
  let displayStatus = status || "Open";
  if (displayStatus === "Completed" && finalStatus !== "Completed") {
    displayStatus = "Review Required";
  }

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
  if (displayStatus === "Completed") {
    badgeStyle = "bg-emerald-600 text-white border-emerald-600";
  } else if (displayStatus === "Under Testing" || displayStatus === "Repair in Progress" || displayStatus === "Assigned") {
    badgeStyle = "bg-blue-600 text-white border-blue-600";
  } else if (displayStatus === "Pending" || displayStatus === "Hold") {
    badgeStyle = "bg-amber-500 text-white border-amber-500";
  } else if (displayStatus === "Review Required") {
    badgeStyle = "bg-indigo-600 text-white border-indigo-600";
  } else if (displayStatus === "Not Repairable") {
    badgeStyle = "bg-rose-600 text-white border-rose-600";
  }

  return { label: displayStatus, style: badgeStyle };
};

// Status Chips for the segmented pill bar
const STATUS_CHIPS = [
  { label: "All", dot: "bg-blue-600" },
  { label: "Open", dot: "bg-slate-500" },
  { label: "Assigned", dot: "bg-blue-500" },
  { label: "Repair in Progress", dot: "bg-cyan-600" },
  { label: "Under Testing", dot: "bg-indigo-500" },
  { label: "Pending", dot: "bg-amber-500" },
  { label: "Hold", dot: "bg-orange-500" },
  { label: "Review Required", dot: "bg-purple-600" },
  { label: "Not Repairable", dot: "bg-rose-500" },
  { label: "Completed", dot: "bg-emerald-600" },
];

// Available Columns for Export
const EXPORT_COLUMNS = [
  { key: "sno", label: "S.No" },
  { key: "date", label: "Date" },
  { key: "customerName", label: "Customer Name" },
  { key: "customerCode", label: "Customer Code" },
  { key: "category", label: "Customer Category" },
  { key: "unit", label: "Unit" },
  { key: "site", label: "Site" },
  { key: "refNoCustomer", label: "Ref No (Customer)" },
  { key: "refNoInternal", label: "Ref No (Internal)" },
  { key: "productDescription", label: "Product Description" },
  { key: "productCode", label: "Product Code" },
  { key: "boardType", label: "Board Type" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "type", label: "Warranty Type (W/PW)" },
  { key: "expectedDeliveryDate", label: "Expected Delivery Date" },
  { key: "assignedToName", label: "Assigned Engineer" },
  { key: "testedBy", label: "Tested By" },
  { key: "fourMCategory", label: "4M Category" },
  { key: "errorCode", label: "Error Code" },
  { key: "problemDescription", label: "Problem Description" },
  { key: "rootCause", label: "Root Cause" },
  { key: "partsReplacement", label: "Parts Replaced" },
  { key: "correctiveAction", label: "Corrective Action" },
  { key: "disposition", label: "Disposition" },
  { key: "completedDate", label: "Completion Date" },
  { key: "status", label: "Status" },
  { key: "finalStatus", label: "Final Status" },
  { key: "remarks", label: "Action Remark" },
];

// ── Detail Modal (Clean ServiceCall Style) ──────────────────────────────────
const ServiceInfoModal = ({ item, onClose }) => {
  if (!item) return null;
  const { entry, product } = item;
  const report = product.report || {};

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white w-[54vw] max-h-[88vh] rounded-[1vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-[0.6vw]">
            <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <Package className="w-[0.95vw] h-[0.95vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">
                Service Material Details
              </h3>
              <p className="text-[0.72vw] text-slate-500 font-medium">
                {entry.customerName} {entry.customerCode ? `(${entry.customerCode})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-[0.35vw] rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.1vw] bg-[#f8fafd]">
          {/* Card 1: Inward & Customer Info */}
          <div className="bg-white rounded-[0.7vw] p-[1vw] border border-slate-200 shadow-2xs">
            <h4 className="text-[0.8vw] font-bold text-slate-700 mb-[0.7vw] flex items-center gap-[0.4vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full" />
              Inward &amp; Customer Information
            </h4>
            <div className="grid grid-cols-4 gap-[0.7vw] text-[0.76vw]">
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Inward Date</span>
                <span className="font-semibold text-slate-800">{fmtDate(entry.date)}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Customer Ref No</span>
                <span className="font-semibold text-purple-700">{entry.refNoCustomer || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Internal Ref No</span>
                <span className="font-semibold text-blue-700">{entry.refNoInternal || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Category</span>
                <span className="font-semibold text-slate-800">{entry.category || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-2">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Customer Name</span>
                <span className="font-semibold text-slate-800">{entry.customerName}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Unit</span>
                <span className="font-semibold text-teal-700">{entry.unit || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Site</span>
                <span className="font-semibold text-slate-800">{entry.site || "—"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Product & Warranty Details */}
          <div className="bg-white rounded-[0.7vw] p-[1vw] border border-slate-200 shadow-2xs">
            <h4 className="text-[0.8vw] font-bold text-slate-700 mb-[0.7vw] flex items-center gap-[0.4vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-emerald-600 rounded-full" />
              Product &amp; Warranty Details
            </h4>
            <div className="grid grid-cols-4 gap-[0.7vw] text-[0.76vw]">
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-2">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Product Description</span>
                <span className="font-semibold text-slate-800">{product.productDescription || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Product Code</span>
                <span className="font-mono font-semibold text-slate-800">{product.productCode || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Board Type</span>
                <span className="font-semibold text-slate-800">{product.boardType || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Serial Number</span>
                <span className="font-mono font-bold text-blue-700">{product.serialNumber || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Warranty Type</span>
                <span className={`inline-block px-[0.5vw] py-[0.1vw] rounded font-bold text-[0.7vw] ${product.type === "W" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                  {product.type === "W" ? "Warranty (W)" : "Paid (PW)"}
                </span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Expected Delivery</span>
                <span className="font-semibold text-slate-800">{fmtDate(product.expectedDeliveryDate)}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Assigned Engineer</span>
                <span className="font-bold text-slate-800">{product.assignedToName || "Unassigned"}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Technical Service Report */}
          <div className="bg-white rounded-[0.7vw] p-[1vw] border border-slate-200 shadow-2xs">
            <h4 className="text-[0.8vw] font-bold text-slate-700 mb-[0.7vw] flex items-center gap-[0.4vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-indigo-600 rounded-full" />
              Technical Service Report
            </h4>
            <div className="grid grid-cols-3 gap-[0.7vw] text-[0.76vw]">
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Tested By</span>
                <span className="font-semibold text-slate-800">{report.testedBy || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">4M Category</span>
                <span className="font-semibold text-slate-800">{report.fourMCategory || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Error Code</span>
                <span className="font-mono font-semibold text-slate-800">{report.errorCode || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-3">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Problem Description</span>
                <span className="text-slate-800">{report.problemDescription || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-3">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Root Cause</span>
                <span className="text-slate-800">{report.rootCause || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-3">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Corrective Action</span>
                <span className="text-slate-800">{report.correctiveAction || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80 col-span-2">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Parts Replaced</span>
                <span className="text-slate-800">{report.partsReplacement || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-[0.55vw] rounded-[0.4vw] border border-slate-200/80">
                <span className="text-[0.68vw] text-slate-500 block font-medium">Disposition</span>
                <span className="font-semibold text-slate-800">{report.disposition || "—"}</span>
              </div>
            </div>

            {/* Technical Image if any */}
            {report.image && (
              <div className="mt-[0.8vw] pt-[0.8vw] border-t border-slate-200">
                <span className="text-[0.72vw] text-slate-600 block font-semibold mb-[0.4vw]">Attached Technical Image</span>
                <img
                  src={
                    report.image.startsWith("data:") || report.image.startsWith("http")
                      ? report.image
                      : `${API_URL?.replace(/\/$/, "") || ""}${report.image.startsWith("/") ? "" : "/"}${report.image}`
                  }
                  alt="Technical Report Attachment"
                  className="max-w-[14vw] rounded-[0.4vw] border border-slate-300 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => {
                    const url = report.image.startsWith("data:") || report.image.startsWith("http")
                      ? report.image
                      : `${API_URL?.replace(/\/$/, "") || ""}${report.image.startsWith("/") ? "" : "/"}${report.image}`;
                    window.open(url, "_blank");
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-[1.4vw] h-[2.1vw] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[0.76vw] rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── History Modal (Structured timeline matching Service Call & AGENT.md) ──────
const ProductHistoryModal = ({ item, onClose }) => {
  if (!item) return null;
  const { entry, product } = item;
  const empHistory = product.report?.history || [];
  const finalHistory = product.finalStatusHistory || [];
  const timeline = [];

  empHistory.forEach((h) =>
    timeline.push({ type: "report", ...h })
  );

  finalHistory.forEach((h) => {
    const isCompleted = h.status === "Completed";
    timeline.push({
      type: "admin",
      status: isCompleted ? "Approved" : "Admin Returned",
      remark: h.remarks,
      timestamp: h.timestamp || h.date,
    });
  });

  // Sort newest first
  timeline.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[1vw] shadow-2xl border border-slate-200 w-[38vw] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Clock className="w-[0.95vw] h-[0.95vw]" />
            </div>
            <div>
              <h3 className="text-[1vw] font-bold text-slate-800">Status History</h3>
              <p className="text-[0.7vw] text-slate-500 font-medium">
                {product.productDescription} {product.serialNumber ? `(${product.serialNumber})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-[0.35vw] rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-[1vw] h-[1vw]" />
          </button>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1vw] bg-[#f8fafd]">
          {timeline.length === 0 ? (
            <div className="text-center py-[4vw] text-slate-400 font-medium text-[0.8vw]">
              No status history records found for this product.
            </div>
          ) : (
            <div className="relative pl-[1.5vw] border-l-2 border-slate-200 ml-[0.6vw] space-y-[1.2vw] py-[0.5vw]">
              {timeline.map((item, index) => {
                const isAdmin = item.type === "admin";
                const isApproved = item.status === "Approved" || item.status === "Completed";
                const dotColor = isApproved ? "bg-emerald-500" : isAdmin ? "bg-amber-500" : "bg-blue-600";

                return (
                  <div key={index} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-[1.85vw] top-[0.4vw] w-[0.7vw] h-[0.7vw] rounded-full ${dotColor} ring-4 ring-white shadow-xs`} />

                    {/* Content Card */}
                    <div className="bg-white rounded-[0.6vw] p-[0.8vw] border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-[0.3vw]">
                        <span className={`inline-flex items-center px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isAdmin
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-[0.68vw] text-slate-400 font-medium">
                          {fmtDateTime(item.timestamp)}
                        </span>
                      </div>

                      {item.remark && (
                        <p className="text-[0.75vw] text-slate-700 font-medium mt-[0.3vw] bg-slate-50/80 p-[0.4vw] rounded-[0.35vw] border border-slate-200/70">
                          {item.remark}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-[1.3vw] h-[2.1vw] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[0.76vw] rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Reports Component ──────────────────────────────────────────────────
export default function ServiceMaterialReports({ currentUser: propUser }) {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useNotification();
  const { socket } = useSocket();

  // Filters & State
  const [activeMainView, setActiveMainView] = useState("allProducts"); // "allProducts" | "assignments"
  const [activeStatusTab, setActiveStatusTab] = useState("All");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [warrantyFilter, setWarrantyFilter] = useState("All");

  // Popover Toggles
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showColPicker, setShowColPicker] = useState(false);
  const [selectedExportCols, setSelectedExportCols] = useState(
    EXPORT_COLUMNS.map((c) => c.key)
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [infoItem, setInfoItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      const [matRes, empRes] = await Promise.all([
        axios.get(`${API_URL}/service-material`),
        axios.get(`${API_URL}/auth/employees`),
      ]);
      setEntries(matRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error("Error loading service material data:", err);
      toast("Failed to load reports data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (socket) {
      socket.on("service-materials-changed", () => {
        fetchData();
      });
      return () => {
        socket.off("service-materials-changed");
      };
    }
  }, [socket]);

  // Flatten all products across all inward entries with parent context
  const allProducts = useMemo(() => {
    const list = [];
    entries.forEach((entry) => {
      (entry.products || []).forEach((prod) => {
        list.push({ entry, product: prod });
      });
    });
    return list;
  }, [entries]);

  // Distinct Categories
  const categoriesList = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [entries]);

  // Status Tab Counts (computed against the current date/search/employee filters)
  const statusCounts = useMemo(() => {
    const counts = { All: 0 };
    STATUS_CHIPS.forEach((c) => {
      counts[c.label] = 0;
    });

    allProducts.forEach(({ entry, product }) => {
      // Apply Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (entry.customerName || "").toLowerCase().includes(q) ||
          (entry.customerCode || "").toLowerCase().includes(q) ||
          (entry.refNoCustomer || "").toLowerCase().includes(q) ||
          (entry.refNoInternal || "").toLowerCase().includes(q) ||
          (product.productDescription || "").toLowerCase().includes(q) ||
          (product.productCode || "").toLowerCase().includes(q) ||
          (product.serialNumber || "").toLowerCase().includes(q) ||
          (product.assignedToName || "").toLowerCase().includes(q);
        if (!matches) return;
      }

      // Apply Date Filter
      const entryDateStr = entry.date ? entry.date.slice(0, 10) : "";
      if (fromDate && !toDate) {
        if (entryDateStr !== fromDate) return;
      } else {
        const entryDate = entryDateStr ? toDateObj(entryDateStr) : null;
        if (fromDate && entryDate && entryDate < toDateObj(fromDate)) return;
        if (toDate && entryDate && entryDate > toDateObj(toDate)) return;
      }

      // Employee Filter
      if (selectedEmployee !== "All" && product.assignedTo !== selectedEmployee) {
        return;
      }

      // Category Filter
      if (categoryFilter !== "All" && entry.category !== categoryFilter) {
        return;
      }

      // Warranty Filter
      if (warrantyFilter !== "All" && product.type !== warrantyFilter) {
        return;
      }

      counts.All++;

      const rawStatus = product.status || product.report?.status || "Open";
      let statusKey = rawStatus;
      if (rawStatus === "Completed") {
        if (product.finalStatus === "Completed") {
          statusKey = "Completed";
        } else {
          statusKey = "Review Required";
        }
      }

      if (counts[statusKey] !== undefined) {
        counts[statusKey]++;
      }
    });

    return counts;
  }, [allProducts, search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return allProducts.filter(({ entry, product }) => {
      // 1. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (entry.customerName || "").toLowerCase().includes(q) ||
          (entry.customerCode || "").toLowerCase().includes(q) ||
          (entry.refNoCustomer || "").toLowerCase().includes(q) ||
          (entry.refNoInternal || "").toLowerCase().includes(q) ||
          (product.productDescription || "").toLowerCase().includes(q) ||
          (product.productCode || "").toLowerCase().includes(q) ||
          (product.serialNumber || "").toLowerCase().includes(q) ||
          (product.assignedToName || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Date Range Filter
      const entryDateStr = entry.date ? entry.date.slice(0, 10) : "";
      if (fromDate && !toDate) {
        if (entryDateStr !== fromDate) return false;
      } else {
        const entryDate = entryDateStr ? toDateObj(entryDateStr) : null;
        if (fromDate && entryDate && entryDate < toDateObj(fromDate)) return false;
        if (toDate && entryDate && entryDate > toDateObj(toDate)) return false;
      }

      // 3. Employee Filter
      if (selectedEmployee !== "All" && product.assignedTo !== selectedEmployee) {
        return false;
      }

      // 4. Category Filter
      if (categoryFilter !== "All" && entry.category !== categoryFilter) {
        return false;
      }

      // 5. Warranty Filter
      if (warrantyFilter !== "All" && product.type !== warrantyFilter) {
        return false;
      }

      // 6. Status Tab Filter
      if (activeStatusTab !== "All") {
        const rawStatus = product.status || product.report?.status || "Open";
        if (activeStatusTab === "Review Required") {
          return rawStatus === "Completed" && product.finalStatus !== "Completed";
        }
        if (activeStatusTab === "Completed") {
          return rawStatus === "Completed" && product.finalStatus === "Completed";
        }
        return rawStatus === activeStatusTab;
      }

      return true;
    });
  }, [allProducts, search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter, activeStatusTab]);

  // Employee Assignment Summary Data (for View 2: Employee Assignment Report)
  const employeeSummaryData = useMemo(() => {
    const map = {};
    employees
      .filter((emp) => emp.role === "User" || emp.role === "Employee")
      .forEach((emp) => {
        const empId = emp.userId || emp._id;
        map[empId] = {
          id: empId,
          name: emp.name,
          department: emp.department || "Service",
          assignedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          reviewCount: 0,
          pendingCount: 0,
        };
      });

    allProducts.forEach(({ product }) => {
      if (product.assignedTo && map[product.assignedTo]) {
        const item = map[product.assignedTo];
        item.assignedCount++;
        const rawStatus = product.status || product.report?.status || "Open";
        if (rawStatus === "Completed") {
          if (product.finalStatus === "Completed") {
            item.completedCount++;
          } else {
            item.reviewCount++;
          }
        } else if (rawStatus === "Under Testing" || rawStatus === "Repair in Progress") {
          item.inProgressCount++;
        } else if (rawStatus === "Pending" || rawStatus === "Hold") {
          item.pendingCount++;
        }
      }
    });

    return Object.values(map);
  }, [employees, allProducts]);

  // Reset pagination when active filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter, activeStatusTab, activeMainView]);

  // Pagination Slicing
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [filteredProducts, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;

  // Toggle Column Selection
  const toggleExportCol = (key) => {
    setSelectedExportCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllExportCols = () => setSelectedExportCols(EXPORT_COLUMNS.map((c) => c.key));
  const unselectAllExportCols = () => setSelectedExportCols([]);

  // Excel Export Handler using xlsx-js-style
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      toast("No data available to export", "error");
      return;
    }

    try {
      const activeCols = EXPORT_COLUMNS.filter((c) => selectedExportCols.includes(c.key));
      const rows = filteredProducts.map(({ entry, product }, idx) => {
        const report = product.report || {};
        const fullRow = {
          sno: idx + 1,
          date: fmtDate(entry.date),
          customerName: entry.customerName || "",
          customerCode: entry.customerCode || "",
          category: entry.category || "",
          unit: entry.unit || "",
          site: entry.site || "",
          refNoCustomer: entry.refNoCustomer || "",
          refNoInternal: entry.refNoInternal || "",
          productDescription: product.productDescription || "",
          productCode: product.productCode || "",
          boardType: product.boardType || "",
          serialNumber: product.serialNumber || "",
          type: product.type === "W" ? "Warranty" : "Paid",
          expectedDeliveryDate: fmtDate(product.expectedDeliveryDate),
          assignedToName: product.assignedToName || "Unassigned",
          testedBy: report.testedBy || "",
          fourMCategory: report.fourMCategory || "",
          errorCode: report.errorCode || "",
          problemDescription: report.problemDescription || "",
          rootCause: report.rootCause || "",
          partsReplacement: report.partsReplacement || "",
          correctiveAction: report.correctiveAction || "",
          disposition: report.disposition || "",
          completedDate: fmtDate(report.completedDate),
          status: product.status || report.status || "Open",
          finalStatus: product.finalStatus || "",
          remarks: report.currentRemark || product.remark || "",
        };

        const exportRow = {};
        activeCols.forEach((col) => {
          exportRow[col.label] = fullRow[col.key] ?? "";
        });
        return exportRow;
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Header and Cell Styling
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
        fill: { fgColor: { rgb: "1A73E8" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      const cellStyle = {
        font: { sz: 9, name: "Calibri" },
        alignment: { vertical: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: "F1F5F9" } },
        },
      };

      const altCellStyle = {
        ...cellStyle,
        fill: { fgColor: { rgb: "F8FAFC" } },
      };

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
          if (R === 0) {
            ws[cellRef].s = headerStyle;
          } else {
            ws[cellRef].s = R % 2 === 0 ? altCellStyle : cellStyle;
          }
        }
      }

      // Set column widths
      ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.min(Math.max(k.length + 4, 14), 40),
      }));
      ws["!rows"] = [{ hpt: 26 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Service Material Reports");
      XLSX.writeFile(
        wb,
        `Service_Material_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast("Report exported successfully to Excel", "success");
    } catch (err) {
      console.error("Export error:", err);
      toast("Failed to export Excel report", "error");
    }
  };

  const hasActiveFilters =
    Boolean(fromDate) ||
    Boolean(toDate) ||
    selectedEmployee !== "All" ||
    categoryFilter !== "All" ||
    warrantyFilter !== "All";

  const clearAllFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedEmployee("All");
    setCategoryFilter("All");
    setWarrantyFilter("All");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full text-[0.85vw] bg-slate-100/70 p-[0.6vw] overflow-hidden">
      {/* ── Top Header Toolbar (Service Call Capsule Style) ──────────────── */}
      <div className="flex items-center justify-between gap-[0.8vw] mb-[0.6vw] shrink-0">
        {/* Main View Capsule: All Material vs Employee Assignment */}
        <div className="inline-flex items-center p-[0.25vw] bg-slate-200/70 rounded-full border border-slate-300/80 gap-[0.45vw] shadow-2xs">
          <button
            onClick={() => {
              setActiveMainView("allProducts");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.45vw] px-[1vw] py-[0.38vw] rounded-full text-[0.76vw] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeMainView === "allProducts"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <Layers className="w-[0.85vw] h-[0.85vw]" />
            <span>All Material Inwards</span>
            <span
              className={`text-[0.66vw] font-medium ml-[0.15vw] transition-all ${
                activeMainView === "allProducts"
                  ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                  : "text-slate-500"
              }`}
            >
              {filteredProducts.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainView("assignments");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.45vw] px-[1vw] py-[0.38vw] rounded-full text-[0.76vw] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeMainView === "assignments"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <Users className="w-[0.85vw] h-[0.85vw]" />
            <span>Employee Assignment View</span>
            <span
              className={`text-[0.66vw] font-medium ml-[0.15vw] transition-all ${
                activeMainView === "assignments"
                  ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                  : "text-slate-500"
              }`}
            >
              {employeeSummaryData.length}
            </span>
          </button>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex items-center gap-[0.6vw]">
          {/* Soft Pill Search Box */}
          <div className="relative">
            <Search className="w-[0.85vw] h-[0.85vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product, customer, ref no, serial..."
              className="pl-[2.2vw] pr-[2vw] h-[2.2vw] w-[17vw] rounded-full border border-slate-200/90 text-[0.76vw] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 shadow-2xs transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-[0.2vw] cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-[0.8vw] h-[0.8vw]" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                showFilterPopover || hasActiveFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Filter by dates, employee, category, or warranty"
            >
              <Filter className="w-[0.85vw] h-[0.85vw]" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div className="absolute right-0 top-full mt-[0.4vw] w-[17vw] bg-white border border-slate-300 rounded-[0.5vw] shadow-lg z-50 p-[0.75vw] flex flex-col gap-[0.6vw] animate-in fade-in zoom-in-95 duration-100">
                  {/* Date Range */}
                  <div>
                    <label className="block text-[0.7vw] text-slate-600 font-medium mb-[0.2vw]">
                      Date Range
                    </label>
                    <div className="flex items-center justify-between bg-white border border-slate-300 rounded-[0.35vw] h-[1.9vw] px-[0.5vw] text-[0.7vw] hover:border-slate-400 transition-colors">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-transparent text-slate-700 font-normal outline-none cursor-pointer flex-1 min-w-0"
                      />
                      <span className="text-slate-400 mx-[0.25vw] shrink-0">—</span>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-transparent text-slate-700 font-normal outline-none cursor-pointer flex-1 min-w-0"
                      />
                    </div>
                  </div>

                  {/* Assigned Employee */}
                  <div>
                    <label className="block text-[0.7vw] text-slate-600 font-medium mb-[0.2vw]">
                      Assigned Employee
                    </label>
                    <CustomDropdown
                      size="sm"
                      searchable={true}
                      value={selectedEmployee}
                      onChange={(val) => {
                        setSelectedEmployee(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "All", label: "All Employees" },
                        ...employees.map((emp) => ({
                          value: emp.userId || emp._id,
                          label: `${emp.name} (${emp.department || "No Dept"})`,
                        })),
                      ]}
                      triggerClassName="!h-[1.9vw] !text-[0.72vw] border-slate-300 rounded-[0.35vw] font-normal !text-slate-700"
                    />
                  </div>

                  {/* Customer Category */}
                  <div>
                    <label className="block text-[0.7vw] text-slate-600 font-medium mb-[0.2vw]">
                      Customer Category
                    </label>
                    <CustomDropdown
                      size="sm"
                      value={categoryFilter}
                      onChange={(val) => {
                        setCategoryFilter(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "All", label: "All Categories" },
                        ...categoriesList.map((cat) => ({
                          value: cat,
                          label: cat,
                        })),
                      ]}
                      triggerClassName="!h-[1.9vw] !text-[0.72vw] border-slate-300 rounded-[0.35vw] font-normal !text-slate-700"
                    />
                  </div>

                  {/* Warranty Type (W/PW) */}
                  <div>
                    <label className="block text-[0.7vw] text-slate-600 font-medium mb-[0.2vw]">
                      Warranty Type
                    </label>
                    <CustomDropdown
                      size="sm"
                      value={warrantyFilter}
                      onChange={(val) => {
                        setWarrantyFilter(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "All", label: "All Types" },
                        { value: "W", label: "Warranty (W)" },
                        { value: "PW", label: "Paid (PW)" },
                      ]}
                      triggerClassName="!h-[1.9vw] !text-[0.72vw] border-slate-300 rounded-[0.35vw] font-normal !text-slate-700"
                    />
                  </div>

                  {/* Clear Filter Button */}
                  {hasActiveFilters && (
                    <div className="pt-[0.3vw] border-t border-slate-200 mt-[0.1vw]">
                      <button
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-[0.3vw] text-[0.7vw] font-medium text-slate-700 hover:text-rose-600 transition-colors cursor-pointer py-[0.1vw]"
                      >
                        <Filter className="w-[0.75vw] h-[0.75vw] text-slate-700" />
                        <span>Clear All Filters</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Select Export Columns Button */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                showColPicker
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Select columns to export"
            >
              <Columns className="w-[0.85vw] h-[0.85vw] text-slate-500" />
              <span>Columns</span>
              <span className="ml-[0.1vw] px-[0.35vw] py-[0.02vw] text-[0.66vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {selectedExportCols.length}/{EXPORT_COLUMNS.length}
              </span>
            </button>

            {/* Column Picker Popover */}
            {showColPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColPicker(false)}
                />
                <div className="absolute right-0 top-full mt-[0.4vw] w-[18vw] max-h-[22vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-[0.7vw] border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <span className="text-[0.78vw] font-bold text-slate-800">Export Columns</span>
                    <div className="flex items-center gap-[0.4vw]">
                      <button
                        onClick={selectAllExportCols}
                        className="text-[0.7vw] font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 text-[0.7vw]">|</span>
                      <button
                        onClick={unselectAllExportCols}
                        className="text-[0.7vw] font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Unselect All
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-[0.4vw] space-y-[0.15vw] max-h-[15vw]">
                    {EXPORT_COLUMNS.map((col) => {
                      const isChecked = selectedExportCols.includes(col.key);
                      return (
                        <div
                          key={col.key}
                          onClick={() => toggleExportCol(col.key)}
                          className="flex items-center gap-[0.5vw] px-[0.6vw] py-[0.3vw] rounded-[0.35vw] cursor-pointer text-[0.75vw] text-slate-700 hover:bg-slate-50 transition-colors select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExportCol(col.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[0.85vw] h-[0.85vw] rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{col.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-[0.5vw] border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-[0.7vw] text-slate-500">
                      {selectedExportCols.length} of {EXPORT_COLUMNS.length} selected
                    </span>
                    <button
                      onClick={() => setShowColPicker(false)}
                      className="px-[0.6vw] py-[0.25vw] bg-blue-600 hover:bg-blue-700 text-white font-bold text-[0.72vw] rounded-[0.35vw] cursor-pointer shadow-2xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Excel Button (Matches Service Call Report Button) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-[0.35vw] px-[1vw] h-[2.2vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-[0.76vw] transition-all cursor-pointer shadow-sm"
            title="Export filtered reports to styled Excel sheet"
          >
            <Download className="w-[0.85vw] h-[0.85vw]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Main Report Display Card ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-300 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-[0.8vw] text-slate-500">
            <Loader2 className="w-[2.2vw] h-[2.2vw] text-blue-600 animate-spin" />
            <span className="text-[0.85vw] font-bold">Loading comprehensive reports...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: All Material Inwards Table */}
            {activeMainView === "allProducts" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Status Segmented Track Bar (Header Integrated) */}
                <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                  <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.4vw] max-w-full overflow-x-auto no-scrollbar shrink-0">
                    {STATUS_CHIPS.map(({ label, dot }) => {
                      const isActive = activeStatusTab === label;
                      const count = statusCounts[label] ?? 0;
                      return (
                        <button
                          key={label}
                          onClick={() => {
                            setActiveStatusTab(label);
                            setCurrentPage(1);
                          }}
                          className={`flex items-center gap-[0.45vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.74vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                            isActive
                              ? "bg-blue-600 text-white shadow-xs font-medium"
                              : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                          }`}
                        >
                          {label !== "All" && (
                            <span
                              className={`w-[0.4vw] h-[0.4vw] rounded-full shrink-0 ${
                                isActive ? "bg-white" : dot
                              }`}
                            />
                          )}
                          <span className={isActive ? "text-white" : "text-slate-700 font-medium"}>
                            {label}
                          </span>
                          <span
                            className={`text-[0.66vw] font-medium ml-[0.1vw] transition-all ${
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

                  <div className="flex items-center gap-[0.8vw] text-[0.72vw] text-slate-500 font-medium shrink-0">
                    <span>
                      Total Claimed:{" "}
                      <span className="text-blue-700 bg-blue-50 px-[0.45vw] py-[0.1vw] rounded-full border border-blue-200 font-medium">
                        {allProducts.filter((p) => p.product.assignedTo).length}
                      </span>
                    </span>
                    <span>
                      Active: <span className="text-slate-700 font-medium">{filteredProducts.length}</span> items
                    </span>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                      <tr>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">S.No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[7.5vw] whitespace-nowrap">Date</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Customer Name &amp; Code</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">Category</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[8vw] whitespace-nowrap">Ref No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[15vw] whitespace-nowrap">Product Description</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[7.5vw] whitespace-nowrap">Board Type</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[8.5vw] whitespace-nowrap">Serial No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[5vw] whitespace-nowrap">Type</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[10vw] whitespace-nowrap">Assigned Engineer</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Status</th>
                        <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[7vw]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.78vw]">
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-[8vh] text-center text-slate-400 font-semibold">
                            No service material records match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedProducts.map(({ entry, product }, idx) => {
                          const itemIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                          const statusBadge = getMaterialStatusBadge(
                            product.status || product.report?.status,
                            product.finalStatus
                          );

                          return (
                            <tr
                              key={`${entry.id || entry._id}-${product._pid}`}
                              className="hover:bg-blue-50/40 transition-colors border-b border-slate-200 last:border-0"
                            >
                              {/* S.No */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 text-center text-slate-600 font-normal">
                                {itemIndex}
                              </td>

                              {/* Date */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 whitespace-nowrap text-slate-800 font-normal">
                                {fmtDate(entry.date)}
                              </td>

                              {/* Customer Name & Code */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 max-w-[14vw]">
                                <div className="font-normal text-slate-800 truncate" title={entry.customerName}>
                                  {entry.customerName}
                                </div>
                                <div className="flex items-center gap-[0.35vw] text-[0.68vw] text-slate-500 mt-[0.1vw]">
                                  {entry.customerCode && <span>{entry.customerCode}</span>}
                                  {entry.site && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-600 truncate">{entry.site}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                                {entry.category ? (
                                  <span className={`inline-flex items-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal border shadow-2xs ${getCustomerTypeBadgeStyle(entry.category)}`}>
                                    {entry.category}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">—</span>
                                )}
                              </td>

                              {/* Ref No */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 whitespace-nowrap">
                                <div className="text-[0.74vw] font-normal text-purple-700 truncate" title={entry.refNoCustomer || ""}>
                                  {entry.refNoCustomer ? `Cust: ${entry.refNoCustomer}` : ""}
                                </div>
                                {entry.refNoInternal && (
                                  <div className="text-[0.68vw] text-blue-600 font-normal truncate" title={entry.refNoInternal}>
                                    Int: {entry.refNoInternal}
                                  </div>
                                )}
                                {!entry.refNoCustomer && !entry.refNoInternal && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Product Description */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 max-w-[15vw]">
                                <div className="font-normal text-slate-800 truncate" title={product.productDescription}>
                                  {product.productDescription || "—"}
                                </div>
                                <div className="text-[0.68vw] text-slate-500 font-mono mt-[0.1vw]">
                                  {product.productCode || "—"}
                                </div>
                              </td>

                              {/* Board Type */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 whitespace-nowrap text-slate-700 font-normal">
                                {product.boardType || "—"}
                              </td>

                              {/* Serial No */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 whitespace-nowrap font-mono font-normal text-slate-800">
                                {product.serialNumber || "—"}
                              </td>

                              {/* Type (W / PW) */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                                <span className={`inline-block px-[0.45vw] py-[0.1vw] rounded text-[0.68vw] font-normal ${
                                  product.type === "W"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}>
                                  {product.type || "W"}
                                </span>
                              </td>

                              {/* Assigned Engineer */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 whitespace-nowrap font-normal">
                                {product.assignedToName ? (
                                  <div className="font-normal text-slate-800">
                                    {product.assignedToName}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[0.72vw]">Unassigned</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-[0.65vw] px-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center px-[0.8vw] py-[0.25vw] rounded-lg text-[0.72vw] font-normal tracking-wide ${statusBadge.style}`}>
                                  {statusBadge.label}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-[0.65vw] px-[0.7vw] text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                <div className="flex items-center justify-center gap-[0.35vw]">
                                  <button
                                    onClick={() => setInfoItem({ entry, product })}
                                    className="px-[0.65vw] py-[0.25vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-medium transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => setHistoryItem({ entry, product })}
                                    className="p-[0.35vw] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                    title="View Lifecycle History"
                                  >
                                    <History className="w-[0.9vw] h-[0.9vw]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Pagination Controls */}
                <div className="bg-slate-50 border-t border-slate-200 px-[1vw] py-[0.55vw] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-[1.2vw]">
                    <span className="text-[0.72vw] text-slate-600 font-normal">
                      Showing{" "}
                      <span className="text-slate-700 font-medium">
                        {filteredProducts.length === 0
                          ? 0
                          : (currentPage - 1) * rowsPerPage + 1}
                        -
                        {Math.min(currentPage * rowsPerPage, filteredProducts.length)}
                      </span>{" "}
                      of <span className="text-slate-700 font-medium">{filteredProducts.length}</span> products
                    </span>
                  </div>

                  {/* Pagination Prev/Next Buttons */}
                  <div className="flex items-center gap-[0.4vw]">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-[0.35vw] rounded-[0.4vw] border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                    </button>

                    <span className="text-[0.72vw] font-medium text-slate-600 px-[0.5vw]">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-[0.35vw] rounded-[0.4vw] border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      title="Next Page"
                    >
                      <ChevronRight className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: Employee Assignment Summary Report */}
            {activeMainView === "assignments" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                      <tr>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[4vw] whitespace-nowrap">S.No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[16vw] whitespace-nowrap">Engineer Name</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[12vw] whitespace-nowrap">Department</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[10vw] whitespace-nowrap">Total Assigned</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[10vw] whitespace-nowrap">In Progress / Testing</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[10vw] whitespace-nowrap">Review Required</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[10vw] whitespace-nowrap">Pending / Hold</th>
                        <th className="py-[0.7vw] px-[0.7vw] text-center w-[10vw] whitespace-nowrap">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.78vw]">
                      {employeeSummaryData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-[8vh] text-center text-slate-400 font-semibold">
                            No employees configured.
                          </td>
                        </tr>
                      ) : (
                        employeeSummaryData.map((emp, index) => (
                          <tr
                            key={emp.id}
                            className="hover:bg-blue-50/40 transition-colors border-b border-slate-200 last:border-0"
                          >
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-center text-slate-600">
                              {index + 1}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 font-bold text-slate-800">
                              {emp.name}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-slate-600">
                              {emp.department}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-center font-normal text-slate-800">
                              {emp.assignedCount}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-center font-normal text-slate-700">
                              {emp.inProgressCount}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-center font-normal text-slate-700">
                              {emp.reviewCount}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-slate-200 text-center font-normal text-slate-700">
                              {emp.pendingCount}
                            </td>
                            <td className="py-[0.7vw] px-[0.7vw] text-center font-normal text-slate-700">
                              {emp.completedCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Popups: Details & History Modals ── */}
      <AnimatePresence>
        {infoItem && (
          <ServiceInfoModal
            item={infoItem}
            onClose={() => setInfoItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyItem && (
          <ProductHistoryModal
            item={historyItem}
            onClose={() => setHistoryItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
