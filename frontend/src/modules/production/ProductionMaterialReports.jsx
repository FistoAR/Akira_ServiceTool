// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart2,
  Wrench,
  Truck,
  AlertCircle,
  ShieldCheck,
  Calendar,
  User,
  Package,
  Layers,
  SearchCode,
  Activity,
  ClipboardList
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const diffDays = (a, b) => {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db - da) / 86400000);
};

// ── NEW DATE FILTER COMPONENT ───────────────────────────────
const DateRangeFilter = ({ from, setFrom, to, setTo }) => (
  <div className="flex items-center gap-[0.4vw] bg-white p-[0.1vw] rounded-[0.5vw] border border-slate-400 shadow-sm">
    <div className="flex items-center gap-[0.3vw] px-[0.6vw] border-r border-slate-400">
      <Calendar className="w-[0.8vw] h-[0.8vw] text-black/40" />
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
        className="text-[0.72vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-black" />
    </div>
    <div className="flex items-center gap-[0.3vw] px-[0.6vw]">
      <span className="text-[0.6vw] font-semibold text-black/90 uppercase">to</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
        className="text-[0.72vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-black" />
    </div>
  </div>
);

const exportToPDF = (title, headers, data, filename, dateRange = "") => {
  const doc = new jsPDF("landscape");
  
  // Header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 297, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("AKIRA", 14, 16);
  
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), 45, 16);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`REPORT PERIOD: ${dateRange || "ALL DATA"}`, 283, 12, { align: 'right' });
  doc.text(`GENERATED: ${new Date().toLocaleString()}`, 283, 18, { align: 'right' });

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 30,
    theme: 'striped',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [0, 0, 0]
    },
    headStyles: { 
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 30, left: 10, right: 10 },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === headers.length - 1) {
        const val = String(data.cell.raw || "").toLowerCase();
        if (val.includes("completed")) data.cell.styles.textColor = [22, 163, 74];
        if (val.includes("pending")) data.cell.styles.textColor = [217, 119, 6];
        if (val.includes("rejected")) data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });
  doc.save(`${filename}.pdf`);
};

const exportToExcel = ({ data, filename }) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const TABS = [
  { id: "technical", label: "Production Technical Report", icon: Wrench, color: "blue" },
  { id: "analysis", label: "Inward Analysis & TAT", icon: Layers, color: "green" },
  { id: "rca", label: "Root Cause Analysis Log", icon: SearchCode, color: "amber" },
  { id: "action", label: "Action Effectiveness Report", icon: ShieldCheck, color: "teal" },
];

const TAB_COLORS = {
  blue: { active: "bg-blue-700 text-white border-blue-700 shadow-md", inactive: "bg-white text-black border-slate-400 hover:bg-blue-50 hover:border-blue-400" },
  green: { active: "bg-emerald-700 text-white border-emerald-700 shadow-md", inactive: "bg-white text-black border-slate-400 hover:bg-emerald-50 hover:border-emerald-400" },
  amber: { active: "bg-amber-600 text-white border-amber-600 shadow-md", inactive: "bg-white text-black border-slate-400 hover:bg-amber-50 hover:border-amber-400" },
  teal: { active: "bg-teal-700 text-white border-teal-700 shadow-md", inactive: "bg-white text-black border-slate-400 hover:bg-teal-50 hover:border-teal-400" },
};

const StatusBadge = ({ status }) => {
  const colors = {
    Completed: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Pending: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <span className={`px-[0.55vw] py-[0.1vw] rounded-full text-[0.75vw] font-semibold border ${colors[status] || "bg-blue-50 text-black border-blue-200"}`}>
      {status || "Pending"}
    </span>
  );
};

const Th = ({ children, cls = "" }) => (
  <th className={`px-[0.8vw] py-[0.7vw] text-[0.85vw] text-black font-semibold whitespace-nowrap border-b-2 border-r border-slate-400 last:border-r-0 bg-blue-50/50 ${cls}`}>
    {children}
  </th>
);
const Td = ({ children, cls = "" }) => (
  <td className={`px-[1vw] py-[1vw] text-[0.8vw] text-black border-r border-b border-slate-400 last:border-r-0 align-middle ${cls}`}>
    {children}
  </td>
);

