import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx-js-style";
import {
  FileText,
  Download,
  Search,
  Filter,
  Columns,
  Eye,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  Bookmark,
} from "lucide-react";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import ProductionDetailsModal from "./ProductionDetailsModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PRODUCTION_CUSTOM_FILTER_FIELDS = [
  { key: "customerName", label: "Customer Name" },
  { key: "customerCode", label: "Customer Code" },
  { key: "jobOrderNo", label: "Job Order No" },
  { key: "refNoInternal", label: "Ref No (Internal)" },
  { key: "productDescription", label: "Product Description" },
  { key: "productCode", label: "Product Code" },
  { key: "productSegment", label: "Product Segment" },
  { key: "boardType", label: "Board Type" },
  { key: "serialNumber", label: "Serial / Batch No" },
  { key: "ncType", label: "NC Type" },
  { key: "stage", label: "Detection Stage" },
  { key: "problemType", label: "Problem Type" },
  { key: "fourMCategory", label: "4M Category" },
  { key: "disposition", label: "Disposition" },
  { key: "targetZone", label: "Target Zone" },
  { key: "raisedToName", label: "Assigned To" },
  { key: "effectiveStatus", label: "Status" },
];

const ALL_COLUMNS = [
  { key: "sno", label: "S.No", defaultVisible: true, sortable: false },
  { key: "date", label: "Date", defaultVisible: true, sortable: true },
  { key: "refNoInternal", label: "Ref No", defaultVisible: true, sortable: true },
  { key: "jobOrderNo", label: "Job Order", defaultVisible: true, sortable: true },
  { key: "customerName", label: "Customer", defaultVisible: true, sortable: true },
  { key: "customerCode", label: "Customer Code", defaultVisible: false, sortable: true },
  { key: "productCode", label: "Item Code", defaultVisible: true, sortable: true },
  { key: "productDescription", label: "Product Description", defaultVisible: true, sortable: true },
  { key: "productSegment", label: "Segment", defaultVisible: false, sortable: true },
  { key: "boardType", label: "Board Type", defaultVisible: false, sortable: true },
  { key: "serialNumber", label: "Serial / Batch", defaultVisible: true, sortable: true },
  { key: "ncType", label: "NC Type", defaultVisible: true, sortable: true },
  { key: "stage", label: "Detection Stage", defaultVisible: true, sortable: true },
  { key: "problemType", label: "Problem Type", defaultVisible: false, sortable: true },
  { key: "problemDescription", label: "Problem Description", defaultVisible: true, sortable: false },
  { key: "qty", label: "Qty", defaultVisible: true, sortable: true },
  { key: "disposition", label: "Disposition", defaultVisible: false, sortable: true },
  { key: "targetZone", label: "Target Zone", defaultVisible: true, sortable: true },
  { key: "raisedToName", label: "Assigned To", defaultVisible: true, sortable: true },
  { key: "fourMCategory", label: "4M Category", defaultVisible: true, sortable: true },
  { key: "rootCause", label: "Root Cause", defaultVisible: false, sortable: false },
  { key: "actionTaken", label: "Action Taken", defaultVisible: false, sortable: false },
  { key: "delayTime", label: "Delay Time", defaultVisible: false, sortable: true },
  { key: "materialCost", label: "Material Cost", defaultVisible: false, sortable: true },
  { key: "verificationStatus", label: "Verification", defaultVisible: true, sortable: true },
  { key: "validationStatus", label: "Validation", defaultVisible: true, sortable: true },
  { key: "closingDate", label: "Closing Date", defaultVisible: false, sortable: true },
  { key: "effectiveStatus", label: "Final Status", defaultVisible: true, sortable: true },
  { key: "actions", label: "Info", defaultVisible: true, sortable: false },
];

const LOCAL_STORAGE_PROD_TEMPLATES_KEY = "production_nc_reports_column_templates";

