import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, X, Trash2, Save, ChevronLeft, ChevronRight,
  CheckSquare, Square, Edit3, ArrowLeft, Plus, Clock,
  User, Package, AlertCircle, CheckCircle, History,
  Smartphone, PlusCircle, MinusCircle, UserPlus,
  Phone, FileText, Settings, MapPin, Mail,
  ChevronDown, ChevronUp, ArrowRight, Activity,
  Shield, Wrench, HelpCircle, Loader2, AlertTriangle, Copy, Check, ClipboardList,
  Eye, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import ProductHistoryModal from "../components/ProductHistoryModal";

// ── Constants ──────────────────────────────────────────────────────────────────
const CUSTOMER_DB_KEY  = "customer_db_grouped_v5";
const SERVICE_CALLS_KEY = "service_calls_v2";
const PARTY_TYPES_KEY  = "party_types_v3";
const PRODUCT_SEGMENTS_KEY = "product_segments_v1";
const EMPLOYEES_KEY    = "employees";
const ESCALATION_KEY   = "escalation_queue_v1";
const MODES_KEY        = "call_modes_v1";
const SUPPORT_REQ_KEY  = "support_requests_v1";
const FIELD_VISIT_KEY  = "field_visits_v1";
const INHOUSE_KEY      = "serviceCenter_repairs_v1";

const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];
const PRIORITIES    = ["Low", "Medium", "High", "Critical"];
const WARRANTY_STATUS = ["In Warranty", "Out of Warranty"];
const ESCALATION_TIMEOUT_MS = 1 * 60 * 1000;
const ITEMS_PER_PAGE = 10;

const PRIORITY_COLORS = {
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-yellow-100 text-yellow-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};
const STATUS_COLORS = {
  Registered: "bg-purple-100 text-purple-700",
  Assigned:   "bg-blue-100 text-blue-700",
  Pending:    "bg-yellow-100 text-yellow-700",
  Open:       "bg-green-100 text-green-700",
  Resolved:   "bg-green-100 text-green-600",
};

// ── Product-level status derivation (mirrors EscalationPage) ──────────────────
const getProductStatus = (p, callStatus) => {
  const cStat = callStatus ? callStatus.toLowerCase() : "";
  if (cStat === "critical" || cStat === "critical_unresolved") return "critical";
  
  if (p?._resolved)                             return "resolved";
  if (p?._productClosure?.status === "Resolved" || p?._productClosure?.status === "Closed")  return "closed";
  if (p?._productClosure?.status === "Pending") return "pending";
  if (p?._supportRequested)                     return "support";
  if (p?._productClosure?.status === "Field Visit Required") return "field_visit";
  if (p?._escalationLevel > 0 || cStat === "escalating" || cStat === "escalated") return "escalated";
  if (p?._attended)                             return "attended";
  if (p?._assigned)                             return "assigned";
  return cStat || "registered";
};
const PROD_STATUS_CFG = {
  resolved:            { label: "Resolved",    dot: "bg-green-500",  cls: "bg-green-50 border-green-300 text-green-700"    },
  closed:              { label: "Resolved",    dot: "bg-green-500",  cls: "bg-green-50 border-green-300 text-green-700"    },
  pending:             { label: "Pending",     dot: "bg-yellow-500", cls: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  support:             { label: "Supporting",  dot: "bg-orange-500", cls: "bg-orange-50 border-orange-300 text-orange-700" },
  field_visit:         { label: "Field Visit", dot: "bg-teal-500",   cls: "bg-teal-50 border-teal-300 text-teal-700"       },
  registered:          { label: "Registered",  dot: "bg-purple-400", cls: "bg-purple-50 border-purple-300 text-purple-700"  },
  assigned:            { label: "Assigned",    dot: "bg-blue-400",   cls: "bg-blue-50 border-blue-300 text-blue-700"       },
  attended:            { label: "Assigned",    dot: "bg-blue-400",   cls: "bg-blue-50 border-blue-300 text-blue-700"       },
  escalated:           { label: "Escalating",  dot: "bg-orange-500", cls: "bg-orange-50 border-orange-300 text-orange-700" },
  critical:            { label: "Critical",    dot: "bg-red-500",    cls: "bg-red-50 border-red-300 text-red-700"          },
  critical_unresolved: { label: "Critical",    dot: "bg-red-500",    cls: "bg-red-50 border-red-300 text-red-700"          }
};

const getStatusCfg = (statusKey) => {
  if (!statusKey) return PROD_STATUS_CFG.registered;
  const key = statusKey.toLowerCase();
  return PROD_STATUS_CFG[key] || { 
    label: key.charAt(0).toUpperCase() + key.slice(1), 
    dot: "bg-gray-400", 
    cls: "bg-gray-50 border-gray-300 text-gray-700" 
  };
};

const deriveCallStatus = (products = [], currentStatus = "Registered") => {
  if (currentStatus === "Registered") return "Registered";
  
  if (products.length === 0) {
    if (currentStatus === "Critical" || currentStatus === "Critical_Unresolved") return "Critical";
    if (currentStatus === "Escalated") return "Escalating";
    return currentStatus;
  }
  
  const stats = products.map(p => getProductStatus(p, currentStatus));
  if (stats.every(s => s === "closed" || s === "resolved")) return "Resolved";
  
  if (currentStatus === "Critical" || currentStatus === "Critical_Unresolved") return "Critical";
  if (currentStatus === "Escalated") return "Escalating";

  if (stats.some(s => s === "support"))    return "Supporting";
  if (stats.some(s => s === "field_visit"))    return "Field Visit";
  if (stats.some(s => s === "pending"))                     return "Pending";
  if (stats.some(s => s === "escalated"))                   return "Escalating";
  
  if (stats.some(s => s === "assigned" || s === "attended")) return "Assigned";
  
  return currentStatus;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad  = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave  = (key, v)  => localStorage.setItem(key, JSON.stringify(v));

const getTypeColor = (type, types = []) => {
  if (types.length > 0) {
    const idx = types.findIndex(t => (t.name || t) === type);
    if (idx !== -1) {
      return ["bg-purple-100 text-purple-700 border-purple-200", "bg-orange-100 text-orange-700 border-orange-200", "bg-blue-100 text-blue-700 border-blue-200", "bg-green-100 text-green-700 border-green-200"][idx % 4];
    }
  }
  switch (type) {
    case "OEM":           return "bg-blue-100 text-blue-700 border-blue-200";
    case "End Customer":  return "bg-green-100 text-green-700 border-green-200";
    case "Distributor":   return "bg-purple-100 text-purple-700 border-purple-200";
    case "Dealer":        return "bg-orange-100 text-orange-700 border-orange-200";
    default:              return "bg-gray-100 text-gray-700 border-slate-400";
  }
};

const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_API_BASE_URL1 || API_URL.replace(/\/api$/, "");

const generateCallNumber = () => {
  const d    = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SC-${date}-${rand}`;
};

const emptyProduct = () => ({
  itemCode: "", productSegment: "", productModel: "",
  serialNumber: "", dateOfSupply: "", warrantyPeriodDays: "",
  warrantyExpiryDate: "",
  warrantyStatus: "In Warranty", callDescription: "", errorCode: "",
  mediaReceived: "No",
});

const emptyForm = () => ({
  id: null, callNumber: generateCallNumber(),
  dateTime: new Date().toLocaleString(),
  timestamp: new Date().toISOString(),
  mode: "", priority: "Medium",
  customerType: "All", partyCode: "", customerName: "",
  contactPerson: "", contactNumber: "", emailId: "", location: "", locationType: "IPR",
  products: [emptyProduct()],
  assignedEngineer: "", assignedEngineerName: "", assignedDepartment: "",
  assignmentDate: new Date().toISOString().slice(0, 16),
  expectedResponse: "", ackSent: "No", sentBy: "Auto",
  status: "Registered", escalationLevel: 0, escalationHistory: [],
  resolvedAt: null, assignedAt: null,
});

// ── Avatar helpers ────────────────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",   "from-purple-400 to-purple-600",
  "from-green-400 to-green-600", "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",   "from-teal-400 to-teal-600",
  "from-yellow-400 to-yellow-600","from-red-400 to-red-600",
];
const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const Avatar = ({ name, size = "md", ring = false, title }) => {
  const sz  = { sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]", md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]", lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]" };
  return (
    <div title={title || name}
      className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${sz[size]} ${ring ? "ring-[0.12vw] ring-white" : ""}`}>
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
    if (!seen.has(key)) seen.set(key, { id: key, name, dept, role, events: [] });
    seen.get(key).events.push({ role, time });
  };

  // Call-level escalation history
  (entry.escalationHistory || []).forEach(h => {
    add(h.engineerId, h.engineerName, h.department, `L${h.level + 1} — ${h.department}`, h.assignedAt);
  });

  // Per-product escalation histories
  (entry.products || []).forEach((p, pi) => {
    (p._escalationHistory || []).forEach(h => {
      add(h.engineerId, h.engineerName, h.department,
        `P${pi + 1} L${h.level + 1} — ${h.department}`, h.assignedAt);
    });
    // Support person
    if (p._supportPersonId) {
      add(p._supportPersonId, p._supportPersonName, p._currentDepartment,
        `P${pi + 1} Support`, new Date().toISOString());
    }
  });

  return Array.from(seen.values());
};

