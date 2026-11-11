import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  Trash2,
  Save,
  ArrowLeft,
  Plus,
  Clock,
  User,
  Package,
  History,
  Smartphone,
  PlusCircle,
  MinusCircle,
  UserPlus,
  Phone,
  FileText,
  Settings,
  Loader2,
  Eye,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import ProductHistoryModal from "./ProductHistoryModal";
import CustomDropdown from "../../components/CustomDropdown";
import {
  CUSTOMER_DB_KEY,
  PRIORITIES,
  WARRANTY_STATUS,
  getTypeColor,
  API_URL,
  BASE_URL,
  emptyProduct,
  ConfigManagerModal,
} from "./ServiceCall";

const ServiceCallForm = ({
  initialData,
  customerDb,
  serviceCalls,
  partyTypes,
  sites = [],
  segments,
  employees,
  modes,
  onSave,
  onBack,
  onSaveModes,
  canWrite = true,
  canUpdate = true,
  allowEditDate = false,
}) => {
  const { toast } = useNotification();
  const [formData, setFormData] = useState(initialData || {});
  const [errors, setErrors] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState({});
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState(null);

  // Explicitly sync formData when initialData is provided (crucial for edit mode transitions)
  useEffect(() => {
    if (initialData?.partyCode) {
      setFormData(initialData);
    }
  }, [initialData]);
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showProdSearch, setShowProdSearch] = useState({});
  const [showEngineerDrop, setShowEngineerDrop] = useState(false);
  const [engineerSearch, setEngineerSearch] = useState("");
  const [showModesManager, setShowModesManager] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: partyTypes[0]?.name || "",
    state: "",
    districtCity: "",
    items: [
      {
        productSegment: "",
        itemCode: "",
        itemDescription: "",
        warrantyPeriodDays: "",
      },
    ],
  });

  const uniqueStates = useMemo(() => {
    const states = new Set();
    customerDb.forEach((item) => {
      if (item.state) states.add(item.state);
    });
    return Array.from(states).sort();
  }, [customerDb]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    customerDb.forEach((item) => {
      if (item.districtCity) districts.add(item.districtCity);
    });
    return Array.from(districts).sort();
  }, [customerDb]);

  const uniqueSegments = useMemo(() => {
    const s = new Set();
    // From master data
    if (segments) {
      segments.forEach((x) => s.add(x.name));
    }
    // From existing data
    customerDb.forEach((item) => {
      if (item.productSegment) s.add(item.productSegment);
    });
    return Array.from(s).sort();
  }, [customerDb, segments]);

  const handleAddCustItemRow = () =>
    setNewCustomer({
      ...newCustomer,
      items: [
        ...newCustomer.items,
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });

  const handleRemoveCustItemRow = (idx) => {
    if (newCustomer.items.length === 1) return;
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.filter((_, i) => i !== idx),
    });
  };

  const handleCustItemChange = (idx, field, val) =>
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });

  const custRef = useRef(null);
  const engineerRef = useRef(null);
  const prodRefs = useRef({});
  const isEdit = !!formData?._editing;

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target))
        setShowCustSearch(false);
      if (engineerRef.current && !engineerRef.current.contains(e.target))
        setShowEngineerDrop(false);
      Object.keys(prodRefs.current).forEach((k) => {
        if (prodRefs.current[k] && !prodRefs.current[k].contains(e.target))
          setShowProdSearch((p) => ({ ...p, [k]: false }));
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const supportEngineers = useMemo(
    () => employees.filter((e) => e.department === "Support Engineer"),
    [employees],
  );
  const filteredEngineers = useMemo(
    () =>
      supportEngineers.filter(
        (e) =>
          e.name.toLowerCase().includes(engineerSearch.toLowerCase()) ||
          e.userId.toLowerCase().includes(engineerSearch.toLowerCase()),
      ),
    [supportEngineers, engineerSearch],
  );

  const filteredCustomers = useMemo(() => {
    const map = new Map();
    customerDb.forEach((item) => {
      if (
        formData.customerType === "All" ||
        item.partyType === formData.customerType
      )
        if (!map.has(item.partyCode))
          map.set(item.partyCode, {
            code: item.partyCode,
            name: item.partyDescription,
            type: item.partyType,
          });
    });
    return Array.from(map.values());
  }, [customerDb, formData.customerType]);

  const allCustomerProducts = useMemo(() => {
    if (!formData.partyCode) return [];
    return customerDb.filter((i) => i.partyCode === formData.partyCode);
  }, [customerDb, formData.partyCode]);

  const customerHistory = useMemo(() => {
    if (!formData.partyCode) return [];
    return serviceCalls
      .filter((c) => c.partyCode === formData.partyCode && c.id !== formData.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [formData.partyCode, formData.id, serviceCalls]);

  const getProductHistory = (serialNumber) => {
    if (!serialNumber) return [];
    return serviceCalls
      .filter(
        (c) =>
          c.id !== formData.id &&
          c.products?.some(
            (p) => p.serialNumber?.toLowerCase() === serialNumber.toLowerCase(),
          ),
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const set = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const selectCustomer = (code, name, type) => {
    const rows = customerDb.filter((i) => i.partyCode === code);
    const loc = rows[0]
      ? [rows[0].districtCity, rows[0].state].filter(Boolean).join(", ")
      : "";
    setFormData((p) => ({
      ...p,
      partyCode: code,
      customerName: name,
      customerType: type,
      location: p.locationType === "Site" ? "" : loc || p.location,
      products: [emptyProduct()],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.customerName;
      delete next.partyCode;
      return next;
    });
    setShowCustSearch(false);
  };
  const selectEngineer = (eng) => {
    setFormData((p) => ({
      ...p,
      assignedEngineer: eng.userId,
      assignedEngineerName: eng.name,
      assignedDepartment: eng.department,
    }));
    setEngineerSearch("");
    setShowEngineerDrop(false);
  };
  const selectProduct = (idx, prod) => {
    setFormData((p) => {
      const updatedProds = p.products.map((pr, i) => {
        if (i !== idx) return pr;
        const updated = {
          ...pr,
          itemCode: prod.itemCode,
          productSegment: prod.productSegment || "",
          productModel: prod.itemDescription,
          warrantyPeriodDays: prod.warrantyPeriodDays || "",
        };

        // Auto-calculate expiry if supply date is already present
        if (updated.dateOfSupply && updated.warrantyPeriodDays) {
          const d = new Date(updated.dateOfSupply);
          d.setDate(d.getDate() + parseInt(updated.warrantyPeriodDays || 0));
          updated.warrantyExpiryDate = d.toISOString().split("T")[0];

          const now = new Date();
          updated.warrantyStatus = d >= now ? "In Warranty" : "Out of Warranty";
        }
        return updated;
      });
      return { ...p, products: updatedProds };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`product_${idx}_productModel`];
      return next;
    });
    setShowProdSearch((p) => ({ ...p, [idx]: false }));
  };
  const addProduct = () =>
    setFormData((p) => ({ ...p, products: [...p.products, emptyProduct()] }));
  const removeProduct = (idx) => {
    if (formData.products.length === 1) return;
    setFormData((p) => ({
      ...p,
      products: p.products.filter((_, i) => i !== idx),
    }));
  };
  const changeProduct = (idx, field, val) => {
    setFormData((p) => {
      const updatedProds = p.products.map((pr, i) => {
        if (i !== idx) return pr;
        const updated = { ...pr, [field]: val };

        if (field === "productModel") {
          updated.itemCode = "";
        }

        // Auto-calculate expiry if supply date or warranty days changed
        if (field === "dateOfSupply" || field === "warrantyPeriodDays") {
          if (updated.dateOfSupply && updated.warrantyPeriodDays) {
            const d = new Date(updated.dateOfSupply);
            d.setDate(d.getDate() + parseInt(updated.warrantyPeriodDays || 0));
            updated.warrantyExpiryDate = d.toISOString().split("T")[0];

            // Auto-update status
            const now = new Date();
            updated.warrantyStatus =
              d >= now ? "In Warranty" : "Out of Warranty";
          }
        }
        return updated;
      });
      return { ...p, products: updatedProds };
    });
    const errKey = `product_${idx}_${field}`;
    if (errors[errKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.mode) {
      newErrors.mode = "Please select Mode of Call.";
    }
    if (!formData.priority) {
      newErrors.priority = "Please select Priority.";
    }
    if (!formData.partyCode || !formData.customerName) {
      newErrors.customerName = "Please select a Customer Name from the search list or create a new customer.";
    }
    if (!formData.contactNumber || !formData.contactNumber.trim()) {
      newErrors.contactNumber = "Please enter Contact Number.";
    }
    if (!formData.site || !formData.site.trim()) {
      newErrors.site = "Please select Site.";
    }
    if (formData.locationType === "Site" && (!formData.location || !formData.location.trim())) {
      newErrors.location = "Please enter Site Address for location type 'Site'.";
    }

    // Validate products
    if (!formData.products || formData.products.length === 0) {
      newErrors.products = "Please add at least one product.";
    } else {
      for (let i = 0; i < formData.products.length; i++) {
        const p = formData.products[i];
        if (!p.productModel || !p.productModel.trim()) {
          newErrors[`product_${i}_productModel`] = `Please select Product Model for Product #${i + 1}.`;
        }
        if (!p.callDescription || !p.callDescription.trim()) {
          newErrors[`product_${i}_callDescription`] = `Please enter Call Description / Fault for Product #${i + 1}.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorMessage = Object.values(newErrors)[0];
      if (typeof toast === "function") {
        toast(firstErrorMessage, "error");
      } else if (toast?.error) {
        toast.error(firstErrorMessage);
      } else {
        alert(firstErrorMessage);
      }
      return;
    }

    setErrors({});

    // In edit mode, preserve original values if they exist, otherwise use defaults
    const saved = isEdit
      ? { ...formData }
      : {
          ...formData,
          status: "Registered",
          assignedEngineer: "",
          assignedEngineerName: "",
          assignedDepartment: "",
          assignmentDate: "",
          expectedResponse: "",
          escalationLevel: 0,
          escalationHistory: [],
        };
    onSave(saved, isEdit);
  };

  const handleAddCustomerSubmit = (e) => {
    const cleanStr = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const dups = newCustomer.items.filter((ni) =>
      customerDb.some((d) => cleanStr(d.itemCode) === cleanStr(ni.itemCode)),
    );
    if (dups.length > 0) {
      if (typeof toast === "function") {
        toast(`Item Code "${dups[0].itemCode}" already exists!`, "error");
      } else {
        alert(`Item Code "${dups[0].itemCode}" already exists!`);
      }
      return;
    }

    const invalidWarranty = newCustomer.items.find((item) => {
      const val = Number(item.warrantyPeriodDays);
      return item.warrantyPeriodDays === "" || isNaN(val) || val < 0;
    });

    if (invalidWarranty) {
      const msg = `Please enter a valid non-negative numeric Warranty Period for item "${invalidWarranty.itemCode || "unnamed"}".`;
      if (typeof toast === "function") {
        toast(msg, "warning");
      } else {
        alert(msg);
      }
      return;
    }

    const newRows = newCustomer.items.map((item) => ({
      partyCode: newCustomer.partyCode,
      partyDescription: newCustomer.partyDescription,
      partyType: newCustomer.partyType,
      state: newCustomer.state,
      districtCity: newCustomer.districtCity,
      productSegment: item.productSegment,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      warrantyPeriodDays: item.warrantyPeriodDays,
    }));
    const updated = [...newRows, ...customerDb].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updated));
    setCustomerDb(updated);
    setFormData((p) => ({
      ...p,
      partyCode: newCustomer.partyCode,
      customerName: newCustomer.partyDescription,
      location: [newCustomer.districtCity, newCustomer.state]
        .filter(Boolean)
        .join(", "),
    }));
    if (typeof toast === "function") {
      toast("Customer added successfully!", "success");
    } else {
      alert("Customer added!");
    }
    setShowAddCustModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full flex flex-col font-sans flex-1 min-h-0 overflow-hidden pr-[0.3vw]"
    >
      {/* Top Header Card (Static) */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-200 mb-[0.6vw] shrink-0">
        <div className="flex items-center gap-[0.9vw]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[0.4vw] text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-[0.75vw] py-[0.35vw] rounded-[0.5vw] cursor-pointer text-[0.78vw] font-medium transition-colors"
          >
            <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
            <span>Back</span>
          </button>
          <h2 className="text-[1.05vw] font-bold text-slate-800">
            {isEdit ? "Edit Service Call" : "New Service Call Entry"}
          </h2>
          {isEdit && (
            <span className="text-[0.74vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.15vw] rounded-full font-semibold">
              Adding products will sync to escalation queue
            </span>
          )}
        </div>
        <div className="bg-blue-50/80 border border-blue-200 px-[0.9vw] py-[0.35vw] rounded-[0.5vw] text-[0.8vw] flex items-center gap-[0.4vw]">
          <span className="text-slate-500 font-medium">Call No:</span>
          <span className="font-mono font-bold text-blue-600">
            {formData.callNumber}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Middle Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-[0.4vw] flex flex-col gap-[0.9vw] pb-[0.8vw] custom-scrollbar">
        {/* SECTION 1: Call Details */}
        <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
          <div className="flex items-center gap-[0.45vw] mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
            <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
            <Clock className="w-[1vw] h-[1vw] text-blue-600" />
            <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
              Call Details
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Call Number</label>
              <input
                readOnly
                value={formData.callNumber}
                className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-600 cursor-not-allowed font-mono outline-none"
              />
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">Date & Time</label>
              {allowEditDate ? (
                <input
                  type="datetime-local"
                  value={(() => {
                    if (!formData.dateTime) return "";
                    try {
                      const d = new Date(formData.timestamp || formData.dateTime);
                      if (isNaN(d.getTime())) return "";
                      const pad = (n) => String(n).padStart(2, "0");
                      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    } catch {
                      return "";
                    }
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const d = new Date(val);
                    setFormData((p) => ({
                      ...p,
                      dateTime: d.toLocaleString(),
                      timestamp: d.toISOString(),
                    }));
                  }}
                  className="bg-white border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-all"
                />
              ) : (
                <input
                  readOnly
                  value={(() => {
                    if (!formData.dateTime) return "";
                    try {
                      const d = new Date(formData.timestamp || formData.dateTime);
                      if (isNaN(d.getTime())) return formData.dateTime;
                      const pad = (n) => String(n).padStart(2, "0");
                      const day = pad(d.getDate());
                      const month = pad(d.getMonth() + 1);
                      const year = d.getFullYear();
                      let hours = d.getHours();
                      const ampm = hours >= 12 ? "PM" : "AM";
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const minutes = pad(d.getMinutes());
                      return `${day}-${month}-${year} ${pad(hours)}:${minutes} ${ampm}`;
                    } catch {
                      return formData.dateTime || "";
                    }
                  })()}
                  className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-600 cursor-not-allowed font-medium outline-none"
                  title="Auto date (read only)"
                />
              )}
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center justify-between h-[1.3vw]">
                <span>Mode of Call <span className="text-rose-500">*</span></span>
                <button
                  type="button"
                  onClick={() => setShowModesManager(true)}
                  className="w-[1.2vw] h-[1.2vw] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer rounded hover:bg-slate-100 transition-colors"
                  title="Manage Modes"
                >
                  <Settings className="w-[0.85vw] h-[0.85vw]" />
                </button>
              </label>
              <CustomDropdown
                value={formData.mode}
                onChange={(val) => set("mode", val)}
                options={modes.map((m) => ({ value: m, label: m }))}
                triggerClassName={`h-[2.3vw] !rounded-[0.5vw] text-[0.8vw] text-slate-800 ${
                  errors.mode ? "border-rose-400 ring-2 ring-rose-500/15" : "border-slate-200"
                }`}
              />
              {errors.mode && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.mode}</p>
              )}
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                Priority <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={formData.priority}
                onChange={(val) => set("priority", val)}
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                triggerClassName={`h-[2.3vw] !rounded-[0.5vw] text-[0.8vw] font-medium ${
                  errors.priority ? "border-rose-400 ring-2 ring-rose-500/15" : "border-slate-200"
                } ${
                  formData.priority === "Critical"
                    ? "!text-rose-600 !font-semibold"
                    : formData.priority === "High"
                      ? "!text-amber-600 !font-semibold"
                      : "text-slate-800"
                }`}
              />
              {errors.priority && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.priority}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Customer Information */}
        <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
          <div className="flex items-center gap-[0.45vw] mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
            <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
            <User className="w-[1vw] h-[1vw] text-blue-600" />
            <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
              Customer Information
            </h3>
          </div>
          <div className="grid grid-cols-5 gap-[1vw]">
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                Customer Type
              </label>
              <CustomDropdown
                value={formData.customerType}
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    customerType: val,
                    partyCode: "",
                    customerName: "",
                    products: [emptyProduct()],
                  }))
                }
                options={[
                  { value: "All", label: "All Types" },
                  ...partyTypes.map((t) => ({ value: t.name, label: t.name })),
                ]}
                triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800"
              />
            </div>
            <div
              className="flex flex-col gap-[0.35vw] col-span-2 relative"
              ref={custRef}
            >
              <label className="text-[0.76vw] font-semibold text-slate-700 flex justify-between">
                <span>Customer Name <span className="text-rose-500">*</span></span>
                <span className="text-[0.72vw] text-slate-400 font-normal">
                  ({filteredCustomers.length} available)
                </span>
              </label>
              <div className="flex gap-[0.5vw]">
                <div className="relative flex-1">
                  <Search className={`absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.95vw] h-[0.95vw] ${errors.customerName ? "text-rose-400" : "text-slate-400"}`} />
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => {
                      set("customerName", e.target.value);
                      setShowCustSearch(true);
                    }}
                    onFocus={() => setShowCustSearch(true)}
                    placeholder="Search & select customer…"
                    className={`w-full border rounded-[0.5vw] pl-[2.2vw] pr-[0.8vw] h-[2.3vw] bg-white text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none transition-all ${
                      errors.customerName
                        ? "border-rose-400 ring-2 ring-rose-500/15"
                        : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewCustomer({
                      partyCode: "",
                      partyDescription: formData.customerName || "",
                      partyType: partyTypes[0]?.name || "",
                      items: [
                        {
                          productSegment: "",
                          itemCode: "",
                          itemDescription: "",
                          warrantyPeriodDays: "",
                        },
                      ],
                    });
                    setShowAddCustModal(true);
                  }}
                  className="flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.9vw] h-[2.3vw] rounded-[0.5vw] cursor-pointer text-[0.78vw] font-medium transition-colors shrink-0 shadow-xs"
                >
                  <UserPlus className="w-[0.9vw] h-[0.9vw]" />
                  <span>New</span>
                </button>
              </div>
              {errors.customerName && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.customerName}</p>
              )}
              {showCustSearch && (
                <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-[0.5vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                  {filteredCustomers
                    .filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(formData.customerName.toLowerCase()),
                    )
                    .map((c, i) => (
                      <div
                        key={i}
                        onClick={() => selectCustomer(c.code, c.name, c.type)}
                        className="p-[0.65vw] hover:bg-blue-50/70 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"
                      >
                        <div>
                          <div className="font-medium text-slate-800 text-[0.8vw]">
                            {c.name}
                          </div>
                          <div className="text-[0.68vw] text-slate-400 font-mono">
                            {c.code}
                          </div>
                        </div>
                        <span
                          className={`text-[0.68vw] px-[0.45vw] py-[0.1vw] rounded font-medium border ${getTypeColor(c.type)}`}
                        >
                          {c.type}
                        </span>
                      </div>
                    ))}
                  {filteredCustomers.filter((c) =>
                    c.name
                      .toLowerCase()
                      .includes(formData.customerName.toLowerCase()),
                  ).length === 0 && (
                    <div className="p-[1vw] text-slate-400 text-center text-[0.76vw]">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                Contact Person
              </label>
              <input
                value={formData.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                placeholder="e.g. John Doe"
                className="border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                Contact Number <span className="text-rose-500">*</span>
              </label>
              <input
                value={formData.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
                placeholder="e.g. +91 9876543210"
                className={`border rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none transition-all ${
                  errors.contactNumber
                    ? "border-rose-400 ring-2 ring-rose-500/15"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                }`}
              />
              {errors.contactNumber && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.contactNumber}</p>
              )}
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">Email ID</label>
              <input
                type="email"
                value={formData.emailId}
                onChange={(e) => set("emailId", e.target.value)}
                placeholder="e.g. client@example.com"
                className="border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                Location Type
              </label>
              <CustomDropdown
                value={formData.locationType || "IPR"}
                onChange={(val) => {
                  setFormData((p) => {
                    let nextLoc = p.location;
                    if (val === "Site") nextLoc = "";
                    else if (val === "IPR" && p.partyCode) {
                      const rows = customerDb.filter(
                        (i) => i.partyCode === p.partyCode,
                      );
                      nextLoc = rows[0]
                        ? [rows[0].districtCity, rows[0].state]
                            .filter(Boolean)
                            .join(", ")
                        : p.location;
                    }
                    return { ...p, locationType: val, location: nextLoc };
                  });
                }}
                options={[
                  { value: "IPR", label: "IPR" },
                  { value: "Site", label: "Site" },
                ]}
                triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800"
              />
            </div>
            <div className="flex flex-col gap-[0.35vw] col-span-2">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                {formData.locationType === "Site" ? (
                  <>Site Address <span className="text-rose-500">*</span></>
                ) : (
                  "Location"
                )}
              </label>
              <input
                value={formData.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder={formData.locationType === "Site" ? "Enter site address" : "City, State"}
                className={`border rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none transition-all ${
                  errors.location
                    ? "border-rose-400 ring-2 ring-rose-500/15"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                }`}
              />
              {errors.location && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.location}</p>
              )}
            </div>
            <div className="flex flex-col gap-[0.35vw]">
              <label className="text-[0.76vw] font-semibold text-slate-700">
                Site <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={formData.site || ""}
                onChange={(val) => set("site", val)}
                placeholder="Select Site"
                options={[
                  { value: "", label: "Select Site" },
                  ...sites.map((s) => ({
                    value: s.name,
                    label: s.name,
                  })),
                ]}
                triggerClassName={`h-[2.3vw] !rounded-[0.5vw] text-[0.8vw] text-slate-800 ${
                  errors.site ? "border-rose-400 ring-2 ring-rose-500/15" : "border-slate-200"
                }`}
              />
              {errors.site && (
                <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">{errors.site}</p>
              )}
            </div>
            {formData.partyCode && (
              <div className="col-span-5 flex flex-col gap-[0.35vw] mt-[0.3vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center gap-[0.5vw]">
                  <History className="w-[0.95vw] h-[0.95vw] text-blue-600" />
                  <span>Customer History</span>
                  {customerHistory.length > 0 && (
                    <span className="text-[0.68vw] bg-blue-50 text-blue-700 px-[0.55vw] py-[0.1vw] rounded-full font-bold border border-blue-200">
                      {customerHistory.length} Call
                      {customerHistory.length > 1 ? "s" : ""}
                    </span>
                  )}
                </label>
                <div className="border border-slate-200 bg-slate-50/50 rounded-[0.5vw] p-[0.8vw] max-h-[15vw] overflow-y-auto space-y-[0.5vw]">
                  {customerHistory.length > 0 ? (
                    customerHistory.map((call, i) => (
                      <div
                        key={i}
                        className="bg-white border border-slate-200 rounded-[0.5vw] p-[0.65vw] shadow-2xs hover:border-blue-300 transition-colors"
                      >
                        <div className="flex flex-col mb-[0.4vw]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-[0.6vw]">
                              <span className="font-mono text-[0.8vw] font-bold text-slate-900">
                                {call.callNumber}
                              </span>
                              <span className="text-[0.68vw] text-slate-400 font-medium">
                                {new Date(call.timestamp).toLocaleDateString(
                                  "en-GB",
                                )}
                              </span>
                            </div>
                            <span
                              className={`px-[0.45vw] py-[0.1vw] rounded text-[0.66vw] font-medium border ${call.status === "Resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                            >
                              {call.status}
                            </span>
                          </div>
                          {(call.contactPerson || call.contactNumber) && (
                            <div className="flex items-center gap-[0.4vw] mt-[0.2vw] text-[0.72vw] text-slate-600">
                              <User className="w-[0.8vw] h-[0.8vw] text-slate-400" />
                              <span className="font-medium">
                                {call.contactPerson || "N/A"}
                              </span>
                              {call.contactNumber && (
                                <span>({call.contactNumber})</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-[0.4vw]">
                          {(call.products || []).map((p, pIdx) => {
                            const historyList = p._history || [];
                            const latestRemark =
                              historyList.length > 0
                                ? historyList[historyList.length - 1].remarks
                                : call.remarks || null;
                            return (
                              <div
                                key={pIdx}
                                className="flex flex-col gap-[0.3vw] bg-slate-50 p-[0.45vw] rounded-[0.35vw] border border-slate-200"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex flex-wrap items-center gap-[0.4vw]">
                                    <span className="text-[0.74vw] text-slate-800 font-medium">
                                      {p.productModel ||
                                        p.itemCode ||
                                        "Unknown Product"}
                                    </span>
                                    {p.serialNumber && (
                                      <span className="text-[0.66vw] text-slate-500 font-mono">
                                        SN: {p.serialNumber}
                                      </span>
                                    )}
                                    {p.errorCode && (
                                      <span className="text-[0.64vw] bg-rose-50 text-rose-600 border border-rose-200 px-[0.35vw] py-[0.05vw] rounded font-mono font-medium uppercase">
                                        {p.errorCode}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedHistoryProduct(historyList)
                                    }
                                    className="text-[0.68vw] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                                  >
                                    View History
                                  </button>
                                </div>
                                {latestRemark && (
                                  <div className="text-[0.72vw] text-slate-600 italic bg-white p-[0.35vw] rounded border border-slate-200">
                                    "{latestRemark}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-[2vw] text-slate-400">
                      <History className="w-[1.5vw] h-[1.5vw] mb-[0.4vw] opacity-30" />
                      <p className="text-[0.78vw]">
                        No previous call records found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Product Details */}
        <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
          <div className="flex justify-between items-center mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
            <div className="flex items-center gap-[0.45vw]">
              <span className="w-[0.25vw] h-[0.9vw] bg-indigo-600 rounded-full inline-block" />
              <Package className="w-[1vw] h-[1vw] text-indigo-600" />
              <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
                Product Details
              </h3>
              {isEdit && (
                <span className="text-[0.72vw] bg-amber-50 text-amber-700 border border-amber-200 px-[0.5vw] py-[0.1vw] rounded-full font-medium ml-[0.4vw]">
                  New products will be added to escalation queue
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={addProduct}
              disabled={!formData.partyCode}
              className="flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.9vw] h-[2.1vw] rounded-[0.5vw] text-[0.78vw] font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <PlusCircle className="w-[0.9vw] h-[0.9vw]" />
              <span>Add Product</span>
            </button>
          </div>
          <div className="space-y-[0.9vw]">
            {formData.products.map((product, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-[0.7vw] p-[1.1vw] bg-slate-50/50 relative shadow-2xs"
              >
                {formData.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(idx)}
                    className="absolute top-[0.7vw] right-[0.7vw] p-[0.3vw] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                    title="Remove product"
                  >
                    <Trash2 className="w-[0.95vw] h-[0.95vw]" />
                  </button>
                )}
                <div className="text-[0.82vw] font-bold text-slate-700 mb-[0.8vw] flex items-center gap-[0.4vw]">
                  <Smartphone className="w-[0.95vw] h-[0.95vw] text-blue-600" />
                  Product #{idx + 1}
                </div>
                <div className="grid grid-cols-4 gap-[1.2vw]">
                  <div
                    className="col-span-2 flex flex-col gap-[0.35vw] relative"
                    ref={(el) => (prodRefs.current[idx] = el)}
                  >
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Product Model <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className={`absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.95vw] h-[0.95vw] z-10 ${
                        errors[`product_${idx}_productModel`] ? "text-rose-400" : "text-slate-400"
                      }`} />
                      <input
                        type="text"
                        value={product.productModel}
                        onChange={(e) =>
                          changeProduct(idx, "productModel", e.target.value)
                        }
                        onFocus={() => {
                          if (formData.partyCode)
                            setShowProdSearch((p) => ({ ...p, [idx]: true }));
                        }}
                        disabled={!formData.partyCode}
                        placeholder={
                          !formData.partyCode
                            ? "Select customer first"
                            : "Search product…"
                        }
                        className={`w-full border rounded-[0.5vw] pl-[2.2vw] pr-[0.8vw] h-[2.3vw] bg-white text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed transition-all ${
                          errors[`product_${idx}_productModel`]
                            ? "border-rose-400 ring-2 ring-rose-500/15"
                            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                        }`}
                      />
                      {errors[`product_${idx}_productModel`] && (
                        <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">
                          {errors[`product_${idx}_productModel`]}
                        </p>
                      )}
                      {showProdSearch[idx] && formData.partyCode && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-[0.5vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-20">
                          {(() => {
                            const selectedOther = new Set(
                              formData.products
                                .filter((p, i) => i !== idx)
                                .map((p) => p.itemCode)
                                .filter(Boolean),
                            );
                            const options = allCustomerProducts.filter(
                              (p) => !selectedOther.has(p.itemCode),
                            );
                            const isSelectedExact =
                              product.itemCode &&
                              options.find(
                                (p) => p.itemCode === product.itemCode,
                              )?.itemDescription === product.productModel;

                            return options
                              .filter(
                                (p) =>
                                  isSelectedExact ||
                                  !product.productModel ||
                                  p.itemDescription
                                    .toLowerCase()
                                    .includes(
                                      product.productModel.toLowerCase(),
                                    ) ||
                                  p.itemCode
                                    .toLowerCase()
                                    .includes(
                                      product.productModel.toLowerCase(),
                                    ),
                              )
                              .map((prod, i) => (
                                <div
                                  key={i}
                                  onClick={() => selectProduct(idx, prod)}
                                  className="p-[0.65vw] hover:bg-blue-50/70 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                                >
                                  <div className="font-medium text-slate-800 text-[0.8vw]">
                                    {prod.itemDescription}
                                  </div>
                                  <div className="text-[0.68vw] text-slate-400 font-mono mt-[0.1vw]">
                                    {prod.itemCode}
                                    {prod.productSegment &&
                                      ` • ${prod.productSegment}`}
                                  </div>
                                </div>
                              ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Product Segment
                    </label>
                    <CustomDropdown
                      value={product.productSegment || ""}
                      onChange={(val) =>
                        changeProduct(idx, "productSegment", val)
                      }
                      placeholder="-- Select Segment --"
                      options={[
                        { value: "", label: "-- Select Segment --" },
                        ...uniqueSegments.map((seg) => ({ value: seg, label: seg })),
                      ]}
                      triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Serial Number
                    </label>
                    <input
                      value={product.serialNumber}
                      onChange={(e) =>
                        changeProduct(idx, "serialNumber", e.target.value)
                      }
                      className="border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] outline-none text-[0.8vw] text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      placeholder="e.g. SN-12345"
                    />
                  </div>

                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Warranty Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={product.warrantyPeriodDays || ""}
                      onChange={(e) =>
                        changeProduct(idx, "warrantyPeriodDays", e.target.value)
                      }
                      className="border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] outline-none text-[0.8vw] text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      placeholder="Days"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Warranty Status
                    </label>
                    <CustomDropdown
                      value={product.warrantyStatus}
                      onChange={(val) =>
                        changeProduct(idx, "warrantyStatus", val)
                      }
                      options={WARRANTY_STATUS.map((s) => ({ value: s, label: s }))}
                      triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Error Code
                    </label>
                    <input
                      value={product.errorCode || ""}
                      onChange={(e) =>
                        changeProduct(idx, "errorCode", e.target.value)
                      }
                      className="border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] outline-none text-[0.8vw] text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      placeholder="e.g. E-404"
                    />
                  </div>

                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Photo/Video Received?
                    </label>
                    <CustomDropdown
                      value={product.mediaReceived || "No"}
                      onChange={(val) =>
                        changeProduct(idx, "mediaReceived", val)
                      }
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                      ]}
                      triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800"
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-[0.35vw]">
                    <label className="font-semibold text-slate-700 text-[0.76vw]">
                      Call Description / Fault <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows="4"
                      value={product.callDescription || ""}
                      onChange={(e) =>
                        changeProduct(idx, "callDescription", e.target.value)
                      }
                      className={`border rounded-[0.5vw] p-[0.75vw] outline-none resize-none text-[0.8vw] text-slate-800 placeholder-slate-400 transition-all h-full ${
                        errors[`product_${idx}_callDescription`]
                          ? "border-rose-400 ring-2 ring-rose-500/15"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                      }`}
                      placeholder="Describe the issue…"
                    />
                    {errors[`product_${idx}_callDescription`] && (
                      <p className="text-rose-500 text-[0.68vw] mt-[0.1vw]">
                        {errors[`product_${idx}_callDescription`]}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    {product.mediaReceived === "Yes" ? (
                      <div className="flex flex-col h-full">
                        <label className="font-semibold text-slate-700 text-[0.76vw] mb-[0.35vw]">
                          Media Attachments
                        </label>
                        <div className="flex-1 border-2 border-dashed border-slate-300 rounded-[0.6vw] p-[0.8vw] bg-blue-50/20 min-h-[7vw] flex flex-wrap gap-[0.6vw]">
                          {/* Image Previews */}
                          {product.mediaFiles?.map((file, fIdx) => {
                            const isImage =
                              file.type?.startsWith("image/") ||
                              /\.(jpe?g|png|gif|webp)$/i.test(file.name);
                            let path = file.url;
                            if (
                              path &&
                              !path.startsWith("http") &&
                              !path.startsWith("/api")
                            ) {
                              path = "/api" + path;
                            }
                            const fullUrl = path
                              ? path.startsWith("http")
                                ? path
                                : `${BASE_URL}${path}`
                              : null;
                            const displayUrl =
                              fullUrl ||
                              (isImage
                                ? "https://placehold.co/400?text=Preview+Not+Available"
                                : "");

                            return (
                              <div
                                key={fIdx}
                                className="relative group w-[5.5vw] h-[5.5vw] border border-slate-200 rounded-[0.5vw] overflow-hidden bg-white shadow-2xs flex items-center justify-center"
                              >
                                {isImage ? (
                                  <img
                                    src={displayUrl}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-slate-400 flex flex-col items-center gap-[0.2vw]">
                                    <FileText className="w-[1.4vw] h-[1.4vw]" />
                                    <span className="text-[0.6vw] truncate w-[4vw] text-center font-medium">
                                      {file.name}
                                    </span>
                                  </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-[0.5vw]">
                                  <a
                                    href={displayUrl || "#"}
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!file.url) {
                                        alert(
                                          "File was not fully uploaded to the server yet.",
                                        );
                                        return;
                                      }
                                      try {
                                        const res = await fetch(displayUrl);
                                        const blob = await res.blob();
                                        const url =
                                          window.URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = file.name;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error(err);
                                        window.open(displayUrl, "_blank");
                                      }
                                    }}
                                    className="text-white hover:text-blue-300 cursor-pointer p-[0.2vw] bg-white/20 rounded-full"
                                    title="Download"
                                  >
                                    <Download className="w-[0.9vw] h-[0.9vw]" />
                                  </a>
                                  {isImage && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage(displayUrl);
                                      }}
                                      className="text-white hover:text-blue-300 cursor-pointer p-[0.2vw] bg-white/20 rounded-full"
                                      title="View"
                                    >
                                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (file.url) {
                                      const filename = file.url
                                        .split("/")
                                        .pop();
                                      if (filename)
                                        setFilesToDelete((prev) => [
                                          ...prev,
                                          filename,
                                        ]);
                                    }
                                    setFormData((p) => ({
                                      ...p,
                                      products: p.products.map((pr, i) =>
                                        i === idx
                                          ? {
                                              ...pr,
                                              mediaFiles: pr.mediaFiles.filter(
                                                (_, fi) => fi !== fIdx,
                                              ),
                                            }
                                          : pr,
                                      ),
                                    }));
                                  }}
                                  className="absolute top-[0.2vw] right-[0.2vw] bg-white rounded-full text-rose-500 opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer p-[0.15vw]"
                                >
                                  <X className="w-[0.7vw] h-[0.7vw]" />
                                </button>
                              </div>
                            );
                          })}

                          {/* Upload Dialog */}
                          <div
                            onClick={() =>
                              !uploadingMedia[idx] &&
                              document
                                .getElementById(`file-input-${idx}`)
                                .click()
                            }
                            className={`w-[5.5vw] h-[5.5vw] border-2 border-dashed border-blue-300 rounded-[0.5vw] bg-blue-50/60 flex flex-col items-center justify-center ${uploadingMedia[idx] ? "opacity-75 cursor-wait" : "cursor-pointer hover:bg-blue-100/70 hover:border-blue-400"} transition-colors`}
                          >
                            {uploadingMedia[idx] ? (
                              <Loader2 className="w-[1.2vw] h-[1.2vw] text-blue-500 mb-[0.2vw] animate-spin" />
                            ) : (
                              <Plus className="w-[1.2vw] h-[1.2vw] text-blue-500 mb-[0.2vw]" />
                            )}
                            <span className="text-[0.66vw] font-bold text-blue-600 text-center leading-tight">
                              {uploadingMedia[idx] ? (
                                "Uploading..."
                              ) : (
                                <>
                                  Add
                                  <br />
                                  Media
                                </>
                              )}
                            </span>
                            <input
                              id={`file-input-${idx}`}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files);
                                if (!files.length) return;

                                setUploadingMedia((p) => ({
                                  ...p,
                                  [idx]: true,
                                }));
                                const uploadData = new FormData();
                                files.forEach((f) =>
                                  uploadData.append("mediaFiles", f),
                                );

                                try {
                                  const res = await axios.post(
                                    `${API_URL}/service-calls/upload-media`,
                                    uploadData,
                                    {
                                      headers: {
                                        "Content-Type": "multipart/form-data",
                                      },
                                    },
                                  );
                                  const newMedia = res.data.files;
                                  setFormData((p) => ({
                                    ...p,
                                    products: p.products.map((pr, i) =>
                                      i === idx
                                        ? {
                                            ...pr,
                                            mediaFiles: [
                                              ...(pr.mediaFiles || []),
                                              ...newMedia,
                                            ],
                                          }
                                        : pr,
                                    ),
                                  }));
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to upload files.");
                                } finally {
                                  setUploadingMedia((p) => ({
                                    ...p,
                                    [idx]: false,
                                  }));
                                }
                                e.target.value = ""; // reset input
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-slate-100/50 rounded-[0.6vw] border border-slate-200">
                        <p className="text-[0.74vw] text-slate-400 italic">
                          No media required
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        </div>

        {/* Footer Action Bar (Static) */}
        <div className="flex justify-end gap-[0.8vw] bg-white border border-slate-200 py-[0.65vw] px-[1.2vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] mt-[0.5vw] shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-[1.4vw] h-[2.2vw] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-[0.5vw] cursor-pointer flex items-center gap-[0.4vw] font-medium text-[0.78vw] transition-colors"
          >
            <X className="w-[0.9vw] h-[0.9vw]" />
            <span>Cancel</span>
          </button>
          {(isEdit ? canUpdate : canWrite) && (
            <button
              type="submit"
              className="px-[1.6vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] flex items-center gap-[0.4vw] cursor-pointer font-medium text-[0.78vw] shadow-sm hover:shadow transition-all"
            >
              <Save className="w-[0.9vw] h-[0.9vw]" />
              <span>{isEdit ? "Update Record" : "Save Service Call"}</span>
            </button>
          )}
        </div>
      </form>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-[2vw]"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-[2vw] right-[2vw] text-white hover:text-red-400 cursor-pointer p-[1vw]">
            <X className="w-[2vw] h-[2vw]" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain shadow-2xl rounded-[0.5vw]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showModesManager && (
        <ConfigManagerModal
          title="Manage Call Modes"
          icon={Phone}
          items={modes}
          onClose={() => setShowModesManager(false)}
          onSave={onSaveModes}
        />
      )}

      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-[58vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-[1vw] py-[0.7vw] border-b border-slate-400 flex justify-between items-center bg-gray-50">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                Add Customer & Items
              </h2>
              <button
                onClick={() => setShowAddCustModal(false)}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-[1.2vw] h-[1.2vw]" />
              </button>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto"
            >
              <div className="bg-gray-50 p-[1vw] rounded-[0.5vw] border border-slate-400">
                <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.8vw]">
                  Party Details
                </h3>
                <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.8vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Code *
                    </label>
                    <input
                      required
                      value={newCustomer.partyCode}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyCode: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. CUS-001"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Type
                    </label>
                    <CustomDropdown
                      value={newCustomer.partyType}
                      onChange={(val) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyType: val,
                        })
                      }
                      options={partyTypes.map((t) => ({ value: t.name, label: t.name }))}
                      triggerClassName="!p-[0.6vw] !rounded-[0.4vw] bg-white border-gray-300"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-[0.4vw] mb-[0.8vw]">
                  <label className="text-gray-600 font-medium">
                    Party Description *
                  </label>
                  <input
                    required
                    value={newCustomer.partyDescription}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        partyDescription: e.target.value,
                      })
                    }
                    className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                    placeholder="Company Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-[1.5vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">State</label>
                    <input
                      value={newCustomer.state}
                      list="ctx-states-datalist"
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          state: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      District / City
                    </label>
                    <input
                      value={newCustomer.districtCity}
                      list="ctx-districts-datalist"
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          districtCity: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. Coimbatore"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-400 rounded-[0.5vw] p-[1vw]">
                <div className="flex justify-between items-center mb-[0.5vw]">
                  <h3 className="text-[0.9vw] font-bold text-gray-700">
                    Product Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCustItemRow}
                    className="text-blue-600 hover:text-blue-800 text-[0.8vw] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-[1vw] h-[1vw]" /> Add Item
                  </button>
                </div>
                <div className="space-y-[0.8vw]">
                  {newCustomer.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-[0.5vw] items-center border-b border-slate-400 pb-[0.5vw] last:border-0"
                    >
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Product Segment
                          </label>
                        )}
                        <input
                          required
                          value={item.productSegment}
                          list="ctx-segments-datalist"
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "productSegment",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Segment"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Item Code
                          </label>
                        )}
                        <input
                          required
                          value={item.itemCode}
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "itemCode",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Code"
                        />
                      </div>
                      <div className="flex-[2] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Description
                          </label>
                        )}
                        <input
                          required
                          value={item.itemDescription}
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "itemDescription",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex-[0.7] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Warranty (days)
                          </label>
                        )}
                        <input
                          required
                          type="number"
                          min="0"
                          value={item.warrantyPeriodDays}
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "warrantyPeriodDays",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Days"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveCustItemRow(idx)}
                          disabled={newCustomer.items.length === 1}
                          className={`text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer ${idx === 0 ? "mt-[1.3vw]" : ""}`}
                        >
                          <MinusCircle className="w-[1.2vw] h-[1.2vw]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-[1vw] pt-[0.5vw]">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-[2vw] py-[0.6vw] border rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[2vw] py-[0.6vw] bg-black text-white rounded-[0.4vw] hover:bg-gray-800 flex items-center gap-[0.5vw] cursor-pointer"
                >
                  Save All
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Datalists for Rich Modal Autocomplete */}
      <datalist id="ctx-states-datalist">
        {uniqueStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="ctx-districts-datalist">
        {uniqueDistricts.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="ctx-segments-datalist">
        {uniqueSegments.map((seg) => (
          <option key={seg} value={seg} />
        ))}
      </datalist>

      {/* Product History Modal */}
      {selectedHistoryProduct && (
        <ProductHistoryModal
          history={selectedHistoryProduct}
          employees={employees}
          currentUser={null}
          onClose={() => setSelectedHistoryProduct(null)}
        />
      )}
    </motion.div>
  );
};

export default ServiceCallForm;
