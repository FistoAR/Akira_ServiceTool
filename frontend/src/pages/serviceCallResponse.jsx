import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Layers,
  Phone,
  Mail,
  Share2,
  Play,
  Search,
  Download,
  Loader2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import useEscalationWorker from "../service/useEscalationWorker";
import { useSocket } from "../contexts/SocketContext";
import ProductHistoryModal, {
  ProductHistoryTimeline,
} from "../components/ProductHistoryModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = import.meta.env.VITE_API_URL;

// ── Storage keys (Legacy) ──────────────────────────────────────────────────────────────
const EMPLOYEES_KEY = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";

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
  expandedCalls,
  setExpandedCalls,
  onSupportRequest,
  onProductAttend,
}) => {
  const items = queue.filter((e) => {
    const hasUserProducts = (e.products || []).some(
      (p) =>
        p._assignedEngineerId === currentUser?.userId &&
        p._productClosure?.status === "Pending" &&
        !p._supportRequested,
    );
    return hasUserProducts;
  });

  if (items.length === 0)
    return (
      <div className="bg-white rounded-[0.8vw] p-[3vw] text-center border border-slate-400 text-slate-600 font-bold shadow-sm">
        No pending products.
      </div>
    );
  return (
    <div className="space-y-[0.8vw]">
      {items.map((e) => (
        <EscalationCard
          key={e.callId}
          entry={e}
          currentUser={currentUser}
          employees={employees}
          isPendingTab
          isExpanded={!!expandedCalls[e.callId]}
          onToggle={() =>
            setExpandedCalls((prev) => ({
              ...prev,
              [e.callId]: !prev[e.callId],
            }))
          }
          onProductClose={(pIdx, d) => onProductClose(e.callId, pIdx, d)}
          onAssignFieldVisit={(f, p) =>
            onAssignFieldVisit(e.callId, "Field Visit", f, p)
          }
          onSupportRequest={(p, d) => onSupportRequest(e.callId, p, d)}
          onProductAttend={(pIdx) => onProductAttend(e.callId, pIdx)}
        />
      ))}
    </div>
  );
};

