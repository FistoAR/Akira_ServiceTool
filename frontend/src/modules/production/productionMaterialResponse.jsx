import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Package, Clock, User, CheckCircle, AlertCircle, X, Eye, Send,
  FileText, Calendar, Hash, Tag, Wrench,
  AlertTriangle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Search, Check, Edit3, RotateCcw,
  Save, Loader2
} from "lucide-react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import ProductionDetailsModal from "./ProductionDetailsModal";

const API_URL = import.meta.env.VITE_API_URL;

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

const toInputDate = (d) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  const dmyMatch = String(d).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Open: { color: "gray", icon: AlertCircle, bg: "bg-gray-100", border: "border-slate-300", text: "text-gray-700" },
  "Under Testing": { color: "blue", icon: Wrench, bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  "Repair in Progress": { color: "orange", icon: Wrench, bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  Pending: { color: "slate", icon: Clock, bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-800" },
  Completed: { color: "green", icon: CheckCircle, bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  "Not Repairable": { color: "red", icon: AlertTriangle, bg: "bg-red-100", border: "border-red-300", text: "text-red-800" },
  "Admin Returned": { color: "purple", icon: AlertTriangle, bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
};

const STATUS_OPTIONS = [
  "Under Testing",
  "Repair in Progress",
  "Pending",
  "Completed",
  "Not Repairable"
];

const VALIDATION_OPTIONS = [
  "Pending",
  "Validated",
  "Failed",
  "Not Validated",
  "Under Testing"
];

const VERIFICATION_OPTIONS = [
  "Pending",
  "Verified",
  "Rejected",
  "Re-work"
];

const STATUS_CHIPS = [
  { label: "All" },
  { label: "Repair in Progress" },
  { label: "Pending" },
  { label: "Not Repairable" },
  { label: "Under Testing" },
  { label: "Completed" },
  { label: "Admin Returned" }
];

// Editable column fields mapping
const EDITABLE_COL_FIELDS = {
  workDoneBy: "workDoneBy",
  fourMCategory: "fourMCategory",
  rootCause: "rootCause",
  correctiveAction: "correctiveActionDetails",
  materialChange: "materialChangeDetails",
  delayTime: "delayTime",
  materialCost: "materialCost",
  status: "status",
  completedDate: "completedDate",
  validationStatus: "validationStatus",
  verificationStatus: "verificationStatus",
  closingDate: "closingDate",
};

export default function ProductionMaterialResponse() {
  const { toast } = useNotification();
  const location = useLocation();

  const navFilter = location.state?.filterTerm || "";

  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [infoSelected, setInfoSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState(navFilter);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const [expandedCustomerDetails, setExpandedCustomerDetails] = useState({});

  // Inline Drafts and Drag-Fill States
  const [drafts, setDrafts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [editingRows, setEditingRows] = useState({});
  const [vvModal, setVvModal] = useState(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const tableContainerRef = useRef(null);

  const toggleCustomerDetails = (custName, e) => {
    if (e) e.stopPropagation();
    setExpandedCustomerDetails(prev => ({
      ...prev,
      [custName]: !prev[custName]
    }));
  };

  useEffect(() => {
    if (location.state?.filterTerm !== undefined) {
      setSearchTerm(location.state.filterTerm || "");
    }
  }, [location.state]);

  // Load User
  useEffect(() => {
    const KEYS = ["loggedInUser", "currentUser", "user", "akira_user", "auth_user"];
    for (const k of KEYS) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.userId || parsed?.id) {
            setCurrentUser(parsed);
            return;
          }
        } catch {}
      }
    }
  }, []);

  const employeeOptions = useMemo(() => 
    (employees || []).map(e => ({ value: e.userId || e.id || e._id, label: e.name })), 
  [employees]);

  const fourMOptions = useMemo(() => 
    (fourMCategories || []).map(c => ({ value: c.name || c._id || c, label: c.name || c })),
  [fourMCategories]);

  // Fetch Data
  const fetchData = async () => {
    try {
      const rawUser = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "{}";
      let u = {};
      try { u = JSON.parse(rawUser); } catch {}
      const uid = u.userId || u.id || u._id || "";
      const uRole = u.role || "";
      const uDept = u.department || "";

      const queryParams = new URLSearchParams();
      if (uid) queryParams.append("userId", uid);
      if (uRole) queryParams.append("role", uRole);
      if (uDept) queryParams.append("department", uDept);

      const [matRes, empRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/production-material?${queryParams.toString()}`),
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/master/four-m-categories`)
      ]);
      setEntries(matRes.data.map(e => ({ ...e, id: e._id })));
      setEmployees(empRes.data);
      setFourMCategories(catRes.data);
    } catch (err) {
      console.error("Data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Products
  const myProducts = useMemo(() => {
    const list = [];
    entries.forEach(entry => {
      entry.products?.forEach(product => {
        list.push({ entry, product });
      });
    });
    return list;
  }, [entries]);

  const counts = useMemo(() => {
    const c = { 
      All: myProducts.length,
      "Repair in Progress": 0,
      Pending: 0,
      "Not Repairable": 0,
      "Under Testing": 0,
      Completed: 0,
      "Admin Returned": 0
    };
    myProducts.forEach(({ product }) => {
      const rawStatus = product.report?.status || "Open";
      const isAdminReturned =
        rawStatus === "Completed" &&
        (product.finalStatusHistory?.length ?? 0) > 0 &&
        product.finalStatus !== "Completed";

      if (isAdminReturned) {
        c["Admin Returned"]++;
      } else {
        const s = rawStatus === "Open" ? "Pending" : rawStatus;
        if (c[s] !== undefined) {
          c[s]++;
        }
      }
    });
    return c;
  }, [myProducts]);

  const allProducts = useMemo(() => {
    let filtered = myProducts;
    if (filterStatus !== "All") {
      if (filterStatus === "Admin Returned") {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          return (
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed"
          );
        });
      } else if (filterStatus === "Pending") {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          const isAdminReturned =
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed";
          return !isAdminReturned && (rawStatus === "Pending" || rawStatus === "Open");
        });
      } else {
        filtered = filtered.filter(({ product }) => {
          const rawStatus = product.report?.status || "Open";
          const isAdminReturned =
            rawStatus === "Completed" &&
            (product.finalStatusHistory?.length ?? 0) > 0 &&
            product.finalStatus !== "Completed";
          return !isAdminReturned && rawStatus === filterStatus;
        });
      }
    }
    if (dateFrom) {
      filtered = filtered.filter(p => (p.entry.date || "").slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(p => (p.entry.date || "").slice(0, 10) <= dateTo);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.entry.customerName || "").toLowerCase().includes(s) ||
        (p.entry.customerCode || "").toLowerCase().includes(s) ||
        (p.entry.refNoInternal || "").toLowerCase().includes(s) ||
        (p.entry.jobOrderNo || "").toLowerCase().includes(s) ||
        (p.product._pid || "").toLowerCase().includes(s) ||
        (p.product._id || "").toLowerCase().includes(s) ||
        (p.entry._id || "").toLowerCase().includes(s) ||
        (p.product.productDescription || "").toLowerCase().includes(s) ||
        (p.product.productCode || "").toLowerCase().includes(s) ||
        (p.product.serialNumber || "").toLowerCase().includes(s) ||
        (p.product.stage || "").toLowerCase().includes(s) ||
        (p.product.ncType || "").toLowerCase().includes(s)
      );
    }
    return filtered.sort((a, b) => (a.entry.customerName || "").localeCompare(b.entry.customerName || ""));
  }, [myProducts, filterStatus, dateFrom, dateTo, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [allProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(allProducts.length / itemsPerPage);

  // ── Draft Helpers ────────────────────────────────────────────────────────────
  const getDraft = (productId, product) => {
    if (drafts[productId]) return drafts[productId];
    const r = product.report || {};
    return {
      workDoneBy: r.workDoneBy || product.assignedTo || "",
      workDoneByName: r.workDoneByName || product.assignedToName || "",
      fourMCategory: r.fourMCategory || "",
      rootCause: r.rootCause || "",
      correctiveActionDetails: r.correctiveActionDetails || r.correctiveAction || product.correction || "",
      materialChangeDetails: r.materialChangeDetails || r.partsReplacement || "",
      delayTime: r.delayTime !== undefined ? r.delayTime : (product.delayTime || ""),
      materialCost: r.materialCost || "",
      status: r.status && r.status !== "Open" ? r.status : "Pending",
      completedDate: toInputDate(r.completedDate),
      validationStatus: r.validationStatus || "Pending",
      verificationStatus: r.verificationStatus || "Pending",
      closingDate: toInputDate(r.closingDate || r.closedDate),
      hasChanges: false
    };
  };

  const handleDraftChange = (productId, product, field, value) => {
    setDrafts(prev => {
      const existing = prev[productId] || getDraft(productId, product);
      const updated = { ...existing, [field]: value, hasChanges: true };
      return { ...prev, [productId]: updated };
    });
  };

  // Permissions per record
  const getRecordPermissions = (entry, product) => {
    const currentUserId = currentUser?.userId || currentUser?.id;
    const isFinder = Boolean(currentUserId && (
      product.inspectedBy === currentUserId || 
      entry.creatorUserId === currentUserId || 
      (currentUser?.name && product.inspectedByName === currentUser.name)
    ));
    const isRaisedTo = Boolean(currentUserId && (
      product.raisedTo === currentUserId || 
      product.assignedTo === currentUserId || 
      (currentUser?.name && (product.raisedToName === currentUser.name || product.assignedToName === currentUser.name))
    ));
    const isExternalOrFieldReturn = product.ncType === "External" || product.ncType === "Field Return";
    const canValidate = isExternalOrFieldReturn ? isFinder : (isFinder || isRaisedTo);
    const canVerify = isExternalOrFieldReturn ? isRaisedTo : (isFinder || isRaisedTo);
    const canEditGeneral = true;

    return { canValidate, canVerify, canEditGeneral };
  };

  const isCellEditable = (item, colKey) => {
    if (!item) return false;
    const { entry, product } = item;
    const perms = getRecordPermissions(entry, product);
    if (colKey === "validationStatus") return perms.canValidate;
    if (colKey === "verificationStatus") return perms.canVerify;
    if (colKey === "completionDate") {
      const d = drafts[product._pid] || getDraft(product._pid, product);
      return d.status === "Completed";
    }
    return perms.canEditGeneral;
  };

  // ── Drag to Fill Handlers ──────────────────────────────────────────────────
  const handleCellMouseDown = (rowIndex, colKey, e) => {
    if (!EDITABLE_COL_FIELDS[colKey]) return;
    const targetItem = paginatedProducts[rowIndex];
    if (!isCellEditable(targetItem, colKey)) return;
    setSelection({
      startRow: rowIndex,
      endRow: rowIndex,
      colKey,
    });
    setIsSelecting(true);
  };

  const handleFillHandleMouseDown = (e, rowIndex, colKey) => {
    e.stopPropagation();
    e.preventDefault();
    const targetItem = paginatedProducts[rowIndex];
    if (!isCellEditable(targetItem, colKey)) return;
    setSelection({
      startRow: rowIndex,
      endRow: rowIndex,
      colKey,
    });
    setIsFilling(true);
  };

  const handleCellMouseEnter = (rowIndex, colKey) => {
    if (isFilling && selection && selection.colKey === colKey) {
      setSelection(prev => ({
        ...prev,
        endRow: rowIndex,
      }));
    }
  };

  const handleMouseUp = () => {
    if (isFilling && selection) {
      const { startRow, endRow, colKey } = selection;
      const field = EDITABLE_COL_FIELDS[colKey];
      if (field) {
        const sourceItem = paginatedProducts[startRow];
        if (sourceItem && isCellEditable(sourceItem, colKey)) {
          const sourceDraft = drafts[sourceItem.product._pid] || getDraft(sourceItem.product._pid, sourceItem.product);
          const sourceValue = sourceDraft[field];

          const minR = Math.min(startRow, endRow);
          const maxR = Math.max(startRow, endRow);

          let filledCount = 0;
          for (let r = minR; r <= maxR; r++) {
            if (r === startRow) continue;
            const targetItem = paginatedProducts[r];
            if (targetItem && isCellEditable(targetItem, colKey)) {
              const pid = targetItem.product._pid;
              handleDraftChange(pid, targetItem.product, field, sourceValue);
              filledCount++;
            }
          }
          if (filledCount > 0) {
            toast(`Filled ${field} down across ${filledCount} row(s)`);
          }
        }
      }
    }
    setIsSelecting(false);
    setIsFilling(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isFilling, selection, paginatedProducts, drafts]);

  const getCellClass = (rowIndex, colKey) => {
    let cls = "py-[0.55vw] px-[0.6vw] border-r border-b border-slate-300 relative align-middle ";
    if (!selection || selection.colKey !== colKey) return cls;
    const { startRow, endRow } = selection;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    if (rowIndex >= minR && rowIndex <= maxR) {
      cls += " bg-blue-50/40 z-10 before:content-[''] before:pointer-events-none before:absolute before:inset-0 ";
      if (rowIndex === minR && rowIndex === maxR) {
        cls += " before:border-2 before:border-blue-600";
      } else if (rowIndex === minR) {
        cls += " before:border-t-2 before:border-l-2 before:border-r-2 before:border-blue-600";
      } else if (rowIndex === maxR) {
        cls += " before:border-b-2 before:border-l-2 before:border-r-2 before:border-blue-600";
      } else {
        cls += " before:border-l-2 before:border-r-2 before:border-blue-600";
      }
    }
    return cls;
  };

  const renderFillHandle = (rowIndex, colKey) => {
    if (!selection || selection.colKey !== colKey) return null;
    const { startRow, endRow } = selection;
    const maxR = Math.max(startRow, endRow);
    const item = paginatedProducts[rowIndex];
    if (rowIndex === maxR && isCellEditable(item, colKey)) {
      return (
        <div
          data-fill-handle="true"
          onMouseDown={(e) => handleFillHandleMouseDown(e, startRow, colKey)}
          className="absolute bottom-[-3px] right-[-3px] w-[8px] h-[8px] bg-blue-600 border border-white cursor-crosshair z-[60] shadow-sm rounded-sm hover:scale-125 transition-transform"
          title="Drag down to fill value in column"
        />
      );
    }
    return null;
  };

  // ── Save Logic ───────────────────────────────────────────────────────────────
  const saveRow = async (entry, product, draft, showToastMsg = true) => {
    if (!draft || !draft.hasChanges) return true;

    if (!draft.rootCause?.trim()) {
      toast(`Root Cause is mandatory for ${product.productDescription}`, "error");
      return false;
    }
    if (!draft.fourMCategory?.trim()) {
      toast(`4M Category is mandatory for ${product.productDescription}`, "error");
      return false;
    }
    if (!draft.correctiveActionDetails?.trim()) {
      toast(`Corrective action details is mandatory for ${product.productDescription}`, "error");
      return false;
    }
    if ((draft.status === "Completed") && !draft.completedDate) {
      toast(`Completed Date is mandatory when Status is Completed for ${product.productDescription}`, "error");
      return false;
    }

    const derivedStatus = draft.verificationStatus === "Verified" ? "Completed" 
      : draft.verificationStatus === "Rejected" ? "Not Repairable" 
      : draft.validationStatus === "Validated" ? "Completed" 
      : (draft.status || "Under Testing");

    const finalReport = {
      ...draft,
      correctiveAction: draft.correctiveActionDetails,
      closedDate: draft.closingDate || draft.completedDate,
      partsReplacement: draft.materialChangeDetails,
      status: derivedStatus,
      lastUpdated: new Date()
    };

    setSavingStates(prev => ({ ...prev, [product._pid]: true }));
    try {
      const res = await axios.patch(`${API_URL}/production-material/${entry.id}/product/${product._pid}/report`, {
        report: finalReport
      });
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries(prev => prev.map(e => e.id === entry.id ? updatedRow : e));

      setDrafts(prev => {
        const next = { ...prev };
        if (next[product._pid]) {
          next[product._pid] = { ...next[product._pid], hasChanges: false };
        }
        return next;
      });

      if (showToastMsg) toast("Report saved successfully!", "success");
      return true;
    } catch (err) {
      if (showToastMsg) toast(err.response?.data?.message || "Failed to save report.", "error");
      return false;
    } finally {
      setSavingStates(prev => ({ ...prev, [product._pid]: false }));
    }
  };

  const handleBulkSave = async () => {
    const productsToSave = [];
    for (const item of allProducts) {
      const { entry, product } = item;
      const draft = drafts[product._pid];
      if (draft && draft.hasChanges) {
        productsToSave.push({ entry, product, draft });
      }
    }

    if (productsToSave.length === 0) {
      return toast("No changes to save.", "warning");
    }

    setIsBulkSaving(true);
    try {
      const results = [];
      for (const item of productsToSave) {
        const res = await saveRow(item.entry, item.product, item.draft, false);
        results.push(res);
      }
      const allSuccess = results.every(res => res);
      if (allSuccess) {
        toast(`Bulk save completed! ${productsToSave.length} items updated.`, "success");
      } else {
        toast("Some items failed validation or saving.", "error");
      }
    } catch (err) {
      toast("An error occurred during bulk save.", "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const hasAnyDraftChanges = useMemo(() => {
    return Object.values(drafts).some(d => d && d.hasChanges);
  }, [drafts]);

  // Columns definition for the Spreadsheet Table
  const columns = [
    { key: "sno", label: "S. No", align: "text-center", width: "w-[3.5vw]" },
    { key: "date", label: "Date", align: "text-left", minW: "min-w-[7vw]" },
    { key: "registration", label: "Registration", align: "text-left", minW: "min-w-[9.5vw]" },
    { key: "customer", label: "Customer", align: "text-left", minW: "min-w-[12vw]" },
    { key: "product", label: "Product Manifest", align: "text-left", minW: "min-w-[14vw]" },
    { key: "zone", label: "Zone", align: "text-center", minW: "min-w-[8vw]" },
    { key: "ncType", label: "NC Type", align: "text-center", minW: "min-w-[6vw]" },
    { key: "workDoneBy", label: "Work Done By", align: "text-left", minW: "min-w-[10vw]" },
    { key: "fourMCategory", label: "4M Category *", align: "text-left", minW: "min-w-[10vw]" },
    { key: "rootCause", label: "Root Cause *", align: "text-left", minW: "min-w-[12vw]" },
    { key: "correctiveAction", label: "Corrective Action *", align: "text-left", minW: "min-w-[12vw]" },
    { key: "materialChange", label: "Material Change", align: "text-left", minW: "min-w-[11vw]" },
    { key: "delayTime", label: "Delay Time", align: "text-center", minW: "min-w-[7vw]" },
    { key: "materialCost", label: "Material Cost", align: "text-right", minW: "min-w-[8vw]" },
    { key: "status", label: "Status *", align: "text-center", minW: "min-w-[9.5vw]" },
    { key: "completedDate", label: "Completed Date", align: "text-left", minW: "min-w-[9vw]" },
    { key: "verificationStatus", label: "Verification", align: "text-center", minW: "min-w-[9.5vw]" },
    { key: "validationStatus", label: "Validation", align: "text-center", minW: "min-w-[9.5vw]" },
    { key: "closingDate", label: "Closing Date", align: "text-left", minW: "min-w-[9vw]" },
    { key: "info", label: "Info", align: "text-center", width: "w-[4vw]" },
    { key: "action", label: "Action", align: "text-center", minW: "min-w-[7.5vw]" },
  ];

  return (
    <div className="w-full h-full font-sans text-[0.9vw] flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col gap-[0.55vw] h-full flex-1 min-h-0">
        
        {/* ── 1. Top Level Scoping Toolbar: Search & Date Range ── */}
        <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border-[1.5px] border-slate-400 status-pills-track gap-[0.7vw] shrink-0">
          <div className="relative w-[20vw]">
            <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
            <input
              type="text"
              placeholder="Search by customer, code, JO, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.81vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-[0.6vw] flex-shrink-0">
            <div className="flex items-center gap-[0.35vw] date-range-capsule border border-slate-300 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.8vw] shadow-2xs hover:border-slate-300 transition-all">
              <span className="text-slate-500 font-medium text-[0.79vw]">From</span>
              <input
                ref={fromDateRef}
                type="date"
                value={dateFrom || ""}
                onChange={(e) => setDateFrom(e.target.value)}
                className="no-native-calendar text-[0.8vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  if (fromDateRef.current) {
                    try { fromDateRef.current.showPicker(); } catch { fromDateRef.current.focus(); }
                  }
                }}
                className="p-0 border-0 bg-transparent cursor-pointer text-slate-500 hover:text-blue-600 transition-colors flex items-center mr-[0.15vw]"
                title="Choose from date"
              >
                <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0" />
              </button>
              <span className="text-slate-400 mx-[0.15vw] text-[0.9vw]">→</span>
              <span className="text-slate-500 font-medium text-[0.79vw]">To</span>
              <input
                ref={toDateRef}
                type="date"
                value={dateTo || ""}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="no-native-calendar text-[0.8vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
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
                <Calendar className="w-[0.85vw] h-[0.85vw] shrink-0" />
              </button>
            </div>

            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.79vw] font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-700 border-[1.5px] border-rose-400 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Table Card with Integrated Header Bar & Filter Tabs ── */}
        <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-300 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
          <div className="flex items-center justify-between px-[0.8vw] py-[0.45vw] border-b border-slate-300 bg-slate-50/50 shrink-0">
            <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border-[1.5px] border-slate-400 status-pills-track gap-[0.4vw] max-w-full overflow-x-auto min-w-0">
              {STATUS_CHIPS.map(({ label }) => {
                const isActive = filterStatus === label;
                const count = counts[label] ?? 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterStatus(label)}
                    className={`flex items-center gap-[0.45vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.8vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-slate-700"}>{label}</span>
                    <span className={`text-[0.73vw] font-medium ml-[0.1vw] transition-all ${
                      isActive ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full" : "text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[0.79vw] text-slate-500 font-medium whitespace-nowrap pl-[0.5vw] flex items-center gap-[0.3vw]">
              <span>Showing</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-[0.4vw] py-[0.08vw] rounded text-[0.77vw]">
                {allProducts.length}
              </span>
              <span>items</span>
            </div>
          </div>

          {/* Main Spreadsheet Table */}
          <div ref={tableContainerRef} className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-[#E9EDF7] z-30 border-b border-slate-300 text-slate-700 font-bold text-[0.79vw] uppercase tracking-wider">
                <tr>
                  {columns.map((col) => {
                    const isAction = col.key === "action";
                    return (
                      <th
                        key={col.key}
                        className={`${col.width || col.minW || ""} ${col.align} py-[0.7vw] px-[0.7vw] font-bold text-slate-700 uppercase tracking-wider text-[0.79vw] whitespace-nowrap border-r border-slate-300 sticky ${
                          isAction ? "right-0 z-40 bg-[#E9EDF7] shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]" : "top-0 z-30 bg-[#E9EDF7]"
                        }`}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="py-[6vw] text-center text-slate-500">
                      <div className="w-[2.2vw] h-[2.2vw] border-[0.25vw] border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-[0.6vw]" />
                      <span className="font-semibold text-[0.85vw] text-slate-600">Loading response items...</span>
                    </td>
                  </tr>
                ) : allProducts.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-[6vw] text-center text-slate-400">
                      <AlertCircle className="w-[2.2vw] h-[2.2vw] text-slate-300 mx-auto mb-[0.5vw]" />
                      <span className="font-medium text-[0.85vw] text-slate-500">No records found for the selected filter.</span>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let lastCustomer = null;
                    return paginatedProducts.map(({ entry, product }, idx) => {
                      const isNewCustomer = entry.customerName !== lastCustomer;
                      lastCustomer = entry.customerName;

                      const rawStatus = product.report?.status || "Open";
                      const isAdminReturned =
                        rawStatus === "Completed" &&
                        (product.finalStatusHistory?.length ?? 0) > 0 &&
                        product.finalStatus !== "Completed";
                      
                      const status = isAdminReturned ? "Admin Returned" : rawStatus;
                      const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Open"];
                      const isExpanded = !!expandedCustomerDetails[entry.customerName];
                      const draft = getDraft(product._pid, product);
                      const hc = (field, val) => handleDraftChange(product._pid, product, field, val);
                      const perms = getRecordPermissions(entry, product);

                      return (
                        <React.Fragment key={`${entry.id}-${product._pid}`}>
                          {/* Customer Separator Header Row */}
                          {isNewCustomer && (
                            <tr className="bg-slate-50/80 border-y border-slate-300">
                              <td colSpan={columns.length} className="p-0 border-b border-slate-300 bg-slate-50/90 sticky top-[2.4vw] z-20 shadow-2xs">
                                <div className="flex items-center gap-[0.6vw] sticky left-0 w-fit px-[1vw] py-[0.5vw] bg-slate-50 z-10">
                                  <div className="w-[0.35vw] h-[1.1vw] bg-slate-400 rounded-full" />
                                  <span className="font-semibold text-slate-800 text-[0.87vw] tracking-wide">
                                    {entry.customerName}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => toggleCustomerDetails(entry.customerName, e)}
                                    title={isExpanded ? "Collapse customer details" : "Expand customer details"}
                                    className="px-[0.35vw] py-[0.12vw] bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-300 hover:border-blue-300 rounded-[0.25vw] transition-all cursor-pointer flex items-center justify-center shrink-0 ml-[0.2vw] shadow-2xs"
                                  >
                                    <Icon
                                      icon={isExpanded ? "solar:alt-arrow-left-linear" : "solar:alt-arrow-right-linear"}
                                      className="w-[0.75vw] h-[0.75vw]"
                                    />
                                  </button>

                                  {isExpanded && (
                                    <div className="flex items-center gap-[0.4vw] flex-wrap animate-in fade-in duration-200">
                                      {entry.customerCode && (
                                        <span className="text-[0.7vw] text-slate-500 font-medium ml-[0.3vw]">
                                          Code: {entry.customerCode}
                                        </span>
                                      )}
                                      {entry.jobOrderNo && (
                                        <span className="text-[0.75vw] font-medium bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
                                          Cust Ref: {entry.jobOrderNo}
                                        </span>
                                      )}
                                      {entry.refNoInternal && (
                                        <span className="text-[0.75vw] font-medium bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
                                          Int Ref: {entry.refNoInternal}
                                        </span>
                                      )}
                                      {entry.category && (
                                        <span className="text-[0.75vw] font-medium text-slate-700 bg-slate-50 border border-slate-300 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.3vw]">
                                          Type: {entry.category}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Admin Returned Notification Banner */}
                          {isAdminReturned && (
                            <tr className="bg-amber-50/90 border-t border-b border-amber-300">
                              <td colSpan={columns.length} className="p-0 border-b border-amber-300 bg-amber-50">
                                <div className="flex items-center gap-[0.6vw] px-[1.2vw] py-[0.35vw]">
                                  <span className="inline-flex items-center gap-[0.3vw] px-[0.55vw] py-[0.15vw] rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-[0.75vw] font-semibold">
                                    <Icon icon="solar:danger-triangle-linear" className="w-[0.85vw] h-[0.85vw] text-amber-700" />
                                    Returned
                                  </span>
                                  {product.finalStatusRemarks && (
                                    <span className="text-[0.77vw] text-slate-800 font-medium">
                                      {product.finalStatusRemarks}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Data Row */}
                          <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                            {/* 1. S.No */}
                            <td className="py-[0.65vw] px-[0.7vw] text-center border-r border-b border-slate-300 bg-white sticky left-0 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                              <span className="inline-flex items-center justify-center w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 text-[0.73vw] font-semibold text-gray-600">
                                {((currentPage - 1) * itemsPerPage) + idx + 1}
                              </span>
                            </td>

                            {/* 2. Date */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300">
                              <span className="text-[0.83vw] font-medium text-slate-800 whitespace-nowrap">
                                {fmtDate(entry.date)}
                              </span>
                            </td>

                            {/* 3. Registration */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300">
                              <div className="text-[0.81vw] font-medium text-blue-700 whitespace-nowrap">JO: {entry.jobOrderNo || "—"}</div>
                            </td>

                            {/* 4. Customer */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300">
                              <div className="flex items-center gap-[0.35vw]">
                                <span className="text-[0.81vw] font-medium text-black truncate max-w-[12vw]">
                                  {entry.customerName}
                                </span>
                                {entry.customerCode && (
                                  <span className="relative group/tip inline-flex items-center shrink-0">
                                    <Icon
                                      icon="solar:info-circle-linear"
                                      className="w-[0.9vw] h-[0.9vw] text-slate-400 hover:text-blue-600 transition-colors"
                                    />
                                    <span className="pointer-events-none opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-[0.35vw] px-[0.65vw] py-[0.35vw] rounded-[0.35vw] bg-slate-900 text-white text-[0.72vw] whitespace-nowrap shadow-md z-50 text-left leading-snug">
                                      <div><span className="text-slate-400">Customer name:</span> {entry.customerName}</div>
                                      <div><span className="text-slate-400">Party code:</span> <span className="font-mono">{entry.customerCode}</span></div>
                                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                    </span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 5. Product Manifest */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300">
                              <div className="text-[0.81vw] font-medium text-black leading-tight max-w-[14vw] break-words">{product.productDescription}</div>
                              <div className="text-[0.71vw] text-slate-700 mt-[0.1vw] font-mono flex items-center gap-[0.3vw] flex-wrap">
                                <span>SN: <strong className="text-slate-900">{product.serialNumber || product.identification || "—"}</strong></span>
                                {product.reworkCycleCount > 0 && (
                                  <span className="bg-rose-50 text-rose-700 px-[0.35vw] py-[0.05vw] rounded font-bold border border-rose-200">
                                    Cycle {product.reworkCycleCount + 1}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 5a. Zone (View Only) */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300 text-center">
                              <div className="inline-flex items-center gap-[0.25vw] text-[0.75vw] font-semibold">
                                <span className="text-blue-700">{product.zone || product.stage || "—"}</span>
                                {product.targetZone && (
                                  <>
                                    <span className="text-slate-400">→</span>
                                    <span className="bg-blue-50 text-blue-700 px-[0.35vw] py-[0.05vw] rounded border border-blue-200">
                                      {product.targetZone}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 5b. NC Type (View Only) */}
                            <td className="py-[0.65vw] px-[0.7vw] border-r border-b border-slate-300 text-center">
                              <span className={`inline-block px-[0.5vw] py-[0.12vw] rounded text-[0.75vw] font-semibold ${
                                product.ncType === "External"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                {product.ncType || "—"}
                              </span>
                            </td>

                            {/* 6. Work Done By */}
                            <td
                              className={getCellClass(idx, "workDoneBy")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "workDoneBy", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "workDoneBy")}
                            >
                              <div className="min-w-[9.5vw]">
                                <CustomDropdown
                                  size="sm"
                                  usePortal={true}
                                  placeholder="Select employee"
                                  searchable={true}
                                  value={draft.workDoneBy}
                                  onChange={(val) => {
                                    const opt = employeeOptions.find(e => e.value === val);
                                    hc("workDoneBy", val);
                                    hc("workDoneByName", opt?.label || "");
                                  }}
                                  options={employeeOptions}
                                  triggerClassName="!h-[1.9vw] !text-[0.79vw] !py-[0.18vw] !px-[0.5vw] !rounded-[0.3vw] !border !border-slate-300 focus:!border-blue-500 !bg-white shadow-2xs font-medium text-slate-800"
                                />
                              </div>
                              {renderFillHandle(idx, "workDoneBy")}
                            </td>

                            {/* 7. 4M Category */}
                            <td
                              className={getCellClass(idx, "fourMCategory")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "fourMCategory", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "fourMCategory")}
                            >
                              <div className="min-w-[9vw]">
                                <CustomDropdown
                                  size="sm"
                                  usePortal={true}
                                  placeholder="Select"
                                  value={draft.fourMCategory}
                                  onChange={(val) => hc("fourMCategory", val)}
                                  options={fourMOptions}
                                  triggerClassName="!h-[1.9vw] !text-[0.79vw] !py-[0.18vw] !px-[0.5vw] !rounded-[0.3vw] !border !border-slate-300 focus:!border-blue-500 !bg-white shadow-2xs font-medium text-slate-800"
                                />
                              </div>
                              {renderFillHandle(idx, "fourMCategory")}
                            </td>

                            {/* 8. Root Cause */}
                            <td
                              className={getCellClass(idx, "rootCause")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "rootCause", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "rootCause")}
                            >
                              <input
                                type="text"
                                value={draft.rootCause}
                                onChange={(e) => hc("rootCause", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs min-w-[11vw]"
                                placeholder="Root Cause..."
                              />
                              {renderFillHandle(idx, "rootCause")}
                            </td>

                            {/* 9. Corrective Action */}
                            <td
                              className={getCellClass(idx, "correctiveAction")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "correctiveAction", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "correctiveAction")}
                            >
                              <input
                                type="text"
                                value={draft.correctiveActionDetails}
                                onChange={(e) => hc("correctiveActionDetails", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs min-w-[11vw]"
                                placeholder="Corrective Action..."
                              />
                              {renderFillHandle(idx, "correctiveAction")}
                            </td>

                            {/* 10. Material Change */}
                            <td
                              className={getCellClass(idx, "materialChange")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "materialChange", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "materialChange")}
                            >
                              <input
                                type="text"
                                value={draft.materialChangeDetails}
                                onChange={(e) => hc("materialChangeDetails", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs min-w-[10vw]"
                                placeholder="Material Changes..."
                              />
                              {renderFillHandle(idx, "materialChange")}
                            </td>

                            {/* 11. Delay Time */}
                            <td
                              className={getCellClass(idx, "delayTime")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "delayTime", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "delayTime")}
                            >
                              <input
                                type="text"
                                value={draft.delayTime}
                                onChange={(e) => hc("delayTime", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs text-center min-w-[6vw]"
                                placeholder="e.g. 15 mins"
                              />
                              {renderFillHandle(idx, "delayTime")}
                            </td>

                            {/* 12. Material Cost */}
                            <td
                              className={getCellClass(idx, "materialCost")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "materialCost", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "materialCost")}
                            >
                              <input
                                type="text"
                                value={draft.materialCost}
                                onChange={(e) => hc("materialCost", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs text-right min-w-[7vw]"
                                placeholder="Cost..."
                              />
                              {renderFillHandle(idx, "materialCost")}
                            </td>

                            {/* 13. Status */}
                            <td
                              className={getCellClass(idx, "status")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "status", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "status")}
                            >
                              <div className="min-w-[9vw]">
                                <CustomDropdown
                                  size="sm"
                                  usePortal={true}
                                  placeholder="Select"
                                  value={draft.status}
                                  onChange={(val) => hc("status", val)}
                                  options={STATUS_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                                  triggerClassName="!h-[1.9vw] !text-[0.79vw] !py-[0.18vw] !px-[0.5vw] !rounded-[0.3vw] !border !border-slate-300 focus:!border-blue-500 !bg-white shadow-2xs font-semibold"
                                />
                              </div>
                              {renderFillHandle(idx, "status")}
                            </td>

                            {/* 14. Completed Date */}
                            <td
                              className={getCellClass(idx, "completedDate")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "completedDate", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "completedDate")}
                            >
                              {draft.status === "Completed" ? (
                                <input
                                  type="date"
                                  value={toInputDate(draft.completedDate)}
                                  onChange={(e) => hc("completedDate", e.target.value)}
                                  className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium shadow-2xs min-w-[8vw]"
                                />
                              ) : (
                                <span className="text-slate-400 text-[0.8vw] select-none text-center block">—</span>
                              )}
                              {renderFillHandle(idx, "completedDate")}
                            </td>

                            {/* 16. Verification Status */}
                            <td className={getCellClass(idx, "verificationStatus")}>
                              {(product.status === "Completed" || draft.status === "Completed") ? (() => {
                                const bothAccepted = draft.validationStatus === "Validated" && draft.verificationStatus === "Verified";
                                const isDecided = draft.verificationStatus === "Verified" || draft.verificationStatus === "Rejected";
                                if (!perms.canVerify || isDecided) {
                                  return (
                                    <div className="inline-flex items-center justify-center gap-[0.3vw]">
                                      <span className={`text-[0.75vw] font-semibold px-[0.5vw] py-[0.15vw] rounded border ${
                                        draft.verificationStatus === "Verified"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : draft.verificationStatus === "Rejected"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}>
                                        {draft.verificationStatus === "Verified" ? "Accepted" : (draft.verificationStatus || "Pending")}
                                      </span>
                                      {perms.canVerify && isDecided && !bothAccepted && (
                                        <button
                                          type="button"
                                          onClick={() => setVvModal({
                                            type: "verification",
                                            action: draft.verificationStatus === "Verified" ? "Accepted" : "Rejected",
                                            entry,
                                            product,
                                            draft,
                                            date: toInputDate(draft.closingDate) || new Date().toISOString().split("T")[0],
                                            remarks: draft.finalStatusRemarks || ""
                                          })}
                                          className="p-[0.2vw] text-slate-400 hover:text-blue-600 cursor-pointer"
                                          title="Edit Verification"
                                        >
                                          <Icon icon="solar:pen-linear" className="w-[0.85vw] h-[0.85vw]" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    <button
                                      type="button"
                                      onClick={() => setVvModal({
                                        type: "verification",
                                        action: "Accepted",
                                        entry,
                                        product,
                                        draft,
                                        date: new Date().toISOString().split("T")[0],
                                        remarks: ""
                                      })}
                                      className="px-[0.45vw] py-[0.18vw] rounded text-[0.72vw] font-semibold border transition-all cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVvModal({
                                        type: "verification",
                                        action: "Rejected",
                                        entry,
                                        product,
                                        draft,
                                        date: new Date().toISOString().split("T")[0],
                                        remarks: ""
                                      })}
                                      className="px-[0.45vw] py-[0.18vw] rounded text-[0.72vw] font-semibold border transition-all cursor-pointer bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                );
                              })() : (
                                <span className="text-[0.77vw] text-slate-400">—</span>
                              )}
                            </td>

                            {/* 15. Validation Status */}
                            <td className={getCellClass(idx, "validationStatus")}>
                              {(product.status === "Completed" || draft.status === "Completed") ? (() => {
                                const bothAccepted = draft.validationStatus === "Validated" && draft.verificationStatus === "Verified";
                                const isDecided = draft.validationStatus === "Validated" || draft.validationStatus === "Rejected";
                                if (!perms.canValidate || isDecided) {
                                  return (
                                    <div className="inline-flex items-center justify-center gap-[0.3vw]">
                                      <span className={`text-[0.75vw] font-semibold px-[0.5vw] py-[0.15vw] rounded border ${
                                        draft.validationStatus === "Validated"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : draft.validationStatus === "Rejected"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}>
                                        {draft.validationStatus === "Validated" ? "Accepted" : (draft.validationStatus || "Pending")}
                                      </span>
                                      {perms.canValidate && isDecided && !bothAccepted && (
                                        <button
                                          type="button"
                                          onClick={() => setVvModal({
                                            type: "validation",
                                            action: draft.validationStatus === "Validated" ? "Accepted" : "Rejected",
                                            entry,
                                            product,
                                            draft,
                                            date: toInputDate(draft.closingDate) || new Date().toISOString().split("T")[0],
                                            remarks: draft.finalStatusRemarks || ""
                                          })}
                                          className="p-[0.2vw] text-slate-400 hover:text-blue-600 cursor-pointer"
                                          title="Edit Validation"
                                        >
                                          <Icon icon="solar:pen-linear" className="w-[0.85vw] h-[0.85vw]" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center justify-center gap-[0.3vw]">
                                    <button
                                      type="button"
                                      onClick={() => setVvModal({
                                        type: "validation",
                                        action: "Accepted",
                                        entry,
                                        product,
                                        draft,
                                        date: new Date().toISOString().split("T")[0],
                                        remarks: ""
                                      })}
                                      className="px-[0.45vw] py-[0.18vw] rounded text-[0.72vw] font-semibold border transition-all cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVvModal({
                                        type: "validation",
                                        action: "Rejected",
                                        entry,
                                        product,
                                        draft,
                                        date: new Date().toISOString().split("T")[0],
                                        remarks: ""
                                      })}
                                      className="px-[0.45vw] py-[0.18vw] rounded text-[0.72vw] font-semibold border transition-all cursor-pointer bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                );
                              })() : (
                                <span className="text-[0.77vw] text-slate-400">—</span>
                              )}
                            </td>

                            {/* 17. Closing Date */}
                            <td
                              className={getCellClass(idx, "closingDate")}
                              onMouseDown={(e) => handleCellMouseDown(idx, "closingDate", e)}
                              onMouseEnter={() => handleCellMouseEnter(idx, "closingDate")}
                            >
                              <input
                                type="date"
                                value={toInputDate(draft.closingDate)}
                                onChange={(e) => hc("closingDate", e.target.value)}
                                className="w-full text-[0.8vw] bg-white border border-slate-300 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20 text-slate-800 font-medium shadow-2xs min-w-[8vw]"
                              />
                              {renderFillHandle(idx, "closingDate")}
                            </td>

                            {/* 18. Info & History View Buttons */}
                            <td className="py-[0.65vw] px-[0.7vw] text-center border-r border-b border-slate-300">
                              <div className="inline-flex items-center justify-center gap-[0.25vw]">
                                <button 
                                  onClick={() => setInfoSelected({ entry, product })}
                                  className="p-[0.35vw] text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="View Details"
                                >
                                  <Eye className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                                {((product.report?.history?.length > 0) || (product.finalStatusHistory?.length > 0)) && (
                                  <button
                                    type="button"
                                    onClick={() => setInfoSelected({ entry, product })}
                                    className="p-[0.35vw] text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full transition-all cursor-pointer inline-flex items-center justify-center"
                                    title="Edited History"
                                  >
                                    <Icon icon="solar:history-linear" className="w-[0.9vw] h-[0.9vw]" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* 19. Action Save / Edit Button */}
                            <td className="py-[0.65vw] px-[0.7vw] text-center border-b border-slate-300 sticky right-0 bg-white z-20 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                              {(draft.validationStatus === "Validated" && draft.verificationStatus === "Verified") ? (
                                <span className="text-[0.73vw] font-semibold text-emerald-700 bg-emerald-50 px-[0.5vw] py-[0.2vw] rounded border border-emerald-200">
                                  Locked
                                </span>
                              ) : product.status === "Completed" && !editingRows[product._pid] ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingRows(prev => ({ ...prev, [product._pid]: true }))}
                                  className="inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.8vw] font-semibold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 cursor-pointer transition-all"
                                >
                                  <span>Edit</span>
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await saveRow(entry, product, draft);
                                    setEditingRows(prev => ({ ...prev, [product._pid]: false }));
                                  }}
                                  disabled={!draft?.hasChanges || savingStates[product._pid]}
                                  className={`inline-flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] rounded-[0.35vw] text-[0.8vw] font-semibold transition-all ${
                                    savingStates[product._pid]
                                      ? "bg-blue-400 text-white cursor-not-allowed"
                                      : draft?.hasChanges
                                        ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-md"
                                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  {savingStates[product._pid] ? (
                                    <>
                                      <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-[0.75vw] h-[0.75vw]" />
                                      <span>Save</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination & Bulk Save Footer */}
          {allProducts.length > 0 && (
            <div className="border-t border-slate-300 px-[1vw] py-[0.55vw] bg-slate-50/70 flex justify-between items-center rounded-b-[0.8vw] shrink-0">
              <div className="flex items-center gap-[1.2vw]">
                <div className="text-[0.79vw] font-medium text-slate-500">
                  Showing <strong className="text-slate-800">{paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, allProducts.length)}</strong> of <strong className="text-slate-800">{allProducts.length}</strong> assigned products
                </div>
              </div>

              <div className="flex items-center gap-[1vw]">
                <div className="flex items-center gap-[0.4vw]">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="w-[1.8vw] h-[1.8vw] rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer bg-white"
                  >
                    <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                  <span className="text-[0.77vw] font-medium text-slate-600 px-[0.4vw]">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="w-[1.8vw] h-[1.8vw] rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer bg-white"
                  >
                    <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                </div>

                {/* Bulk Save Button */}
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={isBulkSaving || !hasAnyDraftChanges}
                  className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all ${
                    isBulkSaving
                      ? "bg-emerald-400 text-white cursor-not-allowed"
                      : hasAnyDraftChanges
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-900/20"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isBulkSaving ? (
                    <>
                      <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-[0.9vw] h-[0.9vw]" />
                      <span>Bulk Save</span>
                      {hasAnyDraftChanges && (
                        <span className="ml-[0.2vw] px-[0.35vw] py-[0.05vw] bg-white/20 text-white rounded-full text-[0.7vw] font-bold">
                          {Object.values(drafts).filter(d => d && d.hasChanges).length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Production Details Modal (Audit timeline, products, manifest) */}
      {infoSelected && (
        <ProductionDetailsModal
          entry={infoSelected.entry}
          product={infoSelected.product}
          onClose={() => setInfoSelected(null)}
        />
      )}

      {/* Verification / Validation Accept-Decline Popup */}
      {vvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-white rounded-[0.6vw] shadow-xl border border-slate-200 w-[24vw] p-[1.2vw] space-y-[0.9vw]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-[0.5vw]">
              <h3 className="text-[0.95vw] font-bold text-slate-800 capitalize">
                {vvModal.type}
              </h3>
              <button
                type="button"
                onClick={() => setVvModal(null)}
                className="text-slate-400 hover:text-slate-600 text-[1vw] font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-[0.7vw] text-[0.82vw]">
              <div>
                <label className="block text-[0.75vw] font-semibold text-slate-600 mb-[0.2vw]">
                  {vvModal.type === "verification" ? "Verified Date" : "Validated Date"}
                </label>
                <input
                  type="date"
                  value={vvModal.date}
                  onChange={(e) => setVvModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[0.75vw] font-semibold text-slate-600 mb-[0.2vw]">
                  Status
                </label>
                <select
                  value={vvModal.action}
                  onChange={(e) => setVvModal(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full border border-slate-300 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-slate-800 font-semibold outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.75vw] font-semibold text-slate-600 mb-[0.2vw]">
                  Remarks (optional)
                </label>
                <textarea
                  rows={2}
                  value={vvModal.remarks}
                  onChange={(e) => setVvModal(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter remarks..."
                  className="w-full border border-slate-300 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-slate-800 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {vvModal.type === "validation" && vvModal.action === "Accepted" && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-[0.35vw] px-[0.6vw] py-[0.4vw] text-[0.74vw] font-medium">
                  Once validation is accepted, you cannot edit these values further.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-[0.5vw] pt-[0.3vw]">
              <button
                type="button"
                onClick={() => setVvModal(null)}
                className="px-[0.8vw] py-[0.35vw] rounded-[0.35vw] text-[0.8vw] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { type, action, entry, product, draft, date, remarks } = vvModal;
                  const nextStatus = type === "verification"
                    ? (action === "Accepted" ? "Verified" : "Rejected")
                    : (action === "Accepted" ? "Validated" : "Rejected");
                  const updatedDraft = {
                    ...draft,
                    [type === "verification" ? "verificationStatus" : "validationStatus"]: nextStatus,
                    closingDate: date || draft.closingDate,
                    finalStatusRemarks: remarks || draft.finalStatusRemarks,
                    hasChanges: true
                  };
                  setVvModal(null);
                  await saveRow(entry, product, updatedDraft);
                }}
                className={`px-[0.9vw] py-[0.35vw] rounded-[0.35vw] text-[0.8vw] font-semibold text-white cursor-pointer ${
                  vvModal.action === "Accepted"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
