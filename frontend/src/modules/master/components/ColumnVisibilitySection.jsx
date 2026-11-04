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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS
} from "./masterConstants";

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

export default ColumnVisibilitySection;
