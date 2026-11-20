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
        return "bg-[#1B539A]/10 text-[#1B539A] border-[#1B539A]/20";
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

  const isSelfAssigned = Boolean(
    call.noEscalation === true ||
    call.callOrigin === "self_assigned" ||
    call.isSelfAssigned
  );

  const statusCfg = getStatusBadge(call.status || "Assigned");
  const priorityCfg = getPriorityBadge(call.priority || "Medium");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
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
          {/* Top Row: Call ID, Chips & Close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[0.75vw]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.55vw] bg-[#1B539A] flex items-center justify-center text-white shadow-sm shrink-0">
                <FileText className="w-[1.2vw] h-[1.2vw]" />
              </div>

              <div>
                <div className="flex items-center gap-[0.6vw] flex-wrap">
                  <span className="font-mono font-bold text-[1.1vw] text-slate-900 tracking-tight">
                    {call.callNumber || "Service Call"}
                  </span>

                  {/* Plain text status & priority */}
                  <div className="flex items-center gap-[0.45vw] text-[0.81vw] text-slate-500 font-medium">
                    {(!isSelfAssigned || (statusCfg.label !== "Assigned" && statusCfg.label !== "Registered")) && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">
                          {statusCfg.label}
                        </span>
                      </>
                    )}

                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium">
                      {priorityCfg.label} Priority
                    </span>

                    {isSelfAssigned && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-teal-700 font-medium">
                          Self Assigned
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-[0.77vw] text-slate-700 font-medium mt-[0.3vw] flex items-center gap-[0.35vw]">
                  <Clock className="w-[0.68vw] h-[0.68vw] text-amber-900/70 shrink-0" />
                  <span>
                    Registered on <span className="text-amber-900 font-medium">{fmtDate(call.dateTime || call.createdAt)}</span>
                  </span>
                  {call.registeredByName && call.registeredByName !== "System" && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span>
                        by <span className="text-slate-800 font-medium">{call.registeredByName}</span>
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
                      layoutId="activeTabUnderline"
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
              {/* Customer & Call Attributes Cards */}
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
                    {call.partyCode && (
                      <span className="font-mono text-[0.73vw] font-bold text-[#1B539A] bg-[#1B539A]/10 px-[0.4vw] py-[0.08vw] rounded border-2 border-[#1B539A]/30">
                        {call.partyCode}
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
                        {call.customerName || "—"}
                      </span>
                    </div>

                    {call.customerType && (
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                          <span>Customer Type</span>
                          <span>:</span>
                        </span>
                        <span className={`px-[0.45vw] py-[0.08vw] rounded-full text-[0.73vw] font-medium border ${getCustomerTypePill(call.customerType)}`}>
                          {call.customerType}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Contact Number</span>
                        <span>:</span>
                      </span>
                      {call.contactNumber ? (
                        <a
                          href={`tel:${call.contactNumber}`}
                          className="font-medium text-[#1B539A] hover:underline flex items-center gap-[0.25vw] transition-colors"
                        >
                          <Phone className="w-[0.65vw] h-[0.65vw] text-[#1B539A] shrink-0" />
                          <span>{call.contactNumber}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 font-medium">—</span>
                      )}
                    </div>

                    {call.contactPerson && (
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                          <span>Contact Person</span>
                          <span>:</span>
                        </span>
                        <span className="font-medium text-slate-900">{call.contactPerson}</span>
                      </div>
                    )}

                    {call.emailId && (
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                          <span>Email Address</span>
                          <span>:</span>
                        </span>
                        <a
                          href={`mailto:${call.emailId}`}
                          className="font-medium text-[#1B539A] hover:underline flex items-center gap-[0.25vw]"
                        >
                          <Mail className="w-[0.65vw] h-[0.65vw] text-[#1B539A] shrink-0" />
                          <span>{call.emailId}</span>
                        </a>
                      </div>
                    )}

                    <div className="flex items-start gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Location</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900 flex items-start gap-[0.25vw] flex-1 leading-snug">
                        <MapPin className="w-[0.65vw] h-[0.65vw] text-slate-600 shrink-0 mt-[0.12vw]" />
                        <span>{call.location || "—"}</span>
                      </span>
                    </div>

                    {call.site && (
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                          <span>Site / Branch</span>
                          <span>:</span>
                        </span>
                        <span className="font-medium text-slate-900">{call.site}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Call Attributes Card */}
                <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] flex flex-col justify-start overflow-hidden">
                  <div className="flex items-center justify-between px-[1.1vw] py-[0.7vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200">
                    <div className="flex items-center gap-[0.4vw] text-[0.85vw] font-bold text-slate-900">
                      <div className="p-[0.28vw] rounded-[0.35vw] bg-[#1B539A]/10 text-[#1B539A]">
                        <Briefcase className="w-[0.85vw] h-[0.85vw]" />
                      </div>
                      <span>Call Attributes</span>
                    </div>
                    <span className="font-bold text-[0.73vw] text-slate-800 bg-white px-[0.4vw] py-[0.08vw] rounded border-2 border-slate-300">
                      {products.length} Product{products.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-[1.1vw] space-y-[0.6vw] text-[0.81vw]">
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Call Mode</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">{call.mode || "Phone"}</span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Current Engineer</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-[#1B539A] bg-[#1B539A]/10 px-[0.45vw] py-[0.1vw] rounded text-[0.79vw] border border-[#1B539A]/20">
                        {call.currentEngineerName || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Department</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">
                        {call.currentDepartment || "Support Engineers"}
                      </span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Registered By</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">
                        {call.registeredByName || call.registeredBy || "System"}
                      </span>
                    </div>

                    <div className="flex items-center gap-[0.6vw]">
                      <span className="text-[#530000] font-semibold w-[7.8vw] shrink-0 flex justify-between">
                        <span>Registered Date</span>
                        <span>:</span>
                      </span>
                      <span className="font-medium text-slate-900">
                        {fmtDate(call.dateTime || call.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Products Summary Section */}
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
                    <span>View Details</span>
                    <ChevronRight className="w-[0.7vw] h-[0.7vw] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="p-[0.8vw] divide-y divide-slate-200">
                  {products.map((p, idx) => {
                    const closureStatus = p._productClosure?.status || (p._resolved ? "Resolved" : "Open");
                    const pStatusCfg = getStatusBadge(closureStatus);

                    return (
                      <div
                        key={idx}
                        className="p-[0.6vw] first:pt-[0.3vw] last:pb-[0.3vw] flex items-center justify-between text-[0.81vw] hover:bg-slate-50/90 rounded-[0.5vw] transition-colors"
                      >
                        <div className="flex items-center gap-[0.75vw]">
                          <span className="w-[1.6vw] h-[1.6vw] rounded bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-[0.73vw] border border-slate-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-slate-900 text-[0.83vw]">
                              {p.productModel || p.productName || p.itemCode || "Product"}
                            </div>
                            <div className="text-[0.73vw] text-slate-700 font-mono mt-[0.05vw] flex items-center gap-[0.35vw]">
                              <span><strong className="font-semibold text-slate-800">SN:</strong> <span className="text-slate-900 font-medium">{p.serialNumber || "N/A"}</span></span>
                              <span className="text-slate-400">•</span>
                              <span><strong className="font-semibold text-slate-800">Segment:</strong> <span className="text-slate-900 font-medium">{p.productSegment || "General"}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-[0.6vw]">
                          {p.errorCode && (
                            <span className="px-[0.4vw] py-[0.08vw] bg-rose-50 border border-rose-300 text-rose-800 font-mono font-bold text-[0.73vw] rounded">
                              Err: {p.errorCode}
                            </span>
                          )}
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
                const closure = p._productClosure || {};
                const closureStatus = closure.status || (p._resolved ? "Resolved" : "Open");
                const pStatusCfg = getStatusBadge(closureStatus);

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-slate-300 rounded-[0.8vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] overflow-hidden"
                  >
                    {/* Header Banner */}
                    <div className="flex items-center justify-between px-[1.2vw] py-[0.75vw] bg-[#1B539A]/[0.04] border-b-2 border-slate-200">
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="w-[1.6vw] h-[1.6vw] rounded bg-[#1B539A]/10 text-[#1B539A] font-bold text-[0.75vw] flex items-center justify-center border-2 border-[#1B539A]/30">
                          #{idx + 1}
                        </span>
                        <h4 className="text-[0.93vw] font-bold text-slate-900">
                          {p.productModel || p.productName || p.itemCode || "Item"}
                        </h4>
                      </div>

                      <span className={`inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.12vw] rounded-full text-[0.71vw] font-bold border-2 uppercase tracking-wide ${pStatusCfg.pill}`}>
                        <span className={`w-[0.32vw] h-[0.32vw] rounded-full ${pStatusCfg.dot}`} />
                        {pStatusCfg.label}
                      </span>
                    </div>

                    <div className="p-[1.2vw] space-y-[0.9vw]">
                      {/* Clean Inline Specs Row */}
                      <div className="grid grid-cols-4 gap-[1.2vw] py-[0.4vw] border-b-2 border-slate-200 text-[0.81vw]">
                        <div>
                          <span className="text-[0.71vw] font-semibold text-[#530000] uppercase tracking-wider block">Serial Number</span>
                          <span className="font-mono font-medium text-slate-900 mt-[0.1vw] block">
                            {p.serialNumber || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.71vw] font-semibold text-[#530000] uppercase tracking-wider block">Product Segment</span>
                          <span className="font-medium text-slate-900 mt-[0.1vw] block">
                            {p.productSegment || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.71vw] font-semibold text-[#530000] uppercase tracking-wider block">Warranty Status</span>
                          <span className="font-medium text-slate-900 mt-[0.1vw] block">
                            {p.warrantyStatus || "In Warranty"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.71vw] font-semibold text-[#530000] uppercase tracking-wider block">Error Code</span>
                          <span className="font-mono font-medium text-rose-600 mt-[0.1vw] block">
                            {p.errorCode || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Reported Issue */}
                      <div className="space-y-[0.25vw]">
                        <span className="text-[0.71vw] font-semibold text-[#530000] uppercase tracking-wider block">
                          Reported Issue
                        </span>
                        <div className="text-[0.81vw] text-slate-900 leading-relaxed font-medium">
                          {p.callDescription ? p.callDescription : <span className="text-slate-500 italic">No specific issue description entered.</span>}
                        </div>
                      </div>

                      {/* Closure Report Section (Minimalist Alert) */}
                      {closure.status && (
                        <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-[0.55vw] p-[0.8vw] space-y-[0.35vw]">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.79vw] font-bold text-emerald-900 flex items-center gap-[0.3vw]">
                              <CheckCircle2 className="w-[0.75vw] h-[0.75vw] text-emerald-700" />
                              Closure Report ({closure.status})
                            </span>
                            {closure.resolutionType && (
                              <span className="text-[0.71vw] font-bold bg-white text-emerald-800 px-[0.4vw] py-[0.08vw] rounded border-2 border-emerald-300">
                                {closure.resolutionType}
                              </span>
                            )}
                          </div>
                          {closure.remarks && (
                            <div className="text-[0.81vw] text-emerald-950 font-medium leading-relaxed">
                              {closure.remarks}
                            </div>
                          )}
                          <div className="text-[0.73vw] text-emerald-800 font-bold pt-[0.1vw]">
                            Closed by: <span className="text-emerald-950 font-black">{closure.closedByName || closure.userName || "Engineer"}</span>
                            {closure.closedAt && ` on ${fmtDate(closure.closedAt)}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AUDIT TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white border-2 border-slate-300 rounded-[0.8vw] p-[1.1vw] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] space-y-[0.9vw]">
              <div className="text-[0.85vw] font-bold text-slate-900 pb-[0.6vw] border-b-2 border-slate-200 flex items-center gap-[0.4vw]">
                <div className="p-[0.28vw] rounded-[0.35vw] bg-indigo-50 text-indigo-700">
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
                    ...(prod._escalationHistory || []).map((eh) => {
                      const toTarget =
                        eh.escalatedToName ||
                        eh.engineerName ||
                        eh.assignedToName ||
                        (eh.department ? `Dept: ${eh.department}` : null);
                      const byUser = eh.updatedByName || eh.escalatedByName || eh.by || "System Automation";

                      let titleStr = `P#${pIdx + 1} - ${eh.status || "Escalated"}`;
                      if (toTarget) {
                        titleStr = `P#${pIdx + 1} - ${eh.status || "Escalated"} to ${toTarget}`;
                      }

                      return {
                        title: titleStr,
                        time: eh.assignedAt || eh.timestamp,
                        person: byUser,
                        target: toTarget,
                        details: eh.reason || eh.remarks || (eh.level !== undefined ? `Level ${eh.level}` : ""),
                        type: "escalate",
                      };
                    }),
                    ...(prod._history || []).map((h) => {
                      const meta = h.metadata || {};
                      const targetPerson =
                        meta.supportPerson?.name ||
                        meta.supportPersonName ||
                        meta.assignedToName ||
                        meta.assignedTo ||
                        meta.previousAssigneeName ||
                        prod._supportPersonName ||
                        null;

                      const statusName = h.status || "Activity";
                      let titleStr = `P#${pIdx + 1} - ${statusName}`;

                      if (statusName === "Support Requested" && targetPerson) {
                        titleStr = `P#${pIdx + 1} - Support Requested to ${targetPerson}`;
                      } else if (statusName === "Field Visit Assigned" && targetPerson) {
                        titleStr = `P#${pIdx + 1} - Field Visit Assigned to ${targetPerson}`;
                      } else if (statusName === "Auto Escalated" && targetPerson) {
                        titleStr = `P#${pIdx + 1} - Auto Escalated to ${targetPerson}`;
                      } else if (statusName === "Critical Escalation" && targetPerson) {
                        titleStr = `P#${pIdx + 1} - Critical Escalation to ${targetPerson}`;
                      } else if (statusName.includes("Reverse Escalate") && targetPerson) {
                        titleStr = `P#${pIdx + 1} - Reverse Escalated to ${targetPerson}`;
                      }

                      return {
                        title: titleStr,
                        time: h.timestamp || h.date,
                        person: h.updatedByName || h.updatedBy || "System",
                        target: targetPerson,
                        details: h.remarks || h.reason || "",
                        type: "activity",
                      };
                    }),
                  ]),
                ].sort((a, b) => {
                  const tA = parseTimestamp(a.time);
                  const tB = parseTimestamp(b.time);
                  return tB - tA;
                });

                if (timelineEvents.length === 0) {
                  return (
                    <div className="text-center py-[2vw] text-slate-400 text-[0.81vw] font-medium">
                      No historical events recorded for this call.
                    </div>
                  );
                }

                return (
                  <div className="relative pl-[2vw] space-y-[0.65vw]">
                    {/* Vertical timeline line precisely running through the dot column */}
                    <div className="absolute left-[0.7vw] -translate-x-1/2 top-[0.6vw] bottom-[0.6vw] w-[2px] bg-slate-200 pointer-events-none" />

                    {timelineEvents.map((ev, i) => {
                      const isCritical = ev.title.includes("Critical");
                      const isEscalation = ev.title.includes("Escalat") || ev.type === "escalate";
                      const isResolved = ev.title.includes("Resolved") || ev.title.includes("Closed");

                      let dotColor = "bg-blue-600";
                      let cardBorder = "border-2 border-slate-300 bg-slate-100/70";

                      if (isCritical) {
                        dotColor = "bg-rose-600";
                        cardBorder = "border-2 border-rose-300 bg-rose-50/70";
                      } else if (isEscalation) {
                        dotColor = "bg-orange-500";
                        cardBorder = "border-2 border-amber-300 bg-amber-50/70";
                      } else if (isResolved) {
                        dotColor = "bg-emerald-600";
                        cardBorder = "border-2 border-emerald-300 bg-emerald-50/70";
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
                                {fmtDate(ev.time)}
                              </span>
                            </div>
                            <div className="text-[0.77vw] text-slate-800 mt-[0.15vw] leading-relaxed font-medium flex items-center flex-wrap gap-x-[0.35vw]">
                              <span>
                                By <span className="text-slate-950 font-bold">{ev.person}</span>
                              </span>
                              {ev.target && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span>
                                    To: <span className="text-slate-950 font-bold">{ev.target}</span>
                                  </span>
                                </>
                              )}
                              {ev.details && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span>{ev.details}</span>
                                </>
                              )}
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
        <div className="px-[1.6vw] py-[0.9vw] border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.3vw] h-[2.1vw] text-[0.79vw] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
