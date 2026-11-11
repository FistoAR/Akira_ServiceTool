// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, Trash2, Save, ArrowLeft, Plus, User, Package, ChevronDown,
  ChevronUp, Eye, Target, ClipboardList, Edit3, Clock, History, FileText, AlertCircle, CheckCircle, Wrench,
  Calendar, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import ProductionEditableProductTable from "./ProductionEditableProductTable";
import useModulePermissions from "../../components/useModulePermissions";

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
  "Rejected": "bg-gray-200 text-gray-700 border-slate-300",
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-[2vw]">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-[72vw] max-h-[88vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <div className="bg-blue-50 p-[0.5vw] rounded-full text-blue-600 border border-blue-100">
              <FileText className="w-[1.2vw] h-[1.2vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">Full Production Report</h3>
              <p className="text-[0.74vw] text-slate-500 font-medium">{row.refNoInternal} · {row.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer transition-all hover:bg-slate-100 p-[0.35vw] rounded-full">
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          <div className="grid grid-cols-3 gap-[1vw]">
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.7vw] uppercase font-bold text-slate-500 tracking-wider mb-[0.6vw]">Entry Details</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Date:</span> {fmtDate(row.date)}</div>
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Job Order:</span> <span className="text-blue-600 font-semibold">{row.jobOrderNo || "—"}</span></div>
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Products:</span> {products.length}</div>
              </div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.7vw] uppercase font-bold text-slate-500 tracking-wider mb-[0.6vw]">Customer</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Name:</span> <span className="font-medium text-slate-800">{row.customerName || "—"}</span></div>
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Code:</span> <span className="font-mono text-slate-600">{row.customerCode || "—"}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.7vw] uppercase font-bold text-slate-500 tracking-wider mb-[0.6vw]">Audit Details</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Created By:</span> {row.creatorName || "Admin"}</div>
                <div className="text-[0.76vw] text-slate-700"><span className="font-semibold text-slate-500">Last updated:</span> {fmtDate(row.updatedAt || row.createdAt)}</div>
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-[4vw] text-[0.85vw] text-slate-400">No product records available for this entry.</div>
          ) : products.map((prod, idx) => (
            <div key={prod._pid} className="border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs bg-white">
              <div
                onClick={() => toggleExpand(prod._pid)}
                className="bg-slate-50/80 px-[1.2vw] py-[0.8vw] flex items-center justify-between gap-[1vw] cursor-pointer hover:bg-slate-100/70 transition-colors border-b border-slate-200/80"
              >
                <div>
                  <div className="text-[0.88vw] font-semibold text-slate-800">{prod.productDescription || "Unnamed Product"}</div>
                  <div className="text-[0.72vw] text-slate-500 mt-[0.2vw] flex flex-wrap gap-[0.8vw]">
                    <span>JO: <span className="text-blue-600 font-medium">{row.jobOrderNo || "—"}</span></span>
                    <span>Code: <span className="font-mono text-slate-700">{prod.productCode || "—"}</span></span>
                    <span>Qty: <span className="font-medium text-slate-700">{prod.qty || "—"}</span></span>
                    <span>S/N: <span className="font-mono text-slate-700">{prod.serialNumber || "—"}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="text-[0.7vw] px-[0.6vw] py-[0.15vw] rounded-full bg-slate-200/70 text-slate-700 font-semibold">Item {idx + 1}</span>
                  <ChevronDown className={`w-[1vw] h-[1vw] text-slate-500 transition-transform duration-200 ${expanded.has(prod._pid) ? "rotate-180" : ""}`} />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expanded.has(prod._pid) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-100">
                      {/* Registration Info */}
                      <div className="p-[1.2vw] bg-white border-b border-slate-200/80">
                        <div className="text-[0.72vw] font-bold text-slate-700 uppercase tracking-wider mb-[0.9vw] flex items-center gap-[0.45vw]">
                          <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full inline-block" />
                          <Target className="w-[0.9vw] h-[0.9vw] text-blue-600" /> Registration Information
                        </div>
                        <div className="grid grid-cols-6 gap-[1.2vw] mb-[0.9vw]">
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Stage</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.stage || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Category</div><div className="text-slate-800 font-medium text-[0.78vw]">{row.category || prod.category || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">NC Type</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.ncType || "Internal"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Problem Type</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.problemType || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Inspected By</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.inspectedByName || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Designators</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.designators || "—"}</div></div>
                        </div>
                        <div className="flex gap-[1.2vw] mb-[0.9vw]">
                          <div className="flex-1">
                            <div className="text-[0.65vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Initial Problem Description</div>
                            <div className="text-[0.78vw] text-slate-800 leading-relaxed bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">{prod.problem || "No description provided."}</div>
                          </div>
                          {prod.boardImage && (
                            <div className="w-[10vw]">
                              <div className="text-[0.65vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Board Image</div>
                              <img 
                                src={`${API_URL}${prod.boardImage}`} 
                                alt="Board" 
                                className="w-full h-[6vw] object-cover rounded-[0.5vw] border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(`${API_URL}${prod.boardImage}`, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-6 gap-[1.2vw]">
                           <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Assembled By</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.report?.assembledByName || prod.assembledByName || "—"}</div></div>
                           <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Tested By</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.report?.testedByName || prod.testedByName || "—"}</div></div>
                        </div>
                      </div>

                      {/* Technical Resolution Report */}
                      <div className="p-[1.2vw] bg-slate-50/50">
                        <div className="text-[0.72vw] font-bold text-slate-700 uppercase tracking-wider mb-[0.9vw] flex items-center gap-[0.45vw]">
                          <span className="w-[0.25vw] h-[0.85vw] bg-emerald-600 rounded-full inline-block" />
                          <Wrench className="w-[0.9vw] h-[0.9vw] text-emerald-600" /> Technical Resolution Report
                        </div>
                        {prod.report ? (
                          <div className="space-y-[1vw]">
                            <div className="grid grid-cols-4 gap-[1.2vw]">
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Start Date</div><div className="text-slate-800 font-medium text-[0.78vw]">{fmtDate(prod.report.startDate)}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">4M Category</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.report.fourMCategory || "—"}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">CAE</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.report.cae || "—"}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Status</div><div className="text-blue-600 font-semibold text-[0.78vw]">{prod.report.status || "—"}</div></div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.65vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Root Cause Analysis</div>
                                <div className="text-[0.78vw] text-slate-800 leading-relaxed">{prod.report.rootCause || "—"}</div>
                              </div>
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.65vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Corrective Action Taken</div>
                                <div className="text-[0.78vw] text-slate-800 leading-relaxed">{prod.report.correctiveAction || "—"}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.65vw] text-slate-500 font-semibold uppercase mb-[0.5vw]">Parts Replaced</div>
                                {prod.report && prod.report.partsReplacement && prod.report.partsReplacement.trim() ? (
                                  <ul className="list-disc list-inside space-y-[0.2vw]">
                                    {parseParts(prod.report.partsReplacement).map((part, pidx) => (
                                      <li key={pidx} className="text-[0.76vw] text-slate-800 leading-tight">{part}</li>
                                    ))}
                                  </ul>
                                ) : <div className="text-[0.76vw] text-slate-400 italic">No parts replaced.</div>}
                              </div>
                              <div className="grid grid-cols-2 gap-[0.8vw]">
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Closed Date</div><div className="text-slate-800 font-medium text-[0.78vw]">{fmtDate(prod.report.closedDate)}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Verified Date</div><div className="text-slate-800 font-medium text-[0.78vw]">{fmtDate(prod.report.verifiedDate)}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Verified By</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.report.verifiedByName || "—"}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.64vw] font-semibold">Disposition</div><div className="text-slate-800 font-medium text-[0.78vw]">{prod.disposition || "—"}</div></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-[0.8vw]">
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.58vw] font-bold text-slate-400 uppercase">Assembler</div><div className="text-[0.75vw] font-medium text-slate-800">{prod.report.assembledByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.58vw] font-bold text-slate-400 uppercase">Tester</div><div className="text-[0.75vw] font-medium text-slate-800">{prod.report.testedByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.58vw] font-bold text-slate-400 uppercase">FI By</div><div className="text-[0.75vw] font-medium text-slate-800">{prod.report.fiByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.58vw] font-bold text-slate-400 uppercase">Final Status</div><div className="text-[0.75vw] font-semibold text-slate-800 uppercase">{prod.finalStatus || "Pending"}</div></div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-[2.5vw] text-center">
                            <Clock className="w-[1.8vw] h-[1.8vw] text-slate-300 mx-auto mb-[0.6vw]" />
                            <div className="text-[0.82vw] text-slate-400 font-medium">No technical report submitted yet.</div>
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
        <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-200 bg-white flex justify-end">
          <button onClick={onClose} className="px-[1.5vw] h-[2.2vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[0.76vw] font-semibold cursor-pointer transition-all">Close</button>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[200] flex items-center justify-center p-[2vw]">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-[35vw] rounded-[0.8vw] flex flex-col border border-slate-200 shadow-2xl overflow-visible">
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center rounded-t-[0.8vw]">
          <div className="flex items-center gap-[0.7vw]">
            <div className="bg-emerald-50 p-[0.45vw] rounded-full text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">Verify Resolution</h3>
              <p className="text-[0.72vw] text-slate-500 font-medium">Verify completion & CAE for this product</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="p-[1.4vw] space-y-[1.1vw] bg-white">
          <div className="bg-slate-50/70 p-[0.9vw] rounded-[0.6vw] border border-slate-200/80">
            <div className="text-[0.68vw] font-bold text-blue-600 uppercase tracking-wider mb-[0.35vw]">Product Context</div>
            <div className="text-[0.85vw] font-semibold text-slate-800">{prod.productDescription}</div>
            <div className="text-[0.72vw] text-slate-500 mt-[0.15vw]">
              <span className="font-semibold text-slate-600">S/N:</span> <span className="font-mono">{prod.serialNumber || "—"}</span> · <span className="font-semibold text-slate-600">JO:</span> <span className="text-blue-600 font-medium">{row.jobOrderNo || "—"}</span>
            </div>
          </div>

          <div className="space-y-[0.9vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">Verified By <span className="text-rose-500">*</span></label>
              <select
                value={formData.verifiedBy}
                onChange={e => {
                  const emp = employees.find(emp => emp.userId === e.target.value);
                  setFormData(p => ({ ...p, verifiedBy: e.target.value, verifiedByName: emp?.name || "" }));
                }}
                className="w-full border border-slate-200 rounded-[0.5vw] py-[0.55vw] px-[0.75vw] text-[0.78vw] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all"
              >
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.userId} value={e.userId}>{e.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">Verified Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={formData.verifiedDate}
                onChange={e => setFormData(p => ({ ...p, verifiedDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-[0.5vw] py-[0.55vw] px-[0.75vw] text-[0.78vw] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw] relative">
              <label className="text-[0.76vw] font-semibold text-slate-700">CAE (Corrective Action Effectiveness)</label>
              <div className="relative">
                <input
                  value={formData.cae}
                  onChange={e => { setFormData(p => ({ ...p, cae: e.target.value })); setShowCaeSuggestions(true); }}
                  onFocus={() => setShowCaeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCaeSuggestions(false), 200)}
                  onKeyDown={onKeyDown}
                  placeholder="Enter or select CAE..."
                  className="w-full border border-slate-200 rounded-[0.5vw] py-[0.55vw] px-[0.75vw] text-[0.78vw] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all"
                />
                <AnimatePresence>
                  {showCaeSuggestions && filteredCaeSuggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="absolute z-50 w-full mt-[0.2vw] bg-white border border-slate-200 rounded-[0.5vw] shadow-xl max-h-[12vw] overflow-y-auto overflow-x-hidden custom-scrollbar py-[0.2vw]"
                    >
                      {filteredCaeSuggestions.map((opt, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setFormData(p => ({ ...p, cae: opt })); setShowCaeSuggestions(false); }} 
                          className={`px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium transition-colors border-b border-slate-100 last:border-0 cursor-pointer ${selectedIndex === i ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
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

        <div className="p-[1vw] border-t border-slate-200 bg-slate-50/70 flex justify-end gap-[0.6vw] rounded-b-[0.8vw]">
          <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] border border-slate-200 bg-white text-slate-700 font-semibold rounded-full text-[0.76vw] hover:bg-slate-50 cursor-pointer transition-all">Cancel</button>
          <button onClick={handleSave} className="px-[1.4vw] h-[2.2vw] bg-blue-600 text-white font-semibold rounded-full text-[0.76vw] hover:bg-blue-700 active:scale-95 transition-all shadow-xs">Save Verification</button>
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
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-[1.5vw]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[0.9vw] w-[55vw] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[1vw] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-[0.7vw]">
            <div className="bg-blue-50 p-[0.45vw] rounded-full text-blue-600 border border-blue-100">
              <ClipboardList className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.05vw] font-bold text-slate-800">Master Data Configuration</h3>
              <p className="text-[0.72vw] text-slate-500 font-medium">Manage system-wide production material categories</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer"><X className="w-[1.2vw] h-[1.2vw]" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex bg-white min-h-[40vh]">
          {/* Sidebar */}
          <div className="w-[14vw] border-r border-slate-200 flex flex-col bg-slate-50/60 p-[0.6vw] gap-[0.2vw]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-[0.6vw] px-[0.9vw] py-[0.6vw] text-[0.78vw] font-semibold rounded-[0.5vw] transition-all text-left cursor-pointer ${activeTab === tab.id ? "bg-white text-blue-600 shadow-2xs border border-slate-200 font-bold" : "text-slate-600 hover:bg-slate-100/70"}`}
              >
                <tab.icon className={`w-[0.95vw] h-[0.95vw] ${activeTab === tab.id ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-[1.5vw] overflow-y-auto bg-white">
            <AnimatePresence mode="wait">
              {activeTab === "stages" && (
                <motion.div key="stages" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.2vw]">
                  <h4 className="text-[0.9vw] font-bold text-slate-800">Work Stages</h4>
                  <div className="flex gap-[0.6vw] bg-slate-50 p-[0.8vw] rounded-[0.6vw] border border-slate-200">
                    <input value={newStage} onChange={e => setNewStage(e.target.value)} onKeyPress={e => e.key === 'Enter' && addStage()} placeholder="Add new stage..." className="flex-1 border border-slate-200 rounded-full py-[0.5vw] px-[0.9vw] text-[0.78vw] outline-none focus:border-blue-500 bg-white shadow-2xs" />
                    <button onClick={addStage} className="bg-blue-600 text-white px-[1.1vw] h-[2.2vw] rounded-full text-[0.76vw] font-semibold hover:bg-blue-700 shadow-2xs active:scale-95 transition-all flex items-center gap-[0.3vw] cursor-pointer"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
                  </div>
                  <div className="flex flex-wrap gap-[0.6vw]">{stages.map(s => <span key={s} className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-200 rounded-full text-[0.76vw] text-slate-700 font-medium shadow-2xs group hover:border-slate-300 transition-all">{s}<button onClick={() => removeStage(s)} className="w-[1vw] h-[1vw] rounded-full bg-slate-100 group-hover:bg-rose-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.65vw] h-[0.65vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "dispositions" && (
                <motion.div key="dispositions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.2vw]">
                  <h4 className="text-[0.9vw] font-bold text-slate-800">Disposition Outcomes</h4>
                  <div className="flex gap-[0.6vw] bg-slate-50 p-[0.8vw] rounded-[0.6vw] border border-slate-200">
                    <input value={newDisposition} onChange={e => setNewDisposition(e.target.value)} onKeyPress={e => e.key === 'Enter' && addDisposition()} placeholder="Add new disposition..." className="flex-1 border border-slate-200 rounded-full py-[0.5vw] px-[0.9vw] text-[0.78vw] outline-none focus:border-blue-500 bg-white shadow-2xs" />
                    <button onClick={addDisposition} className="bg-emerald-600 text-white px-[1.1vw] h-[2.2vw] rounded-full text-[0.76vw] font-semibold hover:bg-emerald-700 shadow-2xs active:scale-95 transition-all flex items-center gap-[0.3vw] cursor-pointer"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
                  </div>
                  <div className="flex flex-wrap gap-[0.6vw]">{dispositions.map(d => <span key={d} className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-200 rounded-full text-[0.76vw] text-slate-700 font-medium shadow-2xs group hover:border-slate-300 transition-all">{d}<button onClick={() => removeDisposition(d)} className="w-[1vw] h-[1vw] rounded-full bg-slate-100 group-hover:bg-rose-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.65vw] h-[0.65vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "problems" && (
                <motion.div key="problems" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.2vw]">
                  <h4 className="text-[0.9vw] font-bold text-slate-800">Problem Types</h4>
                  <div className="flex gap-[0.6vw] bg-slate-50 p-[0.8vw] rounded-[0.6vw] border border-slate-200">
                    <input value={newProblemType} onChange={e => setNewProblemType(e.target.value)} onKeyPress={e => e.key === 'Enter' && addProblemType()} placeholder="Add new problem type..." className="flex-1 border border-slate-200 rounded-full py-[0.5vw] px-[0.9vw] text-[0.78vw] outline-none focus:border-blue-500 bg-white shadow-2xs" />
                    <button onClick={addProblemType} className="bg-orange-600 text-white px-[1.1vw] h-[2.2vw] rounded-full text-[0.76vw] font-semibold hover:bg-orange-700 shadow-2xs active:scale-95 transition-all flex items-center gap-[0.3vw] cursor-pointer"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
                  </div>
                  <div className="flex flex-wrap gap-[0.6vw]">{problemTypes.map(p => <span key={p} className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-200 rounded-full text-[0.76vw] text-slate-700 font-medium shadow-2xs group hover:border-slate-300 transition-all">{p}<button onClick={() => removeProblemType(p)} className="w-[1vw] h-[1vw] rounded-full bg-slate-100 group-hover:bg-rose-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.65vw] h-[0.65vw]" /></button></span>)}</div>
                </motion.div>
              )}
              {activeTab === "products" && (
                <motion.div key="products" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-[1.2vw]">
                  <h4 className="text-[0.9vw] font-bold text-slate-800">Product Types</h4>
                  <div className="flex gap-[0.6vw] bg-slate-50 p-[0.8vw] rounded-[0.6vw] border border-slate-200">
                    <input value={newProductType} onChange={e => setNewProductType(e.target.value)} onKeyPress={e => e.key === 'Enter' && addProductType()} placeholder="Add new product type..." className="flex-1 border border-slate-200 rounded-full py-[0.5vw] px-[0.9vw] text-[0.78vw] outline-none focus:border-blue-500 bg-white shadow-2xs" />
                    <button onClick={addProductType} className="bg-purple-600 text-white px-[1.1vw] h-[2.2vw] rounded-full text-[0.76vw] font-semibold hover:bg-purple-700 shadow-2xs active:scale-95 transition-all flex items-center gap-[0.3vw] cursor-pointer"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
                  </div>
                  <div className="flex flex-wrap gap-[0.6vw]">{productTypes.map(p => <span key={p} className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-200 rounded-full text-[0.76vw] text-slate-700 font-medium shadow-2xs group hover:border-slate-300 transition-all">{p}<button onClick={() => removeProductType(p)} className="w-[1vw] h-[1vw] rounded-full bg-slate-100 group-hover:bg-rose-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all cursor-pointer"><X className="w-[0.65vw] h-[0.65vw]" /></button></span>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-end gap-[0.6vw] p-[1vw] border-t border-slate-200 bg-slate-50/70 shrink-0 rounded-b-[0.9vw]">
          <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] rounded-full border border-slate-200 text-[0.76vw] text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer">Cancel</button>
          <button onClick={() => onSave(stages, dispositions, problemTypes, productTypes)} className="px-[1.4vw] h-[2.2vw] rounded-full bg-blue-600 text-white text-[0.76vw] font-semibold hover:bg-blue-700 shadow-xs transition-all active:scale-95 cursor-pointer">Save Master Data</button>
        </div>
      </motion.div>
    </div>
  );
};

        <div className="flex justify-end gap-[0.8vw] p-[1.1vw] border-t border-slate-300 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-[1.2vw] py-[0.6vw] rounded-[0.4vw] border border-slate-300 text-[0.82vw] text-black font-bold hover:bg-gray-100 cursor-pointer">Cancel</button>
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
      <div onClick={() => setOpen(!open)} className={`flex items-center justify-center gap-[0.4vw] bg-white border rounded-[0.3vw] px-[0.5vw] py-[0.25vw] transition-all cursor-pointer hover:border-blue-400 mx-auto w-max ${val ? "border-slate-300" : "border-dashed border-slate-300"}`}>
        <span className={`text-[0.7vw] font-bold truncate max-w-[6vw] ${val ? "text-black" : "text-gray-400"}`}>{selected ? selected.name : "Assign"}</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full left-0 mt-[0.2vw] bg-white border border-slate-300 shadow-xl rounded-[0.4vw] w-[14vw] max-h-[12vw] overflow-y-auto z-[200] py-[0.2vw]">
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

  const cls = FINAL_STATUS_COLORS[status] || "bg-gray-100 text-black/80 border-slate-300";

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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-[0.3vw] bg-white border border-slate-300 shadow-xl rounded-[0.5vw] z-40 w-[17vw] p-[0.8vw]">
              <div className="text-[0.72vw] font-bold text-gray-900 mb-[0.5vw]">Update Final Status</div>
              <div className="grid grid-cols-2 gap-[0.35vw] mb-[0.7vw]">
                {FINAL_STATUS_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setStatus(opt)} className={`py-[0.3vw] rounded-[0.3vw] border text-[0.66vw] font-bold cursor-pointer transition-all ${status === opt ? FINAL_STATUS_COLORS[opt] + " ring-2 ring-offset-1 ring-blue-300" : "bg-gray-50 text-gray-600 border-slate-300 hover:bg-gray-100"}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mb-[0.6vw]"><label className="text-[0.65vw] font-bold text-gray-700 block mb-[0.25vw]">Status Date</label><input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} className="w-full border border-slate-300 rounded-[0.3vw] px-[0.4vw] py-[0.35vw] text-[0.72vw] outline-none focus:border-blue-400" /></div>
              <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks…" className="w-full border border-slate-300 rounded-[0.3vw] p-[0.4vw] text-[0.72vw] outline-none focus:border-blue-400 resize-none mb-[0.6vw]" />
              <div className="flex justify-end gap-[0.4vw]"><button onClick={() => setOpen(false)} className="px-[0.8vw] py-[0.3vw] text-[0.68vw] border border-slate-300 rounded-[0.3vw] text-gray-700 hover:bg-gray-50 font-bold">Cancel</button><button onClick={handleSave} className="px-[0.8vw] py-[0.3vw] text-[0.68vw] bg-blue-600 text-white rounded-[0.3vw] hover:bg-blue-700 font-bold flex items-center gap-[0.3vw]"><Save className="w-[0.7vw] h-[0.7vw]" />Save</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative" ref={historyRef}>
        <button onClick={() => setShowHistory(!showHistory)} title="Status History" className="p-[0.3vw] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-[0.3vw] transition-colors cursor-pointer"><Clock className="w-[0.9vw] h-[0.9vw]" /></button>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-[0.3vw] bg-white border border-slate-300 shadow-2xl rounded-[0.5vw] z-40 w-[22vw] p-[1vw]">
              <div className="flex items-center justify-between mb-[0.8vw] pb-[0.4vw] border-b border-slate-300"><div className="text-[0.8vw] font-bold text-gray-900 flex items-center gap-[0.4vw]"><Clock className="w-[0.9vw] h-[0.9vw] text-blue-500" />Status History</div><button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-900"><X className="w-[0.8vw] h-[0.8vw]" /></button></div>
              <div className="max-h-[15vw] overflow-y-auto space-y-[0.6vw] pr-[0.3vw]">
                {(prod.finalStatusHistory || []).length > 0 ? [...(prod.finalStatusHistory || [])].reverse().map((h, i) => (
                  <div key={i} className="bg-gray-50/50 rounded-[0.4vw] p-[0.6vw] border border-slate-300"><div className="flex items-center justify-between mb-[0.2vw]"><span className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded-full font-bold border ${FINAL_STATUS_COLORS[h.status] || "bg-gray-100 text-black/80"}`}>{h.status}</span><div className="text-right">{h.date && <div className="text-[0.62vw] font-bold text-blue-600">{fmtDate(h.date)}</div>}<div className="text-[0.6vw] text-black/50">{fmtDate(h.timestamp)}</div></div></div><div className="text-[0.72vw] text-black/90 italic leading-tight">"{h.remarks || <span className="text-black/30">No remarks</span>}"</div></div>
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
const InwardForm = ({ initialData, employees, onSave, onBack, stageOptions, dispositionOptions, problemTypeOptions, productTypeOptions, canWrite = true, canUpdate = true }) => {
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
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full h-full flex flex-col font-sans flex-1 min-h-0 overflow-hidden pr-[0.3vw]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-200 mb-[0.6vw] shrink-0">
        <div className="flex items-center gap-[0.9vw]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[0.4vw] text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-[0.75vw] py-[0.35vw] rounded-[0.5vw] cursor-pointer text-[0.78vw] font-medium transition-colors"
          >
            <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
            <span>Back</span>
          </button>
          <h2 className="text-[1.05vw] font-bold text-slate-800">
            {initialData._id ? "Edit Production NC" : "New Production NC Registration"}
          </h2>
        </div>
        <div className="bg-blue-50/80 border border-blue-200 px-[0.9vw] py-[0.35vw] rounded-[0.5vw] text-[0.8vw] flex items-center gap-[0.4vw]">
          <span className="text-slate-500 font-medium">Ref No:</span>
          <span className="font-mono font-bold text-blue-600">
            {base.refNoInternal}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Middle Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-[0.4vw] flex flex-col gap-[0.9vw] pb-[0.8vw] custom-scrollbar">
          {/* SECTION 1: Primary Order Details */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
            <div className="flex items-center gap-[0.45vw] mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
              <ClipboardList className="w-[1vw] h-[1vw] text-blue-600" />
              <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
                Primary Order Details
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-[1.2vw]">
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Registration Date</label>
                <input
                  type="date"
                  value={base.date}
                  onChange={e => setBase({ ...base, date: e.target.value })}
                  disabled={isReadOnly}
                  className="bg-white border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Job Order Number <span className="text-rose-500">*</span></label>
                <input
                  value={base.jobOrderNo}
                  onChange={e => setBase({ ...base, jobOrderNo: e.target.value })}
                  placeholder="Enter Job Order..."
                  disabled={isReadOnly}
                  className="bg-white border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
              <div className="flex flex-col gap-[0.35vw] relative" ref={custRef}>
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Customer Name</label>
                <div className="relative">
                  <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-slate-400" />
                  <input
                    value={custSearch}
                    onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                    onFocus={() => setShowCustDrop(true)}
                    onKeyDown={onCustKeyDown}
                    placeholder="Search & select customer..."
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 rounded-[0.5vw] h-[2.3vw] pl-[2.2vw] pr-[0.75vw] text-[0.8vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
                <AnimatePresence>
                  {showCustDrop && filteredCustomers.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[100] w-[25vw] left-0 top-full mt-[0.3vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-2xl max-h-[15vw] overflow-y-auto py-[0.3vw]">
                      {filteredCustomers.map((c, i) => (
                        <div 
                          key={c.code} 
                          onClick={() => selectCustomer(c)} 
                          className={`px-[1vw] py-[0.5vw] cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors ${custSelectedIndex === i ? "bg-blue-600 text-white" : "hover:bg-slate-50"}`}
                        >
                          <div className="flex-1">
                            <div className={`text-[0.8vw] font-semibold ${custSelectedIndex === i ? "text-white" : "text-slate-800"}`}>{c.name}</div>
                            <div className={`text-[0.68vw] font-mono ${custSelectedIndex === i ? "text-white/80" : "text-slate-400"}`}>{c.code}</div>
                          </div>
                          {c.type && (
                            <span className={`text-[0.6vw] px-[0.4vw] py-[0.1vw] rounded font-semibold uppercase ${custSelectedIndex === i ? "bg-white/20 text-white border border-white/30" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>{c.type}</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Customer Code</label>
                <input
                  value={base.customerCode}
                  readOnly
                  className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] font-mono text-slate-600 cursor-not-allowed outline-none"
                />
              </div>
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Category</label>
                <input
                  value={base.category}
                  readOnly
                  className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-600 cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Product Manifest & Assembly Specs */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
            <div className="flex items-center justify-between mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <div className="flex items-center gap-[0.45vw]">
                <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
                <Package className="w-[1vw] h-[1vw] text-blue-600" />
                <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-[0.5vw]">
                  Manifest & Assembly Specs
                  <span className="text-[0.68vw] bg-blue-50 text-blue-700 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-full font-semibold">
                    {products.length} {products.length === 1 ? 'Item' : 'Items'}
                  </span>
                </h3>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addProduct}
                  className="cursor-pointer flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-[0.9vw] h-[2.1vw] rounded-full text-[0.74vw] transition-all shadow-2xs active:scale-95"
                >
                  <Plus className="w-[0.85vw] h-[0.85vw]" />
                  <span>Add Item Row</span>
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
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-[0.8vw] bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] border border-slate-200 shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.04)] shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-[1.4vw] h-[2.2vw] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full cursor-pointer flex items-center gap-[0.4vw] font-semibold text-[0.76vw] transition-all"
          >
            <X className="w-[0.85vw] h-[0.85vw]" /> Cancel
          </button>
          {((initialData._id ? canUpdate : canWrite) && !isReadOnly) && (
            <button
              type="submit"
              className="px-[1.6vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full flex items-center gap-[0.4vw] cursor-pointer font-bold text-[0.76vw] shadow-xs transition-all active:scale-95"
            >
              <Save className="w-[0.85vw] h-[0.85vw]" /> {initialData._id ? "Update Registration" : "Register Inward"}
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const { canWrite, canUpdate, canDelete } = useModulePermissions("prodNC");
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
    if (dateFrom) {
      filtered = filtered.filter(row => {
        const d = (row.date || "").slice(0, 10);
        return d >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter(row => {
        const d = (row.date || "").slice(0, 10);
        return d <= dateTo;
      });
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        (row.refNoInternal || "").toLowerCase().includes(s) ||
        (row.jobOrderNo || "").toLowerCase().includes(s) ||
        (row.customerName || "").toLowerCase().includes(s) ||
        (row.customerCode || "").toLowerCase().includes(s) ||
        (row.products || []).some(p => (p.productDescription || "").toLowerCase().includes(s) || (p.productCode || "").toLowerCase().includes(s) || (p.serialNumber || "").toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [data, searchTerm, activeFilter, employeeFilter, dateFrom, dateTo]);

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
      canWrite={canWrite && !isSupervisor}
      canUpdate={canUpdate && !isSupervisor}
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
      <div className="w-full h-full font-sans text-[0.85vw] flex flex-col flex-1 min-h-0 overflow-hidden">
        <AnimatePresence>{reportsRow && <ReportsModal row={reportsRow} onClose={() => setReportsRow(null)} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0">
          {/* ── 1. Top Level Scoping Toolbar: Pill Search, Date Range, Clear & Actions ── */}
          <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-[0.7vw] shrink-0">
            {/* Soft Pill Search Box */}
            <div className="relative w-[20vw]">
              <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
              <input
                type="text"
                placeholder="Search by ref, JO, customer, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.76vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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

            {/* Right cluster: Date Range, Clear, Bulk Delete, Master Data & New Registration */}
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

              {/* Bulk Delete */}
              <AnimatePresence>
                {selectedItems.size > 0 && canDelete && !isSupervisor && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-[0.35vw] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 px-[0.85vw] h-[2.2vw] rounded-full font-semibold text-[0.74vw] transition-all cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                    Delete ({selectedItems.size})
                  </motion.button>
                )}
              </AnimatePresence>

              {canWrite && !isSupervisor && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMasterData(true)}
                    className="cursor-pointer flex items-center gap-[0.4vw] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-400 font-semibold px-[0.9vw] h-[2.2vw] rounded-full text-[0.74vw] transition-all shadow-2xs"
                  >
                    <ClipboardList className="w-[0.8vw] h-[0.8vw] text-slate-500" />
                    <span>Master Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("form")}
                    className="cursor-pointer flex items-center gap-[0.35vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold px-[1.1vw] h-[2.2vw] rounded-full text-[0.74vw] transition-all shadow-2xs active:scale-95"
                  >
                    <Plus className="w-[0.9vw] h-[0.9vw] text-white" />
                    <span>New Registration</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Table Card with Integrated Header Bar & Filter Tabs ── */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
            {/* Integrated Header: Segment Track on left, Result count on right */}
            <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
              <div className="inline-flex items-center p-[0.2vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.15vw] max-w-full overflow-x-auto">
                {[
                  { label: "All", dot: "bg-blue-600" },
                  { label: "Pending", dot: "bg-amber-500" },
                  { label: "Rejected", dot: "bg-slate-400" },
                  { label: "Completed", dot: "bg-emerald-600" }
                ].map(({ label, dot }) => {
                  const isActive = activeFilter === label;
                  const count = counts[label] ?? 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveFilter(label)}
                      className={`flex items-center gap-[0.4vw] px-[0.72vw] py-[0.28vw] rounded-full text-[0.75vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
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
                <span>entries</span>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider">
                  <tr>
                    {canDelete && !isSupervisor && (
                      <th rowSpan={2} className="py-[0.6vw] px-[0.6vw] border-b border-r border-slate-300 text-center align-middle w-[3%] bg-[#E9EDF7] sticky top-0 left-0 z-50">
                        <button onClick={toggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                          {isPageSelected ? <CheckCircle className="w-[1vw] h-[1vw] text-blue-600" /> : <div className="w-[0.9vw] h-[0.9vw] border border-slate-400 rounded"></div>}
                        </button>
                      </th>
                    )}
                    {["S.No", "Date", "Job Order No", "Customer", "Cus Code", "Category"].map(h => {
                      const minW = h === "Customer" ? "170px" : (h === "Job Order No" ? "130px" : "75px");
                      return (
                        <th key={h} rowSpan={2} style={{ minWidth: minW }} className="px-[0.6vw] py-[0.5vw] font-bold text-slate-700 text-center border-b border-r border-slate-300 whitespace-nowrap text-[0.74vw] align-middle bg-[#E9EDF7] sticky top-0 z-20">{h}</th>
                      );
                    })}
                    <th colSpan={12} className="px-[0.6vw] py-[0.4vw] font-bold text-slate-700 border-b border-r border-slate-300 text-center text-[0.74vw] bg-[#dfe6f5] sticky top-0 z-40">Product Manifest Details</th>
                    <th rowSpan={2} className="px-[0.7vw] py-[0.5vw] font-bold text-slate-700 text-center border-b border-l border-slate-300 whitespace-nowrap text-[0.74vw] align-middle bg-[#E9EDF7] sticky right-0 top-0 z-50 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">Actions</th>
                  </tr>
                  <tr>
                    {["Item Code", "Description", "NC Type", "Stage", "Qty", "Serial/Batch", "Assigned To", "Verified By", "Verified Date", "CAE", "Final Status", "Final Remarks"].map((h) => {
                      const minW = h === "Description" ? "200px" : (h === "Final Remarks" ? "160px" : (h === "Qty" ? "70px" : (h === "Verified By" ? "120px" : (h === "Verified Date" ? "100px" : (h === "CAE" ? "140px" : "100px")))));
                      return (
                        <th key={h} style={{ minWidth: minW }} className="px-[0.6vw] py-[0.4vw] font-semibold text-slate-600 border-b border-r border-slate-300 whitespace-nowrap text-[0.7vw] bg-[#E9EDF7] text-center">{h}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedData.length > 0 ? (
                    paginatedData.flatMap((row, i) => {
                      const isSelected = selectedItems.has(row.id);
                      const products = row.products || [];
                      const span = products.length;
                      return products.map((prod, pi) => {
                        const isTechCompleted = prod.report?.status === "Completed";
                        const isVerified = !!prod.report?.verifiedBy;
                        const showReadyHighlight = isTechCompleted && !isVerified;
                        const bgClass = isSelected ? "bg-blue-50/70" : showReadyHighlight ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/70";
                        const cellBg = isSelected ? "bg-blue-50/70" : "bg-white";
                        
                        return (
                          <tr 
                            key={`${row.id}-${pi}`} 
                            className={`transition-colors ${bgClass}`}
                          >
                          {pi === 0 && (
                            <>
                              {canDelete && !isSupervisor && (
                                <td rowSpan={span} className={`p-[0.7vw] border-r border-b border-slate-300 text-center align-middle ${cellBg}`}>
                                  <button onClick={() => toggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                                    {isSelected ? <CheckCircle className="w-[1vw] h-[1vw] text-blue-600" /> : <div className="w-[0.9vw] h-[0.9vw] border border-slate-400 rounded hover:border-blue-500"></div>}
                                  </button>
                                </td>
                              )}
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-bold text-slate-800 text-[0.76vw] ${cellBg}`}>{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-medium text-slate-700 text-[0.76vw] whitespace-nowrap ${cellBg}`}>{fmtDate(row.date)}</td>
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center text-[0.76vw] font-mono font-bold text-blue-600 ${cellBg}`}>{row.jobOrderNo || "—"}</td>
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-medium text-slate-800 text-[0.76vw] ${cellBg}`}>{row.customerName || "—"}</td>
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle font-mono text-slate-600 text-[0.72vw] ${cellBg}`}>{row.customerCode || "—"}</td>
                              <td rowSpan={span} className={`px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle ${cellBg}`}>
                                <span className="text-[0.68vw] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-[0.5vw] py-[0.1vw] rounded-full whitespace-nowrap">{row.category || "—"}</span>
                              </td>
                            </>
                          )}
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle">
                            {showReadyHighlight && (
                              <div className="flex items-center justify-center gap-[0.3vw] mb-[0.2vw]">
                                <div className="h-[0.4vw] w-[0.4vw] rounded-full bg-emerald-500 shadow-xs" />
                                <span className="text-[0.6vw] font-medium text-emerald-700 whitespace-nowrap">Completed</span>
                              </div>
                            )}
                            <div className="font-mono text-slate-700 text-[0.72vw]">{prod.productCode || "—"}</div>
                          </td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-left font-normal text-slate-800 text-[0.74vw] truncate max-w-[12vw]" title={prod.productDescription}>{prod.productDescription || "—"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle">
                            <span className={`text-[0.66vw] font-medium px-[0.45vw] py-[0.1vw] rounded-full border ${prod.ncType === "External" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                              {prod.ncType || "Internal"}
                            </span>
                          </td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle"><span className="text-[0.72vw] font-medium text-slate-700">{prod.stage || "Assembly"}</span></td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 text-center align-middle font-medium text-slate-800 text-[0.74vw]">{prod.qty || "1"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-mono text-slate-700 text-[0.72vw]">{prod.serialNumber || "—"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-medium text-slate-700 text-[0.74vw]">{prod.assignedToName || "Unassigned"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-semibold text-emerald-700 text-[0.74vw]">{prod.report?.verifiedByName || "—"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-medium text-slate-600 text-[0.72vw]">{fmtDate(prod.report?.verifiedDate)}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-semibold text-blue-600 text-[0.74vw] truncate max-w-[10vw]" title={prod.report?.cae}>{prod.report?.cae || "—"}</td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center">
                            <FinalStatusCell row={row} prod={prod} onUpdateProduct={onUpdateProduct} isSupervisor={isSupervisor} />
                          </td>
                          <td className="px-[0.7vw] py-[0.6vw] border-r border-b border-slate-300 align-middle text-center font-normal text-slate-600 text-[0.72vw] truncate max-w-[10vw]" title={prod.finalStatusRemarks}>{prod.finalStatusRemarks || "—"}</td>
                          <td className={`px-[0.7vw] py-[0.6vw] text-center align-middle border-l border-b border-slate-300 sticky right-0 z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] ${isSelected ? "bg-blue-50/70" : "bg-white"}`}>
                            <div className="flex items-center justify-center gap-[0.4vw]">
                              <button
                                onClick={() => setReportsRow(row)}
                                className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                title="View Report"
                              >
                                <Eye className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                              
                              <button
                                onClick={() => setShowVerify({ row, prod })}
                                className={`p-[0.35vw] rounded-full transition-all cursor-pointer ${prod.report?.verifiedBy ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"}`}
                                title={prod.report?.verifiedBy ? "Update Verification" : "Verify Resolution"}
                              >
                                <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
                              </button>

                              {canUpdate && !isSupervisor && pi === 0 && (
                                <button
                                  onClick={() => { setSelectedRow(row); setView("form"); }}
                                  className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                  title="Edit Registration"
                                >
                                  <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      });
                    })
                  ) : (
                    <tr><td colSpan={20} className="py-[6vw] text-center text-slate-400 text-[0.85vw] font-medium">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-slate-200 px-[1vw] py-[0.55vw] bg-slate-50/70 flex justify-between items-center rounded-b-[0.8vw] shrink-0">
              <div className="text-[0.74vw] font-medium text-slate-500">
                Showing <strong className="text-slate-800">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</strong> of <strong className="text-slate-800">{filteredData.length}</strong> entries
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
          </div>
        </motion.div>
      </div>
    </>
  );
}