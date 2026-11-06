import React, { useState, useEffect, useMemo } from "react";
import {
  Search, X, User, CheckCircle, Clock,
  ArrowRight, Activity, Shield, Package,
  Layers, ChevronDown, ChevronUp, Users,
  AlertCircle, Tag, CheckSquare, AlertTriangle,
  MapPin, Phone, Calendar,
  UserPlus, Hash, Settings, Square, ChevronLeft, ChevronRight,
  ClipboardList, Briefcase, Info, Loader2, Sparkles, Filter, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import useModulePermissions from "../../components/useModulePermissions";

// ── Constants & Helpers ────────────────────────────────────────────────────────
const SERVICE_CALLS_KEY = "service_calls_v2";
const EMPLOYEES_KEY = "employees";
const ESCALATION_KEY = "escalation_queue_v1";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const API_URL = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 10;

const lsLoad = (key, fb) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
};
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const initials = (name = "") =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-indigo-500 to-purple-600",
  "from-violet-500 to-purple-700",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-teal-500 to-cyan-600",
];
const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const buildSegmentGroups = (calls) => {
  const groups = [];
  calls.forEach(c => {
    const prods = c.products || [];
    const items = [];
    prods.forEach((p, idx) => {
      if (!p._assigned && !p._supportRequested && !p._isCritical) {
        items.push({ p, productIdx: idx });
      }
    });
    
    if (items.length > 0) {
      groups.push({
        groupKey: c._id || c.id,
        callId: c._id || c.id,
        callNumber: c.callNumber,
        customerName: c.customerName,
        partyCode: c.partyCode,
        contactPerson: c.contactPerson || "",
        contactNumber: c.contactNumber || "",
        location: c.location || "",
        site: c.site || "",
        priority: c.priority || "Medium",
        dateTime: c.dateTime,
        timestamp: c.timestamp,
        segment: items[0].p.productSegment || "—",
        customerType: c.customerType || "All",
        status: c.status || "Registered",
        products: items,
      });
    }
  });

  return groups.sort((a, b) => {
    const at = new Date(a.timestamp || a.dateTime || a.createdAt || 0).getTime();
    const bt = new Date(b.timestamp || b.dateTime || b.createdAt || 0).getTime();
    return bt - at;
  });
};

