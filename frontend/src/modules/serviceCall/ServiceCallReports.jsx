import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import ProductHistoryModal from "./ProductHistoryModal";
import { CallDetailsModal } from "./responseComponents/CallDetailsModal";
import {
  FileText,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  History,
  Info,
  Edit3,
  Phone,
  Shield,
  UserCheck,
  Search,
  Filter,
  Flame,
  Columns,
  CheckSquare,
  Square,
  Users,
  Check,
  RotateCcw,
  UserPlus,
  TrendingUp,
  Sparkles,
  Eye,
  CheckCircle2,
  PauseCircle,
  MapPin,
  LifeBuoy,
} from "lucide-react";
import akiraLogo from "../../assets/Akira_logo.webp";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStatusCfg,
  getProductStatus as getCallProductStatus,
  deriveCallStatus,
  getTypeColor,
  PRIORITIES,
  CallSummaryModal,
} from "./ServiceCall";

const getCustomerTypeTextColor = (type) => {
  switch (type) {
    case "OEM":
      return "text-blue-600";
    case "End Customer":
      return "text-emerald-600";
    case "Distributor":
      return "text-purple-600";
    case "Dealer":
      return "text-amber-600";
    default:
      return "text-slate-700";
  }
};

const EXPORT_COLUMNS_CONFIG = [
  { key: "S.No", label: "S.No" },
  { key: "Call Number", label: "Call Number" },
  { key: "Type", label: "Origin Type" },
  { key: "Date & Time", label: "Date & Time" },
  { key: "Customer Name", label: "Customer Name" },
  { key: "Party Code", label: "Party Code" },
  { key: "Customer Type", label: "Customer Type" },
  { key: "Priority", label: "Priority" },
  { key: "Product Model", label: "Product Model" },
  { key: "Serial Number", label: "Serial Number" },
  { key: "Error Code", label: "Error Code" },
  { key: "Registered By", label: "Registered By" },
  { key: "Assigned Engineer", label: "Assigned Engineer" },
  { key: "Escalated Status", label: "Escalated Status" },
  { key: "Escalated Level", label: "Escalated Level" },
  { key: "Escalated To (Person/Dept)", label: "Escalated To" },
  { key: "Escalation Flow History", label: "Escalation Flow History" },
  { key: "Status", label: "Status" },
  { key: "Closed Date", label: "Closed Date" },
  { key: "Contact Number", label: "Contact Number" },
  { key: "Last Edited", label: "Last Edited" },
];

const LOCAL_STORAGE_EXPORT_COLS_KEY = "service_call_reports_export_columns";

const API_URL = import.meta.env.VITE_API_URL;

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fmtDateTime = (dStr) => {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
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
    return `${datePart}, ${timePart}`;
  } catch {
    return dStr;
  }
};

const formatDurationFrom = (startDateStr, endDateStr = null) => {
  if (!startDateStr) return "—";
  try {
    const start = new Date(startDateStr).getTime();
    const end = endDateStr ? new Date(endDateStr).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
  } catch {
    return "—";
  }
};

const CustomTooltip = ({ children, text, position = "top", className = "" }) => {
  if (!text) return children;

  const positionClasses = {
    top: "bottom-[calc(100%+0.35vw)] left-1/2 -translate-x-1/2",
    bottom: "top-[calc(100%+0.35vw)] left-1/2 -translate-x-1/2",
    left: "right-[calc(100%+0.35vw)] top-1/2 -translate-y-1/2",
    right: "left-[calc(100%+0.35vw)] top-1/2 -translate-y-1/2",
    "top-start": "bottom-[calc(100%+0.35vw)] left-0",
    "top-end": "bottom-[calc(100%+0.35vw)] right-0",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-x-[0.25vw] border-x-transparent border-t-[0.25vw] border-t-slate-900",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-x-[0.25vw] border-x-transparent border-b-[0.25vw] border-b-slate-900",
    left: "left-full top-1/2 -translate-y-1/2 border-y-[0.25vw] border-y-transparent border-l-[0.25vw] border-l-slate-900",
    right: "right-full top-1/2 -translate-y-1/2 border-y-[0.25vw] border-y-transparent border-r-[0.25vw] border-r-slate-900",
    "top-start": "top-full left-[0.6vw] border-x-[0.25vw] border-x-transparent border-t-[0.25vw] border-t-slate-900",
    "top-end": "top-full right-[0.6vw] border-x-[0.25vw] border-x-transparent border-t-[0.25vw] border-t-slate-900",
  };

  return (
    <div className={`relative group/tip inline-flex items-center ${className}`}>
      {children}
      <div
        className={`hidden group-hover/tip:flex items-center absolute z-50 bg-slate-900 text-white rounded-md px-[0.55vw] py-[0.25vw] text-[0.68vw] font-normal tracking-wide shadow-md pointer-events-none whitespace-nowrap border border-slate-700 ${
          positionClasses[position] || positionClasses.top
        }`}
      >
        <span>{text}</span>
        <div className={`absolute w-0 h-0 ${arrowClasses[position] || arrowClasses.top}`} />
      </div>
    </div>
  );
};

