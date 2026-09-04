import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import ProductHistoryModal, {
  ProductHistoryTimeline,
} from "../components/ProductHistoryModal";
import {
  FileText,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  BarChart2,
  Users,
  Briefcase,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  History,
  Info,
} from "lucide-react";
import akiraLogo from "../assets/Akira_logo.webp";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL;

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// ── Reports Tab ───────────────────────────────────────────────────────────────

const getProductStatus = (item, group) => {
  const getSingleStatus = (p) => {
    if (p._resolved || p._productClosure?.status === "Closed") return "Resolved";
    if (p._isCritical) return "Critical";
    const escLen = p._escalationHistory?.length || 0;
    const callEscLen = group.call.escalationHistory?.length || 0;
    if (escLen > 0 || callEscLen > 0) return "Escalation";
    const historyLen = p._history?.length || 0;
    if (historyLen > 0) return p._history[historyLen - 1].status;
    if (p._attended) return "Attended";
    return "Open";
  };

  const allStatuses = (group.call.products || []).map(getSingleStatus);
  
  if (allStatuses.some(s => s === "Critical")) return "Critical";
  if (allStatuses.some(s => s === "Escalation")) return "Escalation";
  if (allStatuses.length > 0 && allStatuses.every(s => s === "Resolved")) return "Resolved";
  
  if (allStatuses.some(s => s.includes("Field Visit") && !s.includes("Returned"))) return "Field Visit";
  if (allStatuses.some(s => s.includes("Support") && !s.includes("Returned") && !s.includes("Resolved"))) return "Supporting";
  
  if (allStatuses.some(s => s === "Pending")) return "Pending";
  if (allStatuses.some(s => s === "Attended")) return "Attended";
  
  const nonResolved = allStatuses.find(s => s !== "Resolved");
  return nonResolved || "Open";
};

const getEscalationDates = (item) => {
  const escHistory = item.product._escalationHistory || [];
  let startDate = "N/A";
  let endDate = "Pending";
  
  if (escHistory.length > 0) {
    const startObj = new Date(escHistory[0].assignedAt);
    startDate = startObj.toLocaleString("en-GB", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

    const history = item.product._history || [];
    const closureEvent = history.find(
      (h) => h.status === "Resolved" || h.status === "Closed"
    );
    
    if (closureEvent) {
      endDate = new Date(closureEvent.timestamp).toLocaleString("en-GB", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    }
  }

  return { startDate, endDate };
};

const getEscalationDuration = (item) => {
  const escHistory = item.product._escalationHistory || [];
  if (escHistory.length === 0) return "N/A";

  const startTime = new Date(escHistory[0].assignedAt).getTime();
  const history = item.product._history || [];
  let endTime = new Date().getTime();

  const closureEvent = history.find(
    (h) => h.status === "Resolved" || h.status === "Closed"
  );
  if (closureEvent) {
    endTime = new Date(closureEvent.timestamp).getTime();
  } else if (history.length > 0) {
    endTime = new Date(history[history.length - 1].timestamp).getTime();
  }

  if (endTime <= startTime) return "0m";

  const diffMs = endTime - startTime;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / 1000 / 60) % 60);

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
};

