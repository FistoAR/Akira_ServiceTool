import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import CustomDropdown from "../../../components/CustomDropdown";
import useModulePermissions from "../../../components/useModulePermissions";
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
  LEVEL_BG_LIGHT, HelpTooltip, DEFAULT_COL_VIS, initials, loadEmployees, loadCustomerDb
} from "./masterConstants";

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
        className={`min-h-[32px] border rounded-md px-2.5 py-1.5 bg-white cursor-pointer flex items-center gap-1.5 flex-wrap transition-all duration-200 ${open ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : "border-slate-400 hover:border-blue-300"}`}
      >
        {selectedEngs.length === 0 ? (
          <span className="text-slate-700 text-sm italic select-none flex-1">
            {deptEngs.length === 0
              ? "⚠ No engineers in this department"
              : "Auto-assign (least busy)"}
          </span>
        ) : (
          selectedEngs.map((eng) => (
            <span
              key={eng.userId}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-1 pr-1.5 py-px text-sm font-semibold"
            >
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials(eng.name)}
              </span>
              {eng.name}
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggle(eng.userId);
                }}
                className="hover:text-red-400 cursor-pointer ml-px"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`w-3 h-3 text-slate-700 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-400 rounded-md shadow-lg z-40 overflow-hidden">
          {deptEngs.length > 3 && (
            <div className="p-2 border-b border-slate-400">
              <div className="relative">
                <Search className="absolute left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search engineer..."
                  className="w-full pl-6.5 pr-2 py-1.5 text-xs border border-slate-400 rounded-md outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}
          {deptEngs.length > 0 && (
            <div className="flex gap-2 px-2.5 py-1.5 border-b border-slate-400 bg-slate-50/50">
              <button
                type="button"
                onClick={() => onChange(deptEngs.map((e) => e.userId))}
                className="text-sm text-blue-600 hover:underline cursor-pointer font-semibold"
              >
                Select all
              </button>
              <span className="text-slate-600 text-sm">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-sm text-gray-800 hover:underline cursor-pointer"
              >
                Clear (auto)
              </button>
            </div>
          )}
          <div className="max-h-[187px] overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-3.5 text-center text-slate-700 text-xs">
                {deptEngs.length === 0
                  ? `No engineers in "${dept}"`
                  : "All available engineers are assigned to other levels"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3.5 text-center text-slate-700 text-xs">
                No results
              </div>
            ) : (
              filtered.map((eng) => {
                const selected = selectedIds.includes(eng.userId);
                return (
                  <div
                    key={eng.userId}
                    onClick={() => toggle(eng.userId)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${selected ? "bg-blue-50/70" : "hover:bg-slate-50"}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-slate-400"}`}
                    >
                      {selected && (
                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {initials(eng.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">
                        {eng.name}
                      </div>
                      <div className="text-sm text-slate-700 font-mono">
                        {eng.userId}
                      </div>
                    </div>
                    {selected && (
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-2.5 py-2 border-t border-slate-400 bg-slate-50/50 flex justify-between items-center">
            <span className="text-sm text-slate-700">
              {selectedEngs.length === 0
                ? "Auto-assign (load balanced)"
                : `${selectedEngs.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm bg-blue-600 text-white px-2.5 py-1 rounded-md cursor-pointer font-semibold hover:bg-blue-700"
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
    <div className="flex items-center gap-2">
      <Clock className="w-3 h-3 text-slate-700 flex-shrink-0" />
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-800">Escalate after:</span>
        <div className="flex items-center gap-1">
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
            className="w-12 border border-slate-400 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-text"
          />
          <span className="text-xs text-slate-600 font-semibold">h</span>
          <datalist id="hours-suggestions">
            {[0, 1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-1 ml-1">
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
            className="w-12 border border-slate-400 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-text"
          />
          <span className="text-xs text-slate-600 font-semibold">m</span>
          <datalist id="mins-suggestions">
            {[0, 5, 15, 30, 45].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
      {/* Quick presets */}
      <div className="flex gap-1">
        {DURATION_PRESETS.map((p) => {
          const isActive = p.hours === hours && p.mins === mins;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.hours, p.mins)}
              className={`text-xs px-1.5 py-1 rounded-sm border cursor-pointer transition-all ${isActive ? "bg-blue-600 text-white border-blue-600" : "border-slate-400 text-gray-800 hover:border-blue-300 hover:text-blue-600"}`}
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
export const StepCard = ({
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
      className={`border rounded-lg bg-white overflow-visible transition-all duration-200 ${isDragOver ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-slate-400 hover:border-blue-200 shadow-sm"}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50/70 border-b border-slate-400">
        <GripVertical className="w-3.5 h-3.5 text-slate-600 cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-slate-700" />
        <div
          className={`w-6 h-6 rounded-full ${LEVEL_COLORS[index] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
        >
          <span className="text-white text-xs font-bold">
            L{index + 1}
          </span>
        </div>
        <div className="flex-1">
          <CustomDropdown
            options={availableToSwitch.map((d) => ({ value: d, label: d }))}
            value={step.dept}
            onChange={(newDept) => {
              const newIds = employees
                .filter(
                  (emp) =>
                    (emp.department || "").trim().toLowerCase() === (newDept || "").trim().toLowerCase()
                )
                .map((emp) => emp.userId);
              onUpdate({ ...step, dept: newDept, engineerIds: newIds });
            }}
            size="md"
            className="w-full font-bold text-slate-700"
          />
        </div>
        {hasWarning && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-px rounded-full flex items-center gap-1 whitespace-nowrap">
            <AlertTriangle className="w-2.5 h-2.5" /> 0 engineers
          </span>
        )}
        <div className="flex flex-col gap-px flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-slate-600 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-slate-600 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 cursor-pointer flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Engineers row */}
      <div className="px-3 py-2 flex items-start gap-2 border-b border-slate-400">
        <div className="text-sm text-gray-800 font-semibold whitespace-nowrap mt-2 flex-shrink-0 flex items-center gap-1 w-16">
          <Users className="w-3 h-3" /> Engineers
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
            <p className="text-xs text-slate-700 mt-1 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" /> Auto-assign (least-busy
              from {deptEngs.length})
            </p>
          )}
        </div>
      </div>
      {/* Duration / SLA row */}
      <div className="px-3 py-1.5 bg-slate-50/40">
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
    <div className="flex flex-col gap-2">
      {steps.length === 0 ? (
        <div className="text-center py-5.5 text-slate-700 text-xs border-2 border-dashed border-slate-400 rounded-md bg-slate-50/50">
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
          className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 rounded-md py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Escalation Level
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-400 shadow-lg rounded-md z-20 overflow-hidden">
            {availableToAdd.map((dept) => {
              const cnt = loadEmployees().filter(
                (e) => (e.department || "").trim().toLowerCase() === (dept || "").trim().toLowerCase(),
              ).length;
              return (
                <div
                  key={dept}
                  onClick={() => addStep(dept)}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-blue-50/60 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs font-semibold text-slate-700">
                    {dept}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${cnt === 0 ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-gray-800"}`}
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
    <div className="bg-slate-50/80 border border-slate-400 rounded-lg p-3">
      <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1">
        <ArrowRight className="w-3 h-3 text-blue-500" />{" "}
        Escalation Chain Preview
      </h4>
      {steps.length === 0 ? (
        <span className="text-sm text-slate-700 italic">
          No levels configured
        </span>
      ) : (
        <div className="flex flex-col gap-2">
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
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5.5 h-5.5 rounded-full ${LEVEL_COLORS[i] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <span className="text-white text-xs font-bold">
                      L{i + 1}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-1.5 bg-blue-200" />
                      {dur && (
                        <span className="text-xs text-blue-500 bg-blue-50 border border-blue-100 px-1 py-px rounded-full font-semibold">
                          {dur}
                        </span>
                      )}
                      <div className="w-0.5 h-1.5 bg-blue-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white rounded-md border border-slate-400 px-2 py-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700">
                      {step.dept}
                    </div>
                    {dur && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-px rounded flex items-center gap-1">
                        <Clock className="w-2 h-2" /> {dur}
                      </span>
                    )}
                  </div>
                  {selEngs.length > 0 ? (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {selEngs.map((eng) => (
                        <span
                          key={eng.userId}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-1.5 py-px"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                            {initials(eng.name)}
                          </span>
                          {eng.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-700 italic">
                      {deptEngs.length === 0
                        ? "⚠ No engineers"
                        : `Auto from ${deptEngs.length}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <div className="w-5.5 h-5.5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3 h-3 text-blue-500" />
            </div>
            <span className="text-sm text-slate-700 italic">
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
const EscalationSection = ({ partyTypes, segments, flows, setFlows, departments, employees, onRefresh, isRefreshing }) => {
  const { canWrite, canUpdate } = useModulePermissions("escalation");
  const { toast, confirm } = useNotification();
    const [activeSubTab, setActiveSubTab] = useState("forward"); // "forward" | "reverse"
const [expandedType, setExpandedType] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState({}); // { partyTypeId: segmentName }
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [origFlows, setOrigFlows] = useState({});
  const [reverseFlows, setReverseFlows] = useState({}); // { [key]: { enabled, durationHours, durationMins, onTimeout } }
  const [origReverseFlows, setOrigReverseFlows] = useState({});

  useEffect(() => {
    if (flows && Object.keys(flows).length > 0) { setOrigFlows(JSON.parse(JSON.stringify(flows))); return; }
    const fetchFlows = async () => {
      try {
        const res = await axios.get(`${API_URL}/master/escalation-flows`);
        const s = {};
        const rev = {};
        res.data.forEach(f => {
          if (f.type !== "Service Material") {
            s[f.type] = f.steps;
            if (f.reverseEscalation) {
              rev[f.type] = f.reverseEscalation;
            }
          }
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
            rev[key] = {
              enabled: true,
              durationHours: 2,
              durationMins: 0,
              onTimeout: 'same_person'
            };
            promises.push(axios.post(`${API_URL}/master/escalation-flows`, {
              type: key,
              steps,
              reverseEscalation: rev[key]
            }));
            dbChanged = true;
          }
        });

        if (dbChanged) {
          await Promise.all(promises);
        }

        setOrigFlows(JSON.parse(JSON.stringify(s)));
        setFlows(s);
        setOrigReverseFlows(JSON.parse(JSON.stringify(rev)));
        setReverseFlows(rev);
      } catch (err) {
        toast("Failed to load escalation flows", "error");
      }
    };
    if (partyTypes && partyTypes.length > 0 && employees && employees.length > 0) {
      fetchFlows();
    }
  }, [partyTypes, employees]);
  useEffect(() => {
    const flowsChanged = JSON.stringify(flows) !== JSON.stringify(origFlows);
    const revChanged = JSON.stringify(reverseFlows) !== JSON.stringify(origReverseFlows);
    setHasChanges(flowsChanged || revChanged);
  }, [flows, origFlows, reverseFlows, origReverseFlows]);

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

  const getReverseConfig = (partyName, segName) => {
    const key = getFlowKey(partyName, segName);
    return reverseFlows[key] || {
      enabled: true,
      durationHours: 2,
      durationMins: 0,
      onTimeout: 'same_person'
    };
  };

  const updateReverseConfig = (partyName, segName, updates) => {
    const key = getFlowKey(partyName, segName);
    const current = getReverseConfig(partyName, segName);
    setReverseFlows((prev) => ({
      ...prev,
      [key]: { ...current, ...updates }
    }));
  };

  const updateFlow = (partyName, segName, steps) =>
    setFlows((prev) => ({ ...prev, [getFlowKey(partyName, segName)]: steps }));

  const resetType = (partyName, segName) => {
    const key = getFlowKey(partyName, segName);
    setFlows((prev) => ({
      ...prev,
      [key]: segName === "Default" ? DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: getDeptIds(dept),
        durationHours: 2,
        durationMins: 0,
      })) : [],
    }));
    setReverseFlows((prev) => ({
      ...prev,
      [key]: {
        enabled: true,
        durationHours: 2,
        durationMins: 0,
        onTimeout: 'same_person'
      }
    }));
  };

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
        const revConf = reverseFlows[type] || {
          enabled: true,
          durationHours: 2,
          durationMins: 0,
          onTimeout: 'same_person'
        };
        return axios.post(`${API_URL}/master/escalation-flows`, {
          type,
          steps: sanitizedSteps,
          reverseEscalation: revConf
        });
      });
      await Promise.all(promises);
      
      setFlows(sanitizedFlows);
      setOrigFlows(JSON.parse(JSON.stringify(sanitizedFlows)));
      setOrigReverseFlows(JSON.parse(JSON.stringify(reverseFlows)));
      setHasChanges(false);
      setSaved(true);
      toast("Escalation & Reverse Escalation flows saved successfully");
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
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      {/* Top Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-400 bg-gradient-to-r from-blue-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-6.5 h-6.5 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
            <PhoneCall className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Call Escalation Flows
              {hasChanges && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-px rounded-md uppercase tracking-wider font-bold">
                  Pending Changes
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-800">
              Define per-level escalation paths, engineers & SLA durations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh && onRefresh("escalation", true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-blue-600 rounded-md px-3 py-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh latest data from server"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          {(canWrite || canUpdate) && (
            <>
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-md px-3 py-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3 h-3 text-slate-700" />
                <span>Reset All</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-3.5 py-1.5 transition-all cursor-pointer shadow-2xs ${
                  saved
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {saved ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>{saved ? "Saved!" : "Save Flows"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar for Escalation Mode - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-50/90 border-b border-slate-200">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-md border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab("forward")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "forward"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Clock className={`w-3 h-3 ${activeSubTab === "forward" ? "text-blue-600" : "text-slate-700"}`} />
            <span>Service Call SLA & Forward Levels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("reverse")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "reverse"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <RotateCcw className={`w-3 h-3 ${activeSubTab === "reverse" ? "text-indigo-600" : "text-slate-700"}`} />
            <span>Reverse Escalation Rules</span>
          </button>
        </div>
        <div className="text-sm text-slate-700 font-normal">
          {activeSubTab === "forward"
            ? "Configure tiered departments, engineer assignment & step timeouts"
            : "Configure return SLA timers and timeout behaviors when sending back calls"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3.5">
        {activeSubTab === "reverse" ? (
          /* ── REVERSE ESCALATION DEDICATED VIEW (TABLE VIEW) ── */
          <div className="bg-white border border-slate-300 rounded-md shadow-2xs flex flex-col">
            <div className="overflow-visible">
              <table className="w-full border-collapse border border-slate-200 text-left font-sans text-slate-800">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-sm font-bold text-slate-700 tracking-wider">
                    <th className="py-2.5 px-3.5 w-14 text-center border-r border-slate-200 whitespace-nowrap">S.No</th>
                    <th className="py-2.5 px-4 w-52 border-r border-slate-200 whitespace-nowrap">Customer / Party Type</th>
                    <th className="py-2.5 px-3.5 w-28 text-center border-r border-slate-200 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-4 w-80 border-r border-slate-200 whitespace-nowrap">Return SLA Timer (Grace Period)</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Timeout Action (If Not Attended)</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {partyTypes.map((type, tIdx) => {
                    const color = TYPE_COLORS[tIdx % TYPE_COLORS.length];
                    const rev = getReverseConfig(type.name, "Default");
                    const isEnabled = rev.enabled !== false;

                    return (
                      <tr
                        key={type.id || type.name}
                        className={`border-b border-slate-200 transition-colors ${
                          !isEnabled ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* S.No */}
                        <td className="py-3 px-3.5 text-center text-slate-700 font-semibold text-xs border-r border-slate-200">
                          {tIdx + 1}
                        </td>

                        {/* Customer / Party Type */}
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-xs">
                              {type.name}
                            </span>
                            {type.code && (
                              <span className="text-sm text-slate-700 font-mono font-medium">
                                ({type.code})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle - Pure Clean Checkbox + Plain Text (No Pill) */}
                        <td className="py-3 px-3.5 text-center border-r border-slate-200">
                          <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) =>
                                updateReverseConfig(type.name, "Default", { enabled: e.target.checked })
                              }
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={`text-xs font-semibold ${isEnabled ? "text-slate-800" : "text-slate-700"}`}>
                              {isEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        </td>

                        {/* Return SLA Timer */}
                        <td className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className={`flex items-center gap-2.5 whitespace-nowrap ${!isEnabled ? "pointer-events-none" : ""}`}>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="72"
                                value={rev.durationHours ?? 2}
                                onChange={(e) =>
                                  updateReverseConfig(type.name, "Default", {
                                    durationHours: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEnabled}
                                className="w-[52px] border border-slate-300 rounded-md px-1.5 py-1 text-xs font-mono text-center font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none bg-white disabled:bg-slate-100"
                              />
                              <span className="text-sm text-slate-600 font-medium">hrs</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={rev.durationMins ?? 0}
                                onChange={(e) =>
                                  updateReverseConfig(type.name, "Default", {
                                    durationMins: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEnabled}
                                className="w-[52px] border border-slate-300 rounded-md px-1.5 py-1 text-xs font-mono text-center font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none bg-white disabled:bg-slate-100"
                              />
                              <span className="text-sm text-slate-600 font-medium">mins</span>
                            </div>

                            <span className="text-sm text-slate-700 italic ml-1.5 whitespace-nowrap inline-block">
                              (Halts on attend)
                            </span>
                          </div>
                        </td>

                        {/* Timeout Action */}
                        <td className="py-3 px-4">
                          <div className={`max-w-96 ${!isEnabled ? "pointer-events-none" : ""}`}>
                            <CustomDropdown
                              size="sm"
                              value={rev.onTimeout || "same_person"}
                              onChange={(val) =>
                                updateReverseConfig(type.name, "Default", { onTimeout: val })
                              }
                              options={[
                                { value: "same_person", label: "Extend SLA with same person (Notify again)" },
                                { value: "next_in_chain", label: "Escalate to next level engineer in hierarchy" },
                                { value: "critical", label: "Mark as Critical Unresolved (Trigger Admin Alert)" },
                              ]}
                              disabled={!isEnabled}
                              triggerClassName="w-full !rounded-md text-xs font-medium border-slate-300 text-slate-800 bg-white"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        
        ) : partyTypes.length === 0 ? (
          <div className="bg-slate-50 border border-slate-400 rounded-lg p-11 text-center">
            <Shield className="w-11 h-11 text-slate-600 mx-auto mb-3.5" />
            <p className="text-slate-700 text-xs">
              No party types configured
            </p>
            <p className="text-slate-600 text-xs mt-1">
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
                className={`bg-white border ${color.border} rounded-lg shadow-sm overflow-visible transition-all hover:shadow-md`}
              >
                <div
                  className={`flex items-center justify-between p-3.5 cursor-pointer select-none ${color.headerBg} ${isExpanded ? `border-b ${color.border}` : ""} rounded-t-[8px]`}
                  onClick={() => setExpandedType(isExpanded ? null : type.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Shield
                      className={`w-4 h-4 flex-shrink-0 ${color.accent}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md ${color.badge} shadow-sm border border-slate-400/20`}
                        >
                          {type.name}
                        </span>
                      </div>
                      {/* High-fidelity minimalism: No metadata in collapsed state */}
                    </div>
                  </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-700" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-700" />
                      )}
                    </div>
                  </div>
                {isExpanded && (
                  <div className="flex border-t border-slate-400 min-h-[360px] max-h-[504px]">
                    {/* Left Side: Segment Selector Sidebar */}
                    <div className="w-44 bg-slate-50/50 border-r border-slate-400 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1.5 mb-1">Product Segments</p>
                      
                      <button 
                        onClick={() => setSelectedSegment(prev => ({...prev, [type.id]: "Default"}))}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-bold transition-all ${curSeg === "Default" ? "bg-white text-blue-600 shadow-sm border border-blue-100 italic" : "text-gray-800 hover:bg-slate-200/50 hover:text-slate-700"}`}
                      >
                        Default SLA
                        {curSeg === "Default" && <ChevronRight className="w-3 h-3" />}
                      </button>

                      <div className="h-px bg-slate-200 my-1" />

                      {segments.map(s => {
                        const isSel = curSeg === s.name;
                        return (
                          <button 
                            key={s.id}
                            onClick={() => setSelectedSegment(prev => ({...prev, [type.id]: s.name}))}
                            className={`flex flex-col px-3 py-2.5 rounded-md transition-all text-left border ${isSel ? "bg-white border-blue-200 text-blue-700 shadow-sm ring-2 ring-blue-50" : "border-transparent text-gray-800 hover:bg-slate-200/40 hover:text-slate-700"}`}
                          >
                            <span className="text-xs font-bold flex items-center justify-between">
                              {s.name}
                              {isSel && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Side: Flow Editor Content */}
                    <div className="flex-1 p-4 bg-white overflow-y-auto">
                      <div className="flex items-center justify-between mb-3.5">
                         <div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              Configuring Flow for <span className="text-blue-600 underline decoration-blue-200 decoration-2 underline-offset-4">{curSeg === "Default" ? `All ${type.name} Segments` : curSeg}</span>
                            </h4>

                         </div>
                         <div className="flex items-center gap-2">
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
                              className="text-sm text-slate-700 hover:text-slate-700 border border-slate-400 hover:border-slate-400 bg-white px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 transition-all font-bold"
                            >
                                Reset Segment
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-5 gap-5.5">
                        <div className="col-span-3 flex flex-col gap-3.5">
                          <FlowEditor
                            steps={steps}
                            departments={departments}
                            employees={employees}
                            onChange={(s) => updateFlow(type.name, curSeg, s)}
                          />

                        </div>
                        <div className="col-span-2 flex flex-col gap-3">
                          <ChainPreview steps={steps} employees={employees} />
                          <div className="bg-slate-50/80 border border-slate-400 rounded-lg p-2.5">
                            <h4 className="text-sm font-bold text-slate-600 mb-1.5">
                              Legend
                            </h4>
                            <div className="flex flex-col gap-1 text-sm text-gray-800">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3 h-3 text-blue-500" />{" "}
                                Selected engineers tried first (round-robin)
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-slate-700" />{" "}
                                Empty = auto (least busy in dept)
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-amber-400" />{" "}
                                Duration = SLA before auto-escalating to next
                                level
                              </div>
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />{" "}
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
        <div className="flex-shrink-0 bg-white border-t border-amber-200 p-3 flex items-center justify-between shadow-lg">
          <span className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Unsaved Changes — Please save to apply these updates
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5.5 py-2.5 rounded-md font-semibold cursor-pointer text-sm transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Now
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Employee & Department Management
// ─────────────────────────────────────────────────────────────────────────────


export default EscalationSection;
