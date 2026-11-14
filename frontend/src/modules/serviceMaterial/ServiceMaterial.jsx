// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  Search,
  X,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Edit3,
  ArrowLeft,
  Plus,
  Clock,
  User,
  Package,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Shield,
  FileText,
  History,
  Wrench,
  Calendar,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import EditableProductTable from "./EditableProductTable";
import ServiceMaterialForm from "./ServiceMaterialForm";
import CustomDropdown from "../../components/CustomDropdown";
import { io } from "socket.io-client";
import useModulePermissions from "../../components/useModulePermissions";

const API_URL = import.meta.env.VITE_API_URL;

// Storage Keys
const INWARD_KEY = "service_material_inward_v2";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const EMPLOYEES_KEY = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const ITEMS_PER_PAGE = 10;

// Status/Type Options
const FINAL_STATUS_OPTIONS = [
  "Pending",
  "Completed",
  "Hold",
  "Not Repairable",
  "Under Testing",
];
const TYPE_OPTIONS = ["W", "PW"];
const TYPE_LABELS = { W: "Warranty", PW: "Post Warranty" };

const FINAL_STATUS_COLORS = {
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Hold: "bg-rose-100 text-rose-800 border-rose-300",
  "Not Repairable": "bg-slate-200 text-slate-800 border-slate-300",
  "Admin Returned": "bg-rose-100 text-rose-800 border-rose-300",
};

// Employee-side status display (from `prod.report.status` / `prod.status`)
// NOTE: This is separate from the supervisor "Final Status" flow.
const STATUS_CONFIG = {
  Open: {
    icon: AlertCircle,
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
  },
  Assigned: {
    icon: User,
    bg: "bg-violet-100/70",
    border: "border-violet-300/70",
    text: "text-violet-800",
  },
  "Under Testing": {
    icon: Wrench,
    bg: "bg-sky-100/70",
    border: "border-sky-300/70",
    text: "text-sky-800",
  },
  "Repair in Progress": {
    icon: Wrench,
    bg: "bg-amber-100/70",
    border: "border-amber-300/70",
    text: "text-amber-800",
  },
  Pending: {
    icon: Clock,
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
  },
  Completed: {
    icon: CheckCircle2,
    bg: "bg-emerald-100/70",
    border: "border-emerald-300/70",
    text: "text-emerald-800",
  },
  "Not Repairable": {
    icon: AlertTriangle,
    bg: "bg-rose-100/70",
    border: "border-rose-300/70",
    text: "text-rose-800",
  },
};

// Helpers
const lsLoad = (key, fb) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const genRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SMI-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const todayDateStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (s) => {
  if (!s) return "—";
  if (s.includes("T")) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  if (s.includes("-") && s.split("-")[0].length === 4) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  return s;
};

const toDateObj = (str) => {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4)
      return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(str);
};

const emptyProduct = () => ({
  _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productCode: "",
  productDescription: "",
  productSegment: "",
  serialNumber: "",
  boardType: "",
  qty: "1",
  type: "W",
  expectedDeliveryDate: "",
  status: "Open",
  escalationLevel: 0,
  escalationHistory: [],
  assignedTo: "",
  assignedToName: "",
  assignedDepartment: "",
});

const emptyBase = () => ({
  date: todayDateStr(),
  refNoCustomer: "",
  refNoInternal: "",
  customerName: "",
  customerCode: "",
  site: "",
  category: "",
  assignedTo: "",
  assignedToName: "",
  assignedDepartment: "",
  finalStatus: "Pending",
  finalStatusRemarks: "",
});

// Avatar
const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

