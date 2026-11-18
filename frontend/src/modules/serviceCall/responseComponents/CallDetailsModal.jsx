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

  const isSelfAssigned = Boolean(
    call.noEscalation === true ||
    call.callOrigin === "self_assigned" ||
    call.isSelfAssigned
  );

  const statusCfg = getStatusBadge(call.status || "Assigned");
  const priorityCfg = getPriorityBadge(call.priority || "Medium");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-5.5 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-[835px] max-h-[88vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-medium text-xs text-slate-900 tracking-tight">
                  {call.callNumber || "Service Call"}
                </span>

                <button
                  type="button"
                  onClick={handleCopyCallNo}
                  className="p-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                  title="Copy Call Reference"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {/* Status Pill (hidden if 'Assigned' when call is already Self Assigned) */}
                {(!isSelfAssigned || (statusCfg.label !== "Assigned" && statusCfg.label !== "Registered")) && (
                  <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-sm font-normal border ${statusCfg.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                )}

                {/* Priority Pill */}
                <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-sm font-normal border ${priorityCfg.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                  {priorityCfg.label}
                </span>

                {isSelfAssigned && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-full text-sm font-normal bg-teal-50 text-teal-700 border border-teal-200">
                    <UserCheck className="w-2.5 h-2.5" />
                    Self Assigned
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-700 font-normal mt-px flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-slate-700 shrink-0" />
                <span>
                  Registered on <span className="text-slate-700 font-normal">{fmtDate(call.dateTime || call.createdAt)}</span>
                </span>
                {call.registeredByName && call.registeredByName !== "System" && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>
                      by <span className="text-slate-700 font-normal">{call.registeredByName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Segmented Navigation Tabs */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/90 gap-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-normal transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-medium"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isActive ? "text-white" : "text-slate-700"}`} />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`text-sm font-semibold ml-px ${
                          isActive
                            ? "bg-white/20 text-white px-1.5 py-0 rounded-full"
                            : "text-slate-700"
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
              className="p-1.5 text-slate-700 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY ──────────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-[#f8fafd] space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Customer & Call Attributes Cards */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Customer Details Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                        <Building2 className="w-3 h-3" />
                      </div>
                      <span>Customer Details</span>
                    </div>
                    {call.partyCode && (
                      <span className="font-mono text-sm font-normal text-slate-600 bg-slate-100 px-1.5 py-px rounded border border-slate-200">
                        {call.partyCode}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-700 font-normal">Customer Name</span>
                      <span className="font-normal text-slate-800 text-right max-w-[259px] leading-snug">
                        {call.customerName || "—"}
                      </span>
                    </div>

                    {call.customerType && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">Customer Type</span>
                        <span className={`px-1.5 py-px rounded-full text-sm font-normal border ${getCustomerTypePill(call.customerType)}`}>
                          {call.customerType}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-normal">Contact Number</span>
                      {call.contactNumber ? (
                        <a
                          href={`tel:${call.contactNumber}`}
                          className="font-normal text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                          <span>{call.contactNumber}</span>
                        </a>
                      ) : (
                        <span className="text-slate-700 font-normal">—</span>
                      )}
                    </div>

                    {call.contactPerson && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">Contact Person</span>
                        <span className="font-normal text-slate-800">{call.contactPerson}</span>
                      </div>
                    )}

                    {call.emailId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">Email Address</span>
                        <a
                          href={`mailto:${call.emailId}`}
                          className="font-normal text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                          <span>{call.emailId}</span>
                        </a>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-700 font-normal">Location</span>
                      <span className="font-normal text-slate-800 text-right flex items-start justify-end gap-1 max-w-[259px] leading-snug">
                        <MapPin className="w-2.5 h-2.5 text-slate-700 shrink-0 mt-0.5" />
                        <span>{call.location || "—"}</span>
                      </span>
                    </div>

                    {call.site && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">Site / Branch</span>
                        <span className="font-normal text-slate-800">{call.site}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Call Attributes Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                        <Briefcase className="w-3 h-3" />
                      </div>
                      <span>Call Attributes</span>
                    </div>
                    <span className="font-normal text-sm text-slate-600 bg-slate-100 px-1.5 py-px rounded border border-slate-200">
                      {products.length} Item{products.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-normal">Call Mode</span>
                      <span className="font-normal text-slate-800">{call.mode || "Phone"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-normal">Current Engineer</span>
                      <span className="font-normal text-indigo-700 bg-indigo-50 px-1.5 py-px rounded text-xs border border-indigo-100">
                        {call.currentEngineerName || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-normal">Department</span>
                      <span className="font-normal text-slate-800">
                        {call.currentDepartment || "Support Engineers"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-normal">Registered By</span>
                      <span className="font-normal text-slate-800">
                        {call.registeredByName || call.registeredBy || "System"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Products Summary Section */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                <div className="text-xs font-medium text-slate-800 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                      <Wrench className="w-3 h-3" />
                    </div>
                    <span>Product Summary ({products.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-sm text-blue-600 font-normal hover:text-blue-800 flex items-center gap-0.5 transition-colors cursor-pointer group"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="mt-2.5 divide-y divide-slate-100">
                  {products.map((p, idx) => {
                    const closureStatus = p._productClosure?.status || (p._resolved ? "Resolved" : "Open");
                    const pStatusCfg = getStatusBadge(closureStatus);

                    return (
                      <div
                        key={idx}
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-slate-50/70 px-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5.5 h-5.5 rounded bg-slate-100 text-slate-600 font-normal flex items-center justify-center text-sm border border-slate-200">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-slate-800 text-sm">
                              {p.productModel || p.productName || p.itemCode || "Product"}
                            </div>
                            <div className="text-sm text-slate-700 font-mono mt-px flex items-center gap-1.5">
                              <span>SN: <span className="text-slate-600 font-normal">{p.serialNumber || "N/A"}</span></span>
                              <span className="text-slate-600">•</span>
                              <span>Segment: <span className="text-slate-600 font-normal">{p.productSegment || "General"}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {p.errorCode && (
                            <span className="px-1.5 py-px bg-rose-50 border border-rose-200 text-rose-700 font-mono font-normal text-sm rounded">
                              Err: {p.errorCode}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-sm font-normal border uppercase tracking-wide ${pStatusCfg.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pStatusCfg.dot}`} />
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
            <div className="space-y-3.5">
              {products.map((p, idx) => {
                const closure = p._productClosure || {};
                const closureStatus = closure.status || (p._resolved ? "Resolved" : "Open");
                const pStatusCfg = getStatusBadge(closureStatus);

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-normal text-sm border border-blue-200">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-medium text-slate-800">
                          {p.productModel || p.productName || p.itemCode || "Item"}
                        </h4>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-sm font-normal border uppercase tracking-wide ${pStatusCfg.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pStatusCfg.dot}`} />
                        {pStatusCfg.label}
                      </span>
                    </div>

                    {/* Product Specs Grid */}
                    <div className="grid grid-cols-4 gap-2.5 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                      <div className="bg-white p-2 rounded border border-slate-200/70">
                        <span className="text-slate-700 block text-xs font-normal uppercase tracking-wider">Serial Number</span>
                        <span className="font-mono font-normal text-slate-800 text-xs mt-px block">
                          {p.serialNumber || "—"}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200/70">
                        <span className="text-slate-700 block text-xs font-normal uppercase tracking-wider">Product Segment</span>
                        <span className="font-normal text-slate-800 text-xs mt-px block">
                          {p.productSegment || "—"}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200/70">
                        <span className="text-slate-700 block text-xs font-normal uppercase tracking-wider">Warranty Status</span>
                        <span className="font-normal text-slate-800 text-xs mt-px block">
                          {p.warrantyStatus || "In Warranty"}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200/70">
                        <span className="text-slate-700 block text-xs font-normal uppercase tracking-wider">Error Code</span>
                        <span className="font-mono font-normal text-rose-600 text-xs mt-px block">
                          {p.errorCode || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div>
                      <span className="text-sm font-normal text-slate-700 uppercase tracking-wider block mb-1">
                        Reported Issue
                      </span>
                      <div className="text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded border border-slate-200 font-normal leading-relaxed">
                        {p.callDescription ? p.callDescription : <span className="text-slate-700 italic">No specific issue description entered.</span>}
                      </div>
                    </div>

                    {/* Closure Report Section */}
                    {closure.status && (
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-normal text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Closure Report ({closure.status})
                          </span>
                          {closure.resolutionType && (
                            <span className="text-sm font-normal bg-white text-emerald-700 px-1.5 py-px rounded border border-emerald-200">
                              {closure.resolutionType}
                            </span>
                          )}
                        </div>
                        {closure.remarks && (
                          <div className="text-xs text-emerald-950 font-normal leading-relaxed bg-white/80 p-2 rounded border border-emerald-100">
                            {closure.remarks}
                          </div>
                        )}
                        <div className="text-sm text-emerald-700 font-normal pt-px">
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
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
              <div className="text-xs font-medium text-slate-800 pb-2.5 border-b border-slate-100 flex items-center gap-1.5">
                <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                  <Activity className="w-3 h-3" />
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
                    <div className="text-center py-7 text-slate-700 text-xs font-normal">
                      No historical events recorded for this call.
                    </div>
                  );
                }

                return (
                  <div className="relative pl-7 space-y-2.5">
                    {/* Vertical timeline line precisely running through the dot column */}
                    <div className="absolute left-[10px] -translate-x-1/2 top-[9px] bottom-[9px] w-0.5 bg-slate-200 pointer-events-none" />

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
                          {/* Dot positioned cleanly in the gutter at -left-[19px], exactly centered on the line at left-[10px] */}
                          <div
                            className={`absolute -left-[19px] -translate-x-1/2 top-[10px] w-2 h-2 rounded-full ${dotColor} ring-4 ring-white shadow-2xs z-10`}
                          />

                          <div className={`border rounded-lg p-2.5 transition-colors ${cardBorder} hover:bg-white`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-normal text-slate-800">{ev.title}</span>
                              <span className="text-slate-700 font-mono text-sm">
                                {fmtDate(ev.time)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 mt-0.5 leading-relaxed font-normal flex items-center flex-wrap gap-x-1.5">
                              <span>
                                By <span className="text-slate-800">{ev.person}</span>
                              </span>
                              {ev.target && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span>
                                    To: <span className="text-slate-800">{ev.target}</span>
                                  </span>
                                </>
                              )}
                              {ev.details && (
                                <>
                                  <span className="text-slate-600">•</span>
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
        <div className="px-6 py-3.5 border-t border-slate-200/90 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[19px] h-7 text-xs font-normal text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
