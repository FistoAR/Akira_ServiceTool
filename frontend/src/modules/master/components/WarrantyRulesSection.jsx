import { Icon } from "@iconify/react";
import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import CustomDropdown from "../../../components/CustomDropdown";
import useModulePermissions from "../../../components/useModulePermissions";
import {
  Settings, Plus, X, Edit2, Trash2, Clock, Search, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  API_URL, TYPE_BADGE_COLORS
} from "./masterConstants";

const ITEMS_PER_PAGE = 8;

const WarrantyRulesSection = ({ warrantyRules = [], setWarrantyRules, segments = [] }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("warrantyRules");
  const { toast, confirm } = useNotification();
  const [newRule, setNewRule] = useState({
    productSegment: "Default",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleAdd = async () => {
    const seg = newRule.productSegment || "Default";
    if (!seg) {
      toast("Please select a Product Segment", "warning");
      return;
    }
    if (warrantyRules.some((x) => (x.productSegment || x.partyType || "").toLowerCase() === seg.toLowerCase())) {
      toast("Warranty rule for this product segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/warranty-rules`, { ...newRule, productSegment: seg });
      const newItem = { ...res.data, id: res.data._id, productSegment: res.data.productSegment || seg };
      setWarrantyRules([...warrantyRules, newItem]);
      setNewRule({
        productSegment: "Default",
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
    if (!editingRule?.productSegment && !editingRule?.partyType) return;
    const seg = editingRule.productSegment || editingRule.partyType;
    if (
      warrantyRules.some(
        (x) =>
          x.id !== editingRule.id &&
          x._id !== editingRule._id &&
          (x.productSegment || x.partyType || "").toLowerCase() === seg.toLowerCase(),
      )
    ) {
      toast("Warranty rule for this product segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/warranty-rules/${editingRule._id || editingRule.id}`, {
        ...editingRule,
        productSegment: seg
      });
      const updatedItem = { ...res.data, id: res.data._id, productSegment: res.data.productSegment || seg };
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
    const segName = rule?.productSegment || rule?.partyType || "this segment";
    const confirmed = await confirm({
      title: "Delete Warranty Rule",
      message: `Are you sure you want to delete the warranty rule for "${segName}"?`,
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

  const testWeek = (testSerial || "").substring(wkStart, wkStart + wkLen);
  const testYear = (testSerial || "").substring(yrStart, yrStart + yrLen);

  const filteredRules = useMemo(() => {
    return (warrantyRules || []).filter((rule) => {
      const segName = (rule.productSegment || rule.partyType || "Default").toLowerCase();
      return segName.includes(searchTerm.toLowerCase());
    });
  }, [warrantyRules, searchTerm]);

  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE) || 1;
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRules.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRules, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
      <div className="flex-1 p-[1.4vw] grid grid-cols-1 lg:grid-cols-12 gap-[1.8vw] overflow-hidden min-h-0 items-start">
        {/* Left Column: Rules Table */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100 shrink-0 gap-[1vw]">
            <div>
              <h3 className="text-[0.88vw] font-bold text-gray-900">Configured Warranty Rules</h3>
              <p className="text-[0.72vw] text-gray-500">Segment-specific serial index decoders and resolution SLA targets</p>
            </div>
            <div className="flex items-center gap-[0.6vw]">
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[11vw] pl-[1.8vw] pr-[0.6vw] py-[0.3vw] border border-gray-200 rounded-[0.4vw] text-[0.75vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 bg-white text-gray-800 placeholder-gray-400 transition-all"
                />
              </div>
              <span className="text-[0.7vw] font-semibold text-gray-500 bg-gray-100 px-[0.6vw] py-[0.2vw] rounded-full flex-shrink-0">
                {warrantyRules.length} rules
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden border border-gray-200 rounded-[0.6vw] bg-white flex flex-col shadow-2xs">
            <div className="flex-1 overflow-y-auto">
              {paginatedRules.length === 0 ? (
                <div className="p-[3vw] text-center text-gray-400 text-[0.8vw]">
                  {searchTerm ? "No warranty rules match your search." : "No warranty rules defined yet."}
                </div>
              ) : (
                <table className="w-full border-collapse text-[0.78vw] text-left text-gray-800">
                  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-600 text-[0.74vw] font-bold">
                      <th className="px-[0.8vw] py-[0.6vw]">Segment</th>
                      <th className="px-[0.8vw] py-[0.6vw]">Decoder Config</th>
                      <th className="px-[0.8vw] py-[0.6vw]">Period</th>
                      <th className="px-[0.8vw] py-[0.6vw]">Free SLA</th>
                      <th className="px-[0.8vw] py-[0.6vw]">Paid SLA</th>
                      <th className="px-[0.8vw] py-[0.6vw] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRules.map((rule, idx) => {
                      const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                      const badgeClass = TYPE_BADGE_COLORS[globalIdx % TYPE_BADGE_COLORS.length];
                      const label = rule.productSegment || rule.partyType || "Default";
                      const isEditingThis = editingRule && (editingRule._id === rule._id || editingRule.id === rule.id);
                      return (
                        <tr 
                          key={rule.id || rule._id || idx}
                          className={`transition-colors group ${
                            isEditingThis ? "bg-blue-50/70" : "hover:bg-gray-50/70"
                          }`}
                        >
                          <td className="px-[0.8vw] py-[0.65vw] font-semibold">
                            <span className={`px-[0.55vw] py-[0.15vw] rounded-[0.35vw] border text-[0.72vw] ${badgeClass}`}>
                              {label}
                            </span>
                          </td>
                          <td className="px-[0.8vw] py-[0.65vw] font-mono text-[0.72vw] text-gray-600">
                            Wk: [{rule.weekStartIdx ?? 3}:{rule.weekLength ?? 2}] · Yr: [{rule.yearStartIdx ?? 5}:{rule.yearLength ?? 2}]
                          </td>
                          <td className="px-[0.8vw] py-[0.65vw] text-gray-700 font-medium">
                            {rule.warrantyPeriodYears ?? 1} yr
                          </td>
                          <td className="px-[0.8vw] py-[0.65vw] font-semibold text-emerald-700">
                            {rule.warrantySLADays ?? 7}d
                          </td>
                          <td className="px-[0.8vw] py-[0.65vw] font-semibold text-amber-700">
                            {rule.postWarrantySLADays ?? 10}d
                          </td>
                          <td className="px-[0.8vw] py-[0.65vw]">
                            {(canUpdate || canDelete) ? (
                              <div className="flex justify-center items-center gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                                {canUpdate && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingRule({ ...rule, productSegment: label })}
                                    className="p-[0.3vw] text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer transition-colors"
                                    title="Edit rule"
                                  >
                                    <Icon icon="solar:pen-new-square-linear" className="w-[0.9vw] h-[0.9vw]" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(rule.id, rule._id)}
                                    className="p-[0.3vw] text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-[0.25vw] cursor-pointer transition-colors"
                                    title="Delete rule"
                                  >
                                    <Icon icon="solar:trash-bin-trash-linear" className="w-[0.9vw] h-[0.9vw]" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[0.68vw] text-gray-400 italic block text-center">View</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredRules.length > 0 && (
              <div className="border-t border-gray-100 px-[1vw] py-[0.55vw] bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="text-[0.74vw] text-gray-500 font-medium">
                  Showing <span className="text-gray-900 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length)}</span> of <span className="text-gray-900 font-semibold">{filteredRules.length}</span> rules
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-[0.3vw] border border-gray-200 rounded-[0.35vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                  <div className="flex gap-[0.25vw]">
                    {[...Array(totalPages)].map((_, i) => {
                      const pNum = i + 1;
                      if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                        if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-gray-400 text-[0.7vw]">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-[1.6vw] h-[1.6vw] flex items-center justify-center rounded-[0.35vw] text-[0.74vw] font-semibold transition-all cursor-pointer ${
                            currentPage === pNum
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
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
                    disabled={currentPage === totalPages}
                    className="p-[0.3vw] border border-gray-200 rounded-[0.35vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Next page"
                  >
                    <ChevronRight className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Setup Form & Tester */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-[0.6vw] p-[1.2vw] flex flex-col h-full overflow-hidden">
          <div className="pb-[0.5vw] border-b border-gray-200 shrink-0">
            <h4 className="text-[0.88vw] font-bold text-gray-900">
              {editingRule ? `Edit Rule: ${editingRule.productSegment || editingRule.partyType}` : "Add Warranty Rule"}
            </h4>
            <p className="text-[0.7vw] text-gray-500">Configure indexing parameters and resolution timelines</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-[0.3vw] space-y-[1vw] mt-[0.8vw]">
            {/* 1. Target Segment */}
            <div className="space-y-[0.35vw]">
              <label className="text-[0.74vw] font-semibold text-gray-700">Target Product Segment *</label>
              <CustomDropdown
                options={[
                  { value: "Default", label: "Default (Fallback Rule)" },
                  ...(segments || []).map((s) => ({ value: s.name, label: s.name })),
                ]}
                value={editingRule ? (editingRule.productSegment || editingRule.partyType) : newRule.productSegment}
                onChange={(val) =>
                  editingRule
                    ? setEditingRule({ ...editingRule, productSegment: val })
                    : setNewRule({ ...newRule, productSegment: val })
                }
                searchable
                size="md"
                className="w-full bg-white"
              />
            </div>

            {/* 2. Serial decoder configuration */}
            <div className="space-y-[0.6vw] pt-[0.4vw] border-t border-gray-200">
              <span className="text-[0.74vw] font-bold text-gray-900 block">Serial Number Indexing</span>
              
              <div className="grid grid-cols-2 gap-[0.7vw]">
                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Week Start Index *</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule ? (editingRule.weekStartIdx ?? 3) : newRule.weekStartIdx}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, weekStartIdx: parseInt(e.target.value, 10) || 0 })
                        : setNewRule({ ...newRule, weekStartIdx: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                  <p className="text-[0.65vw] text-gray-400">0-based character index</p>
                </div>

                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Week Length (digits) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.weekLength ?? 2) : newRule.weekLength}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, weekLength: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, weekLength: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                  <p className="text-[0.65vw] text-gray-400">Standard 2 digits (e.g. 52)</p>
                </div>

                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Year Start Index *</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule ? (editingRule.yearStartIdx ?? 5) : newRule.yearStartIdx}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, yearStartIdx: parseInt(e.target.value, 10) || 0 })
                        : setNewRule({ ...newRule, yearStartIdx: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                  <p className="text-[0.65vw] text-gray-400">0-based character index</p>
                </div>

                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Year Length (digits) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.yearLength ?? 2) : newRule.yearLength}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, yearLength: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, yearLength: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                  <p className="text-[0.65vw] text-gray-400">Standard 2 digits (e.g. 26)</p>
                </div>
              </div>
            </div>

            {/* 3. Duration & SLAs */}
            <div className="space-y-[0.6vw] pt-[0.4vw] border-t border-gray-200">
              <span className="text-[0.74vw] font-bold text-gray-900 block">Warranty Durations & SLAs</span>

              <div className="grid grid-cols-3 gap-[0.6vw]">
                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Warranty (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.warrantyPeriodYears ?? 1) : newRule.warrantyPeriodYears}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, warrantyPeriodYears: parseInt(e.target.value, 10) || 1 })
                        : setNewRule({ ...newRule, warrantyPeriodYears: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Under-Warranty SLA *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.warrantySLADays ?? 7) : newRule.warrantySLADays}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, warrantySLADays: parseInt(e.target.value, 10) || 7 })
                        : setNewRule({ ...newRule, warrantySLADays: parseInt(e.target.value, 10) || 7 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-[0.25vw]">
                  <label className="text-[0.7vw] font-medium text-gray-600">Post-Warranty SLA *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule ? (editingRule.postWarrantySLADays ?? 10) : newRule.postWarrantySLADays}
                    onChange={(e) =>
                      editingRule
                        ? setEditingRule({ ...editingRule, postWarrantySLADays: parseInt(e.target.value, 10) || 10 })
                        : setNewRule({ ...newRule, postWarrantySLADays: parseInt(e.target.value, 10) || 10 })
                    }
                    className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.38vw] text-[0.82vw] outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 4. Real-time test decoder strip */}
            <div className="space-y-[0.5vw] pt-[0.4vw] border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-[0.74vw] font-bold text-gray-900">Live Serial Tester</span>
                <span className="text-[0.65vw] bg-emerald-50 text-emerald-700 font-semibold px-[0.4vw] py-[0.05vw] rounded border border-emerald-200">ACTIVE</span>
              </div>
              
              <input
                type="text"
                value={testSerial}
                onChange={(e) => setTestSerial(e.target.value)}
                placeholder="Paste or type sample serial..."
                className="w-full bg-white border border-gray-300 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-[0.82vw] outline-none font-mono font-medium text-gray-800"
              />

              <div className="flex flex-wrap gap-[0.2vw] font-mono pt-[0.1vw]">
                {(testSerial || "").split("").map((char, index) => {
                  const isWeek = index >= wkStart && index < wkStart + wkLen;
                  const isYear = index >= yrStart && index < yrStart + yrLen;

                  let colorClass = "bg-white text-gray-700 border-gray-200";
                  if (isWeek) colorClass = "bg-orange-100 text-orange-800 border-orange-300 font-bold";
                  else if (isYear) colorClass = "bg-purple-100 text-purple-800 border-purple-300 font-bold";

                  return (
                    <div key={index} className={`flex flex-col items-center border rounded-[0.2vw] px-[0.4vw] py-[0.1vw] ${colorClass}`}>
                      <span className="text-[0.8vw]">{char}</span>
                      <span className="text-[0.62vw] text-gray-400">{index}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[0.76vw] pt-[0.2vw]">
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-gray-500">Decoded Week:</span>
                  <span className="font-bold text-orange-700 font-mono bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">{testWeek || "—"}</span>
                </div>
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-gray-500">Decoded Year:</span>
                  <span className="font-bold text-purple-700 font-mono bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{testYear ? `20${testYear}` : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-[0.8vw] border-t border-gray-200 shrink-0">
            {editingRule ? (
              canUpdate ? (
                <div className="flex gap-[0.5vw]">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-[0.45vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    className="px-[1vw] bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-[0.45vw] rounded-[0.4vw] text-[0.8vw] font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="w-full text-center text-gray-400 text-[0.76vw] py-[0.3vw]">
                  Read-only view. Editing is disabled.
                </div>
              )
            ) : canWrite ? (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Icon icon="solar:add-circle-linear" className="w-[0.9vw] h-[0.9vw]" /> Add Warranty Rule
              </button>
            ) : (
              <div className="w-full text-center text-gray-400 text-[0.76vw] py-[0.3vw] flex items-center justify-center gap-[0.3vw]">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[0.9vw] h-[0.9vw] text-gray-400" />
                <span>Read-only access. New rule creation disabled.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  

};

export default WarrantyRulesSection;
