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
  ExternalLink
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

  const fmtDate = (d) => {
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

  const getPriorityBadge = (p) => {
    const map = {
      Low: "bg-emerald-50 text-emerald-700 border-emerald-250",
      Medium: "bg-amber-50 text-amber-700 border-amber-250",
      High: "bg-orange-50 text-orange-700 border-orange-250",
      Critical: "bg-rose-50 text-rose-700 border-rose-250 animate-pulse",
    };
    return map[p] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (s) => {
    const map = {
      Resolved: "bg-emerald-50 text-emerald-700 border-emerald-300",
      Closed: "bg-emerald-50 text-emerald-700 border-emerald-300",
      Pending: "bg-amber-50 text-amber-700 border-amber-300",
      Assigned: "bg-indigo-50 text-indigo-700 border-indigo-300",
      "Field Visit": "bg-purple-50 text-purple-700 border-purple-300",
      Escalated: "bg-rose-50 text-rose-700 border-rose-300",
      Registered: "bg-blue-50 text-blue-700 border-blue-300",
    };
    return map[s] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-[1vw]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="bg-white rounded-[1vw] shadow-2xl border border-slate-200 w-full max-w-[54vw] max-h-[88vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.7vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-[0.6vw] bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <FileText className="w-[1.2vw] h-[1.2vw]" />
            </div>
            <div>
              <div className="flex items-center gap-[0.5vw]">
                <h2 className="text-[1.05vw] font-black text-slate-900 tracking-tight">
                  {call.callNumber || "Service Call"}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCallNo}
                  className="p-[0.2vw] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                  title="Copy Call Number"
                >
                  {copied ? (
                    <Check className="w-[0.8vw] h-[0.8vw] text-emerald-600" />
                  ) : (
                    <Copy className="w-[0.8vw] h-[0.8vw]" />
                  )}
                </button>
                <span
                  className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold border ${getStatusBadge(
                    call.status || "Assigned"
                  )}`}
                >
                  {call.status || "Assigned"}
                </span>
                <span
                  className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold border ${getPriorityBadge(
                    call.priority || "Medium"
                  )}`}
                >
                  {call.priority || "Medium"}
                </span>
              </div>
              <p className="text-[0.72vw] text-slate-500 font-medium mt-[0.1vw]">
                Registered on {fmtDate(call.dateTime || call.createdAt)}
                {call.registeredByName && ` • by ${call.registeredByName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[0.6vw]">
            {/* View Tabs */}
            <div className="flex items-center bg-slate-100 p-[0.2vw] rounded-[0.5vw] border border-slate-200">
              {[
                { id: "overview", label: "Overview", icon: Layers },
                { id: "products", label: `Products (${products.length})`, icon: Wrench },
                { id: "timeline", label: "Audit Timeline", icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-[0.3vw] px-[0.7vw] py-[0.3vw] rounded-[0.38vw] text-[0.72vw] font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-[0.75vw] h-[0.75vw]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-[0.35vw] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[0.4vw] transition-colors cursor-pointer"
            >
              <X className="w-[1.1vw] h-[1.1vw]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-[1.4vw] overflow-y-auto flex-1 min-h-0 bg-slate-50/50 space-y-[1vw]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-[1vw]">
              {/* Customer & Call Cards */}
              <div className="grid grid-cols-2 gap-[1vw]">
                {/* Customer Information Card */}
                <div className="bg-white border border-slate-200 rounded-[0.7vw] p-[1.1vw] shadow-xs">
                  <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-bold text-slate-800 pb-[0.6vw] border-b border-slate-100">
                    <Building className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                    Customer Details
                  </div>
                  <div className="mt-[0.7vw] space-y-[0.55vw] text-[0.76vw]">
                    <div className="flex items-start justify-between">
                      <span className="text-slate-500 font-medium">Customer Name:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {call.customerName || "—"}
                      </span>
                    </div>
                    {call.partyCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Party Code:</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {call.partyCode}
                        </span>
                      </div>
                    )}
                    {call.customerType && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Customer Type:</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-[0.4vw] py-[0.05vw] rounded text-[0.7vw] border border-indigo-200">
                          {call.customerType}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Contact Number:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-[0.3vw]">
                        <Phone className="w-[0.7vw] h-[0.7vw] text-slate-400" />
                        {call.contactNumber || "—"}
                      </span>
                    </div>
                    {call.emailId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Email:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-[0.3vw]">
                          <Mail className="w-[0.7vw] h-[0.7vw] text-slate-400" />
                          {call.emailId}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <span className="text-slate-500 font-medium">Location:</span>
                      <span className="font-semibold text-slate-800 text-right flex items-center gap-[0.3vw]">
                        <MapPin className="w-[0.7vw] h-[0.7vw] text-slate-400 shrink-0" />
                        {call.location || "—"}
                      </span>
                    </div>
                    {call.site && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Site:</span>
                        <span className="font-semibold text-slate-800">{call.site}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Call Metadata Card */}
                <div className="bg-white border border-slate-200 rounded-[0.7vw] p-[1.1vw] shadow-xs">
                  <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-bold text-slate-800 pb-[0.6vw] border-b border-slate-100">
                    <Shield className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                    Call Attributes
                  </div>
                  <div className="mt-[0.7vw] space-y-[0.55vw] text-[0.76vw]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Call Mode:</span>
                      <span className="font-bold text-slate-800">{call.mode || "Non Portal"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Current Engineer:</span>
                      <span className="font-bold text-indigo-700">
                        {call.currentEngineerName || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="font-semibold text-slate-700">
                        {call.currentDepartment || "Service"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Registered Date:</span>
                      <span className="font-semibold text-slate-800">
                        {fmtDate(call.dateTime || call.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Registered By:</span>
                      <span className="font-semibold text-slate-800">
                        {call.registeredByName || call.registeredBy || "System"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Total Products:</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-[0.45vw] py-[0.05vw] rounded">
                        {products.length} Item{products.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Products Summary */}
              <div className="bg-white border border-slate-200 rounded-[0.7vw] p-[1.1vw] shadow-xs">
                <div className="text-[0.8vw] font-bold text-slate-800 pb-[0.6vw] border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-[0.4vw]">
                    <Wrench className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                    Product Summary
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="text-[0.72vw] text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    View All {products.length} Products →
                  </button>
                </div>
                <div className="mt-[0.7vw] divide-y divide-slate-100">
                  {products.map((p, idx) => (
                    <div key={idx} className="py-[0.55vw] flex items-center justify-between text-[0.75vw]">
                      <div className="flex items-center gap-[0.6vw]">
                        <span className="w-[1.4vw] h-[1.4vw] rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[0.68vw]">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">
                            {p.productModel || p.productName || p.itemCode || "Product"}
                          </div>
                          <div className="text-[0.68vw] text-slate-500 font-mono">
                            SN: {p.serialNumber || "N/A"} • Segment: {p.productSegment || "General"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.6vw]">
                        {p.errorCode && (
                          <span className="px-[0.4vw] py-[0.08vw] bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-[0.68vw] rounded">
                            Err: {p.errorCode}
                          </span>
                        )}
                        <span
                          className={`px-[0.45vw] py-[0.1vw] rounded-full text-[0.66vw] font-bold border ${getStatusBadge(
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
            <div className="space-y-[0.9vw]">
              {products.map((p, idx) => {
                const closure = p._productClosure || {};
                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-[0.7vw] p-[1.1vw] shadow-xs space-y-[0.7vw]"
                  >
                    <div className="flex items-center justify-between pb-[0.5vw] border-b border-slate-100">
                      <div className="flex items-center gap-[0.5vw]">
                        <span className="px-[0.45vw] py-[0.15vw] rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[0.72vw] border border-indigo-200">
                          Product #{idx + 1}
                        </span>
                        <h4 className="text-[0.88vw] font-bold text-slate-900">
                          {p.productModel || p.productName || p.itemCode || "Item"}
                        </h4>
                      </div>
                      <span
                        className={`px-[0.5vw] py-[0.1vw] rounded-full text-[0.68vw] font-bold border ${getStatusBadge(
                          closure.status || (p._resolved ? "Resolved" : "Open")
                        )}`}
                      >
                        {closure.status || (p._resolved ? "Resolved" : "Open")}
                      </span>
                    </div>

                    {/* Product Specs Grid */}
                    <div className="grid grid-cols-4 gap-[0.8vw] text-[0.75vw] bg-slate-50/70 p-[0.7vw] rounded-[0.5vw] border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium">Serial Number</span>
                        <span className="font-mono font-bold text-slate-800">{p.serialNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium">Product Segment</span>
                        <span className="font-semibold text-slate-800">{p.productSegment || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium">Warranty Status</span>
                        <span className="font-semibold text-slate-800">{p.warrantyStatus || "In Warranty"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[0.68vw] font-medium">Error Code</span>
                        <span className="font-mono font-bold text-rose-600">{p.errorCode || "—"}</span>
                      </div>
                    </div>

                    {/* Issue Description */}
                    {p.callDescription && (
                      <div>
                        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-wider block mb-[0.2vw]">
                          Reported Issue
                        </span>
                        <div className="text-[0.76vw] text-slate-800 bg-slate-50 p-[0.6vw] rounded-[0.4vw] border border-slate-200 font-medium">
                          {p.callDescription}
                        </div>
                      </div>
                    )}

                    {/* Closure Report Section */}
                    {closure.status && (
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-[0.5vw] p-[0.8vw] space-y-[0.4vw]">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.72vw] font-bold text-emerald-800 flex items-center gap-[0.3vw]">
                            <CheckCircle className="w-[0.8vw] h-[0.8vw] text-emerald-600" />
                            Submitted Closure Report ({closure.status})
                          </span>
                          {closure.resolutionType && (
                            <span className="text-[0.68vw] font-bold bg-white text-emerald-700 px-[0.4vw] py-[0.08vw] rounded border border-emerald-200">
                              {closure.resolutionType}
                            </span>
                          )}
                        </div>
                        {closure.remarks && (
                          <div className="text-[0.76vw] text-emerald-950 font-medium">
                            {closure.remarks}
                          </div>
                        )}
                        <div className="text-[0.68vw] text-emerald-700">
                          Closed by: <span className="font-semibold">{closure.closedByName || closure.userName || "Engineer"}</span>
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
            <div className="bg-white border border-slate-200 rounded-[0.7vw] p-[1.1vw] shadow-xs space-y-[0.8vw]">
              <div className="text-[0.8vw] font-bold text-slate-800 pb-[0.5vw] border-b border-slate-100 flex items-center gap-[0.4vw]">
                <Activity className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
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
                ].sort((a, b) => new Date(b.time) - new Date(a.time));

                if (timelineEvents.length === 0) {
                  return (
                    <div className="text-center py-[2vw] text-slate-400 text-[0.78vw]">
                      No historical events recorded for this call.
                    </div>
                  );
                }

                return (
                  <div className="relative pl-[1.2vw] space-y-[0.8vw] before:absolute before:left-[0.45vw] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {timelineEvents.map((ev, i) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-[1.2vw] top-1 w-[0.55vw] h-[0.55vw] rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                        <div className="bg-slate-50 border border-slate-200/80 rounded-[0.45vw] p-[0.6vw]">
                          <div className="flex items-center justify-between text-[0.72vw]">
                            <span className="font-bold text-slate-900">{ev.title}</span>
                            <span className="text-slate-400 font-mono">{fmtDate(ev.time)}</span>
                          </div>
                          <div className="text-[0.72vw] text-slate-600 mt-[0.1vw]">
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
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-[0.72vw] text-slate-500 font-mono">
            ID: {call._id || call.id || call.callNumber}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.4vw] text-[0.78vw] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[0.4vw] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
