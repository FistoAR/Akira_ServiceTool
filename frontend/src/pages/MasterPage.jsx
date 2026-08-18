import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useNotification } from "../components/NotificationContext";
import {
  Settings,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Save,
  RotateCcw,
  Shield,
  Users,
  User,
  GripVertical,
  Info,
  CheckCircle,
  PhoneCall,
  UserCheck,
  Search,
  Tag,
  Edit2,
  Trash2,
  Check,
  Tags,
  HelpCircle,
  Columns,
  Eye,
  EyeOff,
  Clock,
  Wrench,
  Package,
  Mail,
  Calendar,
  Briefcase,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Phone,
  Image as ImageIcon,
  IndianRupee,
  Activity,
  UserPlus,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Storage Keys ──────────────────────────────────────────────────────────────
const PARTY_TYPES_KEY = "party_types_v3";
const PRODUCT_SEGMENTS_KEY = "product_segments_v1";
const EMPLOYEES_KEY = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const SERVICE_MATERIAL_ESCALATION_KEY = "service_material_escalation_v1";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
export const COLUMN_VIS_KEY = "customer_db_col_visibility_v1";

const API_URL = import.meta.env.VITE_API_URL;

// ── Default dept flow ─────────────────────────────────────────────────────────
const DEFAULT_DEPTS = ["Support Engineers", "Service Engineers", "R&D"];

// ── Column definitions (shared with CustomerDatabase) ─────────────────────────
export const CUSTOMER_DB_COLUMNS = [
  {
    key: "partyType",
    label: "Party Type",
    required: false,
    description: "Customer category badge",
  },
  {
    key: "productSegment",
    label: "Product Segment",
    required: false,
    description: "Product line / segment",
  },
  {
    key: "partyCode",
    label: "Party Code",
    required: true,
    description: "Unique party identifier (always visible)",
  },
  {
    key: "partyDescription",
    label: "Party Description",
    required: true,
    description: "Company / party name (always visible)",
  },
  {
    key: "itemCode",
    label: "Item Code",
    required: true,
    description: "Unique item code (always visible)",
  },
  {
    key: "itemDescription",
    label: "Item Description",
    required: false,
    description: "Description of the product",
  },
  {
    key: "warrantyPeriodDays",
    label: "Warranty (days)",
    required: false,
    description: "Warranty duration in days",
  },
  {
    key: "state",
    label: "State",
    required: false,
    description: "State / province",
  },
  {
    key: "districtCity",
    label: "District / City",
    required: false,
    description: "District or city",
  },
];

export const DEFAULT_COL_VIS = Object.fromEntries(
  CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
);

export function loadColVisibility() {
  try {
    const s = JSON.parse(localStorage.getItem(COLUMN_VIS_KEY) || "{}");
    return { ...DEFAULT_COL_VIS, ...s };
  } catch {
    return { ...DEFAULT_COL_VIS };
  }
}

// ── Colors ────────────────────────────────────────────────────────────────────
const TYPE_BADGE_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];
const TYPE_COLORS = [
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-600 text-white",
    accent: "text-purple-600",
    headerBg: "bg-gradient-to-r from-purple-50 to-slate-50",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-600 text-white",
    accent: "text-orange-600",
    headerBg: "bg-gradient-to-r from-orange-50 to-slate-50",
  },
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-600 text-white",
    accent: "text-blue-600",
    headerBg: "bg-gradient-to-r from-blue-50 to-slate-50",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-600 text-white",
    accent: "text-green-600",
    headerBg: "bg-gradient-to-r from-green-50 to-slate-50",
  },
  {
    bg: "bg-pink-50",
    border: "border-pink-200",
    badge: "bg-pink-600 text-white",
    accent: "text-pink-600",
    headerBg: "bg-gradient-to-r from-pink-50 to-slate-50",
  },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-600 text-white",
    accent: "text-indigo-600",
    headerBg: "bg-gradient-to-r from-indigo-50 to-slate-50",
  },
];
const LEVEL_COLORS = [
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-blue-800",
  "bg-blue-900",
  "bg-slate-700",
];
const LEVEL_BG_LIGHT = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-blue-100/70 border-blue-200 text-blue-800",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-blue-200/60 border-blue-300 text-blue-900",
  "bg-blue-200 border-blue-400 text-blue-900",
  "bg-slate-100 border-slate-400 text-slate-800",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadEmployees() {
  try {
    return JSON.parse(sessionStorage.getItem("all_employees") || "[]");
  } catch {
    return [];
  }
}
function loadCustomerDb() {
  try {
    return JSON.parse(sessionStorage.getItem("customer_db") || "[]");
  } catch {
    return [];
  }
}
function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// HelpTooltip
// ─────────────────────────────────────────────────────────────────────────────
const HelpTooltip = ({ content, position = "right", width = "16vw" }) => {
  const [visible, setVisible] = useState(false);
  const posMap = {
    right: "left-full top-1/2 -translate-y-1/2 ml-[0.6vw]",
    left: "right-full top-1/2 -translate-y-1/2 mr-[0.6vw]",
    top: "bottom-full left-1/2 -translate-x-1/2 mb-[0.6vw]",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-[0.6vw]",
  };
  const arrowMap = {
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent",
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent",
  };
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors duration-150 cursor-help"
      >
        <HelpCircle className="w-[1vw] h-[1vw]" />
      </button>
      {visible && (
        <div className={`absolute z-50 ${posMap[position]}`} style={{ width }}>
          <div
            className={`absolute w-0 h-0 border-[0.35vw] ${arrowMap[position]}`}
          />
          <div className="bg-slate-700 text-white rounded-[0.4vw] shadow-xl px-[0.8vw] py-[0.6vw]">
            {typeof content === "string" ? (
              <p className="text-[0.7vw] leading-relaxed">{content}</p>
            ) : (
              content
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TABS = [
  { id: "categories", label: "Party Type Categories", icon: Tags },
  { id: "segments", label: "Product Segments", icon: Package },
  { id: "four-m", label: "4M Categories", icon: Columns },
  { id: "units", label: "Units", icon: Activity },
  { id: "employees", label: "User Management", icon: Users },
  { id: "role-access", label: "Role Access", icon: ShieldCheck },
  { id: "escalation", label: "Service Call SLA", icon: PhoneCall },
];

const PartyTypesSection = ({ partyTypes, setPartyTypes }) => {
  const { toast, confirm } = useNotification();
  const [newType, setNewType] = useState({
    name: ""
  });
  const [editingType, setEditingType] = useState(null);

  const handleAdd = async () => {
    const t = newType.name.trim();
    if (!t) return;
    if (partyTypes.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/party-types`, newType);
      const newItem = { ...res.data, id: res.data._id };
      setPartyTypes([...partyTypes, newItem]);
      setNewType({
        name: ""
      });
      toast("Category added successfully");
    } catch (err) {
      toast("Failed to add category", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingType?.name?.trim()) return;
    const t = editingType.name.trim();
    if (
      partyTypes.some(
        (x) =>
          x.id !== editingType.id && x._id !== editingType._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/party-types/${editingType._id || editingType.id}`, editingType);
      const updatedItem = { ...res.data, id: res.data._id };
      setPartyTypes(
        partyTypes.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Category updated");
    } catch (err) {
      toast("Failed to update category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    if (partyTypes.length === 1) {
      toast("Cannot delete the last category!", "warning");
      return;
    }
    const type = partyTypes.find((t) => t.id === id || t._id === mongoId);
    const usageCount = loadCustomerDb().filter((r) => r.partyType === type.name).length;

    const confirmed = await confirm({
      title: "Delete Category",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{type.name}"</span>?</p>
          {usageCount > 0 && (
            <div className="p-[0.8vw] bg-amber-50 border border-amber-200 rounded-[0.4vw]">
               <p className="text-amber-700 font-semibold flex items-center gap-[0.4vw]">
                <AlertTriangle className="w-[1vw] h-[1vw]" /> {usageCount} records affected
              </p>
              <p className="text-amber-600 text-[0.75vw] mt-[0.2vw]">These records will be automatically reassigned to the first available category.</p>
            </div>
          )}
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/party-types/${mongoId || id}`);
        const remaining = partyTypes.filter((t) => t.id !== id && t._id !== mongoId);
        setPartyTypes(remaining);
        toast("Category deleted successfully");
      } catch (err) {
        toast("Failed to delete category", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Existing Categories
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {partyTypes.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No categories yet
              </div>
            ) : (
              partyTypes.map((type, idx) => {
                const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                return (
                  <div
                    key={type.id || type._id}
                    className={`flex items-center justify-between px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors ${
                      editingType && (editingType._id === type._id || editingType.id === type.id)
                        ? "bg-blue-50/50 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-[0.2vw]">
                      <span className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border w-fit ${badgeClass}`}>
                        {type.name}
                      </span>
                    </div>
                    
                    <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingType({ ...type })}
                        className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                      >
                        <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(type.id, type._id)}
                        className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                        disabled={partyTypes.length === 1}
                      >
                        <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[0.8vw] bg-white border border-slate-400 rounded-[0.6vw] p-[1vw]">
          <p className="text-[0.85vw] font-bold text-slate-800 border-b border-slate-200 pb-[0.3vw] flex items-center gap-[0.4vw]">
            {editingType ? (
              <>
                <Edit2 className="w-[1vw] h-[1vw] text-blue-600" />
                Edit Category: {editingType.name}
              </>
            ) : (
              <>
                <Plus className="w-[1vw] h-[1vw] text-emerald-600" />
                Add New Category
              </>
            )}
          </p>

          <div className="space-y-[0.8vw]">
            <div className="space-y-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-slate-600">Category Name *</label>
              <input
                type="text"
                value={editingType ? editingType.name : newType.name}
                onChange={(e) =>
                  editingType
                    ? setEditingType({ ...editingType, name: e.target.value })
                    : setNewType({ ...newType, name: e.target.value })
                }
                placeholder="e.g. Domestic, Export..."
                className="w-full border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] text-[0.8vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-[0.5vw] mt-[0.5vw]">
            {editingType ? (
              <>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!editingType.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newType.name.trim()}
                className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add Category
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const WarrantyRulesSection = ({ warrantyRules, setWarrantyRules, partyTypes }) => {
  const { toast, confirm } = useNotification();
  const [newRule, setNewRule] = useState({
    partyType: "Default",
    weekStartIdx: 3,
    weekLength: 2,
    yearStartIdx: 5,
    yearLength: 2,
    warrantyPeriodYears: 1,
    warrantySLADays: 7,
    postWarrantySLADays: 10
  });
  const [editingRule, setEditingRule] = useState(null);
  const [testSerial, setTestSerial] = useState("SZ-3522-ABCD");

  const handleAdd = async () => {
    const pt = newRule.partyType || "Default";
    if (!pt) {
      toast("Please select a Party Type category", "warning");
      return;
    }
    if (warrantyRules.some((x) => x.partyType.toLowerCase() === pt.toLowerCase())) {
      toast("Warranty rule for this category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/warranty-rules`, { ...newRule, partyType: pt });
      const newItem = { ...res.data, id: res.data._id };
      setWarrantyRules([...warrantyRules, newItem]);
      setNewRule({
        partyType: "Default",
        weekStartIdx: 3,
        weekLength: 2,
        yearStartIdx: 5,
        yearLength: 2,
        warrantyPeriodYears: 1,
        warrantySLADays: 7,
        postWarrantySLADays: 10
      });
      toast("Warranty rule added successfully");
    } catch (err) {
      toast("Failed to add warranty rule", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingRule?.partyType) return;
    const pt = editingRule.partyType;
    if (
      warrantyRules.some(
        (x) =>
          x.id !== editingRule.id && x._id !== editingRule._id && x.partyType.toLowerCase() === pt.toLowerCase(),
      )
    ) {
      toast("Warranty rule for this category already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/warranty-rules/${editingRule._id || editingRule.id}`, editingRule);
      const updatedItem = { ...res.data, id: res.data._id };
      setWarrantyRules(
        warrantyRules.map((x) => (x.id === editingRule.id || x._id === editingRule._id ? updatedItem : x)),
      );
      setEditingRule(null);
      toast("Warranty rule updated");
    } catch (err) {
      toast("Failed to update warranty rule", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const rule = warrantyRules.find((t) => t.id === id || t._id === mongoId);
    const confirmed = await confirm({
      title: "Delete Warranty Rule",
      message: `Are you sure you want to delete the warranty rule for "${rule.partyType}"?`,
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/warranty-rules/${mongoId || id}`);
        const remaining = warrantyRules.filter((t) => t.id !== id && t._id !== mongoId);
        setWarrantyRules(remaining);
        toast("Warranty rule deleted successfully");
      } catch (err) {
        toast("Failed to delete warranty rule", "error");
      }
    }
  };

  const activeRule = editingRule || newRule;
  const wkStart = activeRule.weekStartIdx ?? 3;
  const wkLen = activeRule.weekLength ?? 2;
  const yrStart = activeRule.yearStartIdx ?? 5;
  const yrLen = activeRule.yearLength ?? 2;

  const testWeek = testSerial.substring(wkStart, wkStart + wkLen);
  const testYear = testSerial.substring(yrStart, yrStart + yrLen);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 p-[1.2vw] grid grid-cols-[1.15fr_0.85fr] gap-[1.5vw] overflow-hidden min-h-0">
        <div className="flex flex-col bg-white border border-slate-400 rounded-[0.6vw] p-[1vw] h-full overflow-hidden">
          <p className="text-[0.85vw] font-bold text-gray-700 border-b border-slate-200 pb-[0.3vw] flex items-center gap-[0.4vw] shrink-0">
            Existing Warranty Rules
          </p>
          <div className="flex-1 overflow-y-auto mt-[0.5vw]">
            {warrantyRules.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No warranty rules defined yet
              </div>
            ) : (
              <table className="w-full border-collapse text-[0.78vw] text-left text-slate-900 border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-gray-700 font-bold tracking-wider text-[0.8vw]">
                    <th className="px-[0.6vw] py-[0.5vw] font-bold border border-slate-300">Category</th>
                    <th className="px-[0.6vw] py-[0.5vw] font-bold border border-slate-300">Decoder (Start, Len)</th>
                    <th className="px-[0.6vw] py-[0.5vw] font-bold border border-slate-300">Warranty</th>
                    <th className="px-[0.6vw] py-[0.5vw] font-bold border border-slate-300">W SLA</th>
                    <th className="px-[0.6vw] py-[0.5vw] font-bold border border-slate-300">Paid SLA</th>
                    <th className="px-[0.6vw] py-[0.5vw] font-bold text-center border border-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warrantyRules.map((rule, idx) => {
                    const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                    return (
                      <tr 
                        key={rule.id || rule._id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          editingRule && (editingRule._id === rule._id || editingRule.id === rule.id)
                            ? "bg-blue-50/50"
                            : ""
                        }`}
                      >
                        <td className="px-[0.6vw] py-[0.6vw] font-bold border border-slate-300">
                          <span className={`px-[0.5vw] py-[0.15vw] rounded-[0.3vw] border text-[0.72vw] ${badgeClass}`}>
                            {rule.partyType}
                          </span>
                        </td>
                        <td className="px-[0.6vw] py-[0.6vw] font-mono text-[0.72vw] text-slate-700 border border-slate-300">
                          Wk: [{rule.weekStartIdx ?? 3}, {rule.weekLength ?? 2}] | Yr: [{rule.yearStartIdx ?? 5}, {rule.yearLength ?? 2}]
                        </td>
                        <td className="px-[0.6vw] py-[0.6vw] text-slate-700 border border-slate-300">
                          {rule.warrantyPeriodYears ?? 1} Yr
                        </td>
                        <td className="px-[0.6vw] py-[0.6vw] font-bold text-slate-900 border border-slate-300">
                          {rule.warrantySLADays ?? 7} Days
                        </td>
                        <td className="px-[0.6vw] py-[0.6vw] font-bold text-slate-900 border border-slate-300">
                          {rule.postWarrantySLADays ?? 10} Days
                        </td>
                        <td className="px-[0.6vw] py-[0.6vw] border border-slate-300">
                          <div className="flex justify-center gap-[0.3vw]">
                            <button
                              type="button"
                              onClick={() => setEditingRule({ ...rule })}
                              className="p-[0.25vw] text-blue-600 hover:bg-blue-50 rounded-[0.2vw] cursor-pointer"
                            >
                              <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rule.id, rule._id)}
                              className="p-[0.25vw] text-red-500 hover:bg-red-50 rounded-[0.2vw] cursor-pointer"
                            >
                              <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Setup Form & Tester */}
        <div className="flex flex-col bg-white border border-slate-400 rounded-[0.6vw] p-[1vw] h-full overflow-hidden">
          <p className="text-[0.85vw] font-bold text-gray-700 border-b border-slate-200 pb-[0.3vw] flex items-center gap-[0.4vw]">
            {editingRule ? (
              <>
                Edit Rule for Category: {editingRule.partyType}
              </>
            ) : (
              <>
                Add New Warranty Rule
              </>
            )}
          </p>

          <div className="flex-1 overflow-y-auto pr-[0.3vw] space-y-[1vw] mt-[0.5vw]">
            {/* 1. Category Target */}
            <div className="space-y-[0.3vw] bg-slate-50 p-[0.6vw] rounded-[0.4vw] border border-slate-200">
              <label className="text-[0.8vw] font-bold text-slate-900">Party Type Category *</label>
              <select
                value={editingRule ? editingRule.partyType : newRule.partyType}
                onChange={(e) =>
                  editingRule
                    ? setEditingRule({ ...editingRule, partyType: e.target.value })
                    : setNewRule({ ...newRule, partyType: e.target.value })
                }
                className="w-full border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] text-[0.85vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900 font-medium"
              >
                <option value="Default">Default (Fallback Rule)</option>
                {partyTypes.map((t) => (
                  <option key={t.id || t._id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Serial decoder configuration */}
            <div className="bg-green-50/20 border border-green-200 rounded-[0.5vw] p-[0.8vw] space-y-[0.6vw]">
              <div className="flex items-center gap-[0.4vw] border-b border-green-100 pb-[0.2vw]">
                <Settings className="w-[0.9vw] h-[0.9vw] text-green-600" />
                <h4 className="text-[0.8vw] font-bold text-green-800">Serial Decoder </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-[0.8vw]">
                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Week Code Start Char Index *</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule ? (editingRule.weekStartIdx ?? 3) : newRule.weekStartIdx}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, weekStartIdx: parseInt(e.target.value, 10) || 0 })
                        : setNewRule({ ...newRule, weekStartIdx: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-orange-500 font-medium text-slate-900"
                  />
                  <p className="text-[0.68vw] font-medium text-slate-700">0-indexed character position</p>
                </div>

                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Week Code Length (digits) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.weekLength ?? 2) : newRule.weekLength}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, weekLength: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, weekLength: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-orange-500 font-medium text-slate-900"
                  />
                  <p className="text-[0.68vw] font-medium text-slate-700">Usually 2 digits (e.g. 52)</p>
                </div>

                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Year Code Start Char Index *</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule ? (editingRule.yearStartIdx ?? 5) : newRule.yearStartIdx}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, yearStartIdx: parseInt(e.target.value, 10) || 0 })
                        : setNewRule({ ...newRule, yearStartIdx: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-orange-500 font-medium text-slate-900"
                  />
                  <p className="text-[0.68vw] font-medium text-slate-700">0-indexed character position</p>
                </div>

                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Year Code Length (digits) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.yearLength ?? 2) : newRule.yearLength}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, yearLength: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, yearLength: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-orange-500 font-medium text-slate-900"
                  />
                  <p className="text-[0.68vw] font-medium text-slate-700">Usually 2 digits (e.g. 26)</p>
                </div>
              </div>
            </div>

            {/* 3. Warranty & SLA settings */}
            <div className="bg-blue-50/20 border border-blue-200 rounded-[0.5vw] p-[0.8vw] space-y-[0.6vw]">
              <div className="flex items-center gap-[0.4vw] border-b border-blue-100 pb-[0.2vw]">
                <Clock className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                <h4 className="text-[0.8vw] font-bold text-blue-800">Warranty Periods & Service SLAs</h4>
              </div>

              <div className="grid grid-cols-2 gap-[0.8vw]">
                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Warranty Duration (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.warrantyPeriodYears ?? 1) : newRule.warrantyPeriodYears}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, warrantyPeriodYears: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, warrantyPeriodYears: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Warranty SLA (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.warrantySLADays ?? 7) : newRule.warrantySLADays}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, warrantySLADays: parseInt(e.target.value, 10) || 7 })
                        : setNewRule({ ...newRule, warrantySLADays: parseInt(e.target.value, 10) || 7 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>

                <div className="col-span-2 space-y-[0.2vw]">
                  <label className="text-[0.78vw] font-bold text-slate-900">Post-Warranty (Paid) SLA (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.postWarrantySLADays ?? 10) : newRule.postWarrantySLADays}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, postWarrantySLADays: parseInt(e.target.value, 10) || 10 })
                        : setNewRule({ ...newRule, postWarrantySLADays: parseInt(e.target.value, 10) || 10 })
                    }
                    className="w-full border border-slate-400 rounded-[0.4vw] px-[0.6vw] py-[0.35vw] text-[0.85vw] outline-none focus:border-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 4. Real-time test decoder lab */}
            <div className="bg-slate-50 border border-slate-400 rounded-[0.5vw] p-[0.8vw] space-y-[0.5vw]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-[0.2vw]">
                <h4 className="text-[0.8vw] font-bold text-slate-900">Real-time Decoder Test Lab</h4>
                <span className="text-[0.68vw] bg-emerald-100 text-emerald-850 px-[0.5vw] py-[0.05vw] rounded-full font-bold">LIVE PREVIEW</span>
              </div>
              
              <div className="space-y-[0.4vw]">
                <label className="text-[0.78vw] font-bold text-gray-700">Test Serial Number</label>
                <input
                  type="text"
                  value={testSerial}
                  onChange={(e) => setTestSerial(e.target.value)}
                  placeholder="Type serial here..."
                  className="w-full border border-slate-400 rounded-[0.3vw] px-[0.5vw] py-[0.25vw] text-[0.85vw] outline-none font-mono text-slate-900 font-medium"
                />
              </div>

              <div className="space-y-[0.3vw]">
                <p className="text-[0.78vw] font-bold text-gray-700">Character Indexes:</p>
                <div className="flex flex-wrap gap-[0.2vw] font-mono mt-[0.2vw]">
                  {testSerial.split("").map((char, index) => {
                    let bg = "bg-slate-100 text-slate-900 border-slate-200";
                    
                    const isWeek = index >= wkStart && index < wkStart + wkLen;
                    const isYear = index >= yrStart && index < yrStart + yrLen;

                    if (isWeek) {
                      bg = "bg-orange-100 text-orange-700 border-orange-300 font-bold scale-105 shadow-sm";
                    } else if (isYear) {
                      bg = "bg-purple-100 text-purple-700 border-purple-300 font-bold scale-105 shadow-sm";
                    }

                    return (
                      <div key={index} className={`flex flex-col items-center border rounded-[0.2vw] px-[0.45vw] py-[0.1vw] ${bg} transition-all duration-150`}>
                        <span className="text-[0.85vw]">{char}</span>
                        <span className="text-[0.68vw] font-bold text-slate-700 mt-[0.05vw]">{index}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[0.8vw] pt-[0.2vw] border-t border-slate-200 text-[0.8vw]">
                <div className="flex items-center gap-[0.4vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-orange-400" />
                  <span className="text-gray-700 font-bold">Decoded Week:</span>
                  <span className="font-bold text-orange-700 font-mono bg-orange-50 px-1.5 py-0.5 rounded text-[0.85vw]">{testWeek || "—"}</span>
                </div>
                <div className="flex items-center gap-[0.4vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-purple-400" />
                  <span className="text-gray-700 font-bold">Decoded Year:</span>
                  <span className="font-bold text-purple-700 font-mono bg-purple-50 px-1.5 py-0.5 rounded text-[0.85vw]">{testYear ? `20${testYear}` : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-[0.5vw] mt-[1vw] shrink-0">
            {editingRule ? (
              <>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add Warranty Rule
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductSegmentsSection
// ─────────────────────────────────────────────────────────────────────────────
const ProductSegmentsSection = ({ segments, setSegments }) => {
  const { toast, confirm } = useNotification();
  const [newSegmentName, setNewSegmentName] = useState("");
  const [editingSegment, setEditingSegment] = useState(null);
  const db = loadCustomerDb();

  const save = async (items) => {
    setSegments(items);
  };

  const handleAdd = async () => {
    const t = newSegmentName.trim();
    if (!t) return;
    if (segments.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/product-segments`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setSegments([...segments, newItem]);
      setNewSegmentName("");
      toast("Segment added");
    } catch (err) {
      toast("Failed to add segment", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingSegment?.name?.trim()) return;
    const t = editingSegment.name.trim();
    if (
      segments.some(
        (x) =>
          x.id !== editingSegment.id && x._id !== editingSegment._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/product-segments/${editingSegment._id || editingSegment.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setSegments(
        segments.map((x) => (x.id === editingSegment.id || x._id === editingSegment._id ? updatedItem : x)),
      );
      setEditingSegment(null);
      toast("Segment updated");
    } catch (err) {
      toast("Failed to update segment", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const segment = segments.find((s) => s.id === id || s._id === mongoId);
    const db = loadCustomerDb();
    const usageCount = db.filter((r) => r.productSegment === segment.name).length;

    const confirmed = await confirm({
      title: "Delete Segment",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{segment.name}"</span>?</p>
          {usageCount > 0 && (
            <div className="p-[0.8vw] bg-amber-50 border border-amber-200 rounded-[0.4vw]">
              <p className="text-amber-700 font-semibold flex items-center gap-[0.4vw]">
                <AlertTriangle className="w-[1vw] h-[1vw]" /> {usageCount} records affected
              </p>
              <p className="text-amber-600 text-[0.75vw] mt-[0.2vw]">Configuration and history for this segment will be lost.</p>
            </div>
          )}
        </div>
      ),
      type: "danger",
      confirmText: "Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/product-segments/${mongoId || id}`);
        setSegments(segments.filter((s) => s.id !== id && s._id !== mongoId));
        toast("Product segment removed");
      } catch (err) {
        toast("Failed to delete segment", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Active Segments
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {segments.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No segments defined
              </div>
            ) : (
              segments.map((seg, idx) => {
                const usageCount = db.filter(
                  (r) => r.productSegment === seg.name,
                ).length;
                return (
                  <div
                    key={seg.id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors"
                  >
                    {editingSegment && (editingSegment._id === seg._id || editingSegment.id === seg.id) ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingSegment.name}
                          onChange={(e) =>
                            setEditingSegment({
                              ...editingSegment,
                              name: e.target.value,
                            })
                          }
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none shadow-sm"
                        />
                        <button
                          onClick={handleUpdate}
                          className="p-[0.4vw] bg-emerald-600 text-white rounded-[0.3vw] cursor-pointer"
                        >
                          <Check className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                        <button
                          onClick={() => setEditingSegment(null)}
                          className="p-[0.4vw] bg-slate-200 text-slate-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-[0.4vw]">
                          <span className="text-[0.78vw] font-bold text-slate-800">
                            {seg.name}
                          </span>
                          {seg.isFromDb && (
                            <span className="text-[0.58vw] bg-amber-50 text-amber-600 border border-amber-200 px-[0.4vw] py-[0.05vw] rounded-full font-bold">
                              FOUND IN CUSTOMERS
                            </span>
                          )}
                        </div>
                       
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setEditingSegment({ id: seg.id, _id: seg._id, name: seg.name })
                            }
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            onClick={() => handleDelete(seg.id, seg._id)}
                            className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Add New Segment</p>
          <div className="flex gap-[0.5vw]">
            <input
              type="text"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              placeholder="e.g. Inverters, Stabilizers…"
              className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 transition-all font-semibold"
            />
            <button onClick={handleAdd} disabled={!newSegmentName.trim()} className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-bold">
              <Plus className="w-[0.9vw] h-[0.9vw]" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FourMCategoriesSection
// ─────────────────────────────────────────────────────────────────────────────
const FourMCategoriesSection = ({ items, setItems }) => {
  const { toast, confirm } = useNotification();
  const [newName, setNewName] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  const handleAdd = async () => {
    const t = newName.trim();
    if (!t) return;
    if (items.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("4M Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/four-m-categories`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setItems([...items, newItem]);
      setNewName("");
      toast("4M Category added");
    } catch (err) {
      toast("Failed to add 4M Category", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingItem?.name?.trim()) return;
    const t = editingItem.name.trim();
    if (
      items.some(
        (x) =>
          x.id !== editingItem.id && x._id !== editingItem._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("4M Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/four-m-categories/${editingItem._id || editingItem.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setItems(
        items.map((x) => (x.id === editingItem.id || x._id === editingItem._id ? updatedItem : x)),
      );
      setEditingItem(null);
      toast("4M Category updated");
    } catch (err) {
      toast("Failed to update 4M Category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const item = items.find((s) => s.id === id || s._id === mongoId);
    const confirmed = await confirm({
      title: "Delete 4M Category",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{item.name}"</span>?</p>
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/four-m-categories/${mongoId || id}`);
        const remaining = items.filter((t) => t.id !== id && t._id !== mongoId);
        setItems(remaining);
        toast("4M Category deleted successfully");
      } catch (err) {
        toast("Failed to delete 4M Category", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Existing 4M Categories</p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {items.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">No 4M Categories yet</div>
            ) : (
              items.map((seg) => (
                <div key={seg.id} className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors">
                  {editingItem && (editingItem._id === seg._id || editingItem.id === seg.id) ? (
                    <div className="flex flex-1 items-center gap-[0.5vw]">
                      <input autoFocus type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none shadow-sm" />
                      <button onClick={handleUpdate} className="p-[0.4vw] bg-emerald-600 text-white rounded-[0.3vw] cursor-pointer"><Check className="w-[0.85vw] h-[0.85vw]" /></button>
                      <button onClick={() => setEditingItem(null)} className="p-[0.4vw] bg-slate-200 text-slate-600 rounded-[0.3vw] cursor-pointer"><X className="w-[0.85vw] h-[0.85vw]" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-[0.4vw]">
                        <span className="text-[0.78vw] font-bold text-slate-800">{seg.name}</span>
                      </div>
                      <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingItem({ id: seg.id, _id: seg._id, name: seg.name })} className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"><Edit2 className="w-[0.85vw] h-[0.85vw]" /></button>
                        <button onClick={() => handleDelete(seg.id, seg._id)} className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"><Trash2 className="w-[0.85vw] h-[0.85vw]" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Add New 4M Category</p>
          <div className="flex gap-[0.5vw]">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Man, Machine…" className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 transition-all font-semibold" />
            <button onClick={handleAdd} disabled={!newName.trim()} className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-bold"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Material Escalation Flow Section
// ─────────────────────────────────────────────────────────────────────────────
const ServiceMaterialEscalationSection = ({ departments }) => {
  const { toast, confirm } = useNotification();
  const [flow, setFlow] = useState([]);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [origFlow, setOrigFlow] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const fetchSLA = async () => {
      try {
        const res = await axios.get(`${API_URL}/master/escalation-flows`);
        const s = res.data.find(f => f.type === "Service Material")?.steps || [];
        if (s.length === 0) {
          const defaults = DEFAULT_DEPTS.map((dept) => ({
            dept,
            engineerIds: [],
            durationHours: 2,
            durationMins: 0,
          }));
          setFlow(defaults);
          setOrigFlow(JSON.parse(JSON.stringify(defaults)));
        } else {
          setFlow(s);
          setOrigFlow(JSON.parse(JSON.stringify(s)));
        }
      } catch (err) {
        toast("Failed to load Service Material SLA", "error");
      }
    };
    fetchSLA();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(flow) !== JSON.stringify(origFlow));
  }, [flow, origFlow]);

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/master/escalation-flows`, { type: "Service Material", steps: flow });
      setOrigFlow(JSON.parse(JSON.stringify(flow)));
      setHasChanges(false);
      setSaved(true);
      toast("Service Material SLA saved");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast("Failed to save SLA", "error");
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Reset Configuration",
      message: "Are you sure you want to reset Service Material escalation to defaults? All custom durations and engineer assignments will be cleared.",
      confirmText: "Reset to Default",
      type: "danger"
    });
    if (!confirmed) return;
    const defaults = DEFAULT_DEPTS.map((dept) => ({
      dept,
      engineerIds: [],
      durationHours: 2,
      durationMins: 0,
    }));
    setFlow(defaults);
  };

  const usedDepts = flow.map((s) => s.dept);
  const availableToAdd = departments.filter((d) => !usedDepts.includes(d));
  const availableToSwitch = (cur) =>
    departments.filter((d) => d === cur || !usedDepts.includes(d));

  const updateStep = (i, u) =>
    setFlow(flow.map((s, idx) => (idx === i ? u : s)));
  const removeStep = (i) =>
    setFlow(flow.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const f = [...flow],
      j = i + dir;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]];
    setFlow(f);
  };

  const addStep = (dept) => {
    setFlow([
      ...flow,
      { dept, engineerIds: [], durationHours: 2, durationMins: 0 },
    ]);
    setShowPicker(false);
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragEnter = (idx) => setDragOver(idx);
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const f = [...flow],
        temp = f[dragIdx];
      f[dragIdx] = f[dragOver];
      f[dragOver] = temp;
      setFlow(f);
    }
    setDragIdx(null);
    setDragOver(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-orange-50/60 to-white">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-[0.9vw] h-[0.9vw] text-white" />
          </div>
          <div>
            <h2 className="text-[0.9vw] font-bold text-slate-900 flex items-center gap-[0.5vw]">
              Service Material Inward SLA
              {hasChanges && (
                <span className="text-[0.6vw] bg-amber-50 border border-amber-200 text-amber-700 px-[0.4vw] py-[0.1vw] rounded-[0.3vw] uppercase tracking-wider font-bold">
                  Pending Changes
                </span>
              )}
            </h2>
            <p className="text-[0.7vw] text-gray-800">
              Define escalation levels, teams & SLA durations for service material cases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.42vw] border border-slate-400 bg-white hover:bg-slate-50 rounded-[0.4vw] text-slate-600 text-[0.78vw] font-semibold cursor-pointer transition-all"
          >
            <RotateCcw className="w-[0.85vw] h-[0.85vw]" /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.42vw] rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
      <div className="p-[1.2vw]">

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-[0.5vw] p-[0.8vw] mb-[1.2vw] text-[0.75vw] text-blue-800 leading-relaxed">
        <strong>Service Material Escalation Levels:</strong> Each level auto-escalates
        to the next team if not resolved within the SLA duration. Drag to reorder,
        or select specific engineers per level for manual routing.
      </div>

      {/* Steps */}
      <div className="space-y-[0.8vw] mb-[1.2vw]">
        {flow.map((step, idx) => (
          <StepCard
            key={idx}
            step={step}
            index={idx}
            total={flow.length}
            availableToSwitch={availableToSwitch(step.dept)}
            onUpdate={(u) => updateStep(idx, u)}
            onRemove={() => removeStep(idx)}
            onMoveUp={() => moveStep(idx, -1)}
            onMoveDown={() => moveStep(idx, 1)}
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            isDragOver={dragOver === idx}
          />
        ))}
      </div>

      {/* Add Level Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={availableToAdd.length === 0}
          className="flex items-center gap-[0.4vw] px-[1vw] py-[0.5vw] border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-[0.4vw] text-blue-600 text-[0.8vw] font-semibold cursor-pointer transition-all"
        >
          <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Level
        </button>
        {showPicker && availableToAdd.length > 0 && (
          <div className="absolute top-full left-0 mt-[0.4vw] bg-white border border-slate-400 rounded-[0.4vw] shadow-lg z-40 overflow-hidden min-w-[12vw]">
            {availableToAdd.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => addStep(d)}
                className="w-full text-left px-[0.8vw] py-[0.5vw] hover:bg-blue-50 text-[0.78vw] font-semibold text-slate-700 border-b border-slate-400 last:border-0 cursor-pointer transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {flow.length === 0 && (
        <div className="text-center py-[2vw] text-slate-400 text-[0.75vw]">
          No escalation levels configured
        </div>
      )}
    </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColumnVisibilitySection
// ─────────────────────────────────────────────────────────────────────────────
const ColumnVisibilitySection = ({ colVis, setColVis }) => {
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    const col = CUSTOMER_DB_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setColVis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enableAll = () => {
    const all = Object.fromEntries(
      CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
    );
    setColVis(all);
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/master/settings`, { key: COLUMN_VIS_KEY, value: colVis });
      setSaved(true);
      toast("Column visibility saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast("Failed to save visibility settings", "error");
    }
  };

  const visibleCount = Object.values(colVis).filter(Boolean).length;
  const totalCount = CUSTOMER_DB_COLUMNS.length;

  return (
    <div className="p-[1.2vw]">
      <div className="flex items-center justify-between mb-[1vw]">
        <div>
          <p className="text-[0.78vw] text-gray-800">
            Toggle which columns appear in the Customer Database table. Required
            columns cannot be hidden.
          </p>
          <p className="text-[0.72vw] text-blue-600 mt-[0.2vw] font-medium">
            {visibleCount} of {totalCount} columns visible
          </p>
        </div>
        <div className="flex items-center gap-[0.6vw]">
          <button
            type="button"
            onClick={enableAll}
            className="flex items-center gap-[0.35vw] border border-slate-400 text-slate-600 hover:bg-slate-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] transition-all"
          >
            <Eye className="w-[0.85vw] h-[0.85vw]" /> Show All
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[0.7vw]">
        {CUSTOMER_DB_COLUMNS.map((col) => {
          const isOn = colVis[col.key] ?? true;
          const isRequired = col.required;
          return (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              className={`flex items-center justify-between px-[0.9vw] py-[0.7vw] rounded-[0.5vw] border transition-all cursor-pointer select-none
                ${
                  isRequired
                    ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-400"
                    : isOn
                      ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                      : "bg-white border-slate-400 hover:border-slate-400"
                }`}
            >
              <div className="flex flex-col gap-[0.1vw] flex-1 min-w-0">
                <div className="flex items-center gap-[0.35vw]">
                  <span
                    className={`text-[0.8vw] font-semibold truncate ${isOn ? "text-slate-800" : "text-slate-400"}`}
                  >
                    {col.label}
                  </span>
                  {isRequired && (
                    <span className="text-[0.58vw] bg-slate-200 text-gray-800 px-[0.35vw] py-[0.05vw] rounded font-semibold flex-shrink-0">
                      required
                    </span>
                  )}
                </div>
                <span className="text-[0.65vw] text-slate-400 truncate">
                  {col.description}
                </span>
              </div>
              <div className="flex-shrink-0 ml-[0.6vw]">
                {isRequired ? (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-slate-300 flex items-center justify-end px-[0.15vw]">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                ) : isOn ? (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-blue-500 flex items-center justify-end px-[0.15vw] transition-all">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                ) : (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-slate-200 flex items-center justify-start px-[0.15vw] transition-all">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live preview strip */}
      <div className="mt-[1vw] bg-slate-50 border border-slate-400 rounded-[0.4vw] p-[0.7vw]">
        <p className="text-[0.68vw] font-semibold text-gray-800 mb-[0.4vw]">
          Table Header Preview
        </p>
        <div className="flex items-center gap-[0.4vw] flex-wrap">
          <span className="text-[0.65vw] bg-slate-200 text-slate-600 px-[0.5vw] py-[0.2vw] rounded font-mono">
            ☑
          </span>
          <span className="text-[0.65vw] bg-slate-200 text-slate-600 px-[0.5vw] py-[0.2vw] rounded font-mono">
            S.No
          </span>
          {CUSTOMER_DB_COLUMNS.filter((c) => colVis[c.key] ?? true).map((c) => (
            <span
              key={c.key}
              className="text-[0.65vw] bg-blue-100 text-blue-700 border border-blue-200 px-[0.5vw] py-[0.2vw] rounded font-semibold"
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EngineerPicker
// ─────────────────────────────────────────────────────────────────────────────
const EngineerPicker = ({ dept, employees = [], selectedIds, otherLevelsIds = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef(null);
  const deptEngs = employees.filter((e) => 
    (e.department || "").trim().toLowerCase() === (dept || "").trim().toLowerCase() &&
    (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Suggestion list: filter out those selected in other levels
  const suggestions = deptEngs.filter(e => !otherLevelsIds.includes(e.userId));

  const filtered = suggestions.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.userId || "").toLowerCase().includes(search.toLowerCase()),
  );
  const selectedEngs = deptEngs.filter((e) => selectedIds.includes(e.userId));
  const toggle = (id) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  return (
    <div className="relative" ref={pickerRef}>
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[2.2vw] border rounded-[0.4vw] px-[0.6vw] py-[0.35vw] bg-white cursor-pointer flex items-center gap-[0.35vw] flex-wrap transition-all duration-200 ${open ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : "border-slate-400 hover:border-blue-300"}`}
      >
        {selectedEngs.length === 0 ? (
          <span className="text-slate-400 text-[0.72vw] italic select-none flex-1">
            {deptEngs.length === 0
              ? "⚠ No engineers in this department"
              : "Auto-assign (least busy)"}
          </span>
        ) : (
          selectedEngs.map((eng) => (
            <span
              key={eng.userId}
              className="flex items-center gap-[0.25vw] bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-[0.25vw] pr-[0.45vw] py-[0.1vw] text-[0.68vw] font-semibold"
            >
              <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.5vw] font-bold flex-shrink-0">
                {initials(eng.name)}
              </span>
              {eng.name}
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggle(eng.userId);
                }}
                className="hover:text-red-400 cursor-pointer ml-[0.05vw]"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`w-[0.85vw] h-[0.85vw] text-slate-400 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-400 rounded-[0.4vw] shadow-lg z-40 overflow-hidden">
          {deptEngs.length > 3 && (
            <div className="p-[0.5vw] border-b border-slate-400">
              <div className="relative">
                <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search engineer..."
                  className="w-full pl-[1.8vw] pr-[0.5vw] py-[0.4vw] text-[0.78vw] border border-slate-400 rounded-[0.3vw] outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}
          {deptEngs.length > 0 && (
            <div className="flex gap-[0.5vw] px-[0.7vw] py-[0.4vw] border-b border-slate-400 bg-slate-50/50">
              <button
                type="button"
                onClick={() => onChange(deptEngs.map((e) => e.userId))}
                className="text-[0.7vw] text-blue-600 hover:underline cursor-pointer font-semibold"
              >
                Select all
              </button>
              <span className="text-slate-300 text-[0.7vw]">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[0.7vw] text-gray-800 hover:underline cursor-pointer"
              >
                Clear (auto)
              </button>
            </div>
          )}
          <div className="max-h-[13vw] overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-[1vw] text-center text-slate-400 text-[0.75vw]">
                {deptEngs.length === 0
                  ? `No engineers in "${dept}"`
                  : "All available engineers are assigned to other levels"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-[1vw] text-center text-slate-400 text-[0.75vw]">
                No results
              </div>
            ) : (
              filtered.map((eng) => {
                const selected = selectedIds.includes(eng.userId);
                return (
                  <div
                    key={eng.userId}
                    onClick={() => toggle(eng.userId)}
                    className={`flex items-center gap-[0.6vw] px-[0.7vw] py-[0.55vw] cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${selected ? "bg-blue-50/70" : "hover:bg-slate-50"}`}
                  >
                    <div
                      className={`w-[1vw] h-[1vw] rounded-[0.2vw] border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-slate-400"}`}
                    >
                      {selected && (
                        <CheckCircle className="w-[0.65vw] h-[0.65vw] text-white" />
                      )}
                    </div>
                    <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[0.6vw] font-bold">
                        {initials(eng.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8vw] font-semibold text-slate-700 truncate">
                        {eng.name}
                      </div>
                      <div className="text-[0.67vw] text-slate-400 font-mono">
                        {eng.userId}
                      </div>
                    </div>
                    {selected && (
                      <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-[0.7vw] py-[0.5vw] border-t border-slate-400 bg-slate-50/50 flex justify-between items-center">
            <span className="text-[0.68vw] text-slate-400">
              {selectedEngs.length === 0
                ? "Auto-assign (load balanced)"
                : `${selectedEngs.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[0.7vw] bg-blue-600 text-white px-[0.7vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer font-semibold hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DurationPicker — hours + minutes selector for escalation SLA
// ─────────────────────────────────────────────────────────────────────────────
const DURATION_PRESETS = [
  { label: "30 min", hours: 0, mins: 30 },
  { label: "1 hr", hours: 1, mins: 0 },
  { label: "2 hr", hours: 2, mins: 0 },
  { label: "4 hr", hours: 4, mins: 0 },
  { label: "8 hr", hours: 8, mins: 0 },
  { label: "1 day", hours: 24, mins: 0 },
];

const DurationPicker = ({ hours = 0, mins = 0, onChange }) => {
  const total = hours * 60 + mins;
  const fmt = () => {
    if (hours === 0 && mins === 0) return "No limit";
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return hours === 24 ? "1 day" : `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  return (
    <div className="flex items-center gap-[0.5vw]">
      <Clock className="w-[0.85vw] h-[0.85vw] text-slate-400 flex-shrink-0" />
      <div className="flex items-center gap-[0.3vw]">
        <span className="text-[0.7vw] text-gray-800">Escalate after:</span>
        <div className="flex items-center gap-[0.2vw]">
          <input
            type="number"
            list="hours-suggestions"
            value={hours}
            min={0}
            max={24}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange("", mins);
                return;
              }
              let val = parseInt(raw, 10);
              if (isNaN(val)) val = 0;
              if (val < 0) val = 0;
              if (val > 24) val = 24;
              onChange(val, mins);
            }}
            className="w-[3.5vw] border border-slate-400 rounded-[0.3vw] px-[0.4vw] py-[0.25vw] text-[0.75vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-text"
          />
          <span className="text-[0.75vw] text-slate-600 font-semibold">h</span>
          <datalist id="hours-suggestions">
            {[0, 1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-[0.2vw] ml-[0.2vw]">
          <input
            type="number"
            list="mins-suggestions"
            value={mins}
            min={0}
            max={60}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(hours, "");
                return;
              }
              let val = parseInt(raw, 10);
              if (isNaN(val)) val = 0;
              if (val < 0) val = 0;
              if (val > 60) val = 60;
              onChange(hours, val);
            }}
            className="w-[3.5vw] border border-slate-400 rounded-[0.3vw] px-[0.4vw] py-[0.25vw] text-[0.75vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-text"
          />
          <span className="text-[0.75vw] text-slate-600 font-semibold">m</span>
          <datalist id="mins-suggestions">
            {[0, 5, 15, 30, 45].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
      {/* Quick presets */}
      <div className="flex gap-[0.25vw]">
        {DURATION_PRESETS.map((p) => {
          const isActive = p.hours === hours && p.mins === mins;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.hours, p.mins)}
              className={`text-[0.62vw] px-[0.45vw] py-[0.18vw] rounded-[0.25vw] border cursor-pointer transition-all ${isActive ? "bg-blue-600 text-white border-blue-600" : "border-slate-400 text-gray-800 hover:border-blue-300 hover:text-blue-600"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StepCard — now with duration
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = ({
  step,
  index,
  total,
  employees = [],
  availableToSwitch,
  allUsedEngineerIds, // New prop
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragOver,
}) => {
  const deptEngs = employees.filter((e) => 
    (e.department || "").trim().toLowerCase() === (step.dept || "").trim().toLowerCase() &&
    (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))
  );
  const hasWarning = deptEngs.length === 0;
  const durHours = step.durationHours ?? 2;
  const durMins = step.durationMins ?? 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`border rounded-[0.5vw] bg-white overflow-visible transition-all duration-200 ${isDragOver ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-slate-400 hover:border-blue-200 shadow-sm"}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-[0.5vw] px-[0.7vw] py-[0.45vw] bg-slate-50/70 border-b border-slate-400">
        <GripVertical className="w-[1vw] h-[1vw] text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-slate-400" />
        <div
          className={`w-[1.6vw] h-[1.6vw] rounded-full ${LEVEL_COLORS[index] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
        >
          <span className="text-white text-[0.58vw] font-bold">
            L{index + 1}
          </span>
        </div>
        <select
          value={step.dept}
          onChange={(e) => {
            const newDept = e.target.value;
            const newIds = employees
              .filter(emp => (emp.department || "").trim().toLowerCase() === (newDept || "").trim().toLowerCase())
              .map(emp => emp.userId);
            onUpdate({ ...step, dept: newDept, engineerIds: newIds });
          }}
          className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.55vw] text-[0.85vw] font-bold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer shadow-sm hover:border-blue-300 transition-all"
        >
          {availableToSwitch.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {hasWarning && (
          <span className="text-[0.62vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw] whitespace-nowrap">
            <AlertTriangle className="w-[0.65vw] h-[0.65vw]" /> 0 engineers
          </span>
        )}
        <div className="flex flex-col gap-[0.05vw] flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-[0.85vw] h-[0.85vw]" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-[0.85vw] h-[0.85vw]" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-300 hover:text-red-400 cursor-pointer flex-shrink-0"
        >
          <X className="w-[1vw] h-[1vw]" />
        </button>
      </div>

      {/* Engineers row */}
      <div className="px-[0.8vw] py-[0.5vw] flex items-start gap-[0.5vw] border-b border-slate-400">
        <div className="text-[0.7vw] text-gray-800 font-semibold whitespace-nowrap mt-[0.55vw] flex-shrink-0 flex items-center gap-[0.25vw] w-[4.5vw]">
          <Users className="w-[0.8vw] h-[0.8vw]" /> Engineers
        </div>
        <div className="flex-1">
          <EngineerPicker
            dept={step.dept}
            employees={employees}
            selectedIds={step.engineerIds || []}
            otherLevelsIds={allUsedEngineerIds.filter(id => !(step.engineerIds || []).includes(id))} // Critical cross-check!
            onChange={(ids) => onUpdate({ ...step, engineerIds: ids })}
          />
          {step.engineerIds?.length === 0 && deptEngs.length > 0 && (
            <p className="text-[0.64vw] text-slate-400 mt-[0.2vw] flex items-center gap-[0.25vw]">
              <Info className="w-[0.65vw] h-[0.65vw]" /> Auto-assign (least-busy
              from {deptEngs.length})
            </p>
          )}
        </div>
      </div>

      {/* Duration / SLA row */}
      <div className="px-[0.8vw] py-[0.45vw] bg-slate-50/40">
        <DurationPicker
          hours={durHours}
          mins={durMins}
          onChange={(h, m) =>
            onUpdate({ ...step, durationHours: h, durationMins: m })
          }
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FlowEditor
// ─────────────────────────────────────────────────────────────────────────────
const FlowEditor = ({ steps, departments, employees = [], onChange }) => {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const usedDepts = steps.map((s) => s.dept);
  const availableToAdd = departments;
  const availableToSwitch = (cur) => departments;
  const allUsedEngineerIds = steps.reduce((acc, s) => [...acc, ...(s.engineerIds || [])], []);
  const updateStep = (i, u) =>
    onChange(steps.map((s, idx) => (idx === i ? u : s)));
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const f = [...steps],
      j = i + dir;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]];
    onChange(f);
  };
  const addStep = (dept) => {
    const newIds = employees
      .filter(e => 
        (e.department || "").trim().toLowerCase() === (dept || "").trim().toLowerCase() &&
        (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))
      )
      .map(e => e.userId);
    onChange([
      ...steps,
      { dept, engineerIds: newIds, durationHours: 2, durationMins: 0 },
    ]);
    setShowPicker(false);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const f = [...steps];
      const [r] = f.splice(dragIdx, 1);
      f.splice(dragOver, 0, r);
      onChange(f);
    }
    setDragIdx(null);
    setDragOver(null);
  };
  return (
    <div className="flex flex-col gap-[0.5vw]">
      {steps.length === 0 ? (
        <div className="text-center py-[1.5vw] text-slate-400 text-[0.78vw] border-2 border-dashed border-slate-400 rounded-[0.4vw] bg-slate-50/50">
          No levels yet — add at least one escalation level
        </div>
      ) : (
        steps.map((step, i) => (
          <StepCard
            key={`${step.dept}-${i}`}
            step={step}
            index={i}
            total={steps.length}
            employees={employees}
            availableToSwitch={availableToSwitch(step.dept)}
            allUsedEngineerIds={allUsedEngineerIds}
            onUpdate={(u) => updateStep(i, u)}
            onRemove={() => removeStep(i)}
            onMoveUp={() => moveStep(i, -1)}
            onMoveDown={() => moveStep(i, 1)}
            onDragStart={() => setDragIdx(i)}
            onDragEnter={() => setDragOver(i)}
            onDragEnd={handleDragEnd}
            isDragOver={dragOver === i && dragIdx !== i}
          />
        ))
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={availableToAdd.length === 0}
          className="w-full flex items-center justify-center gap-[0.4vw] border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 rounded-[0.4vw] py-[0.6vw] text-[0.78vw] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Escalation Level
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-400 shadow-lg rounded-[0.4vw] z-20 overflow-hidden">
            {availableToAdd.map((dept) => {
              const cnt = loadEmployees().filter(
                (e) => (e.department || "").trim().toLowerCase() === (dept || "").trim().toLowerCase(),
              ).length;
              return (
                <div
                  key={dept}
                  onClick={() => addStep(dept)}
                  className="flex items-center justify-between px-[0.8vw] py-[0.65vw] hover:bg-blue-50/60 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <span className="text-[0.82vw] font-semibold text-slate-700">
                    {dept}
                  </span>
                  <span
                    className={`text-[0.62vw] px-[0.45vw] py-[0.12vw] rounded-full font-semibold ${cnt === 0 ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-gray-800"}`}
                  >
                    {cnt} eng
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ChainPreview — now shows duration badges
// ─────────────────────────────────────────────────────────────────────────────
const ChainPreview = ({ steps, employees = [] }) => {
  const fmtDur = (h, m) => {
    if (!h && !m) return null;
    if (h === 0) return `${m}m`;
    if (m === 0) return h === 24 ? "1 day" : `${h}h`;
    return `${h}h ${m}m`;
  };
  return (
    <div className="bg-slate-50/80 border border-slate-400 rounded-[0.5vw] p-[0.8vw]">
      <h4 className="text-[0.78vw] font-bold text-slate-700 mb-[0.6vw] flex items-center gap-[0.3vw]">
        <ArrowRight className="w-[0.85vw] h-[0.85vw] text-blue-500" />{" "}
        Escalation Chain Preview
      </h4>
      {steps.length === 0 ? (
        <span className="text-[0.72vw] text-slate-400 italic">
          No levels configured
        </span>
      ) : (
        <div className="flex flex-col gap-[0.5vw]">
          {steps.map((step, i) => {
            const deptEngs = employees.filter(
              (e) => 
                (e.department || "").trim().toLowerCase() === (step.dept || "").trim().toLowerCase() &&
                (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))
            );
            const selEngs = deptEngs.filter((e) =>
              step.engineerIds?.includes(e.userId),
            );
            const dur = fmtDur(step.durationHours ?? 2, step.durationMins ?? 0);
            return (
              <div key={i} className="flex items-start gap-[0.5vw]">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-[1.5vw] h-[1.5vw] rounded-full ${LEVEL_COLORS[i] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <span className="text-white text-[0.52vw] font-bold">
                      L{i + 1}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-[0.12vw] h-[0.4vw] bg-blue-200" />
                      {dur && (
                        <span className="text-[0.52vw] text-blue-500 bg-blue-50 border border-blue-100 px-[0.3vw] py-[0.05vw] rounded-full font-semibold">
                          {dur}
                        </span>
                      )}
                      <div className="w-[0.12vw] h-[0.4vw] bg-blue-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white rounded-[0.3vw] border border-slate-400 px-[0.55vw] py-[0.3vw]">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.75vw] font-bold text-slate-700">
                      {step.dept}
                    </div>
                    {dur && (
                      <span className="text-[0.58vw] text-amber-600 bg-amber-50 border border-amber-100 px-[0.35vw] py-[0.05vw] rounded flex items-center gap-[0.2vw]">
                        <Clock className="w-[0.55vw] h-[0.55vw]" /> {dur}
                      </span>
                    )}
                  </div>
                  {selEngs.length > 0 ? (
                    <div className="flex gap-[0.25vw] flex-wrap mt-[0.2vw]">
                      {selEngs.map((eng) => (
                        <span
                          key={eng.userId}
                          className="flex items-center gap-[0.2vw] text-[0.62vw] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-[0.4vw] py-[0.05vw]"
                        >
                          <span className="w-[1vw] h-[1vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.45vw] font-bold">
                            {initials(eng.name)}
                          </span>
                          {eng.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[0.62vw] text-slate-400 italic">
                      {deptEngs.length === 0
                        ? "⚠ No engineers"
                        : `Auto from ${deptEngs.length}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-[0.85vw] h-[0.85vw] text-blue-500" />
            </div>
            <span className="text-[0.67vw] text-slate-400 italic">
              Resolved
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EscalationSection
// ─────────────────────────────────────────────────────────────────────────────
const EscalationSection = ({ partyTypes, segments, flows, setFlows, departments, employees }) => {
  const { toast, confirm } = useNotification();
  const [expandedType, setExpandedType] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState({}); // { partyTypeId: segmentName }
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [origFlows, setOrigFlows] = useState({});

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const res = await axios.get(`${API_URL}/master/escalation-flows`);
        const s = {};
        res.data.forEach(f => {
          if (f.type !== "Service Material") s[f.type] = f.steps;
        });

        // Generate and auto-save defaults for missing party types
        let dbChanged = false;
        const validIds = new Set(
          employees.filter(e => (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))).map(e => e.userId)
        );
        const promises = [];

        partyTypes.forEach((pt) => {
          const key = `${pt.name}|Default`;
          if (!s[key]) {
            const steps = DEFAULT_DEPTS.map((dept) => ({
              dept,
              engineerIds: employees
                .filter(e => (e.department || "").trim().toLowerCase() === (dept || "").trim().toLowerCase())
                .map(e => e.userId)
                .filter(id => validIds.has(id)),
              durationHours: 2,
              durationMins: 0,
            }));
            s[key] = steps;
            promises.push(axios.post(`${API_URL}/master/escalation-flows`, { type: key, steps }));
            dbChanged = true;
          }
        });

        if (dbChanged) {
          await Promise.all(promises);
        }

        setOrigFlows(JSON.parse(JSON.stringify(s)));
        setFlows(s);
      } catch (err) {
        toast("Failed to load escalation flows", "error");
      }
    };
    if (partyTypes && partyTypes.length > 0 && employees && employees.length > 0) {
      fetchFlows();
    }
  }, [partyTypes, employees]);
  useEffect(() => {
    setHasChanges(JSON.stringify(flows) !== JSON.stringify(origFlows));
  }, [flows, origFlows]);

  const getFlowKey = (partyName, segmentName = "Default") => `${partyName}|${segmentName || "Default"}`;

  const getDeptIds = (deptName) => employees
    .filter(e => (e.department || "").trim().toLowerCase() === (deptName || "").trim().toLowerCase())
    .map(e => e.userId);

  const getFlow = (partyName, segName) => {
    const key = getFlowKey(partyName, segName);
    if (flows[key]) return flows[key];
    if (segName === "Default") {
      return DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: getDeptIds(dept),
        durationHours: 2,
        durationMins: 0,
      }));
    }
    return [];
  };

  const updateFlow = (partyName, segName, steps) =>
    setFlows((prev) => ({ ...prev, [getFlowKey(partyName, segName)]: steps }));

  const resetType = (partyName, segName) =>
    setFlows((prev) => ({
      ...prev,
      [getFlowKey(partyName, segName)]: segName === "Default" ? DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: getDeptIds(dept),
        durationHours: 2,
        durationMins: 0,
      })) : [],
    }));

  const handleSave = async () => {
    try {
      const validIds = new Set(
        employees.filter(e => (!e.role || !["admin", "supervisor"].includes(e.role.toLowerCase()))).map(e => e.userId)
      );

      const sanitizedFlows = {};
      const promises = Object.entries(flows).map(([type, steps]) => {
        const sanitizedSteps = steps.map(step => ({
          ...step,
          engineerIds: (step.engineerIds || []).filter(id => validIds.has(id))
        }));
        sanitizedFlows[type] = sanitizedSteps;
        return axios.post(`${API_URL}/master/escalation-flows`, { type, steps: sanitizedSteps });
      });
      await Promise.all(promises);
      
      setFlows(sanitizedFlows);
      setOrigFlows(JSON.parse(JSON.stringify(sanitizedFlows)));
      setHasChanges(false);
      setSaved(true);
      toast("Escalation flows saved successfully");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast("Failed to save flows", "error");
    }
  };
  const handleResetAll = async () => {
    const confirmed = await confirm({
      title: "Reset All Flows",
      message: "This will reset EVERY escalation flow across all party types to defaults. This action cannot be undone.",
      confirmText: "Yes, Reset All",
      type: "danger"
    });
    if (!confirmed) return;
    const reset = {};
    partyTypes.forEach((t) => {
      reset[getFlowKey(t.name, "Default")] = DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: getDeptIds(dept),
        durationHours: 2,
        durationMins: 0,
      }));
    });
    setFlows(reset);
  };
  const getStats = (partyName, segName) => {
    const steps = getFlow(partyName, segName);
    const emps = loadEmployees();
    const dbCount = loadCustomerDb().filter(
      (r) => r.partyType === partyName && r.productSegment === segName,
    ).length;
    return {
      count: steps.length,
      warnings: steps.filter(
        (s) => emps.filter((e) => e.department === s.dept).length === 0,
      ).length,
      assigned: steps.reduce((sum, s) => sum + (s.engineerIds?.length || 0), 0),
      records: dbCount,
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-blue-50/60 to-white">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
            <PhoneCall className="w-[0.9vw] h-[0.9vw] text-white" />
          </div>
          <div>
            <h2 className="text-[0.9vw] font-bold text-slate-900 flex items-center gap-[0.5vw]">
              Call Escalation Flows
              {hasChanges && (
                <span className="text-[0.6vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-[0.3vw] uppercase tracking-wider font-bold">
                  Pending Changes
                </span>
              )}
            </h2>
            <p className="text-[0.7vw] text-gray-800">
              Define per-level escalation paths, engineers & SLA durations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[0.6vw]">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-[0.4vw] border border-slate-400 bg-white text-slate-600 hover:bg-slate-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] font-medium transition-all"
          >
            <RotateCcw className="w-[0.85vw] h-[0.85vw]" /> Reset All
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save Flows"}
          </button>
        </div>
      </div>

      <div className="p-[1.2vw] flex flex-col gap-[1vw]">
        {partyTypes.length === 0 ? (
          <div className="bg-slate-50 border border-slate-400 rounded-[0.6vw] p-[3vw] text-center">
            <Shield className="w-[3vw] h-[3vw] text-slate-300 mx-auto mb-[1vw]" />
            <p className="text-slate-400 text-[1vw]">
              No party types configured
            </p>
            <p className="text-slate-300 text-[0.8vw] mt-[0.3vw]">
              Add categories in the Party Types tab first
            </p>
          </div>
        ) : (
          partyTypes.map((type, tIdx) => {
            const color = TYPE_COLORS[tIdx % TYPE_COLORS.length];
            const curSeg = selectedSegment[type.id] || "Default";
            const steps = getFlow(type.name, curSeg);
            const isExpanded = expandedType === type.id;
            const { count, warnings, assigned } = getStats(type.name, curSeg);
            return (
              <div
                key={type.id}
                className={`bg-white border ${color.border} rounded-[0.6vw] shadow-sm overflow-visible transition-all hover:shadow-md`}
              >
                <div
                  className={`flex items-center justify-between p-[1vw] cursor-pointer select-none ${color.headerBg} ${isExpanded ? `border-b ${color.border}` : ""} rounded-t-[0.6vw]`}
                  onClick={() => setExpandedType(isExpanded ? null : type.id)}
                >
                  <div className="flex items-center gap-[0.8vw] flex-1 min-w-0">
                    <Shield
                      className={`w-[1.2vw] h-[1.2vw] flex-shrink-0 ${color.accent}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[0.55vw] flex-wrap">
                        <span
                          className={`text-[0.8vw] font-bold px-[0.7vw] py-[0.25vw] rounded-[0.4vw] ${color.badge} shadow-sm border border-slate-400/20`}
                        >
                          {type.name}
                        </span>
                      </div>
                      {/* High-fidelity minimalism: No metadata in collapsed state */}
                    </div>
                  </div>
                    <div className="flex items-center gap-[0.6vw] flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-[1.1vw] h-[1.1vw] text-slate-400" />
                      ) : (
                        <ChevronDown className="w-[1.1vw] h-[1.1vw] text-slate-400" />
                      )}
                    </div>
                  </div>
                {isExpanded && (
                  <div className="flex border-t border-slate-400 min-h-[25vw]">
                    {/* Left Side: Segment Selector Sidebar */}
                    <div className="w-[12vw] bg-slate-50/50 border-r border-slate-400 p-[0.6vw] flex flex-col gap-[0.4vw]">
                      <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-widest px-[0.4vw] mb-[0.2vw]">Product Segments</p>
                      
                      <button 
                        onClick={() => setSelectedSegment(prev => ({...prev, [type.id]: "Default"}))}
                        className={`flex items-center justify-between px-[0.8vw] py-[0.6vw] rounded-[0.4vw] text-[0.75vw] font-bold transition-all ${curSeg === "Default" ? "bg-white text-blue-600 shadow-sm border border-blue-100 italic" : "text-gray-800 hover:bg-slate-200/50 hover:text-slate-700"}`}
                      >
                        Default SLA
                        {curSeg === "Default" && <ChevronRight className="w-[0.8vw] h-[0.8vw]" />}
                      </button>

                      <div className="h-px bg-slate-200 my-[0.2vw]" />

                      {segments.map(s => {
                        const isSel = curSeg === s.name;
                        return (
                          <button 
                            key={s.id}
                            onClick={() => setSelectedSegment(prev => ({...prev, [type.id]: s.name}))}
                            className={`flex flex-col px-[0.8vw] py-[0.65vw] rounded-[0.4vw] transition-all text-left border ${isSel ? "bg-white border-blue-200 text-blue-700 shadow-sm ring-2 ring-blue-50" : "border-transparent text-gray-800 hover:bg-slate-200/40 hover:text-slate-700"}`}
                          >
                            <span className="text-[0.8vw] font-bold flex items-center justify-between">
                              {s.name}
                              {isSel && <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-blue-600" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Side: Flow Editor Content */}
                    <div className="flex-1 p-[1.2vw] bg-white">
                      <div className="flex items-center justify-between mb-[1vw]">
                         <div>
                            <h4 className="text-[0.9vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                              Configuring Flow for <span className="text-blue-600 underline decoration-blue-200 decoration-2 underline-offset-4">{curSeg === "Default" ? `All ${type.name} Segments` : curSeg}</span>
                            </h4>

                         </div>
                         <div className="flex items-center gap-[0.5vw]">
                            <button
                              type="button"
                              onClick={async (e) => {
                                const confirmed = await confirm({
                                  title: "Reset Segment SLA",
                                  message: `Reset SLA configuration for segment "${curSeg}" to default?`,
                                  confirmText: "Reset",
                                });
                                if (confirmed) resetType(type.name, curSeg);
                              }}
                              className="text-[0.68vw] text-slate-400 hover:text-slate-700 border border-slate-400 hover:border-slate-400 bg-white px-[0.6vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer flex items-center gap-[0.3vw] transition-all font-bold"
                            >
                                Reset Segment
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-5 gap-[1.5vw]">
                        <div className="col-span-3">
                          <FlowEditor
                            steps={steps}
                            departments={departments}
                            employees={employees}
                            onChange={(s) => updateFlow(type.name, curSeg, s)}
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-[0.8vw]">
                          <ChainPreview steps={steps} employees={employees} />
                          <div className="bg-slate-50/80 border border-slate-400 rounded-[0.5vw] p-[0.7vw]">
                            <h4 className="text-[0.72vw] font-bold text-slate-600 mb-[0.4vw]">
                              Legend
                            </h4>
                            <div className="flex flex-col gap-[0.3vw] text-[0.68vw] text-gray-800">
                              <div className="flex items-center gap-[0.35vw]">
                                <UserCheck className="w-[0.75vw] h-[0.75vw] text-blue-500" />{" "}
                                Selected engineers tried first (round-robin)
                              </div>
                              <div className="flex items-center gap-[0.35vw]">
                                <Users className="w-[0.75vw] h-[0.75vw] text-slate-400" />{" "}
                                Empty = auto (least busy in dept)
                              </div>
                              <div className="flex items-center gap-[0.35vw]">
                                <Clock className="w-[0.75vw] h-[0.75vw] text-amber-400" />{" "}
                                Duration = SLA before auto-escalating to next
                                level
                              </div>
                              <div className="flex items-center gap-[0.35vw]">
                                <AlertTriangle className="w-[0.75vw] h-[0.75vw] text-amber-400" />{" "}
                                Warning = no engineers in that dept
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t border-amber-200 p-[0.8vw] flex items-center justify-between shadow-lg">
          <span className="text-[0.78vw] text-amber-700 flex items-center gap-[0.4vw]">
            <AlertTriangle className="w-[0.9vw] h-[0.9vw]" /> Unsaved Changes — Please save to apply these updates
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1.5vw] py-[0.6vw] rounded-[0.4vw] font-semibold cursor-pointer text-[0.85vw] transition-all shadow-sm"
          >
            <Save className="w-[1vw] h-[1vw]" /> Save Now
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Employee & Department Management
// ─────────────────────────────────────────────────────────────────────────────

const DepartmentMasterModal = ({ isOpen, onClose, departments, onSave }) => {
  const [localDepts, setLocalDepts] = useState([]);
  const [newDept, setNewDept] = useState("");
  const { toast, confirm } = useNotification();

  useEffect(() => {
    if (isOpen) setLocalDepts([...departments]);
  }, [isOpen, departments]);

  const handleAdd = () => {
    if (!newDept.trim()) return;
    if (localDepts.includes(newDept.trim())) {
      toast("Department already exists", "warning");
      return;
    }
    setLocalDepts([...localDepts, newDept.trim()]);
    setNewDept("");
  };

  const handleRemove = async (dept) => {
    const ok = await confirm({
      title: "Remove Department",
      message: `Are you sure you want to remove "${dept}"?`,
      type: "danger"
    });
    if (ok) {
      setLocalDepts(localDepts.filter(d => d !== dept));
    }
  };

  const handleSave = () => {
    onSave(localDepts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-[2vw]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[1vw] shadow-2xl border border-slate-400 w-full max-w-[28vw] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-[1.2vw] border-b border-slate-400 flex items-center justify-between bg-slate-50">
          <h3 className="text-[1vw] font-bold text-slate-900 flex items-center gap-[0.5vw]">
            <Briefcase className="w-[1.1vw] h-[1.1vw] text-blue-600" />
            Manage Departments
          </h3>
          <button onClick={onClose} className="p-[0.4vw] hover:bg-slate-200 rounded-full transition-colors"><X className="w-[1vw] h-[1vw]" /></button>
        </div>

        <div className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto">
          <div className="flex gap-[0.5vw]">
            <input 
              type="text" 
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Enter department name..."
              className="flex-1 border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="bg-blue-600 text-white px-[1vw] rounded-[0.4vw] hover:bg-blue-700 transition-colors"><Plus className="w-[1vw] h-[1vw]" /></button>
          </div>

          <div className="flex flex-col gap-[0.4vw]">
            {localDepts.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between p-[0.6vw] bg-slate-50 border border-slate-400 rounded-[0.4vw] hover:bg-slate-100 transition-colors group">
                <span className="text-[0.82vw] font-medium text-slate-700">{dept}</span>
                <button onClick={() => handleRemove(dept)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-[0.9vw] h-[0.9vw]" /></button>
              </div>
            ))}
            {localDepts.length === 0 && <p className="text-center text-slate-400 py-[2vw] text-[0.8vw]">No departments defined</p>}
          </div>
        </div>

        <div className="p-[1vw] border-t border-slate-400 bg-slate-50 flex justify-end gap-[0.6vw]">
          <button onClick={onClose} className="px-[1vw] py-[0.5vw] text-slate-600 hover:bg-slate-200 rounded-[0.4vw] text-[0.82vw] font-semibold">Cancel</button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-[1.2vw] py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-bold shadow-lg hover:bg-blue-700 transition-all">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

const EmployeeManagementSection = ({ employees, setEmployees, departments, setDepartments }) => {
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useNotification();

  const [regData, setRegData] = useState({
    name: "", userId: "", email: "", phoneNumber: "", dob: "", gender: "",
    role: "User", department: "", designation: "", ctc: "", dateOfJoining: "",
    workingStatus: "Active", password: "", confirmPassword: "", profilePicture: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const openRegModal = (emp = null) => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (emp) {
      setEditingEmp(emp);
      setRegData({
        ...emp,
        password: "", // Don't show password
        confirmPassword: "",
        dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : "",
        dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : "",
      });
    } else {
      setEditingEmp(null);
      setRegData({
        name: "", userId: "", email: "", phoneNumber: "", dob: "", gender: "",
        role: "User", department: "", designation: "", ctc: "", dateOfJoining: "",
        workingStatus: "Active", password: "", confirmPassword: "", profilePicture: null
      });
    }
    setShowRegModal(true);
  };

  const handleDeptSave = async (newList) => {
    try {
      await axios.post(`${API_URL}/master/settings`, { key: "departments", value: newList });
      setDepartments(newList);
      toast("Departments updated successfully");
    } catch (err) {
      toast("Failed to save departments", "error");
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    
    // Check if passwords match (if password is being set or changed)
    if (regData.password || regData.confirmPassword) {
      if (regData.password !== regData.confirmPassword) {
        toast("Passwords do not match", "error");
        return;
      }
    }

    if (regData.ctc && Number(regData.ctc) < 0) {
      toast("CTC cannot be negative", "error");
      return;
    }

    try {
      // Clean up empty dates for Mongoose
      const finalData = { ...regData };
      if (!finalData.dob) delete finalData.dob;
      if (!finalData.dateOfJoining) delete finalData.dateOfJoining;
      if (!finalData.ctc) delete finalData.ctc;
      if (!finalData.password) delete finalData.password;
      if (!finalData.confirmPassword) delete finalData.confirmPassword;

      if (editingEmp) {
        // Update existing
        await axios.put(`${API_URL}/auth/employees/${editingEmp._id || editingEmp.id}`, finalData);
        toast("Employee updated successfully");
      } else {
        // Register new
        await axios.post(`${API_URL}/auth/register`, finalData);
        toast("Employee registered successfully");
      }
      
      // Full refresh from backend to ensure state consistency
      try {
        const empRes = await axios.get(`${API_URL}/auth/employees`);
        setEmployees(empRes.data);
      } catch (refreshErr) {
        console.error("Refresh failed:", refreshErr);
      }
      
      // Clear states
      setShowRegModal(false);
      setEditingEmp(null);
    } catch (err) {
      console.error("Submit error:", err);
      toast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const filtered = (employees || []).filter(e => 
    e && (
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-[1.2vw] flex flex-col gap-[1vw]">
      <div className="flex items-center justify-between gap-[1vw]">
        <div className="relative flex-1 max-w-[25vw]">
          <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-slate-400" />
          <input 
            type="text" 
            placeholder="Search employees by name, ID or department..."
            className="w-full pl-[2.4vw] pr-[1vw] py-[0.6vw] border border-slate-400 rounded-[0.5vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-[0.6vw]">
          <button 
            onClick={() => setShowDeptModal(true)}
            className="flex items-center gap-[0.5vw] border border-slate-400 text-slate-600 hover:bg-slate-50 px-[1vw] py-[0.6vw] rounded-[0.5vw] font-semibold text-[0.82vw] cursor-pointer transition-all"
          >
            <Briefcase className="w-[1vw] h-[1vw]" /> Dept Master
          </button>
          <button 
            onClick={() => openRegModal()}
            className="flex items-center gap-[0.5vw] bg-blue-600 text-white px-[1.2vw] py-[0.6vw] rounded-[0.5vw] font-bold text-[0.85vw] cursor-pointer hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <UserPlus className="w-[1vw] h-[1vw]" /> Register Employee
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-400 rounded-[0.8vw] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-400">
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">S. No.</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Employee</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">ID</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Department</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Designation</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Role</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Status</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((emp, idx) => (
              <tr key={emp._id || idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-[1vw] py-[0.8vw]">
                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                </td>
                <td className="px-[1vw] py-[0.8vw]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[0.9vw] overflow-hidden">
                      {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[0.85vw] font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[0.7vw] text-slate-500">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-[0.82vw] font-medium text-slate-600">{emp.userId}</td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className="px-[0.6vw] py-[0.2vw] bg-slate-100 text-slate-700 rounded-full text-[0.7vw] font-bold">
                    {emp.department}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-[0.82vw] text-slate-600">{emp.designation}</td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.7vw] font-bold ${
                    emp.role === "Admin" || emp.role === "Supervisor" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {emp.role || "User"}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.7vw] font-bold ${
                    emp.workingStatus === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {emp.workingStatus}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-right">
                  <button 
                    onClick={() => openRegModal(emp)}
                    className="p-[0.4vw] hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-blue-600"
                  >
                    <Edit2 className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedData.length === 0 && (
          <div className="p-[4vw] text-center flex flex-col items-center gap-[1vw]">
            <Users className="w-[3vw] h-[3vw] text-slate-200" />
            <p className="text-slate-400 text-[0.9vw]">No employees found matching your search</p>
          </div>
        )}

        {/* Pagination UI */}
        <div className="border-t border-slate-400 p-[0.8vw] bg-slate-50 flex justify-between items-center">
          <div className="text-[0.75vw] text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="text-slate-900 font-bold">{filtered.length}</span> employees
          </div>
          <div className="flex items-center gap-[0.8vw]">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-[0.4vw] border border-slate-400 rounded-[0.4vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-[1vw] h-[1vw] text-slate-600" />
            </button>
            <div className="flex gap-[0.4vw]">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Basic logic to show only few pages if there are many
                if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                  if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-slate-400">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-white border border-slate-400 text-slate-600 hover:border-blue-400 hover:text-blue-600"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.4vw] border border-slate-400 rounded-[0.4vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm transition-all cursor-pointer"
            >
              <ChevronRight className="w-[1vw] h-[1vw] text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-[2vw]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[1.2vw] shadow-2xl border border-slate-400 w-full max-w-[50vw] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-[1.5vw] border-b border-slate-400 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-600 flex items-center justify-center">
                    <UserPlus className="w-[1.1vw] h-[1.1vw] text-white" />
                  </div>
                  <div>
                    <h3 className="text-[1.1vw] font-bold text-slate-900">{editingEmp ? "Edit Employee Profile" : "Register New Employee"}</h3>
                    <p className="text-[0.75vw] text-slate-500">{editingEmp ? `Updating details for ${editingEmp.name}` : "Create a new user profile and credentials"}</p>
                  </div>
                </div>
                <button onClick={() => setShowRegModal(false)} className="p-[0.5vw] hover:bg-slate-200 rounded-full transition-colors"><X className="w-[1.2vw] h-[1.2vw]" /></button>
              </div>

              <form onSubmit={handleRegSubmit} className="p-[1.5vw] overflow-y-auto grid grid-cols-2 gap-[1.2vw]">
                {/* Personal Details */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw]">
                  <User className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Personal Details</span>
                </div>
                
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Users className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Full Name *</label>
                  <input type="text" required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="John Doe" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ShieldCheck className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Employee ID *</label>
                  <input type="text" required value={regData.userId} onChange={e => setRegData({...regData, userId: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="EMP001" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Mail className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Email Address *</label>
                  <input type="email" required value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="john@akira.com" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Phone className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Phone Number</label>
                  <input type="tel" value={regData.phoneNumber} onChange={e => setRegData({...regData, phoneNumber: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="+91 ..." />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Calendar className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Date of Birth *</label>
                  <input type="date" required value={regData.dob} onChange={e => setRegData({...regData, dob: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Users className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Gender *</label>
                  <select required value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw] bg-white">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Professional Details */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw] mt-[0.8vw]">
                  <Briefcase className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Professional Details</span>
                </div>

                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Briefcase className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Department *</label>
                  <div className="flex gap-[0.4vw]">
                    <select required value={regData.department} onChange={e => setRegData({...regData, department: e.target.value})} className="flex-1 border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw] bg-white">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowDeptModal(true)} className="p-[0.6vw] bg-slate-100 hover:bg-slate-200 rounded-[0.4vw] transition-colors"><Settings className="w-[1vw] h-[1vw] text-slate-600" /></button>
                  </div>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Tag className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Designation *</label>
                  <input type="text" required value={regData.designation} onChange={e => setRegData({...regData, designation: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="Senior Engineer" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ShieldCheck className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Role *</label>
                  <select required value={regData.role} onChange={e => setRegData({...regData, role: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw] bg-white">
                    <option value="User">User</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><IndianRupee className="w-[0.9vw] h-[0.9vw] text-slate-400" /> CTC (Monthly)</label>
                  <input type="number" min="0" value={regData.ctc} onChange={e => {
                    const val = e.target.value;
                    if (val === "" || Number(val) >= 0) {
                      setRegData({...regData, ctc: val});
                    }
                  }} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="Enter monthly CTC" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Calendar className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Date of Joining *</label>
                  <input type="date" required value={regData.dateOfJoining} onChange={e => setRegData({...regData, dateOfJoining: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Activity className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Working Status *</label>
                  <select required value={regData.workingStatus} onChange={e => setRegData({...regData, workingStatus: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw] bg-white">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                {/* Profile Picture */}
                <div className="col-span-2 space-y-[0.6vw] p-[1vw] bg-slate-50 rounded-[0.8vw] border border-slate-400">
                  <div className="flex items-center justify-between">
                    <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ImageIcon className="w-[1vw] h-[1vw] text-blue-600" /> Profile Picture</label>
                    <span className="text-[0.7vw] text-slate-400">Optional: Max 2MB</span>
                  </div>
                  <div className="flex items-center gap-[1.2vw]">
                    <div className="w-[4vw] h-[4vw] rounded-full bg-white border-2 border-slate-400 flex items-center justify-center overflow-hidden shadow-inner">
                      {regData.profilePicture ? (
                        <img src={regData.profilePicture} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-[1.8vw] h-[1.8vw] text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setRegData({...regData, profilePicture: reader.result});
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-[0.75vw] file:mr-[1vw] file:py-[0.4vw] file:px-[1vw] file:rounded-full file:border-0 file:text-[0.75vw] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                      />
                      {regData.profilePicture && (
                        <button type="button" onClick={() => setRegData({...regData, profilePicture: null})} className="text-[0.7vw] text-red-500 hover:text-red-700 font-bold mt-[0.4vw] flex items-center gap-[0.2vw]">
                          <X className="w-[0.8vw] h-[0.8vw]" /> Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw] mt-[0.8vw]">
                  <Lock className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Security</span>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Lock className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Password {!editingEmp && "*"}</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required={!editingEmp}
                      value={regData.password} 
                      onChange={e => setRegData({...regData, password: e.target.value})} 
                      className="w-full border border-slate-400 p-[0.6vw] pr-[2.5vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-[1vw] h-[1vw]" /> : <Eye className="w-[1vw] h-[1vw]" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Lock className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Confirm Password {!editingEmp && "*"}</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      required={!editingEmp}
                      value={regData.confirmPassword} 
                      onChange={e => setRegData({...regData, confirmPassword: e.target.value})} 
                      className="w-full border border-slate-400 p-[0.6vw] pr-[2.5vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-[1vw] h-[1vw]" /> : <Eye className="w-[1vw] h-[1vw]" />}
                    </button>
                  </div>
                </div>
                
                <div className="col-span-2 pt-[1.5vw] mt-[0.5vw] border-t border-slate-400 flex justify-end gap-[0.8vw]">
                  <button type="button" onClick={() => setShowRegModal(false)} className="px-[1.5vw] py-[0.7vw] text-slate-600 hover:bg-slate-100 rounded-[0.6vw] text-[0.85vw] font-semibold transition-all">Cancel</button>
                  <button type="submit" className="px-[2vw] py-[0.7vw] bg-blue-600 text-white rounded-[0.6vw] text-[0.85vw] font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    {editingEmp ? "Update Profile" : "Complete Registration"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DepartmentMasterModal 
        isOpen={showDeptModal} 
        onClose={() => setShowDeptModal(false)} 
        departments={departments}
        onSave={handleDeptSave}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UnitsSection
// ─────────────────────────────────────────────────────────────────────────────
const UnitsSection = ({ units, setUnits }) => {
  const { toast, confirm } = useNotification();
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);

  const handleAdd = async () => {
    const t = newTypeName.trim();
    if (!t) return;
    if (units.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Unit already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/units`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setUnits([...units, newItem]);
      setNewTypeName("");
      toast("Unit added successfully");
    } catch (err) {
      toast("Failed to add unit", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingType?.name?.trim()) return;
    const t = editingType.name.trim();
    if (
      units.some(
        (x) =>
          x.id !== editingType.id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Unit already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/units/${editingType._id || editingType.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setUnits(
        units.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Unit updated");
    } catch (err) {
      toast("Failed to update unit", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const type = units.find((t) => t.id === id || t._id === mongoId);
    const confirmed = await confirm({
      title: "Delete Unit",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{type.name}"</span>?</p>
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/units/${mongoId || id}`);
        const remaining = units.filter((t) => t.id !== id && t._id !== mongoId);
        setUnits(remaining);
        toast("Unit deleted successfully");
      } catch (err) {
        toast("Failed to delete unit", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Existing Units
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {units.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No units yet
              </div>
            ) : (
              units.map((type, idx) => {
                const badgeClass =
                  TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                return (
                  <div
                    key={type.id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors"
                  >
                    {editingType && (editingType._id === type._id || editingType.id === type.id) ? (
                      <div className="flex flex-1 items-center gap-[0.5vw]">
                        <input
                          autoFocus
                          type="text"
                          value={editingType.name}
                          onChange={(e) =>
                            setEditingType({
                              ...editingType,
                              name: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate();
                            if (e.key === "Escape") setEditingType(null);
                          }}
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={handleUpdate}
                          className="p-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.3vw] cursor-pointer"
                        >
                          <Check className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingType(null)}
                          className="p-[0.4vw] bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${badgeClass}`}
                        >
                          {type.name}
                        </span>
                        
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingType({ id: type.id, _id: type._id, name: type.name })
                            }
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(type.id, type._id)}
                            className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="flex flex-col gap-[0.8vw]">
          <div>
            <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
              Add New Unit
            </p>
            <div className="flex gap-[0.5vw]">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Nos, Kgs, Ltrs…"
                className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTypeName.trim()}
                className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-[0.9vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-semibold transition-all"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add
              </button>
            </div>
          </div>
          {units.length > 0 && (
            <div className="bg-slate-50 border border-slate-400 rounded-[0.4vw] p-[0.7vw]">
              <p className="text-[0.68vw] font-semibold text-gray-800 mb-[0.5vw]">
                Preview
              </p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {units.map((type, idx) => (
                  <span
                    key={type.id}
                    className={`text-[0.72vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length]}`}
                  >
                    {type.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RoleAccessSection = ({ employees, setEmployees }) => {
  const { toast } = useNotification();
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUser, setSelectedUser] = useState("All");
  const [activeGroup, setActiveGroup] = useState("all");
  const [matrix, setMatrix] = useState({});
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Fetch groups and modules config dynamically from backend
  useEffect(() => {
    axios
      .get(`${API_URL}/master/modules`)
      .then((res) => {
        setGroups(res.data.groups || []);
        setModules(res.data.modules || []);
      })
      .catch((err) => {
        console.error("Failed to load module definitions:", err);
        toast("Failed to load permission definitions", "error");
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, []);

  // Get list of unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    (employees || []).forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter employees matching selected department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "All") return employees || [];
    return (employees || []).filter((emp) => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Find target employee for editing permissions
  const targetEmployee = useMemo(() => {
    if (selectedUser === "All") return null;
    return (employees || []).find((emp) => emp.userId === selectedUser);
  }, [employees, selectedUser]);

  // Load/initialize matrix permissions object when selection changes
  useEffect(() => {
    if (modules.length === 0) return;

    const initialMatrix = {};
    
    // Default initial permissions for all modules
    modules.forEach((mod) => {
      initialMatrix[mod.id] = { enabled: false, read: false, write: false, delete: false };
    });

    if (targetEmployee) {
      // If a specific employee is selected, load their permissions
      const userPerms = targetEmployee.permissions || {};
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const hasAnyAccess = userPerms[mod.id].read || userPerms[mod.id].write || userPerms[mod.id].delete;
          initialMatrix[mod.id] = {
            enabled: userPerms[mod.id].enabled ?? hasAnyAccess,
            read: userPerms[mod.id].read ?? true,
            write: userPerms[mod.id].write ?? false,
            delete: userPerms[mod.id].delete ?? false,
          };
        }
      });
    } else if (filteredEmployees.length > 0) {
      // If "All" is selected, average the permissions from the first matching employee
      const firstEmp = filteredEmployees[0];
      const userPerms = firstEmp.permissions || {};
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const hasAnyAccess = userPerms[mod.id].read || userPerms[mod.id].write || userPerms[mod.id].delete;
          initialMatrix[mod.id] = {
            enabled: userPerms[mod.id].enabled ?? hasAnyAccess,
            read: userPerms[mod.id].read ?? true,
            write: userPerms[mod.id].write ?? false,
            delete: userPerms[mod.id].delete ?? false,
          };
        }
      });
    }
    setMatrix(initialMatrix);
  }, [selectedUser, selectedDepartment, targetEmployee, filteredEmployees, modules]);

  // Handle local permission toggle
  const togglePermission = (modId, type) => {
    setMatrix((prev) => {
      const current = prev[modId] || { enabled: false, read: false, write: false, delete: false };
      return {
        ...prev,
        [modId]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  };

  // Toggle entire module enabled/disabled state
  const toggleModuleEnabled = (modId) => {
    setMatrix((prev) => {
      const current = prev[modId] || { enabled: false, read: false, write: false, delete: false };
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        [modId]: {
          enabled: nextEnabled,
          read: nextEnabled, // Enable read access by default when module is enabled
          write: false,
          delete: false,
        },
      };
    });
  };

  // Bulk enable/disable all modules in a specific group
  const handleBulkToggleGroup = (groupId, action) => {
    setMatrix((prev) => {
      const updated = { ...prev };
      modules.forEach((mod) => {
        if (mod.group === groupId) {
          updated[mod.id] = {
            enabled: action === "enable",
            read: action === "enable",
            write: action === "enable",
            delete: action === "enable",
          };
        }
      });
      return updated;
    });
  };

  // Save changes to backend
  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      const targets = targetEmployee ? [targetEmployee] : filteredEmployees;
      if (targets.length === 0) {
        toast("No target employees selected", "warning");
        setSaving(false);
        return;
      }

      // Loop and perform put requests for each target employee
      await Promise.all(
        targets.map((emp) =>
          axios.put(`${API_URL}/auth/employees/${emp._id || emp.id}`, {
            permissions: matrix,
          })
        )
      );

      // Refresh employee list from database to keep frontend in sync
      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees(empRes.data);

      toast("Permission Matrix saved successfully");
    } catch (err) {
      console.error(err);
      toast("Failed to save matrix config", "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper to count active modules count
  const activeCount = useMemo(() => {
    let count = 0;
    modules.forEach((mod) => {
      const mState = matrix[mod.id] || {};
      if (mState.read || mState.write || mState.delete) {
        count++;
      }
    });
    return count;
  }, [matrix, modules]);

  if (loadingConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-[1vw] bg-slate-50" style={{ height: "calc(92vh - 160px)" }}>
        <Loader2 className="w-[2.5vw] h-[2.5vw] animate-spin text-blue-600" />
        <span className="text-[0.95vw] text-slate-500 font-bold">Loading Matrix Config...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-slate-50">
      {/* Top Filter Selection Panel */}
      <div className="flex items-center justify-between bg-white border-b border-slate-300 p-[1.2vw] shadow-sm flex-wrap gap-[1vw]">
        <div className="flex items-center gap-[1.5vw] flex-wrap">
          <div className="flex items-center gap-[0.5vw]">
            <span className="text-[0.8vw] font-bold text-slate-700">Select Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedUser("All");
              }}
              className="border border-slate-400 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-[0.5vw]">
            <span className="text-[0.8vw] font-bold text-slate-700">Apply To:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border border-slate-400 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All {selectedDepartment === "All" ? "Employees" : selectedDepartment}</option>
              {filteredEmployees.map((emp) => (
                <option key={emp._id || emp.id} value={emp.userId}>
                  {emp.name} ({emp.userId})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50/50 border border-blue-200 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-bold text-blue-800">
            Access Status: <span className="text-blue-600 font-extrabold">{activeCount} of {modules.length} Active</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveMatrix}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-[1.5vw] py-[0.5vw] rounded-[0.4vw] text-[0.85vw] shadow-md shadow-blue-500/10 cursor-pointer flex items-center gap-[0.4vw] transition-all"
        >
          {saving ? "Saving Matrix..." : "Save Matrix"}
        </button>
      </div>

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(92vh - 160px)" }}>
        {/* Left Side: Modules Navigation */}
        <div className="w-[15vw] bg-white border-r border-slate-300 flex flex-col p-[0.8vw] gap-[0.3vw] overflow-y-auto h-full">
          <p className="text-[0.7vw] font-bold uppercase tracking-wider text-slate-400 px-[0.5vw] mb-[0.4vw]">
            Modules Navigation
          </p>
          {groups.map((g) => {
            const isActive = activeGroup === g.id;
            const count = modules.filter((m) => g.id === "all" || m.group === g.id).length;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`flex items-center justify-between px-[0.8vw] py-[0.6vw] rounded-[0.4vw] text-[0.8vw] font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-l-[3px] border-blue-600"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-[0.68vw] px-[0.4vw] py-[0.1vw] rounded font-semibold ${
                  isActive ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Permission Cards Grid */}
        <div className="flex-1 p-[1.2vw] overflow-y-auto min-h-0 space-y-[1.5vw] h-[73vh]">
          {groups.filter(g => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
            const groupMods = modules.filter((mod) => mod.group === g.id);
            if (groupMods.length === 0) return null;

            return (
              <div key={g.id} className="bg-white border border-slate-300 rounded-[0.6vw] p-[1vw] space-y-[1vw] shadow-sm">
                {/* Header for group */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-[0.5vw]">
                  <div className="flex items-center gap-[0.5vw]">
                    <span className="w-[0.3vw] h-[1.2vw] bg-blue-600 rounded-full" />
                    <h3 className="text-[0.9vw] font-bold text-slate-900">{g.label}</h3>
                    <span className="text-[0.7vw] font-semibold text-slate-700 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                      {groupMods.length} modules
                    </span>
                  </div>

                  <div className="flex items-center gap-[0.5vw]">
                    <button
                      type="button"
                      onClick={() => handleBulkToggleGroup(g.id, "enable")}
                      className="text-[0.72vw] font-bold text-blue-600 hover:bg-blue-50 px-[0.6vw] py-[0.2vw] rounded cursor-pointer border border-blue-200 transition-all"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleGroup(g.id, "disable")}
                      className="text-[0.72vw] font-bold text-slate-900 hover:bg-slate-50 px-[0.6vw] py-[0.2vw] rounded cursor-pointer border border-slate-300 transition-all"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-3 gap-[1vw]">
                  {groupMods.map((mod) => {
                    const mState = matrix[mod.id] || { enabled: false, read: false, write: false, delete: false };

                    return (
                      <div
                        key={mod.id}
                        className="border border-slate-300 rounded-[0.5vw] p-[0.8vw] hover:shadow-md transition-all flex flex-col justify-between h-[7.2vw] bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-[0.82vw] font-bold text-slate-900 truncate max-w-[70%]" title={mod.label}>
                            {mod.label}
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleModuleEnabled(mod.id)}
                            className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                              mState.enabled ? "bg-blue-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                mState.enabled ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Three Toggle Controls */}
                        <div className={`grid grid-cols-3 gap-[0.3vw] bg-slate-50 p-[0.4vw] rounded-[0.4vw] border border-slate-200 mt-[0.5vw] transition-all duration-300 ${
                          mState.enabled ? "opacity-100" : "opacity-40 pointer-events-none"
                        }`}>
                          {/* Read Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Read</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "read")}
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.read ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.read ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Write Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Write</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "write")}
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.write ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.write ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Delete Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Delete</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "delete")}
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.delete ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.delete ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SystemSettingsPage
// ─────────────────────────────────────────────────────────────────────────────
const SystemSettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "categories";
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  const [partyTypes, setPartyTypes] = useState([]);
  const [warrantyRules, setWarrantyRules] = useState([]);
  const [units, setUnits] = useState([]);
  const [segments, setSegments] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [flows, setFlows] = useState({});
  const [origFlows, setOrigFlows] = useState({});
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colVis, setColVis] = useState({ ...DEFAULT_COL_VIS });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true);
      try {
        const [ptRes, segRes, flowRes, empRes, colRes, dbRes, boardRes, fourMRes, unitsRes, warrantyRes] = await Promise.all([
          axios.get(`${API_URL}/master/party-types`),
          axios.get(`${API_URL}/master/product-segments`),
          axios.get(`${API_URL}/master/escalation-flows`),
          axios.get(`${API_URL}/auth/employees`), // Fetch employees from backend
          axios.get(`${API_URL}/master/settings/${COLUMN_VIS_KEY}`),
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/board-types`),
          axios.get(`${API_URL}/master/four-m-categories`),
          axios.get(`${API_URL}/master/units`),
          axios.get(`${API_URL}/master/warranty-rules`)
        ]);

        // Party Types
        const normalizedPT = ptRes.data.map(t => ({ ...t, id: t.id || t._id }));
        setPartyTypes(normalizedPT.length ? normalizedPT : [
          { id: 1, name: "OEM" },
          { id: 2, name: "End Customer" },
        ]);

        // Warranty Rules
        setWarrantyRules(warrantyRes.data.map(r => ({ ...r, id: r.id || r._id })));

        // Product Segments
        setSegments(segRes.data.map(s => ({ ...s, id: s.id || s._id })));
        setBoardTypes(boardRes.data.map(s => ({ ...s, id: s.id || s._id })));
        setFourMCategories(fourMRes.data.map(s => ({ ...s, id: s.id || s._id })));
        setUnits(unitsRes.data.map(u => ({ ...u, id: u.id || u._id })));

        const s = {};
        flowRes.data.forEach(f => {
          if (f.type !== "Service Material") s[f.type] = f.steps;
        });
        setFlows(s);
        setOrigFlows(JSON.parse(JSON.stringify(s)));

        const deptRes = await axios.get(`${API_URL}/master/settings/departments`);
        setDepartments(deptRes.data || DEFAULT_DEPTS);

        const emps = empRes.data;
        setEmployees(emps);
        sessionStorage.setItem("all_employees", JSON.stringify(emps));

        if (colRes.data) {
          setColVis(colRes.data);
        } else {
          setColVis({ ...DEFAULT_COL_VIS });
        }

        sessionStorage.setItem("customer_db", JSON.stringify(dbRes.data));

      } catch (err) {
        console.error("Failed to fetch master data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  const TAB_ICONS = {
    categories: Tags,
    escalation: PhoneCall,
    "service-escalation": Wrench,
    columns: Columns,
  };

  return (
    <div className="w-full h-[92vh] flex flex-col font-sans text-[0.85vw] pr-[0.4vw]">
      {isLoading ? (
        <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-[1vw] bg-white border border-slate-400 rounded-[0.6vw] shadow-sm">
          <Loader2 className="w-[3.5vw] h-[3.5vw] animate-spin text-blue-600" />
          <div className="flex flex-col items-center">
            <span className="text-[1.1vw] font-bold text-slate-800 uppercase tracking-widest">Loading Master Settings</span>
            <span className="text-[0.75vw] text-slate-400 font-medium">Please wait while we sync with the server...</span>
          </div>
        </div>
      ) : (
        /* Settings container */
        <div className="flex-1 bg-white border border-slate-400 rounded-[0.6vw] shadow-sm mb-[1vw] overflow-hidden flex flex-col">
          {/* ── Tab: Categories ── */}
          {activeTab === "categories" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-slate-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                  <Tags className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Party Type Categories
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Manage customer categories used across the system
                  </p>
                </div>
                <div className="ml-auto text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
                  {partyTypes.length} categories
                </div>
              </div>
              <PartyTypesSection
                partyTypes={partyTypes}
                setPartyTypes={setPartyTypes}
              />
            </div>
          )}

          {/* ── Tab: Warranty Rules ── */}
          {activeTab === "warranty-rules" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-slate-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Warranty Rule Master
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Manage serial decoders and SLA days per customer category
                  </p>
                </div>
                <div className="ml-auto text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
                  {warrantyRules.length} rules
                </div>
              </div>
              <WarrantyRulesSection
                warrantyRules={warrantyRules}
                setWarrantyRules={setWarrantyRules}
                partyTypes={partyTypes}
              />
            </div>
          )}

          {/* ── Tab: Product Segments ── */}
          {activeTab === "segments" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-teal-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center flex-shrink-0">
                  <Package className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Product Segments</h2>
                  <p className="text-[0.7vw] text-gray-800">Define product lines for auto-completion</p>
                </div>
                <div className="ml-auto text-[0.72vw] text-gray-700 bg-teal-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                  {segments.length} segments
                </div>
              </div>
              <ProductSegmentsSection segments={segments} setSegments={setSegments} />
            </div>
          )}

          {/* ── Tab: 4M Categories ── */}
          {activeTab === "four-m" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-cyan-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center flex-shrink-0">
                  <Columns className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">4M Categories</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage Man, Machine, Material, Method categories for Service Materials</p>
                </div>
                <div className="ml-auto text-[0.72vw] text-gray-700 bg-cyan-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                  {fourMCategories.length} categories
                </div>
              </div>
              <FourMCategoriesSection items={fourMCategories} setItems={setFourMCategories} />
            </div>
          )}

          {/* ── Tab: Units ── */}
          {activeTab === "units" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-emerald-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Units</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage Unit values for Service Materials</p>
                </div>
                <div className="ml-auto text-[0.72vw] text-gray-700 bg-emerald-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                  {units.length} units
                </div>
              </div>
              <UnitsSection units={units} setUnits={setUnits} />
            </div>
          )}

          {/* ── Tab: Escalation ── */}
          {activeTab === "escalation" && (
            <div>

              <EscalationSection
                partyTypes={partyTypes}
                segments={segments}
                flows={flows}
                setFlows={setFlows}
                departments={departments}
                employees={employees}
              />
            </div>
          )}

          {/* ── Tab: Service Material Escalation ── */}
          {activeTab === "service-escalation" && (
            <div>

              <ServiceMaterialEscalationSection departments={departments} />
            </div>
          )}

          {/* ── Tab: Employees ── */}
          {activeTab === "employees" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-purple-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <Users className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Employee Management</h2>
                  <p className="text-[0.7vw] text-gray-800">Register and manage employee profiles and departments</p>
                </div>
              </div>
              <EmployeeManagementSection 
                employees={employees} 
                setEmployees={setEmployees}
                departments={departments}
                setDepartments={setDepartments}
              />
            </div>
          )}

          {/* ── Tab: Role Access ── */}
          {activeTab === "role-access" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-blue-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Role Access Management</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage employee permissions for read, write, and delete operations</p>
                </div>
              </div>
              <RoleAccessSection
                employees={employees}
                setEmployees={setEmployees}
              />
            </div>
          )}

          {/* ── Tab: Columns ── */}
          {activeTab === "columns" && (
            <div>
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-indigo-50/60 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Columns className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Database Column Visibility
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Show or hide columns in the Customer Database table
                  </p>
                </div>
              </div>
              <ColumnVisibilitySection colVis={colVis} setColVis={setColVis} />
            </div>
          )}
        </div>
      )}
    </div>

  );
};

export default SystemSettingsPage;
