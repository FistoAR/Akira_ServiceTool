import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ReactDOM from "react-dom";
import {
  Search,
  X,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Edit3,
  ArrowLeft,
  Plus,
  Clock,
  User,
  Package,
  AlertCircle,
  CheckCircle,
  History,
  Smartphone,
  PlusCircle,
  MinusCircle,
  UserPlus,
  Phone,
  PhoneCall,
  FileText,
  Settings,
  MapPin,
  Mail,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Shield,
  Wrench,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  ClipboardList,
  Eye,
  Download,
  MoreVertical,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import ProductHistoryModal from "./ProductHistoryModal";
import { CallDetailsModal } from "./responseComponents/CallDetailsModal";
import ServiceCallForm from "./ServiceCallForm";
import useModulePermissions from "../../components/useModulePermissions";
import CustomDropdown from "../../components/CustomDropdown";
import { useSocket } from "../../contexts/SocketContext";
import { CustomTooltip, CustomerInfoCell } from "./responseComponents/CommonUI";

// ── Constants ──────────────────────────────────────────────────────────────────
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const SERVICE_CALLS_KEY = "service_calls_v2";
const PARTY_TYPES_KEY = "party_types_v3";
const PRODUCT_SEGMENTS_KEY = "product_segments_v1";
const EMPLOYEES_KEY = "employees";
const ESCALATION_KEY = "escalation_queue_v1";
const MODES_KEY = "call_modes_v1";
const SUPPORT_REQ_KEY = "support_requests_v1";
const FIELD_VISIT_KEY = "field_visits_v1";
const INHOUSE_KEY = "serviceCenter_repairs_v1";

const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const WARRANTY_STATUS = ["In Warranty", "Out of Warranty"];
const ESCALATION_TIMEOUT_MS = 1 * 60 * 1000;
const ITEMS_PER_PAGE = 10;

const PRIORITY_COLORS = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};
const STATUS_COLORS = {
  Registered: "bg-purple-100 text-purple-700",
  Assigned: "bg-blue-100 text-blue-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Open: "bg-green-100 text-green-700",
  Resolved: "bg-green-100 text-green-600",
};

// ── Product-level status derivation (mirrors EscalationPage) ──────────────────
const getProductStatus = (p, callStatus) => {
  const cStat = callStatus ? callStatus.toLowerCase() : "";
  if (cStat === "critical" || cStat === "critical_unresolved")
    return "critical";

  if (p?._resolved) return "resolved";
  if (
    p?._productClosure?.status === "Resolved" ||
    p?._productClosure?.status === "Closed"
  )
    return "closed";
  if (p?._productClosure?.status === "Pending") return "pending";
  if (p?._supportRequested) return "support";
  if (p?._productClosure?.status === "Field Visit Required")
    return "field_visit";
  if (
    p?._escalationLevel > 0 ||
    cStat === "escalating" ||
    cStat === "escalated"
  )
    return "escalated";
  if (p?._attended) return "attended";
  if (p?._assigned) return "assigned";
  return cStat || "registered";
};
const PROD_STATUS_CFG = {
  resolved: {
    label: "Resolved",
    dot: "bg-green-500",
    cls: "bg-green-50 border-green-300 text-green-700",
  },
  closed: {
    label: "Resolved",
    dot: "bg-green-500",
    cls: "bg-green-50 border-green-300 text-green-700",
  },
  pending: {
    label: "Pending",
    dot: "bg-yellow-500",
    cls: "bg-yellow-50 border-yellow-300 text-yellow-700",
  },
  support: {
    label: "Supporting",
    dot: "bg-orange-500",
    cls: "bg-orange-50 border-orange-300 text-orange-700",
  },
  field_visit: {
    label: "Field Visit",
    dot: "bg-teal-500",
    cls: "bg-teal-50 border-teal-300 text-teal-700",
  },
  registered: {
    label: "Registered",
    dot: "bg-purple-400",
    cls: "bg-purple-50 border-purple-300 text-purple-700",
  },
  assigned: {
    label: "Assigned",
    dot: "bg-blue-400",
    cls: "bg-blue-50 border-blue-300 text-blue-700",
  },
  attended: {
    label: "Assigned",
    dot: "bg-blue-400",
    cls: "bg-blue-50 border-blue-300 text-blue-700",
  },
  escalated: {
    label: "Escalating",
    dot: "bg-orange-500",
    cls: "bg-orange-50 border-orange-300 text-orange-700",
  },
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    cls: "bg-red-50 border-red-300 text-red-700",
  },
  critical_unresolved: {
    label: "Critical",
    dot: "bg-red-500",
    cls: "bg-red-50 border-red-300 text-red-700",
  },
};

const getStatusCfg = (statusKey) => {
  if (!statusKey) return PROD_STATUS_CFG.registered;
  const key = statusKey.toLowerCase();
  return (
    PROD_STATUS_CFG[key] || {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      dot: "bg-gray-400",
      cls: "bg-gray-50 border-gray-300 text-gray-700",
    }
  );
};

const deriveCallStatus = (products = [], currentStatus = "Registered") => {
  if (currentStatus === "Registered") return "Registered";

  if (products.length === 0) {
    if (currentStatus === "Critical" || currentStatus === "Critical_Unresolved")
      return "Critical";
    if (currentStatus === "Escalated" || currentStatus === "Escalating")
      return "Escalating";
    return currentStatus;
  }

  const stats = products.map((p) => getProductStatus(p, currentStatus));
  if (stats.every((s) => s === "closed" || s === "resolved")) return "Resolved";

  if (currentStatus === "Critical" || currentStatus === "Critical_Unresolved")
    return "Critical";

  if (stats.some((s) => s === "support")) return "Supporting";
  if (stats.some((s) => s === "field_visit")) return "Field Visit";
  if (stats.some((s) => s === "pending")) return "Pending";
  if (
    stats.some((s) => s === "escalated") ||
    currentStatus === "Escalated" ||
    currentStatus === "Escalating"
  )
    return "Escalating";

  if (stats.some((s) => s === "assigned" || s === "attended"))
    return "Assigned";

  return currentStatus;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad = (key, fb) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const getCustomerTypeTextColor = (type) => {
  switch (type) {
    case "OEM":
      return "text-blue-600";
    case "End Customer":
      return "text-emerald-600";
    case "Distributor":
      return "text-purple-600";
    case "Dealer":
      return "text-amber-600";
    default:
      return "text-slate-700";
  }
};

const getTypeColor = (type, types = []) => {
  if (types.length > 0) {
    const idx = types.findIndex((t) => (t.name || t) === type);
    if (idx !== -1) {
      return [
        "bg-purple-100 text-purple-700 border-purple-200",
        "bg-orange-100 text-orange-700 border-orange-200",
        "bg-blue-100 text-blue-700 border-blue-200",
        "bg-green-100 text-green-700 border-green-200",
      ][idx % 4];
    }
  }
  switch (type) {
    case "OEM":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "End Customer":
      return "bg-green-100 text-green-700 border-green-200";
    case "Distributor":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "Dealer":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-slate-400";
  }
};

const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL1 || API_URL.replace(/\/api$/, "");

const generateCallNumber = () => {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SC-${date}-${rand}`;
};

const emptyProduct = () => ({
  itemCode: "",
  productSegment: "",
  productModel: "",
  serialNumber: "",
  dateOfSupply: "",
  warrantyPeriodDays: "",
  warrantyExpiryDate: "",
  warrantyStatus: "In Warranty",
  callDescription: "",
  errorCode: "",
  mediaReceived: "No",
});

const emptyForm = () => ({
  id: null,
  callNumber: generateCallNumber(),
  dateTime: new Date().toLocaleString(),
  timestamp: new Date().toISOString(),
  mode: "",
  priority: "Medium",
  customerType: "All",
  partyCode: "",
  customerName: "",
  contactPerson: "",
  contactNumber: "",
  emailId: "",
  location: "",
  site: "",
  locationType: "IPR",
  products: [emptyProduct()],
  assignedEngineer: "",
  assignedEngineerName: "",
  assignedDepartment: "",
  assignmentDate: new Date().toISOString().slice(0, 16),
  expectedResponse: "",
  ackSent: "No",
  sentBy: "Auto",
  status: "Registered",
  escalationLevel: 0,
  escalationHistory: [],
  resolvedAt: null,
  assignedAt: null,
});

// ── Avatar helpers ────────────────────────────────────────────────────────────
const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
  "from-yellow-400 to-yellow-600",
  "from-red-400 to-red-600",
];
const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const Avatar = ({ name, size = "md", ring = false, title }) => {
  const sz = {
    sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]",
    md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]",
    lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]",
  };
  return (
    <div
      title={title || name}
      className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${sz[size]} ${ring ? "ring-[0.12vw] ring-white" : ""}`}
    >
      {initials(name)}
    </div>
  );
};

