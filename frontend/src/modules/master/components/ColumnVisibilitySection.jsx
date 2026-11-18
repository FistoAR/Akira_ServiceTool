import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import {
  Settings, Plus, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, AlertTriangle, Save, RotateCcw, Shield, Users, User,
  GripVertical, Info, CheckCircle, PhoneCall, UserCheck, Search, Tag,
  Edit2, Trash2, Check, Tags, HelpCircle, Columns, Eye, EyeOff, Clock,
  Wrench, Package, Mail, Calendar, Briefcase, Lock, ShieldCheck, ArrowLeft,
  Phone, Image as ImageIcon, IndianRupee, Activity, UserPlus, Loader2,
  MapPin, RefreshCw
} from "lucide-react";
import {
  API_URL, DEFAULT_DEPTS, TYPE_BADGE_COLORS, TYPE_COLORS, LEVEL_COLORS,
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS,
  CUSTOMER_DB_COLUMNS, COLUMN_VIS_KEY
} from "./masterConstants";

const ColumnVisibilitySection = ({ colVis, setColVis }) => {
  const { toast } = useNotification();
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
    <div className="flex-1 flex flex-col min-h-0 bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Database Column Visibility</h3>
          <p className="text-xs text-gray-700">
            Control table column presence in Customer Database. Core identifying columns remain pinned.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {visibleCount} of {totalCount} columns visible
          </span>
          <button
            type="button"
            onClick={enableAll}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-all"
          >
            <Eye className="w-3 h-3" /> Show All
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md cursor-pointer text-xs font-semibold transition-all shadow-sm ${
              saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {saved ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? "Saved!" : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Modern Compact Grid with clean list item style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CUSTOMER_DB_COLUMNS.map((col) => {
          const isOn = colVis[col.key] ?? true;
          const isRequired = col.required;
          return (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              className={`flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all select-none ${
                isRequired
                  ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                  : isOn
                    ? "bg-white border-blue-200 hover:border-blue-400 cursor-pointer shadow-2xs"
                    : "bg-gray-50/50 border-gray-200 hover:border-gray-300 cursor-pointer"
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold truncate ${isOn ? "text-gray-900" : "text-gray-700"}`}>
                    {col.label}
                  </span>
                  {isRequired && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-px rounded font-semibold flex-shrink-0">
                      Required
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-700 truncate">
                  {col.description}
                </span>
              </div>

              {/* Native Switch */}
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={isRequired}
                  readOnly
                  className="sr-only peer"
                />
                <div className={`w-7.5 h-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all ${
                  isRequired ? "bg-gray-300" : "bg-gray-200 peer-checked:bg-blue-600"
                }`}></div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Live Table Header Preview */}
      <div className="mt-6 bg-gray-50/80 border border-gray-200 rounded-lg p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Live Header Strip Preview
          </span>
          <span className="text-sm text-gray-700">
            Preview of customer database columns
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded font-mono font-medium">
            ☑
          </span>
          <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded font-mono font-medium">
            S.No
          </span>
          {CUSTOMER_DB_COLUMNS.filter((c) => colVis[c.key] ?? true).map((c) => (
            <span
              key={c.key}
              className="text-sm bg-white text-blue-700 border border-blue-200 px-2.5 py-1 rounded font-semibold shadow-2xs"
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

export default ColumnVisibilitySection;
