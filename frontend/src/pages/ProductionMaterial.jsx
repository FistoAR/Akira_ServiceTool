// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, Trash2, Save, ArrowLeft, Plus, User, Package, ChevronDown,
  ChevronUp, Eye, Target, ClipboardList, Edit3, Clock, History, FileText, AlertCircle, CheckCircle, Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import ProductionEditableProductTable from "../components/ProductionEditableProductTable";

const API_URL = import.meta.env.VITE_API_URL;

// Storage Keys (Legacy)
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const EMPLOYEES_KEY = "employees";
const STAGE_MASTER_KEY = "production_material_stage_options_v1";
const DISPOSITION_MASTER_KEY = "production_material_disposition_options_v1";
const PROBLEM_TYPE_MASTER_KEY = "production_material_problem_type_options_v1";
const PRODUCT_TYPE_MASTER_KEY = "production_material_product_type_options_v1";

const DEFAULT_STAGE_OPTIONS = ["SMD", "WS", "MS", "SRV-Testing", "SRV-FI", "STA-Testing", "STA-FI", "MPR-CVR", "MPR-Testing", "MPR-FI", "Panel-WA", "Panel-Integration", "Panel-Testing", "Panel-FI"];
const DEFAULT_DISPOSITION_OPTIONS = ["Spare Replacement", "Rework Required", "Client Approval Pending", "No Change", "Accepted"];
const DEFAULT_PROBLEM_TYPE_OPTIONS = ["Hardware", "Software", "Assembly", "Component Failure", "Power Issue", "Display Issue"];
const DEFAULT_PRODUCT_TYPE_OPTIONS = ["Inverter", "Stabilizer", "Battery", "Solar Panel", "UPS", "Transformer"];
const FINAL_STATUS_OPTIONS = ["Pending", "Rejected", "Completed"];
const FINAL_STATUS_COLORS = {
  Pending: "bg-orange-100 text-orange-700 border-orange-300",
  "Rejected": "bg-gray-200 text-gray-700 border-gray-400",
  Completed: "bg-green-100 text-green-700 border-green-300",
};