const DEFAULT_PRODUCTION_COL_TEMPLATES = [
  {
    id: "tpl_default",
    name: "Default View",
    cols: ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
  },
  {
    id: "tpl_technical",
    name: "Technical & RCA View",
    cols: [
      "sno", "date", "jobOrderNo", "customerName", "productCode",
      "productDescription", "serialNumber", "ncType", "stage",
      "problemType", "problemDescription", "fourMCategory", "rootCause",
      "actionTaken", "effectiveStatus", "actions",
    ],
  },
  {
    id: "tpl_validation",
    name: "Validation & Cost View",
    cols: [
      "sno", "date", "jobOrderNo", "customerName", "productDescription",
      "targetZone", "raisedToName", "delayTime", "materialCost",
      "verificationStatus", "validationStatus", "closingDate", "effectiveStatus", "actions",
    ],
  },
  {
    id: "tpl_all",
    name: "All Columns",
    cols: ALL_COLUMNS.map((c) => c.key),
  },
];

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB").replace(/\//g, "-");
};

const getEffectiveStatus = (p) => {
  if (
    p.finalStatus === "Rejected" ||
    (p.verificationStatus || p.report?.verificationStatus) === "Rejected" ||
    (p.validationStatus || p.report?.validationStatus) === "Rejected" ||
    p.zoneValidationStatus === "Rejected"
  ) {
    return "Rejected";
  }
  if (
    p.finalStatus === "Completed" ||
    ((p.verificationStatus || p.report?.verificationStatus) === "Verified" &&
      (p.validationStatus || p.report?.validationStatus) === "Validated")
  ) {
    return "Completed";
  }
  return "Pending";
};