export default function ServiceCallAssignment() {
  const [groups, setGroups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [engSearch, setEngSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [resHours, setResHours] = useState(0);
  const [resMins, setResMins] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [allFlows, setAllFlows] = useState({});
  const [slaConfig, setSlaConfig]   = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useNotification();
  const { canWrite, canUpdate } = useModulePermissions("callAssign");
  const canAssign = canWrite || canUpdate;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [callRes, empRes, flowRes] = await Promise.all([
          axios.get(`${API_URL}/service-calls/pending`),
          axios.get(`${API_URL}/auth/employees`),
          axios.get(`${API_URL}/master/escalation-flows`)
        ]);

        const flows = {};
        flowRes.data.forEach(f => {
          flows[f.type] = f.steps;
        });
        setAllFlows(flows);

        const custDb = lsLoad(CUSTOMER_DB_KEY, []);
        const escQueue = lsLoad(ESCALATION_KEY, []);
        
        const validCalls = callRes.data.filter(c => {
          const activeEscalation = escQueue.find(q => q.callId === (c._id || c.id));
          if (activeEscalation && activeEscalation.status !== "Resolved" && activeEscalation.status !== "Closed") {
            return false;
          }

          const custRow = custDb.find(r => r.partyCode === c.partyCode);
          const partyType = custRow?.partyType || c.customerType || "All";
          
          return (c.products || []).some(p => {
            if (p._assigned || p._resolved || p._isCritical || c.status === "Critical") return false;
            
            const seg = p.productSegment || "Default";
            const flowKey = `${partyType}|${seg}`;
            let flowSteps = flows[flowKey];
            if (!flowSteps || flowSteps.length === 0) {
              flowSteps = flows[`${partyType}|Default`] || flows[partyType] || [
                { dept: "Support Engineer", durationHours: 2, durationMins: 0 },
                { dept: "Service Engineer", durationHours: 4, durationMins: 0 },
                { dept: "R&D", durationHours: 8, durationMins: 0 },
              ];
            }
            return (p._escalationLevel || 0) < flowSteps.length;
          });
        });

        setGroups(buildSegmentGroups(validCalls));
        setEmployees(empRes.data);
      } catch (err) {
        console.error("Fetch failed", err);
        toast("Failed to load data from server", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // KPI Counts for the top stat cards
  const stats = useMemo(() => {
    let pendingAssign = groups.length;
    let critical = groups.filter(g => g.priority === "Critical").length;
    let high = groups.filter(g => g.priority === "High").length;
    let regular = pendingAssign - critical - high;
    return { pendingAssign, critical, high, regular };
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const s = searchTerm.toLowerCase();
    let res = groups;
    
    if (priorityFilter !== "All") res = res.filter(g => g.priority === priorityFilter);
    
    if (!s) return res;
    return res.filter(g =>
      g.callNumber?.toLowerCase().includes(s) ||
      g.customerName?.toLowerCase().includes(s) ||
      g.partyCode?.toLowerCase().includes(s) ||
      g.location?.toLowerCase().includes(s) ||
      g.segment?.toLowerCase().includes(s) ||
      g.products?.some(({ p }) => 
        (p.productModel || "").toLowerCase().includes(s) || 
        (p.itemCode || "").toLowerCase().includes(s) ||
        (p.serialNumber || "").toLowerCase().includes(s)
      )
    );
  }, [groups, searchTerm, priorityFilter]);

  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGroups.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGroups, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, priorityFilter]);

  const selectedFlow = useMemo(() => {
    if (!selectedGroup) return null;
    const custDb = lsLoad(CUSTOMER_DB_KEY, []);
    const custRow = custDb.find(r => r.partyCode === selectedGroup.partyCode);
    const partyType = custRow?.partyType || "Default";
    const flowKey = `${partyType}|${selectedGroup.segment}`;
    let flow = allFlows[flowKey] || allFlows[`${partyType}|Default`] || allFlows[partyType];
    return flow || [
      { dept: "Support Engineer", durationHours: 2, durationMins: 0 },
      { dept: "Service Engineer", durationHours: 4, durationMins: 0 },
      { dept: "R&D", durationHours: 8, durationMins: 0 },
    ];
  }, [selectedGroup, allFlows]);

  useEffect(() => {
    if (!selectedGroup) { setSlaConfig(null); return; }
    setSlaConfig(null);
    setSlaLoading(true);
    const custDb  = lsLoad(CUSTOMER_DB_KEY, []);
    const custRow = custDb.find(r => r.partyCode === selectedGroup.partyCode);
    const partyType = custRow?.partyType || selectedGroup.customerType || "All";
    axios.get(`${API_URL}/service-calls/sla-employees`, {
      params: { customerType: partyType, segment: selectedGroup.segment }
    }).then(res => {
      setSlaConfig(res.data);
      if (res.data.configured && res.data.level0) {
        setResHours(res.data.level0.durationHours || 0);
        setResMins(res.data.level0.durationMins  || 0);
      } else if (selectedFlow?.[0]) {
        setResHours(selectedFlow[0].durationHours || 0);
        setResMins(selectedFlow[0].durationMins  || 0);
      }
    }).catch(() => {
      setSlaConfig({ configured: false });
      if (selectedFlow?.[0]) {
        setResHours(selectedFlow[0].durationHours || 0);
        setResMins(selectedFlow[0].durationMins  || 0);
      }
    }).finally(() => setSlaLoading(false));
  }, [selectedGroup, selectedFlow]);

  const processedEmployees = useMemo(() => {
    let eligibleIds  = new Set();
    let useEligible  = false;
    let workloadMap  = {};
    
    let eligibleDept = slaConfig?.configured ? (slaConfig.level0?.dept || "") : "";
    if (!slaConfig?.configured && selectedFlow?.[0]) {
      eligibleDept = selectedFlow[0].dept || "";
    }

    if (slaConfig?.configured) {
      if (slaConfig.level0?.engineers?.length > 0) {
        slaConfig.level0.engineers.forEach(e => {
           eligibleIds.add(e.userId);
           workloadMap[e.userId] = e.activeTasks || 0;
        });
        useEligible = true;
      }
      else if (eligibleDept) {
        useEligible = true;
      }
    } else if (eligibleDept) {
      useEligible = true;
    }

    const checkDeptMatch = (d1, d2) => {
      if (!d1 || !d2) return false;
      const s1 = d1.replace(/s$/i, "").toLowerCase();
      const s2 = d2.replace(/s$/i, "").toLowerCase();
      return s1 === s2 || s1.includes(s2) || s2.includes(s1);
    };

    return employees.map(e => {
      const activeTasks = workloadMap[e.userId] || 0;
      let isEligible = true;
      if (useEligible) {
        if (eligibleIds.size > 0) {
          isEligible = eligibleIds.has(e.userId);
        } else if (eligibleDept) {
          isEligible = checkDeptMatch(e.department, eligibleDept) || checkDeptMatch(e.role, eligibleDept);
        }
      }
      return { ...e, isEligible, isRecommended: isEligible && activeTasks < 3, activeTasks };
    });
  }, [selectedGroup, selectedFlow, employees, slaConfig]);

  const slaIsConfigured = slaConfig?.configured === true;
  const employeeListLoading = slaLoading || (!!selectedGroup && slaConfig === null);

  const filteredEmployees = useMemo(() => {
    const s    = engSearch.toLowerCase();
    const pool = processedEmployees.filter(e => e.isEligible);
    
    const filtered = pool.filter(e => 
      e.role?.toLowerCase() !== "admin" &&
      (!s || e.name?.toLowerCase().includes(s) || e.department?.toLowerCase().includes(s))
    );
    return filtered.sort((a, b) => a.activeTasks - b.activeTasks);
  }, [processedEmployees, engSearch]);

  const handleAssign = async () => {
    if (!selectedGroup || !selectedEngineer) return;
    setIsAssigning(true);
    try {
      const custDb   = lsLoad(CUSTOMER_DB_KEY, []);
      const custRow  = custDb.find(r => r.partyCode === selectedGroup.partyCode);
      const partyType = custRow?.partyType || selectedGroup.customerType || "All";
      const payload = {
        callId:         selectedGroup.callId,
        productIndices: selectedGroup.products.map(p => p.productIdx),
        engineerId:     selectedEngineer.userId,
        engineerName:   selectedEngineer.name,
        department:     selectedEngineer.department,
        resHours:       Number(resHours),
        resMins:        Number(resMins),
        segment:        selectedGroup.segment,
        customerType:   partyType,
      };

      await axios.post(`${API_URL}/service-calls/assign`, payload);

      toast(`Assigned to ${selectedEngineer.name} successfully`, "success");
      setGroups(prev => prev.filter(g => g.groupKey !== selectedGroup.groupKey));
      setSelectedGroup(null);
      setSelectedEngineer(null);
    } catch (err) {
      toast("Failed to assign call", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-[0.7vw] font-sans text-[0.82vw]">

      {/* ── TOP KPI STAT CARDS (Consistent with ServiceCall.jsx design) ── */}
      <div className="grid grid-cols-4 gap-[0.8vw] shrink-0">
        {/* 1. Pending Assignment */}
        <div className="bg-white rounded-[0.8vw] p-[0.85vw] border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(37,99,235,0.08)] hover:shadow-lg hover:border-blue-300 transition-all flex items-center justify-between group relative overflow-hidden">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
              <ClipboardList className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="text-[1.35vw] font-extrabold text-slate-900 leading-none tracking-tight">
                {stats.pendingAssign}
              </div>
              <div className="text-[0.66vw] font-medium text-slate-500 mt-[0.2vw]">
                Awaiting Assignment
              </div>
            </div>
          </div>
          <svg className="w-[4.5vw] h-[1.8vw] text-blue-500 stroke-current fill-none opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 100 40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 0 32 Q 25 35 45 20 T 90 8" />
          </svg>
        </div>

        {/* 2. Critical Priority */}
        <div className="bg-white rounded-[0.8vw] p-[0.85vw] border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(239,68,68,0.08)] hover:shadow-lg hover:border-rose-300 transition-all flex items-center justify-between group relative overflow-hidden">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
              <AlertCircle className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="text-[1.35vw] font-extrabold text-slate-900 leading-none tracking-tight">
                {stats.critical}
              </div>
              <div className="text-[0.66vw] font-medium text-slate-500 mt-[0.2vw]">
                Critical Escalations
              </div>
            </div>
          </div>
          <svg className="w-[4.5vw] h-[1.8vw] text-rose-500 stroke-current fill-none opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 100 40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 0 32 Q 35 34 55 18 T 90 8" />
          </svg>
        </div>

        {/* 3. High Priority */}
        <div className="bg-white rounded-[0.8vw] p-[0.85vw] border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.08)] hover:shadow-lg hover:border-amber-300 transition-all flex items-center justify-between group relative overflow-hidden">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
              <Clock className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="text-[1.35vw] font-extrabold text-slate-900 leading-none tracking-tight">
                {stats.high}
              </div>
              <div className="text-[0.66vw] font-medium text-slate-500 mt-[0.2vw]">
                High Urgency
              </div>
            </div>
          </div>
          <svg className="w-[4.5vw] h-[1.8vw] text-amber-500 stroke-current fill-none opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 100 40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 0 35 Q 25 30 50 22 T 90 10" />
          </svg>
        </div>

        {/* 4. Ready Field Engineers */}
        <div className="bg-white rounded-[0.8vw] p-[0.85vw] border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.08)] hover:shadow-lg hover:border-emerald-300 transition-all flex items-center justify-between group relative overflow-hidden">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
              <Users className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="text-[1.35vw] font-extrabold text-slate-900 leading-none tracking-tight">
                {employees.filter(e => e.role?.toLowerCase() !== "admin").length}
              </div>
              <div className="text-[0.66vw] font-medium text-slate-500 mt-[0.2vw]">
                Engineers in Roster
              </div>
            </div>
          </div>
          <svg className="w-[4.5vw] h-[1.8vw] text-emerald-500 stroke-current fill-none opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 100 40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 0 30 Q 30 32 50 15 T 90 6" />
          </svg>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex items-center justify-between bg-white px-[0.9vw] py-[0.55vw] rounded-[0.7vw] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-200/80 gap-[0.8vw] shrink-0">
        {/* Left Side: Search Box */}
        <div className="relative flex-1 max-w-[28vw]">
          <Search className="absolute left-[0.75vw] top-1/2 -translate-y-1/2 text-gray-400 w-[0.9vw] h-[0.9vw]" />
          <input
            type="text"
            placeholder="Search by customer, party code, call no, product, model..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-[2.2vw] pr-[0.8vw] h-[2.1vw] border border-gray-200/90 rounded-[0.5vw] text-[0.76vw] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-slate-50/50 hover:bg-white text-gray-800 placeholder-gray-400 transition-all font-normal"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")} 
              className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-[0.8vw] h-[0.8vw]" />
            </button>
          )}
        </div>

        {/* Right Side: Priority Filter & Active Count Pill */}
        <div className="flex items-center gap-[0.8vw]">
          {/* Subtle Dynamic Count indicator consistent with customers.jsx */}
          <div className="flex items-center gap-[0.4vw]">
            <span className="text-[0.74vw] font-medium text-slate-500">Showing:</span>
            <span className="text-[0.72vw] font-bold text-slate-700 bg-slate-100 px-[0.5vw] py-[0.1vw] rounded-full border border-slate-200">
              {filteredGroups.length} Calls
            </span>
            {priorityFilter !== "All" && (
              <span className="text-[0.68vw] text-slate-400">({priorityFilter})</span>
            )}
          </div>

          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="appearance-none bg-white font-medium text-gray-700 border border-gray-200/90 hover:border-gray-300 pl-[0.8vw] pr-[2vw] rounded-[0.5vw] outline-none cursor-pointer h-[2.1vw] text-[0.74vw] transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <ChevronDown className="w-[0.75vw] h-[0.75vw] text-gray-400 pointer-events-none absolute right-[0.6vw] top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-gray-200/80 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 sticky top-0 z-20 border-b border-gray-200">
              <tr>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] text-center w-[4%]">
                  S.No
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] w-[11%]">
                  Call Ref
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] text-center w-[9%]">
                  Party Type
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] w-[22%]">
                  Customer & Site
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] text-center w-[10%]">
                  Segment
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw]">
                  Allocated Product(s)
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] text-center w-[9%]">
                  Urgency
                </th>
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] text-center w-[10%] sticky top-0 right-0 bg-slate-50 z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.04)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-[12vh] text-center">
                    <div className="flex flex-col items-center justify-center gap-[0.8vw]">
                      <Loader2 className="w-[2.4vw] h-[2.4vw] animate-spin text-blue-600" />
                      <span className="text-[0.85vw] font-semibold text-slate-700">Loading assignments queue...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-[12vh] text-center">
                    <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                      <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <CheckCircle2 className="w-[1.8vw] h-[1.8vw] text-emerald-500" />
                      </div>
                      <div className="text-[0.95vw] font-semibold text-slate-700">All Calls Assigned!</div>
                      <div className="text-[0.74vw] text-slate-400 max-w-[20vw]">
                        There are no pending service calls requiring allocation right now.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g, idx) => {
                  const rowCount = g.products.length;
                  const isCritical = g.priority === "Critical";
                  const isHigh = g.priority === "High";

                  return g.products.map((item, pIdx) => (
                    <tr 
                      key={`${g.groupKey}-${pIdx}`} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCritical ? "bg-rose-50/25" : ""
                      }`}
                    >
                      {pIdx === 0 && (
                        <>
                          <td rowSpan={rowCount} className="p-[0.75vw] text-center align-middle text-slate-500 font-medium text-[0.74vw] border-r border-gray-100">
                            {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </td>
                          <td rowSpan={rowCount} className="p-[0.75vw] align-middle border-r border-gray-100">
                            <div className="font-bold text-blue-600 text-[0.78vw] leading-tight flex items-center gap-[0.3vw]">
                              <span>{g.callNumber}</span>
                            </div>
                            <div className="text-[0.66vw] text-slate-400 font-normal mt-[0.15vw] flex items-center gap-[0.25vw]">
                              <Calendar className="w-[0.6vw] h-[0.6vw]" />
                              {new Date(g.timestamp || g.dateTime).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td rowSpan={rowCount} className="p-[0.75vw] text-center align-middle border-r border-gray-100">
                            <span className="px-[0.55vw] py-[0.15vw] rounded-md text-[0.64vw] font-semibold border uppercase tracking-wider inline-block bg-purple-50 text-purple-700 border-purple-200">
                              {g.customerType || "Standard"}
                            </span>
                          </td>
                          <td rowSpan={rowCount} className="p-[0.75vw] align-middle border-r border-gray-100">
                            <div className="font-bold text-slate-800 text-[0.8vw] truncate max-w-[17vw]" title={g.customerName}>
                              {g.customerName}
                            </div>
                            <div className="flex flex-wrap items-center gap-[0.35vw] mt-[0.2vw]">
                              <span className="text-[0.64vw] text-blue-700 font-semibold bg-blue-50 px-[0.35vw] py-[0.05vw] rounded border border-blue-200">
                                {g.partyCode}
                              </span>
                              {g.location && (
                                <span className="text-[0.66vw] text-slate-500 flex items-center gap-[0.15vw]">
                                  <MapPin className="w-[0.6vw] h-[0.6vw] text-slate-400" />
                                  {g.location}
                                </span>
                              )}
                              {g.site && (
                                <span className="text-[0.62vw] text-slate-600 font-medium bg-slate-100 px-[0.3vw] py-[0.05vw] rounded border border-slate-200">
                                  {g.site}
                                </span>
                              )}
                            </div>
                          </td>
                          <td rowSpan={rowCount} className="p-[0.75vw] text-center align-middle border-r border-gray-100">
                            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-[0.5vw] py-[0.15vw] rounded-md text-[0.68vw] font-semibold">
                              {g.segment}
                            </span>
                          </td>
                        </>
                      )}

                      <td className="p-[0.75vw] align-middle border-r border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.76vw] text-slate-800 font-semibold">{item.p.productModel || item.p.itemCode}</span>
                          <span className="text-[0.68vw] text-slate-500 font-mono bg-slate-50 px-[0.3vw] py-[0.05vw] rounded border border-slate-200">
                            SN: {item.p.serialNumber || "—"}
                          </span>
                        </div>
                        {item.p.errorCode && (
                          <div className="mt-[0.2vw]">
                            <span className="bg-rose-50 text-rose-600 border border-rose-200/80 px-[0.4vw] py-[0.05vw] rounded text-[0.64vw] font-medium uppercase inline-flex items-center gap-[0.2vw]">
                              <AlertCircle className="w-[0.55vw] h-[0.55vw]" />
                              Err: {item.p.errorCode}
                            </span>
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <>
                          <td rowSpan={rowCount} className="p-[0.75vw] text-center align-middle border-r border-gray-100">
                            <span className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.66vw] font-bold border uppercase tracking-wider inline-flex items-center gap-[0.2vw] ${
                              g.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              g.priority === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-blue-50 text-blue-600 border-blue-200'
                            }`}>
                              <span className={`w-[0.35vw] h-[0.35vw] rounded-full ${
                                g.priority === 'Critical' ? 'bg-rose-500' :
                                g.priority === 'High' ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`} />
                              {g.priority}
                            </span>
                          </td>
                          <td rowSpan={rowCount} className="p-[0.75vw] text-center align-middle sticky right-0 bg-white group-hover:bg-slate-50/70 z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.04)]">
                            {canAssign ? (
                              <button
                                onClick={() => setSelectedGroup(g)}
                                className="cursor-pointer inline-flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.9vw] py-[0.4vw] rounded-[0.45vw] font-semibold text-[0.74vw] transition-all shadow-[0_2px_8px_-1px_rgba(37,99,235,0.35)] active:scale-95"
                              >
                                <span>Assign</span>
                                <ArrowRight className="w-[0.8vw] h-[0.8vw]" />
                              </button>
                            ) : (
                              <span className="text-[0.68vw] text-gray-400 italic font-medium px-[0.6vw] py-[0.2vw] bg-gray-50 border border-gray-200 rounded">
                                View Only
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        <div className="py-[0.6vw] px-[1vw] border-t border-gray-200 bg-slate-50/60 flex items-center justify-between shrink-0">
          <p className="text-[0.74vw] text-gray-500 font-medium">
            Showing <span className="font-semibold text-slate-700">{filteredGroups.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredGroups.length)}</span> of <span className="font-semibold text-slate-700">{filteredGroups.length}</span> records
          </p>
          <div className="flex items-center gap-[0.4vw]">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-[0.6vw] h-[1.8vw] rounded-[0.4vw] border border-gray-300 hover:bg-white disabled:opacity-40 cursor-pointer text-gray-600 transition-colors flex items-center gap-[0.2vw] text-[0.72vw]"
            >
              <ChevronLeft className="w-[0.8vw] h-[0.8vw]" />
              <span>Prev</span>
            </button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-[1.8vw] h-[1.8vw] rounded-[0.4vw] border font-bold text-[0.72vw] transition-all cursor-pointer ${
                  currentPage === p
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="px-[0.6vw] h-[1.8vw] rounded-[0.4vw] border border-gray-300 hover:bg-white disabled:opacity-40 cursor-pointer text-gray-600 transition-colors flex items-center gap-[0.2vw] text-[0.72vw]"
            >
              <span>Next</span>
              <ChevronRight className="w-[0.8vw] h-[0.8vw]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODERN ASSIGNMENT MODAL ── */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-[2vw]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setSelectedGroup(null); setSelectedEngineer(null); }}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="relative w-[72vw] max-h-[88vh] bg-white rounded-[1vw] flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200"
            >
              {/* Modal Top Header */}
              <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-slate-50">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[2.4vw] h-[2.4vw] bg-blue-600 rounded-[0.6vw] flex items-center justify-center text-white shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)]">
                    <UserPlus className="w-[1.2vw] h-[1.2vw]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-[0.6vw]">
                      <h2 className="text-[1.1vw] font-bold text-slate-800 leading-tight">
                        Allocate Field Engineer
                      </h2>
                      <span className="text-[0.68vw] bg-blue-100 text-blue-700 px-[0.45vw] py-[0.1vw] rounded font-semibold border border-blue-200">
                        {selectedGroup.callNumber}
                      </span>
                    </div>
                    <div className="text-[0.72vw] text-slate-500 font-medium">
                      Assign engineer and define initial SLA response window
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedGroup(null); setSelectedEngineer(null); }}
                  className="p-[0.4vw] hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-[1.1vw] h-[1.1vw]" />
                </button>
              </div>

              {/* SLA warning ribbon */}
              {!slaLoading && !slaIsConfigured && selectedGroup && (
                <div className="mx-[1.4vw] mt-[0.8vw] flex items-center gap-[0.6vw] bg-amber-50 border border-amber-200/90 rounded-[0.5vw] px-[0.8vw] py-[0.4vw]">
                  <AlertTriangle className="w-[0.9vw] h-[0.9vw] text-amber-600 shrink-0" />
                  <span className="text-[0.72vw] text-amber-800 font-medium">
                    No custom SLA registered for {selectedGroup.customerType} / {selectedGroup.segment} — using standard Level-1 flow default.
                  </span>
                </div>
              )}

              {/* Call Details Bar */}
              <div className="px-[1.4vw] py-[0.8vw] bg-slate-50/80 border-b border-slate-200 grid grid-cols-5 gap-[1vw]">
                <div className="flex flex-col">
                  <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.25vw]">
                    <User className="w-[0.65vw] h-[0.65vw] text-blue-600" /> Customer
                  </span>
                  <span className="text-[0.8vw] text-slate-800 font-bold truncate mt-[0.1vw]" title={selectedGroup.customerName}>
                    {selectedGroup.customerName}
                  </span>
                  <span className="text-[0.64vw] text-blue-600 font-mono font-medium">{selectedGroup.partyCode}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.25vw]">
                    <MapPin className="w-[0.65vw] h-[0.65vw] text-blue-600" /> Location &amp; Site
                  </span>
                  <span className="text-[0.78vw] text-slate-800 font-semibold truncate mt-[0.1vw]">
                    {selectedGroup.location || "—"}
                  </span>
                  {selectedGroup.site && (
                    <span className="text-[0.64vw] text-slate-500 font-medium">Site: {selectedGroup.site}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.25vw]">
                    <Phone className="w-[0.65vw] h-[0.65vw] text-blue-600" /> Contact
                  </span>
                  <span className="text-[0.78vw] text-slate-800 font-semibold truncate mt-[0.1vw]">
                    {selectedGroup.contactPerson || "—"}
                  </span>
                  <span className="text-[0.64vw] text-slate-500 font-mono">{selectedGroup.contactNumber || "—"}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.25vw]">
                    <Tag className="w-[0.65vw] h-[0.65vw] text-blue-600" /> Segment
                  </span>
                  <span className="text-[0.78vw] text-indigo-700 font-bold truncate mt-[0.1vw]">
                    {selectedGroup.segment}
                  </span>
                  <span className="text-[0.64vw] text-slate-400 font-medium">Type: {selectedGroup.customerType}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.25vw]">
                    <AlertCircle className="w-[0.65vw] h-[0.65vw] text-blue-600" /> Priority Level
                  </span>
                  <span className={`text-[0.78vw] font-bold truncate mt-[0.1vw] ${
                    selectedGroup.priority === 'Critical' ? 'text-rose-600' :
                    selectedGroup.priority === 'High' ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {selectedGroup.priority}
                  </span>
                  <span className="text-[0.64vw] text-slate-400 font-medium">{selectedGroup.products.length} product(s)</span>
                </div>
              </div>

              {/* 2-Column Split: Available Engineers vs Selected Review */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Side: Eligible Engineer Roster */}
                <div className="w-[44%] flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50/40">
                  <div className="p-[0.9vw] border-b border-slate-200 bg-white">
                    <div className="relative">
                      <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search qualified engineers..." 
                        value={engSearch} 
                        onChange={e => setEngSearch(e.target.value)} 
                        className="w-full pl-[2vw] pr-[2vw] h-[2vw] bg-slate-50 border border-gray-200 rounded-[0.45vw] outline-none focus:border-blue-500 focus:bg-white text-[0.74vw] text-slate-800 font-normal transition-all" 
                      />
                      {engSearch && (
                        <button 
                          onClick={() => setEngSearch("")} 
                          className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-[0.8vw] h-[0.8vw]" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-[0.8vw] space-y-[0.5vw]">
                    {employeeListLoading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-[0.8vw] text-center py-[6vh]">
                        <Loader2 className="w-[2vw] h-[2vw] animate-spin text-blue-600" />
                        <div className="text-[0.82vw] font-semibold text-slate-700">Checking SLA eligible engineers...</div>
                        <div className="text-[0.68vw] text-slate-400 font-normal max-w-[15vw]">
                          Matching against department requirements &amp; current active queue.
                        </div>
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="text-center py-[6vh] text-slate-400 text-[0.76vw]">
                        No eligible engineers found matching query.
                      </div>
                    ) : (
                      filteredEmployees.map(emp => {
                        const isSelected = selectedEngineer?.userId === emp.userId;
                        return (
                          <div 
                            key={emp.userId} 
                            onClick={() => setSelectedEngineer(emp)} 
                            className={`flex items-center gap-[0.7vw] p-[0.65vw] rounded-[0.6vw] border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30'
                            }`}
                          >
                            <div className={`w-[2.2vw] h-[2.2vw] rounded-full flex items-center justify-center font-bold text-[0.85vw] bg-gradient-to-br ${
                              isSelected ? 'from-white/30 to-white/10' : avatarColor(emp.name)
                            } text-white shadow-2xs shrink-0`}>
                              {initials(emp.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold text-[0.8vw] leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                {emp.name}
                              </div>
                              <div className="flex items-center gap-[0.35vw] mt-[0.2vw]">
                                <span className={`text-[0.65vw] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {emp.department || "Engineer"}
                                </span>
                                {emp.activeTasks > 0 ? (
                                  <span className={`px-[0.35vw] py-[0.05vw] rounded-full text-[0.58vw] font-bold border ${
                                    isSelected 
                                      ? 'bg-amber-400/20 text-amber-100 border-amber-300/30' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {emp.activeTasks} Active
                                  </span>
                                ) : (
                                  <span className={`px-[0.35vw] py-[0.05vw] rounded-full text-[0.58vw] font-bold border ${
                                    isSelected 
                                      ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    Available
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-[1.1vw] h-[1.1vw] text-white shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Side: Assignment Details & Confirmation */}
                <div className="flex-1 bg-white flex flex-col overflow-hidden">
                  {selectedEngineer ? (
                    <div className="p-[1.4vw] flex flex-col h-full overflow-y-auto custom-scrollbar justify-between">
                      <div className="space-y-[1.2vw]">
                        {/* Selected Engineer Banner */}
                        <div className="bg-slate-50 rounded-[0.7vw] p-[0.9vw] border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-[0.8vw]">
                            <div className={`w-[2.6vw] h-[2.6vw] rounded-full flex items-center justify-center text-[0.9vw] font-bold text-white bg-gradient-to-br ${avatarColor(selectedEngineer.name)} shadow-sm`}>
                              {initials(selectedEngineer.name)}
                            </div>
                            <div>
                              <div className="text-[0.95vw] font-bold text-slate-800 leading-tight">
                                {selectedEngineer.name}
                              </div>
                              <div className="text-[0.72vw] text-slate-500 font-medium mt-[0.1vw]">
                                {selectedEngineer.department} &bull; {selectedEngineer.role || "Specialist"}
                              </div>
                            </div>
                          </div>
                          <span className={`px-[0.6vw] py-[0.15vw] rounded-full text-[0.66vw] font-bold border ${
                            selectedEngineer.activeTasks > 0 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {selectedEngineer.activeTasks} Active Tasks
                          </span>
                        </div>

                        {/* Units Included */}
                        <div>
                          <div className="flex items-center gap-[0.4vw] text-[0.68vw] font-bold text-slate-500 uppercase tracking-wider mb-[0.5vw]">
                            <Package className="w-[0.85vw] h-[0.85vw] text-blue-600" />
                            <span>Allocated Products ({selectedGroup.products.length})</span>
                          </div>
                          <div className="space-y-[0.35vw] max-h-[12vw] overflow-y-auto custom-scrollbar pr-[0.3vw]">
                            {selectedGroup.products.map(({ p, productIdx }) => (
                              <div key={productIdx} className="bg-slate-50/70 p-[0.65vw] rounded-[0.5vw] border border-slate-200 flex items-center justify-between text-[0.76vw]">
                                <div>
                                  <div className="text-slate-800 font-bold">{p.productModel || p.itemCode}</div>
                                  {p.errorCode && (
                                    <div className="text-[0.64vw] text-rose-600 font-medium">Issue Code: {p.errorCode}</div>
                                  )}
                                </div>
                                <span className="text-slate-500 font-mono text-[0.7vw] bg-white px-[0.4vw] py-[0.1vw] rounded border border-slate-200">
                                  SN: {p.serialNumber || "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SLA Resolution Target */}
                        <div>
                          <div className="flex items-center gap-[0.4vw] text-[0.68vw] font-bold text-slate-500 uppercase tracking-wider mb-[0.5vw]">
                            <Clock className="w-[0.85vw] h-[0.85vw] text-blue-600" />
                            <span>SLA Delivery Window</span>
                          </div>
                          <div className="grid grid-cols-2 gap-[0.8vw]">
                            <div className="flex flex-col gap-[0.2vw]">
                              <span className="text-[0.64vw] font-bold text-slate-600 uppercase">Target Hours</span>
                              <input 
                                type="number" 
                                min="0"
                                value={resHours} 
                                onChange={e => setResHours(e.target.value)} 
                                className="w-full px-[0.7vw] h-[2.2vw] bg-slate-50 border border-slate-200 rounded-[0.45vw] outline-none focus:border-blue-500 focus:bg-white text-[0.85vw] font-bold text-slate-800 transition-all" 
                              />
                            </div>
                            <div className="flex flex-col gap-[0.2vw]">
                              <span className="text-[0.64vw] font-bold text-slate-600 uppercase">Target Minutes</span>
                              <input 
                                type="number" 
                                min="0"
                                max="59"
                                value={resMins} 
                                onChange={e => setResMins(e.target.value)} 
                                className="w-full px-[0.7vw] h-[2.2vw] bg-slate-50 border border-slate-200 rounded-[0.45vw] outline-none focus:border-blue-500 focus:bg-white text-[0.85vw] font-bold text-slate-800 transition-all" 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-[0.4vw] p-[0.6vw] bg-blue-50/70 rounded-[0.5vw] border border-blue-200/60 mt-[0.6vw]">
                            <Info className="w-[0.8vw] h-[0.8vw] text-blue-600 shrink-0" />
                            <span className="text-[0.68vw] text-blue-800 font-medium">
                              Resolution target starts counting upon assignment confirmation.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Action Button */}
                      <div className="pt-[1.2vw] border-t border-slate-200 flex justify-end gap-[0.6vw] mt-[1vw]">
                        <button
                          type="button"
                          onClick={() => setSelectedEngineer(null)}
                          className="px-[1vw] h-[2.2vw] border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-[0.5vw] font-semibold text-[0.76vw] cursor-pointer transition-colors"
                        >
                          Change Engineer
                        </button>
                        <button 
                          onClick={handleAssign}
                          disabled={isAssigning}
                          className="px-[1.2vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] font-bold text-[0.76vw] active:scale-[0.98] transition-all flex items-center justify-center gap-[0.5vw] shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)] cursor-pointer disabled:opacity-60"
                        >
                          {isAssigning ? (
                            <>
                              <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                              <span>Allocating...</span>
                            </>
                          ) : (
                            <>
                              <span>Confirm Assignment</span>
                              <ArrowRight className="w-[0.9vw] h-[0.9vw]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-[2vw]">
                      <div className="w-[3.8vw] h-[3.8vw] bg-blue-50 rounded-full flex items-center justify-center mb-[0.8vw] text-blue-500">
                        <UserPlus className="w-[1.8vw] h-[1.8vw]" />
                      </div>
                      <div className="text-[1vw] font-bold text-slate-700">Select an Eligible Engineer</div>
                      <div className="text-[0.74vw] text-slate-400 max-w-[20vw] mt-[0.3vw]">
                        Pick a qualified engineer from the list on the left to set SLA deadlines and confirm allocation.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
