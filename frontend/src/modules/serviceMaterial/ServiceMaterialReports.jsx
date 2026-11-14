import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
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
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import { useSocket } from "../../contexts/SocketContext";
import CustomDropdown from "../../components/CustomDropdown";
import ServiceMaterialDetailModal from "./ServiceMaterialDetailModal";

// Custom Floating Tooltip (matches ServiceCall modules)
const CustomTooltip = ({
  children,
  text,
  content: tooltipContent,
  position = "top",
  className = "",
}) => {
  const [coords, setCoords] = useState(null);
  const targetRef = useRef(null);

  if (!text && !tooltipContent) return children;

  const handleMouseEnter = () => {
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    const gap = 6;

    let x = rect.left + rect.width / 2;
    let y = rect.top - gap;
    let side = "top";

    // Auto flip to bottom if too close to viewport top
    if (rect.top < 120 || position === "bottom") {
      y = rect.bottom + gap;
      side = "bottom";
    }

    if (position === "top-start") {
      x = rect.left;
    } else if (position === "top-end") {
      x = rect.right;
    }

    setCoords({ x, y, side, align: position });
  };

  const handleMouseLeave = () => {
    setCoords(null);
  };

  return (
    <div
      ref={targetRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center ${className}`}
    >
      {children}
      {coords &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.y}px`,
              left: `${coords.x}px`,
              transform:
                coords.align === "top-start"
                  ? coords.side === "bottom"
                    ? "translate(0, 0)"
                    : "translate(0, -100%)"
                  : coords.align === "top-end"
                  ? coords.side === "bottom"
                    ? "translate(-100%, 0)"
                    : "translate(-100%, -100%)"
                  : coords.side === "bottom"
                  ? "translate(-50%, 0)"
                  : "translate(-50%, -100%)",
              zIndex: 99999,
            }}
            className="flex items-center bg-slate-900 text-white rounded-md px-[0.55vw] py-[0.25vw] text-[0.68vw] font-normal tracking-wide shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 animate-fadeIn"
          >
            {tooltipContent ? tooltipContent : <span>{text}</span>}
            <div
              className={`absolute w-0 h-0 border-[0.25vw] ${
                coords.side === "bottom"
                  ? "bottom-full border-transparent border-b-slate-900"
                  : "top-full border-transparent border-t-slate-900"
              } ${
                coords.align === "top-start"
                  ? "left-[0.6vw]"
                  : coords.align === "top-end"
                  ? "right-[0.6vw]"
                  : "left-1/2 -translate-x-1/2"
              }`}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

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

// Turnaround Time & Age Helpers
const calculateTatDays = (receivedDate, completedDate) => {
  if (!receivedDate) return null;
  const start = new Date(receivedDate).getTime();
  if (isNaN(start)) return null;
  const end = completedDate ? new Date(completedDate).getTime() : Date.now();
  if (isNaN(end)) return null;
  const diffMs = Math.max(0, end - start);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const formatTatText = (receivedDate, completedDate) => {
  const days = calculateTatDays(receivedDate, completedDate);
  if (days === null) return "—";
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
};

const getAgeGroupLabel = (days) => {
  if (days === null || days === undefined) return "—";
  if (days <= 3) return "0–3 days";
  if (days <= 7) return "4–7 days";
  if (days <= 15) return "8–15 days";
  return "Above 15 days";
};

// Status Configuration: Pending = red, In Progress = amber, Completed = green
const getMaterialStatusBadge = (status, finalStatus) => {
  let displayStatus = status || "Open";
  if (displayStatus === "Completed" && finalStatus !== "Completed") {
    displayStatus = "Review Required";
  }

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
  if (displayStatus === "Completed") {
    badgeStyle = "bg-emerald-600 text-white border-emerald-600";
  } else if (
    displayStatus === "Under Testing" ||
    displayStatus === "Repair in Progress" ||
    displayStatus === "Assigned"
  ) {
    badgeStyle = "bg-amber-500 text-white border-amber-500";
  } else if (
    displayStatus === "Pending" ||
    displayStatus === "Hold" ||
    displayStatus === "Not Repairable"
  ) {
    badgeStyle = "bg-rose-600 text-white border-rose-600";
  } else if (displayStatus === "Review Required") {
    badgeStyle = "bg-indigo-600 text-white border-indigo-600";
  }

  return { label: displayStatus, style: badgeStyle };
};

// Status Chips for the segmented pill bar
const STATUS_CHIPS = [
  { label: "All", dot: "bg-blue-600" },
  { label: "Open", dot: "bg-slate-500" },
  { label: "Assigned", dot: "bg-amber-500" },
  { label: "Repair in Progress", dot: "bg-amber-500" },
  { label: "Under Testing", dot: "bg-amber-500" },
  { label: "Pending", dot: "bg-rose-600" },
  { label: "Hold", dot: "bg-rose-600" },
  { label: "Review Required", dot: "bg-purple-600" },
  { label: "Not Repairable", dot: "bg-rose-600" },
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
  { key: "productSegment", label: "Product Segment" },
  { key: "boardType", label: "Board Type" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "qty", label: "Quantity" },
  { key: "type", label: "Warranty Type (W/PW)" },
  { key: "expectedDeliveryDate", label: "Expected Delivery Date" },
  { key: "assignedToName", label: "Claimed By" },
  { key: "testedBy", label: "Tested By" },
  { key: "materialCost", label: "Material Cost" },
  { key: "tat", label: "Turnaround Time (TAT)" },
  { key: "ageGroup", label: "Age Group" },
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
// ── History Modal (Structured timeline matching Service Call & AGENT.md) ──────
const ProductHistoryModal = ({ item, onClose }) => {
  if (!item) return null;
  const { entry, product } = item;
  const empHistory = product.report?.history || [];
  const finalHistory = product.finalStatusHistory || [];
  const timeline = [];

  // Employee report status changes & edits
  empHistory.forEach((h) => {
    const isEdit = h.metadata?.isEdit || String(h.status || "").toLowerCase().includes("edit");
    const isPostCompleted = h.metadata?.isPostCompletedEdit || String(h.status || "").toLowerCase().includes("after completed");
    timeline.push({
      type: isEdit ? "closureEdit" : "report",
      status: h.status,
      remark: h.remark,
      diffs: h.metadata?.diffs || [],
      isPostCompletedEdit: isPostCompleted,
      timestamp: h.timestamp,
    });
  });

  // Closure edits
  const closureEdits = product._closureEdits || [];
  closureEdits.forEach((ce) => {
    const exists = timeline.some((t) => t.type === "closureEdit" && Math.abs(new Date(t.timestamp || 0) - new Date(ce.editedAt || 0)) < 2000);
    if (!exists) {
      timeline.push({
        type: "closureEdit",
        status: ce.isPostCompletedEdit ? "Edited after Completed" : "Report Edited",
        remark: ce.reason || "Report modified",
        adminName: ce.editedByName,
        role: ce.role,
        diffs: ce.diffs,
        isPostCompletedEdit: ce.isPostCompletedEdit,
        timestamp: ce.editedAt,
      });
    }
  });

  // General inward edits relevant to this product
  const inwardEdits = entry?.editHistory || [];
  inwardEdits.forEach((ie) => {
    const relevantDiffs = (ie.diffs || []).filter((d) => {
      const f = d.field || "";
      const prodDesc = product.productDescription || "";
      const prodCode = product.productCode || "";
      const serial = product.serialNumber || "";
      return (
        (prodDesc && f.includes(prodDesc)) ||
        (prodCode && f.includes(prodCode)) ||
        (serial && f.includes(serial))
      );
    });
    if (relevantDiffs.length > 0) {
      timeline.push({
        type: "adminEdit",
        status: "Product Details Edited",
        remark: ie.reason || "Inward product record updated",
        adminName: ie.editedByName,
        role: ie.role || "Admin",
        diffs: relevantDiffs,
        timestamp: ie.editedAt,
      });
    }
  });

  // Admin final status review changes
  finalHistory.forEach((h) => {
    const isCompleted = h.status === "Completed";
    timeline.push({
      type: "admin",
      status: isCompleted ? "Approved by Admin" : "Admin Returned",
      adminName: h.adminName,
      remark: h.remarks,
      timestamp: h.timestamp || h.date,
    });
  });

  // Sort chronological (oldest to newest) to detect post-completion events
  timeline.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  let foundCompleted = false;
  const enrichedTimeline = timeline.map((it) => {
    const isCompletedEvent = it.status === "Completed" || it.status === "Approved by Admin";
    const occurredAfterCompleted = foundCompleted && !isCompletedEvent;
    if (isCompletedEvent) foundCompleted = true;
    return {
      ...it,
      occurredAfterCompleted: it.isPostCompletedEdit || occurredAfterCompleted,
    };
  });

  // Sort newest first for viewing
  enrichedTimeline.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[1vw] shadow-2xl border border-slate-200 w-[42vw] min-w-[380px] max-w-[620px] max-h-[85vh] flex flex-col overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Clock className="w-[0.95vw] h-[0.95vw]" />
            </div>
            <div>
              <h3 className="text-[1vw] font-bold text-slate-800">Status & Edit History</h3>
              <p className="text-[0.7vw] text-slate-500 font-normal">
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
          {enrichedTimeline.length === 0 ? (
            <div className="text-center py-[4vw] text-slate-400 font-medium text-[0.8vw]">
              No status history records found for this product.
            </div>
          ) : (
            <div className="relative pl-[1.5vw] border-l-2 border-slate-200 ml-[0.6vw] space-y-[1.2vw] py-[0.5vw]">
              {enrichedTimeline.map((item, index) => {
                const isAdmin = item.type === "admin" || item.type === "adminEdit";
                const isApproved = item.status === "Approved by Admin" || item.status === "Completed";
                const dotColor = isApproved
                  ? "bg-emerald-500"
                  : item.type === "closureEdit" || item.occurredAfterCompleted
                    ? "bg-amber-500"
                    : isAdmin
                      ? "bg-indigo-500"
                      : "bg-blue-600";

                return (
                  <div key={index} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-[1.85vw] top-[0.4vw] w-[0.7vw] h-[0.7vw] rounded-full ${dotColor} ring-4 ring-white shadow-xs`} />

                    {/* Content Card */}
                    <div className="bg-white rounded-[0.6vw] p-[0.8vw] border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-[0.3vw] flex-wrap gap-[0.3vw]">
                        <div className="flex items-center gap-[0.35vw] flex-wrap">
                          <span className={`inline-flex items-center px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.type === "admin"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.type === "closureEdit"
                                  ? "bg-amber-50 text-amber-800 border border-amber-300"
                                  : item.type === "adminEdit"
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {item.status}
                          </span>
                          {item.adminName && (
                            <span className="text-[0.64vw] px-[0.35vw] py-[0.05vw] bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                              {item.role ? `${item.role}: ` : ""}{item.adminName}
                            </span>
                          )}
                          {item.occurredAfterCompleted && (
                            <span className="text-[0.62vw] px-[0.35vw] py-[0.05vw] bg-rose-50 text-rose-700 rounded border border-rose-200 font-bold uppercase tracking-wider">
                              Post-Completion Edit
                            </span>
                          )}
                        </div>
                        <span className="text-[0.68vw] text-slate-400 font-normal">
                          {fmtDateTime(item.timestamp)}
                        </span>
                      </div>

                      {item.remark && (
                        <p className="text-[0.75vw] text-slate-600 font-normal mt-[0.3vw] bg-slate-50/80 p-[0.4vw] rounded-[0.35vw] border border-slate-200/70">
                          <span className="text-slate-500 font-medium">Remarks / Reason: </span>
                          {item.remark}
                        </p>
                      )}

                      {/* Diffs display */}
                      {item.diffs && item.diffs.length > 0 && (
                        <div className="mt-[0.4vw] bg-white rounded-[0.35vw] border border-amber-200/80 p-[0.4vw] space-y-[0.3vw]">
                          <div className="text-[0.62vw] font-bold text-amber-900 uppercase tracking-wider">
                            Changed Fields ({item.diffs.length})
                          </div>
                          {item.diffs.map((d, di) => (
                            <div key={di} className="text-[0.68vw] bg-slate-50 p-[0.3vw] rounded border border-slate-200 flex items-center justify-between gap-[0.4vw]">
                              <span className="font-semibold text-slate-700 truncate max-w-[45%]">
                                {d.field}
                              </span>
                              <span className="flex items-center gap-[0.25vw] text-right truncate">
                                <span className="text-rose-600 line-through truncate max-w-[8vw]">
                                  {String(d.originalValue || "—")}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 font-semibold truncate max-w-[8vw]">
                                  {String(d.editedValue || "—")}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
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

  // Resolved Logged-in User
  const loggedInUser = useMemo(() => {
    try {
      return (
        propUser ||
        JSON.parse(sessionStorage.getItem("loggedInUser")) ||
        JSON.parse(localStorage.getItem("loggedInUser")) ||
        null
      );
    } catch {
      return null;
    }
  }, [propUser]);

  // Filters & State
  const [activeMainView, setActiveMainView] = useState("allProducts"); // "allProducts" | "assignments"
  const [activeStatusTab, setActiveStatusTab] = useState("All");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [drilldownEmployee, setDrilldownEmployee] = useState(null); // when clicked "View" on an employee row
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [warrantyFilter, setWarrantyFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");

  // Sorting: Users can change sort; resets to default order when report is opened
  const [sortField, setSortField] = useState(null); // null = default chronological order
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const resetSort = () => {
    setSortField(null);
    setSortDirection("asc");
    setCurrentPage(1);
  };

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
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch Data
  const fetchData = async () => {
    try {
      const [matRes, empRes] = await Promise.all([
        axios.get(`${API_URL}/service-material`),
        axios.get(`${API_URL}/auth/employees`),
      ]);
      setEntries(matRes.data || []);
      setEmployees(empRes.data || []);
      setLastUpdated(new Date());
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

  // Distinct Product Segments
  const segmentsList = useMemo(() => {
    const set = new Set();
    allProducts.forEach(({ product }) => {
      const seg = product.productSegment || product.segment;
      if (seg && seg.trim()) set.add(seg.trim());
    });
    return Array.from(set);
  }, [allProducts]);

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

      // Product Segment Filter
      if (segmentFilter !== "All") {
        const seg = (product.productSegment || product.segment || "").trim();
        if (seg.toLowerCase() !== segmentFilter.toLowerCase()) return;
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
  }, [allProducts, search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter, segmentFilter]);

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

      // 6. Product Segment Filter
      if (segmentFilter !== "All") {
        const seg = (product.productSegment || product.segment || "").trim();
        if (seg.toLowerCase() !== segmentFilter.toLowerCase()) return false;
      }

      // 7. Status Tab Filter
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
  }, [allProducts, search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter, segmentFilter, activeStatusTab]);

  // Comprehensive Quantity Summary across active filtered inward sets
  const quantityStats = useMemo(() => {
    let receivedQty = 0;
    let claimedInProgressQty = 0;
    let dispatchedQty = 0; // Completed & Approved
    let reviewRequiredQty = 0;
    let openQty = 0;
    let totalMaterialCost = 0;

    filteredProducts.forEach(({ product }) => {
      const q = Math.max(1, Number(product.qty) || 1);
      receivedQty += q;

      const costNum = Number(product.report?.materialCost || product.materialCost || 0);
      if (!isNaN(costNum) && costNum > 0) {
        totalMaterialCost += costNum;
      }

      const rawStatus = product.status || product.report?.status || "Open";
      const isCompletedAndApproved = rawStatus === "Completed" && product.finalStatus === "Completed";
      const isReviewRequired = rawStatus === "Completed" && product.finalStatus !== "Completed";

      if (isCompletedAndApproved) {
        dispatchedQty += q;
      } else if (isReviewRequired) {
        reviewRequiredQty += q;
        claimedInProgressQty += q;
      } else if (
        product.assignedTo ||
        rawStatus === "Assigned" ||
        rawStatus === "Repair in Progress" ||
        rawStatus === "Under Testing" ||
        rawStatus === "Pending" ||
        rawStatus === "Hold"
      ) {
        claimedInProgressQty += q;
      } else {
        openQty += q;
      }
    });

    const balanceQty = Math.max(0, receivedQty - dispatchedQty);

    return {
      receivedQty,
      dispatchedQty,
      balanceQty,
      claimedInProgressQty,
      reviewRequiredQty,
      openQty,
      totalMaterialCost,
    };
  }, [filteredProducts]);

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

  // Sorted and Filtered Products List
  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      let valA, valB;
      const rA = a.product.report || {};
      const rB = b.product.report || {};

      switch (sortField) {
        case "date":
          valA = a.entry.date ? new Date(a.entry.date).getTime() : 0;
          valB = b.entry.date ? new Date(b.entry.date).getTime() : 0;
          break;
        case "customerName":
          valA = (a.entry.customerName || "").toLowerCase();
          valB = (b.entry.customerName || "").toLowerCase();
          break;
        case "category":
          valA = (a.entry.category || "").toLowerCase();
          valB = (b.entry.category || "").toLowerCase();
          break;
        case "productDescription":
          valA = (a.product.productDescription || "").toLowerCase();
          valB = (b.product.productDescription || "").toLowerCase();
          break;
        case "productSegment":
          valA = (a.product.productSegment || a.product.segment || "").toLowerCase();
          valB = (b.product.productSegment || b.product.segment || "").toLowerCase();
          break;
        case "boardType":
          valA = (a.product.boardType || "").toLowerCase();
          valB = (b.product.boardType || "").toLowerCase();
          break;
        case "serialNumber":
          valA = (a.product.serialNumber || "").toLowerCase();
          valB = (b.product.serialNumber || "").toLowerCase();
          break;
        case "qty":
          valA = Number(a.product.qty) || 1;
          valB = Number(b.product.qty) || 1;
          break;
        case "materialCost":
          valA = Number(rA.materialCost || a.product.materialCost || 0);
          valB = Number(rB.materialCost || b.product.materialCost || 0);
          break;
        case "tat":
          valA = calculateTatDays(a.entry.date, rA.completedDate) ?? -1;
          valB = calculateTatDays(b.entry.date, rB.completedDate) ?? -1;
          break;
        case "ageGroup":
          valA = calculateTatDays(a.entry.date, rA.completedDate) ?? -1;
          valB = calculateTatDays(b.entry.date, rB.completedDate) ?? -1;
          break;
        case "assignedToName":
          valA = (a.product.assignedToName || "").toLowerCase();
          valB = (b.product.assignedToName || "").toLowerCase();
          break;
        case "status": {
          const sA = a.product.status || rA.status || "Open";
          const sB = b.product.status || rB.status || "Open";
          valA = sA.toLowerCase();
          valB = sB.toLowerCase();
          break;
        }
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortDirection]);

  // Reset pagination when active filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate, selectedEmployee, categoryFilter, warrantyFilter, segmentFilter, activeStatusTab, activeMainView, sortField, sortDirection]);

  // Pagination Slicing
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedProducts.slice(start, start + rowsPerPage);
  }, [sortedProducts, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / rowsPerPage) || 1;

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
    if (sortedProducts.length === 0) {
      toast("No data available to export", "error");
      return;
    }

    try {
      const activeCols = EXPORT_COLUMNS.filter((c) => selectedExportCols.includes(c.key));
      let totalQty = 0;
      let totalCost = 0;

      const rows = sortedProducts.map(({ entry, product }, idx) => {
        const report = product.report || {};
        const qNum = Math.max(1, Number(product.qty) || 1);
        totalQty += qNum;

        const cNum = Number(report.materialCost || product.materialCost || 0);
        if (!isNaN(cNum) && cNum > 0) {
          totalCost += cNum;
        }

        const tatDays = calculateTatDays(entry.date, report.completedDate);
        const tatText = formatTatText(entry.date, report.completedDate);
        const ageGroup = getAgeGroupLabel(tatDays);

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
          productSegment: product.productSegment || product.segment || "",
          boardType: product.boardType || "",
          serialNumber: product.serialNumber || "",
          qty: qNum,
          type: product.type === "W" ? "Warranty" : "Paid",
          expectedDeliveryDate: fmtDate(product.expectedDeliveryDate),
          assignedToName: product.assignedToName || "Unassigned",
          testedBy: report.testedBy || "",
          materialCost: cNum > 0 ? cNum : 0,
          tat: tatText,
          ageGroup: ageGroup,
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

      const exportDateStr = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const lastUpdatedStr = lastUpdated
        ? new Date(lastUpdated).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : exportDateStr;
      const exporterName = loggedInUser?.name || loggedInUser?.username || "System User";
      const exporterRole = loggedInUser?.role || loggedInUser?.department || "";
      const exporterInfo = exporterRole ? `${exporterName} (${exporterRole})` : exporterName;

      // Top metadata header block: Title, Exported By & Export Date & Last Updated
      const metaRows = [
        ["SERVICE MATERIAL REPORT"],
        [
          `Exported By: ${exporterInfo}`,
          `Last Updated: ${lastUpdatedStr} | Export Date: ${exportDateStr}`,
        ],
        [], // blank separator row
      ];

      const ws = XLSX.utils.aoa_to_sheet(metaRows);
      XLSX.utils.sheet_add_json(ws, rows, { origin: "A4" });

      // Append Total Row for Material Cost and Qty
      const totalRowAoa = activeCols.map((col, cIdx) => {
        if (cIdx === 0) return "Total";
        if (col.key === "qty") return totalQty;
        if (col.key === "materialCost") return totalCost;
        return "";
      });
      XLSX.utils.sheet_add_aoa(ws, [totalRowAoa], { origin: -1 });

      const totalCols = activeCols.length;
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(3, totalCols - 1) } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: Math.min(3, Math.floor(totalCols / 2) - 1) } },
        { s: { r: 1, c: Math.min(3, Math.floor(totalCols / 2) - 1) + 1 }, e: { r: 1, c: Math.max(4, totalCols - 1) } },
      ];

      // Metadata Styles
      const titleStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Calibri" },
        fill: { fgColor: { rgb: "0F172A" } }, // Slate-900 banner
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      };

      const metaInfoStyle = {
        font: { bold: true, color: { rgb: "334155" }, sz: 9.5, name: "Calibri" },
        fill: { fgColor: { rgb: "F1F5F9" } }, // Slate-100 banner
        alignment: { vertical: "center", indent: 1 },
      };

      // Header, Cell, and Total Styling
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
        fill: { fgColor: { rgb: "1A73E8" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "CBD5E1" } },
          bottom: { style: "thin", color: { rgb: "CBD5E1" } },
          left: { style: "thin", color: { rgb: "CBD5E1" } },
          right: { style: "thin", color: { rgb: "CBD5E1" } },
        },
      };

      const cellStyle = {
        font: { sz: 10.5, name: "Calibri", color: { rgb: "1E293B" } },
        alignment: { vertical: "center", wrapText: true },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          top: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };

      const altCellStyle = {
        ...cellStyle,
        fill: { fgColor: { rgb: "F8FAFC" } },
      };

      // Status Pill Colors for Excel Export: Pending = red, In Progress = amber, Completed = green
      const getStatusExcelStyle = (statusVal) => {
        const s = String(statusVal || "").toLowerCase().trim();
        if (s.includes("completed")) {
          return {
            fill: { fgColor: { rgb: "DCFCE7" } }, // light green
            font: { bold: true, color: { rgb: "15803D" }, sz: 10.5, name: "Calibri" }, // dark green
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
          };
        }
        if (
          s.includes("repair") ||
          s.includes("testing") ||
          s.includes("progress") ||
          s.includes("assigned")
        ) {
          return {
            fill: { fgColor: { rgb: "FEF3C7" } }, // light amber
            font: { bold: true, color: { rgb: "B45309" }, sz: 10.5, name: "Calibri" }, // dark amber
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
          };
        }
        if (
          s.includes("pending") ||
          s.includes("hold") ||
          s.includes("not repairable") ||
          s.includes("rejected")
        ) {
          return {
            fill: { fgColor: { rgb: "FEE2E2" } }, // light red
            font: { bold: true, color: { rgb: "B91C1C" }, sz: 10.5, name: "Calibri" }, // dark red
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
          };
        }
        return null;
      };

      const totalRowStyle = {
        font: { bold: true, sz: 11, name: "Calibri", color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "E2E8F0" } },
        alignment: { vertical: "center", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: "64748B" } },
          bottom: { style: "double", color: { rgb: "0F172A" } },
          left: { style: "thin", color: { rgb: "CBD5E1" } },
          right: { style: "thin", color: { rgb: "CBD5E1" } },
        },
      };

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const statusColIndex = activeCols.findIndex((c) => c.key === "status");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        const isTitleRow = R === 0;
        const isMetaRow = R === 1;
        const isBlankRow = R === 2;
        const isHeader = R === 3;
        const isTotalRow = R === range.e.r;

        if (isBlankRow) continue;

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

          if (isTitleRow) {
            ws[cellRef].s = titleStyle;
          } else if (isMetaRow) {
            ws[cellRef].s = metaInfoStyle;
          } else if (isHeader) {
            ws[cellRef].s = headerStyle;
          } else if (isTotalRow) {
            ws[cellRef].s = totalRowStyle;
            if (C === 0) {
              ws[cellRef].s = {
                ...totalRowStyle,
                alignment: { horizontal: "center", vertical: "center" },
              };
            }
          } else {
            let base = R % 2 === 0 ? altCellStyle : cellStyle;
            if (C === statusColIndex) {
              const statusOverride = getStatusExcelStyle(ws[cellRef].v);
              if (statusOverride) {
                base = {
                  ...base,
                  ...statusOverride,
                  border: base.border,
                };
              }
            }
            ws[cellRef].s = base;
          }
        }
      }

      // Set column widths and row heights (larger font size and wrap text)
      ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.min(Math.max(k.length + 5, 16), 42),
      }));
      const rowHeights = [{ hpt: 28 }, { hpt: 22 }, { hpt: 8 }, { hpt: 28 }];
      for (let r = 4; r <= range.e.r; r++) {
        rowHeights.push({ hpt: r === range.e.r ? 26 : 24 });
      }
      ws["!rows"] = rowHeights;

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
    warrantyFilter !== "All" ||
    segmentFilter !== "All";

  const clearAllFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedEmployee("All");
    setCategoryFilter("All");
    setWarrantyFilter("All");
    setSegmentFilter("All");
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
              <CustomTooltip text="Clear search">
                <button
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-[0.2vw] cursor-pointer transition-colors"
                >
                  <X className="w-[0.8vw] h-[0.8vw]" />
                </button>
              </CustomTooltip>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <CustomTooltip text="Filter by dates, employee, category, or warranty">
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                  showFilterPopover || hasActiveFilters
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-[0.85vw] h-[0.85vw]" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-blue-600" />
                )}
              </button>
            </CustomTooltip>

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

                  {/* Product Segment */}
                  <div>
                    <label className="block text-[0.7vw] text-slate-600 font-medium mb-[0.2vw]">
                      Product Segment
                    </label>
                    <CustomDropdown
                      size="sm"
                      searchable={true}
                      value={segmentFilter}
                      onChange={(val) => {
                        setSegmentFilter(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "All", label: "All Segments" },
                        ...segmentsList.map((seg) => ({
                          value: seg,
                          label: seg,
                        })),
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
            <CustomTooltip text="Select columns to export">
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                  showColPicker
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Columns className="w-[0.85vw] h-[0.85vw] text-slate-500" />
                <span>Columns</span>
                <span className="ml-[0.1vw] px-[0.35vw] py-[0.02vw] text-[0.66vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {selectedExportCols.length}/{EXPORT_COLUMNS.length}
                </span>
              </button>
            </CustomTooltip>

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
          <CustomTooltip text="Export filtered reports to styled Excel sheet">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-[0.35vw] px-[1vw] h-[2.2vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-[0.76vw] transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-[0.85vw] h-[0.85vw]" />
              <span>Export Excel</span>
            </button>
          </CustomTooltip>
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
                {/* Active Drilldown Banner when viewing an employee's data */}
                {drilldownEmployee && (
                  <div className="px-[0.8vw] py-[0.35vw] border-b border-blue-200 bg-blue-50/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-[0.5vw]">
                      <button
                        onClick={() => {
                          setDrilldownEmployee(null);
                          setSelectedEmployee("All");
                          setActiveMainView("assignments");
                          setCurrentPage(1);
                        }}
                        className="flex items-center gap-[0.25vw] px-[0.55vw] py-[0.18vw] bg-white border border-slate-300 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium text-[0.7vw] cursor-pointer shadow-2xs transition-colors"
                      >
                        <ArrowLeft className="w-[0.75vw] h-[0.75vw]" />
                        <span>Back to Assignment View</span>
                      </button>
                      <div className="flex items-center gap-[0.35vw] text-[0.74vw]">
                        <span className="text-slate-500 font-normal">Engineer:</span>
                        <span className="font-medium text-blue-900 bg-blue-100/70 px-[0.45vw] py-[0.08vw] rounded-full border border-blue-200">
                          {drilldownEmployee.name} ({drilldownEmployee.department})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDrilldownEmployee(null);
                        setSelectedEmployee("All");
                        setCurrentPage(1);
                      }}
                      className="text-[0.7vw] font-medium text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}

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

                  <div className="flex items-center gap-[0.6vw] text-[0.72vw] text-slate-600 font-medium shrink-0">
                    {/* Received Qty */}
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full bg-slate-100 border border-slate-200">
                      <span className="text-slate-500 font-normal">Received Qty:</span>
                      <span className="text-slate-800 font-medium">{quantityStats.receivedQty}</span>
                    </div>

                    {/* Claimed / In Progress Qty */}
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full bg-blue-50 border border-blue-200">
                      <span className="text-blue-600 font-normal">Claimed:</span>
                      <span className="text-blue-700 font-medium">{quantityStats.claimedInProgressQty}</span>
                    </div>

                    {/* Dispatched Qty */}
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 font-normal">Dispatched:</span>
                      <span className="text-emerald-700 font-medium">{quantityStats.dispatchedQty}</span>
                    </div>

                    {/* Balance Qty */}
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full bg-amber-50 border border-amber-200">
                      <span className="text-amber-800 font-normal">Balance:</span>
                      <span className="text-amber-800 font-medium">{quantityStats.balanceQty}</span>
                    </div>

                    {/* Material Cost Total */}
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full bg-indigo-50 border border-indigo-200">
                      <span className="text-indigo-700 font-normal">Total Cost:</span>
                      <span className="text-indigo-800 font-medium">₹{quantityStats.totalMaterialCost.toLocaleString()}</span>
                    </div>

                    {/* Reset Sort Button (if user changed sort) */}
                    {sortField && (
                      <button
                        onClick={resetSort}
                        title="Reset to default report sort"
                        className="flex items-center gap-[0.25vw] px-[0.5vw] py-[0.15vw] rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-800 font-normal cursor-pointer transition-colors shadow-2xs"
                      >
                        <RotateCcw className="w-[0.7vw] h-[0.7vw]" />
                        <span>Reset Sort</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                      <tr>
                        <th className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[2.6vw] whitespace-nowrap">S.No</th>
                        <th
                          onClick={() => handleSort("date")}
                          className="py-[0.6vw] px-[0.55vw] border-r border-slate-300 w-[6vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center gap-[0.2vw]">
                            <span>Date</span>
                            {sortField === "date" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("customerName")}
                          className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 w-[11vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center gap-[0.2vw]">
                            <span>Customer Name &amp; Code</span>
                            {sortField === "customerName" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("category")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[5.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>Category</span>
                            {sortField === "category" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th className="py-[0.6vw] px-[0.55vw] border-r border-slate-300 w-[6vw] whitespace-nowrap">Ref No</th>
                        <th
                          onClick={() => handleSort("productDescription")}
                          className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 w-[11.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center gap-[0.2vw]">
                            <span>Product Description</span>
                            {sortField === "productDescription" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("productSegment")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[6vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>Segment</span>
                            {sortField === "productSegment" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("boardType")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 w-[5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center gap-[0.2vw]">
                            <span>Board</span>
                            {sortField === "boardType" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th className="py-[0.6vw] px-[0.55vw] border-r border-slate-300 w-[6vw] whitespace-nowrap font-mono">Serial No</th>
                        <th
                          onClick={() => handleSort("qty")}
                          className="py-[0.6vw] px-[0.4vw] border-r border-slate-300 text-center w-[3.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>Qty</span>
                            {sortField === "qty" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("materialCost")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-right w-[5.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-end gap-[0.2vw]">
                            <span>Cost</span>
                            {sortField === "materialCost" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("tat")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>TAT</span>
                            {sortField === "tat" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("ageGroup")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[5.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>Age Group</span>
                            {sortField === "ageGroup" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th className="py-[0.6vw] px-[0.45vw] border-r border-slate-300 text-center w-[3.2vw] whitespace-nowrap">Type</th>
                        <th
                          onClick={() => handleSort("assignedToName")}
                          className="py-[0.6vw] px-[0.55vw] border-r border-slate-300 w-[6.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center gap-[0.2vw]">
                            <span>Claimed</span>
                            {sortField === "assignedToName" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("status")}
                          className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-center w-[6.5vw] whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors"
                        >
                          <div className="flex items-center justify-center gap-[0.2vw]">
                            <span>Status</span>
                            {sortField === "status" ? (
                              sortDirection === "asc" ? <ArrowUp className="w-[0.7vw] h-[0.7vw] text-blue-600" /> : <ArrowDown className="w-[0.7vw] h-[0.7vw] text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                            )}
                          </div>
                        </th>
                        <th className="py-[0.6vw] px-[0.5vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[4.5vw]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.78vw]">
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={17} className="py-[8vh] text-center text-slate-400 font-semibold">
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
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center text-slate-600 font-normal">
                                {itemIndex}
                              </td>

                              {/* Date */}
                              <td className="py-[0.55vw] px-[0.55vw] border-r border-slate-200 whitespace-nowrap text-slate-800 font-normal">
                                {fmtDate(entry.date)}
                              </td>

                              {/* Customer Name & Code */}
                              <td className="py-[0.55vw] px-[0.6vw] border-r border-slate-200 max-w-[11.5vw]">
                                <div className="flex items-center gap-[0.35vw] max-w-full">
                                  <CustomTooltip text={entry.customerName} position="top-start" className="min-w-0 flex-1">
                                    <span className="font-normal text-slate-800 truncate block">
                                      {entry.customerName || "—"}
                                    </span>
                                  </CustomTooltip>
                                  {(entry.customerCode || entry.site || entry.unit) && (
                                    <CustomTooltip
                                      position="top-start"
                                      content={
                                        <div className="flex flex-col gap-[0.2vw] text-left py-[0.1vw]">
                                          <div className="font-medium text-slate-200 border-b border-slate-700/80 pb-[0.2vw] mb-[0.1vw]">
                                            {entry.customerName || "Customer Details"}
                                          </div>
                                          {entry.customerCode && (
                                            <div className="flex items-center gap-[0.3vw] text-slate-300 font-mono text-[0.64vw]">
                                              <span className="text-slate-400 font-sans">Code:</span>
                                              <span>{entry.customerCode}</span>
                                            </div>
                                          )}
                                          {entry.unit && (
                                            <div className="flex items-center gap-[0.3vw] text-teal-300 text-[0.64vw]">
                                              <span className="text-slate-400">Unit:</span>
                                              <span>{entry.unit}</span>
                                            </div>
                                          )}
                                          {entry.site && (
                                            <div className="flex items-center gap-[0.3vw] text-sky-300 text-[0.64vw]">
                                              <span className="text-slate-400">Site:</span>
                                              <span>{entry.site}</span>
                                            </div>
                                          )}
                                        </div>
                                      }
                                    >
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        className="p-[0.15vw] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
                                      >
                                        <Info className="w-[0.75vw] h-[0.75vw]" />
                                      </button>
                                    </CustomTooltip>
                                  )}
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center whitespace-nowrap">
                                {entry.category ? (
                                  <span className={`inline-flex items-center px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-normal border shadow-2xs ${getCustomerTypeBadgeStyle(entry.category)}`}>
                                    {entry.category}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">—</span>
                                )}
                              </td>

                              {/* Ref No */}
                              <td className="py-[0.55vw] px-[0.55vw] border-r border-slate-200 whitespace-nowrap">
                                <div className="text-[0.72vw] font-normal text-purple-700 truncate">
                                  {entry.refNoCustomer ? (
                                    <CustomTooltip text={`Customer Ref: ${entry.refNoCustomer}`}>
                                      <span>Cust: {entry.refNoCustomer}</span>
                                    </CustomTooltip>
                                  ) : null}
                                </div>
                                {entry.refNoInternal && (
                                  <div className="text-[0.66vw] text-blue-600 font-normal truncate">
                                    <CustomTooltip text={`Internal Ref: ${entry.refNoInternal}`}>
                                      <span>Int: {entry.refNoInternal}</span>
                                    </CustomTooltip>
                                  </div>
                                )}
                                {!entry.refNoCustomer && !entry.refNoInternal && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Product Description */}
                              <td className="py-[0.55vw] px-[0.6vw] border-r border-slate-200 max-w-[11.5vw]">
                                <div className="flex items-center gap-[0.35vw] max-w-full">
                                  <CustomTooltip text={product.productDescription} position="top-start" className="min-w-0 flex-1">
                                    <span className="font-normal text-slate-800 truncate block">
                                      {product.productDescription || "—"}
                                    </span>
                                  </CustomTooltip>
                                  {product.productCode && (
                                    <CustomTooltip
                                      position="top-start"
                                      content={
                                        <div className="flex flex-col gap-[0.2vw] text-left py-[0.1vw]">
                                          <div className="font-medium text-slate-200 border-b border-slate-700/80 pb-[0.2vw] mb-[0.1vw]">
                                            Product Details
                                          </div>
                                          <div className="text-slate-300 text-[0.66vw] max-w-[14vw] leading-tight mb-[0.1vw]">
                                            {product.productDescription}
                                          </div>
                                          <div className="flex items-center gap-[0.3vw] text-slate-300 font-mono text-[0.64vw]">
                                            <span className="text-slate-400 font-sans">Item Code:</span>
                                            <span className="text-amber-300">{product.productCode}</span>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        className="p-[0.15vw] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
                                      >
                                        <Info className="w-[0.75vw] h-[0.75vw]" />
                                      </button>
                                    </CustomTooltip>
                                  )}
                                </div>
                              </td>

                              {/* Segment */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center whitespace-nowrap text-slate-700 font-normal">
                                {product.productSegment || product.segment ? (
                                  <span className="inline-block px-[0.4vw] py-[0.08vw] rounded text-[0.68vw] bg-slate-100 text-slate-700 border border-slate-200">
                                    {product.productSegment || product.segment}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Board Type */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 whitespace-nowrap text-slate-700 font-normal">
                                {product.boardType || "—"}
                              </td>

                              {/* Serial No */}
                              <td className="py-[0.55vw] px-[0.55vw] border-r border-slate-200 whitespace-nowrap font-mono font-normal text-slate-800">
                                {product.serialNumber || "—"}
                              </td>

                              {/* Qty */}
                              <td className="py-[0.55vw] px-[0.4vw] border-r border-slate-200 text-center font-semibold text-slate-800">
                                {Math.max(1, Number(product.qty) || 1)}
                              </td>

                              {/* Material Cost */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-right font-medium text-slate-800">
                                {Number(product.report?.materialCost || product.materialCost) > 0 ? (
                                  <span>₹{Number(product.report?.materialCost || product.materialCost).toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-300 font-normal">—</span>
                                )}
                              </td>

                              {/* TAT */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center whitespace-nowrap">
                                <span className="inline-block px-[0.4vw] py-[0.08vw] rounded text-[0.68vw] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  {formatTatText(entry.date, product.report?.completedDate)}
                                </span>
                              </td>

                              {/* Age Group */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center whitespace-nowrap">
                                {(() => {
                                  const days = calculateTatDays(entry.date, product.report?.completedDate);
                                  const label = getAgeGroupLabel(days);
                                  const badgeClass =
                                    days === null
                                      ? "text-slate-300"
                                      : days <= 3
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : days <= 7
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : days <= 15
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200";

                                  return days === null ? (
                                    <span className="text-slate-300 font-normal">—</span>
                                  ) : (
                                    <span className={`inline-block px-[0.4vw] py-[0.08vw] rounded text-[0.66vw] font-medium border ${badgeClass}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>

                              {/* Type (W / PW) */}
                              <td className="py-[0.55vw] px-[0.45vw] border-r border-slate-200 text-center whitespace-nowrap">
                                <span className={`inline-block px-[0.4vw] py-[0.08vw] rounded text-[0.68vw] font-normal ${
                                  product.type === "W"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}>
                                  {product.type || "W"}
                                </span>
                              </td>

                              {/* Claimed By */}
                              <td className="py-[0.55vw] px-[0.55vw] border-r border-slate-200 whitespace-nowrap font-normal">
                                {product.assignedToName ? (
                                  <div className="font-normal text-slate-800">
                                    {product.assignedToName}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[0.72vw]">Unassigned</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-[0.55vw] px-[0.5vw] border-r border-slate-200 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center px-[0.7vw] py-[0.2vw] rounded-lg text-[0.7vw] font-normal tracking-wide ${statusBadge.style}`}>
                                  {statusBadge.label}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-[0.55vw] px-[0.5vw] text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                <div className="flex items-center justify-center gap-[0.4vw]">
                                  <CustomTooltip text="View Details">
                                    <button
                                      onClick={() => setInfoItem({ entry, product })}
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-full transition-all cursor-pointer shadow-2xs border border-blue-200 hover:border-blue-600"
                                    >
                                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  </CustomTooltip>
                                  <CustomTooltip text="View Lifecycle History">
                                    <button
                                      onClick={() => setHistoryItem({ entry, product })}
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-slate-50 hover:bg-slate-700 text-slate-600 hover:text-white rounded-full transition-all cursor-pointer shadow-2xs border border-slate-200 hover:border-slate-700"
                                    >
                                      <History className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  </CustomTooltip>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {/* Total Row for Material Cost and Qty */}
                    {sortedProducts.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-[#F1F5F9] border-t-2 border-slate-300 font-bold text-[0.74vw] text-slate-800 shadow-[0_-2px_6px_rgba(0,0,0,0.04)] z-10">
                        <tr>
                          <td colSpan={9} className="py-[0.6vw] px-[0.7vw] border-r border-slate-300 text-right uppercase tracking-wider text-slate-600">
                            Total
                          </td>
                          <td className="py-[0.6vw] px-[0.4vw] border-r border-slate-300 text-center font-bold text-slate-900">
                            {quantityStats.receivedQty}
                          </td>
                          <td className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 text-right font-bold text-indigo-900">
                            {quantityStats.totalMaterialCost > 0
                              ? `₹${quantityStats.totalMaterialCost.toLocaleString()}`
                              : "—"}
                          </td>
                          <td colSpan={6} className="py-[0.6vw] px-[0.5vw] border-r border-slate-300 bg-[#F1F5F9]"></td>
                        </tr>
                      </tfoot>
                    )}
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
                    <CustomTooltip text="Previous Page">
                      <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-[0.35vw] rounded-[0.4vw] border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      >
                        <ChevronLeft className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                      </button>
                    </CustomTooltip>

                    <span className="text-[0.72vw] font-medium text-slate-600 px-[0.5vw]">
                      {currentPage} / {totalPages}
                    </span>

                    <CustomTooltip text="Next Page">
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-[0.35vw] rounded-[0.4vw] border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      >
                        <ChevronRight className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                      </button>
                    </CustomTooltip>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: Employee Assignment Summary Report */}
            {activeMainView === "assignments" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!drilldownEmployee ? (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                        <tr>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">S.No</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Engineer Name</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 w-[12vw] whitespace-nowrap">Department</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[9vw] whitespace-nowrap">Total Assigned</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[9vw] whitespace-nowrap">In Progress / Testing</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[9vw] whitespace-nowrap">Review Required</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[9vw] whitespace-nowrap">Pending / Hold</th>
                          <th className="py-[0.6vw] px-[0.6vw] border-r border-slate-300 text-center w-[9vw] whitespace-nowrap">Completed</th>
                          <th className="py-[0.6vw] px-[0.6vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[5vw]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-[0.78vw]">
                        {employeeSummaryData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-[8vh] text-center text-slate-400 font-semibold">
                              No employees configured.
                            </td>
                          </tr>
                        ) : (
                          employeeSummaryData.map((emp, index) => (
                            <tr
                              key={emp.id}
                              className="hover:bg-blue-50/40 transition-colors border-b border-slate-200 last:border-0"
                            >
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center text-slate-600">
                                {index + 1}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 font-medium text-slate-800">
                                {emp.name}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-slate-600 font-normal">
                                {emp.department}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center font-normal text-slate-800">
                                {emp.assignedCount}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center font-normal text-slate-700">
                                {emp.inProgressCount}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center font-normal text-slate-700">
                                {emp.reviewCount}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center font-normal text-slate-700">
                                {emp.pendingCount}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] border-r border-slate-200 text-center font-normal text-slate-700">
                                {emp.completedCount}
                              </td>
                              <td className="py-[0.6vw] px-[0.6vw] text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                <CustomTooltip text={emp.assignedCount > 0 ? "View Assigned Material" : "No Material Assigned"}>
                                  <button
                                    onClick={() => {
                                      setDrilldownEmployee(emp);
                                      setSelectedEmployee(emp.id);
                                      setActiveMainView("allProducts");
                                      setCurrentPage(1);
                                    }}
                                    disabled={emp.assignedCount === 0}
                                    className={`px-[0.65vw] py-[0.22vw] rounded-full text-[0.7vw] font-medium transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                                      emp.assignedCount > 0
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    View
                                  </button>
                                </CustomTooltip>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Popups: Details & History Modals ── */}
      <AnimatePresence>
        {infoItem && (
          <ServiceMaterialDetailModal
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