const SummaryBar = ({ items }) => (
  <div className="flex items-center gap-[1.5vw] mt-[0.8vw] px-[0.5vw]">
    {items.map((it, i) => (
      <div key={i} className="flex items-center gap-[0.4vw]">
        <span className="text-[0.68vw] text-black font-semibold">{it.label}:</span>
        <span className={`text-[0.8vw] font-semibold ${it.color}`}>{it.value}</span>
      </div>
    ))}
  </div>
);

const ExportButtons = ({ onCsv, onPdf, color = "blue" }) => {
  const colors = {
    blue: "border-blue-200 text-blue-800 hover:bg-blue-50",
    green: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    amber: "border-amber-200 text-amber-800 hover:bg-amber-50",
    teal: "border-teal-200 text-teal-800 hover:bg-teal-50",
  };
  return (
    <div className="flex items-center gap-2 md:gap-[0.4vw]">
      <button onClick={onCsv} className={`flex items-center gap-1 md:gap-[0.3vw] px-3 md:px-[0.8vw] h-9 md:h-[2.2vw] border rounded-lg md:rounded-[0.4vw] text-[12px] md:text-[0.7vw] font-semibold cursor-pointer transition-all ${colors[color]}`}>
        <FileSpreadsheet className="w-4 h-4 md:w-[0.9vw] md:h-[0.9vw]" /> Excel
      </button>
      <button onClick={onPdf} className={`flex items-center gap-1 md:gap-[0.3vw] px-3 md:px-[0.8vw] h-9 md:h-[2.2vw] border rounded-lg md:rounded-[0.4vw] text-[12px] md:text-[0.7vw] font-semibold cursor-pointer transition-all ${colors[color]}`}>
        <Download className="w-4 h-4 md:w-[0.9vw] md:h-[0.9vw]" /> PDF
      </button>
    </div>
  );
};

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      if (!pages.includes("...")) pages.push("...");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-3 md:mt-[1vw] gap-3 px-1 bg-slate-50/50 p-2 rounded-lg border border-slate-400">
      <div className="text-[12px] md:text-[0.7vw] text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-700">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-bold text-slate-700">{totalItems}</span> records
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center gap-1 md:gap-[0.4vw]">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.4vw] border border-slate-400 disabled:opacity-30 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group"
          >
            <ChevronsLeft className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-slate-650 group-hover:text-blue-600" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.4vw] border border-slate-400 disabled:opacity-30 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-slate-650 group-hover:text-blue-600" />
          </button>

          <div className="flex items-center mx-1 bg-white p-1 md:p-[0.15vw] rounded-lg md:rounded-[0.5vw] border border-slate-400 shadow-sm">
            {pages.map((page, i) => (
              page === "..." ? (
                <span key={`dots-${i}`} className="px-1.5 text-slate-400 text-[11px] md:text-[0.65vw]">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[26px] md:min-w-[1.8vw] h-[26px] md:h-[1.8vw] flex items-center justify-center rounded-md md:rounded-[0.35vw] text-[11px] md:text-[0.68vw] font-bold transition-all cursor-pointer ${currentPage === page ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.4vw] border border-slate-400 disabled:opacity-30 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group"
          >
            <ChevronRight className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-slate-650 group-hover:text-blue-600" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.4vw] border border-slate-400 disabled:opacity-30 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group"
          >
            <ChevronsRight className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw] text-slate-650 group-hover:text-blue-600" />
          </button>
        </div>
      )}
    </div>
  );
};

