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
  Eye,
  Copy,
  AlertCircle,
  Building2,
  MapPin,
  Tag,
  Hash,
  Calendar,
  Layers,
  UserPlus,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import EditableProductTable from "./EditableProductTable";
import CustomDropdown from "../../components/CustomDropdown";

const API_URL = import.meta.env.VITE_API_URL;
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";

// Helper for type color badges
const getTypeColor = (type, types = []) => {
  if (types.length > 0) {
    const idx = types.findIndex((t) => (t.name || t) === type);
    if (idx !== -1) {
      return [
        "bg-purple-100 text-purple-700 border-purple-200",
        "bg-orange-100 text-orange-700 border-orange-200",
        "bg-blue-100 text-blue-700 border-blue-200",
        "bg-green-100 text-green-700 border-green-200",
      ][idx % 4];
    }
  }
  switch (type) {
    case "OEM":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "End Customer":
      return "bg-green-100 text-green-700 border-green-200";
    case "Distributor":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "Dealer":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-slate-300";
  }
};

const lsLoad = (key, fb) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};

const genRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SMI-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const todayDateStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (s) => {
  if (!s) return "—";
  if (s.includes("T")) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  if (s.includes("-") && s.split("-")[0].length === 4) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  return s;
};

const emptyProduct = () => ({
  _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productCode: "",
  productDescription: "",
  productSegment: "",
  serialNumber: "",
  boardType: "",
  qty: "1",
  type: "W",
  expectedDeliveryDate: "",
  status: "Open",
  escalationLevel: 0,
  escalationHistory: [],
  assignedTo: "",
  assignedToName: "",
  assignedDepartment: "",
});

// Duplicate Modal
const DuplicateModal = ({ onConfirm, onClose }) => {
  const [count, setCount] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 p-[1.8vw] w-[22vw]"
      >
        <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center">
            <Copy className="w-[1.1vw] h-[1.1vw] text-blue-600" />
          </div>
          <div>
            <div className="text-[0.9vw] font-bold text-slate-800">
              Duplicate Product Row
            </div>
            <div className="text-[0.72vw] text-slate-500">
              How many copies do you need?
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] mb-[1.4vw]">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
            }
            className="flex-1 border border-slate-200 rounded-[0.5vw] p-[0.5vw] text-center text-[1vw] font-bold outline-none focus:border-blue-500 shadow-none"
          />
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(50, c + 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer transition-colors"
          >
            +
          </button>
        </div>
        <div className="text-[0.72vw] text-slate-600 mb-[1.2vw] bg-blue-50 rounded-[0.5vw] p-[0.6vw] border border-blue-200">
          This will add <strong>{count}</strong> copy{count > 1 ? "ies" : ""} of this product row.
        </div>
        <div className="flex gap-[0.6vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-slate-200 rounded-[0.5vw] text-[0.78vw] text-slate-600 hover:bg-slate-50 cursor-pointer font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(count);
              onClose();
            }}
            className="px-[1.4vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw] transition-colors"
          >
            <Copy className="w-[0.85vw] h-[0.85vw]" />
            Add {count} {count > 1 ? "Copies" : "Copy"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Add Rows Modal
const AddRowsModal = ({ onConfirm, onClose }) => {
  const [count, setCount] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 p-[1.8vw] w-[22vw]"
      >
        <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center">
            <Plus className="w-[1.1vw] h-[1.1vw] text-blue-600" />
          </div>
          <div>
            <div className="text-[0.9vw] font-bold text-slate-800">
              Add Product Rows
            </div>
            <div className="text-[0.72vw] text-slate-500">
              How many rows do you want to add?
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] mb-[1.4vw]">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
            }
            className="flex-1 border border-slate-200 rounded-[0.5vw] p-[0.5vw] text-center text-[1vw] font-bold outline-none focus:border-blue-500 shadow-none"
          />
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(50, c + 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer transition-colors"
          >
            +
          </button>
        </div>
        <div className="text-[0.72vw] text-slate-600 mb-[1.2vw] bg-blue-50 rounded-[0.5vw] p-[0.6vw] border border-blue-200">
          This will add <strong>{count}</strong> new empty product row{count > 1 ? "s" : ""}.
        </div>
        <div className="flex gap-[0.6vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-slate-200 rounded-[0.5vw] text-[0.78vw] text-slate-600 hover:bg-slate-50 cursor-pointer font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(count);
              onClose();
            }}
            className="px-[1.4vw] py-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw] transition-colors"
          >
            <Plus className="w-[0.85vw] h-[0.85vw]" />
            Add {count} Row{count > 1 ? "s" : ""}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Unsaved Changes Confirmation Modal
