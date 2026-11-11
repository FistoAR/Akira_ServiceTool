import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package, Clock, User, CheckCircle, AlertCircle, X, Eye, Send,
  FileText, Calendar, Hash, Tag, Wrench,
  AlertTriangle, Info, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, Check, Edit3, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";

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
    slate:  "bg-slate-100 text-slate-600 border-slate-300",
    gray:   "bg-gray-100 text-gray-600 border-slate-300",
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
  "Open":               { color: "gray",   icon: AlertCircle,    bg: "bg-gray-100",   border: "border-slate-300",   text: "text-gray-700" },
  "Under Testing":      { color: "blue",   icon: Wrench,         bg: "bg-blue-100",   border: "border-blue-300",   text: "text-blue-800" },
  "Repair in Progress": { color: "orange", icon: Wrench,         bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  "Pending":            { color: "slate",  icon: Clock,          bg: "bg-slate-100",  border: "border-slate-300",  text: "text-slate-800" },
  "Completed":          { color: "green",  icon: CheckCircle,    bg: "bg-green-100",  border: "border-green-300",  text: "text-green-800" },
  "Not Repairable":     { color: "red",    icon: AlertTriangle,  bg: "bg-red-100",    border: "border-red-300",    text: "text-red-800" },
};

// ── Read-only Input Field ─────────────────────────────────────────────────────
const RefInput = ({ label, value, span = 1 }) => (
  <div className={`flex flex-col gap-[0.25vw] ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : span === 4 ? "col-span-4" : ""}`}>
    <label className="text-[0.75vw] font-semibold text-black flex items-start gap-[0.25vw]">
      {label}
    </label>
    <div className="bg-white border border-slate-300 rounded-[0.4vw] py-[0.45vw] px-[0.6vw] text-[0.8vw] text-gray-900 break-words whitespace-normal overflow-hidden min-h-[2.4vw]">
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
          className={`w-full border border-slate-300 bg-white rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] text-left flex items-center justify-between transition-all cursor-pointer shadow-sm ${isOpen ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
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
              className="absolute z-[100] w-full mt-[0.2vw] bg-white border border-slate-300 rounded-[0.4vw] shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-[0.4vw] border-b border-slate-300 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-[1.8vw] pr-[0.6vw] py-[0.4vw] text-[0.75vw] border border-slate-300 rounded-[0.3vw] outline-none focus:border-blue-400 bg-white"
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[150] flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[60vw] max-h-[92vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center rounded-t-[0.8vw]">
          <div className="flex items-center gap-[0.7vw]">
            <div className="bg-blue-50 p-[0.45vw] rounded-full text-blue-600 border border-blue-100">
              <FileText className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">Production Technical Resolution</h3>
              <p className="text-[0.72vw] text-slate-500 font-medium">{product.productDescription} · <span className="font-mono">{entry.refNoInternal}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          
          {/* Reference Info */}
          <div className="bg-white rounded-[0.8vw] border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-[1vw] py-[0.55vw] border-b border-slate-200 flex items-center gap-[0.45vw] rounded-t-[0.8vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full inline-block" />
              <Info className="w-[0.9vw] h-[0.9vw] text-blue-600" />
              <span className="text-[0.75vw] font-bold text-slate-700 uppercase tracking-wider">Inward Details</span>
            </div>
            <div className="p-[1vw] grid grid-cols-4 gap-[1.2vw]">
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
                  <label className="text-[0.75vw] font-semibold text-slate-700 uppercase">Board Image</label>
                  <img 
                    src={`${API_URL}${product.boardImage}`} 
                    alt="Board" 
                    className="w-full h-[4.5vw] object-cover rounded-[0.4vw] border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`${API_URL}${product.boardImage}`, '_blank')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Technical Resolution Form */}
          <div className="bg-white rounded-[0.8vw] border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-[1vw] py-[0.55vw] border-b border-slate-200 flex items-center gap-[0.45vw] rounded-t-[0.8vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-emerald-600 rounded-full inline-block" />
              <Wrench className="w-[0.9vw] h-[0.9vw] text-emerald-600" />
              <span className="text-[0.75vw] font-bold text-slate-700 uppercase tracking-wider">Resolution Report</span>
            </div>
            <div className="p-[1.2vw] space-y-[1vw]">
              <div className="grid grid-cols-4 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Start Date <span className="text-rose-500">*</span></label>
                  <input type="date" value={formData.startDate} onChange={e => sp("startDate", e.target.value)} className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">4M Category <span className="text-rose-500">*</span></label>
                  <select value={formData.fourMCategory} onChange={e => sp("fourMCategory", e.target.value)} className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer">
                    <option value="">Select Category</option>
                    {fourMCategories?.map(c => <option key={c._id || c.id} value={c.name || c}>{c.name || c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Root Cause(s) <span className="text-rose-500">*</span></label>
                  <textarea rows="3" value={formData.rootCause} onChange={e => sp("rootCause", e.target.value)} placeholder="Analyze the problem source..." className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Corrective Action <span className="text-rose-500">*</span></label>
                  <textarea rows="3" value={formData.correctiveAction} onChange={e => sp("correctiveAction", e.target.value)} placeholder="Action taken to prevent recurrence..." className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700">Parts replacement details</label>
                <textarea rows="2" value={formData.partsReplacement} onChange={e => sp("partsReplacement", e.target.value)} placeholder="Enter parts replaced (comma separated)..." className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all w-full" />
              </div>

              <div className="grid grid-cols-4 gap-[1vw]">
                <SearchableSelect label="Assembled By" value={formData.assembledBy} options={employeeOptions} onSelect={(val, lbl) => { sp("assembledBy", val); sp("assembledByName", lbl); }} placeholder="Search employee..." />
                <SearchableSelect label="Tested By" value={formData.testedBy} options={employeeOptions} onSelect={(val, lbl) => { sp("testedBy", val); sp("testedByName", lbl); }} placeholder="Search employee..." />
                <SearchableSelect label="FI By" value={formData.fiBy} options={employeeOptions} onSelect={(val, lbl) => { sp("fiBy", val); sp("fiByName", lbl); }} placeholder="Search employee..." />
              </div>

              <div className="grid grid-cols-4 gap-[1vw]">
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Closed Date {formData.status === "Completed" && <span className="text-rose-500">*</span>}</label>
                  <input type="date" value={formData.closedDate} onChange={e => sp("closedDate", e.target.value)} className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" />
                </div>
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Current Status <span className="text-rose-500">*</span></label>
                  <select value={formData.status} onChange={e => sp("status", e.target.value)} className={`border rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none shadow-2xs cursor-pointer ${currentStatus.bg} ${currentStatus.border} ${currentStatus.text} font-semibold`}>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-[0.3vw] col-span-2">
                  <label className="text-[0.76vw] font-semibold text-slate-700">Action Remark</label>
                  <input value={formData.currentRemark} onChange={e => sp("currentRemark", e.target.value)} placeholder="Quick update note..." className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.78vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-200 bg-white flex justify-between items-center rounded-b-[0.8vw]">
          <p className="text-[0.7vw] text-slate-400 font-medium">
            Ensuring high-quality production standards
          </p>
          <div className="flex gap-[0.6vw]">
            <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full text-[0.76vw] cursor-pointer transition-all">Cancel</button>
            <button onClick={handleSave} className="px-[1.4vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[0.76vw] font-semibold cursor-pointer shadow-xs flex items-center gap-[0.4vw] transition-all active:scale-95">
              <Send className="w-[0.85vw] h-[0.85vw]" />
              <span>Submit Report</span>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[200] flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[50vw] max-h-[88vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center rounded-t-[0.8vw]">
          <div className="flex items-center gap-[0.7vw]">
            <div className="bg-blue-50 p-[0.45vw] rounded-full text-blue-600 border border-blue-100">
              <Info className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">Technical Record Details</h3>
              <p className="text-[0.72vw] text-slate-500 font-medium">{entry.refNoInternal} · {entry.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          <div className="grid grid-cols-2 gap-[1.2vw]">
            <div className="space-y-[0.8vw]">
               <h4 className="text-[0.8vw] font-bold text-blue-600 border-b border-blue-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <Target className="w-[0.9vw] h-[0.9vw]" /> Inward Information
               </h4>
               <div className="grid grid-cols-1 gap-[0.6vw]">
                 <RefInput label="Registration Date" value={fmtDate(entry.date)} />
                 <RefInput label="Job Order No" value={entry.jobOrderNo} />
                 <RefInput label="Reference No" value={entry.refNoInternal} />
                 <RefInput label="Customer" value={entry.customerName} />
               </div>
            </div>
            <div className="space-y-[0.8vw]">
               <h4 className="text-[0.8vw] font-bold text-emerald-600 border-b border-emerald-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <Package className="w-[0.9vw] h-[0.9vw]" /> Product Details
               </h4>
               <div className="grid grid-cols-1 gap-[0.6vw]">
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
            <div className="space-y-[0.8vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-200 shadow-2xs">
               <h4 className="text-[0.8vw] font-bold text-slate-700 border-b border-slate-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <Wrench className="w-[0.9vw] h-[0.9vw] text-slate-500" /> Technical Report
               </h4>
               <div className="grid grid-cols-2 gap-[0.8vw]">
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
            <div className="space-y-[0.6vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-200 shadow-2xs">
               <h4 className="text-[0.8vw] font-bold text-blue-600 border-b border-blue-100 pb-[0.3vw] flex items-center gap-[0.4vw] uppercase tracking-wider">
                 <Clock className="w-[0.9vw] h-[0.9vw]" /> Update History Log
               </h4>
               <div className="space-y-[0.5vw] max-h-[14vw] overflow-y-auto pr-[0.4vw] custom-scrollbar">
                 {product.report.history.slice().reverse().map((h, i) => (
                   <div key={i} className="flex flex-col gap-[0.2vw] p-[0.6vw] rounded-[0.4vw] bg-slate-50 border border-slate-200 hover:bg-blue-50/30 transition-colors">
                     <div className="flex justify-between items-center">
                       <Badge label={h.status} color={STATUS_CONFIG[h.status]?.color || "gray"} size="xs" />
                       <span className="text-[0.64vw] text-slate-400 font-mono">
                         {fmtDate(h.timestamp)} · {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                       </span>
                     </div>
                     {h.remark && (
                       <div className="text-[0.72vw] text-slate-600 italic mt-[0.1vw]">
                         "{h.remark}"
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
        <div className="p-[0.8vw] border-t border-slate-200 bg-white text-right rounded-b-[0.8vw]">
          <button onClick={onClose} className="px-[1.4vw] h-[2.2vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold text-[0.76vw] cursor-pointer transition-all">Close</button>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
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
      try { 
        setCurrentUser(JSON.parse(raw)); 
      } catch (err) {
        console.error("Failed to parse loggedInUser:", err);
      }
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
    if (dateFrom) {
      filtered = filtered.filter(p => (p.entry.date || "").slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(p => (p.entry.date || "").slice(0, 10) <= dateTo);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.entry.customerName || "").toLowerCase().includes(s) ||
        (p.entry.customerCode || "").toLowerCase().includes(s) ||
        (p.entry.refNoInternal || "").toLowerCase().includes(s) ||
        (p.entry.jobOrderNo || "").toLowerCase().includes(s) ||
        (p.product.productDescription || "").toLowerCase().includes(s) ||
        (p.product.productCode || "").toLowerCase().includes(s) ||
        (p.product.serialNumber || "").toLowerCase().includes(s)
      );
    }
    return filtered.sort((a, b) => (a.entry.customerName || "").localeCompare(b.entry.customerName || ""));
  }, [myProducts, filterStatus, dateFrom, dateTo, searchTerm]);

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
    <div className="w-full h-full font-sans text-[0.85vw] flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0">
        {/* ── 1. Top Level Scoping Toolbar: Soft Pill Search, Date Range, Clear & Page navigation ── */}
        <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-[0.7vw] shrink-0">
          {/* Soft Pill Search Box */}
          <div className="relative w-[20vw]">
            <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
            <input
              type="text"
              placeholder="Search by customer, code, JO, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.76vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            )}
          </div>

          {/* Right cluster: Date Range, Clear, Rows Per Page */}
          <div className="flex items-center gap-[0.6vw] flex-shrink-0">
            {/* Unified Date Range Capsule */}
            <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.75vw] shadow-2xs hover:border-slate-300 transition-all">
              <span className="text-slate-500 font-medium text-[0.74vw]">From</span>
              <input
                ref={fromDateRef}
                type="date"
                value={dateFrom || ""}
                onChange={(e) => setDateFrom(e.target.value)}
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
                value={dateTo || ""}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
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
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.74vw] font-semibold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
                title="Clear date filter"
              >
                <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                <span>Clear</span>
              </button>
            )}

            {/* Quick Pagination Pill */}
            {allProducts.length > 0 && (
              <div className="flex items-center gap-[0.4vw] bg-slate-100/70 border border-slate-200/90 h-[2.2vw] px-[0.6vw] rounded-full">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-[1.4vw] h-[1.4vw] flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-[0.8vw] h-[0.8vw]" />
                </button>
                <span className="text-[0.74vw] font-semibold text-slate-700 px-[0.2vw]">
                  {currentPage} <span className="text-slate-400 font-normal">/</span> {totalPages || 1}
                </span>
                <button 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="w-[1.4vw] h-[1.4vw] flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-[0.8vw] h-[0.8vw]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Table Card with Integrated Header Bar & Filter Tabs ── */}
        <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
          {/* Integrated Header: Segment Track on left, Result count on right */}
          <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
            <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.35vw] max-w-full overflow-x-auto">
              {[
                { label: "All", dot: "bg-blue-600" },
                { label: "Open", dot: "bg-slate-400" },
                { label: "Under Testing", dot: "bg-blue-500" },
                { label: "Repair in Progress", dot: "bg-amber-500" },
                { label: "Pending", dot: "bg-orange-500" },
                { label: "Completed", dot: "bg-emerald-600" },
                { label: "Not Repairable", dot: "bg-rose-600" }
              ].map(({ label, dot }) => {
                const isActive = filterStatus === label;
                const count = counts[label] ?? 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterStatus(label)}
                    className={`flex items-center gap-[0.55vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.75vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    {label !== "All" && (
                      <span
                        className={`w-[0.45vw] h-[0.45vw] rounded-full shrink-0 ${
                          isActive ? "bg-white" : dot
                        }`}
                      />
                    )}
                    <span className={isActive ? "text-white" : "text-slate-700"}>
                      {label}
                    </span>
                    <span
                      className={`text-[0.68vw] font-medium ml-[0.25vw] transition-all ${
                        isActive
                          ? "bg-white/20 text-white px-[0.42vw] py-[0.05vw] rounded-full"
                          : "text-slate-400 bg-slate-200/60 px-[0.42vw] py-[0.05vw] rounded-full"
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
                {allProducts.length}
              </span>
              <span>assigned</span>
            </div>
          </div>

          {/* Main Table */}
          {allProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-[4vw] bg-white">
              <AlertCircle className="w-[2.5vw] h-[2.5vw] text-slate-300 mb-[0.6vw]" />
              <p className="text-[0.9vw] font-medium text-slate-500">No records found for the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider">
                  <tr>
                    <th className="px-[0.7vw] py-[0.6vw] text-center border-r border-slate-300 whitespace-nowrap w-[3.5vw]">S.No</th>
                    <th className="px-[0.7vw] py-[0.6vw] border-r border-slate-300 whitespace-nowrap min-w-[7vw]">Date</th>
                    <th className="px-[0.7vw] py-[0.6vw] border-r border-slate-300 whitespace-nowrap min-w-[10vw]">Registration</th>
                    <th className="px-[0.7vw] py-[0.6vw] border-r border-slate-300 whitespace-nowrap min-w-[12vw]">Customer</th>
                    <th className="px-[0.7vw] py-[0.6vw] border-r border-slate-300 whitespace-nowrap min-w-[14vw]">Product</th>
                    <th className="px-[0.7vw] py-[0.6vw] text-center border-r border-slate-300 whitespace-nowrap w-[4vw]">Qty</th>
                    <th className="px-[0.7vw] py-[0.6vw] text-center border-r border-slate-300 whitespace-nowrap min-w-[9vw]">Status</th>
                    <th className="px-[0.7vw] py-[0.6vw] text-center border-r border-slate-300 whitespace-nowrap w-[4.5vw]">Info</th>
                    <th className="px-[0.7vw] py-[0.6vw] text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[8vw]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(() => {
                    let lastCustomer = null;
                    return paginatedProducts.map(({ entry, product }, idx) => {
                      const isNewCustomer = entry.customerName !== lastCustomer;
                      lastCustomer = entry.customerName;

                      const status = product.report?.status || "Open";
                      const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Open"];
                      
                      return (
                        <React.Fragment key={`${entry.id}-${product._pid}`}>
                          {isNewCustomer && (
                            <tr className="bg-slate-50/70 border-y border-slate-200 sticky top-[2.2vw] z-10">
                              <td colSpan={9} className="px-[0.9vw] py-[0.35vw] border-b border-slate-200 border-r border-slate-300">
                                <div className="flex items-center gap-[0.5vw]">
                                  <div className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full" />
                                  <span className="text-[0.78vw] font-bold text-slate-800">
                                    {entry.customerName}
                                  </span>
                                  <span className="text-[0.65vw] font-mono text-slate-500 bg-white px-[0.45vw] py-[0.05vw] rounded-full border border-slate-200 ml-[0.3vw]">
                                    {entry.customerCode || "N/A"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-slate-50/70 transition-colors bg-white">
                            {/* SNo */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 font-bold text-slate-800 text-[0.76vw]">
                              {((currentPage - 1) * itemsPerPage) + idx + 1}
                            </td>

                            {/* Date */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-[0.76vw] text-slate-700 whitespace-nowrap font-medium">
                              {fmtDate(entry.date)}
                            </td>

                            {/* Registration */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.76vw] font-mono font-medium text-slate-800">{entry.refNoInternal}</div>
                              <div className="text-[0.68vw] font-semibold text-blue-600 mt-[0.05vw]">JO: {entry.jobOrderNo || "—"}</div>
                            </td>

                            {/* Customer */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.76vw] font-medium text-slate-800 truncate max-w-[12vw]">{entry.customerName}</div>
                              <div className="text-[0.68vw] font-mono text-slate-500">{entry.customerCode || "—"}</div>
                            </td>

                            {/* Product */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.76vw] font-medium text-slate-800 leading-tight">{product.productDescription}</div>
                              <div className="text-[0.68vw] text-slate-500 mt-[0.1vw] font-mono">S/N: {product.serialNumber || "—"}</div>
                            </td>

                            {/* Qty */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 text-[0.76vw] font-medium text-slate-800">
                              {product.qty || "1"}
                            </td>

                            {/* Status */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-[0.3vw] px-[0.55vw] py-[0.15vw] rounded-full border text-[0.7vw] font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                <cfg.icon className="w-[0.75vw] h-[0.75vw]" />
                                {status}
                              </span>
                            </td>

                            {/* Info */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300">
                              <button 
                                onClick={() => setInfoSelected({ entry, product })}
                                className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer inline-flex items-center justify-center"
                                title="View Details"
                              >
                                <Eye className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            </td>

                            {/* Action */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-b border-slate-300 sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                              <button
                                onClick={() => setSelected({ entry, product })}
                                className="cursor-pointer inline-flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-[0.9vw] h-[2vw] rounded-full text-[0.72vw] transition-all shadow-2xs active:scale-95"
                              >
                                <Edit3 className="w-[0.75vw] h-[0.75vw]" />
                                <span>Update Report</span>
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
          )}

          {/* Table Pagination Footer */}
          {allProducts.length > 0 && (
            <div className="border-t border-slate-200 px-[1vw] py-[0.55vw] bg-slate-50/70 flex justify-between items-center rounded-b-[0.8vw] shrink-0">
              <div className="flex items-center gap-[1.2vw]">
                <div className="text-[0.74vw] font-medium text-slate-500">
                  Showing <strong className="text-slate-800">{paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, allProducts.length)}</strong> of <strong className="text-slate-800">{allProducts.length}</strong> assigned products
                </div>
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.72vw] text-slate-500 font-medium">Rows:</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-full px-[0.5vw] py-[0.1vw] text-[0.72vw] font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                  >
                    {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-[0.5vw]">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronDown className="w-[0.85vw] h-[0.85vw] rotate-90" />
                </button>
                <div className="flex gap-[0.3vw]">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                    .map(pNum => (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-full text-[0.74vw] font-semibold cursor-pointer transition-all ${currentPage === pNum ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                      >
                        {pNum}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronUp className="w-[0.85vw] h-[0.85vw] rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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