// ── REPORT 1 — Production Technical Report ────────────────────
const TechnicalReport = ({ entries, fromDate, setFromDate, toDate, setToDate }) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const rows = useMemo(() => {
    const flat = [];
    entries.forEach(e => {
      const rowDate = new Date(e.date).setHours(0, 0, 0, 0);
      const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
      const to = toDate ? new Date(toDate).setHours(0, 0, 0, 0) : null;

      if (from && rowDate < from) return;
      if (to && rowDate > to) return;

      e.products?.forEach(p => flat.push({ entry: e, prod: p }));
    });
    return flat;
  }, [entries, fromDate, toDate]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.entry.jobOrderNo?.toLowerCase().includes(q) ||
      r.prod.productDescription?.toLowerCase().includes(q) ||
      r.entry.customerName?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filtered, currentPage]);

  const dateRangeStr = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : "All Dates";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between mb-[0.8vw] gap-[0.6vw]">
        <div></div>
        <div className="flex items-center gap-[0.5vw]">
          <div className="relative">
            <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-black" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="pl-[2vw] pr-[0.8vw] h-[2.2vw] border border-slate-400 rounded-[0.5vw] outline-none text-[0.75vw] w-[11vw] focus:border-blue-400 transition-all text-black font-medium"
            />
          </div>
          <DateRangeFilter from={fromDate} setFrom={setFromDate} to={toDate} setTo={setToDate} />
          <ExportButtons 
            onCsv={() => {
              const data = filtered.map((r, i) => ({
                "S.No": i + 1,
                "Date": fmtDate(r.entry.date),
                "Job Order": r.entry.jobOrderNo,
                "Customer": r.entry.customerName,
                "Product": r.prod.productDescription,
                "Serial No": r.prod.serialNumber,
                "Problem Type": r.prod.problemType,
                "NC Type": r.prod.ncType,
                "Inspected By": r.prod.inspectedByName,
                "Designators": r.prod.designators,
                "4M Category": r.prod.report?.fourMCategory,
                "Root Cause": r.prod.report?.rootCause,
                "Parts Replaced": r.prod.report?.partsReplaced,
                "Personnel": r.prod.report?.testedByName,
                "Status": r.prod.finalStatus || "Pending"
              }));
              exportToExcel({ data, filename: `Production_Technical_Report_${dateRangeStr.replace(/ /g, "_")}` });
            }} 
            onPdf={() => {
              const headers = ["S.No", "Date", "JO#", "Customer", "Product", "Serial", "Problem", "NC", "Inspected", "Desig.", "Image", "4M", "Status"];
              const data = filtered.map((r, i) => [
                i + 1,
                fmtDate(r.entry.date),
                r.entry.jobOrderNo,
                r.entry.customerName,
                r.prod.productDescription,
                r.prod.serialNumber || "—",
                r.prod.problemType || "—",
                r.prod.ncType || "—",
                r.prod.inspectedByName || "—",
                r.prod.designators || "—",
                r.prod.boardImage ? "Yes" : "No",
                r.prod.report?.fourMCategory || "—",
                r.prod.finalStatus || "Pending"
              ]);
              exportToPDF("Production Technical Report", headers, data, `Production_Technical_Report_${dateRangeStr.replace(/ /g, "_")}`, dateRangeStr);
            }}
            color="blue" 
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg md:rounded-[0.5vw] border border-slate-400 shadow-sm relative">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-blue-50">
            <tr>
              <Th>S.No</Th>
              <Th cls="min-w-[6.5vw]">Date</Th>
              <Th cls="min-w-[8vw]">Job Order</Th>
              <Th cls="min-w-[12vw]">Customer</Th>
              <Th cls="min-w-[15vw]">Product</Th>
              <Th cls="min-w-[8vw]">Serial No</Th>
              <Th cls="min-w-[9vw]">Problem Type</Th>
              <Th cls="min-w-[7vw]">NC Type</Th>
              <Th cls="min-w-[8vw]">Inspected By</Th>
              <Th cls="min-w-[8vw]">Designators</Th>
              <Th cls="min-w-[8vw]">Image</Th>
              <Th>4M Category</Th>
              <Th cls="min-w-[15vw]">Root Cause</Th>
              <Th>Parts Replaced</Th>
              <Th>Personnel</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                <Td cls="text-center font-semibold">{((currentPage - 1) * rowsPerPage) + i + 1}</Td>
                <Td>{fmtDate(r.entry.date)}</Td>
                <Td cls="font-semibold text-blue-700">{r.entry.jobOrderNo}</Td>
                <Td cls="font-normal">{r.entry.customerName}</Td>
                <Td><div className="max-w-[12vw] truncate" title={r.prod.productDescription}>{r.prod.productDescription}</div></Td>
                <Td cls="font-normal">{r.prod.serialNumber || "—"}</Td>
                <Td><span className="bg-slate-50 px-[0.4vw] rounded font-semibold text-black">{r.prod.problemType || "—"}</span></Td>
                <Td><span className="bg-orange-50 px-[0.4vw] rounded font-semibold text-black">{r.prod.ncType || "Internal"}</span></Td>
                <Td><span className="text-black font-semibold">{r.prod.inspectedByName || "—"}</span></Td>
                <Td><span className="text-black font-semibold">{r.prod.designators || "—"}</span></Td>
                <Td>
                  {r.prod.boardImage ? (
                    <button onClick={() => window.open(`${API_URL.replace('/api', '')}${r.prod.boardImage}`, '_blank')} className="text-blue-600 hover:underline font-bold text-[0.7vw]">View</button>
                  ) : "—"}
                </Td>
                <Td><span className="bg-blue-50 px-[0.4vw] rounded font-semibold text-black">{r.prod.report?.fourMCategory || "—"}</span></Td>
                <Td><div className="max-w-[15vw]  text-black">{r.prod.report?.rootCause || "—"}</div></Td>
                <Td>{r.prod.report?.partsReplacement || "—"}</Td>
                <Td>
                  <div className="space-y-[0.1vw]">
                    <div className="flex gap-[0.2vw]"><span className="text-black">A:</span><span className="font-semibold">{r.prod.report?.assembledByName || "—"}</span></div>
                    <div className="flex gap-[0.2vw]"><span className="text-black">T:</span><span className="font-semibold">{r.prod.report?.testedByName || "—"}</span></div>
                  </div>
                </Td>
                <Td><StatusBadge status={r.prod.finalStatus} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0">
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={rowsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <SummaryBar items={[
          { label: "Total Records", value: filtered.length, color: "text-blue-800" },
          { label: "Resolved", value: filtered.filter(r => r.prod.finalStatus === "Completed").length, color: "text-green-700" }
        ]} />
      </div>
    </div>
  );
};

