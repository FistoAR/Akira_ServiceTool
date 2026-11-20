// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Trash2, Save, ArrowLeft, Plus, User, Package, ChevronDown,
  ChevronUp, Eye, Target, ClipboardList, Edit3, Clock, History, FileText, AlertCircle, CheckCircle, Wrench,
  Calendar, RotateCcw, UserPlus, PlusCircle, MinusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import ProductionEditableProductTable from "./ProductionEditableProductTable";
import useModulePermissions from "../../components/useModulePermissions";
import CustomDropdown from "../../components/CustomDropdown";
import AutocompleteInput from "../../components/AutocompleteInput";

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
  Pending: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/60",
  Rejected: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60",
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

const emptyProduct = () => {
  let defaultInspectedBy = "";
  let defaultInspectedByName = "";
  let defaultDept = "";
  let defaultZone = "";
  try {
    const raw = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || localStorage.getItem("user") || "{}";
    const u = JSON.parse(raw);
    defaultInspectedBy = u.userId || u._id || "";
    defaultInspectedByName = u.name || "";
    defaultDept = u.department || "";
    defaultZone = u.zone || "";
  } catch (e) {}

  return {
    _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productCode: "", productDescription: "", category: "", boardType: "", productType: "", productSegment: "", problemType: "", ncType: "Internal", problem: "", problemDescription: "",
    repeatability: "0", delayTime: "", designators: "", boardImage: "",
    qty: "1", stage: defaultZone || DEFAULT_STAGE_OPTIONS[0],
    department: defaultDept, zone: defaultZone,
    serialNumber: "", identification: "", inspectedBy: defaultInspectedBy, inspectedByName: defaultInspectedByName,
    assignedTo: defaultInspectedBy, assignedToName: defaultInspectedByName,
    assembledBy: "", assembledByName: "", testedBy: "", testedByName: "", fiBy: "", fiByName: "",
    disposition: DEFAULT_DISPOSITION_OPTIONS[0], raisedTo: defaultInspectedBy, raisedToName: defaultInspectedByName,
    report: null, finalStatus: "Pending", finalStatusRemarks: "", finalStatusDate: todayDateStr(), finalStatusHistory: []
  };
};

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
              <h3 className="text-[1.1vw] font-bold text-slate-800">Full Production Report</h3>
              <p className="text-[0.79vw] text-slate-500 font-medium">{row.refNoInternal} · {row.jobOrderNo || "No Job Order"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer transition-all hover:bg-slate-100 p-[0.35vw] rounded-full">
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[1.4vw] space-y-[1.2vw] bg-slate-50/40">
          <div className="grid grid-cols-3 gap-[1vw]">
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.75vw] uppercase font-medium text-slate-500 tracking-wider mb-[0.6vw]">Entry Details</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Date:</span> {fmtDate(row.date)}</div>
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Job Order:</span> <span className="text-blue-600 font-semibold">{row.jobOrderNo || "—"}</span></div>
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Products:</span> {products.length}</div>
              </div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.75vw] uppercase font-medium text-slate-500 tracking-wider mb-[0.6vw]">Customer</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Name:</span> <span className="font-medium text-slate-800">{row.customerName || "—"}</span></div>
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Code:</span> <span className="font-mono text-slate-600">{row.customerCode || "—"}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-[0.6vw] p-[1vw] border border-slate-200 shadow-2xs">
              <div className="text-[0.75vw] uppercase font-medium text-slate-500 tracking-wider mb-[0.6vw]">Audit Details</div>
              <div className="space-y-[0.4vw]">
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Created By:</span> {row.creatorName || "Admin"}</div>
                <div className="text-[0.81vw] text-slate-700"><span className="font-semibold text-slate-500">Last updated:</span> {fmtDate(row.updatedAt || row.createdAt)}</div>
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-[4vw] text-[0.9vw] text-slate-400">No product records available for this entry.</div>
          ) : products.map((prod, idx) => (
            <div key={prod._pid} className="border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs bg-white">
              <div
                onClick={() => toggleExpand(prod._pid)}
                className="bg-slate-50/80 px-[1.2vw] py-[0.8vw] flex items-center justify-between gap-[1vw] cursor-pointer hover:bg-slate-100/70 transition-colors border-b border-slate-200/80"
              >
                <div>
                  <div className="text-[0.93vw] font-semibold text-slate-800">{prod.productDescription || "Unnamed Product"}</div>
                  <div className="text-[0.77vw] text-slate-500 mt-[0.2vw] flex flex-wrap gap-[0.8vw]">
                    <span>JO: <span className="text-blue-600 font-medium">{row.jobOrderNo || "—"}</span></span>
                    <span>Code: <span className="font-mono text-slate-700">{prod.productCode || "—"}</span></span>
                    <span>Qty: <span className="font-medium text-slate-700">{prod.qty || "—"}</span></span>
                    <span>S/N: <span className="font-mono text-slate-700">{prod.serialNumber || "—"}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="text-[0.75vw] px-[0.6vw] py-[0.15vw] rounded-full bg-slate-200/70 text-slate-700 font-semibold">Item {idx + 1}</span>
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
                        <div className="text-[0.77vw] font-semibold text-slate-700 uppercase tracking-wider mb-[0.9vw] flex items-center gap-[0.45vw]">
                          <span className="w-[0.25vw] h-[0.85vw] bg-blue-600 rounded-full inline-block" />
                          <Target className="w-[0.9vw] h-[0.9vw] text-blue-600" /> Registration Information
                        </div>
                        <div className="grid grid-cols-6 gap-[1.2vw] mb-[0.9vw]">
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Stage</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.stage || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Category</div><div className="text-slate-800 font-medium text-[0.83vw]">{row.category || prod.category || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">NC Type</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.ncType || "Internal"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Problem Type</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.problemType || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Inspected By</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.inspectedByName || "—"}</div></div>
                          <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Designators</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.designators || "—"}</div></div>
                        </div>
                        <div className="flex gap-[1.2vw] mb-[0.9vw]">
                          <div className="flex-1">
                            <div className="text-[0.7vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Initial Problem Description</div>
                            <div className="text-[0.83vw] text-slate-800 leading-relaxed bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">{prod.problem || "No description provided."}</div>
                          </div>
                          {prod.boardImage && (
                            <div className="w-[10vw]">
                              <div className="text-[0.7vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Board Image</div>
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
                           <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Assembled By</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.report?.assembledByName || prod.assembledByName || "—"}</div></div>
                           <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Tested By</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.report?.testedByName || prod.testedByName || "—"}</div></div>
                        </div>
                      </div>

                      {/* Technical Resolution Report */}
                      <div className="p-[1.2vw] bg-slate-50/50">
                        <div className="text-[0.77vw] font-semibold text-slate-700 uppercase tracking-wider mb-[0.9vw] flex items-center gap-[0.45vw]">
                          <span className="w-[0.25vw] h-[0.85vw] bg-emerald-600 rounded-full inline-block" />
                          <Wrench className="w-[0.9vw] h-[0.9vw] text-emerald-600" /> Technical Resolution Report
                        </div>
                        {prod.report ? (
                          <div className="space-y-[1vw]">
                            <div className="grid grid-cols-4 gap-[1.2vw]">
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Start Date</div><div className="text-slate-800 font-medium text-[0.83vw]">{fmtDate(prod.report.startDate)}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">4M Category</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.report.fourMCategory || "—"}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">CAE</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.report.cae || "—"}</div></div>
                              <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Status</div><div className="text-blue-600 font-semibold text-[0.83vw]">{prod.report.status || "—"}</div></div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.7vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Root Cause Analysis</div>
                                <div className="text-[0.83vw] text-slate-800 leading-relaxed">{prod.report.rootCause || "—"}</div>
                              </div>
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.7vw] text-slate-500 font-semibold uppercase mb-[0.35vw]">Corrective Action Taken</div>
                                <div className="text-[0.83vw] text-slate-800 leading-relaxed">{prod.report.correctiveAction || "—"}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                              <div className="bg-white p-[0.8vw] rounded-[0.5vw] border border-slate-200">
                                <div className="text-[0.7vw] text-slate-500 font-semibold uppercase mb-[0.5vw]">Parts Replaced</div>
                                {prod.report && prod.report.partsReplacement && prod.report.partsReplacement.trim() ? (
                                  <ul className="list-disc list-inside space-y-[0.2vw]">
                                    {parseParts(prod.report.partsReplacement).map((part, pidx) => (
                                      <li key={pidx} className="text-[0.81vw] text-slate-800 leading-tight">{part}</li>
                                    ))}
                                  </ul>
                                ) : <div className="text-[0.81vw] text-slate-400 italic">No parts replaced.</div>}
                              </div>
                              <div className="grid grid-cols-2 gap-[0.8vw]">
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Closed Date</div><div className="text-slate-800 font-medium text-[0.83vw]">{fmtDate(prod.report.closedDate)}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Verified Date</div><div className="text-slate-800 font-medium text-[0.83vw]">{fmtDate(prod.report.verifiedDate)}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Verified By</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.report.verifiedByName || "—"}</div></div>
                                <div><div className="text-slate-500 mb-[0.2vw] uppercase text-[0.69vw] font-semibold">Disposition</div><div className="text-slate-800 font-medium text-[0.83vw]">{prod.disposition || "—"}</div></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-[0.8vw]">
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.63vw] font-medium text-slate-500 uppercase">Assembler</div><div className="text-[0.8vw] font-medium text-slate-800">{prod.report.assembledByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.63vw] font-medium text-slate-500 uppercase">Tester</div><div className="text-[0.8vw] font-medium text-slate-800">{prod.report.testedByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.63vw] font-medium text-slate-500 uppercase">FI By</div><div className="text-[0.8vw] font-medium text-slate-800">{prod.report.fiByName || "—"}</div></div>
                              <div className="bg-white p-[0.6vw] rounded-[0.4vw] border border-slate-200 text-center"><div className="text-[0.63vw] font-medium text-slate-500 uppercase">Final Status</div><div className="text-[0.8vw] font-semibold text-slate-800 uppercase">{prod.finalStatus || "Pending"}</div></div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-[2.5vw] text-center">
                            <Clock className="w-[1.8vw] h-[1.8vw] text-slate-300 mx-auto mb-[0.6vw]" />
                            <div className="text-[0.87vw] text-slate-400 font-medium">No technical report submitted yet.</div>
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
          <button onClick={onClose} className="px-[1.5vw] h-[2.2vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[0.81vw] font-semibold cursor-pointer transition-all">Close</button>
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
              <h3 className="text-[1.1vw] font-bold text-slate-800">Verify Resolution</h3>
              <p className="text-[0.77vw] text-slate-500 font-medium">Verify completion & CAE for this product</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="p-[1.4vw] space-y-[1.1vw] bg-white">
          <div className="bg-slate-50/70 p-[0.9vw] rounded-[0.6vw] border border-slate-200/80">
            <div className="text-[0.73vw] font-medium text-blue-600 uppercase tracking-wider mb-[0.35vw]">Product Context</div>
            <div className="text-[0.9vw] font-semibold text-slate-800">{prod.productDescription}</div>
            <div className="text-[0.77vw] text-slate-500 mt-[0.15vw]">
              <span className="font-semibold text-slate-600">S/N:</span> <span className="font-mono">{prod.serialNumber || "—"}</span> · <span className="font-semibold text-slate-600">JO:</span> <span className="text-blue-600 font-medium">{row.jobOrderNo || "—"}</span>
            </div>
          </div>

          <div className="space-y-[0.9vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.81vw] font-semibold text-slate-700">Verified By <span className="text-rose-500">*</span></label>
              <CustomDropdown
                value={formData.verifiedBy}
                onChange={val => {
                  const emp = employees.find(emp => (emp.userId || emp._id) === val);
                  setFormData(p => ({ ...p, verifiedBy: val, verifiedByName: emp?.name || "" }));
                }}
                options={employees.map(e => ({ value: e.userId || e._id, label: e.name }))}
                placeholder="Select Employee"
                usePortal={true}
                triggerClassName="!h-[2.3vw] !rounded-[0.5vw] text-[0.83vw] font-medium text-slate-800 border-slate-200 bg-white"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.81vw] font-semibold text-slate-700">Verified Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={formData.verifiedDate}
                onChange={e => setFormData(p => ({ ...p, verifiedDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-[0.5vw] py-[0.55vw] px-[0.75vw] text-[0.83vw] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw] relative">
              <label className="text-[0.81vw] font-semibold text-slate-700">CAE (Corrective Action Effectiveness)</label>
              <div className="relative">
                <input
                  value={formData.cae}
                  onChange={e => { setFormData(p => ({ ...p, cae: e.target.value })); setShowCaeSuggestions(true); }}
                  onFocus={() => setShowCaeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCaeSuggestions(false), 200)}
                  onKeyDown={onKeyDown}
                  placeholder="Enter or select CAE..."
                  className="w-full border border-slate-200 rounded-[0.5vw] py-[0.55vw] px-[0.75vw] text-[0.83vw] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-white transition-all"
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
                          className={`px-[0.9vw] py-[0.45vw] text-[0.83vw] font-medium transition-colors border-b border-slate-100 last:border-0 cursor-pointer ${selectedIndex === i ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
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
          <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] border border-slate-200 bg-white text-slate-700 font-semibold rounded-full text-[0.81vw] hover:bg-slate-50 cursor-pointer transition-all">Cancel</button>
          <button onClick={handleSave} className="px-[1.4vw] h-[2.2vw] bg-blue-600 text-white font-semibold rounded-full text-[0.81vw] hover:bg-blue-700 active:scale-95 transition-all shadow-xs">Save Verification</button>
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

  const [editingItem, setEditingItem] = useState(null); // { category, index, value }

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

  const saveEdit = () => {
    if (!editingItem) return;
    const val = editingItem.value.trim();
    if (!val) return;
    if (editingItem.category === "stages") {
      setStages(prev => prev.map((item, idx) => idx === editingItem.index ? val : item));
    } else if (editingItem.category === "dispositions") {
      setDispositions(prev => prev.map((item, idx) => idx === editingItem.index ? val : item));
    } else if (editingItem.category === "problems") {
      setProblemTypes(prev => prev.map((item, idx) => idx === editingItem.index ? val : item));
    } else if (editingItem.category === "products") {
      setProductTypes(prev => prev.map((item, idx) => idx === editingItem.index ? val : item));
    }
    setEditingItem(null);
  };

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
              <h3 className="text-[1.1vw] font-bold text-slate-800">Master Data Configuration</h3>
              <p className="text-[0.77vw] text-slate-500 font-medium">Manage system-wide production material categories</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer"><X className="w-[1.2vw] h-[1.2vw]" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex bg-slate-50/30 min-h-[46vh]">
          {/* Sidebar with distinctive background & active pill styling */}
          <div className="w-[15vw] border-r border-slate-200 flex flex-col bg-[#F3F6FA] p-[0.7vw] gap-[0.35vw]">
            <div className="px-[0.6vw] py-[0.3vw] mb-[0.2vw]">
              <span className="text-[0.73vw] font-medium uppercase tracking-wider text-slate-400">Categories</span>
            </div>
            {TABS.map(tab => {
              const isSelected = activeTab === tab.id;
              const count = tab.id === "stages" ? stages.length :
                            tab.id === "dispositions" ? dispositions.length :
                            tab.id === "problems" ? problemTypes.length : productTypes.length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between px-[0.85vw] py-[0.65vw] text-[0.83vw] rounded-[0.55vw] transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-white text-blue-700 shadow-sm border-[1.5px] border-slate-400 status-pills-track font-medium"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-[0.6vw]">
                    <tab.icon className={`w-[1vw] h-[1vw] ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  <span className={`text-[0.73vw] px-[0.45vw] py-[0.05vw] rounded-full font-medium ${
                    isSelected ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-200/70 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-[1.5vw] overflow-hidden bg-white flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              {activeTab === "stages" && (
                <motion.div key="stages" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-[1.2vw] flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="shrink-0">
                    <h4 className="text-[1vw] font-medium text-slate-800">Work Stages</h4>
                    <p className="text-[0.77vw] text-slate-500 font-medium">Configure workflow stages available during production and inspection</p>
                  </div>

                  <div className="flex gap-[0.6vw] bg-[#F8FAFC] p-[0.7vw] rounded-[0.7vw] border border-slate-200 shadow-2xs shrink-0">
                    <input 
                      value={newStage} 
                      onChange={e => setNewStage(e.target.value)} 
                      onKeyPress={e => e.key === 'Enter' && addStage()} 
                      placeholder="Enter new work stage name..." 
                      className="flex-1 border border-slate-200 rounded-full py-[0.45vw] px-[1vw] text-[0.83vw] outline-none focus:border-blue-500 bg-white shadow-2xs text-slate-700 font-medium placeholder:text-slate-400" 
                    />
                    <button 
                      onClick={addStage} 
                      className="bg-blue-600 text-white px-[1.2vw] h-[2.2vw] rounded-full text-[0.81vw] font-medium hover:bg-blue-700 shadow-xs active:scale-95 transition-all flex items-center gap-[0.35vw] cursor-pointer"
                    >
                      <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Stage
                    </button>
                  </div>

                  <div className="flex-1 border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs flex flex-col min-h-0">
                    <table className="w-full border-collapse table-fixed">
                      <thead className="bg-[#E9EDF7] shrink-0 border-b border-slate-300">
                        <tr className="text-slate-700 font-medium text-[0.77vw] uppercase tracking-wider">
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[4.5vw] border-r border-slate-300 font-medium">#</th>
                          <th className="py-[0.55vw] px-[0.9vw] text-left font-medium">Stage Name</th>
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[7vw] font-medium">Action</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="overflow-y-auto flex-1 min-h-0">
                      <table className="w-full border-collapse table-fixed">
                        <tbody className="divide-y divide-slate-100">
                          {stages.map((s, idx) => {
                            const isEditing = editingItem?.category === "stages" && editingItem?.index === idx;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-[0.5vw] px-[0.8vw] text-center font-mono text-[0.77vw] text-slate-400 border-r border-slate-100 font-medium w-[4.5vw]">
                                  {idx + 1}
                                </td>
                                <td className="py-[0.45vw] px-[0.9vw] text-[0.81vw] text-slate-800 font-medium">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingItem.value}
                                      onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); else if (e.key === 'Escape') setEditingItem(null); }}
                                      className="w-full border border-blue-400 rounded-[0.35vw] px-[0.5vw] py-[0.25vw] text-[0.81vw] font-medium outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                  ) : (
                                    s
                                  )}
                                </td>
                                <td className="py-[0.45vw] px-[0.8vw] text-center w-[7vw]">
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={saveEdit} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Save"
                                        >
                                          <Save className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingItem(null)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => setEditingItem({ category: "stages", index: idx, value: s })} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => removeStage(s)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "dispositions" && (
                <motion.div key="dispositions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-[1.2vw] flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="shrink-0">
                    <h4 className="text-[1vw] font-medium text-slate-800">Disposition Outcomes</h4>
                    <p className="text-[0.77vw] text-slate-500 font-medium">Configure disposition resolution statuses for rejected or verified items</p>
                  </div>

                  <div className="flex gap-[0.6vw] bg-[#F8FAFC] p-[0.7vw] rounded-[0.7vw] border border-slate-200 shadow-2xs shrink-0">
                    <input 
                      value={newDisposition} 
                      onChange={e => setNewDisposition(e.target.value)} 
                      onKeyPress={e => e.key === 'Enter' && addDisposition()} 
                      placeholder="Enter new disposition outcome..." 
                      className="flex-1 border border-slate-200 rounded-full py-[0.45vw] px-[1vw] text-[0.83vw] outline-none focus:border-blue-500 bg-white shadow-2xs text-slate-700 font-medium placeholder:text-slate-400" 
                    />
                    <button 
                      onClick={addDisposition} 
                      className="bg-emerald-600 text-white px-[1.2vw] h-[2.2vw] rounded-full text-[0.81vw] font-medium hover:bg-emerald-700 shadow-xs active:scale-95 transition-all flex items-center gap-[0.35vw] cursor-pointer"
                    >
                      <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Outcome
                    </button>
                  </div>

                  <div className="flex-1 border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs flex flex-col min-h-0">
                    <table className="w-full border-collapse table-fixed">
                      <thead className="bg-[#E9EDF7] shrink-0 border-b border-slate-300">
                        <tr className="text-slate-700 font-medium text-[0.77vw] uppercase tracking-wider">
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[4.5vw] border-r border-slate-300 font-medium">#</th>
                          <th className="py-[0.55vw] px-[0.9vw] text-left font-medium">Outcome Description</th>
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[7vw] font-medium">Action</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="overflow-y-auto flex-1 min-h-0">
                      <table className="w-full border-collapse table-fixed">
                        <tbody className="divide-y divide-slate-100">
                          {dispositions.map((d, idx) => {
                            const isEditing = editingItem?.category === "dispositions" && editingItem?.index === idx;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-[0.5vw] px-[0.8vw] text-center font-mono text-[0.77vw] text-slate-400 border-r border-slate-100 font-medium w-[4.5vw]">
                                  {idx + 1}
                                </td>
                                <td className="py-[0.45vw] px-[0.9vw] text-[0.81vw] text-slate-800 font-medium">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingItem.value}
                                      onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); else if (e.key === 'Escape') setEditingItem(null); }}
                                      className="w-full border border-blue-400 rounded-[0.35vw] px-[0.5vw] py-[0.25vw] text-[0.81vw] font-medium outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                  ) : (
                                    d
                                  )}
                                </td>
                                <td className="py-[0.45vw] px-[0.8vw] text-center w-[7vw]">
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={saveEdit} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Save"
                                        >
                                          <Save className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingItem(null)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => setEditingItem({ category: "dispositions", index: idx, value: d })} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => removeDisposition(d)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "problems" && (
                <motion.div key="problems" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-[1.2vw] flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="shrink-0">
                    <h4 className="text-[1vw] font-medium text-slate-800">Problem Types</h4>
                    <p className="text-[0.77vw] text-slate-500 font-medium">Categorize issue classifications identified on production boards</p>
                  </div>

                  <div className="flex gap-[0.6vw] bg-[#F8FAFC] p-[0.7vw] rounded-[0.7vw] border border-slate-200 shadow-2xs shrink-0">
                    <input 
                      value={newProblemType} 
                      onChange={e => setNewProblemType(e.target.value)} 
                      onKeyPress={e => e.key === 'Enter' && addProblemType()} 
                      placeholder="Enter new problem classification..." 
                      className="flex-1 border border-slate-200 rounded-full py-[0.45vw] px-[1vw] text-[0.83vw] outline-none focus:border-blue-500 bg-white shadow-2xs text-slate-700 font-medium placeholder:text-slate-400" 
                    />
                    <button 
                      onClick={addProblemType} 
                      className="bg-orange-600 text-white px-[1.2vw] h-[2.2vw] rounded-full text-[0.81vw] font-medium hover:bg-orange-700 shadow-xs active:scale-95 transition-all flex items-center gap-[0.35vw] cursor-pointer"
                    >
                      <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Type
                    </button>
                  </div>

                  <div className="flex-1 border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs flex flex-col min-h-0">
                    <table className="w-full border-collapse table-fixed">
                      <thead className="bg-[#E9EDF7] shrink-0 border-b border-slate-300">
                        <tr className="text-slate-700 font-medium text-[0.77vw] uppercase tracking-wider">
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[4.5vw] border-r border-slate-300 font-medium">#</th>
                          <th className="py-[0.55vw] px-[0.9vw] text-left font-medium">Problem Classification</th>
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[7vw] font-medium">Action</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="overflow-y-auto flex-1 min-h-0">
                      <table className="w-full border-collapse table-fixed">
                        <tbody className="divide-y divide-slate-100">
                          {problemTypes.map((p, idx) => {
                            const isEditing = editingItem?.category === "problems" && editingItem?.index === idx;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-[0.5vw] px-[0.8vw] text-center font-mono text-[0.77vw] text-slate-400 border-r border-slate-100 font-medium w-[4.5vw]">
                                  {idx + 1}
                                </td>
                                <td className="py-[0.45vw] px-[0.9vw] text-[0.81vw] text-slate-800 font-medium">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingItem.value}
                                      onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); else if (e.key === 'Escape') setEditingItem(null); }}
                                      className="w-full border border-blue-400 rounded-[0.35vw] px-[0.5vw] py-[0.25vw] text-[0.81vw] font-medium outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                  ) : (
                                    p
                                  )}
                                </td>
                                <td className="py-[0.45vw] px-[0.8vw] text-center w-[7vw]">
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={saveEdit} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Save"
                                        >
                                          <Save className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingItem(null)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => setEditingItem({ category: "problems", index: idx, value: p })} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => removeProblemType(p)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "products" && (
                <motion.div key="products" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-[1.2vw] flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="shrink-0">
                    <h4 className="text-[1vw] font-medium text-slate-800">Product Types</h4>
                    <p className="text-[0.77vw] text-slate-500 font-medium">Configure manufacturing assembly and board types</p>
                  </div>

                  <div className="flex gap-[0.6vw] bg-[#F8FAFC] p-[0.7vw] rounded-[0.7vw] border border-slate-200 shadow-2xs shrink-0">
                    <input 
                      value={newProductType} 
                      onChange={e => setNewProductType(e.target.value)} 
                      onKeyPress={e => e.key === 'Enter' && addProductType()} 
                      placeholder="Enter new product type..." 
                      className="flex-1 border border-slate-200 rounded-full py-[0.45vw] px-[1vw] text-[0.83vw] outline-none focus:border-blue-500 bg-white shadow-2xs text-slate-700 font-medium placeholder:text-slate-400" 
                    />
                    <button 
                      onClick={addProductType} 
                      className="bg-purple-600 text-white px-[1.2vw] h-[2.2vw] rounded-full text-[0.81vw] font-medium hover:bg-purple-700 shadow-xs active:scale-95 transition-all flex items-center gap-[0.35vw] cursor-pointer"
                    >
                      <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Product Type
                    </button>
                  </div>

                  <div className="flex-1 border border-slate-200 rounded-[0.6vw] overflow-hidden shadow-2xs flex flex-col min-h-0">
                    <table className="w-full border-collapse table-fixed">
                      <thead className="bg-[#E9EDF7] shrink-0 border-b border-slate-300">
                        <tr className="text-slate-700 font-medium text-[0.77vw] uppercase tracking-wider">
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[4.5vw] border-r border-slate-300 font-medium">#</th>
                          <th className="py-[0.55vw] px-[0.9vw] text-left font-medium">Product Type</th>
                          <th className="py-[0.55vw] px-[0.8vw] text-center w-[7vw] font-medium">Action</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="overflow-y-auto flex-1 min-h-0">
                      <table className="w-full border-collapse table-fixed">
                        <tbody className="divide-y divide-slate-100">
                          {productTypes.map((p, idx) => {
                            const isEditing = editingItem?.category === "products" && editingItem?.index === idx;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-[0.5vw] px-[0.8vw] text-center font-mono text-[0.77vw] text-slate-400 border-r border-slate-100 font-medium w-[4.5vw]">
                                  {idx + 1}
                                </td>
                                <td className="py-[0.45vw] px-[0.9vw] text-[0.81vw] text-slate-800 font-medium">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingItem.value}
                                      onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); else if (e.key === 'Escape') setEditingItem(null); }}
                                      className="w-full border border-blue-400 rounded-[0.35vw] px-[0.5vw] py-[0.25vw] text-[0.81vw] font-medium outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                  ) : (
                                    p
                                  )}
                                </td>
                                <td className="py-[0.45vw] px-[0.8vw] text-center w-[7vw]">
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={saveEdit} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Save"
                                        >
                                          <Save className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingItem(null)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => setEditingItem({ category: "products", index: idx, value: p })} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                        <button 
                                          onClick={() => removeProductType(p)} 
                                          className="w-[1.4vw] h-[1.4vw] rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-all cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-end gap-[0.6vw] p-[1vw] border-t border-slate-200 bg-slate-50/70 shrink-0 rounded-b-[0.9vw]">
          <button onClick={onClose} className="px-[1.2vw] h-[2.2vw] rounded-full border border-slate-200 text-[0.81vw] text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer">Cancel</button>
          <button onClick={() => onSave(stages, dispositions, problemTypes, productTypes)} className="px-[1.4vw] h-[2.2vw] rounded-full bg-blue-600 text-white text-[0.81vw] font-semibold hover:bg-blue-700 shadow-xs transition-all active:scale-95 cursor-pointer">Save Master Data</button>
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
        <span className={`text-[0.75vw] font-bold truncate max-w-[6vw] ${val ? "text-black" : "text-gray-400"}`}>{selected ? selected.name : "Assign"}</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full left-0 mt-[0.2vw] bg-white border border-slate-300 shadow-xl rounded-[0.4vw] w-[14vw] max-h-[12vw] overflow-y-auto z-[200] py-[0.2vw]">
            {employees.map(u => (
              <div key={u.userId} onClick={() => { onSelect(u); setOpen(false); }} className="px-[0.6vw] py-[0.4vw] flex items-center gap-[0.5vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0"><div className="text-[0.75vw] font-bold text-black truncate">{u.name}</div><div className="text-[0.6vw] text-gray-400 font-bold truncate">{u.department}</div></div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- HistoryCellButton (Full Status & Edit History Modal like ServiceMaterial) ---
const HistoryCellButton = ({ prod, row }) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowHistory(true)}
        title="View History"
        className="px-[0.6vw] py-[0.2vw] text-[0.75vw] font-semibold text-[#1a73e8] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-[0.35vw] transition-all cursor-pointer shadow-2xs active:scale-95"
      >
        View
      </button>

      {showHistory &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-[2vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[1vw] shadow-2xl border border-slate-200 w-[42vw] max-w-[650px] min-w-[360px] max-h-[85vh] flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-[1.4vw] py-[1.1vw] border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-[1.1vw] font-bold text-slate-800 flex items-center gap-[0.45vw]">
                    <Clock className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
                    Status & Edit History
                  </h3>
                  <p className="text-[0.79vw] text-slate-600 font-medium mt-[0.15vw]">
                    {prod.productDescription || "Product"} (
                    <span className="font-mono font-medium text-slate-800">{prod.serialNumber || prod.identification || "—"}</span>)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-[0.4vw] rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-[1.1vw] h-[1.1vw]" />
                </button>
              </div>

              {/* Timeline Area */}
              <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.2vw] bg-[#f8fafd]">
                {(() => {
                  const empHistory = prod.report?.history || [];
                  const finalHistory = prod.finalStatusHistory || [];
                  const timeline = [];

                  if (prod.assignedTo || prod.raisedTo) {
                    timeline.push({
                      type: "assigned",
                      label: "Assigned / Raised To",
                      name: prod.assignedToName || prod.raisedToName || prod.assignedTo || prod.raisedTo,
                      timestamp: empHistory.length > 0 ? empHistory[0].timestamp : null,
                    });
                  }

                  // Employee report status changes & edits
                  empHistory.forEach((h) => {
                    const isEdit = h.metadata?.isEdit || String(h.status || "").toLowerCase().includes("edit");
                    timeline.push({
                      type: isEdit ? "closureEdit" : "report",
                      status: h.status || "Report Updated",
                      remark: h.remark || h.currentRemark || "",
                      diffs: h.metadata?.diffs || [],
                      timestamp: h.timestamp,
                    });
                  });

                  // Inward-level edits that modified this product
                  if (row?.editHistory && Array.isArray(row.editHistory)) {
                    row.editHistory.forEach((ie) => {
                      const relevantDiffs = (ie.diffs || []).filter((d) => {
                        const f = d.field || "";
                        const prodDesc = prod.productDescription || "";
                        const prodCode = prod.productCode || "";
                        const serial = prod.serialNumber || prod.identification || "";
                        return (
                          (prodDesc && f.includes(prodDesc)) ||
                          (prodCode && f.includes(prodCode)) ||
                          (serial && f.includes(serial)) ||
                          (!f.includes("Product (") && !f.includes("Product 1") && !f.includes("Product 2") && !f.includes("Product 3") && !f.includes("Product 4") && !f.includes("Product 5") && !f.includes("Product 6") && !f.includes("Product 7"))
                        );
                      });
                      if (relevantDiffs.length > 0) {
                        timeline.push({
                          type: "adminEdit",
                          status: "Product Details Edited",
                          remark: ie.reason || "Inward product record updated",
                          adminName: ie.editedByName,
                          role: ie.role || "Admin",
                          diffs: relevantDiffs,
                          timestamp: ie.editedAt,
                        });
                      }
                    });
                  }

                  // Verification events
                  if (prod.report?.verifiedBy || prod.report?.verifiedByName) {
                    timeline.push({
                      type: "verification",
                      status: "Resolution Verified",
                      adminName: prod.report?.verifiedByName,
                      remark: prod.report?.cae ? `CAE: ${prod.report.cae}` : "Verified",
                      timestamp: prod.report?.verifiedDate,
                    });
                  }

                  // Admin review changes (final status entries)
                  finalHistory.forEach((h) => {
                    const isCompleted = h.status === "Completed";
                    timeline.push({
                      type: "admin",
                      status: isCompleted ? "Approved by Admin" : (h.status || "Admin Status Update"),
                      adminName: h.adminName,
                      remark: h.remarks,
                      timestamp: h.timestamp || h.date,
                    });
                  });

                  // Sort chronologically (newest first)
                  timeline.sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tB - tA;
                  });

                  if (timeline.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-[2.5vw] text-slate-700">
                        <Clock className="w-[1.8vw] h-[1.8vw] mb-[0.5vw] text-slate-400" />
                        <span className="text-[0.87vw] font-semibold text-slate-800">
                          Not yet updated or assigned.
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-[1.8vw] space-y-[0.85vw]">
                      <div className="absolute left-[0.6vw] -translate-x-1/2 top-[0.5vw] bottom-[0.5vw] w-[2px] bg-slate-200 pointer-events-none" />

                      {timeline.map((entry, i) => {
                        let dotColor = "bg-slate-500";
                        if (entry.type === "assigned") {
                          dotColor = "bg-blue-600";
                        } else if (entry.type === "verification") {
                          dotColor = "bg-emerald-600";
                        } else if (entry.type === "admin" || entry.type === "adminEdit") {
                          dotColor = entry.status.includes("Approved")
                            ? "bg-emerald-600"
                            : entry.type === "adminEdit"
                              ? "bg-indigo-600"
                              : "bg-rose-600";
                        } else if (entry.type === "closureEdit") {
                          dotColor = "bg-amber-600";
                        }

                        const tsLabel = entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : null;

                        return (
                          <div key={i} className="relative group">
                            <div
                              className={`absolute -left-[1.8vw] top-[0.6vw] w-[0.55vw] h-[0.55vw] rounded-full ${dotColor} ring-4 ring-white shadow-2xs z-10 -translate-x-1/2`}
                            />

                            <div className="py-[0.5vw] border-b border-slate-200/80 last:border-b-0">
                              <div className="flex items-center justify-between gap-[0.5vw] flex-wrap">
                                {entry.type === "assigned" ? (
                                  <span className="text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border bg-blue-50 text-blue-700 border-blue-200">
                                    {entry.label} → {entry.name}
                                  </span>
                                ) : entry.type === "verification" ? (
                                  <div className="flex items-center gap-[0.3vw] flex-wrap">
                                    <span className="text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      {entry.status}
                                    </span>
                                    {entry.adminName && (
                                      <span className="text-[0.73vw] px-[0.4vw] py-[0.05vw] bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                                        Verified By: {entry.adminName}
                                      </span>
                                    )}
                                  </div>
                                ) : entry.type === "admin" ? (
                                  <div className="flex items-center gap-[0.3vw] flex-wrap">
                                    <span
                                      className={`text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border ${
                                        entry.status.includes("Approved")
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border-rose-200"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                    {entry.adminName && (
                                      <span className="text-[0.73vw] px-[0.4vw] py-[0.05vw] bg-indigo-50 text-indigo-800 rounded border border-indigo-200 font-medium">
                                        Admin: {entry.adminName}
                                      </span>
                                    )}
                                  </div>
                                ) : entry.type === "adminEdit" ? (
                                  <div className="flex items-center gap-[0.3vw] flex-wrap">
                                    <span className="text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                                      {entry.status}
                                    </span>
                                    {entry.adminName && (
                                      <span className="text-[0.73vw] px-[0.4vw] py-[0.05vw] bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                                        By: {entry.adminName}
                                      </span>
                                    )}
                                  </div>
                                ) : entry.type === "closureEdit" ? (
                                  <div className="flex items-center gap-[0.3vw] flex-wrap">
                                    <span className="text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-300">
                                      {entry.status}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-[0.3vw] flex-wrap">
                                    <span
                                      className={`text-[0.77vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border ${
                                        entry.status === "Completed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : entry.status === "Under Testing"
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </div>
                                )}

                                {tsLabel && (
                                  <span className="text-[0.73vw] text-slate-500 font-mono font-medium whitespace-nowrap">
                                    {tsLabel}
                                  </span>
                                )}
                              </div>

                              {entry.remark && (
                                <div className="mt-[0.35vw] text-[0.81vw] text-slate-700 leading-relaxed font-medium">
                                  <span className="text-slate-500 font-medium mr-[0.3vw]">
                                    Remarks / Reason:
                                  </span>
                                  {entry.remark}
                                </div>
                              )}

                              {/* Diffs display for edits */}
                              {entry.diffs && entry.diffs.length > 0 && (
                                <div className="mt-[0.5vw] bg-purple-50/30 rounded-[0.4vw] border border-purple-200/60 p-[0.45vw] space-y-[0.35vw]">
                                  <div className="flex items-center justify-between text-[0.77vw]">
                                    <span className="font-semibold text-purple-800 flex items-center gap-[0.35vw]">
                                      <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-purple-500" />
                                      Changed Fields ({entry.diffs.length})
                                    </span>
                                  </div>

                                  <div className="space-y-[0.3vw] pt-[0.2vw]">
                                    {entry.diffs.map((d, di) => (
                                      <div
                                        key={di}
                                        className="text-[0.79vw] bg-white rounded-[0.3vw] p-[0.4vw] border border-slate-200"
                                      >
                                        <div className="font-medium text-slate-700 text-[0.75vw] mb-[0.2vw]">
                                          {d.field}
                                        </div>
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[0.45vw]">
                                          <div className="bg-rose-50/40 rounded-[0.25vw] px-[0.4vw] py-[0.25vw] border border-rose-200/80">
                                            <div className="text-[0.65vw] font-semibold text-rose-600 uppercase tracking-wider mb-[0.05vw]">
                                              Previous
                                            </div>
                                            <div className="text-rose-700 font-medium text-[0.77vw] break-words">
                                              {String(d.originalValue || "—")}
                                            </div>
                                          </div>
                                          <div className="text-slate-400 font-medium text-[0.8vw] px-[0.1vw]">
                                            →
                                          </div>
                                          <div className="bg-emerald-50/40 rounded-[0.25vw] px-[0.4vw] py-[0.25vw] border border-emerald-200/80">
                                            <div className="text-[0.65vw] font-semibold text-emerald-700 uppercase tracking-wider mb-[0.05vw]">
                                              Updated
                                            </div>
                                            <div className="text-emerald-900 font-medium text-[0.77vw] break-words">
                                              {String(d.editedValue || "—")}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="px-[1.3vw] h-[2vw] text-[0.79vw] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// --- Final Status Cell ---
const FinalStatusCell = ({ row, prod, onUpdateProduct, isSupervisor }) => {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState(prod.finalStatusRemarks || "");
  const [status, setStatus] = useState(prod.finalStatus || "Pending");
  const [statusDate, setStatusDate] = useState(prod.finalStatusDate || todayDateStr());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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
    <div className="flex items-center justify-center gap-[0.35vw]">
      <div className="relative" ref={ref}>
        <button 
          onClick={() => !isSupervisor && setOpen(!open)} 
          className={`text-[0.73vw] px-[0.55vw] py-[0.18vw] rounded-full border font-medium flex items-center gap-[0.3vw] transition-all shadow-2xs ${cls} ${isSupervisor ? "cursor-default" : "cursor-pointer"}`}
        >
          <span>{status}</span>
          {!isSupervisor && <ChevronDown className="w-[0.65vw] h-[0.65vw] opacity-70" />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-[0.3vw] bg-white border border-slate-200 shadow-xl rounded-[0.7vw] z-40 w-[17vw] p-[0.9vw] text-left">
              <div className="text-[0.79vw] font-semibold text-slate-800 mb-[0.5vw]">Update Final Status</div>
              <div className="grid grid-cols-3 gap-[0.35vw] mb-[0.7vw]">
                {FINAL_STATUS_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setStatus(opt)} className={`py-[0.32vw] rounded-full border text-[0.71vw] font-medium cursor-pointer transition-all ${status === opt ? FINAL_STATUS_COLORS[opt] + " ring-2 ring-offset-1 ring-blue-300 font-medium" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mb-[0.6vw]"><label className="text-[0.7vw] font-semibold text-slate-700 block mb-[0.25vw]">Status Date</label><input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} className="w-full border border-slate-200 rounded-[0.4vw] px-[0.5vw] py-[0.35vw] text-[0.77vw] outline-none focus:border-blue-500 font-medium text-slate-700" /></div>
              <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks…" className="w-full border border-slate-200 rounded-[0.4vw] p-[0.5vw] text-[0.77vw] outline-none focus:border-blue-500 resize-none mb-[0.6vw] font-medium text-slate-700" />
              <div className="flex justify-end gap-[0.4vw]"><button onClick={() => setOpen(false)} className="px-[0.85vw] py-[0.3vw] text-[0.75vw] border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 font-medium cursor-pointer">Cancel</button><button onClick={handleSave} className="px-[0.9vw] py-[0.3vw] text-[0.75vw] bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium flex items-center gap-[0.3vw] shadow-2xs cursor-pointer"><Save className="w-[0.7vw] h-[0.7vw]" />Save</button></div>
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
  const [employeesList, setEmployeesList] = useState(employees || []);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setEmployeesList(employees);
    } else {
      axios.get(`${API_URL}/auth/employees`).then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setEmployeesList(res.data);
        }
      }).catch(err => console.error("Employee fetch fallback failed:", err));
    }
  }, [employees]);

  const isReadOnly = !!initialData._readonly;

  const [customerDb, setCustomerDb] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [custSelectedIndex, setCustSelectedIndex] = useState(-1);
  const custRef = useRef(null);
  const [partyTypes, setPartyTypes] = useState([]);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyType: "OEM",
    partyDescription: "",
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, boardRes, ptRes] = await Promise.all([
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/board-types`),
          axios.get(`${API_URL}/master/party-types`).catch(() => ({ data: [] }))
        ]);
        setCustomerDb(custRes.data);
        setBoardTypes(boardRes.data);
        if (ptRes?.data?.length > 0) {
          setPartyTypes(ptRes.data);
          setNewCustomer(prev => ({ ...prev, partyType: ptRes.data[0].name || "OEM" }));
        }
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

  const uniqueStates = useMemo(
    () => Array.from(new Set(customerDbFlat.map((c) => c.state).filter(Boolean))),
    [customerDbFlat],
  );
  const uniqueDistricts = useMemo(
    () => Array.from(new Set(customerDbFlat.map((c) => c.districtCity).filter(Boolean))),
    [customerDbFlat],
  );
  const uniqueSegments = useMemo(
    () => Array.from(new Set(customerDbFlat.map((c) => c.productSegment).filter(Boolean))),
    [customerDbFlat],
  );

  const uniquePartyCodes = useMemo(() => {
    const seen = new Set();
    const result = [];
    customerDbFlat.forEach((item) => {
      if (item.partyCode && !seen.has(item.partyCode)) {
        seen.add(item.partyCode);
        result.push(item.partyCode);
      }
    });
    return result.sort();
  }, [customerDbFlat]);

  const uniquePartyDescriptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    customerDbFlat.forEach((item) => {
      if (item.partyDescription && !seen.has(item.partyDescription)) {
        seen.add(item.partyDescription);
        result.push(item.partyDescription);
      }
    });
    return result.sort();
  }, [customerDbFlat]);

  const uniqueItemDescriptions = useMemo(() => {
    const s = new Set();
    customerDbFlat.forEach((item) => {
      if (item.itemDescription) s.add(item.itemDescription);
    });
    return Array.from(s).sort();
  }, [customerDbFlat]);

  const addModalDistricts = useMemo(() => {
    const d = new Set();
    customerDbFlat.forEach((item) => {
      if (item.districtCity && (!newCustomer.state || item.state === newCustomer.state)) {
        d.add(item.districtCity);
      }
    });
    return Array.from(d).sort();
  }, [customerDbFlat, newCustomer.state]);

  const partyLookupByCode = useMemo(() => {
    const map = {};
    customerDbFlat.forEach((row) => {
      if (!map[row.partyCode]) {
        map[row.partyCode] = {
          partyCode: row.partyCode,
          partyDescription: row.partyDescription,
          partyType: row.partyType,
          state: row.state,
          districtCity: row.districtCity,
          items: [],
        };
      }
      if (row.itemCode) {
        map[row.partyCode].items.push({
          productSegment: row.productSegment || "",
          itemCode: row.itemCode || "",
          itemDescription: row.itemDescription || "",
          warrantyPeriodDays: String(row.warrantyPeriodDays ?? ""),
        });
      }
    });
    return map;
  }, [customerDbFlat]);

  const partyLookupByDesc = useMemo(() => {
    const map = {};
    customerDbFlat.forEach((row) => {
      if (row.partyDescription && !map[row.partyDescription]) {
        map[row.partyDescription] = row.partyCode;
      }
    });
    return map;
  }, [customerDbFlat]);

  const handleAddPartyCodeChange = (val) => {
    setNewCustomer((prev) => {
      const party = partyLookupByCode[val];
      if (party) {
        return {
          ...prev,
          partyCode: val,
          partyDescription: party.partyDescription,
          partyType: party.partyType,
          state: party.state || "",
          districtCity: party.districtCity || "",
          items: party.items.length > 0
            ? [
                ...party.items.map((it) => ({ ...it, _existing: true })),
                { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false },
              ]
            : [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false }],
        };
      }
      return { ...prev, partyCode: val };
    });
  };

  const handleAddPartyDescChange = (val) => {
    setNewCustomer((prev) => {
      const code = partyLookupByDesc[val];
      if (code) {
        const party = partyLookupByCode[code];
        if (party) {
          return {
            ...prev,
            partyDescription: val,
            partyCode: party.partyCode,
            partyType: party.partyType,
            state: party.state || "",
            districtCity: party.districtCity || "",
            items: party.items.length > 0
              ? [
                  ...party.items.map((it) => ({ ...it, _existing: true })),
                  { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false },
                ]
              : [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false }],
          };
        }
      }
      return { ...prev, partyDescription: val };
    });
  };

  const handleAddCustItemRow = () => {
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
  };

  const handleRemoveCustItemRow = (idx) => {
    if (newCustomer.items.length === 1) return;
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.filter((_, i) => i !== idx),
    });
  };

  const handleCustItemChange = (idx, field, val) => {
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    const cleanStr = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const partyDesc = (newCustomer.partyDescription || "").trim();
    if (!partyDesc) {
      toast("Party Description (Company Name) is required!", "warning");
      return;
    }

    let finalPartyCode = (newCustomer.partyCode || "").trim();
    if (!finalPartyCode) {
      const existingNums = customerDbFlat
        .map((c) => {
          const m = String(c.partyCode || "").match(/CUS-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      finalPartyCode = `CUS-${String(nextNum).padStart(3, "0")}`;
    }

    const itemsToSave = (newCustomer.items || []).filter(
      (it) => it.itemCode?.trim() || it.itemDescription?.trim() || it.productSegment?.trim(),
    );

    const dups = itemsToSave.filter((ni) =>
      ni.itemCode?.trim() &&
      customerDbFlat.some((d) => cleanStr(d.itemCode) === cleanStr(ni.itemCode)),
    );
    if (dups.length > 0) {
      toast(`Item Code "${dups[0].itemCode}" already exists!`, "error");
      return;
    }

    const invalidWarranty = itemsToSave.find((item) => {
      if (!item.warrantyPeriodDays && item.warrantyPeriodDays !== 0) return false;
      const val = Number(item.warrantyPeriodDays);
      return isNaN(val) || val < 0;
    });

    if (invalidWarranty) {
      toast(
        `Please enter a valid non-negative numeric Warranty Period for item "${invalidWarranty.itemCode || "unnamed"}".`,
        "warning",
      );
      return;
    }

    const newRows = itemsToSave.length > 0
      ? itemsToSave.map((item) => ({
          partyCode: finalPartyCode,
          partyDescription: partyDesc,
          partyType: newCustomer.partyType || "OEM",
          state: newCustomer.state || "",
          districtCity: newCustomer.districtCity || "",
          productSegment: item.productSegment || "",
          itemCode: item.itemCode || "",
          itemDescription: item.itemDescription || "",
          warrantyPeriodDays: item.warrantyPeriodDays || "",
        }))
      : [
          {
            partyCode: finalPartyCode,
            partyDescription: partyDesc,
            partyType: newCustomer.partyType || "OEM",
            state: newCustomer.state || "",
            districtCity: newCustomer.districtCity || "",
            productSegment: "",
            itemCode: "",
            itemDescription: "",
            warrantyPeriodDays: "",
          },
        ];

    const updated = [...newRows, ...customerDbFlat].sort((a, b) =>
      (a.partyCode || "").localeCompare(b.partyCode || ""),
    );
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updated));
    setCustomerDb(updated);
    setBase((p) => ({
      ...p,
      customerCode: finalPartyCode,
      customerName: partyDesc,
      category: newCustomer.partyType || p.category,
    }));
    setCustSearch(partyDesc);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        productCode: "",
        productDescription: "",
        productSegment: "",
      })),
    );
    toast("Customer added successfully!", "success");
    setShowAddCustModal(false);
  };

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
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        productCode: "",
        productDescription: "",
        productSegment: "",
      })),
    );
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
    if (!base.customerName || !base.customerCode) { toast("Customer Name is mandatory. Please select a customer.", "error"); return; }
    if (products.length === 0) { toast("At least one product is required", "warning"); return; }
    if (products.some(p => !p.productDescription)) { toast("All products must have a description", "error"); return; }
    if (products.some(p => !p.problemType)) { toast("All products must have a Problem Type", "error"); return; }
    onSave({ ...base, products });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full h-full flex flex-col font-sans flex-1 min-h-0 overflow-hidden pr-[0.3vw]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border-2 border-slate-300 mb-[0.6vw] shrink-0">
        <div className="flex items-center gap-[0.9vw]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[0.4vw] text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-[0.75vw] py-[0.35vw] rounded-[0.5vw] cursor-pointer text-[0.83vw] font-medium transition-colors"
          >
            <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
            <span>Back</span>
          </button>
          <h2 className="text-[1.1vw] font-bold text-slate-800">
            {initialData._id ? "Edit Production NC" : "New Production NC Registration"}
          </h2>
        </div>
        <div className="bg-blue-50/80 border border-blue-200 px-[0.9vw] py-[0.35vw] rounded-[0.5vw] text-[0.85vw] flex items-center gap-[0.4vw]">
          <span className="text-slate-500 font-medium">Ref No:</span>
          <span className="font-mono font-medium text-blue-600">
            {base.refNoInternal}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Middle Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-[0.4vw] flex flex-col gap-[0.9vw] pb-[0.8vw] custom-scrollbar">
          {/* SECTION 1: Primary Order Details */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border-2 border-slate-300 p-[1.2vw]">
            <div className="flex items-center gap-[0.45vw] mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
              <ClipboardList className="w-[1vw] h-[1vw] text-blue-600" />
              <h3 className="text-[0.87vw] font-bold text-slate-800 uppercase tracking-wider">
                Primary Order Details
              </h3>
            </div>
            <div className="grid grid-cols-12 gap-[1.2vw]">
              <div className="col-span-2 flex flex-col gap-[0.35vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Registration Date</label>
                <input
                  type="date"
                  value={base.date}
                  onChange={e => setBase({ ...base, date: e.target.value })}
                  disabled={isReadOnly}
                  className="bg-white border-[1.5px] border-slate-400 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.85vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-[0.35vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Job Order Number <span className="text-rose-500">*</span></label>
                <input
                  value={base.jobOrderNo}
                  onChange={e => setBase({ ...base, jobOrderNo: e.target.value })}
                  placeholder="Enter Job Order..."
                  disabled={isReadOnly}
                  className="bg-white border-[1.5px] border-slate-400 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.85vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
              <div className="col-span-4 flex flex-col gap-[0.35vw] relative" ref={custRef}>
                <label className="text-[0.81vw] font-semibold text-slate-700 flex items-center justify-between h-[1.3vw]">
                  <span>
                    Customer Name <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[0.73vw] text-slate-400 font-medium">
                    ({filteredCustomers.length})
                  </span>
                </label>
                <div className="flex gap-[0.4vw]">
                  <div className="relative flex-1">
                    <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-slate-400" />
                    <input
                      value={custSearch}
                      onChange={e => {
                        if (!isReadOnly) {
                          setCustSearch(e.target.value);
                          setBase(p => ({ ...p, customerName: e.target.value, customerCode: "" }));
                          setShowCustDrop(true);
                        }
                      }}
                      onFocus={() => !isReadOnly && setShowCustDrop(true)}
                      onKeyDown={onCustKeyDown}
                      placeholder="Search & select customer..."
                      disabled={isReadOnly}
                      className="w-full bg-white border-[1.5px] border-slate-400 rounded-[0.5vw] h-[2.3vw] pl-[2.2vw] pr-[2vw] text-[0.85vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                    {custSearch && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustSearch("");
                          setBase(p => ({ ...p, customerName: "", customerCode: "", category: "" }));
                          setShowCustDrop(false);
                          setProducts((prev) =>
                            prev.map((p) => ({
                              ...p,
                              productCode: "",
                              productDescription: "",
                              productSegment: "",
                            })),
                          );
                        }}
                        className="absolute right-[0.5vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Clear customer"
                      >
                        <X className="w-[0.75vw] h-[0.75vw]" />
                      </button>
                    )}
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomer({
                          partyCode: "",
                          partyType: partyTypes[0]?.name || "OEM",
                          partyDescription: custSearch || "",
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
                        setShowAddCustModal(true);
                      }}
                      className="flex items-center gap-[0.3vw] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-[0.75vw] h-[2.3vw] rounded-[0.5vw] cursor-pointer text-[0.79vw] font-semibold transition-all shrink-0 shadow-2xs active:scale-95"
                      title="Add New Customer"
                    >
                      <UserPlus className="w-[0.85vw] h-[0.85vw]" />
                      <span>New</span>
                    </button>
                  )}
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
                            <div className={`text-[0.85vw] font-semibold ${custSelectedIndex === i ? "text-white" : "text-slate-800"}`}>{c.name}</div>
                            <div className={`text-[0.73vw] font-mono ${custSelectedIndex === i ? "text-white/80" : "text-slate-400"}`}>{c.code}</div>
                          </div>
                          {c.type && (
                            <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded font-semibold uppercase ${custSelectedIndex === i ? "bg-white/20 text-white border border-white/30" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>{c.type}</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="col-span-2 flex flex-col gap-[0.35vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Customer Code</label>
                <input
                  value={base.customerCode}
                  readOnly
                  className="bg-slate-100/70 border-[1.5px] border-slate-400 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.85vw] font-mono text-slate-600 cursor-not-allowed outline-none"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-[0.35vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Category</label>
                <input
                  value={base.category}
                  readOnly
                  className="bg-slate-100/70 border-[1.5px] border-slate-400 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.85vw] text-slate-600 cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Product Manifest & Assembly Specs */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border-2 border-slate-300 p-[1.2vw]">
            <div className="flex items-center justify-between mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <div className="flex items-center gap-[0.45vw]">
                <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
                <Package className="w-[1vw] h-[1vw] text-blue-600" />
                <h3 className="text-[0.87vw] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-[0.5vw]">
                  Manifest & Assembly Specs
                  <span className="text-[0.73vw] bg-blue-50 text-blue-700 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-full font-semibold">
                    {products.length} {products.length === 1 ? 'Item' : 'Items'}
                  </span>
                </h3>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addProduct}
                  className="cursor-pointer flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-[0.9vw] h-[2.1vw] rounded-[0.5vw] text-[0.83vw] transition-all shadow-2xs active:scale-95"
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
              employees={employeesList}
              stageOptions={stageOptions}
              dispositionOptions={dispositionOptions}
              isReadOnly={isReadOnly}
              onDuplicate={handleDuplicate}
              onRemove={removeProduct}
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-[0.8vw] bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] border-2 border-slate-300 shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.04)] shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="form-cancel-btn px-[1.4vw] h-[2.2vw] border-2 border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-[0.5vw] cursor-pointer flex items-center gap-[0.4vw] font-medium text-[0.83vw] transition-all"
          >
            <X className="w-[0.85vw] h-[0.85vw]" /> Cancel
          </button>
          {((initialData._id ? canUpdate : canWrite) && !isReadOnly) && (
            <button
              type="submit"
              className="px-[1.6vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-[0.5vw] flex items-center gap-[0.4vw] cursor-pointer font-medium text-[0.83vw] shadow-xs transition-all active:scale-95"
            >
              <Save className="w-[0.85vw] h-[0.85vw]" /> {initialData._id ? "Update Registration" : "Register Inward"}
            </button>
          )}
        </div>
      </form>

      {/* Add Customer Modal (matches Service Material) */}
      <AnimatePresence>
        {showAddCustModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-[1vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-[54vw] rounded-[1vw] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[88vh] flex flex-col border border-gray-100"
            >
              {/* Modal Header */}
              <div className="px-[1.2vw] py-[0.9vw] border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="w-[2vw] h-[2vw] rounded-[0.5vw] bg-blue-50 flex items-center justify-center text-blue-600">
                    <UserPlus className="w-[1vw] h-[1vw]" />
                  </div>
                  <div>
                    <h2 className="text-[1.1vw] font-bold text-gray-900 leading-none">
                      Add Customer & Items
                    </h2>
                    <p className="text-[0.73vw] text-gray-400 font-medium mt-[0.15vw]">
                      Register a new party and catalog item details
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="w-[1.8vw] h-[1.8vw] rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleAddCustomerSubmit}
                className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto custom-scrollbar"
              >
                {/* Party Details Card */}
                <div className="bg-slate-50/60 p-[1vw] rounded-[0.7vw] border border-slate-400/80">
                  <div className="flex items-center gap-[0.4vw] mb-[0.8vw]">
                    <span className="w-[0.25vw] h-[0.8vw] bg-blue-600 rounded-full inline-block" />
                    <h3 className="text-[0.87vw] font-bold text-gray-800 uppercase tracking-wider">
                      Party Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw] mb-[0.8vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.79vw] font-semibold text-gray-700">
                        Party Code <span className="text-slate-400 font-normal text-[0.7vw]">(Auto-generated if blank)</span>
                      </label>
                      <AutocompleteInput
                        value={newCustomer.partyCode}
                        onChange={handleAddPartyCodeChange}
                        suggestions={uniquePartyCodes}
                        placeholder="e.g. CUS-001"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.79vw] font-semibold text-gray-700">
                        Party Type
                      </label>
                      <CustomDropdown
                        options={(partyTypes.length > 0 ? partyTypes : [{ name: "OEM" }, { name: "End Customer" }]).map((t) => ({ value: t.name, label: t.name }))}
                        value={newCustomer.partyType}
                        onChange={(val) => setNewCustomer({ ...newCustomer, partyType: val })}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[0.3vw] mb-[0.8vw]">
                    <label className="text-[0.79vw] font-semibold text-gray-700">
                      Party Description <span className="text-rose-500">*</span>
                    </label>
                    <AutocompleteInput
                      required
                      value={newCustomer.partyDescription}
                      onChange={handleAddPartyDescChange}
                      suggestions={uniquePartyDescriptions}
                      placeholder="Company / Customer Name"
                      className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.79vw] font-semibold text-gray-700">State</label>
                      <AutocompleteInput
                        value={newCustomer.state}
                        onChange={(val) => setNewCustomer({ ...newCustomer, state: val })}
                        suggestions={uniqueStates}
                        placeholder="e.g. Tamil Nadu"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.79vw] font-semibold text-gray-700">District / City</label>
                      <AutocompleteInput
                        value={newCustomer.districtCity}
                        onChange={(val) => setNewCustomer({ ...newCustomer, districtCity: val })}
                        suggestions={addModalDistricts}
                        placeholder="e.g. Coimbatore"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section Card */}
                <div className="bg-white border border-slate-400/90 rounded-[0.7vw] p-[1vw] shadow-2xs">
                  <div className="flex justify-between items-center mb-[0.6vw]">
                    <div className="flex items-center gap-[0.4vw]">
                      <span className="w-[0.25vw] h-[0.8vw] bg-indigo-600 rounded-full inline-block" />
                      <h3 className="text-[0.87vw] font-bold text-gray-800 uppercase tracking-wider">
                        Product Items
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustItemRow}
                      className="text-blue-600 hover:text-blue-700 text-[0.79vw] font-semibold flex items-center gap-[0.3vw] cursor-pointer hover:underline"
                    >
                      <PlusCircle className="w-[0.85vw] h-[0.85vw]" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-[0.6vw]">
                    {newCustomer.items.map((item, idx) => {
                      const isExisting = item._existing;
                      return (
                        <div
                          key={idx}
                          className={`flex gap-[0.5vw] items-center border-b border-gray-100 pb-[0.6vw] last:border-0 ${
                            isExisting ? "bg-blue-50/40 rounded-[0.4vw] p-[0.4vw]" : ""
                          }`}
                        >
                          {isExisting && (
                            <div className="flex flex-col justify-end shrink-0">
                              <span className="text-[0.67vw] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Existing
                              </span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col gap-[0.2vw]">
                            {idx === 0 && (
                              <label className="text-[0.73vw] font-semibold text-gray-500">
                                Segment
                              </label>
                            )}
                            <AutocompleteInput
                              value={item.productSegment}
                              onChange={(val) => handleCustItemChange(idx, "productSegment", val)}
                              suggestions={uniqueSegments}
                              placeholder="Segment"
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-[0.2vw]">
                            {idx === 0 && (
                              <label className="text-[0.73vw] font-semibold text-gray-500">
                                Item Code
                              </label>
                            )}
                            <input
                              value={item.itemCode}
                              readOnly={isExisting}
                              onChange={(e) => handleCustItemChange(idx, "itemCode", e.target.value)}
                              className={`w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-mono transition-all ${
                                isExisting ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
                              }`}
                              placeholder="Item Code"
                            />
                          </div>
                          <div className="flex-[2] flex flex-col gap-[0.2vw]">
                            {idx === 0 && (
                              <label className="text-[0.73vw] font-semibold text-gray-500">
                                Description
                              </label>
                            )}
                            <AutocompleteInput
                              value={item.itemDescription}
                              onChange={(val) => handleCustItemChange(idx, "itemDescription", val)}
                              suggestions={uniqueItemDescriptions}
                              placeholder="Item Description"
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                            />
                          </div>
                          <div className="flex-[0.8] flex flex-col gap-[0.2vw]">
                            {idx === 0 && (
                              <label className="text-[0.73vw] font-semibold text-gray-500">
                                Warranty (days)
                              </label>
                            )}
                            <input
                              type="number"
                              min="0"
                              value={item.warrantyPeriodDays}
                              onChange={(e) =>
                                handleCustItemChange(idx, "warrantyPeriodDays", e.target.value)
                              }
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-slate-400 bg-white text-[0.81vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all font-semibold"
                              placeholder="Days"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustItemRow(idx)}
                              disabled={newCustomer.items.length === 1 && !isExisting}
                              className={`p-[0.35vw] text-gray-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer transition-colors ${
                                idx === 0 ? "mt-[1.1vw]" : ""
                              }`}
                            >
                              <MinusCircle className="w-[1vw] h-[1vw]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-[0.6vw] pt-[0.4vw]">
                  <button
                    type="button"
                    onClick={() => setShowAddCustModal(false)}
                    className="px-[1.2vw] h-[2.2vw] border border-slate-400 rounded-[0.45vw] text-gray-600 hover:bg-gray-50 text-[0.81vw] font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-[1.4vw] h-[2.2vw] bg-blue-600 text-white rounded-[0.45vw] hover:bg-blue-700 text-[0.81vw] font-semibold shadow-xs flex items-center gap-[0.4vw] transition-all cursor-pointer"
                  >
                    Save All
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Datalists for Autocomplete */}
      <datalist id="prod-cust-states-datalist">
        {uniqueStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="prod-cust-districts-datalist">
        {uniqueDistricts.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="prod-cust-segments-datalist">
        {uniqueSegments.map((seg) => (
          <option key={seg} value={seg} />
        ))}
      </datalist>
    </motion.div>
  );
};

// --- Main List Screen ---
export default function ProductionMaterial() {
  const navigate = useNavigate();
  const { toast } = useNotification();
  const [data, setData] = useState([]);
  const [view, setView] = useState("list");
  const [selectedRow, setSelectedRow] = useState(null);
  const [reportsRow, setReportsRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
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
  const [collapsedCustomers, setCollapsedCustomers] = useState({});
  const [collapsedEntries, setCollapsedEntries] = useState({});
  const [expandedCustomerDetails, setExpandedCustomerDetails] = useState({});
  const [expandedEntryDetails, setExpandedEntryDetails] = useState({});

  const toggleCustomer = (name) =>
    setCollapsedCustomers((p) => ({ ...p, [name]: !p[name] }));
  const toggleEntry = (id) =>
    setCollapsedEntries((p) => ({ ...p, [id]: !p[id] }));

  const toggleCustomerDetails = (name, e) => {
    e.stopPropagation();
    setExpandedCustomerDetails((p) => ({ ...p, [name]: !p[name] }));
  };

  const toggleEntryDetails = (id, e) => {
    e.stopPropagation();
    setExpandedEntryDetails((p) => ({ ...p, [id]: !p[id] }));
  };
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const { canWrite, canUpdate, canDelete } = useModulePermissions("prodNC");
  const ITEMS_PER_PAGE = 10;

  const fetchData = async () => {
    try {
      const [matRes, empRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/production-material`),
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/master/settings/production_master_data`).catch(() => ({ data: null }))
      ]);
      setData(matRes.data.map(e => ({ ...e, id: e._id })));
      setEmployees(empRes.data);
      if (settingsRes?.data) {
        const { stages, dispositions, problemTypes, productTypes } = settingsRes.data;
        if (stages && Array.isArray(stages)) {
          setStageOptions(stages);
          lsSave(STAGE_MASTER_KEY, stages);
        }
        if (dispositions && Array.isArray(dispositions)) {
          setDispositionOptions(dispositions);
          lsSave(DISPOSITION_MASTER_KEY, dispositions);
        }
        if (problemTypes && Array.isArray(problemTypes)) {
          setProblemTypeOptions(problemTypes);
          lsSave(PROBLEM_TYPE_MASTER_KEY, problemTypes);
        }
        if (productTypes && Array.isArray(productTypes)) {
          setProductTypeOptions(productTypes);
          lsSave(PRODUCT_TYPE_MASTER_KEY, productTypes);
        }
      }
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

  const saveMasterData = async (newStages, newDispositions, newProblemTypes, newProductTypes) => {
    setStageOptions(newStages);
    setDispositionOptions(newDispositions);
    setProblemTypeOptions(newProblemTypes);
    setProductTypeOptions(newProductTypes);
    lsSave(STAGE_MASTER_KEY, newStages);
    lsSave(DISPOSITION_MASTER_KEY, newDispositions);
    lsSave(PROBLEM_TYPE_MASTER_KEY, newProblemTypes);
    lsSave(PRODUCT_TYPE_MASTER_KEY, newProductTypes);
    try {
      await axios.post(`${API_URL}/master/settings`, {
        key: "production_master_data",
        value: {
          stages: newStages,
          dispositions: newDispositions,
          problemTypes: newProblemTypes,
          productTypes: newProductTypes,
        }
      });
      toast("Master Data Saved to Database", "success");
    } catch (err) {
      console.error("Failed to save master settings to DB:", err);
      toast("Saved locally (DB sync failed)", "warning");
    }
    setShowMasterData(false);
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

  // Group paginated data by customer like ServiceMaterial
  const groups = useMemo(() => {
    const map = new Map();
    paginatedData.forEach((row) => {
      const key = row.customerName || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return Array.from(map.entries()).map(([customerName, rows]) => ({
      customerName,
      rows: [...rows].sort((a, b) => {
        const parseDateStr = (dateStr) => {
          if (!dateStr) return 0;
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
          }
          const parsed = new Date(dateStr).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        const dA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : parseDateStr(a.date);
        const dB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : parseDateStr(b.date);
        return dB - dA;
      }),
    }));
  }, [paginatedData]);

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
      <div className="text-blue-600 font-bold text-[1.05vw] uppercase tracking-widest animate-pulse">Loading Production Data...</div>
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
      <div className="w-full h-full font-sans text-[0.9vw] flex flex-col flex-1 min-h-0 overflow-hidden">
        <AnimatePresence>{reportsRow && <ReportsModal row={reportsRow} onClose={() => setReportsRow(null)} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0">
          {/* ── 1. Top Level Scoping Toolbar: Pill Search, Date Range, Clear & Actions ── */}
          <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border-[1.5px] border-slate-400 status-pills-track gap-[0.7vw] shrink-0">
            {/* Soft Pill Search Box */}
            <div className="relative w-[20vw]">
              <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
              <input
                type="text"
                placeholder="Search by ref, JO, customer, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.81vw] font-semibold text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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

              {/* Bulk Delete */}
              <AnimatePresence>
                {selectedItems.size > 0 && canDelete && !isSupervisor && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-[0.35vw] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 px-[0.85vw] h-[2.2vw] rounded-full font-semibold text-[0.79vw] transition-all cursor-pointer shadow-2xs"
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
                    className="cursor-pointer flex items-center gap-[0.4vw] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-400 font-semibold px-[0.9vw] h-[2.2vw] rounded-full text-[0.79vw] transition-all shadow-2xs"
                  >
                    <ClipboardList className="w-[0.8vw] h-[0.8vw] text-slate-500" />
                    <span>Master Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("form")}
                    className="cursor-pointer flex items-center gap-[0.35vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold px-[1.1vw] h-[2.2vw] rounded-full text-[0.79vw] transition-all shadow-2xs active:scale-95"
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
              <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border-[1.5px] border-slate-400 status-pills-track gap-[0.4vw] max-w-full overflow-x-auto min-w-0">
                {[
                  { label: "All" },
                  { label: "Pending" },
                  { label: "Rejected" },
                  { label: "Completed" }
                ].map(({ label }) => {
                  const isActive = activeFilter === label;
                  const count = counts[label] ?? 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveFilter(label)}
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
                  {filteredData.length}
                </span>
                <span>entries</span>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-left border-collapse border-spacing-0">
                {/* ── THEAD (Sticky 0 & 1.8vw) ── */}
                <thead className="sticky top-0 z-40 bg-[#E9EDF7] border-b border-slate-300 text-slate-700 font-bold text-[0.79vw] uppercase tracking-wider shadow-xs">
                  <tr className="bg-[#E9EDF7]">
                    {canDelete && !isSupervisor && (
                      <th
                        rowSpan={2}
                        className="p-[0.6vw] border-b border-r border-slate-300 text-center align-middle w-[2.5%] sticky top-0 z-40 bg-[#E9EDF7]"
                      >
                        <button
                          type="button"
                          onClick={toggleSelectPage}
                          className="flex items-center justify-center w-full cursor-pointer"
                        >
                          <div
                            className={`w-[1.1vw] h-[1.1vw] rounded-[0.2vw] border flex items-center justify-center transition-all ${
                              isPageSelected
                                ? "bg-[#1a73e8] border-[#1a73e8] text-white"
                                : "bg-white border-slate-400 text-transparent"
                            }`}
                          >
                            {isPageSelected && (
                              <span className="text-[0.8vw] leading-none font-bold text-white">
                                ✓
                              </span>
                            )}
                          </div>
                        </button>
                      </th>
                    )}
                    <th
                      rowSpan={2}
                      className="px-[0.7vw] py-[0.7vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r border-slate-300 whitespace-nowrap text-[0.79vw] align-middle w-[3.5%] sticky top-0 z-40 bg-[#E9EDF7]"
                    >
                      S. No
                    </th>
                    <th
                      colSpan={8}
                      className="px-[0.7vw] py-[0.35vw] h-[1.8vw] font-bold text-slate-700 uppercase tracking-wider border-b border-r border-slate-300 text-center text-[0.79vw] sticky top-0 z-40 bg-[#E9EDF7]"
                    >
                      Product Manifest Details
                    </th>
                    {["Assigned To", "Resolution Verification", "Final Status", "Final Remarks", "History", "Actions"].map((h) => (
                      <th
                        key={h}
                        rowSpan={2}
                        style={{
                          minWidth:
                            h === "Final Status"
                              ? "9.5vw"
                              : h === "Resolution Verification"
                              ? "11vw"
                              : h === "Final Remarks"
                              ? "10vw"
                              : h === "History"
                              ? "5.5vw"
                              : h === "Actions"
                              ? "6.5vw"
                              : "8vw",
                        }}
                        className="px-[0.7vw] py-[0.7vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r last:border-r-0 border-slate-300 whitespace-nowrap text-[0.79vw] align-middle sticky top-0 z-40 bg-[#E9EDF7]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-[#E9EDF7]">
                    {[
                      { name: "Item Code", minW: "8vw" },
                      { name: "Description", minW: "14vw" },
                      { name: "Segment", minW: "6.5vw" },
                      { name: "NC Type", minW: "6.5vw" },
                      { name: "Stage", minW: "6.5vw" },
                      { name: "Qty", minW: "4.5vw" },
                      { name: "Repeatability", minW: "6.5vw" },
                      { name: "Serial/Batch", minW: "8vw" },
                    ].map(({ name, minW }) => (
                      <th
                        key={name}
                        style={{ minWidth: minW }}
                        className="px-[0.7vw] py-[0.35vw] h-[1.8vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r border-slate-300 whitespace-nowrap text-[0.79vw] sticky top-[1.8vw] z-40 bg-[#E9EDF7]"
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groups.length > 0 ? (
                    groups.flatMap(({ customerName, rows }) => {
                      const isCustomerCollapsed = collapsedCustomers[customerName];
                      const totalCols = (canDelete && !isSupervisor ? 1 : 0) + 1 + 8 + 6;

                      return [
                        // ── STICKY HEADER 1: CUSTOMER HEADER ROW (sticky top-[3.6vw]) ──
                        <tr
                          key={`cust-${customerName}`}
                          className="cursor-pointer select-none border-b border-slate-300 bg-[#EEF2F6] hover:bg-[#E2E8F0] transition-colors sticky top-[3.6vw] z-30 shadow-xs"
                          onClick={() => toggleCustomer(customerName)}
                        >
                          <td
                            colSpan={totalCols}
                            className="px-[0.7vw] py-[0.55vw] h-[2.4vw] border-l-[0.22vw] border-blue-600 bg-[#EEF2F6] border-b border-slate-300"
                          >
                            <div className="flex items-center gap-[0.5vw]">
                              {isCustomerCollapsed ? (
                                <ChevronDown className="w-[0.9vw] h-[0.9vw] text-slate-500 flex-shrink-0 -rotate-90 transition-transform" />
                              ) : (
                                <ChevronDown className="w-[0.9vw] h-[0.9vw] text-slate-500 flex-shrink-0 transition-transform" />
                              )}

                              <span className="font-semibold text-[#0043a9] text-[0.89vw] tracking-wide">
                                {customerName}
                              </span>

                              {/* Toggle button to reveal / hide customer details */}
                              <button
                                type="button"
                                onClick={(e) => toggleCustomerDetails(customerName, e)}
                                title={expandedCustomerDetails[customerName] ? "Collapse customer details" : "Expand customer details"}
                                className="px-[0.35vw] py-[0.12vw] bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-300 rounded-[0.25vw] transition-all cursor-pointer flex items-center justify-center shrink-0 ml-[0.3vw] shadow-2xs"
                              >
                                <Icon
                                  icon={expandedCustomerDetails[customerName] ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
                                  className="w-[0.75vw] h-[0.75vw]"
                                />
                              </button>

                              {/* Customer metadata: revealed on clicking chevron */}
                              {expandedCustomerDetails[customerName] && (
                                <div className="flex items-center gap-[0.35vw] flex-wrap animate-in fade-in duration-200">
                                  {rows[0]?.customerCode && (
                                    <span className="text-[0.75vw] text-slate-500 font-medium ml-[0.2vw]">
                                      Code: {rows[0].customerCode}
                                    </span>
                                  )}
                                  {rows[0]?.category && (
                                    <span className="text-[0.77vw] font-medium text-slate-700 bg-slate-50 border border-slate-300 px-[0.45vw] py-[0.08vw] rounded-[0.25vw] whitespace-nowrap ml-[0.2vw]">
                                      Category: {rows[0].category}
                                    </span>
                                  )}
                                  {rows[0]?.refNoInternal && (
                                    <span className="text-[0.77vw] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-[0.45vw] py-[0.08vw] rounded-[0.25vw] whitespace-nowrap ml-[0.2vw]">
                                      Ref: {rows[0].refNoInternal}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="ml-auto flex items-center gap-[0.5vw]">
                                <span className="text-[0.73vw] text-slate-500 font-medium bg-white px-[0.5vw] py-[0.1vw] rounded-full border border-slate-300">
                                  {rows.length} {rows.length === 1 ? "order" : "orders"}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>,

                        // ── ENTRIES (Sticky Header 2: Entry / Job Order Sub-Header) ──
                        ...(isCustomerCollapsed
                          ? []
                          : rows.flatMap((row, rowIdx) => {
                              const globalSn = (currentPage - 1) * ITEMS_PER_PAGE + rowIdx + 1;
                              const isSelected = selectedItems.has(row.id);
                              const isEntryCollapsed = collapsedEntries[row.id];
                              const prods = (row.products || []).filter((p) => {
                                if (activeFilter === "All") return true;
                                return (p.finalStatus || "Pending") === activeFilter;
                              });

                              return [
                                // ── STICKY HEADER 2: JOB ORDER / REGISTRATION ROW (sticky top-[6vw]) ──
                                <tr
                                  key={`entry-hdr-${row.id}`}
                                  className={`border-t border-b border-slate-300 cursor-pointer select-none transition-colors duration-150 sticky top-[6vw] z-20 shadow-xs ${
                                    isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                                  }`}
                                >
                                  {canDelete && !isSupervisor && (
                                    <td
                                      className={`py-[0.5vw] px-[0.4vw] border-r border-b border-slate-300 text-center align-middle ${
                                        isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelect(row.id);
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="flex items-center justify-center w-full cursor-pointer"
                                      >
                                        <div
                                          className={`w-[0.95vw] h-[0.95vw] rounded-[0.2vw] border flex items-center justify-center transition-all ${
                                            isSelected
                                              ? "bg-blue-600 border-blue-600 text-white"
                                              : "border-slate-300 hover:border-slate-400 bg-white"
                                          }`}
                                        >
                                          {isSelected && (
                                            <span className="text-[0.7vw] leading-none font-bold">
                                              ✓
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    </td>
                                  )}

                                  {/* S.No */}
                                  <td
                                    className={`py-[0.5vw] px-[0.4vw] border-r border-b border-slate-300 text-center text-[0.77vw] font-medium text-slate-700 align-middle ${
                                      isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"
                                    }`}
                                    onClick={() => toggleEntry(row.id)}
                                  >
                                    {globalSn}
                                  </td>

                                  {/* Date + Job Order No + Summary Spanning remaining columns */}
                                  <td
                                    colSpan={8 + 6}
                                    className={`px-[0.6vw] py-[0.5vw] h-[2.3vw] align-middle border-b border-slate-300 ${
                                      isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"
                                    }`}
                                    onClick={() => toggleEntry(row.id)}
                                  >
                                    <div className="flex items-center gap-[0.6vw] flex-wrap">
                                      {/* Chevron */}
                                      <span
                                        className="text-slate-400 flex-shrink-0 transition-transform duration-200"
                                        style={{
                                          display: "inline-flex",
                                          transform: isEntryCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                        }}
                                      >
                                        <ChevronDown className="w-[0.75vw] h-[0.75vw]" />
                                      </span>

                                      {/* Date */}
                                      <div className="flex items-center gap-[0.35vw] ml-[0.3vw]">
                                        <Calendar className="w-[0.9vw] h-[0.9vw] text-[#550000] flex-shrink-0" />
                                        <span className="text-[0.83vw] font-medium text-[#550000] whitespace-nowrap">
                                          {fmtDate(row.date)}
                                        </span>
                                      </div>

                                      {/* Job Order Number Badge */}
                                      <div className="flex items-center gap-[0.35vw] ml-[0.4vw]">
                                        <span className="text-[0.77vw] text-slate-600 font-semibold">JO:</span>
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReportsRow(row);
                                          }}
                                          className="text-[0.83vw] font-mono font-semibold text-blue-600 hover:underline cursor-pointer bg-blue-50/80 px-[0.45vw] py-[0.05vw] rounded border border-blue-200"
                                        >
                                          {row.jobOrderNo || "—"}
                                        </span>
                                      </div>

                                      {/* Toggle button to reveal / hide Inward Quantities Summary */}
                                      <button
                                        type="button"
                                        onClick={(e) => toggleEntryDetails(row.id, e)}
                                        title={expandedEntryDetails[row.id] ? "Collapse summary" : "Expand summary"}
                                        className="px-[0.35vw] py-[0.12vw] bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-300 rounded-[0.25vw] transition-all cursor-pointer flex items-center justify-center shrink-0 ml-[0.3vw] shadow-2xs"
                                      >
                                        <Icon
                                          icon={expandedEntryDetails[row.id] ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
                                          className="w-[0.75vw] h-[0.75vw]"
                                        />
                                      </button>

                                      {/* Inward Quantities Summary (Revealed on click) */}
                                      {expandedEntryDetails[row.id] && (() => {
                                        const rowTotal = (row.products || []).reduce((sum, p) => sum + (Math.max(1, Number(p.qty) || 1)), 0);
                                        const rowCompleted = (row.products || []).reduce((sum, p) => {
                                          const isDone = (p.finalStatus || "Pending") === "Completed";
                                          return sum + (isDone ? Math.max(1, Number(p.qty) || 1) : 0);
                                        }, 0);
                                        const rowPending = Math.max(0, rowTotal - rowCompleted);

                                        return (
                                          <div className="flex items-center gap-[0.8vw] text-[0.77vw] text-slate-600 font-medium ml-[0.6vw] animate-in fade-in duration-200">
                                            <span>Total Qty: <strong className="text-slate-800">{rowTotal}</strong></span>
                                            <span className="text-slate-300">|</span>
                                            <span>Completed: <strong className="text-emerald-700">{rowCompleted}</strong></span>
                                            <span className="text-slate-300">|</span>
                                            <span>Pending: <strong className="text-amber-700">{rowPending}</strong></span>
                                          </div>
                                        );
                                      })()}

                                      {/* Actions — right side */}
                                      <div
                                        className="ml-auto flex items-center gap-[0.4vw]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => setReportsRow(row)}
                                          title="View Full Report"
                                          className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-400 rounded-full shadow-2xs cursor-pointer transition-colors"
                                        >
                                          <Eye className="w-[0.8vw] h-[0.8vw]" />
                                        </button>

                                        {canUpdate && !isSupervisor && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedRow(row);
                                              setView("form");
                                            }}
                                            title="Edit Registration"
                                            className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-400 rounded-full shadow-2xs cursor-pointer transition-colors"
                                          >
                                            <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                          </button>
                                        )}

                                        {canDelete && !isSupervisor && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (window.confirm("Delete this registration?")) {
                                                try {
                                                  await axios.delete(`${API_URL}/production-material/${row.id}`);
                                                  setData((prev) => prev.filter((e) => e.id !== row.id));
                                                  toast("Registration deleted", "success");
                                                } catch {
                                                  toast("Delete failed", "error");
                                                }
                                              }
                                            }}
                                            title="Delete Registration"
                                            className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-300 hover:border-rose-300 rounded-full shadow-2xs cursor-pointer transition-colors"
                                          >
                                            <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>,

                                // ── PRODUCT ROWS ──
                                ...(isEntryCollapsed
                                  ? []
                                  : prods.map((prod, pi) => {
                                      const isTechCompleted = prod.report?.status === "Completed";
                                      const isVerified = !!prod.report?.verifiedBy;
                                      const showReadyHighlight = isTechCompleted && !isVerified;
                                      const bgClass = isSelected
                                        ? "bg-blue-50/70"
                                        : showReadyHighlight
                                        ? "bg-emerald-50/40"
                                        : pi % 2 === 0
                                        ? "bg-white hover:bg-slate-50/80"
                                        : "bg-slate-50/30 hover:bg-slate-50/80";

                                      return (
                                        <tr
                                          key={`${row.id}-p-${pi}`}
                                          className={`transition-colors duration-100 border-b border-slate-300 ${bgClass}`}
                                        >
                                          {/* Checkbox spacer */}
                                          {canDelete && !isSupervisor && (
                                            <td className="border-r border-slate-300" style={{ background: "transparent" }} />
                                          )}

                                          {/* S.No sub-number */}
                                          <td className="border-r border-slate-300 text-center align-middle px-[0.3vw] py-[0.45vw]">
                                            <span className="text-[0.77vw] font-bold text-slate-500">
                                              {globalSn}.{pi + 1}
                                            </span>
                                          </td>

                                          {/* Product Code */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-center align-middle font-medium">
                                            {showReadyHighlight && (
                                              <div className="flex items-center justify-center gap-[0.3vw] mb-[0.2vw]">
                                                <div className="h-[0.4vw] w-[0.4vw] rounded-full bg-emerald-500 shadow-xs" />
                                                <span className="text-[0.65vw] font-semibold text-emerald-700 whitespace-nowrap">Completed</span>
                                              </div>
                                            )}
                                            <div className="font-mono text-slate-800 text-[0.77vw] font-medium">
                                              {prod.productCode || "—"}
                                            </div>
                                          </td>

                                          {/* Product Description */}
                                          <td
                                            className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-left font-medium text-slate-900 text-[0.81vw] truncate max-w-[14vw]"
                                            title={prod.productDescription}
                                          >
                                            {prod.productDescription || "—"}
                                          </td>

                                          {/* Product Segment */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-[0.79vw] text-slate-800 font-medium align-middle text-center">
                                            {prod.productSegment || "—"}
                                          </td>

                                          {/* NC Type */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-center align-middle font-medium">
                                            <span
                                              className={`inline-flex items-center justify-center text-[0.73vw] font-medium px-[0.55vw] py-[0.12vw] rounded-full border shadow-2xs whitespace-nowrap ${
                                                prod.ncType === "External"
                                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                                  : "bg-blue-50 text-blue-700 border-blue-200"
                                              }`}
                                            >
                                              {prod.ncType || "Internal"}
                                            </span>
                                          </td>

                                          {/* Detection Stage */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-center align-middle font-medium text-slate-800 text-[0.81vw]">
                                            {prod.stage || "Assembly"}
                                          </td>

                                          {/* Qty */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-center align-middle font-medium text-black text-[0.81vw]">
                                            {prod.qty || "1"}
                                          </td>

                                          {/* Repeatability */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-center align-middle font-medium text-slate-800 text-[0.79vw]">
                                            <span className={`inline-block px-[0.5vw] py-[0.08vw] rounded-[0.25vw] font-mono text-[0.77vw] ${
                                              Number(prod.repeatability) > 0 
                                                ? "bg-amber-50 text-amber-700 border border-amber-200 font-medium" 
                                                : "text-slate-700 font-medium"
                                            }`}>
                                              {prod.repeatability !== undefined && prod.repeatability !== "" ? prod.repeatability : "0"}
                                            </span>
                                          </td>

                                          {/* Serial Number */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-center font-mono text-black text-[0.77vw] font-medium">
                                            {prod.serialNumber || "—"}
                                          </td>

                                          {/* Assigned To */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-center font-medium text-slate-700 text-[0.81vw]">
                                            {canUpdate && !isSupervisor ? (
                                              <EmpSelectCell
                                                val={prod.assignedTo}
                                                employees={employees}
                                                onSelect={(emp) => {
                                                  onUpdateProduct(row.id, prod._pid, {
                                                    assignedTo: emp ? emp.userId : "",
                                                    assignedToName: emp ? emp.name : "",
                                                  });
                                                }}
                                              />
                                            ) : (
                                              prod.assignedToName || "Unassigned"
                                            )}
                                          </td>

                                          {/* Resolution Verification */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-center font-medium">
                                            {prod.report?.verifiedByName ? (
                                              <div className="flex flex-col items-center">
                                                <span className="text-[0.79vw] font-medium text-emerald-800">{prod.report.verifiedByName}</span>
                                                <span className="text-[0.71vw] text-slate-700 font-medium">{fmtDate(prod.report.verifiedDate)}</span>
                                              </div>
                                            ) : (
                                              <span className="text-slate-500 font-medium text-[0.77vw]">—</span>
                                            )}
                                          </td>

                                          {/* Final Status */}
                                          <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-center font-medium">
                                            <FinalStatusCell
                                              row={row}
                                              prod={prod}
                                              onUpdateProduct={onUpdateProduct}
                                              isSupervisor={isSupervisor}
                                            />
                                          </td>

                                          {/* Final Remarks */}
                                          <td
                                            className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle text-center font-medium text-slate-600 text-[0.77vw] truncate max-w-[10vw]"
                                            title={prod.finalStatusRemarks}
                                          >
                                            {prod.finalStatusRemarks || "—"}
                                          </td>

                                          {/* History */}
                                          <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                            <HistoryCellButton prod={prod} row={row} />
                                          </td>

                                          {/* Actions */}
                                          <td
                                            className={`px-[0.7vw] py-[0.6vw] text-center align-middle border-b border-slate-300 ${
                                              isSelected ? "bg-blue-50/70" : "bg-white"
                                            }`}
                                          >
                                            <div className="flex items-center justify-center gap-[0.4vw]">
                                              <button
                                                type="button"
                                                onClick={() => setReportsRow(row)}
                                                className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                                title="View Report"
                                              >
                                                <Eye className="w-[0.9vw] h-[0.9vw]" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => setShowVerify({ row, prod })}
                                                className={`p-[0.35vw] rounded-full transition-all cursor-pointer ${
                                                  prod.report?.verifiedBy
                                                    ? "text-emerald-600 hover:bg-emerald-50"
                                                    : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                                                }`}
                                                title={prod.report?.verifiedBy ? "Update Verification" : "Verify Resolution"}
                                              >
                                                <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
                                              </button>

                                              {canUpdate && !isSupervisor && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedRow(row);
                                                    setView("form");
                                                  }}
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
                                    })),
                              ];
                            })),
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={20} className="py-[6vw] text-center text-slate-400 text-[0.9vw] font-medium">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

                        {/* Pagination Footer */}
            <div className="border-t border-slate-200 px-[1vw] py-[0.55vw] bg-slate-50/70 flex justify-between items-center rounded-b-[0.8vw] shrink-0">
              <div className="text-[0.79vw] font-medium text-slate-500">
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
                        className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-full text-[0.79vw] font-semibold cursor-pointer transition-all ${currentPage === pNum ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
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