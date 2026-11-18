import { StepCard } from "./EscalationSection";
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

const ServiceMaterialEscalationSection = ({ departments, onRefresh, isRefreshing }) => {
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-400 bg-gradient-to-r from-orange-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-6.5 h-6.5 rounded-md bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Service Material Inward SLA
              {hasChanges && (
                <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-px rounded-md uppercase tracking-wider font-bold">
                  Pending Changes
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-800">
              Define escalation levels, teams & SLA durations for service material cases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onRefresh && onRefresh("service-escalation", true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-white ring-1 ring-slate-300 hover:ring-blue-400 hover:text-blue-600 rounded-md px-2.5 py-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Refresh latest data from server"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-400 bg-white hover:bg-slate-50 rounded-md text-slate-600 text-xs font-semibold cursor-pointer transition-all"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
      <div className="p-4">

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800 leading-relaxed">
        <strong>Service Material Escalation Levels:</strong> Each level auto-escalates
        to the next team if not resolved within the SLA duration. Drag to reorder,
        or select specific engineers per level for manual routing.
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-4">
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
          className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-blue-600 text-xs font-semibold cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Level
        </button>
        {showPicker && availableToAdd.length > 0 && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-400 rounded-md shadow-lg z-40 overflow-hidden min-w-[173px]">
            {availableToAdd.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => addStep(d)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs font-semibold text-slate-700 border-b border-slate-400 last:border-0 cursor-pointer transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {flow.length === 0 && (
        <div className="text-center py-7 text-slate-700 text-xs">
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

export default ServiceMaterialEscalationSection;
