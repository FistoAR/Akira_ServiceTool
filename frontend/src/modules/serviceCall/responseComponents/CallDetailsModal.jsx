import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  Wrench,
  Download,
  Copy,
  Check,
  Building2,
  Hash,
  ExternalLink,
  Tag,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Flame,
  UserCheck,
  Cpu,
  HelpCircle,
  FileCode,
  BadgeAlert,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CallDetailsModal = ({ call, employees, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "products" | "timeline"
  const [copied, setCopied] = useState(false);

  if (!call) return null;

  const products = call.products || call._products || [];

  const handleCopyCallNo = () => {
    if (call.callNumber) {
      navigator.clipboard.writeText(call.callNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const parseTimestamp = (val) => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === "number") return val;
    const str = String(val).trim();

    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?)?/i);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      const ampm = dmyMatch[7] ? dmyMatch[7].toLowerCase() : null;
      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
      return new Date(year, month, day, hour, minute, second).getTime();
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      const ts = parseTimestamp(d);
      if (!ts) return String(d);
      const date = new Date(ts);
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

  const getPriorityBadge = (p) => {
    const norm = String(p || "").toLowerCase();
    switch (norm) {
      case "critical":
        return {
          pill: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          label: "Critical",
        };
      case "high":
        return {
          pill: "bg-orange-50 text-orange-700 border-orange-200",
          dot: "bg-orange-500",
          label: "High",
        };
      case "medium":
        return {
          pill: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: "Medium",
        };
      case "low":
        return {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Low",
        };
      default:
        return {
          pill: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          label: p || "Normal",
        };
    }
  };

  const getStatusBadge = (s) => {
    const norm = String(s || "").toLowerCase();
    switch (norm) {
      case "resolved":
      case "closed":
        return {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Resolved",
        };
      case "critical":
        return {
          pill: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-600",
          label: "Critical",
        };
      case "escalating":
      case "escalated":
        return {
          pill: "bg-orange-50 text-orange-700 border-orange-200",
          dot: "bg-orange-500",
          label: "Escalating",
        };
      case "pending":
        return {
          pill: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: "Pending",
        };
      case "supporting":
        return {
          pill: "bg-sky-50 text-sky-700 border-sky-200",
          dot: "bg-sky-500",
          label: "Supporting",
        };
      case "field visit":
      case "field visit required":
        return {
          pill: "bg-purple-50 text-purple-700 border-purple-200",
          dot: "bg-purple-500",
          label: "Field Visit",
        };
      case "registered":
        return {
          pill: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          label: "Registered",
        };
      case "assigned":
      default:
        return {
          pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
          dot: "bg-indigo-600",
          label: s || "Assigned",
        };
    }
  };

  const getCustomerTypePill = (type) => {
    switch (type) {
      case "OEM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "End Customer":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Distributor":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Dealer":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Layers, count: null },
    { id: "products", label: "Products", icon: Wrench, count: products.length },
    { id: "timeline", label: "Audit Timeline", icon: Activity, count: null },
  ];

  const statusCfg = getStatusBadge(call.status || "Assigned");
  const priorityCfg = getPriorityBadge(call.priority || "Medium");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-[1.2vw] shadow-2xl border border-slate-200/90 w-full max-w-[58vw] max-h-[88vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.75vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="w-[1.1vw] h-[1.1vw]" />
            </div>

            <div>
              <div className="flex items-center gap-[0.45vw] flex-wrap">
                <span className="font-mono font-medium text-[1vw] text-slate-900 tracking-tight">
                  {call.callNumber || "Service Call"}
                </span>

                <button
                  type="button"
                  onClick={handleCopyCallNo}
                  className="p-[0.2vw] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                  title="Copy Call Reference"
                >
                  {copied ? (
                    <Check className="w-[0.75vw] h-[0.75vw] text-emerald-600" />
                  ) : (
                    <Copy className="w-[0.75vw] h-[0.75vw]" />
                  )}
                </button>

                {/* Status Pill */}
                <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-normal border ${statusCfg.pill}`}>
                  <span className={`w-[0.35vw] h-[0.35vw] rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>

                {/* Priority Pill */}
                <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-normal border ${priorityCfg.pill}`}>
                  <span className={`w-[0.35vw] h-[0.35vw] rounded-full ${priorityCfg.dot}`} />
                  {priorityCfg.label}
                </span>

                {call.noEscalation === true && (
                  <span className="inline-flex items-center gap-[0.2vw] px-[0.45vw] py-[0.08vw] rounded-full text-[0.66vw] font-normal bg-teal-50 text-teal-700 border border-teal-200">
                    <UserCheck className="w-[0.6vw] h-[0.6vw]" />
                    Self Assigned
                  </span>
                )}
              </div>

              <div className="text-[0.72vw] text-slate-500 font-normal mt-[0.1vw] flex items-center gap-[0.3vw]">
                <Clock className="w-[0.65vw] h-[0.65vw] text-slate-400 shrink-0" />
                <span>
                  Registered on <span className="text-slate-700 font-normal">{fmtDate(call.dateTime || call.createdAt)}</span>
                </span>
                {call.registeredByName && call.registeredByName !== "System" && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>
                      by <span className="text-slate-700 font-normal">{call.registeredByName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-[0.8vw]">
            {/* Connected Segmented Navigation Tabs */}
            <div className="inline-flex items-center p-[0.2vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.15vw]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-[0.3vw] px-[0.65vw] py-[0.25vw] rounded-full text-[0.72vw] font-normal transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-medium"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    <Icon className={`w-[0.75vw] h-[0.75vw] ${isActive ? "text-white" : "text-slate-500"}`} />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`text-[0.66vw] font-semibold ml-[0.1vw] ${
                          isActive
                            ? "bg-white/20 text-white px-[0.35vw] py-[0.02vw] rounded-full"
                            : "text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-[0.45vw] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-[1.05vw] h-[1.05vw]" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY ──────────────────────────────────────────────────── */}
        <div className="p-[1.6vw] overflow-y-auto flex-1 min-h-0 bg-[#f8fafd] space-y-[1.2vw]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-[1.2vw]">
              {/* Customer & Call Attributes Cards */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* 1. Customer Details Card */}
                <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.1vw] shadow-2xs">
                  <div className="flex items-center justify-between pb-[0.6vw] border-b border-slate-100">
                    <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-medium text-slate-800">
                      <div className="p-[0.28vw] rounded-[0.35vw] bg-blue-50 text-blue-600">
                        <Building2 className="w-[0.85vw] h-[0.85vw]" />
                      </div>
                      <span>Customer Details</span>
                    </div>
                    {call.partyCode && (
                      <span className="font-mono text-[0.68vw] font-normal text-slate-600 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded border border-slate-200">
                        {call.partyCode}
                      </span>
                    )}
                  </div>

                  <div className="mt-[0.75vw] space-y-[0.55vw] text-[0.76vw]">
                    <div className="flex items-start justify-between gap-[0.8vw]">
                      <span className="text-slate-400 font-normal">Customer Name</span>
                      <span className="font-normal text-slate-800 text-right max-w-[18vw] leading-snug">
                        {call.customerName || "—"}
                      </span>
                    </div>

                    {call.customerType && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-normal">Customer Type</span>
                        <span className={`px-[0.45vw] py-[0.08vw] rounded-full text-[0.68vw] font-normal border ${getCustomerTypePill(call.customerType)}`}>
                          {call.customerType}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-normal">Contact Number</span>
                      {call.contactNumber ? (
                        <a
                          href={`tel:${call.contactNumber}`}
                          className="font-normal text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-[0.25vw] transition-colors"
                        >
                          <Phone className="w-[0.65vw] h-[0.65vw] text-blue-500 shrink-0" />
                          <span>{call.contactNumber}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>

                    {call.contactPerson && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-normal">Contact Person</span>
                        <span className="font-normal text-slate-800">{call.contactPerson}</span>
                      </div>
                    )}

                    {call.emailId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-normal">Email Address</span>
                        <a
                          href={`mailto:${call.emailId}`}
                          className="font-normal text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-[0.25vw]"
                        >
                          <Mail className="w-[0.65vw] h-[0.65vw] text-blue-500 shrink-0" />
                          <span>{call.emailId}</span>
                        </a>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-[0.8vw]">
                      <span className="text-slate-400 font-normal">Location</span>
                      <span className="font-normal text-slate-800 text-right flex items-start justify-end gap-[0.25vw] max-w-[18vw] leading-snug">
                        <MapPin className="w-[0.65vw] h-[0.65vw] text-slate-400 shrink-0 mt-[0.12vw]" />
                        <span>{call.location || "—"}</span>
                      </span>
                    </div>

                    {call.site && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-normal">Site / Branch</span>
                        <span className="font-normal text-slate-800">{call.site}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Call Attributes Card */}
                <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.1vw] shadow-2xs">
                  <div className="flex items-center justify-between pb-[0.6vw] border-b border-slate-100">
                    <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-medium text-slate-800">
                      <div className="p-[0.28vw] rounded-[0.35vw] bg-indigo-50 text-indigo-600">
                        <Briefcase className="w-[0.85vw] h-[0.85vw]" />
                      </div>
                      <span>Call Attributes</span>
                    </div>
                    <span className="font-normal text-[0.68vw] text-slate-600 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded border border-slate-200">
                      {products.length} Item{products.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-[0.75vw] space-y-[0.55vw] text-[0.76vw]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-normal">Call Mode</span>
                      <span className="font-normal text-slate-800">{call.mode || "Phone"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-normal">Current Engineer</span>
                      <span className="font-normal text-indigo-700 bg-indigo-50 px-[0.4vw] py-[0.06vw] rounded text-[0.74vw] border border-indigo-100">
                        {call.currentEngineerName || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-normal">Department</span>
                      <span className="font-normal text-slate-800">
                        {call.currentDepartment || "Support Engineers"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-normal">Registered By</span>
                      <span className="font-normal text-slate-800">
                        {call.registeredByName || call.registeredBy || "System"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Products Summary Section */}
              <div className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.2vw] shadow-xs">
                <div className="text-[0.8vw] font-medium text-slate-800 pb-[0.6vw] border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-[0.4vw]">
                    <div className="p-[0.28vw] rounded-[0.35vw] bg-blue-50 text-blue-600">
                      <Wrench className="w-[0.85vw] h-[0.85vw]" />
                    </div>
                    <span>Product Summary ({products.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-[0.72vw] text-blue-600 font-normal hover:text-blue-800 flex items-center gap-[0.15vw] transition-colors cursor-pointer group"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-[0.7vw] h-[0.7vw] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="mt-[0.7vw] divide-y divide-slate-100">
                  {products.map((p, idx) => {
                    const closureStatus = p._productClosure?.status || (p._resolved ? "Resolved" : "Open");
                    const pStatusCfg = getStatusBadge(closureStatus);

                    return (
                      <div
                        key={idx}
                        className="py-[0.55vw] first:pt-0 last:pb-0 flex items-center justify-between text-[0.76vw] hover:bg-slate-50/70 px-[0.3vw] rounded transition-colors"
                      >
                        <div className="flex items-center gap-[0.65vw]">
                          <span className="w-[1.5vw] h-[1.5vw] rounded bg-slate-100 text-slate-600 font-normal flex items-center justify-center text-[0.68vw] border border-slate-200">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-slate-800 text-[0.78vw]">
                              {p.productModel || p.productName || p.itemCode || "Product"}
                            </div>
                            <div className="text-[0.68vw] text-slate-500 font-mono mt-[0.05vw] flex items-center gap-[0.35vw]">
                              <span>SN: <span className="text-slate-600 font-normal">{p.serialNumber || "N/A"}</span></span>
                              <span className="text-slate-300">•</span>
                              <span>Segment: <span className="text-slate-600 font-normal">{p.productSegment || "General"}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-[0.6vw]">
                          {p.errorCode && (
                            <span className="px-[0.4vw] py-[0.08vw] bg-rose-50 border border-rose-200 text-rose-700 font-mono font-normal text-[0.68vw] rounded">
                              Err: {p.errorCode}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-[0.25vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.66vw] font-normal border uppercase tracking-wide ${pStatusCfg.pill}`}>
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
            <div className="space-y-[0.9vw]">
              {products.map((p, idx) => {
                const closure = p._productClosure || {};
                const closureStatus = closure.status || (p._resolved ? "Resolved" : "Open");
                const pStatusCfg = getStatusBadge(closureStatus);

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.1vw] shadow-2xs space-y-[0.75vw]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-[0.55vw] border-b border-slate-100">
                      <div className="flex items-center gap-[0.55vw]">
                        <span className="px-[0.45vw] py-[0.12vw] rounded bg-blue-50 text-blue-700 font-mono font-normal text-[0.7vw] border border-blue-200">
                          #{idx + 1}
                        </span>
                        <h4 className="text-[0.85vw] font-medium text-slate-800">
                          {p.productModel || p.productName || p.itemCode || "Item"}
                        </h4>
                      </div>

                      <span className={`inline-flex items-center gap-[0.25vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.66vw] font-normal border uppercase tracking-wide ${pStatusCfg.pill}`}>
                        <span className={`w-[0.32vw] h-[0.32vw] rounded-full ${pStatusCfg.dot}`} />
                        {pStatusCfg.label}
                      </span>
                    </div>

                    {/* Product Specs Grid */}
                    <div className="grid grid-cols-4 gap-[0.7vw] text-[0.74vw] bg-slate-50/80 p-[0.75vw] rounded-[0.5vw] border border-slate-200/80">
                      <div className="bg-white p-[0.5vw] rounded border border-slate-200/70">
                        <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">Serial Number</span>
                        <span className="font-mono font-normal text-slate-800 text-[0.78vw] mt-[0.1vw] block">
                          {p.serialNumber || "—"}
                        </span>
                      </div>
                      <div className="bg-white p-[0.5vw] rounded border border-slate-200/70">
                        <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">Product Segment</span>
                        <span className="font-normal text-slate-800 text-[0.78vw] mt-[0.1vw] block">
                          {p.productSegment || "—"}
                        </span>
                      </div>
                      <div className="bg-white p-[0.5vw] rounded border border-slate-200/70">
                        <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">Warranty Status</span>
                        <span className="font-normal text-slate-800 text-[0.78vw] mt-[0.1vw] block">
                          {p.warrantyStatus || "In Warranty"}
                        </span>
                      </div>
                      <div className="bg-white p-[0.5vw] rounded border border-slate-200/70">
                        <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">Error Code</span>
                        <span className="font-mono font-normal text-rose-600 text-[0.78vw] mt-[0.1vw] block">
                          {p.errorCode || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div>
                      <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                        Reported Issue
                      </span>
                      <div className="text-[0.74vw] text-slate-700 bg-slate-50/60 p-[0.6vw] rounded border border-slate-200 font-normal leading-relaxed">
                        {p.callDescription ? p.callDescription : <span className="text-slate-400 italic">No specific issue description entered.</span>}
                      </div>
                    </div>

                    {/* Closure Report Section */}
                    {closure.status && (
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-[0.5vw] p-[0.75vw] space-y-[0.4vw]">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.74vw] font-normal text-emerald-800 flex items-center gap-[0.3vw]">
                            <CheckCircle2 className="w-[0.75vw] h-[0.75vw] text-emerald-600" />
                            Closure Report ({closure.status})
                          </span>
                          {closure.resolutionType && (
                            <span className="text-[0.66vw] font-normal bg-white text-emerald-700 px-[0.4vw] py-[0.08vw] rounded border border-emerald-200">
                              {closure.resolutionType}
                            </span>
                          )}
                        </div>
                        {closure.remarks && (
                          <div className="text-[0.74vw] text-emerald-950 font-normal leading-relaxed bg-white/80 p-[0.5vw] rounded border border-emerald-100">
                            {closure.remarks}
                          </div>
                        )}
                        <div className="text-[0.68vw] text-emerald-700 font-normal pt-[0.1vw]">
                          Closed by: <span className="font-normal text-emerald-900">{closure.closedByName || closure.userName || "Engineer"}</span>
                          {closure.closedAt && ` on ${fmtDate(closure.closedAt)}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AUDIT TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.1vw] shadow-2xs space-y-[0.9vw]">
              <div className="text-[0.8vw] font-medium text-slate-800 pb-[0.6vw] border-b border-slate-100 flex items-center gap-[0.4vw]">
                <div className="p-[0.28vw] rounded-[0.35vw] bg-indigo-50 text-indigo-600">
                  <Activity className="w-[0.85vw] h-[0.85vw]" />
                </div>
                <span>Lifecycle History & Audits</span>
              </div>

              {(() => {
                const timelineEvents = [
                  // Creation
                  {
                    title: "Call Registered",
                    time: call.dateTime || call.createdAt,
                    person: call.registeredByName || call.registeredBy || "System",
                    details: `Registered via ${call.mode || "Non Portal"} with priority ${call.priority || "Medium"}.`,
                    type: "create",
                  },
                  // Edit history
                  ...(call.editHistory || []).map((eh) => ({
                    title: `Call Edited (${eh.role || "Admin"})`,
                    time: eh.editedAt,
                    person: eh.editedByName || eh.editedBy,
                    details: eh.reason ? `Reason: ${eh.reason}` : "General details updated",
                    type: "edit",
                  })),
                  // Product-level histories
                  ...products.flatMap((prod, pIdx) => [
                    ...(prod._escalationHistory || []).map((eh) => ({
                      title: `P#${pIdx + 1} - ${eh.status || "Escalated"}`,
                      time: eh.assignedAt || eh.timestamp,
                      person: eh.engineerName || eh.assignedToName || eh.updatedByName || "System",
                      details: eh.reason || eh.remarks || `Level ${eh.level ?? 1}`,
                      type: "escalate",
                    })),
                    ...(prod._history || []).map((h) => ({
                      title: `P#${pIdx + 1} - ${h.status || "Activity"}`,
                      time: h.timestamp || h.date,
                      person: h.updatedByName || h.updatedBy || "System",
                      details: h.remarks || h.reason || "Action performed",
                      type: "activity",
                    })),
                  ]),
                ].sort((a, b) => {
                  const tA = parseTimestamp(a.time);
                  const tB = parseTimestamp(b.time);
                  return tB - tA;
                });

                if (timelineEvents.length === 0) {
                  return (
                    <div className="text-center py-[2vw] text-slate-400 text-[0.76vw] font-normal">
                      No historical events recorded for this call.
                    </div>
                  );
                }

                return (
                  <div className="relative pl-[1.6vw] space-y-[0.65vw]">
                    {/* Vertical timeline line positioned at left: 0.55vw */}
                    <div className="absolute left-[0.55vw] top-[0.6vw] bottom-[0.6vw] w-[2px] bg-slate-200 pointer-events-none" />

                    {timelineEvents.map((ev, i) => {
                      const isCritical = ev.title.includes("Critical");
                      const isEscalation = ev.title.includes("Escalat") || ev.type === "escalate";
                      const isResolved = ev.title.includes("Resolved") || ev.title.includes("Closed");

                      let dotColor = "bg-blue-600";
                      let cardBorder = "border-slate-200 bg-slate-50/60";

                      if (isCritical) {
                        dotColor = "bg-rose-600";
                        cardBorder = "border-rose-200 bg-rose-50/30";
                      } else if (isEscalation) {
                        dotColor = "bg-orange-500";
                        cardBorder = "border-amber-200 bg-amber-50/30";
                      } else if (isResolved) {
                        dotColor = "bg-emerald-600";
                        cardBorder = "border-emerald-200 bg-emerald-50/30";
                      }

                      return (
                        <div key={i} className="relative group">
                          {/* Dot positioned on the line outside the card */}
                          <div
                            style={{ left: "calc(0.55vw + 1px)" }}
                            className={`absolute -translate-x-1/2 top-[0.7vw] w-[0.55vw] h-[0.55vw] rounded-full ${dotColor} ring-4 ring-white shadow-2xs z-10`}
                          />

                          <div className={`border rounded-[0.5vw] p-[0.65vw] transition-colors ${cardBorder} hover:bg-white`}>
                            <div className="flex items-center justify-between text-[0.74vw]">
                              <span className="font-normal text-slate-800">{ev.title}</span>
                              <span className="text-slate-400 font-mono text-[0.68vw]">
                                {fmtDate(ev.time)}
                              </span>
                            </div>
                            <div className="text-[0.72vw] text-slate-600 mt-[0.15vw] leading-relaxed font-normal">
                              By <span className="font-normal text-slate-800">{ev.person}</span> • {ev.details}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="px-[1.6vw] py-[0.9vw] border-t border-slate-200/90 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.3vw] h-[2vw] text-[0.74vw] font-normal text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
