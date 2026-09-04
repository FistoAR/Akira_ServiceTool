import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package, Clock, User, CheckCircle, AlertCircle, X, Eye, Send,
  FileText, Calendar, Hash, Tag, Wrench,
  AlertTriangle, Info, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, Check, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL;

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

const todayDateStr = () => new Date().toISOString().slice(0, 10);

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray", size = "sm" }) => {
  const colorMap = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    slate:  "bg-slate-100 text-slate-600 border-slate-400",
    gray:   "bg-gray-100 text-gray-600 border-slate-400",
    black:  "bg-gray-900 text-white border-gray-900",
    red:    "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const sizeMap = {
    xs: "text-[0.58vw] px-[0.35vw] py-[0.08vw]",
    sm: "text-[0.65vw] px-[0.45vw] py-[0.12vw]",
    md: "text-[0.72vw] px-[0.55vw] py-[0.15vw]",
  };
  return (
    <span className={`${sizeMap[size]} rounded-full border font-semibold whitespace-nowrap inline-flex items-center ${colorMap[color] || colorMap.gray}`}>
      {label}
    </span>
  );
};

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Open":               { color: "gray",   icon: AlertCircle,    bg: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-700" },
  "Under Testing":      { color: "blue",   icon: Wrench,         bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-800" },
  "Repair in Progress": { color: "orange", icon: Wrench,         bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  "Pending":            { color: "slate",  icon: Clock,          bg: "bg-slate-100",  border: "border-slate-400",  text: "text-slate-800" },
  "Completed":          { color: "green",  icon: CheckCircle,    bg: "bg-green-100",  border: "border-green-300",  text: "text-green-800" },
  "Not Repairable":     { color: "red",    icon: AlertTriangle,  bg: "bg-red-100",    border: "border-red-300",    text: "text-red-800" },
};

// ── Read-only Input Field ─────────────────────────────────────────────────────
const RefInput = ({ label, value, span = 1 }) => (
  <div className={`flex flex-col gap-[0.25vw] ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : span === 4 ? "col-span-4" : ""}`}>
    <label className="text-[0.75vw] font-semibold text-black flex items-start gap-[0.25vw]">
      {label}
    </label>
    <div className="bg-white border border-gray-400 rounded-[0.4vw] py-[0.45vw] px-[0.6vw] text-[0.8vw] text-gray-900 break-words whitespace-normal overflow-hidden min-h-[2.4vw]">
      {value || "—"}
    </div>
  </div>
);

// ── Searchable Select Component ────────────────────────────────────────────────
const SearchableSelect = ({ label, value, options, onSelect, placeholder = "Select...", mandatory = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-[0.3vw]" ref={dropdownRef}>
      <label className="text-[0.8vw] font-semibold text-black">
        {label} {mandatory && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full border border-gray-400 bg-white rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] text-left flex items-center justify-between transition-all cursor-pointer shadow-sm ${isOpen ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
        >
          <span className={selectedOption ? "text-black font-regular" : "text-gray-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-[1vw] h-[1vw] text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[100] w-full mt-[0.2vw] bg-white border border-gray-400 rounded-[0.4vw] shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-[0.4vw] border-b border-slate-400 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-[1.8vw] pr-[0.6vw] py-[0.4vw] text-[0.75vw] border border-slate-400 rounded-[0.3vw] outline-none focus:border-blue-400 bg-white"
                  />
                </div>
              </div>
              <div className="max-h-[10vw] overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onSelect(opt.value, opt.label);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`px-[0.8vw] py-[0.5vw] text-[0.78vw] cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${value === opt.value ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"}`}
                    >
                      <span>{opt.label}</span>
                      {value === opt.value && <Check className="w-[0.9vw] h-[0.9vw]" />}
                    </div>
                  ))
                ) : (
                  <div className="px-[0.8vw] py-[1vw] text-[0.75vw] text-gray-400 text-center italic">No results found</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Production Response Modal ──────────────────────────────────────────────────
const ProductionResponseModal = ({ entry, product, employees, fourMCategories, onSave, onClose, caeHistory }) => {
  const [formData, setFormData] = useState({
    startDate: product.report?.startDate?.split("T")[0] || todayDateStr(),
    fourMCategory: product.report?.fourMCategory || "",
    rootCause: product.report?.rootCause || "",
    correctiveAction: product.report?.correctiveAction || "",
    closedDate: product.report?.closedDate?.split("T")[0] || "",
    assembledBy: product.report?.assembledBy || "",
    assembledByName: product.report?.assembledByName || "",
    testedBy: product.report?.testedBy || "",
    testedByName: product.report?.testedByName || "",
    fiBy: product.report?.fiBy || "",
    fiByName: product.report?.fiByName || "",
    partsReplacement: product.report?.partsReplacement || "",
    status: product.report?.status || "Under Testing",
    currentRemark: ""
  });

  const STATUS_OPTIONS = ["Under Testing", "Repair in Progress", "Pending", "Completed", "Not Repairable"];
  
  const employeeOptions = useMemo(() => 
    employees.map(e => ({ value: e.userId || e.id, label: e.name })), 
  [employees]);

  const sp = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!formData.startDate) return alert("Start Date is mandatory.");
    if (!formData.fourMCategory) return alert("4M Category is mandatory.");
    if (!formData.rootCause.trim()) return alert("Root Cause Analysis is mandatory.");
    if (!formData.correctiveAction.trim()) return alert("Corrective Action is mandatory.");
    if (formData.status === "Completed" && !formData.closedDate) return alert("Closed Date is mandatory for 'Completed' status.");

    const historyEntry = {
      status: formData.status,
      remark: formData.currentRemark,
      timestamp: new Date().toISOString()
    };

    const updatedReport = {
      ...formData,
      lastUpdated: new Date().toISOString(),
      history: [...(product.report?.history || []), historyEntry]
    };

    onSave(updatedReport);
  };

  const currentStatus = STATUS_CONFIG[formData.status] || STATUS_CONFIG["Open"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[60vw] max-h-[95vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-gray-400"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-[1.5vw] py-[1vw] flex justify-between items-center shadow-md">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-[0.6vw] bg-white/20 backdrop-blur flex items-center justify-center border border-white/20">
              <FileText className="w-[1.2vw] h-[1.2vw] text-white" />
            </div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-white uppercase tracking-tight">Production Technical Resolution</h3>
              <p className="text-[0.75vw] text-blue-100 font-medium">{product.productDescription} · {entry.refNoInternal}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-[2vw] h-[2vw] rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-[1.5vw] pb-[6vw] space-y-[1.5vw] bg-gray-50/30">
          
          {/* Reference Info */}
          <div className="bg-white rounded-[0.6vw] border border-gray-400 shadow-sm">
            <div className="bg-blue-50/50 px-[1vw] py-[0.6vw] border-b border-slate-400 flex items-center gap-[0.5vw]">
              <Info className="w-[0.9vw] h-[0.9vw] text-blue-600" />
              <span className="text-[0.75vw] font-bold text-blue-700 uppercase tracking-wider">Inward Details</span>
            </div>
            <div className="p-[1vw] grid grid-cols-4 gap-[1.5vw]">
              <RefInput label="Registration Date" value={fmtDate(entry.date)} />
              <RefInput label="Job Order No" value={entry.jobOrderNo} />
              <RefInput label="Customer Name" value={entry.customerName} />
              <RefInput label="Customer Code" value={entry.customerCode} />
              
              <RefInput label="Product Description" value={product.productDescription} span={2} />
              <RefInput label="Product Code" value={product.productCode} />
              <RefInput label="Product Type" value={product.productType} />

              <RefInput label="Stage" value={product.stage} />
              <RefInput label="NC Type" value={product.ncType} />
              <RefInput label="Problem Type" value={product.problemType} />
              <RefInput label="Problem Reported" value={product.problem} />
              <RefInput label="Qty" value={product.qty} />
              <RefInput label="Inspected By" value={product.inspectedByName} />
              <RefInput label="Designators" value={product.designators} />
              {product.boardImage && (
                <div className="col-span-1 flex flex-col gap-[0.25vw]">
                  <label className="text-[0.75vw] font-semibold text-black uppercase">Board Image</label>
                  <img 
                    src={`${API_URL}${product.boardImage}`} 
                    alt="Board" 
                    className="w-full h-[4vw] object-cover rounded-[0.4vw] border border-gray-400 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => window.open(`${API_URL}${product.boardImage}`, '_blank')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Technical Resolution Form */}
          <div className="bg-white rounded-[0.6vw] border border-gray-400 shadow-sm">
            <div className="bg-emerald-50/50 px-[1vw] py-[0.6vw] border-b border-slate-400 flex items-center gap-[0.5vw]">
              <Wrench className="w-[0.9vw] h-[0.9vw] text-emerald-600" />
              <span className="text-[0.75vw] font-bold text-emerald-700 uppercase tracking-wider">Resolution Report</span>
            </div>
            <div className="p-[1.2vw] space-y-[1.2vw]">
              <div className="grid grid-cols-4 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.startDate} onChange={e => sp("startDate", e.target.value)} className="border border-gray-400 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">4M Category <span className="text-red-500">*</span></label>
                  <select value={formData.fourMCategory} onChange={e => sp("fourMCategory", e.target.value)} className="border border-gray-400 bg-white rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 shadow-sm cursor-pointer">
                    <option value="">Select Category</option>
                    {fourMCategories?.map(c => <option key={c._id || c.id} value={c.name || c}>{c.name || c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">Root Cause(s) <span className="text-red-500">*</span></label>
                  <textarea rows="3" value={formData.rootCause} onChange={e => sp("rootCause", e.target.value)} placeholder="Analyze the problem source..." className="border border-gray-400 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 resize-none shadow-sm" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">Corrective Action <span className="text-red-500">*</span></label>
                  <textarea rows="3" value={formData.correctiveAction} onChange={e => sp("correctiveAction", e.target.value)} placeholder="Action taken to prevent recurrence..." className="border border-gray-400 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 resize-none shadow-sm" />
                </div>
              </div>

              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.8vw] font-semibold text-black">Parts replacement details</label>
                <textarea rows="2" value={formData.partsReplacement} onChange={e => sp("partsReplacement", e.target.value)} placeholder="Enter parts replaced (comma separated)..." className="border border-gray-400 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 resize-none shadow-sm w-full" />
              </div>

              <div className="grid grid-cols-4 gap-[1vw]">
                <SearchableSelect label="Assembled By" value={formData.assembledBy} options={employeeOptions} onSelect={(val, lbl) => { sp("assembledBy", val); sp("assembledByName", lbl); }} placeholder="Search employee..." />
                <SearchableSelect label="Tested By" value={formData.testedBy} options={employeeOptions} onSelect={(val, lbl) => { sp("testedBy", val); sp("testedByName", lbl); }} placeholder="Search employee..." />
                <SearchableSelect label="FI By" value={formData.fiBy} options={employeeOptions} onSelect={(val, lbl) => { sp("fiBy", val); sp("fiByName", lbl); }} placeholder="Search employee..." />
              </div>

              <div className="grid grid-cols-4 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">Closed Date {formData.status === "Completed" && <span className="text-red-500">*</span>}</label>
                  <input type="date" value={formData.closedDate} onChange={e => sp("closedDate", e.target.value)} className="border border-gray-400 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-black">Current Status <span className="text-red-500">*</span></label>
                  <select value={formData.status} onChange={e => sp("status", e.target.value)} className={`border-2 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none shadow-sm cursor-pointer ${currentStatus.bg} ${currentStatus.border} ${currentStatus.text} font-bold`}>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.8vw] font-semibold text-blue-600">Action Remark</label>
                  <input value={formData.currentRemark} onChange={e => sp("currentRemark", e.target.value)} placeholder="Quick update note..." className="border border-blue-300 bg-blue-50/20 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-500 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.5vw] py-[1vw] border-t border-slate-400 bg-gray-50 flex justify-between items-center">
          <p className="text-[0.7vw] text-gray-500 font-medium uppercase tracking-wider">
            Ensuring high-quality production standards
          </p>
          <div className="flex gap-[0.8vw]">
            <button onClick={onClose} className="px-[1.5vw] py-[0.6vw] border border-gray-400 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-[0.4vw] text-[0.8vw] cursor-pointer transition-all">Cancel</button>
            <button onClick={handleSave} className="px-[1.8vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.8vw] font-bold cursor-pointer shadow-lg shadow-blue-900/20 flex items-center gap-[0.5vw] transition-all active:scale-95">
              <Send className="w-[1vw] h-[1vw]" />
              Submit Report
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Production Info Modal (Read-only) ───────────────────────────────────────────
const ProductionInfoModal = ({ entry, product, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[50vw] max-h-[90vh] rounded-[1vw] shadow-2xl overflow-hidden flex flex-col border border-gray-400"
      >
        <div className="bg-gray-900 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <Info className="w-[1.2vw] h-[1.2vw] text-blue-400" />
            <h3 className="text-[1.1vw] font-bold text-white uppercase tracking-tight">Technical Record Details</h3>
          </div>
          <button onClick={onClose} className="w-[2vw] h-[2vw] rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.5vw] bg-gray-50/50">
          <div className="grid grid-cols-2 gap-[1.5vw]">
            <div className="space-y-[1vw]">
               <h4 className="text-[0.85vw] font-bold text-blue-700 border-b border-blue-100 pb-[0.3vw]">Inward Information</h4>
               <div className="grid grid-cols-1 gap-[0.8vw]">
                 <RefInput label="Registration Date" value={fmtDate(entry.date)} />
                 <RefInput label="Job Order No" value={entry.jobOrderNo} />
                 <RefInput label="Reference No" value={entry.refNoInternal} />
                 <RefInput label="Customer" value={entry.customerName} />
               </div>
            </div>
            <div className="space-y-[1vw]">
               <h4 className="text-[0.85vw] font-bold text-emerald-700 border-b border-emerald-100 pb-[0.3vw]">Product Details</h4>
               <div className="grid grid-cols-1 gap-[0.8vw]">
                 <RefInput label="Description" value={product.productDescription} />
                 <RefInput label="Code" value={product.productCode} />
                 <RefInput label="NC Type" value={product.ncType || "Internal"} />
                 <RefInput label="Qty" value={product.qty || "1"} />
                 <RefInput label="Serial Number" value={product.serialNumber} />
                 <RefInput label="Current Status" value={product.report?.status || "Open"} />
               </div>
            </div>
          </div>

          {product.report && (
            <div className="space-y-[1vw] mt-[1vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-400 shadow-sm">
               <h4 className="text-[0.85vw] font-bold text-gray-800 border-b border-slate-400 pb-[0.3vw]">Technical Report</h4>
               <div className="grid grid-cols-2 gap-[1vw]">
                 <RefInput label="Root Cause" value={product.report.rootCause} span={2} />
                 <RefInput label="Corrective Action" value={product.report.correctiveAction} span={2} />
                 <RefInput label="Parts Replaced" value={product.report.partsReplacement} span={2} />
                 <RefInput label="Verified By" value={product.report.verifiedByName} />
                 <RefInput label="Closed Date" value={fmtDate(product.report.closedDate)} />
               </div>
            </div>
          )}

          {/* Update History */}
          {product.report?.history && product.report.history.length > 0 && (
            <div className="space-y-[0.8vw] mt-[1vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-400 shadow-sm">
               <h4 className="text-[0.85vw] font-bold text-blue-700 border-b border-blue-500/10 pb-[0.3vw] flex items-center gap-[0.5vw]">
                 <Clock className="w-[0.9vw] h-[0.9vw]" /> Update History Log
               </h4>
               <div className="space-y-[0.6vw] max-h-[15vw] overflow-y-auto pr-[0.5vw] custom-scrollbar">
                 {product.report.history.slice().reverse().map((h, i) => (
                   <div key={i} className="flex flex-col gap-[0.2vw] p-[0.6vw] rounded-[0.4vw] bg-gray-50/50 border border-slate-400 hover:bg-blue-50/30 transition-colors">
                     <div className="flex justify-between items-center">
                       <Badge label={h.status} color={STATUS_CONFIG[h.status]?.color || "gray"} size="xs" />
                       <span className="text-[0.65vw] text-gray-500 font-bold uppercase tracking-tighter">
                         {fmtDate(h.timestamp)} · {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                       </span>
                     </div>
                     {h.remark && (
                       <div className="text-[0.72vw] text-gray-600 italic flex items-start gap-[0.3vw] mt-[0.1vw]">
                         <span className="text-blue-400 font-black">"</span>
                         <span>{h.remark}</span>
                         <span className="text-blue-400 font-black">"</span>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
        <div className="p-[1vw] border-t border-slate-400 bg-gray-50 text-right">
          <button onClick={onClose} className="px-[1.5vw] py-[0.5vw] bg-gray-800 text-white rounded-[0.4vw] font-bold text-[0.8vw] cursor-pointer">Close View</button>
        </div>
      </motion.div>
    </div>
  );
};
export default function ProductionMaterialResponse() {
  const { toast } = useNotification();
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [infoSelected, setInfoSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // Load User
  useEffect(() => {
    const raw = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser");
    if (raw) {
      try { setCurrentUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  const fetchData = async () => {
    try {
      const [matRes, empRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/production-material`),
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/master/four-m-categories`)
      ]);
      setEntries(matRes.data.map(e => ({ ...e, id: e._id })));
      setEmployees(empRes.data);
      setFourMCategories(catRes.data);
    } catch (err) {
      console.error("Data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const claimProduct = async (id, productId) => {
    if (!currentUser) return toast("Login required", "error");
    try {
      const res = await axios.patch(`${API_URL}/production-material/${id}/claim-product`, {
        productId,
        userId: currentUser.userId || currentUser.id,
        userName: currentUser.name
      });
      setEntries(prev => prev.map(e => e.id === id ? { ...res.data, id: res.data._id } : e));
      toast("Product claimed successfully", "success");
    } catch (err) {
      toast(err.response?.data?.message || "Claim failed", "error");
    }
  };

  const handleSaveReport = async (report) => {
    try {
      const res = await axios.patch(`${API_URL}/production-material/${selected.entry.id}/product/${selected.product._pid}/report`, {
        report
      });
      setEntries(prev => prev.map(e => e.id === selected.entry.id ? { ...res.data, id: res.data._id } : e));
      setSelected(null);
      toast("Technical report updated", "success");
    } catch (err) {
      toast("Update failed", "error");
    }
  };

  const myProducts = useMemo(() => {
    const list = [];
    const myId = currentUser?.userId || currentUser?.id;
    if (!myId) return [];
    entries.forEach(entry => {
      entry.products?.forEach(product => {
        if (product.assignedTo === myId) list.push({ entry, product });
      });
    });
    return list;
  }, [entries, currentUser]);

  const counts = useMemo(() => {
    const c = { All: myProducts.length };
    ["Open", "Under Testing", "Repair in Progress", "Pending", "Completed", "Not Repairable"].forEach(s => {
      c[s] = myProducts.filter(p => (p.product.report?.status || "Open") === s).length;
    });
    return c;
  }, [myProducts]);

  const allProducts = useMemo(() => {
    let filtered = myProducts;
    if (filterStatus !== "All") {
      filtered = filtered.filter(p => (p.product.report?.status || "Open") === filterStatus);
    }
    return filtered.sort((a, b) => (a.entry.customerName || "").localeCompare(b.entry.customerName || ""));
  }, [myProducts, filterStatus]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [allProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(allProducts.length / itemsPerPage);

  const caeHistory = useMemo(() => {
    const set = new Set();
    entries.forEach(e => e.products?.forEach(p => p.report?.cae && set.add(p.report.cae)));
    return Array.from(set);
  }, [entries]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-[10vw] gap-[1.5vw]">
      <div className="w-[3vw] h-[3vw] border-[0.35vw] border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      <div className="text-blue-600 font-bold text-[1vw] uppercase tracking-widest animate-pulse">Loading Production Data...</div>
    </div>
  );

  return (
    <div className="w-full font-sans p-[1vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[1.5vw] bg-white p-[1vw] rounded-[0.8vw] shadow-sm border border-slate-400">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[2.8vw] h-[2.8vw] rounded-[0.7vw] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Package className="w-[1.4vw] h-[1.4vw] text-white" />
          </div>
          <div>
            <h1 className="text-[1.2vw] font-bold text-blue-600 ">PRODUCTION NC</h1>
            <p className="text-[0.75vw] text-gray-500 font-medium italic">Resolution & Technical Reporting</p>
          </div>
        </div>

        <div className="flex items-center gap-[1.2vw]">
          {/* Quick Pagination (Top) */}
          {allProducts.length > 0 && (
            <div className="flex items-center gap-[0.6vw] bg-blue-50/50 px-[0.8vw] py-[0.4vw] rounded-full border border-blue-100 shadow-inner">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-[1.4vw] h-[1.4vw] flex items-center justify-center rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-[0.8vw] h-[0.8vw]" />
              </button>
              <div className="flex items-center gap-[0.3vw] min-w-[4.5vw] justify-center">
                <span className="text-[0.75vw] font-bold text-blue-700">{currentPage}</span>
                <span className="text-[0.65vw] font-medium text-blue-300 italic">of</span>
                <span className="text-[0.75vw] font-bold text-gray-600">{totalPages || 1}</span>
              </div>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="w-[1.4vw] h-[1.4vw] flex items-center justify-center rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-[0.8vw] h-[0.8vw]" />
              </button>
            </div>
          )}

          <div className="h-[2vw] w-[1px] bg-gray-200 mx-[0.2vw]" />

          {/* Stats Bar */}
          <div className="flex items-center gap-[0.6vw]">
            {["All", "Open", "Under Testing", "Repair in Progress", "Pending", "Completed", "Not Repairable"].map(label => {
              const count = counts[label] || 0;
              const active = filterStatus === label;
              
              return (
                <button
                  key={label}
                  onClick={() => setFilterStatus(label)}
                  className={`px-[0.8vw] py-[0.4vw] rounded-full text-[0.72vw] font-bold flex items-center gap-[0.4vw] transition-all border-2 cursor-pointer shadow-sm ${active ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-400 text-gray-600 hover:border-blue-400"}`}
                >
                  <span>{label}</span>
                  <span className={`px-[0.4vw] py-[0.05vw] rounded-full text-[0.65vw] ${active ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Table */}
      {allProducts.length === 0 ? (
        <div className="bg-white rounded-[1vw] border-2 border-dashed border-gray-400 py-[6vw] flex flex-col items-center justify-center">
          <AlertCircle className="w-[3vw] h-[3vw] text-gray-300 mb-[1vw]" />
          <p className="text-[1.1vw] font-bold text-gray-500">No records found for the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[0.8vw] border border-gray-400 shadow-md overflow-hidden flex flex-col max-h-[70vh]">
          <div className="overflow-auto flex-1">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-blue-50/95 backdrop-blur-md">
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-center border-b border-r border-blue-200">SNo</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-left border-b border-r border-blue-200">Date</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-left border-b border-r border-blue-200">Registration</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-left border-b border-r border-blue-200">Customer</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-left border-b border-r border-blue-200">Product</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-center border-b border-r border-blue-200">Qty</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-center border-b border-r border-blue-200">Status</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-center border-b border-r border-blue-200">Info</th>
                  <th className="px-[0.8vw] py-[0.8vw] text-[0.82vw] font-bold text-black uppercase text-center border-b border-blue-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  let lastCustomer = null;
                  return paginatedProducts.map(({ entry, product }, idx) => {
                    const isNewCustomer = entry.customerName !== lastCustomer;
                    lastCustomer = entry.customerName;

                    const status = product.report?.status || "Open";
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Open"];
                    const isMyClaim = product.assignedTo === (currentUser?.userId || currentUser?.id);
                    
                    return (
                      <React.Fragment key={`${entry.id}-${product._pid}`}>
                        {isNewCustomer && (
                          <tr className="bg-blue-50/40 border-y border-blue-100 sticky top-[2.4vw] z-10 backdrop-blur-sm">
                            <td colSpan={9} className="px-[1vw] py-[0.5vw] border-b border-blue-100 border-r border-gray-400">
                              <div className="flex items-center gap-[0.6vw]">
                                <div className="w-[0.35vw] h-[1.1vw] bg-blue-600 rounded-full" />
                                <span className="text-[0.82vw] font-bold text-blue-800 uppercase tracking-wide">
                                  {entry.customerName}
                                </span>
                                <span className="text-[0.62vw] text-blue-600 font-bold px-[0.5vw] py-[0.05vw] bg-white rounded-full border border-blue-200 ml-[0.4vw] shadow-sm">
                                  {entry.customerCode || "N/A"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-blue-50/20 transition-colors group">
                          {/* SNo */}
                          <td className="px-[0.8vw] py-[1vw] text-center border-r border-b border-slate-400">
                            <span className="w-[1.8vw] h-[1.8vw] rounded-full bg-gray-100 flex items-center justify-center text-[0.75vw] font-bold text-gray-600 mx-auto group-hover:bg-blue-100 group-hover:text-blue-700 transition-all">
                              {((currentPage - 1) * itemsPerPage) + idx + 1}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-[0.8vw] py-[1vw] border-r border-b border-slate-400">
                            <div className="text-[0.75vw] font-semibold text-gray-800 flex items-center gap-[0.3vw]">
                              <Calendar className="w-[0.75vw] h-[0.75vw] text-blue-600" />
                              {fmtDate(entry.date)}
                            </div>
                          </td>

                          {/* Registration */}
                          <td className="px-[0.8vw] py-[1vw] border-r border-b border-slate-400">
                            <div className="flex flex-col gap-[0.2vw]">
                              <div className="text-[0.8vw] font-semibold text-gray-900 flex items-center gap-[0.3vw]"><Hash className="w-[0.7vw] h-[0.7vw] text-blue-600" />{entry.refNoInternal}</div>
                              <div className="text-[0.7vw] font-semibold text-blue-600 mt-[0.1vw]">JO: {entry.jobOrderNo}</div>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-[0.8vw] py-[1vw] border-r border-b border-slate-400">
                            <div className="text-[0.8vw] font-semibold text-gray-900 truncate max-w-[12vw]">{entry.customerName}</div>
                            <div className="text-[0.7vw] font-medium text-gray-500 mt-[0.1vw]">Code: {entry.customerCode}</div>
                          </td>

                          {/* Product */}
                          <td className="px-[0.8vw] py-[1vw] border-r border-b border-slate-400">
                            <div className="text-[0.8vw] font-semibold text-blue-700 leading-tight">{product.productDescription}</div>
                            <div className="text-[0.68vw] text-gray-500 font-semibold mt-[0.3vw]">S/N: {product.serialNumber || "—"}</div>
                          </td>

                          {/* Qty */}
                          <td className="px-[0.8vw] py-[1vw] text-center border-r border-b border-slate-400">
                            <span className="text-[0.8vw] font-medium text-gray-800">{product.qty || "1"}</span>
                          </td>

                          {/* Status */}
                          <td className="px-[0.8vw] py-[1vw] text-center border-r border-b border-slate-400">
                            <span className={`inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.25vw] rounded-full border text-[0.7vw] font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                              <cfg.icon className="w-[0.8vw] h-[0.8vw]" />
                              {status}
                            </span>
                          </td>

                          {/* Info */}
                          <td className="px-[0.8vw] py-[1vw] text-center border-r border-b border-slate-400">
                            <button 
                              onClick={() => setInfoSelected({ entry, product })}
                              className="w-[2vw] h-[2vw] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-sm border border-blue-100"
                              title="View Full Info"
                            >
                              <Eye className="w-[1vw] h-[1vw]" />
                            </button>
                          </td>

                          {/* Action */}
                          <td className="px-[0.8vw] py-[1vw] text-center border-b border-slate-400">
                            <button onClick={() => setSelected({ entry, product })} className="bg-blue-600 hover:bg-blue-700 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] text-[0.75vw] font-bold shadow-md shadow-blue-100 transition-all active:scale-95 flex items-center gap-[0.4vw] mx-auto cursor-pointer">
                              <Edit3 className="w-[0.9vw] h-[0.9vw]" /> Update Report
                            </button>
                          </td>
                        </tr>
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
                Showing <strong className="text-gray-700">{paginatedProducts.length}</strong> of <strong className="text-gray-700">{allProducts.length}</strong> assigned products
              </span>
              
              <div className="flex items-center gap-[1vw] border-l border-gray-400 pl-[1.5vw]">
                <div className="flex items-center gap-[0.5vw]">
                  <span className="text-[0.68vw] text-gray-500 font-bold uppercase tracking-wider">Rows per page:</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-gray-400 rounded-[0.3vw] px-[0.4vw] py-[0.15vw] text-[0.72vw] font-bold text-blue-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-[0.6vw]">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-[0.3vw] rounded-[0.4vw] bg-white border border-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm group"
                  >
                    <ChevronLeft className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-blue-600" />
                  </button>
                  
                  <div className="flex items-center gap-[0.4vw] px-[0.6vw] py-[0.15vw] bg-blue-50 border border-blue-100 rounded-[0.3vw]">
                    <span className="text-[0.72vw] font-bold text-blue-700">{currentPage}</span>
                    <span className="text-[0.65vw] font-medium text-blue-300">/</span>
                    <span className="text-[0.72vw] font-bold text-gray-600">{totalPages || 1}</span>
                  </div>

                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-[0.3vw] rounded-[0.4vw] bg-white border border-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm group"
                  >
                    <ChevronRight className="w-[1vw] h-[1vw] text-gray-600 group-hover:text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.3vw] bg-emerald-50 border border-emerald-100 rounded-full">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[0.65vw] font-bold text-emerald-700 uppercase tracking-widest">Live Sync Enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      <AnimatePresence>
        {selected && (
          <ProductionResponseModal
            entry={selected.entry}
            product={selected.product}
            employees={employees}
            fourMCategories={fourMCategories}
            onClose={() => setSelected(null)}
            onSave={handleSaveReport}
            caeHistory={caeHistory}
          />
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {infoSelected && (
          <ProductionInfoModal
            entry={infoSelected.entry}
            product={infoSelected.product}
            onClose={() => setInfoSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}