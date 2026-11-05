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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS
} from "./masterConstants";

const SitesSection = ({ sites = [], setSites }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("sites");
  const safeSites = Array.isArray(sites) ? sites : [];
  const { toast, confirm } = useNotification();
  const [newSiteName, setNewSiteName] = useState("");
  const [editingSite, setEditingSite] = useState(null);

  const handleAdd = async () => {
    const t = newSiteName.trim();
    if (!t) return;
    if (safeSites.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Site already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/sites`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      const updated = [...safeSites, newItem];
      setSites(updated);
      sessionStorage.setItem("master_sites", JSON.stringify(updated));
      setNewSiteName("");
      toast("Site added successfully");
    } catch (err) {
      toast("Failed to add site", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingSite?.name?.trim()) return;
    const t = editingSite.name.trim();
    if (
      safeSites.some(
        (x) =>
          x.id !== editingSite.id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Site already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/sites/${editingSite._id || editingSite.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      const updated = safeSites.map((x) => (x.id === editingSite.id || x._id === editingSite._id ? updatedItem : x));
      setSites(updated);
      sessionStorage.setItem("master_sites", JSON.stringify(updated));
      setEditingSite(null);
      toast("Site updated");
    } catch (err) {
      toast("Failed to update site", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const site = safeSites.find((t) => t.id === id || t._id === mongoId);
    const confirmed = await confirm({
      title: "Delete Site",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{site.name}"</span>?</p>
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/sites/${mongoId || id}`);
        const remaining = safeSites.filter((t) => t.id !== id && t._id !== mongoId);
        setSites(remaining);
        sessionStorage.setItem("master_sites", JSON.stringify(remaining));
        toast("Site deleted successfully");
      } catch (err) {
        toast("Failed to delete site", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Existing Sites
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {safeSites.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No sites yet
              </div>
            ) : (
              safeSites.map((site, idx) => {
                const badgeClass =
                  TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                return (
                  <div
                    key={site.id || site._id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors"
                  >
                    {editingSite && (editingSite._id === site._id || editingSite.id === site.id) ? (
                      <div className="flex flex-1 items-center gap-[0.5vw]">
                        <input
                          autoFocus
                          type="text"
                          value={editingSite.name}
                          onChange={(e) =>
                            setEditingSite({
                              ...editingSite,
                              name: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate();
                            if (e.key === "Escape") setEditingSite(null);
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
                          onClick={() => setEditingSite(null)}
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
                          {site.name}
                        </span>
                        
                        {(canUpdate || canDelete) && (
                          <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingSite({ id: site.id, _id: site._id, name: site.name })
                                }
                                className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                                title="Edit Site"
                              >
                                <Icon icon="solar:pen-new-square-linear" className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(site.id, site._id)}
                                className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                                title="Delete Site"
                              >
                                <Icon icon="solar:trash-bin-trash-linear" className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            )}
                          </div>
                        )}
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
              Add New Site
            </p>
            {canWrite ? (
              <div className="flex gap-[0.5vw]">
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="e.g. Unit 1, Unit 2, Unit 3…"
                  className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newSiteName.trim()}
                  className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-[0.9vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-semibold transition-all"
                >
                  <Icon icon="solar:add-circle-linear" className="w-[0.9vw] h-[0.9vw]" /> Add
                </button>
              </div>
            ) : (
              <div className="p-[1.5vw] text-center text-slate-400 text-[0.78vw] border border-dashed border-slate-300 rounded-[0.4vw] flex flex-col items-center justify-center gap-[0.3vw]">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1.4vw] h-[1.4vw] text-slate-300" />
                <span>Read-only access. You can view existing sites on the left.</span>
              </div>
            )}
          </div>
          {safeSites.length > 0 && (
            <div className="bg-slate-50 border border-slate-400 rounded-[0.4vw] p-[0.7vw]">
              <p className="text-[0.68vw] font-semibold text-gray-800 mb-[0.5vw]">
                Preview
              </p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {safeSites.map((site, idx) => (
                  <span
                    key={site.id || site._id}
                    className={`text-[0.72vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length]}`}
                  >
                    {site.name}
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


export default SitesSection;