const UnsavedChangesModal = ({ onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 p-[2vw] w-[25vw]"
      >
        <div className="flex items-center gap-[0.8vw] mb-[1.2vw]">
          <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-[1.2vw] h-[1.2vw] text-red-600" />
          </div>
          <div>
            <div className="text-[1vw] font-bold text-slate-800">
              Unsaved Changes
            </div>
            <div className="text-[0.75vw] text-slate-500">
              You have made changes to the form. Are you sure you want to go back?
            </div>
          </div>
        </div>

        <div className="text-[0.72vw] text-red-700 bg-red-50 rounded-[0.5vw] p-[0.8vw] border border-red-200 mb-[1.5vw]">
          <strong>Warning:</strong> Any unsaved information will be permanently lost if you leave this page.
        </div>

        <div className="flex gap-[0.8vw] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.5vw] py-[0.6vw] border border-slate-200 rounded-[0.5vw] text-[0.8vw] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Continue Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-[1.5vw] py-[0.6vw] bg-red-600 hover:bg-red-700 text-white rounded-[0.5vw] text-[0.8vw] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
          >
            Yes, Discard Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main Service Material Form Component (separated like ServiceCallForm)
const ServiceMaterialForm = ({
  initialData = {},
  customerDb = [],
  setCustomerDb,
  employees = [],
  boardTypes = [],
  units = [],
  sites = [],
  entries = [],
  partyTypes = [],
  onSave,
  onBack,
  canWrite = true,
  canUpdate = true,
}) => {
  const { toast } = useNotification();
  const isReadOnly = !!initialData._readonly;
  const isEdit = !!initialData._editing;

  const [base, setBase] = useState(() => ({
    date: initialData.date || todayDateStr(),
    refNoCustomer: initialData.refNoCustomer || "",
    refNoInternal: initialData.refNoInternal || "",
    customerName: initialData.customerName || "",
    customerCode: initialData.customerCode || "",
    site: initialData.site || "",
    category: initialData.category || "",
    assignedTo: initialData.assignedTo || "",
    assignedToName: initialData.assignedToName || "",
    assignedDepartment: initialData.assignedDepartment || "",
    finalStatus: initialData.finalStatus || "Pending",
    finalStatusRemarks: initialData.finalStatusRemarks || "",
    unit: initialData.unit || "",
  }));

  const [products, setProducts] = useState(() => {
    if (initialData.products && initialData.products.length > 0) {
      return initialData.products.map((p) => {
        let ed = p.expectedDeliveryDate || "";
        if (ed.includes("T")) ed = ed.split("T")[0];
        else if (ed.includes("-") && ed.split("-")[0].length !== 4) {
          const parts = ed.split("-");
          if (parts.length === 3) ed = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else if (ed.includes("/")) {
          const parts = ed.split("/");
          if (parts.length === 3) {
            if (parts[2].length === 4)
              ed = `${parts[2]}-${parts[1]}-${parts[0]}`;
            else ed = `${parts[0]}-${parts[1]}-${parts[2]}`;
          }
        }
        return { ...p, expectedDeliveryDate: ed };
      });
    }
    if (initialData._editing || initialData._readonly) {
      return [
        {
          _pid: `p-${Date.now()}`,
          productCode: initialData.productCode || "",
          productDescription: initialData.productDescription || "",
          productSegment: initialData.productSegment || "",
          serialNumber: initialData.serialNumber || "",
          boardType: initialData.boardType || "",
          qty: initialData.qty || "1",
          type: initialData.type || "W",
          expectedDeliveryDate: initialData.expectedDeliveryDate || "",
          status: initialData.status || "Open",
          escalationLevel: initialData.escalationLevel || 0,
          escalationHistory: initialData.escalationHistory || [],
          assignedTo: initialData.assignedTo || "",
          assignedToName: initialData.assignedToName || "",
          assignedDepartment: initialData.assignedDepartment || "",
        },
      ];
    }
    return [emptyProduct()];
  });

  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [dupeTarget, setDupeTarget] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showAddRowsModal, setShowAddRowsModal] = useState(false);
  const [showRefCustDrop, setShowRefCustDrop] = useState(false);
  const [showRefIntDrop, setShowRefIntDrop] = useState(false);

  // New Customer Modal State (like ServiceCallForm)
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyType: partyTypes[0]?.name || "OEM",
    partyDescription: "",
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

  const custRef = useRef(null);
  const refCustRef = useRef(null);
  const refIntRef = useRef(null);

  const [custActiveIndex, setCustActiveIndex] = useState(-1);
  const [refCustActiveIndex, setRefCustActiveIndex] = useState(-1);
  const [refIntActiveIndex, setRefIntActiveIndex] = useState(-1);

  const customerRefsList = useMemo(
    () =>
      Array.from(
        new Set((entries || []).map((e) => e.refNoCustomer).filter(Boolean)),
      ),
    [entries],
  );
  const internalRefsList = useMemo(
    () =>
      Array.from(
        new Set((entries || []).map((e) => e.refNoInternal).filter(Boolean)),
      ),
    [entries],
  );

  // Browser refresh/close prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isReadOnly) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isReadOnly]);

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target))
        setShowCustDrop(false);
      if (refCustRef.current && !refCustRef.current.contains(e.target))
        setShowRefCustDrop(false);
      if (refIntRef.current && !refIntRef.current.contains(e.target))
        setShowRefIntDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const customerDbFlat = useMemo(
    () =>
      Array.isArray(customerDb) ? customerDb : Object.values(customerDb).flat(),
    [customerDb],
  );

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDbFlat.forEach((item) => {
      if (!map.has(item.partyCode))
        map.set(item.partyCode, {
          code: item.partyCode,
          name: item.partyDescription,
          type: item.partyType,
        });
    });
    return Array.from(map.values());
  }, [customerDbFlat]);

  const uniqueStates = useMemo(
    () =>
      Array.from(new Set(customerDbFlat.map((c) => c.state).filter(Boolean))),
    [customerDbFlat],
  );
  const uniqueDistricts = useMemo(
    () =>
      Array.from(
        new Set(customerDbFlat.map((c) => c.districtCity).filter(Boolean)),
      ),
    [customerDbFlat],
  );
  const uniqueSegments = useMemo(
    () =>
      Array.from(
        new Set(customerDbFlat.map((c) => c.productSegment).filter(Boolean)),
      ),
    [customerDbFlat],
  );

  const sb = (k, v) => {
    if (!isReadOnly) {
      setBase((p) => ({ ...p, [k]: v }));
      setIsDirty(true);
    }
  };

  const filteredCustomers = useMemo(() => {
    return uniqueCustomers.filter((c) => {
      const matchesSearch =
        (c.name || "").toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.code || "").toLowerCase().includes(custSearch.toLowerCase());
      if (!base.category) return matchesSearch;
      return (
        matchesSearch &&
        (c.type || "").toLowerCase() === base.category.toLowerCase()
      );
    });
  }, [uniqueCustomers, custSearch, base.category]);

  const filteredRefCust = useMemo(() => {
    return customerRefsList.filter((r) =>
      r.toLowerCase().includes((base.refNoCustomer || "").toLowerCase()),
    );
  }, [customerRefsList, base.refNoCustomer]);

  const filteredRefInt = useMemo(() => {
    return internalRefsList.filter((r) =>
      r.toLowerCase().includes((base.refNoInternal || "").toLowerCase()),
    );
  }, [internalRefsList, base.refNoInternal]);

  const handleCustKeyDown = (e) => {
    if (!showCustDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustActiveIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (custActiveIndex >= 0 && custActiveIndex < filteredCustomers.length) {
        selectCustomer(filteredCustomers[custActiveIndex]);
      }
    } else if (e.key === "Escape") {
      setShowCustDrop(false);
      setCustActiveIndex(-1);
    }
  };

  const handleRefCustKeyDown = (e) => {
    if (!showRefCustDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRefCustActiveIndex((prev) =>
        prev < filteredRefCust.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRefCustActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        refCustActiveIndex >= 0 &&
        refCustActiveIndex < filteredRefCust.length
      ) {
        sb("refNoCustomer", filteredRefCust[refCustActiveIndex]);
        setShowRefCustDrop(false);
        setRefCustActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowRefCustDrop(false);
      setRefCustActiveIndex(-1);
    }
  };

  const handleRefIntKeyDown = (e) => {
    if (!showRefIntDrop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRefIntActiveIndex((prev) =>
        prev < filteredRefInt.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRefIntActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (refIntActiveIndex >= 0 && refIntActiveIndex < filteredRefInt.length) {
        sb("refNoInternal", filteredRefInt[refIntActiveIndex]);
        setShowRefIntDrop(false);
        setRefIntActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowRefIntDrop(false);
      setRefIntActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (showCustDrop && custActiveIndex >= 0) {
      const container = document.querySelector(".cust-drop-container");
      const activeItem = container?.children[custActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [custActiveIndex, showCustDrop]);

  useEffect(() => {
    if (showRefCustDrop && refCustActiveIndex >= 0) {
      const container = document.querySelector(".ref-cust-drop-container");
      const activeItem = container?.children[refCustActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [refCustActiveIndex, showRefCustDrop]);

  useEffect(() => {
    if (showRefIntDrop && refIntActiveIndex >= 0) {
      const container = document.querySelector(".ref-int-drop-container");
      const activeItem = container?.children[refIntActiveIndex];
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [refIntActiveIndex, showRefIntDrop]);

  const selectCustomer = (c) => {
    if (isReadOnly) return;
    setBase((p) => ({
      ...p,
      customerCode: c.code,
      customerName: c.name,
      category: c.type || p.category,
    }));
    setCustSearch(c.name);
    setShowCustDrop(false);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        productCode: "",
        productDescription: "",
        productSegment: "",
      })),
    );
    setIsDirty(true);
  };

  const removeProduct = (pid) => {
    setProducts((prev) => prev.filter((p) => p._pid !== pid));
    setIsDirty(true);
  };

  const confirmAddRows = (count) => {
    setProducts((prev) => {
      const newRows = Array.from({ length: count }, () => emptyProduct());
      return [...prev, ...newRows];
    });
    setIsDirty(true);
  };

  const requestDuplicate = (prod) => setDupeTarget(prod);
  const confirmDuplicate = (prod, count) => {
    if (!prod.productCode) {
      toast("Please select a product before duplicating.", "warning");
      return;
    }
    const copies = Array.from({ length: count }, () => ({
      ...prod,
      _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serialNumber: "",
      boardType: "",
    }));
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._pid === prod._pid);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, ...copies);
      return next;
    });
    setIsDirty(true);
    setDupeTarget(null);
  };

  const custDbForRows = useMemo(() => {
    const map = {};
    customerDbFlat.forEach((r) => {
      if (!map[r.partyCode]) map[r.partyCode] = [];
      map[r.partyCode].push(r);
    });
    return map;
  }, [customerDbFlat]);

  // Handle Add Customer Modal Actions
  const handleAddCustItemRow = () => {
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
  };

  const handleRemoveCustItemRow = (idx) => {
    if (newCustomer.items.length === 1) return;
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.filter((_, i) => i !== idx),
    });
  };

  const handleCustItemChange = (idx, field, val) => {
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    const cleanStr = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const dups = newCustomer.items.filter((ni) =>
      customerDbFlat.some((d) => cleanStr(d.itemCode) === cleanStr(ni.itemCode)),
    );
    if (dups.length > 0) {
      toast(`Item Code "${dups[0].itemCode}" already exists!`, "error");
      return;
    }

    const invalidWarranty = newCustomer.items.find((item) => {
      const val = Number(item.warrantyPeriodDays);
      return item.warrantyPeriodDays === "" || isNaN(val) || val < 0;
    });

    if (invalidWarranty) {
      toast(
        `Please enter a valid non-negative numeric Warranty Period for item "${invalidWarranty.itemCode || "unnamed"}".`,
        "warning",
      );
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

    const updated = [...newRows, ...customerDbFlat].sort((a, b) =>
      (a.partyCode || "").localeCompare(b.partyCode || ""),
    );
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updated));
    if (typeof setCustomerDb === "function") {
      setCustomerDb(updated);
    }
    setBase((p) => ({
      ...p,
      customerCode: newCustomer.partyCode,
      customerName: newCustomer.partyDescription,
      category: newCustomer.partyType || p.category,
    }));
    setCustSearch(newCustomer.partyDescription);
    toast("Customer added successfully!", "success");
    setShowAddCustModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasExpDateChanges =
      isReadOnly &&
      products.some(
        (p) =>
          p.expectedDeliveryDate !==
          (initialData.products?.find((ip) => ip._pid === p._pid)
            ?.expectedDeliveryDate || ""),
      );
    if (isReadOnly && !hasExpDateChanges) {
      onBack();
      return;
    }
    if (!base.customerCode) {
      toast("Please select a customer before submitting.", "error");
      return;
    }
    if (products.length === 0 || !products[0].productCode) {
      toast("At least one valid product must be added.", "error");
      return;
    }

    const flows = lsLoad(ESCALATION_FLOWS_KEY, {});
    const flow = flows["Service Material"] || [];
    const step0 = flow[0] || {};
    const slaMs =
      (step0.durationHours || 2) * 3600_000 +
      (step0.durationMins || 0) * 60_000;
    const now = new Date().toISOString();
    const nowMs = Date.now();

    if (
      base.unit &&
      (!units ||
        !units.some((u) => u.name.toLowerCase() === base.unit.toLowerCase()))
    ) {
      try {
        await axios.post(`${API_URL}/master/units`, { name: base.unit });
      } catch (err) {
        console.error("Failed to auto-add new unit:", err);
      }
    }

    if (isEdit || isReadOnly) {
      const updated = {
        ...initialData,
        ...base,
        products,
        productCode: products[0].productCode,
        productDescription: products[0].productDescription,
        serialNumber: products[0].serialNumber,
        boardType: products[0].boardType,
        qty: products[0].qty,
        type: products[0].type,
        expectedDeliveryDate: products[0].expectedDeliveryDate,
        _editing: undefined,
        _readonly: undefined,
      };
      onSave(updated, true);
    } else {
      const escalationHistory = [
        {
          level: 0,
          department: base.assignedDepartment || step0.dept || "",
          engineerId: base.assignedTo,
          engineerName: base.assignedToName,
          assignedAt: now,
          deadline: new Date(nowMs + slaMs).toISOString(),
        },
      ];
      const row = {
        id: `smi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        refNo: genRef(),
        dateTime: new Date().toLocaleString(),
        timestamp: now,
        ...base,
        products,
        productCode: products[0].productCode,
        productDescription: products[0].productDescription,
        productSegment: products[0].productSegment,
        serialNumber: products[0].serialNumber,
        boardType: products[0].boardType,
        qty: products[0].qty,
        type: products[0].type,
        expectedDeliveryDate: products[0].expectedDeliveryDate,
        status: "Open",
        escalationLevel: 0,
        escalationHistory,
        currentEngineerId: "",
        qcActions: [],
      };
      onSave(row, false);
    }
    setIsDirty(false);
  };

  const handleBackClick = () => {
    if (isDirty && !isReadOnly) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full flex flex-col font-sans flex-1 min-h-0 overflow-hidden pr-[0.3vw]"
    >
      <AnimatePresence>
        {dupeTarget && (
          <DuplicateModal
            onConfirm={(count) => confirmDuplicate(dupeTarget, count)}
            onClose={() => setDupeTarget(null)}
          />
        )}
        {showUnsavedModal && (
          <UnsavedChangesModal
            onConfirm={() => {
              setShowUnsavedModal(false);
              onBack();
            }}
            onClose={() => setShowUnsavedModal(false)}
          />
        )}
        {showAddRowsModal && (
          <AddRowsModal
            onConfirm={confirmAddRows}
            onClose={() => setShowAddRowsModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Header Card (Styled exactly like ServiceCallForm) */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.7vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-200 mb-[0.6vw] shrink-0">
        <div className="flex items-center gap-[0.9vw]">
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center gap-[0.4vw] text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-[0.75vw] py-[0.35vw] rounded-[0.5vw] cursor-pointer text-[0.78vw] font-medium transition-colors"
          >
            <ArrowLeft className="w-[0.9vw] h-[0.9vw]" />
            <span>Back</span>
          </button>
          <h2 className="text-[1.05vw] font-bold text-slate-800">
            {isReadOnly
              ? initialData.products?.some((p) => p.expectedDeliveryDate === "")
                ? "Update Inward Entry"
                : "View Inward Entry"
              : isEdit
                ? "Edit Inward Entry"
                : "New Service Material Inward"}
          </h2>
          {isReadOnly && (
            <span className="text-[0.74vw] bg-purple-50 text-purple-600 border border-purple-200 px-[0.6vw] py-[0.15vw] rounded-full flex items-center gap-[0.3vw] font-semibold">
              <Eye className="w-[0.85vw] h-[0.85vw]" />
              {initialData.products?.some((p) => p.expectedDeliveryDate === "")
                ? "Partial Edit Mode — Exp. Delivery Date"
                : "Read Only Mode"}
            </span>
          )}
          {!isReadOnly && !isEdit && products.length > 1 && (
            <span className="text-[0.74vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.15vw] rounded-full font-semibold">
              {products.length} products in this entry
            </span>
          )}
        </div>

        {/* Ref / Identifier Pill */}
        <div className="bg-blue-50/80 border border-blue-200 px-[0.9vw] py-[0.35vw] rounded-[0.5vw] text-[0.8vw] flex items-center gap-[0.4vw]">
          <span className="text-slate-500 font-medium">Ref No:</span>
          <span className="font-mono font-bold text-blue-600">
            {initialData.refNo || "Auto Generated"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Middle Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-[0.4vw] flex flex-col gap-[0.9vw] pb-[0.8vw] custom-scrollbar">

          {/* SECTION 1: Customer Information */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
            <div className="flex items-center gap-[0.45vw] mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <span className="w-[0.25vw] h-[0.9vw] bg-blue-600 rounded-full inline-block" />
              <User className="w-[1vw] h-[1vw] text-blue-600" />
              <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
                Customer Information
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-[1.2vw]">
              {/* Date */}
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Date
                </label>
                <input
                  readOnly
                  value={fmtDate(base.date)}
                  className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-600 cursor-not-allowed font-medium outline-none"
                  title="Auto date (read only)"
                />
              </div>

              {/* Reference No (Customer) */}
              <div className="flex flex-col gap-[0.35vw] relative" ref={refCustRef}>
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Reference No <span className="text-slate-400 font-normal ml-1">(Customer)</span>
                </label>
                <div className="relative">
                  <input
                    value={base.refNoCustomer}
                    onChange={(e) => {
                      sb("refNoCustomer", e.target.value);
                      if (!isReadOnly) {
                        setShowRefCustDrop(true);
                        setRefCustActiveIndex(-1);
                      }
                    }}
                    onKeyDown={handleRefCustKeyDown}
                    onFocus={() => {
                      if (!isReadOnly) {
                        setShowRefCustDrop(true);
                        setRefCustActiveIndex(-1);
                      }
                    }}
                    disabled={isReadOnly}
                    placeholder="Enter customer ref no…"
                    className="w-full border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/70 disabled:cursor-not-allowed transition-all"
                  />
                  {showRefCustDrop && !isReadOnly && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-[0.5vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                      <div className="ref-cust-drop-container">
                        {filteredRefCust.map((r, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              sb("refNoCustomer", r);
                              setShowRefCustDrop(false);
                              setRefCustActiveIndex(-1);
                            }}
                            className={`p-[0.6vw] cursor-pointer border-b border-slate-100 last:border-0 font-medium text-[0.78vw] text-slate-800 ${
                              i === refCustActiveIndex ? "bg-blue-100 text-blue-800" : "hover:bg-blue-50"
                            }`}
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                      {filteredRefCust.length === 0 && (
                        <div className="p-[0.7vw] text-center text-slate-400 text-[0.76vw]">
                          No matching references
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Reference No (Internal) */}
              <div className="flex flex-col gap-[0.35vw] relative" ref={refIntRef}>
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Reference No <span className="text-slate-400 font-normal ml-1">(Internal)</span>
                </label>
                <div className="relative">
                  <input
                    value={base.refNoInternal}
                    onChange={(e) => {
                      sb("refNoInternal", e.target.value);
                      if (!isReadOnly) {
                        setShowRefIntDrop(true);
                        setRefIntActiveIndex(-1);
                      }
                    }}
                    onKeyDown={handleRefIntKeyDown}
                    onFocus={() => {
                      if (!isReadOnly) {
                        setShowRefIntDrop(true);
                        setRefIntActiveIndex(-1);
                      }
                    }}
                    disabled={isReadOnly}
                    placeholder="Enter internal ref no…"
                    className="w-full border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/70 disabled:cursor-not-allowed transition-all"
                  />
                  {showRefIntDrop && !isReadOnly && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-[0.5vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                      <div className="ref-int-drop-container">
                        {filteredRefInt.map((r, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              sb("refNoInternal", r);
                              setShowRefIntDrop(false);
                              setRefIntActiveIndex(-1);
                            }}
                            className={`p-[0.6vw] cursor-pointer border-b border-slate-100 last:border-0 font-medium text-[0.78vw] text-slate-800 ${
                              i === refIntActiveIndex ? "bg-blue-100 text-blue-800" : "hover:bg-blue-50"
                            }`}
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                      {filteredRefInt.length === 0 && (
                        <div className="p-[0.7vw] text-center text-slate-400 text-[0.76vw]">
                          No matching references
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Category
                </label>
                <CustomDropdown
                  value={base.category}
                  onChange={(val) => {
                    sb("category", val);
                    setCustSearch("");
                    sb("customerName", "");
                    sb("customerCode", "");
                  }}
                  disabled={isReadOnly}
                  placeholder="Select Category (All)"
                  options={[
                    { value: "", label: "Select Category (All)" },
                    ...partyTypes.map((t) => ({
                      value: t.name,
                      label: t.name,
                    })),
                  ]}
                  triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800 bg-white"
                />
              </div>

              {/* Row 2: Customer Name (col-span-2) */}
              <div className="col-span-2 flex flex-col gap-[0.35vw] relative" ref={custRef}>
                <label className="text-[0.76vw] font-semibold text-slate-700 flex justify-between items-center h-[1.3vw]">
                  <span>
                    Customer Name <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[0.72vw] text-slate-400 font-normal">
                    ({filteredCustomers.length} available)
                  </span>
                </label>
                <div className="flex gap-[0.5vw]">
                  <div className="relative flex-1">
                    <Search className="absolute left-[0.7vw] top-1/2 -translate-y-1/2 w-[0.95vw] h-[0.95vw] text-slate-400" />
                    <input
                      type="text"
                      value={custSearch}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          setCustSearch(e.target.value);
                          sb("customerName", e.target.value);
                          sb("customerCode", "");
                          setShowCustDrop(true);
                          setCustActiveIndex(-1);
                        }
                      }}
                      onKeyDown={handleCustKeyDown}
                      onFocus={() => {
                        if (!isReadOnly) {
                          setShowCustDrop(true);
                          setCustActiveIndex(-1);
                        }
                      }}
                      disabled={isReadOnly}
                      placeholder="Search & select customer…"
                      className="w-full border border-slate-200 rounded-[0.5vw] pl-[2.2vw] pr-[2vw] h-[2.3vw] bg-white text-[0.8vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/70 disabled:cursor-not-allowed transition-all"
                    />
                    {custSearch && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustSearch("");
                          sb("customerName", "");
                          sb("customerCode", "");
                          setProducts([emptyProduct()]);
                          setShowCustDrop(false);
                        }}
                        className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 p-[0.15vw] text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Clear Customer"
                      >
                        <X className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                    )}
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomer({
                          partyCode: "",
                          partyDescription: custSearch || "",
                          partyType: partyTypes[0]?.name || "OEM",
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
                        setShowAddCustModal(true);
                      }}
                      className="flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.9vw] h-[2.3vw] rounded-[0.5vw] cursor-pointer text-[0.78vw] font-medium transition-colors shrink-0 shadow-xs"
                    >
                      <UserPlus className="w-[0.9vw] h-[0.9vw]" />
                      <span>New</span>
                    </button>
                  )}
                </div>

                {showCustDrop && !isReadOnly && (
                  <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-[0.5vw] mt-[0.3vw] max-h-[14vw] overflow-y-auto z-30">
                    <div className="cust-drop-container">
                      {filteredCustomers.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => selectCustomer(c)}
                          className={`p-[0.65vw] cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors ${
                            i === custActiveIndex ? "bg-blue-100" : "hover:bg-blue-50/70"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-[0.8vw]">
                              {c.name}
                            </div>
                            <div className="text-[0.68vw] text-slate-400 font-mono">
                              {c.code}
                            </div>
                          </div>
                          <span
                            className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full font-medium border ${getTypeColor(c.type, partyTypes)}`}
                          >
                            {c.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    {filteredCustomers.length === 0 && (
                      <div className="p-[1vw] text-slate-400 text-center text-[0.76vw]">
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Code */}
              <div className="col-span-1 flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Customer Code
                </label>
                <input
                  readOnly
                  value={base.customerCode}
                  className="bg-slate-100/70 border border-slate-200 rounded-[0.5vw] h-[2.3vw] px-[0.75vw] text-[0.8vw] text-slate-600 font-mono font-medium outline-none cursor-not-allowed"
                />
              </div>

              {/* Site */}
              <div className="col-span-1 flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Site
                </label>
                <CustomDropdown
                  value={base.site || ""}
                  onChange={(val) => sb("site", val)}
                  disabled={isReadOnly}
                  placeholder="Select Site"
                  options={[
                    { value: "", label: "Select Site" },
                    ...sites.map((s) => ({
                      value: s.name,
                      label: s.name,
                    })),
                  ]}
                  triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800 bg-white"
                />
              </div>

              {/* Row 3: Unit */}
              <div className="col-span-1 flex flex-col gap-[0.35vw]">
                <label className="text-[0.76vw] font-semibold text-slate-700 flex items-center h-[1.3vw]">
                  Unit
                </label>
                <CustomDropdown
                  value={base.unit || ""}
                  onChange={(val) => sb("unit", val)}
                  disabled={isReadOnly}
                  placeholder="Select Unit"
                  options={[
                    { value: "", label: "Select Unit" },
                    ...(units || []).map((u) => ({
                      value: u.name,
                      label: u.name,
                    })),
                  ]}
                  triggerClassName="h-[2.3vw] !rounded-[0.5vw] border-slate-200 text-[0.8vw] text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Product & Service Details */}
          <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-slate-200 p-[1.2vw]">
            <div className="flex items-center justify-between mb-[0.9vw] pb-[0.6vw] border-b border-slate-100">
              <div className="flex items-center gap-[0.45vw]">
                <span className="w-[0.25vw] h-[0.9vw] bg-indigo-600 rounded-full inline-block" />
                <Package className="w-[1vw] h-[1vw] text-indigo-600" />
                <h3 className="text-[0.82vw] font-bold text-slate-800 uppercase tracking-wider">
                  Product &amp; Service Details
                </h3>
                {base.customerCode && (
                  <span className="ml-[0.5vw] text-[0.7vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.5vw] py-[0.1vw] rounded-full font-semibold">
                    {products.length} count{products.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {!isReadOnly && base.customerCode && (
                <button
                  type="button"
                  onClick={() => setShowAddRowsModal(true)}
                  className="flex items-center gap-[0.35vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.9vw] h-[2.1vw] rounded-[0.5vw] text-[0.78vw] font-medium cursor-pointer transition-colors shadow-xs"
                >
                  <PlusCircle className="w-[0.9vw] h-[0.9vw]" />
                  <span>Add Product Row</span>
                </button>
              )}
            </div>

            {!base.customerCode && !isReadOnly && (
              <div className="text-[0.78vw] font-medium text-blue-700 bg-blue-50/70 border border-dashed border-blue-300 rounded-[0.6vw] p-[1.6vw] text-center mb-[0.4vw]">
                Please search and select a Customer from the dropdown above to enable product entry.
              </div>
            )}

            {base.customerCode && (
              <div className="mt-[0.6vw]">
                <EditableProductTable
                  products={products}
                  setProducts={setProducts}
                  customerCode={base.customerCode}
                  customerCategory={base.category}
                  customerDb={custDbForRows}
                  boardTypes={boardTypes}
                  isReadOnly={isReadOnly}
                  allowPartialEdit={
                    isReadOnly &&
                    initialData.products?.some(
                      (p) => p.expectedDeliveryDate === "",
                    )
                  }
                  onDuplicate={requestDuplicate}
                  onRemove={removeProduct}
                  registrationDate={base.date}
                />
              </div>
            )}
          </div>

        </div>

        {/* Footer Action Bar (Exact ServiceCallForm Style) */}
        <div className="flex justify-end gap-[0.8vw] bg-white border border-slate-200 py-[0.65vw] px-[1.2vw] rounded-[0.8vw] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] mt-[0.5vw] shrink-0">
          <button
            type="button"
            onClick={handleBackClick}
            className="px-[1.4vw] h-[2.2vw] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-[0.5vw] cursor-pointer flex items-center gap-[0.4vw] font-medium text-[0.78vw] transition-colors"
          >
            <X className="w-[0.9vw] h-[0.9vw]" />
            <span>
              {isReadOnly &&
              !products.some(
                (p) =>
                  p.expectedDeliveryDate !==
                  (initialData.products?.find((ip) => ip._pid === p._pid)
                    ?.expectedDeliveryDate || ""),
              )
                ? "Close"
                : "Cancel"}
            </span>
          </button>
          {(isEdit ? canUpdate : canWrite) &&
            (!isReadOnly ||
              products.some(
                (p) =>
                  p.expectedDeliveryDate !==
                  (initialData.products?.find((ip) => ip._pid === p._pid)
                    ?.expectedDeliveryDate || ""),
              )) && (
              <button
                type="submit"
                className="px-[1.6vw] h-[2.2vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.5vw] flex items-center gap-[0.4vw] cursor-pointer font-medium text-[0.78vw] shadow-sm hover:shadow transition-all"
              >
                <Save className="w-[0.9vw] h-[0.9vw]" />
                <span>{isEdit || isReadOnly ? "Update Entry" : "Register Inward"}</span>
              </button>
            )}
        </div>
      </form>

      {/* Add Customer Modal (Like ServiceCallForm) */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-[58vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-[1vw] py-[0.7vw] border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-[1.1vw] font-bold text-slate-800">
                Add Customer &amp; Items
              </h2>
              <button
                onClick={() => setShowAddCustModal(false)}
                className="text-slate-400 hover:text-rose-500 cursor-pointer p-[0.2vw] transition-colors"
              >
                <X className="w-[1.1vw] h-[1.1vw]" />
              </button>
            </div>
            <form
              onSubmit={handleAddCustomerSubmit}
              className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto"
            >
              <div className="bg-slate-50/80 p-[1vw] rounded-[0.6vw] border border-slate-200">
                <h3 className="text-[0.85vw] font-bold text-slate-700 mb-[0.8vw]">
                  Party Details
                </h3>
                <div className="grid grid-cols-2 gap-[1.2vw] mb-[0.8vw]">
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="text-[0.76vw] text-slate-700 font-medium">
                      Party Code <span className="text-rose-500">*</span>
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
                      className="border border-slate-200 p-[0.55vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none text-[0.8vw]"
                      placeholder="e.g. CUS-001"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="text-[0.76vw] text-slate-700 font-medium">
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
                      triggerClassName="!p-[0.55vw] !rounded-[0.4vw] bg-white border-slate-200 text-[0.8vw]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-[0.35vw] mb-[0.8vw]">
                  <label className="text-[0.76vw] text-slate-700 font-medium">
                    Party Description <span className="text-rose-500">*</span>
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
                    className="border border-slate-200 p-[0.55vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none text-[0.8vw]"
                    placeholder="Company Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-[1.2vw]">
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="text-[0.76vw] text-slate-700 font-medium">State</label>
                    <input
                      value={newCustomer.state}
                      list="mat-ctx-states-datalist"
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          state: e.target.value,
                        })
                      }
                      className="border border-slate-200 p-[0.55vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none text-[0.8vw]"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.35vw]">
                    <label className="text-[0.76vw] text-slate-700 font-medium">
                      District / City
                    </label>
                    <input
                      value={newCustomer.districtCity}
                      list="mat-ctx-districts-datalist"
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          districtCity: e.target.value,
                        })
                      }
                      className="border border-slate-200 p-[0.55vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none text-[0.8vw]"
                      placeholder="e.g. Coimbatore"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[1vw]">
                <div className="flex justify-between items-center mb-[0.6vw]">
                  <h3 className="text-[0.85vw] font-bold text-slate-800">
                    Product Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCustItemRow}
                    className="text-blue-600 hover:text-blue-800 text-[0.78vw] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-[0.9vw] h-[0.9vw]" />
                    Add Another Item
                  </button>
                </div>
                <div className="flex flex-col gap-[0.6vw]">
                  {newCustomer.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-[0.6vw] items-center border border-slate-100 p-[0.6vw] rounded-[0.4vw] bg-slate-50/50"
                    >
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.72vw] text-slate-500 font-medium">
                            Product Segment
                          </label>
                        )}
                        <input
                          required
                          value={item.productSegment}
                          list="mat-ctx-segments-datalist"
                          onChange={(e) =>
                            handleCustItemChange(
                              idx,
                              "productSegment",
                              e.target.value,
                            )
                          }
                          className="border border-slate-200 p-[0.45vw] rounded-[0.4vw] text-[0.8vw] bg-white outline-none"
                          placeholder="Segment"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.72vw] text-slate-500 font-medium">
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
                          className="border border-slate-200 p-[0.45vw] rounded-[0.4vw] text-[0.8vw] bg-white outline-none"
                          placeholder="Code"
                        />
                      </div>
                      <div className="flex-[2] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.72vw] text-slate-500 font-medium">
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
                          className="border border-slate-200 p-[0.45vw] rounded-[0.4vw] text-[0.8vw] bg-white outline-none"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex-[0.7] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.72vw] text-slate-500 font-medium">
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
                          className="border border-slate-200 p-[0.45vw] rounded-[0.4vw] text-[0.8vw] bg-white outline-none"
                          placeholder="Days"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveCustItemRow(idx)}
                          disabled={newCustomer.items.length === 1}
                          className={`text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer p-[0.2vw] ${
                            idx === 0 ? "mt-[1.3vw]" : ""
                          }`}
                        >
                          <MinusCircle className="w-[1.1vw] h-[1.1vw]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-[0.8vw] pt-[0.4vw]">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-[1.4vw] h-[2.2vw] border border-slate-300 rounded-[0.5vw] hover:bg-slate-50 cursor-pointer text-slate-700 text-[0.78vw] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[1.6vw] h-[2.2vw] bg-blue-600 text-white rounded-[0.5vw] hover:bg-blue-700 flex items-center gap-[0.4vw] cursor-pointer text-[0.78vw] font-medium transition-colors shadow-xs"
                >
                  Save All
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Datalists for Modal Autocomplete */}
      <datalist id="mat-ctx-states-datalist">
        {uniqueStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="mat-ctx-districts-datalist">
        {uniqueDistricts.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="mat-ctx-segments-datalist">
        {uniqueSegments.map((seg) => (
          <option key={seg} value={seg} />
        ))}
      </datalist>
    </motion.div>
  );
};

export default ServiceMaterialForm;