// ── REPORT 2 — Inward Analysis & TAT ──────────────────────────
const AnalysisReport = ({ entries, fromDate, setFromDate, toDate, setToDate }) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const rows = useMemo(() => {
    const flat = [];
    entries.forEach(e => {
      const rowDate = new Date(e.date).setHours(0, 0, 0, 0);
      const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
      const to = toDate ? new Date(toDate).setHours(0, 0, 0, 0) : null;

      if (from && rowDate < from) return;
      if (to && rowDate > to) return;

      e.products?.forEach(p => {
        const tat = diffDays(e.date, p.report?.closedDate);
        flat.push({ entry: e, prod: p, tat });
      });
    });
    return flat;
  }, [entries, fromDate, toDate]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.entry.jobOrderNo?.toLowerCase().includes(q) ||
      r.prod.productDescription?.toLowerCase().includes(q) ||
      r.entry.customerName?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filtered, currentPage]);

  const dateRangeStr = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : "All Dates";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between mb-[0.8vw] gap-[0.6vw]">
        <div></div>
        <div className="flex items-center gap-[0.5vw]">
          <div className="relative">
            <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-black" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search analytics..."
              className="pl-[2vw] pr-[0.8vw] h-[2.2vw] border border-slate-400 rounded-[0.5vw] outline-none text-[0.75vw] w-[11vw] focus:border-emerald-400 transition-all text-black font-medium"
            />
          </div>
          <DateRangeFilter from={fromDate} setFrom={setFromDate} to={toDate} setTo={setToDate} />
          <ExportButtons 
            onCsv={() => {
              const data = filtered.map((r, i) => ({
                "S.No": i + 1,
                "Inward Date": fmtDate(r.entry.date),
                "Customer": r.entry.customerName,
                "Job Order": r.entry.jobOrderNo,
                "Product Code": r.prod.productCode,
                "Description": r.prod.productDescription,
                "Stage": r.prod.stage,
                "Problem Type": r.prod.problemType,
                "NC Type": r.prod.ncType,
                "Disposition": r.prod.disposition,
                "Closed Date": fmtDate(r.prod.report?.closedDate),
                "TAT (Days)": r.tat,
                "Status": r.prod.finalStatus
              }));
              exportToExcel({ data, filename: `Inward_Analysis_Report_${dateRangeStr.replace(/ /g, "_")}` });
            }} 
            onPdf={() => {
              const headers = ["S.No", "Inward Date", "Customer", "JO#", "Code", "Stage", "Problem", "TAT", "Status"];
              const data = filtered.map((r, i) => [
                i + 1,
                fmtDate(r.entry.date),
                r.entry.customerName,
                r.entry.jobOrderNo,
                r.prod.productCode,
                r.prod.stage,
                r.prod.problemType || "—",
                r.tat !== null ? `${r.tat}d` : "—",
                r.prod.finalStatus
              ]);
              exportToPDF("Inward Analysis & TAT Report", headers, data, `Inward_Analysis_Report_${dateRangeStr.replace(/ /g, "_")}`, dateRangeStr);
            }}
            color="green" 
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg md:rounded-[0.5vw] border border-slate-400 shadow-sm relative">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-emerald-50">
            <tr>
              <Th>S.No</Th>
              <Th cls="min-w-[7vw]">Inward Date</Th>
              <Th cls="min-w-[12vw]">Customer</Th>
              <Th cls="min-w-[8vw]">Job Order</Th>
              <Th cls="min-w-[15vw]">Product Details</Th>
              <Th>Stage</Th>
              <Th cls="min-w-[9vw]">Problem Type</Th>
              <Th>NC Type</Th>
              <Th>Disposition</Th>
              <Th cls="min-w-[7vw]">Closed Date</Th>
              <Th>TAT (Days)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                <Td cls="text-center font-semibold text-black">{((currentPage - 1) * rowsPerPage) + i + 1}</Td>
                <Td>{fmtDate(r.entry.date)}</Td>
                <Td cls="font-semibold">{r.entry.customerName}</Td>
                <Td cls="font-semibold text-blue-700">{r.entry.jobOrderNo}</Td>
                <Td>
                  <div className="font-semibold text-black">{r.prod.productCode}</div>
                  <div className="text-[0.68vw] text-black">{r.prod.productDescription}</div>
                </Td>
                <Td cls="font-semibold text-black">{r.prod.stage}</Td>
                <Td><span className="text-black font-semibold">{r.prod.problemType || "—"}</span></Td>
                <Td><span className="text-orange-600 font-semibold">{r.prod.ncType || "Internal"}</span></Td>
                <Td>{r.prod.disposition}</Td>
                <Td>{fmtDate(r.prod.report?.closedDate)}</Td>
                <Td cls={`font-semibold ${r.tat !== null ? (r.tat <= 2 ? "text-green-600" : r.tat <= 5 ? "text-orange-600" : "text-red-600") : "text-black"}`}>
                  {r.tat !== null ? `${r.tat}d` : "—"}
                </Td>
                <Td><StatusBadge status={r.prod.finalStatus} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0">
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={rowsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <SummaryBar items={[
          { label: "Avg TAT", value: "3.2 days", color: "text-emerald-800" },
          { label: "Critical (>5d)", value: filtered.filter(r => r.tat > 5).length, color: "text-red-700" }
        ]} />
      </div>
    </div>
  );
};

