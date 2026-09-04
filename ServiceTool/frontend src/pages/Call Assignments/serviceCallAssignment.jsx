import React, { useState, useEffect, useMemo } from "react";
import {
  Search, X, User, CheckCircle, Clock,
  ArrowRight, Activity, Shield, Package,
  Layers, ChevronDown, ChevronUp, Users,
  AlertCircle, Tag, CheckSquare, AlertTriangle,
  MapPin, Phone, Calendar,
  UserPlus, Hash, Settings, Square, ChevronLeft, ChevronRight,
  ClipboardList, Briefcase, Info, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";

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
  "from-blue-500 to-blue-700", "from-indigo-500 to-indigo-700",
  "from-violet-500 to-violet-700", "from-sky-500 to-sky-700",
  "from-emerald-500 to-emerald-700", "from-teal-500 to-teal-700",
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
      // Treat the call as one single assignable entity rather than splitting by segment
      groups.push({
        groupKey: c._id || c.id,
        callId: c._id || c.id,
        callNumber: c.callNumber,
        customerName: c.customerName,
        partyCode: c.partyCode,
        contactPerson: c.contactPerson || "",
        contactNumber: c.contactNumber || "",
        location: c.location || "",
        priority: c.priority,
        dateTime: c.dateTime,
        timestamp: c.timestamp,
        segment: items[0].p.productSegment || "—", // Reference segment for SLA/flow from the first product
        customerType: c.customerType || "All",
        status: c.status || "Registered",
        products: items,
      });
    }
  });

  // Show latest records first (descending by call timestamp/date)
  // Fallback order: `timestamp` -> `dateTime` -> `createdAt` -> 0
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
  const [slaConfig, setSlaConfig]   = useState(null); // { configured, level0, steps }
  const [slaLoading, setSlaLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useNotification();

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

        // Filter out calls where all unassigned products have reached the end of their escalation chain
        const custDb = lsLoad(CUSTOMER_DB_KEY, []);
        const escQueue = lsLoad(ESCALATION_KEY, []);
        
        const validCalls = callRes.data.filter(c => {
          // If the call is already escalating (has an active timer), do not show it on Assignment Desk
          const activeEscalation = escQueue.find(q => q.callId === (c._id || c.id));
          if (activeEscalation && activeEscalation.status !== "Resolved" && activeEscalation.status !== "Closed") {
            return false;
          }

          const custRow = custDb.find(r => r.partyCode === c.partyCode);
          const partyType = custRow?.partyType || c.customerType || "All";
          
          return (c.products || []).some(p => {
            // Only consider products that are not yet assigned or resolved or critical
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
            
            // A product is "dead" if its escalation level has reached or exceeded the flow length
            return (p._escalationLevel || 0) < flowSteps.length;
          });
        });

        // Build groups from filtered calls
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

  const filteredGroups = useMemo(() => {
    const s = searchTerm.toLowerCase();
    let res = groups;
    
    // 2. Dropdown Priority Filter (further refine if needed)
    if (priorityFilter !== "All") res = res.filter(g => g.priority === priorityFilter);
    
    // 3. Search
    if (!s) return res;
    return res.filter(g =>
      g.callNumber.toLowerCase().includes(s) ||
      g.customerName.toLowerCase().includes(s) ||
      g.segment.toLowerCase().includes(s) ||
      g.products.some(({ p }) => (p.productModel || p.itemCode || "").toLowerCase().includes(s))
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
  }, [selectedGroup]);

  // Fetch SLA config whenever a new group is selected
  useEffect(() => {
    if (!selectedGroup) { setSlaConfig(null); return; }
    // Reset config so we don't briefly show previous group's filtered employees
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
  }, [selectedGroup]);

  const processedEmployees = useMemo(() => {
    let eligibleIds  = new Set();
    let useEligible  = false;
    let workloadMap  = {};
    
    // First, check if there is an explicit flow from backend
    let eligibleDept = slaConfig?.configured ? (slaConfig.level0?.dept || "") : "";
    
    // If no explicit flow, use the first department of the fallback selectedFlow
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
      // If not configured, but we have a fallback department
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
    // Sort: Available (0 tasks) first, then by number of active tasks ascending
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
        resHours,
        resMins,
        segment:        selectedGroup.segment,
        customerType:   partyType,
      };

      await axios.post(`${API_URL}/service-calls/assign`, payload);

      toast(`Assigned to ${selectedEngineer.name} successfully`);
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
    <div className="w-full h-screen flex flex-col bg-white overflow-hidden rounded-xl max-h-[90vh] font-sans text-[0.85vw]">

      {/* ── HEADER ────────────────────────────────── */}
      <div className="px-[1.5vw] py-[0.8vw] flex items-center  justify-between border-b border-slate-400">
        {/* <div className="flex items-center gap-[0.8vw]">
          <span className="text-[0.7vw] bg-blue-100 text-blue-700 px-[0.4vw] py-[0.1vw] rounded font-bold border border-blue-200">
            Total :{filteredGroups.length} 
          </span>
        </div> */}

        <div className="flex items-center gap-[1.5vw]">
          <div className="relative">
            <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-blue-400" />
            <input
              type="text"
              placeholder="Search customers or calls..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-[25vw] h-[2.2vw] pl-[2vw] pr-[1vw] bg-slate-50 border border-slate-400 rounded-md outline-none focus:border-blue-400 transition-all text-black font-normal"
            />
          </div>
          
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-[2.2vw] px-[0.6vw] bg-white border border-slate-400 rounded-md outline-none focus:border-blue-400 cursor-pointer text-black font-normal"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* ── TABLE (ServiceCall.jsx Style) ────────────────────────── */}
      <div className="flex-1 overflow-hidden px-[1.5vw] py-[1vw] flex flex-col">
        <div className="bg-white rounded-[0.6vw] border border-slate-400 flex flex-col w-full flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
            <thead className="bg-blue-50 sticky top-0 z-10">
              <tr>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-center w-[4%] text-[0.78vw]">S.No</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-center w-[10%] text-[0.78vw]">Call Info</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-center w-[8%] text-[0.78vw]">Category</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 w-[18%] text-[0.78vw]">Customer</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-center w-[8%] text-[0.78vw]">Segment</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-[0.78vw]">Product Details</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-r border-slate-400 text-center w-[8%] text-[0.78vw]">Urgency</th>
                <th className="p-[0.6vw] font-bold text-black border-b border-slate-400 text-center w-[8%] text-[0.78vw]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 border-b border-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-[10vh] text-center">
                    <div className="flex flex-col items-center justify-center gap-[1vw]">
                      <Loader2 className="w-[3vw] h-[3vw] animate-spin text-blue-600" />
                      <span className="text-[1vw] font-bold text-blue-600">Loading Assignments...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr><td colSpan={8} className="py-[10vh] text-center text-black italic font-normal">No records found.</td></tr>
              ) : (
                paginatedGroups.map((g, idx) => {
                  const rowCount = g.products.length;
                  const isCritical = g.priority === "Critical";
                  const criticalCellClass = isCritical ? "border-t-[0.15vw] border-b-[0.15vw] border-red-300 first:border-l-[0.15vw] last:border-r-[0.15vw]" : "border-slate-400";

                  return g.products.map((item, pIdx) => (
                    <tr key={`${g.groupKey}-${pIdx}`} className={`hover:bg-blue-50/20 transition-colors`}>
                      {pIdx === 0 && (
                        <>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle text-black font-normal text-[0.78vw] ${criticalCellClass}`}>
                            {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </td>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle ${criticalCellClass}`}>
                            <div className="font-semibold text-blue-600 text-[0.78vw] leading-tight">{g.callNumber}</div>
                            <div className="text-[0.65vw] text-black font-normal mt-[0.1vw]">
                              {new Date(g.timestamp || g.dateTime).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </td>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle ${criticalCellClass}`}>
                            <span className={`px-[0.5vw] py-[0.15vw] rounded text-[0.62vw] font-bold border uppercase whitespace-nowrap bg-purple-50 text-purple-700 border-purple-200`}>
                              {g.customerType || "—"}
                            </span>
                          </td>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r align-middle ${criticalCellClass}`}>
                            <div className="font-semibold text-black text-[0.78vw] truncate max-w-[15vw]" title={g.customerName}>
                              {g.customerName}
                            </div>
                            <div className="flex items-center gap-[0.4vw] mt-[0.1vw]">
                              <span className="text-[0.6vw] text-blue-700 font-semibold bg-blue-50 px-[0.3vw] py-[0.05vw] rounded border border-slate-400">{g.partyCode}</span>
                              <span className="text-[0.65vw] text-black font-normal uppercase">{g.location}</span>
                            </div>
                          </td>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle ${criticalCellClass}`}>
                            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 px-[0.5vw] py-[0.15vw] rounded text-[0.68vw] font-semibold uppercase">
                              {g.segment}
                            </span>
                          </td>
                        </>
                      )}

                      <td className={`p-[0.8vw] border-r align-middle ${criticalCellClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.78vw] text-black font-normal">{item.p.productModel || item.p.itemCode}</span>
                          <span className="text-[0.68vw] text-blue-700 font-normal">SN: {item.p.serialNumber || "—"}</span>
                        </div>
                        {item.p.errorCode && (
                          <div className="mt-[0.2vw]">
                            <span className="bg-red-50 text-red-600 border border-red-100 px-[0.4vw] py-[0.05vw] rounded text-[0.65vw] font-normal uppercase">
                              Err: {item.p.errorCode}
                            </span>
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <>
                          <td rowSpan={rowCount} className={`p-[0.8vw] border-r text-center align-middle ${criticalCellClass}`}>
                            <span className={`px-[0.5vw] py-[0.15vw] rounded text-[0.68vw] font-bold border uppercase whitespace-nowrap ${g.priority === 'Critical' ? 'bg-red-600 text-white border-red-700' :
                                g.priority === 'High' ? 'bg-orange-500 text-white border-orange-600' :
                                  'bg-blue-600 text-white border-blue-700'
                              }`}>
                              {g.priority}
                            </span>
                          </td>
                          <td rowSpan={rowCount} className={`p-[0.8vw] text-center align-middle ${criticalCellClass}`}>
                            <button
                              onClick={() => setSelectedGroup(g)}
                              className="cursor-pointer inline-flex items-center gap-[0.4vw] bg-blue-600 text-white px-[1vw] py-[0.45vw] rounded-md font-semibold text-[0.75vw] hover:bg-blue-700 active:scale-95 transition-all border border-blue-500"
                            >
                              Assign <ArrowRight className="w-[1vw] h-[1vw]" />
                            </button>
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
        </div>

        {/* Pagination */}
        <div className="mt-[1vw] flex items-center justify-between px-[0.5vw]">
          <p className="text-[0.75vw] text-gray-500 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredGroups.length)} of {filteredGroups.length} records
            </p>
            <div className="flex items-center gap-[0.5vw]">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-[0.5vw] rounded-md border border-slate-400 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-[1.2vw] h-[1.2vw]" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-[2.2vw] h-[2.2vw] rounded-md border font-bold text-[0.75vw] transition-all cursor-pointer ${
                    currentPage === p ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-400 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-[0.5vw] rounded-md border border-slate-400 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-[1.2vw] h-[1.2vw]" />
              </button>
            </div>
          </div>
      </div>

      {/* ── ASSIGNMENT MODAL ───────────────────── */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-[2vw]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedGroup(null)} />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-[70vw] max-h-[90vh] bg-white rounded-xl flex flex-col overflow-hidden border border-slate-400"
            >
              {/* Header */}
              <div className="px-[1.5vw] py-[1vw] border-b border-slate-400 flex items-center justify-between bg-blue-50/30">
                <div className="flex items-center gap-[1vw]">
                  <div className="w-[2.5vw] h-[2.5vw] bg-blue-600 rounded-lg flex items-center justify-center text-white border border-blue-500">
                    <UserPlus className="w-[1.2vw] h-[1.2vw]" />
                  </div>
                  <h2 className="text-[1.2vw] font-bold text-black">{selectedGroup.customerName}</h2>
                </div>
                <button onClick={() => setSelectedGroup(null)} className="p-[0.5vw] hover:bg-blue-50 rounded-full text-blue-400 transition-colors">
                  <X className="w-[1.2vw] h-[1.2vw]" />
                </button>
              </div>

              {/* SLA config warning */}
              {!slaLoading && !slaIsConfigured && selectedGroup && (
                <div className="mx-[1.5vw] mt-[0.7vw] flex items-center gap-[0.6vw] bg-yellow-50 border border-yellow-200 rounded-lg px-[1vw] py-[0.45vw]">
                  <AlertTriangle className="w-[0.9vw] h-[0.9vw] text-yellow-600 flex-shrink-0" />
                  <span className="text-[0.72vw] text-yellow-700 font-medium">
                    No SLA specifically configured for this Customer Type &amp; Segment — defaulting to first level department.
                  </span>
                </div>
              )}

              {/* 1. TOP SPLIT (Width Fully) - Contact Related Details */}
              <div className="p-[1.5vw] bg-slate-50 border-b border-blue-50 grid grid-cols-5 gap-[1.5vw]">
                <div className="flex flex-col gap-[0.2vw]">
                  <span className="text-[0.85vw] font-bold text-blue-600 flex items-center gap-[0.3vw]"><MapPin className="w-[0.7vw] h-[0.7vw]" /> Location</span>
                  <span className="text-[0.85vw] text-black font-semibold leading-tight">{selectedGroup.location}</span>
                </div>
                <div className="flex flex-col gap-[0.2vw]">
                  <span className="text-[0.85vw] font-bold text-blue-600 flex items-center gap-[0.3vw]"><User className="w-[0.7vw] h-[0.7vw]" /> Contact Person</span>
                  <span className="text-[0.85vw] text-black font-semibold">{selectedGroup.contactPerson || "—"}</span>
                </div>
                <div className="flex flex-col gap-[0.2vw]">
                  <span className="text-[0.85vw] font-bold text-blue-600 flex items-center gap-[0.3vw]"><Phone className="w-[0.7vw] h-[0.7vw]" /> Phone</span>
                  <span className="text-[0.85vw] text-black font-semibold">{selectedGroup.contactNumber || "—"}</span>
                </div>
                <div className="flex flex-col gap-[0.2vw]">
                  <span className="text-[0.85vw] font-bold text-blue-600 flex items-center gap-[0.3vw]"><Hash className="w-[0.7vw] h-[0.7vw]" /> Reference</span>
                  <span className="text-[0.85vw] text-black font-semibold">{selectedGroup.callNumber}</span>
                </div>
                <div className="flex flex-col gap-[0.2vw]">
                  <span className="text-[0.85vw] font-bold text-blue-600 flex items-center gap-[0.3vw]"><Tag className="w-[0.7vw] h-[0.7vw]" /> Segment</span>
                  <span className="text-[0.85vw] text-black font-semibold">{selectedGroup.segment}</span>
                </div>
              </div>

              {/* 2. BOTTOM SPLIT - Horizontal Left (Employees) & Right (Assignment View) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Employee List */}
                <div className="w-[45%] flex flex-col border-r border-blue-50 overflow-hidden">
                  <div className="p-[1vw] border-b border-blue-50">
                    <div className="relative">
                      <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-blue-400" />
                      <input 
                        type="text" 
                        placeholder="Search for available engineers..." 
                        value={engSearch} 
                        onChange={e => setEngSearch(e.target.value)} 
                        className="w-full pl-[2.2vw] pr-[2.2vw] py-[0.5vw] bg-white border border-slate-400 rounded-md outline-none focus:border-blue-400 text-[0.8vw] text-black font-normal" 
                      />
                      {engSearch && (
                        <button 
                          onClick={() => setEngSearch("")} 
                          className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-[0.9vw] h-[0.9vw]" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-[1vw] space-y-[0.6vw]">
                    {employeeListLoading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-[0.8vw] text-center py-[6vh]">
                        <Loader2 className="w-[2vw] h-[2vw] animate-spin text-blue-600" />
                        <div className="text-[0.85vw] font-semibold text-blue-700">Loading eligible engineers...</div>
                        <div className="text-[0.7vw] text-gray-500 font-normal">
                          Applying SLA (Level 1) rules for this customer &amp; segment
                        </div>
                      </div>
                    ) : (
                      filteredEmployees.map(emp => (
                        <div key={emp.userId} onClick={() => setSelectedEngineer(emp)} 
                          className={`flex items-center gap-[0.8vw] p-[0.8vw] rounded-lg border transition-all cursor-pointer ${
                            selectedEngineer?.userId === emp.userId ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-400 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}>
                          <div className={`w-[2.5vw] h-[2.5vw] rounded-lg flex items-center justify-center font-bold text-[1vw] bg-gradient-to-br ${
                            selectedEngineer?.userId === emp.userId ? 'from-white/20 to-white/5' : avatarColor(emp.name)
                          } text-white border border-white/20`}>{initials(emp.name)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[0.9vw]">{emp.name}</div>
                            <div className={`text-[0.7vw] font-normal flex items-center gap-[0.4vw] mt-[0.2vw] ${selectedEngineer?.userId === emp.userId ? 'text-blue-100' : 'text-blue-600'}`}>
                              <span>{emp.department}</span>
                              {emp.activeTasks > 0 ? (
                                <span className="bg-amber-100 text-amber-700 px-[0.4vw] py-[0.1vw] rounded text-[0.6vw] font-bold border border-amber-200">
                                  Working ({emp.activeTasks} Tasks)
                                </span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-[0.4vw] py-[0.1vw] rounded text-[0.6vw] font-bold border border-green-200">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedEngineer?.userId === emp.userId && <CheckCircle className="w-[1.2vw] h-[1.2vw]" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Side: Assignment View */}
                <div className="flex-1 bg-blue-50/10 flex flex-col overflow-hidden">
                  {selectedEngineer ? (
                    <div className="py-[.5vw] px-[2vw] flex flex-col h-full">
                      <div className="flex-1 flex flex-col gap-[2vw] overflow-y-auto">
                        {/* Selected Engineer Card */}
                        <div className="bg-white p-[1.2vw] rounded-xl border border-slate-400 flex items-center gap-[1.2vw]">
                          <div className={`w-[2.8vw] h-[2.8vw] rounded-lg flex items-center justify-center text-[1vw] font-bold text-white bg-gradient-to-br ${avatarColor(selectedEngineer.name)} border border-slate-400 shadow-none`}>
                            {initials(selectedEngineer.name)}
                          </div>
                          <div>
                            <div className="text-[1.1vw] font-bold text-black leading-none">{selectedEngineer.name}</div>
                            <div className="text-[0.8vw] text-black font-semibold mt-[0.2vw]">{selectedEngineer.department}</div>
                            <div className="flex items-center gap-[0.4vw] mt-[0.3vw] text-[0.72vw] text-black">
                              <Activity className="w-[0.8vw] h-[0.8vw] text-green-500" /> {selectedEngineer.activeTasks} active tasks
                            </div>
                          </div>
                        </div>

                        {/* Units Review */}
                        <div className="space-y-[0.8vw]">
                          <div className="flex items-center gap-[0.5vw] text-[0.7vw] font-bold text-blue-600 uppercase tracking-widest">
                            <Package className="w-[1vw] h-[1vw]" /> Allocated Products ({selectedGroup.products.length})
                          </div>
                          <div className="space-y-[0.4vw]">
                            {selectedGroup.products.map(({ p, productIdx }) => (
                              <div key={productIdx} className="bg-white p-[0.8vw] rounded-lg border border-blue-300 flex items-center justify-between text-[0.8vw]">
                                <span className="text-black font-semibold">{p.productModel || p.itemCode}</span>
                                <span className="text-black font-normal">SN: {p.serialNumber || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Target Time Setting */}
                        <div className="space-y-[1vw]">
                          <div className="flex items-center gap-[0.5vw] text-[0.7vw] font-bold text-blue-600 uppercase tracking-widest">
                            <Clock className="w-[1vw] h-[1vw]" /> Service Delivery Target
                          </div>
                          <div className="flex items-center gap-[1.5vw]">
                            <div className="flex-1 flex flex-col gap-[0.4vw]">
                              <span className="text-[0.6vw] font-bold text-gray-800 uppercase">Target Hours</span>
                              <input 
                                type="number" 
                                value={resHours} 
                                onChange={e => setResHours(e.target.value)} 
                                className="w-full px-[0.8vw] py-[0.5vw] bg-white border border-slate-400 rounded-lg outline-none focus:border-blue-500 focus:ring-1 ring-blue-100 text-[1vw] font-bold text-black transition-all" 
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-[0.4vw]">
                              <span className="text-[0.6vw] font-bold text-gray-800 uppercase">Minutes</span>
                              <input 
                                type="number" 
                                value={resMins} 
                                onChange={e => setResMins(e.target.value)} 
                                className="w-full px-[0.8vw] py-[0.5vw] bg-white border border-slate-400 rounded-lg outline-none focus:border-blue-500 focus:ring-1 ring-blue-100 text-[1vw] font-bold text-black transition-all" 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-[0.5vw] p-[0.8vw] bg-blue-50 rounded-lg border border-slate-400">
                            <Info className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                            <span className="text-[0.7vw] text-black font-medium">Engineer will be notified of the deadline immediately.</span>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Button */}
                      <button 
                        onClick={handleAssign}
                        disabled={isAssigning}
                        className="w-fit px-[1vw] ml-auto mt-[1.5vw] py-[.85vw] bg-blue-600 text-white rounded-xl font-bold text-[1vw] hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-[1vw] border border-blue-500 cursor-pointer"
                      >
                        {isAssigning ? "Processing Allocation..." : <>Confirm Assignment to {selectedEngineer.name.split(" ")[0]} <ArrowRight className="w-[1.2vw] h-[1.2vw]" /></>}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-[2vw]">
                      <div className="w-[5vw] h-[5vw] bg-blue-50 rounded-full flex items-center justify-center mb-[1vw]">
                        <UserPlus className="w-[2.5vw] h-[2.5vw] text-blue-300" />
                      </div>
                      <div className="text-[1.2vw] font-bold text-slate-400">Select an Engineer</div>
                      <div className="text-[0.8vw] text-slate-400 mt-[0.5vw]">Choose an engineer from the left panel to proceed with the allocation.</div>
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
