import { Icon } from "@iconify/react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import ProductHistoryModal from "./ProductHistoryModal";
import { CallDetailsModal } from "./responseComponents/CallDetailsModal";
import {
  FileText,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  History,
  Info,
  Edit3,
  Phone,
  Shield,
  UserCheck,
  Search,
  Filter,
  Flame,
  Columns,
  CheckSquare,
  Square,
  Users,
  Check,
  RotateCcw,
  RefreshCw,
  UserPlus,
  TrendingUp,
  Sparkles,
  Eye,
  CheckCircle2,
  PauseCircle,
  MapPin,
  LifeBuoy,
  Bookmark,
  BookmarkCheck,
  Plus,
  Trash2,
  Edit2,
  SlidersHorizontal,
} from "lucide-react";
import akiraLogo from "../../assets/Akira_logo.webp";
import * as XLSX from "xlsx-js-style";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStatusCfg,
  getProductStatus as getCallProductStatus,
  deriveCallStatus,
  getTypeColor,
  PRIORITIES,
  CallSummaryModal,
} from "./ServiceCall";

// Available filterable fields for custom dynamic filters
const SERVICE_CALL_CUSTOM_FILTER_FIELDS = [
  { key: "customerName", label: "Customer Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "contactNumber", label: "Contact Number" },
  { key: "callNumber", label: "Call Number" },
  { key: "partyCode", label: "Party Code" },
  { key: "customerType", label: "Customer Type" },
  { key: "location", label: "Location / Site" },
  { key: "productModel", label: "Product Model" },
  { key: "itemCode", label: "Item Code" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "segment", label: "Product Segment" },
  { key: "errorCode", label: "Error Code" },
  { key: "registeredBy", label: "Registered By" },
  { key: "assignedTo", label: "Assigned To" },
];

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

// ── Dedicated Export Column Configurations for each view ─────────────────────
const EXPORT_CONFIGS = {
  registered: [
    { key: "S.No", label: "S.No" },
    { key: "Call Number", label: "Call Number" },
    { key: "Type", label: "Origin Type" },
    { key: "Registered Date", label: "Registered Date" },
    { key: "Priority", label: "Priority" },
    { key: "Customer Name", label: "Customer Name" },
    { key: "Party Code", label: "Party Code" },
    { key: "Customer Type", label: "Customer Type" },
    { key: "Contact Person", label: "Contact Person" },
    { key: "Contact Number", label: "Contact Number" },
    { key: "Location", label: "Location / Site" },
    { key: "Product Model", label: "Product Model" },
    { key: "Serial Number", label: "Serial Number" },
    { key: "Segment", label: "Segment" },
    { key: "Error Code", label: "Error Code" },
    { key: "Warranty Status", label: "Warranty Status" },
    { key: "Registered By", label: "Registered By" },
    { key: "Assigned To", label: "Assigned To" },
    { key: "Assigned Department", label: "Assigned Department" },
    { key: "Escalation History", label: "Escalation History" },
    { key: "Status", label: "Status" },
    { key: "Closed By", label: "Closed By" },
    { key: "Closed Date", label: "Closed Date" },
    { key: "Turnaround Time (TAT)", label: "Turnaround Time (TAT)" },
    { key: "Last Edited", label: "Last Edited" },
  ],
  escalations: [
    { key: "S.No", label: "S.No" },
    { key: "Call Number", label: "Call Number" },
    { key: "Priority", label: "Priority" },
    { key: "Customer Name", label: "Customer Name" },
    { key: "Customer Type", label: "Customer Type" },
    { key: "Product Model", label: "Product Model" },
    { key: "Serial Number", label: "Serial Number" },
    { key: "Error Code", label: "Error Code" },
    { key: "Registered By", label: "Registered By" },
    { key: "Assigned To", label: "Initial Assignee" },
    { key: "Escalated Level", label: "Escalated Level" },
    { key: "Escalated At", label: "Escalated Date & Time" },
    { key: "Escalated By", label: "Escalated By" },
    { key: "Current Assignee", label: "Current Assignee" },
    { key: "Reason", label: "Reason for Escalation" },
    { key: "Escalation History", label: "Full Escalation Chain" },
    { key: "Open Duration", label: "Open Duration" },
    { key: "Status", label: "Status" },
    { key: "Closed By", label: "Closed By" },
    { key: "Closed Date", label: "Closed Date" },
  ],
  assignments_overview: [
    { key: "S.No", label: "S.No" },
    { key: "Employee Name", label: "Employee Name" },
    { key: "User ID", label: "User ID" },
    { key: "Department", label: "Department" },
    { key: "Total Calls", label: "Total Assigned Calls" },
    { key: "Self Assigned Calls", label: "Self Assigned Calls" },
    { key: "Escalated Calls", label: "Escalated Calls" },
    { key: "Open Calls", label: "Open Calls" },
    { key: "Closed Calls", label: "Calls Closed By Employee" },
    { key: "Completion Rate (%)", label: "Completion Rate (%)" },
    { key: "Average Response Time", label: "Average Response Time" },
  ],
  assignments_drilldown: [
    { key: "S.No", label: "S.No" },
    { key: "Registered Date", label: "Registered Date" },
    { key: "Call Number", label: "Call Number" },
    { key: "Origin", label: "Origin" },
    { key: "Customer Name", label: "Customer Name" },
    { key: "Customer Type", label: "Customer Type" },
    { key: "Contact Number", label: "Contact Number" },
    { key: "Location", label: "Location / Site" },
    { key: "Product Model", label: "Product Model" },
    { key: "Serial Number", label: "Serial Number" },
    { key: "Error Code", label: "Error Code" },
    { key: "Registered By", label: "Registered By" },
    { key: "Assigned To", label: "Assigned To" },
    { key: "Assigned Date", label: "Assigned Date" },
    { key: "Escalation History", label: "Escalation History" },
    { key: "Status", label: "Status" },
    { key: "Closed By", label: "Closed By" },
    { key: "Closed Date", label: "Closed Date" },
    { key: "Turnaround Time (TAT)", label: "Turnaround Time (TAT)" },
  ],
};

const LOCAL_STORAGE_EXPORT_COLS_KEY = "service_call_reports_export_columns";
const LOCAL_STORAGE_COL_TEMPLATES_KEY = "service_call_reports_column_templates";

// Default templates for quick column selection (4-5 useful presets)
const DEFAULT_SERVICE_CALL_TEMPLATES = [
  {
    id: "tpl_standard",
    name: "Standard Overview",
    isDefault: true,
    columnsByMode: {
      registered: ["S.No", "Call Number", "Origin Type", "Registered Date", "Priority", "Customer Name", "Customer Type", "Product Model", "Serial Number", "Status"],
      escalations: ["S.No", "Call Number", "Priority", "Customer Name", "Customer Type", "Product Model", "Escalated Level", "Current Assignee", "Reason", "Status"],
      assignments_overview: ["S.No", "Employee Name", "Department", "Total Calls", "Open Calls", "Closed Calls", "Completion Rate (%)"],
      assignments_drilldown: ["S.No", "Registered Date", "Call Number", "Customer Name", "Product Model", "Status"],
    },
  },
  {
    id: "tpl_customer",
    name: "Customer & Site",
    isDefault: true,
    columnsByMode: {
      registered: ["S.No", "Call Number", "Customer Name", "Party Code", "Customer Type", "Contact Person", "Contact Number", "Location / Site", "Status"],
      escalations: ["S.No", "Call Number", "Customer Name", "Customer Type", "Product Model", "Current Assignee", "Status"],
      assignments_overview: ["S.No", "Employee Name", "Department", "Total Calls"],
      assignments_drilldown: ["S.No", "Call Number", "Customer Name", "Product Model", "Status"],
    },
  },
  {
    id: "tpl_tech",
    name: "Technical & Warranty",
    isDefault: true,
    columnsByMode: {
      registered: ["S.No", "Call Number", "Product Model", "Serial Number", "Segment", "Error Code", "Warranty Status", "Status", "Turnaround Time (TAT)"],
      escalations: ["S.No", "Call Number", "Product Model", "Serial Number", "Error Code", "Escalated Level", "Reason", "Open Duration", "Status"],
      assignments_overview: ["S.No", "Employee Name", "Department", "Total Calls", "Average Response Time"],
      assignments_drilldown: ["S.No", "Call Number", "Product Model", "Serial Number", "Status"],
    },
  },
  {
    id: "tpl_audit",
    name: "Audit & Escalations",
    isDefault: true,
    columnsByMode: {
      registered: ["S.No", "Call Number", "Registered By", "Assigned To", "Assigned Department", "Escalation History", "Status", "Closed By", "Closed Date", "Turnaround Time (TAT)", "Last Edited"],
      escalations: ["S.No", "Call Number", "Initial Assignee", "Escalated Level", "Escalated At", "Escalated By", "Current Assignee", "Reason", "Full Escalation Chain", "Open Duration", "Status", "Closed By", "Closed Date"],
      assignments_overview: ["S.No", "Employee Name", "User ID", "Department", "Total Calls", "Self Assigned Calls", "Escalated Calls", "Open Calls", "Closed Calls", "Completion Rate (%)", "Average Response Time"],
      assignments_drilldown: ["S.No", "Registered Date", "Call Number", "Customer Name", "Product Model", "Status", "Closed Date", "Turnaround Time (TAT)"],
    },
  },
  {
    id: "tpl_all",
    name: "All Columns",
    isDefault: true,
    columnsByMode: {}, // Empty means all columns
  },
];

const API_URL = import.meta.env.VITE_API_URL;

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fmtDateParts = (dStr) => {
  if (!dStr) return { date: "—", time: "" };
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return { date: dStr, time: "" };
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
    return { date: datePart, time: timePart };
  } catch {
    return { date: dStr, time: "" };
  }
};

const fmtDateTime = (dStr) => {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
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
    return dStr;
  }
};

const formatDurationFrom = (startDateStr, endDateStr = null) => {
  if (!startDateStr) return "—";
  try {
    const start = new Date(startDateStr).getTime();
    const end = endDateStr ? new Date(endDateStr).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
  } catch {
    return "—";
  }
};



