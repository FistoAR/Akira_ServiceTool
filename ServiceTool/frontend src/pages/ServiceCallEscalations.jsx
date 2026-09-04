import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  AlertTriangle, Clock, History, Shield, CheckSquare, Search,
  X, BarChart2, Activity, ChevronRight, User, Phone, MapPin, Loader2, Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEscalationWorker from "../service/useEscalationWorker";

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

  (entry.escalationHistory || []).forEach(h => {
    const key = `${h.assignedAt || h.timestamp}_${h.engineerName}_${h.status}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      events.push({
        time: h.assignedAt || h.timestamp,
        deadline: h.deadline,
        person: h.engineerName,
        dept: h.department,
        status: h.status || "Assigned",
        level: h.level || 0,
        remarks: h.remarks || h.reason,
        scope: "Call Level"
      });
    }
  });
  
  (entry.products || []).forEach((p, i) => {
    (p._escalationHistory || []).forEach(h => {
      const key = `${h.assignedAt || h.timestamp}_${h.engineerName}_${h.status}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        events.push({
          time: h.assignedAt || h.timestamp,
          deadline: h.deadline,
          person: h.engineerName,
          dept: h.department,
          status: h.status || "Assigned",
          level: h.level || 0,
          remarks: h.remarks || h.reason,
          scope: `Product ${i + 1}`
        });
      }
    });
  });
  
  events.sort((a,b) => new Date(a.time) - new Date(b.time));

  const now = new Date();
  let pastEvents = events.filter(ev => new Date(ev.time) <= now);

  pastEvents = pastEvents.map((ev, index) => {
    const isLast = index === pastEvents.length - 1;
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
                 const isHighlightedEvent = ev.status === "SLA Breached" || ev.status === "Critical Escalation";
                 
                 return (
                   <div key={i} className="flex gap-[0.8vw] relative">
                     <div className="flex flex-col items-center">
                       <div className={`w-[0.6vw] h-[0.6vw] rounded-full mt-[0.2vw] z-10 ${isHighlightedEvent ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-indigo-500'}`} />
                       {i !== pastEvents.length - 1 && (
                         <div className="w-[1px] h-full bg-slate-300 absolute top-[0.6vw] bottom-[-0.8vw] left-[0.27vw]" />
                       )}
                     </div>
                     <div className={`flex-1 rounded-[0.5vw] p-[0.6vw] shadow-sm ${
                       isHighlightedEvent 
                         ? 'bg-rose-50 border-[2px] border-rose-300' 
                         : 'bg-slate-50 border border-slate-200'
                     }`}>
                       <div className="flex justify-between items-start mb-[0.2vw]">
                         <span className={`text-[1vw] font-bold flex items-center gap-[0.4vw] ${isHighlightedEvent ? 'text-rose-900' : 'text-slate-900'}`}>
                           {ev.status} 
                           {ev.scope && (
                             <span className={`px-[0.4vw] py-[0.1vw] rounded-[0.2vw] text-[0.65vw] ml-[0.2vw] font-black tracking-wide border ${
                               isHighlightedEvent ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-slate-100 border-slate-300 text-slate-600'
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
                         By: <span className="font-semibold text-slate-800">{ev.person || "System / Auto"}</span> 
                         <span className="text-slate-500 ml-[0.4vw]">({ev.dept || "N/A"}) - Level {ev.level + 1}</span>
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
                           isHighlightedEvent ? 'bg-white text-rose-800 border-rose-200' : 'bg-white text-slate-700 border-slate-200'
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
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [trackingEntry, setTrackingEntry] = useState(null);

  useEffect(() => {
    if (workerReady) setIsWorkerReady(true);
  }, [workerReady]);

  useEffect(() => {
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
    
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const escalatingCalls = useMemo(() => {
    return calls.filter(e => {
      if (e.status === "Resolved" || e.status === "Closed") return false;
      
      // If there are no active, unattended products left on this call, it shouldn't show as escalating
      const hasActiveUnattended = (e.products || []).some(p => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended);
      if (!hasActiveUnattended) return false;

      const timer = timers.find(t => t.callId === e.callId);
      const isExhausted = e.status === "Critical_Unresolved" || e.status === "Critical";
      
      const isCritical = e.status === "Critical_Unresolved" || e.status === "Critical" || e.priority === "Critical" || timer?.isExpired;
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
  }, [calls, timers, searchTerm, statusFilter, filterFromDate, filterToDate]);

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
    <div className="w-full h-[90vh]  bg-slate-100/70 rounded-[1vw]  flex flex-col font-sans">
      <div className="flex justify-between items-center bg-white p-[1vw] rounded-[0.8vw] shadow-sm border border-slate-400 mb-[1vw]">
        <div className="flex items-center gap-[0.8vw]">
          {["All", "Escalating", "Critical"].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`cursor-pointer px-[1.2vw] py-[0.5vw] rounded-[0.5vw] text-[0.85vw] font-bold transition-all shadow-sm active:scale-95 flex items-center gap-[0.5vw] border
                ${statusFilter === tab 
                  ? (tab === "Critical" ? 'bg-red-600 text-white border-red-700' : 'bg-indigo-600 text-white border-indigo-700')
                  : (tab === "Critical" ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50')
                }`}
            >
              {tab === "Critical" && <Shield className="w-[1vw] h-[1vw]" />}
              {tab}
              <span className={`px-[0.4vw] py-[0.1vw] rounded-full text-[0.7vw] ${
                statusFilter === tab ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            <label className="text-[0.75vw] font-bold text-slate-600 uppercase tracking-wider">From:</label>
            <input 
              type="date" 
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="border border-slate-300 rounded-[0.4vw] px-[0.6vw] py-[0.3vw] text-[0.8vw] text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm bg-slate-50 hover:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <label className="text-[0.75vw] font-bold text-slate-600 uppercase tracking-wider">To:</label>
            <input 
              type="date"
              min={filterFromDate}
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="border border-slate-300 rounded-[0.4vw] px-[0.6vw] py-[0.3vw] text-[0.8vw] text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm bg-slate-50 hover:bg-white transition-colors"
            />
          </div>
          <div className="relative w-[20vw]">
            <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
            <input 
              type="text" 
              placeholder="Search escalations..."
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-[2.5vw] pr-[1vw] h-[2.2vw] border border-gray-400 rounded-[0.6vw] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-[0.8vw]" 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[0.8vw] border border-slate-400 shadow-sm">
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
                  <div key={call.callId} className={`flex flex-col md:flex-row justify-between p-[1vw] rounded-[0.8vw] shadow-sm hover:shadow-md transition-shadow border ${isCritical ? 'border-red-300 bg-red-50/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : 'border-slate-300 bg-white'}`}>
                    <div className="flex-1 space-y-[0.8vw] pr-[1vw]">
                      <div className="flex items-center gap-[0.8vw] flex-wrap">
                        <div className="flex items-center gap-[0.4vw]">
                          <span className="flex items-center justify-center w-[1.5vw] h-[1.5vw] bg-slate-200 text-slate-700 rounded-full font-bold text-[0.8vw]">
                            {index + 1}
                          </span>
                          <span className="font-mono text-[1.1vw] font-bold text-slate-900 tracking-tight">{call.callNumber}</span>
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
                        <div className="flex items-center gap-[0.4vw]"><MapPin className="w-[1vw] h-[1vw] text-slate-500" /> {call.location || call.locationType}</div>
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
                                 {p._assignedEngineerName && (
                                   <span className="text-[0.7vw] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-[0.5vw] py-[0.2vw] rounded">
                                     Assigned to: {p._assignedEngineerName}
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
                        
                        <button 
                          onClick={() => setTrackingEntry(call)}
                          className="flex items-center justify-center gap-[0.4vw] bg-indigo-600 hover:bg-indigo-700 text-white w-full py-[0.5vw] rounded-[0.4vw] text-[0.85vw] font-bold shadow-sm transition-all cursor-pointer mt-[0.2vw]"
                        >
                          <History className="w-[0.9vw] h-[0.9vw]" /> View History
                        </button>
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
    </div>
  );
};

export default ServiceCallEscalations;