// ── REPORT 3 — RCA Log ───────────────────────────────────────
const RCALogReport = ({ entries, fromDate, setFromDate, toDate, setToDate }) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const rows = useMemo(() => {
    const flat = [];
    entries.forEach(e => {
      const rowDate = new Date(e.date).setHours(0, 0, 0, 0);
      const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
      const to = toDate ? new Date(toDate).setHours(0, 0, 0, 0) : null;

      if (from && rowDate < from) return;
      if (to && rowDate > to) return;

      e.products?.forEach(p => { if (p.report?.rootCause) flat.push({ entry: e, prod: p }); });
    });
    return flat;
  }, [entries, fromDate, toDate]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.entry.jobOrderNo?.toLowerCase().includes(q) ||
      r.prod.productDescription?.toLowerCase().includes(q) ||
      r.prod.report?.rootCause?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filtered, currentPage]);

  const dateRangeStr = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : "All Dates";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between mb-[0.8vw] gap-[0.6vw]">
        <div></div>
        <div className="flex items-center gap-[0.5vw]">
          <div className="relative">
            <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-black/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search RCA details..."
              className="pl-[2vw] pr-[0.8vw] h-[2.2vw] border border-slate-400 rounded-[0.5vw] outline-none text-[0.75vw] w-[11vw] focus:border-amber-400 transition-all text-black"
            />
          </div>
          <DateRangeFilter from={fromDate} setFrom={setFromDate} to={toDate} setTo={setToDate} />
          <ExportButtons 
            onCsv={() => {
              const data = filtered.map((r, i) => ({
                "S.No": i + 1,
                "Product Code": r.prod.productCode,
                "Description": r.prod.productDescription,
                "Job Order": r.entry.jobOrderNo,
                "Problem Type": r.prod.problemType,
                "4M Category": r.prod.report?.fourMCategory,
                "Root Cause": r.prod.report?.rootCause,
                "Corrective Action": r.prod.report?.correctiveAction,
                "Analysed By": r.prod.report?.testedByName
              }));
              exportToExcel({ data, filename: `Production_RCA_Log_${dateRangeStr.replace(/ /g, "_")}` });
            }} 
            onPdf={() => {
              const headers = ["S.No", "Product", "JO#", "Problem", "4M", "Root Cause", "Action", "Analysed By"];
              const data = filtered.map((r, i) => [
                i + 1,
                r.prod.productCode,
                r.entry.jobOrderNo,
                r.prod.problemType || "—",
                r.prod.report?.fourMCategory,
                r.prod.report?.rootCause,
                r.prod.report?.correctiveAction,
                r.prod.report?.testedByName || "—"
              ]);
              exportToPDF("Root Cause Analysis (RCA) Log", headers, data, `Production_RCA_Log_${dateRangeStr.replace(/ /g, "_")}`, dateRangeStr);
            }}
            color="amber" 
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg md:rounded-[0.5vw] border border-slate-400 shadow-sm relative">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-amber-50">
            <tr>
              <Th>S.No</Th>
              <Th cls="min-w-[10vw]">Product</Th>
              <Th cls="min-w-[8vw]">JO#</Th>
              <Th cls="min-w-[10vw]">Problem Type</Th>
              <Th>4M Cat</Th>
              <Th cls="min-w-[22vw]">Root Cause Detail</Th>
              <Th cls="min-w-[20vw]">Corrective Action</Th>
              <Th>Analysed By</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                <Td cls="text-center font-bold">{(currentPage - 1) * rowsPerPage + i + 1}</Td>
                <Td>
                  <div className="font-bold text-slate-900">{r.prod.productCode}</div>
                  <div className="text-[0.68vw] text-black/50 truncate max-w-[10vw]">{r.prod.productDescription}</div>
                </Td>
                <Td cls="font-bold text-blue-700">{r.entry.jobOrderNo}</Td>
                <Td><span className="font-semibold text-slate-700 bg-slate-100 px-[0.4vw] rounded">{r.prod.problemType || "—"}</span></Td>
                <Td><span className="font-bold text-amber-700">{r.prod.report?.fourMCategory}</span></Td>
                <Td><div className="max-w-[20vw] italic text-slate-900 font-medium leading-relaxed text-[0.68vw]">"{r.prod.report?.rootCause}"</div></Td>
                <Td><div className="max-w-[20vw] text-green-700 font-semibold text-[0.68vw]">{r.prod.report?.correctiveAction || "—"}</div></Td>
                <Td cls="font-semibold text-gray-600">{r.prod.report?.testedByName || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0">
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={rowsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <SummaryBar items={[
          { label: "RCA Completed", value: filtered.length, color: "text-amber-800" }
        ]} />
      </div>
    </div>
  );
};

