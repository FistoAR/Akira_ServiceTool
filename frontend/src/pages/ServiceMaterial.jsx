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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import EditableProductTable from "../components/EditableProductTable";
import { io } from "socket.io-client";

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
  "Not Repairable": "bg-slate-200 text-slate-800 border-gray-600",
  "Admin Returned": "bg-rose-100 text-rose-800 border-rose-300",
};

// Employee-side status display (from `prod.report.status` / `prod.status`)
// NOTE: This is separate from the supervisor "Final Status" flow.
const STATUS_CONFIG = {
  Open: {
    icon: AlertCircle,
    bg: "bg-slate-100",
    border: "border-gray-600",
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
    border: "border-gray-600",
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

// Duplicate Modal
const DuplicateModal = ({ onConfirm, onClose }) => {
  const [count, setCount] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-400 p-[1.8vw] w-[22vw]"
      >
        <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center">
            <Copy className="w-[1.1vw] h-[1.1vw] text-blue-600" />
          </div>
          <div>
            <div className="text-[0.9vw] font-bold text-black">
              Duplicate Product Row
            </div>
            <div className="text-[0.72vw] text-gray-800">
              How many copies do you need?
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] mb-[1.4vw]">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-400 text-gray-800 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
            }
            className="flex-1 border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-center text-[1vw] font-bold outline-none focus:border-blue-500 shadow-none"
          />
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(50, c + 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-400 text-gray-800 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="text-[0.72vw] text-gray-700 mb-[1.2vw] bg-blue-50 rounded-[0.4vw] p-[0.6vw] border border-blue-200">
          This will add <strong>{count}</strong> copy{count > 1 ? "ies" : ""} of
          this product row.
        </div>
        <div className="flex gap-[0.6vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.55vw] border border-gray-400 rounded-[0.4vw] text-[0.78vw] text-black/80 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(count);
              onClose();
            }}
            className="px-[1.4vw] py-[0.55vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]"
          >
            <Copy className="w-[0.85vw] h-[0.85vw]" />
            Add {count} {count > 1 ? "Copies" : "Copy"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Add Rows Modal
const AddRowsModal = ({ onConfirm, onClose }) => {
  const [count, setCount] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-400 p-[1.8vw] w-[22vw]"
      >
        <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center">
            <Plus className="w-[1.1vw] h-[1.1vw] text-blue-600" />
          </div>
          <div>
            <div className="text-[0.9vw] font-bold text-black">
              Add Product Rows
            </div>
            <div className="text-[0.72vw] text-gray-800">
              How many rows do you want to add?
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] mb-[1.4vw]">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-400 text-gray-800 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
            }
            className="flex-1 border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-center text-[1vw] font-bold outline-none focus:border-blue-500 shadow-none"
          />
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(50, c + 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-400 text-gray-800 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="text-[0.72vw] text-gray-700 mb-[1.2vw] bg-blue-50 rounded-[0.4vw] p-[0.6vw] border border-blue-200">
          This will add <strong>{count}</strong> new empty product row
          {count > 1 ? "s" : ""}.
        </div>
        <div className="flex gap-[0.6vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.55vw] border border-gray-400 rounded-[0.4vw] text-[0.78vw] text-black/80 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(count);
              onClose();
            }}
            className="px-[1.4vw] py-[0.55vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]"
          >
            <Plus className="w-[0.85vw] h-[0.85vw]" />
            Add {count} Row{count > 1 ? "s" : ""}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Unsaved Changes Confirmation Modal
