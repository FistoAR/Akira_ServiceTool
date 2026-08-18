import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle, Clock, User, Package, FileText, CheckCircle,
  History, Shield, ChevronDown, ChevronUp,
  RefreshCw, HelpCircle, Send, X, MapPin, Bell,
  CheckSquare, Wrench, BarChart2, Eye,
  AlertCircle, ChevronRight, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import useEscalationWorker from "../service/useEscalationWorker";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Storage keys ──────────────────────────────────────────────────────────────
const ESCALATION_KEY       = "escalation_queue_v1";
const SUPPORT_REQ_KEY      = "support_requests_v1";
const FIELD_VISIT_KEY      = "field_visits_v1";
const RECEIVED_PRODS_KEY   = "received_products_v1";
const EMPLOYEES_KEY        = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";

const RESOLUTION_TYPES = ["Fixed", "Replaced", "No Fault Found", "Partially Fixed"];
const SLA_OPTIONS      = ["Under SLA", "Breached"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const load  = (key, fb = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; } };
const save  = (key, val)     => localStorage.setItem(key, JSON.stringify(val));
const loadQ = ()             => load(ESCALATION_KEY, []);
const saveQ = (q)            => save(ESCALATION_KEY, q);

function requestNotifPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default")
    Notification.requestPermission().catch(() => {});
}

// ── Product status helper ─────────────────────────────────────────────────────
const getProductStatus = (prod) => {
  if (prod._resolved)                              return "resolved";
  if (prod._productClosure?.status === "Resolved" || prod._productClosure?.status === "Closed")  return "closed";
  if (prod._productClosure?.status === "Pending") return "pending";
  if (prod._supportRequested)                     return "support";
  return "open";
};

const PROD_STATUS_CFG = {
  resolved: { dot: "bg-green-500",  label: "Resolved",    cls: "bg-green-50 border-green-300 text-green-700"   },
  closed:   { dot: "bg-green-500",  label: "Resolved",    cls: "bg-green-50 border-green-300 text-green-700"   },
  pending:  { dot: "bg-yellow-500", label: "Pending",     cls: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  support:  { dot: "bg-orange-500", label: "Support Req", cls: "bg-orange-50 border-orange-300 text-orange-700" },
  open:     { dot: "bg-blue-400",   label: "Open",        cls: "bg-blue-50 border-blue-300 text-blue-700"       },
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray" }) => {
  const map = {
    green:  "bg-green-100 text-green-700 border-green-300",
    blue:   "bg-blue-100 text-blue-700 border-blue-300",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
    orange: "bg-orange-100 text-orange-700 border-orange-300",
    red:    "bg-red-100 text-red-700 border-red-300",
    gray:   "bg-gray-100 text-gray-600 border-gray-400",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
  };
  return (
    <span className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full border font-semibold whitespace-nowrap ${map[color] || map.gray}`}>
      {label}
    </span>
  );
};

// ── Support Escalation Modal (per-product) ────────────────────────────────────
const SupportEscalationModal = ({ product, entry, currentUser, onConfirm, onClose, showAll = false }) => {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [notes, setNotes]                   = useState("");
  const [search, setSearch]                 = useState("");
  const [showDropdown, setShowDropdown]     = useState(false);
  const dropdownRef                         = useRef(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const candidates = useMemo(() => {
    const emps  = load(EMPLOYEES_KEY, []);
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const q = search.toLowerCase();
    const matchesSearch = e => !q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);

    if (showAll) {
      // From support-requests context: show all employees except self
      return emps.filter(e => e.userId !== currentUser?.userId && matchesSearch(e));
    }

    if (!search && !showAll) {
      // Show some defaults or everyone eligible if search is empty
      // Original flow-based filtering for escalation tab
      const prodDept    = product._currentDepartment || entry.currentDepartment;
      const allFlowsArr = Object.values(flows).find(f => Array.isArray(f)) || [];
      const allowedDepts = new Set([prodDept]);
      const myIdx = allFlowsArr.findIndex(s => s.dept === prodDept);
      if (myIdx >= 0 && myIdx + 1 < allFlowsArr.length) allowedDepts.add(allFlowsArr[myIdx + 1].dept);
      
      const filtered = emps.filter(e => allowedDepts.has(e.department) && e.userId !== currentUser?.userId);
      if (filtered.length > 0) return filtered;
      // If no one in department, fallback to showing all for selection
      return emps.filter(e => e.userId !== currentUser?.userId);
    }

    return emps.filter(e => matchesSearch(e) && e.userId !== currentUser?.userId);
  }, [entry, product, currentUser, search, showAll]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[34vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-orange-50 border-b border-orange-200 px-[1.2vw] py-[0.8vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.6vw]">
            <HelpCircle className="w-[1.2vw] h-[1.2vw] text-orange-600" />
            <h3 className="text-[1vw] font-bold text-orange-800">{showAll ? "Ask Another Support Person" : "Request Support — Product Only"}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>
        <div className="p-[1.2vw] flex flex-col gap-[0.9vw] overflow-y-auto flex-1">
          <div className="bg-orange-50 border border-orange-200 rounded-[0.4vw] p-[0.6vw] text-[0.75vw] text-orange-700">
            <strong>Note:</strong> {showAll
              ? "You can reassign this support request to any available person in your organisation."
              : "Only this product will be reassigned. Other products in the call remain with you."}
          </div>
          <div className="bg-gray-50 border border-slate-400 rounded-[0.5vw] p-[0.8vw]">
            <div className="text-[0.82vw] font-bold text-gray-700">{product.productModel || product.itemCode}</div>
            {product.serialNumber   && <div className="text-[0.72vw] text-gray-500 font-mono">SN: {product.serialNumber}</div>}
            {product.callDescription && <div className="text-[0.72vw] text-gray-600 mt-[0.3vw]"><strong>Issue:</strong> {product.callDescription}</div>}
          </div>
          <div className="flex flex-col gap-[0.4vw]">
            <label className="text-[0.8vw] font-semibold text-gray-600">Select Support Person *</label>
            <div className="relative" ref={dropdownRef}>
              <input type="text" value={search} 
                onFocus={() => setShowDropdown(true)}
                onChange={e => { setSearch(e.target.value); setSelectedPerson(null); setShowDropdown(true); }}
                placeholder="Search by name or department…"
                className="w-full border border-gray-400 rounded-[0.4vw] px-[0.8vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-orange-400" />
              {showDropdown && candidates.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-400 rounded-[0.4vw] max-h-[14vw] overflow-y-auto divide-y divide-gray-50 shadow-lg">
                  {candidates.map(emp => (
                    <div key={emp.userId} onClick={() => { setSelectedPerson(emp); setSearch(emp.name); setShowDropdown(false); }}
                      className={`flex items-center gap-[0.7vw] px-[0.8vw] py-[0.6vw] cursor-pointer ${selectedPerson?.userId === emp.userId ? "bg-orange-50 border-l-2 border-orange-400" : "hover:bg-gray-50"}`}>
                      <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[0.6vw] font-bold">{emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.82vw] font-semibold text-gray-700">{emp.name}</div>
                        <div className="text-[0.7vw] text-gray-400">{emp.department} · {emp.userId}</div>
                      </div>
                      {selectedPerson?.userId === emp.userId && <CheckCircle className="w-[1vw] h-[1vw] text-orange-500 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && candidates.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-400 rounded-b-[0.4vw] p-[1vw] text-center text-gray-400 text-[0.78vw] shadow-lg">
                  No eligible support personnel found
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-[0.3vw]">
            <label className="text-[0.8vw] font-semibold text-gray-600">Handover Notes *</label>
            <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe the issue, what you've tried, what they need to know…"
              className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.82vw] outline-none resize-none focus:border-orange-400" />
          </div>
        </div>
        <div className="px-[1.2vw] py-[0.8vw] border-t border-slate-400 bg-gray-50 flex justify-end gap-[0.7vw]">
          <button onClick={onClose} className="px-[1.2vw] py-[0.5vw] border border-gray-400 bg-white rounded-[0.4vw] text-[0.82vw] font-medium cursor-pointer hover:bg-gray-50">Cancel</button>
          <button onClick={() => {
            if (!selectedPerson) { alert("Please select a support person."); return; }
            if (!notes.trim())   { alert("Please add handover notes."); return; }
            onConfirm({ supportPerson: selectedPerson, notes });
          }} className="px-[1.2vw] py-[0.5vw] bg-orange-600 hover:bg-orange-700 text-white rounded-[0.4vw] text-[0.82vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]">
            <Send className="w-[0.9vw] h-[0.9vw]" />Reassign This Product
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Assign Field Visit Modal ────────────────────────────────────────────────
const AssignVisitModal = ({ type, entry, product, currentUser, onSave, onClose, inlineMode = false }) => {
  const employees = load(EMPLOYEES_KEY, []);
  const techEngs  = employees.filter(e => {
    const dept = (e.department || "").toLowerCase();
    return dept.includes("engineer") || dept.includes("service") || dept.includes("r&d") || dept.includes("support") || dept.includes("technician");
  });
  const [form, setForm] = useState({
    assignedTo: "", assignedToName: "",
    assignmentDate: new Date().toISOString().slice(0, 16),
    visitDate: "", diagnosisSummary: "",
    spareRequired: "No", spareUsedDetails: "",
  });
  const sf  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isFV = type === "Field Visit";

  const formBody = (
    <div className="flex flex-col gap-[0.9vw]">
      {product && (
        <div className={`border rounded-[0.4vw] p-[0.6vw] ${isFV ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"}`}>
          <div className={`text-[0.75vw] font-semibold ${isFV ? "text-blue-700" : "text-purple-700"}`}>
            {isFV ? "📍" : "🔧"} For product: <strong>{product.productModel || product.itemCode}</strong>
          </div>
          {product.serialNumber && <div className={`text-[0.7vw] font-mono ${isFV ? "text-blue-600" : "text-purple-600"}`}>SN: {product.serialNumber}</div>}
        </div>
      )}
      <div className="flex flex-col gap-[0.3vw]">
        <label className="text-[0.8vw] font-semibold text-gray-600">Assign To *</label>
        <select value={form.assignedTo} onChange={e => {
          const emp = techEngs.find(en => en.userId === e.target.value);
          sf("assignedTo", e.target.value); sf("assignedToName", emp?.name || "");
        }} className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.82vw] bg-white outline-none">
          <option value="">-- Select person --</option>
          {techEngs.map(e => <option key={e.userId} value={e.userId}>{e.name} ({e.department})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-[0.8vw]">
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.8vw] font-semibold text-gray-600">Assignment Date</label>
          <input type="datetime-local" value={form.assignmentDate} onChange={e => sf("assignmentDate", e.target.value)}
            className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.82vw] outline-none" />
        </div>
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.8vw] font-semibold text-gray-600">Visit Date</label>
          <input type="date" value={form.visitDate} onChange={e => sf("visitDate", e.target.value)}
            className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.82vw] outline-none" />
        </div>
      </div>
      <div className="flex flex-col gap-[0.3vw]">
        <label className="text-[0.8vw] font-semibold text-gray-600">Initial Diagnosis Summary</label>
        <textarea rows="2" value={form.diagnosisSummary} onChange={e => sf("diagnosisSummary", e.target.value)}
          placeholder="Describe reported issue / initial findings…"
          className="border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.82vw] outline-none resize-none" />
      </div>
    </div>
  );

  const saveBtn = (
    <button onClick={() => { if (!form.assignedTo) { alert("Please select a person."); return; } onSave(form); }}
      className={`px-[1.2vw] py-[0.5vw] ${isFV ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"} text-white rounded-[0.4vw] text-[0.82vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]`}>
      <CheckCircle className="w-[0.9vw] h-[0.9vw]" />Save Assignment
    </button>
  );

  if (inlineMode) return (
    <div className={`border ${isFV ? "border-blue-200" : "border-purple-200"} rounded-[0.5vw] overflow-hidden bg-white`}>
      <div className="p-[0.8vw]">{formBody}<div className="flex justify-end mt-[0.8vw]">{saveBtn}</div></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[40vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`border-b px-[1.2vw] py-[0.8vw] flex justify-between items-center ${isFV ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"}`}>
          <div className="flex items-center gap-[0.6vw]">
            {isFV ? <MapPin className="w-[1.2vw] h-[1.2vw] text-blue-600" /> : <Wrench className="w-[1.2vw] h-[1.2vw] text-purple-600" />}
            <h3 className={`text-[1vw] font-bold ${isFV ? "text-blue-800" : "text-purple-800"}`}>Assign {type}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>
        <div className="p-[1.2vw] overflow-y-auto flex-1">{formBody}</div>
        <div className="px-[1.2vw] py-[0.8vw] border-t border-slate-400 bg-gray-50 flex justify-end gap-[0.7vw]">
          <button onClick={onClose} className="px-[1.2vw] py-[0.5vw] border border-gray-400 bg-white rounded-[0.4vw] text-[0.82vw] font-medium cursor-pointer hover:bg-gray-50">Cancel</button>
          {saveBtn}
        </div>
      </div>
    </div>
  );
};

