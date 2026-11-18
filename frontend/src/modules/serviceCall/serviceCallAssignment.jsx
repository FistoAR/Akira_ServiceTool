import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, X, RotateCcw, RefreshCw, User, CheckCircle, Clock,
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
import CustomDropdown from "../../components/CustomDropdown";
import { CallDetailsModal } from "./responseComponents/CallDetailsModal";
import { CustomTooltip, CustomerInfoCell } from "./responseComponents/CommonUI";
import { Eye } from "lucide-react";

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
        rawCall: c,
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
  const [selectedInfoCall, setSelectedInfoCall] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [engSearch, setEngSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [resHours, setResHours] = useState(0);
  const [resMins, setResMins] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("All");
  const [customerTypes, setCustomerTypes] = useState([]);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allFlows, setAllFlows] = useState({});
  const [slaConfig, setSlaConfig]   = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useNotification();
  const { canWrite, canUpdate } = useModulePermissions("callAssign");
  const canAssign = canWrite || canUpdate;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [callRes, empRes, flowRes, partyRes] = await Promise.all([
        axios.get(`${API_URL}/service-calls/pending`),
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/master/escalation-flows`),
        axios.get(`${API_URL}/master/party-types`).catch(() => ({ data: [] }))
      ]);
      if (partyRes?.data) {
        setCustomerTypes(partyRes.data.map(p => p.name || p));
      }

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
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (customerTypeFilter !== "All") res = res.filter(g => (g.customerType || "Standard") === customerTypeFilter);

    if (filterFromDate || filterToDate) {
      res = res.filter(g => {
        const rowDate = new Date(g.timestamp || g.dateTime || 0);
        if (isNaN(rowDate.getTime())) return true;
        if (filterFromDate) {
          const from = new Date(filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (rowDate < from) return false;
        }
        if (filterToDate) {
          const to = new Date(filterToDate);
          to.setHours(23, 59, 59, 999);
          if (rowDate > to) return false;
        }
        return true;
      });
    }
    
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
  }, [groups, searchTerm, priorityFilter, customerTypeFilter, filterFromDate, filterToDate]);

  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGroups.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGroups, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, priorityFilter, customerTypeFilter, filterFromDate, filterToDate]);

  const availableCustomerTypes = useMemo(() => {
    const set = new Set(customerTypes);
    groups.forEach(g => {
      if (g.customerType && g.customerType !== "All") set.add(g.customerType);
    });
    return Array.from(set).filter(Boolean);
  }, [customerTypes, groups]);

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
    <div className="w-full h-full flex flex-col gap-2.5 font-sans text-xs">

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-2.5 shrink-0">
        {/* Left side: Soft Pill Search Box */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search customer, call no, engineer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-7 h-8 border-0 rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-700 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Right cluster: Date Range, Clear, Count & Priority */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Unified Date Range Capsule */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-full h-8 px-3 bg-white text-xs shadow-2xs hover:border-slate-300 transition-all">
            <span className="text-slate-700 font-medium text-xs">From</span>
            <input
              ref={fromDateRef}
              type="date"
              value={filterFromDate || ""}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="no-native-calendar text-xs text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                if (fromDateRef.current) {
                  try { fromDateRef.current.showPicker(); } catch { fromDateRef.current.focus(); }
                }
              }}
              className="p-0 border-0 bg-transparent cursor-pointer text-slate-700 hover:text-blue-600 transition-colors flex items-center mr-0.5"
              title="Choose from date"
            >
              <Calendar className="w-3 h-3 shrink-0 text-slate-700" />
            </button>
            <span className="text-slate-700 mx-0.5 text-sm">→</span>
            <span className="text-slate-700 font-medium text-xs">To</span>
            <input
              ref={toDateRef}
              type="date"
              value={filterToDate || ""}
              min={filterFromDate || undefined}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="no-native-calendar text-xs text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                if (toDateRef.current) {
                  try { toDateRef.current.showPicker(); } catch { toDateRef.current.focus(); }
                }
              }}
              className="p-0 border-0 bg-transparent cursor-pointer text-slate-700 hover:text-blue-600 transition-colors flex items-center ml-px"
              title="Choose to date"
            >
              <Calendar className="w-3 h-3 shrink-0 text-slate-700" />
            </button>
          </div>

          {/* Reset / Clear Button */}
          {(filterFromDate || filterToDate) && (
            <button
              onClick={() => {
                setFilterFromDate("");
                setFilterToDate("");
              }}
              className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
              title="Clear date filter"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Customer Type Dropdown */}
          <div className="w-36">
            <CustomDropdown
              size="sm"
              align="right"
              value={customerTypeFilter}
              onChange={(val) => setCustomerTypeFilter(val)}
              options={[
                { value: "All", label: "All Types" },
                ...availableCustomerTypes.map((t) => ({ value: t, label: t })),
              ]}
              triggerClassName="h-8 !rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs text-xs"
            />
          </div>

          {/* Priority Dropdown (Pill shaped) */}
          <div className="w-36">
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
              triggerClassName="h-8 !rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs text-xs"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            title="Refresh pending calls"
          >
            <RefreshCw className={`w-3 h-3 text-slate-700 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-gray-200/80 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#E9EDF7] z-20 border-b border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-[4%] whitespace-nowrap">
                  S.No
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 whitespace-nowrap min-w-40">
                  Call Ref & Date
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 min-w-64 whitespace-nowrap">
                  Customer & Site
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center whitespace-nowrap min-w-28">
                  Customer Type
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 min-w-60 whitespace-nowrap">
                  Product & Segment
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center whitespace-nowrap min-w-24">
                  Priority
                </th>
                <th className="py-2.5 px-2.5 text-center sticky top-0 right-0 bg-[#E9EDF7] z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-28">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-[12vh] text-center border-b border-slate-300">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-9 h-9 animate-spin text-[#1a73e8]" />
                      <span className="text-sm font-normal text-slate-700">Loading assignments queue...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-[12vh] text-center border-b border-slate-300">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                        <CheckCircle2 className="w-6.5 h-6.5 text-emerald-500" />
                      </div>
                      <div className="text-sm font-medium text-slate-700">All Calls Assigned!</div>
                      <div className="text-xs text-slate-700 max-w-[288px]">
                        There are no pending service calls requiring allocation right now.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g, idx) => {
                  const rowCount = g.products.length;
                  const isCritical = g.priority === "Critical";

                  return g.products.map((item, pIdx) => (
                    <tr
                      key={`${g.groupKey}-${pIdx}`}
                      className={`hover:bg-slate-50 transition-colors bg-white ${
                        isCritical ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {pIdx === 0 && (
                        <>
                          {/* 1. S.No */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 text-center align-middle text-black font-medium text-sm border-r border-b border-slate-300 bg-white whitespace-nowrap">
                            {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </td>

                          {/* 2. Call Ref & Date */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 align-middle border-r border-b border-slate-300 bg-white whitespace-nowrap">
                            <button
                              onClick={() => setSelectedInfoCall(g.rawCall || g)}
                              className="font-mono text-left text-sm font-medium text-black hover:text-blue-600 block leading-tight cursor-pointer"
                              title="View Call Details"
                            >
                              {g.callNumber}
                            </button>
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium leading-normal mt-1">
                              {(() => {
                                try {
                                  const d = new Date(g.timestamp || g.dateTime);
                                  if (isNaN(d)) return <span>{g.dateTime || "—"}</span>;
                                  const datePart = d.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  });
                                  const timePart = d.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  });
                                  return (
                                    <>
                                      <span>{datePart}</span>
                                      <span className="text-slate-600 font-normal">|</span>
                                      <span className="text-slate-600 font-medium">{timePart}</span>
                                    </>
                                  );
                                } catch {
                                  return <span>{g.dateTime || "—"}</span>;
                                }
                              })()}
                            </div>
                          </td>

                          {/* 3. Customer & Site */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 align-middle border-r border-b border-slate-300 bg-white max-w-64">
                            <CustomerInfoCell
                              customerName={g.customerName}
                              contactNumber={g.contactNumber}
                              partyCode={g.partyCode}
                            />
                            {(g.location || g.site) && (
                              <div className="text-sm text-slate-600 font-medium flex items-center gap-1 mt-0.5 truncate max-w-60" title={`${g.site ? g.site + " • " : ""}${g.location || ""}`}>
                                <MapPin className="w-2.5 h-2.5 text-slate-700 shrink-0" />
                                <span className="truncate font-medium text-slate-700">{g.site ? `${g.site} • ` : ""}{g.location}</span>
                              </div>
                            )}
                          </td>

                          {/* 4. Customer Type */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 text-center align-middle border-r border-b border-slate-300 bg-white whitespace-nowrap text-xs font-medium">
                            {g.customerType && g.customerType !== "All" ? (
                              <span
                                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border shadow-2xs whitespace-nowrap ${
                                  g.customerType === "OEM"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : g.customerType === "End Customer"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : g.customerType === "Distributor"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : g.customerType === "Dealer"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {g.customerType}
                              </span>
                            ) : (
                              <span className="text-slate-700 font-medium">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* 4. Product & Segment */}
                      <td className="py-2.5 px-2.5 align-middle border-r border-b border-slate-300 max-w-60">
                        <CustomTooltip
                          position="top-start"
                          className="max-w-full"
                          content={
                            <div className="flex flex-col gap-0.5 text-left py-px">
                              <div className="font-normal text-slate-200">
                                {item.p.productModel || item.p.itemCode || "—"}
                              </div>
                              {item.p.serialNumber && (
                                <div className="text-xs text-sky-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                  <span className="text-slate-700 font-sans">SN: </span>
                                  <span>{item.p.serialNumber}</span>
                                </div>
                              )}
                              {item.p.errorCode && (
                                <div className="text-xs text-rose-300 font-mono border-t border-slate-700/80 pt-0.5 mt-px">
                                  <span>Error: {item.p.errorCode}</span>
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="font-medium text-black text-sm truncate cursor-default">
                            {item.p.productModel || item.p.itemCode}
                          </div>
                        </CustomTooltip>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {g.segment && g.segment !== "—" && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-px rounded text-xs font-medium">
                              {g.segment}
                            </span>
                          )}
                          {item.p.serialNumber && (
                            <span className="text-sm text-slate-700 font-medium font-mono">
                              SN: {item.p.serialNumber}
                            </span>
                          )}
                          {item.p.errorCode && (
                            <span className="text-sm text-rose-700 font-medium font-mono">
                              Err: {item.p.errorCode}
                            </span>
                          )}
                          {g.products.length > 1 && (
                            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-px rounded-full">
                              +{g.products.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>

                      {pIdx === 0 && (
                        <>
                          {/* 5. Priority */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 text-center align-middle border-r border-b border-slate-300 bg-white whitespace-nowrap">
                            {(() => {
                              const p = g.priority || "Medium";
                              let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                              if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                              else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                              else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                              return (
                                <span className={`inline-flex items-center justify-center px-2 py-px rounded-full text-xs font-medium border shadow-2xs whitespace-nowrap ${badgeStyle}`}>
                                  {p}
                                </span>
                              );
                            })()}
                          </td>

                          {/* 6. Action */}
                          <td rowSpan={rowCount} className="py-2.5 px-2.5 text-center align-middle sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] border-b border-r border-slate-300 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Direct 1-Click Info Modal Button */}
                              <button
                                onClick={() => setSelectedInfoCall(g.rawCall || g)}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                title="View Call Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {canAssign ? (
                                <button
                                  onClick={() => setSelectedGroup(g)}
                                  className="cursor-pointer inline-flex items-center gap-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-3 py-1 rounded-full font-medium text-sm transition-all shadow-xs"
                                >
                                  <span>Assign</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <span className="text-sm text-slate-600 italic font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full">
                                  View Only
                                </span>
                              )}
                            </div>
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
        <div className="py-2.5 px-3.5 border-t border-slate-300 bg-white flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-600 font-medium">
            Showing <span className="font-semibold text-slate-800">{filteredGroups.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredGroups.length)}</span> of <span className="font-semibold text-slate-800">{filteredGroups.length}</span> records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-medium transition-all cursor-pointer ${
                    currentPage === p
                      ? "bg-[#1a73e8] text-white shadow-2xs"
                      : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODERN ASSIGNMENT MODAL ── */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-7">
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
              className="relative w-[1037px] max-h-[88vh] bg-white rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200"
            >
              {/* Modal Top Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xs font-bold text-slate-800 leading-tight">
                        Allocate Field Engineer
                      </h2>
                      <span className="text-sm bg-blue-100 text-blue-700 px-1.5 py-px rounded font-semibold border border-blue-200">
                        {selectedGroup.callNumber}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 font-medium">
                      Assign engineer and define initial SLA response window
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedGroup(null); setSelectedEngineer(null); }}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-700 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SLA warning ribbon */}
              {!slaLoading && !slaIsConfigured && selectedGroup && (
                <div className="mx-5 mt-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-800 font-medium">
                    No custom SLA registered for {selectedGroup.customerType} / {selectedGroup.segment} — using standard Level-1 flow default.
                  </span>
                </div>
              )}

              {/* Call Details Bar */}
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 grid grid-cols-5 gap-3.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-2.5 h-2.5 text-blue-600" /> Customer
                  </span>
                  <span className="text-xs text-slate-800 font-bold truncate mt-px" title={selectedGroup.customerName}>
                    {selectedGroup.customerName}
                  </span>
                  <span className="text-xs text-blue-600 font-mono font-medium">{selectedGroup.partyCode}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-blue-600" /> Location &amp; Site
                  </span>
                  <span className="text-xs text-slate-800 font-semibold truncate mt-px">
                    {selectedGroup.location || "—"}
                  </span>
                  {selectedGroup.site && (
                    <span className="text-xs text-slate-700 font-medium">Site: {selectedGroup.site}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-blue-600" /> Contact
                  </span>
                  <span className="text-xs text-slate-800 font-semibold truncate mt-px">
                    {selectedGroup.contactPerson || "—"}
                  </span>
                  <span className="text-xs text-slate-700 font-mono">{selectedGroup.contactNumber || "—"}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5 text-blue-600" /> Segment
                  </span>
                  <span className="text-xs text-indigo-700 font-bold truncate mt-px">
                    {selectedGroup.segment}
                  </span>
                  <span className="text-xs text-slate-700 font-medium">Type: {selectedGroup.customerType}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5 text-blue-600" /> Priority Level
                  </span>
                  <span className={`text-xs font-bold truncate mt-px ${
                    selectedGroup.priority === 'Critical' ? 'text-rose-600' :
                    selectedGroup.priority === 'High' ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {selectedGroup.priority}
                  </span>
                  <span className="text-xs text-slate-700 font-medium">{selectedGroup.products.length} product(s)</span>
                </div>
              </div>

              {/* 2-Column Split: Available Engineers vs Selected Review */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Side: Eligible Engineer Roster */}
                <div className="w-[44%] flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50/40">
                  <div className="p-3.5 border-b border-slate-200 bg-white">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
                      <input 
                        type="text" 
                        placeholder="Search qualified engineers..." 
                        value={engSearch} 
                        onChange={e => setEngSearch(e.target.value)} 
                        className="w-full pl-7 pr-7 h-7 bg-slate-50 border border-gray-200 rounded-md outline-none focus:border-blue-500 focus:bg-white text-xs text-slate-800 font-normal transition-all" 
                      />
                      {engSearch && (
                        <button 
                          onClick={() => setEngSearch("")} 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {employeeListLoading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-[6vh]">
                        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                        <div className="text-xs font-semibold text-slate-700">Checking SLA eligible engineers...</div>
                        <div className="text-sm text-slate-700 font-normal max-w-56">
                          Matching against department requirements &amp; current active queue.
                        </div>
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="text-center py-[6vh] text-slate-700 text-xs">
                        No eligible engineers found matching query.
                      </div>
                    ) : (
                      filteredEmployees.map(emp => {
                        const isSelected = selectedEngineer?.userId === emp.userId;
                        return (
                          <div 
                            key={emp.userId} 
                            onClick={() => setSelectedEngineer(emp)} 
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br ${
                              isSelected ? 'from-white/30 to-white/10' : avatarColor(emp.name)
                            } text-white shadow-2xs shrink-0`}>
                              {initials(emp.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold text-xs leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                {emp.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-xs font-medium ${isSelected ? 'text-blue-100' : 'text-slate-700'}`}>
                                  {emp.department || "Engineer"}
                                </span>
                                {emp.activeTasks > 0 ? (
                                  <span className={`px-1.5 py-px rounded-full text-xs font-bold border ${
                                    isSelected 
                                      ? 'bg-amber-400/20 text-amber-100 border-amber-300/30' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {emp.activeTasks} Active
                                  </span>
                                ) : (
                                  <span className={`px-1.5 py-px rounded-full text-xs font-bold border ${
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
                              <CheckCircle className="w-4 h-4 text-white shrink-0" />
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
                    <div className="p-5 flex flex-col h-full overflow-y-auto custom-scrollbar justify-between">
                      <div className="space-y-4">
                        {/* Selected Engineer Banner */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-[37px] h-[37px] rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${avatarColor(selectedEngineer.name)} shadow-sm`}>
                              {initials(selectedEngineer.name)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800 leading-tight">
                                {selectedEngineer.name}
                              </div>
                              <div className="text-sm text-slate-700 font-medium mt-px">
                                {selectedEngineer.department} &bull; {selectedEngineer.role || "Specialist"}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold border ${
                            selectedEngineer.activeTasks > 0 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {selectedEngineer.activeTasks} Active Tasks
                          </span>
                        </div>

                        {/* Units Included */}
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                            <Package className="w-3 h-3 text-blue-600" />
                            <span>Allocated Products ({selectedGroup.products.length})</span>
                          </div>
                          <div className="space-y-1.5 max-h-[173px] overflow-y-auto custom-scrollbar pr-1">
                            {selectedGroup.products.map(({ p, productIdx }) => (
                              <div key={productIdx} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                <div>
                                  <div className="text-slate-800 font-bold">{p.productModel || p.itemCode}</div>
                                  {p.errorCode && (
                                    <div className="text-xs text-rose-600 font-medium">Issue Code: {p.errorCode}</div>
                                  )}
                                </div>
                                <span className="text-slate-700 font-mono text-sm bg-white px-1.5 py-px rounded border border-slate-200">
                                  SN: {p.serialNumber || "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SLA Resolution Target */}
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>SLA Delivery Window</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-600 uppercase">Target Hours</span>
                              <input 
                                type="number" 
                                min="0"
                                value={resHours} 
                                onChange={e => setResHours(e.target.value)} 
                                className="w-full px-2.5 h-8 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 transition-all" 
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-600 uppercase">Target Minutes</span>
                              <input 
                                type="number" 
                                min="0"
                                max="59"
                                value={resMins} 
                                onChange={e => setResMins(e.target.value)} 
                                className="w-full px-2.5 h-8 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800 transition-all" 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/60 mt-2.5">
                            <Info className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="text-sm text-blue-800 font-medium">
                              Resolution target starts counting upon assignment confirmation.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Action Button */}
                      <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5 mt-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEngineer(null)}
                          className="px-3.5 h-8 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Change Engineer
                        </button>
                        <button 
                          onClick={handleAssign}
                          disabled={isAssigning}
                          className="px-4 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)] cursor-pointer disabled:opacity-60"
                        >
                          {isAssigning ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Allocating...</span>
                            </>
                          ) : (
                            <>
                              <span>Confirm Assignment</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-7">
                      <div className="w-[55px] h-[55px] bg-blue-50 rounded-full flex items-center justify-center mb-3 text-blue-500">
                        <UserPlus className="w-6.5 h-6.5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Select an Eligible Engineer</div>
                      <div className="text-xs text-slate-700 max-w-[288px] mt-1">
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

      {/* Full Details Call Modal */}
      {selectedInfoCall && (
        <CallDetailsModal
          call={selectedInfoCall}
          employees={employees}
          onClose={() => setSelectedInfoCall(null)}
        />
      )}
    </div>
  );
}