const UnsavedChangesModal = ({ onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-400 p-[2vw] w-[25vw]"
      >
        <div className="flex items-center gap-[0.8vw] mb-[1.2vw]">
          <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-[1.2vw] h-[1.2vw] text-red-600" />
          </div>
          <div>
            <div className="text-[1vw] font-bold text-black">
              Unsaved Changes
            </div>
            <div className="text-[0.75vw] text-gray-800">
              You have made changes to the form. Are you sure you want to go
              back?
            </div>
          </div>
        </div>

        <div className="text-[0.72vw] text-red-700 bg-red-50 rounded-[0.4vw] p-[0.8vw] border border-red-200 mb-[1.5vw]">
          <strong>Warning:</strong> Any unsaved information will be permanently
          lost if you leave this page.
        </div>

        <div className="flex gap-[0.8vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.5vw] py-[0.6vw] border border-gray-400 rounded-[0.4vw] text-[0.8vw] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Continue Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-[1.5vw] py-[0.6vw] bg-red-600 hover:bg-red-700 text-white rounded-[0.4vw] text-[0.8vw] font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Yes, Discard Changes
          </button>
        </div>
      </motion.div>
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-400 w-[40vw] max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="bg-[#1a73e8] px-[1.5vw] py-[1.2vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <div className="bg-white/20 p-[0.4vw] rounded-[0.4vw]">
              <Wrench className="w-[1.2vw] h-[1.2vw] text-slate-800" />
            </div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-slate-800 tracking-wider">
                Manage Board Types
              </h3>
              <p className="text-[0.75vw] text-slate-800/80">
                Add, edit or delete board types master data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-[0.4vw] hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-[1.2vw] h-[1.2vw] text-slate-800" />
          </button>
        </div>

        <div className="p-[1.5vw] bg-gray-50 border-b border-gray-600">
          <form onSubmit={handleAdd} className="flex gap-[0.8vw] items-end">
            <div className="flex-1 space-y-[0.3vw]">
              <label className="text-[0.75vw] font-bold text-gray-700">
                Board Type Name *
              </label>
              <input
                type="text"
                required
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="w-full border border-gray-400 rounded-[0.4vw] p-[0.55vw] text-[0.8vw] outline-none focus:border-blue-500"
                placeholder="e.g. Main Board"
              />
            </div>
            <button
              type="submit"
              className="px-[1vw] py-[0.55vw] h-[2.2vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[0.4vw] text-[0.8vw] font-bold cursor-pointer transition-all flex items-center gap-[0.4vw]"
            >
              <Plus className="w-[0.9vw] h-[0.9vw]" /> Add
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] bg-white">
          {loading ? (
            <div className="text-center text-[0.85vw] text-gray-500 py-[2vw]">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-[0.85vw] text-gray-500 py-[2vw]">
              No board types found.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-600">
                  <th className="text-left py-[0.6vw] px-[0.8vw] text-[0.75vw] font-bold text-gray-700">
                    Name
                  </th>
                  <th className="text-right py-[0.6vw] px-[0.8vw] text-[0.75vw] font-bold text-gray-700 w-[20%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-600 hover:bg-gray-50"
                  >
                    {editingId === item._id ? (
                      <>
                        <td className="py-[0.5vw] px-[0.8vw]">
                          <input
                            type="text"
                            value={editItem.name}
                            onChange={(e) =>
                              setEditItem({ ...editItem, name: e.target.value })
                            }
                            className="w-full border border-gray-400 rounded-[0.3vw] p-[0.4vw] text-[0.8vw] outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-[0.5vw] px-[0.8vw] text-right">
                          <button
                            onClick={() => handleUpdate(item._id)}
                            className="text-green-600 hover:text-green-800 p-[0.3vw] cursor-pointer"
                          >
                            <Save className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 hover:text-gray-700 p-[0.3vw] ml-[0.3vw] cursor-pointer"
                          >
                            <X className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-[0.6vw] px-[0.8vw] text-[0.8vw] font-semibold text-gray-800">
                          {item.name}
                        </td>
                        <td className="py-[0.6vw] px-[0.8vw] text-right flex items-center justify-end gap-[0.4vw]">
                          <button
                            onClick={() => {
                              setEditingId(item._id);
                              setEditItem({ name: item.name });
                            }}
                            className="text-blue-500 hover:text-blue-700 p-[0.3vw] cursor-pointer"
                          >
                            <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="text-red-500 hover:text-red-700 p-[0.3vw] cursor-pointer"
                          >
                            <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Product Report Modal
const ProductReportModal = ({ product, onClose }) => {
  if (!product || !product.report) return null;
  const r = product.report;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-[42vw] max-h-[85vh] rounded-[1vw] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 px-[1.5vw] py-[1.2vw] flex justify-between items-center shadow-md border-b border-slate-800">
          <div className="flex items-center gap-[0.8vw]">
            <div className="bg-blue-500/10 p-[0.5vw] rounded-lg">
              <FileText className="w-[1.4vw] h-[1.4vw] text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-[1vw] leading-tight">
                Technical Report Details
              </h3>
              <p className="text-[0.68vw] text-slate-400 font-medium mt-[0.1vw]">
                {product.productDescription}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer transition-all hover:bg-slate-800 p-[0.4vw] rounded-full border-0 bg-transparent"
          >
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-[1.8vw] space-y-[1.4vw] bg-slate-50/50">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-[1vw]">
            <div className="bg-white border border-slate-200 p-[0.8vw] rounded-[0.6vw] shadow-sm flex flex-col gap-[0.2vw]">
              <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider">
                Product Info
              </span>
              <span className="text-[0.78vw] font-bold text-slate-800 leading-snug">
                {product.productDescription || "—"}
              </span>
              <span className="text-[0.68vw] text-slate-500 font-semibold mt-[0.1vw]">
                SN: {product.serialNumber || "—"} | {product.boardType || "—"}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-[0.8vw] rounded-[0.6vw] shadow-sm flex flex-col gap-[0.2vw]">
              <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider">
                Service Execution
              </span>
              <span className="text-[0.78vw] font-bold text-slate-800 flex items-center gap-[0.3vw]">
                <User className="w-[0.8vw] h-[0.8vw] text-blue-500" />
                Tested By: {r.testedBy || "—"}
              </span>
              <span className="text-[0.68vw] text-slate-500 font-semibold mt-[0.1vw]">
                Completed:{" "}
                {r.completedDate
                  ? new Date(r.completedDate).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.2vw] shadow-sm space-y-[1vw]">
            <div className="grid grid-cols-3 gap-[1vw] pb-[1vw] border-b border-slate-100">
              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  4M Category
                </span>
                <span className="text-[0.78vw] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-[0.5vw] py-[0.15vw] rounded-[0.3vw] inline-block">
                  {r.fourMCategory || "—"}
                </span>
              </div>
              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  Error Code
                </span>
                <span className="text-[0.78vw] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-[0.5vw] py-[0.15vw] rounded-[0.3vw] inline-block">
                  {r.errorCode || "—"}
                </span>
              </div>
              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  Disposition
                </span>
                <span className="text-[0.78vw] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-[0.5vw] py-[0.15vw] rounded-[0.3vw] inline-block">
                  {r.disposition || "—"}
                </span>
              </div>
            </div>

            <div className="space-y-[0.8vw]">
              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  Problem Description
                </span>
                <p className="text-[0.75vw] text-slate-700 font-medium bg-slate-50/50 p-[0.5vw] rounded-[0.4vw] border border-slate-100 leading-relaxed">
                  {r.problemDescription || "—"}
                </p>
              </div>

              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  Root Cause
                </span>
                <p className="text-[0.75vw] text-slate-700 font-medium bg-slate-50/50 p-[0.5vw] rounded-[0.4vw] border border-slate-100 leading-relaxed">
                  {r.rootCause || "—"}
                </p>
              </div>

              <div>
                <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                  Corrective Action
                </span>
                <p className="text-[0.75vw] text-slate-700 font-medium bg-slate-50/50 p-[0.5vw] rounded-[0.4vw] border border-slate-100 leading-relaxed">
                  {r.correctiveAction || "—"}
                </p>
              </div>

              {r.designators && (
                <div>
                  <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.2vw]">
                    Designators
                  </span>
                  <p className="text-[0.75vw] text-slate-700 font-medium bg-slate-50/50 p-[0.5vw] rounded-[0.4vw] border border-slate-100 leading-relaxed">
                    {r.designators}
                  </p>
                </div>
              )}

              {/* Parts Replacement List */}
              {r.partsReplacement && (
                <div>
                  <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider block mb-[0.4vw]">
                    Parts Replaced
                  </span>
                  <div className="flex flex-wrap gap-[0.4vw]">
                    {r.partsReplacement
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((part, i) => (
                        <span
                          key={i}
                          className="text-[0.7vw] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.25vw] rounded-[0.4vw] flex items-center gap-[0.3vw]"
                        >
                          <span className="w-[0.35vw] h-[0.35vw] rounded-full bg-blue-500" />
                          {part}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Report Image */}
          {r.image && (
            <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[1.2vw] shadow-sm flex flex-col gap-[0.6vw]">
              <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider">
                Report Attachment
              </span>
              <div className="rounded-[0.6vw] overflow-hidden border border-slate-200 bg-slate-100 max-h-[25vh] flex justify-center items-center">
                <img
                  src={`${API_URL.replace("/api", "")}${r.image}`}
                  alt="Report Attachment"
                  className="max-h-[25vh] w-auto object-contain cursor-pointer hover:scale-105 transition-all"
                  onClick={() =>
                    window.open(
                      `${API_URL.replace("/api", "")}${r.image}`,
                      "_blank",
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Reports Modal
const ReportsModal = ({ row, onClose }) => {
  const products = row.products || [];
  const [expandedIndex, setExpandedIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-[60vw] max-h-[85vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col border border-gray-400"
      >
        <div className="bg-[#1a73e8] px-[1.5vw] py-[1.2vw] flex justify-between items-center shadow-md">
          <div className="flex items-center gap-[0.9vw]">
            <div className="bg-white/20 p-[0.4vw] rounded-full">
              <FileText className="w-[1.4vw] h-[1.4vw] text-slate-800" />
            </div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-slate-800 uppercase tracking-wider">
                Service Technical Reports
              </h3>
              <p className="text-[0.75vw] text-slate-800 font-medium">
                {row.customerName} · Ref: {row.refNoCustomer || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-800 hover:text-slate-800 cursor-pointer transition-all hover:bg-white/10 p-[0.4vw] rounded-full"
          >
            <X className="w-[1.3vw] h-[1.3vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[0.8vw]">
          {products.map((prod, idx) => {
            const r = prod.report;
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={prod._pid}
                className={`border rounded-[0.6vw] transition-all shadow-sm ${
                  isExpanded ? "border-blue-400" : "border-gray-400"
                }`}
              >
                <div
                  onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                  className={`px-[1.2vw] py-[0.8vw] flex justify-between items-center cursor-pointer transition-colors ${
                    isExpanded
                      ? "bg-blue-50/50"
                      : "bg-gray-50 hover:bg-blue-50/30"
                  }`}
                >
                  <div className="flex items-center gap-[1vw]">
                    <span className="w-[1.6vw] h-[1.6vw] bg-[#1a73e8] text-slate-800 rounded-full flex items-center justify-center text-[0.7vw] font-bold shadow-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-[0.9vw] font-bold text-black">
                        {prod.productDescription}
                      </span>
                      <div className="flex items-center gap-[0.7vw] text-[0.72vw] text-gray-800 font-bold mt-[0.3vw]">
                        <span className="bg-gray-200 px-[0.4vw] py-[0.05vw] rounded border border-gray-400">
                          SN: {prod.serialNumber || "—"}
                        </span>
                        <span className="text-blue-500">·</span>
                        <span className="flex items-center gap-[0.3vw]">
                          <User className="w-[0.8vw] h-[0.8vw] text-blue-600" />
                          Assigned:{" "}
                          <span className="text-blue-700 font-bold">
                            {prod.assignedToName || "Unassigned"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-[1vw]">
                    <span
                      className={`px-[0.6vw] py-[0.15vw] rounded-full text-[0.65vw] font-bold border shadow-none ${
                        r?.status === "Completed"
                          ? "bg-green-100 text-green-700 border-green-400"
                          : r?.status === "Repair in Progress"
                            ? "bg-blue-50 text-blue-700 border-blue-400"
                            : r?.status === "Not Repairable"
                              ? "bg-red-50 text-red-700 border-red-400"
                              : "bg-gray-100 text-gray-800 border-gray-400"
                      }`}
                    >
                      {r?.status || "No Report Yet"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-[1.2vw] h-[1.2vw] text-blue-600" />
                    ) : (
                      <ChevronDown className="w-[1.2vw] h-[1.2vw] text-blue-600" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-400 bg-white"
                    >
                      {!r ? (
                        <div className="p-[2.5vw] text-center text-black text-[0.85vw] italic flex flex-col items-center gap-[0.6vw]">
                          <AlertCircle className="w-[1.8vw] h-[1.8vw] text-blue-400" />
                          "No technical report submitted yet by the assigned
                          employee."
                        </div>
                      ) : (
                        <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
                          <div className="space-y-[1.2vw]">
                            <div className="grid grid-cols-2 gap-[1vw]">
                              <DetailItem
                                label="Tested By"
                                value={r.testedBy}
                              />
                              <DetailItem
                                label="Designators"
                                value={r.designators}
                              />
                              <DetailItem
                                label="Completed Date"
                                value={fmtDate(r.completedDate)}
                              />
                              <DetailItem
                                label="4M Category"
                                value={r.fourMCategory}
                              />
                              <DetailItem
                                label="Error Code"
                                value={r.errorCode}
                              />
                            </div>
                            <DetailSection
                              label="Problem Identification"
                              value={r.problemDescription}
                            />
                            <DetailSection
                              label="Root Cause Analysis"
                              value={r.rootCause}
                            />
                            <DetailSection
                              label="Corrective Action"
                              value={r.correctiveAction}
                            />
                            {r.partsReplacement && (
                              <div className="bg-white border border-gray-600 rounded-[0.5vw] p-[0.8vw] shadow-sm hover:border-blue-200 transition-all">
                                <span className="text-[0.62vw] font-bold text-blue-500 uppercase block mb-[0.6vw]">
                                  Parts Replacement
                                </span>
                                <div className="space-y-[0.4vw]">
                                  {r.partsReplacement
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter((s) => s.length > 0)
                                    .map((part, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-[0.6vw] text-[0.8vw] font-bold text-slate-800 bg-slate-50 border border-gray-600 px-[0.6vw] py-[0.4vw] rounded-[0.4vw]"
                                      >
                                        <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-blue-500" />
                                        {part}
                                      </div>
                                    ))}
                                  {r.partsReplacement
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter((s) => s.length > 0).length ===
                                    0 && (
                                    <div className="text-[0.82vw] text-slate-400 italic">
                                      No parts recorded
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {r.image && (
                              <div className="bg-white border border-gray-600 rounded-[0.5vw] p-[0.8vw] shadow-sm hover:border-blue-200 transition-all">
                                <span className="text-[0.62vw] font-bold text-blue-500 uppercase block mb-[0.6vw]">
                                  Technical Image
                                </span>
                                <img
                                  src={`${API_URL}${r.image}`}
                                  alt="Technical"
                                  className="max-w-full h-auto rounded-[0.4vw] border border-gray-600 cursor-pointer hover:scale-[1.02] transition-transform"
                                  onClick={() =>
                                    window.open(
                                      `${API_URL}${r.image}`,
                                      "_blank",
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                          <div className="bg-blue-50/40 rounded-[0.6vw] border border-blue-100 p-[1vw]">
                            <h4 className="text-[0.75vw] font-bold text-blue-700 uppercase tracking-wider mb-[1.2vw] flex items-center gap-[0.5vw]">
                              <History className="w-[1vw] h-[1vw] text-blue-600" />{" "}
                              Status History Trail
                            </h4>
                            <div className="space-y-[1vw]">
                              {r.history
                                ?.slice()
                                .reverse()
                                .map((h, hi) => (
                                  <div
                                    key={hi}
                                    className="relative pl-[1.6vw] pb-[1vw] last:pb-0 border-l-2 border-blue-200 last:border-transparent"
                                  >
                                    <div className="absolute left-[-0.4vw] top-0 w-[0.8vw] h-[0.8vw] bg-blue-600 rounded-full border-2 border-white shadow-md" />
                                    <div className="flex justify-between items-start gap-[1vw]">
                                      <div className="flex-1">
                                        <span className="text-[0.68vw] font-bold text-blue-700 px-[0.5vw] py-[0.05vw] bg-blue-100 rounded border border-blue-200 uppercase">
                                          {h.status}
                                        </span>
                                        <p className="text-[0.78vw] text-black mt-[0.3vw] leading-relaxed">
                                          {h.remark || "No remark provided."}
                                        </p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-[0.68vw] font-bold text-blue-600 bg-white px-[0.4vw] py-[0.05vw] rounded border border-blue-200 mb-[0.1vw] shadow-sm">
                                          {new Date(
                                            h.timestamp,
                                          ).toLocaleDateString("en-GB")}
                                        </div>
                                        <div className="text-[0.62vw] text-black font-medium opacity-80 tracking-[.05vw] mt-[.2vw]">
                                          {new Date(
                                            h.timestamp,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="px-[1.5vw] py-[1vw] border-t border-gray-400 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-[2.5vw] py-[0.6vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[0.5vw] text-[0.85vw] font-bold cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-[0.5vw]"
          >
            Close Panel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="bg-slate-50 p-[0.6vw] rounded-[0.4vw] border border-gray-600 shadow-sm">
    <span className="text-[0.62vw] font-bold text-blue-500 uppercase block leading-none mb-[0.3vw]">
      {label}
    </span>
    <span className="text-[0.85vw] font-semibold text-slate-800">
      {value || "—"}
    </span>
  </div>
);

const DetailSection = ({ label, value }) => (
  <div className="bg-white border border-gray-600 rounded-[0.5vw] p-[0.8vw] shadow-sm hover:border-blue-200 transition-all">
    <span className="text-[0.62vw] font-bold text-blue-500 uppercase block mb-[0.4vw]">
      {label}
    </span>
    <p className="text-[0.82vw] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
      {value || "No information provided."}
    </p>
  </div>
);

// Registration / View Form
const InwardForm = ({
  initialData,
  customerDb,
  employees,
  boardTypes,
  units,
  entries,
  partyTypes = [],
  onSave,
  onBack,
}) => {
  const { toast } = useNotification();
  const isReadOnly = !!initialData._readonly;
  const isEdit = !!initialData._editing;

  const [base, setBase] = useState(() => ({
    date: initialData.date || todayDateStr(),
    refNoCustomer: initialData.refNoCustomer || "",
    refNoInternal: initialData.refNoInternal || "",
    customerName: initialData.customerName || "",
    customerCode: initialData.customerCode || "",
    category: initialData.category || "",
    assignedTo: initialData.assignedTo || "",
    assignedToName: initialData.assignedToName || "",
    assignedDepartment: initialData.assignedDepartment || "",
    finalStatus: initialData.finalStatus || "Pending",
    finalStatusRemarks: initialData.finalStatusRemarks || "",
    unit: initialData.unit || "",
  }));

  const [products, setProducts] = useState(() => {
    if (initialData.products && initialData.products.length > 0) {
      return initialData.products.map((p) => {
        let ed = p.expectedDeliveryDate || "";
        if (ed.includes("T")) ed = ed.split("T")[0];
        else if (ed.includes("-") && ed.split("-")[0].length !== 4) {
          const parts = ed.split("-");
          if (parts.length === 3) ed = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else if (ed.includes("/")) {
          const parts = ed.split("/");
          if (parts.length === 3) {
            if (parts[2].length === 4)
              ed = `${parts[2]}-${parts[1]}-${parts[0]}`;
            else ed = `${parts[0]}-${parts[1]}-${parts[2]}`;
          }
        }
        return { ...p, expectedDeliveryDate: ed };
      });
    }
    if (initialData._editing || initialData._readonly) {
      return [
        {
          _pid: `p-${Date.now()}`,
          productCode: initialData.productCode || "",
          productDescription: initialData.productDescription || "",
          productSegment: initialData.productSegment || "",
          serialNumber: initialData.serialNumber || "",
          boardType: initialData.boardType || "",
          qty: initialData.qty || "1",
          type: initialData.type || "W",
          expectedDeliveryDate: initialData.expectedDeliveryDate || "",
          status: initialData.status || "Open",
          escalationLevel: initialData.escalationLevel || 0,
          escalationHistory: initialData.escalationHistory || [],
          assignedTo: initialData.assignedTo || "",
          assignedToName: initialData.assignedToName || "",
          assignedDepartment: initialData.assignedDepartment || "",
        },
      ];
    }
    return [emptyProduct()];
  });

  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [dupeTarget, setDupeTarget] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showAddRowsModal, setShowAddRowsModal] = useState(false);
  const [showUnitDrop, setShowUnitDrop] = useState(false);
  const [showRefCustDrop, setShowRefCustDrop] = useState(false);
  const [showRefIntDrop, setShowRefIntDrop] = useState(false);
  const custRef = useRef(null);
  const unitRef = useRef(null);
  const refCustRef = useRef(null);
  const refIntRef = useRef(null);

  const [custActiveIndex, setCustActiveIndex] = useState(-1);
  const [unitActiveIndex, setUnitActiveIndex] = useState(-1);
  const [refCustActiveIndex, setRefCustActiveIndex] = useState(-1);
  const [refIntActiveIndex, setRefIntActiveIndex] = useState(-1);

  const customerRefsList = useMemo(
    () =>
      Array.from(
        new Set((entries || []).map((e) => e.refNoCustomer).filter(Boolean)),
      ),
    [entries],
  );
  const internalRefsList = useMemo(
    () =>
      Array.from(
        new Set((entries || []).map((e) => e.refNoInternal).filter(Boolean)),
      ),
    [entries],
  );

  // Browser refresh/close prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isReadOnly) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isReadOnly]);

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target))
        setShowCustDrop(false);
      if (unitRef.current && !unitRef.current.contains(e.target))
        setShowUnitDrop(false);
      if (refCustRef.current && !refCustRef.current.contains(e.target))
        setShowRefCustDrop(false);
      if (refIntRef.current && !refIntRef.current.contains(e.target))
        setShowRefIntDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const customerDbFlat = useMemo(
    () =>
      Array.isArray(customerDb) ? customerDb : Object.values(customerDb).flat(),
    [customerDb],
  );

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDbFlat.forEach((item) => {
      if (!map.has(item.partyCode))
        map.set(item.partyCode, {
          code: item.partyCode,
          name: item.partyDescription,
          type: item.partyType,
        });
    });
    return Array.from(map.values());
  }, [customerDbFlat]);

  const sb = (k, v) => {
    if (!isReadOnly) {
      setBase((p) => ({ ...p, [k]: v }));
      setIsDirty(true);
    }
  };

  const filteredCustomers = useMemo(() => {
    return uniqueCustomers.filter((c) => {
      const matchesSearch = c.name
        ?.toLowerCase()
        .includes(custSearch.toLowerCase());
      if (!base.category) return matchesSearch;
      return (
        matchesSearch &&
        (c.type || "").toLowerCase() === base.category.toLowerCase()
      );
    });
  }, [uniqueCustomers, custSearch, base.category]);

  const filteredUnits = useMemo(() => {
    if (!units) return [];
    return units.filter((u) =>
      u.name.toLowerCase().includes((base.unit || "").toLowerCase()),
    );
  }, [units, base.unit]);

  const filteredRefCust = useMemo(() => {
    return customerRefsList.filter((r) =>
      r.toLowerCase().includes((base.refNoCustomer || "").toLowerCase()),
    );
  }, [customerRefsList, base.refNoCustomer]);

  const filteredRefInt = useMemo(() => {
    return internalRefsList.filter((r) =>
      r.toLowerCase().includes((base.refNoInternal || "").toLowerCase()),
    );
  }, [internalRefsList, base.refNoInternal]);

  const handleCustKeyDown = (e) => {
    if (!showCustDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustActiveIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (custActiveIndex >= 0 && custActiveIndex < filteredCustomers.length) {
        selectCustomer(filteredCustomers[custActiveIndex]);
      }
    } else if (e.key === "Escape") {
      setShowCustDrop(false);
      setCustActiveIndex(-1);
    }
  };

  const handleUnitKeyDown = (e) => {
    if (!showUnitDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setUnitActiveIndex((prev) =>
        prev < filteredUnits.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setUnitActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (unitActiveIndex >= 0 && unitActiveIndex < filteredUnits.length) {
        sb("unit", filteredUnits[unitActiveIndex].name);
        setShowUnitDrop(false);
        setUnitActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowUnitDrop(false);
      setUnitActiveIndex(-1);
    }
  };

  const handleRefCustKeyDown = (e) => {
    if (!showRefCustDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRefCustActiveIndex((prev) =>
        prev < filteredRefCust.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRefCustActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        refCustActiveIndex >= 0 &&
        refCustActiveIndex < filteredRefCust.length
      ) {
        sb("refNoCustomer", filteredRefCust[refCustActiveIndex]);
        setShowRefCustDrop(false);
        setRefCustActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowRefCustDrop(false);
      setRefCustActiveIndex(-1);
    }
  };

  const handleRefIntKeyDown = (e) => {
    if (!showRefIntDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRefIntActiveIndex((prev) =>
        prev < filteredRefInt.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRefIntActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (refIntActiveIndex >= 0 && refIntActiveIndex < filteredRefInt.length) {
        sb("refNoInternal", filteredRefInt[refIntActiveIndex]);
        setShowRefIntDrop(false);
        setRefIntActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowRefIntDrop(false);
      setRefIntActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (showCustDrop && custActiveIndex >= 0) {
      const container = document.querySelector(".cust-drop-container");
      const activeItem = container?.children[custActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [custActiveIndex, showCustDrop]);

  useEffect(() => {
    if (showUnitDrop && unitActiveIndex >= 0) {
      const container = document.querySelector(".unit-drop-container");
      const activeItem = container?.children[unitActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [unitActiveIndex, showUnitDrop]);

  useEffect(() => {
    if (showRefCustDrop && refCustActiveIndex >= 0) {
      const container = document.querySelector(".ref-cust-drop-container");
      const activeItem = container?.children[refCustActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [refCustActiveIndex, showRefCustDrop]);

  useEffect(() => {
    if (showRefIntDrop && refIntActiveIndex >= 0) {
      const container = document.querySelector(".ref-int-drop-container");
      const activeItem = container?.children[refIntActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [refIntActiveIndex, showRefIntDrop]);

  const selectCustomer = (c) => {
    if (isReadOnly) return;
    setBase((p) => ({
      ...p,
      customerCode: c.code,
      customerName: c.name,
      category: c.type || p.category,
    }));
    setCustSearch(c.name);
    setShowCustDrop(false);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        productCode: "",
        productDescription: "",
        productSegment: "",
      })),
    );
    setIsDirty(true);
  };

  const updateProduct = (updated) => {
    setProducts((prev) =>
      prev.map((p) => (p._pid === updated._pid ? updated : p)),
    );
    setIsDirty(true);
  };
  const removeProduct = (pid) => {
    setProducts((prev) => prev.filter((p) => p._pid !== pid));
    setIsDirty(true);
  };
  const confirmAddRows = (count) => {
    setProducts((prev) => {
      const newRows = Array.from({ length: count }, () => emptyProduct());
      return [...prev, ...newRows];
    });
    setIsDirty(true);
  };

  const requestDuplicate = (prod) => setDupeTarget(prod);
  const confirmDuplicate = (prod, count) => {
    if (!prod.productCode) {
      toast("Please select a product before duplicating.", "warning");
      return;
    }
    const copies = Array.from({ length: count }, () => ({
      ...prod,
      _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serialNumber: "",
      boardType: "",
    }));
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._pid === prod._pid);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, ...copies);
      return next;
    });
    setIsDirty(true);
    setDupeTarget(null);
  };

  const custDbForRows = useMemo(() => {
    const map = {};
    customerDbFlat.forEach((r) => {
      if (!map[r.partyCode]) map[r.partyCode] = [];
      map[r.partyCode].push(r);
    });
    return map;
  }, [customerDbFlat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasExpDateChanges =
      isReadOnly &&
      products.some(
        (p) =>
          p.expectedDeliveryDate !==
          (initialData.products?.find((ip) => ip._pid === p._pid)
            ?.expectedDeliveryDate || ""),
      );
    if (isReadOnly && !hasExpDateChanges) {
      onBack();
      return;
    }
    if (!base.customerCode) {
      toast("Please select a customer before submitting.", "error");
      return;
    }
    if (products.length === 0 || !products[0].productCode) {
      toast("At least one valid product must be added.", "error");
      return;
    }

    const flows = lsLoad(ESCALATION_FLOWS_KEY, {});
    const flow = flows["Service Material"] || [];
    const step0 = flow[0] || {};
    const slaMs =
      (step0.durationHours || 2) * 3600_000 +
      (step0.durationMins || 0) * 60_000;
    const now = new Date().toISOString();
    const nowMs = Date.now();

    if (
      base.unit &&
      (!units ||
        !units.some((u) => u.name.toLowerCase() === base.unit.toLowerCase()))
    ) {
      try {
        await axios.post(`${API_URL}/master/units`, { name: base.unit });
      } catch (err) {
        console.error("Failed to auto-add new unit:", err);
      }
    }

    if (isEdit || isReadOnly) {
      const updated = {
        ...initialData,
        ...base,
        products,
        productCode: products[0].productCode,
        productDescription: products[0].productDescription,
        serialNumber: products[0].serialNumber,
        boardType: products[0].boardType,
        qty: products[0].qty,
        type: products[0].type,
        expectedDeliveryDate: products[0].expectedDeliveryDate,
        _editing: undefined,
        _readonly: undefined,
      };
      onSave(updated, true);
    } else {
      const escalationHistory = [
        {
          level: 0,
          department: base.assignedDepartment || step0.dept || "",
          engineerId: base.assignedTo,
          engineerName: base.assignedToName,
          assignedAt: now,
          deadline: new Date(nowMs + slaMs).toISOString(),
        },
      ];
      const row = {
        id: `smi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        refNo: genRef(),
        dateTime: new Date().toLocaleString(),
        timestamp: now,
        ...base,
        products,
        productCode: products[0].productCode,
        productDescription: products[0].productDescription,
        productSegment: products[0].productSegment,
        serialNumber: products[0].serialNumber,
        boardType: products[0].boardType,
        qty: products[0].qty,
        type: products[0].type,
        expectedDeliveryDate: products[0].expectedDeliveryDate,
        status: "Open",
        escalationLevel: 0,
        escalationHistory,
        currentEngineerId: "",
        qcActions: [],
      };
      onSave(row, false);
    }
    setIsDirty(false); // Reset dirty state after successful save
  };

  const handleBackClick = () => {
    if (isDirty && !isReadOnly) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto"
    >
      <AnimatePresence>
        {dupeTarget && (
          <DuplicateModal
            onConfirm={(count) => confirmDuplicate(dupeTarget, count)}
            onClose={() => setDupeTarget(null)}
          />
        )}
        {showUnsavedModal && (
          <UnsavedChangesModal
            onConfirm={() => {
              setShowUnsavedModal(false);
              onBack();
            }}
            onClose={() => setShowUnsavedModal(false)}
          />
        )}
        {showAddRowsModal && (
          <AddRowsModal
            onConfirm={confirmAddRows}
            onClose={() => setShowAddRowsModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-400 mb-[1vw]">
        <div className="flex items-center gap-[1vw]">
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center gap-[0.4vw] text-black/70 hover:text-black border border-gray-400 bg-gray-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer"
          >
            <ArrowLeft className="w-[1vw] h-[1vw]" />
            <span className="font-medium">Back</span>
          </button>
          <h2 className="text-[1vw] font-bold text-black">
            {isReadOnly
              ? initialData.products?.some((p) => p.expectedDeliveryDate === "")
                ? "Update Inward Entry"
                : "View Inward Entry"
              : isEdit
                ? "Edit Inward Entry"
                : "New Service Material Inward"}
          </h2>
          {isReadOnly && (
            <span className="text-[0.72vw] bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.2vw] rounded-full flex items-center gap-[0.3vw]">
              <Eye className="w-[0.8vw] h-[0.8vw]" />
              {initialData.products?.some((p) => p.expectedDeliveryDate === "")
                ? "Partial Edit Mode — Exp. Delivery Date"
                : "Read Only Mode"}
            </span>
          )}
          {!isReadOnly && !isEdit && products.length > 1 && (
            <span className="text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded-full">
              {products.length} products in this entry
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">
        {/* Customer Information */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-400 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-black uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-400 flex items-center gap-[0.5vw]">
            <User className="w-[1vw] h-[1vw] text-blue-500" />
            Customer Information
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            {/* Row 1 */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-black">Date</label>
              <input
                readOnly
                value={fmtDate(base.date)}
                className="border border-gray-400 p-[0.6vw] rounded-[0.4vw] bg-gray-100 text-black cursor-not-allowed"
              />
            </div>

            <div
              className="col-span-1 flex flex-col gap-[0.3vw]"
              ref={refCustRef}
            >
              <label className="font-semibold text-black">
                Reference No{" "}
                <span className="text-black/80 font-normal">(Customer)</span>
              </label>
              <div className="relative">
                <input
                  value={base.refNoCustomer}
                  onChange={(e) => {
                    sb("refNoCustomer", e.target.value);
                    if (!isReadOnly) {
                      setShowRefCustDrop(true);
                      setRefCustActiveIndex(-1);
                    }
                  }}
                  onKeyDown={handleRefCustKeyDown}
                  onFocus={() => {
                    if (!isReadOnly) {
                      setShowRefCustDrop(true);
                      setRefCustActiveIndex(-1);
                    }
                  }}
                  disabled={isReadOnly}
                  placeholder="Enter customer ref no…"
                  className="w-full border border-gray-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 ring-blue-100 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {showRefCustDrop && !isReadOnly && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                    <div className="ref-cust-drop-container">
                      {filteredRefCust.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            sb("refNoCustomer", r);
                            setShowRefCustDrop(false);
                            setRefCustActiveIndex(-1);
                          }}
                          className={`p-[0.6vw] cursor-pointer border-b border-gray-50 last:border-0 font-semibold text-gray-900 ${i === refCustActiveIndex ? "bg-blue-100" : "hover:bg-blue-50"}`}
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                    {filteredRefCust.length === 0 && (
                      <div className="p-[0.6vw] text-center text-gray-600 font-medium">
                        No matching references
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className="col-span-1 flex flex-col gap-[0.3vw]"
              ref={refIntRef}
            >
              <label className="font-semibold text-black">
                Reference No{" "}
                <span className="text-black/80 font-normal">(Internal)</span>
              </label>
              <div className="relative">
                <input
                  value={base.refNoInternal}
                  onChange={(e) => {
                    sb("refNoInternal", e.target.value);
                    if (!isReadOnly) {
                      setShowRefIntDrop(true);
                      setRefIntActiveIndex(-1);
                    }
                  }}
                  onKeyDown={handleRefIntKeyDown}
                  onFocus={() => {
                    if (!isReadOnly) {
                      setShowRefIntDrop(true);
                      setRefIntActiveIndex(-1);
                    }
                  }}
                  disabled={isReadOnly}
                  placeholder="Enter internal ref no…"
                  className="w-full border border-gray-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 ring-blue-100 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {showRefIntDrop && !isReadOnly && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                    <div className="ref-int-drop-container">
                      {filteredRefInt.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            sb("refNoInternal", r);
                            setShowRefIntDrop(false);
                            setRefIntActiveIndex(-1);
                          }}
                          className={`p-[0.6vw] cursor-pointer border-b border-gray-50 last:border-0 font-semibold text-gray-900 ${i === refIntActiveIndex ? "bg-blue-100" : "hover:bg-blue-50"}`}
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                    {filteredRefInt.length === 0 && (
                      <div className="p-[0.6vw] text-center text-gray-600 font-medium">
                        No matching references
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-black uppercase text-[0.72vw]">
                Category
              </label>
              <select
                value={base.category}
                onChange={(e) => {
                  sb("category", e.target.value);
                  // Reset selected customer since it might not belong to this category
                  setCustSearch("");
                  sb("customerName", "");
                  sb("customerCode", "");
                }}
                disabled={isReadOnly}
                className="w-full border border-gray-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:border-blue-500 shadow-none text-gray-800 font-semibold bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Category (All)</option>
                {partyTypes.map((t) => (
                  <option key={t.id || t._id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2 */}
            <div
              className="col-span-2 flex flex-col gap-[0.3vw] relative"
              ref={custRef}
            >
              <label className="font-semibold text-gray-800">
                Customer Name
              </label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-800" />
                <input
                  value={custSearch}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      setCustSearch(e.target.value);
                      sb("customerName", e.target.value);
                      sb("customerCode", "");
                      setShowCustDrop(true);
                      setCustActiveIndex(-1);
                    }
                  }}
                  onKeyDown={handleCustKeyDown}
                  onFocus={() => {
                    if (!isReadOnly) {
                      setShowCustDrop(true);
                      setCustActiveIndex(-1);
                    }
                  }}
                  disabled={isReadOnly}
                  placeholder="Search & select customer…"
                  className="w-full border border-gray-400 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] outline-none focus:border-blue-500 shadow-none text-gray-800 font-bold disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              {showCustDrop && !isReadOnly && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[14vw] overflow-y-auto z-30">
                  <div className="cust-drop-container">
                    {filteredCustomers.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => selectCustomer(c)}
                        className={`p-[0.6vw] cursor-pointer border-b border-gray-50 last:border-0 flex justify-between ${i === custActiveIndex ? "bg-blue-100" : "hover:bg-blue-50"}`}
                      >
                        <div>
                          <div className="font-bold text-gray-900">
                            {c.name}
                          </div>
                          <div className="text-[0.7vw] text-gray-700 font-medium">
                            {c.code}
                          </div>
                        </div>
                        <span className="text-[0.7vw] bg-purple-100 text-purple-700 px-[0.5vw] py-[0.15vw] rounded self-center border border-purple-200">
                          {c.type}
                        </span>
                      </div>
                    ))}
                  </div>
                  {filteredCustomers.length === 0 && (
                    <div className="p-[1vw] text-center text-gray-700 font-medium">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-1 flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-black uppercase text-[0.72vw]">
                Customer Code
              </label>
              <input
                readOnly
                value={base.customerCode}
                className="border border-gray-400 p-[0.6vw] rounded-[0.4vw] bg-gray-100 text-gray-800 font-semibold cursor-not-allowed"
              />
            </div>

            <div
              className="col-span-1 flex flex-col gap-[0.3vw] relative"
              ref={unitRef}
            >
              <label className="font-semibold text-black uppercase text-[0.72vw]">
                Unit
              </label>
              <div className="relative">
                <input
                  value={base.unit}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      sb("unit", e.target.value);
                      setShowUnitDrop(true);
                      setUnitActiveIndex(-1);
                    }
                  }}
                  onKeyDown={handleUnitKeyDown}
                  onFocus={() => {
                    if (!isReadOnly) {
                      setShowUnitDrop(true);
                      setUnitActiveIndex(-1);
                    }
                  }}
                  disabled={isReadOnly}
                  placeholder="Select or enter unit…"
                  className="w-full border border-gray-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:border-blue-500 shadow-none text-gray-800 font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <ChevronDown className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-800 cursor-pointer pointer-events-none" />
              </div>
              {showUnitDrop && !isReadOnly && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-400 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                  <div className="unit-drop-container">
                    {filteredUnits.map((u, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          sb("unit", u.name);
                          setShowUnitDrop(false);
                          setUnitActiveIndex(-1);
                        }}
                        className={`p-[0.6vw] cursor-pointer border-b border-gray-50 last:border-0 font-semibold text-gray-900 ${i === unitActiveIndex ? "bg-blue-100" : "hover:bg-blue-50"}`}
                      >
                        {u.name}
                      </div>
                    ))}
                  </div>
                  {filteredUnits.length === 0 && (
                    <div className="p-[0.6vw] text-center text-gray-600 font-medium">
                      No matching units
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product & Service Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-400 p-[1.2vw]">
          <div className="flex items-center justify-between mb-[1vw] pb-[0.5vw] border-b border-gray-400">
            <h3 className="text-[0.85vw] font-bold text-black uppercase tracking-wide flex items-center gap-[0.5vw]">
              <Package className="w-[1vw] h-[1vw] text-blue-500" />
              Product &amp; Service Details
              {base.customerCode && (
                <span className="ml-[0.5vw] text-[0.7vw] bg-blue-100 text-blue-700 px-[0.5vw] py-[0.15vw] rounded-full font-semibold normal-case tracking-normal">
                  {products.length} count{products.length > 1 ? "s" : ""}
                </span>
              )}
            </h3>
            {!isReadOnly && base.customerCode && (
              <button
                type="button"
                onClick={() => setShowAddRowsModal(true)}
                className="flex items-center gap-[0.4vw] text-[0.75vw] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" />
                Add Product Row
              </button>
            )}
          </div>

          {!base.customerCode && !isReadOnly && (
            <div className="text-[0.78vw] font-bold text-blue-800 bg-blue-50 border border-dashed border-blue-400 rounded-[0.4vw] p-[1.5vw] text-center mb-[0.8vw] shadow-sm animate-pulse">
              Please search and select a Customer from the dropdown above to
              enable product entry.
            </div>
          )}

          {base.customerCode && (
            <div className="mt-[0.6vw]">
              <EditableProductTable
                products={products}
                setProducts={setProducts}
                customerCode={base.customerCode}
                customerCategory={base.category}
                customerDb={custDbForRows}
                boardTypes={boardTypes}
                isReadOnly={isReadOnly}
                allowPartialEdit={
                  isReadOnly &&
                  initialData.products?.some(
                    (p) => p.expectedDeliveryDate === "",
                  )
                }
                onDuplicate={requestDuplicate}
                onRemove={removeProduct}
                registrationDate={base.date}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw] z-40">
          <button
            type="button"
            onClick={handleBackClick}
            className="px-[1.5vw] py-[0.7vw] border border-gray-400 bg-white hover:bg-gray-50 text-black/90 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold"
          >
            <X className="w-[1vw] h-[1vw]" />
            {isReadOnly &&
            !products.some(
              (p) =>
                p.expectedDeliveryDate !==
                (initialData.products?.find((ip) => ip._pid === p._pid)
                  ?.expectedDeliveryDate || ""),
            )
              ? "Close"
              : "Cancel"}
          </button>
          {(!isReadOnly ||
            products.some(
              (p) =>
                p.expectedDeliveryDate !==
                (initialData.products?.find((ip) => ip._pid === p._pid)
                  ?.expectedDeliveryDate || ""),
            )) && (
            <button
              type="submit"
              className="px-[1.5vw] py-[0.7vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md"
            >
              <Save className="w-[1vw] h-[1vw]" />
              {isEdit || isReadOnly ? "Update Entry" : "Register Inward"}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

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
              <div className="flex border-b border-gray-600">
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

            <div className="p-[0.55vw] border-b border-gray-600">
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
        className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 hover:border-blue-400 rounded-[0.3vw] transition-all cursor-pointer shadow-sm"
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
                  className="bg-white border border-gray-400 shadow-2xl rounded-[0.5vw] w-[22vw] p-[1vw]"
                >
                  <div className="flex items-center justify-between mb-[0.8vw] pb-[0.4vw] border-b border-gray-400">
                    <div className="text-[0.8vw] font-bold text-black flex items-center gap-[0.4vw]">
                      <Clock className="w-[0.9vw] h-[0.9vw] text-blue-500" />
                      Status History
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="text-black/40 hover:text-black cursor-pointer"
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
                                  <div className="flex-1 bg-gray-50 rounded-[0.35vw] px-[0.6vw] py-[0.4vw] border border-gray-200">
                                    <div className="flex items-center justify-between gap-[0.4vw] flex-wrap">
                                      {entry.type === "assigned" ? (
                                        <span className="text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-bold border bg-blue-50 text-blue-700 border-blue-300">
                                          Assigned → {entry.name}
                                        </span>
                                      ) : entry.type === "admin" ? (
                                        <span
                                          className={`text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-bold border ${
                                            entry.status === "Approved"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                              : "bg-amber-50 text-amber-700 border-amber-300"
                                          }`}
                                        >
                                          {entry.adminName
                                            ? `${entry.status} → ${entry.adminName}`
                                            : entry.status}
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-[0.72vw] px-[0.5vw] py-[0.1vw] rounded-full font-bold border ${
                                            entry.status === "Completed"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                              : entry.status === "Hold"
                                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                                : entry.status ===
                                                    "Not Repairable"
                                                  ? "bg-slate-100 text-slate-700 border-slate-400"
                                                  : entry.status ===
                                                      "Under Testing"
                                                    ? "bg-purple-50 text-purple-700 border-purple-300"
                                                    : "bg-amber-50 text-amber-700 border-amber-300"
                                          }`}
                                        >
                                          {entry.status}
                                        </span>
                                      )}
                                      {tsLabel && (
                                        <span className="text-[0.65vw] text-gray-400 font-medium whitespace-nowrap">
                                          {tsLabel}
                                        </span>
                                      )}
                                    </div>
                                    {entry.remark && (
                                      <div className="mt-[0.3vw] text-[0.7vw] text-gray-700">
                                        <span className="font-semibold text-gray-500">
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
    }}
  >
    {children}
  </tr>
);

// Inject keyframe once (idempotent)
if (
  typeof document !== "undefined" &&
  !document.getElementById("sm-keyframes")
) {
  const style = document.createElement("style");
  style.id = "sm-keyframes";
  style.textContent = `
    @keyframes smReveal {
      from { opacity: 0; transform: translateY(-5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes smSlideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
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
    (isSupervisor ? 0 : 1) + 1 + productCols.length + actionCols.length;

  // Running delay counter for stagger across all rows
  let animDelay = 0;

  return (
    <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-600 flex flex-col">
      <div className="overflow-auto max-h-[65vh] min-h-[65vh] w-full rounded-t-[0.6vw]">
        <table className="w-full text-left border-collapse">
          {/* ── THEAD ─────────────────────────────────────────────────────── */}
          <thead
            className="sticky top-0 z-10"
            style={{ background: "#1a73e8" }}
          >
            <tr>
              {!isSupervisor && (
                <th
                  rowSpan={2}
                  className="p-[0.6vw] border-b-2 border-r border-blue-400/30 text-center align-middle w-[2.5%] sticky top-0 z-20"
                  style={{ background: "#1a73e8" }}
                >
                  <button
                    type="button"
                    onClick={onToggleSelectPage}
                    className="flex items-center justify-center w-full cursor-pointer"
                  >
                    <div
                      className={`w-[1.1vw] h-[1.1vw] rounded-[0.2vw] border border-white flex items-center justify-center transition-all ${
                        isPageSelected
                          ? "bg-white text-[#1a73e8] border-white"
                          : "bg-transparent border-white"
                      }`}
                    >
                      {isPageSelected && (
                        <span className="text-[0.75vw] leading-none font-bold text-[#1a73e8]">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                </th>
              )}

              <th
                rowSpan={2}
                className="px-[0.6vw] py-[0.55vw] font-semibold text-white text-center border-b-2 border-r border-blue-400/30 whitespace-nowrap text-[0.8vw] align-middle w-[3%] sticky top-0 z-20"
                style={{ background: "#1a73e8" }}
              >
                S. No
              </th>

              {/* Products super-header */}
              <th
                colSpan={productCols.length}
                className="px-[0.6vw] py-[0.45vw] font-semibold text-white border-b border-r border-blue-400/30 text-center text-[0.8vw] tracking-wide sticky top-0 z-20"
                style={{ background: "#1a73e8" }}
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
                        ? "148px"
                        : h === "History"
                          ? "80px"
                          : "100px",
                    background: "#1a73e8",
                  }}
                  className="px-[0.6vw] py-[0.55vw] font-semibold text-white text-center border-b-2 border-r border-blue-400/30 last:border-r-0 whitespace-nowrap text-[0.8vw] align-middle sticky top-0 z-20"
                >
                  {h}
                </th>
              ))}
            </tr>

            <tr style={{ background: "#1a73e8" }}>
              {productCols.map((h) => (
                <th
                  key={h}
                  style={{
                    minWidth:
                      h === "Product"
                        ? "210px"
                        : h === "Product Code"
                          ? "140px"
                          : h === "Segment"
                            ? "100px"
                            : "125px",
                    background: "#1a73e8",
                  }}
                  className="px-[0.6vw] py-[0.45vw] font-semibold text-white/90 text-center border-b-2 border-r border-blue-400/30 whitespace-nowrap text-[0.76vw] sticky top-[2.1vw] z-20"
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
                  <AnimatedTr
                    key={`cust-${customerName}`}
                    delay={custDelay}
                    className="cursor-pointer select-none border-b border-gray-600 bg-white hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCustomer(customerName)}
                  >
                    <td
                      colSpan={totalCols}
                      className="px-[0.9vw] py-[0.65vw] border-l-[4px] border-[#1a73e8] sticky top-[4.0vw] z-10 bg-white shadow-sm border-b border-gray-600"
                    >
                      <div className="flex items-center gap-[0.7vw]">
                        {isCustomerCollapsed ? (
                          <ChevronRight className="w-[1.1vw] h-[1.1vw] text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-[1.1vw] h-[1.1vw] text-slate-500 flex-shrink-0" />
                        )}

                        <span className="font-bold text-slate-800 text-[0.88vw] tracking-wide">
                          {customerName}
                        </span>

                        {/* Customer Code if available on the first row */}
                        {rows[0]?.customerCode && (
                          <span className="text-[0.65vw] text-slate-500 font-medium ml-[0.5vw]">
                            Code: {rows[0].customerCode}
                          </span>
                        )}

                        {/* Ref No (Customer) */}
                        {rows[0]?.refNoCustomer && (
                          <span className="text-[0.7vw] font-bold bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                            Cust Ref: {rows[0].refNoCustomer}
                          </span>
                        )}

                        {/* Ref No (Internal) */}
                        {rows[0]?.refNoInternal && (
                          <span className="text-[0.7vw] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                            Int Ref: {rows[0].refNoInternal}
                          </span>
                        )}

                        {/* Category (Cus Type) */}
                        {rows[0]?.category && (
                          <span className="text-[0.7vw] font-semibold text-slate-700 bg-slate-50 border border-gray-600 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                            Type: {rows[0].category}
                          </span>
                        )}

                        {/* Unit */}
                        {rows[0]?.unit && (
                          <span className="text-[0.7vw] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-[0.6vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap ml-[0.5vw]">
                            Unit: {rows[0].unit}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-[0.8vw]" />
                      </div>
                    </td>
                  </AnimatedTr>,

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
                          <AnimatedTr
                            key={`entry-hdr-${row.id}`}
                            delay={entryDelay}
                            className={`border-t border-b border-gray-600 cursor-pointer select-none transition-colors duration-150 ${
                              isSelected
                                ? "bg-blue-50/60"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            {!isSupervisor && (
                              <td
                                className="p-[0.5vw] border-r border-gray-600 text-center align-middle"
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
                                    className={`w-[1.1vw] h-[1.1vw] rounded-[0.2vw] border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-gray-600 hover:border-gray-600 bg-white"
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="text-[0.75vw] leading-none font-bold">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </td>
                            )}

                            {/* S.No */}
                            <td
                              className="px-[0.5vw] py-[0.5vw] border-r border-gray-600 text-center text-[0.78vw] font-bold text-slate-600 align-middle"
                              onClick={() => toggleEntry(row.id)}
                            >
                              {globalSn}
                            </td>

                            {/* Date + meta + actions — spans remaining cols */}
                            <td
                              colSpan={productCols.length + actionCols.length}
                              className="px-[0.8vw] py-[0.5vw] align-middle"
                              onClick={() => toggleEntry(row.id)}
                            >
                              <div className="flex items-center gap-[0.75vw] flex-wrap">
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
                                  <ChevronDown className="w-[0.82vw] h-[0.82vw]" />
                                </span>

                                {/* Date */}
                                <div className="flex items-center gap-[0.4vw] ml-[1vw]">
                                  <Calendar className="w-[0.9vw] h-[0.9vw] text-slate-500 flex-shrink-0" />
                                  <span className="text-[0.78vw] font-bold text-slate-700 whitespace-nowrap">
                                    {fmtDate(row.date || row.timestamp)}
                                  </span>
                                </div>

                                {/* Product count badge */}
                                <span className="text-[0.72vw] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-[0.55vw] py-[0.1vw] rounded-[0.3vw] whitespace-nowrap">
                                  {prods.length}{" "}
                                  {prods.length === 1 ? "Product" : "Products"}
                                </span>

                                {/* Actions — right side */}
                                <div
                                  className="ml-auto flex items-center gap-[0.5vw]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isSupervisor ? (
                                    <button
                                      type="button"
                                      onClick={() => onView(row)}
                                      title="View"
                                      className="w-[2vw] h-[2vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-gray-600 hover:border-blue-400 rounded-[0.4vw] shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  ) : row.products?.some(
                                      (p) => !!p.assignedTo,
                                    ) ? (
                                    <button
                                      type="button"
                                      onClick={() => onView(row)}
                                      title="View (assigned)"
                                      className="w-[2vw] h-[2vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-gray-600 hover:border-blue-400 rounded-[0.4vw] shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onEdit(row)}
                                      title="Edit"
                                      className="w-[2vw] h-[2vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border border-gray-600 hover:border-blue-400 rounded-[0.4vw] shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  )}

                                  {!isSupervisor && (
                                    <button
                                      type="button"
                                      onClick={() => onDelete(row.id)}
                                      title="Delete"
                                      className="w-[2vw] h-[2vw] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-600 border border-gray-600 hover:border-rose-400 rounded-[0.4vw] shadow-sm cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </AnimatedTr>,

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
                                    } border-b border-gray-600`}
                                  >
                                    {/* Checkbox placeholder */}
                                    {!isSupervisor && (
                                      <td
                                        className="border-r border-gray-600"
                                        style={{ background: "transparent" }}
                                      />
                                    )}

                                    {/* S.No sub-number */}
                                    <td className="border-r border-gray-600 text-center align-middle px-[0.3vw] py-[0.45vw]">
                                      <span className="text-[0.72vw] font-semibold text-slate-400">
                                        {globalSn}.{pi + 1}
                                      </span>
                                    </td>

                                    {/* Product Description */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-gray-600 align-middle">
                                      <div className="flex flex-col gap-[0.2vw]">
                                        <div
                                          className="font-bold text-slate-800 text-[0.8vw] max-w-[15vw] break-words leading-snug"
                                          title={prod.productDescription}
                                        >
                                          {prod.productDescription || "—"}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Product Code */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-gray-600 text-[0.8vw] text-slate-700 font-semibold align-middle text-center">
                                      {prod.productCode || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Segment */}
                                    <td className="px-[0.7vw] py-[0.55vw] border-r border-gray-600 text-[0.8vw] text-blue-600 font-bold align-middle text-center uppercase">
                                      {prod.productSegment || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Serial No */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 text-[0.8vw] text-slate-800 font-bold align-middle text-center">
                                      {prod.serialNumber || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Board Type */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 text-[0.8vw] text-slate-700 font-semibold align-middle text-center">
                                      {prod.boardType || (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Exp. Delivery */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 text-[0.8vw] text-slate-700 font-semibold whitespace-nowrap align-middle text-center">
                                      {fmtDate(prod.expectedDeliveryDate)}
                                    </td>

                                    {/* Type badge */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 align-middle text-center">
                                      <span
                                        className={`whitespace-nowrap text-[0.7vw] font-bold px-[0.6vw] py-[0.15vw] rounded-[0.3vw] border ${
                                          prod.type === "W"
                                            ? "bg-green-50 text-green-600 border-green-200"
                                            : "bg-blue-50 text-blue-600 border-blue-200"
                                        }`}
                                      >
                                        {TYPE_LABELS[prod.type] ||
                                          prod.type ||
                                          "—"}
                                      </span>
                                    </td>

                                    {/* Emp Report */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 align-middle text-center">
                                      {prod.report ? (
                                        <button
                                          type="button"
                                          onClick={() => onViewReport(prod)}
                                          className="px-[0.6vw] py-[0.2vw] text-[0.7vw] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 hover:border-emerald-400 rounded-[0.3vw] transition-all cursor-pointer shadow-sm"
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
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 align-middle text-center">
                                      <div className="flex flex-col items-center gap-[0.2vw]">
                                        <span
                                          className={`inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.25vw] rounded-[0.3vw] border text-[0.7vw] font-semibold whitespace-nowrap ${employeeStatusCfg.bg} ${employeeStatusCfg.border} ${employeeStatusCfg.text}`}
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
                                      <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 align-middle text-center">
                                        <FinalStatusCell
                                          row={row}
                                          prod={prod}
                                          onUpdateProduct={onUpdateProduct}
                                        />
                                      </td>
                                    )}

                                    {/* History */}
                                    <td className="px-[0.65vw] py-[0.55vw] border-r border-gray-600 align-middle text-center">
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
      <div className="border-t border-gray-600 px-[1.2vw] py-[0.85vw] bg-white flex justify-between items-center rounded-b-[0.6vw]">
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
            className="w-[2vw] h-[2vw] flex items-center justify-center border border-gray-600 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-30 bg-white cursor-pointer transition-colors"
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
                      : "bg-white border border-gray-600 text-slate-700 hover:bg-slate-50"
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
            className="w-[2vw] h-[2vw] flex items-center justify-center border border-gray-600 rounded-[0.4vw] hover:bg-slate-50 disabled:opacity-30 bg-white cursor-pointer transition-colors"
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
  { label: "All" },
  { label: "Open" },
  { label: "Assigned" },
  { label: "Repair in Progress" },
  { label: "Pending" },
  { label: "Under Testing" },
  { label: "Hold" },
  { label: "Not Repairable" },
  { label: "Review Required" },
  { label: "Completed" },
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
  const [partyTypes, setPartyTypes] = useState([]);
  const [reportsRowId, setReportsRowId] = useState(null);
  const [selectedReportProduct, setSelectedReportProduct] = useState(null);
  const [isBoardTypeMasterOpen, setIsBoardTypeMasterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const materialRes = await axios
          .get(`${API_URL}/service-material`)
          .catch(() => ({ data: lsLoad(INWARD_KEY, []) }));
        const customerRes = await axios
          .get(`${API_URL}/master/customers`)
          .catch(() => ({ data: [] }));
        const boardRes = await axios
          .get(`${API_URL}/master/board-types`)
          .catch(() => ({ data: [] }));
        const unitsRes = await axios
          .get(`${API_URL}/master/units`)
          .catch(() => ({ data: [] }));
        const ptRes = await axios
          .get(`${API_URL}/master/party-types`)
          .catch(() => ({ data: [] }));

        // Map backend _id to id for frontend compatibility (only for real API responses)
        const mappedEntries = materialRes.data.map((item) => ({
          ...item,
          id: item._id || item.id,
        }));

        setEntries(mappedEntries);
        setCustomerDb(customerRes.data);
        setBoardTypes(boardRes.data);
        setUnits(unitsRes.data);
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
          <InwardForm
            key="form"
            initialData={editingRow || { ...emptyBase() }}
            customerDb={customerDb}
            employees={employees}
            boardTypes={boardTypes}
            units={units}
            entries={entries}
            partyTypes={partyTypes}
            onSave={handleSave}
            onBack={goToTable}
          />
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-[0.8vw] bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-400 mb-[0.9vw] flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[18vw]">
                <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
                <input
                  type="text"
                  placeholder="Search by ref, customer, product…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[30vw] pl-[2.5vw] pr-[2.2vw] h-[2.5vw] border border-gray-300 rounded-[0.5vw] focus:outline-none focus:border-blue-500 text-gray-800 text-[0.78vw] font-semibold"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                )}
              </div>

              {/* Date From */}
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.72vw] font-semibold text-gray-500 whitespace-nowrap">
                  From
                </span>
                <div className="relative">
                  <Calendar className="absolute left-[0.4vw] top-1/2 -translate-y-1/2 w-[0.7vw] h-[0.7vw] text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-[1.5vw] pr-[0.4vw] py-[0.35vw] border border-gray-300 rounded-[0.4vw] text-[0.7vw] font-medium text-gray-700 outline-none focus:border-blue-500 transition-all h-[2.05vw]"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.72vw] font-semibold text-gray-500 whitespace-nowrap">
                  To
                </span>
                <div className="relative">
                  <Calendar className="absolute left-[0.4vw] top-1/2 -translate-y-1/2 w-[0.7vw] h-[0.7vw] text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-[1.5vw] pr-[0.4vw] py-[0.35vw] border border-gray-300 rounded-[0.4vw] text-[0.7vw] font-medium text-gray-700 outline-none focus:border-blue-500 transition-all h-[2.05vw]"
                  />
                </div>
              </div>

              {/* Clear filters button */}
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="flex items-center gap-[0.25vw] px-[0.6vw] py-[0.4vw] rounded-[0.4vw] border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 text-[0.68vw] font-semibold transition-all cursor-pointer h-[2.05vw] self-center"
                >
                  <X className="w-[0.65vw] h-[0.65vw]" /> Clear
                </button>
              )}

              <div className="ml-auto flex gap-[0.8vw] items-center">
                {/* Last Sync + Refresh */}
                <div className="flex items-center gap-[0.5vw] bg-slate-50 border border-slate-200 px-[0.7vw] py-[0.35vw] rounded-[0.5vw] h-[2.4vw]">
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-[0.6vw] text-slate-400 font-medium tracking-wide">
                      Last Sync
                    </span>
                    <span className="text-[0.7vw] font-semibold text-slate-700 tabular-nums">
                      {lastSyncTime
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                        .toLowerCase()
                        .replace(/\s+/g, "")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // We can access fetchData indirectly or define it outside or pass it.
                      // Wait, let's find the correct fetch function to call.
                      // In the main App, we have a trigger or function. Let's make sure we handle it.
                      document.dispatchEvent(
                        new CustomEvent("refresh-service-material"),
                      );
                    }}
                    className="w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                </div>

                <AnimatePresence>
                  {selectedItems.size > 0 && !isSupervisor && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold"
                    >
                      <Trash2 className="w-[1vw] h-[1vw]" />
                      Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>
                {!isSupervisor && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsBoardTypeMasterOpen(true)}
                      className="cursor-pointer flex items-center gap-[0.5vw] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-gray-600 hover:border-blue-400 font-bold px-[1vw] h-[2.4vw] rounded-[0.4vw] transition-all shadow-sm"
                    >
                      <Wrench className="w-[1vw] h-[1vw] text-slate-500" />{" "}
                      Board Types Master
                    </button>
                    <button
                      type="button"
                      onClick={goToForm}
                      className="cursor-pointer flex items-center gap-[0.5vw] bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold px-[1vw] h-[2.4vw] border border-[#1a73e8] rounded-[0.4vw] transition-all shadow-sm"
                    >
                      <Plus className="w-[1.2vw] h-[1.2vw] text-white" />
                      Add
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Modern Sleek Segment Tab Bar */}
            <div className="flex bg-slate-100 p-[0.25vw] rounded-[0.5vw] border border-slate-200 mb-[0.9vw] w-fit max-w-full gap-[0.25vw]">
              {STATUS_CHIPS.map(({ label }) => {
                const isActive = activeFilter === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveFilter(label)}
                    className={`flex items-center gap-[0.6vw] px-[0.9vw] py-[0.4vw] rounded-[0.4vw] text-[0.78vw] font-bold cursor-pointer transition-all duration-150 select-none border-0 ${
                      isActive
                        ? "bg-white text-[#1a73e8] shadow-sm"
                        : "text-slate-600 hover:text-[#1a73e8] hover:bg-white/40"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-[0.35vw] py-[0.03vw] rounded-full text-[0.66vw] font-extrabold ${
                        isActive
                          ? "bg-blue-100 text-[#1a73e8]"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {counts[label] ?? 0}
                    </span>
                  </button>
                );
              })}
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