export default function ProductionMaterialReports() {
  const { toast } = useNotification();
  const [entries, setEntries] = useState([]);
  const [zoneMappings, setZoneMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [zoneScope, setZoneScope] = useState("all"); // all | same | sent | received
  const [statusFilter, setStatusFilter] = useState("All"); // All | Pending | Rejected | Completed
  const [customFilters, setCustomFilters] = useState([]);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);

  // Columns & Templates & Sorting & Pagination
  const [visibleCols, setVisibleCols] = useState(() =>
    ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [colTemplates, setColTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROD_TEMPLATES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PRODUCTION_COL_TEMPLATES;
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState("tpl_default");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showColPicker, setShowColPicker] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Detail Modal
  const [detailModal, setDetailModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rawUser = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "{}";
      const u = JSON.parse(rawUser);
      const uId = u.userId || u._id || "";
      const uRole = u.role || "";
      const uDept = u.department || "";

      const queryParams = new URLSearchParams();
      if (uId) queryParams.append("userId", uId);
      if (uRole) queryParams.append("role", uRole);
      if (uDept) queryParams.append("department", uDept);

      const [matRes, mapRes] = await Promise.all([
        axios.get(`${API_URL}/production-material?${queryParams.toString()}`),
        axios.get(`${API_URL}/production-material/zone-mappings`).catch(() => ({ data: [] })),
      ]);
      setEntries((matRes.data || []).map((e) => ({ ...e, id: e._id })));
      setZoneMappings(mapRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch production reports:", err);
      toast?.("Failed to load production reports", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Current user & role
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const uid = String(currentUser?.userId || currentUser?._id || "");
  const uname = (currentUser?.name || "").trim();
  const myZone = (currentUser?.zone || "").trim();
  const isAdmin =
    (currentUser?.role || "").toLowerCase().includes("admin") ||
    (currentUser?.department || "").toLowerCase().includes("quality") ||
    (currentUser?.department || "").toLowerCase().includes("admin") ||
    (currentUser?.role || "").toLowerCase().includes("supervisor");

  // Flatten entries -> product rows with role-based visibility
  const allRows = useMemo(() => {
    const rows = [];
    entries.forEach((entry) => {
      const isCreator =
        (uid && String(entry.creatorUserId || "") === uid) ||
        (uname && entry.creatorName === uname);

      (entry.products || []).forEach((product) => {
        const targetZone = (product.targetZone || "").trim();
        const isZoneLead =
          Boolean(targetZone) &&
          zoneMappings.some(
            (m) =>
              String(m.userId) === uid &&
              m.isDefaultReceiver &&
              (m.zone || "").trim() === targetZone
          );
        const isAssigned =
          (uid &&
            (String(product.raisedTo || "") === uid ||
              String(product.assignedTo || "") === uid ||
              String(product.inspectedBy || "") === uid ||
              String(product.report?.doneBy || "") === uid)) ||
          (uname &&
            (product.raisedToName === uname ||
              product.assignedToName === uname ||
              product.inspectedByName === uname));

        // Role-based visibility: Admin/Quality/Supervisor see all; others see Same Zone items, items they created, items assigned to them, or items sent to their zone
        if (!isAdmin && targetZone && !isCreator && !isAssigned && !isZoneLead && (!myZone || targetZone !== myZone)) {
          return;
        }

        const effectiveStatus = getEffectiveStatus(product);
        const verStatus = product.verificationStatus || product.report?.verificationStatus || "Pending";
        const valStatus = product.validationStatus || product.report?.validationStatus || "Pending";

        rows.push({
          entry,
          product,
          id: `${entry.id}_${product._pid}`,
          date: entry.date || "",
          refNoInternal: entry.refNoInternal || "",
          jobOrderNo: entry.jobOrderNo || "",
          customerName: entry.customerName || "",
          customerCode: entry.customerCode || "",
          productCode: product.productCode || "",
          productDescription: product.productDescription || "",
          productSegment: product.productSegment || "",
          boardType: product.boardType || "",
          serialNumber: product.serialNumber || product.identification || "",
          ncType: product.ncType || "Internal",
          stage: product.stage || "",
          problemType: product.problemType || "",
          problemDescription: product.problemDescription || "",
          qty: product.qty || 1,
          disposition: product.disposition || "",
          targetZone,
          raisedToName: product.raisedToName || product.assignedToName || "",
          fourMCategory: product.report?.fourMCategory || product.fourMCategory || "",
          rootCause: product.report?.rootCause || "",
          actionTaken: product.report?.actionTaken || "",
          delayTime: product.report?.delayTime || "",
          materialCost: product.report?.materialCost || "",
          verificationStatus: verStatus === "Verified" ? "Accepted" : verStatus,
          validationStatus: valStatus === "Validated" ? "Accepted" : valStatus,
          closingDate: product.closingDate || product.report?.closingDate || "",
          effectiveStatus,
          isCreator,
        });
      });
    });
    return rows;
  }, [entries, zoneMappings, uid, uname, isAdmin]);

  // Apply Search, Date, Custom Filters (before Zone Scope & Status for accurate pill counts)
  const baseFilteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allRows.filter((r) => {
      if (dateFrom && (r.date || "").slice(0, 10) < dateFrom) return false;
      if (dateTo && (r.date || "").slice(0, 10) > dateTo) return false;
      if (q) {
        const hay = [
          r.customerName,
          r.customerCode,
          r.jobOrderNo,
          r.refNoInternal,
          r.productDescription,
          r.productCode,
          r.serialNumber,
          r.ncType,
          r.raisedToName,
          r.targetZone,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      for (const cf of customFilters) {
        if (!cf.field || !cf.value?.trim()) continue;
        const rawVal = String(r[cf.field] || "").toLowerCase();
        const target = cf.value.trim().toLowerCase();
        if (cf.operator === "equals" && rawVal !== target) return false;
        if (cf.operator === "not_equals" && rawVal === target) return false;
        if (cf.operator === "contains" && !rawVal.includes(target)) return false;
      }
      return true;
    });
  }, [allRows, dateFrom, dateTo, searchTerm, customFilters]);

  // Zone Scope counts (all records)
  const zoneCounts = useMemo(() => {
    return {
      all: baseFilteredRows.length,
      same: baseFilteredRows.filter((r) => !r.targetZone).length,
      sent: baseFilteredRows.filter(
        (r) =>
          Boolean(r.targetZone) &&
          (r.isCreator || (myZone && r.targetZone !== myZone))
      ).length,
      received: baseFilteredRows.filter(
        (r) =>
          Boolean(r.targetZone) &&
          !r.isCreator &&
          (!myZone || r.targetZone === myZone)
      ).length,
    };
  }, [baseFilteredRows, myZone]);

  // Zone-scoped rows
  const zoneScopedRows = useMemo(() => {
    if (zoneScope === "all") return baseFilteredRows;
    if (zoneScope === "same") return baseFilteredRows.filter((r) => !r.targetZone);
    if (zoneScope === "sent") {
      return baseFilteredRows.filter(
        (r) => Boolean(r.targetZone) && (r.isCreator || (myZone && r.targetZone !== myZone))
      );
    }
    return baseFilteredRows.filter(
      (r) => Boolean(r.targetZone) && !r.isCreator && (!myZone || r.targetZone === myZone)
    );
  }, [baseFilteredRows, zoneScope, myZone]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      All: zoneScopedRows.length,
      Pending: zoneScopedRows.filter((r) => r.effectiveStatus === "Pending").length,
      Rejected: zoneScopedRows.filter((r) => r.effectiveStatus === "Rejected").length,
      Completed: zoneScopedRows.filter((r) => r.effectiveStatus === "Completed").length,
    };
  }, [zoneScopedRows]);

  // Final filtered & sorted rows
  const finalRows = useMemo(() => {
    const list =
      statusFilter === "All"
        ? zoneScopedRows
        : zoneScopedRows.filter((r) => r.effectiveStatus === statusFilter);

    if (!sortConfig.key) return list;
    return [...list].sort((a, b) => {
      const av = a[sortConfig.key] ?? "";
      const bv = b[sortConfig.key] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [zoneScopedRows, statusFilter, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(finalRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return finalRows.slice(start, start + pageSize);
  }, [finalRows, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, zoneScope, statusFilter, customFilters, pageSize]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const formatCellValue = (row, key, idx) => {
    if (key === "sno") return (currentPage - 1) * pageSize + idx + 1;
    if (key === "date" || key === "closingDate") return fmtDate(row[key]);
    return row[key] || "—";
  };

  const exportExcel = () => {
    const exportCols = ALL_COLUMNS.filter(
      (c) => visibleCols.includes(c.key) && c.key !== "actions"
    );
    const exporterName = currentUser?.name || currentUser?.username || "System User";
    const exportDateStr = new Date().toLocaleString("en-GB");

    const titleRow = ["Production NC Report", ...Array(Math.max(0, exportCols.length - 1)).fill("")];
    const metaRow = [
      `Exported By: ${exporterName} | Generated: ${exportDateStr} | Total Records: ${finalRows.length}`,
      ...Array(Math.max(0, exportCols.length - 1)).fill(""),
    ];
    const headerRow = exportCols.map((c) => c.label);
    const dataRows = finalRows.map((row, idx) =>
      exportCols.map((c) =>
        c.key === "sno"
          ? idx + 1
          : c.key === "date" || c.key === "closingDate"
          ? fmtDate(row[c.key])
          : row[c.key] || "—"
      )
    );

    const ws = XLSX.utils.aoa_to_sheet([titleRow, metaRow, [], headerRow, ...dataRows]);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, exportCols.length - 1) } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, exportCols.length - 1) } },
    ];

    const border = {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    };

    if (ws["A1"]) {
      ws["A1"].s = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E4B94" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }
    if (ws["A2"]) {
      ws["A2"].s = {
        font: { sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }

    exportCols.forEach((_, cIdx) => {
      const hCell = XLSX.utils.encode_cell({ r: 3, c: cIdx });
      if (ws[hCell]) {
        ws[hCell].s = {
          font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E4B94" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        };
      }
      dataRows.forEach((__, rIdx) => {
        const dCell = XLSX.utils.encode_cell({ r: 4 + rIdx, c: cIdx });
        if (ws[dCell]) {
          ws[dCell].s = {
            font: { sz: 9, color: { rgb: "0F172A" } },
            fill: { fgColor: { rgb: rIdx % 2 === 0 ? "FFFFFF" : "F8FAFC" } },
            alignment: { horizontal: cIdx === 0 ? "center" : "left", vertical: "center" },
            border,
          };
        }
      });
    });

    ws["!cols"] = exportCols.map((c, cIdx) => {
      const maxLen = Math.max(
        c.label.length,
        ...dataRows.map((r) => String(r[cIdx] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 4, 10), 40) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production NC Report");
    XLSX.writeFile(wb, `Production_NC_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-slate-50 p-[1.2vw] rounded-[1vw] border border-slate-200">
        <div className="w-[3vw] h-[3vw] border-[0.3vw] border-black/10 border-t-blue-600 rounded-full animate-spin mb-[1vw]" />
        <span className="text-[1.05vw] font-bold text-slate-800">Loading Production Reports...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col font-sans text-[0.85vw] overflow-hidden gap-[0.55vw]">
      {/* Top Toolbar */}
      <div className="bg-white rounded-[0.8vw] border border-slate-300 px-[1vw] py-[0.65vw] flex flex-wrap items-center justify-between gap-[0.6vw] shrink-0 shadow-2xs">
        <div className="flex items-center gap-[0.6vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Layers className="w-[1.1vw] h-[1.1vw]" />
          </div>
          <div>
            <h1 className="text-[1.05vw] font-bold text-slate-800 leading-tight">Production NC Reports</h1>
            <p className="text-[0.72vw] text-slate-500">
              Updated {lastUpdated.toLocaleTimeString("en-GB")} · {finalRows.length} matching items
            </p>
          </div>
        </div>

        {/* Search + Date + Actions */}
        <div className="flex flex-wrap items-center gap-[0.5vw]">
          <div className="relative">
            <Search className="w-[0.85vw] h-[0.85vw] text-slate-400 absolute left-[0.7vw] top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer, JO, ref, product..."
              className="pl-[2vw] pr-[0.8vw] h-[2.1vw] w-[16vw] rounded-full border-[1.5px] border-slate-400 text-[0.78vw] outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-[0.3vw] border-[1.5px] border-slate-400 rounded-full px-[0.7vw] h-[2.1vw] bg-white">
            <span className="text-[0.73vw] text-slate-500">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-[0.75vw] outline-none bg-transparent"
            />
            <span className="text-slate-400">→</span>
            <span className="text-[0.73vw] text-slate-500">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-[0.75vw] outline-none bg-transparent"
            />
          </div>

          {(searchTerm || dateFrom || dateTo || customFilters.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setDateFrom("");
                setDateTo("");
                setCustomFilters([]);
              }}
              className="h-[2.1vw] px-[0.75vw] rounded-full border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[0.76vw] font-semibold inline-flex items-center gap-[0.3vw] cursor-pointer"
            >
              <RotateCcw className="w-[0.75vw] h-[0.75vw]" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilterBuilder((v) => !v)}
            className={`h-[2.1vw] px-[0.8vw] rounded-full border-[1.5px] text-[0.76vw] font-semibold inline-flex items-center gap-[0.3vw] cursor-pointer ${
              showFilterBuilder || customFilters.length > 0
                ? "bg-indigo-50 text-indigo-700 border-indigo-400"
                : "bg-white text-slate-700 border-slate-400 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-[0.8vw] h-[0.8vw]" />
            <span>Filters {customFilters.length > 0 ? `(${customFilters.length})` : ""}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColPicker((v) => !v)}
              className="h-[2.1vw] px-[0.8vw] rounded-full border-[1.5px] border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-[0.76vw] font-semibold inline-flex items-center gap-[0.3vw] cursor-pointer"
            >
              <Bookmark className="w-[0.8vw] h-[0.8vw]" /> Templates
            </button>
            {showColPicker && (
              <div className="absolute right-0 mt-[0.35vw] w-[19vw] bg-white border border-slate-300 rounded-[0.6vw] shadow-xl p-[0.7vw] z-50 space-y-[0.55vw]">
                {/* Template Selector */}
                <div className="space-y-[0.3vw] pb-[0.45vw] border-b border-slate-200">
                  <div className="text-[0.72vw] font-bold text-slate-700 uppercase tracking-wider">Templates</div>
                  <div className="flex items-center gap-[0.35vw]">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTemplateId(val);
                        const tpl = colTemplates.find((t) => t.id === val);
                        if (tpl) setVisibleCols(tpl.cols);
                      }}
                      className="flex-1 border border-slate-300 rounded px-[0.45vw] py-[0.22vw] text-[0.74vw] bg-white outline-none"
                    >
                      {colTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                    {!selectedTemplateId.startsWith("tpl_") && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = colTemplates.filter((t) => t.id !== selectedTemplateId);
                          setColTemplates(updated);
                          localStorage.setItem(LOCAL_STORAGE_PROD_TEMPLATES_KEY, JSON.stringify(updated));
                          setSelectedTemplateId("tpl_default");
                          setVisibleCols(DEFAULT_PRODUCTION_COL_TEMPLATES[0].cols);
                        }}
                        title="Delete Template"
                        className="p-[0.25vw] text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-[0.3vw]">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Save current as template..."
                      className="flex-1 border border-slate-300 rounded px-[0.45vw] py-[0.2vw] text-[0.73vw] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = newTemplateName.trim();
                        if (!name) return;
                        const newTpl = {
                          id: `custom_${Date.now()}`,
                          name,
                          cols: visibleCols,
                        };
                        const updated = [...colTemplates, newTpl];
                        setColTemplates(updated);
                        localStorage.setItem(LOCAL_STORAGE_PROD_TEMPLATES_KEY, JSON.stringify(updated));
                        setSelectedTemplateId(newTpl.id);
                        setNewTemplateName("");
                        toast?.(`Template "${name}" saved`, "success");
                      }}
                      className="px-[0.5vw] py-[0.2vw] bg-[#1E4B94] text-white rounded text-[0.72vw] font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Column Checkboxes */}
                <div className="max-h-[16vw] overflow-y-auto space-y-[0.2vw]">
                  {ALL_COLUMNS.filter((c) => c.key !== "sno" && c.key !== "actions").map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-[0.45vw] text-[0.75vw] text-slate-700 cursor-pointer hover:bg-slate-50 px-[0.35vw] py-[0.18vw] rounded"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        onChange={() =>
                          setVisibleCols((prev) =>
                            prev.includes(col.key)
                              ? prev.filter((k) => k !== col.key)
                              : [...prev, col.key]
                          )
                        }
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={exportExcel}
            className="h-[2.1vw] px-[0.95vw] rounded-full bg-[#059669] hover:bg-[#047857] text-white text-[0.78vw] font-semibold inline-flex items-center gap-[0.35vw] cursor-pointer shadow-xs transition-all"
          >
            <Download className="w-[0.85vw] h-[0.85vw]" /> Export Excel
          </button>

          <button
            type="button"
            onClick={fetchData}
            title="Refresh"
            className="h-[2.1vw] w-[2.1vw] rounded-full border-[1.5px] border-slate-400 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className="w-[0.8vw] h-[0.8vw]" />
          </button>
        </div>
      </div>

      {/* Custom Filter Builder */}
      {showFilterBuilder && (
        <div className="bg-white rounded-[0.7vw] border border-slate-300 px-[1vw] py-[0.65vw] space-y-[0.45vw] shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[0.78vw] font-bold text-slate-700">Custom Field Filters</span>
            <button
              type="button"
              onClick={() =>
                setCustomFilters((prev) => [
                  ...prev,
                  { field: "customerName", operator: "contains", value: "" },
                ])
              }
              className="text-[0.75vw] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-[0.25vw] cursor-pointer"
            >
              <Plus className="w-[0.8vw] h-[0.8vw]" /> Add Filter
            </button>
          </div>
          {customFilters.map((cf, idx) => (
            <div key={idx} className="flex items-center gap-[0.5vw]">
              <select
                value={cf.field}
                onChange={(e) =>
                  setCustomFilters((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, field: e.target.value } : item))
                  )
                }
                className="border border-slate-300 rounded px-[0.5vw] py-[0.25vw] text-[0.76vw]"
              >
                {PRODUCTION_CUSTOM_FILTER_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={cf.operator}
                onChange={(e) =>
                  setCustomFilters((prev) =>
                    prev.map((item, i) =>
                      i === idx ? { ...item, operator: e.target.value } : item
                    )
                  )
                }
                className="border border-slate-300 rounded px-[0.5vw] py-[0.25vw] text-[0.76vw]"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
              </select>
              <input
                type="text"
                value={cf.value}
                onChange={(e) =>
                  setCustomFilters((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                  )
                }
                placeholder="Value..."
                className="border border-slate-300 rounded px-[0.6vw] py-[0.25vw] text-[0.76vw] w-[14vw]"
              />
              <button
                type="button"
                onClick={() =>
                  setCustomFilters((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-[0.85vw] h-[0.85vw]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-[0.8vw] border border-slate-300 flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xs">
        {/* Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-[0.6vw] px-[0.9vw] py-[0.5vw] border-b border-slate-300 bg-slate-50/60 shrink-0">
          <div className="inline-flex bg-slate-100 p-[0.2vw] rounded-full border border-slate-300">
            {[
              { id: "all", label: "All Zones", count: zoneCounts.all },
              { id: "same", label: "Same Zone", count: zoneCounts.same },
              { id: "sent", label: "Zone Sent", count: zoneCounts.sent },
              { id: "received", label: "Zone Received", count: zoneCounts.received },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setZoneScope(t.id)}
                className={`px-[0.8vw] py-[0.25vw] rounded-full text-[0.8vw] font-semibold inline-flex items-center gap-[0.35vw] cursor-pointer transition-all ${
                  zoneScope === t.id
                    ? "bg-[#1E4B94] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-[0.35vw] rounded-full text-[0.68vw] font-bold ${
                    zoneScope === t.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="inline-flex bg-slate-100 p-[0.2vw] rounded-full border border-slate-300">
            {["All", "Pending", "Rejected", "Completed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-[0.8vw] py-[0.25vw] rounded-full text-[0.8vw] font-semibold inline-flex items-center gap-[0.35vw] cursor-pointer transition-all ${
                  statusFilter === st
                    ? "bg-[#1a73e8] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <span>{st}</span>
                <span
                  className={`px-[0.35vw] rounded-full text-[0.68vw] font-bold ${
                    statusFilter === st ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {statusCounts[st]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse text-[0.84vw]">
            <thead className="bg-[#E9EDF7] sticky top-0 z-10 border-b border-slate-300 text-slate-700 font-bold uppercase text-[0.78vw]">
              <tr>
                {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={`py-[0.55vw] px-[0.65vw] border-r border-slate-300 whitespace-nowrap text-left ${
                      col.sortable ? "cursor-pointer hover:bg-slate-200/60" : ""
                    }`}
                  >
                    <div className="inline-flex items-center gap-[0.25vw]">
                      <span>{col.label}</span>
                      {col.sortable &&
                        (sortConfig.key === col.key ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-[0.7vw] h-[0.7vw]" />
                          ) : (
                            <ArrowDown className="w-[0.7vw] h-[0.7vw]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-[0.7vw] h-[0.7vw] text-slate-400" />
                        ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length}
                    className="py-[3vw] text-center text-slate-500 font-medium"
                  >
                    No matching production records found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors"
                  >
                    {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => {
                      if (col.key === "actions") {
                        return (
                          <td key={col.key} className="py-[0.45vw] px-[0.65vw] border-r border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setDetailModal({ entry: row.entry, product: row.product })
                              }
                              className="p-[0.3vw] rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600 cursor-pointer"
                              title="View Full Details"
                            >
                              <Eye className="w-[0.9vw] h-[0.9vw]" />
                            </button>
                          </td>
                        );
                      }
                      if (col.key === "effectiveStatus") {
                        const st = row.effectiveStatus;
                        return (
                          <td key={col.key} className="py-[0.45vw] px-[0.65vw] border-r border-slate-200">
                            <span
                              className={`inline-flex items-center gap-[0.25vw] px-[0.55vw] py-[0.12vw] rounded-full text-[0.7vw] font-semibold border ${
                                st === "Completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : st === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {st === "Completed" ? (
                                <CheckCircle2 className="w-[0.7vw] h-[0.7vw]" />
                              ) : st === "Rejected" ? (
                                <XCircle className="w-[0.7vw] h-[0.7vw]" />
                              ) : (
                                <Clock className="w-[0.7vw] h-[0.7vw]" />
                              )}
                              {st}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={col.key}
                          className="py-[0.45vw] px-[0.65vw] border-r border-slate-200 max-w-[16vw] truncate"
                          title={String(formatCellValue(row, col.key, idx))}
                        >
                          {formatCellValue(row, col.key, idx)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-[0.9vw] py-[0.5vw] border-t border-slate-300 bg-slate-50/60 shrink-0 text-[0.76vw] text-slate-600">
          <div className="flex items-center gap-[0.5vw]">
            <span>
              Showing {finalRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, finalRows.length)} of {finalRows.length}
            </span>
          </div>
          <div className="flex items-center gap-[0.35vw]">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-[0.3vw] rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-[0.85vw] h-[0.85vw]" />
            </button>
            <span className="px-[0.5vw] font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-[0.3vw] rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-[0.85vw] h-[0.85vw]" />
            </button>
          </div>
        </div>
      </div>

      {detailModal && (
        <ProductionDetailsModal
          entry={detailModal.entry}
          product={detailModal.product}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
}
