import React, { useState } from "react";
import {
  Tags, Settings, Package, Columns, Activity, Users, ShieldCheck, PhoneCall,
  Info, HelpCircle, Clock, MapPin
} from "lucide-react";

export const PARTY_TYPES_KEY = "party_types_v3";
export const PRODUCT_SEGMENTS_KEY = "product_segments_v1";
export const EMPLOYEES_KEY = "employees";
export const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
export const SERVICE_MATERIAL_ESCALATION_KEY = "service_material_escalation_v1";
export const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
export const COLUMN_VIS_KEY = "customer_db_col_visibility_v1";

export const API_URL = import.meta.env.VITE_API_URL;

// ── Default dept flow ─────────────────────────────────────────────────────────
export const DEFAULT_DEPTS = ["Support Engineers", "Service Engineers", "R&D"];

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
export const TYPE_BADGE_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];
export const TYPE_COLORS = [
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
export const LEVEL_COLORS = [
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-blue-800",
  "bg-blue-900",
  "bg-slate-700",
];
export const LEVEL_BG_LIGHT = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-blue-100/70 border-blue-200 text-blue-800",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-blue-200/60 border-blue-300 text-blue-900",
  "bg-blue-200 border-blue-400 text-blue-900",
  "bg-slate-100 border-slate-400 text-slate-800",
];

export const DURATION_PRESETS = [
  { label: "30 min", hours: 0, mins: 30 },
  { label: "1 hr", hours: 1, mins: 0 },
  { label: "2 hr", hours: 2, mins: 0 },
  { label: "4 hr", hours: 4, mins: 0 },
  { label: "8 hr", hours: 8, mins: 0 },
  { label: "1 day", hours: 24, mins: 0 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function loadEmployees() {
  try {
    return JSON.parse(sessionStorage.getItem("all_employees") || "[]");
  } catch {
    return [];
  }
}
export function loadCustomerDb() {
  try {
    return JSON.parse(sessionStorage.getItem("customer_db") || "[]");
  } catch {
    return [];
  }
}
export function initials(name = "") {
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
export const HelpTooltip = ({ content, position = "right", width = "16vw" }) => {
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

export const TABS = [
  { id: "categories", label: "Party Type Categories", icon: Tags },
  { id: "segments", label: "Product Segments", icon: Package },
  { id: "four-m", label: "4M Categories", icon: Columns },
  { id: "units", label: "Units", icon: Activity },
  { id: "employees", label: "User Management", icon: Users },
  { id: "role-access", label: "Role Access", icon: ShieldCheck },
  { id: "escalation", label: "Service Call SLA", icon: PhoneCall },
];
