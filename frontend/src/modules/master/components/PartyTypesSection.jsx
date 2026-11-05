import { Icon } from "@iconify/react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS,
  loadCustomerDb
} from "./masterConstants";

const PartyTypesSection = ({ partyTypes = [], setPartyTypes }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("partyTypes");
  const safePartyTypes = Array.isArray(partyTypes) ? partyTypes : [];
  const { toast, confirm } = useNotification();
  const [newType, setNewType] = useState({
    name: ""
  });
  const [editingType, setEditingType] = useState(null);

  const handleAdd = async () => {
    const t = newType.name.trim();
    if (!t) return;
    if (safePartyTypes.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/party-types`, newType);
      const newItem = { ...res.data, id: res.data._id };
      setPartyTypes([...safePartyTypes, newItem]);
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
      safePartyTypes.some(
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
        safePartyTypes.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Category updated");
    } catch (err) {
      toast("Failed to update category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    if (safePartyTypes.length === 1) {
      toast("Cannot delete the last category!", "warning");
      return;
    }
    const type = safePartyTypes.find((t) => t.id === id || t._id === mongoId);
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
        const remaining = safePartyTypes.filter((t) => t.id !== id && t._id !== mongoId);
        setPartyTypes(remaining);
        toast("Category deleted successfully");
      } catch (err) {
        toast("Failed to delete category", "error");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-[1.4vw] grid grid-cols-1 lg:grid-cols-12 gap-[1.8vw] items-start">
        {/* Left Column: Categories List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100">
            <div>
              <h3 className="text-[0.88vw] font-bold text-gray-900">Configured Categories</h3>
              <p className="text-[0.72vw] text-gray-500">Manage client classification groups</p>
            </div>
            <span className="text-[0.7vw] font-semibold text-gray-500 bg-gray-100 px-[0.6vw] py-[0.2vw] rounded-full">
              {safePartyTypes.length} total
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-[0.6vw] bg-white overflow-hidden max-h-[60vh] overflow-y-auto">
            {safePartyTypes.length === 0 ? (
              <div className="p-[3vw] text-center text-gray-400 text-[0.8vw]">
                No categories configured yet.
              </div>
            ) : (
              safePartyTypes.map((type, idx) => {
                const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                const isEditingThis = editingType && (editingType._id === type._id || editingType.id === type.id);
                return (
                  <div
                    key={type.id || type._id}
                    className={`flex items-center justify-between px-[1vw] py-[0.75vw] transition-colors group ${
                      isEditingThis ? "bg-blue-50/70" : "hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-[0.7vw]">
                      <span className="w-[1.6vw] h-[1.6vw] rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[0.72vw] font-bold">
                        {idx + 1}
                      </span>
                      <span className={`text-[0.76vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.35vw] border ${badgeClass}`}>
                        {type.name}
                      </span>
                    </div>

                    {(canUpdate || canDelete) && (
                      <div className="flex items-center gap-[0.4vw] opacity-0 group-hover:opacity-100 transition-opacity">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => setEditingType({ ...type })}
                            className="p-[0.35vw] text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-[0.3vw] transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(type.id, type._id)}
                            className="p-[0.35vw] text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-[0.3vw] transition-colors cursor-pointer"
                            disabled={safePartyTypes.length === 1}
                            title="Delete Category"
                          >
                            <Icon icon="solar:trash-bin-trash-linear" className="w-[0.95vw] h-[0.95vw]" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Clean Form Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-[0.6vw] p-[1.2vw]">
          {editingType ? (
            canUpdate ? (
              <div className="space-y-[1vw]">
                <div className="flex items-center justify-between pb-[0.5vw] border-b border-gray-200">
                  <div className="flex items-center gap-[0.4vw]">
                    <Edit2 className="w-[1vw] h-[1vw] text-blue-600" />
                    <h4 className="text-[0.88vw] font-bold text-gray-900">Edit Category</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="text-gray-400 hover:text-gray-600 text-[0.72vw]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-[0.35vw]">
                  <label className="text-[0.74vw] font-semibold text-gray-700">Category Name *</label>
                  <input
                    type="text"
                    value={editingType.name}
                    onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                    placeholder="e.g. Domestic, Export..."
                    className="w-full bg-white border border-gray-300 rounded-[0.4vw] px-[0.75vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>

                <div className="flex gap-[0.5vw] pt-[0.2vw]">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={!editingType.name.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-[0.45vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="px-[1vw] bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-[0.45vw] rounded-[0.4vw] text-[0.8vw] font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-[2vw] text-center text-gray-400 text-[0.78vw]">
                You do not have permission to edit categories.
              </div>
            )
          ) : canWrite ? (
            <div className="space-y-[1vw]">
              <div className="pb-[0.5vw] border-b border-gray-200">
                <h4 className="text-[0.88vw] font-bold text-gray-900 flex items-center gap-[0.4vw]">
                  <Icon icon="solar:add-circle-bold-duotone" className="w-[1.05vw] h-[1.05vw] text-emerald-600" />
                  Add New Category
                </h4>
                <p className="text-[0.7vw] text-gray-500">Create a new customer classification tag</p>
              </div>

              <div className="space-y-[0.35vw]">
                <label className="text-[0.74vw] font-semibold text-gray-700">Category Name *</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="e.g. OEM, Tier 1, Direct Customer..."
                  className="w-full bg-white border border-gray-300 rounded-[0.4vw] px-[0.75vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!newType.name.trim()}
                className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Icon icon="solar:add-circle-linear" className="w-[0.9vw] h-[0.9vw]" /> Add Category
              </button>
            </div>
          ) : (
            <div className="p-[2vw] text-center text-gray-400 text-[0.78vw] flex flex-col items-center justify-center gap-[0.4vw]">
              <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1.8vw] h-[1.8vw] text-gray-300" />
              <span>Read-only access. You can view existing categories on the left.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  

};

// ─────────────────────────────────────────────────────────────────────────────

export default PartyTypesSection;