const Avatar = ({ name, size = "md" }) => {
  const sz = {
    sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]",
    md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]",
    lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]",
  };
  return (
    <div
      title={name}
      className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-slate-800 flex-shrink-0 ${sz[size]}`}
    >
      {initials(name)}
    </div>
  );
};


// Board Type Master Modal
const BoardTypeMasterModal = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState({ name: "" });
  const { toast } = useNotification();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/master/board-types`);
      setItems(res.data);
    } catch (err) {
      toast("Failed to fetch Board Types", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return toast("Name is required", "error");
    try {
      await axios.post(`${API_URL}/master/board-types`, newItem);
      toast("Added successfully", "success");
      setNewItem({ name: "" });
      fetchItems();
    } catch (err) {
      toast("Failed to add", "error");
    }
  };

  const handleUpdate = async (id) => {
    if (!editItem.name.trim()) return toast("Name is required", "error");
    try {
      await axios.put(`${API_URL}/master/board-types/${id}`, editItem);
      toast("Updated successfully", "success");
      setEditingId(null);
      fetchItems();
    } catch (err) {
      toast("Failed to update", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Board Type?"))
      return;
    try {
      await axios.delete(`${API_URL}/master/board-types/${id}`);
      toast("Deleted successfully", "success");
      fetchItems();
    } catch (err) {
      toast("Failed to delete", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[0.8vw] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200 w-[38vw] max-h-[68vh] flex flex-col overflow-hidden"
      >
        {/* Clean Header matching Service Call Modals */}
        <div className="bg-white px-[1.2vw] py-[0.85vw] flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-[0.55vw]">
            <div className="w-[2vw] h-[2vw] rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a73e8]">
              <Wrench className="w-[1vw] h-[1vw]" />
            </div>
            <div>
              <h3 className="text-[0.95vw] font-semibold text-slate-800 tracking-tight">
                Manage Board Types
              </h3>
              <p className="text-[0.7vw] text-slate-500">
                Add, edit or delete board types master data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors p-[0.3vw] hover:bg-slate-100 rounded-full"
            title="Close"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Input Form with modern pill styling */}
        <div className="p-[1.2vw] bg-slate-50/60 border-b border-slate-200">
          <form onSubmit={handleAdd} className="flex gap-[0.7vw] items-end">
            <div className="flex-1 space-y-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-slate-700">
                Board Type Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="w-full border border-slate-300 rounded-[0.4vw] px-[0.7vw] py-[0.45vw] text-[0.78vw] font-medium text-slate-800 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                placeholder="e.g. Main Board"
              />
            </div>
            <button
              type="submit"
              className="px-[1vw] h-[2.2vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-[0.75vw] font-semibold cursor-pointer transition-all shadow-2xs flex items-center gap-[0.35vw] active:scale-95"
            >
              <Plus className="w-[0.85vw] h-[0.85vw]" /> Add
            </button>
          </form>
        </div>

        {/* Master Table List */}
        <div className="flex-1 overflow-hidden p-[1.2vw] bg-white flex flex-col min-h-0">
          {loading ? (
            <div className="text-center text-[0.8vw] text-slate-500 py-[2vw]">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-[0.8vw] text-slate-400 py-[2vw]">
              No board types found.
            </div>
          ) : (
            <div className="border border-slate-300 rounded-[0.6vw] overflow-hidden flex flex-col flex-1 min-h-0">
              <table className="w-full border-collapse table-fixed">
                <thead className="shrink-0 bg-[#E9EDF7]">
                  <tr className="border-b border-slate-300">
                    <th className="text-left py-[0.55vw] px-[0.8vw] text-[0.72vw] font-bold text-slate-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-right py-[0.55vw] px-[0.8vw] text-[0.72vw] font-bold text-slate-700 uppercase tracking-wider w-[22%]">
                      Actions
                    </th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full border-collapse table-fixed">
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                      >
                        {editingId === item._id ? (
                          <>
                            <td className="py-[0.45vw] px-[0.8vw]">
                              <input
                                type="text"
                                value={editItem.name}
                                onChange={(e) =>
                                  setEditItem({ ...editItem, name: e.target.value })
                                }
                                className="w-full border border-blue-400 rounded-[0.35vw] px-[0.5vw] py-[0.3vw] text-[0.78vw] font-medium outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                            <td className="py-[0.45vw] px-[0.8vw] text-right w-[22%]">
                              <div className="flex items-center justify-end gap-[0.3vw]">
                                <button
                                  onClick={() => handleUpdate(item._id)}
                                  className="text-emerald-600 hover:text-emerald-700 p-[0.3vw] hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                  title="Save"
                                >
                                  <Save className="w-[0.85vw] h-[0.85vw]" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-slate-400 hover:text-slate-600 p-[0.3vw] hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-[0.85vw] h-[0.85vw]" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-[0.55vw] px-[0.8vw] text-[0.78vw] font-normal text-slate-800">
                              {item.name}
                            </td>
                            <td className="py-[0.55vw] px-[0.8vw] text-right w-[22%]">
                              <div className="flex items-center justify-end gap-[0.3vw]">
                                <button
                                  onClick={() => {
                                    setEditingId(item._id);
                                    setEditItem({ name: item.name });
                                  }}
                                  className="text-slate-500 hover:text-[#1a73e8] p-[0.3vw] hover:bg-blue-50 rounded-full cursor-pointer transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-[0.85vw] h-[0.85vw]" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id)}
                                  className="text-slate-400 hover:text-rose-600 p-[0.3vw] hover:bg-rose-50 rounded-full cursor-pointer transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Product Report Modal (White Theme matching ServiceCall CallDetailsModal)
const ProductReportModal = ({ product, onClose }) => {
  if (!product || !product.report) return null;
  const r = product.report;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white w-[46vw] max-w-[650px] max-h-[88vh] rounded-[1.2vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - White theme matching CallDetailsModal */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.75vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="flex items-center gap-[0.45vw] flex-wrap">
                <span className="font-medium text-[0.95vw] text-slate-900 tracking-tight">
                  Technical Report Details
                </span>
                {r.disposition && (
                  <span className="inline-flex items-center gap-[0.25vw] px-[0.45vw] py-[0.08vw] rounded-full text-[0.66vw] font-normal border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="w-[0.32vw] h-[0.32vw] rounded-full bg-emerald-500" />
                    {r.disposition}
                  </span>
                )}
                {product.type && (
                  <span className="inline-flex items-center px-[0.45vw] py-[0.08vw] rounded-full text-[0.66vw] font-normal border bg-blue-50 text-blue-700 border-blue-200">
                    {product.type === "W" ? "Warranty" : "Paid"}
                  </span>
                )}
              </div>
              <div className="text-[0.72vw] text-slate-500 font-normal mt-[0.1vw] flex items-center gap-[0.3vw] truncate max-w-[30vw]">
                <span>{product.productDescription || "Service Report"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-[0.45vw] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
            title="Close modal"
          >
            <X className="w-[1.05vw] h-[1.05vw]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-[1.3vw] space-y-[1vw] bg-slate-50/50">
          {/* 1. Product & Service Execution Cards */}
          <div className="grid grid-cols-2 gap-[0.9vw]">
            {/* Product Info Card */}
            <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1vw] shadow-2xs space-y-[0.6vw]">
              <div className="flex items-center justify-between pb-[0.45vw] border-b border-slate-100">
                <span className="text-[0.74vw] font-medium text-slate-800 flex items-center gap-[0.35vw]">
                  <Package className="w-[0.8vw] h-[0.8vw] text-blue-600" />
                  Product Info
                </span>
                <span className="font-mono text-[0.68vw] text-slate-500 bg-slate-100 px-[0.35vw] py-[0.08vw] rounded border border-slate-200/80">
                  {product.productCode || "Item"}
                </span>
              </div>

              <div className="space-y-[0.4vw] text-[0.74vw]">
                <div className="font-medium text-slate-800 leading-snug line-clamp-2" title={product.productDescription}>
                  {product.productDescription || "—"}
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-[0.2vw]">
                  <span className="text-slate-400 font-normal">Serial Number</span>
                  <span className="font-mono text-slate-800 font-normal">{product.serialNumber || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-normal">Board Type</span>
                  <span className="text-slate-800 font-normal">{product.boardType || "—"}</span>
                </div>
              </div>
            </div>

            {/* Service Execution Card */}
            <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1vw] shadow-2xs space-y-[0.6vw]">
              <div className="flex items-center justify-between pb-[0.45vw] border-b border-slate-100">
                <span className="text-[0.74vw] font-medium text-slate-800 flex items-center gap-[0.35vw]">
                  <User className="w-[0.8vw] h-[0.8vw] text-indigo-600" />
                  Service Execution
                </span>
                <span className="text-[0.68vw] text-slate-500 font-normal">
                  Technician
                </span>
              </div>

              <div className="space-y-[0.4vw] text-[0.74vw]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-normal">Tested By</span>
                  <span className="text-slate-800 font-medium">{r.testedBy || "—"}</span>
                </div>
                {r.fqaBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-normal">FQA By</span>
                    <span className="text-slate-800 font-normal">{r.fqaBy}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-normal">Completed Date</span>
                  <span className="text-slate-800 font-normal">
                    {r.completedDate ? fmtDate(r.completedDate) : "—"}
                  </span>
                </div>
                {r.timeInHours && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-normal">Time (Hours)</span>
                    <span className="text-slate-800 font-normal">{r.timeInHours} hrs</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Key Attributes Grid (4M Category, Error Code, Disposition) */}
          <div className="grid grid-cols-3 gap-[0.7vw]">
            <div className="bg-white p-[0.75vw] rounded-[0.6vw] border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">
                4M Category
              </span>
              <span className="font-normal text-slate-800 text-[0.78vw] mt-[0.15vw] block">
                {r.fourMCategory || "—"}
              </span>
            </div>

            <div className="bg-white p-[0.75vw] rounded-[0.6vw] border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">
                Error Code
              </span>
              <span className="font-mono font-normal text-slate-800 text-[0.78vw] mt-[0.15vw] block">
                {r.errorCode || "—"}
              </span>
            </div>

            <div className="bg-white p-[0.75vw] rounded-[0.6vw] border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[0.64vw] font-normal uppercase tracking-wider">
                Disposition
              </span>
              <span className="font-normal text-emerald-700 text-[0.78vw] mt-[0.15vw] block">
                {r.disposition || "—"}
              </span>
            </div>
          </div>

          {/* 3. Detailed Technical Analysis */}
          <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.1vw] shadow-2xs space-y-[0.8vw]">
            <div>
              <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.25vw]">
                Problem Description
              </span>
              <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.6vw] rounded-[0.4vw] border border-slate-200 font-normal leading-relaxed">
                {r.problemDescription ? r.problemDescription : <span className="text-slate-400 italic">No description recorded.</span>}
              </div>
            </div>

            <div>
              <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.25vw]">
                Root Cause
              </span>
              <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.6vw] rounded-[0.4vw] border border-slate-200 font-normal leading-relaxed">
                {r.rootCause ? r.rootCause : <span className="text-slate-400 italic">No root cause recorded.</span>}
              </div>
            </div>

            <div>
              <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.25vw]">
                Corrective Action
              </span>
              <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.6vw] rounded-[0.4vw] border border-slate-200 font-normal leading-relaxed">
                {r.correctiveAction ? r.correctiveAction : <span className="text-slate-400 italic">No corrective action recorded.</span>}
              </div>
            </div>

            {r.designators && (
              <div>
                <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.25vw]">
                  Designators
                </span>
                <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.6vw] rounded-[0.4vw] border border-slate-200 font-mono leading-relaxed">
                  {r.designators}
                </div>
              </div>
            )}

            {r.partsReplacement && (
              <div>
                <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.35vw]">
                  Parts Replaced
                </span>
                <div className="flex flex-wrap gap-[0.35vw]">
                  {r.partsReplacement
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((part, i) => (
                      <span
                        key={i}
                        className="text-[0.72vw] font-normal text-slate-700 bg-slate-100 border border-slate-200/90 px-[0.55vw] py-[0.18vw] rounded-[0.35vw] flex items-center gap-[0.3vw]"
                      >
                        <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-blue-500" />
                        {part}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Report Attachment Preview */}
          {r.image && (
            <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1vw] shadow-2xs flex flex-col gap-[0.5vw]">
              <span className="text-[0.66vw] font-normal text-slate-400 uppercase tracking-wider">
                Report Attachment (Image / PDF)
              </span>
              <div className="rounded-[0.5vw] overflow-hidden border border-slate-200 bg-slate-50/60 max-h-[24vh] p-[0.6vw] flex justify-center items-center">
                {r.image.toLowerCase().endsWith(".pdf") ? (
                  <a
                    href={`${API_URL.replace("/api", "")}${r.image}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-[0.45vw] px-[1vw] py-[0.55vw] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-[0.4vw] font-medium text-[0.76vw] cursor-pointer transition-colors"
                  >
                    <FileText className="w-[1.1vw] h-[1.1vw] text-rose-600" />
                    <span>Open Attached PDF Document</span>
                  </a>
                ) : (
                  <img
                    src={`${API_URL.replace("/api", "")}${r.image}`}
                    alt="Report Attachment"
                    className="max-h-[22vh] w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity rounded-[0.3vw] border border-slate-200 shadow-2xs bg-white"
                    onClick={() =>
                      window.open(
                        `${API_URL.replace("/api", "")}${r.image}`,
                        "_blank",
                      )
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.3vw] h-[2.1vw] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[0.76vw] rounded-full transition-colors cursor-pointer border-0"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Reports Modal (White Theme matching ServiceCall CallDetailsModal)
const ReportsModal = ({ row, onClose }) => {
  if (!row) return null;
  const products = row.products || [];
  const [expandedIndex, setExpandedIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-[1.5vw] animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white w-[58vw] max-w-[850px] max-h-[88vh] rounded-[1.2vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200/90 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[1.4vw] py-[0.9vw] border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[0.75vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <div className="flex items-center gap-[0.45vw] flex-wrap">
                <span className="font-medium text-[0.95vw] text-slate-900 tracking-tight">
                  Service Technical Reports
                </span>
                <span className="inline-flex items-center px-[0.45vw] py-[0.08vw] rounded-full text-[0.66vw] font-normal border bg-blue-50 text-blue-700 border-blue-200">
                  {products.length} {products.length === 1 ? "Product" : "Products"}
                </span>
              </div>
              <div className="text-[0.72vw] text-slate-500 font-normal mt-[0.1vw] flex items-center gap-[0.3vw] truncate max-w-[32vw]">
                <span className="text-slate-800 font-medium">{row.customerName || "Customer"}</span>
                <span className="text-slate-300">•</span>
                <span>Ref: <span className="font-mono text-slate-700">{row.refNoCustomer || row.refNo || "—"}</span></span>
                {row.category && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Type: {row.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-[0.45vw] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
            title="Close modal"
          >
            <X className="w-[1.05vw] h-[1.05vw]" />
          </button>
        </div>

        {/* Scrollable Products List */}
        <div className="flex-1 overflow-y-auto p-[1.3vw] space-y-[0.85vw] bg-slate-50/50">
          {products.length === 0 ? (
            <div className="p-[3vw] text-center text-slate-400 text-[0.8vw] italic flex flex-col items-center gap-[0.6vw] bg-white rounded-[0.8vw] border border-slate-200">
              <AlertCircle className="w-[1.8vw] h-[1.8vw] text-slate-400" />
              <span>No products attached to this inward entry.</span>
            </div>
          ) : (
            products.map((prod, idx) => {
              const r = prod.report;
              const isExpanded = expandedIndex === idx;

              return (
                <div
                  key={prod._pid || idx}
                  className={`border rounded-[0.8vw] bg-white transition-all shadow-2xs overflow-hidden ${
                    isExpanded ? "border-blue-400 ring-2 ring-blue-500/10" : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Product Summary Header */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                    className={`px-[1.1vw] py-[0.75vw] flex justify-between items-center cursor-pointer transition-colors ${
                      isExpanded ? "bg-blue-50/40" : "bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-[0.8vw]">
                      <span className="w-[1.5vw] h-[1.5vw] bg-blue-50 border border-blue-200 text-blue-700 rounded-full flex items-center justify-center text-[0.68vw] font-mono font-medium shrink-0">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-[0.82vw] font-medium text-slate-800 leading-snug">
                          {prod.productDescription || "Product Item"}
                        </div>
                        <div className="flex items-center gap-[0.6vw] text-[0.7vw] text-slate-500 font-normal mt-[0.15vw]">
                          <span>SN: <span className="font-mono font-medium text-slate-700">{prod.serialNumber || "—"}</span></span>
                          <span className="text-slate-300">•</span>
                          <span>Board: <span className="text-slate-700 font-medium">{prod.boardType || "—"}</span></span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-[0.25vw]">
                            <User className="w-[0.65vw] h-[0.65vw] text-indigo-500 shrink-0" />
                            <span>Assigned: <span className="text-slate-800 font-medium">{prod.assignedToName || "Unassigned"}</span></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-[0.8vw]">
                      <span
                        className={`inline-flex items-center gap-[0.25vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.66vw] font-normal border ${
                          r?.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r?.status === "Repair in Progress" || r?.status === "Under Testing"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : r?.status === "Not Repairable" || r?.status === "Pending"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-[0.32vw] h-[0.32vw] rounded-full ${
                            r?.status === "Completed"
                              ? "bg-emerald-500"
                              : r?.status === "Repair in Progress" || r?.status === "Under Testing"
                                ? "bg-amber-500"
                                : r?.status === "Not Repairable" || r?.status === "Pending"
                                  ? "bg-rose-500"
                                  : "bg-slate-400"
                          }`}
                        />
                        <span>{r?.status || "No Report Yet"}</span>
                      </span>

                      <div className="p-[0.2vw] text-slate-400 hover:text-blue-600 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-[1vw] h-[1vw]" />
                        ) : (
                          <ChevronDown className="w-[1vw] h-[1vw]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Report Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-200/80 bg-white"
                      >
                        {!r ? (
                          <div className="p-[2vw] text-center text-slate-400 text-[0.76vw] italic flex flex-col items-center gap-[0.4vw]">
                            <AlertCircle className="w-[1.4vw] h-[1.4vw] text-blue-400" />
                            <span>No technical report submitted yet by the assigned employee.</span>
                          </div>
                        ) : (
                          <div className="p-[1.1vw] space-y-[0.9vw] bg-slate-50/40">
                            {/* Key Metric Cards */}
                            <div className="grid grid-cols-4 gap-[0.65vw]">
                              <div className="bg-white p-[0.65vw] rounded-[0.5vw] border border-slate-200 shadow-2xs">
                                <span className="text-slate-400 block text-[0.62vw] font-normal uppercase tracking-wider">
                                  Tested By
                                </span>
                                <span className="font-medium text-slate-800 text-[0.75vw] mt-[0.1vw] block">
                                  {r.testedBy || "—"}
                                </span>
                              </div>
                              <div className="bg-white p-[0.65vw] rounded-[0.5vw] border border-slate-200 shadow-2xs">
                                <span className="text-slate-400 block text-[0.62vw] font-normal uppercase tracking-wider">
                                  Completed Date
                                </span>
                                <span className="font-normal text-slate-800 text-[0.75vw] mt-[0.1vw] block">
                                  {r.completedDate ? fmtDate(r.completedDate) : "—"}
                                </span>
                              </div>
                              <div className="bg-white p-[0.65vw] rounded-[0.5vw] border border-slate-200 shadow-2xs">
                                <span className="text-slate-400 block text-[0.62vw] font-normal uppercase tracking-wider">
                                  4M Category
                                </span>
                                <span className="font-normal text-slate-800 text-[0.75vw] mt-[0.1vw] block">
                                  {r.fourMCategory || "—"}
                                </span>
                              </div>
                              <div className="bg-white p-[0.65vw] rounded-[0.5vw] border border-slate-200 shadow-2xs">
                                <span className="text-slate-400 block text-[0.62vw] font-normal uppercase tracking-wider">
                                  Error Code
                                </span>
                                <span className="font-mono font-normal text-slate-800 text-[0.75vw] mt-[0.1vw] block">
                                  {r.errorCode || "—"}
                                </span>
                              </div>
                            </div>

                            {/* Details: Problems, Root Cause, Corrective Action */}
                            <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.9vw] shadow-2xs space-y-[0.7vw]">
                              <div>
                                <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                                  Problem Description
                                </span>
                                <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.55vw] rounded-[0.35vw] border border-slate-200/90 font-normal leading-relaxed">
                                  {r.problemDescription ? r.problemDescription : <span className="text-slate-400 italic">No description recorded.</span>}
                                </div>
                              </div>

                              <div>
                                <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                                  Root Cause Analysis
                                </span>
                                <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.55vw] rounded-[0.35vw] border border-slate-200/90 font-normal leading-relaxed">
                                  {r.rootCause ? r.rootCause : <span className="text-slate-400 italic">No root cause recorded.</span>}
                                </div>
                              </div>

                              <div>
                                <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                                  Corrective Action Taken
                                </span>
                                <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.55vw] rounded-[0.35vw] border border-slate-200/90 font-normal leading-relaxed">
                                  {r.correctiveAction ? r.correctiveAction : <span className="text-slate-400 italic">No corrective action recorded.</span>}
                                </div>
                              </div>

                              {r.designators && (
                                <div>
                                  <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                                    Designators
                                  </span>
                                  <div className="text-[0.74vw] text-slate-700 bg-slate-50/70 p-[0.5vw] rounded-[0.35vw] border border-slate-200/90 font-mono">
                                    {r.designators}
                                  </div>
                                </div>
                              )}

                              {r.partsReplacement && (
                                <div>
                                  <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider block mb-[0.3vw]">
                                    Parts Replacement
                                  </span>
                                  <div className="flex flex-wrap gap-[0.35vw]">
                                    {r.partsReplacement
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                      .map((part, i) => (
                                        <span
                                          key={i}
                                          className="text-[0.7vw] font-normal text-slate-700 bg-slate-100 border border-slate-200/90 px-[0.5vw] py-[0.15vw] rounded-[0.3vw] flex items-center gap-[0.3vw]"
                                        >
                                          <span className="w-[0.3vw] h-[0.3vw] rounded-full bg-blue-500" />
                                          {part}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Attachment / Image */}
                            {r.image && (
                              <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.8vw] shadow-2xs flex flex-col gap-[0.4vw]">
                                <span className="text-[0.64vw] font-normal text-slate-400 uppercase tracking-wider">
                                  Technical Attachment
                                </span>
                                <div className="rounded-[0.4vw] overflow-hidden border border-slate-200 bg-slate-50/60 max-h-[22vh] p-[0.5vw] flex justify-center items-center">
                                  {r.image.toLowerCase().endsWith(".pdf") ? (
                                    <a
                                      href={`${API_URL.replace("/api", "")}${r.image}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.5vw] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-[0.35vw] font-medium text-[0.74vw] cursor-pointer transition-colors"
                                    >
                                      <FileText className="w-[1vw] h-[1vw] text-rose-600" />
                                      <span>Open Attached PDF Document</span>
                                    </a>
                                  ) : (
                                    <img
                                      src={`${API_URL.replace("/api", "")}${r.image}`}
                                      alt="Technical Attachment"
                                      className="max-h-[20vh] w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity rounded-[0.25vw] border border-slate-200 shadow-2xs bg-white"
                                      onClick={() =>
                                        window.open(
                                          `${API_URL.replace("/api", "")}${r.image}`,
                                          "_blank",
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Status History Trail */}
                            {r.history && r.history.length > 0 && (
                              <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.9vw] shadow-2xs space-y-[0.7vw]">
                                <h4 className="text-[0.75vw] font-medium text-slate-800 flex items-center gap-[0.4vw] pb-[0.45vw] border-b border-slate-100">
                                  <History className="w-[0.8vw] h-[0.8vw] text-blue-600" />
                                  Status History Trail
                                </h4>
                                <div className="space-y-[0.75vw] pl-[0.5vw]">
                                  {r.history
                                    .slice()
                                    .reverse()
                                    .map((h, hi) => (
                                      <div
                                        key={hi}
                                        className="relative pl-[1.4vw] pb-[0.6vw] last:pb-0 border-l-2 border-slate-200 last:border-transparent"
                                      >
                                        <div className="absolute -left-[0.45vw] top-[0.1vw] w-[0.7vw] h-[0.7vw] bg-blue-600 rounded-full border-2 border-white shadow-2xs" />
                                        <div className="flex justify-between items-start gap-[1vw]">
                                          <div className="flex-1">
                                            <span className="text-[0.66vw] font-normal text-blue-700 px-[0.45vw] py-[0.08vw] bg-blue-50 rounded-full border border-blue-200">
                                              {h.status}
                                            </span>
                                            <p className="text-[0.74vw] text-slate-700 mt-[0.25vw] leading-relaxed">
                                              {h.remark || "No remark provided."}
                                            </p>
                                          </div>
                                          <div className="text-right flex-shrink-0 text-[0.68vw] text-slate-500 font-normal">
                                            {new Date(h.timestamp).toLocaleDateString("en-GB")}{" "}
                                            {new Date(h.timestamp).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              hour12: true,
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.3vw] h-[2.1vw] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[0.76vw] rounded-full transition-colors cursor-pointer border-0"
          >
            Close Panel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="bg-slate-50 p-[0.6vw] rounded-[0.4vw] border border-slate-300 shadow-sm">
    <span className="text-[0.62vw] font-bold text-blue-500 uppercase block leading-none mb-[0.3vw]">
      {label}
    </span>
    <span className="text-[0.85vw] font-semibold text-slate-800">
      {value || "—"}
    </span>
  </div>
);

const DetailSection = ({ label, value }) => (
  <div className="bg-white border border-slate-300 rounded-[0.5vw] p-[0.8vw] shadow-sm hover:border-blue-200 transition-all">
    <span className="text-[0.62vw] font-bold text-blue-500 uppercase block mb-[0.4vw]">
      {label}
    </span>
    <p className="text-[0.82vw] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
      {value || "No information provided."}
    </p>
  </div>
);


// Assign Cell with group support
const AssignCell = ({
  row,
  prod,
  employees,
  onAssign,
  onAssignSegmentGroup,
  onUpdateProduct,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("single");
  const [pendingAssign, setPendingAssign] = useState(null); // { assignData, isGroup }
  const [deliveryDateInput, setDeliveryDateInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const serviceEngineers = useMemo(
    () =>
      employees.filter((e) =>
        ["Support Engineer", "Service Engineer"].includes(e.department),
      ),
    [employees],
  );

  const filtered = serviceEngineers.filter(
    (e) =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.userId?.toLowerCase().includes(search.toLowerCase()),
  );

  const sameSegmentProducts = useMemo(() => {
    if (!prod.productSegment) return [];
    return (row.products || []).filter(
      (p) =>
        p._pid !== prod._pid &&
        p.productSegment === prod.productSegment &&
        !p.assignedTo,
    );
  }, [row.products, prod]);

  const isAssigned = !!prod.assignedTo;
  const hasGroupCandidates =
    sameSegmentProducts.length > 0 && !!prod.productSegment;

  return (
    <div className="relative" ref={ref}>
      {isAssigned ? (
        <div className="flex items-start justify-center gap-[0.5vw] w-full">
          <Avatar name={prod.assignedToName} size="sm" />
          <div>
            <span className="text-[0.72vw] text-black font-semibold leading-tight block">
              {prod.assignedToName}
            </span>
            {prod.productSegment && (
              <span className="text-[0.6vw] text-blue-500 font-medium">
                {prod.productSegment}
              </span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center gap-[0.35vw] px-[0.65vw] py-[0.3vw] border border-dashed border-gray-400 rounded-[0.4vw] text-[0.7vw] text-black hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all mx-auto w-max"
        >
          <Plus className="w-[0.72vw] h-[0.72vw]" />
          Assign
          {hasGroupCandidates && (
            <span className="ml-[0.2vw] bg-blue-100 text-blue-600 rounded text-[0.58vw] px-[0.3vw] font-bold">
              +{sameSegmentProducts.length} seg
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 mt-[0.3vw] bg-white border border-gray-400 shadow-xl rounded-[0.5vw] z-40 w-[20vw]"
          >
            {hasGroupCandidates && (
              <div className="flex border-b border-slate-300">
                <button
                  type="button"
                  onClick={() => setTab("single")}
                  className={`flex-1 py-[0.45vw] text-[0.7vw] font-semibold transition-colors cursor-pointer ${
                    tab === "single"
                      ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
                      : "text-black/60 hover:bg-gray-50"
                  }`}
                >
                  Assign Single
                </button>
                <button
                  type="button"
                  onClick={() => setTab("group")}
                  className={`flex-1 py-[0.45vw] text-[0.7vw] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-[0.3vw] ${
                    tab === "group"
                      ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
                      : "text-black/60 hover:bg-gray-50"
                  }`}
                >
                  Assign Segment Group
                  <span className="bg-blue-100 text-blue-700 text-[0.58vw] px-[0.3vw] rounded font-bold">
                    {sameSegmentProducts.length + 1}
                  </span>
                </button>
              </div>
            )}

            {tab === "group" && hasGroupCandidates && (
              <div className="px-[0.7vw] py-[0.4vw] bg-blue-50 border-b border-blue-100 text-[0.68vw] text-blue-700 font-medium flex items-center gap-[0.4vw]">
                <Shield className="w-[0.8vw] h-[0.8vw]" />
                Segment: <strong>{prod.productSegment}</strong> — will assign{" "}
                {sameSegmentProducts.length + 1} products
              </div>
            )}

            <div className="p-[0.55vw] border-b border-slate-300">
              <div className="relative">
                <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-black/50" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search engineer…"
                  className="w-full pl-[1.8vw] pr-[0.5vw] py-[0.4vw] border border-gray-400 rounded-[0.3vw] text-[0.72vw] outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="max-h-[12vw] overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((eng, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const assignData = {
                        assignedTo: eng.userId,
                        assignedToName: eng.name,
                        assignedDepartment: eng.department,
                      };
                      if (!prod.expectedDeliveryDate) {
                        setPendingAssign({
                          assignData,
                          isGroup: tab === "group" && hasGroupCandidates,
                        });
                        setDeliveryDateInput("");
                        setOpen(false);
                        setSearch("");
                        return;
                      }
                      if (tab === "group" && hasGroupCandidates) {
                        onAssignSegmentGroup(
                          row.id,
                          prod._pid,
                          sameSegmentProducts.map((p) => p._pid),
                          assignData,
                        );
                      } else {
                        onAssign(row.id, prod._pid, assignData);
                      }
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center gap-[0.6vw] p-[0.55vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <Avatar name={eng.name} size="sm" />
                    <div className="flex-1">
                      <div className="font-medium text-black/90 text-[0.75vw]">
                        {eng.name}
                      </div>
                      <div className="text-[0.62vw] text-black/50">
                        {eng.department}
                      </div>
                    </div>
                    {tab === "group" && hasGroupCandidates && (
                      <span className="text-[0.6vw] bg-green-100 text-green-700 px-[0.35vw] py-[0.1vw] rounded font-bold">
                        ×{sameSegmentProducts.length + 1}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-[1vw] text-center text-[0.72vw] text-black/50">
                  No engineers found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expected Delivery Date prompt modal */}
      <AnimatePresence>
        {pendingAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-400 p-[1.8vw] w-[26vw]"
            >
              <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
                <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-[1.1vw] h-[1.1vw] text-orange-600" />
                </div>
                <div>
                  <div className="text-[0.9vw] font-bold text-black">
                    Expected Delivery Date Required
                  </div>
                  <div className="text-[0.72vw] text-black/70">
                    Please set an expected delivery date before assigning.
                  </div>
                </div>
              </div>
              <div className="mb-[1.2vw]">
                <label className="text-[0.72vw] font-semibold text-black/80 block mb-[0.4vw]">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDateInput}
                  onChange={(e) => setDeliveryDateInput(e.target.value)}
                  min={todayDateStr()}
                  className="w-full border border-gray-400 rounded-[0.4vw] px-[0.6vw] py-[0.5vw] text-[0.8vw] outline-none focus:border-blue-400 text-black"
                />
              </div>
              <div className="flex gap-[0.6vw] justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAssign(null);
                    setDeliveryDateInput("");
                  }}
                  className="px-[1.2vw] py-[0.55vw] border border-gray-400 rounded-[0.4vw] text-[0.78vw] text-black/80 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!deliveryDateInput}
                  onClick={() => {
                    if (!deliveryDateInput) return;
                    // Save the expected delivery date on the product first
                    onUpdateProduct(row.id, prod._pid, {
                      expectedDeliveryDate: deliveryDateInput,
                    });
                    // Then perform the assignment
                    if (pendingAssign.isGroup) {
                      onAssignSegmentGroup(
                        row.id,
                        prod._pid,
                        sameSegmentProducts.map((p) => p._pid),
                        pendingAssign.assignData,
                      );
                    } else {
                      onAssign(row.id, prod._pid, pendingAssign.assignData);
                    }
                    setPendingAssign(null);
                    setDeliveryDateInput("");
                  }}
                  className="px-[1.4vw] py-[0.55vw] bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-slate-800 rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]"
                >
                  <User className="w-[0.85vw] h-[0.85vw]" />
                  Confirm & Assign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
const FinalStatusCell = ({ row, prod, onUpdateProduct }) => {
  const [open, setOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState(null);
  const [remarks, setRemarks] = useState(prod.finalStatusRemarks || "");
  const [status, setStatus] = useState(prod.finalStatus || "Pending");
  const [statusDate, setStatusDate] = useState(
    prod.finalStatusDate || todayDateStr(),
  );
  const ref = useRef(null);
  const portalRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        (!portalRef.current || !portalRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setStatus(prod.finalStatus || "Pending");
    setRemarks(prod.finalStatusRemarks || "");
    setStatusDate(prod.finalStatusDate || todayDateStr());
  }, [prod.finalStatus, prod.finalStatusRemarks, prod.finalStatusDate]);

  const handleSave = () => {
    let adminId = "";
    let adminName = "";
    try {
      const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
      adminId = loggedInUser?.userId || loggedInUser?.id || "";
      adminName = loggedInUser?.name || loggedInUser?.username || "";
    } catch (e) {
      console.error(e);
    }

    const autoDate = todayDateStr();

    const newHistoryEntry = {
      status,
      remarks,
      date: autoDate,
      timestamp: new Date().toISOString(),
      adminId,
      adminName,
    };
    const updatedHistory = [
      ...(prod.finalStatusHistory || []),
      newHistoryEntry,
    ];
    onUpdateProduct(row.id, prod._pid, {
      finalStatus: status,
      finalStatusRemarks: remarks,
      finalStatusDate: autoDate,
      finalStatusHistory: updatedHistory,
    });
    setOpen(false);
  };

  const handleToggle = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setButtonRect(r);
    setOpen((o) => !o);
  };

  const getPortalStyle = () => {
    if (!buttonRect) return {};
    const top = buttonRect.bottom + window.scrollY + 4;
    // Align right edges: button right minus popup width
    const left = buttonRect.right + window.scrollX - window.innerWidth * 0.17;
    return {
      position: "absolute",
      top: `${top}px`,
      left: `${Math.max(10, left)}px`,
      zIndex: 99999,
    };
  };

  const cls =
    FINAL_STATUS_COLORS[status] || "bg-gray-100 text-black/80 border-gray-400";

  // Detect if this product has been returned to employee
  const isReturnedToEmployee =
    prod.status === "Completed" &&
    (prod.finalStatusHistory?.length ?? 0) > 0 &&
    prod.finalStatus !== "Completed";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className={`text-[0.7vw] px-[0.6vw] py-[0.3vw] rounded-[0.4vw] border font-bold flex items-center justify-between gap-[0.35vw] cursor-pointer ${cls}`}
      >
        {status === "Pending"
          ? "Review Required"
          : status === "Admin Returned"
            ? "Returned"
            : status}
        <ChevronDown className="w-[0.7vw] h-[0.7vw] text-current" />
      </button>

      {open &&
        buttonRect &&
        ReactDOM.createPortal(
          <div
            ref={portalRef}
            style={getPortalStyle()}
            className="final-status-portal-wrapper"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-400 shadow-xl rounded-[0.5vw] w-[17vw] p-[0.8vw]"
            >
              <div className="text-[0.72vw] font-semibold text-black/80 mb-[0.6vw]">
                Review Decision
              </div>
              <div className="flex gap-[0.5vw] mb-[0.7vw]">
                <button
                  type="button"
                  onClick={() => setStatus("Completed")}
                  className={`flex-1 py-[0.4vw] rounded-[0.4vw] border text-[0.72vw] font-bold cursor-pointer transition-all ${
                    status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-100"
                      : "bg-gray-50 text-slate-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Admin Returned")}
                  className={`flex-1 py-[0.4vw] rounded-[0.4vw] border text-[0.72vw] font-bold cursor-pointer transition-all ${
                    status === "Admin Returned"
                      ? "bg-rose-50 text-rose-700 border-rose-400 ring-2 ring-rose-100"
                      : "bg-gray-50 text-slate-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Declined
                </button>
              </div>

              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks…"
                className="w-full border border-gray-400 rounded-[0.3vw] p-[0.4vw] text-[0.72vw] outline-none focus:border-blue-400 resize-none mb-[0.6vw] text-black"
              />

              <div className="flex justify-end gap-[0.4vw]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-[0.8vw] py-[0.3vw] text-[0.68vw] border border-gray-400 rounded-[0.3vw] text-black/80 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    status !== "Completed" && status !== "Admin Returned"
                  }
                  className={`px-[0.8vw] py-[0.3vw] text-[0.68vw] rounded-[0.3vw] font-semibold flex items-center gap-[0.3vw] ${
                    status === "Completed" || status === "Admin Returned"
                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="w-[0.7vw] h-[0.7vw]" />
                  Save
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// HistoryCellButton — standalone clock icon that opens the status history portal
const HistoryCellButton = ({ prod }) => {
  const historyRef = useRef(null);
  const historyPortalRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyButtonRect, setHistoryButtonRect] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (
        historyRef.current &&
        !historyRef.current.contains(e.target) &&
        (!historyPortalRef.current ||
          !historyPortalRef.current.contains(e.target))
      ) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={historyRef}>
      <button
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHistoryButtonRect(r);
          setShowHistory((s) => !s);
        }}
        title="View History"
        className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-[#1a73e8] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-[0.35vw] transition-all cursor-pointer shadow-2xs"
      >
        View
      </button>
      {showHistory &&
        historyButtonRect &&
        ReactDOM.createPortal(
          (() => {
            const POPUP_W = Math.min(window.innerWidth * 0.22, 360);
            const GAP = 6;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            const spaceBelow = vh - historyButtonRect.bottom;
            const showAbove = spaceBelow < 220;

            const top = showAbove
              ? historyButtonRect.top + window.scrollY - GAP
              : historyButtonRect.bottom + window.scrollY + GAP;

            let left = historyButtonRect.right + window.scrollX - POPUP_W;
            left = Math.max(
              GAP,
              Math.min(left, vw + window.scrollX - POPUP_W - GAP),
            );

            return (
              <div
                style={{
                  position: "absolute",
                  top: `${top}px`,
                  left: `${left}px`,
                  zIndex: 99999,
                  transform: showAbove ? "translateY(-100%)" : "none",
                }}
              >
                <motion.div
                  ref={historyPortalRef}
                  initial={{ opacity: 0, scale: 0.95, y: showAbove ? 4 : -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-slate-200 shadow-2xl rounded-[0.6vw] w-[22vw] p-[1vw]"
                >
                  <div className="flex items-center justify-between mb-[0.6vw] pb-[0.35vw] border-b border-slate-200">
                    <div className="text-[0.78vw] font-semibold text-slate-800 flex items-center gap-[0.4vw]">
                      <Clock className="w-[0.85vw] h-[0.85vw] text-blue-600" />
                      Status History
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer p-[0.15vw] rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-[0.8vw] h-[0.8vw]" />
                    </button>
                  </div>
                  <div className="max-h-[18vw] overflow-y-auto pr-[0.3vw]">
                    {(() => {
                      const empHistory = prod.report?.history || [];
                      const finalHistory = prod.finalStatusHistory || [];
                      const timeline = [];

                      if (prod.assignedTo) {
                        timeline.push({
                          type: "assigned",
                          label: "Assigned",
                          name: prod.assignedToName || prod.assignedTo,
                          timestamp:
                            empHistory.length > 0
                              ? empHistory[0].timestamp
                              : null,
                        });
                      }

                      // Employee report status changes
                      empHistory.forEach((h) =>
                        timeline.push({ type: "report", ...h }),
                      );

                      // Admin review changes (final status entries)
                      finalHistory.forEach((h) => {
                        const isCompleted = h.status === "Completed";
                        timeline.push({
                          type: "admin",
                          status: isCompleted ? "Approved" : "Admin Returned",
                          remark: h.remarks,
                          timestamp: h.timestamp || h.date,
                        });
                      });

                      // Sort chronologically (oldest to newest)
                      timeline.sort((a, b) => {
                        const tA = a.timestamp
                          ? new Date(a.timestamp).getTime()
                          : 0;
                        const tB = b.timestamp
                          ? new Date(b.timestamp).getTime()
                          : 0;
                        return tA - tB;
                      });

                      if (timeline.length === 0) {
                        return (
                          <div className="py-[2vw] text-center">
                            <div className="text-[0.72vw] text-black/40">
                              Not yet assigned to anyone.
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="relative pl-[1.2vw]">
                          <div className="absolute left-[0.45vw] top-[0.5vw] bottom-[0.5vw] w-[0.1vw] bg-gray-200" />
                          <div className="space-y-[0.7vw]">
                            {timeline.map((entry, i) => {
                              const isLast = i === timeline.length - 1;

                              let dotColor = "bg-gray-400";
                              if (entry.type === "assigned") {
                                dotColor = "bg-blue-500";
                              } else if (entry.type === "admin") {
                                dotColor =
                                  entry.status === "Approved"
                                    ? "bg-emerald-500"
                                    : "bg-amber-500";
                              } else if (isLast) {
                                dotColor = "bg-emerald-500";
                              }

                              const tsLabel = entry.timestamp
                                ? new Date(entry.timestamp).toLocaleString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )
                                : null;
                              return (
                                <div
                                  key={i}
                                  className="relative flex items-start gap-[0.5vw]"
                                >
                                  <div
                                    className={`absolute left-[-1.05vw] top-[0.25vw] w-[0.55vw] h-[0.55vw] rounded-full border-2 border-white ${dotColor} shadow-sm z-10`}
                                  />
                                  <div className="flex-1 bg-slate-50/70 rounded-[0.35vw] px-[0.6vw] py-[0.4vw] border border-slate-200">
                                    <div className="flex items-center justify-between gap-[0.4vw] flex-wrap">
                                      {entry.type === "assigned" ? (
                                        <span className="text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border bg-blue-50 text-blue-700 border-blue-200">
                                          Assigned → {entry.name}
                                        </span>
                                      ) : entry.type === "admin" ? (
                                        <span
                                          className={`text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border ${
                                            entry.status === "Approved"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {entry.adminName
                                            ? `${entry.status} → ${entry.adminName}`
                                            : entry.status}
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-medium border ${
                                            entry.status === "Completed"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : entry.status === "Hold"
                                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                                : entry.status ===
                                                    "Not Repairable"
                                                  ? "bg-slate-100 text-slate-700 border-slate-300"
                                                  : entry.status ===
                                                      "Under Testing"
                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {entry.status}
                                        </span>
                                      )}
                                      {tsLabel && (
                                        <span className="text-[0.65vw] text-slate-400 font-normal whitespace-nowrap">
                                          {tsLabel}
                                        </span>
                                      )}
                                    </div>
                                    {entry.remark && (
                                      <div className="mt-[0.3vw] text-[0.7vw] text-slate-600 font-normal">
                                        <span className="text-slate-500 font-medium">
                                          Remarks:{" "}
                                        </span>
                                        {entry.remark}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              </div>
            );
          })(),
          document.body,
        )}
    </div>
  );
};

// Table
const PRODUCT_SUB_COLS = ["Product", "Serial No", "Exp. Delivery"];

const getProductDelay = (row, prod, activeFilter) => {
  // Only show delay in the Completed tab
  if (activeFilter !== "Completed") return "—";

  const expectedDate = prod.expectedDeliveryDate || "";
  if (!expectedDate) return "—";

  // Find the last completed status entry in the report history
  const historyEntries = prod.report?.history || [];
  const lastCompletedEntry = [...historyEntries]
    .reverse()
    .find((h) => h.status === "Completed");

  const completionDateStr =
    lastCompletedEntry?.timestamp ||
    prod.report?.completedDate ||
    prod.report?.lastUpdated ||
    prod.finalStatusDate ||
    "";

  if (!completionDateStr) return "—";

  const expected = new Date(expectedDate);
  const completed = new Date(completionDateStr);
  if (Number.isNaN(expected.getTime()) || Number.isNaN(completed.getTime()))
    return "—";

  // Reset time parts for pure date diff
  expected.setHours(0, 0, 0, 0);
  completed.setHours(0, 0, 0, 0);

  const diffDays = Math.round((completed - expected) / 86400000);

  if (diffDays === 0)
    return (
      <span className="text-green-600 font-semibold">completed on time</span>
    );
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return (
      <span className="text-green-600 font-semibold">
        {absDays} day{absDays === 1 ? "" : "s"} before
      </span>
    );
  }
  return (
    <span className="text-red-600 font-semibold">
      {diffDays} day{diffDays === 1 ? "" : "s"} delay
    </span>
  );
};

// ── Animation variants ───────────────────────────────────────────────────────
const groupVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.22, ease: "easeOut" },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.18, ease: "easeOut" },
  }),
};

// ── Animated <tr> wrappers (motion doesn't support <tr> directly in all
//    table layouts, so we use style + a wrapper trick via CSS animation) ──────
// We apply inline animation via className + a keyframe defined once.
// Tailwind doesn't have stagger, so we pass animationDelay inline.
const AnimatedTr = ({ delay = 0, className = "", children, ...rest }) => (
  <tr
    {...rest}
    className={className}
    style={{
      animation: `smReveal 0.22s ease-out both`,
      animationDelay: `${delay}ms`,
      ...rest.style,
    }}
  >
    {children}
  </tr>
);

// Inject keyframe once (idempotent)
// Note: Use opacity-only to prevent CSS transform from creating stacking context that breaks sticky z-index
if (
  typeof document !== "undefined" &&
  !document.getElementById("sm-keyframes")
) {
  const style = document.createElement("style");
  style.id = "sm-keyframes";
  style.textContent = `
    @keyframes smReveal {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes smSlideIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const AdminTableView = ({
  employees,
  onView,
  onEdit,
  onUpdateRow,
  onUpdateProduct,
  onDelete,
  selectedItems,
  onToggleSelect,
  onToggleSelectPage,
  currentPage,
  setCurrentPage,
  filteredData,
  paginatedData,
  totalPages,
  isPageSelected,
  isSupervisor,
  canWrite = true,
  canUpdate = true,
  canDelete = true,
  loading,
  activeFilter,
  onViewReport,
}) => {
  const [collapsedCustomers, setCollapsedCustomers] = useState({});
  const [collapsedEntries, setCollapsedEntries] = useState({});

  const toggleCustomer = (name) =>
    setCollapsedCustomers((p) => ({ ...p, [name]: !p[name] }));
  const toggleEntry = (id) =>
    setCollapsedEntries((p) => ({ ...p, [id]: !p[id] }));

  // Group paginated data by customer
  const groups = useMemo(() => {
    const map = new Map();
    paginatedData.forEach((row) => {
      const key = row.customerName || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return Array.from(map.entries()).map(([customerName, rows]) => ({
      customerName,
      rows: [...rows].sort((a, b) => {
        const parseDateStr = (dateStr) => {
          if (!dateStr) return 0;
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
          }
          const parsed = new Date(dateStr).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        const dA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : parseDateStr(a.date);
        const dB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : parseDateStr(b.date);
        return dB - dA;
      }),
    }));
  }, [paginatedData]);

  // Calculate shown and total records count (products inside entries)
  const recordsPaginationInfo = useMemo(() => {
    // 1. Total records in filteredData
    const totalRecords = filteredData.reduce(
      (sum, row) => sum + (row.products?.length || 1),
      0,
    );

    // 2. Preceding records (before the current page)
    const precedingEntries = filteredData.slice(
      0,
      (currentPage - 1) * ITEMS_PER_PAGE,
    );
    const precedingRecords = precedingEntries.reduce(
      (sum, row) => sum + (row.products?.length || 1),
      0,
    );

    // 3. Current page records
    const currentPageRecords = paginatedData.reduce(
      (sum, row) => sum + (row.products?.length || 1),
      0,
    );

    // 4. Start & End indices
    const startIdx = paginatedData.length > 0 ? precedingRecords + 1 : 0;
    const endIdx = precedingRecords + currentPageRecords;

    return { startIdx, endIdx, totalRecords };
  }, [filteredData, paginatedData, currentPage]);

  const productCols = [
    "Product",
    "Product Code",
    "Segment",
    "Serial No",
    "Board Type",
    "Exp. Delivery",
    "Type",
  ];
  const actionCols = [
    "Emp Status",
    "Emp Report",
    ...(activeFilter === "Review Required" ? ["Final Status"] : []),
    "History",
    ...(activeFilter === "Completed" ? ["Delay"] : []),
  ];
  const totalCols =
    (canDelete && !isSupervisor ? 1 : 0) + 1 + productCols.length + actionCols.length;

  // Running delay counter for stagger across all rows
  let animDelay = 0;

  return (
    <div className="bg-white rounded-[0.6vw] shadow-sm border border-slate-300 flex flex-col">
      <div className="overflow-auto max-h-[65vh] min-h-[65vh] w-full rounded-t-[0.6vw]">
        <table className="w-full text-left border-collapse border-spacing-0">
          {/* ── THEAD ─────────────────────────────────────────────────────── */}
          <thead className="sticky top-0 z-40 bg-[#E9EDF7] border-b border-slate-300 text-slate-700 font-bold text-[0.74vw] uppercase tracking-wider shadow-xs">
            <tr className="bg-[#E9EDF7]">
              {canDelete && !isSupervisor && (
                <th
                  rowSpan={2}
                  className="p-[0.6vw] border-b border-r border-slate-300 text-center align-middle w-[2.5%] sticky top-0 z-40 bg-[#E9EDF7]"
                >
                  <button
                    type="button"
                    onClick={onToggleSelectPage}
                    className="flex items-center justify-center w-full cursor-pointer"
                  >
                    <div
                      className={`w-[1.1vw] h-[1.1vw] rounded-[0.2vw] border flex items-center justify-center transition-all ${
                        isPageSelected
                          ? "bg-[#1a73e8] border-[#1a73e8] text-white"
                          : "bg-white border-slate-400 text-transparent"
                      }`}
                    >
                      {isPageSelected && (
                        <span className="text-[0.75vw] leading-none font-bold text-white">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                </th>
              )}

              <th
                rowSpan={2}
                className="px-[0.7vw] py-[0.7vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r border-slate-300 whitespace-nowrap text-[0.74vw] align-middle w-[3%] sticky top-0 z-40 bg-[#E9EDF7]"
              >
                S. No
              </th>

              {/* Products super-header */}
              <th
                colSpan={productCols.length}
                className="px-[0.7vw] py-[0.35vw] h-[1.8vw] font-bold text-slate-700 uppercase tracking-wider border-b border-r border-slate-300 text-center text-[0.74vw] sticky top-0 z-40 bg-[#E9EDF7]"
              >
                Products
              </th>

              {actionCols.map((h) => (
                <th
                  key={h}
                  rowSpan={2}
                  style={{
                    minWidth:
                      h === "Final Status" || h === "Emp Status"
                        ? "9.5vw"
                        : h === "History"
                          ? "5vw"
                          : "6.5vw",
                  }}
                  className="px-[0.7vw] py-[0.7vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r border-slate-300 last:border-r-0 whitespace-nowrap text-[0.74vw] align-middle sticky top-0 z-40 bg-[#E9EDF7]"
                >
                  {h}
                </th>
              ))}
            </tr>

            <tr className="bg-[#E9EDF7]">
              {productCols.map((h) => (
                <th
                  key={h}
                  style={{
                    minWidth:
                      h === "Product"
                        ? "14vw"
                        : h === "Product Code"
                          ? "9vw"
                          : h === "Segment"
                            ? "6.5vw"
                            : "8vw",
                  }}
                  className="px-[0.7vw] py-[0.35vw] h-[1.8vw] font-bold text-slate-700 uppercase tracking-wider text-center border-b border-r border-slate-300 whitespace-nowrap text-[0.74vw] sticky top-[1.8vw] z-40 bg-[#E9EDF7]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {/* ── TBODY ─────────────────────────────────────────────────────── */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalCols} className="py-[4vw] text-center">
                  <div className="flex flex-col items-center justify-center gap-[1vw]">
                    <div className="w-[2.5vw] h-[2.5vw] border-[0.3vw] border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <div className="text-blue-600 font-bold text-[0.88vw] uppercase tracking-widest animate-pulse">
                      Loading Service Data...
                    </div>
                  </div>
                </td>
              </tr>
            ) : groups.length > 0 ? (
              groups.flatMap(({ customerName, rows }, groupIdx) => {
                const isCustomerCollapsed = collapsedCustomers[customerName];

                const pendingCount = rows.reduce(
                  (a, r) =>
                    a +
                    (r.products || []).filter(
                      (p) => (p.finalStatus || "Pending") === "Pending",
                    ).length,
                  0,
                );

                const custDelay = animDelay;
                animDelay += 40;

                return [
                  // ── CUSTOMER HEADER ROW ──────────────────────────────────
                  <tr
                    key={`cust-${customerName}`}
                    className="cursor-pointer select-none border-b border-slate-300 bg-[#EEF2F6] hover:bg-[#E2E8F0] transition-colors sticky top-[3.6vw] z-30 shadow-xs"
                    onClick={() => toggleCustomer(customerName)}
                  >
                    <td
                      colSpan={totalCols}
                      className="px-[0.7vw] py-[0.35vw] h-[2vw] border-l-[0.22vw] border-blue-600 bg-[#EEF2F6] border-b border-slate-300"
                    >
                      <div className="flex items-center gap-[0.5vw]">
                        {isCustomerCollapsed ? (
                          <ChevronRight className="w-[0.9vw] h-[0.9vw] text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-[0.9vw] h-[0.9vw] text-slate-500 flex-shrink-0" />
                        )}

                        <span className="font-semibold text-slate-800 text-[0.76vw] tracking-wide">
                          {customerName}
                        </span>

                        {/* Customer Code if available on the first row */}
                        {rows[0]?.customerCode && (
                          <span className="text-[0.62vw] text-slate-500 font-medium ml-[0.3vw]">
                            Code: {rows[0].customerCode}
                          </span>
                        )}

                        {/* Ref No (Customer) */}
                        {rows[0]?.refNoCustomer && (
                          <span className="text-[0.65vw] font-normal bg-purple-50 text-purple-600 border border-purple-200 px-[0.45vw] py-[0.05vw] rounded-[0.25vw] whitespace-nowrap ml-[0.3vw]">
                            Cust Ref: {rows[0].refNoCustomer}
                          </span>
                        )}

                        {/* Ref No (Internal) */}
                        {rows[0]?.refNoInternal && (
                          <span className="text-[0.65vw] font-normal bg-blue-50 text-blue-600 border border-blue-200 px-[0.45vw] py-[0.05vw] rounded-[0.25vw] whitespace-nowrap ml-[0.3vw]">
                            Int Ref: {rows[0].refNoInternal}
                          </span>
                        )}

                        {/* Category (Cus Type) */}
                        {rows[0]?.category && (
                          <span className="text-[0.65vw] font-normal text-slate-700 bg-slate-50 border border-slate-300 px-[0.45vw] py-[0.05vw] rounded-[0.25vw] whitespace-nowrap ml-[0.3vw]">
                            Type: {rows[0].category}
                          </span>
                        )}

                        {/* Unit */}
                        {rows[0]?.unit && (
                          <span className="text-[0.65vw] font-normal text-teal-700 bg-teal-50 border border-teal-200 px-[0.45vw] py-[0.05vw] rounded-[0.25vw] whitespace-nowrap ml-[0.3vw]">
                            Unit: {rows[0].unit}
                          </span>
                        )}

                        {/* Site */}
                        {rows[0]?.site && (
                          <span className="text-[0.65vw] font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-[0.45vw] py-[0.05vw] rounded-[0.25vw] whitespace-nowrap ml-[0.3vw]">
                            Site: {rows[0].site}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-[0.8vw]" />
                      </div>
                    </td>
                  </tr>,

                  // ── ENTRIES ─────────────────────────────
                  ...(isCustomerCollapsed
                    ? []
                    : rows.flatMap((row, rowIdx) => {
                        const globalSn =
                          (currentPage - 1) * ITEMS_PER_PAGE + rowIdx + 1;
                        const isSelected = selectedItems.has(row.id);
                        const isEntryCollapsed = collapsedEntries[row.id];

                        const prods = (
                          row.products && row.products.length > 0
                            ? row.products
                            : [
                                {
                                  _pid: "legacy",
                                  productDescription: row.productDescription,
                                  productCode: row.productCode,
                                  productSegment: row.productSegment || "",
                                  serialNumber: row.serialNumber,
                                  boardType: row.boardType,
                                  type: row.type,
                                  qty: row.qty,
                                  expectedDeliveryDate:
                                    row.expectedDeliveryDate,
                                  assignedTo: row.assignedTo || "",
                                  assignedToName: row.assignedToName || "",
                                  status: row.status || "Open",
                                },
                              ]
                        ).filter((p) => {
                          if (activeFilter === "All") return true;
                          const status = p.status || "Open";
                          if (activeFilter === "Review Required") {
                            return (
                              status === "Completed" &&
                              p.finalStatus !== "Completed"
                            );
                          }
                          if (activeFilter === "Completed") {
                            return (
                              status === "Completed" &&
                              p.finalStatus === "Completed"
                            );
                          }
                          return status === activeFilter;
                        });

                        const entryDelay = animDelay;
                        animDelay += 30;

                        return [
                          // ── ENTRY SUB-HEADER ────────────────────────────
                          <tr
                            key={`entry-hdr-${row.id}`}
                            className={`border-t border-b border-slate-300 cursor-pointer select-none transition-colors duration-150 sticky top-[5.6vw] z-20 shadow-xs ${
                              isSelected
                                ? "bg-[#e0f2fe]"
                                : "bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                            }`}
                          >
                            {canDelete && !isSupervisor && (
                              <td
                                className={`py-[0.35vw] px-[0.4vw] border-r border-b border-slate-300 text-center align-middle ${isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSelect(row.id);
                                }}
                              >
                                <button
                                  type="button"
                                  className="flex items-center justify-center w-full cursor-pointer"
                                >
                                  <div
                                    className={`w-[0.95vw] h-[0.95vw] rounded-[0.2vw] border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-slate-300 hover:border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="text-[0.65vw] leading-none font-bold">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </td>
                            )}

                            {/* S.No */}
                            <td
                              className={`py-[0.35vw] px-[0.4vw] border-r border-b border-slate-300 text-center text-[0.72vw] font-normal text-slate-700 align-middle ${isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"}`}
                              onClick={() => toggleEntry(row.id)}
                            >
                              {globalSn}
                            </td>

                            {/* Date + meta + actions — spans remaining cols */}
                            <td
                              colSpan={productCols.length + actionCols.length}
                              className={`px-[0.6vw] py-[0.3vw] h-[1.9vw] align-middle border-b border-slate-300 ${isSelected ? "bg-[#e0f2fe]" : "bg-[#F1F5F9]"}`}
                              onClick={() => toggleEntry(row.id)}
                            >
                              <div className="flex items-center gap-[0.6vw] flex-wrap">
                                {/* Chevron */}
                                <span
                                  className="text-slate-400 flex-shrink-0 transition-transform duration-200"
                                  style={{
                                    display: "inline-flex",
                                    transform: isEntryCollapsed
                                      ? "rotate(-90deg)"
                                      : "rotate(0deg)",
                                  }}
                                >
                                  <ChevronDown className="w-[0.75vw] h-[0.75vw]" />
                                </span>

                                {/* Date */}
                                <div className="flex items-center gap-[0.35vw] ml-[0.6vw]">
                                  <Calendar className="w-[0.8vw] h-[0.8vw] text-slate-500 flex-shrink-0" />
                                  <span className="text-[0.72vw] font-medium text-slate-700 whitespace-nowrap">
                                    {fmtDate(row.date || row.timestamp)}
                                  </span>
                                </div>

                                {/* Inward Quantities Summary: Received, Claimed, Dispatched, Balance */}
                                {(() => {
                                  const rowReceived = prods.reduce((sum, p) => sum + (Math.max(1, Number(p.qty) || 1)), 0);
                                  const rowDispatched = prods.reduce((sum, p) => {
                                    const raw = p.status || p.report?.status || "Open";
                                    return sum + (raw === "Completed" && p.finalStatus === "Completed" ? Math.max(1, Number(p.qty) || 1) : 0);
                                  }, 0);
                                  const rowClaimed = prods.reduce((sum, p) => {
                                    const raw = p.status || p.report?.status || "Open";
                                    const isDone = raw === "Completed" && p.finalStatus === "Completed";
                                    return sum + (!isDone && (p.assignedTo || raw !== "Open") ? Math.max(1, Number(p.qty) || 1) : 0);
                                  }, 0);
                                  const rowBalance = Math.max(0, rowReceived - rowDispatched);

                                  return (
                                    <div className="flex items-center gap-[0.8vw] text-[0.72vw] text-slate-600 font-normal ml-[1.5vw]">
                                      <span title="Received Qty">
                                        Received: <span className="font-semibold text-slate-800">{rowReceived}</span>
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span title="Claimed / In Progress Qty">
                                        Claimed: <span className="font-semibold text-slate-800">{rowClaimed}</span>
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span title="Dispatched Qty">
                                        Dispatched: <span className="font-semibold text-slate-800">{rowDispatched}</span>
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span title="Balance Qty">
                                        Balance: <span className="font-semibold text-slate-800">{rowBalance}</span>
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Actions — right side */}
                                <div
                                  className="ml-auto flex items-center gap-[0.4vw]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!canUpdate || isSupervisor ? (
                                    <button
                                      type="button"
                                      onClick={() => onView(row)}
                                      title="View"
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-400 rounded-full shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-[0.8vw] h-[0.8vw]" />
                                    </button>
                                  ) : row.products?.every(
                                      (p) => !!p.assignedTo,
                                    ) ? (
                                    <button
                                      type="button"
                                      onClick={() => onView(row)}
                                      title="View (all assigned)"
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-400 rounded-full shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-[0.8vw] h-[0.8vw]" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onEdit(row)}
                                      title="Edit (unclaimed records)"
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-400 rounded-full shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Edit3 className="w-[0.8vw] h-[0.8vw]" />
                                    </button>
                                  )}

                                  {canDelete && !isSupervisor && (
                                    <button
                                      type="button"
                                      onClick={() => onDelete(row.id)}
                                      title="Delete"
                                      className="w-[1.7vw] h-[1.7vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-400 rounded-full shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>,

                          // ── PRODUCT ROWS ─────────────────────────────────
                          ...(isEntryCollapsed
                            ? []
                            : prods.map((prod, pi) => {
                                const employeeStatus =
                                  prod.report?.status || prod.status || "Open";
                                const employeeStatusCfg =
                                  STATUS_CONFIG[employeeStatus] ||
                                  STATUS_CONFIG["Open"];
                                const EmployeeStatusIcon =
                                  employeeStatusCfg.icon;

                                const prodDelay = animDelay;
                                animDelay += 20;

                                return (
                                  <AnimatedTr
                                    key={`${row.id}-p-${pi}`}
                                    delay={prodDelay}
                                    className={`transition-colors duration-100 ${
                                      isSelected
                                        ? "bg-blue-50/40"
                                        : pi % 2 === 0
                                          ? "bg-white hover:bg-slate-50/80"
                                          : "bg-slate-50/40 hover:bg-slate-100/50"
                                    } border-b border-slate-300`}
                                  >
                                    {/* Checkbox placeholder */}
                                    {canDelete && !isSupervisor && (
                                      <td
                                        className="border-r border-slate-300"
                                        style={{ background: "transparent" }}
                                      />
                                    )}

                                    {/* S.No sub-number */}
                                    <td className="border-r border-slate-300 text-center align-middle px-[0.3vw] py-[0.45vw]">
                                      <span className="text-[0.72vw] font-semibold text-slate-400">
                                        {globalSn}.{pi + 1}
                                      </span>
                                    </td>

                                    {/* Product Description */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 align-middle">
                                      <div className="flex flex-col gap-[0.2vw]">
                                        <div
                                          className="font-normal text-slate-800 text-[0.78vw] max-w-[15vw] break-words leading-snug"
                                          title={prod.productDescription}
                                        >
                                          {prod.productDescription || "—"}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Product Code */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-[0.76vw] text-slate-700 font-normal align-middle text-center">
                                      {prod.productCode || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Segment */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-slate-300 text-[0.76vw] text-slate-700 font-normal align-middle text-center">
                                      {prod.productSegment || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Serial No */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 text-[0.76vw] text-slate-700 font-normal font-mono align-middle text-center">
                                      {prod.serialNumber || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Board Type */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 text-[0.76vw] text-slate-700 font-normal align-middle text-center">
                                      {prod.boardType || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Exp. Delivery */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 text-[0.76vw] text-slate-700 font-normal whitespace-nowrap align-middle text-center">
                                      {fmtDate(prod.expectedDeliveryDate)}
                                    </td>

                                    {/* Type badge */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                      <span
                                        className={`whitespace-nowrap text-[0.7vw] font-bold px-[0.6vw] py-[0.15vw] rounded-full border shadow-2xs font-normal ${
                                          prod.type === "W"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-sky-50 text-sky-700 border-sky-200"
                                        }`}
                                      >
                                        {TYPE_LABELS[prod.type] ||
                                          prod.type ||
                                          "—"}
                                      </span>
                                    </td>

                                    {/* Emp Report */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                      {prod.report ? (
                                        <button
                                          type="button"
                                          onClick={() => onViewReport(prod)}
                                          className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-[0.35vw] transition-all cursor-pointer shadow-2xs"
                                        >
                                          View Report
                                        </button>
                                      ) : (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Emp Status */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                      <div className="flex flex-col items-center gap-[0.2vw]">
                                        <span
                                          className={`inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.2vw] rounded-full border text-[0.7vw] font-normal whitespace-nowrap shadow-2xs ${employeeStatusCfg.bg} ${employeeStatusCfg.border} ${employeeStatusCfg.text}`}
                                        >
                                          <EmployeeStatusIcon className="w-[0.75vw] h-[0.75vw]" />
                                          {employeeStatus === "Completed"
                                            ? "Completed by emp"
                                            : employeeStatus}
                                        </span>
                                        {(prod.assignedToName ||
                                          prod.assignedDepartment) && (
                                          <div className="text-[0.68vw] text-slate-500 font-medium leading-tight">
                                            {prod.assignedToName && (
                                              <div>{prod.assignedToName}</div>
                                            )}
                                            {prod.assignedDepartment && (
                                              <div className="text-[0.6vw] text-slate-400">
                                                ({prod.assignedDepartment})
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Final Status */}
                                    {activeFilter === "Review Required" && (
                                      <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                        <FinalStatusCell
                                          row={row}
                                          prod={prod}
                                          onUpdateProduct={onUpdateProduct}
                                        />
                                      </td>
                                    )}

                                    {/* History */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-slate-300 align-middle text-center">
                                      <HistoryCellButton prod={prod} />
                                    </td>

                                    {/* Delay */}
                                    {activeFilter === "Completed" && (
                                      <td className="px-[0.65vw] py-[0.55vw] text-[0.8vw] font-bold align-middle text-center text-slate-700">
                                        {getProductDelay(
                                          row,
                                          prod,
                                          activeFilter,
                                        )}
                                      </td>
                                    )}
                                  </AnimatedTr>
                                );
                              })),
                        ];
                      })),
                ];
              })
            ) : (
              <tr>
                <td
                  colSpan={totalCols}
                  className="py-[4vw] text-center text-slate-400 text-[0.88vw] font-medium"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ──────────────────────────────────────────────────── */}
      <div className="border-t border-slate-300 px-[1.2vw] py-[0.85vw] bg-white flex justify-between items-center rounded-b-[0.6vw]">
        <div className="text-[0.78vw] font-medium text-slate-600">
          Showing{" "}
          <strong className="text-slate-800">
            {recordsPaginationInfo.startIdx}
          </strong>{" "}
          to{" "}
          <strong className="text-slate-800">
            {recordsPaginationInfo.endIdx}
          </strong>{" "}
          of{" "}
          <strong className="text-slate-800">
            {recordsPaginationInfo.totalRecords}
          </strong>{" "}
          records
        </div>

        <div className="flex items-center gap-[0.6vw]">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-[2vw] h-[2vw] flex items-center justify-center border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-30 bg-white cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-[1vw] h-[1vw] text-slate-600 font-bold" />
          </button>

          <div className="flex gap-[0.4vw]">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
              if (pNum > totalPages) return null;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-[2vw] h-[2vw] flex items-center justify-center rounded-[0.4vw] text-[0.78vw] font-bold cursor-pointer transition-colors ${
                    currentPage === pNum
                      ? "bg-[#1a73e8] text-white border border-[#1a73e8]"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-[2vw] h-[2vw] flex items-center justify-center border border-slate-300 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-30 bg-white cursor-pointer transition-colors"
          >
            <ChevronRight className="w-[1vw] h-[1vw] text-slate-600 font-bold" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Status chip config
const STATUS_CHIPS = [
  { label: "All", dot: "bg-blue-600" },
  { label: "Open", dot: "bg-slate-400" },
  { label: "Assigned", dot: "bg-indigo-600" },
  { label: "Repair in Progress", dot: "bg-amber-500" },
  { label: "Pending", dot: "bg-orange-500" },
  { label: "Under Testing", dot: "bg-sky-500" },
  { label: "Hold", dot: "bg-rose-500" },
  { label: "Not Repairable", dot: "bg-red-600" },
  { label: "Review Required", dot: "bg-purple-600" },
  { label: "Completed", dot: "bg-emerald-600" },
];

// Main Export
export default function App() {
  const { toast, confirm } = useNotification();
  const [view, setView] = useState("table");
  const [editingRow, setEditing] = useState(null);
  const [entries, setEntries] = useState([]);
  const [customerDb, setCustomerDb] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [reportsRowId, setReportsRowId] = useState(null);
  const [selectedReportProduct, setSelectedReportProduct] = useState(null);
  const [isBoardTypeMasterOpen, setIsBoardTypeMasterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const { canWrite, canUpdate, canDelete } = useModulePermissions("matInward");

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      // Instant cache display for immediate rendering
      try {
        const cached = localStorage.getItem("service_material_cache");
        if (cached && !entries.length) {
          setEntries(JSON.parse(cached));
        }
      } catch (e) {}

      try {
        const [materialRes, customerRes, boardRes, unitsRes, sitesRes, ptRes] = await Promise.all([
          axios.get(`${API_URL}/service-material`).catch(() => ({ data: lsLoad(INWARD_KEY, []) })),
          axios.get(`${API_URL}/master/customers`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/master/board-types`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/master/units`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/master/sites`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/master/party-types`).catch(() => ({ data: [] })),
        ]);

        // Map backend _id to id for frontend compatibility (only for real API responses)
        const mappedEntries = materialRes.data.map((item) => ({
          ...item,
          id: item._id || item.id,
        }));

        setEntries(mappedEntries);
        try {
          localStorage.setItem("service_material_cache", JSON.stringify(mappedEntries));
        } catch (e) {}
        setCustomerDb(customerRes.data);
        setBoardTypes(boardRes.data);
        setUnits(unitsRes.data);
        setSites(sitesRes.data || []);
        setPartyTypes(ptRes.data || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
        setLastSyncTime(new Date());
      }
      setEmployees(lsLoad(EMPLOYEES_KEY, []));
    };

    fetchData();

    // Set up WebSocket real-time updates
    const socketUrl = API_URL.replace("/api", "");
    const socket = io(socketUrl);

    socket.on("service-materials-changed", () => {
      fetchData();
    });

    const handleRefreshEvent = () => {
      fetchData();
      toast("Data refreshed manually");
    };
    document.addEventListener("refresh-service-material", handleRefreshEvent);

    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user?.role === "Supervisor") setIsSupervisor(true);

    return () => {
      socket.disconnect();
      document.removeEventListener(
        "refresh-service-material",
        handleRefreshEvent,
      );
    };
  }, []);

  const save = (rows) => {
    setEntries(rows);
    lsSave(INWARD_KEY, rows);
  };
  const goToForm = () => {
    setEditing(null);
    setView("form");
  };
  const goToEdit = (row) => {
    setEditing({ ...row, _editing: true });
    setView("form");
  };
  const goToView = (row) => {
    setEditing({ ...row, _readonly: true });
    setView("form");
  };
  const goToTable = () => {
    setEditing(null);
    setView("table");
  };

  const handleSave = async (formRow, isEditMode) => {
    try {
      if (isEditMode) {
        const res = await axios.put(
          `${API_URL}/service-material/${formRow.id}`,
          formRow,
        );
        const updatedRow = { ...res.data, id: res.data._id };
        setEntries(entries.map((r) => (r.id === formRow.id ? updatedRow : r)));
      } else {
        const res = await axios.post(`${API_URL}/service-material`, formRow);
        const newRow = { ...res.data, id: res.data._id };
        setEntries([newRow, ...entries]);
      }
      setView("table");
      toast(
        isEditMode
          ? "Entry updated successfully."
          : "Inward registered successfully.",
        "success",
      );
    } catch (err) {
      toast(
        "Failed to save entry: " + (err.response?.data?.message || err.message),
        "error",
      );
    }
  };

  const handleUpdateRow = async (id, updates) => {
    if (updates._openReports) {
      setReportsRowId(id);
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/service-material/${id}`, updates);
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries(entries.map((r) => (r.id === id ? updatedRow : r)));
    } catch (err) {
      toast("Failed to update entry", "error");
    }
  };

  const handleUpdateProduct = async (id, productId, updates) => {
    try {
      const res = await axios.patch(
        `${API_URL}/service-material/${id}/product/${productId}/final-status`,
        updates,
      );
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));
      // Toast on success (especially for final status updates)
      if (updates?.finalStatus !== undefined)
        toast("Final status updated", "success");
      else if (updates?.expectedDeliveryDate !== undefined)
        toast("Expected delivery updated", "success");
      else toast("Updated successfully", "success");
    } catch (err) {
      toast("Failed to update product", "error");
    }
  };

  const handleAssign = async (id, productId, assignData) => {
    try {
      const res = await axios.patch(
        `${API_URL}/service-material/${id}/claim-product`,
        {
          productId,
          userId: assignData.assignedTo,
          userName: assignData.assignedToName,
        },
      );
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries(entries.map((r) => (r.id === id ? updatedRow : r)));
      toast(`Product assigned to ${assignData.assignedToName}`, "success");
    } catch (err) {
      toast("Failed to assign product", "error");
    }
  };

  const handleAssignSegmentGroup = async (
    id,
    mainPid,
    otherPids,
    assignData,
  ) => {
    const allPids = new Set([mainPid, ...otherPids]);
    const entry = entries.find((r) => r.id === id);
    if (!entry) return;

    const updatedProducts = (entry.products || []).map((p) =>
      allPids.has(p._pid) ? { ...p, ...assignData, status: "Assigned" } : p,
    );

    try {
      const res = await axios.put(`${API_URL}/service-material/${id}`, {
        products: updatedProducts,
      });
      const updatedRow = { ...res.data, id: res.data._id };
      setEntries(entries.map((r) => (r.id === id ? updatedRow : r)));
      toast(
        `${allPids.size} products in segment assigned to ${assignData.assignedToName}`,
        "success",
      );
    } catch (err) {
      toast("Failed to assign products group", "error");
    }
  };

  // Filter by search term, date range AND active status chip
  const filteredData = useMemo(() => {
    let data = entries;

    // Apply status filter using custom tab matching rules
    if (activeFilter !== "All") {
      data = data.filter((row) =>
        (row.products || []).some((p) => {
          const status = p.status || "Open";
          if (activeFilter === "Review Required") {
            return status === "Completed" && p.finalStatus !== "Completed";
          }
          if (activeFilter === "Completed") {
            return status === "Completed" && p.finalStatus === "Completed";
          }
          return status === activeFilter;
        }),
      );
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      data = data.filter((row) => {
        const rowDateStr = row.date ? row.date.slice(0, 10) : "";
        if (dateFrom && !dateTo) {
          return rowDateStr === dateFrom;
        } else {
          const entryDate = toDateObj(row.date);
          if (!entryDate) return true;
          const from = toDateObj(dateFrom);
          const to = toDateObj(dateTo);
          if (from && entryDate < from) return false;
          if (to && entryDate > to) return false;
          return true;
        }
      });
    }

    // Apply search filter
    const s = searchTerm.toLowerCase();
    if (s) {
      data = data.filter(
        (row) =>
          row.refNo?.toLowerCase().includes(s) ||
          row.customerName?.toLowerCase().includes(s) ||
          row.productDescription?.toLowerCase().includes(s) ||
          row.assignedToName?.toLowerCase().includes(s) ||
          row.refNoCustomer?.toLowerCase().includes(s) ||
          row.refNoInternal?.toLowerCase().includes(s) ||
          row.products?.some((p) =>
            p.productDescription?.toLowerCase().includes(s),
          ),
      );
    }

    // Sort data so latest is at the top
    const parseDateStr = (dateStr) => {
      if (!dateStr) return 0;
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      const parsed = new Date(dateStr).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    data.sort((a, b) => {
      const dA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : parseDateStr(a.date);
      const dB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : parseDateStr(b.date);
      return dB - dA;
    });

    return data;
  }, [entries, searchTerm, activeFilter, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const isPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((r) => selectedItems.has(r.id));

  const toggleSelect = (id) => {
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };
  const toggleSelectPage = () => {
    const s = new Set(selectedItems);
    if (isPageSelected) paginatedData.forEach((r) => s.delete(r.id));
    else paginatedData.forEach((r) => s.add(r.id));
    setSelectedItems(s);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    const confirmed = await confirm({
      title: "Delete Entries",
      message: `Are you sure you want to delete ${selectedItems.size} selected entries? This action cannot be undone.`,
      confirmText: `Yes, Delete ${selectedItems.size} Entries`,
      type: "danger",
    });
    if (confirmed) {
      try {
        const deletePromises = Array.from(selectedItems).map((id) =>
          axios.delete(`${API_URL}/service-material/${id}`),
        );
        await Promise.all(deletePromises);
        save(entries.filter((e) => !selectedItems.has(e.id)));
        setSelectedItems(new Set());
        toast(`${selectedItems.size} entries deleted successfully`, "success");
      } catch (err) {
        toast(
          "Failed to delete some or all entries from the database",
          "error",
        );
      }
    }
  };

  const handleDeleteRow = async (id) => {
    const confirmed = await confirm({
      title: "Delete Entry",
      message:
        "Are you sure you want to delete this entry? This action cannot be undone.",
      confirmText: "Yes, Delete",
      type: "danger",
    });
    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/service-material/${id}`);
        setEntries(entries.filter((e) => e.id !== id));
        toast("Entry deleted successfully", "success");
      } catch (err) {
        toast("Failed to delete entry", "error");
      }
    }
  };

  const counts = useMemo(() => {
    const allProducts = entries.flatMap((e) => e.products || []);
    const c = { All: allProducts.length };
    [
      "Open",
      "Assigned",
      "Repair in Progress",
      "Pending",
      "Under Testing",
      "Hold",
      "Not Repairable",
      "Review Required",
      "Completed",
    ].forEach((s) => {
      c[s] = allProducts.filter((p) => {
        const status = p.status || "Open";
        if (s === "Review Required") {
          return status === "Completed" && p.finalStatus !== "Completed";
        }
        if (s === "Completed") {
          return status === "Completed" && p.finalStatus === "Completed";
        }
        return status === s;
      }).length;
    });
    return c;
  }, [entries]);

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <AnimatePresence>
        {isBoardTypeMasterOpen && (
          <BoardTypeMasterModal
            onClose={() => {
              setIsBoardTypeMasterOpen(false);
              axios
                .get(`${API_URL}/master/board-types`)
                .then((r) => setBoardTypes(r.data));
            }}
          />
        )}
        {reportsRowId && (
          <ReportsModal
            row={entries.find((e) => e.id === reportsRowId)}
            onClose={() => setReportsRowId(null)}
          />
        )}
        {selectedReportProduct && (
          <ProductReportModal
            product={selectedReportProduct}
            onClose={() => setSelectedReportProduct(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <ServiceMaterialForm
            key="form"
            initialData={editingRow || { ...emptyBase() }}
            customerDb={customerDb}
            setCustomerDb={setCustomerDb}
            employees={employees}
            boardTypes={boardTypes}
            units={units}
            sites={sites}
            entries={entries}
            partyTypes={partyTypes}
            onSave={handleSave}
            onBack={goToTable}
            canWrite={canWrite && !isSupervisor}
            canUpdate={canUpdate && !isSupervisor}
          />
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
                        {/* Top bar - Standard Service Call Pill Toolbar */}
            <div className="flex items-center justify-between bg-white px-[0.7vw] py-[0.4vw] rounded-full shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200/90 gap-[0.7vw] mb-[0.8vw] shrink-0">
              {/* Left side: Soft Pill Search Box */}
              <div className="relative w-[18vw]">
                <Search className="absolute left-[0.9vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.9vw] h-[0.9vw]" />
                <input
                  type="text"
                  placeholder="Search by ref, customer, product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.4vw] pr-[2vw] h-[2.2vw] border-0 rounded-full text-[0.76vw] font-medium text-slate-700 placeholder-slate-400 bg-slate-100/70 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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

              {/* Right cluster: Date Range, Clear, Board Types Master & Add */}
              <div className="flex items-center gap-[0.6vw] flex-shrink-0">
                {/* Unified Date Range Capsule */}
                <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-full h-[2.2vw] px-[0.85vw] bg-white text-[0.75vw] shadow-2xs hover:border-slate-300 transition-all">
                  <span className="text-slate-500 font-medium text-[0.74vw]">From</span>
                  <input
                    ref={fromDateRef}
                    type="date"
                    value={dateFrom || ""}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="no-native-calendar text-[0.75vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
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
                  <span className="text-slate-400 mx-[0.15vw] text-[0.85vw]">→</span>
                  <span className="text-slate-500 font-medium text-[0.74vw]">To</span>
                  <input
                    ref={toDateRef}
                    type="date"
                    value={dateTo || ""}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="no-native-calendar text-[0.75vw] text-slate-700 bg-transparent outline-none font-semibold cursor-pointer"
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

                {/* Reset / Clear Button */}
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="flex items-center gap-[0.3vw] h-[2.2vw] px-[0.8vw] rounded-full text-[0.74vw] font-semibold text-rose-500 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-600 border border-rose-100 transition-all cursor-pointer shadow-2xs"
                    title="Clear date filter"
                  >
                    <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                    <span>Clear</span>
                  </button>
                )}

                {/* Bulk Delete */}
                <AnimatePresence>
                  {selectedItems.size > 0 && canDelete && !isSupervisor && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.35vw] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 px-[0.85vw] h-[2.2vw] rounded-full font-semibold text-[0.74vw] transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-[0.8vw] h-[0.8vw]" />
                      Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>

                {canWrite && !isSupervisor && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsBoardTypeMasterOpen(true)}
                      className="cursor-pointer flex items-center gap-[0.4vw] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-400 font-semibold px-[0.9vw] h-[2.2vw] rounded-full text-[0.74vw] transition-all shadow-2xs"
                    >
                      <Wrench className="w-[0.8vw] h-[0.8vw] text-slate-500" />{" "}
                      Board Types Master
                    </button>
                    <button
                      type="button"
                      onClick={goToForm}
                      className="cursor-pointer flex items-center gap-[0.35vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold px-[1vw] h-[2.2vw] rounded-full text-[0.74vw] transition-all shadow-2xs active:scale-95"
                    >
                      <Plus className="w-[0.9vw] h-[0.9vw] text-white" />
                      Add
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sleek Connected Segmented Track for Status Tabs & Overall Quantity KPI Capsules */}
            <div className="flex items-center justify-between gap-[0.8vw] mb-[0.8vw] flex-wrap">
              <div className="inline-flex items-center p-[0.25vw] bg-slate-100 rounded-full border border-slate-200/90 gap-[0.4vw] max-w-full overflow-x-auto">
                {STATUS_CHIPS.map(({ label, dot }) => {
                  const isActive = activeFilter === label;
                  const count = counts[label] ?? 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveFilter(label)}
                      className={`flex items-center gap-[0.45vw] px-[0.85vw] py-[0.32vw] rounded-full text-[0.75vw] font-medium cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
                      }`}
                    >
                      {label !== "All" && (
                        <span
                          className={`w-[0.4vw] h-[0.4vw] rounded-full shrink-0 ${
                            isActive ? "bg-white" : dot
                          }`}
                        />
                      )}
                      <span className={isActive ? "text-white" : "text-slate-700"}>
                        {label}
                      </span>
                      <span
                        className={`text-[0.68vw] font-medium ml-[0.1vw] transition-all ${
                          isActive
                            ? "bg-white/20 text-white px-[0.38vw] py-[0.02vw] rounded-full"
                            : "text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quantities Summary Capsules: Received, Claimed, Dispatched, Balance */}
              {(() => {
                const allProds = filteredData.flatMap((r) => r.products || []);
                const totalReceived = allProds.reduce((sum, p) => sum + (Math.max(1, Number(p.qty) || 1)), 0);
                const totalDispatched = allProds.reduce((sum, p) => {
                  const raw = p.status || p.report?.status || "Open";
                  return sum + (raw === "Completed" && p.finalStatus === "Completed" ? Math.max(1, Number(p.qty) || 1) : 0);
                }, 0);
                const totalClaimed = allProds.reduce((sum, p) => {
                  const raw = p.status || p.report?.status || "Open";
                  const isDone = raw === "Completed" && p.finalStatus === "Completed";
                  return sum + (!isDone && (p.assignedTo || raw !== "Open") ? Math.max(1, Number(p.qty) || 1) : 0);
                }, 0);
                const totalBalance = Math.max(0, totalReceived - totalDispatched);

                return (
                  <div className="flex items-center gap-[0.45vw] text-[0.72vw]">
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.2vw] rounded-full bg-slate-100 border border-slate-200">
                      <span className="text-slate-500 font-normal">Received Qty:</span>
                      <span className="text-slate-800 font-semibold">{totalReceived}</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.2vw] rounded-full bg-blue-50 border border-blue-200">
                      <span className="text-blue-600 font-normal">Claimed:</span>
                      <span className="text-blue-700 font-semibold">{totalClaimed}</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.2vw] rounded-full bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 font-normal">Dispatched:</span>
                      <span className="text-emerald-700 font-semibold">{totalDispatched}</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw] px-[0.55vw] py-[0.2vw] rounded-full bg-amber-50 border border-amber-200">
                      <span className="text-amber-800 font-normal">Balance:</span>
                      <span className="text-amber-800 font-semibold">{totalBalance}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <AdminTableView
              employees={employees}
              onView={goToView}
              onEdit={goToEdit}
              onUpdateRow={handleUpdateRow}
              onUpdateProduct={handleUpdateProduct}
              onDelete={handleDeleteRow}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelect}
              onToggleSelectPage={toggleSelectPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              filteredData={filteredData}
              paginatedData={paginatedData}
              totalPages={totalPages}
              isPageSelected={isPageSelected}
              isSupervisor={isSupervisor}
              canWrite={canWrite && !isSupervisor}
              canUpdate={canUpdate && !isSupervisor}
              canDelete={canDelete && !isSupervisor}
              loading={loading}
              activeFilter={activeFilter}
              onViewReport={setSelectedReportProduct}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
