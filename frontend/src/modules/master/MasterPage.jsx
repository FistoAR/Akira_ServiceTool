import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Tags, Settings, Package, Columns, Activity, MapPin, Users,
  ShieldCheck, PhoneCall, Wrench, RefreshCw, Loader2
} from "lucide-react";

import {
  API_URL, DEFAULT_DEPTS, DEFAULT_COL_VIS, COLUMN_VIS_KEY
} from "./components/masterConstants";

// Extracted Tab Components
import PartyTypesSection from "./components/PartyTypesSection";
import WarrantyRulesSection from "./components/WarrantyRulesSection";
import ProductSegmentsSection from "./components/ProductSegmentsSection";
import FourMCategoriesSection from "./components/FourMCategoriesSection";
import UnitsSection from "./components/UnitsSection";
import SitesSection from "./components/SitesSection";
import EscalationSection from "./components/EscalationSection";
import ServiceMaterialEscalationSection from "./components/ServiceMaterialEscalationSection";
import EmployeeManagementSection from "./components/EmployeeManagementSection";
import RoleAccessSection from "./components/RoleAccessSection";
import ColumnVisibilitySection from "./components/ColumnVisibilitySection";

const SystemSettingsPage = () => {
  const getCachedArray = (key) => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item || item === "undefined" || item === "null") return null;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "categories";

  const [partyTypes, setPartyTypes] = useState([]);
  const [warrantyRules, setWarrantyRules] = useState([]);
  const [units, setUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [segments, setSegments] = useState([]);
  const [fourMCategories, setFourMCategories] = useState([]);
  const [flows, setFlows] = useState({});
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [colVis, setColVis] = useState({ ...DEFAULT_COL_VIS });
  const [isLoading, setIsLoading] = useState(true);

  // ── True Per-Tab Independent Lazy Fetching ──
  const fetchActiveTabData = async (targetTab = activeTab, force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      switch (targetTab) {
        case "categories": {
          const cached = !force ? getCachedArray("master_party_types") : null;
          if (cached) {
            setPartyTypes(cached);
          } else {
            const res = await axios.get(`${API_URL}/master/party-types`);
            const norm = Array.isArray(res.data) ? res.data.map(t => ({ ...t, id: t.id || t._id })) : [];
            const finalPT = norm.length ? norm : [{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }];
            setPartyTypes(finalPT);
            sessionStorage.setItem("master_party_types", JSON.stringify(finalPT));
          }
          break;
        }

        case "warranty-rules": {
          const cachedRules = sessionStorage.getItem("master_warranty_rules");
          const cachedSegs = sessionStorage.getItem("master_segments");

          if (!force && cachedRules && cachedSegs) {
            setWarrantyRules(JSON.parse(cachedRules));
            setSegments(JSON.parse(cachedSegs));
          } else {
            const [rulesRes, segRes] = await Promise.all([
              axios.get(`${API_URL}/master/warranty-rules`),
              axios.get(`${API_URL}/master/product-segments`)
            ]);
            const normRules = rulesRes.data.map(r => ({ ...r, id: r.id || r._id, productSegment: r.productSegment || r.partyType || "Default" }));
            const normSegs = segRes.data.map(s => ({ ...s, id: s.id || s._id }));
            setWarrantyRules(normRules);
            setSegments(normSegs);
            sessionStorage.setItem("master_warranty_rules", JSON.stringify(normRules));
            sessionStorage.setItem("master_segments", JSON.stringify(normSegs));
          }
          break;
        }

        case "segments": {
          const cached = sessionStorage.getItem("master_segments");
          if (!force && cached) {
            setSegments(JSON.parse(cached));
          } else {
            const res = await axios.get(`${API_URL}/master/product-segments`);
            const norm = res.data.map(s => ({ ...s, id: s.id || s._id }));
            setSegments(norm);
            sessionStorage.setItem("master_segments", JSON.stringify(norm));
          }
          break;
        }

        case "four-m": {
          const cached = sessionStorage.getItem("master_four_m");
          if (!force && cached) {
            setFourMCategories(JSON.parse(cached));
          } else {
            const res = await axios.get(`${API_URL}/master/four-m-categories`);
            const norm = res.data.map(s => ({ ...s, id: s.id || s._id }));
            setFourMCategories(norm);
            sessionStorage.setItem("master_four_m", JSON.stringify(norm));
          }
          break;
        }

        case "units": {
          const cached = sessionStorage.getItem("master_units");
          if (!force && cached) {
            setUnits(JSON.parse(cached));
          } else {
            const res = await axios.get(`${API_URL}/master/units`);
            const norm = res.data.map(u => ({ ...u, id: u.id || u._id }));
            setUnits(norm);
            sessionStorage.setItem("master_units", JSON.stringify(norm));
          }
          break;
        }

        case "sites": {
          const cached = sessionStorage.getItem("master_sites");
          if (!force && cached) {
            setSites(JSON.parse(cached));
          } else {
            const res = await axios.get(`${API_URL}/master/sites`);
            const norm = res.data.map(s => ({ ...s, id: s.id || s._id }));
            setSites(norm);
            sessionStorage.setItem("master_sites", JSON.stringify(norm));
          }
          break;
        }

        case "escalation": {
          const cachedFlows = sessionStorage.getItem("master_flows");
          const cachedPT = sessionStorage.getItem("master_party_types");
          const cachedSegs = sessionStorage.getItem("master_segments");
          const cachedEmps = sessionStorage.getItem("all_employees");
          const cachedDepts = sessionStorage.getItem("master_departments");

          if (!force && cachedFlows && cachedPT && cachedSegs && cachedEmps && cachedDepts) {
            setFlows(JSON.parse(cachedFlows));
            setPartyTypes(JSON.parse(cachedPT));
            setSegments(JSON.parse(cachedSegs));
            setEmployees(JSON.parse(cachedEmps));
            setDepartments(JSON.parse(cachedDepts));
          } else {
            const [ptRes, segRes, flowRes, empRes, deptRes] = await Promise.all([
              axios.get(`${API_URL}/master/party-types`),
              axios.get(`${API_URL}/master/product-segments`),
              axios.get(`${API_URL}/master/escalation-flows`),
              axios.get(`${API_URL}/auth/employees`),
              axios.get(`${API_URL}/master/settings/departments`)
            ]);
            const normPT = ptRes.data.map(t => ({ ...t, id: t.id || t._id }));
            const normSegs = segRes.data.map(s => ({ ...s, id: s.id || s._id }));
            const s = {};
            flowRes.data.forEach(f => {
              if (f.type !== "Service Material") s[f.type] = f.steps;
            });
            const depts = deptRes.data || DEFAULT_DEPTS;
            setPartyTypes(normPT);
            setSegments(normSegs);
            setFlows(s);
            setEmployees(empRes.data);
            setDepartments(depts);

            sessionStorage.setItem("master_party_types", JSON.stringify(normPT));
            sessionStorage.setItem("master_segments", JSON.stringify(normSegs));
            sessionStorage.setItem("master_flows", JSON.stringify(s));
            sessionStorage.setItem("all_employees", JSON.stringify(empRes.data));
            sessionStorage.setItem("master_departments", JSON.stringify(depts));
          }
          break;
        }

        case "service-escalation": {
          const cachedDepts = sessionStorage.getItem("master_departments");
          if (!force && cachedDepts) {
            setDepartments(JSON.parse(cachedDepts));
          } else {
            const deptRes = await axios.get(`${API_URL}/master/settings/departments`);
            const depts = deptRes.data || DEFAULT_DEPTS;
            setDepartments(depts);
            sessionStorage.setItem("master_departments", JSON.stringify(depts));
          }
          break;
        }

        case "employees": {
          const cachedEmps = sessionStorage.getItem("all_employees");
          const cachedDepts = sessionStorage.getItem("master_departments");

          if (!force && cachedEmps && cachedDepts) {
            setEmployees(JSON.parse(cachedEmps));
            setDepartments(JSON.parse(cachedDepts));
          } else {
            // Fast text data load (instant ms response)
            const [empRes, deptRes] = await Promise.all([
              axios.get(`${API_URL}/auth/employees`),
              axios.get(`${API_URL}/master/settings/departments`)
            ]);
            const depts = deptRes.data || DEFAULT_DEPTS;
            setEmployees(empRes.data);
            setDepartments(depts);
            sessionStorage.setItem("all_employees", JSON.stringify(empRes.data));
            sessionStorage.setItem("master_departments", JSON.stringify(depts));
          }

          // Progressive image hydration: apply one-by-one with smooth visual pop-in
          axios
            .get(`${API_URL}/auth/employee-pictures`)
            .then(async (picRes) => {
              if (Array.isArray(picRes.data) && picRes.data.length > 0) {
                for (const p of picRes.data) {
                  if (p.profilePicture) {
                    setEmployees((prev) =>
                      prev.map((e) =>
                        (e._id === p._id || e.userId === p.userId)
                          ? { ...e, profilePicture: p.profilePicture }
                          : e
                      )
                    );
                    // Gentle micro-stagger (40ms) so each avatar smoothly appears one by one
                    await new Promise((resolve) => setTimeout(resolve, 40));
                  }
                }
              }
            })
            .catch(() => {});
          break;
        }

        case "role-access": {
          const cachedEmps = sessionStorage.getItem("all_employees");
          if (!force && cachedEmps) {
            setEmployees(JSON.parse(cachedEmps));
          } else {
            const res = await axios.get(`${API_URL}/auth/employees`);
            setEmployees(res.data);
            sessionStorage.setItem("all_employees", JSON.stringify(res.data));
          }
          break;
        }

        case "columns": {
          const res = await axios.get(`${API_URL}/master/settings/${COLUMN_VIS_KEY}`);
          setColVis(res.data || { ...DEFAULT_COL_VIS });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch data for tab: ${targetTab}`, err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveTabData(activeTab, false);
  }, [activeTab]);

  const RefreshButton = () => (
    <button
      onClick={() => fetchActiveTabData(activeTab, true)}
      disabled={isRefreshing}
      className="flex items-center gap-[0.35vw] text-[0.68vw] font-semibold text-slate-600 bg-white ring-1 ring-slate-300 hover:ring-blue-400 hover:text-blue-600 rounded-[0.35vw] px-[0.6vw] py-[0.3vw] transition-all cursor-pointer shadow-sm disabled:opacity-50"
      title="Refresh latest data from server"
    >
      <RefreshCw className={`w-[0.75vw] h-[0.75vw] ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
      {isRefreshing ? "Refreshing..." : "Refresh"}
    </button>
  );

  return (
    <div className="w-full h-[calc(100vh-4.4rem)] flex flex-col font-sans text-[0.85vw] pr-[0.4vw] pb-[0.3vw]">
      {isLoading ? (
        <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-[1vw] bg-white border border-slate-400 rounded-[0.6vw] shadow-sm">
          <Loader2 className="w-[3.5vw] h-[3.5vw] animate-spin text-blue-600" />
          <div className="flex flex-col items-center">
            <span className="text-[1.1vw] font-bold text-slate-800 uppercase tracking-widest">Loading Master Settings</span>
            <span className="text-[0.75vw] text-slate-400 font-medium">Please wait while we sync with the server...</span>
          </div>
        </div>
      ) : (
        /* Settings container */
        <div className="flex-1 bg-white border border-slate-400 rounded-[0.6vw] shadow-sm mb-[1vw] overflow-hidden flex flex-col">
          {/* ── Tab: Categories ── */}
          {activeTab === "categories" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-slate-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                  <Tags className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Party Type Categories
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Manage customer categories used across the system
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
                    {partyTypes.length} categories
                  </span>
                </div>
              </div>
              <PartyTypesSection
                segments={segments}
                setPartyTypes={setPartyTypes}
              />
            </div>
          )}

          {/* ── Tab: Warranty Rules ── */}
          {activeTab === "warranty-rules" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-slate-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Warranty Rule Master
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Manage serial decoders and SLA days per product segment
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
                    {warrantyRules.length} rules
                  </span>
                </div>
              </div>
              <WarrantyRulesSection
                warrantyRules={warrantyRules}
                setWarrantyRules={setWarrantyRules}
                partyTypes={partyTypes || []}
              />
            </div>
          )}

          {/* ── Tab: Product Segments ── */}
          {activeTab === "segments" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-teal-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center flex-shrink-0">
                  <Package className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Product Segments</h2>
                  <p className="text-[0.7vw] text-gray-800">Define product lines for auto-completion</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-teal-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {segments.length} segments
                  </span>
                </div>
              </div>
              <ProductSegmentsSection segments={segments} setSegments={setSegments} />
            </div>
          )}

          {/* ── Tab: 4M Categories ── */}
          {activeTab === "four-m" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-cyan-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center flex-shrink-0">
                  <Columns className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">4M Categories</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage Man, Machine, Material, Method categories for Service Materials</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-cyan-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {fourMCategories.length} categories
                  </span>
                </div>
              </div>
              <FourMCategoriesSection items={fourMCategories} setItems={setFourMCategories} />
            </div>
          )}

          {/* ── Tab: Units ── */}
          {activeTab === "units" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-emerald-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Units</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage Unit values for Service Materials</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-emerald-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {units.length} units
                  </span>
                </div>
              </div>
              <UnitsSection units={units} setUnits={setUnits} />
            </div>
          )}

          {/* ── Tab: Sites ── */}
          {activeTab === "sites" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-blue-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Site Master</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage plant and warehouse site locations</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {sites.length} sites
                  </span>
                </div>
              </div>
              <SitesSection sites={sites} setSites={setSites} />
            </div>
          )}

          {/* ── Tab: Escalation ── */}
          {activeTab === "escalation" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <EscalationSection
                partyTypes={partyTypes}
                segments={segments}
                flows={flows}
                setFlows={setFlows}
                departments={departments}
                employees={employees}
                onRefresh={fetchActiveTabData}
                isRefreshing={isRefreshing}
              />
            </div>
          )}

          {/* ── Tab: Service Material Escalation ── */}
          {activeTab === "service-escalation" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <ServiceMaterialEscalationSection 
                departments={departments} 
                onRefresh={fetchActiveTabData}
                isRefreshing={isRefreshing}
              />
            </div>
          )}

          {/* ── Tab: Employees ── */}
          {activeTab === "employees" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-purple-50 to-white flex-shrink-0">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <Users className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Employee Management</h2>
                  <p className="text-[0.7vw] text-gray-800">Register and manage employee profiles and departments</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-purple-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {employees.length} employees
                  </span>
                </div>
              </div>
              <EmployeeManagementSection 
                employees={employees} 
                setEmployees={setEmployees}
                departments={departments}
                setDepartments={setDepartments}
              />
            </div>
          )}

          {/* ── Tab: Role Access ── */}
          {activeTab === "role-access" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-blue-50 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">Role Access Management</h2>
                  <p className="text-[0.7vw] text-gray-800">Manage employee permissions for read, write, and delete operations</p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                  <span className="text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full font-bold">
                    {employees.length} users
                  </span>
                </div>
              </div>
              <RoleAccessSection
                employees={employees}
                setEmployees={setEmployees}
              />
            </div>
          )}

          {/* ── Tab: Columns ── */}
          {activeTab === "columns" && (
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-400 bg-gradient-to-r from-indigo-50/60 to-white">
                <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Columns className="w-[0.9vw] h-[0.9vw] text-white" />
                </div>
                <div>
                  <h2 className="text-[0.9vw] font-bold text-slate-900">
                    Database Column Visibility
                  </h2>
                  <p className="text-[0.7vw] text-gray-800">
                    Show or hide columns in the Customer Database table
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-[0.6vw]">
                  <RefreshButton />
                </div>
              </div>
              <ColumnVisibilitySection colVis={colVis} setColVis={setColVis} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemSettingsPage;
