import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Clock,
  User,
  Package,
  FileText,
  CheckCircle,
  History,
  Shield,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  Send,
  X,
  MapPin,
  Bell,
  CheckSquare,
  Wrench,
  BarChart2,
  Eye,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Layers,
  Phone,
  Mail,
  Share2,
  Play,
  Search,
  Download,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  MoreVertical,
  ClipboardList,
  UserCheck,
  PhoneCall,
} from "lucide-react";
import {
  ServiceCallForm,
  emptyForm,
  CallSummaryModal,
  getStatusCfg,
  getProductStatus as getCallProductStatus,
  deriveCallStatus,
  getTypeColor,
  PRIORITIES,
} from "./ServiceCall";
import CustomDropdown from "../../components/CustomDropdown";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import useEscalationWorker from "../../service/useEscalationWorker";
import { useSocket } from "../../contexts/SocketContext";
import ProductHistoryModal, {
  ProductHistoryTimeline,
} from "./ProductHistoryModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = import.meta.env.VITE_API_URL;

// ── Storage keys (Legacy) ──────────────────────────────────────────────────────────────
const EMPLOYEES_KEY = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const MODES_KEY = "call_modes_v1";
const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];

const RESOLUTION_TYPES = [
  "Fixed",
  "Replaced",
  "No Fault Found",
  "Partially Fixed",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const load = (key, fb = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb));
  } catch {
    return fb;
  }
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playBeep = (startTime) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(1760, startTime + 0.1);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    };

    const now = ctx.currentTime;
    playBeep(now);
    playBeep(now + 0.25); // double beep
  } catch (e) {
    console.error("Audio play failed:", e);
  }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ── Product status helper ─────────────────────────────────────────────────────
const getProductStatus = (prod) => {
  if (prod._resolved) return "resolved";
  if (
    prod._productClosure?.status === "Resolved" ||
    prod._productClosure?.status === "Closed"
  )
    return "closed";
  if (prod._productClosure?.status === "Pending") return "pending";
  if (prod._supportRequested) return "support";
  if (prod._attended) return "attended";
  return "open";
};

const PROD_STATUS_CFG = {
  resolved: {
    dot: "bg-emerald-500",
    label: "Resolved",
    cls: "bg-emerald-50/70 border-emerald-350 text-emerald-800",
  },
  closed: {
    dot: "bg-emerald-500",
    label: "Resolved",
    cls: "bg-emerald-50/70 border-emerald-350 text-emerald-800",
  },
  pending: {
    dot: "bg-amber-500",
    label: "Pending",
    cls: "bg-amber-50/70 border-amber-350 text-amber-805",
  },
  support: {
    dot: "bg-blue-500",
    label: "Support Req",
    cls: "bg-blue-50/70 border-blue-350 text-blue-800",
  },
  attended: {
    dot: "bg-indigo-500",
    label: "Attended",
    cls: "bg-indigo-50/70 border-indigo-350 text-indigo-800",
  },
  open: {
    dot: "bg-rose-500",
    label: "Open",
    cls: "bg-rose-50/70 border-rose-350 text-rose-800",
  },
};

// ── Badge Component ───────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray" }) => {
  const map = {
    green:
      "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-350",
    blue: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-350",
    slate:
      "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-400",
    gray: "bg-slate-100 text-slate-750 border-slate-400",
    orange:
      "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-350",
    red: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-rose-350",
    indigo:
      "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-800 border-indigo-350",
  };
  return (
    <span
      className={`text-[0.68vw] px-[0.6vw] py-[0.2vw] rounded-full border font-bold whitespace-nowrap  shadow-sm transition-all duration-300 ${map[color] || map.gray}`}
    >
      {label}
    </span>
  );
};

// ── Contact Info Container ─────────────────────────────────────────────────────
const ContactInfoBar = ({ entry }) => {
  if (
    !entry?.contactPerson &&
    !entry?.contactNumber &&
    !entry?.emailId &&
    !entry?.location
  )
    return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-[0.9vw] mb-[0.6vw] bg-slate-50/85 backdrop-blur-sm border border-slate-400 rounded-[0.6vw] px-[0.7vw] py-[0.6vw] flex items-center gap-[1.6vw] flex-wrap shadow-inner"
    >
      {entry.contactPerson && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold hover:text-slate-950 transition-colors">
          <User className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span>{entry.contactPerson}</span>
        </div>
      )}
      {entry.contactNumber && (
        <a
          href={`tel:${entry.contactNumber}`}
          className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-850 font-bold hover:text-indigo-700 transition-colors"
        >
          <Phone className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span className="font-mono">{entry.contactNumber}</span>
        </a>
      )}
      {entry.emailId && (
        <a
          href={`mailto:${entry.emailId}`}
          className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-850 font-bold hover:text-indigo-700 transition-colors"
        >
          <Mail className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span className="font-mono">{entry.emailId}</span>
        </a>
      )}
      {entry.location && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold">
          <MapPin className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span>{entry.location}</span>
        </div>
      )}
      {entry.site && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold">
          <span className="text-[0.7vw] uppercase font-bold text-slate-500">Site:</span>
          <span>{entry.site}</span>
        </div>
      )}
    </motion.div>
  );
};

// ── Per-product SLA Timer ──────────────────────────────────────────────────────
const ProductSLATimer = ({ product, globalTimer }) => {
  const lastEsc =
    product._escalationHistory?.[product._escalationHistory.length - 1];
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (product._attended) {
      setTimeLeft("attended");
      return;
    }
    if (!lastEsc?.assignedAt) return;
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const allFlows = Object.values(flows).find((f) => Array.isArray(f)) || [];
    const step = allFlows.find((s) => s.dept === lastEsc.department);
    const durationMs = (step?.slaHours || 2) * 60 * 60 * 1000;
    const deadline = new Date(lastEsc.assignedAt).getTime() + durationMs;

    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeft("overdue");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lastEsc, product._attended]);

  if (product._attended) {
    return (
      <div className="flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] bg-emerald-50 text-emerald-700 border border-emerald-350 font-bold text-[0.68vw] shadow-sm">
        <CheckSquare className="w-[0.7vw] h-[0.7vw]" />
        Attended
      </div>
    );
  }

  if (!lastEsc && !globalTimer) return null;
  if (!lastEsc && globalTimer) {
    return (
      <div
        className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] font-mono text-[0.68vw] font-bold shadow-sm ${globalTimer.isExpired ? "bg-red-55 text-red-700 border border-red-350 animate-pulse" : globalTimer.isUrgent ? "bg-amber-55 text-amber-800 border border-amber-350" : "bg-blue-55 text-blue-700 border border-blue-350"}`}
      >
        <Clock className="w-[0.7vw] h-[0.7vw]" />
        {globalTimer.isExpired ? "Escalating" : globalTimer.remainingFormatted}
      </div>
    );
  }
  if (!timeLeft) return null;
  const isOverdue = timeLeft === "overdue";
  return (
    <div
      className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] font-mono text-[0.68vw] font-bold shadow-sm ${isOverdue ? "bg-red-55 text-red-700 border border-red-350 animate-pulse" : "bg-blue-55 text-blue-700 border border-blue-350"}`}
    >
      <Clock className="w-[0.7vw] h-[0.7vw]" />
      {isOverdue ? "SLA Breached" : timeLeft}
    </div>
  );
};

