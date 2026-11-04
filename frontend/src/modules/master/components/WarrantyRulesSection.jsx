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

export default WarrantyRulesSection;