// ── Redesigned Per-Product Closure Panel ──────────────────────────────────────
const ProductClosurePanel = ({ prod, prodIdx, entry, currentUser, onAssignFieldVisit, onProductClose, hidePending = false }) => {
  const existing = prod._productClosure || {};
  const saved    = existing.status;
  const [selected, setSelected]             = useState("");
  const [resolutionType, setResolutionType] = useState(existing.resolutionType || "Fixed");
  const [remarks, setRemarks]               = useState(existing.remarks || "");
  
  // Received Goods specific state
  const [materialDetails, setMaterialDetails] = useState("");
  const [receiveDate, setReceiveDate]         = useState(new Date().toISOString().split("T")[0]);

  if (saved === "Resolved") return (
    <div className="mt-[0.5vw] bg-green-50 border border-green-200 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] flex items-center gap-[0.5vw]">
      <CheckCircle className="w-[0.85vw] h-[0.85vw] text-green-600 flex-shrink-0" />
      <span className="text-[0.72vw] font-bold text-green-700">
        Resolved & Closed {existing.resolutionType ? `(${existing.resolutionType})` : ""}
      </span>
      {existing.remarks && <span className="text-[0.68vw] text-green-600 truncate">· {existing.remarks}</span>}
    </div>
  );

  const actionTabs = [
    { key: "Resolved",   label: "Resolved",    emoji: "✓", cls: "bg-green-600 text-white",  hov: "hover:bg-green-50 text-gray-600" },
    { key: "Pending",    label: "Pending",     emoji: "⏸", cls: "bg-yellow-500 text-white", hov: "hover:bg-yellow-50 text-gray-600" },
    { key: "FVRequired", label: "Field Visit", emoji: "📍", cls: "bg-blue-600 text-white",   hov: "hover:bg-blue-50 text-gray-600" },
    { key: "Received",   label: "Receive Good",emoji: "📦", cls: "bg-purple-600 text-white", hov: "hover:bg-purple-50 text-gray-600" },
  ];

  const handleStatusUpdate = (status, extra = {}) => {
    if (status === "Resolved" && !remarks.trim()) { alert("Resolution details required."); return; }
    if (status === "Pending"  && !remarks.trim()) { alert("Reason required for pending status."); return; }
    if (status === "Received" && (!materialDetails.trim())) { alert("Material details required."); return; }

    const closureData = {
      status: status === "Resolved" ? "Resolved" : status,
      remarks,
      resolutionType: status === "Resolved" ? resolutionType : undefined,
      ...extra,
      updatedAt: new Date().toISOString()
    };

    if (status === "Received") {
      const recs = load(RECEIVED_PRODS_KEY, []);
      recs.push({
        id: Date.now(), callId: entry.callId, callNumber: entry.callNumber,
        customerName: entry.customerName,
        productIdx: prodIdx, product: prod,
        materialDetails, receiveDate,
        assignedTo: currentUser?.userId, assignedBy: currentUser?.userId,
        status: "Open", createdAt: new Date().toISOString()
      });
      save(RECEIVED_PRODS_KEY, recs);
    }

    onProductClose(prodIdx, closureData);
    setSelected("");
  };

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.5vw]">
      <div className="grid grid-cols-4 gap-[0.3vw]">
        {actionTabs.map(({ key, label, emoji, cls, hov }) => (
          <button key={key} type="button"
            onClick={() => setSelected(selected === key ? "" : key)}
            className={`py-[0.5vw] text-[0.68vw] font-bold rounded-[0.4vw] border transition-all cursor-pointer flex items-center justify-center gap-[0.25vw] ${selected === key ? cls : `bg-white border-slate-400 ${hov}`}`}>
            <span>{emoji}</span><span>{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected === "Resolved" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-green-50 border border-green-200 rounded-[0.5vw] p-[0.7vw] space-y-[0.5vw] overflow-hidden">
            <div className="text-[0.65vw] font-bold text-green-700 uppercase">Resolution Details</div>
            <div className="grid grid-cols-2 gap-[0.3vw]">
              {["Fixed", "Replaced", "No Fault Found", "Partially Fixed"].map(t => (
                <button key={t} onClick={() => setResolutionType(t)} className={`py-[0.35vw] rounded-[0.3vw] border text-[0.7vw] font-bold ${resolutionType === t ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:border-green-300"}`}>{t}</button>
              ))}
            </div>
            <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="How was it resolved?..." className="w-full border border-green-200 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] outline-none" />
            <button onClick={() => handleStatusUpdate("Resolved")} className="w-full py-[0.5vw] bg-green-600 text-white rounded-[0.4vw] font-bold text-[0.75vw]">Confirm Resolution</button>
          </motion.div>
        )}

        {selected === "Pending" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-yellow-50 border border-yellow-200 rounded-[0.5vw] p-[0.7vw] space-y-[0.5vw] overflow-hidden">
            <div className="text-[0.65vw] font-bold text-yellow-700 uppercase">Pending Reason</div>
            <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Why is this pending?..." className="w-full border border-yellow-200 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] outline-none" />
            <button onClick={() => handleStatusUpdate("Pending")} className="w-full py-[0.5vw] bg-yellow-500 text-white rounded-[0.4vw] font-bold text-[0.75vw]">Mark Pending</button>
          </motion.div>
        )}

        {selected === "FVRequired" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-blue-50 border border-blue-200 rounded-[0.5vw] p-[0.7vw] overflow-hidden">
            <div className="text-[0.65vw] font-bold text-blue-700 uppercase mb-[0.4vw]">Field Visit Assignment</div>
            <AssignVisitModal 
              type="Field Visit" entry={entry} product={prod} currentUser={currentUser}
              inlineMode onClose={() => setSelected("")}
              onSave={form => {
                onAssignFieldVisit(form, prodIdx);
                handleStatusUpdate("Field Visit Required", { visitDate: form.visitDate, assignedTo: form.assignedToName });
              }} 
            />
          </motion.div>
        )}

        {selected === "Received" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-purple-50 border border-purple-200 rounded-[0.5vw] p-[0.7vw] space-y-[0.5vw] overflow-hidden">
            <div className="text-[0.65vw] font-bold text-purple-700 uppercase">Material Reception Details</div>
            <div className="grid grid-cols-2 gap-[0.5vw]">
              <div>
                <label className="text-[0.6vw] text-purple-600 font-bold ml-[0.2vw]">RECEIVE DATE</label>
                <input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className="w-full border border-purple-200 rounded-[0.4vw] px-[0.5vw] py-[0.35vw] text-[0.75vw]" />
              </div>
            </div>
            <textarea rows="2" value={materialDetails} onChange={e => setMaterialDetails(e.target.value)} placeholder="Material details, condition, serial mismatch?..." className="w-full border border-purple-200 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] outline-none" />
            <button onClick={() => handleStatusUpdate("Received", { receiveDate, materialDetails })} className="w-full py-[0.5vw] bg-purple-600 text-white rounded-[0.4vw] font-bold text-[0.75vw]">Confirm Reception</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Visit Completion Form ─────────────────────────────────────────────────────
const VisitCompletionForm = ({ record, type, currentUser, onSave }) => {
  const [form, setForm] = useState({
    fieldDiagnosisSummary: record.fieldDiagnosisSummary || "",
    spareUsedDetails:      record.spareUsedDetails || "",
    visitCompletionDate:   record.visitCompletionDate || "",
    sla:               record.sla || "Under SLA",
    escalation:        record.escalation || "No",
    visitStatus:       record.visitStatus || "Open",
    remarks:           record.remarks || "",
    resolutionType:    record.resolutionType || "Fixed",
    resolutionRemarks: record.resolutionRemarks || "",
  });
  const sf         = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isAssignee = record.assignedTo === currentUser?.userId;
  const isClosed   = record.visitStatus === "Closed";

  return (
    <div className={`border rounded-[0.5vw] overflow-hidden mt-[0.8vw] ${isClosed ? "border-green-200 bg-green-50/30" : "border-slate-400 bg-white"}`}>
      <div className="bg-gray-50 border-b border-slate-400 px-[0.8vw] py-[0.5vw] flex items-center justify-between">
        <span className="text-[0.78vw] font-bold text-gray-600">
          Completion Details {!isAssignee && <span className="text-gray-400 font-normal">(read-only)</span>}
        </span>
        {isClosed && <Badge label="✓ Completed" color="green" />}
      </div>
      <div className="p-[0.8vw] grid grid-cols-2 gap-[0.7vw]">
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Field Diagnosis Summary</label>
          <textarea rows="2" value={form.fieldDiagnosisSummary} onChange={e => sf("fieldDiagnosisSummary", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500" />
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Visit Completion Date</label>
          <input type="date" value={form.visitCompletionDate} onChange={e => sf("visitCompletionDate", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none disabled:bg-gray-50" />
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">SLA Status</label>
          <div className="flex gap-[0.4vw]">
            {SLA_OPTIONS.map(o => (
              <button key={o} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("sla", o)}
                className={`flex-1 py-[0.4vw] rounded-[0.3vw] border text-[0.75vw] font-medium cursor-pointer transition-all disabled:cursor-default ${form.sla === o ? (o === "Breached" ? "bg-red-500 text-white border-red-500" : "bg-green-500 text-white border-green-500") : "bg-white border-gray-400 text-gray-500"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Escalation Required?</label>
          <div className="flex gap-[0.4vw]">
            {["Yes", "No"].map(o => (
              <button key={o} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("escalation", o)}
                className={`flex-1 py-[0.4vw] rounded-[0.3vw] border text-[0.75vw] font-medium cursor-pointer disabled:cursor-default ${form.escalation === o ? (o === "Yes" ? "bg-orange-500 text-white border-orange-500" : "bg-gray-600 text-white border-gray-600") : "bg-white border-gray-400 text-gray-500"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Spare Used Details</label>
          <input value={form.spareUsedDetails} onChange={e => sf("spareUsedDetails", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none disabled:bg-gray-50" />
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Resolution Type</label>
          <div className="grid grid-cols-4 gap-[0.4vw]">
            {["Fixed", "Replaced", "No Fault Found", "Partially Fixed"].map(t => (
              <button key={t} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("resolutionType", t)}
                className={`py-[0.4vw] rounded-[0.3vw] border text-[0.72vw] font-medium cursor-pointer disabled:cursor-default ${form.resolutionType === t ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-400 text-gray-600"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Resolution Remarks</label>
          <textarea rows="2" value={form.resolutionRemarks} onChange={e => sf("resolutionRemarks", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50" />
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Remarks</label>
          <textarea rows="1" value={form.remarks} onChange={e => sf("remarks", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50" />
        </div>
      </div>
      {isAssignee && !isClosed && (
        <div className="px-[0.8vw] pb-[0.8vw] flex gap-[0.5vw] justify-end">
          <button onClick={() => onSave({ ...form, visitStatus: "Open" })}
            className="px-[1vw] py-[0.45vw] border border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] text-[0.78vw] font-medium cursor-pointer">
            Save Progress
          </button>
          <button onClick={() => onSave({ ...form, visitStatus: "Closed", closedAt: new Date().toISOString() })}
            className="px-[1vw] py-[0.45vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.3vw]">
            <CheckCircle className="w-[0.85vw] h-[0.85vw]" />Close & Resolve
          </button>
        </div>
      )}
    </div>
  );
};

// ── Report Details Modal ──────────────────────────────────────────────────────
const ReportDetailsModal = ({ rec, onClose }) => {
  const getStatusColor = (s) => ({
    Resolved: "bg-green-100 text-green-700",   Closed: "bg-gray-100 text-gray-600",
    Pending:  "bg-yellow-100 text-yellow-700", Escalated: "bg-orange-100 text-orange-700",
    Assigned: "bg-blue-100 text-blue-700",     Critical_Unresolved: "bg-red-100 text-red-700",
  })[s] || "bg-gray-100 text-gray-600";

  const startHistory = rec.escalationHistory?.[0];
  const startDate    = startHistory ? new Date(startHistory.assignedAt).toLocaleString() : (rec.assignedAt ? new Date(rec.assignedAt).toLocaleString() : "—");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <div className="bg-white w-[60vw] max-h-[85vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <Eye className="w-[1.2vw] h-[1.2vw] text-white" />
            <div>
              <h3 className="text-[1vw] font-bold text-white">{rec.callNumber}</h3>
              <p className="text-[0.72vw] text-blue-200">{rec.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-[0.7vw]">
            <span className={`text-[0.72vw] px-[0.6vw] py-[0.2vw] rounded font-bold ${getStatusColor(rec.status)}`}>
              {rec.status === "Critical_Unresolved" ? "CRITICAL" : rec.status}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-[1.5vw] space-y-[1vw]">
          {/* Contact Person Info */}
          {(rec.contactPerson || rec.contactNumber || rec.emailId || rec.location) && (
            <div className="bg-gray-50 border border-slate-400 rounded-[0.5vw] p-[0.8vw]">
              <div className="text-[0.68vw] font-bold text-gray-400 uppercase mb-[0.4vw]">Contact Details</div>
              <div className="flex items-center gap-[1.5vw] flex-wrap">
                {rec.contactPerson  && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-gray-700"><User className="w-[0.85vw] h-[0.85vw] text-gray-400" /><strong>Person:</strong> {rec.contactPerson}</div>}
                {rec.contactNumber  && <div className="text-[0.78vw] text-gray-700"><strong>Ph:</strong> {rec.contactNumber}</div>}
                {rec.emailId        && <div className="text-[0.78vw] text-gray-700"><strong>Email:</strong> {rec.emailId}</div>}
                {rec.location       && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-gray-700"><MapPin className="w-[0.85vw] h-[0.85vw] text-gray-400" />{rec.location}</div>}
              </div>
            </div>
          )}

          {/* Start → Current Banner */}
          <div className="bg-gray-50 border border-slate-400 rounded-[0.5vw] p-[0.8vw] flex items-center gap-[1vw]">
            <div className="flex-1">
              <div className="text-[0.68vw] font-semibold text-gray-400 uppercase mb-[0.2vw]">Started</div>
              <div className="text-[0.82vw] font-bold text-gray-700">{startHistory ? `${startHistory.department} → ${startHistory.engineerName}` : "—"}</div>
              <div className="text-[0.7vw] text-gray-400 mt-[0.1vw]">{startDate}</div>
            </div>
            <div className="flex items-center gap-[0.4vw] text-gray-300">
              <div className="w-[3vw] h-[0.1vw] bg-gray-300" />
              <ChevronRight className="w-[1vw] h-[1vw] text-gray-400" />
              <div className="w-[3vw] h-[0.1vw] bg-gray-300" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-[0.68vw] font-semibold text-gray-400 uppercase mb-[0.2vw]">Current</div>
              <div className="text-[0.82vw] font-bold text-gray-700">{rec.currentEngineerName} ({rec.currentDepartment})</div>
              <span className={`inline-block text-[0.7vw] px-[0.5vw] py-[0.1vw] rounded mt-[0.1vw] font-semibold ${getStatusColor(rec.status)}`}>
                {rec.status === "Critical_Unresolved" ? "CRITICAL" : rec.status}
              </span>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white border border-slate-400 rounded-[0.5vw] overflow-hidden">
            <div className="bg-gray-50 border-b border-slate-400 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
              <Package className="w-[0.9vw] h-[0.9vw] text-green-500" />
              <span className="text-[0.8vw] font-bold text-gray-700">Products ({rec.products?.length || 0}) — Individual Status</span>
            </div>
            <div className="divide-y divide-gray-100">
              {rec.products?.map((p, i) => {
                const cfg = PROD_STATUS_CFG[getProductStatus(p)];
                return (
                  <div key={i} className={`px-[0.8vw] py-[0.7vw] ${p._resolved ? "bg-green-50" : p._productClosure?.status === "Pending" ? "bg-yellow-50" : ""}`}>
                    <div className="flex items-center justify-between mb-[0.25vw]">
                      <div className="flex items-center gap-[0.5vw]">
                        <div className={`w-[0.6vw] h-[0.6vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-[0.8vw] font-semibold text-gray-700">{p.productModel || p.itemCode || `Product ${i+1}`}</span>
                        {p.serialNumber && <span className="text-[0.65vw] text-gray-400 font-mono">SN: {p.serialNumber}</span>}
                      </div>
                      <span className={`text-[0.65vw] px-[0.45vw] py-[0.12vw] rounded-full border font-bold ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    {p._escalationHistory?.length > 0 && (
                      <div className="mt-[0.3vw] ml-[1vw] pl-[0.5vw] border-l-2 border-blue-100 space-y-[0.2vw]">
                        <div className="text-[0.62vw] font-bold text-gray-400 uppercase">Product Escalation</div>
                        {p._escalationHistory.map((h, hi) => (
                          <div key={hi} className="flex items-center gap-[0.4vw] text-[0.68vw]">
                            <span className={`px-[0.35vw] rounded text-[0.58vw] font-bold text-white ${hi === 0 ? "bg-blue-500" : hi === 1 ? "bg-yellow-500" : "bg-red-500"}`}>L{hi+1}</span>
                            <span className="text-gray-600">{h.department} → {h.engineerName}</span>
                            <span className="text-gray-400 ml-auto">{new Date(h.assignedAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {p._resolutionRemarks && (
                      <div className="text-[0.7vw] text-green-700 mt-[0.2vw] ml-[1vw]">Resolution: {p._resolutionRemarks}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Call escalation timeline */}
          {rec.escalationHistory?.length > 0 && (
            <div className="bg-white border border-slate-400 rounded-[0.5vw] overflow-hidden">
              <div className="bg-gray-50 border-b border-slate-400 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
                <History className="w-[0.9vw] h-[0.9vw] text-purple-500" />
                <span className="text-[0.8vw] font-bold text-gray-700">Call Escalation Flow</span>
              </div>
              <div className="p-[0.8vw] space-y-[0.5vw]">
                {rec.escalationHistory.map((h, i) => (
                  <div key={i} className="flex gap-[0.6vw]">
                    <div className="flex flex-col items-center">
                      <div className={`w-[1.6vw] h-[1.6vw] rounded-full flex items-center justify-center text-white text-[0.6vw] font-bold flex-shrink-0 ${h.level === 0 ? "bg-blue-500" : h.level === 1 ? "bg-yellow-500" : "bg-red-500"}`}>
                        L{h.level + 1}
                      </div>
                      {i < rec.escalationHistory.length - 1 && <div className="w-[0.1vw] flex-1 bg-gray-200 my-[0.2vw]" />}
                    </div>
                    <div className="flex-1 bg-gray-50 border border-slate-400 rounded-[0.4vw] p-[0.5vw] mb-[0.2vw]">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[0.8vw] font-bold text-gray-700">{h.department}</span>
                          <span className="text-[0.72vw] text-gray-500 ml-[0.4vw]">→ {h.engineerName}</span>
                        </div>
                        <span className="text-[0.68vw] text-gray-400">{new Date(h.assignedAt).toLocaleString()}</span>
                      </div>
                      {h.reason && <p className="text-[0.7vw] text-orange-600 mt-[0.2vw] flex items-center gap-[0.25vw]"><AlertTriangle className="w-[0.7vw] h-[0.7vw]" />{h.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Visits */}
          {rec._fieldVisits?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-[0.5vw] overflow-hidden">
              <div className="bg-blue-100 border-b border-blue-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
                <MapPin className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                <span className="text-[0.8vw] font-bold text-blue-700">Field Visits</span>
              </div>
              <div className="p-[0.8vw] space-y-[0.4vw]">
                {rec._fieldVisits.map((f, i) => (
                  <div key={i} className="bg-white border border-blue-100 rounded-[0.4vw] p-[0.5vw]">
                    <div className="flex justify-between">
                      <span className="text-[0.78vw] font-semibold">Assigned to: {f.assignedToName}</span>
                      <Badge label={f.visitStatus === "Closed" ? "Completed" : "Open"} color={f.visitStatus === "Closed" ? "green" : "blue"} />
                    </div>
                    {f.productIdx !== null && f.productIdx !== undefined && (
                      <div className="text-[0.68vw] text-blue-600 mt-[0.1vw]">Product: P{f.productIdx + 1}</div>
                    )}
                    {f.visitDate && <div className="text-[0.72vw] text-gray-500">Visit: {f.visitDate}</div>}
                    {f.fieldDiagnosisSummary && <div className="text-[0.72vw] text-gray-600 mt-[0.1vw]">Diagnosis: {f.fieldDiagnosisSummary}</div>}
                    {f.resolutionRemarks && <div className="text-[0.72vw] text-green-700">Resolution: {f.resolutionRemarks}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-400 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-[1.5vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] text-[0.82vw] font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Escalation Card ───────────────────────────────────────────────────────────
const EscalationCard = ({ entry, currentUser, timer, isExpanded, onToggle,
  onSupportRequest, onAssignFieldVisit, onProductClose, onTakeCall }) => {

  const [activeProductIdx, setActiveProductIdx] = useState(0);
  const [productModals, setProductModals]        = useState({});
  const setPM = (idx, key, val) => setProductModals(p => ({ ...p, [idx]: { ...(p[idx] || {}), [key]: val } }));

  const totalProducts  = entry.products?.length || 0;
  const resolvedCount  = entry.products?.filter(p => p._resolved || p._productClosure?.closedAt).length || 0;
  const isCurrentOwner = entry.currentEngineerId === currentUser?.userId;
  const isCritical     = entry.status === "Critical_Unresolved";

  const getLevelColor  = (l) => ["bg-blue-500", "bg-yellow-500", "bg-red-500"][l] || "bg-gray-500";
  const getStatusColor = (s) => ({
    Pending:            "bg-yellow-100 text-yellow-700 border-yellow-300",
    Assigned:           "bg-blue-100 text-blue-700 border-blue-300",
    Escalated:          "bg-orange-100 text-orange-700 border-orange-300",
    Resolved:           "bg-green-100 text-green-700 border-green-300",
    Critical_Unresolved:"bg-red-100 text-red-700 border-red-300",
    Closed:             "bg-gray-100 text-gray-700 border-gray-400",
  })[s] || "bg-gray-100 text-gray-700 border-gray-400";

  // Filter out products that are handled (support-requested, pending, resolved, closed)
  // These products move to their respective tabs and must NOT appear in escalation card
  const isProductHandled = (p) =>
    p._supportRequested ||
    p._productClosure?.status === "Pending" ||
    p._productClosure?.status === "Closed" ||
    p._resolved;

  // Only truly open products shown as actionable tabs
  const openProducts = useMemo(() =>
    (entry.products || []).map((p, i) => ({ p, i })).filter(({ p }) => !isProductHandled(p)),
    [entry.products]
  );

  // All products for the mini status dots in header
  const allTabProducts = entry.products || [];

  // Active index within openProducts only
  const clampedIdx    = Math.min(activeProductIdx, Math.max(0, openProducts.length - 1));
  const activeProdObj = openProducts[clampedIdx]; // { p, i } — real index i
  const activeProd    = activeProdObj?.p;
  const safeActiveIdx = activeProdObj?.i ?? 0;    // real index in entry.products

  const activeProductIsActionable = !!activeProd && !activeProd._supportRequested;

  return (
    <>
      <div className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${
        isCritical              ? "border-red-300 shadow-sm shadow-red-100"
        : entry.status === "Escalated" ? "border-orange-300"
        : entry.status === "Resolved"  ? "border-green-300"
        : "border-slate-400"}`}>

        {/* ── Header ── */}
        <div className="p-[0.9vw] cursor-pointer" onClick={onToggle}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-[0.8vw]">
              <div className={`w-[2.2vw] h-[2.2vw] rounded-full ${getLevelColor(entry.currentLevel)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-[0.78vw] font-bold">L{entry.currentLevel + 1}</span>
              </div>
              <div>
                <div className="flex items-center gap-[0.4vw] flex-wrap">
                  <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.callNumber}</span>
                  <span className={`text-[0.65vw] px-[0.45vw] py-[0.1vw] rounded-full border font-semibold ${getStatusColor(entry.status)}`}>
                    {isCritical ? "CRITICAL" : entry.status}
                  </span>
                  <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded font-semibold ${
                    entry.priority === "Critical" ? "bg-red-50 text-red-600" : entry.priority === "High" ? "bg-orange-50 text-orange-600"
                    : entry.priority === "Medium" ? "bg-yellow-50 text-yellow-600" : "bg-green-50 text-green-600"}`}>
                    {entry.priority}
                  </span>
                  {/* Mini per-product status dots */}
                  <div className="flex items-center gap-[0.2vw] bg-gray-50 border border-slate-400 rounded-full px-[0.45vw] py-[0.1vw]">
                    {allTabProducts.map((p, i) => {
                      const cfg = PROD_STATUS_CFG[getProductStatus(p)];
                      return <div key={i} title={`P${i+1}: ${cfg.label}`} className={`w-[0.52vw] h-[0.52vw] rounded-full ${cfg.dot}`} />;
                    })}
                    <span className="text-[0.6vw] text-gray-400 ml-[0.2vw]">{resolvedCount}/{totalProducts}</span>
                  </div>
                </div>
                <div className="flex items-center gap-[0.6vw] mt-[0.2vw] text-[0.72vw] text-gray-500">
                  <span className="flex items-center gap-[0.25vw]"><User className="w-[0.75vw] h-[0.75vw]" />{entry.customerName}</span>
                  <span className="flex items-center gap-[0.25vw]"><Shield className="w-[0.75vw] h-[0.75vw]" />{entry.currentEngineerName} ({entry.currentDepartment})</span>
                  {entry.contactPerson && (
                    <span className="flex items-center gap-[0.25vw] text-gray-400">
                      <User className="w-[0.65vw] h-[0.65vw]" />Contact: {entry.contactPerson}
                      {entry.contactNumber && ` · ${entry.contactNumber}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              {timer && entry.status !== "Resolved" && (
                <div className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.3vw] rounded-[0.4vw] font-mono text-[0.78vw] font-bold ${timer.isExpired ? "bg-red-100 text-red-600 animate-pulse" : timer.isUrgent ? "bg-orange-100 text-orange-600 animate-pulse" : "bg-blue-50 text-blue-600"}`}>
                  <Clock className="w-[0.82vw] h-[0.82vw]" />{timer.isExpired ? "ESCALATING" : timer.remainingFormatted}
                </div>
              )}
              {isExpanded ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
            </div>
          </div>
        </div>

        {/* ── Expanded body ── */}
        {isExpanded && (
          <div className="border-t border-slate-400 bg-gray-50/60">

            {/* Take Call Button */}
            {isCurrentOwner && !entry._taken && (
              <div className="p-[0.8vw] bg-orange-50 border-b border-orange-200 flex justify-between items-center">
                <span className="text-[0.8vw] text-orange-800 font-semibold flex items-center gap-[0.4vw]">
                  <Shield className="w-[1vw] h-[1vw]" />
                  You must take this call to start working and pause escalations.
                </span>
                <button onClick={() => onTakeCall(entry.callId)} className="bg-orange-600 hover:bg-orange-700 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] text-[0.8vw] font-bold shadow-sm transition-all">
                  Take Call
                </button>
              </div>
            )}

            {/* Product tab bar — only when multiple open products */}
            {openProducts.length > 1 && (
              <div className="flex border-b border-slate-400 bg-white px-[0.8vw] pt-[0.5vw] gap-[0.25vw] overflow-x-auto">
                {openProducts.map(({ p: prod, i: realIdx }, tabIdx) => {
                  const cfg      = PROD_STATUS_CFG[getProductStatus(prod)];
                  const isActive = clampedIdx === tabIdx;
                  return (
                    <button key={realIdx} type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveProductIdx(tabIdx); }}
                      className={`flex items-center gap-[0.3vw] px-[0.75vw] py-[0.45vw] rounded-t-[0.4vw] border-b-2 text-[0.72vw] font-semibold cursor-pointer whitespace-nowrap transition-all ${isActive ? "border-blue-500 text-blue-700 bg-blue-50/80" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                      <div className={`w-[0.5vw] h-[0.5vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <Layers className="w-[0.72vw] h-[0.72vw]" />
                      <span>P{realIdx + 1}</span>
                      <span className="text-[0.62vw] max-w-[5vw] truncate text-gray-400">{prod.productModel || prod.itemCode || ""}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active product detail — only open (non-handled) products reach here */}
            {openProducts.length === 0 ? (
              <div className="p-[0.8vw]">
                <div className="bg-gray-50 border border-slate-400 rounded-[0.4vw] px-[0.8vw] py-[0.6vw] text-center text-[0.78vw] text-gray-400">
                  All products have been handled — check the Pending or Support tabs.
                </div>
              </div>
            ) : activeProd ? (
              <div className="p-[0.8vw] space-y-[0.6vw]">

                {/* Product info card */}
                <div className="rounded-[0.5vw] border p-[0.75vw] bg-white border-slate-400">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-[0.55vw]">
                      <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-blue-500 flex items-center justify-center text-[0.6vw] font-bold text-white flex-shrink-0">
                        {safeActiveIdx + 1}
                      </div>
                      <div>
                        <div className="text-[0.82vw] font-bold text-gray-800">{activeProd.productModel || activeProd.itemCode || `Product ${safeActiveIdx + 1}`}</div>
                        <div className="flex items-center gap-[0.4vw] mt-[0.12vw] flex-wrap">
                          {activeProd.serialNumber   && <span className="text-[0.65vw] text-gray-400 font-mono">SN: {activeProd.serialNumber}</span>}
                          {activeProd.warrantyStatus && <Badge label={activeProd.warrantyStatus} color={activeProd.warrantyStatus === "In Warranty" ? "green" : "red"} />}
                          {activeProd.errorCode      && <span className="text-[0.63vw] font-mono bg-red-50 text-red-600 border border-red-200 px-[0.35vw] py-[0.04vw] rounded">{activeProd.errorCode}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-[0.2vw]">
                      {(() => { const cfg = PROD_STATUS_CFG[getProductStatus(activeProd)]; return <span className={`text-[0.63vw] px-[0.45vw] py-[0.12vw] rounded-full border font-bold ${cfg.cls}`}>{cfg.label}</span>; })()}
                      {activeProd._escalationLevel !== undefined && (
                        <span className={`text-[0.58vw] px-[0.35vw] rounded font-bold text-white ${activeProd._escalationLevel === 0 ? "bg-blue-500" : activeProd._escalationLevel === 1 ? "bg-yellow-500" : "bg-red-500"}`}>
                          L{activeProd._escalationLevel + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeProd.callDescription && (
                    <div className="text-[0.7vw] text-gray-600 bg-gray-50 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] mt-[0.4vw] border border-slate-400">
                      <strong>Issue:</strong> {activeProd.callDescription}
                    </div>
                  )}

                  {activeProd._escalationHistory?.length > 0 && (
                    <div className="mt-[0.5vw] pt-[0.4vw] border-t border-slate-400">
                      <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.25vw]">Product Escalation Trail</div>
                      {activeProd._escalationHistory.map((h, hi) => (
                        <div key={hi} className="flex items-center gap-[0.4vw] text-[0.67vw] py-[0.1vw]">
                          <span className={`px-[0.32vw] rounded text-[0.56vw] font-bold text-white ${hi === 0 ? "bg-blue-500" : hi === 1 ? "bg-yellow-500" : "bg-red-500"}`}>L{hi+1}</span>
                          <span className="text-gray-600 font-medium">{h.department}</span>
                          <span className="text-gray-400">→ {h.engineerName}</span>
                          <span className="text-gray-300 ml-auto text-[0.62vw]">{new Date(h.assignedAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Request Support button */}
                {(isCurrentOwner || isCritical) && activeProductIsActionable && isCurrentOwner && (
                  <div className="flex gap-[0.4vw] flex-wrap">
                    <button onClick={() => setPM(safeActiveIdx, "support", true)}
                      className="flex items-center gap-[0.25vw] bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 px-[0.75vw] py-[0.35vw] rounded-[0.3vw] text-[0.72vw] font-semibold cursor-pointer">
                      <HelpCircle className="w-[0.8vw] h-[0.8vw]" />Request Support
                    </button>
                  </div>
                )}

                {/* Closure panel — always shown for open products */}
                {(isCurrentOwner || isCritical) && (
                  <ProductClosurePanel
                    prod={activeProd}
                    prodIdx={safeActiveIdx}
                    entry={entry}
                    currentUser={currentUser}
                    hidePending={false}
                    onAssignFieldVisit={(form, pIdx) => onAssignFieldVisit(form, pIdx)}
                    onProductClose={(pIdx, data)     => onProductClose(pIdx, data)}
                  />
                )}
              </div>
            ) : null}

            {/* Call-level escalation timeline */}
            {isCurrentOwner && entry.escalationHistory?.length > 0 && (
              <div className="mx-[0.8vw] mb-[0.8vw] bg-white rounded-[0.4vw] border border-slate-400 p-[0.7vw]">
                <h4 className="text-[0.75vw] font-bold text-gray-600 flex items-center gap-[0.3vw] mb-[0.5vw]">
                  <History className="w-[0.82vw] h-[0.82vw] text-purple-500" />Call Escalation Timeline
                </h4>
                {entry.escalationHistory.map((hist, idx) => (
                  <div key={idx} className="flex gap-[0.5vw] mb-[0.5vw] last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-[1.3vw] h-[1.3vw] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[0.55vw] font-bold ${hist.level === 0 ? "bg-blue-500" : hist.level === 1 ? "bg-yellow-500" : "bg-red-500"}`}>
                        {hist.level + 1}
                      </div>
                      {idx < entry.escalationHistory.length - 1 && <div className="w-[0.1vw] flex-1 bg-gray-200 my-[0.1vw]" />}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-[0.35vw] p-[0.45vw] border border-slate-400">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[0.75vw] font-bold text-gray-700">{hist.department}</span>
                          <span className="text-[0.68vw] text-gray-500 ml-[0.35vw]">→ {hist.engineerName}</span>
                        </div>
                        <span className="text-[0.64vw] text-gray-400">{new Date(hist.assignedAt).toLocaleString()}</span>
                      </div>
                      {hist.reason && <p className="text-[0.67vw] text-orange-600 mt-[0.15vw] flex items-center gap-[0.2vw]"><AlertTriangle className="w-[0.65vw] h-[0.65vw]" />{hist.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {productModals[safeActiveIdx]?.support && (
        <SupportEscalationModal product={activeProd} entry={entry} currentUser={currentUser}
          onClose={() => setPM(safeActiveIdx, "support", false)}
          onConfirm={(d) => { onSupportRequest(safeActiveIdx, d); setPM(safeActiveIdx, "support", false); }} />
      )}
    </>
  );
};

// ── Visits Tab ────────────────────────────────────────────────────────────────
const VisitsTab = ({ type, currentUser, onAssignVisit }) => {
  const key = FIELD_VISIT_KEY;
  const [records, setRecords]   = useState([]);
  const [queue, setQueueLocal]  = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("assigned");

  useEffect(() => {
    const ld = () => { setRecords(load(key, [])); setQueueLocal(loadQ()); };
    ld(); const iv = setInterval(ld, 2000); return () => clearInterval(iv);
  }, [key]);

  const mine = records.filter(r => r.assignedTo === currentUser?.userId || r.assignedBy === currentUser?.userId);

  const openCalls = useMemo(() => {
    const uid = currentUser?.userId;
    if (!uid) return [];
    return queue.filter(e => {
      const isAssigned = e.currentEngineerId === uid;
      const isOpen     = ["Assigned", "Pending", "Escalated"].includes(e.status);
      const hasRecord  = records.some(r => r.callId === e.callId);
      return isAssigned && isOpen && !hasRecord;
    });
  }, [queue, records, currentUser]);

  const handleSaveCompletion = (recId, formData) => {
    const updated = records.map(r => r.id === recId ? { ...r, ...formData } : r);
    save(key, updated); setRecords(updated);
    if (formData.visitStatus === "Closed") {
      const q   = loadQ();
      const rec = records.find(r => r.id === recId);
      const upd = q.map(e => {
        if (e.callId !== rec?.callId) return e;
        const products = e.products?.map((p, i) => {
          if (rec.productIdx !== null && rec.productIdx !== undefined && i !== rec.productIdx) return p;
          return { ...p, _resolved: true, _resolutionType: formData.resolutionType, _resolutionRemarks: formData.resolutionRemarks, _resolvedAt: formData.closedAt };
        });
        const allDone = products.every(p => p._resolved || p._productClosure?.closedAt);
        return { ...e, products, status: allDone ? "Resolved" : e.status };
      });
      saveQ(upd);
    }
  };

  return (
    <div className="mt-[0.5vw]">
      <div className="flex gap-[0.3vw] mb-[0.8vw] bg-white border border-slate-400 rounded-[0.5vw] p-[0.25vw]">
        <button onClick={() => setViewMode("assigned")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${viewMode === "assigned" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <MapPin className="w-[0.85vw] h-[0.85vw]" />Assigned Records
          {mine.length > 0 && (
            <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${viewMode === "assigned" ? "bg-white text-blue-600" : "bg-gray-200 text-gray-600"}`}>{mine.length}</span>
          )}
        </button>
        <button onClick={() => setViewMode("open")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${viewMode === "open" ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <AlertCircle className="w-[0.85vw] h-[0.85vw]" />Open Calls
          {openCalls.length > 0 && (
            <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${viewMode === "open" ? "bg-white text-orange-500" : "bg-orange-100 text-orange-600"}`}>{openCalls.length}</span>
          )}
        </button>
      </div>

      {viewMode === "assigned" && (
        mine.length === 0
          ? (
            <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400">
              <MapPin className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
              <p className="text-[1vw] text-gray-400 font-medium">No field visit records</p>
            </div>
          ) : (
            <div className="space-y-[0.8vw]">
              {mine.map(rec => {
                const isExp      = expanded === rec.id;
                const isClosed   = rec.visitStatus === "Closed";
                const isAssignee = rec.assignedTo === currentUser?.userId;
                return (
                  <div key={rec.id} className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${isClosed ? "border-green-300" : "border-blue-200"}`}>
                    <div className="p-[0.9vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : rec.id)}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-[0.7vw]">
                          <div className={`w-[2vw] h-[2vw] rounded-full flex items-center justify-center flex-shrink-0 ${isClosed ? "bg-green-500" : "bg-blue-500"}`}>
                            {isClosed ? <CheckCircle className="w-[1.1vw] h-[1.1vw] text-white" /> : <MapPin className="w-[1vw] h-[1vw] text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-[0.4vw]">
                              <span className="font-mono text-[0.85vw] font-bold text-gray-800">{rec.callNumber}</span>
                              <Badge label={isClosed ? "Completed" : "Open"} color={isClosed ? "green" : "blue"} />
                              {!isAssignee && <Badge label="Assigned by you" color="gray" />}
                              {rec.productIdx !== null && rec.productIdx !== undefined && (
                                <Badge label={`P${rec.productIdx + 1}`} color="blue" />
                              )}
                            </div>
                            <div className="text-[0.72vw] text-gray-500 mt-[0.15vw]">
                              {rec.customerName} · To: <strong>{rec.assignedToName}</strong>
                              {rec.visitDate && ` · ${rec.visitDate}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-[0.5vw]">
                          <span className="text-[0.68vw] text-gray-400">{new Date(rec.assignmentDate).toLocaleString()}</span>
                          {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                        </div>
                      </div>
                    </div>
                    {isExp && (
                      <div className="border-t border-slate-400 p-[0.9vw] bg-gray-50">
                        <VisitCompletionForm record={rec} type="Field Visit" currentUser={currentUser}
                          onSave={(formData) => handleSaveCompletion(rec.id, formData)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
      )}

      {viewMode === "open" && (
        openCalls.length === 0
          ? (
            <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400">
              <CheckCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
              <p className="text-[1vw] text-gray-400 font-medium">All calls covered</p>
            </div>
          ) : (
            <div className="space-y-[0.6vw]">
              {openCalls.map(entry => {
                const isExp = expanded === ("open-" + entry.callId);
                return (
                  <div key={entry.callId} className="bg-white rounded-[0.5vw] border border-orange-200 overflow-hidden hover:shadow-md transition-all">
                    <div className="p-[0.8vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : ("open-" + entry.callId))}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-[0.6vw]">
                          <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-[1vw] h-[1vw] text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-[0.4vw]">
                              <span className="font-mono text-[0.85vw] font-bold text-gray-800">{entry.callNumber}</span>
                              <Badge label={entry.status} color={entry.status === "Escalated" ? "orange" : "blue"} />
                            </div>
                          </div>
                        </div>
                        {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                      </div>
                    </div>
                    {isExp && (
                      <div className="border-t border-orange-100 p-[0.8vw] bg-orange-50/30 space-y-[0.6vw]">
                        {entry.products?.map((prod, pIdx) => {
                          if (prod._resolved || prod._productClosure?.closedAt) return null;
                          return (
                            <div key={pIdx} className="bg-white rounded-[0.4vw] border border-slate-400 p-[0.6vw]">
                              <AssignVisitModal type="Field Visit" entry={entry} product={prod} currentUser={currentUser}
                                inlineMode={true} onClose={() => setExpanded(null)}
                                onSave={(form) => {
                                  if (onAssignVisit) onAssignVisit(entry.callId, "Field Visit", form, pIdx);
                                  setExpanded(null); setViewMode("assigned");
                                }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
};

// ── Received Goods Tab ──────────────────────────────────────────────────────────
const ReceivedGoodsTab = ({ currentUser }) => {
  const records = load(RECEIVED_PRODS_KEY, []).filter(r => r.assignedTo === currentUser?.userId);

  return (
    <div className="space-y-[1vw]">
      <div className="bg-white rounded-[0.6vw] p-[1.2vw] border border-slate-400">
        <div className="flex justify-between items-center mb-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            <Package className="w-[1.2vw] h-[1.2vw] text-purple-600" />
            <h2 className="text-[1.1vw] font-bold text-gray-800">Products to be Received</h2>
          </div>
          <span className="text-[0.8vw] text-gray-400">{records.length} items expected</span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-[3vw] text-gray-300">
            <Package className="w-[2vw] h-[2vw] mx-auto opacity-20 mb-[0.5vw]" />
            <p className="text-[0.9vw]">No incoming products for your current queue</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[0.8vw]">
            {records.map(rec => (
              <div key={rec.id} className="border border-slate-400 rounded-[0.5vw] p-[0.8vw] flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div>
                  <div className="text-[0.85vw] font-bold text-gray-700">{rec.callNumber} • {rec.customerName}</div>
                  <div className="text-[0.75vw] text-purple-600 font-semibold mt-[0.1vw]">
                    Expected: {rec.product?.productModel}
                  </div>
                  <div className="text-[0.7vw] text-gray-400 mt-[0.2vw]">
                    Materials: {rec.materialDetails || "None provided"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-[0.3vw]">
                   <span className="text-[0.7vw] font-bold text-gray-400">MARK AS RECEIVED</span>
                   <button onClick={() => {
                     const all = load(RECEIVED_PRODS_KEY, []);
                     const updated = all.filter(a => a.id !== rec.id);
                     save(RECEIVED_PRODS_KEY, updated);
                     window.dispatchEvent(new Event("storage_v1"));
                     alert("Product marked as received.");
                   }} className="p-[0.4vw] bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer">
                     <CheckCircle className="w-[1vw] h-[1vw]" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Support Request Action Panel ──────────────────────────────────────────────
const SupportReqActionPanel = ({ req, currentUser, onDone }) => {
  const [action, setAction]         = useState(""); 
  const [resolutionType, setResType] = useState("Fixed");
  const [remarks, setRemarks]        = useState("");

  const fakeEntry = {
    callId: req.callId, callNumber: req.callNumber,
    customerName: req.product?.customerName || "",
    contactPerson: req.contactPerson || "", contactNumber: req.contactNumber || "",
    emailId: req.emailId || "", location: req.location || "",
    currentDepartment: currentUser?.department || "",
  };
  const fakeProduct = req.product || {};

  const markReqStatus = (updates) => {
    const all = load(SUPPORT_REQ_KEY, []);
    const updated = all.map(r => r.id === req.id ? { ...r, ...updates } : r);
    save(SUPPORT_REQ_KEY, updated);
    onDone();
  };

  const handleClose = () => {
    if (!remarks.trim()) { alert("Please enter closure remarks."); return; }
    markReqStatus({
      status: "Resolved",
      resolvedAt: new Date().toISOString(),
      resolutionNotes: remarks,
      resolutionType,
      closureType: "Direct",
    });
    const q = loadQ();
    const upd = q.map(e => {
      if (e.callId !== req.callId) return e;
      const products = e.products?.map((p, i) => {
        if (i !== req.productIdx) return p;
        return { ...p, _productClosure: { status: "Closed", closureType: "Direct", resolutionType, remarks, closedAt: new Date().toISOString() } };
      });
      const allDone = products.every(p => p._resolved || p._productClosure?.closedAt);
      return { ...e, products, status: allDone ? "Resolved" : e.status };
    });
    saveQ(upd);
  };

  const handleAssignVisit = (type, form) => {
    const records = load(FIELD_VISIT_KEY, []);
    records.push({
      id: Date.now(), callId: req.callId, callNumber: req.callNumber,
      customerName: req.product?.customerName || "",
      products: [fakeProduct], productIdx: req.productIdx,
      assignedTo: form.assignedTo, assignedToName: form.assignedToName,
      assignedBy: currentUser?.userId, assignedByName: currentUser?.name,
      assignmentDate: form.assignmentDate, visitDate: form.visitDate,
      diagnosisSummary: form.diagnosisSummary,
      spareRequired: form.spareRequired, spareUsedDetails: form.spareUsedDetails,
      visitStatus: "Open", type, createdAt: new Date().toISOString(),
      contactPerson: req.contactPerson || "", contactNumber: req.contactNumber || "",
      emailId: req.emailId || "", location: req.location || "",
    });
    save(FIELD_VISIT_KEY, records);
    markReqStatus({ status: `${type} Assigned`, assignedVisitAt: new Date().toISOString(), assignedVisitTo: form.assignedToName });
  };

  const isResolved = ["Resolved", "Field Visit Assigned", "Escalated Further"].includes(req.status);

  if (isResolved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-[0.4vw] p-[0.6vw]">
        <p className="text-[0.75vw] font-bold text-green-700 mb-[0.2vw]">{req.status}</p>
        <p className="text-[0.75vw] text-green-800">{req.resolutionNotes || `Assigned to: ${req.assignedVisitTo || req.escalatedTo || ""}`}</p>
      </div>
    );
  }

  return (
    <div className="space-y-[0.5vw]">
      <div className="grid divide-x divide-gray-200 border border-slate-400 rounded-[0.4vw] overflow-hidden" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { key: "close",    label: "Close",         emoji: "✓",  cls: "bg-green-600 text-white",  hov: "hover:bg-green-50 text-gray-600"   },
          { key: "fv",       label: "Field Visit",    emoji: "📍", cls: "bg-blue-600 text-white",   hov: "hover:bg-blue-50 text-gray-600"    },
          { key: "received", label: "Receive Good",   emoji: "📦", cls: "bg-purple-600 text-white", hov: "hover:bg-purple-50 text-gray-600"  },
        ].map(({ key, label, emoji, cls, hov }) => (
          <button key={key} type="button" onClick={() => setAction(action === key ? "" : key)}
            className={`py-[0.5vw] text-[0.68vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.25vw] border-b border-slate-400 transition-all ${action === key ? cls : `bg-gray-50 ${hov}`}`}>
            <span className="text-[0.75vw]">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {action === "close" && (
        <div className="p-[0.6vw] border border-green-200 rounded-[0.4vw] bg-green-50/40 space-y-[0.4vw]">
          <div className="text-[0.65vw] font-bold text-gray-400 uppercase tracking-wider">Resolution Type</div>
          <div className="grid grid-cols-2 gap-[0.3vw]">
            {["Fixed","Replaced","No Fault Found","Partially Fixed"].map(t => (
              <button key={t} type="button" onClick={() => setResType(t)}
                className={`py-[0.35vw] rounded-[0.3vw] border text-[0.68vw] font-medium cursor-pointer ${resolutionType === t ? "bg-green-600 text-white border-green-600" : "bg-white border-slate-400 text-gray-600 hover:border-green-300"}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Closure remarks…"
            className="w-full border border-slate-400 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none focus:border-green-400 bg-white" />
          <button onClick={handleClose}
            className="w-full py-[0.42vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.3vw]">
            <CheckCircle className="w-[0.75vw] h-[0.75vw]" />Confirm Close
          </button>
        </div>
      )}
      {action === "fv" && (
        <AssignVisitModal type="Field Visit" entry={fakeEntry} product={fakeProduct} currentUser={currentUser}
          inlineMode onClose={() => setAction("")}
          onSave={f => { handleAssignVisit("Field Visit", f); setAction(""); }} />
      )}
      {action === "received" && (
        <div className="p-[0.6vw] border border-purple-200 rounded-[0.4vw] bg-purple-50 space-y-[0.35vw]">
          <div className="text-[0.65vw] font-bold text-gray-400 uppercase">Mark as Received</div>
          <button onClick={() => {
            const all = load(RECEIVED_PRODS_KEY, []);
            all.push({ id: Date.now(), ...req, assignedTo: currentUser?.userId });
            save(RECEIVED_PRODS_KEY, all);
            setAction("");
          }} className="w-full py-[0.4vw] bg-purple-600 hover:bg-purple-700 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer">
            Confirm Reception
          </button>
        </div>
      )}
    </div>
  );
};

// ── Support Requests Tab ──────────────────────────────────────────────────────
const SupportRequestsTab = ({ currentUser }) => {
  const [reqs, setReqs]         = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [subTab, setSubTab]     = useState("assigned");
  const reload = () => setReqs(load(SUPPORT_REQ_KEY, []));

  const DONE_STATUSES = ["Resolved","Field Visit Assigned","Escalated Further"];

  useEffect(() => {
    reload(); const iv = setInterval(reload, 2000); return () => clearInterval(iv);
  }, []);

  const assignedToMe = reqs.filter(r => r.supportPerson?.userId === currentUser?.userId);
  const raisedByMe   = reqs.filter(r => r.requestedById === currentUser?.userId);

  const activeList = subTab === "assigned" ? assignedToMe : raisedByMe;

  return (
    <div className="mt-[0.5vw]">
      <div className="flex gap-[0.3vw] mb-[0.8vw] bg-white border border-slate-400 rounded-[0.5vw] p-[0.25vw]">
        <button onClick={() => setSubTab("assigned")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${subTab === "assigned" ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <HelpCircle className="w-[0.85vw] h-[0.85vw]" />Request Assigned
        </button>
        <button onClick={() => setSubTab("raised")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${subTab === "raised" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <Send className="w-[0.85vw] h-[0.85vw]" />Request Raised
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400">
          <HelpCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
          <p className="text-[1vw] text-gray-400 font-medium">No requests</p>
        </div>
      ) : (
        <div className="space-y-[0.7vw]">
          {activeList.map(req => {
            const isExp      = expanded === req.id;
            const isDone     = DONE_STATUSES.includes(req.status);
            return (
              <div key={req.id} className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${isDone ? "border-green-300" : "border-orange-300"}`}>
                <div className="p-[0.9vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : req.id)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-[0.6vw]">
                      <div className={`w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-500" : "bg-orange-500"}`}>
                        {isDone ? <CheckCircle className="w-[1vw] h-[1vw] text-white" /> : <HelpCircle className="w-[1vw] h-[1vw] text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-[0.4vw]">
                          <span className="font-mono text-[0.85vw] font-bold text-gray-800">{req.callNumber}</span>
                          <Badge label={req.status || "Pending"} color={isDone ? "green" : "orange"} />
                        </div>
                      </div>
                    </div>
                    {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                  </div>
                </div>
                {isExp && (
                  <div className="border-t border-slate-400 p-[0.9vw] bg-gray-50 space-y-[0.6vw]">
                    {subTab === "assigned"
                      ? <SupportReqActionPanel req={req} currentUser={currentUser} onDone={reload} />
                      : <div className="bg-gray-50 border border-slate-400 rounded-[0.4vw] p-[0.6vw] text-[0.75vw] text-gray-500 italic">Status: {req.status}</div>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Pending Tab ───────────────────────────────────────────────────────────────
const PendingTab = ({ queue, currentUser, onAssignFieldVisit }) => {
  const uid = currentUser?.userId;
  const [expanded, setExpanded] = useState(null);

  const pendingItems = useMemo(() => {
    if (!uid) return [];
    return queue.filter(e =>
      e.currentEngineerId === uid &&
      e.products?.some(p => p._productClosure?.status === "Pending")
    );
  }, [queue, uid]);

  if (pendingItems.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400 mt-[1vw]">
      <CheckCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400 font-medium">No pending items</p>
    </div>
  );

  return (
    <div className="mt-[0.5vw] space-y-[0.7vw]">
      {pendingItems.map(entry => {
        const isExp      = expanded === entry.callId;
        const pendingProds = entry.products?.filter(p => p._productClosure?.status === "Pending") || [];

        return (
          <div key={entry.callId} className="bg-white rounded-[0.6vw] border border-yellow-300 overflow-hidden hover:shadow-md transition-all">
            <div className="px-[1vw] py-[0.7vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : entry.callId)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-[0.7vw]">
                  <div className="w-[2vw] h-[2vw] rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-[1vw] h-[1vw] text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-[0.4vw]">
                      <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.callNumber}</span>
                      <Badge label="Products Pending" color="yellow" />
                    </div>
                  </div>
                </div>
                {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
              </div>
            </div>
            {isExp && (
              <div className="border-t border-yellow-100 bg-yellow-50/20 p-[0.9vw] space-y-[0.6vw]">
                {pendingProds.map((prod) => {
                  const realIdx = entry.products.findIndex(p => p === prod);
                  return (
                    <div key={realIdx} className="rounded-[0.4vw] border border-yellow-200 bg-yellow-50/40 p-[0.6vw]">
                      <div className="text-[0.8vw] font-bold text-gray-700 mb-[0.3vw]">{prod.productModel || prod.itemCode}</div>
                      <AssignVisitModal type="Field Visit" entry={entry} product={prod} currentUser={currentUser}
                        inlineMode onClose={() => setExpanded(null)}
                        onSave={(form) => onAssignFieldVisit(entry.callId, "Field Visit", form, realIdx)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Reports Tab ───────────────────────────────────────────────────────────────
const ReportsTab = ({ currentUser }) => {
  const [detailRec, setDetailRec]       = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const allRecords = useMemo(() => {
    const uid = currentUser?.userId;
    if (!uid) return [];
    const q        = loadQ();
    const suppReqs = load(SUPPORT_REQ_KEY, []);
    const fvs      = load(FIELD_VISIT_KEY, []);
    const seen = new Set(); const result = [];
    q.forEach(e => {
      const wasInvolved =
        e.currentEngineerId === uid ||
        fvs.some(f => f.callId === e.callId && (f.assignedTo === uid || f.assignedBy === uid)) ||
        suppReqs.some(s => s.callId === e.callId && (s.requestedById === uid || s.supportPerson?.userId === uid));
      if (wasInvolved && !seen.has(e.callId)) {
        seen.add(e.callId);
        result.push({
          ...e,
          _fieldVisits:    fvs.filter(f => f.callId === e.callId),
          _supportReqs:    suppReqs.filter(s => s.callId === e.callId),
        });
      }
    });
    return result.sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  }, [currentUser]);

  const statusCounts = useMemo(() => {
    const counts = { All: allRecords.length };
    allRecords.forEach(r => { const s = r.status === "Critical_Unresolved" ? "Critical" : r.status; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [allRecords]);

  const filteredRecords = useMemo(() => allRecords.filter(r => {
    const matchStatus = statusFilter === "All" || r.status === statusFilter || (statusFilter === "Critical" && r.status === "Critical_Unresolved");
    const q = search.toLowerCase();
    const matchSearch = !q || r.callNumber?.toLowerCase().includes(q) || r.customerName?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [allRecords, statusFilter, search]);

  if (allRecords.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400 mt-[1vw]">
      <BarChart2 className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400 font-medium">No records found</p>
    </div>
  );

  return (
    <div className="mt-[0.5vw]">
      <div className="flex items-center gap-[0.8vw] mb-[0.8vw]">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer, call no…"
          className="flex-1 border border-gray-400 rounded-[0.4vw] px-[0.8vw] py-[0.45vw] text-[0.8vw] outline-none focus:border-blue-400 bg-white" />
      </div>
      <div className="bg-white rounded-[0.5vw] border border-slate-400 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-slate-400">
              {["Call No","Customer","Status","View"].map(h => (
                <th key={h} className="px-[0.7vw] py-[0.6vw] text-left text-[0.72vw] font-bold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map((rec) => (
              <tr key={rec.callId} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-[0.7vw] py-[0.6vw]"><span className="text-[0.78vw] font-bold text-blue-600 font-mono">{rec.callNumber}</span></td>
                <td className="px-[0.7vw] py-[0.6vw] text-[0.78vw] font-bold text-gray-800">{rec.customerName}</td>
                <td className="px-[0.7vw] py-[0.6vw]"><Badge label={rec.status} color="gray" /></td>
                <td className="px-[0.7vw] py-[0.6vw]">
                  <button onClick={() => setDetailRec(rec)} className="bg-blue-600 text-white px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.72vw] font-semibold cursor-pointer">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detailRec && <ReportDetailsModal rec={detailRec} onClose={() => setDetailRec(null)} />}
    </div>
  );
};

// ── Main EscalationPage ───────────────────────────────────────────────────────
const EscalationPage = () => {
  const { timers, resolveCall } = useEscalationWorker();
  const [queue, setQueue]           = useState([]);
  const [activeTab, setActiveTab]   = useState("escalation");
  const [expandedCall, setExpanded] = useState(null);
  const [loggedInUser, setUser]     = useState(null);
  const notifiedRef = useRef({ critical: new Set(), escalated: new Set() });

  useEffect(() => {
    try {
      if (Notification.permission === "default") Notification.requestPermission();
    } catch {}
    const u = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    if (u) setUser(u);
  }, []);

  useEffect(() => {
    const ld = () => setQueue(loadQ());
    ld(); const iv = setInterval(ld, 1000); 
    return () => clearInterval(iv);
  }, []);

  // Poll working_employees_v1 from backend every 5s
  useEffect(() => {
    const fetchWE = async () => {
      try {
        const res = await axios.get(`${API_URL}/master/settings/WORKING_EMPLOYEES_V1`);
        if (res.data?.value && Array.isArray(res.data.value)) {
          save("working_employees_v1", res.data.value);
        }
      } catch (e) {
        // silently fallback to localStorage
      }
    };
    fetchWE();
    const iv = setInterval(fetchWE, 5000);
    return () => clearInterval(iv);
  }, []);

  // Helper to sync working employees to backend
  const syncWorkingEmployees = async (newWE) => {
    save("working_employees_v1", newWE);
    try {
      await axios.post(`${API_URL}/master/settings`, { key: "WORKING_EMPLOYEES_V1", value: newWE });
    } catch (e) {
      console.error("Failed to sync working employees to backend", e);
    }
  };

  useEffect(() => {
    if (!loggedInUser || Notification.permission !== "granted") return;
    queue.forEach(e => {
      const k = `${e.callId}-${e.currentLevel}`;
      if (e.status === "Critical_Unresolved" && !notifiedRef.current.critical.has(e.callId)) {
        notifiedRef.current.critical.add(e.callId);
        try { new Notification(`🚨 CRITICAL: ${e.callNumber}`, { body: `All levels exhausted! ${e.customerName}`, tag: `crit-${e.callId}`, renotify: true }); } catch {}
      }
      if (e.status === "Escalated" && e.currentEngineerId === loggedInUser.userId && !notifiedRef.current.escalated.has(k)) {
        notifiedRef.current.escalated.add(k);
        try { new Notification(`📢 Escalated: ${e.callNumber}`, { body: `Customer: ${e.customerName}`, tag: `esc-${k}`, renotify: true }); } catch {}
      }
    });
  }, [queue, loggedInUser]);

  const isMovedOut = (e) =>
    e.products?.length > 0 &&
    e.products.every(p =>
      p._resolved ||
      p._productClosure?.status === "Closed" ||
      p._productClosure?.status === "Pending" ||
      p._supportRequested
    );

  const myEscalations = useMemo(() => {
    const uid     = loggedInUser?.userId;
    const isAdmin = loggedInUser?.department === "Admin";
    return queue.filter(e => {
      if (!isAdmin && e.currentEngineerId !== uid) return false;
      if (isMovedOut(e)) return false;
      return true;
    });
  }, [queue, loggedInUser]);

  const liveCounts = useMemo(() => ({
    escalation: myEscalations.length,
    support:    load(SUPPORT_REQ_KEY, []).filter(r => r.supportPerson?.userId === loggedInUser?.userId && r.status !== "Resolved").length,
    fieldVisit: load(FIELD_VISIT_KEY, []).filter(r => r.assignedTo === loggedInUser?.userId && r.visitStatus !== "Closed").length,
    received:   load(RECEIVED_PRODS_KEY, []).filter(r => r.assignedTo === loggedInUser?.userId).length,
    pending:    queue.filter(e => e.currentEngineerId === loggedInUser?.userId && e.products?.some(p => p._productClosure?.status === "Pending")).length,
  }), [queue, loggedInUser, myEscalations]);

  const updateQueue = (callId, updater) => {
    const upd = loadQ().map(e => e.callId === callId ? updater(e) : e);
    saveQ(upd); setQueue(upd);
  };

  // ── Request support for a single product ──────────────────────────────────
  const handleSupportRequest = (callId, pIdx, data) => {
    const q     = loadQ();
    const entry = q.find(e => e.callId === callId);
    if (!entry) return;
    const product = entry.products[pIdx];

    const checkRelease = (allReassigned) => {
      if (allReassigned && loggedInUser) {
        const we = load("working_employees_v1", []);
        const upd = we.filter(id => id !== loggedInUser.userId);
        syncWorkingEmployees(upd);
      }
    };

    // Save support request — include contact person details
    const reqs = load(SUPPORT_REQ_KEY, []);
    reqs.push({
      id: Date.now(), callId, callNumber: entry.callNumber,
      product, productIdx: pIdx,
      requestedById:   loggedInUser?.userId,
      requestedByName: loggedInUser?.name,
      supportPerson:   data.supportPerson,
      notes:           data.notes,
      status:          "Pending",
      createdAt:       new Date().toISOString(),
      // Contact person details carried forward
      contactPerson:  entry.contactPerson  || "",
      contactNumber:  entry.contactNumber  || "",
      emailId:        entry.emailId        || "",
      location:       entry.location       || "",
    });
    save(SUPPORT_REQ_KEY, reqs);

    // Update product escalation only
    updateQueue(callId, e => {
      const products = e.products.map((p, i) => {
        if (i !== pIdx) return p;
        const prevHistory = p._escalationHistory || [];
        const newLevel    = prevHistory.length;
        return {
          ...p,
          _supportRequested:   true,
          _supportPersonId:    data.supportPerson.userId,
          _supportPersonName:  data.supportPerson.name,
          _currentDepartment:  data.supportPerson.department,
          _escalationLevel:    newLevel,
          _escalationHistory:  [
            ...prevHistory,
            {
              level:        newLevel,
              department:   data.supportPerson.department,
              engineerId:   data.supportPerson.userId,
              engineerName: data.supportPerson.name,
              assignedAt:   new Date().toISOString(),
              reason:       `Support by ${loggedInUser?.name}: ${data.notes.slice(0, 60)}`,
            },
          ],
        };
      });

      const allProductsReassigned = products.every(p => p._supportRequested || p._resolved || p._productClosure?.closedAt);
      checkRelease(allProductsReassigned);
      
      return {
        ...e,
        products,
        ...(allProductsReassigned ? {
          currentEngineerId:   data.supportPerson.userId,
          currentEngineerName: data.supportPerson.name,
          currentDepartment:   data.supportPerson.department,
          status: "Escalated",
          _taken: false, // Reset taken when escalated
          escalationHistory: [...(e.escalationHistory || []), {
            level:        (e.currentLevel || 0),
            department:   data.supportPerson.department,
            engineerId:   data.supportPerson.userId,
            engineerName: data.supportPerson.name,
            assignedAt:   new Date().toISOString(),
            reason:       `All products escalated`,
          }],
        } : { status: "Escalated" }),
      };
    });
  };

  // ── Assign field visit / serviceCenter for specific product ──────────────────────
  const handleAssignVisit = (callId, type, form, productIdx = null) => {
    const key   = type === "Field Visit" ? FIELD_VISIT_KEY : INHOUSE_REPAIR_KEY;
    const entry = loadQ().find(e => e.callId === callId);
    if (!entry) return;
    const linkedProducts = productIdx !== null ? [entry.products[productIdx]].filter(Boolean) : entry.products;
    const records = load(key, []);
    records.push({
      id:               Date.now(),
      callId,
      callNumber:       entry.callNumber,
      customerName:     entry.customerName,
      products:         linkedProducts,
      productIdx,
      assignedTo:       form.assignedTo,
      assignedToName:   form.assignedToName,
      assignedBy:       loggedInUser?.userId,
      assignedByName:   loggedInUser?.name,
      assignmentDate:   form.assignmentDate,
      visitDate:        form.visitDate,
      diagnosisSummary: form.diagnosisSummary,
      spareRequired:    form.spareRequired,
      spareUsedDetails: form.spareUsedDetails,
      visitStatus:      "Open",
      type,
      createdAt:        new Date().toISOString(),
      // Contact person details carried forward
      contactPerson:  entry.contactPerson  || "",
      contactNumber:  entry.contactNumber  || "",
      emailId:        entry.emailId        || "",
      location:       entry.location       || "",
    });
    save(key, records);
  };

  // ── Per-product closure ────────────────────────────────────────────────────
  const handleProductClose = (callId, pIdx, closureData) => {
    updateQueue(callId, e => {
      const products = e.products.map((p, i) => i === pIdx ? { ...p, _productClosure: closureData } : p);
      const allDone  = products.every(p => p._resolved || p._productClosure?.closedAt);
      
      if (allDone && loggedInUser) {
        const we = load("working_employees_v1", []);
        const upd = we.filter(id => id !== loggedInUser.userId);
        syncWorkingEmployees(upd);
      }
      
      return { ...e, products, status: allDone ? "Resolved" : e.status };
    });
  };

  const handleTakeCall = (callId) => {
    updateQueue(callId, (e) => ({ ...e, _taken: true }));
    if (loggedInUser) {
      const we = load("working_employees_v1", []);
      if (!we.includes(loggedInUser.userId)) {
        we.push(loggedInUser.userId);
        syncWorkingEmployees(we);
      }
    }
  };

  const tabs = [
    { id: "escalation", label: "Escalation",     icon: Shield,    color: "blue",   count: liveCounts.escalation },
    { id: "pending",    label: "Pending",         icon: AlertCircle, color: "yellow", count: liveCounts.pending },
    { id: "support",    label: "Support Requests",icon: HelpCircle,color: "orange", count: liveCounts.support },
    { id: "fieldvisit", label: "Field Visit",     icon: MapPin,    color: "blue",   count: liveCounts.fieldVisit },
    { id: "received",   label: "Received Goods",  icon: Package,   color: "green",  count: liveCounts.received },
    { id: "reports",    label: "Reports",         icon: BarChart2, color: "gray",   count: 0 },
  ];

  const TAB_ACTIVE = {
    blue:   "bg-blue-600 text-white shadow-sm",
    yellow: "bg-yellow-500 text-white shadow-sm",
    orange: "bg-orange-500 text-white shadow-sm",
    purple: "bg-purple-600 text-white shadow-sm",
    gray:   "bg-gray-600 text-white shadow-sm",
    green:  "bg-green-600 text-white shadow-sm",
  };
  const BADGE_ACTIVE = {
    blue: "bg-white text-blue-600", yellow: "bg-white text-yellow-600",
    orange: "bg-white text-orange-600", purple: "bg-white text-purple-600",
    gray: "bg-white text-gray-600", green: "bg-white text-green-600",
  };
  const BADGE_INACTIVE = {
    blue: "bg-blue-100 text-blue-700", yellow: "bg-yellow-100 text-yellow-700",
    orange: "bg-orange-100 text-orange-700", purple: "bg-purple-100 text-purple-700",
    gray: "bg-gray-100 text-gray-600", green: "bg-green-100 text-green-700",
  };

  return (
    <div className="flex flex-col h-full text-[0.85vw]">
      {/* Tab bar */}
      <div className="flex gap-[0.3vw] mb-[1vw] bg-white border border-slate-400 rounded-[0.6vw] p-[0.3vw] shadow-sm sticky top-0 z-10">
        {tabs.map(({ id, label, icon: Icon, color, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.5vw] rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer transition-all flex-1 justify-center ${activeTab === id ? TAB_ACTIVE[color] : "text-gray-600 hover:bg-gray-100"}`}>
            <Icon className="w-[0.88vw] h-[0.88vw]" />
            {label}
            {count > 0 && (
              <span className={`text-[0.6vw] px-[0.4vw] py-[0.04vw] rounded-full font-bold ${activeTab === id ? BADGE_ACTIVE[color] : BADGE_INACTIVE[color]}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 max-h-[82vh] overflow-y-auto pr-[0.3vw]">

        {/* Admin Alerts */}
        {loggedInUser?.department === "Admin" && queue.filter(e => e.status === "Critical_Unresolved").map(e => (
          <div key={`alert-${e.callId}`} className="mb-[1vw] bg-red-100 border border-red-400 text-red-800 rounded-[0.5vw] p-[0.7vw] shadow-sm flex items-center gap-[0.5vw]">
            <AlertTriangle className="w-[1.2vw] h-[1.2vw] text-red-600 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <strong className="text-[0.85vw]">CRITICAL ALERT: Call {e.callNumber} is in critical stage.</strong>
              <div className="text-[0.75vw] mt-[0.2vw]">All escalation levels exhausted. Currently escalated back to the first allocated person: <span className="font-bold underline">{e.currentEngineerName}</span>.</div>
            </div>
          </div>
        ))}

        {/* ── Escalation tab ── */}
        {activeTab === "escalation" && (
          <>
            {timers.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 via-yellow-50 to-red-50 rounded-[0.5vw] p-[0.7vw] mb-[1vw] border border-slate-400">
                <div className="flex items-center gap-[0.4vw] mb-[0.4vw]">
                  <RefreshCw className="w-[0.9vw] h-[0.9vw] text-blue-500 animate-spin" />
                  <span className="text-[0.82vw] font-bold text-gray-700">Live Escalation Timers</span>
                </div>
                <div className="flex flex-wrap gap-[0.6vw]">
                  {timers.map(t => (
                    <div key={t.callId}
                      className={`flex items-center gap-[0.4vw] px-[0.7vw] py-[0.35vw] rounded-[0.4vw] border text-[0.78vw] font-mono font-bold ${t.isExpired ? "bg-red-100 border-red-300 text-red-700" : t.isUrgent ? "bg-orange-100 border-orange-300 text-orange-700 animate-pulse" : "bg-white border-gray-400 text-gray-700"}`}>
                      <Clock className="w-[0.8vw] h-[0.8vw]" />
                      <span>{t.callNumber}</span>
                      <span>{t.isExpired ? "ESCALATING..." : t.remainingFormatted}</span>
                      <span className={`text-[0.6vw] px-[0.35vw] rounded-full ${t.currentLevel === 0 ? "bg-blue-100 text-blue-600" : t.currentLevel === 1 ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"}`}>
                        {t.currentDepartment}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myEscalations.length === 0 ? (
              <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-slate-400">
                <Shield className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
                <p className="text-[1vw] text-gray-400 font-medium">No active escalations</p>
                <p className="text-[0.8vw] text-gray-300 mt-[0.3vw]">Service calls assigned to you will appear here</p>
              </div>
            ) : (
              <div className="space-y-[0.8vw]">
                {myEscalations.map(entry => (
                  <EscalationCard
                    key={entry.callId}
                    entry={entry}
                    currentUser={loggedInUser}
                    timer={timers.find(t => t.callId === entry.callId)}
                    isExpanded={expandedCall === entry.callId}
                    onToggle={() => setExpanded(expandedCall === entry.callId ? null : entry.callId)}
                    onSupportRequest={(pIdx, d) => handleSupportRequest(entry.callId, pIdx, d)}
                    onAssignFieldVisit={(form, pIdx) => handleAssignVisit(entry.callId, "Field Visit", form, pIdx)}
                    onProductClose={(pIdx, data)     => handleProductClose(entry.callId, pIdx, data)}
                    onTakeCall={(callId)             => handleTakeCall(callId)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "pending" && (
          <PendingTab
            queue={queue} currentUser={loggedInUser}
            onProductClose={(callId, pIdx, data) => handleProductClose(callId, pIdx, data)}
            onAssignFieldVisit={(callId, form, pIdx) => handleAssignVisit(callId, "Field Visit", form, pIdx)}
          />
        )}
        {activeTab === "support"    && <SupportRequestsTab currentUser={loggedInUser} />}
        {activeTab === "fieldvisit" && <VisitsTab type="Field Visit" currentUser={loggedInUser} onAssignVisit={(callId, type, form, pIdx) => handleAssignVisit(callId, type, form, pIdx)} />}
        {activeTab === "received"   && <ReceivedGoodsTab currentUser={loggedInUser} />}
        {activeTab === "reports"    && <ReportsTab currentUser={loggedInUser} />}
      </div>
    </div>
  );
};

export default EscalationPage;