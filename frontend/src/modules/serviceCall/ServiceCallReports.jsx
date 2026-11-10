import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import ProductHistoryModal from "./ProductHistoryModal";
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
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Data
  const [calls, setCalls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

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
  }, [scopedCalls, fromDate, toDate, callTypeFilter, priorityFilter, search]);

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

  // Employee Report Aggregation
  const employeeReportData = useMemo(() => {
    return employees
      .filter((emp) => emp.role?.toLowerCase() !== "admin")
      .map((emp) => {
        const empCalls = filteredCalls.filter((call) =>
          (call.products || []).some(
            (p) =>
              p._assignedEngineerId === emp.userId ||
              p._supportPersonId === emp.userId ||
              p._fieldVisit?.assignedTo === emp.userId ||
              p._fieldVisit?.assignedBy === emp.userId ||
              call.registeredBy === emp.userId,
          ),
        );

        const closedCount = empCalls.reduce((acc, call) => {
          const cProds = (call.products || []).filter(
            (p) =>
              (p._assignedEngineerId === emp.userId ||
                p._supportPersonId === emp.userId ||
                p._fieldVisit?.assignedTo === emp.userId) &&
              (p._resolved ||
                p._productClosure?.status === "Closed" ||
                p._productClosure?.status === "Resolved"),
          );
          return acc + cProds.length;
        }, 0);

        return {
          ...emp,
          totalAssigned: empCalls.length,
          closedCount,
          pendingCount: Math.max(0, empCalls.length - closedCount),
          calls: empCalls,
        };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [employees, filteredCalls]);

  // Assignment Report (Per User Analytics) Aggregation
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
    if (activeMainView === "employees") {
      return selectedEmployee ? selectedEmployeeCalls : employeeReportData;
    }
    return filteredCalls;
  }, [
    activeMainView,
    filteredCalls,
    escalationItems,
    selectedEmployee,
    selectedEmployeeCalls,
    assignmentReportData,
    employeeReportData,
  ]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return activeDataset.slice(start, start + rowsPerPage);
  }, [activeDataset, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(activeDataset.length / rowsPerPage);

  // Edit Report Handlers
  const handleOpenEditReport = (call, prod, pIdx) => {
    const closure = prod._productClosure || {};
    setEditingReportItem({
      callId: call._id || call.id || call.callNumber,
      callNumber: call.callNumber,
      productIdx: pIdx,
      product: prod,
    });
    setEditForm({
      status: closure.status || (prod._resolved ? "Resolved" : "Open"),
      remarks: closure.remarks || "",
      resolutionType: closure.resolutionType || "Normal Resolution",
      editReason: "",
    });
  };

  const handleSaveEditReport = async (e) => {
    e.preventDefault();
    if (!editingReportItem) return;
    setIsSubmittingEdit(true);
    try {
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
      setEditingReportItem(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update report:", err);
      toast("Failed to update report", "error");
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
        {/* Main Tab Navigation */}
        <div className="flex items-center gap-[0.4vw] bg-white/90 backdrop-blur-md border border-slate-300 rounded-[0.8vw] p-[0.3vw] shadow-sm">
          <button
            onClick={() => {
              setActiveMainView("registered");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.45vw] rounded-[0.5vw] font-bold text-[0.8vw] transition-all cursor-pointer ${
              activeMainView === "registered"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Layers className="w-[0.9vw] h-[0.9vw]" />
            <span>All Calls ({filteredCalls.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMainView("escalations");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.45vw] rounded-[0.5vw] font-bold text-[0.8vw] transition-all cursor-pointer ${
              activeMainView === "escalations"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Flame className="w-[0.9vw] h-[0.9vw]" />
            <span>Escalation View ({escalationItems.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMainView("assignments");
              setSelectedEmployee(null);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.45vw] rounded-[0.5vw] font-bold text-[0.8vw] transition-all cursor-pointer ${
              activeMainView === "assignments"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-[0.9vw] h-[0.9vw]" />
            <span>Assignment Report ({assignmentReportData.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveMainView("employees");
                setSelectedEmployee(null);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.45vw] rounded-[0.5vw] font-bold text-[0.8vw] transition-all cursor-pointer ${
                activeMainView === "employees"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Users className="w-[0.9vw] h-[0.9vw]" />
              <span>Employee Overview ({employees.length})</span>
            </button>
          )}
        </div>

        {/* Global Controls & Filters */}
        <div className="flex items-center gap-[0.6vw]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search call, customer, item, SN..."
              className="pl-[2.1vw] pr-[0.8vw] py-[0.4vw] w-[14vw] rounded-[0.5vw] border border-slate-300 text-[0.78vw] font-medium text-slate-800 bg-white outline-none focus:border-indigo-500 placeholder-slate-400 shadow-2xs"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`flex items-center gap-[0.35vw] px-[0.75vw] py-[0.45vw] border rounded-[0.5vw] font-bold text-[0.78vw] transition-colors cursor-pointer shadow-2xs ${
                showFilterPopover || fromDate || toDate || callTypeFilter !== "All" || priorityFilter !== "All"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              title="Filter reports by date, origin, and priority"
            >
              <Filter className="w-[0.85vw] h-[0.85vw]" />
              <span>Filters</span>
              {(fromDate || toDate || callTypeFilter !== "All" || priorityFilter !== "All") && (
                <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-indigo-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterPopover(false)}
                />
                <div className="absolute right-0 top-full mt-[0.4vw] w-[20vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-[0.7vw] border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-[0.4vw]">
                      <Filter className="w-[0.85vw] h-[0.85vw] text-indigo-600" />
                      <span className="text-[0.8vw] font-bold text-slate-800">Filter Records</span>
                    </div>
                    {(fromDate || toDate || callTypeFilter !== "All" || priorityFilter !== "All") && (
                      <button
                        onClick={() => {
                          setFromDate("");
                          setToDate("");
                          setCallTypeFilter("All");
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
              className={`flex items-center gap-[0.35vw] px-[0.75vw] py-[0.45vw] border rounded-[0.5vw] font-bold text-[0.78vw] transition-colors cursor-pointer shadow-2xs ${
                showColPicker
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              title="Select columns to export to Excel"
            >
              <Columns className="w-[0.85vw] h-[0.85vw] text-slate-500" />
              <span>Columns</span>
              <span className="ml-[0.2vw] px-[0.4vw] py-[0.05vw] text-[0.65vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200">
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
            className="flex items-center gap-[0.35vw] px-[0.9vw] py-[0.45vw] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-[0.5vw] font-bold text-[0.78vw] transition-colors cursor-pointer shadow-2xs"
            title="Export filtered reports to Excel"
          >
            <Download className="w-[0.85vw] h-[0.85vw]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Main Report Display Container ────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col overflow-hidden">
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
                  <table className="w-full text-left border-collapse min-w-[75vw]">
                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[0.72vw]">
                      <tr>
                        <th className="p-[0.7vw] border-r border-slate-200 text-center w-[3.5vw] whitespace-nowrap">S.No</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Origin Type</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Call No</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Customer</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Product / Issue</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Registered</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Assigned</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Escalated</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Closed</th>
                        <th className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">Status</th>
                        <th className="p-[0.7vw] text-center sticky right-0 top-0 bg-slate-100 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[0.8vw]">
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

                            return (
                              <tr
                                key={`${call._id || call.callNumber}-${pIdx}`}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                {/* 0. S.No */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="p-[0.7vw] border-r border-slate-200 align-middle text-center font-bold text-slate-500 bg-white whitespace-nowrap"
                                  >
                                    {callSno}
                                  </td>
                                )}

                                {/* 1. Origin Distinction */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap bg-white font-semibold"
                                  >
                                    {isSelf ? (
                                      <span className="inline-flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full text-[0.7vw] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                        <UserCheck className="w-[0.75vw] h-[0.75vw]" />
                                        Self Assigned
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-[0.3vw] px-[0.55vw] py-[0.18vw] rounded-full text-[0.7vw] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        <Shield className="w-[0.75vw] h-[0.75vw]" />
                                        Registered Call
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* 2. Call Number */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap bg-white font-mono font-bold text-indigo-700"
                                  >
                                    <div className="flex items-center gap-[0.35vw]">
                                      <span>{call.callNumber}</span>
                                      {hasEdits && (
                                        <span
                                          className="text-[0.62vw] px-[0.3vw] py-[0.05vw] bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold"
                                          title="This call has edited records"
                                        >
                                          Edited
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* 3. Customer */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="p-[0.7vw] border-r border-slate-200 align-middle bg-white max-w-[12vw]"
                                  >
                                    <div className="font-bold text-slate-800 truncate" title={call.customerName}>
                                      {call.customerName || "—"}
                                    </div>
                                    <div className="text-[0.7vw] text-slate-500 font-mono mt-[0.1vw]">
                                      {call.partyCode || call.contactNumber || "—"}
                                    </div>
                                  </td>
                                )}

                                {/* 4. Product / Issue */}
                                <td className="p-[0.7vw] border-r border-slate-200 align-middle max-w-[14vw]">
                                  <div className="font-semibold text-slate-800 truncate" title={prod.productModel || prod.itemCode}>
                                    {prod.productModel || prod.itemCode || "—"}
                                  </div>
                                  {prod.serialNumber && (
                                    <div className="text-[0.7vw] text-slate-500 font-mono mt-[0.05vw]">
                                      SN: {prod.serialNumber}
                                    </div>
                                  )}
                                </td>

                                {/* 5. Registered Info */}
                                {pIdx === 0 && (
                                  <td
                                    rowSpan={rowCount}
                                    className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap bg-white"
                                  >
                                    <div className="font-semibold text-slate-700">
                                      {fmtDateTime(call.createdAt || call.dateTime)}
                                    </div>
                                    <div className="text-[0.7vw] text-slate-500">
                                      By: {call.registeredByName || call.registeredBy || "System"}
                                    </div>
                                  </td>
                                )}

                                {/* 6. Assigned Info */}
                                <td className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap">
                                  {prod._assignedEngineerName || call.currentEngineerName ? (
                                    <div>
                                      <div className="font-semibold text-indigo-700">
                                        {prod._assignedEngineerName || call.currentEngineerName}
                                      </div>
                                      <div className="text-[0.7vw] text-slate-500">
                                        {fmtDateTime(prod._assignedAt || call.createdAt)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium">Unassigned</span>
                                  )}
                                </td>

                                {/* 7. Escalated Info */}
                                <td className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap">
                                  {prod._escalationLevel > 0 || call.escalationLevel > 0 || prod._isCritical ? (
                                    <div>
                                      <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-[0.4vw] py-[0.1vw] rounded text-[0.7vw]">
                                        Level {prod._escalationLevel || call.escalationLevel || 1}
                                      </span>
                                      <div className="text-[0.7vw] text-slate-500 mt-[0.1vw]">
                                        {formatDurationFrom(prod._assignedAt || call.createdAt)} open
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium">—</span>
                                  )}
                                </td>

                                {/* 8. Closed Info */}
                                <td className="p-[0.7vw] border-r border-slate-200 align-middle whitespace-nowrap">
                                  {isClosed ? (
                                    <div>
                                      <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-[0.4vw] py-[0.1vw] rounded text-[0.7vw]">
                                        Resolved
                                      </span>
                                      <div className="text-[0.7vw] text-slate-500 mt-[0.1vw]">
                                        {fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-amber-600 font-semibold text-[0.75vw]">In Progress</span>
                                  )}
                                </td>

                                {/* 9. Status */}
                                <td className="p-[0.7vw] border-r border-slate-200 text-center align-middle whitespace-nowrap">
                                  <span className="inline-flex items-center gap-[0.35vw] text-[0.78vw] font-bold text-slate-700">
                                    <span className={`w-[0.5vw] h-[0.5vw] rounded-full shrink-0 ${cfg.dot}`} />
                                    {cfg.label}
                                  </span>
                                </td>

                                {/* 10. Actions */}
                                <td className="p-[0.7vw] text-center align-middle whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                  <div className="flex items-center justify-center gap-[0.35vw]">
                                    <button
                                      onClick={() => setSelectedInfoCall(call)}
                                      title="View Full Call Details"
                                      className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-blue-50 border border-blue-200 rounded-[0.4vw] hover:bg-blue-100 text-blue-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Info className="w-[0.8vw] h-[0.8vw]" />
                                      Info
                                    </button>
                                    {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                      <button
                                        onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                        title="Edit Report"
                                        className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-indigo-50 border border-indigo-200 rounded-[0.4vw] hover:bg-indigo-100 text-indigo-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        Edit Report
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setHistoryModalCall(call)}
                                      className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-white border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <History className="w-[0.8vw] h-[0.8vw]" />
                                      History
                                    </button>
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
                  <table className="w-full text-left border-collapse min-w-[75vw]">
                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[0.72vw]">
                      <tr>
                        <th className="p-[0.7vw] border-r border-slate-200 text-center w-[3.5vw] whitespace-nowrap">S.No</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Call No</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Customer</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Product / SN</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Who Escalated</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">When Escalated</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Why (Reason)</th>
                        <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Open Duration</th>
                        <th className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">Status</th>
                        <th className="p-[0.7vw] text-center sticky right-0 top-0 bg-slate-100 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[0.8vw]">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-[10vh] text-center text-slate-400 font-bold">
                            No escalated calls found.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                            <td className="p-[0.7vw] border-r border-slate-200 text-center font-bold text-slate-500 whitespace-nowrap">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 font-mono font-bold text-rose-700 whitespace-nowrap">
                              {item.call.callNumber}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 max-w-[12vw]">
                              <div className="font-bold text-slate-800 truncate">{item.call.customerName}</div>
                              <div className="text-[0.7vw] text-slate-500 font-mono">{item.call.partyCode || "—"}</div>
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 max-w-[14vw]">
                              <div className="font-semibold text-slate-800 truncate">
                                {item.prod.productModel || item.prod.itemCode || "—"}
                              </div>
                              {item.prod.serialNumber && (
                                <div className="text-[0.7vw] text-slate-500 font-mono">SN: {item.prod.serialNumber}</div>
                              )}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                              {item.escalatedBy}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-slate-700 font-medium">
                              {fmtDateTime(item.escalatedAt)}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 max-w-[16vw]">
                              <span className="font-medium text-rose-800 bg-rose-50 border border-rose-200 px-[0.45vw] py-[0.15vw] rounded text-[0.74vw] inline-block">
                                {item.reason}
                              </span>
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap font-bold text-slate-800">
                              <span className="flex items-center gap-[0.3vw] text-rose-700">
                                <Clock className="w-[0.8vw] h-[0.8vw]" />
                                {item.openDuration}
                              </span>
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                              {item.isClosed ? (
                                <span className="px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Resolved
                                </span>
                              ) : (
                                <span className="px-[0.5vw] py-[0.15vw] rounded-full text-[0.7vw] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                  Escalated
                                </span>
                              )}
                            </td>
                            <td className="p-[0.7vw] text-center whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center justify-center gap-[0.35vw]">
                                <button
                                  onClick={() => setSelectedInfoCall(item.call)}
                                  title="View Full Call Details"
                                  className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-blue-50 border border-blue-200 rounded-[0.4vw] hover:bg-blue-100 text-blue-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Info className="w-[0.8vw] h-[0.8vw]" />
                                  Info
                                </button>
                                <button
                                  onClick={() => setHistoryModalCall(item.call)}
                                  className="inline-flex items-center gap-[0.25vw] px-[0.6vw] py-[0.3vw] bg-white border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                >
                                  <History className="w-[0.8vw] h-[0.8vw]" />
                                  View History
                                </button>
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

            {/* VIEW 3: Assignment Report (Per User Analytics) */}
            {activeMainView === "assignments" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[70vw]">
                      <thead className="sticky top-0 bg-[#f8fafc] z-10 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[0.68vw]">
                        <tr>
                          <th className="py-[0.7vw] px-[0.8vw] w-[3.5vw] text-center whitespace-nowrap">#</th>
                          <th className="py-[0.7vw] px-[0.8vw] whitespace-nowrap">User</th>
                          <th className="py-[0.7vw] px-[0.8vw] whitespace-nowrap">Department</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-center whitespace-nowrap">Calls</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-center whitespace-nowrap">Self Assigned</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-center whitespace-nowrap">Open</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-center whitespace-nowrap">Closed</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-center whitespace-nowrap">Avg Response</th>
                          <th className="py-[0.7vw] px-[0.8vw] text-right pr-[1.2vw] w-[8vw] whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[0.78vw]">
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-[4vw] text-center text-slate-400 font-medium">
                              No assignment records found.
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((emp, idx) => (
                            <tr
                              key={emp.userId || idx}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              {/* Index */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center font-medium text-slate-400 whitespace-nowrap text-[0.72vw]">
                                {(currentPage - 1) * rowsPerPage + idx + 1}
                              </td>

                              {/* User */}
                              <td className="py-[0.65vw] px-[0.8vw] whitespace-nowrap">
                                <div className="flex items-center gap-[0.6vw]">
                                  <div className="w-[1.9vw] h-[1.9vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-[0.75vw] shrink-0">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-800 leading-tight">{emp.name}</div>
                                    <div className="text-[0.68vw] text-slate-400 font-mono">{emp.userId}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-[0.65vw] px-[0.8vw] text-slate-500 whitespace-nowrap font-medium text-[0.75vw]">
                                {emp.department || "—"}
                              </td>

                              {/* Calls */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center whitespace-nowrap">
                                <span className={`font-semibold ${emp.callsPerUser > 0 ? "text-slate-800" : "text-slate-300"}`}>
                                  {emp.callsPerUser}
                                </span>
                              </td>

                              {/* Self Assigned */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center whitespace-nowrap">
                                <span className={`font-semibold ${emp.selfAssignedCount > 0 ? "text-indigo-600" : "text-slate-300"}`}>
                                  {emp.selfAssignedCount}
                                </span>
                              </td>

                              {/* Open */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center whitespace-nowrap">
                                <span className={`font-semibold ${emp.openCount > 0 ? "text-amber-600 font-bold" : "text-slate-300"}`}>
                                  {emp.openCount}
                                </span>
                              </td>

                              {/* Closed */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center whitespace-nowrap">
                                <span className={`font-semibold ${emp.closedCount > 0 ? "text-emerald-600 font-bold" : "text-slate-300"}`}>
                                  {emp.closedCount}
                                </span>
                              </td>

                              {/* Avg Response */}
                              <td className="py-[0.65vw] px-[0.8vw] text-center whitespace-nowrap">
                                {emp.avgResponseTime !== "—" ? (
                                  <span className="font-mono text-slate-700 text-[0.72vw] font-medium">
                                    {emp.avgResponseTime}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-[0.65vw] px-[0.8vw] text-right pr-[1.2vw] whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setCurrentPage(1);
                                  }}
                                  disabled={emp.callsPerUser === 0}
                                  className={`inline-flex items-center gap-[0.2vw] px-[0.55vw] py-[0.25vw] rounded-[0.35vw] font-semibold text-[0.72vw] transition-all cursor-pointer ${
                                    emp.callsPerUser > 0
                                      ? "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                                      : "text-slate-300 cursor-not-allowed"
                                  }`}
                                >
                                  <span>View</span>
                                  <ChevronRight className="w-[0.75vw] h-[0.75vw]" />
                                </button>
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
                    <div className="px-[1vw] py-[0.6vw] border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-[0.7vw]">
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setCurrentPage(1);
                          }}
                          className="p-[0.4vw] bg-white border border-slate-300 rounded-[0.4vw] text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
                        </button>
                        <div>
                          <span className="text-[0.9vw] font-bold text-slate-800">
                            {selectedEmployee.name}
                          </span>
                          <span className="text-[0.72vw] text-slate-500 ml-[0.5vw]">
                            ({selectedEmployee.department}) • {selectedEmployeeCalls.length} Assigned Calls
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse min-w-[75vw]">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[0.72vw]">
                          <tr>
                            <th className="p-[0.7vw] border-r border-slate-200 text-center w-[3.5vw] whitespace-nowrap">S.No</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Call No</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Type</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Customer</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Product</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Registered</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Assigned</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Closed</th>
                            <th className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">Status</th>
                            <th className="p-[0.7vw] text-center sticky right-0 top-0 bg-slate-100 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[0.8vw]">
                          {paginatedData.map((call, cIdx) => {
                            const prods = call.products && call.products.length > 0 ? call.products : [{}];
                            const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;
                            return prods.map((prod, pIdx) => {
                              const pStatus = getCallProductStatus(prod, call.status);
                              const cfg = getStatusCfg(pStatus);
                              const isClosed =
                                prod._resolved ||
                                prod._productClosure?.status === "Closed" ||
                                prod._productClosure?.status === "Resolved";

                              return (
                                <tr key={`${call._id}-${pIdx}`} className="hover:bg-slate-50 transition-colors">
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="p-[0.7vw] border-r border-slate-200 text-center font-bold text-slate-500 bg-white whitespace-nowrap"
                                    >
                                      {callSno}
                                    </td>
                                  )}
                                  <td className="p-[0.7vw] border-r border-slate-200 font-mono font-bold text-indigo-700 whitespace-nowrap">
                                    {call.callNumber}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">
                                    <span className={`px-[0.5vw] py-[0.12vw] rounded text-[0.72vw] font-bold ${
                                      call.noEscalation ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}>
                                      {call.noEscalation ? "Self Assigned" : "Registered Call"}
                                    </span>
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 max-w-[12vw]">
                                    <div className="font-bold text-slate-800 truncate">{call.customerName}</div>
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 max-w-[14vw]">
                                    <div className="font-semibold text-slate-800 truncate">
                                      {prod.productModel || prod.itemCode || "—"}
                                    </div>
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-slate-600">
                                    {fmtDateTime(call.createdAt)}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-indigo-700 font-semibold">
                                    {fmtDateTime(prod._assignedAt || call.createdAt)}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-emerald-700 font-semibold">
                                    {isClosed ? fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date) : "—"}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center gap-[0.35vw] text-[0.78vw] font-bold text-slate-700">
                                      <span className={`w-[0.5vw] h-[0.5vw] rounded-full shrink-0 ${cfg.dot}`} />
                                      {cfg.label}
                                    </span>
                                  </td>
                                  <td className="p-[0.7vw] text-center whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                    <div className="flex items-center justify-center gap-[0.35vw]">
                                      <button
                                        onClick={() => setSelectedInfoCall(call)}
                                        title="View Full Call Details"
                                        className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-blue-50 border border-blue-200 rounded-[0.4vw] hover:bg-blue-100 text-blue-700 font-bold text-[0.72vw] transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Info className="w-[0.8vw] h-[0.8vw]" />
                                        Info
                                      </button>
                                      {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                        <button
                                          onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                          className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-indigo-50 border border-indigo-200 rounded-[0.4vw] hover:bg-indigo-100 text-indigo-700 font-bold text-[0.72vw] transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                          Edit
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setHistoryModalCall(call)}
                                        className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-white border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.72vw] transition-colors cursor-pointer"
                                      >
                                        <History className="w-[0.8vw] h-[0.8vw]" />
                                        History
                                      </button>
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

            {/* VIEW 4: Employee Overview & Specific Reports */}
            {activeMainView === "employees" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[60vw]">
                      <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[0.72vw]">
                        <tr>
                          <th className="p-[0.7vw] border-r border-slate-200 w-[5%] text-center">S.No</th>
                          <th className="p-[0.7vw] border-r border-slate-200 w-[30%]">Employee</th>
                          <th className="p-[0.7vw] border-r border-slate-200 w-[20%]">Department</th>
                          <th className="p-[0.7vw] border-r border-slate-200 w-[15%] text-center">Total Assigned</th>
                          <th className="p-[0.7vw] border-r border-slate-200 w-[15%] text-center">Closed Calls</th>
                          <th className="p-[0.7vw] text-center w-[15%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[0.8vw]">
                        {paginatedData.map((emp, idx) => (
                          <tr key={emp.userId || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-[0.7vw] border-r border-slate-200 text-center font-bold text-slate-500">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200">
                              <div className="flex items-center gap-[0.7vw]">
                                <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-[0.85vw]">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-[0.85vw]">{emp.name}</div>
                                  <div className="text-[0.7vw] text-slate-500 font-mono">{emp.userId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 font-semibold text-slate-700">
                              {emp.department || "—"}
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 text-center">
                              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-[0.55vw] py-[0.15vw] rounded-full text-[0.78vw]">
                                {emp.totalAssigned}
                              </span>
                            </td>
                            <td className="p-[0.7vw] border-r border-slate-200 text-center">
                              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-[0.55vw] py-[0.15vw] rounded-full text-[0.78vw]">
                                {emp.closedCount}
                              </span>
                            </td>
                            <td className="p-[0.7vw] text-center">
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setCurrentPage(1);
                                }}
                                className="inline-flex items-center gap-[0.3vw] px-[0.8vw] py-[0.38vw] bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-[0.4vw] text-[0.75vw] transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>View Calls</span>
                                <ChevronRight className="w-[0.8vw] h-[0.8vw]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Drilldown view for selected employee */
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-[1vw] py-[0.6vw] border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-[0.7vw]">
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setCurrentPage(1);
                          }}
                          className="p-[0.4vw] bg-white border border-slate-300 rounded-[0.4vw] text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
                        </button>
                        <div>
                          <span className="text-[0.9vw] font-bold text-slate-800">
                            {selectedEmployee.name}
                          </span>
                          <span className="text-[0.72vw] text-slate-500 ml-[0.5vw]">
                            ({selectedEmployee.department}) • {selectedEmployeeCalls.length} Allocated Calls
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse min-w-[75vw]">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[0.72vw]">
                          <tr>
                            <th className="p-[0.7vw] border-r border-slate-200 text-center w-[3.5vw] whitespace-nowrap">S.No</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Call No</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Customer</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Product</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Registered</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Assigned</th>
                            <th className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap">Closed</th>
                            <th className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">Status</th>
                            <th className="p-[0.7vw] text-center sticky right-0 top-0 bg-slate-100 shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)] whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[0.8vw]">
                          {paginatedData.map((call, cIdx) => {
                            const prods = call.products && call.products.length > 0 ? call.products : [{}];
                            const callSno = (currentPage - 1) * rowsPerPage + cIdx + 1;
                            return prods.map((prod, pIdx) => {
                              const pStatus = getCallProductStatus(prod, call.status);
                              const cfg = getStatusCfg(pStatus);
                              const isClosed =
                                prod._resolved ||
                                prod._productClosure?.status === "Closed" ||
                                prod._productClosure?.status === "Resolved";

                              return (
                                <tr key={`${call._id}-${pIdx}`} className="hover:bg-slate-50 transition-colors">
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={prods.length}
                                      className="p-[0.7vw] border-r border-slate-200 text-center font-bold text-slate-500 bg-white whitespace-nowrap"
                                    >
                                      {callSno}
                                    </td>
                                  )}
                                  <td className="p-[0.7vw] border-r border-slate-200 font-mono font-bold text-indigo-700">
                                    {call.callNumber}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 max-w-[12vw]">
                                    <div className="font-bold text-slate-800 truncate">{call.customerName}</div>
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 max-w-[14vw]">
                                    <div className="font-semibold text-slate-800 truncate">
                                      {prod.productModel || prod.itemCode || "—"}
                                    </div>
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-slate-600">
                                    {fmtDateTime(call.createdAt)}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-indigo-700 font-semibold">
                                    {fmtDateTime(prod._assignedAt || call.createdAt)}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 whitespace-nowrap text-emerald-700 font-semibold">
                                    {isClosed ? fmtDateTime(prod._productClosure?.closedAt || prod._productClosure?.date) : "—"}
                                  </td>
                                  <td className="p-[0.7vw] border-r border-slate-200 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center gap-[0.35vw] text-[0.78vw] font-bold text-slate-700">
                                      <span className={`w-[0.5vw] h-[0.5vw] rounded-full shrink-0 ${cfg.dot}`} />
                                      {cfg.label}
                                    </span>
                                  </td>
                                  <td className="p-[0.7vw] text-center whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_10px_-3px_rgba(0,0,0,0.06)]">
                                    {(!isAdmin || prod._productClosure?.closedBy === currentUser?.userId || prod._productClosure?.userId === currentUser?.userId) && (
                                      <button
                                        onClick={() => handleOpenEditReport(call, prod, pIdx)}
                                        className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-indigo-50 border border-indigo-200 rounded-[0.4vw] hover:bg-indigo-100 text-indigo-700 font-bold text-[0.72vw] transition-colors cursor-pointer mr-[0.3vw]"
                                      >
                                        <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setHistoryModalCall(call)}
                                      className="inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.3vw] bg-white border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.72vw] transition-colors cursor-pointer"
                                    >
                                      <History className="w-[0.8vw] h-[0.8vw]" />
                                      History
                                    </button>
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

            {/* ── Pagination Footer ────────────────────────────────────── */}
            <div className="flex items-center justify-between px-[1vw] py-[0.6vw] border-t border-slate-200 bg-slate-50 shrink-0">
              <div className="text-[0.75vw] font-bold text-slate-600">
                Showing {activeDataset.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{" "}
                {Math.min(currentPage * rowsPerPage, activeDataset.length)} of {activeDataset.length} records
              </div>
              <div className="flex items-center gap-[0.4vw]">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-[0.7vw] py-[0.35vw] border border-slate-300 rounded-[0.4vw] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[0.75vw] cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-[0.75vw] font-bold text-slate-700 px-[0.4vw]">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-[0.7vw] py-[0.35vw] border border-slate-300 rounded-[0.4vw] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[0.75vw] cursor-pointer"
                >
                  Next
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
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-full max-w-[36vw] overflow-hidden flex flex-col font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-[1.2vw] py-[0.85vw] border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[0.95vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                    <Edit3 className="w-[1vw] h-[1vw] text-indigo-600" />
                    Edit Submitted Report
                  </h3>
                  <div className="text-[0.72vw] text-slate-500 font-mono mt-[0.1vw]">
                    {editingReportItem.callNumber} • Product:{" "}
                    {editingReportItem.product.productModel || editingReportItem.product.itemCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingReportItem(null)}
                  className="p-[0.3vw] text-slate-400 hover:text-slate-600 rounded-[0.4vw] hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              {/* Action Tabs (Mirroring Respond Modal) */}
              <form onSubmit={handleSaveEditReport} className="p-[1.2vw] flex flex-col gap-[0.9vw]">
                <div>
                  <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.35vw]">
                    Report Outcome / Status
                  </label>
                  <div className="grid grid-cols-4 gap-[0.4vw]">
                    {[
                      { k: "Resolved", l: "Resolve", e: "✓", c: "bg-emerald-600 text-white border-emerald-600" },
                      { k: "Pending", l: "Pending", e: "⏸", c: "bg-amber-500 text-white border-amber-500" },
                      { k: "Field Visit Required", l: "Field Visit", e: "📍", c: "bg-indigo-600 text-white border-indigo-600" },
                      { k: "Supporting", l: "Support", e: "🔄", c: "bg-blue-600 text-white border-blue-600" },
                    ].map((tab) => (
                      <button
                        type="button"
                        key={tab.k}
                        onClick={() => setEditForm((prev) => ({ ...prev, status: tab.k }))}
                        className={`py-[0.4vw] text-[0.76vw] font-bold rounded-[0.45vw] border transition-all cursor-pointer flex items-center justify-center gap-[0.25vw] ${
                          editForm.status === tab.k
                            ? tab.c
                            : "bg-white border-slate-300 text-slate-650 hover:bg-slate-50"
                        }`}
                      >
                        <span>{tab.e}</span>
                        <span>{tab.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {editForm.status === "Resolved" && (
                  <div>
                    <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.3vw]">
                      Resolution Type
                    </label>
                    <div className="grid grid-cols-3 gap-[0.35vw]">
                      {[
                        "Fixed",
                        "Part Replaced",
                        "Configured",
                        "Component Replaced",
                        "Client Training",
                        "Hardware Reset",
                      ].map((rt) => (
                        <button
                          type="button"
                          key={rt}
                          onClick={() => setEditForm((prev) => ({ ...prev, resolutionType: rt }))}
                          className={`py-[0.3vw] text-[0.7vw] font-bold rounded-[0.4vw] border transition-all cursor-pointer text-center ${
                            editForm.resolutionType === rt
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {rt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.25vw]">
                    {editForm.status === "Resolved" ? "Resolution Details / Solution Notes" : editForm.status === "Pending" ? "Pending Reason & Details" : "Report Remarks / Findings"} *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editForm.remarks}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter comprehensive findings, steps taken, or pending reason..."
                    className="w-full px-[0.7vw] py-[0.45vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[0.75vw] font-bold text-slate-700 mb-[0.25vw]">
                    Mandatory Reason for Editing Report *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.editReason}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, editReason: e.target.value }))}
                    placeholder="e.g. Corrected faulty capacitor replaced details, customer update..."
                    className="w-full px-[0.7vw] py-[0.45vw] text-[0.78vw] border border-slate-300 rounded-[0.45vw] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="pt-[0.5vw] flex items-center justify-end gap-[0.6vw] border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingReportItem(null)}
                    className="px-[0.9vw] py-[0.4vw] text-[0.78vw] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-[0.4vw] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || !editForm.remarks.trim() || !editForm.editReason.trim()}
                    className="px-[1.1vw] py-[0.4vw] text-[0.78vw] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-[0.4vw] transition-colors cursor-pointer flex items-center gap-[0.35vw] shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingEdit ? "Saving..." : "Save Changes"}
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
