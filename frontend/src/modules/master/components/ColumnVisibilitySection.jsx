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
    <div className="flex-1 flex flex-col min-h-0 bg-white p-[1.4vw]">
      {/* Header */}
      <div className="flex items-center justify-between pb-[0.8vw] mb-[1.2vw] border-b border-gray-100">
        <div>
          <h3 className="text-[0.9vw] font-bold text-gray-900">Database Column Visibility</h3>
          <p className="text-[0.74vw] text-gray-500">
            Control table column presence in Customer Database. Core identifying columns remain pinned.
          </p>
        </div>
        <div className="flex items-center gap-[0.7vw]">
          <span className="text-[0.72vw] font-semibold text-blue-700 bg-blue-50 px-[0.7vw] py-[0.25vw] rounded-full border border-blue-200">
            {visibleCount} of {totalCount} columns visible
          </span>
          <button
            type="button"
            onClick={enableAll}
            className="flex items-center gap-[0.35vw] border border-gray-300 text-gray-700 hover:bg-gray-50 px-[0.85vw] py-[0.42vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] font-medium transition-all"
          >
            <Eye className="w-[0.85vw] h-[0.85vw]" /> Show All
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.42vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all shadow-sm ${
              saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Modern Compact Grid with clean list item style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[0.8vw]">
        {CUSTOMER_DB_COLUMNS.map((col) => {
          const isOn = colVis[col.key] ?? true;
          const isRequired = col.required;
          return (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              className={`flex items-center justify-between px-[1vw] py-[0.75vw] rounded-[0.5vw] border transition-all select-none ${
                isRequired
                  ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                  : isOn
                    ? "bg-white border-blue-200 hover:border-blue-400 cursor-pointer shadow-2xs"
                    : "bg-gray-50/50 border-gray-200 hover:border-gray-300 cursor-pointer"
              }`}
            >
              <div className="flex flex-col gap-[0.15vw] min-w-0 pr-[0.8vw]">
                <div className="flex items-center gap-[0.4vw]">
                  <span className={`text-[0.8vw] font-semibold truncate ${isOn ? "text-gray-900" : "text-gray-400"}`}>
                    {col.label}
                  </span>
                  {isRequired && (
                    <span className="text-[0.6vw] bg-gray-200 text-gray-700 px-[0.35vw] py-[0.05vw] rounded font-semibold flex-shrink-0">
                      Required
                    </span>
                  )}
                </div>
                <span className="text-[0.68vw] text-gray-400 truncate">
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
                <div className={`w-[2.1vw] h-[1.15vw] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0.12vw] after:left-[0.15vw] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[0.9vw] after:w-[0.9vw] after:transition-all ${
                  isRequired ? "bg-gray-300" : "bg-gray-200 peer-checked:bg-blue-600"
                }`}></div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Live Table Header Preview */}
      <div className="mt-[1.6vw] bg-gray-50/80 border border-gray-200 rounded-[0.5vw] p-[0.9vw]">
        <div className="flex items-center justify-between mb-[0.5vw]">
          <span className="text-[0.72vw] font-bold text-gray-700 uppercase tracking-wider">
            Live Header Strip Preview
          </span>
          <span className="text-[0.68vw] text-gray-400">
            Preview of customer database columns
          </span>
        </div>
        <div className="flex items-center gap-[0.4vw] flex-wrap">
          <span className="text-[0.68vw] bg-gray-200 text-gray-600 px-[0.55vw] py-[0.2vw] rounded font-mono font-medium">
            ☑
          </span>
          <span className="text-[0.68vw] bg-gray-200 text-gray-600 px-[0.55vw] py-[0.2vw] rounded font-mono font-medium">
            S.No
          </span>
          {CUSTOMER_DB_COLUMNS.filter((c) => colVis[c.key] ?? true).map((c) => (
            <span
              key={c.key}
              className="text-[0.68vw] bg-white text-blue-700 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded font-semibold shadow-2xs"
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
