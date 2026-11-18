import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package, Clock, User, CheckCircle, AlertCircle, X, Eye, Send,
  FileText, Calendar, Hash, Tag, Wrench,
  AlertTriangle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Search, Check, Edit3, RotateCcw
} from "lucide-react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";

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
    xs: "text-xs px-1.5 py-px",
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
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
  "Admin Returned":     { color: "purple", icon: AlertTriangle,  bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
};

// ── Read-only Input Field ─────────────────────────────────────────────────────
const RefInput = ({ label, value, span = 1 }) => (
  <div className={`flex flex-col gap-1 ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : span === 4 ? "col-span-4" : ""}`}>
    <label className="text-xs font-semibold text-black flex items-start gap-1">
      {label}
    </label>
    <div className="bg-white border border-slate-300 rounded-md py-1.5 px-2.5 text-xs text-gray-900 break-words whitespace-normal overflow-hidden min-h-[35px]">
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
    <div className="flex flex-col gap-1" ref={dropdownRef}>
      <label className="text-xs font-semibold text-black">
        {label} {mandatory && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full border border-slate-300 bg-white rounded-md py-2 px-2.5 text-xs text-left flex items-center justify-between transition-all cursor-pointer shadow-sm ${isOpen ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
        >
          <span className={selectedOption ? "text-black font-regular" : "text-gray-700"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-700 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[100] w-full mt-1 bg-white border border-slate-300 rounded-md shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-1.5 border-b border-slate-300 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-6.5 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white"
                  />
                </div>
              </div>
              <div className="max-h-[144px] overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onSelect(opt.value, opt.label);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${value === opt.value ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"}`}
                    >
                      <span>{opt.label}</span>
                      {value === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 text-center text-gray-700 text-xs">No options found</div>
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
const ProductionResponseModal = ({ entry, product, employees, fourMCategories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    workDoneBy: product.report?.workDoneBy || product.report?.assembledBy || "",
    workDoneByName: product.report?.workDoneByName || product.report?.assembledByName || "",
    rootCause: product.report?.rootCause || product.initialRootCause || "",
    fourMCategory: product.report?.fourMCategory || "",
    materialChangeDetails: product.report?.materialChangeDetails || product.report?.partsReplacement || "",
    delayTime: product.report?.delayTime !== undefined ? product.report.delayTime : (product.delayTime || ""),
    materialCost: product.report?.materialCost || "",
    correctiveActionDetails: product.report?.correctiveActionDetails || product.report?.correctiveAction || product.correction || "",
    completedDate: product.report?.completedDate ? product.report.completedDate.split('T')[0] : (product.report?.closedDate ? product.report.closedDate.split('T')[0] : todayDateStr()),
    validationStatus: product.report?.validationStatus || "Pending",
    verificationStatus: product.report?.verificationStatus || "Pending",
    closingDate: product.report?.closingDate ? product.report.closingDate.split('T')[0] : (product.report?.closedDate ? product.report.closedDate.split('T')[0] : "")
  });

  const VALIDATION_OPTIONS = [
    { value: "Pending", label: "Pending" },
    { value: "Validated", label: "Validated" },
    { value: "Not Validated", label: "Not Validated" },
    { value: "Under Testing", label: "Under Testing" }
  ];

  const VERIFICATION_OPTIONS = [
    { value: "Pending", label: "Pending" },
    { value: "Verified", label: "Verified" },
    { value: "Rejected", label: "Rejected" },
    { value: "Re-work", label: "Re-work" }
  ];
  
  const employeeOptions = useMemo(() => 
    employees.map(e => ({ value: e.userId || e.id || e._id, label: e.name })), 
  [employees]);

  const { toast } = useNotification();

  const sp = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!formData.rootCause) return toast("Root Cause is mandatory", "error");
    if (!formData.fourMCategory) return toast("4M Category is mandatory", "error");
    if (!formData.correctiveActionDetails) return toast("Corrective action details is mandatory", "error");

    const derivedStatus = formData.verificationStatus === "Verified" ? "Completed" 
      : formData.verificationStatus === "Rejected" ? "Not Repairable" 
      : formData.validationStatus === "Validated" ? "Completed" 
      : "Under Testing";

    const finalReport = {
      ...formData,
      correctiveAction: formData.correctiveActionDetails,
      closedDate: formData.closingDate || formData.completedDate,
      partsReplacement: formData.materialChangeDetails,
      status: derivedStatus,
      lastUpdated: new Date()
    };

    onSave(finalReport);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[150] flex items-center justify-center p-7">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[835px] max-h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5.5 py-3.5 flex justify-between items-center rounded-t-[12px]">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 p-1.5 rounded-full text-blue-600 border border-blue-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Production Technical Resolution</h3>
              <p className="text-sm text-slate-700 font-medium">{product.productDescription} · <span className="font-mono">{entry.refNoInternal}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          
          {/* Reference Inward Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-200 flex items-center gap-1.5 rounded-t-[12px]">
              <span className="w-1 h-3 bg-blue-600 rounded-full inline-block" />
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inward Details</span>
            </div>
            <div className="p-3.5 grid grid-cols-4 gap-4">
              <RefInput label="Registration Date" value={fmtDate(entry.date)} />
              <RefInput label="Job Order No" value={entry.jobOrderNo} />
              <RefInput label="Customer Name" value={entry.customerName} />
              <RefInput label="Customer Code" value={entry.customerCode} />
              
              <RefInput label="Product Description" value={product.productDescription} span={2} />
              <RefInput label="Product Code" value={product.productCode} />
              <RefInput label="Product Segment" value={product.productSegment || product.productType} />

              <RefInput label="Detection Stage" value={product.stage} />
              <RefInput label="NC Type" value={product.ncType} />
              <RefInput label="Problem Type" value={product.problemType} />
              <RefInput label="Problem Reported" value={product.problem || product.problemDescription} />
              <RefInput label="Qty" value={product.qty} />
              <RefInput label="Inspected By" value={product.inspectedByName} />
              <RefInput label="Designators" value={product.designators} />
              {product.boardImage && (
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Board Image</label>
                  <img 
                    src={`${API_URL}${product.boardImage}`} 
                    alt="Board" 
                    className="w-full h-16 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`${API_URL}${product.boardImage}`, '_blank')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Technical Resolution Form (Only the 11 user fields) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-200 flex items-center gap-1.5 rounded-t-[12px]">
              <span className="w-1 h-3 bg-emerald-600 rounded-full inline-block" />
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Resolution Report</span>
            </div>
            <div className="p-4 space-y-3.5">
              
              {/* Row 1: Work done by & 4M Category */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Work done by */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Work done by</label>
                  <CustomDropdown
                    value={formData.workDoneBy}
                    onChange={(val) => {
                      const opt = employeeOptions.find(e => e.value === val);
                      sp("workDoneBy", val);
                      sp("workDoneByName", opt?.label || "");
                    }}
                    options={employeeOptions}
                    placeholder="Search employee..."
                    searchable={true}
                    size="sm"
                    usePortal={true}
                    triggerClassName="!h-8 !rounded-md text-xs font-medium text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* 3. 4M Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">4M Category <span className="text-rose-500">*</span></label>
                  <CustomDropdown
                    value={formData.fourMCategory}
                    onChange={val => sp("fourMCategory", val)}
                    options={(fourMCategories || []).map(c => ({ value: c.name || c._id || c, label: c.name || c }))}
                    placeholder="Select Category"
                    size="sm"
                    usePortal={true}
                    triggerClassName="!h-8 !rounded-lg text-xs font-medium text-slate-800 border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Root Cause & Corrective action details */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 2. Root Cause */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Root Cause <span className="text-rose-500">*</span></label>
                  <textarea 
                    rows="3" 
                    value={formData.rootCause} 
                    onChange={e => sp("rootCause", e.target.value)} 
                    placeholder="Analyze root cause..." 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" 
                  />
                </div>

                {/* 7. Corrective action details */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Corrective action details <span className="text-rose-500">*</span></label>
                  <textarea 
                    rows="3" 
                    value={formData.correctiveActionDetails} 
                    onChange={e => sp("correctiveActionDetails", e.target.value)} 
                    placeholder="Corrective action details taken..." 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" 
                  />
                </div>
              </div>

              {/* Row 3: Material Change Details */}
              {/* 4. Material Change Details */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Material Change Details</label>
                <textarea 
                  rows="2" 
                  value={formData.materialChangeDetails} 
                  onChange={e => sp("materialChangeDetails", e.target.value)} 
                  placeholder="Enter details of materials or components changed..." 
                  className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all w-full" 
                />
              </div>

              {/* Row 4: Delay time & Material Cost */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 5. Delay time */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Delay time</label>
                  <input 
                    type="text" 
                    value={formData.delayTime} 
                    onChange={e => sp("delayTime", e.target.value)} 
                    placeholder="Delay time (e.g. in mins or hours)..." 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all" 
                  />
                </div>

                {/* 6. Material Cost */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Material Cost</label>
                  <input 
                    type="text" 
                    value={formData.materialCost} 
                    onChange={e => sp("materialCost", e.target.value)} 
                    placeholder="Enter material cost..." 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all" 
                  />
                </div>
              </div>

              {/* Row 5: Validation Status & Verification Status */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 9. Validation Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Validation Status</label>
                  <CustomDropdown
                    value={formData.validationStatus}
                    onChange={val => sp("validationStatus", val)}
                    options={VALIDATION_OPTIONS}
                    placeholder="Select Validation Status"
                    size="sm"
                    usePortal={true}
                    triggerClassName="!h-8 !rounded-lg text-xs font-medium text-slate-800 border-slate-200 bg-white"
                  />
                </div>

                {/* 10. Verification Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Verification Status</label>
                  <CustomDropdown
                    value={formData.verificationStatus}
                    onChange={val => sp("verificationStatus", val)}
                    options={VERIFICATION_OPTIONS}
                    placeholder="Select Verification Status"
                    size="sm"
                    usePortal={true}
                    triggerClassName="!h-8 !rounded-lg text-xs font-medium text-slate-800 border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Completed date & Closing Date */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 8. Completed date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Completed date</label>
                  <input 
                    type="date" 
                    value={formData.completedDate} 
                    onChange={e => sp("completedDate", e.target.value)} 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" 
                  />
                </div>

                {/* 11. Closing Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Closing Date</label>
                  <input 
                    type="date" 
                    value={formData.closingDate} 
                    onChange={e => sp("closingDate", e.target.value)} 
                    className="bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" 
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5.5 py-3 border-t border-slate-200 bg-white flex justify-end items-center rounded-b-[12px]">
          <div className="flex gap-2.5">
            <button onClick={onClose} className="px-4 h-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full text-xs cursor-pointer transition-all">Cancel</button>
            <button onClick={handleSave} className="px-5 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5 transition-all active:scale-95">
              <Send className="w-3 h-3" />
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[200] flex items-center justify-center p-7">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[720px] max-h-[88vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="bg-white border-b border-slate-200 px-5.5 py-3.5 flex justify-between items-center rounded-t-[12px]">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 p-1.5 rounded-full text-blue-600 border border-blue-100">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Technical Record Details</h3>
              <p className="text-sm text-slate-700 font-medium">{entry.refNoInternal} · {entry.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
               <h4 className="text-xs font-bold text-blue-600 border-b border-blue-100 pb-1 uppercase tracking-wider flex items-center gap-1.5">
                 <span className="w-1 h-3 bg-blue-600 rounded-full inline-block" /> Inward Information
               </h4>
               <div className="grid grid-cols-1 gap-2.5">
                 <RefInput label="Registration Date" value={fmtDate(entry.date)} />
                 <RefInput label="Job Order No" value={entry.jobOrderNo} />
                 <RefInput label="Reference No" value={entry.refNoInternal} />
                 <RefInput label="Customer" value={entry.customerName} />
               </div>
            </div>
            <div className="space-y-3">
               <h4 className="text-xs font-bold text-emerald-600 border-b border-emerald-100 pb-1 uppercase tracking-wider flex items-center gap-1.5">
                 <Package className="w-3.5 h-3.5" /> Product Details
               </h4>
               <div className="grid grid-cols-1 gap-2.5">
                 <RefInput label="Description" value={product.productDescription} />
                 <RefInput label="Code" value={product.productCode} />
                 <RefInput label="NC Type" value={product.ncType || "Internal"} />
                 <RefInput label="Qty" value={product.qty || "1"} />
                 <RefInput label="Serial Number" value={product.serialNumber || product.identification} />
                 <RefInput label="Current Status" value={product.report?.status || "Open"} />
               </div>
            </div>
          </div>

          {product.report && (
            <div className="space-y-3 p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
               <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1 uppercase tracking-wider flex items-center gap-1.5">
                 <Wrench className="w-3.5 h-3.5 text-slate-700" /> Technical Resolution Report
               </h4>
               <div className="grid grid-cols-2 gap-3">
                 <RefInput label="Work done by" value={product.report.workDoneByName || product.report.workDoneBy} />
                 <RefInput label="4M Category" value={product.report.fourMCategory} />
                 <RefInput label="Root Cause" value={product.report.rootCause} span={2} />
                 <RefInput label="Corrective action details" value={product.report.correctiveActionDetails || product.report.correctiveAction} span={2} />
                 <RefInput label="Material Change Details" value={product.report.materialChangeDetails || product.report.partsReplacement} span={2} />
                 <RefInput label="Delay time" value={product.report.delayTime} />
                 <RefInput label="Material Cost" value={product.report.materialCost} />
                 <RefInput label="Validation Status" value={product.report.validationStatus} />
                 <RefInput label="Verification Status" value={product.report.verificationStatus} />
                 <RefInput label="Completed date" value={fmtDate(product.report.completedDate)} />
                 <RefInput label="Closing Date" value={fmtDate(product.report.closingDate || product.report.closedDate)} />
               </div>
            </div>
          )}

          {/* Update History */}
          {product.report?.history && product.report.history.length > 0 && (
            <div className="space-y-2.5 p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
               <h4 className="text-xs font-bold text-blue-600 border-b border-blue-100 pb-1 flex items-center gap-1.5 uppercase tracking-wider">
                 <Clock className="w-3.5 h-3.5" /> Update History Log
               </h4>
               <div className="space-y-2 max-h-[202px] overflow-y-auto pr-1.5 custom-scrollbar">
                 {product.report.history.slice().reverse().map((h, i) => (
                   <div key={i} className="flex flex-col gap-1 p-2.5 rounded-md bg-slate-50 border border-slate-200 hover:bg-blue-50/30 transition-colors">
                     <div className="flex justify-between items-center">
                       <Badge label={h.status} color={STATUS_CONFIG[h.status]?.color || "gray"} size="xs" />
                       <span className="text-sm text-slate-700 font-medium font-mono">
                         {fmtDate(h.timestamp)} · {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                       </span>
                     </div>
                     {h.remark && (
                       <div className="text-sm text-slate-600 italic mt-px">
                         "{h.remark}"
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-200 bg-white text-right rounded-b-[12px]">
          <button onClick={onClose} className="px-5 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold text-xs cursor-pointer transition-all">Close</button>
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
  const [expandedCustomerDetails, setExpandedCustomerDetails] = useState({});

  const toggleCustomerDetails = (custName, e) => {
    if (e) e.stopPropagation();
    setExpandedCustomerDetails(prev => ({
      ...prev,
      [custName]: !prev[custName]
    }));
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // Load User
  useEffect(() => {
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
    entries.forEach(entry => {
      entry.products?.forEach(product => {
        // Only include items assigned to the current user (by ID or matching name)
        const isAssignedToMe = myId 
          ? (product.assignedTo === myId || (currentUser?.name && product.assignedToName === currentUser.name))
          : false;
        if (isAssignedToMe) {
          list.push({ entry, product });
        }
      });
    });
    return list;
  }, [entries, currentUser]);

  const counts = useMemo(() => {
    const c = { 
      All: myProducts.length,
      "Repair in Progress": 0,
      Pending: 0,
      "Not Repairable": 0,
      "Under Testing": 0,
      Completed: 0,
      "Admin Returned": 0
    };
    myProducts.forEach(({ product }) => {
      const rawStatus = product.report?.status || "Open";
      const isAdminReturned =
        rawStatus === "Completed" &&
        (product.finalStatusHistory?.length ?? 0) > 0 &&
        product.finalStatus !== "Completed";

      if (isAdminReturned) {
        c["Admin Returned"]++;
      } else {
        const s = rawStatus === "Open" ? "Pending" : rawStatus;
        if (c[s] !== undefined) {
          c[s]++;
        }
      }
    });
    return c;
  }, [myProducts]);

  const STATUS_CHIPS = [
    { label: "All" },
    { label: "Repair in Progress" },
    { label: "Pending" },
    { label: "Not Repairable" },
    { label: "Under Testing" },
    { label: "Completed" },
    { label: "Admin Returned" }
  ];

  const allProducts = useMemo(() => {
    let filtered = myProducts;
    if (filterStatus !== "All") {
      if (filterStatus === "Admin Returned") {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          return (
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed"
          );
        });
      } else if (filterStatus === "Pending") {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          const isAdminReturned =
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed";
          return !isAdminReturned && (rawStatus === "Pending" || rawStatus === "Open");
        });
      } else {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          const isAdminReturned =
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed";
          return !isAdminReturned && rawStatus === filterStatus;
        });
      }
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
    <div className="flex flex-col items-center justify-center p-36 gap-5.5">
      <div className="w-11 h-11 border-[5px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      <div className="text-blue-600 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Production Data...</div>
    </div>
  );

  return (
    <div className="w-full h-full font-sans text-sm flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col gap-2 h-full flex-1 min-h-0">
        {/* ── 1. Top Level Scoping Toolbar: Soft Pill Search, Date Range, Clear & Page navigation ── */}
        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-2.5 shrink-0">
          {/* Soft Pill Search Box */}
          <div className="relative w-[288px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by customer, code, JO, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 h-8 border-0 rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-700 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Right cluster: Date Range, Clear, Rows Per Page */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Unified Date Range Capsule */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-full h-8 px-3 bg-white text-xs shadow-2xs hover:border-slate-300 transition-all">
              <span className="text-slate-700 font-medium text-xs">From</span>
              <input
                ref={fromDateRef}
                type="date"
                value={dateFrom || ""}
                onChange={(e) => setDateFrom(e.target.value)}
                className="no-native-calendar text-xs text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  if (fromDateRef.current) {
                    try { fromDateRef.current.showPicker(); } catch { fromDateRef.current.focus(); }
                  }
                }}
                className="p-0 border-0 bg-transparent cursor-pointer text-slate-700 hover:text-blue-600 transition-colors flex items-center mr-0.5"
                title="Choose from date"
              >
                <Calendar className="w-3 h-3 shrink-0" />
              </button>
              <span className="text-slate-700 mx-0.5 text-sm">→</span>
              <span className="text-slate-700 font-medium text-xs">To</span>
              <input
                ref={toDateRef}
                type="date"
                value={dateTo || ""}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="no-native-calendar text-xs text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  if (toDateRef.current) {
                    try { toDateRef.current.showPicker(); } catch { toDateRef.current.focus(); }
                  }
                }}
                className="p-0 border-0 bg-transparent cursor-pointer text-slate-700 hover:text-blue-600 transition-colors flex items-center ml-px"
                title="Choose to date"
              >
                <Calendar className="w-3 h-3 shrink-0" />
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
                className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
                title="Clear date filter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}

            {/* Quick Pagination Pill */}
            {allProducts.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100/70 border border-slate-200/90 h-8 px-2.5 rounded-full">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-1">
                  {currentPage} <span className="text-slate-700 font-normal">/</span> {totalPages || 1}
                </span>
                <button 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Table Card with Integrated Header Bar & Filter Tabs ── */}
        <div className="bg-white rounded-xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
          {/* Integrated Header: Segment Track on left, Result count on right */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/50 shrink-0">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/90 gap-1.5 max-w-full overflow-x-auto min-w-0">
              {STATUS_CHIPS.map(({ label }) => {
                const isActive = filterStatus === label;
                const count = counts[label] ?? 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterStatus(label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-slate-700"}>
                      {label}
                    </span>
                    <span
                      className={`text-sm font-medium ml-px transition-all ${
                        isActive
                          ? "bg-white/20 text-white px-1.5 py-0 rounded-full"
                          : "text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scoped Result Count */}
            <div className="text-xs text-slate-700 font-medium whitespace-nowrap pl-2 flex items-center gap-1">
              <span>Showing</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-px rounded text-sm">
                {allProducts.length}
              </span>
              <span>items</span>
            </div>
          </div>

          {/* Main Table */}
          {allProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-14 bg-white">
              <AlertCircle className="w-9 h-9 text-slate-600 mb-2.5" />
              <p className="text-sm font-medium text-slate-700">No records found for the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-2.5 py-2.5 text-center border-r border-slate-300 whitespace-nowrap w-12">S.No</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-300 whitespace-nowrap min-w-24">Date</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-300 whitespace-nowrap min-w-36">Registration</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-300 whitespace-nowrap min-w-44">Customer</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-300 whitespace-nowrap min-w-52">Product</th>
                    <th className="px-2.5 py-2.5 text-center border-r border-slate-300 whitespace-nowrap w-14">Qty</th>
                    <th className="px-2.5 py-2.5 text-center border-r border-slate-300 whitespace-nowrap min-w-32">Status</th>
                    <th className="px-2.5 py-2.5 text-center border-r border-slate-300 whitespace-nowrap w-16">Info</th>
                    <th className="px-2.5 py-2.5 text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(() => {
                    let lastCustomer = null;
                    return paginatedProducts.map(({ entry, product }, idx) => {
                      const isNewCustomer = entry.customerName !== lastCustomer;
                      lastCustomer = entry.customerName;

                      const rawStatus = product.report?.status || "Open";
                      const isAdminReturned =
                        rawStatus === "Completed" &&
                        (product.finalStatusHistory?.length ?? 0) > 0 &&
                        product.finalStatus !== "Completed";
                      
                      const status = isAdminReturned ? "Admin Returned" : rawStatus;
                      const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Open"];
                      const isExpanded = !!expandedCustomerDetails[entry.customerName];
                      
                      return (
                        <React.Fragment key={`${entry.id}-${product._pid}`}>
                          {isNewCustomer && (
                            <tr className="bg-slate-50/80 border-y border-slate-300">
                              <td colSpan={9} className="p-0 border-b border-slate-300 bg-slate-50/90 sticky top-[32px] z-20 shadow-2xs">
                                <div className="flex items-center gap-2.5 sticky left-0 w-fit px-3.5 py-2 bg-slate-50 z-10">
                                  <div className="w-1.5 h-4 bg-slate-400 rounded-full" />
                                  <span className="font-semibold text-slate-800 text-xs tracking-wide">
                                    {entry.customerName}
                                  </span>

                                  {/* Toggle button to reveal / hide customer details */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleCustomerDetails(entry.customerName, e)}
                                    title={isExpanded ? "Collapse customer details" : "Expand customer details"}
                                    className="px-1.5 py-0.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-300 hover:border-blue-300 rounded-sm transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1 shadow-2xs"
                                  >
                                    <Icon
                                      icon={isExpanded ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
                                      className="w-3 h-3"
                                    />
                                  </button>

                                  {/* Customer metadata badges: hidden by default, revealed on clicking chevron */}
                                  {isExpanded && (
                                    <div className="flex items-center gap-1.5 flex-wrap animate-in fade-in duration-200">
                                      {entry.customerCode && (
                                        <span className="text-xs text-slate-700 font-medium ml-1">
                                          Code: {entry.customerCode}
                                        </span>
                                      )}
                                      {entry.jobOrderNo && (
                                        <span className="text-sm font-normal bg-purple-50 text-purple-600 border border-purple-200 px-2.5 py-px rounded-md whitespace-nowrap ml-1">
                                          Cust Ref: {entry.jobOrderNo}
                                        </span>
                                      )}
                                      {entry.refNoInternal && (
                                        <span className="text-sm font-normal bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-px rounded-md whitespace-nowrap ml-1">
                                          Int Ref: {entry.refNoInternal}
                                        </span>
                                      )}
                                      {entry.category && (
                                        <span className="text-sm font-normal text-slate-700 bg-slate-50 border border-slate-300 px-2.5 py-px rounded-md whitespace-nowrap ml-1">
                                          Type: {entry.category}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Admin Returned Banner Row if returned */}
                          {isAdminReturned && (
                            <tr className="bg-amber-50/90 border-t-2 border-b border-amber-300">
                              <td colSpan={9} className="p-0 border-b border-amber-300 bg-amber-50">
                                <div className="flex items-center gap-3 px-4 py-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-xs font-semibold shadow-2xs">
                                    <Icon icon="solar:danger-triangle-linear" className="w-3.5 h-3.5 text-amber-700" />
                                    Admin Returned / Declined
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full border text-sm font-medium bg-amber-50 text-amber-700 border-amber-300">
                                    {product.finalStatus || "Admin Returned"}
                                  </span>
                                  {product.finalStatusRemarks && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-normal bg-white border border-amber-200 px-2.5 py-1 rounded-md shadow-2xs">
                                      <Icon icon="solar:chat-round-dots-linear" className="w-3.5 h-3.5 text-slate-600" />
                                      <span className="font-medium text-slate-900">Admin Reason:</span> {product.finalStatusRemarks}
                                    </span>
                                  )}
                                  <span className="text-sm text-amber-800 italic ml-1">
                                    Please edit and click Update Report to re-submit to Admin
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}

                          <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                            {/* SNo */}
                            <td className="px-2.5 py-2.5 text-center border-r border-b border-slate-300 font-semibold text-slate-800 text-xs">
                              {((currentPage - 1) * itemsPerPage) + idx + 1}
                            </td>

                            {/* Date */}
                            <td className="px-2.5 py-2.5 border-r border-b border-slate-300 text-xs text-slate-800 whitespace-nowrap font-medium">
                              {fmtDate(entry.date)}
                            </td>

                            {/* Registration */}
                            <td className="px-2.5 py-2.5 border-r border-b border-slate-300">
                              <div className="text-xs font-mono font-medium text-black">{entry.refNoInternal}</div>
                              <div className="text-sm font-medium text-blue-700 mt-px">JO: {entry.jobOrderNo || "—"}</div>
                            </td>

                            {/* Customer */}
                            <td className="px-2.5 py-2.5 border-r border-b border-slate-300">
                              <div className="text-xs font-medium text-black truncate max-w-44">{entry.customerName}</div>
                              <div className="text-sm font-mono text-slate-700 font-medium">{entry.customerCode || "—"}</div>
                            </td>

                            {/* Product */}
                            <td className="px-2.5 py-2.5 border-r border-b border-slate-300">
                              <div className="text-xs font-medium text-black leading-tight">{product.productDescription}</div>
                              <div className="text-sm text-slate-700 mt-px font-mono font-medium">S/N: {product.serialNumber || product.identification || "—"}</div>
                            </td>

                            {/* Qty */}
                            <td className="px-2.5 py-2.5 text-center border-r border-b border-slate-300 text-xs font-medium text-black">
                              {product.qty || "1"}
                            </td>

                            {/* Status */}
                            <td className="px-2.5 py-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-sm font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                <cfg.icon className="w-3 h-3" />
                                {status}
                              </span>
                            </td>

                            {/* Info */}
                            <td className="px-2.5 py-2.5 text-center border-r border-b border-slate-300">
                              <button 
                                onClick={() => setInfoSelected({ entry, product })}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer inline-flex items-center justify-center"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>

                            {/* Action */}
                            <td className="px-2.5 py-2.5 text-center border-b border-slate-300 sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                              <button
                                onClick={() => setSelected({ entry, product })}
                                className="cursor-pointer inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 h-7 rounded-full text-sm transition-all shadow-2xs active:scale-95"
                              >
                                <Edit3 className="w-3 h-3" />
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
            <div className="border-t border-slate-200 px-3.5 py-2 bg-slate-50/70 flex justify-between items-center rounded-b-[12px] shrink-0">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-slate-700">
                  Showing <strong className="text-slate-800">{paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, allProducts.length)}</strong> of <strong className="text-slate-800">{allProducts.length}</strong> assigned products
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-700 font-medium">Rows:</span>
                  <div className="w-18">
                    <CustomDropdown
                      value={itemsPerPage}
                      onChange={val => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
                      options={[
                        { value: 10, label: "10" },
                        { value: 20, label: "20" },
                        { value: 50, label: "50" }
                      ]}
                      size="sm"
                      usePortal={true}
                      placement="top"
                      triggerClassName="!h-6.5 !rounded-full !px-2 text-sm font-semibold text-slate-700 border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Pagination Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-6.5 h-6.5 flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all font-bold text-sm"
                  title="First Page"
                >
                  «
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-6.5 h-6.5 flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronDown className="w-3 h-3 rotate-90" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pNum => pNum === 1 || pNum === totalPages || Math.abs(pNum - currentPage) <= 1)
                    .map((pNum, pIdx, arr) => {
                      const prev = arr[pIdx - 1];
                      return (
                        <React.Fragment key={pNum}>
                          {prev && pNum - prev > 1 && <span className="text-sm text-slate-700 px-px">...</span>}
                          <button
                            onClick={() => setCurrentPage(pNum)}
                            className={`w-6.5 h-6.5 flex items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all ${currentPage === pNum ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                          >
                            {pNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="w-6.5 h-6.5 flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronUp className="w-3 h-3 rotate-90" />
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-6.5 h-6.5 flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all font-bold text-sm"
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Update Technical Report */}
        <AnimatePresence>
          {selected && (
            <ProductionResponseModal
              entry={selected.entry}
              product={selected.product}
              employees={employees}
              fourMCategories={fourMCategories}
              caeHistory={caeHistory}
              onSave={handleSaveReport}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>

        {/* Modal: View Details */}
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
    </div>
  );
}