// ── REPORT 4 — Action Effectiveness ──────────────────────────
const EffectivenessReport = ({ entries, fromDate, setFromDate, toDate, setToDate }) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const rows = useMemo(() => {
    const flat = [];
    entries.forEach(e => {
      const rowDate = new Date(e.date).setHours(0, 0, 0, 0);
      const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
      const to = toDate ? new Date(toDate).setHours(0, 0, 0, 0) : null;

      if (from && rowDate < from) return;
      if (to && rowDate > to) return;

      e.products?.forEach(p => { if (p.report?.cae) flat.push({ entry: e, prod: p }); });
    });
    return flat;
  }, [entries, fromDate, toDate]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.entry.jobOrderNo?.toLowerCase().includes(q) ||
      r.prod.productDescription?.toLowerCase().includes(q) ||
      r.prod.report?.cae?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [filtered, currentPage]);

  const dateRangeStr = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : "All Dates";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between mb-[0.8vw] gap-[0.6vw]">
        <div></div>
        <div className="flex items-center gap-[0.5vw]">
          <div className="relative">
            <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-black/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search CAE..."
              className="pl-[2vw] pr-[0.8vw] h-[2.2vw] border border-slate-400 rounded-[0.5vw] outline-none text-[0.75vw] w-[11vw] focus:border-teal-400 transition-all text-black"
            />
          </div>
          <DateRangeFilter from={fromDate} setFrom={setFromDate} to={toDate} setTo={setToDate} />
          <ExportButtons 
            onCsv={() => {
              const data = filtered.map((r, i) => ({
                "S.No": i + 1,
                "Product Code": r.prod.productCode,
                "Description": r.prod.productDescription,
                "Corrective Action": r.prod.report?.correctiveAction,
                "Effectiveness (CAE)": r.prod.report?.cae,
                "Verified By": r.prod.report?.verifiedByName,
                "Verified Date": fmtDate(r.prod.report?.verifiedDate)
              }));
              exportToExcel({ data, filename: `Action_Effectiveness_Report_${dateRangeStr.replace(/ /g, "_")}` });
            }} 
            onPdf={() => {
              const headers = ["S.No", "Product", "Corrective Action", "Effectiveness (CAE)", "Verified By", "Date"];
              const data = filtered.map((r, i) => [
                i + 1,
                r.prod.productCode,
                r.prod.report?.correctiveAction,
                r.prod.report?.cae,
                r.prod.report?.verifiedByName || "—",
                fmtDate(r.prod.report?.verifiedDate)
              ]);
              exportToPDF("Action Effectiveness Report", headers, data, `Action_Effectiveness_Report_${dateRangeStr.replace(/ /g, "_")}`, dateRangeStr);
            }}
            color="teal" 
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg md:rounded-[0.5vw] border border-slate-400 shadow-sm relative">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-teal-50">
            <tr>
              <Th>S.No</Th>
              <Th cls="min-w-[12vw]">Product</Th>
              <Th cls="min-w-[22vw]">Corrective Action</Th>
              <Th cls="min-w-[18vw]">Effectiveness (CAE)</Th>
              <Th>Verified By</Th>
              <Th cls="min-w-[7vw]">Verified Date</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="hover:bg-teal-50/30 transition-colors">
                <Td cls="text-center font-bold">{(currentPage - 1) * rowsPerPage + i + 1}</Td>
                <Td>
                  <div className="font-bold text-slate-900">{r.prod.productCode}</div>
                  <div className="text-[0.68vw] text-black/50">{r.prod.productDescription}</div>
                </Td>
                <Td><div className="max-w-[20vw] font-medium text-slate-900 italic leading-tight text-[0.68vw]">"{r.prod.report?.correctiveAction}"</div></Td>
                <Td cls="bg-green-50/50"><div className="font-black text-green-700 text-[0.75vw]">{r.prod.report?.cae}</div></Td>
                <Td cls="font-semibold text-teal-800">{r.prod.report?.verifiedByName || "—"}</Td>
                <Td>{fmtDate(r.prod.report?.verifiedDate)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0">
        <Pagination
          totalItems={filtered.length}
          itemsPerPage={rowsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <SummaryBar items={[
          { label: "Verified Actions", value: filtered.length, color: "text-teal-800" }
        ]} />
      </div>
    </div>
  );
};

