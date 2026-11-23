import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
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
    xs: "text-[0.63vw] px-[0.35vw] py-[0.08vw]",
    sm: "text-[0.7vw] px-[0.45vw] py-[0.12vw]",
    md: "text-[0.77vw] px-[0.55vw] py-[0.15vw]",
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
  <div className={`flex flex-col gap-[0.25vw] ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : span === 4 ? "col-span-4" : ""}`}>
    <label className="text-[0.8vw] font-semibold text-black flex items-start gap-[0.25vw]">
      {label}
    </label>
    <div className="bg-white border border-slate-300 rounded-[0.4vw] py-[0.45vw] px-[0.6vw] text-[0.85vw] text-gray-900 break-words whitespace-normal overflow-hidden min-h-[2.4vw]">
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
      <label className="text-[0.85vw] font-semibold text-black">
        {label} {mandatory && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full border border-slate-300 bg-white rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.83vw] text-left flex items-center justify-between transition-all cursor-pointer shadow-sm ${isOpen ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
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
                    className="w-full pl-[1.8vw] pr-[0.6vw] py-[0.4vw] text-[0.8vw] border border-slate-300 rounded-[0.3vw] outline-none focus:border-blue-400 bg-white"
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
                      className={`px-[0.8vw] py-[0.5vw] text-[0.83vw] cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${value === opt.value ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"}`}
                    >
                      <span>{opt.label}</span>
                      {value === opt.value && <Check className="w-[0.9vw] h-[0.9vw] text-blue-600" />}
                    </div>
                  ))
                ) : (
                  <div className="p-[0.6vw] text-center text-gray-400 text-[0.8vw]">No options found</div>
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
const ProductionResponseModal = ({ entry, product, employees, fourMCategories, caeHistory, currentUser, onSave, onClose }) => {
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

    // Verification & Validation permissions based on user requirements:
    // Internal NC:
    //   - Raised To is the same register person.
    //   - Verification & validation can both be done by the register/assigned person.
    // External & Field Return NC:
    //   - Verification is done by the Raised To person (station where defect is raised/repaired).
    //   - Validation is done by the Register person (finder / creator who initiated the NC).
    const currentUserId = currentUser?.userId || currentUser?.id;
    const isFinder = Boolean(currentUserId && (
      product.inspectedBy === currentUserId || 
      entry.creatorUserId === currentUserId || 
      (currentUser?.name && product.inspectedByName === currentUser.name)
    ));
    const isRaisedTo = Boolean(currentUserId && (
      product.raisedTo === currentUserId || 
      product.assignedTo === currentUserId || 
      (currentUser?.name && (product.raisedToName === currentUser.name || product.assignedToName === currentUser.name))
    ));

    const isExternalOrFieldReturn = product.ncType === "External" || product.ncType === "Field Return";
    const canValidate = isExternalOrFieldReturn ? isFinder : (isFinder || isRaisedTo);
    const canVerify = isExternalOrFieldReturn ? isRaisedTo : (isFinder || isRaisedTo);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[150] flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[58vw] max-h-[92vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center rounded-t-[0.8vw]">
          <div className="flex items-center gap-[0.7vw]">
            <div className="bg-blue-50 p-[0.45vw] rounded-full text-blue-600 border border-blue-100">
              <FileText className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-slate-800">Production Technical Resolution</h3>
              <p className="text-[0.77vw] text-slate-500 font-medium">{product.productDescription} · <span className="font-mono">{entry.refNoInternal}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          
          {/* Reference Inward Info */}
          <div className="bg-white rounded-[0.8vw] border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-[1vw] py-[0.55vw] border-b border-slate-200 flex items-center gap-[0.45vw] rounded-t-[0.8vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full inline-block" />
              <Info className="w-[0.9vw] h-[0.9vw] text-blue-600" />
              <span className="text-[0.8vw] font-bold text-slate-700 uppercase tracking-wider">Inward Details</span>
            </div>
            <div className="p-[1vw] grid grid-cols-4 gap-[1.2vw]">
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
                <div className="col-span-1 flex flex-col gap-[0.25vw]">
                  <label className="text-[0.8vw] font-semibold text-slate-700 uppercase">Board Image</label>
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

          {/* Technical Resolution Form (Only the 11 user fields) */}
          <div className="bg-white rounded-[0.8vw] border border-slate-200 shadow-2xs">
            <div className="bg-slate-50/80 px-[1vw] py-[0.55vw] border-b border-slate-200 flex items-center gap-[0.45vw] rounded-t-[0.8vw]">
              <span className="w-[0.25vw] h-[0.85vw] bg-emerald-600 rounded-full inline-block" />
              <Wrench className="w-[0.9vw] h-[0.9vw] text-emerald-600" />
              <span className="text-[0.8vw] font-bold text-slate-700 uppercase tracking-wider">Resolution Report</span>
            </div>
            <div className="p-[1.2vw] space-y-[1vw]">
              
              {/* Row 1: Work done by & 4M Category */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 1. Work done by */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Work done by</label>
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
                    triggerClassName="!h-[2.3vw] !rounded-[0.4vw] text-[0.83vw] font-medium text-slate-800 border-slate-300 bg-white"
                  />
                </div>

                {/* 3. 4M Category */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">4M Category <span className="text-rose-500">*</span></label>
                  <CustomDropdown
                    value={formData.fourMCategory}
                    onChange={val => sp("fourMCategory", val)}
                    options={(fourMCategories || []).map(c => ({ value: c.name || c._id || c, label: c.name || c }))}
                    placeholder="Select Category"
                    size="sm"
                    usePortal={true}
                    triggerClassName="!h-[2.3vw] !rounded-[0.5vw] text-[0.83vw] font-medium text-slate-800 border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Root Cause & Corrective action details */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 2. Root Cause */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Root Cause <span className="text-rose-500">*</span></label>
                  <textarea 
                    rows="3" 
                    value={formData.rootCause} 
                    onChange={e => sp("rootCause", e.target.value)} 
                    placeholder="Analyze root cause..." 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" 
                  />
                </div>

                {/* 7. Corrective action details */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Corrective action details <span className="text-rose-500">*</span></label>
                  <textarea 
                    rows="3" 
                    value={formData.correctiveActionDetails} 
                    onChange={e => sp("correctiveActionDetails", e.target.value)} 
                    placeholder="Corrective action details taken..." 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all" 
                  />
                </div>
              </div>

              {/* Row 3: Material Change Details */}
              {/* 4. Material Change Details */}
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700">Material Change Details</label>
                <textarea 
                  rows="2" 
                  value={formData.materialChangeDetails} 
                  onChange={e => sp("materialChangeDetails", e.target.value)} 
                  placeholder="Enter details of materials or components changed..." 
                  className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition-all w-full" 
                />
              </div>

              {/* Row 4: Delay time & Material Cost */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 5. Delay time */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Delay time</label>
                  <input 
                    type="text" 
                    value={formData.delayTime} 
                    onChange={e => sp("delayTime", e.target.value)} 
                    placeholder="Delay time (e.g. in mins or hours)..." 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all" 
                  />
                </div>

                {/* 6. Material Cost */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Material Cost</label>
                  <input 
                    type="text" 
                    value={formData.materialCost} 
                    onChange={e => sp("materialCost", e.target.value)} 
                    placeholder="Enter material cost..." 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all" 
                  />
                </div>
              </div>

              {/* Row 5: Validation Status & Verification Status */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 9. Validation Status */}
                <div className="flex flex-col gap-[0.3vw]">
                  <div className="flex justify-between items-center">
                    <label className="text-[0.81vw] font-semibold text-slate-700">Validation Status</label>
                    {!canValidate && (
                      <span className="text-[0.68vw] text-amber-700 font-medium bg-amber-50 px-[0.35vw] py-[0.05vw] rounded border border-amber-200">
                        {isExternalOrFieldReturn ? "Only Register Person can Validate" : "Locked"}
                      </span>
                    )}
                  </div>
                  <CustomDropdown
                    value={formData.validationStatus}
                    onChange={val => sp("validationStatus", val)}
                    options={VALIDATION_OPTIONS}
                    disabled={!canValidate}
                    placeholder="Select Validation Status"
                    size="sm"
                    usePortal={true}
                    triggerClassName={`!h-[2.3vw] !rounded-[0.5vw] text-[0.83vw] font-medium border-slate-200 ${
                      !canValidate ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "text-slate-800 bg-white"
                    }`}
                  />
                </div>

                {/* 10. Verification Status */}
                <div className="flex flex-col gap-[0.3vw]">
                  <div className="flex justify-between items-center">
                    <label className="text-[0.81vw] font-semibold text-slate-700">Verification Status</label>
                    {!canVerify && (
                      <span className="text-[0.68vw] text-amber-700 font-medium bg-amber-50 px-[0.35vw] py-[0.05vw] rounded border border-amber-200">
                        {isExternalOrFieldReturn ? "Only Raised To Person can Verify" : "Locked"}
                      </span>
                    )}
                  </div>
                  <CustomDropdown
                    value={formData.verificationStatus}
                    onChange={val => sp("verificationStatus", val)}
                    options={VERIFICATION_OPTIONS}
                    disabled={!canVerify}
                    placeholder="Select Verification Status"
                    size="sm"
                    usePortal={true}
                    triggerClassName={`!h-[2.3vw] !rounded-[0.5vw] text-[0.83vw] font-medium border-slate-200 ${
                      !canVerify ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "text-slate-800 bg-white"
                    }`}
                  />
                </div>
              </div>

              {/* Row 6: Completed date & Closing Date */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 8. Completed date */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Completed date</label>
                  <input 
                    type="date" 
                    value={formData.completedDate} 
                    onChange={e => sp("completedDate", e.target.value)} 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" 
                  />
                </div>

                {/* 11. Closing Date */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.81vw] font-semibold text-slate-700">Closing Date</label>
                  <input 
                    type="date" 
                    value={formData.closingDate} 
                    onChange={e => sp("closingDate", e.target.value)} 
                    className="bg-white border border-slate-200 rounded-[0.5vw] py-[0.5vw] px-[0.7vw] text-[0.83vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all cursor-pointer" 
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-200 bg-white flex justify-end items-center rounded-b-[0.8vw]">
          <div className="flex gap-[0.6vw]">
            <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full text-[0.81vw] cursor-pointer transition-all">Cancel</button>
            <button onClick={handleSave} className="px-[1.4vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[0.81vw] font-semibold cursor-pointer shadow-xs flex items-center gap-[0.4vw] transition-all active:scale-95">
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
              <h3 className="text-[1.1vw] font-bold text-slate-800">Technical Record Details</h3>
              <p className="text-[0.77vw] text-slate-500 font-medium">{entry.refNoInternal} · {entry.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          <div className="grid grid-cols-2 gap-[1.2vw]">
            <div className="space-y-[0.8vw]">
               <h4 className="text-[0.85vw] font-bold text-blue-600 border-b border-blue-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full inline-block" /> Inward Information
               </h4>
               <div className="grid grid-cols-1 gap-[0.6vw]">
                 <RefInput label="Registration Date" value={fmtDate(entry.date)} />
                 <RefInput label="Job Order No" value={entry.jobOrderNo} />
                 <RefInput label="Reference No" value={entry.refNoInternal} />
                 <RefInput label="Customer" value={entry.customerName} />
               </div>
            </div>
            <div className="space-y-[0.8vw]">
               <h4 className="text-[0.85vw] font-bold text-emerald-600 border-b border-emerald-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <Package className="w-[0.9vw] h-[0.9vw]" /> Product Details
               </h4>
               <div className="grid grid-cols-1 gap-[0.6vw]">
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
            <div className="space-y-[0.8vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-200 shadow-2xs">
               <h4 className="text-[0.85vw] font-bold text-slate-700 border-b border-slate-100 pb-[0.3vw] uppercase tracking-wider flex items-center gap-[0.4vw]">
                 <Wrench className="w-[0.9vw] h-[0.9vw] text-slate-500" /> Technical Resolution Report
               </h4>
               <div className="grid grid-cols-2 gap-[0.8vw]">
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
            <div className="space-y-[0.6vw] p-[1vw] bg-white rounded-[0.6vw] border border-slate-200 shadow-2xs">
               <h4 className="text-[0.85vw] font-bold text-blue-600 border-b border-blue-100 pb-[0.3vw] flex items-center gap-[0.4vw] uppercase tracking-wider">
                 <Clock className="w-[0.9vw] h-[0.9vw]" /> Update History Log
               </h4>
               <div className="space-y-[0.5vw] max-h-[14vw] overflow-y-auto pr-[0.4vw] custom-scrollbar">
                 {product.report.history.slice().reverse().map((h, i) => (
                   <div key={i} className="flex flex-col gap-[0.2vw] p-[0.6vw] rounded-[0.4vw] bg-slate-50 border border-slate-200 hover:bg-blue-50/30 transition-colors">
                     <div className="flex justify-between items-center">
                       <Badge label={h.status} color={STATUS_CONFIG[h.status]?.color || "gray"} size="xs" />
                       <span className="text-[0.71vw] text-slate-700 font-medium font-mono">
                         {fmtDate(h.timestamp)} · {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                       </span>
                     </div>
                     {h.remark && (
                       <div className="text-[0.77vw] text-slate-600 italic mt-[0.1vw]">
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
          <button onClick={onClose} className="px-[1.4vw] h-[2.2vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold text-[0.81vw] cursor-pointer transition-all">Close</button>
        </div>
      </motion.div>
    </div>
  );
};

export default function ProductionMaterialResponse() {
  const { toast } = useNotification();
  const location = useLocation();

  // If navigated from Production NC with a target filter:
  const navFilter = location.state?.filterTerm || "";

  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [infoSelected, setInfoSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState(navFilter);
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

  // Sync if navigation state changes
  useEffect(() => {
    if (location.state?.filterTerm !== undefined) {
      setSearchTerm(location.state.filterTerm || "");
    }
  }, [location.state]);

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
      const rawUser = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "{}";
      const u = JSON.parse(rawUser);
      const uid = u.userId || u._id || "";
      const uRole = u.role || "";
      const uDept = u.department || "";

      const queryParams = new URLSearchParams();
      if (uid) queryParams.append("userId", uid);
      if (uRole) queryParams.append("role", uRole);
      if (uDept) queryParams.append("department", uDept);

      const [matRes, empRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/production-material?${queryParams.toString()}`),
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
    // Since backend already enforces Detection Stage mapping, department boundaries,
    // and overarching admin access, entries returned by backend are valid for this user.
    entries.forEach(entry => {
      entry.products?.forEach(product => {
        list.push({ entry, product });
      });
    });
    return list;
  }, [entries]);

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
        (p.product._pid || "").toLowerCase().includes(s) ||
        (p.product._id || "").toLowerCase().includes(s) ||
        (p.entry._id || "").toLowerCase().includes(s) ||
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

  return (
    <div className="w-full h-full font-sans text-[0.9vw] flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0">
        {/* ── 1. Top Level Scoping Toolbar: Soft Pill Search, Date Range, Clear & Page navigation ── */}
        <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border-[1.5px] border-slate-400 status-pills-track gap-[0.7vw] shrink-0">
          {/* Soft Pill Search Box */}
          <div className="relative w-[20vw]">
            <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
            <input
              type="text"
              placeholder="Search by customer, code, JO, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.81vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            )}
          </div>

          {/* Right cluster: Date Range, Clear, Rows Per Page */}
          <div className="flex items-center gap-[0.6vw] flex-shrink-0">
            {/* Unified Date Range Capsule */}
            <div className="flex items-center gap-[0.35vw] date-range-capsule border border-slate-300 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.8vw] shadow-2xs hover:border-slate-300 transition-all">
              <span className="text-slate-500 font-medium text-[0.79vw]">From</span>
              <input
                ref={fromDateRef}
                type="date"
                value={dateFrom || ""}
                onChange={(e) => setDateFrom(e.target.value)}
                className="no-native-calendar text-[0.8vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
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
              <span className="text-slate-400 mx-[0.15vw] text-[0.9vw]">→</span>
              <span className="text-slate-500 font-medium text-[0.79vw]">To</span>
              <input
                ref={toDateRef}
                type="date"
                value={dateTo || ""}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="no-native-calendar text-[0.8vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
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
                className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.79vw] font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-700 border-[1.5px] border-rose-400 transition-all cursor-pointer shadow-2xs"
                title="Clear date filter"
              >
                <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                <span>Clear</span>
              </button>
            )}

            {/* Quick Pagination Pill */}
            {allProducts.length > 0 && (
              <div className="flex items-center gap-[0.4vw] bg-slate-100/70 border-[1.5px] border-slate-400 status-pills-track h-[2.2vw] px-[0.6vw] rounded-full">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-[1.4vw] h-[1.4vw] flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-[0.8vw] h-[0.8vw]" />
                </button>
                <span className="text-[0.79vw] font-semibold text-slate-700 px-[0.2vw]">
                  {currentPage} <span className="text-slate-400 font-medium">/</span> {totalPages || 1}
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
            <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border-[1.5px] border-slate-400 status-pills-track gap-[0.4vw] max-w-full overflow-x-auto min-w-0">
              {STATUS_CHIPS.map(({ label }) => {
                const isActive = filterStatus === label;
                const count = counts[label] ?? 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterStatus(label)}
                    className={`flex items-center gap-[0.45vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.8vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-slate-700"}>
                      {label}
                    </span>
                    <span
                      className={`text-[0.73vw] font-medium ml-[0.1vw] transition-all ${
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
            <div className="text-[0.79vw] text-slate-500 font-medium whitespace-nowrap pl-[0.5vw] flex items-center gap-[0.3vw]">
              <span>Showing</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded text-[0.77vw]">
                {allProducts.length}
              </span>
              <span>items</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.79vw] uppercase tracking-wider">
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
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-[6vw] text-center text-slate-500">
                      <div className="w-[2.2vw] h-[2.2vw] border-[0.25vw] border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-[0.6vw]" />
                      <span className="font-semibold text-[0.85vw] text-slate-600">Loading response items...</span>
                    </td>
                  </tr>
                ) : allProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-[6vw] text-center text-slate-400">
                      <AlertCircle className="w-[2.2vw] h-[2.2vw] text-slate-300 mx-auto mb-[0.5vw]" />
                      <span className="font-medium text-[0.85vw] text-slate-500">No records found for the selected filter.</span>
                    </td>
                  </tr>
                ) : (
                  (() => {
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
                              <td colSpan={9} className="p-0 border-b border-slate-300 bg-slate-50/90 sticky top-[2.2vw] z-20 shadow-2xs">
                                <div className="flex items-center gap-[0.6vw] sticky left-0 w-fit px-[1vw] py-[0.5vw] bg-slate-50 z-10">
                                  <div className="w-[0.35vw] h-[1.1vw] bg-slate-400 rounded-full" />
                                  <span className="font-semibold text-slate-800 text-[0.87vw] tracking-wide">
                                    {entry.customerName}
                                  </span>

                                  {/* Toggle button to reveal / hide customer details */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleCustomerDetails(entry.customerName, e)}
                                    title={isExpanded ? "Collapse customer details" : "Expand customer details"}
                                    className="px-[0.35vw] py-[0.12vw] bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-300 rounded-[0.25vw] transition-all cursor-pointer flex items-center justify-center shrink-0 ml-[0.2vw] shadow-2xs"
                                  >
                                    <Icon
                                      icon={isExpanded ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
                                      className="w-[0.75vw] h-[0.75vw]"
                                    />
                                  </button>

                                  {/* Customer metadata badges: hidden by default, revealed on clicking chevron */}
                                  {isExpanded && (
                                    <div className="flex items-center gap-[0.4vw] flex-wrap animate-in fade-in duration-200">
                                      {entry.customerCode && (
                                        <span className="text-[0.7vw] text-slate-500 font-medium ml-[0.3vw]">
                                          Code: {entry.customerCode}
                                        </span>
                                      )}
                                      {entry.jobOrderNo && (
                                        <span className="text-[0.75vw] font-medium bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
                                          Cust Ref: {entry.jobOrderNo}
                                        </span>
                                      )}
                                      {entry.refNoInternal && (
                                        <span className="text-[0.75vw] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
                                          Int Ref: {entry.refNoInternal}
                                        </span>
                                      )}
                                      {entry.category && (
                                        <span className="text-[0.75vw] font-medium text-slate-700 bg-slate-50 border border-slate-300 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
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
                                <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.45vw] flex-wrap">
                                  <span className="inline-flex items-center gap-[0.35vw] px-[0.65vw] py-[0.2vw] rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-[0.79vw] font-semibold shadow-2xs">
                                    <Icon icon="solar:danger-triangle-linear" className="w-[0.9vw] h-[0.9vw] text-amber-700" />
                                    Admin Returned / Declined
                                  </span>
                                  <span className="inline-flex items-center px-[0.55vw] py-[0.18vw] rounded-full border text-[0.75vw] font-medium bg-amber-50 text-amber-700 border-amber-300">
                                    {product.finalStatus || "Admin Returned"}
                                  </span>
                                  {product.finalStatusRemarks && (
                                    <span className="inline-flex items-center gap-[0.35vw] text-[0.79vw] text-slate-800 font-medium bg-white border border-amber-200 px-[0.65vw] py-[0.2vw] rounded-[0.3vw] shadow-2xs">
                                      <Icon icon="solar:chat-round-dots-linear" className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                                      <span className="font-medium text-slate-900">Admin Reason:</span> {product.finalStatusRemarks}
                                    </span>
                                  )}
                                  <span className="text-[0.77vw] text-amber-800 italic ml-[0.3vw]">
                                    Please edit and click Update Report to re-submit to Admin
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}

                          <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                            {/* SNo */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 font-bold text-slate-800 text-[0.81vw]">
                              {((currentPage - 1) * itemsPerPage) + idx + 1}
                            </td>

                            {/* Date */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-[0.81vw] text-slate-800 whitespace-nowrap font-medium">
                              {fmtDate(entry.date)}
                            </td>

                            {/* Registration */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.81vw] font-mono font-medium text-black">{entry.refNoInternal}</div>
                              <div className="text-[0.73vw] font-medium text-blue-700 mt-[0.05vw]">JO: {entry.jobOrderNo || "—"}</div>
                            </td>

                            {/* Customer */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.81vw] font-medium text-black truncate max-w-[12vw]">{entry.customerName}</div>
                              <div className="text-[0.73vw] font-mono text-slate-700 font-medium">{entry.customerCode || "—"}</div>
                            </td>

                            {/* Product */}
                            <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300">
                              <div className="text-[0.81vw] font-medium text-black leading-tight">{product.productDescription}</div>
                              <div className="text-[0.73vw] text-slate-700 mt-[0.1vw] font-mono font-medium">S/N: {product.serialNumber || product.identification || "—"}</div>
                            </td>

                            {/* Qty */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 text-[0.81vw] font-medium text-black">
                              {product.qty || "1"}
                            </td>

                            {/* Status */}
                            <td className="px-[0.7vw] py-[0.6vw] text-center border-r border-b border-slate-300 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-[0.3vw] px-[0.55vw] py-[0.15vw] rounded-full border text-[0.75vw] font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
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
                                className="cursor-pointer inline-flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-[0.9vw] h-[2vw] rounded-full text-[0.77vw] transition-all shadow-2xs active:scale-95"
                              >
                                <Edit3 className="w-[0.75vw] h-[0.75vw]" />
                                <span>Update Report</span>
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </tbody>
              </table>
            </div>

          {/* Table Pagination Footer */}
          {allProducts.length > 0 && (
            <div className="border-t border-slate-200 px-[1vw] py-[0.55vw] bg-slate-50/70 flex justify-between items-center rounded-b-[0.8vw] shrink-0">
              <div className="flex items-center gap-[1.2vw]">
                <div className="text-[0.79vw] font-medium text-slate-500">
                  Showing <strong className="text-slate-800">{paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, allProducts.length)}</strong> of <strong className="text-slate-800">{allProducts.length}</strong> assigned products
                </div>
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.77vw] text-slate-500 font-medium">Rows:</span>
                  <div className="w-[5vw]">
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
                      triggerClassName="!h-[1.8vw] !rounded-full !px-[0.5vw] text-[0.77vw] font-semibold text-slate-700 border-slate-200 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Pagination Controls */}
              <div className="flex items-center gap-[0.35vw]">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all font-bold text-[0.75vw]"
                  title="First Page"
                >
                  «
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronDown className="w-[0.85vw] h-[0.85vw] rotate-90" />
                </button>
                <div className="flex items-center gap-[0.2vw] px-[0.3vw]">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pNum => pNum === 1 || pNum === totalPages || Math.abs(pNum - currentPage) <= 1)
                    .map((pNum, pIdx, arr) => {
                      const prev = arr[pIdx - 1];
                      return (
                        <React.Fragment key={pNum}>
                          {prev && pNum - prev > 1 && <span className="text-[0.75vw] text-slate-400 px-[0.1vw]">...</span>}
                          <button
                            onClick={() => setCurrentPage(pNum)}
                            className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-full text-[0.79vw] font-semibold cursor-pointer transition-all ${currentPage === pNum ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
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
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all"
                >
                  <ChevronUp className="w-[0.85vw] h-[0.85vw] rotate-90" />
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-[1.8vw] h-[1.8vw] flex items-center justify-center border border-slate-200 rounded-full hover:bg-white disabled:opacity-40 bg-white shadow-2xs cursor-pointer text-slate-600 transition-all font-bold text-[0.75vw]"
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
              currentUser={currentUser}
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