// Helpers
const lsLoad = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));
const genRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PMC-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
};
const todayDateStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => {
  if (!s) return "—";
  if (s.includes("T")) {
    const d = new Date(s); if (isNaN(d.getTime())) return s;
    const dd = String(d.getDate()).padStart(2, "0"), mm = String(d.getMonth() + 1).padStart(2, "0"), yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  if (s.includes("-") && s.split("-")[0].length === 4) {
    const [y, m, d] = s.split("-"); return `${d}-${m}-${y}`;
  }
  return s;
};

const emptyProduct = () => ({
  _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productCode: "", productDescription: "", category: "", boardType: "", productType: "", problemType: "", ncType: "Internal", problem: "", 
  inspectedBy: "", inspectedByName: "", designators: "", boardImage: "",
  qty: "1", stage: DEFAULT_STAGE_OPTIONS[0],
  serialNumber: "", assignedTo: "", assignedToName: "", assembledBy: "", assembledByName: "", testedBy: "", testedByName: "", fiBy: "", fiByName: "",
  disposition: DEFAULT_DISPOSITION_OPTIONS[0], raisedTo: DEFAULT_STAGE_OPTIONS[0],
  report: null, finalStatus: "Pending", finalStatusRemarks: "", finalStatusDate: todayDateStr(), finalStatusHistory: []
});

// --- Reports Modal (admin full data view) ---
const ReportsModal = ({ row, onClose }) => {
  const products = row.products || [];
  const [expanded, setExpanded] = useState(new Set([products[0]?._pid]));

  const toggleExpand = (pid) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const parseParts = (str) => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-[2vw]">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-[75vw] max-h-[90vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-blue-300">
        <div className="bg-blue-600 px-[1.5vw] py-[1.2vw] flex justify-between items-center shadow-md">
          <div className="flex items-center gap-[0.9vw]">
            <div className="bg-white/20 p-[0.4vw] rounded-full"><FileText className="w-[1.4vw] h-[1.4vw] text-white" /></div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-white uppercase">Full Production Report</h3>
              <p className="text-[0.75vw] text-white/90 font-medium">{row.refNoInternal} · {row.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer transition-all hover:bg-white/10 p-[0.4vw] rounded-full"><X className="w-[1.3vw] h-[1.3vw]" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.5vw]">
          <div className="grid grid-cols-3 gap-[1vw] mb-[1vw]">
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-blue-200">
              <div className="text-[0.7vw] uppercase font-bold text-blue-600 mb-[0.6vw]">Entry Details</div>
              <div className="space-y-[0.45vw]">
                <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Date:</span> {fmtDate(row.date)}</div>
                <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Job Order:</span> {row.jobOrderNo || "—"}</div>
                <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Products:</span> {products.length}</div>
              </div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-blue-200">
              <div className="text-[0.7vw] uppercase font-bold text-blue-600 mb-[0.6vw]">Customer</div>
              <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Name:</span> {row.customerName || "—"}</div>
              <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Code:</span> {row.customerCode || "—"}</div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-blue-200">
              <div className="text-[0.7vw] uppercase font-bold text-blue-600 mb-[0.6vw]">Report Summary</div>
              <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Created By:</span> {row.creatorName || "Admin"}</div>
              <div className="text-[0.78vw] text-black"><span className="font-bold text-blue-600">Last updated:</span> {fmtDate(row.updatedAt || row.createdAt)}</div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-[4vw] text-[0.9vw] text-blue-500">No product records available for this entry.</div>
          ) : products.map((prod, idx) => (
            <div key={prod._pid} className="border border-blue-200 rounded-[0.6vw] overflow-hidden shadow-sm transition-all duration-300">
              <div
                onClick={() => toggleExpand(prod._pid)}
                className="bg-blue-50 px-[1.2vw] py-[1vw] flex items-center justify-between gap-[1vw] cursor-pointer hover:bg-blue-100/50 transition-colors"
              >
                <div>
                  <div className="text-[0.95vw] font-bold text-black">{prod.productDescription || "Unnamed Product"}</div>
                  <div className="text-[0.72vw] text-black mt-[0.3vw] flex flex-wrap gap-[0.8vw]"><span>JO: {row.jobOrderNo || "—"}</span><span>Code: {prod.productCode || "—"}</span><span>Qty: {prod.qty || "—"}</span><span>S/N: {prod.serialNumber || "—"}</span></div>
                </div>
                <div className="flex items-center gap-[1vw]">
                  <div className="text-[0.72vw] text-black uppercase font-bold">Item {idx + 1}</div>
                  <ChevronDown className={`w-[1.2vw] h-[1.2vw] text-blue-600 transition-transform duration-300 ${expanded.has(prod._pid) ? "rotate-180" : ""}`} />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expanded.has(prod._pid) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-blue-100">
                      {/* Registration Info */}
                      <div className="p-[1.2vw] bg-white border-b border-blue-100">
                        <div className="text-[0.7vw] font-bold text-blue-600 uppercase mb-[1vw] flex items-center gap-[0.5vw] border-b border-blue-50 pb-[0.4vw]">
                          <Target className="w-[0.9vw] h-[0.9vw]" /> Registration Information
                        </div>
                        <div className="grid grid-cols-6 gap-[1.5vw] mb-[1vw]">
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Stage</div><div className="font-regular text-black text-[0.8vw]">{prod.stage || "—"}</div></div>
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Category</div><div className="font-regular text-black text-[0.8vw]">{row.category || prod.category || "—"}</div></div>
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">NC Type</div><div className="font-regular text-black text-[0.8vw]">{prod.ncType || "Internal"}</div></div>
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Problem Type</div><div className="font-regular text-black text-[0.8vw]">{prod.problemType || "—"}</div></div>
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Inspected By</div><div className="font-regular text-black text-[0.8vw]">{prod.inspectedByName || "—"}</div></div>
                          <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Designators</div><div className="font-regular text-black text-[0.8vw]">{prod.designators || "—"}</div></div>
                        </div>
                        <div className="flex gap-[1.5vw] mb-[1vw]">
                          <div className="flex-1">
                            <div className="text-[0.65vw] text-blue-600 font-bold uppercase mb-[0.4vw]">Initial Problem Description</div>
                            <div className="text-[0.8vw] text-black font-regular leading-relaxed bg-gray-50/50 p-[1vw] rounded-[0.5vw] border border-slate-400">{prod.problem || "No description provided."}</div>
                          </div>
                          {prod.boardImage && (
                            <div className="w-[10vw]">
                              <div className="text-[0.65vw] text-blue-600 font-bold uppercase mb-[0.4vw]">Board Image</div>
                              <img 
                                src={`${API_URL}${prod.boardImage}`} 
                                alt="Board" 
                                className="w-full h-[6vw] object-cover rounded-[0.5vw] border border-blue-100 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(`${API_URL}${prod.boardImage}`, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-6 gap-[1.5vw] mb-[1vw]">
                           <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Assembled By</div><div className="font-regular text-black text-[0.8vw]">{prod.report?.assembledByName || prod.assembledByName || "—"}</div></div>
                           <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Tested By</div><div className="font-regular text-black text-[0.8vw]">{prod.report?.testedByName || prod.testedByName || "—"}</div></div>
                        </div>
                      </div>

                      {/* Technical Resolution Report */}
                      <div className="p-[1.2vw] bg-blue-50/30">
                        <div className="text-[0.7vw] font-bold text-blue-600 uppercase mb-[1vw] flex items-center gap-[0.5vw] border-b border-blue-100 pb-[0.4vw]">
                          <Wrench className="w-[0.9vw] h-[0.9vw]" /> Technical Resolution Report
                        </div>
                        {prod.report ? (
                          <div className="space-y-[1.2vw]">
                            <div className="grid grid-cols-4 gap-[1.5vw]">
                              <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Start Date</div><div className="font-regular text-black text-[0.8vw]">{fmtDate(prod.report.startDate)}</div></div>
                              <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">4M Category</div><div className="font-regular text-black text-[0.8vw]">{prod.report.fourMCategory || "—"}</div></div>
                              <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">CAE</div><div className="font-regular text-black text-[0.8vw]">{prod.report.cae || "—"}</div></div>
                              <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Status</div><div className="font-regular text-blue-700 text-[0.8vw]">{prod.report.status || "—"}</div></div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-blue-100">
                                <div className="text-[0.65vw] text-blue-600 font-bold uppercase mb-[0.4vw]">Root Cause Analysis</div>
                                <div className="text-[0.8vw] text-black font-regular leading-relaxed">{prod.report.rootCause || "—"}</div>
                              </div>
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-blue-100">
                                <div className="text-[0.65vw] text-blue-600 font-bold uppercase mb-[0.4vw]">Corrective Action Taken</div>
                                <div className="text-[0.8vw] text-black font-regular leading-relaxed">{prod.report.correctiveAction || "—"}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-blue-100">
                                <div className="text-[0.65vw] text-blue-600 font-bold uppercase mb-[0.6vw]">Parts Replaced</div>
                                {prod.report && prod.report.partsReplacement && prod.report.partsReplacement.trim() ? (
                                  <ul className="list-disc list-inside space-y-[0.3vw]">
                                    {parseParts(prod.report.partsReplacement).map((part, pidx) => (
                                      <li key={pidx} className="text-[0.78vw] text-black font-regular leading-tight">{part}</li>
                                    ))}
                                  </ul>
                                ) : <div className="text-[0.78vw] text-black/40 italic font-medium">No parts replaced.</div>}
                              </div>
                              <div className="grid grid-cols-2 gap-[1vw]">
                                <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Closed Date</div><div className="font-regular text-black text-[0.8vw]">{fmtDate(prod.report.closedDate)}</div></div>
                                <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Verified Date</div><div className="font-regular text-black text-[0.8vw]">{fmtDate(prod.report.verifiedDate)}</div></div>
                                <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Verified By</div><div className="font-regular text-black text-[0.8vw]">{prod.report.verifiedByName || "—"}</div></div>
                                <div><div className="text-blue-600 mb-[0.3vw] uppercase text-[0.65vw] font-bold">Disposition</div><div className="font-regular text-black text-[0.8vw]">{prod.disposition || "—"}</div></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-[1vw]">
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-blue-100 text-center"><div className="text-[0.55vw] font-bold text-blue-500 uppercase">Assembler</div><div className="text-[0.75vw] font-regular text-black">{prod.report.assembledByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-blue-100 text-center"><div className="text-[0.55vw] font-bold text-blue-500 uppercase">Tester</div><div className="text-[0.75vw] font-regular text-black">{prod.report.testedByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-blue-100 text-center"><div className="text-[0.55vw] font-bold text-blue-500 uppercase">FI By</div><div className="text-[0.75vw] font-regular text-black">{prod.report.fiByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-blue-100 text-center"><div className="text-[0.55vw] font-bold text-blue-500 uppercase">Final Status</div><div className="text-[0.75vw] font-regular text-black uppercase">{prod.finalStatus || "Pending"}</div></div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-[3vw] text-center">
                            <Clock className="w-[2vw] h-[2vw] text-gray-300 mx-auto mb-[0.8vw]" />
                            <div className="text-[0.9vw] text-gray-400 font-bold italic">No technical report submitted yet.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="px-[1.5vw] py-[1vw] border-t border-blue-200 bg-white flex justify-end">
          <button onClick={onClose} className="px-[2.5vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] text-[0.85vw] font-bold cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-[0.5vw]">Close Panel</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Verification Modal ---
const VerificationModal = ({ row, prod, employees, caeHistory, onSave, onClose }) => {
  const [formData, setFormData] = useState(() => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser") || "{}");
    return {
      verifiedBy: prod.report?.verifiedBy || user.userId || "",
      verifiedByName: prod.report?.verifiedByName || user.name || "",
      verifiedDate: prod.report?.verifiedDate || todayDateStr(),
      cae: prod.report?.cae || ""
    };
  });
  const [showCaeSuggestions, setShowCaeSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const filteredCaeSuggestions = useMemo(() => {
    const q = formData.cae.toLowerCase();
    return caeHistory.filter(c => c.toLowerCase().includes(q));
  }, [formData.cae, caeHistory]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [filteredCaeSuggestions]);

  const handleSave = () => {
    if (!formData.verifiedBy) return alert("Verified By is mandatory.");
    if (!formData.verifiedDate) return alert("Verified Date is mandatory.");
    onSave(formData);
  };

  const onKeyDown = (e) => {
    if (!showCaeSuggestions || filteredCaeSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredCaeSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        e.preventDefault();
        setFormData(p => ({ ...p, cae: filteredCaeSuggestions[selectedIndex] }));
        setShowCaeSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowCaeSuggestions(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-[2vw]">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-[35vw] rounded-[1vw] flex flex-col border border-gray-400 shadow-xl overflow-visible">
        <div className="bg-blue-600 px-[1.5vw] py-[1vw] flex justify-between items-center rounded-t-[1vw]">
          <div className="flex items-center gap-[0.8vw]">
            <CheckCircle className="w-[1.2vw] h-[1.2vw] text-white" />
            <h3 className="text-[1.1vw] font-bold text-white uppercase tracking-tight">Verify Resolution</h3>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-[0.4vw] rounded-full transition-all cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>

        <div className="p-[1.5vw] space-y-[1.2vw] bg-white">
          <div className="bg-white p-[1vw] rounded-[0.6vw] border border-gray-400">
            <div className="text-[0.7vw] font-bold text-blue-700 uppercase mb-[0.6vw]">Product Context</div>
            <div className="text-[0.85vw] font-bold text-black">{prod.productDescription}</div>
            <div className="text-[0.72vw] text-black font-regular mt-[.15vw]"><span className='font-semibold'>S/N:</span> {prod.serialNumber || "—"} · <span className='font-semibold'>JO:</span> {row.jobOrderNo}</div>
          </div>

          <div className="space-y-[1vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.8vw] font-bold text-black uppercase">VERIFIED BY <span className="text-red-600">*</span></label>
              <select
                value={formData.verifiedBy}
                onChange={e => {
                  const emp = employees.find(emp => emp.userId === e.target.value);
                  setFormData(p => ({ ...p, verifiedBy: e.target.value, verifiedByName: emp?.name || "" }));
                }}
                className="w-full border border-gray-400 rounded-[0.5vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-medium text-black outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.userId} value={e.userId}>{e.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.8vw] font-bold text-black uppercase">VERIFIED DATE <span className="text-red-600">*</span></label>
              <input
                type="date"
                value={formData.verifiedDate}
                onChange={e => setFormData(p => ({ ...p, verifiedDate: e.target.value }))}
                className="w-full border border-gray-400 rounded-[0.5vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-medium text-black outline-none focus:border-blue-500 bg-white"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw] relative">
              <label className="text-[0.8vw] font-bold text-black uppercase">CAE (CORRECTIVE ACTION EFFECTIVENESS)</label>
              <div className="relative">
                <input
                  value={formData.cae}
                  onChange={e => { setFormData(p => ({ ...p, cae: e.target.value })); setShowCaeSuggestions(true); }}
                  onFocus={() => setShowCaeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCaeSuggestions(false), 200)}
                  onKeyDown={onKeyDown}
                  placeholder="Enter or select CAE..."
                  className="w-full border border-gray-400 rounded-[0.5vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-medium text-black outline-none focus:border-blue-500 bg-white"
                />
                <AnimatePresence>
                  {showCaeSuggestions && filteredCaeSuggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="absolute z-50 w-full mt-[0.2vw] bg-white border border-gray-400 rounded-[0.5vw] shadow-xl max-h-[12vw] overflow-y-auto overflow-x-hidden custom-scrollbar"
                    >
                      {filteredCaeSuggestions.map((opt, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setFormData(p => ({ ...p, cae: opt })); setShowCaeSuggestions(false); }} 
                          className={`px-[1vw] py-[0.6vw] text-[0.8vw] font-bold transition-colors border-b border-slate-400 last:border-0 cursor-pointer ${selectedIndex === i ? "bg-blue-600 text-white" : "text-black hover:bg-blue-50"}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="p-[1vw] border-t border-slate-400 bg-gray-50/50 flex justify-end gap-[0.8vw]">
          <button onClick={onClose} className="px-[1.2vw] py-[0.6vw] border border-gray-400 bg-white text-black font-bold rounded-[0.4vw] text-[0.8vw] hover:bg-gray-100 cursor-pointer transition-all">Cancel</button>
          <button onClick={handleSave} className="px-[1.5vw] py-[0.6vw] bg-blue-600 text-white font-bold rounded-[0.4vw] text-[0.8vw] hover:bg-blue-700 active:scale-95 transition-all shadow-md">Save Verification</button>
        </div>
      </motion.div>
    </div>
  );
};

const MasterDataModal = ({ open, onClose, stageOptions, dispositionOptions, problemTypeOptions, productTypeOptions, onSave }) => {
  const [activeTab, setActiveTab] = useState("stages");
  const [stages, setStages] = useState(stageOptions);
  const [dispositions, setDispositions] = useState(dispositionOptions);
  const [problemTypes, setProblemTypes] = useState(problemTypeOptions);
  const [productTypes, setProductTypes] = useState(productTypeOptions);

  const [newStage, setNewStage] = useState("");
  const [newDisposition, setNewDisposition] = useState("");
  const [newProblemType, setNewProblemType] = useState("");
  const [newProductType, setNewProductType] = useState("");

  useEffect(() => {
    setStages(stageOptions);
    setDispositions(dispositionOptions);
    setProblemTypes(problemTypeOptions);
    setProductTypes(productTypeOptions);
  }, [stageOptions, dispositionOptions, problemTypeOptions, productTypeOptions]);

  const addStage = () => { const t = newStage.trim(); if (!t) return; setStages(prev => prev.includes(t) ? prev : [...prev, t]); setNewStage(""); };
  const addDisposition = () => { const t = newDisposition.trim(); if (!t) return; setDispositions(prev => prev.includes(t) ? prev : [...prev, t]); setNewDisposition(""); };
  const addProblemType = () => { const t = newProblemType.trim(); if (!t) return; setProblemTypes(prev => prev.includes(t) ? prev : [...prev, t]); setNewProblemType(""); };
  const addProductType = () => { const t = newProductType.trim(); if (!t) return; setProductTypes(prev => prev.includes(t) ? prev : [...prev, t]); setNewProductType(""); };

  const removeStage = (s) => setStages(prev => prev.filter(x => x !== s));
  const removeDisposition = (d) => setDispositions(prev => prev.filter(x => x !== d));
  const removeProblemType = (p) => setProblemTypes(prev => prev.filter(x => x !== p));
  const removeProductType = (p) => setProductTypes(prev => prev.filter(x => x !== p));

  if (!open) return null;

  const TABS = [
    { id: "stages", label: "Work Stages", icon: Target },
    { id: "dispositions", label: "Dispositions", icon: ClipboardList },
    { id: "problems", label: "Problem Types", icon: AlertCircle },
    { id: "products", label: "Product Types", icon: Package }
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-[1.5vw]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[1.2vw] w-[55vw] max-h-[85vh] overflow-hidden shadow-2xl border border-gray-400 flex flex-col">
        <div className="bg-blue-600 px-[1.5vw] py-[1.2vw] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-[1.1vw] font-bold text-white uppercase ">Master Data Configuration</h3>
            <p className="text-[0.75vw] text-white/90 mt-[0.2vw]">Manage system-wide production material categories.</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-[0.4vw] rounded-full hover:bg-white/10 transition-all cursor-pointer"><X className="w-[1.4vw] h-[1.4vw]" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex bg-white min-h-[40vh]">
          {/* Sidebar */}
          <div className="w-[15vw] border-r border-slate-400 flex flex-col bg-gray-50/50">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-[0.8vw] px-[1.2vw] py-[1.2vw] text-[0.85vw] font-bold border-b border-slate-400 transition-all text-left ${activeTab === tab.id ? "bg-white text-blue-600 border-r-4 border-r-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <tab.icon className={`w-[1.1vw] h-[1.1vw] ${activeTab === tab.id ? "text-blue-600" : "text-gray-400"}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-[2vw] overflow-y-auto bg-white">
            <AnimatePresence mode="wait">
              {activeTab === "stages" && (
                <motion.div key="stages" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.5vw]">
                  <h4 className="text-[1vw] font-bold text-gray-900">Work Stages</h4>
                  <div className="flex gap-[0.8vw] bg-blue-50/50 p-[1vw] rounded-[1vw] border border-blue-100">
                    <input value={newStage} onChange={e => setNewStage(e.target.value)} onKeyPress={e => e.key === 'Enter' && addStage()} placeholder="Add new stage..." className="flex-1 border border-gray-400 rounded-[0.6vw] py-[0.7vw] px-[1vw] text-[0.85vw] outline-none focus:border-blue-500 bg-white shadow-sm" />
                    <button onClick={addStage} className="bg-blue-600 text-white px-[1.5vw] rounded-[0.6vw] text-[0.85vw] font-bold hover:bg-blue-700 shadow-md active:scale-95 transition-all"><Plus className="w-[1.1vw] h-[1.1vw]" /></button>
                  </div>
                  <div className="flex flex-wrap gap-[0.8vw]">{stages.map(s => <span key={s} className="flex items-center gap-[0.4vw] px-[1vw] py-[0.6vw] bg-white border border-slate-400 rounded-[0.8vw] text-[0.85vw] text-gray-800 font-bold shadow-sm group hover:border-blue-300 transition-all">{s}<button onClick={() => removeStage(s)} className="w-[1.1vw] h-[1.1vw] rounded-full bg-gray-100 group-hover:bg-red-500 text-gray-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "dispositions" && (
                <motion.div key="dispositions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.5vw]">
                  <h4 className="text-[1vw] font-bold text-gray-900">Disposition Outcomes</h4>
                  <div className="flex gap-[0.8vw] bg-emerald-50/50 p-[1vw] rounded-[1vw] border border-emerald-100">
                    <input value={newDisposition} onChange={e => setNewDisposition(e.target.value)} onKeyPress={e => e.key === 'Enter' && addDisposition()} placeholder="Add new disposition..." className="flex-1 border border-gray-400 rounded-[0.6vw] py-[0.7vw] px-[1vw] text-[0.85vw] outline-none focus:border-emerald-500 bg-white shadow-sm" />
                    <button onClick={addDisposition} className="bg-emerald-600 text-white px-[1.5vw] rounded-[0.6vw] text-[0.85vw] font-bold hover:bg-emerald-700 shadow-md active:scale-95 transition-all"><Plus className="w-[1.1vw] h-[1.1vw]" /></button>
                  </div>
                  <div className="flex flex-wrap gap-[0.8vw]">{dispositions.map(d => <span key={d} className="flex items-center gap-[0.6vw] px-[1vw] py-[0.6vw] bg-white border border-slate-400 rounded-[0.8vw] text-[0.85vw] text-gray-800 font-bold shadow-sm group hover:border-emerald-300 transition-all">{d}<button onClick={() => removeDisposition(d)} className="w-[1.1vw] h-[1.1vw] rounded-full bg-gray-100 group-hover:bg-red-500 text-gray-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "problems" && (
                <motion.div key="problems" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.5vw]">
                  <h4 className="text-[1vw] font-bold text-gray-900">Problem Types</h4>
                  <div className="flex gap-[0.8vw] bg-orange-50/50 p-[1vw] rounded-[1vw] border border-orange-100">
                    <input value={newProblemType} onChange={e => setNewProblemType(e.target.value)} onKeyPress={e => e.key === 'Enter' && addProblemType()} placeholder="Add new problem type..." className="flex-1 border border-gray-400 rounded-[0.6vw] py-[0.7vw] px-[1vw] text-[0.85vw] outline-none focus:border-orange-500 bg-white shadow-sm" />
                    <button onClick={addProblemType} className="bg-orange-600 text-white px-[1.5vw] rounded-[0.6vw] text-[0.85vw] font-bold hover:bg-orange-700 shadow-md active:scale-95 transition-all"><Plus className="w-[1.1vw] h-[1.1vw]" /></button>
                  </div>
                  <div className="flex flex-wrap gap-[0.8vw]">{problemTypes.map(p => <span key={p} className="flex items-center gap-[0.6vw] px-[1vw] py-[0.6vw] bg-white border border-slate-400 rounded-[0.8vw] text-[0.85vw] text-gray-800 font-bold shadow-sm group hover:border-orange-300 transition-all">{p}<button onClick={() => removeProblemType(p)} className="w-[1.1vw] h-[1.1vw] rounded-full bg-gray-100 group-hover:bg-red-500 text-gray-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "products" && (
                <motion.div key="products" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.5vw]">
                  <h4 className="text-[1vw] font-bold text-gray-900">Product Types</h4>
                  <div className="flex gap-[0.8vw] bg-purple-50/50 p-[1vw] rounded-[1vw] border border-purple-100">
                    <input value={newProductType} onChange={e => setNewProductType(e.target.value)} onKeyPress={e => e.key === 'Enter' && addProductType()} placeholder="Add new product type..." className="flex-1 border border-gray-400 rounded-[0.6vw] py-[0.7vw] px-[1vw] text-[0.85vw] outline-none focus:border-purple-500 bg-white shadow-sm" />
                    <button onClick={addProductType} className="bg-purple-600 text-white px-[1.5vw] rounded-[0.6vw] text-[0.85vw] font-bold hover:bg-purple-700 shadow-md active:scale-95 transition-all"><Plus className="w-[1.1vw] h-[1.1vw]" /></button>
                  </div>
                  <div className="flex flex-wrap gap-[0.8vw]">{productTypes.map(p => <span key={p} className="flex items-center gap-[0.6vw] px-[1vw] py-[0.6vw] bg-white border border-slate-400 rounded-[0.8vw] text-[0.85vw] text-gray-800 font-bold shadow-sm group hover:border-purple-300 transition-all">{p}<button onClick={() => removeProductType(p)} className="w-[1.1vw] h-[1.1vw] rounded-full bg-gray-100 group-hover:bg-red-500 text-gray-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button></span>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-end gap-[0.8vw] p-[1.1vw] border-t border-slate-400 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-[1.2vw] py-[0.6vw] rounded-[0.4vw] border border-gray-400 text-[0.82vw] text-black font-bold hover:bg-gray-100 cursor-pointer">Cancel</button>
          <button onClick={() => onSave(stages, dispositions, problemTypes, productTypes)} className="px-[1.4vw] py-[0.6vw] rounded-[0.4vw] bg-blue-600 text-white text-[0.82vw] font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">Save Master Data</button>
        </div>
      </motion.div>
    </div>
  );
};

const EmpSelectCell = ({ val, employees, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const selected = employees.find(e => e.userId === val);
  useEffect(() => { const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler); }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)} className={`flex items-center justify-center gap-[0.4vw] bg-white border rounded-[0.3vw] px-[0.5vw] py-[0.25vw] transition-all cursor-pointer hover:border-blue-400 mx-auto w-max ${val ? "border-gray-400" : "border-dashed border-gray-400"}`}>
        <span className={`text-[0.7vw] font-bold truncate max-w-[6vw] ${val ? "text-black" : "text-gray-400"}`}>{selected ? selected.name : "Assign"}</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full left-0 mt-[0.2vw] bg-white border border-gray-400 shadow-xl rounded-[0.4vw] w-[14vw] max-h-[12vw] overflow-y-auto z-[200] py-[0.2vw]">
            {employees.map(u => (
              <div key={u.userId} onClick={() => { onSelect(u); setOpen(false); }} className="px-[0.6vw] py-[0.4vw] flex items-center gap-[0.5vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0"><div className="text-[0.7vw] font-bold text-black truncate">{u.name}</div><div className="text-[0.55vw] text-gray-400 font-bold truncate">{u.department}</div></div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Final Status Cell ---
const FinalStatusCell = ({ row, prod, onUpdateProduct, isSupervisor }) => {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [remarks, setRemarks] = useState(prod.finalStatusRemarks || "");
  const [status, setStatus] = useState(prod.finalStatus || "Pending");
  const [statusDate, setStatusDate] = useState(prod.finalStatusDate || todayDateStr());
  const ref = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = () => {
    const newHistoryEntry = { status, remarks, date: statusDate, timestamp: new Date().toISOString() };
    const updatedHistory = [...(prod.finalStatusHistory || []), newHistoryEntry];
    onUpdateProduct(row.id, prod._pid, {
      finalStatus: status,
      finalStatusRemarks: remarks,
      finalStatusDate: statusDate,
      finalStatusHistory: updatedHistory,
    });
    setOpen(false);
  };

  const cls = FINAL_STATUS_COLORS[status] || "bg-gray-100 text-black/80 border-gray-400";

  return (
    <div className="flex items-center justify-center gap-[0.4vw]">
      <div className="relative" ref={ref}>
        <button 
          onClick={() => !isSupervisor && setOpen(!open)} 
          className={`text-[0.68vw] px-[0.5vw] py-[0.2vw] rounded-full border font-bold flex items-center gap-[0.3vw] transition-all ${cls} ${isSupervisor ? "cursor-default" : "cursor-pointer"}`}
        >
          {status} {!isSupervisor && <ChevronDown className="w-[0.7vw] h-[0.7vw]" />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-[0.3vw] bg-white border border-gray-400 shadow-xl rounded-[0.5vw] z-40 w-[17vw] p-[0.8vw]">
              <div className="text-[0.72vw] font-bold text-gray-900 mb-[0.5vw]">Update Final Status</div>
              <div className="grid grid-cols-2 gap-[0.35vw] mb-[0.7vw]">
                {FINAL_STATUS_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setStatus(opt)} className={`py-[0.3vw] rounded-[0.3vw] border text-[0.66vw] font-bold cursor-pointer transition-all ${status === opt ? FINAL_STATUS_COLORS[opt] + " ring-2 ring-offset-1 ring-blue-300" : "bg-gray-50 text-gray-600 border-gray-400 hover:bg-gray-100"}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mb-[0.6vw]"><label className="text-[0.65vw] font-bold text-gray-700 block mb-[0.25vw]">Status Date</label><input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} className="w-full border border-gray-400 rounded-[0.3vw] px-[0.4vw] py-[0.35vw] text-[0.72vw] outline-none focus:border-blue-400" /></div>
              <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks…" className="w-full border border-gray-400 rounded-[0.3vw] p-[0.4vw] text-[0.72vw] outline-none focus:border-blue-400 resize-none mb-[0.6vw]" />
              <div className="flex justify-end gap-[0.4vw]"><button onClick={() => setOpen(false)} className="px-[0.8vw] py-[0.3vw] text-[0.68vw] border border-gray-400 rounded-[0.3vw] text-gray-700 hover:bg-gray-50 font-bold">Cancel</button><button onClick={handleSave} className="px-[0.8vw] py-[0.3vw] text-[0.68vw] bg-blue-600 text-white rounded-[0.3vw] hover:bg-blue-700 font-bold flex items-center gap-[0.3vw]"><Save className="w-[0.7vw] h-[0.7vw]" />Save</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative" ref={historyRef}>
        <button onClick={() => setShowHistory(!showHistory)} title="Status History" className="p-[0.3vw] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-[0.3vw] transition-colors cursor-pointer"><Clock className="w-[0.9vw] h-[0.9vw]" /></button>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-[0.3vw] bg-white border border-gray-400 shadow-2xl rounded-[0.5vw] z-40 w-[22vw] p-[1vw]">
              <div className="flex items-center justify-between mb-[0.8vw] pb-[0.4vw] border-b border-gray-400"><div className="text-[0.8vw] font-bold text-gray-900 flex items-center gap-[0.4vw]"><Clock className="w-[0.9vw] h-[0.9vw] text-blue-500" />Status History</div><button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-900"><X className="w-[0.8vw] h-[0.8vw]" /></button></div>
              <div className="max-h-[15vw] overflow-y-auto space-y-[0.6vw] pr-[0.3vw]">
                {(prod.finalStatusHistory || []).length > 0 ? [...(prod.finalStatusHistory || [])].reverse().map((h, i) => (
                  <div key={i} className="bg-gray-50/50 rounded-[0.4vw] p-[0.6vw] border border-slate-400"><div className="flex items-center justify-between mb-[0.2vw]"><span className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded-full font-bold border ${FINAL_STATUS_COLORS[h.status] || "bg-gray-100 text-black/80"}`}>{h.status}</span><div className="text-right">{h.date && <div className="text-[0.62vw] font-bold text-blue-600">{fmtDate(h.date)}</div>}<div className="text-[0.6vw] text-black/50">{fmtDate(h.timestamp)}</div></div></div><div className="text-[0.72vw] text-black/90 italic leading-tight">"{h.remarks || <span className="text-black/30">No remarks</span>}"</div></div>
                )) : <div className="py-[2vw] text-center text-[0.72vw] text-black/40">No history available yet.</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Inward Form Page ---
const InwardForm = ({ initialData, employees, onSave, onBack, stageOptions, dispositionOptions, problemTypeOptions, productTypeOptions }) => {
  const { toast } = useNotification();
  const [base, setBase] = useState(() => ({
    date: initialData.date?.split("T")[0] || todayDateStr(),
    jobOrderNo: initialData.jobOrderNo || "",
    refNoInternal: initialData.refNoInternal || genRef(),
    customerName: initialData.customerName || "",
    customerCode: initialData.customerCode || "",
    category: initialData.category || ""
  }));
  const [products, setProducts] = useState(() => {
    if (initialData.products && initialData.products.length > 0) {
      return initialData.products.map(p => ({
        ...p,
        _pid: p._pid || p._id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serialNumber: p.serialNumber || p.identification || ""
      }));
    }
    return [emptyProduct()];
  });
  const isReadOnly = !!initialData._readonly;

  const [customerDb, setCustomerDb] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [custSelectedIndex, setCustSelectedIndex] = useState(-1);
  const custRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, boardRes] = await Promise.all([
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/board-types`)
        ]);
        setCustomerDb(custRes.data);
        setBoardTypes(boardRes.data);
      } catch (err) {
        console.error("Master data fetch failed:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target))
        setShowCustDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const customerDbFlat = useMemo(
    () => Array.isArray(customerDb) ? customerDb : Object.values(customerDb).flat(),
    [customerDb]
  );

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDbFlat.forEach((item) => {
      if (!map.has(item.partyCode))
        map.set(item.partyCode, {
          code: item.partyCode,
          name: item.partyDescription,
          type: item.partyType,
        });
    });
    return Array.from(map.values());
  }, [customerDbFlat]);

  const filteredCustomers = useMemo(() => {
    const s = custSearch.toLowerCase();
    return uniqueCustomers.filter(c => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)).slice(0, 100);
  }, [uniqueCustomers, custSearch]);

  useEffect(() => {
    setCustSelectedIndex(-1);
  }, [filteredCustomers]);

  const selectCustomer = (c) => {
    if (isReadOnly) return;
    setBase(p => ({
      ...p,
      customerCode: c.code,
      customerName: c.name,
      category: c.type || p.category,
    }));
    setCustSearch(c.name);
    setShowCustDrop(false);
  };

  const onCustKeyDown = (e) => {
    if (!showCustDrop || filteredCustomers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustSelectedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (custSelectedIndex >= 0) {
        e.preventDefault();
        selectCustomer(filteredCustomers[custSelectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowCustDrop(false);
    }
  };

  const handleDuplicate = (prod) => {
    setProducts(prev => [...prev, { ...prod, _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  };

  const removeProduct = (pid) => {
    if (products.length === 1) return toast("At least one product required", "warning");
    setProducts(prev => prev.filter(p => p._pid !== pid));
  };

  const addProduct = () => setProducts(prev => [...prev, emptyProduct()]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!base.jobOrderNo) { toast("Job Order Number is mandatory", "error"); return; }
    if (products.length === 0) { toast("At least one product is required", "warning"); return; }
    if (products.some(p => !p.productDescription)) { toast("All products must have a description", "error"); return; }
    if (products.some(p => !p.problemType)) { toast("All products must have a Problem Type", "error"); return; }
    onSave({ ...base, products });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto pr-[0.4vw]">
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-400 mb-[1vw] sticky top-0 z-[60]">
        <div className="flex items-center gap-[1vw]">
          <button onClick={onBack} className="flex items-center gap-[0.4vw] text-gray-700 hover:text-black border border-gray-400 bg-gray-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer shadow-sm transition-all hover:shadow font-bold">
            <ArrowLeft className="w-[1vw] h-[1vw]" /> Back
          </button>
          <div>
            <h2 className="text-[1vw] font-bold text-black">{initialData._id ? "Edit Production NC" : "New Production NC Registration"}</h2>
            <div className="text-[0.6vw] text-gray-700 mt-[.1vw] uppercase font-semibold ">Reference: {base.refNoInternal}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1.2vw] pb-[2vw]">
        {/* Base Info Section */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-400 p-[1.5vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-900 uppercase mb-[1.2vw] pb-[0.6vw] border-b border-slate-400 flex items-center gap-[0.5vw]">
            <ClipboardList className="w-[1.1vw] h-[1.1vw] text-blue-500" /> Primary Order Details
          </h3>
          <div className="grid grid-cols-5 gap-[1vw]">
            <div className="flex flex-col gap-[0.4vw]">
              <label className="font-bold text-gray-700 text-[0.72vw] uppercase tracking-wider">Registration Date</label>
              <input type="date" value={base.date} onChange={e => setBase({ ...base, date: e.target.value })} disabled={isReadOnly} className="border border-gray-400 rounded-[0.4vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-regular outline-none focus:border-blue-500 shadow-sm transition-all text-gray-800" />
            </div>
            <div className="flex flex-col gap-[0.4vw]">
              <label className="font-bold text-gray-700 text-[0.72vw] uppercase tracking-wider">Job Order Number <span className="text-red-500">*</span></label>
              <input value={base.jobOrderNo} onChange={e => setBase({ ...base, jobOrderNo: e.target.value })} placeholder="Enter Job Order..." disabled={isReadOnly} className="border border-gray-400 rounded-[0.4vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-regular outline-none focus:border-blue-500 shadow-sm transition-all text-gray-800" />
            </div>
            <div className="flex flex-col gap-[0.4vw] relative" ref={custRef}>
              <label className="font-bold text-gray-700 text-[0.72vw] uppercase tracking-wider">Customer Name</label>
              <div className="relative group">
                <input
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  onKeyDown={onCustKeyDown}
                  placeholder="Type to search..."
                  disabled={isReadOnly}
                  className="w-full border border-gray-400 rounded-[0.4vw] py-[0.6vw] px-[0.8vw] pr-[2vw] text-[0.8vw] font-regular outline-none focus:border-blue-500 shadow-sm transition-all text-gray-800"
                />
                <Search className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 group-focus-within:text-blue-500" />
              </div>
              <AnimatePresence>
                {showCustDrop && filteredCustomers.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-[100] w-[25vw] left-0 top-full mt-[0.4vw] bg-white border border-gray-400 rounded-[0.6vw] shadow-2xl max-h-[15vw] overflow-y-auto py-[0.4vw]">
                    {filteredCustomers.map((c, i) => (
                      <div 
                        key={c.code} 
                        onClick={() => selectCustomer(c)} 
                        className={`px-[1vw] py-[0.6vw] cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 group transition-colors ${custSelectedIndex === i ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}
                      >
                        <div className="flex-1">
                          <div className={`text-[0.82vw] font-semibold ${custSelectedIndex === i ? "text-white" : "text-gray-900 group-hover:text-blue-700"}`}>{c.name}</div>
                          <div className={`text-[0.68vw] font-regular ${custSelectedIndex === i ? "text-white/80" : "text-gray-500"}`}>{c.code}</div>
                        </div>
                        {c.type && <span className={`text-[0.6vw] px-[0.4vw] py-[0.1vw] rounded font-black uppercase ${custSelectedIndex === i ? "bg-white/20 text-white border border-white/30" : "bg-blue-100 text-blue-700"}`}>{c.type}</span>}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col gap-[0.4vw]">
              <label className="font-bold text-gray-700 text-[0.72vw] uppercase tracking-wider">Customer Code</label>
              <input value={base.customerCode} readOnly className="border border-gray-400 rounded-[0.4vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-regular outline-none bg-gray-50 text-gray-900 cursor-not-allowed shadow-none" />
            </div>
            <div className="flex flex-col gap-[0.4vw]">
              <label className="font-bold text-gray-700 text-[0.72vw] uppercase tracking-wider">Category</label>
              <input value={base.category} readOnly className="border border-gray-400 rounded-[0.4vw] py-[0.6vw] px-[0.8vw] text-[0.8vw] font-regular outline-none bg-gray-50 text-gray-900 cursor-not-allowed shadow-none" />
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="bg-blue-50/30 rounded-[0.6vw] shadow-sm border border-blue-200 p-[1.5vw]">
          <div className="flex items-center justify-between mb-[1.2vw] pb-[0.6vw] border-b border-blue-200">
            <h3 className="text-[0.85vw] font-bold text-blue-800 uppercase  flex items-center gap-[0.5vw]">
              <Package className="w-[1.1vw] h-[1.1vw] text-blue-600" /> Manifest & Assembly Specs
              <span className="ml-[0.8vw] text-[0.65vw] bg-blue-600 text-white px-[0.6vw] py-[0.15vw] rounded-full font-bold shadow-sm">{products.length} {products.length === 1 ? 'Count' : 'Counts'}</span>
            </h3>
            {!isReadOnly && (
              <button type="button" onClick={addProduct} className="flex items-center gap-[0.4vw] text-[0.75vw] font-bold text-white bg-blue-600 hover:bg-blue-700 px-[1vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer shadow-md transition-all active:scale-95">
                <Plus className="w-[1vw] h-[1vw]" /> Add Item Row
              </button>
            )}
          </div>
          <ProductionEditableProductTable
            products={products}
            setProducts={setProducts}
            customerCode={base.customerCode}
            customerDb={customerDb}
            boardTypes={boardTypes}
            productTypeOptions={productTypeOptions}
            problemTypeOptions={problemTypeOptions}
            employees={employees}
            stageOptions={stageOptions}
            dispositionOptions={dispositionOptions}
            isReadOnly={isReadOnly}
            onDuplicate={handleDuplicate}
            onRemove={removeProduct}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-[1vw] pt-[1vw] border-t border-slate-400 mt-[0.5vw]">
          <button type="button" onClick={onBack} className="px-[1.8vw] py-[0.75vw] border border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.5vw] cursor-pointer flex items-center gap-[0.5vw] font-bold shadow-sm transition-all">
            <X className="w-[1vw] h-[1vw]" /> Cancel
          </button>
          {!isReadOnly && (
            <button type="submit" className="px-[2.2vw] py-[0.75vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] flex items-center gap-[0.5vw] cursor-pointer font-bold shadow-lg transition-all active:scale-95">
              <Save className="w-[1.1vw] h-[1.1vw]" /> {initialData._id ? "Update Registration" : "Register Inward"}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

// --- Main List Screen ---
export default function ProductionMaterial() {
  const { toast } = useNotification();
  const [data, setData] = useState([]);
  const [view, setView] = useState("list");
  const [selectedRow, setSelectedRow] = useState(null);
  const [reportsRow, setReportsRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMasterData, setShowMasterData] = useState(false);
  const [showVerify, setShowVerify] = useState(null);
  const [stageOptions, setStageOptions] = useState(() => lsLoad(STAGE_MASTER_KEY, DEFAULT_STAGE_OPTIONS));
  const [dispositionOptions, setDispositionOptions] = useState(() => lsLoad(DISPOSITION_MASTER_KEY, DEFAULT_DISPOSITION_OPTIONS));
  const [problemTypeOptions, setProblemTypeOptions] = useState(() => lsLoad(PROBLEM_TYPE_MASTER_KEY, DEFAULT_PROBLEM_TYPE_OPTIONS));
  const [productTypeOptions, setProductTypeOptions] = useState(() => lsLoad(PRODUCT_TYPE_MASTER_KEY, DEFAULT_PRODUCT_TYPE_OPTIONS));
  const [activeFilter, setActiveFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const fetchData = async () => {
    try {
      const [matRes, empRes] = await Promise.all([
        axios.get(`${API_URL}/production-material`),
        axios.get(`${API_URL}/auth/employees`)
      ]);
      setData(matRes.data.map(e => ({ ...e, id: e._id })));
      setEmployees(empRes.data);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user?.role === "Supervisor") setIsSupervisor(true);
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const saveMasterData = (newStages, newDispositions, newProblemTypes, newProductTypes) => {
    setStageOptions(newStages);
    setDispositionOptions(newDispositions);
    setProblemTypeOptions(newProblemTypes);
    setProductTypeOptions(newProductTypes);
    lsSave(STAGE_MASTER_KEY, newStages);
    lsSave(DISPOSITION_MASTER_KEY, newDispositions);
    lsSave(PROBLEM_TYPE_MASTER_KEY, newProblemTypes);
    lsSave(PRODUCT_TYPE_MASTER_KEY, newProductTypes);
    setShowMasterData(false);
    toast("Master Data Updated", "success");
  };

  const handleSave = async (formData) => {
    const loggedUser = JSON.parse(sessionStorage.getItem("loggedInUser") || "{}");
    const entryData = {
      ...formData,
      creatorUserId: loggedUser.userId || "Admin",
      creatorName: loggedUser.name || "Admin"
    };

    const fd = new FormData();
    Object.keys(entryData).forEach(key => {
      if (key === 'products') {
        const productsWithFiles = entryData.products.map((p, idx) => {
          if (p._boardImageFile) {
            fd.append(`boardImage_${idx}`, p._boardImageFile);
          }
          const { _boardImageFile, ...rest } = p;
          // If boardImage is a data URL, we should remove it before sending JSON so backend doesn't store base64
          if (rest.boardImage && rest.boardImage.startsWith('data:')) {
            delete rest.boardImage;
          }
          return rest;
        });
        fd.append('products', JSON.stringify(productsWithFiles));
      } else {
        fd.append(key, entryData[key]);
      }
    });

    try {
      if (selectedRow?.id) {
        const res = await axios.put(`${API_URL}/production-material/${selectedRow.id}`, fd);
        setData(prev => prev.map(d => d.id === selectedRow.id ? { ...res.data, id: res.data._id } : d));
      } else {
        const res = await axios.post(`${API_URL}/production-material`, fd);
        setData(prev => [{ ...res.data, id: res.data._id }, ...prev]);
      }
      setView("list"); setSelectedRow(null); toast("Registration Saved", "success");
    } catch (err) {
      toast("Save failed", "error");
    }
  };

  const onUpdateProduct = async (rowId, productId, updates) => {
    try {
      const res = await axios.patch(`${API_URL}/production-material/${rowId}/product/${productId}/final-status`, updates);
      setData(prev => prev.map(d => d.id === rowId ? { ...res.data, id: res.data._id } : d));
      setShowVerify(null);
      toast("Status Updated Successfully", "success");
    } catch (err) {
      toast("Update failed", "error");
    }
  };

  const caeHistory = useMemo(() => {
    const set = new Set();
    data.forEach(e => e.products?.forEach(p => p.report?.cae && set.add(p.report.cae)));
    return Array.from(set);
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (activeFilter !== "All") {
      filtered = filtered.filter(row => (row.products || []).some(p => (p.finalStatus || "Pending") === activeFilter));
    }
    if (employeeFilter !== "All") {
      filtered = filtered.filter(row => row.creatorUserId === employeeFilter);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        (row.refNoInternal || "").toLowerCase().includes(s) ||
        (row.jobOrderNo || "").toLowerCase().includes(s) ||
        (row.customerName || "").toLowerCase().includes(s) ||
        (row.products || []).some(p => (p.productDescription || "").toLowerCase().includes(s) || (p.serialNumber || "").toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [data, searchTerm, activeFilter, employeeFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelect = (id) => { const s = new Set(selectedItems); s.has(id) ? s.delete(id) : s.add(id); setSelectedItems(s); };
  const toggleSelectPage = () => { const s = new Set(selectedItems); const pageSelected = paginatedData.length > 0 && paginatedData.every(r => s.has(r.id)); if (pageSelected) paginatedData.forEach(r => s.delete(r.id)); else paginatedData.forEach(r => s.add(r.id)); setSelectedItems(s); };
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedItems.has(r.id));

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (window.confirm(`Delete ${selectedItems.size} entries?`)) {
      try {
        await Promise.all(Array.from(selectedItems).map(id => axios.delete(`${API_URL}/production-material/${id}`)));
        setData(prev => prev.filter(e => !selectedItems.has(e.id)));
        setSelectedItems(new Set());
        toast("Deleted successfully", "success");
      } catch (err) {
        toast("Delete failed", "error");
      }
    }
  };

  const counts = useMemo(() => {
    const c = { All: data.length };
    FINAL_STATUS_OPTIONS.forEach(s => {
      c[s] = data.filter(row => (row.products || []).some(p => (p.finalStatus || "Pending") === s)).length;
    });
    return c;
  }, [data]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-[10vw] gap-[1.5vw]">
      <div className="w-[3vw] h-[3vw] border-[0.35vw] border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      <div className="text-blue-600 font-bold text-[1vw] uppercase tracking-widest animate-pulse">Loading Production Data...</div>
    </div>
  );

  if (view === "form") return (
    <InwardForm
      initialData={selectedRow || {}}
      employees={employees}
      onSave={handleSave}
      onBack={() => setView("list")}
      stageOptions={stageOptions}
      dispositionOptions={dispositionOptions}
      problemTypeOptions={problemTypeOptions}
      productTypeOptions={productTypeOptions}
    />
  );

  return (
    <>
      <AnimatePresence>
        {showMasterData && (
          <MasterDataModal
            open={showMasterData}
            onClose={() => setShowMasterData(false)}
            stageOptions={stageOptions}
            dispositionOptions={dispositionOptions}
            problemTypeOptions={problemTypeOptions}
            productTypeOptions={productTypeOptions}
            onSave={saveMasterData}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVerify && (
          <VerificationModal
            row={showVerify.row}
            prod={showVerify.prod}
            employees={employees}
            caeHistory={caeHistory}
            onSave={(verifyData) => {
              const currentReport = showVerify.prod.report || {};
              onUpdateProduct(showVerify.row.id, showVerify.prod._pid, {
                report: {
                  ...currentReport,
                  verifiedBy: verifyData.verifiedBy,
                  verifiedByName: verifyData.verifiedByName,
                  verifiedDate: verifyData.verifiedDate,
                  cae: verifyData.cae
                }
              });
            }}
            onClose={() => setShowVerify(null)}
          />
        )}
      </AnimatePresence>
      <div className="w-full h-full font-sans text-[0.85vw]">
        <AnimatePresence>{reportsRow && <ReportsModal row={reportsRow} onClose={() => setReportsRow(null)} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-400 mb-[0.9vw]">
            <div className="relative w-[30vw]"><Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-black/50 w-[1vw] h-[1vw]" /><input type="text" placeholder="Search by ref, JO, customer, product…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-400 rounded-[0.8vw] focus:outline-none focus:border-blue-500 font-bold" /></div>
            <div className="flex gap-[0.8vw] items-center">
              {!isSupervisor && (
                <button onClick={() => setShowMasterData(true)} className="flex items-center gap-[0.4vw] text-[0.85vw] font-bold border border-blue-200 bg-blue-50 text-blue-700 px-[1vw] h-[2.4vw] rounded-[0.4vw] hover:bg-blue-100 transition-all cursor-pointer">Master Data</button>
              )}
              {selectedItems.size > 0 && !isSupervisor && (<button onClick={handleBulkDelete} className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-bold cursor-pointer transition-all"><Trash2 className="w-[1vw] h-[1vw]" />Delete ({selectedItems.size})</button>)}
              {!isSupervisor && (
                <button onClick={() => setView("form")} className="cursor-pointer flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1.2vw] h-[2.4vw] rounded-[0.4vw] font-bold shadow-md transition-all active:scale-95"><Plus className="w-[1.1vw] h-[1.1vw]" />New Registration</button>
              )}
            </div>
          </div>
          <div className="flex gap-[1vw] mb-[0.9vw] items-center flex-wrap">
            {[{ label: "All", color: "bg-gray-400" }, { label: "Pending", color: "bg-orange-500" }, { label: "Rejected", color: "bg-gray-600" }, { label: "Completed", color: "bg-green-600" }].map(({ label, color }) => {
              const isActive = activeFilter === label;
              return (
                <button key={label} onClick={() => setActiveFilter(label)} className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.55vw] rounded-[0.5vw] border font-bold text-[0.8vw] cursor-pointer transition-all duration-150 select-none ${isActive ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-offset-1 ring-blue-300" : "bg-white text-gray-600 border-gray-400 hover:bg-gray-100"}`}>
                  <span className={`w-[0.6vw] h-[0.6vw] rounded-full ${isActive ? "bg-white" : color}`} />
                  {label} <span className={`px-[0.4vw] py-[0.05vw] rounded-full text-[0.7vw] ${isActive ? "bg-white/20" : "bg-gray-100"}`}>{counts[label] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-400 flex flex-col overflow-hidden">
            <div className="overflow-auto max-h-[65vh] min-h-[65vh]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-50 sticky top-0 z-40">
                  <tr>
                    {!isSupervisor && (
                      <th rowSpan={2} className="p-[0.6vw] border-b-2 border-r border-gray-400 text-center align-middle w-[3%] bg-blue-50 sticky top-0 left-0 z-50">
                        <button onClick={toggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                          {isPageSelected ? <CheckCircle className="w-[1.2vw] h-[1.2vw] text-blue-600" /> : <div className="w-[1.1vw] h-[1.1vw] border-2 border-gray-400 rounded"></div>}
                        </button>
                      </th>
                    )}
                    {["S.No", "Date", "Job Order No", "Customer", "Cus Code", "Category"].map(h => {
                      const minW = h === "Customer" ? "180px" : (h === "Job Order No" ? "140px" : "80px");
                      return (
                        <th key={h} rowSpan={2} style={{ minWidth: minW }} className="px-[0.6vw] py-[0.5vw] font-bold text-black text-center border-b-2 border-r border-gray-400 whitespace-nowrap text-[0.78vw] align-middle bg-blue-50 sticky top-0 z-20">{h}</th>
                      );
                    })}
                    <th colSpan={12} className="px-[0.6vw] py-[0.4vw] font-semibold text-black border-b border-r border-gray-400 text-center text-[0.78vw] bg-blue-100 sticky top-0 z-40">Product Manifest Details</th>
                    <th rowSpan={2} className="px-[0.8vw] py-[0.5vw] font-semibold text-black text-center border-b-2 border-l border-gray-400 whitespace-nowrap text-[0.78vw] align-middle bg-blue-50 sticky right-0 top-0 z-50 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                  <tr>
                    {["Item Code", "Description", "NC Type", "Stage", "Qty", "Serial/Batch", "Assigned To", "Verified By", "Verified Date", "CAE", "Final Status", "Final Remarks"].map((h, i) => {
                      const minW = h === "Description" ? "220px" : (h === "Final Remarks" ? "180px" : (h === "Qty" ? "120px" : (h === "Verified By" ? "130px" : (h === "Verified Date" ? "100px" : (h === "CAE" ? "150px" : "110px")))));
                      return (
                        <th key={h} style={{ minWidth: minW }} className={`px-[0.6vw] py-[0.4vw] font-bold text-black border-b-2 border-r border-gray-400 whitespace-nowrap text-[0.72vw] bg-blue-50 text-center`}>{h}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.length > 0 ? (
                    paginatedData.flatMap((row, i) => {
                      const isSelected = selectedItems.has(row.id);
                      const products = row.products || [];
                      const span = products.length;
                      return products.map((prod, pi) => {
                        const isTechCompleted = prod.report?.status === "Completed";
                        const isVerified = !!prod.report?.verifiedBy;
                        const showReadyHighlight = isTechCompleted && !isVerified;
                        
                        return (
                          <tr 
                            key={`${row.id}-${pi}`} 
                            className={`transition-all duration-200 hover:bg-blue-50/30 ${isSelected ? "bg-blue-100/40" : showReadyHighlight ? "bg-emerald-50/60" : "bg-white"}`}
                          >
                          {pi === 0 && (
                            <>
                              {!isSupervisor && (
                                <td rowSpan={span} className="p-[0.7vw] border-r border-slate-400 text-center align-middle">
                                  <button onClick={() => toggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                                    {isSelected ? <CheckCircle className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <div className="w-[1.1vw] h-[1.1vw] border border-gray-400 rounded hover:border-blue-400"></div>}
                                  </button>
                                </td>
                              )}
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-bold text-gray-900 text-[0.78vw]">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-gray-700 text-[0.78vw] whitespace-pre">{fmtDate(row.date)}</td>
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center text-[0.78vw] font-semibold text-blue-700">{row.jobOrderNo || "—"}</td>
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-gray-900 text-[0.75vw]">{row.customerName || "—"}</td>
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle font-semibold text-gray-600 text-[0.72vw]">{row.customerCode || "—"}</td>
                              <td rowSpan={span} className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle"><span className="text-[0.68vw] font-semibold bg-blue-100 text-blue-700 px-[0.4vw] py-[0.1vw] rounded whitespace-pre">{row.category || "—"}</span></td>
                            </>
                          )}
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle">
                            {showReadyHighlight && (
                              <div className="flex items-center justify-center gap-[0.3vw] mb-[0.3vw]">
                                <div className="h-[0.5vw] w-[0.5vw] rounded-full bg-emerald-500 shadow-sm" />
                                <span className="text-[0.6vw] font-normal text-emerald-700 whitespace-nowrap">Employee completed</span>
                              </div>
                            )}
                            <div className="font-semibold text-black text-[0.72vw]">{prod.productCode || "—"}</div>
                          </td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-black text-[0.72vw] truncate max-w-[10vw]" title={prod.productDescription}>{prod.productDescription || "—"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle"><span className={`text-[0.68vw] font-medium px-[0.4vw] py-[0.1vw] rounded border ${prod.ncType === "External" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{prod.ncType || "Internal"}</span></td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle"><span className="text-[0.72vw] font-normal text-black">{prod.stage || "Assembly"}</span></td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 text-center align-middle font-normal text-black text-[0.75vw]">{prod.qty || "1"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-normal text-black text-[0.72vw]">{prod.serialNumber || "—"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-black text-[0.75vw]">{prod.assignedToName || "Unassigned"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-emerald-700 text-[0.75vw]">{prod.report?.verifiedByName || "—"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-normal text-black text-[0.72vw]">{fmtDate(prod.report?.verifiedDate)}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-blue-700 text-[0.75vw] truncate max-w-[10vw]" title={prod.report?.cae}>{prod.report?.cae || "—"}</td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center">
                            <FinalStatusCell row={row} prod={prod} onUpdateProduct={onUpdateProduct} isSupervisor={isSupervisor} />
                          </td>
                          <td className="px-[0.8vw] py-[0.7vw] border-r border-slate-400 align-middle text-center font-semibold text-black text-[0.72vw] truncate max-w-[10vw]" title={prod.finalStatusRemarks}>{prod.finalStatusRemarks || "—"}</td>
                          <td className={`px-[0.8vw] py-[0.7vw] text-center align-middle border-l border-slate-400 sticky right-0 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] ${isSelected ? "bg-blue-50/50" : "bg-white"}`}>
                            <div className="flex items-center justify-start gap-[0.5vw]">
                              <button onClick={() => setReportsRow(row)} className="w-[2vw] h-[2vw] flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all cursor-pointer border border-blue-100 shadow-sm" title="View Report"><Eye className="w-[1vw] h-[1vw]" /></button>
                              
                              <button
                                onClick={() => setShowVerify({ row, prod })}
                                className={`w-[2vw] h-[2vw] flex items-center justify-center rounded-full transition-all cursor-pointer border shadow-sm ${prod.report?.verifiedBy ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"}`}
                                title={prod.report?.verifiedBy ? "Update Verification" : "Verify Resolution"}
                              >
                                <CheckCircle className="w-[1vw] h-[1vw]" />
                              </button>

                              {!isSupervisor && (
                                <>
                                  {pi === 0 && (
                                    <button onClick={() => { setSelectedRow(row); setView("form"); }} className="w-[2vw] h-[2vw] flex items-center justify-center bg-white border border-gray-400 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded-full transition-all cursor-pointer shadow-sm" title="Edit Registration"><Edit3 className="w-[1vw] h-[1vw]" /></button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      });
                    })
                  ) : (
                    <tr><td colSpan={19} className="py-[6vw] text-center text-gray-400 text-[0.9vw] font-bold italic">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-400 p-[0.6vw] bg-gray-50 flex justify-between items-center rounded-b-[0.6vw]">
              <div className="text-[0.8vw] font-bold text-gray-500">Showing <strong>{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> entries</div>
              <div className="flex items-center gap-[1.2vw]">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-[0.4vw] border border-gray-400 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronDown className="w-[1vw] h-[1vw] rotate-90" /></button>
                <div className="flex gap-[0.7vw]">{Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map(pNum => (<button key={pNum} onClick={() => setCurrentPage(pNum)} className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-bold cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-gray-400 text-gray-600 hover:bg-gray-100"}`}>{pNum}</button>))}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-[0.4vw] border border-gray-400 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronUp className="w-[1vw] h-[1vw] rotate-90" /></button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}