// ── Allocated Action Panel ────────────────────────────────────────────────────
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
  expandedCalls,
  setExpandedCalls,
  onProductClose,
  onAssignFieldVisit,
  onSupportRequest,
  onProductAttend,
}) => {
  const askedForSupportCalls = (queue || []).filter((e) => {
    return (e.products || []).some(
      (p) =>
        p._assignedEngineerId === currentUser?.userId &&
        p._supportRequested === true &&
        p._productClosure?.status !== "Field Visit Required" &&
        p._productClosure?.status !== "Closed",
    );
  });

  const assignedForSupportCalls = (queue || []).filter((e) => {
    return (e.products || []).some(
      (p) =>
        p._supportPersonId === currentUser?.userId &&
        p._supportRequested === true &&
        !p._resolved &&
        p._productClosure?.status !== "Closed" &&
        p._productClosure?.status !== "Field Visit Required",
    );
  });

  return (
    <div className="col-span-2 grid grid-cols-2 gap-[1.5vw]">
      {/* Left Column: Asked for Support */}
      <div className="space-y-[0.8vw]">
        <div className="bg-white rounded-[0.8vw] p-[0.6vw] px-[0.9vw] border border-slate-400 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-[0.6vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">
              Asked for Support
            </h2>
          </div>
          <Badge
            label={`${askedForSupportCalls.length} Requests`}
            color="blue"
          />
        </div>

        {askedForSupportCalls.length === 0 ? (
          <div className="bg-white rounded-[0.8vw] p-[1.8vw] text-center border border-slate-400 text-slate-600 font-bold shadow-sm">
            No support requested by you.
          </div>
        ) : (
          <div className="grid gap-[0.8vw]">
            {askedForSupportCalls.map((e) => (
              <EscalationCard
                key={e.callId}
                entry={e}
                currentUser={currentUser}
                employees={employees}
                isSupportDeskAsked={true}
                isExpanded={!!expandedCalls[e.callId]}
                onToggle={() =>
                  setExpandedCalls((prev) => ({
                    ...prev,
                    [e.callId]: !prev[e.callId],
                  }))
                }
                onProductClose={(pIdx, d) => onProductClose(e.callId, pIdx, d)}
                onAssignFieldVisit={(f, p) =>
                  onAssignFieldVisit(e.callId, "Field Visit", f, p)
                }
                onSupportRequest={(p, d) => onSupportRequest(e.callId, p, d)}
                onProductAttend={(pIdx) => onProductAttend(e.callId, pIdx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Assigned for Support */}
      <div className="space-y-[0.8vw]">
        <div className="bg-white rounded-[0.8vw] p-[0.6vw] px-[0.9vw] border border-slate-400 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-[0.6vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">
              Assigned for Support
            </h2>
          </div>
          <Badge
            label={`${assignedForSupportCalls.length} Pending`}
            color="orange"
          />
        </div>

        {assignedForSupportCalls.length === 0 ? (
          <div className="bg-white rounded-[0.8vw] p-[1.8vw] text-center border border-slate-400 text-slate-600 font-bold shadow-sm">
            No support tasks assigned to you.
          </div>
        ) : (
          <div className="grid gap-[0.8vw]">
            {assignedForSupportCalls.map((call) => (
              <EscalationCard
                key={`support-${call.callId}`}
                entry={call}
                currentUser={currentUser}
                employees={employees}
                isSupportDeskAssigned={true}
                isExpanded={!!expandedCalls[`support-${call.callId}`]}
                onToggle={() =>
                  setExpandedCalls((prev) => ({
                    ...prev,
                    [`support-${call.callId}`]: !prev[`support-${call.callId}`],
                  }))
                }
                onRefresh={onRefresh}
                onProductClose={(pIdx, d) =>
                  onProductClose(call.callId, pIdx, d)
                }
                onAssignFieldVisit={(f, p) =>
                  onAssignFieldVisit(call.callId, "Field Visit", f, p)
                }
                onSupportRequest={(p, d) => onSupportRequest(call.callId, p, d)}
                onProductAttend={(pIdx) => onProductAttend(call.callId, pIdx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const VisitsTab = ({
  type,
  queue,
  currentUser,
  onRefresh,
  employees,
  expandedCalls,
  setExpandedCalls,
  onAssignFieldVisit,
  onProductClose,
}) => {
  const activeProducts = [];
  (queue || []).forEach((call) => {
    (call.products || []).forEach((p, pIdx) => {
      if (
        p._fieldVisit &&
        p._fieldVisit.status !== "Closed" &&
        p._productClosure?.status !== "Resolved" &&
        p._productClosure?.status !== "Closed"
      ) {
        activeProducts.push({ call, p, pIdx });
      }
    });
  });

  const allocatedVisits = activeProducts.filter(
    ({ p }) =>
      p._fieldVisit.assignedBy === currentUser?.userId &&
      (p._fieldVisit.assignedTo !== currentUser?.userId ||
        p._fieldVisit.status === "Returned"),
  );
  const assignedVisits = activeProducts.filter(
    ({ p }) =>
      p._fieldVisit.assignedTo === currentUser?.userId &&
      p._fieldVisit.status !== "Returned",
  );

  const getUniqueCalls = (visits) => {
    const callMap = new Map();
    visits.forEach(({ call }) => {
      if (!callMap.has(call._id)) {
        callMap.set(call._id, call);
      }
    });
    return Array.from(callMap.values());
  };

  const allocatedCalls = getUniqueCalls(allocatedVisits);
  const assignedCalls = getUniqueCalls(assignedVisits);

  const handleCloseVisit = async (callId, pIdx) => {
    try {
      await axios.patch(
        `${API_URL}/service-calls/field-visit/${callId}/close`,
        {
          productIdx: pIdx,
          closedBy: currentUser?.userId,
          closedByName: currentUser?.name,
        },
      );
      onRefresh();
    } catch (err) {
      alert("Failed to close field visit");
    }
  };

  return (
    <div className="col-span-2 grid grid-cols-2 gap-[1.5vw]">
      {/* Left Column: Allocated Field Visits */}
      <div className="space-y-[0.8vw]">
        <div className="bg-white rounded-[0.8vw] p-[0.6vw] px-[0.9vw] border border-slate-400 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-[0.6vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">
              Allocated {type}s
            </h2>
          </div>
          <Badge label={`${allocatedCalls.length} Allocated`} color="indigo" />
        </div>

        {allocatedCalls.length === 0 ? (
          <div className="bg-white rounded-[0.8vw] p-[1.8vw] text-center border border-slate-400 text-slate-600 font-bold shadow-sm">
            No field visits allocated by you.
          </div>
        ) : (
          <div className="grid gap-[0.8vw]">
            {allocatedCalls.map((call) => (
              <EscalationCard
                key={`alloc-${call._id}`}
                entry={call}
                currentUser={currentUser}
                employees={employees}
                isFieldVisitTab
                isAllocatedView
                isExpanded={!!expandedCalls[call._id]}
                onToggle={() =>
                  setExpandedCalls((prev) => ({
                    ...prev,
                    [call._id]: !prev[call._id],
                  }))
                }
                onAssignFieldVisit={(f, p) =>
                  onAssignFieldVisit(call._id, "Field Visit", f, p)
                }
                onProductClose={(pIdx, d) => onProductClose(call._id, pIdx, d)}
                onCloseVisit={handleCloseVisit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Assigned Field Visits */}
      <div className="space-y-[0.8vw]">
        <div className="bg-white rounded-[0.8vw] p-[0.6vw] px-[0.9vw] border border-slate-400 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-[0.6vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">
              Assigned {type}s
            </h2>
          </div>
          <Badge label={`${assignedCalls.length} Assigned`} color="amber" />
        </div>

        {assignedCalls.length === 0 ? (
          <div className="bg-white rounded-[0.8vw] p-[1.8vw] text-center border border-slate-400 text-slate-600 font-bold shadow-sm">
            No field visits assigned to you.
          </div>
        ) : (
          <div className="grid gap-[0.8vw]">
            {assignedCalls.map((call) => (
              <EscalationCard
                key={`assign-${call._id}`}
                entry={call}
                currentUser={currentUser}
                employees={employees}
                isFieldVisitTab
                isExpanded={!!expandedCalls[call._id]}
                onToggle={() =>
                  setExpandedCalls((prev) => ({
                    ...prev,
                    [call._id]: !prev[call._id],
                  }))
                }
                onCloseVisit={handleCloseVisit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── History Modal ─────────────────────────────────────────────────────────────
// ── Escalation History Modal ──────────────────────────────────────────────────
const EscalationHistoryModal = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[1vw] shadow-2xl w-full max-w-[45vw] max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="px-[1.5vw] py-[1.2vw] border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-[0.8vw]">
            <History className="w-[1.2vw] h-[1.2vw] text-rose-500" />
            <h2 className="text-[1.2vw] font-black text-slate-800 tracking-tight">
              Escalation History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-[0.5vw] hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-[1.2vw] h-[1.2vw] text-slate-500" />
          </button>
        </div>
        <div className="p-[1.5vw] overflow-y-auto bg-slate-50 flex-1">
          {!history || history.length === 0 ? (
            <div className="text-center p-[2vw] text-slate-500 text-[0.9vw] font-semibold">
              No escalation history found.
            </div>
          ) : (
            <div className="relative pl-[1.5vw] space-y-[1.5vw]">
              <div className="absolute left-[0.4vw] top-[0.5vw] bottom-[0.5vw] w-[2px] bg-slate-200" />
              {history.map((h, i) => (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-[1.5vw] mt-[0.3vw] w-[0.8vw] h-[0.8vw] rounded-full border-2 border-white ${h.reason === "SLA Auto-Escalation" ? "bg-rose-500" : "bg-blue-500"} shadow-sm z-10`}
                  />
                  <div className="bg-white p-[1vw] rounded-[0.8vw] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-[0.5vw]">
                      <div>
                        <div className="font-bold text-slate-800 text-[0.9vw]">
                          {h.engineerName || h.engineerId}
                        </div>
                        <div className="text-slate-500 text-[0.75vw] flex items-center gap-[0.4vw] mt-[0.2vw]">
                          <User className="w-[0.8vw] h-[0.8vw]" /> Level{" "}
                          {h.level} - {h.department}
                        </div>
                      </div>
                    </div>
                    {h.reason && (
                      <div className="mt-[0.6vw] p-[0.6vw] bg-slate-50 rounded-[0.4vw] border border-slate-100 text-[0.8vw] text-slate-700">
                        <span className="font-semibold text-slate-800">
                          Reason:
                        </span>{" "}
                        {h.reason}
                      </div>
                    )}
                    <div className="mt-[0.6vw] flex items-center justify-between text-[0.75vw] text-slate-500">
                      <div className="flex items-center gap-[0.4vw]">
                        <Clock className="w-[0.8vw] h-[0.8vw]" />
                        Assigned: {new Date(h.assignedAt).toLocaleString()}
                      </div>
                      {h.deadline && (
                        <div className="flex items-center gap-[0.4vw] text-rose-500 font-semibold">
                          <AlertCircle className="w-[0.8vw] h-[0.8vw]" />
                          Deadline: {new Date(h.deadline).toLocaleString()}
                        </div>
                      )}
                    </div>
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

const getEscalationDates = (item) => {
  const escHistory = item.product._escalationHistory || [];
  let startDate = "N/A";
  let endDate = "Pending";

  if (escHistory.length > 0) {
    const startObj = new Date(escHistory[0].assignedAt);
    startDate = startObj.toLocaleString("en-GB", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const history = item.product._history || [];
    const closureEvent = history.find(
      (h) => h.status === "Resolved" || h.status === "Closed",
    );

    if (closureEvent) {
      endDate = new Date(closureEvent.timestamp).toLocaleString("en-GB", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
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
    (h) => h.status === "Resolved" || h.status === "Closed",
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

// ── Reports Tab ───────────────────────────────────────────────────────────────
const ReportsTab = ({ currentUser, queue, employees }) => {
  const [activeSubTab, setActiveSubTab] = useState("All");
  const [childTab, setChildTab] = useState("Allocated");
  const [historyModalOpen, setHistoryModalOpen] = useState(null);
  const [escalationModalOpen, setEscalationModalOpen] = useState(null);
  const [allCalls, setAllCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const itemsPerPage = 10;

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportWithHistory, setExportWithHistory] = useState(false);

  const fetchAll = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      const { data } = await axios.get(`${API_URL}/service-calls`);
      setAllCalls(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedCall) => {
      if (updatedCall.deleted) {
        setAllCalls((prev) => prev.filter((c) => c._id !== updatedCall.callId));
        return;
      }
      setAllCalls((prev) => {
        const exists = prev.some((c) => c._id === updatedCall._id);
        return exists
          ? prev.map((c) => (c._id === updatedCall._id ? updatedCall : c))
          : [updatedCall, ...prev];
      });
    };

    // Fallback: If socket disconnects and reconnects, fetch full array to catch up on missed events
    const handleReconnect = () => fetchAll(false);

    socket.on("service_call_updated", handleUpdate);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("service_call_updated", handleUpdate);
      socket.off("connect", handleReconnect);
    };
  }, [socket]);

  const subTabs = [
    "All",
    "Attended",
    "Pending",
    "Supporting",
    "Field Visit",
    "Resolved",
    "Escalation Missed",
  ];

  const { groupedData, tabCounts, childTabCounts } = useMemo(() => {
    const uid = currentUser?.userId;
    if (!uid) return { groupedData: [], tabCounts: {}, childTabCounts: {} };

    let groupsMap = {};
    const counts = {
      All: 0,
      Attended: 0,
      Pending: 0,
      Supporting: 0,
      "Field Visit": 0,
      Resolved: 0,
      "Escalation Missed": 0,
    };
    const childCounts = {
      Supporting_Allocated: 0,
      Supporting_Assigned: 0,
      "Field Visit_Allocated": 0,
      "Field Visit_Assigned": 0,
    };
    const lowerQuery = searchQuery.toLowerCase();

    (allCalls.length > 0 ? allCalls : queue).forEach((call) => {
      let callMatchesForTab = {
        All: false,
        Attended: false,
        Pending: false,
        Supporting: false,
        "Field Visit": false,
        Resolved: false,
      };
      let callMatchesChild = {
        Supporting_Allocated: false,
        Supporting_Assigned: false,
        "Field Visit_Allocated": false,
        "Field Visit_Assigned": false,
      };
      let matchingProductsForActiveTab = [];

      (call.products || []).forEach((p, pIdx) => {
        let missedEscalation = false;
        const hist = p._escalationHistory || [];
        for (let i = 0; i < hist.length; i++) {
          if (hist[i].engineerId === uid) {
            if (
              i + 1 < hist.length &&
              hist[i + 1].reason === "SLA Auto-Escalation"
            ) {
              missedEscalation = true;
              break;
            }
            if (i === hist.length - 1 && p._isCritical && !p._attended) {
              missedEscalation = true;
              break;
            }
          }
        }

        const isUserInvolvedWithoutMissed = Boolean(
          currentUser?.department === "Admin" ||
          (p._assignedEngineerId === uid &&
            p._assigned !== false &&
            !p._isCritical &&
            p._attended) ||
          p._fieldVisit?.assignedBy === uid ||
          p._fieldVisit?.assignedTo === uid ||
          p._supportPersonId === uid ||
          (p._history || []).some(
            (h) => h.status === "Returned from Support" && h.updatedBy === uid,
          ),
        );

        const isUserInvolved = isUserInvolvedWithoutMissed || missedEscalation;

        p.isMissedEscalation = missedEscalation;

        if (!isUserInvolved) return;

        const isAdmin = currentUser?.department === "Admin";
        const isPrimary = p._assignedEngineerId === uid;
        const isFvAssigner = p._fieldVisit?.assignedBy === uid;
        const isSupportPerson = p._supportPersonId === uid;
        const isFvAssignee = p._fieldVisit?.assignedTo === uid;

        const isFullyResolved = Boolean(
          p._productClosure?.status === "Resolved" ||
          p._productClosure?.status === "Closed" ||
          p._resolved,
        );
        const isActuallyPending = Boolean(
          !isFullyResolved &&
          p._productClosure?.status === "Pending" &&
          !p._supportRequested,
        );
        const hasActiveFieldVisit = Boolean(
          !isFullyResolved &&
          !isActuallyPending &&
          (p._productClosure?.status === "Field Visit Required" ||
            p._productClosure?.status === "Returned from Field Visit" ||
            (p._fieldVisit?.isAssigned &&
              p._fieldVisit.status !== "Closed" &&
              p._fieldVisit.status !== "Returned")),
        );
        const hasActiveSupport = Boolean(
          !isFullyResolved &&
          !isActuallyPending &&
          !hasActiveFieldVisit &&
          (p._supportRequested ||
            p._productClosure?.status === "Returned from Support"),
        );

        let supportingAllocated = false;
        let supportingAssigned = false;
        let fieldVisitAllocated = false;
        let fieldVisitAssigned = false;
        let isEscalation = false;
        let isPending = false;
        let isResolvedTab = false;

        if (isFullyResolved) {
          if (isAdmin || isPrimary) isResolvedTab = true;
        } else {
          if (isAdmin || isPrimary || isFvAssigner) {
            if (isActuallyPending) isPending = true;
            else if (
              hasActiveFieldVisit &&
              (!isFvAssignee ||
                p._productClosure?.status === "Returned from Field Visit")
            )
              fieldVisitAllocated = true;
            else if (
              hasActiveSupport &&
              (!isSupportPerson ||
                p._productClosure?.status === "Returned from Support")
            )
              supportingAllocated = true;
            else if (p._attended) isEscalation = true;
          }
        }

        if (
          !hasActiveFieldVisit &&
          (isSupportPerson ||
            (p._history || []).some(
              (h) =>
                h.status === "Returned from Support" && h.updatedBy === uid,
            ))
        ) {
          supportingAssigned = true;
        } else if (isAdmin && hasActiveSupport && p._supportPersonId) {
          supportingAssigned = true;
        }

        if (
          isFvAssignee ||
          (p._history || []).some(
            (h) => h.status === "Field Visit Returned" && h.updatedBy === uid,
          )
        ) {
          fieldVisitAssigned = true;
        } else if (
          isAdmin &&
          hasActiveFieldVisit &&
          p._fieldVisit?.assignedTo
        ) {
          fieldVisitAssigned = true;
        }

        const matchesTab = {
          All: isUserInvolvedWithoutMissed,
          Attended: isEscalation,
          Pending: isPending,
          Supporting: supportingAllocated || supportingAssigned,
          "Field Visit": fieldVisitAllocated || fieldVisitAssigned,
          Resolved: isResolvedTab,
          "Escalation Missed": missedEscalation,
        };

        let searchMatch = true;
        if (lowerQuery.trim() !== "") {
          searchMatch =
            (call.callNumber || "").toLowerCase().includes(lowerQuery) ||
            (call.customerName || "").toLowerCase().includes(lowerQuery) ||
            (call.partyCode || "").toLowerCase().includes(lowerQuery) ||
            (p.productModel || "").toLowerCase().includes(lowerQuery) ||
            (p.itemCode || "").toLowerCase().includes(lowerQuery);
        }

        const pStatus =
          p._productClosure?.status === "Closed" || p._resolved
            ? "Resolved"
            : p._productClosure?.status || "Open";
        let statusMatch = true;
        if (statusFilter !== "All") {
          if (statusFilter === "Resolved" && pStatus !== "Resolved")
            statusMatch = false;
          if (statusFilter === "Pending" && pStatus !== "Pending")
            statusMatch = false;
        }

        if (searchMatch && statusMatch) {
          subTabs.forEach((tab) => {
            if (matchesTab[tab]) callMatchesForTab[tab] = true;
          });

          if (supportingAllocated)
            callMatchesChild["Supporting_Allocated"] = true;
          if (supportingAssigned)
            callMatchesChild["Supporting_Assigned"] = true;
          if (fieldVisitAllocated)
            callMatchesChild["Field Visit_Allocated"] = true;
          if (fieldVisitAssigned)
            callMatchesChild["Field Visit_Assigned"] = true;

          if (matchesTab[activeSubTab]) {
            if (activeSubTab === "Supporting") {
              if (childTab === "Allocated" && supportingAllocated)
                matchingProductsForActiveTab.push({ product: p, pIdx });
              if (childTab === "Assigned" && supportingAssigned)
                matchingProductsForActiveTab.push({ product: p, pIdx });
            } else if (activeSubTab === "Field Visit") {
              if (childTab === "Allocated" && fieldVisitAllocated)
                matchingProductsForActiveTab.push({ product: p, pIdx });
              if (childTab === "Assigned" && fieldVisitAssigned)
                matchingProductsForActiveTab.push({ product: p, pIdx });
            } else {
              matchingProductsForActiveTab.push({ product: p, pIdx });
            }
          }
        }
      });

      subTabs.forEach((tab) => {
        if (callMatchesForTab[tab]) counts[tab]++;
      });
      Object.keys(callMatchesChild).forEach((k) => {
        if (callMatchesChild[k]) childCounts[k]++;
      });

      if (matchingProductsForActiveTab.length > 0) {
        groupsMap[call._id] = { call, products: matchingProductsForActiveTab };
      }
    });

    counts["Supporting"] =
      childCounts["Supporting_Allocated"] + childCounts["Supporting_Assigned"];
    counts["Field Visit"] =
      childCounts["Field Visit_Allocated"] +
      childCounts["Field Visit_Assigned"];

    return {
      groupedData: Object.values(groupsMap).sort(
        (a, b) =>
          new Date(b.call.createdAt).getTime() -
          new Date(a.call.createdAt).getTime(),
      ),
      tabCounts: counts,
      childTabCounts: childCounts,
    };
  }, [queue, currentUser, activeSubTab, childTab, allCalls, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedData.slice(start, start + itemsPerPage);
  }, [groupedData, currentPage]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);

  const executeExport = () => {
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

    if (activeSubTab === "All") headers.push("Status");
    if (exportWithHistory) headers.push("History");

    const rows = [];
    groupedData.forEach((group, gIdx) => {
      group.products.forEach((item, pIdx) => {
        let row;

        if (exportFormat === "excel") {
          row = [
            pIdx === 0 ? gIdx + 1 : "",
            pIdx === 0 ? group.call.callNumber : "",
            pIdx === 0
              ? new Date(group.call.createdAt).toLocaleString("en-GB", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "",
            pIdx === 0
              ? group.call.customerType || group.call.callCategory || "OEM"
              : "",
            pIdx === 0 ? group.call.customerName : "",
            pIdx === 0
              ? group.call.partyCode || group.call.customerCode || "N/A"
              : "",
            item.product.productModel || item.product.itemCode,
            item.product.productSegment || group.call.segment || "N/A",
            item.product.errorCode || "N/A",
            item.product.callDescription || group.call.callDescription || "N/A",
            pIdx === 0 ? group.call.callMode || "Phone" : "",
          ];
          const dates = getEscalationDates(item);
          row.push(dates.startDate, dates.endDate);
          row.push(getEscalationDuration(item));

          const getRemarks = (statuses) => {
            const events = (item.product._history || []).filter((h) =>
              statuses.includes(h.status),
            );
            if (events.length === 0) return "";
            if (events.length === 1) return events[0].remarks || "N/A";
            return events
              .map((e, idx) => `${idx + 1}. ${e.remarks || "N/A"}`)
              .join("\n");
          };

          row.push(getRemarks(["Pending", "Updated"]));
          row.push(getRemarks(["Support Requested"]));
          row.push(
            getRemarks([
              "Field Visit Assigned",
              "Field Visit Requested",
              "Field Visit Required",
            ]),
          );
          row.push(getRemarks(["Resolved", "Closed"]));
        } else {
          row = [
            pIdx === 0 ? gIdx + 1 : "",
            pIdx === 0
              ? `${group.call.callNumber} - ${new Date(group.call.createdAt).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}`
              : "",
            pIdx === 0
              ? group.call.customerType || group.call.callCategory || "OEM"
              : "",
            pIdx === 0
              ? `${group.call.customerName} (Cus ${group.call.partyCode || group.call.customerCode || "N/A"})`
              : "",
            `${item.product.productModel || item.product.itemCode}\n(${item.product.productSegment || group.call.segment || "N/A"})`,
            item.product.errorCode || "N/A",
            pIdx === 0 ? group.call.callMode || "Phone" : "",
          ];
          row.push(getEscalationDuration(item));
        }
        if (activeSubTab === "All") {
          const pStatus =
            item.product._productClosure?.status ||
            (item.product._resolved ? "Resolved" : "Open");
          row.push(pStatus === "Closed" ? "Resolved" : pStatus);
        }
        if (exportWithHistory) {
          let historyText = "";

          if (activeSubTab === "Escalation Missed") {
            const escHistory =
              group.call._escalationHistory ||
              group.call.escalationHistory ||
              [];
            historyText = escHistory
              .map((h) => {
                const assignedDt = h.assignedAt
                  ? new Date(h.assignedAt).toLocaleString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "N/A";
                const deadlineDt = h.deadline
                  ? new Date(h.deadline).toLocaleString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "N/A";

                let text = `[Level ${h.level}] Assigned to: ${h.engineerName || h.engineerId} (${h.department || "N/A"})\n`;
                text += `Assigned At: ${assignedDt} | Deadline: ${deadlineDt}\n`;
                if (h.reason) text += `Reason: ${h.reason}\n`;
                if (h.escalatedAt)
                  text += `Escalated At: ${new Date(h.escalatedAt).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}`;
                return text.trim();
              })
              .join("\n--------------------------------------------------\n");
          } else {
            historyText = (item.product._history || [])
              .map((h) => {
                const dt = new Date(h.timestamp).toLocaleString("en-US", {
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
          }

          row.push(historyText || "No history");
        }
        rows.push(row);
      });
    });

    const exportDateStr = `Export Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    let displayFilter = activeSubTab;
    if (activeSubTab === "Supporting") {
      displayFilter =
        childTab === "Allocated" ? "Asked for support" : "Assigned for support";
    } else if (activeSubTab === "Field Visit") {
      displayFilter =
        childTab === "Allocated"
          ? "Allocated Field Visit"
          : "Assigned Field Visit";
    }

    const statusStr = `Status Filter: ${displayFilter}`;
    const userStr = `Generated By: ${currentUser?.name || "Unknown"} (${currentUser?.department || currentUser?.dept || "Unknown"})`;

    if (exportFormat === "excel") {
      const metaRows = [[exportDateStr], [statusStr], [userStr], []];
      const aoaData = [
        ...metaRows,
        headers,
        ...rows.map((r) =>
          r.map((c) => (typeof c === "object" && c !== null ? c.content : c)),
        ),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Action Logs");
      XLSX.writeFile(
        workbook,
        `Action_Logs_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } else {
      const doc = new jsPDF("landscape");
      doc.setFontSize(10);
      doc.text("Action Logs", 14, 15);
      doc.text(exportDateStr, 14, 20);
      doc.text(statusStr, 14, 25);
      doc.text(userStr, 14, 30);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
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
    <div className="w-full h-full bg-white rounded-[0.8vw] shadow-sm border border-slate-300 overflow-hidden col-span-2 flex flex-col flex-1 min-h-0">
      {/* Sub Tabs */}
      <div className="flex flex-col border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between p-[1vw]">
          <div className="flex gap-[0.5vw]">
            {subTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveSubTab(tab);
                  setChildTab("Allocated");
                  setCurrentPage(1);
                }}
                className={`px-[1.2vw] py-[0.5vw] rounded-[2vw] text-[0.8vw] font-bold border transition-colors cursor-pointer ${
                  activeSubTab === tab
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {tab} ({tabCounts[tab] || 0})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-[0.8vw]">
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

        {(activeSubTab === "Supporting" || activeSubTab === "Field Visit") && (
          <div className="px-[1vw] pb-[0.8vw] pt-0">
            <div className="inline-flex bg-slate-200/70 p-[0.2vw] rounded-[0.5vw]">
              <button
                onClick={() => {
                  setChildTab("Allocated");
                  setCurrentPage(1);
                }}
                className={`px-[1.2vw] py-[0.3vw] rounded-[0.3vw] text-[0.75vw] font-bold transition-all duration-200 cursor-pointer ${
                  childTab === "Allocated"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-300/50"
                }`}
              >
                {activeSubTab === "Supporting"
                  ? "Asked for support"
                  : activeSubTab === "Field Visit"
                    ? "Allocated Field Visit"
                    : "Allocated"}{" "}
                ({childTabCounts[`${activeSubTab}_Allocated`] || 0})
              </button>
              <button
                onClick={() => {
                  setChildTab("Assigned");
                  setCurrentPage(1);
                }}
                className={`px-[1.2vw] py-[0.3vw] rounded-[0.3vw] text-[0.75vw] font-bold transition-all duration-200 cursor-pointer ${
                  childTab === "Assigned"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-300/50"
                }`}
              >
                {activeSubTab === "Supporting"
                  ? "Assigned for support"
                  : activeSubTab === "Field Visit"
                    ? "Assigned Field Visit"
                    : "Assigned"}{" "}
                ({childTabCounts[`${activeSubTab}_Assigned`] || 0})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-sm bg-slate-100">
              <tr className="bg-slate-100 text-slate-700 text-[0.85vw] font-semibold border-b border-slate-300">
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
                  Segment
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Error Code
                </th>
                <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                  Mode
                </th>
                {(activeSubTab === "All" ||
                  activeSubTab === "Supporting" ||
                  activeSubTab === "Field Visit") && (
                  <th className="px-[0.6vw] py-[1vw] w-[10%] border-r border-slate-300 whitespace-nowrap">
                    Status
                  </th>
                )}
                <th className="px-[0.6vw] py-[1vw] w-[12%] text-center whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-[3vw] text-center text-slate-500 font-bold text-[0.9vw]"
                  >
                    No {activeSubTab.toLowerCase()} records found.
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
                                  "en-US",
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
                        </td>
                        <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                          <div className="text-[0.9vw] font-semibold text-slate-800">
                            {item.product.productSegment ||
                              group.call.segment ||
                              "N/A"}
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
                        {(activeSubTab === "All" ||
                          activeSubTab === "Supporting" ||
                          activeSubTab === "Field Visit") && (
                          <td className="px-[0.6vw] py-[1vw] border-r border-slate-300 whitespace-nowrap">
                            <span
                              className={`px-[0.6vw] py-[0.2vw] rounded-[0.4vw] text-[0.85vw] font-semibold inline-block whitespace-nowrap ${(() => {
                                const uid = currentUser?.userId;
                                const pStatus =
                                  item.product._productClosure?.status ||
                                  (item.product._resolved
                                    ? "Resolved"
                                    : "Open");
                                if (
                                  pStatus === "Resolved" ||
                                  pStatus === "Closed"
                                )
                                  return "bg-emerald-50 text-emerald-700 border border-emerald-200";

                                if (pStatus === "Returned from Support")
                                  return "bg-gray-100 text-gray-700 border border-gray-300";
                                if (
                                  pStatus === "Returned from Field Visit" ||
                                  pStatus === "Field Visit Returned"
                                )
                                  return "bg-gray-100 text-gray-700 border border-gray-300";

                                const isFieldVisitActive =
                                  pStatus === "Field Visit Required" ||
                                  (item.product._fieldVisit?.isAssigned &&
                                    item.product._fieldVisit?.status !==
                                      "Closed" &&
                                    item.product._fieldVisit?.status !==
                                      "Returned");
                                if (isFieldVisitActive) {
                                  if (
                                    item.product._fieldVisit?.assignedTo ===
                                      uid &&
                                    item.product._assignedEngineerId !== uid
                                  ) {
                                    return "bg-blue-50 text-blue-700 border border-blue-200";
                                  }
                                  return "bg-amber-50 text-amber-700 border border-amber-200"; // Generic field visit active color
                                }

                                if (
                                  item.product._supportPersonId === uid &&
                                  item.product._assignedEngineerId !== uid
                                ) {
                                  return "bg-blue-50 text-blue-700 border border-blue-200";
                                }
                                const isReturnedSupport = (
                                  item.product._history || []
                                ).some(
                                  (h) =>
                                    h.status === "Returned from Support" &&
                                    h.updatedBy === uid,
                                );
                                if (isReturnedSupport)
                                  return "bg-gray-100 text-gray-700 border border-gray-300";

                                const isReturnedFieldVisit = (
                                  item.product._history || []
                                ).some(
                                  (h) =>
                                    h.status === "Field Visit Returned" &&
                                    h.updatedBy === uid,
                                );
                                if (isReturnedFieldVisit)
                                  return "bg-gray-100 text-gray-700 border border-gray-300";

                                if (
                                  item.product._supportRequested &&
                                  !item.product._resolved &&
                                  pStatus !== "Closed"
                                ) {
                                  return "bg-blue-50 text-blue-700 border border-blue-200";
                                }
                                if (pStatus === "Pending")
                                  return "bg-amber-50 text-amber-700 border border-amber-200";
                                if (
                                  pStatus === "Open" &&
                                  item.product._attended
                                )
                                  return "bg-indigo-50 text-indigo-700 border border-indigo-200";
                                return "bg-slate-50 text-slate-700 border border-slate-200";
                              })()}`}
                            >
                              {(() => {
                                const uid = currentUser?.userId;
                                const pStatus =
                                  item.product._productClosure?.status ||
                                  (item.product._resolved
                                    ? "Resolved"
                                    : "Open");
                                if (
                                  pStatus === "Resolved" ||
                                  pStatus === "Closed"
                                )
                                  return "Resolved";

                                if (pStatus === "Returned from Support")
                                  return "Returned Support";
                                if (
                                  pStatus === "Returned from Field Visit" ||
                                  pStatus === "Field Visit Returned"
                                )
                                  return "Returned Field Visit";

                                const isFieldVisitActive =
                                  pStatus === "Field Visit Required" ||
                                  (item.product._fieldVisit?.isAssigned &&
                                    item.product._fieldVisit?.status !==
                                      "Closed" &&
                                    item.product._fieldVisit?.status !==
                                      "Returned");
                                if (isFieldVisitActive) {
                                  if (
                                    item.product._fieldVisit?.assignedTo ===
                                      uid &&
                                    item.product._assignedEngineerId !== uid
                                  ) {
                                    return "Assigned Field Visit";
                                  }
                                  return "Field Visit"; // Or whatever pStatus says, but "Field Visit" is clear
                                }

                                if (
                                  item.product._supportPersonId === uid &&
                                  item.product._assignedEngineerId !== uid
                                ) {
                                  return "Assigned Support";
                                }
                                const isReturnedSupport = (
                                  item.product._history || []
                                ).some(
                                  (h) =>
                                    h.status === "Returned from Support" &&
                                    h.updatedBy === uid,
                                );
                                if (isReturnedSupport)
                                  return "Returned Support";

                                const isReturnedFieldVisit = (
                                  item.product._history || []
                                ).some(
                                  (h) =>
                                    h.status === "Field Visit Returned" &&
                                    h.updatedBy === uid,
                                );
                                if (isReturnedFieldVisit)
                                  return "Returned Field Visit";

                                if (
                                  item.product._supportRequested &&
                                  !item.product._resolved &&
                                  pStatus !== "Closed"
                                ) {
                                  return "Support Requested";
                                }
                                if (
                                  pStatus === "Open" &&
                                  item.product._attended
                                )
                                  return "Attended";
                                return pStatus;
                              })()}
                            </span>
                          </td>
                        )}
                        <td className="px-[0.6vw] py-[1vw] text-center whitespace-nowrap">
                          {activeSubTab === "Escalation Missed" ? (
                            <button
                              onClick={() =>
                                setEscalationModalOpen(item.product)
                              }
                              className="inline-flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-rose-50 border border-rose-300 rounded-[0.5vw] hover:bg-rose-100 text-rose-700 font-bold text-[0.75vw] transition-colors cursor-pointer shadow-sm"
                            >
                              <History className="w-[1vw] h-[1vw]" />
                              Escalation History
                            </button>
                          ) : (
                            <button
                              onClick={() => setHistoryModalOpen(item.product)}
                              className="inline-flex items-center gap-[0.3vw] px-[0.8vw] py-[0.4vw] bg-white border border-slate-300 rounded-[0.5vw] hover:bg-slate-50 text-slate-700 font-bold text-[0.75vw] transition-colors cursor-pointer shadow-sm"
                            >
                              <History className="w-[1vw] h-[1vw]" />
                              View History
                            </button>
                          )}
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
        <div className="flex items-center justify-between p-[0.8vw] border-t border-slate-200 bg-slate-50 flex-shrink-0">
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
            currentUser={currentUser}
            onClose={() => setHistoryModalOpen(null)}
          />
        )}

        {escalationModalOpen && (
          <EscalationHistoryModal
            history={escalationModalOpen._escalationHistory}
            onClose={() => setEscalationModalOpen(null)}
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

// ── Main Component ────────────────────────────────────────────────────────────
const ServiceCallResponse = () => {
  const { timers } = useEscalationWorker();
  const [queue, setQueue] = useState([]);
  const [activeTab, setActiveTab] = useState("escalation");
  const [expandedCalls, setExpandedCalls] = useState({});
  const [loggedInUser, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { socket } = useSocket();

  const { toast } = useNotification();

  const [supportReqs, setSupportReqs] = useState([]);
  const [fieldVisits, setFieldVisits] = useState([]);
  const [employees, setEmployees] = useState([]);

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
          axios.get(`${API_URL}/auth/employees`),
        ];

        if (u?.userId) {
          promises.push(
            axios.get(`${API_URL}/service-calls/support/${u.userId}`),
          );
          promises.push(
            axios.get(`${API_URL}/service-calls/field-visit/${u.userId}`),
          );
        }

        const [activeRes, empRes, supportRes, visitRes] =
          await Promise.all(promises);

        setQueue(activeRes.data.map((call) => ({ ...call, callId: call._id })));
        setEmployees(empRes.data);
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(empRes.data));

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

  const myEscalations = useMemo(() => {
    const uid = loggedInUser?.userId;
    const isAdmin = loggedInUser?.department === "Admin";
    return queue.filter((e) => {
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
  }, [queue, loggedInUser]);

  const liveCounts = useMemo(() => {
    const uid = loggedInUser?.userId;

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
      escalation: myEscalations.length,
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
  }, [queue, loggedInUser, myEscalations]);

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
    {
      id: "reports",
      label: "Action Logs",
      icon: BarChart2,
      color: "from-slate-800 to-slate-900 shadow-slate-900/20",
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
      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      setQueue(data.map((call) => ({ ...call, callId: call._id })));

      const sRes = await axios.get(
        `${API_URL}/service-calls/support/${loggedInUser.userId}`,
      );
      setSupportReqs(sRes.data);

      const fRes = await axios.get(
        `${API_URL}/service-calls/field-visit/${loggedInUser.userId}`,
      );
      setFieldVisits(fRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Removed blocking full-screen loading spinner

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] text-[0.85vw] bg-slate-100/70 overflow-hidden pb-[0.6vw]">
      {/* Premium Glass-Effect Tab Container */}
      <div className="flex gap-[0.5vw] mb-[0.8vw] bg-white/80 backdrop-blur-md border border-slate-400 rounded-[0.8vw] p-[0.35vw] sticky top-0 z-10 shadow-sm flex-shrink-0">
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
            {activeTab === t.id && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 opacity-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
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
                  : "grid grid-cols-2 gap-[0.8vw] items-start flex-1 overflow-y-auto pr-[0.3vw] pb-[2vw]"
              }
            >
              {activeTab === "escalation" &&
                (myEscalations.length === 0 ? (
                  <div className="bg-white rounded-[0.8vw] p-[3vw] text-center border border-slate-400 text-slate-650 font-bold shadow-sm col-span-2">
                    <p>
                      No valid calls available in your queue to work on at this
                      moment.
                    </p>
                  </div>
                ) : (
                  myEscalations.map((e) => (
                    <EscalationCard
                      key={e._id || e.callId}
                      entry={e}
                      currentUser={loggedInUser}
                      employees={employees}
                      timer={timers.find((t) => t.callNumber === e.callNumber)}
                      isExpanded={!!expandedCalls[e._id || e.callId]}
                      onToggle={() =>
                        setExpandedCalls((prev) => ({
                          ...prev,
                          [e._id || e.callId]: !prev[e._id || e.callId],
                        }))
                      }
                      onSupportRequest={(p, d) =>
                        handleSupportRequest(e._id || e.callId, p, d)
                      }
                      onAssignFieldVisit={(f, p) =>
                        handleAssignVisit(e.callId, "Field Visit", f, p)
                      }
                      onProductClose={(p, d) =>
                        handleProductClose(e.callId, p, d)
                      }
                      onProductAttend={(pIdx) =>
                        handleProductAttend(e.callId, pIdx)
                      }
                    />
                  ))
                ))}
              {activeTab === "pending" && (
                <PendingTab
                  queue={queue}
                  currentUser={loggedInUser}
                  employees={employees}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  expandedCalls={expandedCalls}
                  setExpandedCalls={setExpandedCalls}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                />
              )}
              {activeTab === "support" && (
                <SupportRequestsTab
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  queue={queue}
                  employees={employees}
                  expandedCalls={expandedCalls}
                  setExpandedCalls={setExpandedCalls}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                />
              )}
              {activeTab === "fieldvisit" && (
                <VisitsTab
                  type="Field Visit"
                  queue={queue}
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  employees={employees}
                  expandedCalls={expandedCalls}
                  setExpandedCalls={setExpandedCalls}
                  onAssignFieldVisit={handleAssignVisit}
                  onProductClose={handleProductClose}
                />
              )}
              {activeTab === "reports" && (
                <ReportsTab
                  currentUser={loggedInUser}
                  queue={queue}
                  employees={employees}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ServiceCallResponse;