// ── Collect all people involved in a call ─────────────────────────────────────
const getPeopleFlow = (entry) => {
  if (!entry) return [];
  const seen = new Map(); // id → { name, dept, role, steps }

  const add = (id, name, dept, role, time) => {
    if (!name || name === "auto" || name === "Auto-assigned") return;
    const key = id || name;
    if (!seen.has(key))
      seen.set(key, { id: key, name, dept, role, events: [] });
    seen.get(key).events.push({ role, time });
  };

  // Call-level escalation history
  (entry.escalationHistory || []).forEach((h) => {
    add(
      h.engineerId,
      h.engineerName,
      h.department,
      `L${h.level + 1} — ${h.department}`,
      h.assignedAt,
    );
  });

  // Per-product escalation histories
  (entry.products || []).forEach((p, pi) => {
    (p._escalationHistory || []).forEach((h) => {
      add(
        h.engineerId,
        h.engineerName,
        h.department,
        `P${pi + 1} L${h.level + 1} — ${h.department}`,
        h.assignedAt,
      );
    });
    // Support person
    if (p._supportPersonId) {
      add(
        p._supportPersonId,
        p._supportPersonName,
        p._currentDepartment,
        `P${pi + 1} Support`,
        new Date().toISOString(),
      );
    }
  });

  return Array.from(seen.values());
};