// ── Build full chronological flow for modal ────────────────────────────────────
const buildFullFlow = (entry, supportReqs, fieldVisits, serviceCenterRepairs) => {
  if (!entry) return [];
  const events = [];

  // Call-level assignments
  (entry.escalationHistory || []).forEach(h => {
    events.push({
      time:   h.assignedAt,
      type:   "assign",
      level:  h.level,
      person: h.engineerName,
      dept:   h.department,
      label:  `Assigned — L${h.level + 1}`,
      reason: h.reason,
      scope:  "call",
    });
  });

  // Per-product events
  (entry.products || []).forEach((p, pi) => {
    const pLabel = `P${pi + 1}: ${p.productModel || p.itemCode || "Product"}`;

    (p._escalationHistory || []).forEach(h => {
      events.push({
        time:   h.assignedAt,
        type:   "escalate",
        level:  h.level,
        person: h.engineerName,
        dept:   h.department,
        label:  `${pLabel} → ${h.department}`,
        reason: h.reason,
        scope:  "product",
        product: pLabel,
      });
    });

    if (p._attended) {
      events.push({
        time:   p._attendedAt || new Date().toISOString(),
        type:   "attended",
        person: p._assignedEngineerName || entry.currentEngineerName,
        dept:   p._currentDepartment || entry.currentDepartment,
        label:  `${pLabel} Attended`,
        reason: "Engineer is working on the call",
        scope:  "product",
        product: pLabel,
      });
    }

    if (p._resolved) {
      events.push({
        time:   p._resolvedAt || new Date().toISOString(),
        type:   "resolve",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Resolved`,
        reason: p._resolutionRemarks || p._resolutionType,
        scope:  "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.status === "Closed") {
      events.push({
        time:   p._productClosure.updatedAt || p._productClosure.closedAt || new Date().toISOString(),
        type:   "close",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Closed`,
        reason: p._productClosure.remarks,
        scope:  "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.status === "Pending") {
      events.push({
        time:   p._productClosure.updatedAt || p._productClosure.pendingAt || new Date().toISOString(),
        type:   "pending",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Marked Pending`,
        reason: p._productClosure.remarks,
        scope:  "product",
        product: pLabel,
      });
    }

    if (p._productClosure?.status === "Field Visit Required") {
      events.push({
        time:   p._productClosure.updatedAt || new Date().toISOString(),
        type:   "fieldvisit",
        person: p._productClosure.assignedTo || entry.currentEngineerName,
        dept:   "Field",
        label:  `${pLabel} Field Visit Required`,
        reason: `Scheduled for: ${p._productClosure.visitDate || "Unknown date"}`,
        scope:  "product",
        product: pLabel,
      });
    }
    
    if (p._supportRequested) {
      events.push({
        time:   p._productClosure?.updatedAt || entry.updatedAt || new Date().toISOString(),
        type:   "support",
        person: p._supportPersonName || "Support Engineer",
        dept:   p._currentDepartment || "Support",
        label:  `${pLabel} Support Requested`,
        reason: "Assigned for support",
        scope:  "product",
        product: pLabel,
      });
    }
  });

  // Support requests
  (supportReqs || []).filter(s => s.callId === entry.callId).forEach(s => {
    const pLabel = s.product ? (s.product.productModel || s.product.itemCode || `P${s.productIdx + 1}`) : "";
    events.push({
      time:   s.createdAt,
      type:   "support",
      person: `${s.requestedByName} → ${s.supportPerson?.name}`,
      dept:   s.supportPerson?.department,
      label:  `Support Request${pLabel ? " · " + pLabel : ""}`,
      reason: s.notes,
      scope:  "support",
    });
    if (s.resolvedAt) {
      events.push({
        time:   s.resolvedAt,
        type:   "resolve",
        person: s.supportPerson?.name,
        dept:   s.supportPerson?.department,
        label:  `Support Resolved${pLabel ? " · " + pLabel : ""}`,
        reason: s.resolutionNotes,
        scope:  "support",
      });
    }
  });

  // Field visits
  (fieldVisits || []).filter(f => f.callId === entry.callId).forEach(f => {
    events.push({
      time:   f.assignmentDate || f.createdAt,
      type:   "fieldvisit",
      person: f.assignedToName,
      dept:   "Field",
      label:  `Field Visit Assigned${f.productIdx != null ? " · P" + (f.productIdx + 1) : ""}`,
      reason: f.diagnosisSummary,
      scope:  "visit",
    });
    if (f.visitStatus === "Closed" && f.closedAt) {
      events.push({
        time:   f.closedAt,
        type:   "close",
        person: f.assignedToName,
        dept:   "Field",
        label:  `Field Visit Completed`,
        reason: f.resolutionRemarks,
        scope:  "visit",
      });
    }
  });

  // Service Center repairs
  (serviceCenterRepairs || []).filter(r => r.callId === entry.callId).forEach(r => {
    events.push({
      time:   r.assignmentDate || r.createdAt,
      type:   "serviceCenter",
      person: r.assignedToName,
      dept:   "Service Center",
      label:  `Service Center Repair Assigned${r.productIdx != null ? " · P" + (r.productIdx + 1) : ""}`,
      reason: r.diagnosisSummary,
      scope:  "repair",
    });
    if (r.visitStatus === "Closed" && r.closedAt) {
      events.push({
        time:   r.closedAt,
        type:   "close",
        person: r.assignedToName,
        dept:   "Service Center",
        label:  `Service Center Repair Completed`,
        reason: r.resolutionRemarks,
        scope:  "repair",
      });
    }
  });

  return events.sort((a, b) => new Date(a.time) - new Date(b.time));
};

// ── Call Summary Modal ─────────────────────────────────────────────────────────
const CallSummaryModal = ({ row, employees, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [summaryType, setSummaryType] = useState('full');

  if (!row) return null;

  const generateSummary = () => {
    const pad = (str, len = 20) => (str + ":").padEnd(len, ' ');
    const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" });
    };

    let text = `--- Service Call Summary ---\n`;
    text += `${pad("Call Number")} ${row.callNumber || "N/A"}\n`;
    text += `${pad("Registered Date")} ${formatDate(row.dateTime)}\n`;
    text += `${pad("Customer Name")} ${row.customerName || "N/A"}\n`;
    text += `${pad("Customer Phone")} ${row.contactNumber || "N/A"}\n`;
    text += `${pad("Customer Email")} ${row.emailId || "N/A"}\n`;
    text += `${pad("Customer Address")} ${row.location || "N/A"}\n`;
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
        if (p._productClosure.visitDate) text += `${pad("Visit Date")} ${formatDate(p._productClosure.visitDate)}\n`;
      }

      text += `\n`;
    });
    
    const fullHistory = (row._products || row.products || []).flatMap(p => [
      ...(p._history || p.history || [])
    ]).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (fullHistory.length > 0) {
      if (summaryType === 'full') {
        text += `--- Call Level Activity / Reports ---\n`;
        fullHistory.forEach((h, hIdx) => {
          const dtStr = formatDate(h.timestamp);
          text += `[${hIdx + 1}] ${dtStr}\n`;
          let personLine = h.updatedByName || h.updatedBy || "System";
          if (h.metadata?.assignedToName) personLine = h.metadata.assignedToName;
          else if (h.metadata?.supportPerson?.name) personLine = h.metadata.supportPerson.name;
          else {
            const emp = employees?.find(e => e.userId === h.updatedBy);
            if (emp) personLine = `${emp.name} (${emp.department})`;
          }
          
          if (h.metadata?.dept) personLine += ` (${h.metadata.dept})`;

          text += `    Person   : ${personLine}\n`;
          text += `    Status   : ${h.status || "Update"}\n`;
          
          if (h.metadata?.level > 0) text += `    Level    : ${h.metadata.level}\n`;
          
          let remarks = h.metadata?.remarks || h.metadata?.reason || h.remarks || h.reason || "None";
          text += `    Remarks  : ${remarks}\n\n`;
        });
      } else {
        text += `--- Latest Call Level Activity ---\n`;
        const h = fullHistory[fullHistory.length - 1];
        const dtStr = formatDate(h.timestamp);
        text += `[*] ${dtStr}\n`;
        let personLine = h.updatedByName || h.updatedBy || "System";
        if (h.metadata?.assignedToName) personLine = h.metadata.assignedToName;
        else if (h.metadata?.supportPerson?.name) personLine = h.metadata.supportPerson.name;
        else {
          const emp = employees?.find(e => e.userId === h.updatedBy);
          if (emp) personLine = `${emp.name} (${emp.department})`;
        }
        
        if (h.metadata?.dept) personLine += ` (${h.metadata.dept})`;

        text += `    Person   : ${personLine}\n`;
        text += `    Status   : ${h.status || "Update"}\n`;
        
        if (h.metadata?.level > 0) text += `    Level    : ${h.metadata.level}\n`;
        
        let remarks = h.metadata?.remarks || h.metadata?.reason || h.remarks || h.reason || "None";
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
              <h2 className="text-gray-900 text-[1.1vw] font-bold leading-tight">Call Summary</h2>
              <p className="text-gray-500 text-[0.7vw] font-medium mt-[0.1vw]">{row.callNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="flex bg-gray-100 rounded-[0.4vw] p-[0.2vw] border border-gray-200 shadow-inner">
              <button onClick={() => setSummaryType('latest')} className={`px-[1vw] py-[0.35vw] text-[0.7vw] font-bold rounded-[0.3vw] transition-all cursor-pointer ${summaryType === 'latest' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Latest Summary</button>
              <button onClick={() => setSummaryType('full')} className={`px-[1vw] py-[0.35vw] text-[0.7vw] font-bold rounded-[0.3vw] transition-all cursor-pointer ${summaryType === 'full' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Full Summary</button>
            </div>
            <button onClick={handleCopy} className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white hover:bg-gray-50 transition-colors rounded-[0.4vw] text-gray-700 text-[0.75vw] font-semibold border border-gray-300 shadow-sm">
              {copied ? <Check className="w-[0.9vw] h-[0.9vw] text-green-600" /> : <Copy className="w-[0.9vw] h-[0.9vw] text-gray-500" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer p-[0.4vw] rounded-full">
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
      setTimeLeft(isCritical ? "CRITICAL" : (target?.status === "EXPIRED" ? "Escalation Chain Ended" : ""));
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
          <span className="text-[0.65vw] text-red-100 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">System Priority</span>
          <span className="text-[1.1vw] font-black text-white leading-none uppercase tracking-tight">Moved to Critical Zone</span>
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
        <span className="text-[0.6vw] text-amber-600 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">Next Escalation In</span>
        <span className="text-[1vw] font-mono font-black text-amber-700 leading-none">{timeLeft}</span>
      </div>
      {target.dept && (
        <div className="ml-auto flex flex-col items-end border-l border-amber-200 pl-[1vw]">
          <span className="text-[0.6vw] text-amber-500 font-extrabold uppercase tracking-widest leading-none mb-[0.2vw]">To Department</span>
          <span className="text-[0.85vw] font-bold text-slate-700 leading-none">{target.dept}</span>
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
  const [editValue, setEditValue]   = useState("");
  const [newValue, setNewValue]     = useState("");
  const inputRef = useRef(null);
  const editRef  = useRef(null);
  useEffect(() => { if (editingIdx !== null && editRef.current) { editRef.current.focus(); editRef.current.select(); } }, [editingIdx]);
  const handleAdd = () => {
    const t = newValue.trim(); if (!t) return;
    if (localItems.some(i => i.toLowerCase() === t.toLowerCase())) { 
      toast(`"${t}" already exists!`, "error"); 
      return; 
    }
    setLocalItems([...localItems, t]); setNewValue("");
    if (inputRef.current) inputRef.current.focus();
  };
  const handleSaveEdit = (idx) => {
    const t = editValue.trim(); if (!t) return;
    if (localItems.some((i, n) => n !== idx && i.toLowerCase() === t.toLowerCase())) { 
      toast(`"${t}" already exists!`, "error"); 
      return; 
    }
    const u = [...localItems]; u[idx] = t; setLocalItems(u); setEditingIdx(null);
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
      confirmText: "Delete"
    });
    if (confirmed) {
      setLocalItems(localItems.filter((_, i) => i !== idx));
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[32vw] rounded-[0.6vw] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-[1.2vw] py-[0.8vw] border-b border-slate-400 flex justify-between items-center bg-gray-50">
          <h2 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.5vw]"><Icon className="w-[1.1vw] h-[1.1vw]" />{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>
        <div className="px-[1.2vw] pt-[1vw] pb-[0.6vw]">
          <div className="flex gap-[0.5vw]">
            <input ref={inputRef} type="text" value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 border border-gray-400 rounded-[0.4vw] px-[0.7vw] py-[0.55vw] text-[0.85vw] outline-none focus:border-gray-400" />
            <button type="button" onClick={handleAdd} disabled={!newValue.trim()}
              className="px-[0.9vw] py-[0.55vw] bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white rounded-[0.4vw] flex items-center gap-[0.3vw] text-[0.8vw] font-medium cursor-pointer">
              <Plus className="w-[0.9vw] h-[0.9vw]" />Add
            </button>
          </div>
        </div>
        <div className="px-[1.2vw] pb-[0.8vw] flex-1 overflow-y-auto space-y-[0.4vw]">
          {localItems.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-[0.5vw] rounded-[0.4vw] border p-[0.5vw] ${editingIdx === idx ? "border-gray-400 bg-gray-50" : "border-slate-400 bg-white"}`}>
              {editingIdx === idx ? (
                <>
                  <input ref={editRef} type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(idx); if (e.key === "Escape") setEditingIdx(null); }}
                    className="flex-1 border border-gray-400 rounded-[0.3vw] px-[0.6vw] py-[0.4vw] text-[0.85vw] outline-none" />
                  <button type="button" onClick={() => handleSaveEdit(idx)} className="text-gray-700 hover:text-gray-900 cursor-pointer p-[0.3vw]"><CheckCircle className="w-[1vw] h-[1vw]" /></button>
                  <button type="button" onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-[0.3vw]"><X className="w-[1vw] h-[1vw]" /></button>
                </>
              ) : (
                <>
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 flex items-center justify-center text-[0.65vw] text-gray-500 font-bold">{idx + 1}</div>
                  <span className="flex-1 text-[0.85vw] text-gray-800 font-medium">{item}</span>
                  <button type="button" onClick={() => { setEditingIdx(idx); setEditValue(item); }} className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.3vw]"><Edit3 className="w-[0.85vw] h-[0.85vw]" /></button>
                  <button type="button" onClick={() => handleDelete(idx)} disabled={localItems.length <= 1} className="text-gray-400 hover:text-red-600 disabled:text-gray-200 cursor-pointer p-[0.3vw]"><Trash2 className="w-[0.85vw] h-[0.85vw]" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="px-[1.2vw] py-[0.8vw] border-t border-slate-400 flex justify-end gap-[0.7vw] bg-gray-50">
          <button type="button" onClick={onClose} className="px-[1.2vw] py-[0.5vw] border border-gray-400 bg-white text-gray-700 rounded-[0.4vw] cursor-pointer text-[0.85vw] font-medium">Cancel</button>
          <button type="button" onClick={() => { onSave(localItems); onClose(); }} className="px-[1.2vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] cursor-pointer flex items-center gap-[0.4vw] text-[0.85vw] font-medium">
            <Save className="w-[0.9vw] h-[0.9vw]" />Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Entry Form ─────────────────────────────────────────────────────────────────
const ServiceCallForm = ({ initialData, customerDb, serviceCalls, partyTypes, segments, employees, modes, onSave, onBack, onSaveModes }) => {
  const [formData, setFormData]           = useState(initialData || {});
  const [previewImage, setPreviewImage]   = useState(null);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState({});
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState(null);
  
  // Explicitly sync formData when initialData is provided (crucial for edit mode transitions)
  useEffect(() => {
    if (initialData?.partyCode) {
      setFormData(initialData);
    }
  }, [initialData]);
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showProdSearch, setShowProdSearch] = useState({});
  const [showEngineerDrop, setShowEngineerDrop] = useState(false);
  const [engineerSearch, setEngineerSearch]     = useState("");
  const [showModesManager, setShowModesManager] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: partyTypes[0]?.name || "",
    state: "",
    districtCity: "",
    items: [
      {
        productSegment: "",
        itemCode: "",
        itemDescription: "",
        warrantyPeriodDays: "",
      },
    ],
  });

  const uniqueStates = useMemo(() => {
    const states = new Set();
    customerDb.forEach((item) => {
      if (item.state) states.add(item.state);
    });
    return Array.from(states).sort();
  }, [customerDb]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    customerDb.forEach((item) => {
      if (item.districtCity) districts.add(item.districtCity);
    });
    return Array.from(districts).sort();
  }, [customerDb]);

  const uniqueSegments = useMemo(() => {
    const s = new Set();
    // From master data
    if (segments) {
      segments.forEach((x) => s.add(x.name));
    }
    // From existing data
    customerDb.forEach((item) => {
      if (item.productSegment) s.add(item.productSegment);
    });
    return Array.from(s).sort();
  }, [customerDb, segments]);

  const handleAddCustItemRow = () =>
    setNewCustomer({
      ...newCustomer,
      items: [
        ...newCustomer.items,
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });

  const handleRemoveCustItemRow = (idx) => {
    if (newCustomer.items.length === 1) return;
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.filter((_, i) => i !== idx),
    });
  };

  const handleCustItemChange = (idx, field, val) =>
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });

  const custRef     = useRef(null);
  const engineerRef = useRef(null);
  const prodRefs    = useRef({});
  const isEdit      = !!formData?._editing;

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target)) setShowCustSearch(false);
      if (engineerRef.current && !engineerRef.current.contains(e.target)) setShowEngineerDrop(false);
      Object.keys(prodRefs.current).forEach(k => {
        if (prodRefs.current[k] && !prodRefs.current[k].contains(e.target))
          setShowProdSearch(p => ({ ...p, [k]: false }));
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const supportEngineers  = useMemo(() => employees.filter(e => e.department === "Support Engineer"), [employees]);
  const filteredEngineers = useMemo(() => supportEngineers.filter(e =>
    e.name.toLowerCase().includes(engineerSearch.toLowerCase()) || e.userId.toLowerCase().includes(engineerSearch.toLowerCase())
  ), [supportEngineers, engineerSearch]);

  const filteredCustomers = useMemo(() => {
    const map = new Map();
    customerDb.forEach(item => {
      if (formData.customerType === "All" || item.partyType === formData.customerType)
        if (!map.has(item.partyCode)) map.set(item.partyCode, { code: item.partyCode, name: item.partyDescription, type: item.partyType });
    });
    return Array.from(map.values());
  }, [customerDb, formData.customerType]);

  const allCustomerProducts = useMemo(() => {
    if (!formData.partyCode) return [];
    return customerDb.filter(i => i.partyCode === formData.partyCode);
  }, [customerDb, formData.partyCode]);

  const customerHistory = useMemo(() => {
    if (!formData.partyCode) return [];
    return serviceCalls
      .filter(c => c.partyCode === formData.partyCode && c.id !== formData.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [formData.partyCode, formData.id, serviceCalls]);

  const getProductHistory = (serialNumber) => {
    if (!serialNumber) return [];
    return serviceCalls
      .filter(c => 
        c.id !== formData.id && 
        c.products?.some(p => p.serialNumber?.toLowerCase() === serialNumber.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const selectCustomer = (code, name, type) => {
    const rows = customerDb.filter(i => i.partyCode === code);
    const loc  = rows[0] ? [rows[0].districtCity, rows[0].state].filter(Boolean).join(", ") : "";
    setFormData(p => ({ ...p, partyCode: code, customerName: name, customerType: type, location: p.locationType === "Site" ? "" : (loc || p.location), products: [emptyProduct()] }));
    setShowCustSearch(false);
  };
  const selectEngineer = (eng) => {
    setFormData(p => ({ ...p, assignedEngineer: eng.userId, assignedEngineerName: eng.name, assignedDepartment: eng.department }));
    setEngineerSearch(""); setShowEngineerDrop(false);
  };
  const selectProduct = (idx, prod) => {
    setFormData(p => {
      const updatedProds = p.products.map((pr, i) => {
        if (i !== idx) return pr;
        const updated = {
          ...pr,
          itemCode: prod.itemCode,
          productSegment: prod.productSegment || "",
          productModel: prod.itemDescription,
          warrantyPeriodDays: prod.warrantyPeriodDays || ""
        };

        // Auto-calculate expiry if supply date is already present
        if (updated.dateOfSupply && updated.warrantyPeriodDays) {
          const d = new Date(updated.dateOfSupply);
          d.setDate(d.getDate() + parseInt(updated.warrantyPeriodDays || 0));
          updated.warrantyExpiryDate = d.toISOString().split("T")[0];

          const now = new Date();
          updated.warrantyStatus = d >= now ? "In Warranty" : "Out of Warranty";
        }
        return updated;
      });
      return { ...p, products: updatedProds };
    });
    setShowProdSearch(p => ({ ...p, [idx]: false }));
  };
  const addProduct    = () => setFormData(p => ({ ...p, products: [...p.products, emptyProduct()] }));
  const removeProduct = (idx) => { if (formData.products.length === 1) return; setFormData(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) })); };
  const changeProduct = (idx, field, val) => {
    setFormData(p => {
      const updatedProds = p.products.map((pr, i) => {
        if (i !== idx) return pr;
        const updated = { ...pr, [field]: val };
        
        if (field === "productModel") {
          updated.itemCode = "";
        }

        // Auto-calculate expiry if supply date or warranty days changed
        if (field === "dateOfSupply" || field === "warrantyPeriodDays") {
          if (updated.dateOfSupply && updated.warrantyPeriodDays) {
            const d = new Date(updated.dateOfSupply);
            d.setDate(d.getDate() + parseInt(updated.warrantyPeriodDays || 0));
            updated.warrantyExpiryDate = d.toISOString().split("T")[0];

            // Auto-update status
            const now = new Date();
            updated.warrantyStatus = d >= now ? "In Warranty" : "Out of Warranty";
          }
        }
        return updated;
      });
      return { ...p, products: updatedProds };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.partyCode) { alert("Please select a customer."); return; }
    
    // In edit mode, preserve original values if they exist, otherwise use defaults
    const saved = isEdit ? { ...formData } : {
      ...formData,
      status: "Registered",
      assignedEngineer: "",
      assignedEngineerName: "",
      assignedDepartment: "",
      assignmentDate: "",
      expectedResponse: "",
      escalationLevel: 0,
      escalationHistory: [],
    };
    onSave(saved, isEdit);
  };

  const handleAddCustomerSubmit = (e) => {
    const cleanStr = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const dups = newCustomer.items.filter((ni) =>
      customerDb.some((d) => cleanStr(d.itemCode) === cleanStr(ni.itemCode)),
    );
    if (dups.length > 0) {
      alert(`Item Code "${dups[0].itemCode}" already exists!`);
      return;
    }

    const invalidWarranty = newCustomer.items.find((item) => {
      const val = Number(item.warrantyPeriodDays);
      return item.warrantyPeriodDays === "" || isNaN(val) || val < 0;
    });

    if (invalidWarranty) {
      alert(
        `Please enter a valid non-negative numeric Warranty Period for item "${invalidWarranty.itemCode || "unnamed"}".`,
      );
      return;
    }

    const newRows = newCustomer.items.map((item) => ({
      partyCode: newCustomer.partyCode,
      partyDescription: newCustomer.partyDescription,
      partyType: newCustomer.partyType,
      state: newCustomer.state,
      districtCity: newCustomer.districtCity,
      productSegment: item.productSegment,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      warrantyPeriodDays: item.warrantyPeriodDays,
    }));
    const updated = [...newRows, ...customerDb].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updated));
    setCustomerDb(updated);
    setFormData((p) => ({
      ...p,
      partyCode: newCustomer.partyCode,
      customerName: newCustomer.partyDescription,
      location: [newCustomer.districtCity, newCustomer.state]
        .filter(Boolean)
        .join(", "),
    }));
    alert("Customer added!");
    setShowAddCustModal(false);
  };


  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-slate-400 mb-[1vw]">
        <div className="flex items-center gap-[1vw]">
          <button type="button" onClick={onBack} className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-400 bg-gray-50 hover:bg-gray-100 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
            <ArrowLeft className="w-[1vw] h-[1vw]" /><span className="font-medium">Back</span>
          </button>
          <h2 className="text-[1vw] font-bold text-gray-800">{isEdit ? "Edit Service Call" : "New Service Call Entry"}</h2>
          {isEdit && <span className="text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.15vw] rounded font-semibold">Adding products will sync to escalation queue</span>}
        </div>
        <div className="bg-blue-50 border border-blue-200 px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.78vw]">
          <span className="text-gray-500">Call No: </span>
          <span className="font-mono font-bold text-blue-600">{formData.callNumber}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">
        {/* SECTION 1: Call Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-slate-400 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-slate-400 flex items-center gap-[0.5vw]">
            <Clock className="w-[1vw] h-[1vw] text-blue-500" />Call Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Call Number</label>
              <input readOnly value={formData.callNumber} className="bg-gray-100 border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed font-mono" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Date & Time</label>
              <input readOnly value={formData.dateTime} className="bg-gray-100 border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600 flex items-center justify-between">
                Mode of Call
                <button type="button" onClick={() => setShowModesManager(true)} className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.2vw] rounded hover:bg-gray-100"><Settings className="w-[0.85vw] h-[0.85vw]" /></button>
              </label>
              <select value={formData.mode} onChange={e => set("mode", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                {modes.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Priority</label>
              <select value={formData.priority} onChange={e => set("priority", e.target.value)}
                className={`border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none font-medium ${formData.priority === "Critical" ? "text-red-600" : formData.priority === "High" ? "text-orange-500" : "text-gray-700"}`}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Customer Information */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-slate-400 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-slate-400 flex items-center gap-[0.5vw]">
            <User className="w-[1vw] h-[1vw] text-blue-500" />Customer Information
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Customer Type</label>
              <select value={formData.customerType} onChange={e => setFormData(p => ({ ...p, customerType: e.target.value, partyCode: "", customerName: "", products: [emptyProduct()] }))}
                className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                <option value="All">All Types</option>
                {partyTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[0.3vw] col-span-2 relative" ref={custRef}>
              <label className="font-semibold text-gray-600 flex justify-between">
                Customer Name
                <span className="text-[0.7vw] text-gray-400 font-normal">({filteredCustomers.length} available)</span>
              </label>
              <div className="flex gap-[0.5vw]">
                <div className="relative flex-1">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                  <input type="text" value={formData.customerName}
                    onChange={e => { set("customerName", e.target.value); setShowCustSearch(true); }}
                    onFocus={() => setShowCustSearch(true)}
                    placeholder="Search & select customer…"
                    className="w-full border border-gray-400 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
                </div>
                <button type="button" onClick={() => { setNewCustomer({ partyCode: "", partyDescription: formData.customerName || "", partyType: partyTypes[0]?.name || "", items: [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "" }] }); setShowAddCustModal(true); }}
                  className="flex items-center gap-[0.3vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.8vw] rounded-[0.4vw] cursor-pointer">
                  <UserPlus className="w-[1vw] h-[1vw]" /><span className="text-[0.75vw]">New</span>
                </button>
              </div>
              {showCustSearch && (
                <div className="absolute top-full left-0 w-full bg-white border border-slate-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                  {filteredCustomers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).map((c, i) => (
                    <div key={i} onClick={() => selectCustomer(c.code, c.name, c.type)}
                      className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                      <div><div className="font-medium text-gray-700">{c.name}</div><div className="text-[0.7vw] text-gray-400">{c.code}</div></div>
                      <span className={`text-[0.7vw] px-[0.5vw] py-[0.2vw] rounded ${getTypeColor(c.type)}`}>{c.type}</span>
                    </div>
                  ))}
                  {filteredCustomers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).length === 0 && (
                    <div className="p-[1vw] text-gray-400 text-center">No customers found</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Person</label>
              <input value={formData.contactPerson} onChange={e => set("contactPerson", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Number</label>
              <input value={formData.contactNumber} onChange={e => set("contactNumber", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Email ID</label>
              <input type="email" value={formData.emailId} onChange={e => set("emailId", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Location Type</label>
              <select value={formData.locationType || "IPR"} onChange={e => {
                const val = e.target.value;
                setFormData(p => {
                  let nextLoc = p.location;
                  if (val === "Site") nextLoc = "";
                  else if (val === "IPR" && p.partyCode) {
                    const rows = customerDb.filter(i => i.partyCode === p.partyCode);
                    nextLoc = rows[0] ? [rows[0].districtCity, rows[0].state].filter(Boolean).join(", ") : p.location;
                  }
                  return { ...p, locationType: val, location: nextLoc };
                });
              }} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                <option value="IPR">IPR</option>
                <option value="Site">Site</option>
              </select>
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">{formData.locationType === "Site" ? "Site Address" : "Location"}</label>
              <input value={formData.location} onChange={e => set("location", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            {formData.partyCode && (
              <div className="col-span-4 flex flex-col gap-[0.3vw]">
                <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                  <History className="w-[1vw] h-[1vw] text-blue-500" />Customer History
                  {customerHistory.length > 0 && <span className="text-[0.7vw] bg-blue-50 text-blue-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold border border-blue-100">{customerHistory.length} Call{customerHistory.length > 1 ? "s" : ""}</span>}
                </label>
                <div className="border border-slate-400 bg-gray-50/50 rounded-[0.4vw] p-[0.8vw] max-h-[15vw] overflow-y-auto space-y-[0.5vw]">
                  {customerHistory.length > 0 ? customerHistory.map((call, i) => (
                    <div key={i} className="bg-white border border-slate-400 rounded-[0.4vw] p-[0.6vw] shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex flex-col mb-[0.4vw]">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-[0.6vw]">
                            <span className="font-mono text-[0.8vw] font-bold text-black">{call.callNumber}</span>
                            <span className="text-[0.65vw] text-gray-400 font-medium">{new Date(call.timestamp).toLocaleDateString("en-GB")}</span>
                          </div>
                          <span className={`px-[0.4vw] py-[0.1vw] rounded text-[0.65vw] font-bold border ${call.status === "Resolved" ? "bg-green-100 text-green-600 border-green-200" : "bg-green-50 text-green-700 border-green-200"}`}>{call.status}</span>
                        </div>
                        {(call.contactPerson || call.contactNumber) && (
                          <div className="flex items-center gap-[0.4vw] mt-[0.2vw] text-[0.7vw] text-slate-600">
                            <User className="w-[0.8vw] h-[0.8vw]" />
                            <span className="font-medium">{call.contactPerson || 'N/A'}</span>
                            {call.contactNumber && <span>({call.contactNumber})</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-[0.4vw]">
                        {(call.products || []).map((p, pIdx) => {
                          const historyList = p._history || [];
                          const latestRemark = historyList.length > 0 ? historyList[historyList.length - 1].remarks : (call.remarks || null);
                          return (
                            <div key={pIdx} className="flex flex-col gap-[0.3vw] bg-gray-50 p-[0.4vw] rounded border border-slate-400">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-wrap items-center gap-[0.4vw]">
                                  <span className="text-[0.7vw] text-gray-600 font-bold">{p.productModel || p.itemCode || "Unknown Product"}</span>
                                  {p.serialNumber && (
                                    <span className="text-[0.65vw] text-slate-500 font-mono">SN: {p.serialNumber}</span>
                                  )}
                                  {p.errorCode && (
                                    <span className="text-[0.6vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.3vw] py-[0.05vw] rounded-[0.2vw] font-mono font-bold uppercase">
                                      {p.errorCode}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryProduct(historyList)}
                                  className="text-[0.65vw] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                >
                                  View History
                                </button>
                              </div>
                              {latestRemark && (
                                <div className="text-[0.7vw] text-slate-600 italic bg-white p-[0.3vw] rounded border border-slate-200">
                                  "{latestRemark}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-[2vw] text-gray-400">
                      <History className="w-[1.5vw] h-[1.5vw] mb-[0.4vw] opacity-20" />
                      <p className="text-[0.75vw]">No previous call records found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Product Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-slate-400 p-[1.2vw]">
          <div className="flex justify-between items-center mb-[1vw]">
            <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-[0.5vw]">
              <Package className="w-[1vw] h-[1vw] text-blue-500" />Product Details
              {isEdit && <span className="text-[0.68vw] bg-amber-50 text-amber-700 border border-amber-200 px-[0.5vw] py-[0.08vw] rounded font-semibold normal-case">New products will be added to escalation queue</span>}
            </h3>
            <button type="button" onClick={addProduct} disabled={!formData.partyCode}
              className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer disabled:opacity-50">
              <PlusCircle className="w-[1vw] h-[1vw]" />Add Product
            </button>
          </div>
          <div className="space-y-[1vw]">
            {formData.products.map((product, idx) => (
              <div key={idx} className="border border-slate-400 rounded-[0.5vw] p-[1vw] bg-gray-50 relative">
                {formData.products.length > 1 && (
                  <button type="button" onClick={() => removeProduct(idx)} className="absolute top-[0.5vw] right-[0.5vw] text-red-500 hover:text-red-700 cursor-pointer"><Trash2 className="w-[1vw] h-[1vw]" /></button>
                )}
                <div className="text-[0.8vw] font-bold text-gray-600 mb-[0.7vw] flex items-center gap-[0.4vw]">
                  <Smartphone className="w-[1vw] h-[1vw]" />Product #{idx + 1}
                </div>
                <div className="grid grid-cols-4 gap-[1.2vw]">
                  <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={el => prodRefs.current[idx] = el}>
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Product Model</label>
                    <div className="relative">
                      <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                      <input type="text" value={product.productModel}
                        onChange={e => changeProduct(idx, "productModel", e.target.value)}
                        onFocus={() => { if (formData.partyCode) setShowProdSearch(p => ({ ...p, [idx]: true })); }}
                        disabled={!formData.partyCode}
                        placeholder={!formData.partyCode ? "Select customer first" : "Search product…"}
                        className="w-full border border-gray-400 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" />
                      {showProdSearch[idx] && formData.partyCode && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-20">
                          {(() => {
                            const selectedOther = new Set(formData.products.filter((p, i) => i !== idx).map(p => p.itemCode).filter(Boolean));
                            const options = allCustomerProducts.filter(p => !selectedOther.has(p.itemCode));
                            const isSelectedExact = product.itemCode && options.find(p => p.itemCode === product.itemCode)?.itemDescription === product.productModel;
                            
                            return options.filter(p => isSelectedExact || !product.productModel || p.itemDescription.toLowerCase().includes(product.productModel.toLowerCase()) || p.itemCode.toLowerCase().includes(product.productModel.toLowerCase()))
                              .map((prod, i) => (
                                <div key={i} onClick={() => selectProduct(idx, prod)} className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                                  <div className="font-medium text-gray-700 text-[0.8vw]">{prod.itemDescription}</div>
                                  <div className="text-[0.7vw] text-gray-500 font-mono">{prod.itemCode}{prod.productSegment && ` • ${prod.productSegment}`}</div>
                                </div>
                              ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Product Segment</label>
                    <select value={product.productSegment || ""} onChange={e => changeProduct(idx, "productSegment", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none text-[0.82vw] focus:border-blue-400">
                      <option value="">-- Select Segment --</option>
                      {uniqueSegments.map((seg, i) => <option key={i}>{seg}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Serial Number</label>
                    <input value={product.serialNumber} onChange={e => changeProduct(idx, "serialNumber", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none text-[0.82vw]" placeholder="SN-123" />
                  </div>

                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Warranty Days</label>
                    <input type="number" min="0" value={product.warrantyPeriodDays || ""} onChange={e => changeProduct(idx, "warrantyPeriodDays", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none text-[0.82vw]" placeholder="Days" />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Warranty Status</label>
                    <select value={product.warrantyStatus} onChange={e => changeProduct(idx, "warrantyStatus", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none text-[0.82vw]">
                      {WARRANTY_STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Error Code</label>
                    <input value={product.errorCode || ""} onChange={e => changeProduct(idx, "errorCode", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none text-[0.82vw]" placeholder="e.g. E-404" />
                  </div>

                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Photo/Video Received?</label>
                    <select value={product.mediaReceived || "No"} onChange={e => changeProduct(idx, "mediaReceived", e.target.value)} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] bg-white outline-none text-[0.82vw]">
                      <option>Yes</option><option>No</option>
                    </select>
                  </div>

                  <div className="col-span-2 flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Call Description / Fault</label>
                    <textarea rows="4" value={product.callDescription || ""} onChange={e => changeProduct(idx, "callDescription", e.target.value)}
                      className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] outline-none resize-none text-[0.82vw] h-full" placeholder="Describe the issue…" />
                  </div>

                  <div className="col-span-2">
                    {product.mediaReceived === "Yes" ? (
                      <div className="flex flex-col h-full">
                        <label className="font-semibold text-gray-600 text-[0.8vw] mb-[0.3vw]">Media Attachments</label>
                        <div className="flex-1 border-2 border-dashed border-slate-400 rounded-[0.6vw] p-[0.8vw] bg-blue-50/30 min-h-[7vw] flex flex-wrap gap-[0.6vw]">
                          
                          {/* Image Previews */}
                          {product.mediaFiles?.map((file, fIdx) => {
                            const isImage = file.type?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
                            let path = file.url;
                            if (path && !path.startsWith('http') && !path.startsWith('/api')) {
                              path = '/api' + path;
                            }
                            const fullUrl = path ? (path.startsWith("http") ? path : `${BASE_URL}${path}`) : null;
                            const displayUrl = fullUrl || (isImage ? "https://placehold.co/400?text=Preview+Not+Available" : "");

                            return (
                            <div key={fIdx} className="relative group w-[5.5vw] h-[5.5vw] border border-slate-300 rounded-[0.4vw] overflow-hidden bg-white shadow-sm flex items-center justify-center">
                              {isImage ? (
                                <img src={displayUrl} alt={file.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-gray-400 flex flex-col items-center gap-[0.2vw]">
                                  <FileText className="w-[1.5vw] h-[1.5vw]" />
                                  <span className="text-[0.55vw] truncate w-[4vw] text-center font-medium">{file.name}</span>
                                </div>
                              )}
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-[0.6vw]">
                                 <a href={displayUrl || "#"} onClick={async (e) => { 
                                   e.preventDefault(); 
                                   e.stopPropagation(); 
                                   if (!file.url) { 
                                     alert("File was not fully uploaded to the server yet."); 
                                     return;
                                   }
                                   try {
                                     const res = await fetch(displayUrl);
                                     const blob = await res.blob();
                                     const url = window.URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url;
                                     a.download = file.name;
                                     document.body.appendChild(a);
                                     a.click();
                                     document.body.removeChild(a);
                                     window.URL.revokeObjectURL(url);
                                   } catch(err) {
                                     console.error(err);
                                     window.open(displayUrl, "_blank");
                                   }
                                 }} className="text-white hover:text-blue-300 cursor-pointer p-[0.2vw] bg-white/20 rounded-full" title="Download">
                                   <Download className="w-[1vw] h-[1vw]" />
                                 </a>
                                 {isImage && (
                                   <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewImage(displayUrl); }} className="text-white hover:text-blue-300 cursor-pointer p-[0.2vw] bg-white/20 rounded-full" title="View">
                                     <Eye className="w-[1vw] h-[1vw]" />
                                   </button>
                                 )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (file.url) {
                                    const filename = file.url.split('/').pop();
                                    if (filename) setFilesToDelete(prev => [...prev, filename]);
                                  }
                                  setFormData(p => ({
                                    ...p,
                                    products: p.products.map((pr, i) => i === idx ? { ...pr, mediaFiles: pr.mediaFiles.filter((_, fi) => fi !== fIdx) } : pr)
                                  }));
                                }}
                                className="absolute top-[0.2vw] right-[0.2vw] bg-white rounded-full text-red-500 opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer p-[0.15vw]"
                              >
                                <X className="w-[0.7vw] h-[0.7vw]" />
                              </button>
                            </div>
                          )})}

                          {/* Upload Dialog (Half Size) */}
                          <div
                            onClick={() => !uploadingMedia[idx] && document.getElementById(`file-input-${idx}`).click()}
                            className={`w-[5.5vw] h-[5.5vw] border-2 border-dashed border-blue-300 rounded-[0.4vw] bg-blue-50/60 flex flex-col items-center justify-center ${uploadingMedia[idx] ? "opacity-75 cursor-wait" : "cursor-pointer hover:bg-blue-100 hover:border-blue-400"} transition-colors`}
                          >
                            {uploadingMedia[idx] ? (
                              <Loader2 className="w-[1.2vw] h-[1.2vw] text-blue-500 mb-[0.2vw] animate-spin" />
                            ) : (
                              <Plus className="w-[1.2vw] h-[1.2vw] text-blue-500 mb-[0.2vw]" />
                            )}
                            <span className="text-[0.6vw] font-bold text-blue-600 text-center leading-tight">
                              {uploadingMedia[idx] ? "Uploading..." : <>Add<br/>Media</>}
                            </span>
                            <input
                              id={`file-input-${idx}`}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files);
                                if (!files.length) return;
                                
                                setUploadingMedia(p => ({ ...p, [idx]: true }));
                                const uploadData = new FormData();
                                files.forEach(f => uploadData.append("mediaFiles", f));
                                
                                try {
                                  const res = await axios.post(`${API_URL}/service-calls/upload-media`, uploadData, {
                                    headers: { "Content-Type": "multipart/form-data" }
                                  });
                                  const newMedia = res.data.files;
                                  setFormData(p => ({
                                    ...p,
                                    products: p.products.map((pr, i) => i === idx ? { ...pr, mediaFiles: [...(pr.mediaFiles || []), ...newMedia] } : pr)
                                  }));
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to upload files.");
                                } finally {
                                  setUploadingMedia(p => ({ ...p, [idx]: false }));
                                }
                                e.target.value = ""; // reset input
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-100/50 rounded-[0.6vw] border border-slate-400">
                        <p className="text-[0.7vw] text-gray-400 italic">No media required</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
          <button type="button" onClick={onBack} className="px-[1.5vw] py-[0.7vw] border border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold">
            <X className="w-[1vw] h-[1vw]" />Cancel
          </button>
          <button type="submit" className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md">
            <Save className="w-[1vw] h-[1vw]" />{isEdit ? "Update Record" : "Save Service Call"}
          </button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-[2vw]" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-[2vw] right-[2vw] text-white hover:text-red-400 cursor-pointer p-[1vw]"><X className="w-[2vw] h-[2vw]" /></button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-[0.5vw]" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showModesManager && <ConfigManagerModal title="Manage Call Modes" icon={Phone} items={modes} onClose={() => setShowModesManager(false)} onSave={onSaveModes} />}

      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-[58vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-[1vw] py-[0.7vw] border-b border-slate-400 flex justify-between items-center bg-gray-50">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                Add Customer & Items
              </h2>
              <button
                onClick={() => setShowAddCustModal(false)}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-[1.2vw] h-[1.2vw]" />
              </button>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto"
            >
              <div className="bg-gray-50 p-[1vw] rounded-[0.5vw] border border-slate-400">
                <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.8vw]">
                  Party Details
                </h3>
                <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.8vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Code *
                    </label>
                    <input
                      required
                      value={newCustomer.partyCode}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyCode: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. CUS-001"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Type
                    </label>
                    <select
                      value={newCustomer.partyType}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyType: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none"
                    >
                      {partyTypes.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-[0.4vw] mb-[0.8vw]">
                  <label className="text-gray-600 font-medium">
                    Party Description *
                  </label>
                  <input
                    required
                    value={newCustomer.partyDescription}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        partyDescription: e.target.value,
                      })
                    }
                    className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                    placeholder="Company Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-[1.5vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">State</label>
                    <input
                      value={newCustomer.state}
                      list="ctx-states-datalist"
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, state: e.target.value })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      District / City
                    </label>
                    <input
                      value={newCustomer.districtCity}
                      list="ctx-districts-datalist"
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          districtCity: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. Coimbatore"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-400 rounded-[0.5vw] p-[1vw]">
                <div className="flex justify-between items-center mb-[0.5vw]">
                  <h3 className="text-[0.9vw] font-bold text-gray-700">
                    Product Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCustItemRow}
                    className="text-blue-600 hover:text-blue-800 text-[0.8vw] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-[1vw] h-[1vw]" /> Add Item
                  </button>
                </div>
                <div className="space-y-[0.8vw]">
                  {newCustomer.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-[0.5vw] items-center border-b border-slate-400 pb-[0.5vw] last:border-0"
                    >
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Product Segment
                          </label>
                        )}
                        <input
                          required
                          value={item.productSegment}
                          list="ctx-segments-datalist"
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "productSegment",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Segment"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Item Code
                          </label>
                        )}
                        <input
                          required
                          value={item.itemCode}
                          onChange={(e) =>
                            handleCustItemChange(idx, "itemCode", e.target.value)
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Code"
                        />
                      </div>
                      <div className="flex-[2] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Description
                          </label>
                        )}
                        <input
                          required
                          value={item.itemDescription}
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "itemDescription",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex-[0.7] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Warranty (days)
                          </label>
                        )}
                        <input
                          required
                          type="number"
                          min="0"
                          value={item.warrantyPeriodDays}
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "warrantyPeriodDays",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Days"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveCustItemRow(idx)}
                          disabled={newCustomer.items.length === 1}
                          className={`text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer ${idx === 0 ? "mt-[1.3vw]" : ""}`}
                        >
                          <MinusCircle className="w-[1.2vw] h-[1.2vw]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-[1vw] pt-[0.5vw]">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-[2vw] py-[0.6vw] border rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[2vw] py-[0.6vw] bg-black text-white rounded-[0.4vw] hover:bg-gray-800 flex items-center gap-[0.5vw] cursor-pointer"
                >
                  Save All
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Datalists for Rich Modal Autocomplete */}
      <datalist id="ctx-states-datalist">
        {uniqueStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="ctx-districts-datalist">
        {uniqueDistricts.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="ctx-segments-datalist">
        {uniqueSegments.map((seg) => (
          <option key={seg} value={seg} />
        ))}
      </datalist>

      {/* Product History Modal */}
      {selectedHistoryProduct && (
        <ProductHistoryModal
          history={selectedHistoryProduct}
          employees={employees}
          currentUser={null}
          onClose={() => setSelectedHistoryProduct(null)}
        />
      )}
    </motion.div>
  );
};

// ── AvatarStack ────────────────────────────────────────────────────────────────
const AvatarStack = ({ people, onClick }) => {
  const shown  = people.slice(0, 4);
  const extra  = people.length - shown.length;
  return (
    <button onClick={onClick} title="View full flow" className="flex items-center cursor-pointer group">
      <div className="flex items-center">
        {shown.map((p, i) => (
          <div key={i} style={{ zIndex: shown.length - i, marginLeft: i === 0 ? 0 : "-0.45vw" }}>
            <Avatar name={p.name} size="sm" ring />
          </div>
        ))}
        {extra > 0 && (
          <div style={{ zIndex: 0, marginLeft: "-0.45vw" }}
            className="w-[1.4vw] h-[1.4vw] rounded-full bg-gray-200 border-[0.12vw] border-white flex items-center justify-center text-[0.52vw] font-bold text-gray-600 flex-shrink-0">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-[0.62vw] text-gray-400 ml-[0.3vw] group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">View flow</span>
    </button>
  );
};

// ── Product Status chip only ──────────────────────────────────────────────────
const ProductStatusCell = ({ prod, callStatus }) => {
  const status = getProductStatus(prod, callStatus);
  const cfg    = getStatusCfg(status);
  return (
    <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded text-[0.7vw] font-semibold border ${cfg.cls}`}>
      <span className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ServiceCall() {
  const { toast } = useNotification();
  const currentUser = lsLoad("currentUser", { name: "System" });
  const [view, setView]           = useState("table");
  const [editingRow, setEditingRow] = useState(null);

  const [serviceCalls, setServiceCalls] = useState([]);
  const [customerDb, setCustomerDb]     = useState([]);
  const [partyTypes, setPartyTypes]     = useState([]);
  const [segments, setSegments]         = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [modes, setModes]               = useState([]);
  const [escalationQueue, setEscalationQueue] = useState([]);
  const [allFlows, setAllFlows]             = useState({});
  const [isLoading, setIsLoading]       = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [searchTerm, setSearchTerm]       = useState("");
  const [filterStatus, setFilterStatus]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage]     = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [summaryModalRow, setSummaryModalRow] = useState(null);
  const [historyModalProduct, setHistoryModalProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [callsRes, custRes, ptRes, empRes, modesRes, qRes, flowsRes, segRes] = await Promise.all([
          axios.get(`${API_URL}/service-calls`),
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/party-types`),
          axios.get(`${API_URL}/auth/employees`),
          axios.get(`${API_URL}/master/settings/${MODES_KEY}`),
          axios.get(`${API_URL}/service-calls/pending`),
          axios.get(`${API_URL}/master/escalation-flows`),
          axios.get(`${API_URL}/master/product-segments`)
        ]);
        
        setServiceCalls(callsRes.data);
        setCustomerDb(custRes.data);
        setPartyTypes(ptRes.data.length ? ptRes.data.map(t => ({...t, id: t._id || t.id})) : [{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }]);
        setSegments(segRes.data);
        setEmployees(empRes.data);
        setModes(modesRes.data || DEFAULT_MODES);
        
        const flows = {};
        flowsRes.data.forEach(f => {
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
  }, []);

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

  const save = (rows) => { setServiceCalls(rows); lsSave(SERVICE_CALLS_KEY, rows); };
  const handleSaveModes = async (updated) => { 
    setModes(updated); 
    lsSave(MODES_KEY, updated);
    try {
      await axios.post(`${API_URL}/master/settings`, { key: MODES_KEY, value: updated });
    } catch (err) {
      console.error("Failed to save modes to server:", err);
      toast("Could not save modes to server", "error");
    }
  };

  const goToForm  = ()    => { setEditingRow(null); setView("form"); };
  const goToEdit  = (row) => { 
    setEditingRow({ 
      ...row, 
      products: row._products?.length > 0 ? row._products : row.products || [],
      _editing: true 
    }); 
    setView("form"); 
  };
  const goToTable = ()    => { setEditingRow(null); setView("table"); };

  async function handleSave(formRow, isEdit) {
    const now = new Date();
    const callId = isEdit ? (formRow.id || formRow._id) : Date.now();
    
    // Convert localized string to ISO string for backend to prevent CastError
    let validDateTime = formRow.dateTime;
    if (validDateTime && typeof validDateTime === 'string' && !validDateTime.includes('T')) {
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
    const { id: _ignore, _id, _products, _people, _queueEntry, ...serverPayload } = finalCall;

    // 3. Update the database and local store
    if (isEdit) {
      try {
        // Sync with Escalation Queue (Local)
        const existingQueue = lsLoad(ESCALATION_KEY, []);
        const entryIdx = existingQueue.findIndex(e =>
          e.callId === formRow.id || e.callNumber === formRow.callNumber
        );
        if (entryIdx >= 0) {
          const existing = existingQueue[entryIdx];
          const existingProds = existing.products || [];
          const isAlreadyInQueue = (sp, spIdx) => {
            if (sp.serialNumber && existingProds.some(ep => ep.serialNumber === sp.serialNumber)) return true;
            const m = sp.productModel || sp.itemCode || "";
            if (m && existingProds.some(ep => (ep.productModel || ep.itemCode || "") === m)) return true;
            if (spIdx < existingProds.length) return true;
            return false;
          };

          const newProds = (formRow.products || []).filter((sp, i) => !isAlreadyInQueue(sp, i));
          const appendedProds = newProds.map(sp => ({
            ...sp,
            _escalationLevel: 0,
            _escalationHistory: [],
            _supportRequested: false,
            _resolved: false,
          }));

          existingQueue[entryIdx] = {
            ...existing,
            products: [...existingProds, ...appendedProds],
            contactPerson: formRow.contactPerson || existing.contactPerson || "",
            contactNumber: formRow.contactNumber || existing.contactNumber || "",
            emailId: formRow.emailId || existing.emailId || "",
            locationType: formRow.locationType || existing.locationType || "IPR",
            location: formRow.location || existing.location || "",
            priority: formRow.priority || existing.priority,
          };
          lsSave(ESCALATION_KEY, existingQueue);
          setEscalationQueue(existingQueue);
        }

        // Sync with Server
        const res = await axios.patch(`${API_URL}/service-calls/${finalCall.id}`, serverPayload);
        const updated = serviceCalls.map(r => (r.id === finalCall.id || r._id === finalCall.id) ? { ...res.data, id: res.data._id } : r);
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
    return serviceCalls.map(row => {
      let products = row.products || [];
      const attendedProd = products.find(p => p._attended);
      if (attendedProd) {
        products = products.map(p => ({
          ...p,
          _assigned: attendedProd._assigned,
          _assignedEngineerId: attendedProd._assignedEngineerId,
          _assignedEngineerName: attendedProd._assignedEngineerName,
          _attended: attendedProd._attended,
          _attendedAt: attendedProd._attendedAt || p._attendedAt
        }));
      }

      const people = getPeopleFlow(row);
      const derived = deriveCallStatus(products, row.status);
      return { ...row, _products: products, _people: people, status: derived };
    });
  }, [serviceCalls]);

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return enrichedCalls.filter(row => {
      const matchSearch   = !s || row.customerName?.toLowerCase().includes(s) || row.callNumber?.toLowerCase().includes(s) || row.assignedEngineerName?.toLowerCase().includes(s);
      const matchPriority = filterPriority === "All" || row.priority === filterPriority;
      
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
    });
  }, [enrichedCalls, searchTerm, filterPriority, filterStatus, filterFromDate, filterToDate]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterPriority, filterFromDate, filterToDate]);

  const totalPages    = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedItems.has(r.id || r._id));

  const toggleSelect     = (id) => { const s = new Set(selectedItems); s.has(id) ? s.delete(id) : s.add(id); setSelectedItems(s); };
  const toggleSelectPage = ()   => { const s = new Set(selectedItems); if (isPageSelected) paginatedData.forEach(r => s.delete(r.id || r._id)); else paginatedData.forEach(r => s.add(r.id || r._id)); setSelectedItems(s); };
  const handleBulkDelete = async ()   => { 
    if (confirm(`Delete ${selectedItems.size} selected records?`)) { 
      const idsToDelete = Array.from(selectedItems);
      try {
        // Sequentially or parallelly delete from server
        await Promise.all(idsToDelete.map(id => axios.delete(`${API_URL}/service-calls/${id}`)));
        
        const remaining = serviceCalls.filter(r => !selectedItems.has(r.id || r._id));
        setServiceCalls(remaining); 
        lsSave(SERVICE_CALLS_KEY, remaining);
        setSelectedItems(new Set()); 
        toast(`${idsToDelete.length} records deleted successfully`);
      } catch (err) {
        console.error("Bulk delete failed", err);
        toast("Failed to delete some records from server", "error");
      }
    } 
  };

  const defaultFormData = () => ({ ...emptyForm(), mode: modes[0] || "Phone" });

  const counts = useMemo(() => {
    const c = { All: 0, Registered: 0, Assigned: 0, Pending: 0, Supporting: 0, "Field Visit": 0, Escalating: 0, Critical: 0, Resolved: 0 };
    const s = searchTerm.toLowerCase();
    enrichedCalls.forEach(row => {
      const matchSearch   = !s || row.customerName?.toLowerCase().includes(s) || row.callNumber?.toLowerCase().includes(s) || row.assignedEngineerName?.toLowerCase().includes(s);
      const matchPriority = filterPriority === "All" || row.priority === filterPriority;
      
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
      const callStatus = deriveCallStatus(row._products, row.status);
      const mappedLabel = getStatusCfg(callStatus)?.label || "Registered";
      if (c[mappedLabel] !== undefined) {
        c[mappedLabel]++;
      }
    });
    return c;
  }, [enrichedCalls, filterFromDate, filterToDate, searchTerm, filterPriority]);

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <ServiceCallForm key="form" initialData={editingRow || defaultFormData()}
            customerDb={customerDb} serviceCalls={serviceCalls} partyTypes={partyTypes} segments={segments}
            employees={employees} modes={modes} onSave={handleSave} onBack={goToTable} onSaveModes={handleSaveModes} />
        ) : (
          <motion.div key="table" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-slate-400 mb-[0.9vw]">
              <div className="flex items-center gap-[0.8vw]">
                <div className="relative w-[24vw]">
                  <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
                  <input type="text" placeholder="Search by customer, call no, engineer…"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-400 rounded-[0.8vw] focus:outline-none focus:border-gray-800" />
                </div>
                <div className="flex items-center gap-[0.4vw] border border-gray-400 rounded-[0.8vw] h-[2.5vw] px-[0.8vw] bg-slate-50 shadow-sm">
                  <span className="text-[0.75vw] font-bold text-gray-500">FROM:</span>
                  <input 
                    type="date" 
                    value={filterFromDate || ""}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="text-[0.8vw] text-gray-800 bg-transparent outline-none font-medium"
                  />
                </div>
                <div className="flex items-center gap-[0.4vw] border border-gray-400 rounded-[0.8vw] h-[2.5vw] px-[0.8vw] bg-slate-50 shadow-sm">
                  <span className="text-[0.75vw] font-bold text-gray-500">TO:</span>
                  <input 
                    type="date" 
                    value={filterToDate || ""}
                    min={filterFromDate || undefined}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="text-[0.8vw] text-gray-800 bg-transparent outline-none font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-[0.8vw] items-center">
                <AnimatePresence>
                  {selectedItems.size > 0 && !isSupervisor && (
                    <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold">
                      <Trash2 className="w-[1vw] h-[1vw]" />Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-transparent font-medium text-gray-700 border border-gray-400 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]">
                  <option value="All">All Priorities</option>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                {!isSupervisor && (
                  <button onClick={goToForm} className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-400 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw]">
                    <Plus className="w-[1.2vw] h-[1.2vw]" />Add
                  </button>
                )}
              </div>
            </div>

            {/* Status Summary Bar */}
            <div className="flex gap-[1vw] mb-[0.9vw] flex-wrap">
              {[
                { label: "All",        color: "bg-gray-100 text-gray-700 border-slate-400",   dot: "bg-gray-400"   },
                { label: "Registered", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
                { label: "Assigned",   color: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500"   },
                { label: "Pending",    color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
                { label: "Supporting", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
                { label: "Field Visit", color: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
                { label: "Escalating", color: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-600" },
                { label: "Critical",   color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
                { label: "Resolved",   color: "bg-green-100 text-green-600 border-green-200", dot: "bg-green-500"  },
              ].map(({ label, color, dot }) => (
                <button key={label} onClick={() => setFilterStatus(label === "All" ? "All" : label)}
                  className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.55vw] rounded-[0.5vw] border font-medium text-[0.8vw] cursor-pointer transition-all ${color} ${filterStatus === (label === "All" ? "All" : label) ? "ring-2 ring-offset-1 ring-blue-300 shadow-sm" : "opacity-80 hover:opacity-100"}`}>
                  <span className={`w-[0.6vw] h-[0.6vw] rounded-full ${dot}`} />
                  {label}
                  <span className="font-bold">{counts[label] ?? 0}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[0.6vw] shadow-sm border border-slate-400 flex flex-col w-full overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[65vh] min-h-[65vh] w-full rounded-t-[0.6vw]">
                <table className="min-w-[120vw] w-full text-left border-collapse">
                  <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {!isSupervisor && (
                        <th className="p-[0.6vw] border-b border-r border-slate-400 w-[3%] text-center">
                          <button onClick={toggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                            {isPageSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />}
                          </button>
                        </th>
                      )}
                      <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-slate-400 text-center w-[3%] text-[0.78vw]">S.No</th>
                      {["Call Info", "Category", "Customer", "Product", "Segment", "Error Code", "Mode", "Priority", "Assigned", "Status", "Summary"].map(h => (
                        <th key={h} className="p-[0.6vw] font-semibold text-center text-gray-800 border-b border-r border-slate-400 whitespace-nowrap text-[0.78vw]">{h}</th>
                      ))}
                      <th className="p-[0.6vw] font-semibold text-center text-gray-800 border-b border-slate-400 whitespace-nowrap text-[0.78vw] sticky right-0 bg-blue-50 z-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {isLoading ? (
                      <tr>
                        <td colSpan={13} className="py-[10vh] text-center">
                          <div className="flex flex-col items-center justify-center gap-[1vw]">
                            <Loader2 className="w-[3vw] h-[3vw] animate-spin text-blue-600" />
                            <span className="text-[1vw] font-bold text-blue-600">Loading Service Calls...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedData.length > 0 ? paginatedData.map((row, i) => {
                      const sn         = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                      const allProducts = (row._products?.length > 0 ? row._products : row.products?.length > 0 ? row.products : [{}]);
                      // Filter products by individual status when a specific status tab is selected
                      let displayProducts = allProducts;
                      let effectiveStatus = row.status;
                      if (filterStatus !== "All") {
                        displayProducts = allProducts.filter(prod => {
                          const rawStatus = getProductStatus(prod, effectiveStatus);
                          const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
                          return mappedLabel === filterStatus;
                        });
                        // If call-level status matches but products get filtered out (e.g. Critical), show all products
                        if (displayProducts.length === 0 && row.status === filterStatus) {
                          displayProducts = allProducts;
                        }
                      }
                      
                      const rowCount   = displayProducts.length;
                      const rowId      = row.id || row._id;
                      const isSelected = selectedItems.has(rowId);

                      // Only render the row if there are products to display
                      if (rowCount === 0) return null;

                      return displayProducts.map((prod, pIdx) => {
                        const isCritical = prod?._isCritical === true || row.status === "Critical";
                        const isResolved = effectiveStatus === "Resolved" || deriveCallStatus(allProducts, effectiveStatus) === "resolved";
                        const criticalCellClass = (isCritical && !isResolved) ? "border-t-[0.15vw] border-b-[0.15vw] border-red-300 first:border-l-[0.15vw] last:border-r-[0.15vw]" : "border-slate-400";
                        const bgClass = isSelected ? "bg-blue-50" : (isResolved ? "bg-emerald-50/60 hover:bg-emerald-100/60" : "hover:bg-gray-50");
                        
                        return (
                          <tr key={`${row.id}-${pIdx}`} className={`transition-colors border-b border-slate-400 ${bgClass}`}>
                          {/* 0. Select + S.No (rowSpan) */}
                          {pIdx === 0 && (
                            <>
                              {!isSupervisor && (
                                <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle ${criticalCellClass}`}>
                                  <button onClick={() => toggleSelect(rowId)} className="flex items-center justify-center w-full cursor-pointer">
                                    {isSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-400" />}
                                  </button>
                                </td>
                              )}
                              <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-gray-600 font-medium text-center align-middle text-[0.78vw] ${criticalCellClass}`}>
                                {sn}
                              </td>
                            </>
                          )}

                          {/* 1. Call Info — Num + DT (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`p-[0.8vw] border-r align-middle whitespace-nowrap ${criticalCellClass}`}>
                              <div className="font-mono text-center text-[0.78vw] font-bold text-blue-600 mb-[0.1vw] whitespace-nowrap">
                                {row.callNumber}
                              </div>
                              <div className="text-[0.62vw] text-center text-gray-400 whitespace-nowrap uppercase">
                                {(() => {
                                  try {
                                    const d = new Date(row.timestamp || row.dateTime);
                                    if (isNaN(d)) return row.dateTime || "—";
                                    return d.toLocaleString("en-IN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }).toUpperCase();
                                  } catch { return row.dateTime || "—"; }
                                })()}
                              </div>
                            </td>
                          )}

                          {/* 2. Category (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`p-[0.8vw] text-center border-r align-middle whitespace-nowrap ${criticalCellClass}`}>
                              <span className={`px-[0.5vw] py-[0.15vw]  rounded text-[0.68vw] font-bold border whitespace-nowrap ${getTypeColor(row.customerType || "All")}`}>
                                {row.customerType || "—"}
                              </span>
                            </td>
                          )}

                          {/* 3. Customer (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`p-[0.8vw] border-r align-middle whitespace-nowrap ${criticalCellClass}`}>
                              <div className="font-semibold text-center text-gray-800 text-[0.78vw] truncate max-w-[12vw]" title={row.customerName}>
                                {row.customerName || "—"}
                              </div>
                              <div className="flex items-center justify-center gap-[0.4vw] mt-[0.1vw]">
                                {row.partyCode && <div className="text-[0.6vw] text-gray-400 font-mono">{row.partyCode}</div>}
                                {(row.locationType || "IPR") && <span className={`text-[0.55vw] px-[0.3vw] py-[0.05vw] rounded font-bold border ${row.locationType === "Site" ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-purple-50 text-purple-600 border-purple-200"}`}>{row.locationType || "IPR"}</span>}
                              </div>
                            </td>
                          )}

                          {/* 4. Product */}
                          <td className={`px-[0.8vw] py-[0.55vw] text-center border-r align-middle whitespace-nowrap ${criticalCellClass}`}>
                            <div className="flex flex-col text-center items-center whitespace-nowrap">
                              <div className="text-[0.75vw] font-semibold text-gray-800 truncate max-w-[15vw]" title={prod?.productModel || prod?.itemCode || "—"}>
                                {prod?.productModel || prod?.itemCode || "—"}
                              </div>
                              {prod?.serialNumber && <div className="text-[0.62vw] text-gray-400 font-mono">SN: {prod.serialNumber}</div>}
                            </div>
                          </td>

                          {/* 5. Segment */}
                          <td className={`px-[0.8vw] py-[0.55vw] text-center border-r align-middle ${criticalCellClass}`}>
                            {prod?.productSegment
                              ? <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 px-[0.45vw] py-[0.12vw] rounded text-[0.68vw] font-semibold whitespace-nowrap">{prod.productSegment}</span>
                              : <span className="text-gray-300 text-[0.72vw]">—</span>}
                          </td>

                          {/* 6. Error Code */}
                          <td className={`px-[0.8vw] py-[0.55vw] text-center border-r text-center align-middle ${criticalCellClass}`}>
                            {prod?.errorCode
                              ? <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.15vw] rounded text-[0.72vw] font-mono font-bold uppercase">{prod.errorCode}</span>
                              : <span className="text-gray-300 text-[0.72vw]">—</span>}
                          </td>

                          {/* 7. Mode (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`p-[0.8vw] text-center border-r align-middle text-[0.75vw] text-gray-600 whitespace-nowrap ${criticalCellClass}`}>
                              {row.mode || "—"}
                            </td>
                          )}

                          {/* 8. Priority (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`p-[0.8vw] text-center border-r align-middle whitespace-nowrap ${criticalCellClass}`}>
                              <span className={`px-[0.5vw] py-[0.2vw] rounded text-[0.72vw] font-bold whitespace-nowrap ${PRIORITY_COLORS[row.priority] || "bg-gray-100 text-gray-600"}`}>
                                {row.priority}
                              </span>
                            </td>
                          )}

                          {/* 9. Assigned Person */}
                          {(() => {
                            const name   = prod?._assignedEngineerName || row?.assignedEngineerName || "";
                            const engId  = prod?._assignedEngineerId || row?.assignedEngineer || "";
                            const isReal = !!name && name !== "Auto-assign Fallback";
                            return (
                              <td className={`px-[0.8vw] py-[0.55vw] text-center border-r align-middle ${criticalCellClass}`}>
                                {isReal ? (
                                  <div className="flex items-center justify-center gap-[0.4vw]">
                                    <div className={`w-[1.4vw] h-[1.4vw] rounded-full bg-gradient-to-br ${(() => {
                                      const colors = ["from-blue-400 to-blue-600","from-purple-400 to-purple-600","from-green-400 to-green-600","from-orange-400 to-orange-600","from-pink-400 to-pink-600","from-teal-400 to-teal-600"];
                                      let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
                                      return colors[Math.abs(h) % colors.length];
                                    })()} flex items-center justify-center flex-shrink-0`}>
                                      <span className="text-white text-[0.5vw] font-bold">{name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                                    </div>
                                    <div className="min-w-0 flex flex-col items-start text-left">
                                      <div className="text-[0.72vw] font-semibold text-gray-800 truncate max-w-[7vw]" title={name}>{name}</div>
                                      {engId && (
                                        <div className="text-[0.55vw] text-gray-500 font-medium truncate max-w-[7vw]" title={engId}>
                                          {engId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-[0.3vw] bg-amber-50 text-amber-600 border border-amber-200 px-[0.45vw] py-[0.12vw] rounded text-[0.65vw] font-semibold whitespace-nowrap">
                                    <span className="w-[0.35vw] h-[0.35vw] rounded-full bg-amber-400 flex-shrink-0" />
                                    Yet to Assign
                                  </span>
                                )}
                              </td>
                            );
                          })()}

                          {/* 10. Status */}
                          <td className={`px-[0.8vw] py-[0.55vw] text-center border-r align-middle ${criticalCellClass}`}>
                            {(() => {
                              const status = getProductStatus(prod, effectiveStatus);
                              
                              const cfg    = getStatusCfg(status);
                              const isProdCritical = prod?._isCritical === true;
                              return (
                                <div className="flex flex-col items-center gap-[0.2vw]">
                                  <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded text-[0.7vw] font-bold border ${cfg.cls}`}>
                                    {isProdCritical ? (
                                      <AlertTriangle className="w-[0.8vw] h-[0.8vw] text-red-600 animate-pulse" />
                                    ) : (
                                      <span className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                                    )}
                                    {cfg.label}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* 11. Summary (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`px-[0.8vw] py-[0.55vw] text-center border-r align-middle ${criticalCellClass}`}>
                              <button
                                onClick={() => setSummaryModalRow(row)}
                                className="inline-flex items-center gap-[0.4vw] px-[0.6vw] py-[0.3vw] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[0.75vw] font-semibold transition-all shadow-sm active:scale-95"
                                title="View Call Summary"
                              >
                                <ClipboardList className="w-[1vw] h-[1vw]" />
                                Summary
                              </button>
                            </td>
                          )}

                          {/* 12. Actions (rowSpan) */}
                          {pIdx === 0 && (
                            <td rowSpan={rowCount} className={`px-[1vw] py-[0.4vw] text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.1)] ${criticalCellClass} border-l border-slate-400`}>
                              <div className="flex items-center justify-center gap-[0.8vw]">
                                {/* Edit Button */}
                                {!isSupervisor && (
                                  <button
                                    onClick={() => goToEdit(row)}
                                    title="Edit Call Details"
                                    className="group flex flex-col items-center gap-[0.2vw] text-gray-400 hover:text-blue-600 transition-all cursor-pointer"
                                  >
                                    <div className="p-[0.4vw] rounded-[0.5vw] bg-gray-50 border border-slate-400 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:shadow-sm transition-all">
                                      <Edit3 className="w-[1vw] h-[1vw]" />
                                    </div>
                                    <span className="text-[0.52vw] font-bold uppercase tracking-wider group-hover:text-blue-700">Edit</span>
                                  </button>
                                )}

                                {/* History Button */}
                                <button
                                  onClick={() => setHistoryModalProduct(row)}
                                  title="View Call History"
                                  className="group flex flex-col items-center gap-[0.2vw] text-gray-400 hover:text-indigo-600 transition-all cursor-pointer"
                                >
                                  <div className="p-[0.4vw] rounded-[0.5vw] bg-gray-50 border border-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:shadow-sm transition-all">
                                    <History className="w-[1vw] h-[1vw]" />
                                  </div>
                                  <span className="text-[0.52vw] font-bold uppercase tracking-wider group-hover:text-indigo-700 whitespace-nowrap">History</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  }) : (
                      <tr><td colSpan={13} className="py-[4vw] text-center text-gray-400">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-400 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
                <div className="text-[0.8vw] text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-semibold text-gray-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="font-bold text-gray-800">{filteredData.length}</span> entries
                </div>
                <div className="flex items-center gap-[1.2vw]">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-[0.4vw] border border-slate-400 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronLeft className="w-[1vw] h-[1vw] text-gray-600" /></button>
                  <div className="flex gap-[0.7vw]">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                      if (pNum > totalPages) return null;
                      return (
                        <button key={pNum} onClick={() => setCurrentPage(pNum)}
                          className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-slate-400 text-gray-600 hover:bg-gray-50"}`}>
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-[0.4vw] border border-slate-400 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronRight className="w-[1vw] h-[1vw] text-gray-600" /></button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {historyModalProduct && (
        <ProductHistoryModal
          history={(historyModalProduct._products || []).flatMap(p => [
            ...(p._escalationHistory || []).map(e => ({
              ...e,
              timestamp: e.assignedAt,
              status: e.status === "Pending" ? "Escalation Assigned" : e.status || "Escalated",
              updatedByName: e.updatedByName || "System",
              metadata: { 
                assignedTo: e.engineerName || e.assignedToName || e.assignedTo,
                assignedToName: e.engineerName || e.assignedToName, 
                dept: e.department || e.dept,
                remarks: e.remarks || e.reason || "",
                level: e.level,
                deadline: e.targetTime || e.deadline
              }
            })),
            ...(p._history || [])
          ]).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          employees={employees}
          currentUser={currentUser}
          onClose={() => setHistoryModalProduct(null)}
        />
      )}

      {/* Call Summary Modal */}
      {summaryModalRow && <CallSummaryModal row={summaryModalRow} employees={employees} onClose={() => setSummaryModalRow(null)} />}
    </div>
  );
}