// ── MAIN COMPONENT ──────────────────────────────────────────
export default function ProductionMaterialReports() {
  const [activeTab, setActiveTab] = useState("technical");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Date Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/production-material`);
      setEntries(res.data.map(e => ({ ...e, id: e._id })));
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tab = TABS.find(t => t.id === activeTab);
  const colors = TAB_COLORS[tab?.color || "blue"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-slate-50 p-[1.2vw] rounded-[1vw] border border-slate-400">
        <div className="w-[3vw] h-[3vw] border-[0.3vw] border-black/10 border-t-blue-600 rounded-full animate-spin mb-[1vw]" />
        <span className="text-[1vw] font-bold text-slate-800">Fetching records...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-60px)] flex flex-col font-sans text-[14px] md:text-[0.85vw] bg-blue-50/30 p-2 md:p-[0.6vw] rounded-xl md:rounded-[1vw] overflow-hidden">
      {/* Header Panel */}
      <div className="flex-shrink-0 bg-white border border-slate-400 rounded-xl md:rounded-[0.8vw] shadow-sm mb-3 md:mb-[0.8vw] overflow-hidden">
        <div className="bg-[#1e40af] px-4 md:px-[1.5vw] py-3 md:py-[1vw] flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-[0.8vw] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-transparent pointer-events-none" />
          <div className="bg-white/15 p-1.5 md:p-[0.4vw] rounded-lg md:rounded-[0.6vw] z-10 shadow-inner">
            <ClipboardList className="w-5 h-5 md:w-[1.4vw] md:h-[1.4vw] text-white" />
          </div>
          <div className="z-10">
            <h2 className="text-[17px] md:text-[1.1vw] font-bold text-white drop-shadow-sm">Production NC Register</h2>
            <p className="text-[11px] md:text-[0.65vw] text-white font-semibold ">{entries.length} Inward Records Found</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-4 md:px-[1.2vw] py-2 md:py-[0.6vw] flex items-center gap-2 md:gap-[0.6vw] flex-wrap bg-blue-50/20 border-t border-slate-400">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 md:gap-[0.5vw] px-3 md:px-[1vw] py-1.5 md:py-[0.4vw] rounded-full text-[11px] md:text-[0.7vw] font-semibold border transition-all cursor-pointer ${activeTab === t.id ? TAB_COLORS[t.color].active : TAB_COLORS[t.color].inactive
                }`}
            >
              <t.icon className="w-3.5 h-3.5 md:w-[0.9vw] md:h-[0.9vw]" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 bg-white border border-slate-400 rounded-xl md:rounded-[0.8vw] shadow-sm p-3 md:p-[1vw] overflow-hidden">
        {activeTab === "technical" && (
          <TechnicalReport 
            entries={entries} 
            fromDate={fromDate} setFromDate={setFromDate}
            toDate={toDate} setToDate={setToDate}
          />
        )}
        {activeTab === "analysis" && (
          <AnalysisReport 
            entries={entries} 
            fromDate={fromDate} setFromDate={setFromDate}
            toDate={toDate} setToDate={setToDate}
          />
        )}
        {activeTab === "rca" && (
          <RCALogReport 
            entries={entries} 
            fromDate={fromDate} setFromDate={setFromDate}
            toDate={toDate} setToDate={setToDate}
          />
        )}
        {activeTab === "action" && (
          <EffectivenessReport 
            entries={entries} 
            fromDate={fromDate} setFromDate={setFromDate}
            toDate={toDate} setToDate={setToDate}
          />
        )}
      </div>
    </div>
  );
}