// ── Support Escalation Modal (per-product) ────────────────────────────────────
const SupportEscalationModal = ({
  product,
  entry,
  currentUser,
  employees: propsEmployees,
  onConfirm,
  onClose,
  showAll = false,
}) => {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const emps = propsEmployees || load(EMPLOYEES_KEY, []);
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const q = search.toLowerCase();
    const matchesSearch = (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q);
    if (showAll)
      return emps.filter(
        (e) => e.userId !== currentUser?.userId && matchesSearch(e),
      );
    const prodDept = product._currentDepartment || entry.currentDepartment;
    const allFlowsArr =
      Object.values(flows).find((f) => Array.isArray(f)) || [];
    const allowedDepts = new Set([prodDept]);
    const myIdx = allFlowsArr.findIndex((s) => s.dept === prodDept);
    if (myIdx >= 0 && myIdx + 1 < allFlowsArr.length)
      allowedDepts.add(allFlowsArr[myIdx + 1].dept);
    return emps.filter(
      (e) =>
        allowedDepts.has(e.department) &&
        e.userId !== currentUser?.userId &&
        matchesSearch(e),
    );
  }, [entry, product, currentUser, search, showAll, propsEmployees]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[36vw] rounded-[1vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-slate-400"
      >
        <div className="bg-slate-950 px-[1.4vw] py-[1vw] flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-[0.6vw]">
            <Share2 className="w-[1.2vw] h-[1.2vw] text-indigo-400" />
            <h3 className="text-[1vw] font-bold text-white ">
              {showAll
                ? "Reassign Support Request"
                : "Request Support — This Product"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white cursor-pointer transition-colors p-[0.3vw] hover:bg-white/10 rounded-full"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="p-[1.4vw] flex flex-col gap-[1vw] overflow-y-auto flex-1">
          <div className="bg-indigo-50 border border-indigo-300 rounded-[0.5vw] p-[0.7vw] text-[0.72vw] text-indigo-900  font-bold shadow-sm">
            <strong className="text-indigo-950">Scope:</strong>{" "}
            {showAll
              ? "Reassign this support request to any available person across departments."
              : "Only this product will be reassigned. Others remain with you."}
          </div>

          <div className="bg-slate-50 border border-slate-400 rounded-[0.6vw] p-[0.8vw] shadow-sm">
            <div className="text-[0.82vw] font-black text-slate-850">
              {product.productModel || product.itemCode}
            </div>
            {product.serialNumber && (
              <div className="text-[0.72vw] text-slate-700 font-mono font-bold mt-[0.15vw]">
                SN: {product.serialNumber}
              </div>
            )}
            {product.callDescription && (
              <div className="text-[0.72vw] text-slate-800 mt-[0.3vw]  italic border-t border-slate-400 pt-[0.3vw]">
                <strong className="text-slate-600 not-italic font-black">
                  Issue:
                </strong>{" "}
                {product.callDescription}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[0.4vw]">
            <label className="text-[0.78vw] font-black text-slate-800">
              Select Support Person <span className="text-indigo-650">*</span>
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or department…"
              className="w-full border border-slate-400 rounded-[0.5vw] px-[0.8vw] py-[0.5vw] text-[0.8vw] font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all bg-white"
            />
            <div className="border border-slate-400 rounded-[0.5vw] max-h-[14vw] overflow-y-auto divide-y divide-slate-300 bg-white shadow-inner">
              {candidates.length === 0 ? (
                <div className="p-[1.2vw] text-center text-slate-600 font-bold text-[0.75vw]">
                  No eligible support personnel found
                </div>
              ) : (
                candidates.map((emp) => (
                  <div
                    key={emp.userId}
                    onClick={() => setSelectedPerson(emp)}
                    className={`flex items-center gap-[0.8vw] px-[0.9vw] py-[0.6vw] cursor-pointer transition-all
                      ${
                        selectedPerson?.userId === emp.userId
                          ? "bg-indigo-50 border-l-[0.2vw] border-indigo-600 font-bold text-indigo-950"
                          : "hover:bg-slate-50 border-l-[0.2vw] border-transparent font-medium"
                      }`}
                  >
                    <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-white text-[0.58vw] font-bold">
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8vw] font-bold text-slate-850">
                        {emp.name}
                      </div>
                      <div className="text-[0.68vw] text-slate-650 font-bold">
                        {emp.department} · {emp.userId}
                      </div>
                    </div>
                    {selectedPerson?.userId === emp.userId && (
                      <CheckCircle className="w-[0.9vw] h-[0.9vw] text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[0.3vw]">
            <label className="text-[0.78vw] font-black text-slate-800">
              Handover Notes <span className="text-indigo-650">*</span>
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you've tried, current status, or instructions..."
              className="border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.8vw] font-medium outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
            />
          </div>
        </div>

        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-400 bg-slate-50 flex justify-end gap-[0.7vw]">
          <button
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-slate-400 bg-white rounded-[0.5vw] text-[0.8vw] font-bold cursor-pointer hover:bg-slate-100 text-slate-700 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!selectedPerson) {
                alert("Please select a support person.");
                return;
              }
              if (!notes.trim()) {
                alert("Please add handover notes.");
                return;
              }
              onConfirm({ supportPerson: selectedPerson, notes });
            }}
            className="px-[1.2vw] py-[0.5vw] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[0.5vw] text-[0.8vw] font-bold cursor-pointer flex items-center gap-[0.4vw] transition-colors shadow-md shadow-indigo-600/15"
          >
            <Send className="w-[0.85vw] h-[0.85vw]" />
            Assign Support
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Customer History Modal ──────────────────────────────────────────────────────
const CustomerHistoryModal = ({ identifier, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/service-calls/customer-history/${encodeURIComponent(identifier)}`,
        );
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch customer history", err);
      } finally {
        setLoading(false);
      }
    };
    if (identifier) fetchHistory();
  }, [identifier]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[50vw] rounded-[1vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-slate-400"
      >
        <div className="bg-indigo-950 px-[1.4vw] py-[1vw] flex justify-between items-center border-b border-indigo-800">
          <div className="flex items-center gap-[0.6vw]">
            <History className="w-[1.2vw] h-[1.2vw] text-indigo-400" />
            <h3 className="text-[1vw] font-bold text-white">
              Service History: {identifier}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>

        <div className="p-[1.5vw] overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="flex justify-center p-[2vw]">
              <div className="w-[2vw] h-[2vw] border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-500 font-bold text-[0.9vw] p-[2vw]">
              No past service calls found for this customer.
            </div>
          ) : (
            <div className="flex flex-col gap-[1vw]">
              {history.map((call) => (
                <div
                  key={call._id}
                  className="bg-white border border-slate-300 rounded-[0.6vw] p-[1vw] shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-[0.5vw] mb-[0.6vw]">
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="font-bold text-[0.9vw] text-slate-800">
                        Call ID : {call.callNumber}
                      </span>
                      <span className="text-[0.85vw] text-slate-700 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                        {new Date(call.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      label={call.status}
                      color={call.status === "Resolved" ? "green" : "blue"}
                    />
                  </div>

                  <div className="flex flex-col gap-[0.8vw]">
                    {call.products?.map((p, idx) => {
                      let finalStatus = "Open";
                      let statusColor = "text-blue-600";

                      if (
                        p._resolved ||
                        p._productClosure?.status === "Closed"
                      ) {
                        finalStatus = "Resolved";
                        statusColor = "text-emerald-600";
                      } else if (p._productClosure?.status === "Pending") {
                        finalStatus = "Pending";
                        statusColor = "text-amber-600";
                      } else if (
                        p._fieldVisit?.isAssigned ||
                        p._productClosure?.status === "Field Visit Required"
                      ) {
                        finalStatus = "Field Visit Required";
                        statusColor = "text-indigo-600";
                      } else if (p._supportRequested) {
                        finalStatus = "Support Requested";
                        statusColor = "text-cyan-600";
                      } else if (!p._attended) {
                        finalStatus = "Escalating";
                        statusColor = "text-rose-500";
                      }

                      return (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 p-[1vw] rounded-[0.5vw]"
                        >
                          <div className="grid grid-cols-2 gap-[0.8vw] text-[0.85vw] text-slate-700 leading-relaxed">
                            <div>
                              <span className="font-bold text-slate-500">
                                Product:
                              </span>{" "}
                              {p.productModel || p.itemCode || "Unknown"}
                            </div>
                            {p.productSegment && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  Segment:
                                </span>{" "}
                                {p.productSegment}
                              </div>
                            )}
                            {p.serialNumber && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  S/N:
                                </span>{" "}
                                {p.serialNumber}
                              </div>
                            )}
                            {p.errorCode && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  Error:
                                </span>{" "}
                                {p.errorCode}
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="font-bold text-slate-500">
                                Description:
                              </span>{" "}
                              {p.callDescription || "No description"}
                            </div>
                            <div className="col-span-2 flex items-center gap-[0.4vw] mt-[0.2vw] text-[0.9vw]">
                              <span className="font-bold text-slate-500">
                                Status:
                              </span>
                              <span className={`font-black ${statusColor}`}>
                                {finalStatus}
                              </span>
                            </div>

                            {finalStatus === "Resolved" && (
                              <div className="col-span-2 mt-[0.5vw] bg-emerald-50/50 border border-emerald-100 rounded-[0.5vw] p-[0.8vw]">
                                {(() => {
                                  const resolveEvent = p._history
                                    ?.slice()
                                    .reverse()
                                    .find(
                                      (h) =>
                                        h.status?.includes("Resolv") ||
                                        h.status === "Closed" ||
                                        h.status === "Completed",
                                    );
                                  const remarks =
                                    p._productClosure?.remarks ||
                                    p._productClosure?.solutionNotes ||
                                    resolveEvent?.remarks;
                                  const resolvedBy =
                                    p._productClosure?.closedByName ||
                                    resolveEvent?.updatedByName ||
                                    "Support Team";

                                  return (
                                    <div className="flex flex-col gap-[0.3vw]">
                                      <div className="text-[0.75vw] text-emerald-800 font-bold">
                                        Resolved by: {resolvedBy}
                                      </div>
                                      {remarks && (
                                        <div className="text-[0.8vw] text-slate-700 italic border-l-2 border-emerald-300 pl-[0.5vw] mt-[0.2vw]">
                                          "{remarks}"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Assign Field Visit Modal ──────────────────────────────────────────────────
const AssignVisitModal = ({
  type,
  entry,
  product,
  currentUser,
  employees: propsEmployees,
  onSave,
  onClose,
  inlineMode = false,
}) => {
  const employees = propsEmployees || load(EMPLOYEES_KEY, []);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const candidates = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.role?.toLowerCase() === "user" &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)),
    );
  }, [employees, currentUser, search]);
  const [form, setForm] = useState({
    assignedTo: "",
    assignedToName: "",
    assignmentDate: new Date().toISOString().slice(0, 16),
    visitDate: "",
    diagnosisSummary: "",
  });
  const sf = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isFV = type === "Field Visit";

  const formBody = (
    <div className="flex flex-col gap-[0.9vw]">
      {/* {product && (
        <div className="border border-indigo-300 rounded-[0.5vw] p-[0.6vw] bg-gradient-to-r from-indigo-50 to-blue-50/30">
          <div className="text-[0.72vw] font-bold text-indigo-950">
            Product:{" "}
            <strong className="font-bold text-indigo-900">
              {product.productModel || product.itemCode}
            </strong>
            {product.serialNumber && (
              <span className="ml-[0.5vw] font-mono text-[0.65vw] text-indigo-850 font-bold">
                SN: {product.serialNumber}
              </span>
            )}
          </div>
        </div>
      )} */}
      <div className="flex flex-col gap-[0.3vw] relative" ref={dropdownRef}>
        <label className="text-[0.85vw] font-semibold text-slate-800">
          Assign To *
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-[0.6vw] flex items-center justify-center pointer-events-none">
            <Search className="h-[0.9vw] w-[0.9vw] text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) {
                sf("assignedTo", "");
                sf("assignedToName", "");
              }
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search and select specialist..."
            className={`w-full border border-slate-400 pl-[2vw] p-[0.6vw] text-[0.85vw] outline-none bg-white transition-all shadow-sm ${showDropdown ? "rounded-t-[0.5vw] border-b-0 border-indigo-400" : "rounded-[0.5vw] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"}`}
          />
        </div>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 bg-white border border-indigo-400 border-t-0 rounded-b-[0.5vw] max-h-[12vw] overflow-y-auto shadow-xl z-[9999] p-[0.3vw]">
            {candidates.length > 0 ? (
              candidates.map((emp) => (
                <div
                  key={emp.userId}
                  onClick={() => {
                    sf("assignedTo", emp.userId);
                    sf("assignedToName", emp.name);
                    setSearch(`${emp.name} (${emp.department})`);
                    setShowDropdown(false);
                  }}
                  className={`p-[0.6vw] flex items-center justify-between rounded-[0.4vw] cursor-pointer font-bold text-[0.85vw] transition-colors ${form.assignedTo === emp.userId ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <div className="flex flex-col">
                    <span>{emp.name}</span>
                    <span className="text-[0.75vw] text-slate-500 font-semibold">
                      {emp.department}
                    </span>
                  </div>
                  {form.assignedTo === emp.userId && (
                    <CheckCircle className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-[0.8vw] text-center text-[0.75vw] text-slate-500 italic font-bold">
                No matching personnel found
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-[0.8vw]">
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.85vw] font-semibold text-slate-800">
            Assignment Date
          </label>
          <input
            type="datetime-local"
            value={form.assignmentDate}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => sf("assignmentDate", e.target.value)}
            className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.85vw] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
          />
        </div>
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.85vw] font-semibold text-slate-800">
            {isFV ? "Visit Date" : "Received Date"}
          </label>
          <input
            type="date"
            value={form.visitDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => sf("visitDate", e.target.value)}
            className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.85vw] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
          />
        </div>
      </div>
      <div className="flex flex-col gap-[0.3vw]">
        <label className="text-[0.85vw] font-semibold text-slate-800">
          Diagnosis Summary
        </label>
        <textarea
          rows="2"
          value={form.diagnosisSummary}
          onChange={(e) => sf("diagnosisSummary", e.target.value)}
          placeholder="Initial findings or instructions for the field visit..."
          className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.78vw] font-semibold outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
        />
      </div>
    </div>
  );

  const saveBtn = (
    <button
      disabled={isSubmitting}
      onClick={async () => {
        if (!form.assignedTo) {
          alert("Please select a person.");
          return;
        }
        if (!form.visitDate) {
          alert("Please select a visit date.");
          return;
        }
        setIsSubmitting(true);
        try {
          await onSave(form);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="px-[1.2vw] py-[0.5vw] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-[0.5vw] text-[0.8vw] font-bold cursor-pointer flex items-center justify-center gap-[0.4vw] transition-colors shadow-md shadow-indigo-600/15"
    >
      {isSubmitting ? (
        <Loader2 className="w-[0.85vw] h-[0.85vw] animate-spin" />
      ) : (
        <CheckCircle className="w-[0.85vw] h-[0.85vw]" />
      )}
      Save Assignment
    </button>
  );

  if (inlineMode)
    return (
      <div className="border border-indigo-300 rounded-[0.6vw] overflow-hidden bg-white mt-[0.6vw] shadow-sm">
        <div className="bg-slate-50 border-b border-indigo-300 px-[0.8vw] py-[0.5vw] flex justify-between items-center">
          <span className="text-[0.85vw] font-semibold text-slate-800">
            Assign {type}
          </span>
        </div>
        <div className="p-[0.8vw]">
          {formBody}
          <div className="flex justify-end mt-[0.8vw]">{saveBtn}</div>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[38vw] rounded-[1vw] shadow-2xl overflow-hidden border border-slate-400"
      >
        <div className="border-b border-slate-400 px-[1.4vw] py-[1vw] flex justify-between items-center bg-slate-50">
          <h3 className="text-[1vw] font-bold text-slate-850">Assign {type}</h3>
          <button
            onClick={onClose}
            className="text-slate-550 hover:text-slate-800 p-[0.3vw] hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>
        <div className="p-[1.4vw]">{formBody}</div>
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-400 flex justify-end gap-[0.7vw] bg-slate-50">
          <button
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-slate-400 rounded-[0.5vw] text-[0.8vw] font-bold bg-white hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cancel
          </button>
          {saveBtn}
        </div>
      </motion.div>
    </div>
  );
};

// ── Generic Issue Details Container ───────────────────────────────────────────
const IssueDetailsContainer = ({ product }) => {
  const hasExtra =
    product.serialNumber || product.errorCode || product.warrantyStatus;

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.8vw]">
      {hasExtra && (
        <div className="flex flex-wrap gap-[0.8vw] items-center border-b border-slate-200 pb-[0.6vw]">
          {product.serialNumber && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold">Serial Num:</span>{" "}
              {product.serialNumber}
            </div>
          )}
          {product.errorCode && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold text-slate-900">Error code :</span>{" "}
              {product.errorCode}
            </div>
          )}
          {product.warrantyStatus && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold text-slate-900">Warranty:</span>{" "}
              {product.warrantyStatus}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-[1vw]">
        <div className="flex-1">
          <div className="text-[0.85vw] font-bold text-slate-500 mb-[0.3vw]">
            Reported Issue Details
          </div>
          <div className="text-[0.85vw] text-slate-800 font-semibold leading-relaxed">
            {product.callDescription || "No description provided"}
          </div>
        </div>

        {/* Uploaded Reference Media */}
        {product.mediaFiles && product.mediaFiles.length > 0 && (
          <div className="flex flex-wrap gap-[0.6vw] justify-end max-w-[40%]">
            {product.mediaFiles.map((file, idx) => {
              const isImage =
                file.type?.startsWith("image/") ||
                /\.(jpe?g|png|gif|webp)$/i.test(file.name);
              const API_URL_VAR =
                import.meta.env.VITE_API_URL || "http://localhost:5000";
              const BASE_URL = API_URL_VAR.replace(/\/api$/, "");

              // Ensure URL has absolute path if it is relative
              const displayUrl = file.url?.startsWith("http")
                ? file.url
                : `${BASE_URL}${file.url?.startsWith("/") ? "" : "/"}${file.url}`;

              return (
                <div
                  key={idx}
                  className="group relative w-[5vw] h-[5vw] rounded-[0.5vw] border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm"
                  title={file.name}
                >
                  {isImage ? (
                    <img
                      src={displayUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-[0.5vw] text-slate-500">
                      <FileText className="w-[1.2vw] h-[1.2vw] mb-[0.2vw]" />
                      <span className="text-[0.5vw] truncate w-[4vw] text-center font-medium">
                        {file.name}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-[0.4vw] backdrop-blur-[1px]">
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/95 hover:bg-white text-slate-800 rounded px-[0.5vw] py-[0.15vw] text-[0.6vw] font-bold shadow-sm transition-colors flex items-center gap-[0.2vw]"
                    >
                      <Eye className="w-[0.7vw] h-[0.7vw]" /> View
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fetch(displayUrl)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = file.name || "download";
                            link.click();
                          });
                      }}
                      className="bg-indigo-600/95 hover:bg-indigo-500 text-white rounded px-[0.5vw] py-[0.15vw] text-[0.6vw] font-bold shadow-sm transition-colors flex items-center gap-[0.2vw]"
                    >
                      <Download className="w-[0.7vw] h-[0.7vw]" /> Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Product Closure Panel ─────────────────────────────────────────────────────
const ProductClosurePanel = ({
  prod,
  prodIdx,
  entry,
  currentUser,
  employees: propsEmployees,
  onAssignFieldVisit,
  onProductClose,
  onSupportRequest,
  onProductAttend,
  isPendingTab,
  isSupportDeskAsked,
  isSupportDeskAssigned,
}) => {
  const existing = prod._productClosure || {};
  const saved = existing.status;
  const [selected, setSelected] = useState("");
  const [remarks, setRemarks] = useState(existing.remarks || "");
  const [notes, setNotes] = useState(""); // For Support Request
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (saved === "Closed")
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-[0.6vw] bg-gradient-to-r from-emerald-50 to-teal-50/30 border border-emerald-350 rounded-[0.5vw] px-[0.8vw] py-[0.5vw] flex items-center gap-[0.6vw] shadow-sm"
      >
        <CheckCircle className="w-[0.9vw] h-[0.9vw] text-emerald-700 flex-shrink-0" />
        <span className="text-[0.75vw] font-bold text-emerald-800">
          Resolved & Closed
        </span>
        {existing.remarks && (
          <span className="text-[0.7vw] text-emerald-700 truncate opacity-95 italic font-bold">
            · {existing.remarks}
          </span>
        )}
      </motion.div>
    );

  const handleUpdate = async (status, extra = {}) => {
    if (status === "Resolved" && !remarks.trim()) {
      alert("Resolution details required.");
      return;
    }
    if (status === "Pending" && !remarks.trim()) {
      alert("Reason required for pending.");
      return;
    }

    if (status === "Returned") {
      if (!remarks.trim()) {
        alert("Please provide a reason for returning this request.");
        return;
      }
      setIsSubmitting(true);
      try {
        await onProductClose(prodIdx, {
          status: "Returned from Support",
          remarks,
          returnToAssigned: true,
          updatedAt: new Date().toISOString(),
        });
        setSelected("");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const data = {
      status,
      remarks,
      ...extra,
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onProductClose(prodIdx, data);
      setSelected("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupport = async () => {
    if (!selectedPerson) {
      alert("Please select a support person.");
      return;
    }
    if (!notes.trim()) {
      alert("Please add handover notes.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSupportRequest(prodIdx, { supportPerson: selectedPerson, notes });
      setSelected("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidates = useMemo(() => {
    const emps = propsEmployees || load(EMPLOYEES_KEY, []);
    const q = search.toLowerCase();
    return emps.filter(
      (e) =>
        e.userId !== currentUser?.userId &&
        e.role?.toLowerCase() === "user" &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)),
    );
  }, [currentUser, search, propsEmployees]);

  const tabs = [
    (!isSupportDeskAsked || !prod._supportPersonId) &&
      !isSupportDeskAssigned && {
        k: "Open",
        l: "Support",
        e: "🔄",
        c: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/15",
      },
    !isPendingTab &&
      !isSupportDeskAsked &&
      !isSupportDeskAssigned && {
        k: "Pending",
        l: "Pending",
        e: "⏸",
        c: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/15",
      },
    {
      k: "FVRequired",
      l: "Field Visit",
      e: "📍",
      c: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/15",
    },
    {
      k: "Resolved",
      l: "Resolve",
      e: "✓",
      c: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/15",
    },
    isSupportDeskAssigned && {
      k: "Returned",
      l: "Return to Assigned Person",
      e: "🔙",
      c: "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md shadow-rose-500/15",
    },
  ].filter(Boolean);

  const isAnyUserProductAttended = entry.products?.some(
    (p) => p._assignedEngineerId === currentUser?.userId && p._attended,
  );

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.6vw]">
      {/* Attendance Guard */}
      {!isAnyUserProductAttended && !prod._attended ? (
        <motion.div
          initial={{ scale: 0.98, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-indigo-50/70 via-blue-50/20 to-slate-50 border border-indigo-300 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center justify-center text-center gap-[0.6vw] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-[1vw] -top-[1vw] w-[4vw] h-[4vw] bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-inner">
            <Play className="w-[1.1vw] h-[1.1vw] fill-indigo-650 animate-pulse ml-[0.1vw]" />
          </div>
          <div>
            <div className="text-[0.85vw] font-black text-slate-800 ">
              Attend this Service Call
            </div>
            <p className="text-[0.82vw] text-slate-650 mt-[0.15vw] max-w-[90%] mx-auto font-bold">
              Acknowledge and attend to halt the auto-escalation timer.
            </p>
          </div>
          <button
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onProductAttend(prodIdx);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-[0.55vw] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-70 text-white rounded-[0.5vw] font-bold text-[0.85vw] transition-all duration-300 transform active:scale-95 shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-[0.4vw]"
          >
            {isSubmitting ? (
              <Loader2 className="w-[0.85vw] h-[0.85vw] animate-spin" />
            ) : (
              <CheckSquare className="w-[0.85vw] h-[0.85vw]" />
            )}
            Acknowledge & Attend
          </button>
        </motion.div>
      ) : (
        <>
          <div
            className={`grid gap-[0.4vw] ${tabs.length === 4 ? "grid-cols-4" : tabs.length === 3 ? "grid-cols-3" : tabs.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => setSelected(selected === t.k ? "" : t.k)}
                className={`py-[0.5vw] text-[0.85vw] font-bold rounded-[0.5vw] border transition-all cursor-pointer flex items-center justify-center gap-[0.3vw] ${selected === t.k ? `${t.c}` : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400"}`}
              >
                <span className="text-[0.78vw]">{t.e}</span>
                <span>{t.l}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selected === "Open" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-blue-50 border border-blue-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-visible shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-blue-900  ">
                  Request Support / Escalate
                </div>
                <div className="flex flex-col gap-[0.5vw]">
                  <div className="relative" ref={dropdownRef}>
                    <div className="absolute inset-y-0 left-0 pl-[0.8vw] flex items-center pointer-events-none">
                      <Search className="h-[0.9vw] w-[0.9vw] text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedPerson(null);
                        setShowDropdown(true);
                      }}
                      placeholder="Search person or department..."
                      className="w-full border border-slate-400 rounded-[0.5vw] pl-[2vw] pr-[0.7vw] py-[0.5vw] text-[0.75vw] font-bold outline-none bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                    />
                    {showDropdown && candidates.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 border border-slate-400 bg-white rounded-b-[0.5vw] max-h-[12vw] overflow-y-auto divide-y divide-slate-200 shadow-lg mt-[-0.1vw]">
                        {candidates.map((emp) => (
                          <div
                            key={emp.userId}
                            onClick={() => {
                              setSelectedPerson(emp);
                              setSearch(emp.name);
                              setShowDropdown(false);
                            }}
                            className={`px-[0.7vw] py-[0.6vw] text-[0.72vw] font-bold cursor-pointer hover:bg-blue-50/65 flex justify-between items-center transition-colors ${selectedPerson?.userId === emp.userId ? "bg-blue-55 text-blue-950 font-black border-l-2 border-blue-600" : "text-slate-800"}`}
                          >
                            <span>
                              {emp.name} ({emp.department})
                            </span>
                            {selectedPerson?.userId === emp.userId && (
                              <CheckCircle className="w-[0.75vw] h-[0.75vw] text-blue-750" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide handover notes..."
                    className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm resize-none"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={handleSupport}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Assign Support Person
                </button>
              </motion.div>
            )}

            {selected === "Resolved" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-emerald-50 border border-emerald-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-emerald-900  ">
                  Resolution Details
                </div>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter details of fixed parts, logical adjustments, or resolution explanation..."
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.8vw] text-[0.78vw] font-semibold outline-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Resolved")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm Resolution
                </button>
              </motion.div>
            )}

            {selected === "Pending" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-50 border border-amber-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-amber-900  ">
                  Pending Reason
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Why is this call pending? (e.g., waiting for parts, client unavailable)"
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Pending")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-amber-600 hover:to-orange-655 transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Mark Pending
                </button>
              </motion.div>
            )}

            {selected === "FVRequired" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-[0.1vw] overflow-hidden"
              >
                <AssignVisitModal
                  type="Field Visit"
                  entry={entry}
                  product={prod}
                  currentUser={currentUser}
                  employees={propsEmployees}
                  inlineMode
                  onClose={() => setSelected("")}
                  onSave={async (f) => {
                    await onAssignFieldVisit(f, prodIdx);
                  }}
                />
              </motion.div>
            )}

            {selected === "ReverseEscalate" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-50 border border-rose-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[0.85vw] font-black text-rose-900 flex items-center gap-[0.35vw]">
                    <RotateCcw className="w-[0.9vw] h-[0.9vw]" /> Reverse Escalate (Send Back)
                  </div>
                  <span className="text-[0.68vw] bg-rose-100 text-rose-800 px-[0.45vw] py-[0.1vw] rounded font-semibold border border-rose-200">
                    Returns to Sender with SLA
                  </span>
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter reason for sending this call back to the previous engineer..."
                  className="w-full border border-slate-300 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting || !remarks.trim()}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      if (onReverseEscalate) {
                        await onReverseEscalate(prodIdx, remarks);
                        setSelected("");
                        setRemarks("");
                      }
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white disabled:opacity-60 rounded-[0.5vw] font-bold text-[0.75vw] transition-all shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : (
                    <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                  )}
                  Confirm Reverse Escalation
                </button>
              </motion.div>
            )}

            {selected === "Returned" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-50 border border-rose-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-rose-900">
                  Return to Assigned Person
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Reason for returning this to the original person..."
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Returned")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-rose-500 to-red-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-rose-600 hover:to-red-700 transition-all shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm Return
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// ── Escalation Card ───────────────────────────────────────────────────────────
const EscalationCard = ({
  entry,
  currentUser,
  employees,
  timer,
  isExpanded,
  onToggle,
  isPendingTab,
  isSupportDeskAsked,
  isSupportDeskAssigned,
  isFieldVisitTab,
  isAllocatedView,
  onSupportRequest,
  onAssignFieldVisit,
  onProductClose,
  onProductAttend,
  supportReq,
  onRefresh,
  onCloseVisit,
  onEditCall,
  onDeleteCall,
}) => {
  const [activeProductIdx, setActiveProductIdx] = useState(0);
  const [localTimer, setLocalTimer] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (timer) return;
    if (
      !entry.deadline ||
      entry.status === "Critical" ||
      entry.status === "Critical_Unresolved"
    )
      return;

    const update = () => {
      const now = new Date();
      const deadline = new Date(entry.deadline);
      const remainingMs = Math.max(0, deadline - now);
      const hours = Math.floor(remainingMs / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setLocalTimer({
        isExpired: remainingMs === 0,
        remainingFormatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [timer, entry.deadline]);

  const activeTimer =
    entry.status === "Critical" || entry.status === "Critical_Unresolved"
      ? null
      : timer || localTimer;

  const isProductActionable = (p, i) => {
    const isAdmin = currentUser?.department === "Admin";
    if (isAdmin) {
      if (p._resolved || p._productClosure?.status === "Closed") return false;
      return true;
    }

    if (supportReq) {
      return i === supportReq.productIdx;
    }
    if (isSupportDeskAsked) {
      return (
        p._assignedEngineerId === currentUser?.userId &&
        p._supportRequested &&
        p._productClosure?.status !== "Closed" &&
        !p._resolved
      );
    }
    if (isAllocatedView) {
      return (
        p._fieldVisit &&
        p._fieldVisit.assignedBy === currentUser?.userId &&
        p._fieldVisit.status !== "Closed"
      );
    }
    if (isFieldVisitTab) {
      return (
        p._fieldVisit &&
        p._fieldVisit.assignedTo === currentUser?.userId &&
        p._fieldVisit.status !== "Closed" &&
        p._fieldVisit.status !== "Returned"
      );
    }
    if (isPendingTab) {
      return (
        p._assignedEngineerId === currentUser?.userId &&
        p._productClosure?.status === "Pending" &&
        !p._supportRequested
      );
    }
    if (isSupportDeskAssigned) {
      return (
        p._supportRequested &&
        p._supportPersonId === currentUser?.userId &&
        p._productClosure?.status !== "Closed" &&
        !p._resolved
      );
    }

    // Escalation Tab (default)
    return (
      p._assignedEngineerId === currentUser?.userId &&
      !p._resolved &&
      p._productClosure?.status !== "Closed" &&
      p._productClosure?.status !== "Pending" &&
      !p._supportRequested
    );
  };

  const getReadOnlyBlock = (p) => {
    const supportPersonEmp = employees?.find(
      (e) => e.userId === p._supportPersonId,
    );
    const supportPersonText = supportPersonEmp
      ? `${supportPersonEmp.name} (${supportPersonEmp.department})`
      : p._supportPersonName || "Support Team";

    if (
      p._resolved ||
      p._productClosure?.status === "Closed" ||
      (p._fieldVisit && p._fieldVisit.status === "Closed")
    ) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[0.6vw] p-[1vw]">
          <div className="text-emerald-800 font-bold text-[0.9vw] mb-[0.4vw]">
            Status:{" "}
            {p._productClosure?.status === "Closed" || p._resolved
              ? p._productClosure?.status || "Resolved"
              : "Field Visit Completed"}
          </div>
          <p className="text-[0.8vw] text-emerald-700 font-bold">
            Remarks:{" "}
            {p._productClosure?.remarks || p.remarks || "No remarks provided."}
          </p>
        </div>
      );
    }
    if (p._supportRequested) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-[0.6vw] p-[1vw]">
          <div className="text-amber-800 font-bold text-[0.9vw] mb-[0.4vw]">
            Sent for Support to: {supportPersonText}
          </div>
          <p className="text-[0.8vw] text-amber-700 font-bold">
            Remarks: Awaiting resolution from support team.
          </p>
        </div>
      );
    }
    if (p._productClosure?.status === "Pending") {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-[0.6vw] p-[1vw]">
          <div className="text-orange-800 font-bold text-[0.9vw] mb-[0.4vw]">
            Status: Pending
          </div>
          <p className="text-[0.8vw] text-orange-700 font-bold">
            Remarks:{" "}
            {p._productClosure?.remarks || p.remarks || "No remarks provided."}
          </p>
        </div>
      );
    }
    if (
      p._productClosure?.status === "Field Visit Required" ||
      p._fieldVisit?.isAssigned
    ) {
      return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-[0.6vw] p-[1vw]">
          <div className="text-indigo-800 font-bold text-[0.9vw] mb-[0.4vw]">
            {p._fieldVisit?.isAssigned
              ? `Field Visit Assigned to ${p._fieldVisit.assignedToName}`
              : "Status: Field Visit Required"}
          </div>
          <p className="text-[0.8vw] text-indigo-700 font-bold">
            Remarks:{" "}
            {p._fieldVisit?.diagnosisSummary ||
              p._productClosure?.remarks ||
              p.remarks ||
              "Field visit has been requested."}
          </p>
        </div>
      );
    }

    if (!p._attended) {
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-[0.6vw] p-[1vw]">
          <div className="text-rose-800 font-bold text-[0.9vw] mb-[0.4vw]">
            Status: Escalating
          </div>
          <p className="text-[0.8vw] text-rose-700 font-bold">
            Remarks: {p.remarks || "Not yet attended by assigned engineer."}
          </p>
        </div>
      );
    }

    // Default fallback for other open products
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-[0.6vw] p-[1vw]">
        <div className="text-blue-800 font-bold text-[0.9vw] mb-[0.4vw]">
          Status:{" "}
          {p._assignedEngineerName
            ? `Assigned to ${p._assignedEngineerName}`
            : "Open"}
        </div>
        <p className="text-[0.8vw] text-blue-700 font-bold">
          Remarks: {p.remarks || "No remarks provided."}
        </p>
      </div>
    );
  };

  const openProducts = useMemo(() => {
    return (entry.products || [])
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        if (isFieldVisitTab) {
          return p._fieldVisit && p._fieldVisit.status !== "Closed";
        }
        if (
          isSupportDeskAsked &&
          p._productClosure?.status === "Field Visit Required"
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aActionable = isProductActionable(a.p, a.i);
        const bActionable = isProductActionable(b.p, b.i);
        return aActionable === bActionable ? 0 : aActionable ? -1 : 1;
      });
  }, [
    entry.products,
    currentUser,
    isPendingTab,
    supportReq,
    isSupportDeskAsked,
    isAllocatedView,
    isFieldVisitTab,
  ]);

  const recordedTime = useMemo(() => {
    if (supportReq) return supportReq.createdAt;
    if (isPendingTab) {
      const pendingProd = openProducts.find(
        (op) => op.p._productClosure?.status === "Pending",
      )?.p;
      return pendingProd?._productClosure?.date || entry.dateTime;
    }
    if (isSupportDeskAsked) {
      const supportProd = openProducts.find((op) => op.p._supportRequested)?.p;
      return supportProd?._supportRequestedAt || entry.dateTime;
    }
    if (entry.assignmentDate) return entry.assignmentDate;
    const assignedProd = openProducts.find(
      (op) => op.p._assignedEngineerId === currentUser?.userId,
    )?.p;
    return assignedProd?._assignedAt || entry.dateTime;
  }, [
    supportReq,
    isPendingTab,
    isSupportDeskAsked,
    openProducts,
    entry,
    currentUser,
  ]);

  const formattedTime = new Date(recordedTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const clampedIdx = Math.min(
    activeProductIdx,
    Math.max(0, openProducts.length - 1),
  );
  const activeProdObj = openProducts[clampedIdx];
  const activeProd = activeProdObj?.p;
  const safeActiveIdx = activeProdObj?.i ?? 0;

  return (
    <motion.div
      layout
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-[0.8vw] border overflow-visible transition-all duration-300 ${
        isExpanded ? "col-span-full shadow-lg" : ""
      } ${
        entry.status === "Resolved"
          ? "border-emerald-350 shadow-md shadow-emerald-500/5 bg-gradient-to-br from-white to-emerald-50/10"
          : isPendingTab
            ? "border-amber-350 shadow-md shadow-amber-500/5 bg-gradient-to-br from-white to-amber-50/20"
            : "border-slate-400 shadow-sm hover:shadow-md hover:border-slate-400 bg-gradient-to-br from-white to-slate-50/20"
      }`}
    >
      <div
        className="px-[1vw] pt-[0.9vw] pb-[0.7vw] cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-[0.8vw]"
        onClick={onToggle}
      >
        <div className="flex flex-col gap-[0.5vw] w-full">
          {/* Top Row: Call details and Chevron at the very end */}
          <div className="flex justify-between items-center w-full">
            <span className="font-mono text-[1vw] font-bold text-slate-900 shrink-0">
              {entry.callNumber}
            </span>

            <div className="flex items-center justify-end gap-[0.5vw] ml-auto">
              <Badge
                label={entry.priority}
                color={entry.priority === "Critical" ? "red" : "slate"}
              />
              {entry.customerType && (
                <Badge label={entry.customerType} color="cyan" />
              )}
              {entry.locationType && (
                <Badge
                  label={entry.locationType}
                  color={
                    entry.locationType.toLowerCase() === "site"
                      ? "orange"
                      : "indigo"
                  }
                />
              )}
              <Badge
                label={`${entry.products?.length || 0} Products`}
                color="indigo"
              />
              <div className="flex items-center gap-[0.3vw] text-slate-500 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.25vw] rounded-[0.4vw] text-[0.7vw] font-bold shadow-sm">
                <Clock className="w-[0.75vw] h-[0.75vw]" />
                {formattedTime}
              </div>
              {!!supportReq && supportReq?.askedByName && (
                <Badge
                  label={`Requested by: ${supportReq.askedByName}`}
                  color="amber"
                />
              )}

              <div className="p-[0.3vw] rounded-full hover:bg-slate-100 transition-colors shrink-0 ml-[0.5vw]">
                {isExpanded ? (
                  <ChevronUp className="w-[1.2vw] h-[1.2vw] text-slate-700" />
                ) : (
                  <ChevronDown className="w-[1.2vw] h-[1.2vw] text-slate-700" />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Customer Name and View History */}
          <div className="text-[0.9vw] text-slate-800 font-semibold flex items-center gap-[0.3vw] w-full">
            <User className="w-[0.8vw] h-[0.8vw] text-slate-650" />
            {entry.customerName}
            {!isExpanded && entry.products && entry.products.length > 0 && (
              <span className="text-slate-500 font-medium ml-[0.3vw] truncate max-w-[20vw]">
                •{" "}
                {entry.products
                  .map((p) => p.productModel || p.itemCode)
                  .join(", ")}
              </span>
            )}

            <div className="flex items-center gap-[0.6vw] ml-auto">
              {entry.status !== "Resolved" &&
                !entry.products?.some((p) => p._attended) &&
                activeTimer && (
                  <div
                    className={`flex items-center gap-[0.3vw] px-[0.6vw] py-[0.3vw] rounded-[0.4vw] font-mono text-[0.8vw] font-semibold border shadow-sm ${activeTimer.isExpired ? "bg-rose-55 text-rose-700 border-rose-350 animate-pulse" : "bg-amber-100 text-amber-800 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.25)]"}`}
                  >
                    <Clock className="w-[0.85vw] h-[0.85vw]" />
                    {activeTimer.remainingFormatted}
                  </div>
                )}
              {entry.status === "Critical" &&
                !entry.products?.some((p) => p._attended) &&
                !activeTimer && (
                  <div
                    className={`flex items-center gap-[0.3vw] px-[0.5vw] py-[0.3vw] rounded-[0.4vw] font-mono text-[0.75vw] font-bold border shadow-sm bg-red-100 text-red-800 border-red-400 animate-pulse whitespace-nowrap`}
                  >
                    <AlertTriangle className="w-[0.8vw] h-[0.8vw]" /> SLA
                    EXHAUSTED
                  </div>
                )}
              {/* Edit and Delete for Creator Employee */}
              {entry.registeredBy === currentUser?.userId && onEditCall && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCall(entry);
                  }}
                  title="Edit Call"
                  className="flex items-center gap-[0.2vw] text-[0.75vw] text-blue-600 font-bold hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-[0.45vw] py-[0.18vw] rounded transition-colors cursor-pointer border border-blue-200"
                >
                  <Edit3 className="w-[0.75vw] h-[0.75vw]" />
                  Edit
                </button>
              )}

              {entry.registeredBy === currentUser?.userId && onDeleteCall && (
                (() => {
                  const hasReportsOrClosed = (entry.products || []).some(
                    (p) => p._productClosure?.status || p._resolved || (p._fieldVisit && p._fieldVisit.status === "Closed")
                  );
                  return (
                    <button
                      type="button"
                      disabled={hasReportsOrClosed}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasReportsOrClosed) return;
                        onDeleteCall(entry);
                      }}
                      title={hasReportsOrClosed ? "Cannot delete: Report or closure already submitted for this call" : "Delete Call"}
                      className={`flex items-center gap-[0.2vw] text-[0.75vw] font-bold px-[0.45vw] py-[0.18vw] rounded transition-colors border ${
                        hasReportsOrClosed
                          ? "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                          : "text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border-red-200 cursor-pointer"
                      }`}
                    >
                      <Trash2 className="w-[0.75vw] h-[0.75vw]" />
                      Delete
                    </button>
                  );
                })()
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(true);
                }}
                className="flex items-center gap-[0.2vw] text-[0.75vw] text-indigo-600 font-bold hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-[0.4vw] py-[0.15vw] rounded transition-colors cursor-pointer"
              >
                <History className="w-[0.7vw] h-[0.7vw]" />
                View History
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-visible"
          >
            <ContactInfoBar
              entry={entry}
              onViewHistory={() => setShowHistory(true)}
            />

            <div className="border-t border-slate-400 bg-slate-50/40">
              {openProducts.length > 0 && (
                <div className="flex border-b border-slate-400 bg-white px-[0.9vw] pt-[0.6vw] gap-[0.3vw] overflow-x-auto">
                  {openProducts.map(({ i: realIdx, p }, tabIdx) => {
                    const isHandled = !isProductActionable(p, realIdx);

                    const getTabColors = (prod) => {
                      if (
                        prod._resolved ||
                        prod._productClosure?.status === "Closed"
                      ) {
                        return {
                          active:
                            "border-emerald-500 text-emerald-800 bg-emerald-50 shadow-sm",
                          inactive:
                            "border-transparent text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/70",
                          badge:
                            "border-emerald-400 text-emerald-700 bg-emerald-50/50",
                          segment:
                            "bg-emerald-50 text-emerald-800 border-emerald-300",
                        };
                      }
                      if (prod._productClosure?.status === "Pending") {
                        return {
                          active:
                            "border-amber-500 text-amber-800 bg-amber-50 shadow-sm",
                          inactive:
                            "border-transparent text-amber-600 hover:text-amber-800 hover:bg-amber-50/70",
                          badge:
                            "border-amber-400 text-amber-700 bg-amber-50/50",
                          segment:
                            "bg-amber-50 text-amber-800 border-amber-300",
                        };
                      }
                      if (
                        prod._productClosure?.status ===
                          "Field Visit Required" ||
                        prod._fieldVisit?.isAssigned
                      ) {
                        return {
                          active:
                            "border-indigo-500 text-indigo-800 bg-indigo-50 shadow-sm",
                          inactive:
                            "border-transparent text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/70",
                          badge:
                            "border-indigo-400 text-indigo-700 bg-indigo-50/50",
                          segment:
                            "bg-indigo-50 text-indigo-800 border-indigo-300",
                        };
                      }
                      if (prod._supportRequested) {
                        return {
                          active:
                            "border-cyan-500 text-cyan-800 bg-cyan-50 shadow-sm",
                          inactive:
                            "border-transparent text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50/70",
                          badge: "border-cyan-400 text-cyan-700 bg-cyan-50/50",
                          segment: "bg-cyan-50 text-cyan-800 border-cyan-300",
                        };
                      }
                      // Escalation / Open
                      return {
                        active:
                          "border-blue-500 text-blue-800 bg-blue-50 shadow-sm",
                        inactive:
                          "border-transparent text-blue-600 hover:text-blue-800 hover:bg-blue-50/70",
                        badge: "border-blue-400 text-blue-700 bg-blue-50/50",
                        segment: "bg-blue-50 text-blue-800 border-blue-300",
                      };
                    };

                    const colors = getTabColors(p);
                    const activeClasses = colors.active;
                    const inactiveClasses = colors.inactive;
                    const badgeClasses = colors.badge;

                    return (
                      <button
                        key={realIdx}
                        onClick={() => setActiveProductIdx(tabIdx)}
                        className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.6vw] rounded-t-[0.5vw] border-b-2 text-[0.85vw] font-bold transition-all whitespace-nowrap cursor-pointer ${clampedIdx === tabIdx ? activeClasses : inactiveClasses}`}
                      >
                        <span
                          className={`w-[1.2vw] h-[1.2vw] flex-shrink-0 rounded-full border-[1.5px] flex items-center justify-center text-[0.65vw] font-black shadow-sm ${badgeClasses}`}
                        >
                          {tabIdx + 1}
                        </span>
                        <span>
                          {p.productModel ||
                            p.itemCode ||
                            `Product ${realIdx + 1}`}
                        </span>
                        {(p._assignedSegment || p.productSegment) && (
                          <span
                            className={`text-[0.65vw] ml-[0.3vw] border px-[0.4vw] py-[0.1vw] rounded font-bold shadow-sm ${colors.segment}`}
                          >
                            {p._assignedSegment || p.productSegment}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {openProducts.length === 0 ? (
                <div className="p-[1.4vw] text-center text-[0.8vw] text-slate-600 font-bold">
                  All products handled in this view.
                </div>
              ) : activeProd ? (
                <div className="p-[0.9vw] flex flex-col gap-[0.9vw]">
                  <div className="w-full">
                    <IssueDetailsContainer product={activeProd} />
                  </div>

                  <div className="w-full">
                    {!isProductActionable(activeProd, safeActiveIdx) ? (
                      getReadOnlyBlock(activeProd)
                    ) : isAllocatedView ? (
                      <AllocatedActionPanel
                        entry={entry}
                        product={activeProd}
                        productIdx={safeActiveIdx}
                        onAssignFieldVisit={onAssignFieldVisit}
                        onProductClose={onProductClose}
                        employees={employees}
                        currentUser={currentUser}
                      />
                    ) : isFieldVisitTab ? (
                      <FieldVisitActionPanel
                        entry={entry}
                        product={activeProd}
                        productIdx={safeActiveIdx}
                        currentUser={currentUser}
                        onRefresh={onRefresh}
                      />
                    ) : supportReq ? (
                      <SupportReqActionPanel
                        req={supportReq}
                        currentUser={currentUser}
                        employees={employees}
                        entry={entry}
                        product={activeProd}
                        onDone={onRefresh}
                        onAssignFieldVisit={onAssignFieldVisit}
                        onProductClose={onProductClose}
                        productIdx={safeActiveIdx}
                      />
                    ) : (
                      <>
                        {isSupportDeskAsked && activeProd._supportRequested && (
                          <div
                            className={`border rounded-[0.6vw] p-[0.7vw] mb-[0.8vw] shadow-sm ${activeProd._supportPersonId ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}
                          >
                            {activeProd._supportPersonId ? (
                              <div className="flex items-center gap-[0.5vw] text-amber-800 text-[0.8vw] font-bold">
                                <HelpCircle className="w-[1vw] h-[1vw]" />
                                {(() => {
                                  const emp = employees?.find(
                                    (e) =>
                                      e.userId === activeProd._supportPersonId,
                                  );
                                  const t = emp
                                    ? `${emp.name} (${emp.department})`
                                    : activeProd._supportPersonName ||
                                      "Support Team";
                                  return `Sent for Support to: ${t}. You can still resolve or take action on this product below.`;
                                })()}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-[0.2vw]">
                                <div className="flex items-center gap-[0.5vw] text-rose-800 text-[0.85vw] font-bold">
                                  <AlertCircle className="w-[1vw] h-[1vw]" />
                                  {(() => {
                                    const returnEvent = activeProd._history
                                      ?.slice()
                                      .reverse()
                                      .find(
                                        (h) =>
                                          h.status === "Returned from Support",
                                      );
                                    const empId = returnEvent?.updatedBy;
                                    const name =
                                      returnEvent?.updatedByName ||
                                      "Support Team";
                                    const emp = employees?.find(
                                      (e) => e.userId === empId,
                                    );
                                    return `Returned by ${name}${emp?.department ? ` (${emp.department})` : ""}`;
                                  })()}
                                </div>
                                <div className="text-[0.8vw] text-rose-700 font-bold ml-[1.5vw]">
                                  Remarks:{" "}
                                  {activeProd._productClosure?.remarks ||
                                    "No remarks provided."}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isSupportDeskAssigned &&
                          activeProd._supportRequested && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-[0.6vw] p-[0.7vw] mb-[0.8vw] flex flex-col gap-[0.2vw] shadow-sm">
                              <div className="flex items-center gap-[0.5vw] text-cyan-800 text-[0.85vw] font-bold">
                                <HelpCircle className="w-[1vw] h-[1vw]" />
                                {(() => {
                                  const requesterEmp = employees?.find(
                                    (e) =>
                                      e.userId ===
                                      activeProd._assignedEngineerId,
                                  );
                                  const requesterText = requesterEmp
                                    ? `${requesterEmp.name} (${requesterEmp.department})`
                                    : activeProd._assignedEngineerName ||
                                      "Unknown";
                                  return `Support Requested by: ${requesterText}`;
                                })()}
                              </div>
                              <div className="text-[0.8vw] text-cyan-700 font-bold ml-[1.5vw]">
                                Please resolve this issue or mark it as Pending
                                / Field Visit.
                              </div>
                            </div>
                          )}
                        <ProductClosurePanel
                          prod={activeProd}
                          prodIdx={safeActiveIdx}
                          entry={entry}
                          currentUser={currentUser}
                          employees={employees}
                          onAssignFieldVisit={onAssignFieldVisit}
                          onProductClose={onProductClose}
                          onSupportRequest={onSupportRequest}
                          onProductAttend={onProductAttend}
                          isPendingTab={isPendingTab}
                          isSupportDeskAsked={isSupportDeskAsked}
                          isSupportDeskAssigned={isSupportDeskAssigned}
                        />
                      </>
                    )}
                  </div>

                  {(() => {
                    const actionable = isProductActionable(
                      activeProd,
                      safeActiveIdx,
                    );
                    const isAnyAttended = entry.products?.some(
                      (p) =>
                        p._assignedEngineerId === currentUser?.userId &&
                        p._attended,
                    );

                    // If they need to click "Attend" (actionable and not attended), hide history
                    if (actionable && !isAnyAttended && !activeProd._attended) {
                      return null;
                    }

                    return (
                      <ProductHistoryTimeline
                        history={activeProd._history}
                        employees={employees}
                        currentUser={currentUser}
                      />
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showHistory && (
        <CustomerHistoryModal
          identifier={entry.partyCode || entry.customerName}
          onClose={() => setShowHistory(false)}
        />
      )}
    </motion.div>
  );
};

// ── Tab Components ────────────────────────────────────────────────────────────
const PendingTab = ({
  queue,
  currentUser,
  employees,
  onProductClose,
  onAssignFieldVisit,
  onSupportRequest,
  onProductAttend,
  onOpenRespond,
  onOpenHistory,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const items = useMemo(() => {
    return (queue || []).filter((e) => {
      const hasUserProducts = (e.products || []).some(
        (p) =>
          p._assignedEngineerId === currentUser?.userId &&
          p._productClosure?.status === "Pending" &&
          !p._supportRequested,
      );
      return hasUserProducts;
    });
  }, [queue, currentUser]);

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.5vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
            <AlertCircle className="w-[0.95vw] h-[0.95vw] text-amber-500" />
            Pending Checks Queue
          </span>
          <span className="text-[0.68vw] bg-amber-50 border border-amber-200 text-amber-700 px-[0.45vw] py-[0.1vw] rounded-full font-bold">
            {items.length} Pending
          </span>
        </div>
        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{items.length}</span> calls
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
            <tr className="bg-[#e9edf4]">
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Date & Time
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Error Code
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[11vw]">
                Pending Remarks
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[9vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const userProds = (row.products || []).filter(
                  (p) =>
                    p._assignedEngineerId === currentUser?.userId &&
                    p._productClosure?.status === "Pending" &&
                    !p._supportRequested
                );
                const allProducts = userProds.length > 0 ? userProds : (row.products || [{}]);
                const rowCount = allProducts.length;
                const rowId = row.id || row._id || row.callId;

                return allProducts.map((prod, pIdx) => {
                  const actualIdx = (row.products || []).findIndex((p) => p === prod || (p.serialNumber && p.serialNumber === prod.serialNumber));
                  const safeIdx = actualIdx !== -1 ? actualIdx : pIdx;

                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="transition-colors bg-white hover:bg-amber-50/20"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                        >
                          {(() => {
                            try {
                              const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                              if (isNaN(d.getTime())) return row.dateTime || "—";
                              return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) +
                                ", " +
                                d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                            } catch {
                              return row.dateTime || "—";
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                            {row.callNumber || row.callNo}
                          </div>
                          <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                            {rowCount} Pending Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                        >
                          <div className="font-semibold text-slate-900 text-[0.82vw]">
                            {row.customerName || row.partyDescription}
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                            {row.partyCode && (
                              <span className="text-[0.68vw] text-slate-500 font-mono">
                                {row.partyCode}
                              </span>
                            )}
                            {row.customerType && (
                              <span
                                className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        <div className="font-medium text-slate-850 text-[0.8vw]">
                          {prod?.productModel || prod?.itemCode || "—"}
                        </div>
                        {prod?.serialNumber && (
                          <div className="text-[0.68vw] text-slate-500 font-mono">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap">
                        {prod?.errorCode ? (
                          <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.12vw] rounded text-[0.74vw] font-mono font-medium">
                            {prod.errorCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[0.76vw]">-</span>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                            if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                            else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                            else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            return (
                              <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        <span className="inline-flex items-center gap-[0.25vw] text-amber-800 font-bold text-[0.72vw] bg-amber-50 border border-amber-200 px-[0.45vw] py-[0.1vw] rounded mb-[0.2vw]">
                          <AlertCircle className="w-[0.7vw] h-[0.7vw] text-amber-600" /> Pending Check
                        </span>
                        <div className="text-[0.74vw] text-slate-700 line-clamp-2">
                          {prod._productClosure?.remarks || "No pending remarks recorded"}
                        </div>
                      </td>

                      <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Respond / Resolve"
                          >
                            <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                            title="View History"
                          >
                            <History className="w-[0.95vw] h-[0.95vw]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-[4vw] text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                    <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <AlertCircle className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-bold text-slate-700">No pending checks found</p>
                    <p className="text-[0.75vw] text-slate-400">All checks and tasks are up to date.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
        <div className="text-[0.75vw] text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-800">{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-bold text-slate-800">{Math.min(page * pageSize, items.length)}</span> of{" "}
          <span className="font-bold text-slate-800">{items.length}</span> entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
          </button>
          <div className="flex gap-[0.3vw]">
            {[...Array(totalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AllocatedActionPanel = ({
  entry,
  product,
  productIdx,
  onAssignFieldVisit,
  onProductClose,
  employees,
  currentUser,
}) => {
  const isReturned = product._fieldVisit?.status === "Returned";
  const [showAssign, setShowAssign] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm overflow-hidden mt-[0.5vw]">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-[1vw] flex justify-between items-center">
        <h4 className="text-[0.9vw] font-black text-indigo-950 flex items-center gap-[0.5vw]">
          <MapPin className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
          Field Visit Allocation
        </h4>
        <Badge
          label={isReturned ? "Returned" : "Pending Action"}
          color={isReturned ? "amber" : "indigo"}
        />
      </div>
      <div className="p-[1vw] space-y-[0.8vw]">
        {isReturned && (
          <div className="bg-amber-50 border border-amber-200 rounded-[0.5vw] p-[0.8vw] text-amber-800 text-[0.8vw] font-bold">
            This field visit was returned by{" "}
            {product._fieldVisit.assignedToName}.
          </div>
        )}
        <div className="flex flex-col gap-[0.3vw]">
          <span className="text-[0.75vw] font-bold text-slate-500 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-[0.85vw] font-bold text-slate-800 bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Assigned To
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
        </div>
      </div>
      {isReturned && (
        <div className="p-[1vw] border-t border-slate-200 bg-slate-50/50 flex flex-col gap-[0.8vw]">
          <div className="flex gap-[0.5vw]">
            <button
              onClick={() => {
                setShowResolve(false);
                setShowAssign(!showAssign);
              }}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                showAssign
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              Re-assign Field Visit
            </button>
            <button
              onClick={() => {
                setShowAssign(false);
                setShowResolve(!showResolve);
              }}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                showResolve
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Resolve Product
            </button>
          </div>

          <AnimatePresence>
            {showAssign && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-[0.5vw] overflow-hidden"
              >
                <AssignVisitModal
                  employees={employees}
                  currentUser={currentUser}
                  type="Field Visit"
                  inlineMode={true}
                  onClose={() => setShowAssign(false)}
                  onSave={async (form) => {
                    await onAssignFieldVisit(form, productIdx);
                    setShowAssign(false);
                  }}
                />
              </motion.div>
            )}
            {showResolve && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-[0.5vw] overflow-hidden p-[0.7vw] border border-emerald-350 rounded-[0.5vw] bg-emerald-50/30 space-y-[0.6vw]"
              >
                <div className="text-[0.68vw] font-black text-emerald-900">
                  Resolution Remarks
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide details of steps taken to resolve..."
                  className="w-full border border-slate-400 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
                />
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!remarks.trim()) {
                      alert("Please provide resolution remarks.");
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      await onProductClose(productIdx, {
                        status: "Resolved",
                        remarks,
                      });
                      setShowResolve(false);
                      setRemarks("");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full py-[0.5vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-[0.3vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm & Close Task
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ── Field Visit Action Panel ──────────────────────────────────────────────────
const FieldVisitActionPanel = ({
  entry,
  product,
  productIdx,
  currentUser,
  onRefresh,
}) => {
  const { toast } = useNotification();
  const [action, setAction] = useState(null); // 'reschedule', 'return', 'resolve'
  const [remarks, setRemarks] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!remarks) {
      toast("Please provide remarks.", "error");
      return;
    }
    if (action === "reschedule" && !visitDate) {
      toast("Please select a new visit date.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === "reschedule") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/reschedule`,
          {
            productIdx,
            visitDate,
            remarks,
            userId: currentUser?.userId,
            userName: currentUser?.name,
          },
        );
        toast("Field visit rescheduled successfully", "success");
      } else if (action === "return") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/return`,
          {
            productIdx,
            remarks,
            userId: currentUser?.userId,
            userName: currentUser?.name,
          },
        );
        toast("Field visit returned successfully", "success");
      } else if (action === "resolve") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/close`,
          {
            productIdx,
            remarks,
            closedBy: currentUser?.userId,
            closedByName: currentUser?.name,
          },
        );
        toast("Field visit resolved successfully", "success");
      }

      setAction(null);
      setRemarks("");
      setVisitDate("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Action error:", err);
      toast(`Failed to ${action} field visit`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm overflow-hidden mt-[0.5vw]">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-[1vw] flex justify-between items-center">
        <h4 className="text-[0.9vw] font-black text-indigo-950 flex items-center gap-[0.5vw]">
          <MapPin className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
          Field Visit Details
        </h4>
        <Badge
          label={`Visit Date: ${new Date(product._fieldVisit.visitDate).toLocaleDateString()}`}
          color="indigo"
        />
      </div>
      <div className="p-[1vw] space-y-[0.8vw]">
        <div className="flex flex-col gap-[0.3vw]">
          <span className="text-[0.75vw] font-bold text-slate-500 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-[0.85vw] font-bold text-slate-800 bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Assigned To
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Requested By
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedByName}
            </span>
          </div>
        </div>
      </div>
      {product._fieldVisit.assignedTo === currentUser?.userId && (
        <div className="p-[1vw] border-t border-slate-200 bg-slate-50/50 flex flex-col gap-[0.8vw]">
          <div className="flex gap-[0.5vw]">
            <button
              onClick={() => setAction("reschedule")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                action === "reschedule"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
              }`}
            >
              Reschedule Date
            </button>
            <button
              onClick={() => setAction("return")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                action === "return"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}
            >
              Return
            </button>
            <button
              onClick={() => setAction("resolve")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                action === "resolve"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Resolve
            </button>
          </div>

          <AnimatePresence>
            {action && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-[0.6vw]"
              >
                {action === "reschedule" && (
                  <div className="flex flex-col gap-[0.2vw]">
                    <label className="text-[0.7vw] font-bold text-slate-600">
                      New Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-[0.5vw] text-[0.75vw] border border-slate-300 rounded-[0.4vw]"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-[0.2vw]">
                  <label className="text-[0.7vw] font-bold text-slate-600">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    className="w-full p-[0.5vw] text-[0.75vw] border border-slate-300 rounded-[0.4vw] min-h-[4vw] resize-y"
                  />
                </div>
                <div className="flex justify-end gap-[0.5vw]">
                  <button
                    onClick={() => setAction(null)}
                    className="px-[1vw] py-[0.4vw] text-slate-600 hover:text-slate-800 text-[0.75vw] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-[1.2vw] py-[0.4vw] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold shadow-sm cursor-pointer flex items-center justify-center gap-[0.3vw]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                    ) : null}
                    Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const SupportReqActionPanel = ({
  req,
  currentUser,
  employees,
  entry,
  product,
  onDone,
  onAssignFieldVisit,
  onProductClose,
}) => {
  const [selected, setSelected] = useState("");
  const [resolutionType, setResType] = useState("Fixed");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = async () => {
    if (!remarks.trim()) {
      alert("Please provide resolution notes.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.patch(`${API_URL}/service-calls/support/${req._id}/resolve`, {
        status: "Resolved",
        resolutionNotes: remarks,
        resolutionType,
        resolvedAt: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      alert("Failed to resolve support request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    {
      k: "Resolved",
      l: "Resolve",
      e: "✓",
      c: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/15",
    },
    {
      k: "FVRequired",
      l: "Field Visit",
      e: "📍",
      c: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/15",
    },
  ];

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.6vw]">
      <div className={`grid gap-[0.4vw] grid-cols-2`}>
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setSelected(selected === t.k ? "" : t.k)}
            className={`py-[0.5vw] text-[0.85vw] font-bold rounded-[0.5vw] border transition-all cursor-pointer flex items-center justify-center gap-[0.3vw] ${selected === t.k ? `${t.c}` : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400"}`}
          >
            <span className="text-[0.78vw]">{t.e}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected === "Resolved" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-[0.7vw] border border-emerald-350 rounded-[0.5vw] bg-emerald-50/30 space-y-[0.6vw] shadow-inner overflow-hidden"
          >
            <div className="text-[0.68vw] font-black text-emerald-900  ">
              Resolution Action
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[0.4vw]">
              {RESOLUTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setResType(t)}
                  className={`py-[0.35vw] rounded-[0.4vw] border text-[0.65vw] transition-all font-bold cursor-pointer ${resolutionType === t ? "bg-emerald-600 border-emerald-650 text-white shadow-sm shadow-emerald-500/10" : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows="2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide details of steps taken to resolve..."
              className="w-full border border-slate-400 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
            />
            <button
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-full py-[0.5vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-[0.3vw]"
            >
              {isSubmitting ? (
                <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
              ) : null}
              Confirm & Close Task
            </button>
          </motion.div>
        )}

        {selected === "FVRequired" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="  overflow-hidden"
          >
            <AssignVisitModal
              inlineMode
              type="Field Visit"
              entry={entry}
              product={product}
              currentUser={currentUser}
              employees={employees}
              onClose={() => setSelected("")}
              onSave={async (form) => {
                await onAssignFieldVisit(form, req.productIdx);
                setSelected("");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SupportRequestsTab = ({
  currentUser,
  onRefresh,
  queue,
  employees,
  onProductClose,
  onAssignFieldVisit,
  onSupportRequest,
  onProductAttend,
  onOpenRespond,
  onOpenHistory,
}) => {
  const [subView, setSubView] = useState("assigned"); // "assigned" | "asked"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const askedForSupportCalls = useMemo(() => {
    return (queue || []).filter((e) =>
      (e.products || []).some(
        (p) =>
          p._assignedEngineerId === currentUser?.userId &&
          p._supportRequested === true &&
          p._productClosure?.status !== "Field Visit Required" &&
          p._productClosure?.status !== "Closed"
      )
    );
  }, [queue, currentUser]);

  const assignedForSupportCalls = useMemo(() => {
    return (queue || []).filter((e) =>
      (e.products || []).some(
        (p) =>
          p._supportPersonId === currentUser?.userId &&
          p._supportRequested === true &&
          !p._resolved &&
          p._productClosure?.status !== "Closed" &&
          p._productClosure?.status !== "Field Visit Required"
      )
    );
  }, [queue, currentUser]);

  const currentItems = subView === "assigned" ? assignedForSupportCalls : askedForSupportCalls;

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, page, pageSize]);

  const totalPages = Math.ceil(currentItems.length / pageSize) || 1;

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.7vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
            <HelpCircle className="w-[0.95vw] h-[0.95vw] text-sky-600" />
            Support Desk
          </span>

          {/* Toggle pills */}
          <div className="flex items-center p-[0.2vw] bg-slate-200/70 rounded-[0.5vw] border border-slate-300">
            <button
              type="button"
              onClick={() => { setSubView("assigned"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "assigned" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "assigned" ? "bg-indigo-100 text-indigo-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {assignedForSupportCalls.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("asked"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "asked" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Asked by Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "asked" ? "bg-blue-100 text-blue-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {askedForSupportCalls.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{currentItems.length}</span> requests
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
            <tr className="bg-[#e9edf4]">
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Date & Time
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[12vw]">
                {subView === "assigned" ? "Requested By & Notes" : "Support Person & Status"}
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[9vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const targetProds = (row.products || []).filter((p) =>
                  subView === "assigned"
                    ? p._supportPersonId === currentUser?.userId && p._supportRequested
                    : p._assignedEngineerId === currentUser?.userId && p._supportRequested
                );
                const allProducts = targetProds.length > 0 ? targetProds : (row.products || [{}]);
                const rowCount = allProducts.length;
                const rowId = row.id || row._id || row.callId;

                return allProducts.map((prod, pIdx) => {
                  const actualIdx = (row.products || []).findIndex((p) => p === prod || (p.serialNumber && p.serialNumber === prod.serialNumber));
                  const safeIdx = actualIdx !== -1 ? actualIdx : pIdx;

                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="transition-colors bg-white hover:bg-sky-50/20"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                        >
                          {(() => {
                            try {
                              const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                              if (isNaN(d.getTime())) return row.dateTime || "—";
                              return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) +
                                ", " +
                                d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                            } catch {
                              return row.dateTime || "—";
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                            {row.callNumber || row.callNo}
                          </div>
                          <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                            {rowCount} Support Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                        >
                          <div className="font-semibold text-slate-900 text-[0.82vw]">
                            {row.customerName || row.partyDescription}
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                            {row.partyCode && (
                              <span className="text-[0.68vw] text-slate-500 font-mono">
                                {row.partyCode}
                              </span>
                            )}
                            {row.customerType && (
                              <span
                                className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        <div className="font-medium text-slate-850 text-[0.8vw]">
                          {prod?.productModel || prod?.itemCode || "—"}
                        </div>
                        {prod?.serialNumber && (
                          <div className="text-[0.68vw] text-slate-500 font-mono">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                            if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                            else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                            else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            return (
                              <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        {subView === "assigned" ? (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-slate-800">
                              From: {prod._assignedEngineerName || row.currentEngineerName || "Engineer"}
                            </div>
                            <div className="text-[0.72vw] text-slate-600 italic line-clamp-2 mt-[0.1vw]">
                              {prod._supportNotes || prod._productClosure?.remarks || "Need specialized support"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-sky-800">
                              Assigned to: {prod._supportPersonName || "Support Engineer"}
                            </div>
                            <span className="inline-block mt-[0.15vw] text-[0.68vw] bg-sky-50 text-sky-700 px-[0.4vw] py-[0.05vw] rounded border border-sky-200 font-medium">
                              Awaiting Return
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-sky-600 hover:bg-sky-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Respond to Request"
                          >
                            <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                            title="View History"
                          >
                            <History className="w-[0.95vw] h-[0.95vw]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-[4vw] text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                    <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <HelpCircle className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-bold text-slate-700">No support requests in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">Everything is in sync.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
        <div className="text-[0.75vw] text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-800">{currentItems.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-bold text-slate-800">{Math.min(page * pageSize, currentItems.length)}</span> of{" "}
          <span className="font-bold text-slate-800">{currentItems.length}</span> entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
          </button>
          <div className="flex gap-[0.3vw]">
            {[...Array(totalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-600"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

const VisitsTab = ({
  type = "Field Visit",
  queue,
  currentUser,
  onRefresh,
  employees,
  onAssignFieldVisit,
  onProductClose,
  onOpenRespond,
  onOpenHistory,
}) => {
  const [subView, setSubView] = useState("assigned"); // "assigned" | "allocated"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const activeProducts = useMemo(() => {
    const list = [];
    (queue || []).forEach((call) => {
      (call.products || []).forEach((p, pIdx) => {
        if (
          p._fieldVisit &&
          p._fieldVisit.status !== "Closed" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed"
        ) {
          list.push({ call, p, pIdx });
        }
      });
    });
    return list;
  }, [queue]);

  const allocatedVisits = useMemo(() => {
    return activeProducts.filter(
      ({ p }) =>
        p._fieldVisit.assignedBy === currentUser?.userId &&
        (p._fieldVisit.assignedTo !== currentUser?.userId || p._fieldVisit.status === "Returned")
    );
  }, [activeProducts, currentUser]);

  const assignedVisits = useMemo(() => {
    return activeProducts.filter(
      ({ p }) =>
        p._fieldVisit.assignedTo === currentUser?.userId &&
        p._fieldVisit.status !== "Returned"
    );
  }, [activeProducts, currentUser]);

  const getUniqueCalls = (visits) => {
    const callMap = new Map();
    visits.forEach(({ call, p, pIdx }) => {
      const id = call._id || call.callId || call.id;
      if (!callMap.has(id)) {
        callMap.set(id, { ...call, _matchingVisitProducts: [{ p, pIdx }] });
      } else {
        callMap.get(id)._matchingVisitProducts.push({ p, pIdx });
      }
    });
    return Array.from(callMap.values());
  };

  const currentCalls = useMemo(() => {
    const visits = subView === "assigned" ? assignedVisits : allocatedVisits;
    return getUniqueCalls(visits);
  }, [subView, assignedVisits, allocatedVisits]);

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentCalls.slice(start, start + pageSize);
  }, [currentCalls, page, pageSize]);

  const totalPages = Math.ceil(currentCalls.length / pageSize) || 1;

  const handleCloseVisit = async (callId, pIdx) => {
    try {
      await axios.patch(
        `${API_URL}/service-calls/field-visit/${callId}/close`,
        {
          productIdx: pIdx,
          closedBy: currentUser?.userId,
          closedByName: currentUser?.name,
        }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to close field visit");
    }
  };

  return (
    <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      {/* Top Toggle Bar */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-[0.7vw]">
          <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
            <MapPin className="w-[0.95vw] h-[0.95vw] text-purple-600" />
            Field Visits Desk
          </span>

          {/* Toggle pills */}
          <div className="flex items-center p-[0.2vw] bg-slate-200/70 rounded-[0.5vw] border border-slate-300">
            <button
              type="button"
              onClick={() => { setSubView("assigned"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "assigned" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "assigned" ? "bg-purple-100 text-purple-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {assignedVisits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setSubView("allocated"); setPage(1); }}
              className={`px-[0.7vw] py-[0.2vw] rounded-[0.4vw] text-[0.74vw] font-bold transition-all cursor-pointer flex items-center gap-[0.35vw] ${
                subView === "allocated" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Allocated by Me</span>
              <span className={`text-[0.62vw] px-[0.4vw] py-[0.02vw] rounded-full font-bold ${
                subView === "allocated" ? "bg-indigo-100 text-indigo-800" : "bg-slate-300/80 text-slate-700"
              }`}>
                {allocatedVisits.length}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[0.76vw] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{currentCalls.length}</span> visits
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
            <tr className="bg-[#e9edf4]">
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                Visit Date / Time
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                Call No
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                Customer & Site
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                Product / Issue
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                Priority
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[12vw]">
                {subView === "assigned" ? "Objective & Allocated By" : "Assigned Engineer & Status"}
              </th>
              <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[10vw]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((row) => {
                const visitProducts = row._matchingVisitProducts || [{ p: row.products?.[0] || {}, pIdx: 0 }];
                const rowCount = visitProducts.length;
                const rowId = row.id || row._id || row.callId;

                return visitProducts.map(({ p: prod, pIdx: safeIdx }, pIdx) => {
                  return (
                    <tr
                      key={`${rowId}-${pIdx}`}
                      className="transition-colors bg-white hover:bg-purple-50/20"
                    >
                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                        >
                          {(() => {
                            const dateVal = prod._fieldVisit?.visitDate || row.dateTime || row.timestamp || row.createdAt;
                            try {
                              const d = new Date(dateVal);
                              if (isNaN(d.getTime())) return dateVal || "—";
                              return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                            } catch {
                              return dateVal || "—";
                            }
                          })()}
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                        >
                          <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                            {row.callNumber || row.callNo}
                          </div>
                          <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                            {rowCount} Visit Item{rowCount > 1 ? "s" : ""}
                          </div>
                        </td>
                      )}

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                        >
                          <div className="font-semibold text-slate-900 text-[0.82vw]">
                            {row.customerName || row.partyDescription}
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                            {row.site && (
                              <span className="text-[0.68vw] text-slate-600 font-medium">
                                Site: {row.site}
                              </span>
                            )}
                            {row.customerType && (
                              <span
                                className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                  row.customerType,
                                )}`}
                              >
                                {row.customerType}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        <div className="font-medium text-slate-850 text-[0.8vw]">
                          {prod?.productModel || prod?.itemCode || "—"}
                        </div>
                        {prod?.serialNumber && (
                          <div className="text-[0.68vw] text-slate-500 font-mono">
                            SN: {prod.serialNumber}
                          </div>
                        )}
                        {prod?.callDescription && (
                          <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                            {prod.callDescription}
                          </div>
                        )}
                      </td>

                      {pIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                        >
                          {(() => {
                            const p = row.priority || "Medium";
                            let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                            if (p === "Urgent" || p === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                            else if (p === "High") badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                            else if (p === "Low") badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            return (
                              <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                {p}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                        {subView === "assigned" ? (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-slate-800">
                              By: {prod._fieldVisit?.assignedByName || "Lead"}
                            </div>
                            <div className="text-[0.72vw] text-slate-600 italic line-clamp-2 mt-[0.1vw]">
                              {prod._fieldVisit?.diagnosisSummary || "Onsite inspection required"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[0.76vw] font-semibold text-purple-800">
                              Assigned to: {prod._fieldVisit?.assignedToName || "Technician"}
                            </div>
                            <span className="inline-block mt-[0.15vw] text-[0.68vw] bg-purple-50 text-purple-700 px-[0.4vw] py-[0.05vw] rounded border border-purple-200 font-medium">
                              {prod._fieldVisit?.status || "In Progress"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-[0.4vw]">
                          <button
                            type="button"
                            onClick={() => onOpenRespond({ entry: row, callId: row.callId || row._id, prod, pIdx: safeIdx })}
                            className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Manage Field Visit / Closure"
                          >
                            <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenHistory(row)}
                            className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                            title="View History"
                          >
                            <History className="w-[0.95vw] h-[0.95vw]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-[4vw] text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-[0.6vw]">
                    <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      <MapPin className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                    </div>
                    <p className="text-[0.9vw] font-bold text-slate-700">No field visits in this queue</p>
                    <p className="text-[0.75vw] text-slate-400">All field visit allocations are up to date.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
        <div className="text-[0.75vw] text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-800">{currentCalls.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-bold text-slate-800">{Math.min(page * pageSize, currentCalls.length)}</span> of{" "}
          <span className="font-bold text-slate-800">{currentCalls.length}</span> entries
        </div>
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
          </button>
          <div className="flex gap-[0.3vw]">
            {[...Array(totalPages)].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-purple-400 hover:text-purple-600"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ServiceCallResponse = () => {
  const { timers } = useEscalationWorker();
  const [queue, setQueue] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [activeTab, setActiveTab] = useState("escalation");
  const [expandedCalls, setExpandedCalls] = useState({});
  const isAnyExpanded = Object.values(expandedCalls).some(Boolean);
  const [loggedInUser, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter State across all tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

  // Self Assigned Table specific states
  const [selfAssignedStatus, setSelfAssignedStatus] = useState("All");
  const [selfAssignedPage, setSelfAssignedPage] = useState(1);
  const [selfAssignedPageSize] = useState(10);
  const [escalationPage, setEscalationPage] = useState(1);
  const [escalationPageSize] = useState(10);
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [reverseModalItem, setReverseModalItem] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isSubmittingReverse, setIsSubmittingReverse] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    remarks: "",
    resolutionType: "",
    editReason: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [actionMenuCoords, setActionMenuCoords] = useState(null);
  const [summaryModalRow, setSummaryModalRow] = useState(null);
  const [historyModalProduct, setHistoryModalProduct] = useState(null);

  // Form View state for User Desk "Register Call" and "Edit Call"
  const [view, setView] = useState("desk"); // "desk" | "form"
  const [editingCall, setEditingCall] = useState(null);
  const [customerDb, setCustomerDb] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [segments, setSegments] = useState([]);
  const [modes, setModes] = useState([]);

  const { socket } = useSocket();

  const { toast } = useNotification();

  const [supportReqs, setSupportReqs] = useState([]);
  const [fieldVisits, setFieldVisits] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Close 3-dot action menu when clicking outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (
        !e.target.closest(".action-menu-portal") &&
        !e.target.closest(".action-menu-container")
      ) {
        setActiveActionMenuId(null);
        setActionMenuCoords(null);
      }
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  useEffect(() => {
    const u = JSON.parse(
      sessionStorage.getItem("loggedInUser") ||
        localStorage.getItem("loggedInUser") ||
        "null",
    );
    if (u) setUser(u);

    const ld = async () => {
      try {
        const promises = [
          axios.get(`${API_URL}/service-calls/active`),
          axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/auth/employees`),
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/party-types`),
          axios.get(`${API_URL}/master/sites`),
          axios.get(`${API_URL}/master/settings/${MODES_KEY}`).catch(() => ({ data: { value: DEFAULT_MODES } })),
          axios.get(`${API_URL}/master/product-segments`),
        ];

        if (u?.userId) {
          promises.push(
            axios.get(`${API_URL}/service-calls/support/${u.userId}`),
          );
          promises.push(
            axios.get(`${API_URL}/service-calls/field-visit/${u.userId}`),
          );
        }

        const [
          activeRes,
          allRes,
          empRes,
          custRes,
          ptRes,
          sitesRes,
          modesRes,
          segRes,
          supportRes,
          visitRes,
        ] = await Promise.all(promises);

        setQueue(activeRes.data.map((call) => ({ ...call, callId: call._id })));
        setAllCalls((allRes.data || []).map((call) => ({ ...call, callId: call._id || call.id })));
        setEmployees(empRes.data);
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(empRes.data));

        if (custRes?.data) setCustomerDb(custRes.data);
        if (ptRes?.data) {
          setPartyTypes(
            ptRes.data.length
              ? ptRes.data.map((t) => ({ ...t, id: t._id || t.id }))
              : [
                  { id: 1, name: "OEM" },
                  { id: 2, name: "End Customer" },
                ],
          );
        }
        if (sitesRes?.data) setSites(sitesRes.data || []);
        if (segRes?.data) setSegments(segRes.data || []);
        if (modesRes?.data) {
          setModes(modesRes.data.value || DEFAULT_MODES);
        }

        if (supportRes) setSupportReqs(supportRes.data);
        if (visitRes) setFieldVisits(visitRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    ld();

    if (socket) {
      // Fallback: Catch up on any missed events when internet connection is restored
      socket.on("connect", ld);
      return () => socket.off("connect", ld);
    }
  }, [socket]);

  const remoteUpdateRef = useRef(false);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedCall) => {
      let isFromMe = false;
      let hasReturnToMe = false;
      let returnTab = null;

      if (updatedCall.products) {
        // Direct Return Detection - bypasses all dependency timings
        updatedCall.products.forEach((p) => {
          if (p._history && p._history.length > 0) {
            const h = p._history[p._history.length - 1];
            if (
              h.status === "Returned from Support" &&
              h.updatedBy !== loggedInUser?.userId
            ) {
              const askEvent = p._history
                .slice()
                .reverse()
                .find((hist) => hist.status === "Support Requested");
              const askedBy = askEvent?.updatedBy || p._assignedEngineerId;
              if (askedBy === loggedInUser?.userId) {
                hasReturnToMe = true;
                returnTab = "support";
              }
            }
            if (
              h.status === "Field Visit Returned" &&
              h.updatedBy !== loggedInUser?.userId
            ) {
              if (p._fieldVisit?.assignedBy === loggedInUser?.userId) {
                hasReturnToMe = true;
                returnTab = "fieldvisit";
              }
            }
          }
        });

        if (hasReturnToMe && returnTab) {
          playNotificationSound();
          setNewActivityTabs((old) => {
            const next = { ...old, [returnTab]: true };
            if (next[activeTab]) delete next[activeTab];
            return next;
          });
        }

        let latestTime = 0;
        let latestUpdater = null;
        updatedCall.products.forEach((p) => {
          if (p._history && p._history.length > 0) {
            const h = p._history[p._history.length - 1];
            const t = new Date(h.timestamp).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestUpdater = h.updatedBy;
            }
          }
        });
        if (latestUpdater === loggedInUser?.userId) {
          isFromMe = true;
        }
      }

      if (!isFromMe && !hasReturnToMe) {
        remoteUpdateRef.current = true;
      }

      if (updatedCall.deleted) {
        setQueue((prev) => prev.filter((c) => c.callId !== updatedCall.callId));
        return;
      }

      const call = { ...updatedCall, callId: updatedCall._id };

      setQueue((prev) => {
        if (call.status === "Resolved")
          return prev.filter((c) => c.callId !== call.callId);
        const exists = prev.some((c) => c.callId === call.callId);
        return exists
          ? prev.map((c) => (c.callId === call.callId ? call : c))
          : [call, ...prev];
      });

      setSupportReqs((prev) => {
        const uid = loggedInUser?.userId;
        if (!uid) return prev;
        const isSupport = call.products?.some(
          (p) =>
            p._supportPersonId === uid ||
            p._history?.some(
              (h) => h.status === "Support Requested" && h.updatedBy === uid,
            ),
        );
        if (!isSupport) return prev.filter((c) => c._id !== call._id);
        const exists = prev.some((c) => c._id === call._id);
        return exists
          ? prev.map((c) => (c._id === call._id ? call : c))
          : [call, ...prev];
      });

      setFieldVisits((prev) => {
        const uid = loggedInUser?.userId;
        if (!uid) return prev;
        const isFv = call.products?.some(
          (p) =>
            p._fieldVisit?.assignedTo === uid ||
            p._fieldVisit?.assignedBy === uid,
        );
        if (!isFv) return prev.filter((c) => c._id !== call._id);
        const exists = prev.some((c) => c._id === call._id);
        return exists
          ? prev.map((c) => (c._id === call._id ? call : c))
          : [call, ...prev];
      });
    };

    socket.on("service_call_updated", handleUpdate);
    return () => socket.off("service_call_updated", handleUpdate);
  }, [socket, loggedInUser]);

  // Filter Predicate across all tabs (Search Query, Date Range, Priority)
  const matchesSearchAndFilter = (call) => {
    if (!call) return false;

    // 1. Priority filter
    if (filterPriority && filterPriority !== "All") {
      if (call.priority !== filterPriority) return false;
    }

    // 2. Date range filter
    if (filterFromDate || filterToDate) {
      const rowDateStr = call.dateTime || call.timestamp || call.createdAt;
      if (rowDateStr) {
        const d = new Date(rowDateStr);
        if (!isNaN(d.getTime())) {
          if (filterFromDate) {
            const fromD = new Date(filterFromDate);
            fromD.setHours(0, 0, 0, 0);
            if (d < fromD) return false;
          }
          if (filterToDate) {
            const toD = new Date(filterToDate);
            toD.setHours(23, 59, 59, 999);
            if (d > toD) return false;
          }
        }
      }
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCallNo = (call.callNumber || call.callNo || "").toLowerCase().includes(q);
      const matchCust = (call.customerName || call.partyDescription || "").toLowerCase().includes(q);
      const matchParty = (call.partyCode || "").toLowerCase().includes(q);
      const matchPhone = (call.contactNumber || "").toLowerCase().includes(q);
      const matchPerson = (call.contactPerson || "").toLowerCase().includes(q);
      const matchEng = (call.currentEngineerName || call.assignedEngineerName || "").toLowerCase().includes(q);
      const matchProducts = (call.products || call._products || []).some((p) => {
        const m = (p.productModel || p.itemCode || p.model || "").toLowerCase();
        const sn = (p.serialNumber || "").toLowerCase();
        const desc = (p.callDescription || "").toLowerCase();
        const err = (p.errorCode || "").toLowerCase();
        return m.includes(q) || sn.includes(q) || desc.includes(q) || err.includes(q);
      });
      return matchCallNo || matchCust || matchParty || matchPhone || matchPerson || matchEng || matchProducts;
    }

    return true;
  };

  // Self Assigned Calls (Calls registered under this page / noEscalation / assigned to and registered by current logged-in user)
  const selfAssignedRawCalls = useMemo(() => {
    const uid = loggedInUser?.userId;
    const uName = loggedInUser?.name;
    if (!uid && !uName) return [];

    // Combine allCalls and queue, deduplicated by id
    const callMap = new Map();
    [...allCalls, ...queue].forEach((c) => {
      const cid = c._id || c.callId || c.id;
      if (cid && !callMap.has(cid)) {
        callMap.set(cid, c);
      }
    });

    return Array.from(callMap.values()).filter((c) => {
      // Must be self-assigned call (noEscalation === true or created under serviceCallResponse)
      const isSelfRegistered =
        c.noEscalation === true ||
        c.registeredBy === uid ||
        c.currentEngineerId === uid;

      if (!isSelfRegistered) return false;

      // Strictly belong to the current logged-in user:
      // either registeredBy matches, or currentEngineerId matches, or products assigned to this engineer
      const matchesUser =
        (uid && (c.registeredBy === uid || c.currentEngineerId === uid)) ||
        (uName && (c.currentEngineerName === uName || c.registeredByName === uName)) ||
        (c.products || []).some(
          (p) =>
            (uid && p._assignedEngineerId === uid) ||
            (uName && p._assignedEngineerName === uName),
        );

      return matchesUser;
    });
  }, [allCalls, queue, loggedInUser]);

  // Self Assigned Calls matching Search & Filters
  const selfAssignedFilteredCalls = useMemo(() => {
    return selfAssignedRawCalls.filter((c) => {
      if (!matchesSearchAndFilter(c)) return false;

      // Status filter within Self Assigned tab
      if (selfAssignedStatus !== "All") {
        const products = c.products || c._products || [{}];
        const hasMatchingStatus = products.some((prod) => {
          const rawStatus = getProductStatus(prod, c.status);
          const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
          return mappedLabel === selfAssignedStatus;
        });
        if (!hasMatchingStatus && c.status !== selfAssignedStatus) return false;
      }
      return true;
    });
  }, [selfAssignedRawCalls, searchQuery, filterFromDate, filterToDate, filterPriority, selfAssignedStatus]);

  // Paginated Self Assigned Calls
  const selfAssignedPaginatedCalls = useMemo(() => {
    const start = (selfAssignedPage - 1) * selfAssignedPageSize;
    return selfAssignedFilteredCalls.slice(start, start + selfAssignedPageSize);
  }, [selfAssignedFilteredCalls, selfAssignedPage, selfAssignedPageSize]);

  const selfAssignedTotalPages = Math.ceil(selfAssignedFilteredCalls.length / selfAssignedPageSize) || 1;

  // Filtered versions for all other tabs
  const filteredQueue = useMemo(() => {
    return queue.filter(matchesSearchAndFilter);
  }, [queue, searchQuery, filterFromDate, filterToDate, filterPriority]);

  const myEscalations = useMemo(() => {
    const uid = loggedInUser?.userId;
    const isAdmin = loggedInUser?.department === "Admin";
    return filteredQueue.filter((e) => {
      if (e.status === "Resolved") return false;

      if (isAdmin) {
        return (e.products || []).some(
          (p) =>
            !p._resolved &&
            p._productClosure?.status !== "Closed" &&
            !p._supportRequested &&
            p._productClosure?.status !== "Pending" &&
            (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
        );
      }

      const hasProductsForUser = (e.products || []).some(
        (p) =>
          p._assignedEngineerId === uid &&
          p._assigned !== false &&
          !p._resolved &&
          p._productClosure?.status !== "Closed" &&
          !p._supportRequested &&
          p._productClosure?.status !== "Pending" &&
          (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
      );

      return hasProductsForUser;
    });
  }, [filteredQueue, loggedInUser]);

  const escalationPaginatedCalls = useMemo(() => {
    const start = (escalationPage - 1) * escalationPageSize;
    return myEscalations.slice(start, start + escalationPageSize);
  }, [myEscalations, escalationPage, escalationPageSize]);

  const escalationTotalPages = Math.ceil(myEscalations.length / escalationPageSize) || 1;

  const liveCounts = useMemo(() => {
    const uid = loggedInUser?.userId;

    // Self Assigned tab count
    const selfCount = selfAssignedRawCalls.length;

    // Support Tab Logic
    const askedSupport = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._assignedEngineerId === uid &&
          p._supportRequested === true &&
          p._productClosure?.status !== "Field Visit Required" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;
    const assignedSupport = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._supportPersonId === uid &&
          p._supportRequested === true &&
          !p._resolved &&
          p._productClosure?.status !== "Closed" &&
          p._productClosure?.status !== "Field Visit Required",
      ),
    ).length;

    // Field Visit Tab Logic
    const askedVisit = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._fieldVisit?.assignedBy === uid &&
          p._fieldVisit?.assignedTo !== uid &&
          p._fieldVisit.status !== "Closed" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;
    const assignedVisit = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._fieldVisit?.assignedTo === uid &&
          p._fieldVisit.status !== "Closed" &&
          p._fieldVisit.status !== "Returned" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;

    return {
      selfAssigned: selfCount,
      escalation: queue.filter((e) => {
        if (e.status === "Resolved") return false;
        if (loggedInUser?.department === "Admin") return true;
        return (e.products || []).some(
          (p) =>
            p._assignedEngineerId === uid &&
            p._assigned !== false &&
            !p._resolved &&
            p._productClosure?.status !== "Closed" &&
            !p._supportRequested &&
            p._productClosure?.status !== "Pending" &&
            (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
        );
      }).length,
      support: askedSupport + assignedSupport,
      fieldVisit: askedVisit + assignedVisit,
      pending: queue.filter((e) => {
        return (e.products || []).some(
          (p) =>
            p._assignedEngineerId === uid &&
            p._productClosure?.status === "Pending" &&
            !p._supportRequested,
        );
      }).length,
    };
  }, [queue, selfAssignedRawCalls, loggedInUser]);

  const handleProductClose = async (callId, pIdx, d) => {
    // Optimistic Update for instant UI feedback
    setQueue((prev) =>
      prev.map((call) => {
        if (call.callId === callId) {
          const updatedProducts = [...call.products];
          updatedProducts[pIdx] = {
            ...updatedProducts[pIdx],
            _productClosure: { ...updatedProducts[pIdx]._productClosure, ...d },
          };
          if (d.returnToAssigned) {
            updatedProducts[pIdx]._supportPersonId = null;
            updatedProducts[pIdx]._supportPersonName = null;
          }
          return { ...call, products: updatedProducts };
        }
        return call;
      }),
    );

    try {
      await axios.patch(
        `${API_URL}/service-calls/${callId}/product/${pIdx}/close`,
        { ...d, userId: loggedInUser?.userId, name: loggedInUser?.name },
      );
      toast("Product status updated", "success");

      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      setQueue(data.map((call) => ({ ...call, callId: call._id })));
    } catch (err) {
      toast("Failed to update product status", "error");
    }
  };

  const handleProductAttend = async (callId, pIdx) => {
    try {
      const call = queue.find((c) => c.callId === callId);
      if (!call) return;

      const productsToAttend = [];
      call.products.forEach((p, idx) => {
        if (p._assignedEngineerId === loggedInUser?.userId && !p._attended) {
          productsToAttend.push(idx);
        }
      });
      if (!productsToAttend.includes(pIdx)) productsToAttend.push(pIdx);

      await Promise.all(
        productsToAttend.map((idx) =>
          axios.patch(
            `${API_URL}/service-calls/${callId}/product/${idx}/attend`,
            { userId: loggedInUser?.userId, name: loggedInUser?.name },
          ),
        ),
      );

      toast("Call attended successfully", "success");

      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      setQueue(data.map((call) => ({ ...call, callId: call._id })));
    } catch (err) {
      toast("Failed to mark call as attended", "error");
    }
  };

  const handleSupportRequest = async (callId, pIdx, data) => {
    const entry = queue.find((e) => e.callId === callId);
    if (!entry) return;
    try {
      await axios.post(`${API_URL}/service-calls/support`, {
        callId,
        callNumber: entry.callNumber,
        productIdx: pIdx,
        product: entry.products[pIdx],
        supportPerson: data.supportPerson,
        notes: data.notes,
        askedBy: loggedInUser?.userId,
        askedByName: loggedInUser?.name,
      });
      toast("Support request assigned", "success");

      const { data: qData } = await axios.get(
        `${API_URL}/service-calls/active`,
      );
      setQueue(qData.map((call) => ({ ...call, callId: call._id })));

      if (loggedInUser?.userId) {
        const sRes = await axios.get(
          `${API_URL}/service-calls/support/${loggedInUser.userId}`,
        );
        setSupportReqs(sRes.data);
      }
    } catch (err) {
      console.error(
        "Support Request Error:",
        err.response?.data || err.message,
      );
      toast("Failed to assign support request", "error");
    }
  };

  // Reverse Escalate handler
  const handleReverseEscalateInline = async (callId, productIdx, reason) => {
    setIsSubmittingReverse(true);
    try {
      await axios.patch(`${API_URL}/service-calls/${callId}/product/${productIdx}/reverse-escalate`, {
        userId: loggedInUser?.userId,
        name: loggedInUser?.name,
        reason: reason || "Reverse escalated back to previous assignee",
      });
      toast("Product reverse-escalated successfully", "success");
      setReverseModalItem(null);
      setReverseReason("");
      await refreshData();
    } catch (err) {
      console.error("Failed to reverse escalate:", err);
      toast(err.response?.data?.message || "Failed to reverse escalate", "error");
    } finally {
      setIsSubmittingReverse(false);
    }
  };

  const handleOpenReverseEscalate = (call, product, productIdx) => {
    const hist = product?._escalationHistory || [];
    let prevName = "";
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i];
      if (h.assignedTo && h.assignedTo !== loggedInUser?.userId) {
        prevName = h.engineerName || h.assignedToName || h.assignedTo;
        break;
      }
    }
    if (!prevName) {
      prevName = call.registeredByName || call.registeredBy || "Creator";
    }

    setReverseModalItem({
      callId: call._id || call.callId || call.id,
      callNumber: call.callNumber,
      productIdx,
      product,
      previousAssigneeName: prevName,
    });
    setReverseReason("");
  };

  const handleOpenEditReport = (call, product, productIdx) => {
    const closure = product?._productClosure || {};
    setEditingReportItem({
      callId: call._id || call.callId || call.id,
      callNumber: call.callNumber,
      productIdx,
      product,
    });
    setEditForm({
      status: closure.status || (product?._resolved ? "Resolved" : "Pending"),
      remarks: closure.remarks || "",
      resolutionType: closure.resolutionType || "",
      editReason: "",
    });
  };

  const handleSaveEditedReport = async () => {
    if (!editingReportItem) return;
    if (!editForm.editReason.trim()) {
      toast("Please provide a reason for editing this report", "error");
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await axios.patch(
        `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/edit-report`,
        {
          status: editForm.status,
          remarks: editForm.remarks,
          resolutionType: editForm.resolutionType,
          userId: loggedInUser?.userId,
          name: loggedInUser?.name,
          role: loggedInUser?.role,
          editReason: editForm.editReason,
        }
      );
      toast("Report updated successfully", "success");
      setEditingReportItem(null);
      await refreshData();
    } catch (err) {
      console.error("Failed to edit report:", err);
      toast("Failed to update report", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleAssignVisit = async (callId, type, form, productIdx) => {
    const entry = queue.find((e) => e.callId === callId);
    if (!entry) return;
    try {
      await axios.post(`${API_URL}/service-calls/field-visit`, {
        callId,
        callNumber: entry.callNumber,
        productIdx,
        type,
        assignedBy: loggedInUser?.userId,
        assignedByName: loggedInUser?.name,
        ...form,
      });
      toast("Field visit assigned", "success");

      const { data: qData } = await axios.get(
        `${API_URL}/service-calls/active`,
      );
      setQueue(qData.map((call) => ({ ...call, callId: call._id })));

      if (loggedInUser?.userId) {
        const fRes = await axios.get(
          `${API_URL}/service-calls/field-visit/${loggedInUser.userId}`,
        );
        setFieldVisits(fRes.data);
      }
    } catch (err) {
      console.error(
        "Field Visit Assignment Error:",
        err.response?.data || err.message,
      );
      toast("Failed to assign field visit", "error");
    }
  };

  const tabs = [
    {
      id: "escalation",
      label: "Escalation/ Assignments",
      icon: Shield,
      count: liveCounts.escalation,
      color: "from-blue-600 via-indigo-600 to-indigo-700 shadow-indigo-600/20",
    },
    {
      id: "self_assigned",
      label: "Self Assigned",
      icon: UserCheck,
      count: liveCounts.selfAssigned,
      color: "from-emerald-600 via-teal-600 to-cyan-700 shadow-teal-600/20",
    },
    {
      id: "pending",
      label: "Pending Checks",
      icon: AlertCircle,
      count: liveCounts.pending,
      color: "from-amber-500 via-orange-500 to-orange-600 shadow-orange-600/20",
    },
    {
      id: "support",
      label: "Support Desk",
      icon: HelpCircle,
      count: liveCounts.support,
      color: "from-sky-500 via-blue-500 to-indigo-500 shadow-blue-500/20",
    },
    {
      id: "fieldvisit",
      label: "Field Visits",
      icon: MapPin,
      count: liveCounts.fieldVisit,
      color:
        "from-indigo-600 via-violet-600 to-purple-600 shadow-indigo-600/20",
    },
  ];

  const prevLiveCountsRef = useRef(liveCounts);
  const [newActivityTabs, setNewActivityTabs] = useState({});

  useEffect(() => {
    const prev = prevLiveCountsRef.current;
    const current = liveCounts;
    const updates = {};
    let hasNew = false;

    // Check if the relevant assigned/actionable queues increased in size
    if (current.escalation > prev.escalation) {
      updates.escalation = true;
      hasNew = true;
    }
    if (current.support > prev.support) {
      updates.support = true;
      hasNew = true;
    }
    if (current.fieldVisit > prev.fieldVisit) {
      updates.fieldvisit = true;
      hasNew = true;
    }

    if (hasNew && remoteUpdateRef.current) {
      playNotificationSound();
      setNewActivityTabs((old) => {
        // Prevent highlighting the tab we are currently looking at
        const next = { ...old, ...updates };
        if (next[activeTab]) delete next[activeTab];
        return next;
      });
    }

    // Always reset the remote update flag after processing liveCounts
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
    }

    prevLiveCountsRef.current = current;
  }, [liveCounts, activeTab]);

  const refreshData = async () => {
    if (!loggedInUser?.userId) return;
    try {
      const [qRes, allRes, sRes, fRes] = await Promise.all([
        axios.get(`${API_URL}/service-calls/active`),
        axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/service-calls/support/${loggedInUser.userId}`),
        axios.get(`${API_URL}/service-calls/field-visit/${loggedInUser.userId}`),
      ]);
      setQueue(qRes.data.map((call) => ({ ...call, callId: call._id })));
      setAllCalls((allRes.data || []).map((call) => ({ ...call, callId: call._id || call.id })));
      setSupportReqs(sRes.data);
      setFieldVisits(fRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const defaultFormData = () => ({
    ...emptyForm(),
    mode: modes[0] || "Phone",
    assignedEngineer: loggedInUser?.userId || "",
    assignedEngineerName: loggedInUser?.name || "",
    assignedDepartment: loggedInUser?.department || "",
  });

  const handleSaveModes = async (updated) => {
    setModes(updated);
    try {
      await axios.post(`${API_URL}/master/settings`, {
        key: MODES_KEY,
        value: updated,
      });
    } catch (err) {
      console.error("Failed to save modes to server:", err);
      toast("Could not save modes to server", "error");
    }
  };

  const handleSaveCall = async (formRow, isEdit) => {
    let validDateTime = formRow.dateTime;
    if (
      validDateTime &&
      typeof validDateTime === "string" &&
      !validDateTime.includes("T")
    ) {
      validDateTime = formRow.timestamp || new Date().toISOString();
    }

    const assignedProducts = (formRow.products || []).map((p) => ({
      ...p,
      _assigned: true,
      _assignedAt: p._assignedAt || new Date().toISOString(),
      _assignedEngineerId: loggedInUser?.userId,
      _assignedEngineerName: loggedInUser?.name,
      _currentDepartment: loggedInUser?.department || "Support Engineers",
      _attended: true,
      _deadline: null,
      _isCritical: false,
      _levelPointer: 0,
      _escalationPointer: 0,
    }));

    const finalPayload = {
      ...formRow,
      dateTime: validDateTime,
      status: "Assigned",
      registeredBy: loggedInUser?.userId,
      currentEngineerId: loggedInUser?.userId,
      currentEngineerName: loggedInUser?.name,
      currentDepartment: loggedInUser?.department || "Support Engineers",
      noEscalation: true,
      deadline: null,
      products: assignedProducts,
    };

    const {
      id: _ignoreId,
      _id,
      _products,
      _people,
      _queueEntry,
      ...serverPayload
    } = finalPayload;

    if (isEdit) {
      serverPayload._editedBy = loggedInUser?.userId || "Employee";
      serverPayload._editedByName = loggedInUser?.name || "Employee";
      serverPayload._editedByRole = loggedInUser?.role || "Employee";
      const callId = formRow._id || formRow.id || formRow.callId;
      try {
        await axios.patch(`${API_URL}/service-calls/${callId}`, serverPayload);
        toast("Service call updated successfully", "success");
      } catch (err) {
        console.error("Failed to update call:", err);
        toast("Failed to update service call", "error");
        return;
      }
    } else {
      try {
        await axios.post(`${API_URL}/service-calls`, serverPayload);
        toast("Service call registered successfully", "success");
      } catch (err) {
        console.error("Failed to create call:", err);
        toast("Failed to register service call", "error");
        return;
      }
    }

    await refreshData();
    setView("desk");
    setEditingCall(null);
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    row: null,
  });

  const handleDeleteCall = async (callId) => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/service-calls/${callId}`);
      toast("Call deleted successfully", "success");
      setQueue((prev) => prev.filter((c) => (c._id || c.callId || c.id) !== callId));
      setDeleteModalState({ isOpen: false, row: null });
    } catch (err) {
      console.error("Failed to delete call:", err);
      toast("Failed to delete call", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Removed blocking full-screen loading spinner

  if (view === "form") {
    return (
      <div className="w-full h-full font-sans text-[0.85vw]">
        <ServiceCallForm
          initialData={editingCall || defaultFormData()}
          customerDb={customerDb}
          serviceCalls={queue}
          partyTypes={partyTypes}
          sites={sites}
          segments={segments}
          employees={employees}
          modes={modes}
          onSave={handleSaveCall}
          onBack={() => {
            setView("desk");
            setEditingCall(null);
          }}
          onSaveModes={handleSaveModes}
          canWrite={true}
          canUpdate={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full text-[0.85vw] bg-slate-100/70 overflow-hidden pb-[0.4vw]">
      {/* Top Header Toolbar with Glass Tab Container & Action Buttons */}
      <div className="flex items-center gap-[0.8vw] mb-[0.6vw] sticky top-0 z-10 shrink-0">
        {/* Premium Glass-Effect Tab Container */}
        <div className="flex-1 flex gap-[0.5vw] bg-white/80 backdrop-blur-md border border-slate-400 rounded-[0.8vw] p-[0.35vw] shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                if (newActivityTabs[t.id]) {
                  setNewActivityTabs((prev) => {
                    const next = { ...prev };
                    delete next[t.id];
                    return next;
                  });
                }
              }}
              className={`flex-1 flex items-center justify-center gap-[0.5vw] py-[0.55vw] rounded-[0.5vw] font-bold transition-all duration-305 relative cursor-pointer ${
                activeTab === t.id
                  ? `bg-gradient-to-r ${t.color} text-white shadow-md overflow-hidden`
                  : newActivityTabs[t.id]
                    ? "tab-running-border text-white font-extrabold shadow-sm"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 overflow-hidden"
              }`}
            >
              <t.icon className="w-[1vw] h-[1vw]" />
              <span className="">{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[0.65vw] px-[0.45vw] py-[0.05vw] rounded-full font-bold transition-colors z-10 ${
                    activeTab === t.id
                      ? "bg-white/20 text-white"
                      : newActivityTabs[t.id]
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "bg-slate-100 text-slate-750"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Controls: Refresh & Register Call */}
        <div className="flex items-center gap-[0.5vw] bg-white/80 backdrop-blur-md border border-slate-400 rounded-[0.8vw] p-[0.35vw] shadow-sm shrink-0">
          <button
            type="button"
            onClick={refreshData}
            title="Refresh Tasks"
            className="p-[0.55vw] rounded-[0.5vw] text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
          >
            <RefreshCw className="w-[1vw] h-[1vw]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCall(null);
              setView("form");
            }}
            className="flex items-center gap-[0.4vw] px-[1vw] py-[0.55vw] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-[0.5vw] shadow-sm hover:shadow transition-all duration-200 cursor-pointer text-[0.82vw]"
          >
            <Plus className="w-[1vw] h-[1vw] stroke-[2.5]" />
            <span>Register Call</span>
          </button>
        </div>
      </div>

      {/* ── Global Search & Date/Priority Filters Toolbar across all tabs ── */}
      <div className="flex items-center justify-between bg-white px-[0.8vw] py-[0.45vw] rounded-[0.7vw] shadow-sm border border-slate-200 gap-[0.7vw] shrink-0 mb-[0.6vw]">
        {/* Left side: Search Box */}
        <div className="relative flex-1 max-w-[28vw]">
          <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.95vw] h-[0.95vw]" />
          <input
            type="text"
            placeholder="Search by customer, party code, call no, product, model..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="w-full pl-[2.4vw] pr-[0.8vw] h-[2.1vw] border border-slate-200 rounded-[0.5vw] text-[0.76vw] font-medium text-slate-800 placeholder-slate-400 bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
          />
        </div>

        {/* Middle: Crisp Date Range Filter */}
        <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-[0.5vw] h-[2.1vw] px-[0.6vw] bg-slate-50/70 hover:bg-white focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all text-[0.74vw]">
          <Calendar className="w-[0.85vw] h-[0.85vw] text-slate-400 shrink-0" />
          <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider">
            From
          </span>
          <input
            type="date"
            value={filterFromDate || ""}
            onChange={(e) => {
              setFilterFromDate(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="text-[0.74vw] text-slate-800 bg-transparent outline-none font-semibold cursor-pointer border-none p-0 focus:ring-0"
          />
          <span className="text-slate-300 mx-[0.1vw]">—</span>
          <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider">
            To
          </span>
          <input
            type="date"
            value={filterToDate || ""}
            min={filterFromDate || undefined}
            onChange={(e) => {
              setFilterToDate(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="text-[0.74vw] text-slate-800 bg-transparent outline-none font-semibold cursor-pointer border-none p-0 focus:ring-0"
          />
          {(filterFromDate || filterToDate) && (
            <button
              onClick={() => {
                setFilterFromDate("");
                setFilterToDate("");
                setSelfAssignedPage(1);
              }}
              className="text-[0.68vw] text-rose-500 hover:text-rose-700 font-bold cursor-pointer ml-[0.3vw] px-[0.3vw] py-[0.1vw] hover:bg-rose-50 rounded"
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right side: Priority Dropdown */}
        <div className="flex gap-[0.5vw] items-center flex-shrink-0">
          <div className="w-[10vw]">
            <CustomDropdown
              size="sm"
              value={filterPriority}
              onChange={(val) => {
                setFilterPriority(val);
                setSelfAssignedPage(1);
              }}
              options={[
                { value: "All", label: "All Priorities" },
                ...PRIORITIES.map((p) => ({ value: p, label: p })),
              ]}
              triggerClassName="h-[2.1vw] !rounded-[0.5vw] border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-slate-100/70 p-[1.2vw] rounded-[1vw] border border-slate-400 shadow-inner">
            <RefreshCw className="w-[3vw] h-[3vw] text-indigo-650 animate-spin mb-[1vw]" />
            <span className="text-[1vw] font-bold text-slate-800">
              Fetching latest tasks...
            </span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={
                activeTab === "reports"
                  ? "flex-1 min-h-0 flex flex-col"
                  : "flex-1 min-h-0 flex flex-col overflow-hidden"
              }
            >
              {activeTab === "escalation" && (
                <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
                  {/* Top Bar for Escalations */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-[0.5vw]">
                      <span className="flex items-center gap-[0.35vw] text-[0.8vw] font-bold text-slate-800">
                        <Shield className="w-[0.95vw] h-[0.95vw] text-indigo-600" />
                        Escalated & Assigned Queue
                      </span>
                      <span className="text-[0.68vw] bg-indigo-50 border border-indigo-200 text-indigo-700 px-[0.45vw] py-[0.1vw] rounded-full font-bold">
                        {myEscalations.length} Active Calls
                      </span>
                    </div>

                    <div className="text-[0.76vw] text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800">{myEscalations.length}</span> calls
                    </div>
                  </div>

                  {/* Table area */}
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
                        <tr className="bg-[#e9edf4]">
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                            Date & Time
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                            Call No
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                            Customer
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[14vw]">
                            Product / Issue
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Error Code
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Priority
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8.5vw]">
                            SLA Timer
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8.5vw]">
                            Status / Level
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[10vw]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {escalationPaginatedCalls.length > 0 ? (
                          escalationPaginatedCalls.map((row) => {
                            const allProducts =
                              row._products?.length > 0
                                ? row._products
                                : row.products?.length > 0
                                  ? row.products
                                  : [{}];

                            const rowCount = allProducts.length;
                            const rowId = row.id || row._id || row.callId;
                            const callTimer = timers.find((t) => t.callNumber === row.callNumber);

                            return allProducts.map((prod, pIdx) => {
                              const isAttended = prod._attended || row.status === "Resolved";
                              const isActionable =
                                (loggedInUser?.department === "Admin" || prod._assignedEngineerId === loggedInUser?.userId) &&
                                !prod._resolved &&
                                prod._productClosure?.status !== "Closed";

                              return (
                                <tr
                                  key={`${rowId}-${pIdx}`}
                                  className={`transition-colors ${
                                    isAttended
                                      ? "bg-slate-50/50 hover:bg-slate-100/60"
                                      : "bg-white hover:bg-indigo-50/20"
                                  }`}
                                >
                                  {/* Date & Time */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                                    >
                                      {(() => {
                                        try {
                                          const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                                          if (isNaN(d.getTime())) return row.dateTime || "—";
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
                                          return row.dateTime || "—";
                                        }
                                      })()}
                                    </td>
                                  )}

                                  {/* Call No */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                                        {row.callNumber || row.callNo}
                                      </div>
                                      <div className="text-[0.65vw] text-slate-500 font-semibold mt-[0.1vw]">
                                        {rowCount} Product{rowCount > 1 ? "s" : ""}
                                      </div>
                                    </td>
                                  )}

                                  {/* Customer */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                                    >
                                      <div className="font-semibold text-slate-900 text-[0.82vw]">
                                        {row.customerName || row.partyDescription}
                                      </div>
                                      <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                                        {row.partyCode && (
                                          <span className="text-[0.68vw] text-slate-500 font-mono">
                                            {row.partyCode}
                                          </span>
                                        )}
                                        {row.customerType && (
                                          <span
                                            className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                              row.customerType,
                                            )}`}
                                          >
                                            {row.customerType}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  )}

                                  {/* Product / Issue */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                                    <div className="font-medium text-slate-850 text-[0.8vw]">
                                      {prod?.productModel || prod?.itemCode || "—"}
                                    </div>
                                    {prod?.serialNumber && (
                                      <div className="text-[0.68vw] text-slate-500 font-mono">
                                        SN: {prod.serialNumber}
                                      </div>
                                    )}
                                    {prod?.callDescription && (
                                      <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                                        {prod.callDescription}
                                      </div>
                                    )}
                                  </td>

                                  {/* Error Code */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap">
                                    {prod?.errorCode ? (
                                      <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.12vw] rounded text-[0.74vw] font-mono font-medium">
                                        {prod.errorCode}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[0.76vw]">-</span>
                                    )}
                                  </td>

                                  {/* Priority */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                                    >
                                      {(() => {
                                        const p = row.priority || "Medium";
                                        let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        if (p === "Urgent" || p === "Critical")
                                          badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                                        else if (p === "High")
                                          badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                                        else if (p === "Low")
                                          badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                        return (
                                          <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                            {p}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                  )}

                                  {/* SLA Timer */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap">
                                    {prod._attended ? (
                                      <span className="inline-flex items-center gap-[0.25vw] text-emerald-700 font-bold text-[0.74vw] bg-emerald-50 border border-emerald-200 px-[0.5vw] py-[0.15vw] rounded-full">
                                        <CheckCircle className="w-[0.75vw] h-[0.75vw]" />
                                        Attended
                                      </span>
                                    ) : callTimer ? (
                                      <span
                                        className={`inline-flex items-center gap-[0.25vw] font-mono text-[0.76vw] font-bold px-[0.55vw] py-[0.18vw] rounded-[0.4vw] border shadow-2xs ${
                                          callTimer.isExpired
                                            ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                                            : "bg-amber-100 text-amber-900 border-amber-300"
                                        }`}
                                      >
                                        <Clock className="w-[0.75vw] h-[0.75vw]" />
                                        {callTimer.remainingFormatted}
                                      </span>
                                    ) : row.status === "Critical" ? (
                                      <span className="inline-flex items-center gap-[0.25vw] text-rose-800 font-bold text-[0.72vw] bg-rose-100 border border-rose-300 px-[0.5vw] py-[0.15vw] rounded-[0.4vw] animate-pulse">
                                        <AlertTriangle className="w-[0.75vw] h-[0.75vw]" /> SLA Expired
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[0.74vw]">—</span>
                                    )}
                                  </td>

                                  {/* Status / Level */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap">
                                    {(() => {
                                      const lastEsc = prod._escalationHistory?.[prod._escalationHistory.length - 1];
                                      return (
                                        <div>
                                          <div className="font-semibold text-[0.78vw] text-slate-800">
                                            {prod._productClosure?.status || (lastEsc ? `Level ${lastEsc.level || 1}` : "Escalated")}
                                          </div>
                                          <div className="text-[0.68vw] text-slate-500 font-medium">
                                            {prod._assignedEngineerName || row.currentEngineerName || "Assigned"}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]">
                                    <div className="flex items-center justify-center gap-[0.4vw]">
                                      {/* Primary Attend/Action Button */}
                                      {isActionable && !prod._attended && (
                                        <button
                                          type="button"
                                          onClick={() => handleProductAttend(row.callId || row._id, pIdx)}
                                          className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.28vw] rounded-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white font-bold text-[0.74vw] shadow-xs active:scale-95 transition-all cursor-pointer"
                                          title="Attend to halt auto-escalation timer"
                                        >
                                          <CheckCircle className="w-[0.75vw] h-[0.75vw]" />
                                          Attend
                                        </button>
                                      )}

                                      {/* Respond / Modal Action */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveModalProduct({
                                            entry: row,
                                            callId: row.callId || row._id,
                                            prod,
                                            pIdx,
                                          });
                                        }}
                                        className="flex items-center gap-[0.25vw] px-[0.55vw] py-[0.28vw] rounded-[0.4vw] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[0.74vw] transition-all cursor-pointer"
                                        title="Respond or Close Product"
                                      >
                                        <Edit3 className="w-[0.72vw] h-[0.72vw]" />
                                        Respond
                                      </button>

                                      {/* History button */}
                                      <button
                                        type="button"
                                        onClick={() => setHistoryModalProduct(row)}
                                        className="p-[0.32vw] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[0.4vw] transition-all cursor-pointer"
                                        title="View Call History"
                                      >
                                        <History className="w-[0.95vw] h-[0.95vw]" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })
                        ) : (
                          <tr>
                            <td colSpan="9" className="text-center py-[3vw] text-slate-500">
                              <p className="text-[0.9vw] font-bold text-slate-700">No active calls in your escalation queue</p>
                              <p className="text-[0.75vw] text-slate-400 mt-[0.2vw]">
                                All assigned escalation tasks have been attended or resolved.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.6vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="text-[0.75vw] text-slate-600 font-medium">
                      Showing{" "}
                      <span className="font-bold text-slate-800">
                        {myEscalations.length > 0 ? (escalationPage - 1) * escalationPageSize + 1 : 0}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-slate-800">
                        {Math.min(escalationPage * escalationPageSize, myEscalations.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-slate-800">
                        {myEscalations.length}
                      </span>{" "}
                      entries
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <button
                        onClick={() => setEscalationPage((p) => Math.max(1, p - 1))}
                        disabled={escalationPage === 1}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                      <div className="flex gap-[0.3vw]">
                        {[...Array(escalationTotalPages)].map((_, i) => {
                          const pNum = i + 1;
                          return (
                            <button
                              key={pNum}
                              onClick={() => setEscalationPage(pNum)}
                              className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                                escalationPage === pNum
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                              }`}
                            >
                              {pNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() =>
                          setEscalationPage((p) => Math.min(escalationTotalPages, p + 1))
                        }
                        disabled={escalationPage === escalationTotalPages || escalationTotalPages === 0}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* ── Self Assigned Tab: Full Table View ── */}
              {activeTab === "self_assigned" && (
                <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 flex flex-col flex-1 min-h-0 w-full overflow-hidden">
                  {/* Status chips bar */}
                  <div className="flex items-center justify-between px-[0.9vw] py-[0.55vw] border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="flex gap-[0.4vw] flex-wrap items-center">
                      {[
                        { label: "All", dot: "bg-slate-400" },
                        { label: "Assigned", dot: "bg-indigo-500" },
                        { label: "Pending", dot: "bg-amber-500" },
                        { label: "Supporting", dot: "bg-cyan-500" },
                        { label: "Field Visit", dot: "bg-teal-500" },
                        { label: "Resolved", dot: "bg-emerald-500" },
                      ].map(({ label, dot }) => {
                        const isActive = selfAssignedStatus === label;
                        const count = label === "All"
                          ? selfAssignedRawCalls.length
                          : selfAssignedRawCalls.filter((c) => {
                              const products = c.products || c._products || [{}];
                              return products.some((prod) => {
                                const rawStatus = getProductStatus(prod, c.status);
                                const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
                                return mappedLabel === label;
                              }) || c.status === label;
                            }).length;

                        return (
                          <button
                            key={label}
                            onClick={() => {
                              setSelfAssignedStatus(label);
                              setSelfAssignedPage(1);
                            }}
                            className={`flex items-center gap-[0.4vw] px-[0.75vw] py-[0.32vw] rounded-full text-[0.78vw] font-semibold cursor-pointer transition-all ${
                              isActive
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            <span className={`w-[0.45vw] h-[0.45vw] rounded-full shrink-0 ${isActive ? "bg-white" : dot}`} />
                            <span>{label}</span>
                            <span
                              className={`text-[0.72vw] px-[0.4vw] py-[0.05vw] rounded-full font-bold ml-[0.1vw] ${
                                isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[0.78vw] text-slate-500 font-medium whitespace-nowrap pl-[0.5vw]">
                      Showing <span className="font-bold text-slate-800">{selfAssignedFilteredCalls.length}</span> calls
                    </div>
                  </div>

                  {/* Table area */}
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-[#e9edf4] sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
                        <tr className="bg-[#e9edf4]">
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9.5vw]">
                            Date & Time
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                            Call No
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                            Customer
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[13vw]">
                            Product / Issue
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Error Code
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[9vw]">
                            Caller Details
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[6.5vw]">
                            Priority
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] border-b-2 border-r border-slate-300 whitespace-nowrap min-w-[8vw]">
                            Status
                          </th>
                          <th className="p-[0.7vw] font-bold text-slate-800 uppercase tracking-wider text-[0.72vw] text-center sticky top-0 right-0 bg-[#e9edf4] z-30 border-b-2 border-slate-300 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[6vw]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selfAssignedPaginatedCalls.length > 0 ? (
                          selfAssignedPaginatedCalls.map((row) => {
                            const allProducts =
                              row._products?.length > 0
                                ? row._products
                                : row.products?.length > 0
                                  ? row.products
                                  : [{}];

                            let displayProducts = allProducts;
                            let effectiveStatus = row.status;
                            if (selfAssignedStatus !== "All") {
                              displayProducts = allProducts.filter((prod) => {
                                const rawStatus = getProductStatus(prod, effectiveStatus);
                                const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
                                return mappedLabel === selfAssignedStatus;
                              });
                              if (displayProducts.length === 0 && row.status === selfAssignedStatus) {
                                displayProducts = allProducts;
                              }
                            }

                            const rowCount = displayProducts.length;
                            const rowId = row.id || row._id || row.callId;
                            if (rowCount === 0) return null;

                            return displayProducts.map((prod, pIdx) => {
                              const isResolved =
                                effectiveStatus === "Resolved" ||
                                deriveCallStatus(allProducts, effectiveStatus) === "resolved";
                              const bgClass = isResolved
                                ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                                : "hover:bg-slate-50/70";

                              return (
                                <tr
                                  key={`${rowId}-${pIdx}`}
                                  className={`transition-colors ${bgClass}`}
                                >
                                  {/* Date & Time */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap text-[0.78vw] font-medium text-slate-700 bg-white"
                                    >
                                      {(() => {
                                        try {
                                          const d = new Date(row.dateTime || row.timestamp || row.createdAt);
                                          if (isNaN(d.getTime())) return row.dateTime || "—";
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
                                          return row.dateTime || "—";
                                        }
                                      })()}
                                    </td>
                                  )}

                                  {/* Call No */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="font-mono text-[0.8vw] font-bold text-slate-800">
                                        {row.callNumber || row.callNo}
                                      </div>
                                    </td>
                                  )}

                                  {/* Customer */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle bg-white"
                                    >
                                      <div className="font-semibold text-slate-900 text-[0.82vw]">
                                        {row.customerName || row.partyDescription}
                                      </div>
                                      <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                                        {row.partyCode && (
                                          <span className="text-[0.68vw] text-slate-500 font-mono">
                                            {row.partyCode}
                                          </span>
                                        )}
                                        {row.customerType && (
                                          <span
                                            className={`text-[0.65vw] px-[0.4vw] py-[0.05vw] rounded font-semibold border ${getTypeColor(
                                              row.customerType,
                                            )}`}
                                          >
                                            {row.customerType}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  )}

                                  {/* Product / Issue */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle">
                                    <div className="font-medium text-slate-800 text-[0.8vw]">
                                      {prod?.productModel || prod?.itemCode || "—"}
                                    </div>
                                    {prod?.serialNumber && (
                                      <div className="text-[0.68vw] text-slate-500 font-mono">
                                        SN: {prod.serialNumber}
                                      </div>
                                    )}
                                    {prod?.callDescription && (
                                      <div className="text-[0.72vw] text-slate-600 line-clamp-1 italic mt-[0.1vw]">
                                        {prod.callDescription}
                                      </div>
                                    )}
                                  </td>

                                  {/* Error Code */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap">
                                    {prod?.errorCode ? (
                                      <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.12vw] rounded text-[0.74vw] font-mono font-medium">
                                        {prod.errorCode}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[0.76vw]">-</span>
                                    )}
                                  </td>

                                  {/* Caller Details */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="flex items-center gap-[0.4vw]">
                                        <Phone className="w-[0.9vw] h-[0.9vw] text-slate-400 shrink-0" />
                                        <div>
                                          <div className="text-[0.8vw] font-medium text-slate-700">
                                            {row.contactNumber || "+91 —"}
                                          </div>
                                          <div className="text-[0.68vw] text-slate-500 capitalize">
                                            {row.mode || "Phone"}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  )}

                                  {/* Priority */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-r border-b border-slate-200 text-center align-middle whitespace-nowrap bg-white"
                                    >
                                      {(() => {
                                        const p = row.priority || "Medium";
                                        let badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        if (p === "Urgent" || p === "Critical")
                                          badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                                        else if (p === "High")
                                          badgeStyle = "bg-orange-50 text-orange-700 border border-orange-200";
                                        else if (p === "Low")
                                          badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                        return (
                                          <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.74vw] font-medium ${badgeStyle}`}>
                                            {p}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                  )}

                                  {/* Status */}
                                  <td className="p-[0.7vw] border-r border-b border-slate-200 align-middle whitespace-nowrap">
                                    {(() => {
                                      const status = getProductStatus(prod, effectiveStatus);
                                      const cfg = getStatusCfg(status);
                                      return (
                                        <span className="inline-flex items-center gap-[0.4vw] text-[0.8vw] font-medium text-slate-700">
                                          <span className={`w-[0.5vw] h-[0.5vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                                          {cfg.label}
                                        </span>
                                      );
                                    })()}
                                  </td>

                                  {/* Actions (3-Dot Menu) */}
                                  {pIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-[0.7vw] border-b border-r border-slate-200 text-center align-middle whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]"
                                    >
                                      <div className="relative inline-block text-left action-menu-container">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (activeActionMenuId === rowId) {
                                              setActiveActionMenuId(null);
                                              setActionMenuCoords(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setActionMenuCoords({
                                                top: rect.bottom + 4,
                                                right: window.innerWidth - rect.right,
                                              });
                                              setActiveActionMenuId(rowId);
                                            }
                                          }}
                                          className="p-[0.4vw] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                                          title="Actions"
                                        >
                                          <MoreVertical className="w-[1.1vw] h-[1.1vw]" />
                                        </button>

                                        {/* Action Dropdown Menu via Portal to avoid overflow clipping */}
                                        {activeActionMenuId === rowId && actionMenuCoords && ReactDOM.createPortal(
                                          <div
                                            className="action-menu-portal fixed z-[9999]"
                                            style={{
                                              top: `${actionMenuCoords.top}px`,
                                              right: `${actionMenuCoords.right}px`,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <motion.div
                                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                              animate={{ opacity: 1, scale: 1, y: 0 }}
                                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                              transition={{ duration: 0.12 }}
                                              className="min-w-[10vw] w-max whitespace-nowrap bg-white rounded-[0.5vw] shadow-2xl border border-slate-200 py-[0.4vw] text-left"
                                            >
                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setSummaryModalRow(row);
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                              >
                                                <ClipboardList className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>View Summary</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setEditingCall({
                                                    ...row,
                                                    id: row._id || row.callId || row.id,
                                                    products: row.products || [],
                                                    _editing: true,
                                                  });
                                                  setView("form");
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                              >
                                                <Edit3 className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>Edit Call</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setHistoryModalProduct(row);
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                              >
                                                <History className="w-[0.9vw] h-[0.9vw] shrink-0" />
                                                <span>Call History</span>
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setActiveActionMenuId(null);
                                                  setDeleteModalState({
                                                    isOpen: true,
                                                    row: row,
                                                  });
                                                }}
                                                className="w-full flex items-center gap-[0.6vw] px-[0.9vw] py-[0.45vw] text-[0.78vw] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border-t border-slate-100"
                                              >
                                                <Trash2 className="w-[0.9vw] h-[0.9vw] shrink-0 text-rose-500" />
                                                <span>Delete Call</span>
                                              </button>
                                            </motion.div>
                                          </div>,
                                          document.body
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-[12vh] text-center border-b border-slate-200">
                              <div className="flex flex-col items-center justify-center gap-[0.8vw]">
                                <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                  <PhoneCall className="w-[1.6vw] h-[1.6vw] text-slate-400" />
                                </div>
                                <div className="text-[0.95vw] font-bold text-slate-800">
                                  No self-assigned calls found
                                </div>
                                <div className="text-[0.76vw] text-slate-500 max-w-[22vw]">
                                  No calls match your active filters. Try adjusting your dates, search query or status tab.
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-[1vw] py-[0.55vw] border-t border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="text-[0.75vw] text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-800">
                        {selfAssignedFilteredCalls.length === 0
                          ? 0
                          : (selfAssignedPage - 1) * selfAssignedPageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-slate-800">
                        {Math.min(
                          selfAssignedPage * selfAssignedPageSize,
                          selfAssignedFilteredCalls.length,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-800">
                        {selfAssignedFilteredCalls.length}
                      </span>{" "}
                      entries
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <button
                        onClick={() => setSelfAssignedPage((p) => Math.max(1, p - 1))}
                        disabled={selfAssignedPage === 1}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                      <div className="flex gap-[0.3vw]">
                        {[...Array(selfAssignedTotalPages)].map((_, i) => {
                          const pNum = i + 1;
                          if (
                            selfAssignedTotalPages > 5 &&
                            (pNum < selfAssignedPage - 1 || pNum > selfAssignedPage + 1) &&
                            pNum !== 1 &&
                            pNum !== selfAssignedTotalPages
                          ) {
                            if (pNum === selfAssignedPage - 2 || pNum === selfAssignedPage + 2)
                              return <span key={pNum} className="px-1 text-slate-400 text-[0.75vw]">...</span>;
                            return null;
                          }
                          return (
                            <button
                              key={pNum}
                              onClick={() => setSelfAssignedPage(pNum)}
                              className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${
                                selfAssignedPage === pNum
                                  ? "bg-teal-600 text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-600"
                              }`}
                            >
                              {pNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() =>
                          setSelfAssignedPage((p) => Math.min(selfAssignedTotalPages, p + 1))
                        }
                        disabled={selfAssignedPage === selfAssignedTotalPages || selfAssignedTotalPages === 0}
                        className="p-[0.35vw] border border-slate-200 rounded-[0.4vw] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-slate-600"
                      >
                        <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "pending" && (
                <PendingTab
                  queue={filteredQueue}
                  currentUser={loggedInUser}
                  employees={employees}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
              {activeTab === "support" && (
                <SupportRequestsTab
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  queue={filteredQueue}
                  employees={employees}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
              {activeTab === "fieldvisit" && (
                <VisitsTab
                  type="Field Visit"
                  queue={filteredQueue}
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  employees={employees}
                  onAssignFieldVisit={handleAssignVisit}
                  onProductClose={handleProductClose}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Call Summary Modal */}
      {summaryModalRow && (
        <CallSummaryModal
          row={summaryModalRow}
          employees={employees}
          onClose={() => setSummaryModalRow(null)}
        />
      )}

      {/* Product History Modal */}
      {historyModalProduct && (
        <ProductHistoryModal
          history={[
            ...((historyModalProduct.editHistory || []).map((eh) => ({
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
            ...((historyModalProduct._products || historyModalProduct.products || [])
              .flatMap((p) => [
                ...(p._escalationHistory || []).map((e) => ({
                  ...e,
                  timestamp: e.assignedAt,
                  status:
                    e.status === "Pending"
                      ? "Escalation Assigned"
                      : e.status || "Escalated",
                  updatedByName: e.updatedByName || "System",
                  metadata: {
                    assignedTo:
                      e.engineerName || e.assignedToName || e.assignedTo,
                    assignedToName: e.engineerName || e.assignedToName,
                    dept: e.department || e.dept,
                    remarks: e.remarks || e.reason || "",
                    level: e.level,
                    deadline: e.targetTime || e.deadline,
                  },
                })),
                ...(p._history || []),
              ])),
          ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          employees={employees}
          currentUser={loggedInUser}
          onClose={() => setHistoryModalProduct(null)}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        isLoading={isDeleting}
        title="Delete Service Call"
        callNumber={deleteModalState.row?.callNumber}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalState({ isOpen: false, row: null });
          }
        }}
        onConfirm={() => {
          if (deleteModalState.row) {
            const callId =
              deleteModalState.row._id ||
              deleteModalState.row.callId ||
              deleteModalState.row.id;
            handleDeleteCall(callId);
          }
        }}
      />
    </div>
  );
};

export default ServiceCallResponse;