const UserAvatar = ({ name, image, size = "23px", textClass = "text-sm" }) => {
  const [imgError, setImgError] = useState(false);

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name || "User"}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-slate-300 shrink-0"
      />
    );
  }

  const initial = (name || "U").charAt(0).toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-normal ${textClass} shrink-0`}
    >
      {initial}
    </div>
  );
};

const CustomerInfoCell = ({ customerName, contactNumber, partyCode }) => {
  const hasExtra = Boolean(contactNumber || partyCode);

  return (
    <div className="flex items-center gap-1.5 max-w-full">
      <CustomTooltip text={customerName} position="top-start" className="min-w-0 flex-1">
        <span className="font-normal text-slate-900 text-xs truncate block">
          {customerName || "—"}
        </span>
      </CustomTooltip>

      {hasExtra && (
        <CustomTooltip
          position="top-start"
          content={
            <div className="flex flex-col gap-1 text-left py-px">
              <div className="font-medium text-slate-200 border-b border-slate-700/80 pb-1 mb-px">
                {customerName || "Customer Details"}
              </div>
              {contactNumber && (
                <div className="flex items-center gap-1 text-sky-300">
                  <Phone className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                  <span>{contactNumber}</span>
                </div>
              )}
              {partyCode && (
                <div className="flex items-center gap-1 text-slate-700 font-mono text-xs">
                  <span className="text-slate-700 font-sans">ID:</span>
                  <span>{partyCode}</span>
                </div>
              )}
            </div>
          }
        >
          <button
            type="button"
            tabIndex={-1}
            className="p-0.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Info className="w-3 h-3" />
          </button>
        </CustomTooltip>
      )}
    </div>
  );
};

const CustomTooltip = ({ children, text, content: tooltipContent, position = "top", className = "" }) => {
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

    // Auto flip to bottom if too close to viewport top or table header
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
            className="flex items-center bg-slate-900 text-white rounded-md px-2 py-1 text-sm font-normal tracking-wide shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 animate-fadeIn"
          >
            {tooltipContent ? tooltipContent : <span>{text}</span>}
            <div
              className={`absolute w-0 h-0 border-[4px] ${
                coords.side === "bottom"
                  ? "bottom-full border-transparent border-b-slate-900"
                  : "top-full border-transparent border-t-slate-900"
              } ${
                coords.align === "top-start"
                  ? "left-2"
                  : coords.align === "top-end"
                  ? "right-2"
                  : "left-1/2 -translate-x-1/2"
              }`}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default function ServiceCallReports() {
  const { toast } = useNotification();

  // Current logged in user context
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("loggedInUser")) ||
        JSON.parse(localStorage.getItem("loggedInUser")) ||
        null
      );
    } catch {
      return null;
    }
  });

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === "Admin" ||
      currentUser.role === "admin" ||
      currentUser.department === "Admin"
    );
  }, [currentUser]);

  // View state: "registered" | "escalations" | "assignments" | "employees"
  const [activeMainView, setActiveMainView] = useState("registered");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [contactPersonFilter, setContactPersonFilter] = useState("All");
  const [callTypeFilter, setCallTypeFilter] = useState("All"); // "All" | "Self Assigned" | "Admin Registered"
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Registered" | "Assigned" | "Supporting" | "Field Visit" | "Pending" | "Escalating" | "Resolved" | "Critical"
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [customFilters, setCustomFilters] = useState([]); // [{ id, field, value }]
  const [showCustomFilterBar, setShowCustomFilterBar] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const hasActiveFilters = Boolean(
    fromDate ||
    toDate ||
    customerFilter !== "All" ||
    contactPersonFilter !== "All" ||
    callTypeFilter !== "All" ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    categoryFilter !== "All" ||
    customFilters.some((cf) => cf.field && cf.value.trim())
  );

  // Data
  const [calls, setCalls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = (activeMainView === "assignments" && selectedEmployee) ? 8 : 9;

  // Modals
  const [historyModalCall, setHistoryModalCall] = useState(null);
  const [selectedInfoCall, setSelectedInfoCall] = useState(null);
  const [editingReportItem, setEditingReportItem] = useState(null);

  // Determine current active export mode
  const currentExportMode = useMemo(() => {
    if (activeMainView === "registered") return "registered";
    if (activeMainView === "escalations") return "escalations";
    if (activeMainView === "assignments") {
      return selectedEmployee ? "assignments_drilldown" : "assignments_overview";
    }
    return "registered";
  }, [activeMainView, selectedEmployee]);

  const activeExportConfig = useMemo(() => {
    return EXPORT_CONFIGS[currentExportMode] || EXPORT_CONFIGS.registered;
  }, [currentExportMode]);

  // Per-tab selected export columns map
  const [viewExportColsMap, setViewExportColsMap] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_EXPORT_COLS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const [showColPicker, setShowColPicker] = useState(false);

  const selectedExportCols = useMemo(() => {
    const custom = viewExportColsMap[currentExportMode];
    if (Array.isArray(custom) && custom.length > 0) return custom;
    return activeExportConfig.map((c) => c.key);
  }, [viewExportColsMap, currentExportMode, activeExportConfig]);

  const setSelectedExportColsForCurrentMode = (cols) => {
    setViewExportColsMap((prev) => {
      const updated = { ...prev, [currentExportMode]: cols };
      try {
        localStorage.setItem(LOCAL_STORAGE_EXPORT_COLS_KEY, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  const toggleExportCol = (key) => {
    let updated;
    if (selectedExportCols.includes(key)) {
      if (selectedExportCols.length === 1) {
        toast("At least one column must be selected for export", "warning");
        return;
      }
      updated = selectedExportCols.filter((k) => k !== key);
    } else {
      updated = [...selectedExportCols, key];
    }
    setSelectedExportColsForCurrentMode(updated);
  };

  // Column Templates management (stored in localStorage)
  const [colTemplates, setColTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_TEMPLATES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SERVICE_CALL_TEMPLATES;
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showSaveTplInput, setShowSaveTplInput] = useState(false);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [showRenameInput, setShowRenameInput] = useState(false);

  const saveCurrentAsTemplate = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      toast("Please enter a template name", "warning");
      return;
    }
    const newTpl = {
      id: "tpl_" + Date.now(),
      name: trimmed,
      isDefault: false,
      columnsByMode: {
        ...((colTemplates.find((t) => t.name.toLowerCase() === trimmed.toLowerCase()) || {}).columnsByMode || {}),
        [currentExportMode]: [...selectedExportCols],
      },
    };
    const updated = [...colTemplates.filter((t) => t.name.toLowerCase() !== trimmed.toLowerCase()), newTpl];
    setColTemplates(updated);
    setSelectedTemplateId(newTpl.id);
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast(`Saved template "${trimmed}"`, "success");
    setNewTemplateName("");
    setShowSaveTplInput(false);
  };

  const updateCurrentTemplateColumns = (tplId) => {
    if (!tplId) return;
    const target = colTemplates.find((t) => t.id === tplId);
    if (!target) return;
    const updated = colTemplates.map((t) => {
      if (t.id === tplId) {
        return {
          ...t,
          columnsByMode: {
            ...(t.columnsByMode || {}),
            [currentExportMode]: [...selectedExportCols],
          },
        };
      }
      return t;
    });
    setColTemplates(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast(`Updated "${target.name}" with current columns`, "success");
  };

  const renameTemplate = (tplId, newName) => {
    const trimmed = (newName || "").trim();
    if (!trimmed) {
      toast("Please enter a template name", "warning");
      return;
    }
    const updated = colTemplates.map((t) => (t.id === tplId ? { ...t, name: trimmed } : t));
    setColTemplates(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast(`Renamed template to "${trimmed}"`, "success");
    setShowRenameInput(false);
    setEditingTemplateName("");
  };

  const deleteCustomTemplate = (id, e) => {
    if (e) e.stopPropagation();
    const updated = colTemplates.filter((t) => t.id !== id);
    setColTemplates(updated);
    if (selectedTemplateId === id) setSelectedTemplateId("");
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast("Template deleted", "info");
  };

  const applyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    const allKeys = activeExportConfig.map((c) => c.key);
    if (!tpl.columnsByMode || !tpl.columnsByMode[currentExportMode] || tpl.columnsByMode[currentExportMode].length === 0) {
      // Default to all columns if template is 'All' or not specified for mode
      setSelectedExportColsForCurrentMode(allKeys);
      toast(`Applied "${tpl.name}" (${allKeys.length} cols)`, "info");
      return;
    }
    // Filter to keys that exist in current mode
    const valid = tpl.columnsByMode[currentExportMode].filter((k) => allKeys.includes(k));
    const target = valid.length > 0 ? valid : allKeys;
    setSelectedExportColsForCurrentMode(target);
    toast(`Applied "${tpl.name}" (${target.length} cols)`, "info");
  };

  const activeTemplateMatch = useMemo(() => {
    const allKeys = activeExportConfig.map((c) => c.key);
    for (const tpl of colTemplates) {
      let tplCols = tpl.columnsByMode?.[currentExportMode];
      if (!tplCols || tplCols.length === 0) {
        tplCols = allKeys;
      } else {
        tplCols = tplCols.filter((k) => allKeys.includes(k));
      }
      if (
        tplCols.length === selectedExportCols.length &&
        tplCols.every((k) => selectedExportCols.includes(k))
      ) {
        return tpl.id;
      }
    }
    return null;
  }, [colTemplates, currentExportMode, selectedExportCols, activeExportConfig]);

  const selectAllExportCols = () => {
    const all = activeExportConfig.map((c) => c.key);
    setSelectedExportColsForCurrentMode(all);
  };

  const unselectAllExportCols = () => {
    // Keep at least the first column selected to avoid empty export issues
    if (activeExportConfig.length > 0) {
      setSelectedExportColsForCurrentMode([activeExportConfig[0].key]);
    } else {
      setSelectedExportColsForCurrentMode([]);
    }
  };
  const [editForm, setEditForm] = useState({
    status: "",
    remarks: "",
    resolutionType: "",
    editReason: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initial Fetch & Refresh Listener
  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, callRes] = await Promise.all([
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/service-calls`),
      ]);
      setEmployees(empRes.data || []);
      setCalls(callRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load report data:", err);
      toast("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener("service-calls-refresh", handleRefresh);
    return () => window.removeEventListener("service-calls-refresh", handleRefresh);
  }, []);

  // Filtered Calls based on role (Employee vs Admin)
  const scopedCalls = useMemo(() => {
    if (isAdmin) return calls;
    if (!currentUser) return [];

    const uid = currentUser.userId;
    const uName = currentUser.name;

    return calls.filter((c) => {
      // Direct registered by user
      if (c.registeredBy === uid || c.currentEngineerId === uid) return true;
      if (c.registeredByName === uName || c.currentEngineerName === uName) return true;

      // Products assigned, supported or field visited
      return (c.products || []).some(
        (p) =>
          p._assignedEngineerId === uid ||
          p._assignedEngineerName === uName ||
          p._supportPersonId === uid ||
          p._fieldVisit?.assignedTo === uid ||
          p._fieldVisit?.assignedBy === uid,
      );
    });
  }, [calls, isAdmin, currentUser]);

  // Distinct Customers for Filter
  const customerList = useMemo(() => {
    const set = new Set();
    scopedCalls.forEach((c) => {
      const name = (c.customerName || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedCalls]);

  // Distinct Contact Persons (optionally dependent on selected customer)
  const contactPersonsList = useMemo(() => {
    const set = new Set();
    scopedCalls.forEach((c) => {
      const custMatch = customerFilter === "All" || (c.customerName || "").trim().toLowerCase() === customerFilter.trim().toLowerCase();
      if (custMatch) {
        const cp = (c.contactPerson || "").trim();
        if (cp) set.add(cp);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedCalls, customerFilter]);

  // Date, Customer, Contact Person, Priority, Call Type & Search Filtering
  const filteredCalls = useMemo(() => {
    let start = null;
    if (fromDate) {
      const [sYear, sMonth, sDay] = fromDate.split("-");
      start = new Date(sYear, sMonth - 1, sDay);
      start.setHours(0, 0, 0, 0);
    }

    let end = null;
    if (toDate) {
      const [eYear, eMonth, eDay] = toDate.split("-");
      end = new Date(eYear, eMonth - 1, eDay);
      end.setHours(23, 59, 59, 999);
    }

    const q = search.trim().toLowerCase();

    return scopedCalls.filter((c) => {
      // Date filter
      const callDate = new Date(c.createdAt || c.timestamp || c.dateTime);
      if (start && callDate < start) return false;
      if (end && callDate > end) return false;

      // Customer Filter
      if (customerFilter !== "All") {
        const custName = (c.customerName || "").trim();
        if (custName.toLowerCase() !== customerFilter.trim().toLowerCase()) return false;
      }

      // Contact Person Filter
      if (contactPersonFilter !== "All") {
        const cp = (c.contactPerson || "").trim();
        if (cp.toLowerCase() !== contactPersonFilter.trim().toLowerCase()) return false;
      }

      // Call Type filter
      const isSelf = c.noEscalation === true;
      if (callTypeFilter === "Self Assigned" && !isSelf) return false;
      if (callTypeFilter === "Admin Registered" && isSelf) return false;

      // Priority filter
      if (priorityFilter !== "All" && c.priority !== priorityFilter) return false;

      // Customer Category (customerType) filter
      if (categoryFilter !== "All") {
        const cat = (c.customerType || c.category || "").trim().toLowerCase();
        if (cat !== categoryFilter.trim().toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter !== "All") {
        const derived = deriveCallStatus(c.products || [], c.status);
        if (statusFilter === "Critical") {
          const isCrit = derived === "Critical" || c.status === "Critical" || c.status === "Critical_Unresolved";
          if (!isCrit) return false;
        } else if (statusFilter === "Escalating") {
          const isEsc = derived === "Escalating" || c.status === "Escalated";
          if (!isEsc) return false;
        } else if (statusFilter === "Resolved") {
          const isRes = derived === "Resolved" || c.status === "Resolved" || c.status === "Closed";
          if (!isRes) return false;
        } else if (derived.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Dynamic Custom Filters
      for (const cf of customFilters) {
        if (!cf.field || !cf.value || !cf.value.trim()) continue;
        const targetVal = cf.value.trim().toLowerCase();
        let fieldMatched = false;

        switch (cf.field) {
          case "customerName":
            fieldMatched = (c.customerName || "").toLowerCase().includes(targetVal);
            break;
          case "contactPerson":
            fieldMatched = (c.contactPerson || "").toLowerCase().includes(targetVal);
            break;
          case "contactNumber":
            fieldMatched = (c.contactNumber || "").toLowerCase().includes(targetVal);
            break;
          case "callNumber":
            fieldMatched = (c.callNumber || "").toLowerCase().includes(targetVal);
            break;
          case "partyCode":
            fieldMatched = (c.partyCode || "").toLowerCase().includes(targetVal);
            break;
          case "customerType":
            fieldMatched = (c.customerType || "").toLowerCase().includes(targetVal);
            break;
          case "location":
            fieldMatched = (c.location || c.siteLocation || c.address || "").toLowerCase().includes(targetVal);
            break;
          case "productModel":
            fieldMatched = (c.products || []).some((p) => (p.productModel || "").toLowerCase().includes(targetVal));
            break;
          case "itemCode":
            fieldMatched = (c.products || []).some((p) => (p.itemCode || "").toLowerCase().includes(targetVal));
            break;
          case "serialNumber":
            fieldMatched = (c.products || []).some((p) => (p.serialNumber || "").toLowerCase().includes(targetVal));
            break;
          case "segment":
            fieldMatched = (c.products || []).some((p) => (p.productSegment || p.segment || "").toLowerCase().includes(targetVal));
            break;
          case "errorCode":
            fieldMatched = (c.products || []).some((p) => (p.errorCode || "").toLowerCase().includes(targetVal));
            break;
          case "registeredBy":
            fieldMatched = (c.registeredByName || c.registeredBy || "").toLowerCase().includes(targetVal);
            break;
          case "assignedTo":
            fieldMatched = (c.currentEngineerName || c.assignedTo || "").toLowerCase().includes(targetVal) ||
              (c.products || []).some((p) => (p._assignedEngineerName || p._supportPersonName || "").toLowerCase().includes(targetVal));
            break;
          default:
            fieldMatched = String(c[cf.field] || "").toLowerCase().includes(targetVal);
            break;
        }

        if (!fieldMatched) return false;
      }

      // Text search
      if (q) {
        const matchesNo = (c.callNumber || "").toLowerCase().includes(q);
        const matchesCust = (c.customerName || "").toLowerCase().includes(q);
        const matchesCode = (c.partyCode || "").toLowerCase().includes(q);
        const matchesContact = (c.contactNumber || "").toLowerCase().includes(q);
        const matchesProd = (c.products || []).some(
          (p) =>
            (p.productModel || "").toLowerCase().includes(q) ||
            (p.itemCode || "").toLowerCase().includes(q) ||
            (p.serialNumber || "").toLowerCase().includes(q) ||
            (p.errorCode || "").toLowerCase().includes(q),
        );
        if (!matchesNo && !matchesCust && !matchesCode && !matchesContact && !matchesProd) {
          return false;
        }
      }

      return true;
    });
  }, [scopedCalls, fromDate, toDate, customerFilter, contactPersonFilter, callTypeFilter, statusFilter, priorityFilter, customFilters, search]);

  // Escalation View Items: Calls with escalation events
  const escalationItems = useMemo(() => {
    const list = [];
    filteredCalls.forEach((call) => {
      const escHistory = call.escalationHistory || call._escalationHistory || [];
      const products = call.products || [];

      // Check if call or any product has escalation history or is critical
      products.forEach((prod, pIdx) => {
        const prodEsc = prod._escalationHistory || [];
        const combinedEsc = [...escHistory, ...prodEsc];

        if (combinedEsc.length > 0 || prod._isCritical || call.priority === "Critical") {
          // Identify initial escalation or latest escalation event
          const latestEsc = combinedEsc[combinedEsc.length - 1] || {};
          const firstEsc = combinedEsc[0] || {};

          const escalatedBy =
            latestEsc.escalatedByName ||
            latestEsc.escalatedBy ||
            firstEsc.escalatedByName ||
            firstEsc.escalatedBy ||
            call.registeredByName ||
            call.registeredBy ||
            "System Automation";

          const escalatedAt =
            latestEsc.escalatedAt ||
            latestEsc.assignedAt ||
            firstEsc.assignedAt ||
            call.createdAt;

          const reason =
            latestEsc.reason ||
            latestEsc.remarks ||
            firstEsc.reason ||
            firstEsc.remarks ||
            prod.errorCode ||
            call.priority ||
            "SLA Escalation";

          const isClosed =
            prod._resolved ||
            prod._productClosure?.status === "Closed" ||
            prod._productClosure?.status === "Resolved";

          const closedAt =
            prod._productClosure?.closedAt ||
            prod._productClosure?.date ||
            (isClosed ? prod._productClosure?.updatedAt : null);

          list.push({
            call,
            prod,
            pIdx,
            escalatedBy,
            escalatedAt,
            reason,
            isClosed,
            closedAt,
            openDuration: formatDurationFrom(escalatedAt, isClosed ? closedAt : null),
          });
        }
      });
    });
    return list;
  }, [filteredCalls]);

  // Assignment Report (Merged Employee Overview & Per-User Analytics)
  const assignmentReportData = useMemo(() => {
    return employees
      .filter((emp) => emp.role?.toLowerCase() !== "admin")
      .map((emp) => {
        // Find calls associated with this user
        const userCalls = filteredCalls.filter((call) =>
          (call.products || []).some(
            (p) =>
              p._assignedEngineerId === emp.userId ||
              p._assignedEngineerName === emp.name ||
              p._supportPersonId === emp.userId ||
              p._fieldVisit?.assignedTo === emp.userId ||
              call.registeredBy === emp.userId ||
              call.currentEngineerName === emp.name,
          ),
        );

        // Product level count & details for this user
        let assignedProducts = 0;
        let closedProducts = 0;
        let selfAssignedCount = 0;
        const responseTimesMs = [];

        userCalls.forEach((call) => {
          const isCallSelfAssigned = Boolean(
            call.noEscalation ||
            call.callOrigin === "self_assigned" ||
            call.registeredBy === emp.userId ||
            call.registeredByName === emp.name
          );

          (call.products || []).forEach((p) => {
            const isUserAssigned =
              p._assignedEngineerId === emp.userId ||
              p._assignedEngineerName === emp.name ||
              p._supportPersonId === emp.userId ||
              p._fieldVisit?.assignedTo === emp.userId ||
              (!p._assignedEngineerId && call.currentEngineerName === emp.name);

            if (isUserAssigned) {
              assignedProducts++;

              if (isCallSelfAssigned) {
                selfAssignedCount++;
              }

              const isClosed =
                p._resolved ||
                p._productClosure?.status === "Closed" ||
                p._productClosure?.status === "Resolved";

              if (isClosed) {
                closedProducts++;
              }

              // Response time calculation: from assignment time to first response/closure/action
              const assignedTime = p._assignedAt || p.assignedAt || call.createdAt || call.dateTime;
              const responseTime =
                p._firstResponseAt ||
                p._attendedAt ||
                p._productClosure?.closedAt ||
                p._productClosure?.date ||
                (isClosed ? p._productClosure?.updatedAt : null);

              if (assignedTime && responseTime) {
                const diff = new Date(responseTime) - new Date(assignedTime);
                if (diff > 0 && diff < 30 * 24 * 60 * 60 * 1000) { // filter out invalid outliers > 30 days
                  responseTimesMs.push(diff);
                }
              }
            }
          });
        });

        // Compute open products
        const openProducts = Math.max(0, assignedProducts - closedProducts);

        // Compute average response time
        let avgResponseTimeFormatted = "—";
        let avgResponseMinutes = 0;
        if (responseTimesMs.length > 0) {
          const totalMs = responseTimesMs.reduce((acc, ms) => acc + ms, 0);
          const avgMs = totalMs / responseTimesMs.length;
          avgResponseMinutes = Math.round(avgMs / (1000 * 60));

          const days = Math.floor(avgResponseMinutes / (60 * 24));
          const hours = Math.floor((avgResponseMinutes % (60 * 24)) / 60);
          const mins = avgResponseMinutes % 60;

          const parts = [];
          if (days > 0) parts.push(`${days}d`);
          if (hours > 0 || days > 0) parts.push(`${hours}h`);
          parts.push(`${mins}m`);
          avgResponseTimeFormatted = parts.join(" ");
        }

        return {
          ...emp,
          callsPerUser: userCalls.length,
          totalAssigned: assignedProducts,
          closedCount: closedProducts,
          openCount: openProducts,
          selfAssignedCount,
          avgResponseTime: avgResponseTimeFormatted,
          avgResponseMinutes,
          calls: userCalls,
        };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [employees, filteredCalls]);

  // Selected Employee Calls
  const selectedEmployeeCalls = useMemo(() => {
    if (!selectedEmployee) return [];
    return filteredCalls.filter((call) =>
      (call.products || []).some(
        (p) =>
          p._assignedEngineerId === selectedEmployee.userId ||
          p._assignedEngineerName === selectedEmployee.name ||
          p._supportPersonId === selectedEmployee.userId ||
          p._fieldVisit?.assignedTo === selectedEmployee.userId ||
          p._fieldVisit?.assignedBy === selectedEmployee.userId ||
          call.registeredBy === selectedEmployee.userId ||
          call.currentEngineerName === selectedEmployee.name,
      ),
    );
  }, [selectedEmployee, filteredCalls]);

  // Pagination for main table
  const activeDataset = useMemo(() => {
    if (activeMainView === "registered") return filteredCalls;
    if (activeMainView === "escalations") return escalationItems;
    if (activeMainView === "assignments") {
      return selectedEmployee ? selectedEmployeeCalls : assignmentReportData;
    }
    return filteredCalls;
  }, [
    activeMainView,
    filteredCalls,
    escalationItems,
    selectedEmployee,
    selectedEmployeeCalls,
    assignmentReportData,
  ]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return activeDataset.slice(start, start + rowsPerPage);
  }, [activeDataset, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(activeDataset.length / rowsPerPage);

  // Edit Report Handlers
  const handleOpenEditReport = (call, prod, pIdx) => {
    const closure = prod._productClosure || {};

    // Check if reverse escalation condition is met (previous engineer exists in chain and not self-assigned)
    const isSelfAssigned = Boolean(
      call?.noEscalation ||
      call?.isSelfAssigned ||
      (call?.registeredBy === currentUser?.userId && call?.currentEngineerId === currentUser?.userId)
    );
    const escHist = prod?._escalationHistory || call?.escalationHistory || [];
    let hasPreviousEngineer = false;
    let prevName = "";
    for (let i = escHist.length - 1; i >= 0; i--) {
      const h = escHist[i];
      const engId = h.engineerId || h.assignedTo;
      const engName = h.engineerName || h.assignedToName || h.name;
      if (engId && engId !== currentUser?.userId) {
        hasPreviousEngineer = true;
        prevName = engName || engId;
        break;
      }
    }

    const canReverse = !isSelfAssigned && hasPreviousEngineer;

    setEditingReportItem({
      callId: call._id || call.id || call.callNumber,
      callNumber: call.callNumber,
      productIdx: pIdx,
      product: prod,
      canReverse,
      previousAssigneeName: prevName,
    });
    setEditForm({
      status: closure.status || (prod._resolved ? "Resolved" : "Pending"),
      remarks: closure.remarks || "",
      resolutionType: closure.resolutionType || "Fixed",
      editReason: "",
    });
  };

  const handleSaveEditReport = async (e) => {
    e.preventDefault();
    if (!editingReportItem) return;
    setIsSubmittingEdit(true);
    try {
      if (editForm.status === "ReverseEscalate") {
        await axios.patch(
          `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/reverse-escalate`,
          {
            userId: currentUser?.userId,
            name: currentUser?.name,
            reason: editForm.remarks,
          }
        );
        toast("Report reverse-escalated successfully", "success");
      } else {
        await axios.patch(
          `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/edit-report`,
          {
            status: editForm.status,
            remarks: editForm.remarks,
            resolutionType: editForm.resolutionType,
            editReason: editForm.editReason,
            userId: currentUser?.userId || "Employee",
            name: currentUser?.name || "Employee",
            role: currentUser?.role || "Employee",
          },
        );
        toast("Report updated successfully", "success");
      }
      setEditingReportItem(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update report:", err);
      toast(err.response?.data?.message || "Failed to update report", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };


// Helper to build chronological escalation history chain string for Excel exports
const buildEscalationHistoryString = (call, prod) => {
  const callEsc = call.escalationHistory || call._escalationHistory || [];
  const prodEsc = prod?._escalationHistory || [];
  const combined = [...callEsc, ...prodEsc];

  if (combined.length === 0) {
    // Check if call or prod marked critical without history array
    if (prod?._isCritical || call.priority === "Critical" || (prod?._escalationLevel || 0) > 0) {
      return `Level ${prod?._escalationLevel || call.escalationLevel || 1} (Critical / SLA Breach)`;
    }
    return "None";
  }

  const steps = [];
  combined.forEach((h, idx) => {
    const toTarget =
      h.escalatedToName ||
      h.engineerName ||
      h.assignedToName ||
      h.assignedEngineerName ||
      (h.department ? `Dept: ${h.department}` : null) ||
      "Escalation Queue";
    const byName = h.updatedByName || h.escalatedByName || h.by || "System Automation";
    const lvl = h.level !== undefined ? `L${h.level}` : `Esc #${idx + 1}`;
    const rsn = h.reason || h.remarks || "";

    steps.push(`[${lvl}] To: ${toTarget} (By: ${byName}${rsn ? ` - Reason: ${rsn}` : ""})`);
  });

  return steps.join(" → ");
};

  // Direct Excel Export Implementation for all 4 views
  const executeExportExcel = () => {
    try {
      const rows = [];
      let sheetName = "Report";
      let fileName = `Report_${getTodayStr()}.xlsx`;

      if (currentExportMode === "registered") {
        sheetName = "All Service Calls";
        fileName = `Service_Calls_Master_${getTodayStr()}.xlsx`;
        let sNo = 1;
        filteredCalls.forEach((c) => {
          const prods = c.products && c.products.length > 0 ? c.products : [{}];
          prods.forEach((p) => {
            const pStatus = getCallProductStatus(p, c.status);
            const isClosed =
              p._resolved ||
              p._productClosure?.status === "Closed" ||
              p._productClosure?.status === "Resolved";
            const closedAt =
              p._productClosure?.closedAt ||
              p._productClosure?.date ||
              (isClosed ? p._productClosure?.updatedAt : null);
            const closedByName = isClosed
              ? (p._productClosure?.closedByName || p._productClosure?.userName || c.closedByName || "Engineer")
              : "Not Closed";

            const regTime = c.createdAt || c.timestamp || c.dateTime;
            const tat = formatDurationFrom(regTime, isClosed ? closedAt : null);
            const escHistoryStr = buildEscalationHistoryString(c, p);

            const fullRow = {
              "S.No": sNo++,
              "Call Number": c.callNumber,
              "Type": c.noEscalation ? "Self Assigned" : "Registered Call",
              "Registered Date": fmtDateTime(regTime),
              "Priority": c.priority || "Medium",
              "Customer Name": c.customerName || "—",
              "Party Code": c.partyCode || "—",
              "Customer Type": c.customerType || "—",
              "Contact Person": c.contactPerson || "—",
              "Contact Number": c.contactNumber || "—",
              "Location": c.location || c.siteLocation || c.address || "—",
              "Product Model": p.productModel || p.itemCode || "—",
              "Serial Number": p.serialNumber || "—",
              "Segment": p.segment || c.segment || "—",
              "Error Code": p.errorCode || "—",
              "Warranty Status": p.warrantyStatus || "—",
              "Registered By": c.registeredByName || c.registeredBy || "System",
              "Assigned To": p._assignedEngineerName || c.currentEngineerName || "Unassigned",
              "Assigned Department": p._assignedDepartment || c.department || "—",
              "Escalation History": escHistoryStr,
              "Status": getStatusCfg(pStatus).label,
              "Closed By": closedByName,
              "Closed Date": isClosed ? fmtDateTime(closedAt) : "—",
              "Turnaround Time (TAT)": tat,
              "Last Edited": c.editHistory?.length
                ? `${c.editHistory.length} edit(s) by ${c.editHistory[c.editHistory.length - 1].editedByName}`
                : "No edits",
            };

            const filteredRow = {};
            activeExportConfig.forEach((colCfg) => {
              if (selectedExportCols.includes(colCfg.key)) {
                filteredRow[colCfg.key] = fullRow[colCfg.key] !== undefined ? fullRow[colCfg.key] : "—";
              }
            });
            rows.push(filteredRow);
          });
        });
      } else if (currentExportMode === "escalations") {
        sheetName = "Escalations Audit";
        fileName = `SLA_Escalation_Audit_${getTodayStr()}.xlsx`;
        let sNo = 1;
        escalationItems.forEach((item) => {
          const { call, prod, escalatedBy, escalatedAt, reason, isClosed, closedAt, openDuration } = item;
          const pStatus = getCallProductStatus(prod, call.status);
          const closedByName = isClosed
            ? (prod._productClosure?.closedByName || prod._productClosure?.userName || call.closedByName || "Engineer")
            : "Not Closed";
          const escHistoryStr = buildEscalationHistoryString(call, prod);

          const fullRow = {
            "S.No": sNo++,
            "Call Number": call.callNumber,
            "Priority": call.priority || "Critical",
            "Customer Name": call.customerName || "—",
            "Customer Type": call.customerType || "—",
            "Product Model": prod.productModel || prod.itemCode || "—",
            "Serial Number": prod.serialNumber || "—",
            "Error Code": prod.errorCode || "—",
            "Registered By": call.registeredByName || call.registeredBy || "System",
            "Assigned To": prod._assignedEngineerName || call.currentEngineerName || "Unassigned",
            "Escalated Level": prod._escalationLevel || call.escalationLevel || 1,
            "Escalated At": fmtDateTime(escalatedAt),
            "Escalated By": escalatedBy || "System Automation",
            "Current Assignee": prod._assignedEngineerName || call.currentEngineerName || "Escalation Queue",
            "Reason": reason || "SLA Escalation",
            "Escalation History": escHistoryStr,
            "Open Duration": openDuration || "—",
            "Status": getStatusCfg(pStatus).label,
            "Closed By": closedByName,
            "Closed Date": isClosed ? fmtDateTime(closedAt) : "—",
          };

          const filteredRow = {};
          activeExportConfig.forEach((colCfg) => {
            if (selectedExportCols.includes(colCfg.key)) {
              filteredRow[colCfg.key] = fullRow[colCfg.key] !== undefined ? fullRow[colCfg.key] : "—";
            }
          });
          rows.push(filteredRow);
        });
      } else if (currentExportMode === "assignments_overview") {
        sheetName = "Employee Performance";
        fileName = `Team_Workload_Report_${getTodayStr()}.xlsx`;
        let sNo = 1;
        assignmentReportData.forEach((emp) => {
          const completionRate = emp.totalAssigned > 0
            ? Math.round((emp.closedCount / emp.totalAssigned) * 100)
            : 0;

          // Count escalated calls associated with this employee
          const escalatedCount = (emp.calls || []).filter((call) => {
            const callEsc = call.escalationHistory || call._escalationHistory || [];
            return (call.products || []).some(
              (p) => callEsc.length > 0 || (p._escalationHistory || []).length > 0 || p._isCritical || call.priority === "Critical"
            );
          }).length;

          const fullRow = {
            "S.No": sNo++,
            "Employee Name": emp.name || "—",
            "User ID": emp.userId || "—",
            "Department": emp.department || "—",
            "Total Calls": emp.totalAssigned || 0,
            "Self Assigned Calls": emp.selfAssignedCount || 0,
            "Escalated Calls": escalatedCount,
            "Open Calls": emp.openCount || 0,
            "Closed Calls": emp.closedCount || 0,
            "Completion Rate (%)": `${completionRate}%`,
            "Average Response Time": emp.avgResponseTime || "—",
          };

          const filteredRow = {};
          activeExportConfig.forEach((colCfg) => {
            if (selectedExportCols.includes(colCfg.key)) {
              filteredRow[colCfg.key] = fullRow[colCfg.key] !== undefined ? fullRow[colCfg.key] : "—";
            }
          });
          rows.push(filteredRow);
        });
      } else if (currentExportMode === "assignments_drilldown") {
        const empNameClean = (selectedEmployee?.name || "Employee").replace(/[^a-zA-Z0-9_-]/g, "_");
        sheetName = `${selectedEmployee?.name || "Employee"} Calls`.slice(0, 31);
        fileName = `Assigned_Calls_${empNameClean}_${getTodayStr()}.xlsx`;
        let sNo = 1;
        selectedEmployeeCalls.forEach((call) => {
          const prods = (call.products && call.products.length > 0 ? call.products : [{}]).filter((p) => {
            if (!selectedEmployee) return true;
            return (
              p._assignedEngineerId === selectedEmployee.userId ||
              p._assignedEngineerName === selectedEmployee.name ||
              p._supportPersonId === selectedEmployee.userId ||
              p._fieldVisit?.assignedTo === selectedEmployee.userId ||
              p._fieldVisit?.assignedBy === selectedEmployee.userId ||
              call.registeredBy === selectedEmployee.userId ||
              call.currentEngineerName === selectedEmployee.name
            );
          });

          prods.forEach((p) => {
            const pStatus = getCallProductStatus(p, call.status);
            const isClosed =
              p._resolved ||
              p._productClosure?.status === "Closed" ||
              p._productClosure?.status === "Resolved";
            const closedAt =
              p._productClosure?.closedAt ||
              p._productClosure?.date ||
              (isClosed ? p._productClosure?.updatedAt : null);
            const closedByName = isClosed
              ? (p._productClosure?.closedByName || p._productClosure?.userName || call.closedByName || "Engineer")
              : "Not Closed";

            const regTime = call.createdAt || call.timestamp || call.dateTime;
            const assignTime = p._assignedAt || call.assignedAt || call.assignmentDate || regTime;
            const tat = formatDurationFrom(regTime, isClosed ? closedAt : null);
            const escHistoryStr = buildEscalationHistoryString(call, p);

            const isSelf = Boolean(
              call.noEscalation ||
              call.callOrigin === "self_assigned" ||
              call.registeredBy === selectedEmployee?.userId
            );

            const fullRow = {
              "S.No": sNo++,
              "Registered Date": fmtDateTime(regTime),
              "Call Number": call.callNumber,
              "Origin": isSelf ? "Self Assigned" : "Registered",
              "Customer Name": call.customerName || "—",
              "Customer Type": call.customerType || "—",
              "Contact Number": call.contactNumber || "—",
              "Location": call.location || call.siteLocation || call.address || "—",
              "Product Model": p.productModel || p.itemCode || "—",
              "Serial Number": p.serialNumber || "—",
              "Error Code": p.errorCode || "—",
              "Registered By": call.registeredByName || call.registeredBy || "System",
              "Assigned To": p._assignedEngineerName || call.currentEngineerName || "Unassigned",
              "Assigned Date": fmtDateTime(assignTime),
              "Escalation History": escHistoryStr,
              "Status": getStatusCfg(pStatus).label,
              "Closed By": closedByName,
              "Closed Date": isClosed ? fmtDateTime(closedAt) : "—",
              "Turnaround Time (TAT)": tat,
            };

            const filteredRow = {};
            activeExportConfig.forEach((colCfg) => {
              if (selectedExportCols.includes(colCfg.key)) {
                filteredRow[colCfg.key] = fullRow[colCfg.key] !== undefined ? fullRow[colCfg.key] : "—";
              }
            });
            rows.push(filteredRow);
          });
        });
      }

      if (rows.length === 0) {
        toast("No records available to export for this view", "info");
        return;
      }

      const exportDateStr = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const exporterName = currentUser?.name || currentUser?.username || "System User";
      const exporterRole = currentUser?.role || currentUser?.department || "";
      const exporterInfo = exporterRole ? `${exporterName} (${exporterRole})` : exporterName;

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

      // Metadata header block
      const metaRows = [
        [sheetName.toUpperCase()],
        [
          `Exported By: ${exporterInfo}`,
          `Last Updated: ${lastUpdatedStr} | Export Date: ${exportDateStr}`,
        ],
        [], // blank separator row
      ];

      const ws = XLSX.utils.aoa_to_sheet(metaRows);
      XLSX.utils.sheet_add_json(ws, rows, { origin: "A4" });

      const totalCols = Object.keys(rows[0] || {}).length;
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(3, totalCols - 1) } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: Math.min(3, Math.floor(totalCols / 2) - 1) } },
        { s: { r: 1, c: Math.min(3, Math.floor(totalCols / 2) - 1) + 1 }, e: { r: 1, c: Math.max(4, totalCols - 1) } },
      ];

      // ── Apply Professional Styling: Borders, Header Colors, Left Alignment & Text Wrapping ──
      const titleStyle = {
        font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A8A" } }, // Rich dark navy
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      };

      const metaInfoStyle = {
        font: { name: "Segoe UI", sz: 9.5, bold: true, color: { rgb: "334155" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", indent: 1 },
      };

      const thinBorder = {
        top: { style: "thin", color: { rgb: "CBD5E1" } }, // slate-300
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } },
      };

      const headerStyle = {
        fill: { fgColor: { rgb: "1E40AF" } }, // Rich royal blue (#1E40AF)
        font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: "1E3A8A" } },
          bottom: { style: "medium", color: { rgb: "1E3A8A" } },
          left: { style: "thin", color: { rgb: "3B82F6" } },
          right: { style: "thin", color: { rgb: "3B82F6" } },
        },
      };

      const cellStyle = {
        font: { name: "Segoe UI", sz: 10.5, color: { rgb: "1E293B" } }, // slate-800
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const alternateCellStyle = {
        fill: { fgColor: { rgb: "F8FAFC" } }, // subtle slate-50
        font: { name: "Segoe UI", sz: 10.5, color: { rgb: "1E293B" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        const isTitleRow = R === 0;
        const isMetaRow = R === 1;
        const isBlankRow = R === 2;
        const isHeader = R === 3;

        if (isBlankRow) continue;

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) {
            ws[cellRef] = { t: "s", v: "" };
          }

          if (isTitleRow) {
            ws[cellRef].s = titleStyle;
          } else if (isMetaRow) {
            ws[cellRef].s = metaInfoStyle;
          } else if (isHeader) {
            // Header row
            ws[cellRef].s = headerStyle;
          } else {
            // Alternating data rows
            ws[cellRef].s = (R - 4) % 2 === 1 ? alternateCellStyle : cellStyle;
          }
        }
      }

      // Auto-fit column widths with padding and wrap allowances
      const colWidths = Object.keys(rows[0] || {}).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...rows.map((r) => (r[key] ? String(r[key]).length : 0))
        );
        return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
      });
      ws["!cols"] = colWidths;

      // Set header row heights: Title, Meta, Blank, Header
      ws["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName);
      toast(`${sheetName} exported successfully`, "success");
    } catch (err) {
      console.error("Export failed:", err);
      toast("Failed to export Excel report", "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full text-sm bg-slate-100/70 p-2.5 overflow-hidden">
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-2.5 shrink-0">
        {/* Main Tab Navigation: Sleek Segmented Capsule */}
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-full border border-slate-300/80 gap-1.5 shadow-2xs">
          <button
            onClick={() => {
              if (selectedEmployee) return;
              setActiveMainView("registered");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            disabled={!!selectedEmployee}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              selectedEmployee
                ? "opacity-50 cursor-not-allowed text-slate-700 bg-slate-100"
                : activeMainView === "registered"
                ? "bg-blue-600 text-white shadow-xs font-semibold cursor-pointer"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80 cursor-pointer"
            }`}
            title={selectedEmployee ? "Exit employee drilldown view first" : "All Calls"}
          >
            <Layers className="w-3 h-3" />
            <span>All Calls</span>
            <span
              className={`text-sm font-medium ml-0.5 transition-all ${
                !selectedEmployee && activeMainView === "registered"
                  ? "bg-white/20 text-white px-1.5 py-0 rounded-full"
                  : "text-slate-700"
              }`}
            >
              {filteredCalls.length}
            </span>
          </button>

          <button
            onClick={() => {
              if (selectedEmployee) return;
              setActiveMainView("escalations");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            disabled={!!selectedEmployee}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              selectedEmployee
                ? "opacity-50 cursor-not-allowed text-slate-700 bg-slate-100"
                : activeMainView === "escalations"
                ? "bg-blue-600 text-white shadow-xs font-semibold cursor-pointer"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80 cursor-pointer"
            }`}
            title={selectedEmployee ? "Exit employee drilldown view first" : "Escalation View"}
          >
            <Flame className="w-3 h-3" />
            <span>Escalation View</span>
            <span
              className={`text-sm font-medium ml-0.5 transition-all ${
                !selectedEmployee && activeMainView === "escalations"
                  ? "bg-white/20 text-white px-1.5 py-0 rounded-full"
                  : "text-slate-700"
              }`}
            >
              {escalationItems.length}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                if (selectedEmployee) return;
                setActiveMainView("assignments");
                setSelectedEmployee(null);
                setCurrentPage(1);
              }}
              disabled={!!selectedEmployee}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedEmployee
                  ? "opacity-50 cursor-not-allowed text-slate-700 bg-slate-100"
                  : activeMainView === "assignments"
                  ? "bg-blue-600 text-white shadow-xs font-semibold cursor-pointer"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80 cursor-pointer"
              }`}
              title={selectedEmployee ? "Exit employee drilldown view first" : "Employee & Assignment Report"}
            >
              <UserCheck className="w-3 h-3" />
              <span>Employee & Assignment Report</span>
              <span
                className={`text-sm font-medium ml-0.5 transition-all ${
                  !selectedEmployee && activeMainView === "assignments"
                    ? "bg-white/20 text-white px-1.5 py-0 rounded-full"
                    : "text-slate-700"
                }`}
              >
                {assignmentReportData.length}
              </span>
            </button>
          )}
        </div>

        {/* Global Controls & Filters */}
        <div className="flex items-center gap-2.5">
          {/* Soft Pill Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-[12px] top-1/2 -translate-y-1/2 text-slate-700" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search call, customer, item, SN..."
              className="pl-8 pr-7 h-8 w-56 rounded-full border border-slate-200/90 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 shadow-2xs transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full border font-medium text-xs transition-all cursor-pointer shadow-2xs ${
                showFilterPopover || fromDate || toDate || selectedEmployee || categoryFilter !== "All"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Filter by Date, Employee & Customer Category"
            >
              <Filter className="w-3 h-3" />
              <span>Filters</span>
              {(fromDate || toDate || selectedEmployee || categoryFilter !== "All") && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-[252px] bg-white border border-slate-300 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">Quick Filters</span>
                    {(fromDate || toDate || selectedEmployee || categoryFilter !== "All") && (
                      <button
                        onClick={() => {
                          setFromDate("");
                          setToDate("");
                          setSelectedEmployee(null);
                          setCategoryFilter("All");
                          setCurrentPage(1);
                        }}
                        className="text-sm text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm text-slate-700 font-medium mb-1">
                      Date Range
                    </label>
                    <div className="flex items-center justify-between bg-white border border-slate-300 rounded-md h-7 px-2 text-sm hover:border-slate-400 transition-colors">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-transparent text-slate-700 font-normal outline-none cursor-pointer flex-1 min-w-0"
                      />
                      <span className="text-slate-700 mx-1 shrink-0">—</span>
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

                  {/* Assigned Employee (Admin only) */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm text-slate-700 font-medium mb-1">
                        Assigned Employee
                      </label>
                      <CustomDropdown
                        size="sm"
                        searchable={true}
                        searchPlaceholder="Search employee..."
                        value={selectedEmployee || "All"}
                        onChange={(val) => {
                          setSelectedEmployee(val === "All" ? null : val);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Employees" },
                          ...employees.map((emp) => ({
                            value: emp.userId || emp._id,
                            label: `${emp.name} (${emp.department || "No Dept"})`,
                          })),
                        ]}
                        triggerClassName="!h-7 !text-sm border-slate-300 rounded-md font-normal !text-slate-700"
                      />
                    </div>
                  )}

                  {/* Customer Category */}
                  <div>
                    <label className="block text-sm text-slate-700 font-medium mb-1">
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
                        { value: "OEM", label: "OEM" },
                        { value: "End Customer", label: "End Customer" },
                        { value: "Distributor", label: "Distributor" },
                        { value: "Dealer", label: "Dealer" },
                      ]}
                      triggerClassName="!h-7 !text-sm border-slate-300 rounded-md font-normal !text-slate-700"
                    />
                  </div>

                  {/* Clear All Filters */}
                  {(fromDate || toDate || selectedEmployee || categoryFilter !== "All") && (
                    <div className="pt-1 border-t border-slate-200 mt-px">
                      <button
                        onClick={() => {
                          setFromDate("");
                          setToDate("");
                          setSelectedEmployee(null);
                          setCategoryFilter("All");
                          setCurrentPage(1);
                        }}
                        className="inline-flex items-center gap-1 text-sm font-normal text-slate-800 hover:text-rose-600 transition-colors cursor-pointer py-px"
                      >
                        <Filter className="w-3 h-3 text-slate-800" />
                        <span>Clear Filters</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Custom Filters Toggle Button */}
          <button
            onClick={() => {
              const nextState = !showCustomFilterBar;
              setShowCustomFilterBar(nextState);
              if (nextState && customFilters.length === 0) {
                setCustomFilters([
                  { id: Date.now(), field: "customerName", value: "" },
                ]);
              }
            }}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full border font-medium text-xs transition-all cursor-pointer shadow-2xs ${
              showCustomFilterBar || customFilters.some((cf) => cf.field && cf.value.trim())
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            }`}
            title="Toggle custom field filter rows"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Custom Filters</span>
            {customFilters.some((cf) => cf.field && cf.value.trim()) && (
              <span className="px-1.5 py-0 rounded-full bg-indigo-600 text-white text-xs font-bold">
                {customFilters.filter((cf) => cf.field && cf.value.trim()).length}
              </span>
            )}
          </button>

          {/* Select Columns Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full border font-medium text-xs transition-all cursor-pointer shadow-2xs ${
                showColPicker
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Select columns to export to Excel"
            >
              <Columns className="w-3 h-3 text-slate-700" />
              <span>Columns</span>
              <span className="ml-px px-1.5 py-0 text-sm rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {selectedExportCols.length}/{activeExportConfig.length}
              </span>
            </button>

            {/* Columns Dropdown Popover */}
            {showColPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColPicker(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-[302px] max-h-[432px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {/* Header */}
                  <div className="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-1.5">
                      <Columns className="w-3 h-3 text-slate-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Export Columns
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={selectAllExportCols}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600 text-sm">|</span>
                      <button
                        onClick={unselectAllExportCols}
                        className="text-sm font-medium text-slate-700 hover:text-slate-700 cursor-pointer"
                      >
                        Unselect All
                      </button>
                    </div>
                  </div>

                  {/* Template Dropdown Selector */}
                  <div className="px-2.5 py-2 bg-slate-50/90 border-b border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <Bookmark className="w-2.5 h-2.5 text-indigo-500" />
                        Template Presets
                      </label>
                      <button
                        onClick={() => setShowSaveTplInput(!showSaveTplInput)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-0.5"
                        title="Save current selection as a new template"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Save Current</span>
                      </button>
                    </div>

                    {/* Inline Save Template Input */}
                    {showSaveTplInput && (
                      <div className="flex items-center gap-1 p-1 bg-white rounded-md border border-indigo-200">
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCurrentAsTemplate(newTemplateName);
                          }}
                          placeholder="New template name..."
                          className="flex-1 text-sm px-1.5 py-1 border border-slate-200 rounded-sm outline-none focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                          autoFocus
                        />
                        <button
                          onClick={() => saveCurrentAsTemplate(newTemplateName)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-sm cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowSaveTplInput(false);
                            setNewTemplateName("");
                          }}
                          className="text-slate-700 hover:text-slate-600 p-px cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Native / Clean Select for Templates */}
                    <div className="relative flex items-center">
                      <select
                        value={selectedTemplateId || activeTemplateMatch || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const tpl = colTemplates.find((t) => t.id === val);
                          if (tpl) applyTemplate(tpl);
                        }}
                        className="w-full appearance-none bg-white border border-slate-200 hover:border-indigo-300 rounded-md px-2 py-1 pr-5.5 text-sm text-slate-700 font-medium outline-none cursor-pointer transition-all shadow-2xs"
                      >
                        <option value="" disabled>
                          {selectedTemplateId ? "Select a template..." : "Custom selection active"}
                        </option>
                        {colTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} {!tpl.isDefault ? "(Custom)" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="w-3 h-3 text-slate-700 absolute right-[7px] pointer-events-none rotate-90" />
                    </div>

                    {/* Template Actions Toolbar: Update Columns, Rename, Delete */}
                    {(selectedTemplateId || activeTemplateMatch) && (() => {
                      const curTpl = colTemplates.find((t) => t.id === (selectedTemplateId || activeTemplateMatch));
                      if (!curTpl) return null;
                      const isExactMatch = activeTemplateMatch === curTpl.id;
                      return (
                        <div className="flex flex-col gap-1 pt-px">
                          {/* Rename Input if triggered */}
                          {showRenameInput ? (
                            <div className="flex items-center gap-1 p-1 bg-white rounded-md border border-indigo-200">
                              <input
                                type="text"
                                value={editingTemplateName}
                                onChange={(e) => setEditingTemplateName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") renameTemplate(curTpl.id, editingTemplateName);
                                }}
                                placeholder="Rename template..."
                                className="flex-1 text-sm px-1.5 py-0.5 border border-slate-200 rounded-sm outline-none focus:border-indigo-500 text-slate-800"
                                autoFocus
                              />
                              <button
                                onClick={() => renameTemplate(curTpl.id, editingTemplateName)}
                                className="px-1.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-sm cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setShowRenameInput(false);
                                  setEditingTemplateName("");
                                }}
                                className="text-slate-700 hover:text-slate-600 p-px cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sm text-slate-700 px-px">
                              <span className="flex items-center gap-1 truncate">
                                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isExactMatch ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                                <span className="truncate">
                                  {isExactMatch ? "Active: " : "Modified: "}
                                  <strong className="text-slate-700">{curTpl.name}</strong>
                                </span>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Update Existing Template with Current Selection */}
                                <button
                                  onClick={() => updateCurrentTemplateColumns(curTpl.id)}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-px bg-indigo-50 hover:bg-indigo-100/70 px-1 py-px rounded border border-indigo-200"
                                  title={`Update "${curTpl.name}" to match the current checkboxes`}
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Update</span>
                                </button>
                                {/* Rename */}
                                <button
                                  onClick={() => {
                                    setEditingTemplateName(curTpl.name);
                                    setShowRenameInput(true);
                                  }}
                                  className="text-slate-600 hover:text-indigo-600 cursor-pointer p-px"
                                  title="Rename this template"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                {/* Delete (Custom only) */}
                                {!curTpl.isDefault && (
                                  <button
                                    onClick={(e) => deleteCustomTemplate(curTpl.id, e)}
                                    className="text-rose-500 hover:text-rose-700 cursor-pointer p-px"
                                    title="Delete template"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Columns List */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[230px]">
                    {activeExportConfig.map((col) => {
                      const isChecked = selectedExportCols.includes(col.key);
                      return (
                        <div
                          key={col.key}
                          onClick={() => toggleExportCol(col.key)}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-md cursor-pointer text-xs font-normal text-slate-700 hover:bg-slate-50 transition-colors select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExportCol(col.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{col.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      {selectedExportCols.length} of {activeExportConfig.length} selected
                    </span>
                    <button
                      onClick={() => setShowColPicker(false)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-md cursor-pointer shadow-2xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Excel Button */}
          <button
            onClick={executeExportExcel}
            className="flex items-center gap-1.5 px-3.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs transition-all cursor-pointer shadow-sm"
            title="Export filtered reports to Excel"
          >
            <Download className="w-3 h-3" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Dynamic Custom Filters Row (Appears below when Custom Filters is toggled) ── */}
      {showCustomFilterBar && (
        <div className="mb-2.5 bg-white border border-slate-300 rounded-lg p-2.5 shadow-2xs flex flex-col gap-1.5 shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">Custom Filters</span>
              <span className="text-sm text-slate-700">
                (Select field and type search query to filter table records)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const unused = SERVICE_CALL_CUSTOM_FILTER_FIELDS.find(
                    (f) => !customFilters.some((cf) => cf.field === f.key)
                  );
                  setCustomFilters((prev) => [
                    ...prev,
                    { id: Date.now() + Math.random(), field: unused?.key || "customerName", value: "" },
                  ]);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-sm font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add Filter</span>
              </button>
              {customFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomFilters([]);
                    setCurrentPage(1);
                  }}
                  className="text-sm text-rose-600 hover:text-rose-700 font-medium cursor-pointer px-1"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Filter Rows */}
          {customFilters.length === 0 ? (
            <div className="py-2 text-center text-slate-700 text-sm italic bg-slate-50 border border-dashed border-slate-200 rounded-md">
              No custom filters active. Click &quot;Add Filter&quot; above to select any column header and enter a value.
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-px scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {customFilters.map((cf, idx) => (
                <div
                  key={cf.id}
                  className="flex items-center gap-1 bg-slate-50/90 border border-slate-300 rounded-md px-1.5 py-1 shadow-2xs shrink-0"
                >
                  {/* Field Selector */}
                  <div className="relative">
                    <select
                      value={cf.field}
                      onChange={(e) => {
                        const newField = e.target.value;
                        setCustomFilters((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, field: newField } : item))
                        );
                        setCurrentPage(1);
                      }}
                      className="h-6.5 pl-2 pr-5 bg-white border border-slate-300 rounded text-sm text-slate-800 font-bold outline-none cursor-pointer appearance-none hover:border-slate-400"
                    >
                      {SERVICE_CALL_CUSTOM_FILTER_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-2.5 h-2.5 text-slate-600 absolute right-[5px] top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>

                  {/* Value Input */}
                  <input
                    type="text"
                    value={cf.value}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setCustomFilters((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, value: newVal } : item))
                      );
                      setCurrentPage(1);
                    }}
                    placeholder="Type value..."
                    className="h-6.5 w-40 px-2 bg-white border border-slate-300 rounded text-sm text-slate-800 outline-none placeholder:text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  />

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFilters((prev) => prev.filter((_, i) => i !== idx));
                      setCurrentPage(1);
                    }}
                    className="text-slate-700 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                    title="Remove this filter"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Report Display Container ────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-700">
            <div className="w-9 h-9 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm font-bold">Loading comprehensive reports...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: All Registered Calls Table View */}
            {activeMainView === "registered" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-xs">
                      <tr>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-11 whitespace-nowrap">S.No</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-[151px] whitespace-nowrap">Registered Date</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-32 whitespace-nowrap">Call No</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[94px] whitespace-nowrap">Origin</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-52 whitespace-nowrap">Customer & Contact</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-24 whitespace-nowrap">Customer Type</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-52 whitespace-nowrap">Product / Model</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-32 whitespace-nowrap">Assigned</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-24 whitespace-nowrap">Escalation</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-2.5 text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[79px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-[10vh] text-center text-slate-700 font-semibold">
                            No service call records match the active criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((call, cIdx) => {
                          const prods = call.products && call.products.length > 0 ? call.products : [{}];
                          const rowCount = prods.length;
                          const isSelf = call.noEscalation === true;
                          const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;

                          return prods.map((prod, pIdx) => {
                            const pStatus = getCallProductStatus(prod, call.status);
                            const cfg = getStatusCfg(pStatus);
                            const isClosed =
                              prod._resolved ||
                              prod._productClosure?.status === "Closed" ||
                              prod._productClosure?.status === "Resolved";

                            const hasEdits =
                              (call.editHistory && call.editHistory.length > 0) ||
                              (prod._closureEdits && prod._closureEdits.length > 0);

                            const isEscalated =
                              prod._escalationLevel > 0 || call.escalationLevel > 0 || prod._isCritical;

                            return (
                              <tr
                                key={`${call._id || call.callNumber}-${pIdx}`}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                {/* 0. S.No */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle text-center font-normal text-slate-700 bg-white whitespace-nowrap text-xs"
                                  >
                                    {callSno}
                                  </td>
                                )}

                                {/* 1. Registered Date (Moved to 2nd Column) */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                                  >
                                    {(() => {
                                      const { date, time } = fmtDateParts(call.createdAt || call.dateTime);
                                      return (
                                        <div className="flex flex-col text-xs text-slate-800 font-normal leading-normal">
                                          <span>{date}</span>
                                          {time && <span className="text-sm text-slate-700 font-medium mt-0.5">{time}</span>}
                                        </div>
                                      );
                                    })()}
                                    {call.registeredByName && call.registeredByName !== "System" ? (
                                      <div className="text-sm text-slate-700 font-medium mt-px">
                                        By: <span className="text-black font-medium">{call.registeredByName}</span>
                                      </div>
                                    ) : null}
                                  </td>
                                )}

                                {/* 2. Call Number */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                                  >
                                    <div className="flex items-center gap-1.5">
                                       <span className="font-mono font-medium text-xs text-black block leading-tight select-text">
                                         {call.callNumber}
                                       </span>
                                      {hasEdits && (
                                        <CustomTooltip text="This call has edited records" position="top">
                                          <span className="inline-flex items-center justify-center text-amber-600 hover:text-amber-700 cursor-default p-px transition-colors">
                                            <Icon icon="solar:pen-new-square-linear" className="w-3.5 h-3.5" />
                                          </span>
                                        </CustomTooltip>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* 3. Origin Distinction */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle text-center whitespace-nowrap bg-white"
                                  >
                                    {isSelf ? (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs whitespace-nowrap">
                                        Self Assigned
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs whitespace-nowrap">
                                        Registered
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* 4. Customer */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle bg-white max-w-52"
                                  >
                                    <CustomerInfoCell
                                      customerName={call.customerName}
                                      contactNumber={call.contactNumber}
                                      partyCode={call.partyCode}
                                    />
                                  </td>
                                )}

                                {/* 5. Customer Type */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white font-normal text-xs"
                                  >
                                    {call.customerType && call.customerType !== "All" ? (
                                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${getCustomerTypeBadgeStyle(call.customerType)}`}>
                                        {call.customerType}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 font-normal">—</span>
                                    )}
                                  </td>
                                )}

                                {/* 6. Product / Model */}
                                <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle max-w-52">
                                  <CustomTooltip
                                    position="top-start"
                                    className="max-w-full"
                                    content={
                                      <div className="flex flex-col gap-0.5 text-left py-px">
                                        <div className="font-normal text-slate-200">
                                          {prod.productModel || prod.itemCode || "—"}
                                        </div>
                                        {prod.serialNumber && (
                                          <div className="text-xs text-sky-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                            <span className="text-slate-700 font-sans">SN: </span>
                                            <span>{prod.serialNumber}</span>
                                          </div>
                                        )}
                                      </div>
                                    }
                                  >
                                    <div className="font-medium text-slate-900 text-sm truncate cursor-default">
                                      {prod.productModel || prod.itemCode || "—"}
                                    </div>
                                  </CustomTooltip>
                                </td>

                                {/* 7. Assigned Info */}
                                <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap">
                                  {(() => {
                                    const engName = prod._assignedEngineerName || call.currentEngineerName;
                                    const engId = prod._assignedEngineerId || call.currentEngineerId;
                                    if (!engName) {
                                      return <span className="text-slate-600 font-medium italic text-sm">Unassigned</span>;
                                    }
                                    const matchedEmp = employees.find(e => (engId && (e.userId === engId || e._id === engId)) || (e.name && e.name.toLowerCase() === engName.toLowerCase()));
                                    const userImg = matchedEmp?.profilePicture || matchedEmp?.image || null;

                                    return (
                                      <CustomTooltip
                                        text={`Assigned: ${fmtDateTime(prod._assignedAt || call.createdAt)}`}
                                        position="top-start"
                                      >
                                        <div className="flex items-center gap-1.5 cursor-default">
                                          <UserAvatar name={engName} image={userImg} size="23px" textClass="text-sm" />
                                          <div className="font-medium text-black text-xs">
                                            {engName}
                                          </div>
                                        </div>
                                      </CustomTooltip>
                                    );
                                  })()}
                                </td>

                                {/* 8. Escalation Info */}
                                <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle text-center whitespace-nowrap">
                                  {isEscalated ? (
                                    <CustomTooltip
                                      text={`Open duration: ${formatDurationFrom(prod._assignedAt || call.createdAt)}`}
                                      position="top"
                                    >
                                      <span className="text-xs text-slate-800 font-normal hover:text-slate-900 transition-colors cursor-default">
                                        Level {prod._escalationLevel || call.escalationLevel || 1}
                                      </span>
                                    </CustomTooltip>
                                  ) : (
                                    <span className="text-slate-600 font-normal text-xs">—</span>
                                  )}
                                </td>

                                {/* 9. Status */}
                                <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle text-center whitespace-nowrap">
                                  {(() => {
                                    const displayStatus = isClosed ? "Completed" : (cfg.label || "In Progress");
                                    let badgeStyle = "bg-[#6366f1] text-white"; // default purple/indigo
                                    if (displayStatus === "Completed" || displayStatus === "Resolved") {
                                      badgeStyle = "bg-[#05a854] text-white"; // solid vibrant green
                                    } else if (displayStatus === "Overdue" || displayStatus === "Critical") {
                                      badgeStyle = "bg-[#e53935] text-white"; // solid vibrant red
                                    } else if (displayStatus === "Delayed" || displayStatus === "Pending") {
                                      badgeStyle = "bg-[#e69b00] text-white"; // solid warm amber/orange
                                    } else if (displayStatus === "Under Review") {
                                      badgeStyle = "bg-[#111927] text-white"; // solid deep navy/black
                                    } else if (displayStatus === "In Progress" || displayStatus === "Assigned" || displayStatus === "Attended") {
                                      badgeStyle = "bg-[#5551f3] text-white"; // vibrant blue-purple
                                    }

                                    return (
                                      <div className="flex flex-col items-center justify-center">
                                        <span className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-sm font-normal min-w-[89px] shadow-xs tracking-wide ${badgeStyle}`}>
                                          {displayStatus}
                                        </span>
                                        {isClosed && (prod._productClosure?.closedAt || prod._productClosure?.date) && (
                                          <div className="text-sm text-slate-700 font-medium mt-0.5">
                                            {fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* 10. Actions Column (Sleek Icon Buttons) */}
                                <td className="py-2.5 px-2.5 border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setSelectedInfoCall(call)}
                                      className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                    >
                                      View Reports
                                    </button>
                                    {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                      <CustomTooltip text="Edit Report" position="top">
                                        <button
                                          onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      </CustomTooltip>
                                    )}
                                    <CustomTooltip text="View Lifecycle History" position="top-end">
                                      <button
                                        onClick={() => setHistoryModalCall(call)}
                                        className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
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
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: Dedicated Escalation View */}
            {activeMainView === "escalations" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-xs">
                      <tr>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-11 whitespace-nowrap">S.No</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-32 whitespace-nowrap">Call No</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-52 whitespace-nowrap">Customer & Contact</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-24 whitespace-nowrap">Customer Type</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-[187px] whitespace-nowrap">Product / SN</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-32 whitespace-nowrap">Escalated By</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-36 whitespace-nowrap">Escalated Date</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 w-[187px] whitespace-nowrap">Reason</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">Open Duration</th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-2.5 text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-18">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-[10vh] text-center text-slate-700 font-semibold">
                            No escalated calls found.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            {/* 0. S.No */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-xs">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>

                            {/* 1. Call No */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white">
                              <span className="font-mono font-normal text-xs text-slate-800 block leading-tight select-text">
                                  {item.call.callNumber}
                                </span>
                            </td>

                            {/* 2. Customer & Contact */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle bg-white max-w-52">
                              <CustomerInfoCell
                                customerName={item.call.customerName}
                                contactNumber={item.call.contactNumber}
                                partyCode={item.call.partyCode}
                              />
                            </td>

                            {/* 3. Customer Type */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white font-normal text-xs">
                              {item.call.customerType && item.call.customerType !== "All" ? (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal border shadow-2xs whitespace-nowrap ${getCustomerTypeBadgeStyle(item.call.customerType)}`}>
                                  {item.call.customerType}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-normal">—</span>
                              )}
                            </td>

                            {/* 4. Product / SN */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle max-w-[187px]">
                              <CustomTooltip
                                position="top-start"
                                className="max-w-full"
                                content={
                                  <div className="flex flex-col gap-0.5 text-left py-px">
                                    <div className="font-normal text-slate-200">
                                      {item.prod.productModel || item.prod.itemCode || "—"}
                                    </div>
                                    {item.prod.serialNumber && (
                                      <div className="text-xs text-sky-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                        <span className="text-slate-700 font-sans">SN: </span>
                                        <span>{item.prod.serialNumber}</span>
                                      </div>
                                    )}
                                  </div>
                                }
                              >
                                <div className="font-normal text-slate-800 text-xs truncate cursor-default">
                                  {item.prod.productModel || item.prod.itemCode || "—"}
                                </div>
                              </CustomTooltip>
                            </td>

                            {/* 5. Who Escalated */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap align-middle">
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const isSystem = !item.escalatedById && (item.escalatedBy === "System Automation" || item.escalatedBy === "System");
                                  if (isSystem) {
                                    return (
                                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center text-sm shrink-0">
                                        <Icon icon="solar:cpu-bolt-linear" className="w-3.5 h-3.5 text-slate-700" />
                                      </div>
                                    );
                                  }
                                  const matchedEmp = employees.find(e => (e.userId === item.escalatedById || (e.name && e.name.toLowerCase() === (item.escalatedBy || '').toLowerCase())));
                                  return <UserAvatar name={item.escalatedBy} image={matchedEmp?.profilePicture || matchedEmp?.image} size="23px" textClass="text-sm" />;
                                })()}
                                <div className="font-normal text-slate-800 text-xs">
                                  {item.escalatedBy}
                                </div>
                              </div>
                            </td>

                            {/* 6. When Escalated */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap align-middle">
                              {(() => {
                                const { date, time } = fmtDateParts(item.escalatedAt);
                                return (
                                  <div className="flex flex-col text-sm text-gray-800 font-normal leading-normal">
                                    <span>{date}</span>
                                    {time && <span className="text-sm text-slate-700 mt-1">{time}</span>}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* 7. Why (Reason) */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 max-w-[187px] align-middle">
                              <CustomTooltip text={item.reason} position="top-start" className="max-w-full">
                                <span className="font-normal text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-sm inline-block truncate max-w-full">
                                  {item.reason}
                                </span>
                              </CustomTooltip>
                            </td>

                            {/* 8. Open Duration */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap text-center align-middle">
                              <span className="text-xs font-normal text-slate-700">
                                {item.openDuration}
                              </span>
                            </td>

                            {/* 9. Status */}
                            <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center align-middle whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-sm font-normal min-w-[89px] shadow-xs tracking-wide ${
                                item.isClosed ? "bg-[#05a854] text-white" : "bg-[#e53935] text-white"
                              }`}>
                                {item.isClosed ? "Completed" : "Critical"}
                              </span>
                            </td>

                            {/* 10. Actions Column (Sleek Icon Buttons) */}
                            <td className="py-2.5 px-2.5 border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setSelectedInfoCall(item.call)}
                                  className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                >
                                  View Reports
                                </button>
                                <CustomTooltip text="View Lifecycle History" position="top-end">
                                  <button
                                    onClick={() => setHistoryModalCall(item.call)}
                                    className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                </CustomTooltip>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: Merged Employee & Assignment Report */}
            {activeMainView === "assignments" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-xs">
                        <tr>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-11 whitespace-nowrap">S.No.</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 w-52 whitespace-nowrap">Employee</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 w-44 whitespace-nowrap">Department</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-24 whitespace-nowrap">Total Calls</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">Self Assigned</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-20 whitespace-nowrap">Open</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-20 whitespace-nowrap">Closed</th>
                          <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-28 whitespace-nowrap">Avg Response</th>
                          <th className="py-2.5 px-2.5 text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-18">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-[10vh] text-center text-slate-700 font-semibold">
                              No assignment records found.
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((emp, idx) => (
                            <tr
                              key={emp.userId || idx}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              {/* Index */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-xs">
                                {(currentPage - 1) * rowsPerPage + idx + 1}
                              </td>

                              {/* User */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap bg-white">
                                <div className="flex items-center gap-2">
                                  <UserAvatar name={emp.name} image={emp.profilePicture || emp.image} size="26px" textClass="text-xs" />
                                  <div>
                                    <div className="font-normal text-slate-900 leading-tight text-xs">{emp.name}</div>
                                    <div className="text-sm text-slate-700 font-mono mt-px">{emp.userId}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-slate-700 whitespace-nowrap font-normal text-xs">
                                {emp.department || "—"}
                              </td>

                              {/* Total Calls */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                <span className={`font-normal text-xs ${emp.callsPerUser > 0 ? "text-slate-900" : "text-slate-600"}`}>
                                  {emp.callsPerUser}
                                </span>
                              </td>

                              {/* Self Assigned */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.selfAssignedCount > 0 ? (
                                  <span className="font-normal text-xs text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-px rounded-full">
                                    {emp.selfAssignedCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>

                              {/* Open */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.openCount > 0 ? (
                                  <span className="font-normal text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-px rounded-full">
                                    {emp.openCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-normal">0</span>
                                )}
                              </td>

                              {/* Closed */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.closedCount > 0 ? (
                                  <span className="font-normal text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded-full">
                                    {emp.closedCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-normal">0</span>
                                )}
                              </td>

                              {/* Avg Response */}
                              <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.avgResponseTime !== "—" ? (
                                  <span className="inline-flex items-center gap-1 text-slate-700 text-xs font-normal">
                                    <Clock className="w-2.5 h-2.5 text-slate-700" />
                                    <span>{emp.avgResponseTime}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-normal">—</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-2.5 px-2.5 border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                <CustomTooltip
                                  text={emp.callsPerUser > 0 ? "View Assigned Calls" : "No Calls"}
                                  position="top-end"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setCurrentPage(1);
                                    }}
                                    disabled={emp.callsPerUser === 0}
                                    className={`px-2.5 py-1 rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                                      emp.callsPerUser > 0
                                        ? "bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                                        : "bg-slate-200 text-slate-700 cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    View Reports
                                  </button>
                                </CustomTooltip>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Drilldown view for selected employee calls */
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-slate-300 bg-slate-50/70 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setCurrentPage(1);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-normal text-sm cursor-pointer shadow-2xs transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Back to All Employees</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-normal text-slate-900">
                            {selectedEmployee.name}
                          </span>
                          <span className="text-slate-600 text-sm">/</span>
                          <span className="text-sm text-slate-700 font-normal">
                            {selectedEmployee.department}
                          </span>
                          <span className="ml-1 px-1.5 py-px rounded-full text-sm font-normal bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                            {selectedEmployeeCalls.length} Assigned Calls
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-xs">
                          <tr>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-11 whitespace-nowrap">S.No</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-36 whitespace-nowrap">Registered Date</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-32 whitespace-nowrap">Call No</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-20 whitespace-nowrap">Origin</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-52 whitespace-nowrap">Customer</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-[187px] whitespace-nowrap">Product / Model</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-28 whitespace-nowrap">Assigned</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 w-28 whitespace-nowrap">Closed</th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[108px] whitespace-nowrap">Status</th>
                            <th className="py-2.5 px-2.5 text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-18">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {paginatedData.map((call, cIdx) => {
                            const prods = call.products && call.products.length > 0 ? call.products : [{}];
                            const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;
                            const isSelf = call.noEscalation === true;

                            return prods.map((prod, pIdx) => {
                              const pStatus = getCallProductStatus(prod, call.status);
                              const cfg = getStatusCfg(pStatus);
                              const isClosed =
                                prod._resolved ||
                                prod._productClosure?.status === "Closed" ||
                                prod._productClosure?.status === "Resolved";

                              return (
                                <tr key={`${call._id || call.callNumber}-${pIdx}`} className="hover:bg-slate-50 transition-colors">
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-xs"
                                    >
                                      {callSno}
                                    </td>
                                  )}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap bg-white text-slate-700 text-sm font-normal leading-normal align-middle"
                                    >
                                      {(() => {
                                        const { date, time } = fmtDateParts(call.createdAt || call.dateTime);
                                        return (
                                          <div className="flex flex-col">
                                            <span>{date}</span>
                                            {time && <span className="text-sm text-slate-700 mt-0.5">{time}</span>}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  )}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-2.5 px-2.5 border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-normal text-xs text-slate-800 block leading-tight select-text">
                                          {call.callNumber}
                                        </span>
                                        {(call.editHistory?.length > 0 || call.isEdited) && (
                                          <CustomTooltip text="This call has edited records" position="top">
                                            <span className="inline-flex items-center justify-center text-amber-600 hover:text-amber-700 cursor-default p-px transition-colors">
                                              <Icon icon="solar:pen-new-square-linear" className="w-3.5 h-3.5" />
                                            </span>
                                          </CustomTooltip>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap bg-white align-middle"
                                    >
                                      {isSelf ? (
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs whitespace-nowrap">
                                          Self Assigned
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-normal bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs whitespace-nowrap">
                                          Registered
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-2.5 px-2.5 border-r border-b border-slate-300 max-w-52 bg-white align-middle"
                                    >
                                      <CustomerInfoCell
                                        customerName={call.customerName}
                                        contactNumber={call.contactNumber}
                                        partyCode={call.partyCode}
                                      />
                                    </td>
                                  )}
                                  <td className="py-2.5 px-2.5 border-r border-b border-slate-300 max-w-[187px]">
                                    <CustomTooltip
                                      position="top-start"
                                      className="max-w-full"
                                      content={
                                        <div className="flex flex-col gap-0.5 text-left py-px">
                                          <div className="font-normal text-slate-200">
                                            {prod.productModel || prod.itemCode || "—"}
                                          </div>
                                          {prod.serialNumber && (
                                            <div className="text-xs text-sky-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                              <span className="text-slate-700 font-sans">SN: </span>
                                              <span>{prod.serialNumber}</span>
                                            </div>
                                          )}
                                        </div>
                                      }
                                    >
                                      <div className="font-normal text-slate-800 text-xs truncate cursor-default">
                                        {prod.productModel || prod.itemCode || "—"}
                                      </div>
                                    </CustomTooltip>
                                  </td>
                                  <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap text-slate-700 text-sm font-normal leading-normal">
                                    {(() => {
                                      const { date, time } = fmtDateParts(prod._assignedAt || call.createdAt);
                                      return (
                                        <div className="flex flex-col">
                                          <span>{date}</span>
                                          {time && <span className="text-sm text-slate-700 mt-0.5">{time}</span>}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-2.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap text-slate-700 text-sm font-normal leading-normal">
                                    {isClosed ? (() => {
                                      const { date, time } = fmtDateParts(prod._productClosure?.closedAt || prod._productClosure?.date);
                                      return (
                                        <div className="flex flex-col">
                                          <span>{date}</span>
                                          {time && <span className="text-sm text-slate-700 mt-0.5">{time}</span>}
                                        </div>
                                      );
                                    })() : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2.5 border-r border-b border-slate-300 text-center whitespace-nowrap">
                                    {(() => {
                                      const displayStatus = isClosed ? "Completed" : (cfg.label || "In Progress");
                                      let badgeStyle = "bg-[#6366f1] text-white";
                                      if (displayStatus === "Completed" || displayStatus === "Resolved") {
                                        badgeStyle = "bg-[#05a854] text-white";
                                      } else if (displayStatus === "Overdue" || displayStatus === "Critical") {
                                        badgeStyle = "bg-[#e53935] text-white";
                                      } else if (displayStatus === "Delayed" || displayStatus === "Pending") {
                                        badgeStyle = "bg-[#e69b00] text-white";
                                      } else if (displayStatus === "Under Review") {
                                        badgeStyle = "bg-[#111927] text-white";
                                      } else if (displayStatus === "In Progress" || displayStatus === "Assigned") {
                                        badgeStyle = "bg-[#5551f3] text-white";
                                      }
                                      return (
                                        <span className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-sm font-normal min-w-[89px] shadow-xs tracking-wide ${badgeStyle}`}>
                                          {displayStatus}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-2.5 px-2.5 border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => setSelectedInfoCall(call)}
                                        className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-sm font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        View Reports
                                      </button>
                                      {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                        <CustomTooltip text="Edit Report" position="top">
                                          <button
                                            onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                        </CustomTooltip>
                                      )}
                                      <CustomTooltip text="View Lifecycle History" position="top-end">
                                        <button
                                          onClick={() => setHistoryModalCall(call)}
                                          className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      </CustomTooltip>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Modern Pagination Footer (matching ServiceCall) ────────── */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-300 bg-white shrink-0">
              <div className="text-xs text-slate-700 font-medium">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {activeDataset.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, activeDataset.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {activeDataset.length}
                </span>{" "}
                entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pNum = i + 1;
                    if (
                      totalPages > 5 &&
                      (pNum < currentPage - 1 || pNum > currentPage + 1) &&
                      pNum !== 1 &&
                      pNum !== totalPages
                    ) {
                      if (pNum === currentPage - 2 || pNum === currentPage + 2)
                        return (
                          <span
                            key={pNum}
                            className="px-1 text-gray-700 text-xs"
                          >
                            ...
                          </span>
                        );
                      return null;
                    }
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pNum
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Edit Report Modal */}
        {editingReportItem && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-3.5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200/90 w-full max-w-[490px] overflow-hidden flex flex-col font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/40 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 leading-tight">
                      Edit Submitted Report
                    </h3>
                    <div className="text-sm text-slate-700 font-normal mt-0.5 flex items-center gap-1.5">
                      <span className="font-normal text-[#6e000a] font-mono">{editingReportItem.callNumber}</span>
                      <span className="text-slate-600">•</span>
                      <span className="truncate max-w-64 text-slate-600">
                        {editingReportItem.product.productModel || editingReportItem.product.productDescription || editingReportItem.product.itemCode || "Equipment"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingReportItem(null)}
                  className="p-1.5 text-slate-700 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEditReport} className="p-5 flex flex-col gap-4">
                {/* Status Segmented Selection (from ProductClosurePanel / Response modal) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Report Outcome / Status
                  </label>
                  <div className="flex items-center gap-1.5 w-full">
                    {[
                      {
                        k: "Resolved",
                        l: "Resolve",
                        icon: <CheckCircle2 className="w-3 h-3" />,
                        activeStyle: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
                        hoverStyle: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
                      },
                      {
                        k: "Pending",
                        l: "Pending",
                        icon: <PauseCircle className="w-3 h-3" />,
                        activeStyle: "bg-amber-600 text-white border-amber-600 shadow-sm",
                        hoverStyle: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300",
                      },
                      {
                        k: "Field Visit Required",
                        l: "Field Visit",
                        icon: <MapPin className="w-3 h-3" />,
                        activeStyle: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
                        hoverStyle: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300",
                      },
                      {
                        k: "Supporting",
                        l: "Support",
                        icon: <LifeBuoy className="w-3 h-3" />,
                        activeStyle: "bg-blue-600 text-white border-blue-600 shadow-sm",
                        hoverStyle: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
                      },
                      ...(editingReportItem.canReverse
                        ? [
                            {
                              k: "ReverseEscalate",
                              l: "Reverse Escalate",
                              icon: <RotateCcw className="w-3 h-3" />,
                              activeStyle: "bg-rose-600 text-white border-rose-600 shadow-sm",
                              hoverStyle: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300",
                            },
                          ]
                        : []),
                    ].map((tab) => {
                      const isActive = editForm.status === tab.k;
                      return (
                        <button
                          type="button"
                          key={tab.k}
                          onClick={() => setEditForm((prev) => ({ ...prev, status: tab.k }))}
                          className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                            isActive
                              ? tab.activeStyle
                              : `bg-white border-slate-200 text-slate-650 ${tab.hoverStyle}`
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reverse Escalate Info Notice (if ReverseEscalate selected) */}
                {editForm.status === "ReverseEscalate" && (
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3 text-sm text-rose-800 flex items-center gap-2">
                    <RotateCcw className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>
                      This report will be sent back to previous assignee:{" "}
                      <strong className="font-semibold text-rose-950">
                        {editingReportItem.previousAssigneeName || "Previous Engineer"}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Resolution / Outcome Remarks */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                    <span>
                      {editForm.status === "Resolved"
                        ? "Resolution Details / Solution Notes"
                        : editForm.status === "Pending"
                        ? "Pending Reason & Details"
                        : editForm.status === "ReverseEscalate"
                        ? "Reason for Reverse Escalating"
                        : "Report Remarks / Findings"}{" "}
                      <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-sm text-slate-700 font-normal">Mandatory</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editForm.remarks}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    placeholder={
                      editForm.status === "ReverseEscalate"
                        ? "Enter reason for sending this report back to the previous engineer..."
                        : "Enter comprehensive findings, steps taken, or reason..."
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 text-slate-800 font-normal resize-none placeholder:text-slate-700 transition-all bg-white hover:border-slate-300"
                  />
                </div>

                {/* Mandatory Edit Reason (only needed when updating report, not when reverse escalating) */}
                {editForm.status !== "ReverseEscalate" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                      <span>
                        Mandatory Reason for Editing Report <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-sm text-slate-700 font-normal">Required for audit trail</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.editReason}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, editReason: e.target.value }))}
                      placeholder="e.g. Corrected faulty capacitor replaced details, customer update..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 text-slate-800 font-normal placeholder:text-slate-700 transition-all bg-white hover:border-slate-300"
                    />
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingReportItem(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100/70 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingEdit ||
                      !editForm.remarks.trim() ||
                      (editForm.status !== "ReverseEscalate" && !editForm.editReason.trim())
                    }
                    className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-98 ${
                      editForm.status === "ReverseEscalate"
                        ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-500/20"
                        : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-500/20"
                    }`}
                  >
                    <span>
                      {isSubmittingEdit
                        ? "Saving..."
                        : editForm.status === "ReverseEscalate"
                        ? "Confirm Reverse Escalate"
                        : "Save Changes"}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

                {/* History Modal */}
        {historyModalCall && (
          <ProductHistoryModal
            history={[
              ...((historyModalCall.editHistory || []).map((eh) => ({
                status: `Call Edited (${eh.role || "Admin"})`,
                timestamp: eh.editedAt,
                updatedBy: eh.editedBy,
                updatedByName: eh.editedByName,
                remarks: eh.reason ? `Reason: ${eh.reason}` : "",
                metadata: {
                  isEdit: true,
                  editReason: eh.reason,
                  diffs: eh.diffs || [],
                },
              }))),
              ...((historyModalCall.products || []).flatMap((p) => [
                ...((p._closureEdits || []).map((ce) => ({
                  status: `Report Edited (${ce.role || "Employee"})`,
                  timestamp: ce.editedAt,
                  updatedBy: ce.editedBy,
                  updatedByName: ce.editedByName,
                  remarks: ce.reason ? `Reason: ${ce.reason}` : "",
                  metadata: {
                    isEdit: true,
                    editReason: ce.reason,
                    diffs: ce.diffs || [],
                  },
                }))),
                ...(p._history || []),
              ])),
            ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
            employees={employees}
            currentUser={currentUser}
            onClose={() => setHistoryModalCall(null)}
          />
        )}

        {/* Full Details Call Modal */}
        {selectedInfoCall && (
          <CallDetailsModal
            call={selectedInfoCall}
            employees={employees}
            onClose={() => setSelectedInfoCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
