import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  AlertTriangle, Clock, History, Shield, CheckSquare, Search, RotateCcw, Calendar, Eye,
  X, BarChart2, Activity, ChevronRight, User, Phone, MapPin, Loader2, Package, Ban, ArrowRightLeft, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEscalationWorker from "../../service/useEscalationWorker";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import { CallDetailsModal } from "./responseComponents/CallDetailsModal";

const API_URL = import.meta.env.VITE_API_URL;

// ── Badge Component ─────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray" }) => {
  const map = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-300",
    blue:   "bg-blue-50 text-blue-700 border-blue-300",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-300",
    red:    "bg-red-50 text-red-700 border-red-300",
    orange: "bg-orange-50 text-orange-700 border-orange-300",
    gray:   "bg-slate-50 text-slate-600 border-slate-300",
  };
  return (
    <span className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full border font-bold shadow-sm whitespace-nowrap ${map[color] || map.gray}`}>
      {label}
    </span>
  );
};

// ── Tracking Modal ────────────────────────────────────────────────────────────
const TrackingModal = ({ entry, onClose }) => {
  if (!entry) return null;
  
  const events = [];
  const seenKeys = new Set();

  const isMultiProduct = (entry.products || []).length > 1;

  // 1. Process Product-level escalations and cancellations first
  (entry.products || []).forEach((p, i) => {
    // Only show badge when there are multiple products (e.g. "Product 1", "Product 2"); hide redundant "Product Level"
    const scopeLabel = isMultiProduct ? `Product ${i + 1}` : null;

    (p._escalationHistory || []).forEach(h => {
      const timeStr = h.assignedAt || h.timestamp;
      const isCancelled = h.status === "Escalation Cancelled" || String(h.status).includes("Cancel");
      const key = `${timeStr}_${h.engineerName}_${isCancelled ? "Cancelled" : h.status}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        events.push({
          time: timeStr,
          deadline: h.deadline,
          person: h.engineerName,
          dept: h.department,
          status: isCancelled ? "Escalation Cancelled" : (h.status || "Assigned"),
          level: h.level || 0,
          remarks: h.remarks || h.reason,
          cancelledBy: h.updatedByName,
          scope: scopeLabel
        });
      }
    });

    (p._history || []).forEach(h => {
      const st = h.status || "";
      if (st.includes("Cancel") || st.includes("Cancelled")) {
        const hTime = h.timestamp || h.metadata?.timestamp;
        const personName = h.metadata?.previousAssigneeName || h.updatedByName || "Admin";
        // Deduplicate cancellation across _history and _escalationHistory
        const key1 = `${hTime}_${personName}_Cancelled`;
        const key2 = `${h.metadata?.timestamp}_${personName}_Cancelled`;
        if (!seenKeys.has(key1) && !seenKeys.has(key2)) {
          seenKeys.add(key1);
          events.push({
            time: hTime,
            deadline: null,
            person: personName,
            dept: h.metadata?.department || "",
            status: "Escalation Cancelled",
            level: 0,
            remarks: h.remarks || h.metadata?.reason || "Escalation cancelled by Admin",
            cancelledBy: h.updatedByName || h.metadata?.cancelledBy,
            scope: scopeLabel
          });
        }
      }
    });
  });

  // 2. Process Call-level events (for single-product calls, skip duplicates already captured at product level)
  (entry.escalationHistory || []).forEach(h => {
    const timeStr = h.assignedAt || h.timestamp;
    const isCancelled = h.status === "Escalation Cancelled" || String(h.status).includes("Cancel");
    const key = `${timeStr}_${h.engineerName}_${isCancelled ? "Cancelled" : h.status}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      events.push({
        time: timeStr,
        deadline: h.deadline,
        person: h.engineerName,
        dept: h.department,
        status: isCancelled ? "Escalation Cancelled" : (h.status || "Assigned"),
        level: h.level || 0,
        remarks: h.remarks || h.reason,
        cancelledBy: h.updatedByName,
        scope: isMultiProduct ? "Call Level" : null
      });
    }
  });
  
  // Sort chronological first to determine transition states correctly
  events.sort((a,b) => new Date(a.time) - new Date(b.time));

  const now = new Date();
  let pastEvents = events.filter(ev => new Date(ev.time) <= now);

  pastEvents = pastEvents.map((ev, index) => {
    const isLast = index === pastEvents.length - 1;
    if (ev.status === "Escalation Cancelled" || ev.status === "Re-assigned by Admin") {
      return ev;
    }
    if (!isLast && (ev.status === "Pending" || ev.status === "Assigned")) {
      return { ...ev, status: ev.remarks?.includes("SLA") ? "SLA Breached" : "Escalated" };
    }
    if (isLast && (ev.status === "Pending" || ev.status === "Assigned")) {
      if (entry.status === "Critical" || (ev.deadline && new Date(ev.deadline) < now)) {
        return { ...ev, status: "SLA Breached" };
      }
    }
    return ev;
  });

  // Reverse so latest event is shown on top
  pastEvents.reverse();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[42vw] rounded-[1vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-slate-400"
      >
        <div className="bg-white px-[1.4vw] py-[1vw] flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-[0.6vw]">
            <div className="p-[0.4vw] bg-indigo-50 rounded-[0.4vw] border border-indigo-100">
              <History className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
            </div>
            <h3 className="text-[1.1vw] font-black text-slate-800 tracking-tight">Escalation History</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-red-600 cursor-pointer transition-colors p-[0.3vw] hover:bg-red-50 rounded-full">
             <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>
        
        <div className="p-[1.4vw] overflow-y-auto flex-1 bg-white">
           <div className="text-[0.85vw] font-black text-slate-800 mb-[1.2vw] flex justify-between items-center border-b border-slate-100 pb-[1vw]">
             <span>{entry.callNumber} - {entry.customerName}</span>
             <Badge label={`Current Status: ${entry.status}`} color="indigo" />
           </div>
           
           {events.length === 0 ? (
             <div className="text-center text-slate-500 font-bold text-[0.8vw] py-[2vw]">No escalation history found.</div>
           ) : (
             <div className="space-y-[0.8vw] pl-[0.5vw]">
               {pastEvents.map((ev, i) => {
                 const isCancelled = ev.status === "Escalation Cancelled";
                 const isHighlightedEvent = ev.status === "SLA Breached" || ev.status === "Critical Escalation";
                 
                 return (
                   <div key={i} className="flex gap-[0.8vw] relative">
                     <div className="flex flex-col items-center">
                       <div className={`w-[0.6vw] h-[0.6vw] rounded-full mt-[0.2vw] z-10 ${
                         isCancelled 
                           ? 'bg-amber-500 ring-2 ring-amber-200' 
                           : isHighlightedEvent 
                             ? 'bg-rose-500 ring-2 ring-rose-200' 
                             : 'bg-indigo-500'
                       }`} />
                       {i !== pastEvents.length - 1 && (
                         <div className="w-[1px] h-full bg-slate-300 absolute top-[0.6vw] bottom-[-0.8vw] left-[0.27vw]" />
                       )}
                     </div>
                     <div className={`flex-1 rounded-[0.5vw] p-[0.6vw] shadow-sm ${
                       isCancelled
                         ? 'bg-amber-50/70 border border-amber-200'
                         : isHighlightedEvent 
                           ? 'bg-rose-50 border-[2px] border-rose-300' 
                           : 'bg-slate-50 border border-slate-200'
                     }`}>
                       <div className="flex justify-between items-start mb-[0.2vw]">
                         <span className={`text-[1vw] font-bold flex items-center gap-[0.4vw] ${
                           isCancelled 
                             ? 'text-amber-900' 
                             : isHighlightedEvent 
                               ? 'text-rose-900' 
                               : 'text-slate-900'
                         }`}>
                           {isCancelled ? (
                             <span className="inline-flex items-center gap-[0.3vw]">
                               <Ban className="w-[0.9vw] h-[0.9vw] text-amber-600 inline" />
                               Escalation Cancelled
                             </span>
                           ) : (
                             ev.status
                           )}
                           {ev.scope && (
                             <span className={`px-[0.4vw] py-[0.1vw] rounded-[0.2vw] text-[0.65vw] ml-[0.2vw] font-black tracking-wide border ${
                               isCancelled
                                 ? 'bg-amber-100 border-amber-300 text-amber-800'
                                 : isHighlightedEvent 
                                   ? 'bg-rose-100 border-rose-300 text-rose-700' 
                                   : 'bg-slate-100 border-slate-300 text-slate-600'
                             }`}>
                               {ev.scope}
                             </span>
                           )}
                         </span>
                         <span className="text-[0.8vw] text-slate-500 font-medium">
                           {new Date(ev.time).toLocaleString('en-US', {
                             month: '2-digit', day: '2-digit', year: 'numeric',
                             hour: '2-digit', minute: '2-digit', hour12: true
                           })}
                         </span>
                       </div>

                       <div className="text-[0.85vw] text-slate-600 mb-[0.2vw]">
                         {isCancelled ? (
                           <>
                             Assigned to: <span className="font-semibold text-slate-800">{ev.person || "N/A"}</span>
                             {ev.cancelledBy && (
                               <span className="text-amber-800 font-semibold ml-[0.5vw]">
                                 (Cancelled by: {ev.cancelledBy})
                               </span>
                             )}
                           </>
                         ) : (
                           <>
                             By: <span className="font-semibold text-slate-800">{ev.person || "System / Auto"}</span> 
                             <span className="text-slate-500 ml-[0.4vw]">({ev.dept || "N/A"}) - Level {ev.level + 1}</span>
                           </>
                         )}
                       </div>
                       
                       {ev.deadline && (
                         <div className="text-[0.75vw] text-slate-600 font-semibold mb-[0.2vw] flex items-center gap-[0.3vw]">
                           <Clock className="w-[0.8vw] h-[0.8vw]" />
                           Deadline: {new Date(ev.deadline).toLocaleString('en-US', {
                             month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                           })}
                         </div>
                       )}
                       
                       {ev.remarks && (
                         <div className={`text-[0.85vw] border rounded-[0.4vw] p-[0.6vw] mt-[0.4vw] font-semibold ${
                           isCancelled
                             ? 'bg-white text-amber-900 border-amber-200'
                             : isHighlightedEvent 
                               ? 'bg-white text-rose-800 border-rose-200' 
                               : 'bg-white text-slate-700 border-slate-200'
                         }`}>
                           {ev.remarks}
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Admin Escalations Component ─────────────────────────────────────────────
const ServiceCallEscalations = () => {
  const { timers, isWorkerReady: workerReady } = useEscalationWorker();
  const { toast } = useNotification();
  const [currentUser] = useState(() => JSON.parse(sessionStorage.getItem("loggedInUser") || "{}"));
  const [employees, setEmployees] = useState([]);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/auth/employees`);
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to load employees for escalation cancellation", err);
      }
    };
    fetchEmployees();
  }, []);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [trackingEntry, setTrackingEntry] = useState(null);
  const [selectedInfoCall, setSelectedInfoCall] = useState(null);

  useEffect(() => {
    if (workerReady) setIsWorkerReady(true);
  }, [workerReady]);

  const fetchCalls = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      // Map _id to callId to match timer logic
      setCalls(data.map(call => ({ ...call, callId: call._id })));
    } catch (err) {
      console.error("Failed to fetch active calls", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelEscalationSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim() || !cancelModal) return;
    setIsSubmittingCancel(true);
    try {
      const selectedEmp = employees.find((emp) => emp.userId === newAssignee);
      await axios.post(`${API_URL}/service-calls/${cancelModal.callId}/product/${cancelModal.pIdx}/cancel-escalation`, {
        adminId: currentUser?.userId,
        adminName: currentUser?.name,
        reason: cancelReason,
        newAssigneeId: selectedEmp?.userId || null,
        newAssigneeName: selectedEmp?.name || null,
        newDepartment: selectedEmp?.department || null,
      });
      toast("Escalation cancelled & updated successfully", "success");
      setCancelModal(null);
      await fetchCalls();
    } catch (err) {
      console.error("Failed to cancel escalation:", err);
      toast(err.response?.data?.message || "Failed to cancel escalation", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const escalatingCalls = useMemo(() => {
    return calls.filter(e => {
      if (e.status === "Resolved" || e.status === "Closed") return false;
      
      // If there are no active, unattended products left on this call, it shouldn't show as escalating
      const hasActiveUnattended = (e.products || []).some(p => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended);
      if (!hasActiveUnattended) return false;

      const timer = timers.find(t => t.callId === e.callId);
      const isExhausted = e.status === "Critical_Unresolved" || e.status === "Critical";
      
      const isCritical = e.status === "Critical_Unresolved" || e.status === "Critical" || e.priority === "Critical" || timer?.isExpired;
      if (priorityFilter !== "All" && e.priority !== priorityFilter) return false;
      if (statusFilter === "Critical" && !isCritical) return false;
      if (statusFilter === "Escalating" && isCritical) return false;

      // Show calls that have an active SLA timer OR have completely exhausted all escalation levels
      return timer != null || isExhausted;
    }).filter(e => {
      // Date filtering
      if (filterFromDate || filterToDate) {
        const callDate = e.dateTime ? new Date(e.dateTime) : new Date(e.createdAt);
        callDate.setHours(0, 0, 0, 0);
        
        if (filterFromDate) {
          const from = new Date(filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (callDate < from) return false;
        }
        if (filterToDate) {
          const to = new Date(filterToDate);
          to.setHours(0, 0, 0, 0);
          if (callDate > to) return false;
        }
      }
      
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      return e.callNumber?.toLowerCase().includes(term) || 
             e.customerName?.toLowerCase().includes(term) ||
             (e.products || []).some(p => p._assignedEngineerName?.toLowerCase().includes(term));
    }).sort((a, b) => {
      let timeA = a.updatedAt || a.createdAt;
      let timeB = b.updatedAt || b.createdAt;
      
      if (a.escalationHistory && a.escalationHistory.length > 0) {
        timeA = a.escalationHistory[0].assignedAt || a.escalationHistory[0].timestamp;
      } else if (a.products && a.products[0] && a.products[0]._escalationHistory && a.products[0]._escalationHistory.length > 0) {
        timeA = a.products[0]._escalationHistory[0].assignedAt || a.products[0]._escalationHistory[0].timestamp;
      }
      
      if (b.escalationHistory && b.escalationHistory.length > 0) {
        timeB = b.escalationHistory[0].assignedAt || b.escalationHistory[0].timestamp;
      } else if (b.products && b.products[0] && b.products[0]._escalationHistory && b.products[0]._escalationHistory.length > 0) {
        timeB = b.products[0]._escalationHistory[0].assignedAt || b.products[0]._escalationHistory[0].timestamp;
      }
      
      return new Date(timeB) - new Date(timeA);
    });
  }, [calls, timers, searchTerm, statusFilter, priorityFilter, filterFromDate, filterToDate]);

  const counts = useMemo(() => {
    let escalating = 0;
    let critical = 0;
    
    calls.forEach(e => {
      if (e.status === "Resolved" || e.status === "Closed") return;
      const hasActiveUnattended = (e.products || []).some(p => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended);
      if (!hasActiveUnattended) return;
      
      const timer = timers.find(t => t.callId === e.callId);
      const isExhausted = e._queueEntry?.status === "Critical_Unresolved" || e.status === "Critical_Unresolved" || e.status === "Critical";
      if (!(timer != null || isExhausted)) return;

      // Date filtering for counts
      if (filterFromDate || filterToDate) {
        const callDate = e.dateTime ? new Date(e.dateTime) : new Date(e.createdAt);
        callDate.setHours(0, 0, 0, 0);
        if (filterFromDate && callDate < new Date(filterFromDate).setHours(0,0,0,0)) return;
        if (filterToDate && callDate > new Date(filterToDate).setHours(0,0,0,0)) return;
      }

      const isCritical = e._queueEntry?.status === "Critical_Unresolved" || e.status === "Critical_Unresolved" || e.status === "Critical" || e.priority === "Critical" || timer?.isExpired;
      if (isCritical) critical++;
      else escalating++;
    });

    return { 
      All: escalating + critical, 
      Escalating: escalating, 
      Critical: critical 
    };
  }, [calls, timers, filterFromDate, filterToDate]);

  return (
    <div className="w-full h-full flex flex-col font-sans min-h-0">
      <div className="flex flex-col gap-[0.55vw] mb-[0.6vw] shrink-0">
        {/* Top Level Scoping Toolbar: Soft Pill Search, Date Range, Status & Priority */}
        <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-[0.7vw] shrink-0">
          {/* Left side: Soft Pill Search Box */}
          <div className="relative w-[18vw]">
            <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
            <input
              type="text"
              placeholder="Search escalations, customer, engineer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.76vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            )}
          </div>

          {/* Right cluster: Status Pills, Date Range Capsule, Clear & Priority */}
          <div className="flex items-center gap-[0.6vw] flex-shrink-0">
            {/* Status Segmented Buttons */}
            <div className="flex items-center gap-[0.3vw] bg-slate-100/80 p-[0.2vw] rounded-full border border-slate-200">
              {[
                { label: "All", count: counts.All, dot: "bg-blue-600" },
                { label: "Escalating", count: counts.Escalating, dot: "bg-amber-500" },
                { label: "Critical", count: counts.Critical, dot: "bg-rose-500" },
              ].map(({ label, count, dot }) => {
                const isActive = statusFilter === label;
                return (
                  <button
                    key={label}
                    onClick={() => setStatusFilter(label)}
                    className={`flex items-center gap-[0.35vw] px-[0.75vw] h-[1.8vw] rounded-full text-[0.72vw] font-bold cursor-pointer transition-all ${
                      isActive
                        ? (label === "Critical" ? "bg-rose-600 text-white shadow-xs" : "bg-blue-600 text-white shadow-xs")
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span className={`w-[0.4vw] h-[0.4vw] rounded-full shrink-0 ${isActive ? "bg-white" : dot}`} />
                    <span>{label}</span>
                    <span className={`text-[0.66vw] px-[0.35vw] py-[0.02vw] rounded-full font-bold ml-[0.1vw] ${
                      isActive ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Unified Date Range Capsule */}
            <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.75vw] shadow-2xs hover:border-slate-300 transition-all">
              <button
                type="button"
                onClick={() => {
                  if (fromDateRef.current) {
                    try { fromDateRef.current.showPicker(); } catch { fromDateRef.current.focus(); }
                  }
                }}
                className="p-0 border-0 bg-transparent cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center"
                title="Choose from date"
              >
                <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0 text-slate-500" />
              </button>
              <span className="text-slate-500 font-medium text-[0.74vw]">From</span>
              <input
                ref={fromDateRef}
                type="date"
                value={filterFromDate || ""}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="no-native-calendar text-[0.75vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
              />
              <span className="text-slate-400 mx-[0.15vw] text-[0.85vw]">→</span>
              <span className="text-slate-500 font-medium text-[0.74vw]">To</span>
              <input
                ref={toDateRef}
                type="date"
                value={filterToDate || ""}
                min={filterFromDate || undefined}
                onChange={(e) => setFilterToDate(e.target.value)}
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
                <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0 text-slate-500" />
              </button>
            </div>

            {/* Reset / Clear Button */}
            {(filterFromDate || filterToDate) && (
              <button
                onClick={() => {
                  setFilterFromDate("");
                  setFilterToDate("");
                }}
                className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.74vw] font-bold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
                title="Clear date filter"
              >
                <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                <span>Clear</span>
              </button>
            )}

            {/* Priority Dropdown (Pill shaped) */}
            <div className="w-[9.5vw]">
              <CustomDropdown
                size="sm"
                align="right"
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(val)}
                options={[
                  { value: "All", label: "All Priorities" },
                  { value: "Critical", label: "Critical Priority" },
                  { value: "High", label: "High Priority" },
                  { value: "Medium", label: "Medium Priority" },
                  { value: "Low", label: "Low Priority" },
                ]}
                triggerClassName="h-[2.2vw] !rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs text-[0.75vw]"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 rounded-[0.8vw] border border-slate-200/80 shadow-xs">
        <div className="flex-1 overflow-y-auto p-[1vw]">
          {loading || !isWorkerReady ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-[3vw] h-[3vw] animate-spin text-indigo-600 mb-[1vw]" />
              <span className="text-[1vw] font-bold text-slate-600">Loading Escalations...</span>
            </div>
          ) : escalatingCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Shield className="w-[4vw] h-[4vw] mb-[1vw] opacity-30 text-emerald-600" />
              <span className="text-[1.1vw] font-bold text-emerald-700">All Clear! No critical or escalating calls right now.</span>
            </div>
          ) : (
            <div className="grid gap-[1vw]">
              {escalatingCalls.map((call, index) => {
                const timer = timers.find(t => t.callId === call.callId);
                const isCritical = call.status === "Critical_Unresolved" || call.status === "Critical" || call.priority === "Critical" || timer?.isExpired;
                
                let escalationStartTime = null;
                if (call.escalationHistory && call.escalationHistory.length > 0) {
                  escalationStartTime = call.escalationHistory[0].assignedAt || call.escalationHistory[0].timestamp;
                } else if (call.products && call.products[0] && call.products[0]._escalationHistory && call.products[0]._escalationHistory.length > 0) {
                  escalationStartTime = call.products[0]._escalationHistory[0].assignedAt || call.products[0]._escalationHistory[0].timestamp;
                }

                return (
                  <div key={call.callId} className={`flex flex-col md:flex-row justify-between p-[1vw] rounded-[0.8vw] shadow-xs hover:shadow-md transition-all border bg-white ${
                    isCritical
                      ? 'border-slate-200 border-l-[0.35vw] border-l-rose-500'
                      : 'border-slate-200 border-l-[0.35vw] border-l-amber-500'
                  }`}>
                    <div className="flex-1 space-y-[0.8vw] pr-[1vw]">
                      <div className="flex items-center gap-[0.8vw] flex-wrap">
                        <div className="flex items-center gap-[0.4vw]">
                          <span className="flex items-center justify-center w-[1.5vw] h-[1.5vw] bg-slate-200 text-slate-700 rounded-full font-bold text-[0.8vw]">
                            {index + 1}
                          </span>
                          <button
                          onClick={() => setSelectedInfoCall(call)}
                          className="font-mono text-[1.05vw] font-bold text-[#6e000a] hover:text-[#990011] hover:underline block leading-tight cursor-pointer"
                          title="View Call Details"
                        >
                          {call.callNumber}
                        </button>
                        </div>
                        <Badge label={call.priority} color={call.priority === "Critical" ? "red" : "slate"} />
                        {call.customerType && (
                          <Badge
                            label={call.customerType}
                            color="cyan"
                          />
                        )}
                        {call.locationType && (
                          <Badge
                            label={call.locationType}
                            color={call.locationType.toLowerCase() === 'site' ? 'orange' : 'indigo'}
                          />
                        )}
                        <Badge label={`${call.products?.length || 0} Products`} color="blue" />
                        {timer?.isExpired && <Badge label="SLA Breached" color="red" />}
                        {(call.status === "Critical_Unresolved" || call.status === "Critical") && (
                           <Badge label="ESCALATION EXHAUSTED" color="red" />
                        )}
                        {escalationStartTime && (
                          <div className="flex items-center gap-[0.3vw] text-slate-500 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.25vw] rounded-[0.4vw] text-[0.7vw] font-bold shadow-sm ml-auto">
                            <Clock className="w-[0.7vw] h-[0.7vw]" />
                            Started: {new Date(escalationStartTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-[1.5vw] text-[0.85vw] font-semibold text-slate-700 bg-slate-50/50 p-[0.5vw] rounded-[0.4vw] border border-slate-100">
                        <div className="flex items-center gap-[0.4vw]"><User className="w-[1vw] h-[1vw] text-slate-500" /> {call.customerName}</div>
                        <div className="flex items-center gap-[0.4vw]"><Phone className="w-[1vw] h-[1vw] text-slate-500" /> {call.contactNumber}</div>
                        <div className="flex items-center gap-[0.4vw]"><MapPin className="w-[1vw] h-[1vw] text-slate-500" /> {call.location || call.locationType}{call.site ? ` (${call.site})` : ""}</div>
                      </div>
                      
                      <div className="mt-[0.5vw] text-[0.75vw] text-slate-700 w-full">
                         <div className="flex flex-col gap-[0.4vw] w-full">
                           {(call.products || []).filter(p => p._productClosure?.status !== "Closed" && !p._resolved).map((p, i) => (
                             <div key={i} className={`flex flex-col md:flex-row md:items-center justify-between px-[0.8vw] py-[0.6vw] rounded-[0.4vw] border shadow-sm ${isCritical ? 'bg-white border-red-200' : 'bg-slate-50/50 border-slate-200'}`}>
                               <div className="flex items-center gap-[0.8vw] w-full md:w-auto">
                                 <div className="p-[0.3vw] bg-indigo-100 rounded-[0.3vw] shrink-0">
                                   <Package className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                                 </div>
                                 <div className="flex flex-col max-w-[20vw]">
                                   <span className="font-bold text-[0.8vw] text-slate-800 leading-tight">
                                     {p.productDescription || p.productModel || "Unknown Product"}
                                   </span>
                                   <span className="text-[0.65vw] font-semibold text-slate-500 mt-[0.1vw]">
                                     Code: {p.productCode || p.itemCode || "N/A"}
                                   </span>
                                 </div>
                               </div>
                               
                               <div className="flex flex-wrap items-center gap-[0.6vw] mt-[0.4vw] md:mt-0">
                                 {p.serialNumber && (
                                   <span className="text-[0.7vw] font-semibold bg-white border border-slate-200 px-[0.4vw] py-[0.15vw] rounded text-slate-600">
                                     SN: {p.serialNumber}
                                   </span>
                                 )}
                                 {p.productSegment && (
                                   <span className="text-[0.7vw] font-semibold bg-white border border-slate-200 px-[0.4vw] py-[0.15vw] rounded text-slate-600">
                                     {p.productSegment}
                                   </span>
                                 )}
                                 {(p._initialEngineerName || p._escalationHistory?.[0]?.engineerName || p._assignedEngineerName) && (
                                   <span className="text-[0.7vw] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-[0.5vw] py-[0.2vw] rounded">
                                     Assigned to: {p._initialEngineerName || p._escalationHistory?.[0]?.engineerName || p._assignedEngineerName}
                                   </span>
                                 )}
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                    
                    <div className="mt-[1vw] md:mt-0 flex flex-col justify-between items-end min-w-[14vw] border-l border-slate-200 pl-[1vw] py-[0.5vw]">
                      <div className="flex flex-col items-end gap-[0.5vw] w-full">
                        {timer ? (
                          <div className={`flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] rounded-[0.4vw] font-mono text-[0.9vw] font-bold border shadow-sm w-full justify-center ${timer.isExpired ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse" : "bg-amber-100 text-amber-800 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.25)]"}`}>
                            <Clock className="w-[0.9vw] h-[0.9vw]" /> {timer.remainingFormatted}
                          </div>
                        ) : (call.status === "Critical_Unresolved" || call.status === "Critical") ? (
                          <div className={`flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vw] rounded-[0.4vw] font-mono text-[0.9vw] font-bold border shadow-sm bg-red-100 text-red-800 border-red-400 animate-pulse w-full justify-center`}>
                            <AlertTriangle className="w-[0.9vw] h-[0.9vw]" /> NO SLA REMAINING
                          </div>
                        ) : null}
                        
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-[0.4vw] p-[0.6vw] mt-[0.2vw]">
                           <div className="text-[0.7vw] text-slate-500 font-bold mb-[0.2vw]">Currently escalated to:</div>
                           <div className="font-bold text-[0.9vw] text-indigo-700 truncate w-full">
                             {timer?.currentEngineerName || call.currentEngineerName || 'Unknown'}
                           </div>
                           <div className="text-slate-500 text-[0.75vw] font-medium mt-[0.1vw] truncate w-full">
                             {timer?.currentDepartment || call.currentDepartment || 'Unknown'}
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-[0.4vw] w-full mt-[0.35vw]">
                          <button
                            type="button"
                            onClick={() => setSelectedInfoCall(call)}
                            className="p-[0.45vw] text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-[0.45vw] border border-blue-200/80 transition-all cursor-pointer shrink-0"
                            title="Quick View Call Details"
                          >
                            <Eye className="w-[0.9vw] h-[0.9vw]" />
                          </button>

                          <button 
                            onClick={() => setTrackingEntry(call)}
                            className="flex-1 inline-flex items-center justify-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-[0.45vw] px-[0.6vw] rounded-[0.45vw] text-[0.74vw] font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
                            title="View Escalation Tracking History"
                          >
                            <History className="w-[0.85vw] h-[0.85vw] shrink-0" />
                            <span>View History</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const activePIdx = (call.products || []).findIndex(p => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended);
                              const targetPIdx = activePIdx !== -1 ? activePIdx : 0;
                              const targetProd = (call.products || [])[targetPIdx] || {};
                              setCancelModal({
                                callId: call.callId || call._id,
                                callNumber: call.callNumber,
                                prod: targetProd,
                                pIdx: targetPIdx,
                                currentAssignee: timer?.currentEngineerName || targetProd._assignedEngineerName || call.currentEngineerName,
                              });
                              setCancelReason("");
                              setNewAssignee("");
                            }}
                            className="inline-flex items-center justify-center gap-[0.32vw] px-[0.65vw] py-[0.45vw] rounded-[0.45vw] bg-rose-50 hover:bg-rose-100/90 active:bg-rose-200/80 text-rose-700 border border-rose-300 hover:border-rose-400 font-bold text-[0.78vw] transition-all cursor-pointer shrink-0 shadow-2xs whitespace-nowrap"
                            title="Cancel Escalation / Stop Timer & Reassign"
                          >
                            <Ban className="w-[0.85vw] h-[0.85vw] shrink-0 text-rose-600" />
                            <span>Cancel Escalation</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {trackingEntry && <TrackingModal entry={trackingEntry} onClose={() => setTrackingEntry(null)} />}
      </AnimatePresence>

      {/* Full Call Details Modal */}
      {selectedInfoCall && (
        <CallDetailsModal
          call={selectedInfoCall}
          employees={employees}
          onClose={() => setSelectedInfoCall(null)}
        />
      )}

      {/* Cancel Escalation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-full max-w-[32vw] overflow-hidden flex flex-col font-sans">
            <div className="px-[1.2vw] py-[0.85vw] border-b border-rose-100 bg-rose-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-[0.95vw] font-bold text-rose-950 flex items-center gap-[0.45vw]">
                  <Ban className="w-[1vw] h-[1vw] text-rose-600" />
                  Cancel Escalation & Re-assign
                </h3>
                <div className="text-[0.72vw] text-rose-800 font-medium mt-[0.15vw]">
                  <span className="font-bold">{cancelModal.callNumber}</span> • {cancelModal.prod?.productDescription || cancelModal.prod?.productModel || cancelModal.prod?.itemCode || 'Product'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="p-[0.35vw] text-slate-400 hover:text-slate-700 rounded-[0.4vw] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-[1vw] h-[1vw]" />
              </button>
            </div>

            <form
              onSubmit={handleCancelEscalationSubmit}
              className="p-[1.2vw] flex flex-col gap-[0.9vw]"
            >
              <div className="bg-slate-50 border border-slate-200/90 rounded-[0.55vw] p-[0.75vw] text-[0.76vw] text-slate-800">
                <div className="flex items-center gap-[0.4vw] mb-[0.2vw]">
                  <span className="font-bold text-slate-900">Current Assignee:</span>
                  <span className="text-[#2563eb] font-bold bg-blue-50 border border-blue-200 px-[0.45vw] py-[0.1vw] rounded-[0.3vw]">
                    {cancelModal.currentAssignee || "None"}
                  </span>
                </div>
                <p className="text-[0.72vw] text-slate-600 leading-relaxed">
                  Cancelling the escalation stops the timer and immediately returns the call to the <strong>Call Assignment page</strong> so Admin can reassign it.
                </p>
              </div>

              <div>
                <label className="block text-[0.76vw] font-bold text-slate-800 mb-[0.3vw]">
                  Reason for Stopping Escalation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Wrongly assigned to this engineer, handled directly over phone..."
                  className="w-full px-[0.75vw] py-[0.5vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-900 font-medium resize-none placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[0.76vw] font-bold text-slate-800 mb-[0.3vw]">
                  Re-assign To (Optional)
                </label>
                <div className="relative">
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-[0.75vw] py-[0.5vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-semibold bg-white cursor-pointer transition-all"
                  >
                    <option value="">-- Return to Call Assignment Page (Unassigned) --</option>
                    {(employees || []).map((emp) => (
                      <option key={emp.userId} value={emp.userId}>
                        {emp.name} ({emp.department || "Service"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-[0.6vw] flex items-center justify-end gap-[0.6vw] border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModal(null)}
                  className="px-[0.95vw] py-[0.42vw] text-[0.78vw] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-[0.4vw] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancelReason.trim()}
                  className="px-[1.15vw] py-[0.42vw] text-[0.78vw] font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-[0.4vw] transition-all cursor-pointer flex items-center gap-[0.4vw] shadow-xs hover:shadow-sm disabled:opacity-50"
                >
                  <Ban className="w-[0.85vw] h-[0.85vw]" />
                  <span>{isSubmittingCancel ? "Stopping..." : "Confirm & Stop Escalation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCallEscalations;