const ActionLogsView = ({
  calls,
  employees,
  isEmployeeWise,
  targetEmployee,
  tabsElement,
  dateFilterElement,
  fromDate,
  toDate,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [involvementFilter, setInvolvementFilter] = useState("All");
  const [historyModalOpen, setHistoryModalOpen] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    setInvolvementFilter("All");
    setCurrentPage(1);
  }, [targetEmployee, isEmployeeWise]);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportWithHistory, setExportWithHistory] = useState(false);

  const subTabs = isEmployeeWise
    ? ["All", "Attended", "Pending", "Supporting", "Field Visit", "Resolved"]
    : [
        "All",
        "Escalation",
        "Critical",
        "Attended",
        "Pending",
        "Supporting",
        "Field Visit",
        "Resolved",
      ];

  const { groupedData, tabCounts } = useMemo(() => {
    let groupsMap = {};
    const counts = {
      All: 0,
      Attended: 0,
      Pending: 0,
      Supporting: 0,
      "Field Visit": 0,
      Escalation: 0,
      Critical: 0,
      Resolved: 0,
    };
    const lowerQuery = searchQuery.toLowerCase();

    calls.forEach((call) => {
      let matchingProducts = [];
      let callMatchesForTab = {
        All: false,
        Attended: false,
        Pending: false,
        Supporting: false,
        "Field Visit": false,
        Escalation: false,
        Critical: false,
        Resolved: false,
      };

      (call.products || []).forEach((p, pIdx) => {
        // If employee-wise, filter by involvement
        if (isEmployeeWise && targetEmployee) {
          const uid = targetEmployee.userId;
          const isPrimary = p._assignedEngineerId === uid && p._assigned !== false && !p._isCritical;
          const isFvAssigner = p._fieldVisit?.assignedBy === uid;
          const isFvAssignee = p._fieldVisit?.assignedTo === uid;
          const isSupportPerson = p._supportPersonId === uid;
          const isSupportReturned = (p._history || []).some(
            (h) => h.status === "Returned from Support" && h.updatedBy === uid
          );
          const isFvReturned = (p._history || []).some(
            (h) => h.status === "Field Visit Returned" && h.updatedBy === uid
          );

          const isUserInvolved = Boolean(
            isPrimary ||
            isFvAssigner ||
            isFvAssignee ||
            isSupportPerson ||
            isSupportReturned ||
            isFvReturned
          );
          if (!isUserInvolved) return;
        }

        const matchSearch =
          call.callNumber?.toLowerCase().includes(lowerQuery) ||
          call.customerName?.toLowerCase().includes(lowerQuery) ||
          call.customerType?.toLowerCase().includes(lowerQuery) ||
          call.callCategory?.toLowerCase().includes(lowerQuery) ||
          (p.itemDescription || p.productModel || p.itemCode || "")
            .toLowerCase()
            .includes(lowerQuery) ||
          (p.serialNumber || "").toLowerCase().includes(lowerQuery);

        if (searchQuery && !matchSearch) return;

        // Status Tabs Logic
        const pStatus = getProductStatus(null, { call });
        const isCritical = pStatus === "Critical";
        const isEscalation = pStatus === "Escalation";

        // Exclude escalations completely from employee view
        if (isEmployeeWise && (isCritical || isEscalation)) return;

        let isResolvedTab = pStatus === "Resolved";
        let isFieldVisit = pStatus === "Field Visit";
        let isSupporting = pStatus === "Supporting";
        let isAttended = pStatus === "Attended";
        let isPending = !isResolvedTab && !isEscalation && !isCritical && !isFieldVisit && !isSupporting && !isAttended;

        let matchesTab = {
          All: true,
          Attended: isAttended,
          Pending: isPending,
          Supporting: isSupporting,
          "Field Visit": isFieldVisit,
          Escalation: isEscalation,
          Critical: isCritical,
          Resolved: isResolvedTab,
        };

        if (isEmployeeWise && targetEmployee) {
          const uid = targetEmployee.userId;
          const isPrimary = p._assignedEngineerId === uid;
          const isFvAssigner = p._fieldVisit?.assignedBy === uid;
          const isFvAssignee = p._fieldVisit?.assignedTo === uid;
          const isSupportPerson = p._supportPersonId === uid;
          
          let empResolved = false;
          let empPending = false;
          let empAttended = false;
          let empSupporting = false;
          let empFieldVisit = false;

          if (isResolvedTab) {
              if (isPrimary) empResolved = true;
          } else {
              if (isPrimary || isFvAssigner) {
                  if (isPending) empPending = true;
                  else if (isFieldVisit && (!isFvAssignee || pStatus === "Returned from Field Visit")) empFieldVisit = true;
                  else if (isSupporting && (!isSupportPerson || pStatus === "Returned from Support")) empSupporting = true;
                  else if (isAttended) empAttended = true;
              }
          }
          
          if (isSupporting && (isSupportPerson || (p._history || []).some(h => h.status === "Returned from Support" && h.updatedBy === uid))) {
              empSupporting = true;
          }
          
          if (isFieldVisit && (isFvAssignee || (p._history || []).some(h => h.status === "Field Visit Returned" && h.updatedBy === uid))) {
              empFieldVisit = true;
          }

          let invText = "Involved";
          if (isPrimary) {
              if (isFieldVisit && p._fieldVisit?.assignedBy === uid) invText = "Primary (Requested Field Visit)";
              else if (isSupporting && p._supportRequested && !p._supportPersonId) invText = "Primary (Requested Support)";
              else invText = "Primary Engineer";
          } else if (isSupportPerson) {
              if (isFieldVisit && p._fieldVisit?.assignedBy === uid) invText = "Support Assignee (Requested Field Visit)";
              else if ((p._history || []).some(h => h.status === "Returned from Support" && h.updatedBy === uid)) invText = "Support Assignee (Returned to Primary)";
              else invText = "Support Assignee";
          } else if (isFvAssignee) {
              if ((p._history || []).some(h => h.status === "Field Visit Returned" && h.updatedBy === uid)) invText = "Field Visit Assignee (Returned)";
              else invText = "Field Visit Assignee";
          }

          matchesTab = {
            All: true,
            Attended: empAttended,
            Pending: empPending,
            Supporting: empSupporting,
            "Field Visit": empFieldVisit,
            Escalation: false,
            Critical: false,
            Resolved: empResolved,
            _involvementText: invText,
          };
          if (involvementFilter !== "All") {
            let pass = false;
            if (involvementFilter === "Primary") {
              pass = invText.startsWith("Primary");
            } else if (involvementFilter === "Field Visit") {
              pass = invText.includes("Field Visit");
            } else if (involvementFilter === "Supporting") {
              pass = invText.includes("Support");
            }
            if (!pass) return;
          }
        }

        Object.keys(matchesTab).forEach((k) => {
          if (k !== "_involvementText" && matchesTab[k]) callMatchesForTab[k] = true;
        });

        if (matchesTab[activeStatusTab]) {
          matchingProducts.push({ pIdx, product: p, involvementText: matchesTab._involvementText || "N/A" });
        }
      });

      // Update total call counts per tab
      Object.keys(callMatchesForTab).forEach((k) => {
        if (callMatchesForTab[k]) counts[k]++;
      });

      if (matchingProducts.length > 0) {
        groupsMap[call._id || call.callId] = {
          call,
          products: matchingProducts,
        };
      }
    });

    return {
      groupedData: Object.values(groupsMap).sort(
        (a, b) =>
          new Date(b.call.createdAt).getTime() -
          new Date(a.call.createdAt).getTime(),
      ),
      tabCounts: counts,
    };
  }, [calls, searchQuery, isEmployeeWise, targetEmployee, activeStatusTab, involvementFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedData.slice(start, start + itemsPerPage);
  }, [groupedData, currentPage]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);

  const executeExport = async () => {
    let headers = [];
    if (exportFormat === "excel") {
      headers = [
        "S.No",
        "Call Number",
        "Registered Date",
        "Category",
        "Customer",
        "Customer Code",
        "Product",
        "Segment",
        "Error Code",
        "Product Issue",
        "Mode",
        "Start Date",
        "End Date",
        "Duration",
        "Pending",
        "Supporting",
        "Field visit",
        "Resolved",
      ];
    } else {
      headers = [
        "S.No",
        "Call Info",
        "Category",
        "Customer",
        "Product",
        "Error Code",
        "Mode",
        "Duration",
      ];
    }

    if (isEmployeeWise) headers.push("Involvement");
    headers.push("Status");

    if (exportWithHistory) headers.push("History");

    const rows = [];
    groupedData.forEach((group, gIdx) => {
      group.products.forEach((item, pIdx) => {
        const finalStatus = getProductStatus(item, group);
        let row;

        if (exportFormat === "excel") {
          row = [
            pIdx === 0 ? gIdx + 1 : "",
            pIdx === 0 ? group.call.callNumber : "",
            pIdx === 0 ? new Date(group.call.createdAt).toLocaleString("en-GB", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "",
            pIdx === 0 ? group.call.customerType || group.call.callCategory || "OEM" : "",
            pIdx === 0 ? group.call.customerName : "",
            pIdx === 0 ? group.call.partyCode || group.call.customerCode || "N/A" : "",
            item.product.productModel || item.product.itemCode,
            item.product.productSegment || group.call.segment || "N/A",
            item.product.errorCode || "N/A",
            item.product.callDescription || group.call.callDescription || "N/A",
            pIdx === 0 ? group.call.callMode || "Phone" : ""
          ];
          const dates = getEscalationDates(item);
          row.push(dates.startDate, dates.endDate);
          row.push(getEscalationDuration(item));
          
          const getRemarks = (statuses) => {
            const events = (item.product._history || []).filter(h => statuses.includes(h.status));
            if (events.length === 0) return "";
            if (events.length === 1) return events[0].remarks || "N/A";
            return events.map((e, idx) => `${idx + 1}. ${e.remarks || "N/A"}`).join("\n");
          };
          
          row.push(getRemarks(["Pending", "Updated"]));
          row.push(getRemarks(["Support Requested"]));
          row.push(getRemarks(["Field Visit Assigned", "Field Visit Requested", "Field Visit Required"]));
          row.push(getRemarks(["Resolved", "Closed"]));
        } else {
          if (pIdx === 0) {
            row = [
              {
                rowSpan: group.products.length,
                content: gIdx + 1,
                styles: { valign: "middle" },
              },
              {
                rowSpan: group.products.length,
                content: `${group.call.callNumber} - ${new Date(group.call.createdAt).toLocaleString("en-GB", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}`,
                styles: { valign: "middle" },
              },
              {
                rowSpan: group.products.length,
                content:
                  group.call.customerType || group.call.callCategory || "OEM",
                styles: { valign: "middle" },
              },
              {
                rowSpan: group.products.length,
                content: `${group.call.customerName} (Cus ${group.call.partyCode || group.call.customerCode || "N/A"})`,
                styles: { valign: "middle" },
              },
              `${item.product.productModel || item.product.itemCode}\n(${item.product.productSegment || group.call.segment || "N/A"})`,
              item.product.errorCode || "N/A",
              {
                rowSpan: group.products.length,
                content: group.call.callMode || "Phone",
                styles: { valign: "middle" },
              },
            ];
          } else {
            row = [
              `${item.product.productModel || item.product.itemCode}\n(${item.product.productSegment || group.call.segment || "N/A"})`,
              item.product.errorCode || "N/A",
            ];
          }
          row.push(getEscalationDuration(item));
        }

        if (isEmployeeWise) row.push(item.involvementText || "N/A");
        row.push(finalStatus);

        if (exportWithHistory) {
          const historyText = (item.product._history || [])
            .map((h) => {
              const dt = new Date(h.timestamp).toLocaleString("en-GB", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
              let text = `[${dt}] ${h.status} by ${h.updatedByName || "System"}`;

              if (h.metadata?.supportPerson) {
                text += ` (Sent to: ${h.metadata.supportPerson.name})`;
              } else if (h.metadata?.assignedTo) {
                text += ` (Assigned to: ${h.metadata.assignedToName || h.metadata.assignedTo})`;
              } else if (
                h.metadata?.returnedTo ||
                h.status === "Field Visit Returned"
              ) {
                text += ` (Returned to: ${h.metadata?.returnedTo || "Support"})`;
              }

              if (h.remarks) text += `: ${h.remarks}`;
              return text;
            })
            .join("\n--------------------------------------------------\n");
          row.push(historyText || "No history");
        }
        rows.push(row);
      });
    });

    const exportDateStr = `Export Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    const statusStr = `Status Filter: ${activeStatusTab}`;
    const employeeStr = isEmployeeWise && targetEmployee ? `Employee: ${targetEmployee.name} (${targetEmployee.department || 'Unknown'})` : null;

    if (exportFormat === "excel") {
      const metaRows = [
        [exportDateStr],
        [statusStr],
        ...(employeeStr ? [[employeeStr]] : []),
        []
      ];
      const aoaData = [...metaRows, headers, ...rows.map(r => r.map(c => (typeof c === 'object' && c !== null ? c.content : c)))];
      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Action Logs");
      XLSX.writeFile(workbook, `Action_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
    } else {
      const doc = new jsPDF("landscape");

      try {
        const img = new window.Image();
        img.src = akiraLogo;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        // Use PNG to preserve transparency
        const imgData = canvas.toDataURL("image/png");

        const aspect = img.height / img.width;
        // Set a fixed height that fits above the table (e.g. 12 units)
        const height = 12;
        const width = height / aspect;
        // Position at x=14, y=8 so it ends at y=20 (right above the table which starts at 22)
        doc.addImage(imgData, "PNG", 14, 6, width, height);
      } catch (err) {
        console.error("Could not load logo for PDF:", err);
      }

      doc.setFontSize(10);
      const pageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const dateText = `Date Generated: ${new Date().toLocaleDateString("en-GB")}`;
      const typeText = `Type: ${isEmployeeWise && targetEmployee ? `${targetEmployee.name} (${targetEmployee.department || 'Unknown'})` : "Overall Report"}`;
      let filterText = "";
      if (fromDate && toDate)
        filterText = ` (Filter: ${fromDate} to ${toDate})`;

      const subtitleText = `${dateText} | ${typeText}${filterText}`;
      doc.text(subtitleText, pageWidth - 14, 15, { align: "right" });
      doc.text(statusStr, pageWidth - 14, 20, { align: "right" });
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 25,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        columnStyles: exportWithHistory
          ? {
              [headers.length - 1]: { cellWidth: 80 },
            }
          : {},
      });
      doc.save(`Action_Logs_${new Date().toISOString().split("T")[0]}.pdf`);
    }
    setExportModalOpen(false);
  };

  return (
    <div className="w-full h-full bg-white rounded-[0.8vw] shadow-sm border border-slate-300 flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
        <div className="flex items-center justify-between p-[1vw]">
          <div className="flex items-center gap-[0.5vw]">
            {tabsElement}
            <div className="flex items-center ml-[0.5vw]">
              <div className="relative">
                <select
                  value={activeStatusTab}
                  onChange={(e) => {
                    setActiveStatusTab(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-slate-300 text-slate-700 font-bold text-[0.85vw] py-[0.5vw] pl-[1vw] pr-[2vw] rounded-[0.5vw] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer transition-colors hover:bg-slate-50"
                >
                  {subTabs.map((tab) => (
                    <option
                      key={tab}
                      value={tab}
                      className="font-medium text-slate-700"
                    >
                      {tab} ({tabCounts[tab] || 0})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-[0.6vw] text-slate-500">
                  <svg
                    className="fill-current h-[1vw] w-[1vw]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            {isEmployeeWise && (
              <div className="flex items-center ml-[0.5vw]">
                <div className="relative">
                  <select
                    value={involvementFilter}
                    onChange={(e) => {
                      setInvolvementFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-300 text-slate-700 font-bold text-[0.85vw] py-[0.5vw] pl-[1vw] pr-[2vw] rounded-[0.5vw] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <option value="All">All Involvements</option>
                    <option value="Primary">Primary</option>
                    <option value="Field Visit">Field Visit</option>
                    <option value="Supporting">Supporting</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-[0.6vw] text-slate-500">
                    <svg
                      className="fill-current h-[1vw] w-[1vw]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-[0.8vw]">
            {dateFilterElement}
            <div className="relative">
              <Search className="w-[1.2vw] h-[1.2vw] absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-[2.5vw] pr-[1vw] py-[0.5vw] w-[18vw] rounded-[0.4vw] border border-slate-300 text-[0.8vw] font-bold text-slate-700 bg-white outline-none focus:border-indigo-500 placeholder-slate-400"
              />
            </div>

            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-[0.4vw] px-[1vw] py-[0.5vw] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-[0.4vw] text-[0.8vw] font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-[1vw] h-[1vw]" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col justify-between">
        <div className="overflow-x-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 text-slate-700 text-[0.85vw] font-semibold border-b border-slate-300 shadow-sm">
                <th className="px-[0.6vw] py-[1vw] w-[3%] border-r border-slate-300 whitespace-nowrap">
                  S.No
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[15%] border-r border-slate-300 whitespace-nowrap">
                  Call Info
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Category
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[15%] border-r border-slate-300">
                  Customer
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[15%] border-r border-slate-300">
                  Product
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Error Code
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Mode
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Duration
                </th>
                {isEmployeeWise && (
                  <th className="px-[0.6vw] py-[1vw] w-[15%] border-r border-slate-300 whitespace-nowrap">
                    Involvement
                  </th>
                )}
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Status
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[12%] text-center whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEmployeeWise ? 11 : 10}
                    className="p-[4vw] text-center text-slate-500 font-bold text-[1vw]"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((group, groupIndex) => (
                  <React.Fragment key={group.call._id || group.call.callId}>
                    {group.products.map((item, pIndex) => (
                      <tr
                        key={`${group.call._id}_${item.pIdx}`}
                        className={`hover:bg-slate-50 transition-colors ${pIndex === group.products.length - 1 ? "border-b border-slate-300" : "border-b border-slate-100"}`}
                      >
                        {pIndex === 0 && (
                          <>
                            <td
                              className="px-[0.6vw] py-[1vw] text-[0.95vw] font-semibold text-slate-600 border-r border-slate-300 whitespace-nowrap"
                              rowSpan={group.products.length}
                            >
                              {(currentPage - 1) * itemsPerPage +
                                groupIndex +
                                1}
                            </td>
                            <td
                              className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap"
                              rowSpan={group.products.length}
                            >
                              <div className="text-[0.95vw] font-semibold text-indigo-700">
                                {group.call.callNumber}
                              </div>
                              <div className="text-[0.8vw] font-semibold text-slate-500">
                                {new Date(group.call.createdAt).toLocaleString(
                                  "en-GB",
                                  {
                                    month: "2-digit",
                                    day: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </div>
                            </td>
                            <td
                              className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap"
                              rowSpan={group.products.length}
                            >
                              <div className="text-[0.9vw] font-semibold text-slate-800">
                                {group.call.customerType ||
                                  group.call.callCategory ||
                                  "OEM"}
                              </div>
                            </td>
                            <td
                              className="px-[0.6vw] py-[1vw] border-r border-slate-300"
                              rowSpan={group.products.length}
                            >
                              <div className="text-[0.95vw] font-semibold text-slate-800">
                                {group.call.customerName}
                              </div>
                              <div className="flex flex-wrap items-center gap-[0.3vw] mt-[0.1vw]">
                                <span className="text-[0.8vw] font-semibold text-slate-500 whitespace-nowrap">
                                  {group.call.partyCode ||
                                    group.call.customerCode ||
                                    "N/A"}
                                </span>
                                <span className="px-[0.3vw] bg-purple-100 text-purple-700 text-[0.75vw] font-semibold rounded inline-block whitespace-nowrap">
                                  {group.call.locationType || "IPR"}
                                </span>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-[0.6vw] py-[1vw] border-r border-slate-300">
                          <div className="text-[0.95vw] font-semibold text-slate-800">
                            {item.product.productModel || item.product.itemCode}
                          </div>
                          <div className="text-[0.75vw] font-semibold text-slate-500 mt-[0.1vw]">
                            {item.product.productSegment || group.call.segment || "N/A"}
                          </div>
                        </td>
                        <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                          <div className="text-[0.9vw] font-semibold text-slate-800">
                            {item.product.errorCode || "N/A"}
                          </div>
                        </td>
                        {pIndex === 0 && (
                          <td
                            className="px-[0.6vw] py-[1vw] text-[0.95vw] font-semibold text-slate-600 border-r border-slate-300 whitespace-nowrap"
                            rowSpan={group.products.length}
                          >
                            {group.call.callMode || "Phone"}
                          </td>
                        )}
                        <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                          <span className="text-[0.85vw] font-semibold text-slate-600 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                            {getEscalationDuration(item)}
                          </span>
                        </td>
                        {isEmployeeWise && (
                          <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                            <span className="text-[0.85vw] font-bold text-indigo-700 bg-indigo-50 px-[0.6vw] py-[0.2vw] rounded-[0.4vw] border border-indigo-200">
                              {item.involvementText || "N/A"}
                            </span>
                          </td>
                        )}
                        <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                          <span
                            className={`px-[0.6vw] py-[0.2vw] rounded-[0.4vw] text-[0.85vw] font-semibold inline-block whitespace-nowrap ${(() => {
                              const pStatus = getProductStatus(item, group);
                              if (pStatus === "Resolved")
                                return "bg-emerald-50 text-emerald-700 border border-emerald-200";
                              if (pStatus === "Critical")
                                return "bg-red-50 text-red-700 border border-red-200";
                              if (pStatus === "Escalation")
                                return "bg-orange-50 text-orange-700 border border-orange-200";
                              if (pStatus.includes("Returned"))
                                return "bg-gray-100 text-gray-700 border border-gray-300";
                              if (pStatus.includes("Field Visit"))
                                return "bg-amber-50 text-amber-700 border border-amber-200";
                              if (pStatus.includes("Support"))
                                return "bg-blue-50 text-blue-700 border border-blue-200";
                              if (pStatus === "Pending")
                                return "bg-amber-50 text-amber-700 border border-amber-200";
                              if (pStatus === "Attended")
                                return "bg-indigo-50 text-indigo-700 border border-indigo-200";
                              return "bg-slate-50 text-slate-700 border border-slate-300";
                            })()}`}
                          >
                            {getProductStatus(item, group)}
                          </span>
                        </td>
                        <td className="px-[0.6vw] py-[1vw] text-center whitespace-nowrap">
                          <button
                            onClick={() => setHistoryModalOpen(item.product)}
                            className="inline-flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-300 rounded-[0.5vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.75vw] transition-colors cursor-pointer shadow-sm"
                          >
                            <History className="w-[1vw] h-[1vw]" />
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex-shrink-0 flex items-center justify-between p-[1vw] border-t border-slate-200 bg-slate-50 mt-auto rounded-b-[0.8vw]">
          <div className="text-[0.75vw] font-bold text-slate-500">
            Showing{" "}
            {groupedData.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{" "}
            to {Math.min(currentPage * itemsPerPage, groupedData.length)} of{" "}
            {groupedData.length} records
          </div>
          <div className="flex gap-[0.5vw]">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-[0.8vw] py-[0.4vw] rounded-[0.4vw] border border-slate-300 bg-white text-slate-600 font-bold text-[0.75vw] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <div className="flex items-center gap-[0.2vw]">
              {Array.from({ length: Math.max(totalPages, 1) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-[1.8vw] h-[1.8vw] rounded-[0.4vw] flex items-center justify-center text-[0.75vw] font-bold transition-colors cursor-pointer ${currentPage === i + 1 ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-[0.8vw] py-[0.4vw] rounded-[0.4vw] border border-slate-300 bg-white text-slate-600 font-bold text-[0.75vw] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {historyModalOpen && (
          <ProductHistoryModal
            history={historyModalOpen._history}
            employees={employees}
            currentUser={null} // Don't specifically highlight 'currentUser' as it's an admin view usually
            onClose={() => setHistoryModalOpen(null)}
          />
        )}
        {exportModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[9999] flex justify-center items-center p-[2vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[0.8vw] shadow-xl w-[25vw] overflow-hidden flex flex-col"
            >
              <div className="p-[1.5vw] pb-[0.5vw]">
                <h3 className="font-extrabold text-[1.1vw] text-slate-800">
                  Export Options
                </h3>
              </div>
              <div className="p-[1.5vw] flex flex-col gap-[1vw]">
                <label className="flex items-center gap-[0.8vw] cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={exportFormat === "pdf"}
                      onChange={() => setExportFormat("pdf")}
                      className="peer sr-only"
                    />
                    <div className="w-[1.2vw] h-[1.2vw] rounded-full border-2 border-slate-300 peer-checked:border-blue-600 peer-checked:border-[0.35vw] transition-all"></div>
                  </div>
                  <span className="text-[0.9vw] text-slate-700 font-medium group-hover:text-slate-900">
                    Export as PDF
                  </span>
                </label>

                <label className="flex items-center gap-[0.8vw] cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportFormat === "excel"}
                      onChange={() => setExportFormat("excel")}
                      className="peer sr-only"
                    />
                    <div className="w-[1.2vw] h-[1.2vw] rounded-full border-2 border-slate-300 peer-checked:border-blue-600 peer-checked:border-[0.35vw] transition-all"></div>
                  </div>
                  <span className="text-[0.9vw] text-slate-700 font-medium group-hover:text-slate-900">
                    Export as Excel
                  </span>
                </label>

                <div className="border-t border-slate-100 my-[0.2vw]"></div>

                <label className="flex items-center gap-[0.8vw] cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={exportWithHistory}
                      onChange={(e) => setExportWithHistory(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-[1.2vw] h-[1.2vw] rounded-[0.3vw] border-2 border-slate-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 flex items-center justify-center transition-colors">
                      <CheckCircle className="w-[0.8vw] h-[0.8vw] text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                  </div>
                  <span className="text-[0.9vw] text-slate-700 font-medium group-hover:text-slate-900">
                    With History
                  </span>
                </label>
              </div>
              <div className="p-[1.2vw] flex justify-center gap-[1vw] pt-0 pb-[1.5vw]">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-[2vw] py-[0.6vw] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-[2vw] font-bold text-[0.85vw] transition-colors cursor-pointer w-1/2"
                >
                  Cancel
                </button>
                <button
                  onClick={executeExport}
                  className="px-[2vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[2vw] font-bold text-[0.85vw] transition-colors cursor-pointer shadow-md w-1/2"
                >
                  Export
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────
export default function ServiceCallReports() {
  const { toast } = useNotification();
  const [fromDate, setFromDate] = useState(getTodayStr());
  const [toDate, setToDate] = useState("");
  const [employees, setEmployees] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overall"); // "overall" | "employee"

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [empRes, callRes] = await Promise.all([
        axios.get(`${API_URL}/auth/employees`),
        axios.get(`${API_URL}/service-calls`),
      ]);
      setEmployees(empRes.data || []);
      setCalls(callRes.data || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  }

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

    return calls.filter((call) => {
      let callDate = new Date(call.createdAt);
      if (isNaN(callDate.getTime()) && call.dateTime) {
        const dtStr = call.dateTime;
        const match = dtStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = parseInt(match[3], 10);
          callDate = new Date(year, month, day);
        } else {
          callDate = new Date(dtStr);
        }
      }

      if (start && callDate < start) return false;
      if (end && callDate > end) return false;
      return true;
    });
  }, [calls, fromDate, toDate]);

  // Aggregate data per employee
  const reportData = useMemo(() => {
    const empData = employees.map((emp) => {
      const empCalls = filteredCalls.filter((call) => {
        if (call.status === "Registered") return false;
        return call.products?.some((p) => {
          const pStatus = getProductStatus({ product: p }, { call });
          if (pStatus === "Critical" || pStatus === "Escalation") return false;

          return (
            (p._assignedEngineerId === emp.userId && p._assigned !== false) ||
            p._fieldVisit?.assignedBy === emp.userId ||
            p._fieldVisit?.assignedTo === emp.userId ||
            p._supportPersonId === emp.userId
          );
        });
      });

      return {
        ...emp,
        allocatedCount: empCalls.length,
        calls: empCalls,
      };
    });

    return { employees: empData };
  }, [employees, filteredCalls]);

  const displayRows = useMemo(() => {
    const searchLow = search.toLowerCase();
    const filteredEmps = reportData.employees.filter(
      (emp) =>
        emp.role?.toLowerCase() !== "admin" &&
        (emp.name.toLowerCase().includes(searchLow) ||
          emp.department?.toLowerCase().includes(searchLow)),
    );
    filteredEmps.sort((a, b) => b.allocatedCount - a.allocatedCount);
    return filteredEmps;
  }, [reportData, search]);

  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return displayRows.slice(startIdx, startIdx + rowsPerPage);
  }, [displayRows, currentPage]);

  const totalPages = Math.ceil(displayRows.length / rowsPerPage);

  const tabsElement = (
    <div className="flex items-center bg-white p-[0.2vw] rounded-[0.4vw] border border-slate-300 shadow-sm mr-[0.5vw]">
      <button
        onClick={() => {
          setActiveTab("overall");
          setSelectedEmp(null);
        }}
        className={`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.3vw] transition-colors cursor-pointer ${activeTab === "overall" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Overall Report
      </button>
      <button
        onClick={() => setActiveTab("employee")}
        className={`px-[1vw] py-[0.4vw] text-[0.85vw] font-bold rounded-[0.3vw] transition-colors cursor-pointer ${activeTab === "employee" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
      >
        Employee wise
      </button>
    </div>
  );

  const dateFilterElement = (
    <div className="flex items-center gap-[0.4vw] bg-white p-[0.1vw] rounded-[0.5vw] border border-slate-300 shadow-sm mr-[0.5vw]">
      <div className="flex items-center gap-[0.3vw] px-[0.6vw] border-r border-slate-300">
        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">
          From:
        </span>
        <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700"
        />
      </div>
      <div className="flex items-center gap-[0.3vw] px-[0.6vw]">
        <span className="text-[0.7vw] font-bold text-slate-500 uppercase tracking-widest">
          To:
        </span>
        <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-400" />
        <input
          type="date"
          min={fromDate}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="text-[0.75vw] font-semibold outline-none bg-transparent h-[1.8vw] w-[6.5vw] cursor-pointer text-slate-700"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-[1vw] bg-white">
        <div className="w-[3vw] h-[3vw] border-[0.3vw] border-black/10 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-[0.9vw] font-medium text-black">
          Generating Analysis...
        </span>
      </div>
    );
  }

  // Employee Drill-down view
  if (selectedEmp) {
    const backButtonElement = (
      <button
        onClick={() => setSelectedEmp(null)}
        className="flex items-center justify-center w-[2vw] h-[2vw] mr-[0.5vw] rounded-[0.4vw] bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-[1vw] h-[1vw]" />
      </button>
    );

    return (
      <div className="flex flex-col h-[90vh] overflow-hidden bg-slate-50 gap-[0.8vw] p-[1vw]">
        <div className="flex-1 overflow-hidden">
          <ActionLogsView
            calls={filteredCalls}
            employees={employees}
            isEmployeeWise={true}
            targetEmployee={selectedEmp}
            tabsElement={backButtonElement}
            dateFilterElement={dateFilterElement}
            fromDate={fromDate}
            toDate={toDate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[90vh] overflow-hidden bg-slate-50 gap-[0.8vw] ">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "overall" ? (
          <ActionLogsView
            calls={filteredCalls}
            employees={employees}
            isEmployeeWise={false}
            targetEmployee={null}
            tabsElement={tabsElement}
            dateFilterElement={dateFilterElement}
            fromDate={fromDate}
            toDate={toDate}
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden bg-white rounded-[0.8vw] shadow-sm border border-slate-300 relative animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between p-[1vw] border-b border-slate-200 bg-slate-50 rounded-t-[0.8vw]">
              <div className="flex items-center gap-[0.5vw]">
                {tabsElement}
                <span className="px-[0.6vw] py-[0.1vw] bg-indigo-100 text-indigo-700 text-[0.8vw] font-bold rounded-full">
                  {displayRows.length} Employees
                </span>
              </div>

              <div className="flex items-center gap-[0.8vw]">
                {dateFilterElement}
                <div className="relative">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search employee..."
                    className="pl-[2.2vw] pr-[0.8vw] py-[0.5vw] border border-slate-300 rounded-[0.4vw] focus:outline-none focus:border-indigo-500 text-[0.8vw] w-[15vw] text-slate-700 font-bold bg-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col justify-between">
              <div className="overflow-x-auto min-h-0">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-100 text-slate-700 text-[0.85vw] font-semibold border-b border-slate-300 shadow-sm">
                      <th className="px-[0.6vw] py-[1vw] text-center border-r border-slate-300 w-[5%]">
                        S.No
                      </th>
                      <th className="px-[1vw] py-[1vw] border-r border-slate-300 w-[25%]">
                        Employee Details
                      </th>
                      <th className="px-[1vw] py-[1vw] border-r border-slate-300 w-[20%]">
                        Department
                      </th>
                      <th className="px-[1vw] py-[1vw] border-r border-slate-300 text-center w-[15%]">
                        Allocated Calls
                      </th>
                      <th className="px-[1vw] py-[1vw] text-center w-[15%]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-[5vw] text-slate-400 font-bold"
                        >
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, idx) => {
                        const sNo = (currentPage - 1) * rowsPerPage + idx + 1;
                        return (
                          <tr
                            key={row.userId || `row-${idx}`}
                            className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                          >
                            <td className="px-[0.6vw] py-[1vw] text-center font-bold text-slate-500 text-[0.9vw] border-r border-slate-300">
                              {sNo}
                            </td>
                            <td className="px-[1vw] py-[1vw] border-r border-slate-300">
                              <div className="flex items-center gap-[0.8vw]">
                                <div className="w-[2.4vw] h-[2.4vw] rounded-lg flex items-center justify-center font-bold text-[0.9vw] border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm">
                                  {row.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[0.95vw] font-bold text-slate-800">
                                    {row.name}
                                  </div>
                                  <div className="text-[0.7vw] text-slate-500 font-semibold uppercase tracking-wider mt-[0.1vw]">
                                    {row.role}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-[1vw] py-[1vw] border-r border-slate-300">
                              <span className="text-slate-700 font-bold px-[0.6vw] py-[0.2vw] bg-white rounded-[0.4vw] border border-slate-300 shadow-sm text-[0.8vw]">
                                {row.department || "—"}
                              </span>
                            </td>
                            <td className="px-[1vw] py-[1vw] text-center border-r border-slate-300">
                              <span
                                className={`inline-flex items-center justify-center min-w-[2vw] px-[0.6vw] py-[0.2vw] rounded-[0.4vw] text-[0.85vw] font-bold shadow-sm ${row.allocatedCount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                              >
                                {row.allocatedCount}
                              </span>
                            </td>
                            <td className="px-[1vw] py-[1vw] text-center">
                              <button
                                onClick={() => {
                                  if (row.allocatedCount === 0)
                                    toast(
                                      "No allocated tasks for this engineer.",
                                      "info",
                                    );
                                  else setSelectedEmp(row);
                                }}
                                className={`inline-flex items-center gap-[0.4vw] px-[1vw] py-[0.4vw] rounded-[0.5vw] text-[0.75vw] font-bold transition-all border shadow-sm ${row.allocatedCount > 0 ? "bg-white text-indigo-700 border-slate-300 hover:bg-slate-50 active:scale-95 cursor-pointer" : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"}`}
                              >
                                <Layers className="w-[0.9vw] h-[0.9vw]" /> View
                                Logs
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex-shrink-0 flex items-center justify-between p-[1vw] border-t border-slate-200 bg-slate-50 mt-auto rounded-b-[0.8vw]">
                <div className="text-[0.75vw] font-bold text-slate-500">
                  Showing{" "}
                  {displayRows.length === 0
                    ? 0
                    : (currentPage - 1) * rowsPerPage + 1}{" "}
                  to {Math.min(currentPage * rowsPerPage, displayRows.length)}{" "}
                  of {displayRows.length} records
                </div>
                <div className="flex gap-[0.5vw]">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-[0.8vw] py-[0.4vw] rounded-[0.4vw] border border-slate-300 bg-white text-slate-600 font-bold text-[0.75vw] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-[0.2vw]">
                    {Array.from({ length: Math.max(totalPages, 1) }).map(
                      (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-[1.8vw] h-[1.8vw] rounded-[0.4vw] flex items-center justify-center text-[0.75vw] font-bold transition-colors cursor-pointer ${currentPage === i + 1 ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                        >
                          {i + 1}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-[0.8vw] py-[0.4vw] rounded-[0.4vw] border border-slate-300 bg-white text-slate-600 font-bold text-[0.75vw] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
