import React, { useState } from "react";
import {
  X,
  Building2,
  Calendar,
  Clock,
  Layers,
  Wrench,
  Activity,
  FileText,
  User,
  Package,
  Target,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL;

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(d);
  }
};

const getStatusBadge = (s) => {
  const norm = String(s || "").toLowerCase();
  switch (norm) {
    case "completed":
    case "resolved":
      return {
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        label: "Completed",
      };
    case "repair in progress":
    case "under testing":
      return {
        pill: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
        label: s || "In Progress",
      };
    case "not repairable":
    case "rejected":
      return {
        pill: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        label: s || "Not Repairable",
      };
    case "admin returned":
      return {
        pill: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
        label: "Admin Returned",
      };
    case "pending":
    case "open":
    default:
      return {
        pill: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        label: s || "Pending",
      };
  }
};

export const ProductionDetailsModal = ({ entry, product, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "products" | "timeline"
  const [copied, setCopied] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!entry) return null;

  // If a specific product was passed (e.g. from response row), make sure it's the focused one
  const products = entry.products || [];
  const focusedProduct = product || products[0] || {};

  const handleCopyRef = () => {
    const text = entry.refNoInternal || entry.jobOrderNo || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Layers, count: null },
    { id: "products", label: "Products", icon: Wrench, count: products.length },
    { id: "timeline", label: "Audit Timeline", icon: Activity, count: null },
  ];

  // Timeline events assembly
  const timelineEvents = [];
  if (entry.createdAt || entry.date) {
    timelineEvents.push({
      time: entry.createdAt || entry.date,
      title: "Inward Registered",
      by: entry.creatorName || "Admin",
      detail: `Registered with Job Order ${entry.jobOrderNo || "—"} and Ref ${entry.refNoInternal || "—"}`,
      type: "create"
    });
  }

  products.forEach((prod, pIdx) => {
    const pName = prod.productDescription || `Item #${pIdx + 1}`;
    if (prod.report?.history && Array.isArray(prod.report.history)) {
      prod.report.history.forEach((h) => {
        timelineEvents.push({
          time: h.timestamp || h.date,
          title: `Technical Update: ${h.status || "Status Change"} (${pName})`,
          by: h.updatedByName || h.updatedBy || prod.report?.workDoneByName || "Technical User",
          detail: h.remark || "Status updated in technical report",
          type: "status"
        });
      });
    }

    if (prod.finalStatusHistory && Array.isArray(prod.finalStatusHistory)) {
      prod.finalStatusHistory.forEach((fh) => {
        timelineEvents.push({
          time: fh.timestamp || fh.date,
          title: `Final Verification: ${fh.status || "Status Change"} (${pName})`,
          by: fh.updatedByName || fh.updatedBy || "QA / Supervisor",
          detail: fh.remarks || fh.reason || "Final review updated",
          type: "final"
        });
      });
    }

    if (prod.report?.verifiedDate) {
      timelineEvents.push({
        time: prod.report.verifiedDate,
        title: `Resolution Verified (${pName})`,
        by: prod.report.verifiedByName || "Verifier",
        detail: `Status: ${prod.report.verificationStatus || "Verified"}`,
        type: "verify"
      });
    }
  });

  timelineEvents.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-slate-50 rounded-[1.2vw] shadow-2xl border border-slate-200 w-full max-w-[58vw] h-[84vh] max-h-[88vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="px-[1.6vw] pt-[1vw] border-b border-slate-200/80 bg-slate-50/90 shrink-0 space-y-[0.8vw]">
          {/* Top Row: Ref, Chips & Close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[0.75vw]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.55vw] bg-[#1B539A] flex items-center justify-center text-white shadow-sm shrink-0">
                <FileText className="w-[1.2vw] h-[1.2vw]" />
              </div>

              <div>
                <div className="flex items-center gap-[0.6vw] flex-wrap">
                  <span className="font-mono font-bold text-[1.1vw] text-slate-900 tracking-tight">
                    {entry.refNoInternal || entry.jobOrderNo || "Production Inward"}
                  </span>

                  <button
                    onClick={handleCopyRef}
                    className="p-[0.2vw] text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Copy reference"
                  >
                    {copied ? <Check className="w-[0.8vw] h-[0.8vw] text-emerald-600" /> : <Copy className="w-[0.8vw] h-[0.8vw]" />}
                  </button>

                  <div className="flex items-center gap-[0.45vw] text-[0.81vw] text-slate-500 font-medium">
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-700 font-semibold font-mono">
                      JO: {entry.jobOrderNo || "—"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium">
                      {products.length} {products.length === 1 ? "Product" : "Products"}
                    </span>
                  </div>
                </div>

                <div className="text-[0.77vw] text-slate-700 font-medium mt-[0.3vw] flex items-center gap-[0.35vw]">
                  <Clock className="w-[0.68vw] h-[0.68vw] text-amber-900/70 shrink-0" />
                  <span>
                    Inward Date: <span className="text-amber-900 font-medium">{fmtDate(entry.date || entry.createdAt)}</span>
                  </span>
                  {entry.creatorName && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span>
                        by <span className="text-slate-800 font-medium">{entry.creatorName}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-[0.45vw] text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-[1.1vw] h-[1.1vw]" />
            </button>
          </div>

          {/* Bottom Row: Classic Line Tab View */}
          <div className="flex items-center gap-[1.6vw] pt-[0.2vw] -mb-[1px]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-[0.4vw] pb-[0.65vw] text-[0.83vw] transition-all cursor-pointer relative ${
                    isActive
                      ? "text-[#1B539A] font-bold"
                      : "text-slate-700 hover:text-slate-950 font-semibold"
                  }`}
                >
                  <Icon className={`w-[0.85vw] h-[0.85vw] ${isActive ? "text-[#1B539A]" : "text-slate-700"}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[0.71vw] font-bold px-[0.4vw] py-[0.05vw] rounded-full transition-colors ${
                        isActive
                          ? "bg-[#1B539A]/15 text-[#1B539A]"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderlineProduction"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1B539A] rounded-t-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MODAL BODY ──────────────────────────────────────────────────── */}
        <div className="p-[1.6vw] overflow-y-auto flex-1 min-h-0 bg-slate-100/70 space-y-[1.2vw]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-[1.2vw]">
              {/* Customer & Inward Attributes Cards */}
              <div className="grid grid-cols-2 gap-[1.2vw] items-stretch">
                {/* 1. Customer Details Card */}
                <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] flex flex-col justify-start overflow-hidden">
                  <div className="flex items-center justify-between px-[1.1vw] py-[0.7vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200">
                    <div className="flex items-center gap-[0.4vw] text-[0.85vw] font-bold text-slate-900">
                      <div className="p-[0.28vw] rounded-[0.35vw] bg-[#1B539A]/10 text-[#1B539A]">
                        <Building2 className="w-[0.85vw] h-[0.85vw]" />
                      </div>
                      <span>Customer Details</span>
                    </div>
                    {entry.customerCode && (
                      <span className="font-mono text-[0.73vw] font-bold text-[#1B539A] bg-[#1B539A]/10 px-[0.4vw] py-[0.08vw] rounded border-2 border-[#1B539A]/30">
                        {entry.customerCode}
                      </span>
                    )}
                  </div>

                  <div className="p-[1.1vw] space-y-[0.6vw] text-[0.81vw]">
                    <div className="flex items-start gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Customer Name</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900 text-left flex-1 leading-snug">
                        {entry.customerName || "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Customer Code</span>
                        <span>:</span>
                      </span>
                      <span className="font-mono text-slate-800 font-medium">
                        {entry.customerCode || "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Category / Type</span>
                        <span>:</span>
                      </span>
                      <span className="px-[0.45vw] py-[0.08vw] rounded-full text-[0.73vw] font-medium border bg-[#1B539A]/10 text-[#1B539A] border-[#1B539A]/20">
                        {entry.category || "OEM"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Inward Attributes Card */}
                <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] flex flex-col justify-start overflow-hidden">
                  <div className="flex items-center justify-between px-[1.1vw] py-[0.7vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200">
                    <div className="flex items-center gap-[0.4vw] text-[0.85vw] font-bold text-slate-900">
                      <div className="p-[0.28vw] rounded-[0.35vw] bg-[#1B539A]/10 text-[#1B539A]">
                        <Briefcase className="w-[0.85vw] h-[0.85vw]" />
                      </div>
                      <span>Inward Record Details</span>
                    </div>
                    <span className="font-bold text-[0.73vw] text-slate-800 bg-white px-[0.4vw] py-[0.08vw] rounded border-2 border-slate-300">
                      {products.length} Item{products.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-[1.1vw] space-y-[0.6vw] text-[0.81vw]">
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Job Order No</span>
                        <span>:</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700">{entry.jobOrderNo || "—"}</span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Internal Ref</span>
                        <span>:</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900">{entry.refNoInternal || "—"}</span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Registered By</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">{entry.creatorName || "Admin"}</span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Registered Date</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">{fmtDate(entry.date || entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Summary Section */}
              <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-[1.1vw] py-[0.7vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200 text-[0.85vw] font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-[0.4vw]">
                    <div className="p-[0.28vw] rounded-[0.35vw] bg-[#1B539A]/10 text-[#1B539A]">
                      <Wrench className="w-[0.85vw] h-[0.85vw]" />
                    </div>
                    <span>Product Summary ({products.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-[0.77vw] text-[#1B539A] font-bold hover:underline flex items-center gap-[0.15vw] transition-colors cursor-pointer group"
                  >
                    <span>View Product Details</span>
                    <ChevronRight className="w-[0.7vw] h-[0.7vw] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="p-[0.8vw] divide-y divide-slate-200">
                  {products.map((p, idx) => {
                    const status = p.report?.status || p.finalStatus || "Pending";
                    const pStatusCfg = getStatusBadge(status);

                    return (
                      <div
                        key={idx}
                        className="p-[0.6vw] first:pt-[0.3vw] last:pb-[0.3vw] flex items-center justify-between text-[0.81vw] hover:bg-slate-50/90 rounded-[0.5vw] transition-colors cursor-pointer"
                        onClick={() => {
                          setExpandedIndex(idx);
                          setActiveTab("products");
                        }}
                      >
                        <div className="flex items-center gap-[0.75vw]">
                          <span className="w-[1.6vw] h-[1.6vw] rounded bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-[0.73vw] border border-slate-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-slate-900 text-[0.83vw]">
                              {p.productDescription || p.productCode || "Product Item"}
                            </div>
                            <div className="text-[0.73vw] text-slate-700 font-mono mt-[0.05vw] flex items-center gap-[0.35vw]">
                              <span><strong className="font-semibold text-slate-800">SN:</strong> <span className="text-slate-900 font-medium">{p.serialNumber || p.identification || "—"}</span></span>
                              <span className="text-slate-400">•</span>
                              <span><strong className="font-semibold text-slate-800">Stage:</strong> <span className="text-slate-900 font-medium">{p.stage || "—"}</span></span>
                              <span className="text-slate-400">•</span>
                              <span><strong className="font-semibold text-slate-800">NC:</strong> <span className="text-slate-900 font-medium">{p.ncType || "Internal"}</span></span>
                              <span className="text-slate-400">•</span>
                              <span><strong className="font-semibold text-slate-800">Raised To:</strong> <span className="text-blue-700 font-semibold">{p.raisedToName || p.raisedTo || p.targetZone || "—"}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-[0.6vw]">
                          <span className={`inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.12vw] rounded-full text-[0.71vw] font-bold border uppercase tracking-wide ${pStatusCfg.pill}`}>
                            <span className={`w-[0.32vw] h-[0.32vw] rounded-full ${pStatusCfg.dot}`} />
                            {pStatusCfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS DETAILED */}
          {activeTab === "products" && (
            <div className="space-y-[1vw]">
              {products.map((p, idx) => {
                const isExpanded = expandedIndex === idx;
                const status = p.report?.status || p.finalStatus || "Pending";
                const pStatusCfg = getStatusBadge(status);
                const r = p.report;

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] overflow-hidden"
                  >
                    {/* Header Banner */}
                    <div
                      onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                      className="flex items-center justify-between px-[1.2vw] py-[0.75vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200 cursor-pointer hover:bg-[#1B539A]/[0.07] transition-colors"
                    >
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="w-[1.6vw] h-[1.6vw] rounded bg-[#1B539A]/10 text-[#1B539A] font-bold text-[0.75vw] flex items-center justify-center border-2 border-[#1B539A]/30">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[0.87vw] text-slate-900">
                            {p.productDescription || "Product Item"}
                          </span>
                          <span className="text-[0.73vw] text-slate-500 font-mono ml-[0.5vw]">
                            (Code: {p.productCode || "—"})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-[0.7vw]">
                        <span className={`inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.12vw] rounded-full text-[0.71vw] font-bold border uppercase tracking-wide ${pStatusCfg.pill}`}>
                          <span className={`w-[0.32vw] h-[0.32vw] rounded-full ${pStatusCfg.dot}`} />
                          {pStatusCfg.label}
                        </span>
                        <ChevronDown className={`w-[1vw] h-[1vw] text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-[1.2vw] space-y-[1.1vw] bg-white">
                            {/* Product Manifest Details Grid */}
                            <div>
                              <div className="text-[0.77vw] font-bold text-slate-900 uppercase tracking-wider mb-[0.6vw] flex items-center gap-[0.4vw]">
                                <Target className="w-[0.85vw] h-[0.85vw] text-[#1B539A]" />
                                <span>Registration & Manifest Details</span>
                              </div>
                              <div className="grid grid-cols-4 gap-[0.8vw] text-[0.81vw]">
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Detection Stage</span>
                                  <span className="font-bold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.stage || "—"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">NC Type</span>
                                  <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.ncType || "Internal"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Serial / Batch No</span>
                                  <span className="font-mono font-bold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.serialNumber || p.identification || "—"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Quantity</span>
                                  <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.qty || "1"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Problem Type</span>
                                  <span className="font-medium text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.problemType || "—"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Designators</span>
                                  <span className="font-medium text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.designators || "—"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Inspected By</span>
                                  <span className="font-medium text-slate-900 text-[0.83vw] mt-[0.1vw] block">{p.inspectedByName || "—"}</span>
                                </div>
                                <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                  <span className="text-[#530000] block text-[0.71vw] font-semibold uppercase">Raised To</span>
                                  <span className="font-bold text-blue-700 text-[0.83vw] mt-[0.1vw] block">{p.raisedToName || "—"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Problem & Board Image */}
                            <div className="grid grid-cols-3 gap-[1vw]">
                              <div className="col-span-2 border border-slate-200 rounded-[0.5vw] p-[0.8vw] bg-slate-50/40">
                                <span className="text-[#530000] font-semibold text-[0.73vw] uppercase block mb-[0.25vw]">Problem Description</span>
                                <p className="text-[0.83vw] text-slate-800 leading-relaxed whitespace-pre-wrap">{p.problem || "No description provided."}</p>
                              </div>
                              {p.boardImage && (
                                <div className="border border-slate-200 rounded-[0.5vw] p-[0.8vw] bg-slate-50/40 flex flex-col items-center">
                                  <span className="text-[#530000] font-semibold text-[0.73vw] uppercase block mb-[0.25vw] self-start">Board Image</span>
                                  <img
                                    src={p.boardImage.startsWith("http") ? p.boardImage : `${API_URL.replace('/api', '')}${p.boardImage}`}
                                    alt="Board"
                                    className="w-full h-[5.5vw] object-cover rounded-[0.4vw] border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(p.boardImage.startsWith("http") ? p.boardImage : `${API_URL.replace('/api', '')}${p.boardImage}`, "_blank")}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Technical Resolution Report Details */}
                            <div className="border-t border-slate-200 pt-[1vw]">
                              <div className="text-[0.77vw] font-bold text-slate-900 uppercase tracking-wider mb-[0.6vw] flex items-center gap-[0.4vw]">
                                <Wrench className="w-[0.85vw] h-[0.85vw] text-emerald-600" />
                                <span>Technical Resolution Report</span>
                              </div>

                              {r ? (
                                <div className="space-y-[0.8vw]">
                                  <div className="grid grid-cols-4 gap-[0.8vw] text-[0.81vw]">
                                    <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-emerald-50/30">
                                      <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Status</span>
                                      <span className="font-bold text-emerald-800 text-[0.83vw] mt-[0.1vw] block">{r.status || "—"}</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                      <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Work Done By</span>
                                      <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.workDoneByName || r.workDoneBy || "—"}</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                      <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">4M Category</span>
                                      <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.fourMCategory || "—"}</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                      <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">CAE</span>
                                      <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.cae || "—"}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-[0.8vw]">
                                    <div className="border border-slate-200 rounded-[0.5vw] p-[0.8vw] bg-white">
                                      <span className="text-[#530000] font-semibold text-[0.73vw] uppercase block mb-[0.2vw]">Root Cause Analysis</span>
                                      <p className="text-[0.81vw] text-slate-800 leading-relaxed whitespace-pre-wrap">{r.rootCause || "—"}</p>
                                    </div>
                                    <div className="border border-slate-200 rounded-[0.5vw] p-[0.8vw] bg-white">
                                      <span className="text-[#530000] font-semibold text-[0.73vw] uppercase block mb-[0.2vw]">Corrective Action Taken</span>
                                      <p className="text-[0.81vw] text-slate-800 leading-relaxed whitespace-pre-wrap">{r.correctiveActionDetails || r.correctiveAction || "—"}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-[0.8vw]">
                                    <div className="border border-slate-200 rounded-[0.5vw] p-[0.8vw] bg-white">
                                      <span className="text-[#530000] font-semibold text-[0.73vw] uppercase block mb-[0.2vw]">Parts Replaced / Material Change</span>
                                      <p className="text-[0.81vw] text-slate-800 leading-relaxed whitespace-pre-wrap">{r.materialChangeDetails || r.partsReplacement || "None"}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-[0.6vw]">
                                      <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                        <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Material Cost</span>
                                        <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.materialCost != null ? `₹${r.materialCost}` : "—"}</span>
                                      </div>
                                      <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                        <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Completed Date</span>
                                        <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{fmtDate(r.completedDate)}</span>
                                      </div>
                                      <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                        <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Validation</span>
                                        <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.validationStatus || "—"}</span>
                                      </div>
                                      <div className="border border-slate-200 rounded-[0.35vw] p-[0.55vw] bg-slate-50/70">
                                        <span className="text-slate-700 block text-[0.71vw] font-bold uppercase">Verification</span>
                                        <span className="font-semibold text-slate-900 text-[0.83vw] mt-[0.1vw] block">{r.verificationStatus || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-[1.5vw] text-center text-slate-400 text-[0.83vw] italic bg-slate-50/50 rounded-[0.5vw] border border-slate-200">
                                  No technical report submitted yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AUDIT TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] p-[1.1vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] space-y-[0.9vw]">
              <div className="text-[0.85vw] font-bold text-slate-900 pb-[0.6vw] border-b-2 border-slate-200 flex items-center gap-[0.4vw]">
                <Activity className="w-[0.85vw] h-[0.85vw] text-[#1B539A]" />
                <span>Production & Activity Audit Timeline</span>
              </div>

              {timelineEvents.length === 0 ? (
                <div className="text-center py-[2vw] text-slate-400 text-[0.81vw] font-medium">
                  No timeline events recorded yet.
                </div>
              ) : (
                <div className="relative pl-[2vw] space-y-[0.65vw]">
                  {/* Vertical timeline line precisely running through the dot column */}
                  <div className="absolute left-[0.7vw] -translate-x-1/2 top-[0.6vw] bottom-[0.6vw] w-[2px] bg-slate-200 pointer-events-none" />

                  {timelineEvents.map((ev, i) => {
                    const isVerify = ev.type === "verify";
                    const isFinal = ev.type === "final";
                    const isStatus = ev.type === "status";

                    let dotColor = "bg-[#1B539A]";
                    let cardBorder = "border-2 border-slate-300 bg-slate-100/70";

                    if (isVerify) {
                      dotColor = "bg-emerald-600";
                      cardBorder = "border-2 border-emerald-300 bg-emerald-50/70";
                    } else if (isFinal) {
                      dotColor = "bg-purple-600";
                      cardBorder = "border-2 border-purple-300 bg-purple-50/70";
                    } else if (isStatus) {
                      dotColor = "bg-blue-600";
                      cardBorder = "border-2 border-blue-200 bg-blue-50/40";
                    }

                    return (
                      <div key={i} className="relative group">
                        {/* Dot positioned cleanly in the gutter at -left-[1.3vw], exactly centered on the line at left-[0.7vw] */}
                        <div
                          className={`absolute -left-[1.3vw] -translate-x-1/2 top-[0.7vw] w-[0.55vw] h-[0.55vw] rounded-full ${dotColor} ring-4 ring-white shadow-2xs z-10`}
                        />

                        <div className={`border rounded-[0.5vw] p-[0.65vw] transition-colors ${cardBorder} hover:bg-white`}>
                          <div className="flex items-center justify-between text-[0.79vw]">
                            <span className="font-bold text-slate-900">{ev.title}</span>
                            <span className="text-slate-700 font-mono text-[0.73vw] font-medium">
                              {fmtDateTime(ev.time)}
                            </span>
                          </div>
                          <div className="text-[0.77vw] text-slate-800 mt-[0.15vw] leading-relaxed font-medium flex items-center flex-wrap gap-x-[0.35vw]">
                            <span>
                              By <strong className="text-slate-950 font-bold">{ev.by}</strong>
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>{ev.detail}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="px-[1.5vw] py-[0.8vw] border-t border-slate-200 bg-white flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.6vw] h-[2.2vw] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[0.81vw] font-semibold cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductionDetailsModal;