export default function ServiceCallReports() {
  const { toast } = useNotification();

  // Current logged in user context
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("loggedInUser")) ||
        JSON.parse(localStorage.getItem("loggedInUser")) ||
        null
      );
    } catch {
      return null;
    }
  });

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === "Admin" ||
      currentUser.role === "admin" ||
      currentUser.department === "Admin"
    );
  }, [currentUser]);

  // View state: "registered" | "escalations" | "assignments" | "employees"
  const [activeMainView, setActiveMainView] = useState("registered");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("All"); // "All" | "Self Assigned" | "Admin Registered"
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Registered" | "Assigned" | "Supporting" | "Field Visit" | "Pending" | "Escalating" | "Resolved" | "Critical"
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Data
  const [calls, setCalls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Modals
  const [historyModalCall, setHistoryModalCall] = useState(null);
  const [selectedInfoCall, setSelectedInfoCall] = useState(null);
  const [editingReportItem, setEditingReportItem] = useState(null);

  // Column export selection state (stored in localStorage)
  const [selectedExportCols, setSelectedExportCols] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_EXPORT_COLS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to read export column preferences:", e);
    }
    return EXPORT_COLUMNS_CONFIG.map((c) => c.key);
  });
  const [showColPicker, setShowColPicker] = useState(false);

  const toggleExportCol = (key) => {
    setSelectedExportCols((prev) => {
      let updated;
      if (prev.includes(key)) {
        if (prev.length === 1) {
          toast("At least one column must be selected for export", "warning");
          return prev;
        }
        updated = prev.filter((k) => k !== key);
      } else {
        updated = [...prev, key];
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_EXPORT_COLS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save export columns:", err);
      }
      return updated;
    });
  };

  const selectAllExportCols = () => {
    const all = EXPORT_COLUMNS_CONFIG.map((c) => c.key);
    setSelectedExportCols(all);
    try {
      localStorage.setItem(LOCAL_STORAGE_EXPORT_COLS_KEY, JSON.stringify(all));
    } catch (err) {}
  };

  const resetDefaultExportCols = () => {
    const all = EXPORT_COLUMNS_CONFIG.map((c) => c.key);
    setSelectedExportCols(all);
    try {
      localStorage.removeItem(LOCAL_STORAGE_EXPORT_COLS_KEY);
    } catch (err) {}
  };
  const [editForm, setEditForm] = useState({
    status: "",
    remarks: "",
    resolutionType: "",
    editReason: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Initial Fetch & Refresh Listener
  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, callRes] = await Promise.all([
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/service-calls`),
      ]);
      setEmployees(empRes.data || []);
      setCalls(callRes.data || []);
    } catch (err) {
      console.error("Failed to load report data:", err);
      toast("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener("service-calls-refresh", handleRefresh);
    return () => window.removeEventListener("service-calls-refresh", handleRefresh);
  }, []);

  // Filtered Calls based on role (Employee vs Admin)
  const scopedCalls = useMemo(() => {
    if (isAdmin) return calls;
    if (!currentUser) return [];

    const uid = currentUser.userId;
    const uName = currentUser.name;

    return calls.filter((c) => {
      // Direct registered by user
      if (c.registeredBy === uid || c.currentEngineerId === uid) return true;
      if (c.registeredByName === uName || c.currentEngineerName === uName) return true;

      // Products assigned, supported or field visited
      return (c.products || []).some(
        (p) =>
          p._assignedEngineerId === uid ||
          p._assignedEngineerName === uName ||
          p._supportPersonId === uid ||
          p._fieldVisit?.assignedTo === uid ||
          p._fieldVisit?.assignedBy === uid,
      );
    });
  }, [calls, isAdmin, currentUser]);

  // Date, Priority, Call Type & Search Filtering
  const filteredCalls = useMemo(() => {
    let start = null;
    if (fromDate) {
      const [sYear, sMonth, sDay] = fromDate.split("-");
      start = new Date(sYear, sMonth - 1, sDay);
      start.setHours(0, 0, 0, 0);
    }

    let end = null;
    if (toDate) {
      const [eYear, eMonth, eDay] = toDate.split("-");
      end = new Date(eYear, eMonth - 1, eDay);
      end.setHours(23, 59, 59, 999);
    }

    const q = search.trim().toLowerCase();

    return scopedCalls.filter((c) => {
      // Date filter
      const callDate = new Date(c.createdAt || c.timestamp || c.dateTime);
      if (start && callDate < start) return false;
      if (end && callDate > end) return false;

      // Call Type filter
      const isSelf = c.noEscalation === true;
      if (callTypeFilter === "Self Assigned" && !isSelf) return false;
      if (callTypeFilter === "Admin Registered" && isSelf) return false;

      // Priority filter
      if (priorityFilter !== "All" && c.priority !== priorityFilter) return false;

      // Status filter
      if (statusFilter !== "All") {
        const derived = deriveCallStatus(c.products || [], c.status);
        if (statusFilter === "Critical") {
          const isCrit = derived === "Critical" || c.status === "Critical" || c.status === "Critical_Unresolved";
          if (!isCrit) return false;
        } else if (statusFilter === "Escalating") {
          const isEsc = derived === "Escalating" || c.status === "Escalated";
          if (!isEsc) return false;
        } else if (statusFilter === "Resolved") {
          const isRes = derived === "Resolved" || c.status === "Resolved" || c.status === "Closed";
          if (!isRes) return false;
        } else if (derived.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Text search
      if (q) {
        const matchesNo = (c.callNumber || "").toLowerCase().includes(q);
        const matchesCust = (c.customerName || "").toLowerCase().includes(q);
        const matchesCode = (c.partyCode || "").toLowerCase().includes(q);
        const matchesContact = (c.contactNumber || "").toLowerCase().includes(q);
        const matchesProd = (c.products || []).some(
          (p) =>
            (p.productModel || "").toLowerCase().includes(q) ||
            (p.itemCode || "").toLowerCase().includes(q) ||
            (p.serialNumber || "").toLowerCase().includes(q) ||
            (p.errorCode || "").toLowerCase().includes(q),
        );
        if (!matchesNo && !matchesCust && !matchesCode && !matchesContact && !matchesProd) {
          return false;
        }
      }

      return true;
    });
  }, [scopedCalls, fromDate, toDate, callTypeFilter, statusFilter, priorityFilter, search]);

  // Escalation View Items: Calls with escalation events
  const escalationItems = useMemo(() => {
    const list = [];
    filteredCalls.forEach((call) => {
      const escHistory = call.escalationHistory || call._escalationHistory || [];
      const products = call.products || [];

      // Check if call or any product has escalation history or is critical
      products.forEach((prod, pIdx) => {
        const prodEsc = prod._escalationHistory || [];
        const combinedEsc = [...escHistory, ...prodEsc];

        if (combinedEsc.length > 0 || prod._isCritical || call.priority === "Critical") {
          // Identify initial escalation or latest escalation event
          const latestEsc = combinedEsc[combinedEsc.length - 1] || {};
          const firstEsc = combinedEsc[0] || {};

          const escalatedBy =
            latestEsc.escalatedByName ||
            latestEsc.escalatedBy ||
            firstEsc.escalatedByName ||
            firstEsc.escalatedBy ||
            call.registeredByName ||
            call.registeredBy ||
            "System Automation";

          const escalatedAt =
            latestEsc.escalatedAt ||
            latestEsc.assignedAt ||
            firstEsc.assignedAt ||
            call.createdAt;

          const reason =
            latestEsc.reason ||
            latestEsc.remarks ||
            firstEsc.reason ||
            firstEsc.remarks ||
            prod.errorCode ||
            call.priority ||
            "SLA Escalation";

          const isClosed =
            prod._resolved ||
            prod._productClosure?.status === "Closed" ||
            prod._productClosure?.status === "Resolved";

          const closedAt =
            prod._productClosure?.closedAt ||
            prod._productClosure?.date ||
            (isClosed ? prod._productClosure?.updatedAt : null);

          list.push({
            call,
            prod,
            pIdx,
            escalatedBy,
            escalatedAt,
            reason,
            isClosed,
            closedAt,
            openDuration: formatDurationFrom(escalatedAt, isClosed ? closedAt : null),
          });
        }
      });
    });
    return list;
  }, [filteredCalls]);

  // Assignment Report (Merged Employee Overview & Per-User Analytics)
  const assignmentReportData = useMemo(() => {
    return employees
      .filter((emp) => emp.role?.toLowerCase() !== "admin")
      .map((emp) => {
        // Find calls associated with this user
        const userCalls = filteredCalls.filter((call) =>
          (call.products || []).some(
            (p) =>
              p._assignedEngineerId === emp.userId ||
              p._assignedEngineerName === emp.name ||
              p._supportPersonId === emp.userId ||
              p._fieldVisit?.assignedTo === emp.userId ||
              call.registeredBy === emp.userId ||
              call.currentEngineerName === emp.name,
          ),
        );

        // Product level count & details for this user
        let assignedProducts = 0;
        let closedProducts = 0;
        let selfAssignedCount = 0;
        const responseTimesMs = [];

        userCalls.forEach((call) => {
          const isCallSelfAssigned = Boolean(
            call.noEscalation ||
            call.callOrigin === "self_assigned" ||
            call.registeredBy === emp.userId ||
            call.registeredByName === emp.name
          );

          (call.products || []).forEach((p) => {
            const isUserAssigned =
              p._assignedEngineerId === emp.userId ||
              p._assignedEngineerName === emp.name ||
              p._supportPersonId === emp.userId ||
              p._fieldVisit?.assignedTo === emp.userId ||
              (!p._assignedEngineerId && call.currentEngineerName === emp.name);

            if (isUserAssigned) {
              assignedProducts++;

              if (isCallSelfAssigned) {
                selfAssignedCount++;
              }

              const isClosed =
                p._resolved ||
                p._productClosure?.status === "Closed" ||
                p._productClosure?.status === "Resolved";

              if (isClosed) {
                closedProducts++;
              }

              // Response time calculation: from assignment time to first response/closure/action
              const assignedTime = p._assignedAt || p.assignedAt || call.createdAt || call.dateTime;
              const responseTime =
                p._firstResponseAt ||
                p._attendedAt ||
                p._productClosure?.closedAt ||
                p._productClosure?.date ||
                (isClosed ? p._productClosure?.updatedAt : null);

              if (assignedTime && responseTime) {
                const diff = new Date(responseTime) - new Date(assignedTime);
                if (diff > 0 && diff < 30 * 24 * 60 * 60 * 1000) { // filter out invalid outliers > 30 days
                  responseTimesMs.push(diff);
                }
              }
            }
          });
        });

        // Compute open products
        const openProducts = Math.max(0, assignedProducts - closedProducts);

        // Compute average response time
        let avgResponseTimeFormatted = "—";
        let avgResponseMinutes = 0;
        if (responseTimesMs.length > 0) {
          const totalMs = responseTimesMs.reduce((acc, ms) => acc + ms, 0);
          const avgMs = totalMs / responseTimesMs.length;
          avgResponseMinutes = Math.round(avgMs / (1000 * 60));

          const days = Math.floor(avgResponseMinutes / (60 * 24));
          const hours = Math.floor((avgResponseMinutes % (60 * 24)) / 60);
          const mins = avgResponseMinutes % 60;

          const parts = [];
          if (days > 0) parts.push(`${days}d`);
          if (hours > 0 || days > 0) parts.push(`${hours}h`);
          parts.push(`${mins}m`);
          avgResponseTimeFormatted = parts.join(" ");
        }

        return {
          ...emp,
          callsPerUser: userCalls.length,
          totalAssigned: assignedProducts,
          closedCount: closedProducts,
          openCount: openProducts,
          selfAssignedCount,
          avgResponseTime: avgResponseTimeFormatted,
          avgResponseMinutes,
          calls: userCalls,
        };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [employees, filteredCalls]);

  // Selected Employee Calls
  const selectedEmployeeCalls = useMemo(() => {
    if (!selectedEmployee) return [];
    return filteredCalls.filter((call) =>
      (call.products || []).some(
        (p) =>
          p._assignedEngineerId === selectedEmployee.userId ||
          p._assignedEngineerName === selectedEmployee.name ||
          p._supportPersonId === selectedEmployee.userId ||
          p._fieldVisit?.assignedTo === selectedEmployee.userId ||
          p._fieldVisit?.assignedBy === selectedEmployee.userId ||
          call.registeredBy === selectedEmployee.userId ||
          call.currentEngineerName === selectedEmployee.name,
      ),
    );
  }, [selectedEmployee, filteredCalls]);

  // Pagination for main table
  const activeDataset = useMemo(() => {
    if (activeMainView === "registered") return filteredCalls;
    if (activeMainView === "escalations") return escalationItems;
    if (activeMainView === "assignments") {
      return selectedEmployee ? selectedEmployeeCalls : assignmentReportData;
    }
    return filteredCalls;
  }, [
    activeMainView,
    filteredCalls,
    escalationItems,
    selectedEmployee,
    selectedEmployeeCalls,
    assignmentReportData,
  ]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return activeDataset.slice(start, start + rowsPerPage);
  }, [activeDataset, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(activeDataset.length / rowsPerPage);

  // Edit Report Handlers
  const handleOpenEditReport = (call, prod, pIdx) => {
    const closure = prod._productClosure || {};

    // Check if reverse escalation condition is met (previous engineer exists in chain and not self-assigned)
    const isSelfAssigned = Boolean(
      call?.noEscalation ||
      call?.isSelfAssigned ||
      (call?.registeredBy === currentUser?.userId && call?.currentEngineerId === currentUser?.userId)
    );
    const escHist = prod?._escalationHistory || call?.escalationHistory || [];
    let hasPreviousEngineer = false;
    let prevName = "";
    for (let i = escHist.length - 1; i >= 0; i--) {
      const h = escHist[i];
      const engId = h.engineerId || h.assignedTo;
      const engName = h.engineerName || h.assignedToName || h.name;
      if (engId && engId !== currentUser?.userId) {
        hasPreviousEngineer = true;
        prevName = engName || engId;
        break;
      }
    }

    const canReverse = !isSelfAssigned && hasPreviousEngineer;

    setEditingReportItem({
      callId: call._id || call.id || call.callNumber,
      callNumber: call.callNumber,
      productIdx: pIdx,
      product: prod,
      canReverse,
      previousAssigneeName: prevName,
    });
    setEditForm({
      status: closure.status || (prod._resolved ? "Resolved" : "Pending"),
      remarks: closure.remarks || "",
      resolutionType: closure.resolutionType || "Fixed",
      editReason: "",
    });
  };

  const handleSaveEditReport = async (e) => {
    e.preventDefault();
    if (!editingReportItem) return;
    setIsSubmittingEdit(true);
    try {
      if (editForm.status === "ReverseEscalate") {
        await axios.patch(
          `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/reverse-escalate`,
          {
            userId: currentUser?.userId,
            name: currentUser?.name,
            reason: editForm.remarks,
          }
        );
        toast("Report reverse-escalated successfully", "success");
      } else {
        await axios.patch(
          `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/edit-report`,
          {
            status: editForm.status,
            remarks: editForm.remarks,
            resolutionType: editForm.resolutionType,
            editReason: editForm.editReason,
            userId: currentUser?.userId || "Employee",
            name: currentUser?.name || "Employee",
            role: currentUser?.role || "Employee",
          },
        );
        toast("Report updated successfully", "success");
      }
      setEditingReportItem(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update report:", err);
      toast(err.response?.data?.message || "Failed to update report", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Direct Excel Export Implementation
  const executeExportExcel = () => {
    try {
      const rows = [];
      let sNo = 1;
      filteredCalls.forEach((c) => {
        const prods = c.products && c.products.length > 0 ? c.products : [{}];
        const callEscHistory = c.escalationHistory || c._escalationHistory || [];

        prods.forEach((p) => {
          const pStatus = getCallProductStatus(p, c.status);
          const prodEscHistory = p._escalationHistory || [];
          const combinedEsc = [...callEscHistory, ...prodEscHistory];

          // Extract to whom all the call was escalated
          const escalatedToNames = [];
          const escalationDetails = [];

          combinedEsc.forEach((esc, eIdx) => {
            const targetName =
              esc.escalatedToName ||
              esc.escalatedTo ||
              esc.engineerName ||
              esc.assignedEngineerName ||
              esc.to ||
              (esc.department ? `Dept: ${esc.department}` : null);

            const byName = esc.escalatedByName || esc.escalatedBy || "System";
            const lvl = esc.level !== undefined ? `L${esc.level}` : `Esc #${eIdx + 1}`;
            const rsn = esc.reason || esc.remarks || "";

            if (targetName && !escalatedToNames.includes(targetName)) {
              escalatedToNames.push(targetName);
            }

            escalationDetails.push(
              `[${lvl}] To: ${targetName || "N/A"}${byName ? ` (By: ${byName})` : ""}${rsn ? ` - Reason: ${rsn}` : ""}`
            );
          });

          // Check if current product has higher escalation level or is critical
          const isEscalated =
            combinedEsc.length > 0 ||
            p._escalationLevel > 0 ||
            c.escalationLevel > 0 ||
            p._isCritical ||
            c.priority === "Critical";

          const escalatedToSummary = escalatedToNames.length > 0
            ? escalatedToNames.join(", ")
            : isEscalated
            ? (p._assignedEngineerName || c.currentEngineerName || "Escalation Queue")
            : "Not Escalated";

          const escalationHistorySummary = escalationDetails.length > 0
            ? escalationDetails.join(" | ")
            : isEscalated
            ? `Level ${p._escalationLevel || c.escalationLevel || 1} (Critical/SLA)`
            : "None";

          const isClosed =
            p._resolved ||
            p._productClosure?.status === "Closed" ||
            p._productClosure?.status === "Resolved";

          const closedAt =
            p._productClosure?.closedAt ||
            p._productClosure?.date ||
            (isClosed ? p._productClosure?.updatedAt : null);

          const fullRow = {
            "S.No": sNo++,
            "Call Number": c.callNumber,
            "Type": c.noEscalation ? "Self Assigned" : "Registered Call",
            "Date & Time": fmtDateTime(c.createdAt || c.dateTime),
            "Customer Name": c.customerName || "—",
            "Party Code": c.partyCode || "—",
            "Customer Type": c.customerType || "—",
            "Priority": c.priority || "Medium",
            "Product Model": p.productModel || p.itemCode || "—",
            "Serial Number": p.serialNumber || "—",
            "Error Code": p.errorCode || "—",
            "Registered By": c.registeredByName || c.registeredBy || "System",
            "Assigned Engineer": p._assignedEngineerName || c.currentEngineerName || "Unassigned",
            "Escalated Status": isEscalated ? "Escalated" : "Normal",
            "Escalated Level": p._escalationLevel || c.escalationLevel || (isEscalated ? 1 : 0),
            "Escalated To (Person/Dept)": escalatedToSummary,
            "Escalation Flow History": escalationHistorySummary,
            "Status": getStatusCfg(pStatus).label,
            "Closed Date": isClosed ? fmtDateTime(closedAt) : "—",
            "Contact Number": c.contactNumber || "—",
            "Last Edited": c.editHistory?.length
              ? `${c.editHistory.length} edit(s) by ${c.editHistory[c.editHistory.length - 1].editedByName}`
              : "No edits",
          };

          // Filter row based on user's selected export columns
          const filteredRow = {};
          EXPORT_COLUMNS_CONFIG.forEach((colCfg) => {
            if (selectedExportCols.includes(colCfg.key)) {
              filteredRow[colCfg.key] = fullRow[colCfg.key];
            }
          });

          rows.push(filteredRow);
        });
      });

      if (rows.length === 0) {
        toast("No records available to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths for clear readability
      const colWidths = Object.keys(rows[0] || {}).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...rows.map((r) => (r[key] ? String(r[key]).length : 0))
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
      });
      ws["!cols"] = colWidths;

      // ── Build Summary Report (Registered, Assigned, Escalated, Closed by Day, Week, Month) ──
      const parseDateSafe = (dStr) => {
        if (!dStr) return null;
        const d = new Date(dStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const getDayKey = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };

      const getWeekKey = (d) => {
        const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = temp.getUTCDay() || 7;
        temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
        return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      };

      const getMonthKey = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      };

      const daySummary = {};
      const weekSummary = {};
      const monthSummary = {};

      const initBucket = () => ({ registered: 0, assigned: 0, escalated: 0, closed: 0 });

      filteredCalls.forEach((c) => {
        const cDate = parseDateSafe(c.createdAt || c.dateTime);
        const prods = c.products && c.products.length > 0 ? c.products : [{}];
        const callEscHistory = c.escalationHistory || c._escalationHistory || [];

        prods.forEach((p) => {
          // Dates
          const regDate = cDate || new Date();
          const pAttendedOrAssigned = p._assigned || p._attended || p._assignedEngineerName || c.currentEngineerName;
          const assignDate = parseDateSafe(p._assignedAt || c.assignedAt || c.assignmentDate || regDate);

          const combinedEsc = [...callEscHistory, ...(p._escalationHistory || [])];
          const isEscalated =
            combinedEsc.length > 0 ||
            p._escalationLevel > 0 ||
            c.escalationLevel > 0 ||
            p._isCritical ||
            c.priority === "Critical";
          const escDate = combinedEsc.length > 0
            ? parseDateSafe(combinedEsc[0].assignedAt || combinedEsc[0].timestamp || regDate)
            : regDate;

          const isClosed =
            p._resolved ||
            p._productClosure?.status === "Closed" ||
            p._productClosure?.status === "Resolved";
          const closeDate = parseDateSafe(
            p._productClosure?.closedAt || p._productClosure?.date || p._productClosure?.updatedAt
          );

          // 1. Registered
          const dKey = getDayKey(regDate);
          const wKey = getWeekKey(regDate);
          const mKey = getMonthKey(regDate);

          if (!daySummary[dKey]) daySummary[dKey] = initBucket();
          if (!weekSummary[wKey]) weekSummary[wKey] = initBucket();
          if (!monthSummary[mKey]) monthSummary[mKey] = initBucket();

          daySummary[dKey].registered += 1;
          weekSummary[wKey].registered += 1;
          monthSummary[mKey].registered += 1;

          // 2. Assigned
          if (pAttendedOrAssigned && assignDate) {
            const adKey = getDayKey(assignDate);
            const awKey = getWeekKey(assignDate);
            const amKey = getMonthKey(assignDate);
            if (!daySummary[adKey]) daySummary[adKey] = initBucket();
            if (!weekSummary[awKey]) weekSummary[awKey] = initBucket();
            if (!monthSummary[amKey]) monthSummary[amKey] = initBucket();
            daySummary[adKey].assigned += 1;
            weekSummary[awKey].assigned += 1;
            monthSummary[amKey].assigned += 1;
          }

          // 3. Escalated
          if (isEscalated && escDate) {
            const edKey = getDayKey(escDate);
            const ewKey = getWeekKey(escDate);
            const emKey = getMonthKey(escDate);
            if (!daySummary[edKey]) daySummary[edKey] = initBucket();
            if (!weekSummary[ewKey]) weekSummary[ewKey] = initBucket();
            if (!monthSummary[emKey]) monthSummary[emKey] = initBucket();
            daySummary[edKey].escalated += 1;
            weekSummary[ewKey].escalated += 1;
            monthSummary[emKey].escalated += 1;
          }

          // 4. Closed
          if (isClosed && closeDate) {
            const cdKey = getDayKey(closeDate);
            const cwKey = getWeekKey(closeDate);
            const cmKey = getMonthKey(closeDate);
            if (!daySummary[cdKey]) daySummary[cdKey] = initBucket();
            if (!weekSummary[cwKey]) weekSummary[cwKey] = initBucket();
            if (!monthSummary[cmKey]) monthSummary[cmKey] = initBucket();
            daySummary[cdKey].closed += 1;
            weekSummary[cwKey].closed += 1;
            monthSummary[cmKey].closed += 1;
          }
        });
      });

      // Format Summary Sheet rows
      const summaryRows = [];

      // Section 1: Daily Summary
      summaryRows.push({ "Period Type": "DAILY SUMMARY", "Period": "", "Registered": "", "Assigned": "", "Escalated": "", "Closed": "" });
      Object.keys(daySummary).sort().reverse().forEach((k) => {
        summaryRows.push({
          "Period Type": "Day",
          "Period": k,
          "Registered": daySummary[k].registered,
          "Assigned": daySummary[k].assigned,
          "Escalated": daySummary[k].escalated,
          "Closed": daySummary[k].closed,
        });
      });

      // Space
      summaryRows.push({ "Period Type": "", "Period": "", "Registered": "", "Assigned": "", "Escalated": "", "Closed": "" });

      // Section 2: Weekly Summary
      summaryRows.push({ "Period Type": "WEEKLY SUMMARY", "Period": "", "Registered": "", "Assigned": "", "Escalated": "", "Closed": "" });
      Object.keys(weekSummary).sort().reverse().forEach((k) => {
        summaryRows.push({
          "Period Type": "Week",
          "Period": k,
          "Registered": weekSummary[k].registered,
          "Assigned": weekSummary[k].assigned,
          "Escalated": weekSummary[k].escalated,
          "Closed": weekSummary[k].closed,
        });
      });

      // Space
      summaryRows.push({ "Period Type": "", "Period": "", "Registered": "", "Assigned": "", "Escalated": "", "Closed": "" });

      // Section 3: Monthly Summary
      summaryRows.push({ "Period Type": "MONTHLY SUMMARY", "Period": "", "Registered": "", "Assigned": "", "Escalated": "", "Closed": "" });
      Object.keys(monthSummary).sort().reverse().forEach((k) => {
        summaryRows.push({
          "Period Type": "Month",
          "Period": k,
          "Registered": monthSummary[k].registered,
          "Assigned": monthSummary[k].assigned,
          "Escalated": monthSummary[k].escalated,
          "Closed": monthSummary[k].closed,
        });
      });

      const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
      summaryWs["!cols"] = [
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary Report");
      XLSX.utils.book_append_sheet(wb, ws, "Service Calls Report");
      XLSX.writeFile(wb, `Service_Call_Reports_${getTodayStr()}.xlsx`);
      toast("Excel report downloaded successfully", "success");
    } catch (err) {
      console.error("Export failed:", err);
      toast("Failed to export Excel report", "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full text-[0.85vw] bg-slate-100/70 p-[0.6vw] overflow-hidden">
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-[0.8vw] mb-[0.6vw] shrink-0">
        {/* Main Tab Navigation: Sleek Segmented Capsule */}
        <div className="inline-flex items-center p-[0.25vw] bg-slate-200/70 rounded-full border border-slate-300/80 gap-[0.45vw] shadow-2xs">
          <button
            onClick={() => {
              setActiveMainView("registered");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.45vw] px-[1vw] py-[0.38vw] rounded-full text-[0.76vw] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeMainView === "registered"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <Layers className="w-[0.85vw] h-[0.85vw]" />
            <span>All Calls</span>
            <span
              className={`text-[0.66vw] font-medium ml-[0.15vw] transition-all ${
                activeMainView === "registered"
                  ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                  : "text-slate-400"
              }`}
            >
              {filteredCalls.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainView("escalations");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.45vw] px-[1vw] py-[0.38vw] rounded-full text-[0.76vw] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeMainView === "escalations"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <Flame className="w-[0.85vw] h-[0.85vw]" />
            <span>Escalation View</span>
            <span
              className={`text-[0.66vw] font-medium ml-[0.15vw] transition-all ${
                activeMainView === "escalations"
                  ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                  : "text-slate-400"
              }`}
            >
              {escalationItems.length}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveMainView("assignments");
                setSelectedEmployee(null);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-[0.45vw] px-[1vw] py-[0.38vw] rounded-full text-[0.76vw] font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeMainView === "assignments"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <UserCheck className="w-[0.85vw] h-[0.85vw]" />
              <span>Employee & Assignment Report</span>
              <span
                className={`text-[0.66vw] font-medium ml-[0.15vw] transition-all ${
                  activeMainView === "assignments"
                    ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                    : "text-slate-400"
                }`}
              >
                {assignmentReportData.length}
              </span>
            </button>
          )}
        </div>

        {/* Global Controls & Filters */}
        <div className="flex items-center gap-[0.6vw]">
          {/* Soft Pill Search Input */}
          <div className="relative">
            <Search className="w-[0.85vw] h-[0.85vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search call, customer, item, SN..."
              className="pl-[2.2vw] pr-[2vw] h-[2.2vw] w-[15vw] rounded-full border border-slate-200/90 text-[0.76vw] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 shadow-2xs transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-[0.2vw] cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-[0.8vw] h-[0.8vw]" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                showFilterPopover || fromDate || toDate || callTypeFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Filter reports by date, origin, status, and priority"
            >
              <Filter className="w-[0.85vw] h-[0.85vw]" />
              <span>Filters</span>
              {(fromDate || toDate || callTypeFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All") && (
                <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div className="absolute right-0 top-full mt-[0.4vw] w-[20vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-[0.7vw] border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-[0.4vw]">
                      <Filter className="w-[0.85vw] h-[0.85vw] text-indigo-600" />
                      <span className="text-[0.8vw] font-bold text-slate-800">Filter Records</span>
                    </div>
                    {(fromDate || toDate || callTypeFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All") && (
                      <button
                        onClick={() => {
                          setFromDate("");
                          setToDate("");
                          setCallTypeFilter("All");
                          setStatusFilter("All");
                          setPriorityFilter("All");
                          setCurrentPage(1);
                        }}
                        className="text-[0.7vw] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-[0.2vw]"
                      >
                        <RotateCcw className="w-[0.65vw] h-[0.65vw]" />
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <div className="p-[0.8vw] space-y-[0.7vw]">
                    {/* Date Range */}
                    <div>
                      <label className="block text-[0.7vw] font-bold text-slate-600 uppercase tracking-wider mb-[0.25vw]">
                        Date Range
                      </label>
                      <div className="flex items-center bg-slate-50 border border-slate-300 rounded-[0.4vw] p-[0.25vw] px-[0.4vw] text-[0.75vw]">
                        <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400 mr-[0.3vw]" />
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => {
                            setFromDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer w-[7vw]"
                        />
                        <span className="text-slate-400 mx-[0.2vw]">—</span>
                        <input
                          type="date"
                          value={toDate}
                          min={fromDate}
                          onChange={(e) => {
                            setToDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer w-[7vw]"
                        />
                      </div>
                    </div>

                    {/* Origin Type */}
                    <div>
                      <label className="block text-[0.7vw] font-bold text-slate-600 uppercase tracking-wider mb-[0.25vw]">
                        Call Origin
                      </label>
                      <CustomDropdown
                        size="sm"
                        value={callTypeFilter}
                        onChange={(val) => {
                          setCallTypeFilter(val);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Origins" },
                          { value: "Self Assigned", label: "Self Assigned" },
                          { value: "Admin Registered", label: "Registered Calls" },
                        ]}
                        triggerClassName="h-[2vw] !rounded-[0.4vw] border-slate-300 bg-white font-semibold text-slate-700 w-full"
                      />
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-[0.7vw] font-bold text-slate-600 uppercase tracking-wider mb-[0.25vw]">
                        Call Status
                      </label>
                      <CustomDropdown
                        size="sm"
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Statuses" },
                          { value: "Registered", label: "Registered" },
                          { value: "Assigned", label: "Assigned" },
                          { value: "Supporting", label: "Supporting" },
                          { value: "Field Visit", label: "Field Visit" },
                          { value: "Pending", label: "Pending" },
                          { value: "Escalating", label: "Escalating" },
                          { value: "Critical", label: "Critical" },
                          { value: "Resolved", label: "Resolved / Closed" },
                        ]}
                        triggerClassName="h-[2vw] !rounded-[0.4vw] border-slate-300 bg-white font-semibold text-slate-700 w-full"
                      />
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-[0.7vw] font-bold text-slate-600 uppercase tracking-wider mb-[0.25vw]">
                        Priority
                      </label>
                      <CustomDropdown
                        size="sm"
                        value={priorityFilter}
                        onChange={(val) => {
                          setPriorityFilter(val);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: "All", label: "All Priorities" },
                          ...PRIORITIES.map((p) => ({ value: p, label: p })),
                        ]}
                        placement="top"
                        triggerClassName="h-[2vw] !rounded-[0.4vw] border-slate-300 bg-white font-semibold text-slate-700 w-full"
                      />
                    </div>
                  </div>

                  <div className="p-[0.5vw] border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-[0.7vw] text-slate-500 font-medium">
                      {filteredCalls.length} calls matching
                    </span>
                    <button
                      onClick={() => setShowFilterPopover(false)}
                      className="px-[0.7vw] py-[0.25vw] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.72vw] rounded-[0.35vw] cursor-pointer shadow-2xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Select Columns Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className={`flex items-center gap-[0.35vw] px-[0.85vw] h-[2.2vw] rounded-full border font-medium text-[0.76vw] transition-all cursor-pointer shadow-2xs ${
                showColPicker
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
              }`}
              title="Select columns to export to Excel"
            >
              <Columns className="w-[0.85vw] h-[0.85vw] text-slate-500" />
              <span>Columns</span>
              <span className="ml-[0.1vw] px-[0.35vw] py-[0.02vw] text-[0.66vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {selectedExportCols.length}/{EXPORT_COLUMNS_CONFIG.length}
              </span>
            </button>

            {/* Columns Dropdown Popover */}
            {showColPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColPicker(false)}
                />
                <div className="absolute right-0 top-full mt-[0.4vw] w-[18vw] max-h-[24vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-[0.7vw] border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div>
                      <div className="text-[0.78vw] font-bold text-slate-800">
                        Export Columns
                      </div>
                      <div className="text-[0.68vw] text-slate-500">
                        Saved in browser preferences
                      </div>
                    </div>
                    <div className="flex items-center gap-[0.4vw]">
                      <button
                        onClick={selectAllExportCols}
                        className="text-[0.7vw] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-slate-300 text-[0.7vw]">|</span>
                      <button
                        onClick={resetDefaultExportCols}
                        className="flex items-center gap-[0.2vw] text-[0.7vw] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-[0.65vw] h-[0.65vw]" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-[0.5vw] space-y-[0.25vw] max-h-[17vw]">
                    {EXPORT_COLUMNS_CONFIG.map((col) => {
                      const isChecked = selectedExportCols.includes(col.key);
                      return (
                        <label
                          key={col.key}
                          onClick={() => toggleExportCol(col.key)}
                          className={`flex items-center gap-[0.5vw] px-[0.6vw] py-[0.35vw] rounded-[0.4vw] cursor-pointer text-[0.75vw] transition-colors ${
                            isChecked
                              ? "bg-indigo-50/60 text-slate-900 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 font-normal"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by label click
                            className="w-[0.85vw] h-[0.85vw] rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-[0.5vw] border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-[0.7vw] text-slate-500">
                      {selectedExportCols.length} of {EXPORT_COLUMNS_CONFIG.length} selected
                    </span>
                    <button
                      onClick={() => setShowColPicker(false)}
                      className="px-[0.6vw] py-[0.25vw] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.72vw] rounded-[0.35vw] cursor-pointer shadow-2xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Excel Button */}
          <button
            onClick={executeExportExcel}
            className="flex items-center gap-[0.35vw] px-[1vw] h-[2.2vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-[0.76vw] transition-all cursor-pointer shadow-sm"
            title="Export filtered reports to Excel"
          >
            <Download className="w-[0.85vw] h-[0.85vw]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Main Report Display Container ────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-[0.8vw] text-slate-500">
            <div className="w-[2.5vw] h-[2.5vw] border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-[0.9vw] font-bold">Loading comprehensive reports...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: All Registered Calls Table View */}
            {activeMainView === "registered" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                      <tr>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">S.No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[10.5vw] whitespace-nowrap">Registered Date</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">Call No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6.5vw] whitespace-nowrap">Origin</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Customer & Contact</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">Customer Type</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Product / Model</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">Assigned</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">Escalation</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Status</th>
                        <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[5.5vw]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.8vw]">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-[10vh] text-center text-slate-400 font-bold">
                            No service call records match the active criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((call, cIdx) => {
                          const prods = call.products && call.products.length > 0 ? call.products : [{}];
                          const rowCount = prods.length;
                          const isSelf = call.noEscalation === true;
                          const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;

                          return prods.map((prod, pIdx) => {
                            const pStatus = getCallProductStatus(prod, call.status);
                            const cfg = getStatusCfg(pStatus);
                            const isClosed =
                              prod._resolved ||
                              prod._productClosure?.status === "Closed" ||
                              prod._productClosure?.status === "Resolved";

                            const hasEdits =
                              (call.editHistory && call.editHistory.length > 0) ||
                              (prod._closureEdits && prod._closureEdits.length > 0);

                            const isEscalated =
                              prod._escalationLevel > 0 || call.escalationLevel > 0 || prod._isCritical;

                            return (
                              <tr
                                key={`${call._id || call.callNumber}-${pIdx}`}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                {/* 0. S.No */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle text-center font-normal text-slate-700 bg-white whitespace-nowrap text-[0.76vw]"
                                  >
                                    {callSno}
                                  </td>
                                )}

                                {/* 1. Registered Date (Moved to 2nd Column) */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                                  >
                                    <div className="text-[0.74vw] text-slate-800 font-medium flex items-center gap-[0.3vw]">
                                      <Calendar className="w-[0.75vw] h-[0.75vw] text-slate-400 shrink-0" />
                                      <span>{fmtDateTime(call.createdAt || call.dateTime)}</span>
                                    </div>
                                    {call.registeredByName && call.registeredByName !== "System" ? (
                                      <div className="text-[0.66vw] text-slate-400 mt-[0.1vw]">
                                        By: {call.registeredByName}
                                      </div>
                                    ) : null}
                                  </td>
                                )}

                                {/* 2. Call Number */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white"
                                  >
                                    <div className="flex items-center gap-[0.35vw]">
                                      <CustomTooltip text="Click to view full details" position="top-start">
                                        <button
                                          onClick={() => setSelectedInfoCall(call)}
                                          className="font-mono font-medium text-[0.82vw] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block leading-tight transition-colors"
                                        >
                                          {call.callNumber}
                                        </button>
                                      </CustomTooltip>
                                      {hasEdits && (
                                        <CustomTooltip text="This call has edited records" position="top">
                                          <span className="text-[0.62vw] px-[0.3vw] py-[0.05vw] bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold cursor-default">
                                            Edited
                                          </span>
                                        </CustomTooltip>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* 3. Origin Distinction */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle text-center whitespace-nowrap bg-white"
                                  >
                                    {isSelf ? (
                                      <span className="inline-flex items-center gap-[0.2vw] px-[0.45vw] py-[0.1vw] rounded-full text-[0.68vw] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                        <UserCheck className="w-[0.65vw] h-[0.65vw]" />
                                        Self Assigned
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-medium text-[0.72vw]">
                                        Registered
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* 4. Customer */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle bg-white max-w-[14vw]"
                                  >
                                    <CustomTooltip text={call.customerName} position="top-start" className="max-w-full">
                                      <div className="font-semibold text-slate-900 text-[0.82vw] truncate">
                                        {call.customerName || "—"}
                                      </div>
                                    </CustomTooltip>
                                    <div className="flex items-center gap-[0.45vw] mt-[0.15vw] flex-wrap">
                                      {call.contactNumber && (
                                        <CustomTooltip text="Click to call" position="bottom">
                                          <a
                                            href={`tel:${call.contactNumber}`}
                                            className="inline-flex items-center gap-[0.2vw] text-[0.7vw] font-medium text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                                          >
                                            <Phone className="w-[0.65vw] h-[0.65vw] text-blue-500 shrink-0" />
                                            <span>{call.contactNumber}</span>
                                          </a>
                                        </CustomTooltip>
                                      )}
                                      {call.partyCode && (
                                        <span className="text-[0.66vw] text-slate-400 font-mono shrink-0">
                                          {call.partyCode}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* 5. Customer Type */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white font-bold text-[0.78vw]"
                                  >
                                    {call.customerType && call.customerType !== "All" ? (
                                      <span className={getCustomerTypeTextColor(call.customerType)}>
                                        {call.customerType}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-normal">—</span>
                                    )}
                                  </td>
                                )}

                                {/* 6. Product / Model */}
                                <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle max-w-[14vw]">
                                  <CustomTooltip text={prod.productModel || prod.itemCode} position="top-start" className="max-w-full">
                                    <div className="font-semibold text-slate-800 text-[0.8vw] truncate">
                                      {prod.productModel || prod.itemCode || "—"}
                                    </div>
                                  </CustomTooltip>
                                  {prod.serialNumber && (
                                    <div className="mt-[0.1vw]">
                                      <span className="text-[0.66vw] text-slate-600 font-mono bg-slate-100 px-[0.35vw] py-[0.05vw] rounded border border-slate-200">
                                        SN: {prod.serialNumber}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* 7. Assigned Info */}
                                <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap">
                                  {prod._assignedEngineerName || call.currentEngineerName ? (
                                    <div className="relative group inline-flex items-center gap-[0.45vw] cursor-default">
                                      <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-[0.68vw] shrink-0">
                                        {(prod._assignedEngineerName || call.currentEngineerName || "U").charAt(0).toUpperCase()}
                                      </div>
                                      <div className="font-semibold text-slate-800 text-[0.75vw]">
                                        {prod._assignedEngineerName || call.currentEngineerName}
                                      </div>

                                      {/* Custom Tooltip */}
                                      <div className="hidden group-hover:flex flex-col gap-[0.1vw] absolute left-0 bottom-[calc(100%+0.35vw)] z-50 bg-slate-900 text-white rounded-md px-[0.6vw] py-[0.35vw] text-[0.68vw] shadow-lg pointer-events-none whitespace-nowrap border border-slate-700">
                                        <div className="text-slate-300 text-[0.62vw] uppercase tracking-wider font-semibold">Assigned On</div>
                                        <div className="font-medium text-white flex items-center gap-[0.25vw]">
                                          <Calendar className="w-[0.6vw] h-[0.6vw] text-indigo-400" />
                                          <span>{fmtDateTime(prod._assignedAt || call.createdAt)}</span>
                                        </div>
                                        <div className="absolute left-[0.8vw] top-full w-0 h-0 border-x-[0.3vw] border-x-transparent border-t-[0.3vw] border-t-slate-900" />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium italic text-[0.72vw]">Unassigned</span>
                                  )}
                                </td>

                                {/* 8. Escalation Info */}
                                <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle text-center whitespace-nowrap">
                                  {isEscalated ? (
                                    <div className="relative group inline-flex items-center justify-center cursor-default">
                                      <span className="text-[0.75vw] text-slate-800 font-normal hover:text-slate-900 transition-colors">
                                        Level {prod._escalationLevel || call.escalationLevel || 1}
                                      </span>

                                      {/* Custom Tooltip */}
                                      <div className="hidden group-hover:flex flex-col gap-[0.1vw] absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+0.35vw)] z-50 bg-slate-900 text-white rounded-md px-[0.6vw] py-[0.35vw] text-[0.68vw] shadow-lg pointer-events-none whitespace-nowrap border border-slate-700">
                                        <div className="text-slate-300 text-[0.62vw] uppercase tracking-wider font-semibold">Open Duration</div>
                                        <div className="font-normal text-rose-300 flex items-center gap-[0.25vw] justify-center">
                                          <Clock className="w-[0.6vw] h-[0.6vw]" />
                                          <span>{formatDurationFrom(prod._assignedAt || call.createdAt)} open</span>
                                        </div>
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[0.3vw] border-x-transparent border-t-[0.3vw] border-t-slate-900" />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 font-normal text-[0.75vw]">—</span>
                                  )}
                                </td>

                                {/* 9. Status */}
                                <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle text-center whitespace-nowrap">
                                  {(() => {
                                    const displayStatus = isClosed ? "Completed" : (cfg.label || "In Progress");
                                    let badgeStyle = "bg-[#6366f1] text-white"; // default purple/indigo
                                    if (displayStatus === "Completed" || displayStatus === "Resolved") {
                                      badgeStyle = "bg-[#05a854] text-white"; // solid vibrant green
                                    } else if (displayStatus === "Overdue" || displayStatus === "Critical") {
                                      badgeStyle = "bg-[#e53935] text-white"; // solid vibrant red
                                    } else if (displayStatus === "Delayed" || displayStatus === "Pending") {
                                      badgeStyle = "bg-[#e69b00] text-white"; // solid warm amber/orange
                                    } else if (displayStatus === "Under Review") {
                                      badgeStyle = "bg-[#111927] text-white"; // solid deep navy/black
                                    } else if (displayStatus === "In Progress" || displayStatus === "Assigned" || displayStatus === "Attended") {
                                      badgeStyle = "bg-[#5551f3] text-white"; // vibrant blue-purple
                                    }

                                    return (
                                      <div className="flex flex-col items-center justify-center">
                                        <span className={`inline-flex items-center justify-center px-[1vw] py-[0.35vw] rounded-lg text-[0.72vw] font-normal min-w-[6.2vw] shadow-xs tracking-wide ${badgeStyle}`}>
                                          {displayStatus}
                                        </span>
                                        {isClosed && (prod._productClosure?.closedAt || prod._productClosure?.date) && (
                                          <div className="text-[0.65vw] text-slate-400 font-normal mt-[0.15vw]">
                                            {fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* 10. Actions Column (Sleek Icon Buttons) */}
                                <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    <button
                                      onClick={() => setSelectedInfoCall(call)}
                                      className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                    >
                                      View Reports
                                    </button>
                                    {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                      <CustomTooltip text="Edit Report" position="top">
                                        <button
                                          onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                          className="p-[0.35vw] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                                        >
                                          <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                                        </button>
                                      </CustomTooltip>
                                    )}
                                    <CustomTooltip text="View Lifecycle History" position="top-end">
                                      <button
                                        onClick={() => setHistoryModalCall(call)}
                                        className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                      >
                                        <History className="w-[0.9vw] h-[0.9vw]" />
                                      </button>
                                    </CustomTooltip>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: Dedicated Escalation View */}
            {activeMainView === "escalations" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                      <tr>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">S.No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">Call No</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Customer & Contact</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">Customer Type</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[13vw] whitespace-nowrap">Product / SN</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">Escalated By</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9.5vw] whitespace-nowrap">Escalated Date</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[13vw] whitespace-nowrap">Reason</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Open Duration</th>
                        <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Status</th>
                        <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[5vw]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.8vw]">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-[10vh] text-center text-slate-400 font-bold">
                            No escalated calls found.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            {/* 0. S.No */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-[0.76vw]">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>

                            {/* 1. Call No */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white">
                              <CustomTooltip text="Click to view full details" position="top-start">
                                <button
                                  onClick={() => setSelectedInfoCall(item.call)}
                                  className="font-mono font-medium text-[0.82vw] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block leading-tight transition-colors"
                                >
                                  {item.call.callNumber}
                                </button>
                              </CustomTooltip>
                            </td>

                            {/* 2. Customer & Contact */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle bg-white max-w-[14vw]">
                              <CustomTooltip text={item.call.customerName} position="top-start" className="max-w-full">
                                <div className="font-semibold text-slate-900 text-[0.82vw] truncate">
                                  {item.call.customerName || "—"}
                                </div>
                              </CustomTooltip>
                              <div className="flex items-center gap-[0.45vw] mt-[0.15vw] flex-wrap">
                                {item.call.contactNumber && (
                                  <CustomTooltip text="Click to call" position="bottom">
                                    <a
                                      href={`tel:${item.call.contactNumber}`}
                                      className="inline-flex items-center gap-[0.2vw] text-[0.7vw] font-medium text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                                    >
                                      <Phone className="w-[0.65vw] h-[0.65vw] text-blue-500 shrink-0" />
                                      <span>{item.call.contactNumber}</span>
                                    </a>
                                  </CustomTooltip>
                                )}
                                {item.call.partyCode && (
                                  <span className="text-[0.66vw] text-slate-400 font-mono shrink-0">
                                    {item.call.partyCode}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. Customer Type */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap bg-white font-bold text-[0.78vw]">
                              {item.call.customerType && item.call.customerType !== "All" ? (
                                <span className={getCustomerTypeTextColor(item.call.customerType)}>
                                  {item.call.customerType}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">—</span>
                              )}
                            </td>

                            {/* 4. Product / SN */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle max-w-[13vw]">
                              <CustomTooltip text={item.prod.productModel || item.prod.itemCode} position="top-start" className="max-w-full">
                                <div className="font-semibold text-slate-800 text-[0.8vw] truncate">
                                  {item.prod.productModel || item.prod.itemCode || "—"}
                                </div>
                              </CustomTooltip>
                              {item.prod.serialNumber && (
                                <div className="mt-[0.1vw]">
                                  <span className="text-[0.66vw] text-slate-600 font-mono bg-slate-100 px-[0.35vw] py-[0.05vw] rounded border border-slate-200">
                                    SN: {item.prod.serialNumber}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 5. Who Escalated */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap align-middle">
                              <div className="flex items-center gap-[0.45vw]">
                                <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-[0.68vw] shrink-0">
                                  {(item.escalatedBy || "E").charAt(0).toUpperCase()}
                                </div>
                                <div className="font-semibold text-slate-800 text-[0.75vw]">
                                  {item.escalatedBy}
                                </div>
                              </div>
                            </td>

                            {/* 6. When Escalated */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap align-middle">
                              <div className="text-[0.72vw] text-gray-800 font-medium flex items-center gap-[0.25vw]">
                                <Calendar className="w-[0.7vw] h-[0.7vw] text-gray-500 shrink-0" />
                                <span>{fmtDateTime(item.escalatedAt)}</span>
                              </div>
                            </td>

                            {/* 7. Why (Reason) */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 max-w-[13vw] align-middle">
                              <span className="font-medium text-rose-700 bg-rose-50 border border-rose-200 px-[0.45vw] py-[0.15vw] rounded text-[0.72vw] inline-block leading-snug">
                                {item.reason}
                              </span>
                            </td>

                            {/* 8. Open Duration */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap text-center align-middle">
                              <span className="inline-flex items-center gap-[0.25vw] text-[0.74vw] font-semibold text-slate-700">
                                <Clock className="w-[0.7vw] h-[0.7vw] text-slate-400" />
                                {item.openDuration}
                              </span>
                            </td>

                            {/* 9. Status */}
                            <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center align-middle whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center px-[1vw] py-[0.35vw] rounded-lg text-[0.72vw] font-normal min-w-[6.2vw] shadow-xs tracking-wide ${
                                item.isClosed ? "bg-[#05a854] text-white" : "bg-[#e53935] text-white"
                              }`}>
                                {item.isClosed ? "Completed" : "Overdue"}
                              </span>
                            </td>

                            {/* 10. Actions Column (Sleek Icon Buttons) */}
                            <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center justify-center gap-[0.3vw]">
                                <button
                                  onClick={() => setSelectedInfoCall(item.call)}
                                  className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                >
                                  View Reports
                                </button>
                                <CustomTooltip text="View Lifecycle History" position="top-end">
                                  <button
                                    onClick={() => setHistoryModalCall(item.call)}
                                    className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                  >
                                    <History className="w-[0.9vw] h-[0.9vw]" />
                                  </button>
                                </CustomTooltip>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: Merged Employee & Assignment Report */}
            {activeMainView === "assignments" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                        <tr>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">#</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Employee</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[12vw] whitespace-nowrap">Department</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7vw] whitespace-nowrap">Total Calls</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Self Assigned</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6vw] whitespace-nowrap">Open</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6vw] whitespace-nowrap">Closed</th>
                          <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[8vw] whitespace-nowrap">Avg Response</th>
                          <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[5vw]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-[0.8vw]">
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-[10vh] text-center text-slate-400 font-bold">
                              No assignment records found.
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((emp, idx) => (
                            <tr
                              key={emp.userId || idx}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              {/* Index */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-[0.76vw]">
                                {(currentPage - 1) * rowsPerPage + idx + 1}
                              </td>

                              {/* User */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap bg-white">
                                <div className="flex items-center gap-[0.55vw]">
                                  <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-[0.74vw] shrink-0">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 leading-tight text-[0.8vw]">{emp.name}</div>
                                    <div className="text-[0.66vw] text-slate-400 font-mono mt-[0.05vw]">{emp.userId}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-slate-700 whitespace-nowrap font-medium text-[0.76vw]">
                                {emp.department || "—"}
                              </td>

                              {/* Total Calls */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                <span className={`font-semibold text-[0.78vw] ${emp.callsPerUser > 0 ? "text-slate-900" : "text-slate-300"}`}>
                                  {emp.callsPerUser}
                                </span>
                              </td>

                              {/* Self Assigned */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.selfAssignedCount > 0 ? (
                                  <span className="font-semibold text-[0.74vw] text-teal-700 bg-teal-50 border border-teal-200 px-[0.45vw] py-[0.08vw] rounded-full">
                                    {emp.selfAssignedCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Open */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.openCount > 0 ? (
                                  <span className="font-semibold text-[0.74vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.45vw] py-[0.08vw] rounded-full">
                                    {emp.openCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-medium">0</span>
                                )}
                              </td>

                              {/* Closed */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.closedCount > 0 ? (
                                  <span className="font-semibold text-[0.74vw] text-emerald-700 bg-emerald-50 border border-emerald-200 px-[0.45vw] py-[0.08vw] rounded-full">
                                    {emp.closedCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-medium">0</span>
                                )}
                              </td>

                              {/* Avg Response */}
                              <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                {emp.avgResponseTime !== "—" ? (
                                  <span className="inline-flex items-center gap-[0.25vw] text-slate-700 text-[0.74vw] font-medium">
                                    <Clock className="w-[0.65vw] h-[0.65vw] text-slate-400" />
                                    <span>{emp.avgResponseTime}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">—</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                <CustomTooltip
                                  text={emp.callsPerUser > 0 ? "View Assigned Calls" : "No Calls"}
                                  position="top-end"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setCurrentPage(1);
                                    }}
                                    disabled={emp.callsPerUser === 0}
                                    className={`px-[0.7vw] py-[0.3vw] rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                                      emp.callsPerUser > 0
                                        ? "bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    View Reports
                                  </button>
                                </CustomTooltip>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Drilldown view for selected employee calls */
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-[1vw] py-[0.55vw] border-b border-slate-300 bg-[#E9EDF7]/60 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-[0.7vw]">
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setCurrentPage(1);
                          }}
                          className="flex items-center gap-[0.3vw] px-[0.65vw] h-[2vw] bg-white border border-slate-300 rounded-full text-slate-700 hover:bg-slate-100 font-semibold text-[0.72vw] cursor-pointer shadow-xs transition-all"
                        >
                          <ArrowLeft className="w-[0.8vw] h-[0.8vw]" />
                          <span>Back to All Employees</span>
                        </button>
                        <div className="flex items-center gap-[0.4vw]">
                          <span className="text-[0.88vw] font-bold text-slate-900">
                            {selectedEmployee.name}
                          </span>
                          <span className="text-slate-400 text-[0.75vw]">•</span>
                          <span className="text-[0.74vw] text-slate-500 font-medium">
                            {selectedEmployee.department}
                          </span>
                          <span className="ml-[0.4vw] px-[0.45vw] py-[0.05vw] rounded-full text-[0.68vw] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {selectedEmployeeCalls.length} Assigned Calls
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#E9EDF7] z-10 border-b border-slate-300 text-slate-700 font-bold text-[0.74vw]">
                          <tr>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[3vw] whitespace-nowrap">S.No</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9vw] whitespace-nowrap">Call No</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[6vw] whitespace-nowrap">Origin</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[14vw] whitespace-nowrap">Customer</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[13vw] whitespace-nowrap">Product / Model</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[9.5vw] whitespace-nowrap">Registered</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[8vw] whitespace-nowrap">Assigned</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 w-[8vw] whitespace-nowrap">Closed</th>
                            <th className="py-[0.7vw] px-[0.7vw] border-r border-slate-300 text-center w-[7.5vw] whitespace-nowrap">Status</th>
                            <th className="py-[0.7vw] px-[0.7vw] text-center sticky right-0 top-0 bg-[#E9EDF7] shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap w-[5vw]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-[0.8vw]">
                          {paginatedData.map((call, cIdx) => {
                            const prods = call.products && call.products.length > 0 ? call.products : [{}];
                            const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;
                            const isSelf = call.noEscalation === true;

                            return prods.map((prod, pIdx) => {
                              const pStatus = getCallProductStatus(prod, call.status);
                              const cfg = getStatusCfg(pStatus);
                              const isClosed =
                                prod._resolved ||
                                prod._productClosure?.status === "Closed" ||
                                prod._productClosure?.status === "Resolved";

                              return (
                                <tr key={`${call._id || call.callNumber}-${pIdx}`} className="hover:bg-slate-50 transition-colors">
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center font-normal text-slate-700 bg-white whitespace-nowrap text-[0.76vw]"
                                    >
                                      {callSno}
                                    </td>
                                  )}
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 align-middle whitespace-nowrap bg-white">
                                    <CustomTooltip text="Click to view full details" position="top-start">
                                      <button
                                        onClick={() => setSelectedInfoCall(call)}
                                        className="font-mono font-medium text-[0.82vw] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block leading-tight transition-colors"
                                      >
                                        {call.callNumber}
                                      </button>
                                    </CustomTooltip>
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                    {isSelf ? (
                                      <span className="inline-flex items-center gap-[0.2vw] px-[0.45vw] py-[0.1vw] rounded-full text-[0.68vw] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                        Self Assigned
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-medium text-[0.72vw]">
                                        Registered
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 max-w-[14vw]">
                                    <CustomTooltip text={call.customerName} position="top-start" className="max-w-full">
                                      <div className="font-semibold text-slate-900 text-[0.82vw] truncate">
                                        {call.customerName || "—"}
                                      </div>
                                    </CustomTooltip>
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 max-w-[13vw]">
                                    <CustomTooltip text={prod.productModel || prod.itemCode} position="top-start" className="max-w-full">
                                      <div className="font-semibold text-slate-800 text-[0.8vw] truncate">
                                        {prod.productModel || prod.itemCode || "—"}
                                      </div>
                                    </CustomTooltip>
                                    {prod.serialNumber && (
                                      <div className="mt-[0.08vw]">
                                        <span className="text-[0.66vw] text-slate-600 font-mono bg-slate-100 px-[0.35vw] py-[0.05vw] rounded border border-slate-200">
                                          SN: {prod.serialNumber}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap text-slate-600 text-[0.72vw]">
                                    {fmtDateTime(call.createdAt)}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap text-indigo-700 font-medium text-[0.72vw]">
                                    {fmtDateTime(prod._assignedAt || call.createdAt)}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 whitespace-nowrap text-emerald-700 font-medium text-[0.72vw]">
                                    {isClosed ? fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date) : "—"}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-r border-b border-slate-300 text-center whitespace-nowrap">
                                    {(() => {
                                      const displayStatus = isClosed ? "Completed" : (cfg.label || "In Progress");
                                      let badgeStyle = "bg-[#6366f1] text-white";
                                      if (displayStatus === "Completed" || displayStatus === "Resolved") {
                                        badgeStyle = "bg-[#05a854] text-white";
                                      } else if (displayStatus === "Overdue" || displayStatus === "Critical") {
                                        badgeStyle = "bg-[#e53935] text-white";
                                      } else if (displayStatus === "Delayed" || displayStatus === "Pending") {
                                        badgeStyle = "bg-[#e69b00] text-white";
                                      } else if (displayStatus === "Under Review") {
                                        badgeStyle = "bg-[#111927] text-white";
                                      } else if (displayStatus === "In Progress" || displayStatus === "Assigned") {
                                        badgeStyle = "bg-[#5551f3] text-white";
                                      }
                                      return (
                                        <span className={`inline-flex items-center justify-center px-[1vw] py-[0.35vw] rounded-lg text-[0.72vw] font-normal min-w-[6.2vw] shadow-xs tracking-wide ${badgeStyle}`}>
                                          {displayStatus}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-[0.7vw] px-[0.7vw] border-b border-r border-slate-300 text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                    <div className="flex items-center justify-center gap-[0.3vw]">
                                      <button
                                        onClick={() => setSelectedInfoCall(call)}
                                        className="px-[0.7vw] py-[0.3vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.7vw] font-normal transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        View Reports
                                      </button>
                                      {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                        <CustomTooltip text="Edit Report" position="top">
                                          <button
                                            onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                            className="p-[0.35vw] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-all cursor-pointer"
                                          >
                                            <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                                          </button>
                                        </CustomTooltip>
                                      )}
                                      <CustomTooltip text="View Lifecycle History" position="top-end">
                                        <button
                                          onClick={() => setHistoryModalCall(call)}
                                          className="p-[0.35vw] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                        >
                                          <History className="w-[0.9vw] h-[0.9vw]" />
                                        </button>
                                      </CustomTooltip>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Modern Pagination Footer (matching ServiceCall) ────────── */}
            <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-t border-slate-300 bg-white shrink-0">
              <div className="text-[0.74vw] text-slate-500 font-medium">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {activeDataset.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, activeDataset.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {activeDataset.length}
                </span>{" "}
                entries
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                >
                  <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                </button>
                <div className="flex gap-[0.3vw]">
                  {[...Array(totalPages)].map((_, i) => {
                    const pNum = i + 1;
                    if (
                      totalPages > 5 &&
                      (pNum < currentPage - 1 || pNum > currentPage + 1) &&
                      pNum !== 1 &&
                      pNum !== totalPages
                    ) {
                      if (pNum === currentPage - 2 || pNum === currentPage + 2)
                        return (
                          <span
                            key={pNum}
                            className="px-1 text-gray-400 text-[0.75vw]"
                          >
                            ...
                          </span>
                        );
                      return null;
                    }
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                          currentPage === pNum
                            ? "bg-[#1a73e8] text-white shadow-2xs"
                            : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-[0.35vw] border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                >
                  <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Edit Report Modal */}
        {editingReportItem && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-[1vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-[1vw] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200/90 w-full max-w-[34vw] overflow-hidden flex flex-col font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-[1.4vw] py-[1vw] border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/40 via-white to-slate-50">
                <div className="flex items-center gap-[0.75vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-[0.55vw] bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Edit3 className="w-[1vw] h-[1vw]" />
                  </div>
                  <div>
                    <h3 className="text-[1vw] font-semibold text-slate-800 leading-tight">
                      Edit Submitted Report
                    </h3>
                    <div className="text-[0.72vw] text-slate-500 font-normal mt-[0.15vw] flex items-center gap-[0.35vw]">
                      <span className="font-normal text-[#6e000a] font-mono">{editingReportItem.callNumber}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate max-w-[18vw] text-slate-600">
                        {editingReportItem.product.productModel || editingReportItem.product.productDescription || editingReportItem.product.itemCode || "Equipment"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingReportItem(null)}
                  className="p-[0.35vw] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-[1.05vw] h-[1.05vw]" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEditReport} className="p-[1.4vw] flex flex-col gap-[1.1vw]">
                {/* Status Segmented Selection (from ProductClosurePanel / Response modal) */}
                <div className="flex flex-col gap-[0.35vw]">
                  <label className="text-[0.76vw] font-medium text-slate-700">
                    Report Outcome / Status
                  </label>
                  <div className="flex items-center gap-[0.4vw] w-full">
                    {[
                      {
                        k: "Resolved",
                        l: "Resolve",
                        icon: <CheckCircle2 className="w-[0.85vw] h-[0.85vw]" />,
                        activeStyle: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
                        hoverStyle: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
                      },
                      {
                        k: "Pending",
                        l: "Pending",
                        icon: <PauseCircle className="w-[0.85vw] h-[0.85vw]" />,
                        activeStyle: "bg-amber-600 text-white border-amber-600 shadow-sm",
                        hoverStyle: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300",
                      },
                      {
                        k: "Field Visit Required",
                        l: "Field Visit",
                        icon: <MapPin className="w-[0.85vw] h-[0.85vw]" />,
                        activeStyle: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
                        hoverStyle: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300",
                      },
                      {
                        k: "Supporting",
                        l: "Support",
                        icon: <LifeBuoy className="w-[0.85vw] h-[0.85vw]" />,
                        activeStyle: "bg-blue-600 text-white border-blue-600 shadow-sm",
                        hoverStyle: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
                      },
                      ...(editingReportItem.canReverse
                        ? [
                            {
                              k: "ReverseEscalate",
                              l: "Reverse Escalate",
                              icon: <RotateCcw className="w-[0.85vw] h-[0.85vw]" />,
                              activeStyle: "bg-rose-600 text-white border-rose-600 shadow-sm",
                              hoverStyle: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300",
                            },
                          ]
                        : []),
                    ].map((tab) => {
                      const isActive = editForm.status === tab.k;
                      return (
                        <button
                          type="button"
                          key={tab.k}
                          onClick={() => setEditForm((prev) => ({ ...prev, status: tab.k }))}
                          className={`flex-1 min-w-0 flex items-center justify-center gap-[0.3vw] py-[0.5vw] px-[0.4vw] rounded-[0.45vw] border text-[0.74vw] font-medium transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                            isActive
                              ? tab.activeStyle
                              : `bg-white border-slate-200 text-slate-650 ${tab.hoverStyle}`
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reverse Escalate Info Notice (if ReverseEscalate selected) */}
                {editForm.status === "ReverseEscalate" && (
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-[0.55vw] p-[0.75vw] text-[0.72vw] text-rose-800 flex items-center gap-[0.5vw]">
                    <RotateCcw className="w-[0.85vw] h-[0.85vw] text-rose-600 shrink-0" />
                    <span>
                      This report will be sent back to previous assignee:{" "}
                      <strong className="font-semibold text-rose-950">
                        {editingReportItem.previousAssigneeName || "Previous Engineer"}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Resolution / Outcome Remarks */}
                <div className="flex flex-col gap-[0.3vw]">
                  <label className="text-[0.76vw] font-medium text-slate-700 flex items-center justify-between">
                    <span>
                      {editForm.status === "Resolved"
                        ? "Resolution Details / Solution Notes"
                        : editForm.status === "Pending"
                        ? "Pending Reason & Details"
                        : editForm.status === "ReverseEscalate"
                        ? "Reason for Reverse Escalating"
                        : "Report Remarks / Findings"}{" "}
                      <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[0.68vw] text-slate-400 font-normal">Mandatory</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editForm.remarks}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    placeholder={
                      editForm.status === "ReverseEscalate"
                        ? "Enter reason for sending this report back to the previous engineer..."
                        : "Enter comprehensive findings, steps taken, or reason..."
                    }
                    className="w-full px-[0.8vw] py-[0.55vw] text-[0.76vw] border border-slate-200 rounded-[0.45vw] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 text-slate-800 font-normal resize-none placeholder:text-slate-400 transition-all bg-white hover:border-slate-300"
                  />
                </div>

                {/* Mandatory Edit Reason (only needed when updating report, not when reverse escalating) */}
                {editForm.status !== "ReverseEscalate" && (
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="text-[0.76vw] font-medium text-slate-700 flex items-center justify-between">
                      <span>
                        Mandatory Reason for Editing Report <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[0.68vw] text-slate-400 font-normal">Required for audit trail</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.editReason}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, editReason: e.target.value }))}
                      placeholder="e.g. Corrected faulty capacitor replaced details, customer update..."
                      className="w-full px-[0.8vw] py-[0.55vw] text-[0.76vw] border border-slate-200 rounded-[0.45vw] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 text-slate-800 font-normal placeholder:text-slate-400 transition-all bg-white hover:border-slate-300"
                    />
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-[0.8vw] flex items-center justify-end gap-[0.6vw] border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingReportItem(null)}
                    className="px-[0.95vw] py-[0.45vw] text-[0.75vw] font-medium text-slate-600 hover:text-slate-800 bg-slate-100/70 hover:bg-slate-200/70 rounded-[0.4vw] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingEdit ||
                      !editForm.remarks.trim() ||
                      (editForm.status !== "ReverseEscalate" && !editForm.editReason.trim())
                    }
                    className={`px-[1.1vw] py-[0.45vw] text-[0.75vw] font-semibold text-white rounded-[0.4vw] transition-all cursor-pointer flex items-center gap-[0.35vw] shadow-sm disabled:opacity-50 active:scale-98 ${
                      editForm.status === "ReverseEscalate"
                        ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-500/20"
                        : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-500/20"
                    }`}
                  >
                    <span>
                      {isSubmittingEdit
                        ? "Saving..."
                        : editForm.status === "ReverseEscalate"
                        ? "Confirm Reverse Escalate"
                        : "Save Changes"}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

                {/* History Modal */}
        {historyModalCall && (
          <ProductHistoryModal
            history={[
              ...((historyModalCall.editHistory || []).map((eh) => ({
                status: `Call Edited (${eh.role || "Admin"})`,
                timestamp: eh.editedAt,
                updatedBy: eh.editedBy,
                updatedByName: eh.editedByName,
                remarks: eh.reason ? `Reason: ${eh.reason}` : "",
                metadata: {
                  isEdit: true,
                  editReason: eh.reason,
                  diffs: eh.diffs || [],
                },
              }))),
              ...((historyModalCall.products || []).flatMap((p) => [
                ...((p._closureEdits || []).map((ce) => ({
                  status: `Report Edited (${ce.role || "Employee"})`,
                  timestamp: ce.editedAt,
                  updatedBy: ce.editedBy,
                  updatedByName: ce.editedByName,
                  remarks: ce.reason ? `Reason: ${ce.reason}` : "",
                  metadata: {
                    isEdit: true,
                    editReason: ce.reason,
                    diffs: ce.diffs || [],
                  },
                }))),
                ...(p._history || []),
              ])),
            ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
            employees={employees}
            currentUser={currentUser}
            onClose={() => setHistoryModalCall(null)}
          />
        )}

        {/* Full Details Call Modal */}
        {selectedInfoCall && (
          <CallDetailsModal
            call={selectedInfoCall}
            employees={employees}
            onClose={() => setSelectedInfoCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
