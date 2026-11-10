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
  CheckCircle,
  FileText,
  Activity,
  Layers,
  Wrench,
  Download,
  Copy,
  Check,
  Building,
  Hash,
  ExternalLink,
  Tag,
  AlertCircle,
  Briefcase,
  ChevronRight
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
    const map = {
      Low: "bg-emerald-50 text-emerald-700 border-emerald-250 ring-1 ring-emerald-500/10",
      Medium: "bg-amber-50 text-amber-700 border-amber-250 ring-1 ring-amber-500/10",
      High: "bg-orange-50 text-orange-700 border-orange-250 ring-1 ring-orange-500/10",
      Critical: "bg-rose-50 text-rose-700 border-rose-250 ring-1 ring-rose-500/20 animate-pulse",
    };
    return map[p] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (s) => {
    const map = {
      Resolved: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/10",
      Closed: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/10",
      Pending: "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500/10",
      Assigned: "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-500/10",
      "Field Visit": "bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-500/10",
      "Field Visit Required": "bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-500/10",
      Escalated: "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/10",
      Registered: "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/10",
    };
    return map[s] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "products", label: `Products (${products.length})`, icon: Wrench },
    { id: "timeline", label: "Audit Timeline", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-[1.2vw] shadow-2xl border border-slate-200/90 w-full max-w-[56vw] max-h-[88vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[1.6vw] py-[1.1vw] border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.9vw]">
            <div className="w-[2.6vw] h-[2.6vw] rounded-[0.7vw] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
              <FileText className="w-[1.3vw] h-[1.3vw]" />
            </div>
            <div>
              <div className="flex items-center gap-[0.55vw]">
                <h2 className="text-[1.15vw] font-black text-slate-900 tracking-tight font-mono">
                  {call.callNumber || "Service Call"}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCallNo}
                  className="p-[0.25vw] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                  title="Copy Call Number"
                >
                  {copied ? (
                    <Check className="w-[0.85vw] h-[0.85vw] text-emerald-600" />
                  ) : (
                    <Copy className="w-[0.85vw] h-[0.85vw]" />
                  )}
                </button>
                <span
                  className={`px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-bold border tracking-wide uppercase ${getStatusBadge(
                    call.status || "Assigned"
                  )}`}
                >
                  {call.status || "Assigned"}
                </span>
                <span
                  className={`px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-bold border tracking-wide uppercase ${getPriorityBadge(
                    call.priority || "Medium"
                  )}`}
                >
                  {call.priority || "Medium"}
                </span>
              </div>
              <p className="text-[0.74vw] text-slate-500 font-medium mt-[0.15vw] flex items-center gap-[0.35vw]">
                <Clock className="w-[0.72vw] h-[0.72vw] text-slate-400" />
                <span>Registered on <span className="font-semibold text-slate-700">{fmtDate(call.dateTime || call.createdAt)}</span></span>
                {call.registeredByName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>by <span className="font-semibold text-slate-700">{call.registeredByName}</span></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[0.8vw]">
            {/* View Tabs */}
            <div className="flex items-center bg-slate-100/90 p-[0.25vw] rounded-[0.6vw] border border-slate-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-[0.35vw] px-[0.8vw] py-[0.38vw] rounded-[0.45vw] text-[0.74vw] font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                  >
                    <Icon className="w-[0.8vw] h-[0.8vw]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-[0.4vw] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-[1.1vw] h-[1.1vw]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-[1.6vw] overflow-y-auto flex-1 min-h-0 bg-slate-50/60 space-y-[1.2vw]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-[1.2vw]">
              {/* Customer & Call Cards */}
              <div className="grid grid-cols-2 gap-[1.2vw]">
                {/* Customer Information Card */}
                <div className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.2vw] shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between pb-[0.7vw] border-b border-slate-100">
                    <div className="flex items-center gap-[0.45vw] text-[0.84vw] font-bold text-slate-900">
                      <div className="p-[0.3vw] rounded-[0.4vw] bg-indigo-50 text-indigo-600">
                        <Building className="w-[0.9vw] h-[0.9vw]" />
                      </div>
                      Customer Details
                    </div>
                    {call.partyCode && (
                      <span className="font-mono text-[0.7vw] font-bold text-slate-600 bg-slate-100 px-[0.45vw] py-[0.1vw] rounded">
                        {call.partyCode}
                      </span>
                    )}
                  </div>
                  <div className="mt-[0.9vw] space-y-[0.6vw] text-[0.78vw]">
                    <div className="flex items-start justify-between">
                      <span className="text-slate-400 font-medium">Customer Name</span>
                      <span className="font-bold text-slate-900 text-right max-w-[18vw]">
                        {call.customerName || "—"}
                      </span>
                    </div>
                    {call.customerType && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Customer Type</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-[0.5vw] py-[0.08vw] rounded text-[0.72vw] border border-indigo-200">
                          {call.customerType}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Contact Number</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-[0.35vw]">
                        <Phone className="w-[0.72vw] h-[0.72vw] text-slate-400" />
                        {call.contactNumber || "—"}
                      </span>
                    </div>
                    {call.emailId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Email Address</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-[0.35vw]">
                          <Mail className="w-[0.72vw] h-[0.72vw] text-slate-400" />
                          {call.emailId}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <span className="text-slate-400 font-medium">Location</span>
                      <span className="font-semibold text-slate-800 text-right flex items-center gap-[0.35vw] max-w-[18vw]">
                        <MapPin className="w-[0.72vw] h-[0.72vw] text-slate-400 shrink-0 mt-[0.1vw]" />
                        {call.location || "—"}
                      </span>
                    </div>
                    {call.site && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Site / Branch</span>
                        <span className="font-semibold text-slate-800">{call.site}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Call Metadata Card */}
                <div className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.2vw] shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between pb-[0.7vw] border-b border-slate-100">
                    <div className="flex items-center gap-[0.45vw] text-[0.84vw] font-bold text-slate-900">
                      <div className="p-[0.3vw] rounded-[0.4vw] bg-blue-50 text-blue-600">
                        <Briefcase className="w-[0.9vw] h-[0.9vw]" />
                      </div>
                      Call Attributes
                    </div>
                    <span className="font-bold text-[0.7vw] text-slate-700 bg-slate-100 px-[0.45vw] py-[0.1vw] rounded">
                      {products.length} Item{products.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-[0.9vw] space-y-[0.6vw] text-[0.78vw]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Call Mode</span>
                      <span className="font-bold text-slate-800">{call.mode || "Non Portal"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Current Engineer</span>
                      <span className="font-bold text-indigo-700">
                        {call.currentEngineerName || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Department</span>
                      <span className="font-semibold text-slate-700">
                        {call.currentDepartment || "Service"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Registered Date</span>
                      <span className="font-semibold text-slate-800">
                        {fmtDate(call.dateTime || call.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Registered By</span>
                      <span className="font-semibold text-slate-800">
                        {call.registeredByName || call.registeredBy || "System"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Priority Level</span>
                      <span className={`px-[0.45vw] py-[0.08vw] rounded-full text-[0.68vw] font-bold border uppercase tracking-wider ${getPriorityBadge(call.priority || "Medium")}`}>
                        {call.priority || "Medium"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Products Summary */}
              <div className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.2vw] shadow-xs">
                <div className="text-[0.84vw] font-bold text-slate-900 pb-[0.7vw] border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-[0.45vw]">
                    <div className="p-[0.3vw] rounded-[0.4vw] bg-indigo-50 text-indigo-600">
                      <Wrench className="w-[0.9vw] h-[0.9vw]" />
                    </div>
                    Product Summary ({products.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-[0.74vw] text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-[0.2vw] transition-colors cursor-pointer"
                  >
                    View Details
                    <ChevronRight className="w-[0.75vw] h-[0.75vw]" />
                  </button>
                </div>
                <div className="mt-[0.8vw] divide-y divide-slate-100">
                  {products.map((p, idx) => (
                    <div key={idx} className="py-[0.65vw] first:pt-0 last:pb-0 flex items-center justify-between text-[0.78vw]">
                      <div className="flex items-center gap-[0.75vw]">
                        <span className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw] bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[0.7vw]">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">
                            {p.productModel || p.productName || p.itemCode || "Product"}
                          </div>
                          <div className="text-[0.7vw] text-slate-500 font-mono mt-[0.05vw]">
                            SN: <span className="text-slate-700 font-semibold">{p.serialNumber || "N/A"}</span> • Segment: {p.productSegment || "General"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.7vw]">
                        {p.errorCode && (
                          <span className="px-[0.45vw] py-[0.1vw] bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-[0.7vw] rounded">
                            Err: {p.errorCode}
                          </span>
                        )}
                        <span
                          className={`px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-bold border tracking-wide uppercase ${getStatusBadge(
                            p._productClosure?.status || (p._resolved ? "Resolved" : "Open")
                          )}`}
                        >
                          {p._productClosure?.status || (p._resolved ? "Resolved" : "Open")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS DETAILED */}
          {activeTab === "products" && (
            <div className="space-y-[1vw]">
              {products.map((p, idx) => {
                const closure = p._productClosure || {};
                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.2vw] shadow-xs space-y-[0.8vw]"
                  >
                    <div className="flex items-center justify-between pb-[0.6vw] border-b border-slate-100">
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="px-[0.5vw] py-[0.2vw] rounded-[0.4vw] bg-indigo-50 text-indigo-700 font-mono font-bold text-[0.74vw] border border-indigo-200">
                          Product #{idx + 1}
                        </span>
                        <h4 className="text-[0.95vw] font-bold text-slate-900">
                          {p.productModel || p.productName || p.itemCode || "Item"}
                        </h4>
                      </div>
                      <span
                        className={`px-[0.55vw] py-[0.12vw] rounded-full text-[0.68vw] font-bold border tracking-wide uppercase ${getStatusBadge(
                          closure.status || (p._resolved ? "Resolved" : "Open")
                        )}`}
                      >
                        {closure.status || (p._resolved ? "Resolved" : "Open")}
                      </span>
                    </div>

                    {/* Product Specs Grid */}
                    <div className="grid grid-cols-4 gap-[1vw] text-[0.78vw] bg-slate-50/80 p-[0.8vw] rounded-[0.6vw] border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium uppercase tracking-wider">Serial Number</span>
                        <span className="font-mono font-bold text-slate-800 text-[0.8vw] mt-[0.1vw] block">{p.serialNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium uppercase tracking-wider">Product Segment</span>
                        <span className="font-semibold text-slate-800 text-[0.8vw] mt-[0.1vw] block">{p.productSegment || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium uppercase tracking-wider">Warranty Status</span>
                        <span className="font-semibold text-slate-800 text-[0.8vw] mt-[0.1vw] block">{p.warrantyStatus || "In Warranty"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium uppercase tracking-wider">Error Code</span>
                        <span className="font-mono font-bold text-rose-600 text-[0.8vw] mt-[0.1vw] block">{p.errorCode || "—"}</span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    {p.callDescription && (
                      <div>
                        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-wider block mb-[0.25vw]">
                          Reported Issue
                        </span>
                        <div className="text-[0.78vw] text-slate-800 bg-slate-50 p-[0.7vw] rounded-[0.5vw] border border-slate-200 font-medium leading-relaxed">
                          {p.callDescription}
                        </div>
                      </div>
                    )}

                    {/* Closure Report Section */}
                    {closure.status && (
                      <div className="bg-emerald-50/60 border border-emerald-250 rounded-[0.6vw] p-[0.9vw] space-y-[0.45vw]">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.76vw] font-bold text-emerald-900 flex items-center gap-[0.35vw]">
                            <CheckCircle className="w-[0.85vw] h-[0.85vw] text-emerald-600" />
                            Submitted Closure Report ({closure.status})
                          </span>
                          {closure.resolutionType && (
                            <span className="text-[0.7vw] font-bold bg-white text-emerald-700 px-[0.45vw] py-[0.1vw] rounded border border-emerald-200">
                              {closure.resolutionType}
                            </span>
                          )}
                        </div>
                        {closure.remarks && (
                          <div className="text-[0.78vw] text-emerald-950 font-medium leading-relaxed">
                            {closure.remarks}
                          </div>
                        )}
                        <div className="text-[0.7vw] text-emerald-700/90 font-medium">
                          Closed by: <span className="font-bold text-emerald-900">{closure.closedByName || closure.userName || "Engineer"}</span>
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
            <div className="bg-white border border-slate-200/90 rounded-[0.9vw] p-[1.4vw] shadow-xs space-y-[1vw]">
              <div className="text-[0.85vw] font-bold text-slate-900 pb-[0.7vw] border-b border-slate-100 flex items-center gap-[0.45vw]">
                <div className="p-[0.3vw] rounded-[0.4vw] bg-indigo-50 text-indigo-600">
                  <Activity className="w-[0.9vw] h-[0.9vw]" />
                </div>
                Complete Lifecycle History & Audits
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
                    <div className="text-center py-[2vw] text-slate-400 text-[0.8vw]">
                      No historical events recorded for this call.
                    </div>
                  );
                }

                return (
                  <div className="relative pl-[1.4vw] space-y-[0.9vw] before:absolute before:left-[0.55vw] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {timelineEvents.map((ev, i) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-[1.4vw] top-1.5 w-[0.6vw] h-[0.6vw] rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-[0.6vw] p-[0.75vw] hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between text-[0.76vw]">
                            <span className="font-bold text-slate-900">{ev.title}</span>
                            <span className="text-slate-400 font-mono text-[0.72vw]">{fmtDate(ev.time)}</span>
                          </div>
                          <div className="text-[0.74vw] text-slate-600 mt-[0.2vw]">
                            By <span className="font-semibold text-slate-800">{ev.person}</span> • {ev.details}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-[1.6vw] py-[0.9vw] border-t border-slate-200/80 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.4vw] py-[0.5vw] text-[0.8vw] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[0.5vw] transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