// ── Build full chronological flow for modal ────────────────────────────────────
const buildFullFlow = (
  entry,
  supportReqs,
  fieldVisits,
  serviceCenterRepairs,
) => {
  if (!entry) return [];
  const events = [];

  // Call-level assignments
  (entry.escalationHistory || []).forEach((h) => {
    events.push({
      time: h.assignedAt,
      type: "assign",
      level: h.level,
      person: h.engineerName,
      dept: h.department,
      label: `Assigned — L${h.level + 1}`,
      reason: h.reason,
      scope: "call",
    });
  });

  // Per-product events
  (entry.products || []).forEach((p, pi) => {
    const pLabel = `P${pi + 1}: ${p.productModel || p.itemCode || "Product"}`;

    (p._escalationHistory || []).forEach((h) => {
      events.push({
        time: h.assignedAt,
        type: "escalate",
        level: h.level,
        person: h.engineerName,
        dept: h.department,
        label: `${pLabel} → ${h.department}`,
        reason: h.reason,
        scope: "product",
        product: pLabel,
      });
    });

    if (p._attended) {
      events.push({
        time: p._attendedAt || new Date().toISOString(),
        type: "attended",
        person: p._assignedEngineerName || entry.currentEngineerName,
        dept: p._currentDepartment || entry.currentDepartment,
        label: `${pLabel} Attended`,
        reason: "Engineer is working on the call",
        scope: "product",
        product: pLabel,
      });
    }

    if (p._resolved) {
      events.push({
        time: p._resolvedAt || new Date().toISOString(),
        type: "resolve",
        person: entry.currentEngineerName,
        dept: entry.currentDepartment,
        label: `${pLabel} Resolved`,
        reason: p._resolutionRemarks || p._resolutionType,
        scope: "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.status === "Closed") {
      events.push({
        time:
          p._productClosure.updatedAt ||
          p._productClosure.closedAt ||
          new Date().toISOString(),
        type: "close",
        person: entry.currentEngineerName,
        dept: entry.currentDepartment,
        label: `${pLabel} Closed`,
        reason: p._productClosure.remarks,
        scope: "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.status === "Pending") {
      events.push({
        time:
          p._productClosure.updatedAt ||
          p._productClosure.pendingAt ||
          new Date().toISOString(),
        type: "pending",
        person: entry.currentEngineerName,
        dept: entry.currentDepartment,
        label: `${pLabel} Marked Pending`,
        reason: p._productClosure.remarks,
        scope: "product",
        product: pLabel,
      });
    }

    if (p._productClosure?.status === "Field Visit Required") {
      events.push({
        time: p._productClosure.updatedAt || new Date().toISOString(),
        type: "fieldvisit",
        person: p._productClosure.assignedTo || entry.currentEngineerName,
        dept: "Field",
        label: `${pLabel} Field Visit Required`,
        reason: `Scheduled for: ${p._productClosure.visitDate || "Unknown date"}`,
        scope: "product",
        product: pLabel,
      });
    }

    if (p._supportRequested) {
      events.push({
        time:
          p._productClosure?.updatedAt ||
          entry.updatedAt ||
          new Date().toISOString(),
        type: "support",
        person: p._supportPersonName || "Support Engineer",
        dept: p._currentDepartment || "Support",
        label: `${pLabel} Support Requested`,
        reason: "Assigned for support",
        scope: "product",
        product: pLabel,
      });
    }
  });

  // Support requests
  (supportReqs || [])
    .filter((s) => s.callId === entry.callId)
    .forEach((s) => {
      const pLabel = s.product
        ? s.product.productModel || s.product.itemCode || `P${s.productIdx + 1}`
        : "";
      events.push({
        time: s.createdAt,
        type: "support",
        person: `${s.requestedByName} → ${s.supportPerson?.name}`,
        dept: s.supportPerson?.department,
        label: `Support Request${pLabel ? " · " + pLabel : ""}`,
        reason: s.notes,
        scope: "support",
      });
      if (s.resolvedAt) {
        events.push({
          time: s.resolvedAt,
          type: "resolve",
          person: s.supportPerson?.name,
          dept: s.supportPerson?.department,
          label: `Support Resolved${pLabel ? " · " + pLabel : ""}`,
          reason: s.resolutionNotes,
          scope: "support",
        });
      }
    });

  // Field visits
  (fieldVisits || [])
    .filter((f) => f.callId === entry.callId)
    .forEach((f) => {
      events.push({
        time: f.assignmentDate || f.createdAt,
        type: "fieldvisit",
        person: f.assignedToName,
        dept: "Field",
        label: `Field Visit Assigned${f.productIdx != null ? " · P" + (f.productIdx + 1) : ""}`,
        reason: f.diagnosisSummary,
        scope: "visit",
      });
      if (f.visitStatus === "Closed" && f.closedAt) {
        events.push({
          time: f.closedAt,
          type: "close",
          person: f.assignedToName,
          dept: "Field",
          label: `Field Visit Completed`,
          reason: f.resolutionRemarks,
          scope: "visit",
        });
      }
    });

  // Service Center repairs
  (serviceCenterRepairs || [])
    .filter((r) => r.callId === entry.callId)
    .forEach((r) => {
      events.push({
        time: r.assignmentDate || r.createdAt,
        type: "serviceCenter",
        person: r.assignedToName,
        dept: "Service Center",
        label: `Service Center Repair Assigned${r.productIdx != null ? " · P" + (r.productIdx + 1) : ""}`,
        reason: r.diagnosisSummary,
        scope: "repair",
      });
      if (r.visitStatus === "Closed" && r.closedAt) {
        events.push({
          time: r.closedAt,
          type: "close",
          person: r.assignedToName,
          dept: "Service Center",
          label: `Service Center Repair Completed`,
          reason: r.resolutionRemarks,
          scope: "repair",
        });
      }
    });

  return events.sort((a, b) => new Date(a.time) - new Date(b.time));
};

// ── Call Summary Modal ─────────────────────────────────────────────────────────
const CallSummaryModal = ({ row, employees, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [summaryType, setSummaryType] = useState("full");

  if (!row) return null;

  const generateSummary = () => {
    const pad = (str, len = 20) => (str + ":").padEnd(len, " ");
    const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "short",
        timeStyle: "short",
      });
    };

    let text = `--- Service Call Summary ---\n`;
    text += `${pad("Call Number")} ${row.callNumber || "N/A"}\n`;
    text += `${pad("Registered Date")} ${formatDate(row.dateTime)}\n`;
    text += `${pad("Customer Name")} ${row.customerName || "N/A"}\n`;
    text += `${pad("Customer Phone")} ${row.contactNumber || "N/A"}\n`;
    text += `${pad("Customer Email")} ${row.emailId || "N/A"}\n`;
    text += `${pad("Customer Address")} ${row.location || "N/A"}\n`;
    if (row.site) text += `${pad("Site")} ${row.site}\n`;
    text += `${pad("Status")} ${row.status || "N/A"}\n`;
    text += `${pad("Priority")} ${row.priority || "N/A"}\n`;
    text += `${pad("Call Mode")} ${row.mode || "N/A"}\n`;
    text += `${pad("Total Products")} ${row.products?.length || 0}\n\n`;

    row.products?.forEach((p, idx) => {
      text += `--- Product ${idx + 1} ---\n`;
      text += `${pad("Product Name")} ${p.itemDescription || p.productName || p.itemCode || "N/A"}\n`;
      text += `${pad("Segment")} ${p.productSegment || "N/A"}\n`;
      text += `${pad("Serial Number")} ${p.serialNumber || "N/A"}\n`;
      text += `${pad("Error Code")} ${p.errorCode || "N/A"}\n`;
      text += `${pad("Warranty Status")} ${p.warrantyStatus || "N/A"}\n`;
      text += `${pad("Assigned Engineer")} ${p._assignedEngineerName || row.currentEngineerName || "Unassigned"}\n`;

      if (p._productClosure) {
        text += `${pad("Closure Status")} ${p._productClosure.status || "N/A"}\n`;
        text += `${pad("Closure Remarks")} ${p._productClosure.remarks || "N/A"}\n`;
        if (p._productClosure.visitDate)
          text += `${pad("Visit Date")} ${formatDate(p._productClosure.visitDate)}\n`;
      }

      text += `\n`;
    });

    const fullHistory = (row._products || row.products || [])
      .flatMap((p) => [...(p._history || p.history || [])])
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (fullHistory.length > 0) {
      if (summaryType === "full") {
        text += `--- Call Level Activity / Reports ---\n`;
        fullHistory.forEach((h, hIdx) => {
          const dtStr = formatDate(h.timestamp);
          text += `[${hIdx + 1}] ${dtStr}\n`;
          let personLine = h.updatedByName || h.updatedBy || "System";
          if (h.metadata?.assignedToName)
            personLine = h.metadata.assignedToName;
          else if (h.metadata?.supportPerson?.name)
            personLine = h.metadata.supportPerson.name;
          else {
            const emp = employees?.find((e) => e.userId === h.updatedBy);
            if (emp) personLine = `${emp.name} (${emp.department})`;
          }

          if (h.metadata?.dept) personLine += ` (${h.metadata.dept})`;

          text += `    Person   : ${personLine}\n`;
          text += `    Status   : ${h.status || "Update"}\n`;

          if (h.metadata?.level > 0)
            text += `    Level    : ${h.metadata.level}\n`;

          let remarks =
            h.metadata?.remarks ||
            h.metadata?.reason ||
            h.remarks ||
            h.reason ||
            "None";
          text += `    Remarks  : ${remarks}\n\n`;
        });
      } else {
        text += `--- Latest Call Level Activity ---\n`;
        const h = fullHistory[fullHistory.length - 1];
        const dtStr = formatDate(h.timestamp);
        text += `[*] ${dtStr}\n`;
        let personLine = h.updatedByName || h.updatedBy || "System";
        if (h.metadata?.assignedToName) personLine = h.metadata.assignedToName;
        else if (h.metadata?.supportPerson?.name)
          personLine = h.metadata.supportPerson.name;
        else {
          const emp = employees?.find((e) => e.userId === h.updatedBy);
          if (emp) personLine = `${emp.name} (${emp.department})`;
        }

        if (h.metadata?.dept) personLine += ` (${h.metadata.dept})`;

        text += `    Person   : ${personLine}\n`;
        text += `    Status   : ${h.status || "Update"}\n`;

        if (h.metadata?.level > 0)
          text += `    Level    : ${h.metadata.level}\n`;

        let remarks =
          h.metadata?.remarks ||
          h.metadata?.reason ||
          h.remarks ||
          h.reason ||
          "None";
        text += `    Remarks  : ${remarks}\n\n`;
      }
    }

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[2vw] bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[0.5vw] w-[50vw] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative border border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-[1.5vw] py-[1vw] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.8vw]">
            <div className="p-[0.5vw] bg-gray-100 border border-gray-200 rounded-[0.5vw]">
              <ClipboardList className="w-[1.2vw] h-[1.2vw] text-gray-600" />
            </div>
            <div>
              <h2 className="text-gray-900 text-[1.1vw] font-bold leading-tight">
                Call Summary
              </h2>
              <p className="text-gray-500 text-[0.7vw] font-medium mt-[0.1vw]">
                {row.callNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="flex bg-gray-100 rounded-[0.4vw] p-[0.2vw] border border-gray-200 shadow-inner">
              <button
                onClick={() => setSummaryType("latest")}
                className={`px-[1vw] py-[0.35vw] text-[0.7vw] font-bold rounded-[0.3vw] transition-all cursor-pointer ${summaryType === "latest" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                Latest Summary
              </button>
              <button
                onClick={() => setSummaryType("full")}
                className={`px-[1vw] py-[0.35vw] text-[0.7vw] font-bold rounded-[0.3vw] transition-all cursor-pointer ${summaryType === "full" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                Full Summary
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white hover:bg-gray-50 transition-colors rounded-[0.4vw] text-gray-700 text-[0.75vw] font-semibold border border-gray-300 shadow-sm"
            >
              {copied ? (
                <Check className="w-[0.9vw] h-[0.9vw] text-green-600" />
              ) : (
                <Copy className="w-[0.9vw] h-[0.9vw] text-gray-500" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer p-[0.4vw] rounded-full"
            >
              <X className="w-[1.1vw] h-[1.1vw]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-[1.5vw] bg-gray-50/50">
          <pre className="whitespace-pre-wrap text-[0.82vw] font-mono text-gray-800 bg-white p-[1.2vw] rounded-[0.5vw] border border-gray-200 shadow-sm leading-relaxed">
            {generateSummary()}
          </pre>
        </div>
      </div>
    </div>
  );
};

// ── Flow Modal ────────────────────────────────────────────────────────────────
// ── EscalationTimer Sub-component ───────────────────────────────────────────
const EscalationTimer = ({ target, isCritical }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (isCritical || !target || target.status === "EXPIRED") {
      setTimeLeft(
        isCritical
          ? "CRITICAL"
          : target?.status === "EXPIRED"
            ? "Escalation Chain Ended"
            : "",
      );
      return;
    }

    const update = () => {
      const now = Date.now();
      const diff = target.targetTime - now;
      if (diff <= 0) {
        setTimeLeft("Moved to Critical Zone");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [target, isCritical]);

  if (!timeLeft) return null;

  if (isCritical) {
    return (
      <div className="flex items-center gap-[0.8vw] bg-red-600 border border-red-700 px-[1.2vw] py-[0.6vw] rounded-[0.6vw] shadow-lg animate-in fade-in zoom-in duration-300">
        <div className="p-[0.4vw] bg-white/20 rounded-full">
          <AlertCircle className="w-[1.2vw] h-[1.2vw] text-white animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[0.65vw] text-red-100 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">
            System Priority
          </span>
          <span className="text-[1.1vw] font-black text-white leading-none uppercase tracking-tight">
            Moved to Critical Zone
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[0.8vw] bg-amber-50/80 border border-amber-200 px-[1vw] py-[0.5vw] rounded-[0.5vw] shadow-sm">
      <div className="p-[0.35vw] bg-amber-100 rounded-full">
        <Clock className="w-[1.1vw] h-[1.1vw] text-amber-600 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="text-[0.6vw] text-amber-600 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">
          Next Escalation In
        </span>
        <span className="text-[1vw] font-mono font-black text-amber-700 leading-none">
          {timeLeft}
        </span>
      </div>
      {target.dept && (
        <div className="ml-auto flex flex-col items-end border-l border-amber-200 pl-[1vw]">
          <span className="text-[0.6vw] text-amber-500 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">
            To Department
          </span>
          <span className="text-[0.85vw] font-bold text-slate-700 leading-none">
            {target.dept}
          </span>
        </div>
      )}
    </div>
  );
};

// ── Config Manager Modal ───────────────────────────────────────────────────────
const ConfigManagerModal = ({ title, icon: Icon, items, onClose, onSave }) => {
  const { toast, confirm } = useNotification();
  const [localItems, setLocalItems] = useState([...items]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const inputRef = useRef(null);
  const editRef = useRef(null);
  useEffect(() => {
    if (editingIdx !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingIdx]);
  const handleAdd = () => {
    const t = newValue.trim();
    if (!t) return;
    if (localItems.some((i) => i.toLowerCase() === t.toLowerCase())) {
      toast(`"${t}" already exists!`, "error");
      return;
    }
    setLocalItems([...localItems, t]);
    setNewValue("");
    if (inputRef.current) inputRef.current.focus();
  };
  const handleSaveEdit = (idx) => {
    const t = editValue.trim();
    if (!t) return;
    if (
      localItems.some(
        (i, n) => n !== idx && i.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast(`"${t}" already exists!`, "error");
      return;
    }
    const u = [...localItems];
    u[idx] = t;
    setLocalItems(u);
    setEditingIdx(null);
  };
  const handleDelete = async (idx) => {
    if (localItems.length <= 1) {
      toast("Must have at least one item.", "warning");
      return;
    }
    const item = localItems[idx];
    const confirmed = await confirm({
      title: "Delete Item",
      message: `Delete "${item}" from lists?`,
      type: "danger",
      confirmText: "Delete",
    });
    if (confirmed) {
      setLocalItems(localItems.filter((_, i) => i !== idx));
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[32vw] rounded-[0.6vw] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-[1.2vw] py-[0.8vw] border-b border-slate-400 flex justify-between items-center bg-gray-50">
          <h2 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.5vw]">
            <Icon className="w-[1.1vw] h-[1.1vw]" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>
        <div className="px-[1.2vw] pt-[1vw] pb-[0.6vw]">
          <div className="flex gap-[0.5vw]">
            <input
              ref={inputRef}
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 border border-gray-400 rounded-[0.4vw] px-[0.7vw] py-[0.55vw] text-[0.85vw] outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newValue.trim()}
              className="px-[0.9vw] py-[0.55vw] bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white rounded-[0.4vw] flex items-center gap-[0.3vw] text-[0.8vw] font-medium cursor-pointer"
            >
              <Plus className="w-[0.9vw] h-[0.9vw]" />
              Add
            </button>
          </div>
        </div>
        <div className="px-[1.2vw] pb-[0.8vw] flex-1 overflow-y-auto space-y-[0.4vw]">
          {localItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-[0.5vw] rounded-[0.4vw] border p-[0.5vw] ${editingIdx === idx ? "border-gray-400 bg-gray-50" : "border-slate-400 bg-white"}`}
            >
              {editingIdx === idx ? (
                <>
                  <input
                    ref={editRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(idx);
                      if (e.key === "Escape") setEditingIdx(null);
                    }}
                    className="flex-1 border border-gray-400 rounded-[0.3vw] px-[0.6vw] py-[0.4vw] text-[0.85vw] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(idx)}
                    className="text-gray-700 hover:text-gray-900 cursor-pointer p-[0.3vw]"
                  >
                    <CheckCircle className="w-[1vw] h-[1vw]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIdx(null)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-[0.3vw]"
                  >
                    <X className="w-[1vw] h-[1vw]" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 flex items-center justify-center text-[0.65vw] text-gray-500 font-bold">
                    {idx + 1}
                  </div>
                  <span className="flex-1 text-[0.85vw] text-gray-800 font-medium">
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIdx(idx);
                      setEditValue(item);
                    }}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.3vw]"
                  >
                    <Edit3 className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    disabled={localItems.length <= 1}
                    className="text-gray-400 hover:text-red-600 disabled:text-gray-200 cursor-pointer p-[0.3vw]"
                  >
                    <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="px-[1.2vw] py-[0.8vw] border-t border-slate-400 flex justify-end gap-[0.7vw] bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-gray-400 bg-white text-gray-700 rounded-[0.4vw] cursor-pointer text-[0.85vw] font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(localItems);
              onClose();
            }}
            className="px-[1.2vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] cursor-pointer flex items-center gap-[0.4vw] text-[0.85vw] font-medium"
          >
            <Save className="w-[0.9vw] h-[0.9vw]" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Entry Form ─────────────────────────────────────────────────────────────────
// ServiceCallForm moved to separate file: ./ServiceCallForm

// ── AvatarStack ────────────────────────────────────────────────────────────────
const AvatarStack = ({ people, onClick }) => {
  const shown = people.slice(0, 4);
  const extra = people.length - shown.length;
  return (
    <button
      onClick={onClick}
      title="View full flow"
      className="flex items-center cursor-pointer group"
    >
      <div className="flex items-center">
        {shown.map((p, i) => (
          <div
            key={i}
            style={{
              zIndex: shown.length - i,
              marginLeft: i === 0 ? 0 : "-0.45vw",
            }}
          >
            <Avatar name={p.name} size="sm" ring />
          </div>
        ))}
        {extra > 0 && (
          <div
            style={{ zIndex: 0, marginLeft: "-0.45vw" }}
            className="w-[1.4vw] h-[1.4vw] rounded-full bg-gray-200 border-[0.12vw] border-white flex items-center justify-center text-[0.52vw] font-bold text-gray-600 flex-shrink-0"
          >
            +{extra}
          </div>
        )}
      </div>
      <span className="text-[0.62vw] text-gray-400 ml-[0.3vw] group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
        View flow
      </span>
    </button>
  );
};

// ── Product Status chip only ──────────────────────────────────────────────────
const ProductStatusCell = ({ prod, callStatus }) => {
  const status = getProductStatus(prod, callStatus);
  const cfg = getStatusCfg(status);
  return (
    <span
      className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded text-[0.7vw] font-semibold border ${cfg.cls}`}
    >
      <span
        className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`}
      />
      {cfg.label}
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ServiceCall() {
  const { toast } = useNotification();
  const { socket } = useSocket();
  const currentUser = lsLoad("currentUser", { name: "System" });
  const [view, setView] = useState("table");
  const [editingRow, setEditingRow] = useState(null);

  const [serviceCalls, setServiceCalls] = useState([]);
  const [customerDb, setCustomerDb] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [segments, setSegments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modes, setModes] = useState([]);
  const [escalationQueue, setEscalationQueue] = useState([]);
  const [allFlows, setAllFlows] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const { canWrite, canUpdate, canDelete } = useModulePermissions("callReg");

  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState(
    urlSearch ? "" : new Date().toISOString().split("T")[0],
  );
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [summaryModalRow, setSummaryModalRow] = useState(null);
  const [selectedInfoCall, setSelectedInfoCall] = useState(null);
  const [historyModalProduct, setHistoryModalProduct] = useState(null);
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
      setFilterFromDate("");
    }
  }, [urlSearch]);

  useEffect(() => {
    const fetchData = async () => {
      // Instant cache display for immediate rendering without layout flash
      try {
        const cachedCalls = localStorage.getItem("service_calls_cache");
        if (cachedCalls && !serviceCalls.length) {
          setServiceCalls(JSON.parse(cachedCalls));
        }
      } catch (e) {}

      setIsLoading(true);
      try {
        const [
          callsRes,
          custRes,
          ptRes,
          sitesRes,
          empRes,
          modesRes,
          qRes,
          flowsRes,
          segRes,
        ] = await Promise.all([
          axios.get(`${API_URL}/service-calls`),
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/party-types`),
          axios.get(`${API_URL}/master/sites`),
          axios.get(`${API_URL}/auth/employees`),
          axios.get(`${API_URL}/master/settings/${MODES_KEY}`),
          axios.get(`${API_URL}/service-calls/pending`),
          axios.get(`${API_URL}/master/escalation-flows`),
          axios.get(`${API_URL}/master/product-segments`),
        ]);

        setServiceCalls(callsRes.data);
        try {
          localStorage.setItem("service_calls_cache", JSON.stringify(callsRes.data));
        } catch (e) {}
        setCustomerDb(custRes.data);
        setSites(sitesRes.data || []);
        setPartyTypes(
          ptRes.data.length
            ? ptRes.data.map((t) => ({ ...t, id: t._id || t.id }))
            : [
                { id: 1, name: "OEM" },
                { id: 2, name: "End Customer" },
              ],
        );
        setSegments(segRes.data);
        setEmployees(empRes.data);
        setModes(modesRes.data || DEFAULT_MODES);

        const flows = {};
        flowsRes.data.forEach((f) => {
          flows[f.type] = f.steps;
        });
        setAllFlows(flows);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user?.role === "Supervisor") setIsSupervisor(true);

    if (socket) {
      const handleSocketCall = (updatedCall) => {
        if (!updatedCall) return;
        if (updatedCall.deleted) {
          setServiceCalls((prev) => prev.filter((c) => (c._id || c.callId || c.id) !== updatedCall.callId));
        } else {
          setServiceCalls((prev) => {
            const id = updatedCall._id || updatedCall.id;
            const exists = prev.some((c) => (c._id || c.id) === id);
            if (exists) {
              return prev.map((c) => ((c._id || c.id) === id ? updatedCall : c));
            }
            return [updatedCall, ...prev];
          });
        }
      };

      socket.on("service_call_updated", handleSocketCall);
      return () => {
        socket.off("service_call_updated", handleSocketCall);
      };
    }
  }, [socket]);

  // Keep escalation queue in sync
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const q = JSON.parse(localStorage.getItem(ESCALATION_KEY) || "[]");
        setEscalationQueue(q);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const save = (rows) => {
    setServiceCalls(rows);
    lsSave(SERVICE_CALLS_KEY, rows);
  };
  const handleSaveModes = async (updated) => {
    setModes(updated);
    lsSave(MODES_KEY, updated);
    try {
      await axios.post(`${API_URL}/master/settings`, {
        key: MODES_KEY,
        value: updated,
      });
    } catch (err) {
      console.error("Failed to save modes to server:", err);
      toast("Could not save modes to server", "error");
    }
  };

  const goToForm = () => {
    setEditingRow(null);
    setView("form");
  };
  const goToEdit = (row) => {
    setEditingRow({
      ...row,
      products: row._products?.length > 0 ? row._products : row.products || [],
      _editing: true,
    });
    setView("form");
  };
  const goToTable = () => {
    setEditingRow(null);
    setView("table");
  };

  async function handleSave(formRow, isEdit) {
    const now = new Date();
    const callId = isEdit ? formRow.id || formRow._id : Date.now();

    // Convert localized string to ISO string for backend to prevent CastError
    let validDateTime = formRow.dateTime;
    if (
      validDateTime &&
      typeof validDateTime === "string" &&
      !validDateTime.includes("T")
    ) {
      validDateTime = formRow.timestamp || new Date().toISOString();
    }

    // 1. Prepare the base call record — NEW calls start as "Registered"
    const finalCall = {
      ...formRow,
      dateTime: validDateTime,
      id: callId,
      status: isEdit ? formRow.status : "Registered",
    };

    // Clean payload for server (strip UI-only 'id' and MongoDB '_id')
    const {
      id: _ignore,
      _id,
      _products,
      _people,
      _queueEntry,
      ...serverPayload
    } = finalCall;

    if (isEdit) {
      serverPayload._editedBy = currentUser?.userId || "Admin";
      serverPayload._editedByName = currentUser?.name || "Administrator";
      serverPayload._editedByRole = currentUser?.role || "Admin";
    }

    // 3. Update the database and local store
    if (isEdit) {
      try {
        // Sync with Escalation Queue (Local)
        const existingQueue = lsLoad(ESCALATION_KEY, []);
        const entryIdx = existingQueue.findIndex(
          (e) => e.callId === formRow.id || e.callNumber === formRow.callNumber,
        );
        if (entryIdx >= 0) {
          const existing = existingQueue[entryIdx];
          const existingProds = existing.products || [];
          const isAlreadyInQueue = (sp, spIdx) => {
            if (
              sp.serialNumber &&
              existingProds.some((ep) => ep.serialNumber === sp.serialNumber)
            )
              return true;
            const m = sp.productModel || sp.itemCode || "";
            if (
              m &&
              existingProds.some(
                (ep) => (ep.productModel || ep.itemCode || "") === m,
              )
            )
              return true;
            if (spIdx < existingProds.length) return true;
            return false;
          };

          const newProds = (formRow.products || []).filter(
            (sp, i) => !isAlreadyInQueue(sp, i),
          );
          const appendedProds = newProds.map((sp) => ({
            ...sp,
            _escalationLevel: 0,
            _escalationHistory: [],
            _supportRequested: false,
            _resolved: false,
          }));

          existingQueue[entryIdx] = {
            ...existing,
            products: [...existingProds, ...appendedProds],
            contactPerson:
              formRow.contactPerson || existing.contactPerson || "",
            contactNumber:
              formRow.contactNumber || existing.contactNumber || "",
            emailId: formRow.emailId || existing.emailId || "",
            locationType:
              formRow.locationType || existing.locationType || "IPR",
            location: formRow.location || existing.location || "",
            site: formRow.site || existing.site || "",
            priority: formRow.priority || existing.priority,
          };
          lsSave(ESCALATION_KEY, existingQueue);
          setEscalationQueue(existingQueue);
        }

        // Sync with Server
        const res = await axios.patch(
          `${API_URL}/service-calls/${finalCall.id}`,
          serverPayload,
        );
        const updated = serviceCalls.map((r) =>
          r.id === finalCall.id || r._id === finalCall.id
            ? { ...res.data, id: res.data._id }
            : r,
        );
        setServiceCalls(updated);
        lsSave(SERVICE_CALLS_KEY, updated);
        toast("Service call updated successfully");
      } catch (err) {
        console.error("Update failed", err);
        toast("Failed to update call on server", "error");
        return;
      }
    } else {
      try {
        const res = await axios.post(`${API_URL}/service-calls`, serverPayload);
        const newCall = { ...res.data, id: res.data._id };
        setServiceCalls([newCall, ...serviceCalls]);
        lsSave(SERVICE_CALLS_KEY, [newCall, ...serviceCalls]);
        toast("Service call registered successfully");
      } catch (err) {
        console.error("Create failed", err);
        toast("Failed to register call on server", "error");
        return;
      }
    }

    setView("table");
  }

  // ── Build enriched call data merging escalation queue ─────────────────────
  const enrichedCalls = useMemo(() => {
    return serviceCalls.map((row) => {
      let products = row.products || [];
      const attendedProd = products.find((p) => p._attended);
      if (attendedProd) {
        products = products.map((p) => ({
          ...p,
          _assigned: attendedProd._assigned,
          _assignedEngineerId: attendedProd._assignedEngineerId,
          _assignedEngineerName: attendedProd._assignedEngineerName,
          _attended: attendedProd._attended,
          _attendedAt: attendedProd._attendedAt || p._attendedAt,
        }));
      }

      const people = getPeopleFlow(row);
      const derived = deriveCallStatus(products, row.status);
      return { ...row, _products: products, _people: people, status: derived };
    });
  }, [serviceCalls]);

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return enrichedCalls.filter((row) => {
      const matchSearch =
        !s ||
        row.customerName?.toLowerCase().includes(s) ||
        row.callNumber?.toLowerCase().includes(s) ||
        row.assignedEngineerName?.toLowerCase().includes(s);
      const matchPriority =
        filterPriority === "All" || row.priority === filterPriority;

      let matchDate = true;
      const rowDate = new Date(row.createdAt || row.timestamp || row.dateTime);
      if (filterFromDate) {
        const from = new Date(filterFromDate);
        from.setHours(0, 0, 0, 0);
        if (rowDate < from) matchDate = false;
      }
      if (filterToDate) {
        const to = new Date(filterToDate);
        to.setHours(23, 59, 59, 999);
        if (rowDate > to) matchDate = false;
      }

      let matchStatus = true;
      if (filterStatus !== "All") {
        matchStatus = row.status === filterStatus;
      }

      return matchSearch && matchPriority && matchStatus && matchDate;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || a.dateTime).getTime() || 0;
      const dateB = new Date(b.createdAt || b.timestamp || b.dateTime).getTime() || 0;
      return dateB - dateA;
    });
  }, [
    enrichedCalls,
    searchTerm,
    filterPriority,
    filterStatus,
    filterFromDate,
    filterToDate,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPriority, filterFromDate, filterToDate]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const isPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((r) => selectedItems.has(r.id || r._id));

  const isAllFilteredSelected =
    filteredData.length > 0 &&
    filteredData.every((r) => selectedItems.has(r.id || r._id));

  const toggleSelect = (id) => {
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };

  const toggleSelectPage = () => {
    const s = new Set(selectedItems);
    if (isPageSelected) {
      paginatedData.forEach((r) => s.delete(r.id || r._id));
    } else {
      paginatedData.forEach((r) => s.add(r.id || r._id));
    }
    setSelectedItems(s);
  };

  const selectAllFiltered = () => {
    const s = new Set(selectedItems);
    filteredData.forEach((r) => s.add(r.id || r._id));
    setSelectedItems(s);
  };

  const clearAllSelected = () => {
    setSelectedItems(new Set());
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    row: null,
    isBulk: false,
  });

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setDeleteModalState({
      isOpen: true,
      row: null,
      isBulk: true,
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteModalState.isBulk) {
        const idsToDelete = Array.from(selectedItems);
        await Promise.all(
          idsToDelete.map((id) =>
            axios.delete(`${API_URL}/service-calls/${id}`),
          ),
        );
        const remaining = serviceCalls.filter(
          (r) => !selectedItems.has(r.id || r._id),
        );
        setServiceCalls(remaining);
        lsSave(SERVICE_CALLS_KEY, remaining);
        setSelectedItems(new Set());
        toast(`${idsToDelete.length} records deleted successfully`);
      } else if (deleteModalState.row) {
        const targetId = deleteModalState.row.id || deleteModalState.row._id;
        await axios.delete(`${API_URL}/service-calls/${targetId}`);
        const remaining = serviceCalls.filter(
          (r) => (r.id || r._id) !== targetId,
        );
        setServiceCalls(remaining);
        lsSave(SERVICE_CALLS_KEY, remaining);
        toast(`Call ${deleteModalState.row.callNumber || ""} deleted successfully`);
      }
      setDeleteModalState({ isOpen: false, row: null, isBulk: false });
    } catch (err) {
      console.error("Delete operation failed", err);
      toast("Failed to delete record(s) from server", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultFormData = () => ({ ...emptyForm(), mode: modes[0] || "Phone" });

  // Active action menu popover
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [actionMenuCoords, setActionMenuCoords] = useState(null);

  // Close action menu when clicking outside or scrolling
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-container") && !e.target.closest(".action-menu-portal")) {
        setActiveActionMenuId(null);
      }
    };
    const handleScrollOrResize = () => {
      setActiveActionMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  const counts = useMemo(() => {
    const c = {
      All: 0,
      Registered: 0,
      Assigned: 0,
      Pending: 0,
      Supporting: 0,
      "Field Visit": 0,
      Escalating: 0,
      Critical: 0,
      Resolved: 0,
    };
    const s = searchTerm.toLowerCase();
    enrichedCalls.forEach((row) => {
      const matchSearch =
        !s ||
        row.customerName?.toLowerCase().includes(s) ||
        row.callNumber?.toLowerCase().includes(s) ||
        row.assignedEngineerName?.toLowerCase().includes(s);
      const matchPriority =
        filterPriority === "All" || row.priority === filterPriority;

      let matchDate = true;
      const rowDate = new Date(row.createdAt || row.timestamp || row.dateTime);
      if (filterFromDate) {
        const from = new Date(filterFromDate);
        from.setHours(0, 0, 0, 0);
        if (rowDate < from) matchDate = false;
      }
      if (filterToDate) {
        const to = new Date(filterToDate);
        to.setHours(23, 59, 59, 999);
        if (rowDate > to) matchDate = false;
      }

      if (!matchDate || !matchSearch || !matchPriority) return;

      c.All += 1;
      const callStatus = row.status || "Registered";
      if (c[callStatus] !== undefined) {
        c[callStatus]++;
      }
    });
    return c;
  }, [enrichedCalls, filterFromDate, filterToDate, searchTerm, filterPriority]);

  return (
    <div className="w-full h-full font-sans text-[0.85vw] flex flex-col flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <ServiceCallForm
            key="form"
            initialData={editingRow || defaultFormData()}
            customerDb={customerDb}
            setCustomerDb={setCustomerDb}
            serviceCalls={serviceCalls}
            partyTypes={partyTypes}
            sites={sites}
            segments={segments}
            employees={employees}
            modes={modes}
            onSave={handleSave}
            onBack={goToTable}
            onSaveModes={handleSaveModes}
            canWrite={canWrite && !isSupervisor}
            canUpdate={canUpdate && !isSupervisor}
          />
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0"
          >
            {/* ── 1. Top Level Scoping Toolbar: Search, Date Range, Priority & Action ── */}
            <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-[0.7vw] shrink-0">
              {/* Left side: Soft Pill Search Box */}
              <div className="relative w-[18vw]">
                <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
                <input
                  type="text"
                  placeholder="Search customer, call no, engineer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.76vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-[0.7vw] h-[0.7vw]" />
                  </button>
                )}
              </div>

              {/* Right cluster: Date Range, Clear, Priority & Register Call */}
              <div className="flex items-center gap-[0.6vw] flex-shrink-0">
                {/* Unified Date Range Capsule */}
                <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.75vw] shadow-2xs hover:border-slate-300 transition-all">
                  <span className="text-slate-500 font-medium text-[0.74vw]">From</span>
                  <input
                    ref={fromDateRef}
                    type="date"
                    value={filterFromDate || ""}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="no-native-calendar text-[0.75vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (fromDateRef.current) {
                        try { fromDateRef.current.showPicker(); } catch { fromDateRef.current.focus(); }
                      }
                    }}
                    className="p-0 border-0 bg-transparent cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center mr-[0.15vw]"
                    title="Choose from date"
                  >
                    <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0" />
                  </button>
                  <span className="text-slate-400 mx-[0.15vw] text-[0.85vw]">→</span>
                  <span className="text-slate-500 font-medium text-[0.74vw]">To</span>
                  <input
                    ref={toDateRef}
                    type="date"
                    value={filterToDate || ""}
                    min={filterFromDate || undefined}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="no-native-calendar text-[0.75vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (toDateRef.current) {
                        try { toDateRef.current.showPicker(); } catch { toDateRef.current.focus(); }
                      }
                    }}
                    className="p-0 border-0 bg-transparent cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center ml-[0.1vw]"
                    title="Choose to date"
                  >
                    <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0" />
                  </button>
                </div>

                {/* Reset / Clear Button */}
                {(filterFromDate || filterToDate) && (
                  <button
                    onClick={() => {
                      setFilterFromDate("");
                      setFilterToDate("");
                    }}
                    className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.74vw] font-semibold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
                    title="Clear date filter"
                  >
                    <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                    <span>Clear</span>
                  </button>
                )}

                {/* Unselect All Button (Visible whenever any row is selected) */}
                <AnimatePresence>
                  {selectedItems.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={clearAllSelected}
                      className="flex items-center gap-[0.35vw] bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/90 px-[0.8vw] h-[2.2vw] rounded-full font-medium text-[0.74vw] transition-all cursor-pointer shadow-2xs"
                      title="Unselect all selected calls"
                    >
                      <X className="w-[0.8vw] h-[0.8vw] text-slate-500" />
                      <span>Unselect All</span>
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Bulk Delete */}
                <AnimatePresence>
                  {selectedItems.size > 0 && canDelete && !isSupervisor && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.35vw] bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 px-[0.8vw] h-[2.2vw] rounded-full font-semibold text-[0.72vw] transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                      Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Priority Dropdown (Pill shaped) */}
                <div className="w-[9.5vw]">
                  <CustomDropdown
                    size="sm"
                    value={filterPriority}
                    onChange={(val) => setFilterPriority(val)}
                    options={[
                      { value: "All", label: "All Priorities" },
                      ...PRIORITIES.map((p) => ({ value: p, label: p })),
                    ]}
                    triggerClassName="h-[2.2vw] !rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs text-[0.75vw]"
                  />
                </div>

                {/* Primary Action Button: Register Call */}
                {canWrite && !isSupervisor && (
                  <button
                    onClick={goToForm}
                    className="cursor-pointer shrink-0 flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-[1.1vw] h-[2.2vw] rounded-full font-bold text-[0.76vw] transition-all shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_12px_-1px_rgba(37,99,235,0.5)]"
                  >
                    <Plus className="w-[0.9vw] h-[0.9vw]" />
                    Register Call
                  </button>
                )}
              </div>
            </div>

            {/* ── Table Card with Integrated Header Bar & Filter Tabs ── */}
            <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
              {/* Integrated Card Header: Status Tabs on left, Active Results count on right */}
              <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                {/* Sleek Connected Segmented Track for Status Tabs */}
                <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.4vw] max-w-full overflow-x-auto">
                  {[
                    { label: "All", dot: "bg-blue-600" },
                    { label: "Registered", dot: "bg-blue-500" },
                    { label: "Assigned", dot: "bg-indigo-600" },
                    { label: "Pending", dot: "bg-amber-500" },
                    { label: "Supporting", dot: "bg-sky-500" },
                    { label: "Field Visit", dot: "bg-slate-400" },
                    { label: "Escalating", dot: "bg-orange-500" },
                    { label: "Critical", dot: "bg-rose-600" },
                    { label: "Resolved", dot: "bg-emerald-600" },
                  ].map(({ label, dot }) => {
                    const isActive = filterStatus === (label === "All" ? "All" : label);
                    const count = counts[label] ?? 0;

                    return (
                      <button
                        key={label}
                        onClick={() => setFilterStatus(label === "All" ? "All" : label)}
                        className={`flex items-center gap-[0.45vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.75vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs font-semibold"
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
                        <span className={isActive ? "text-white" : "text-slate-700"}>
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

                {/* Scoped Result Count */}
                <div className="text-[0.74vw] text-slate-500 font-medium whitespace-nowrap pl-[0.5vw] flex items-center gap-[0.3vw]">
                  <span>Showing</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded text-[0.72vw]">
                    {filteredData.length}
                  </span>
                  <span>calls</span>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider">
                    <tr>
                      {canDelete && !isSupervisor && (
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[3%] text-center">
                          <button
                            onClick={toggleSelectPage}
                            className="flex items-center justify-center w-full cursor-pointer"
                          >
                            {isPageSelected ? (
                              <CheckSquare className="w-[1vw] h-[1vw] text-[#1a73e8]" />
                            ) : (
                              <Square className="w-[1vw] h-[1vw] text-slate-400 hover:text-slate-500" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center whitespace-nowrap w-[3.5vw]">
                        S.No
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[11vw]">
                        Call No & Date
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[15vw]">
                        Customer
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] text-center border-r border-slate-300 whitespace-nowrap min-w-[7vw]">
                        Customer Type
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[15vw]">
                        Product / System
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] text-center border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                        Priority
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 whitespace-nowrap min-w-[8vw]">
                        Status
                      </th>
                      <th className="py-[0.7vw] px-[0.7vw] text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[6vw]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Gmail / Linear-style Bulk Selection Banner when page is selected and total records > page size */}
                    {isPageSelected && filteredData.length > paginatedData.length && (
                      <tr>
                        <td
                          colSpan={canDelete && !isSupervisor ? 9 : 8}
                          className="bg-blue-50/80 border-b border-blue-200 px-[1.2vw] py-[0.45vw] text-center text-[0.76vw] text-slate-700 font-medium"
                        >
                          {!isAllFilteredSelected ? (
                            <div className="flex items-center justify-center gap-[0.5vw]">
                              <span>
                                All <strong className="text-slate-900">{paginatedData.length}</strong> calls on this page are selected.
                              </span>
                              <button
                                type="button"
                                onClick={selectAllFiltered}
                                className="font-bold text-blue-700 hover:text-blue-900 underline hover:no-underline cursor-pointer transition-colors"
                              >
                                Select all {filteredData.length} calls
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-[0.5vw]">
                              <span className="text-blue-900 font-semibold">
                                ✓ All {filteredData.length} calls are selected across all pages.
                              </span>
                              <button
                                type="button"
                                onClick={clearAllSelected}
                                className="font-bold text-rose-600 hover:text-rose-800 underline hover:no-underline cursor-pointer transition-colors ml-[0.3vw]"
                              >
                                Clear selection
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="py-[10vh] text-center border-b border-slate-200">
                          <div className="flex flex-col items-center justify-center gap-[1vw]">
                            <Loader2 className="w-[3vw] h-[3vw] animate-spin text-blue-600" />
                            <span className="text-[1vw] font-medium text-blue-600">
                              Loading Service Calls...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((row, rowIdx) => {
                        const allProducts =
                          row._products?.length > 0
                            ? row._products
                            : row.products?.length > 0
                              ? row.products
                              : [{}];
                        // Filter products by individual status when a specific status tab is selected
                        let displayProducts = allProducts;
                        let effectiveStatus = row.status;
                        if (filterStatus !== "All") {
                          displayProducts = allProducts.filter((prod) => {
                            const rawStatus = getProductStatus(
                              prod,
                              effectiveStatus,
                            );
                            const mappedLabel =
                              getStatusCfg(rawStatus).label || "Registered";
                            return mappedLabel === filterStatus;
                          });
                          if (
                            displayProducts.length === 0 &&
                            row.status === filterStatus
                          ) {
                            displayProducts = allProducts;
                          }
                        }

                        const rowCount = displayProducts.length;
                        const rowId = row.id || row._id;
                        const isSelected = selectedItems.has(rowId);
                        const cellBg = isSelected ? "bg-blue-50/70" : "bg-white";

                        if (rowCount === 0) return null;

                        return displayProducts.map((prod, pIdx) => {
                          const bgClass = isSelected
                            ? "bg-blue-50/70"
                            : "bg-white hover:bg-slate-50/70";

                          return (
                            <tr
                              key={`${row.id}-${pIdx}`}
                              className={`transition-colors ${bgClass}`}
                            >
                              {/* 0. Select Checkbox */}
                              {pIdx === 0 && (
                                <>
                                  {canDelete && !isSupervisor && (
                                    <td
                                      rowSpan={rowCount}
                                      className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle ${cellBg}`}
                                    >
                                      <button
                                        onClick={() => toggleSelect(rowId)}
                                        className="flex items-center justify-center w-full cursor-pointer"
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="w-[1vw] h-[1vw] text-[#1a73e8]" />
                                        ) : (
                                          <Square className="w-[1vw] h-[1vw] text-slate-300 hover:text-slate-400" />
                                        )}
                                      </button>
                                    </td>
                                  )}
                                </>
                              )}

                              {/* S.No */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap font-normal text-slate-700 text-[0.76vw] ${cellBg}`}
                                >
                                  {(currentPage - 1) * ITEMS_PER_PAGE + rowIdx + 1}
                                </td>
                              )}

                              {/* 1. Call No & Date */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap ${cellBg}`}
                                >
                                  <button
                                    onClick={() => setSummaryModalRow(row)}
                                    className="font-mono text-left text-[0.82vw] font-semibold text-slate-800 hover:text-blue-600 block leading-tight cursor-pointer"
                                  >
                                    {row.callNumber}
                                  </button>
                                  <div className="flex items-center gap-[0.35vw] text-[0.73vw] text-slate-600 font-normal leading-normal mt-[0.2vw]">
                                    {(() => {
                                      try {
                                        const d = new Date(row.timestamp || row.dateTime);
                                        if (isNaN(d)) return <span>{row.dateTime || "—"}</span>;
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
                                          <>
                                            <span>{datePart}</span>
                                            <span className="text-slate-300 font-normal">|</span>
                                            <span className="text-slate-500">{timePart}</span>
                                          </>
                                        );
                                      } catch {
                                        return <span>{row.dateTime || "—"}</span>;
                                      }
                                    })()}
                                  </div>
                                </td>
                              )}

                              {/* 2. Customer */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle max-w-[15vw] ${cellBg}`}
                                >
                                  <CustomerInfoCell
                                    customerName={row.customerName}
                                    contactNumber={row.contactNumber}
                                    partyCode={row.partyCode}
                                  />
                                </td>
                              )}

                              {/* 2b. Customer Type */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap text-[0.78vw] font-normal ${cellBg}`}
                                >
                                  {row.customerType && row.customerType !== "All" ? (
                                    <span
                                      className={`inline-flex items-center justify-center px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-normal border shadow-2xs whitespace-nowrap ${
                                        row.customerType === "OEM"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : row.customerType === "End Customer"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : row.customerType === "Distributor"
                                          ? "bg-purple-50 text-purple-700 border-purple-200"
                                          : row.customerType === "Dealer"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-slate-50 text-slate-700 border-slate-200"
                                      }`}
                                    >
                                      {row.customerType}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                              )}

                              {/* 3. Product / System */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle max-w-[15vw]">
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
                                <div className="flex items-center gap-[0.3vw] mt-[0.1vw] flex-wrap">
                                  {prod?.serialNumber && (
                                    <span className="text-[0.66vw] text-slate-400 font-mono">
                                      SN: {prod.serialNumber}
                                    </span>
                                  )}
                                  {prod?.errorCode && (
                                    <span className="text-[0.66vw] text-rose-600 font-mono">
                                      Err: {prod.errorCode}
                                    </span>
                                  )}
                                  {allProducts.length > 1 && (
                                    <span className="text-[0.64vw] font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-[0.35vw] py-[0.05vw] rounded-full">
                                      +{allProducts.length - 1} more
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 4. Priority */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap ${cellBg}`}
                                >
                                  {(() => {
                                    const p = row.priority || "Medium";
                                    let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                    if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                                    else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                                    else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                    return (
                                      <span className={`inline-flex items-center justify-center px-[0.55vw] py-[0.1vw] rounded-full text-[0.7vw] font-normal border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                        {p}
                                      </span>
                                    );
                                  })()}
                                </td>
                              )}

                              {/* 5. Status & Assignee */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap">
                                {(() => {
                                  const status = getProductStatus(prod, effectiveStatus);
                                  const cfg = getStatusCfg(status);
                                  const engineerName =
                                    prod?._assignedEngineerName ||
                                    prod?._engineerName ||
                                    prod?.assignedToName ||
                                    row.assignedToName ||
                                    row.currentEngineerName ||
                                    row.assignedEngineer ||
                                    (row.assignedTo ? employees?.find(e => e.userId === row.assignedTo || e._id === row.assignedTo)?.name : null);
                                  return (
                                    <div>
                                      <div className="inline-flex items-center gap-[0.35vw] text-[0.78vw] font-normal text-slate-800">
                                        <span className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        <span>{cfg.label}</span>
                                      </div>
                                      <div className="mt-[0.1vw] text-[0.66vw] text-slate-400 font-normal">
                                        {engineerName ? (
                                          <span>to: <span className="text-slate-600">{engineerName}</span></span>
                                        ) : (
                                          <span className="italic">Unassigned</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 6. Actions (Direct Info + 3-Dot Menu) */}
                              {pIdx === 0 && (
                                <td
                                  rowSpan={rowCount}
                                  className={`py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] ${isSelected ? "bg-[#f1f6fd]" : "bg-white"}`}
                                >
                                  <div className="flex items-center justify-center gap-[0.3vw] action-menu-container">
                                    {/* Direct 1-click Info modal */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInfoCall(row);
                                      }}
                                      className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                      title="View Call Details"
                                    >
                                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                                    </button>

                                    {/* 3-Dot Menu */}
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
                                      className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                      title="More Actions"
                                    >
                                      <MoreVertical className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  </div>

                                  {/* Action Dropdown Menu via Portal to avoid table overflow clipping */}
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

                                          {canUpdate && !isSupervisor && (
                                            <button
                                              onClick={() => {
                                                setActiveActionMenuId(null);
                                                goToEdit(row);
                                              }}
                                              className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                            >
                                              <Edit3 className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                              <span>Edit Call</span>
                                            </button>
                                          )}

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

                                          {canDelete && !isSupervisor && (
                                            <button
                                              onClick={() => {
                                                setActiveActionMenuId(null);
                                                setDeleteModalState({
                                                  isOpen: true,
                                                  row: row,
                                                  isBulk: false,
                                                });
                                              }}
                                              className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border-t border-slate-100"
                                            >
                                              <Trash2 className="w-[0.9vw] h-[0.9vw] shrink-0 text-rose-500" />
                                              <span>Delete Call</span>
                                            </button>
                                          )}
                                        </motion.div>
                                      </div>,
                                      document.body
                                    )}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-[6vw] text-center border-b border-slate-200"
                        >
                          <div className="flex flex-col items-center justify-center gap-[0.8vw]">
                            <div className="w-[3.6vw] h-[3.6vw] rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <PhoneCall className="w-[1.8vw] h-[1.8vw]" />
                            </div>
                            <span className="text-[0.9vw] font-bold text-slate-700">No service calls found</span>
                            <span className="text-[0.76vw] text-slate-400 max-w-[22vw]">
                              {searchTerm || filterFromDate || filterToDate || filterStatus !== "All" || filterPriority !== "All"
                                ? "No records match your active filters. Try adjusting your dates, search query or status tab."
                                : "Click 'Register Call' to create your first service ticket."}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-300 px-[1vw] py-[0.6vw] bg-white flex justify-between items-center rounded-b-[0.7vw]">
                <div className="text-[0.75vw] text-slate-600 font-medium">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {paginatedData.length > 0
                      ? (currentPage - 1) * ITEMS_PER_PAGE + 1
                      : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredData.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {filteredData.length}
                  </span>{" "}
                  entries
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-[0.35vw] border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                  >
                    <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                  <div className="flex gap-[0.3vw]">
                    {[...Array(totalPages)].map((_, i) => {
                      const pNum = i + 1;
                      if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                        if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-slate-400 text-[0.75vw]">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={pNum}
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-medium transition-all cursor-pointer ${
                            currentPage === pNum
                              ? "bg-[#1a73e8] text-white shadow-2xs"
                              : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-[0.35vw] border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                  >
                    <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {historyModalProduct && (
        <ProductHistoryModal
          history={[
            ...((historyModalProduct.editHistory || []).map((eh) => ({
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
            ...((historyModalProduct._products || historyModalProduct.products || [])
              .flatMap((p) => [
                ...(p._escalationHistory || []).map((e) => ({
                  ...e,
                  timestamp: e.assignedAt,
                  status:
                    e.status === "Pending"
                      ? "Escalation Assigned"
                      : e.status || "Escalated",
                  updatedByName: e.updatedByName || "System",
                  metadata: {
                    assignedTo:
                      e.engineerName || e.assignedToName || e.assignedTo,
                    assignedToName: e.engineerName || e.assignedToName,
                    dept: e.department || e.dept,
                    remarks: e.remarks || e.reason || "",
                    level: e.level,
                    deadline: e.targetTime || e.deadline,
                  },
                })),
                ...(p._history || []),
              ])),
          ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))}
          employees={employees}
          currentUser={currentUser}
          onClose={() => setHistoryModalProduct(null)}
        />
      )}

      {/* Call Summary Modal */}
      {/* Full Call Details Modal (Overview, Products, Audit Timeline) */}
      {selectedInfoCall && (
        <CallDetailsModal
          call={selectedInfoCall}
          employees={employees}
          onClose={() => setSelectedInfoCall(null)}
        />
      )}

      {summaryModalRow && (
        <CallSummaryModal
          row={summaryModalRow}
          employees={employees}
          onClose={() => setSummaryModalRow(null)}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        isLoading={isDeleting}
        title={deleteModalState.isBulk ? "Delete Selected Calls" : "Delete Service Call"}
        itemCount={deleteModalState.isBulk ? selectedItems.size : undefined}
        callNumber={deleteModalState.row?.callNumber}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalState({ isOpen: false, row: null, isBulk: false });
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export { ServiceCallForm, emptyForm, emptyProduct, CallSummaryModal, getStatusCfg, getProductStatus, deriveCallStatus, getTypeColor, PRIORITIES, WARRANTY_STATUS, CUSTOMER_DB_KEY, API_URL, BASE_URL, ConfigManagerModal };

