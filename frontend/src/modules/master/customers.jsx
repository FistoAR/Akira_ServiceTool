import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import {
  Search,
  UploadCloud,
  Plus,
  FileSpreadsheet,
  X,
  Check,
  Filter,
  Trash2,
  Save,
  FileWarning,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  PlusCircle,
  MinusCircle,
  Settings,
  Edit2,
  Tag,
  Loader2,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";
import useModulePermissions from "../../components/useModulePermissions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const STORAGE_KEY = "customer_db_grouped_v5";
const PARTY_TYPES_KEY = "party_types_v3";
const PRODUCT_SEGMENTS_KEY = "product_segments_v1";
const COLUMN_VIS_KEY = "customer_db_col_visibility";
const ITEMS_PER_PAGE = 10;

// ── Column definitions (must match SystemSettingsPage) ────────────────────────
const CUSTOMER_DB_COLUMNS = [
  { key: "partyType", label: "Party Type" },
  { key: "partyCode", label: "Party Code", required: true },
  { key: "partyDescription", label: "Party Description", required: true },
  { key: "itemCode", label: "Item Code", required: true },
  { key: "itemDescription", label: "Item Description" },
  { key: "warrantyPeriodDays", label: "Warranty (days)" },
  { key: "productSegment", label: "Product Segment" },
  { key: "state", label: "State" },
  { key: "districtCity", label: "District/City" },
];

async function loadColVisibility() {
  try {
    const res = await axios.get(`${API_URL}/master/settings/${COLUMN_VIS_KEY}`);
    const stored = res.data || {};
    const def = Object.fromEntries(
      CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
    );
    return { ...def, ...stored };
  } catch {
    return Object.fromEntries(CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]));
  }
}

// Columns that use rowSpan (grouped per party)
const ROW_SPAN_COLS = new Set([
  "partyType",
  "partyCode",
  "partyDescription",
  "state",
  "districtCity",
]);

// ── AutocompleteInput component ───────────────────────────────────────────────
function AutocompleteInput({ value, onChange, suggestions, placeholder, className, required, id }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value) return suggestions.slice(0, 15);
    const lower = value.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(lower)).slice(0, 15);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [filtered]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          onChange(filtered[selectedIndex]);
          setOpen(false);
          setFocused(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setFocused(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const showDropdown = focused && open && filtered.length > 0;

  return (
    <div ref={ref} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        required={required}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
      />
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-400 rounded-[0.4vw] shadow-lg max-h-[14vw] overflow-y-auto">
          {filtered.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
                setFocused(false);
                setSelectedIndex(-1);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`px-[0.8vw] py-[0.5vw] cursor-pointer text-[0.85vw] text-gray-800 border-b border-gray-50 last:border-0 ${
                selectedIndex === i ? "bg-blue-100" : "hover:bg-blue-50"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CustomerDatabase = () => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("customers");
  const { toast, confirm } = useNotification();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [partyTypes, setPartyTypes] = useState([]);
  const [colVis, setColVis] = useState({});
  const [segments, setSegments] = useState([]);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState({
    total: 0,
    valid: 0,
    duplicates: 0,
    errors: 0,
    validRows: [],
    issues: [],
  });
  const [newEntry, setNewEntry] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: "",
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
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Edit State ──────────────────────────────────────────────────────────────
  const [editingPartyCode, setEditingPartyCode] = useState(null); // partyCode being edited
  const [editEntry, setEditEntry] = useState(null); // { partyCode, partyDescription, partyType, state, districtCity, items:[...] }

  // Reload col visibility when tab regains focus (changed in System Settings)
  useEffect(() => {
    const onFocus = () => setColVis(loadColVisibility());
    window.addEventListener("focus", onFocus);
    const onStorage = (e) => {
      if (e.key === COLUMN_VIS_KEY) setColVis(loadColVisibility());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Reload data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ptRes, dbRes, colRes, segRes] = await Promise.all([
        axios.get(`${API_URL}/master/party-types`),
        axios.get(`${API_URL}/master/customers`),
        axios.get(`${API_URL}/master/settings/${COLUMN_VIS_KEY}`),
        axios.get(`${API_URL}/master/product-segments`)
      ]);
      
      const normalizedPT = ptRes.data.map(t => ({ ...t, id: t.id || t._id }));
      setPartyTypes(normalizedPT.length ? normalizedPT : [
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ]);
      
      setData(dbRes.data.sort((a, b) => a.partyCode.localeCompare(b.partyCode)));
      
      const defCols = Object.fromEntries(CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]));
      setColVis({ ...defCols, ...(colRes.data || {}) });

      setSegments(segRes.data);

    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user?.role === "Supervisor") setIsSupervisor(true);
  }, []);

  useEffect(() => {
    if (partyTypes.length > 0 && !newEntry.partyType)
      setNewEntry((p) => ({ ...p, partyType: partyTypes[0].name }));
  }, [partyTypes]);

  const saveToStorage = async (nd) => {
    try {
      await axios.post(`${API_URL}/master/customers/bulk`, { customers: nd });
      const sorted = [...nd].sort((a, b) =>
        a.partyCode.localeCompare(b.partyCode),
      );
      setData(sorted);
    } catch (err) {
      toast("Failed to save to backend", "error");
    }
  };

  const cleanStr = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // ── Autocomplete suggestion data ──────────────────────────────────────────
  const uniqueStates = useMemo(() => {
    const states = new Set();
    data.forEach((item) => { if (item.state) states.add(item.state); });
    return Array.from(states).sort();
  }, [data]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    data.forEach((item) => { if (item.districtCity) districts.add(item.districtCity); });
    return Array.from(districts).sort();
  }, [data]);

  const uniqueSegments = useMemo(() => {
    const s = new Set();
    segments.forEach((x) => s.add(x.name));
    data.forEach((item) => { if (item.productSegment) s.add(item.productSegment); });
    return Array.from(s).sort();
  }, [data, segments]);

  const uniqueItemDescriptions = useMemo(() => {
    const s = new Set();
    data.forEach((item) => { if (item.itemDescription) s.add(item.itemDescription); });
    return Array.from(s).sort();
  }, [data]);

  // Filtered districts based on selected state in Add Modal
  const addModalDistricts = useMemo(() => {
    const d = new Set();
    data.forEach((item) => {
      if (item.districtCity && (!newEntry.state || item.state === newEntry.state)) {
        d.add(item.districtCity);
      }
    });
    return Array.from(d).sort();
  }, [data, newEntry.state]);

  // Filtered districts based on selected state in Edit Modal
  const editModalDistricts = useMemo(() => {
    if (!editEntry) return [];
    const d = new Set();
    data.forEach((item) => {
      if (item.districtCity && (!editEntry.state || item.state === editEntry.state)) {
        d.add(item.districtCity);
      }
    });
    return Array.from(d).sort();
  }, [data, editEntry?.state]);

  // Party code & description suggestions
  const uniquePartyCodes = useMemo(() => {
    const seen = new Set();
    const result = [];
    data.forEach((item) => {
      if (item.partyCode && !seen.has(item.partyCode)) {
        seen.add(item.partyCode);
        result.push(item.partyCode);
      }
    });
    return result.sort();
  }, [data]);

  const uniquePartyDescriptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    data.forEach((item) => {
      if (item.partyDescription && !seen.has(item.partyDescription)) {
        seen.add(item.partyDescription);
        result.push(item.partyDescription);
      }
    });
    return result.sort();
  }, [data]);

  // Build a lookup: partyCode -> party info + items already in DB
  const partyLookupByCode = useMemo(() => {
    const map = {};
    data.forEach((row) => {
      if (!map[row.partyCode]) {
        map[row.partyCode] = {
          partyCode: row.partyCode,
          partyDescription: row.partyDescription,
          partyType: row.partyType,
          state: row.state,
          districtCity: row.districtCity,
          items: [],
        };
      }
      map[row.partyCode].items.push({
        productSegment: row.productSegment || "",
        itemCode: row.itemCode || "",
        itemDescription: row.itemDescription || "",
        warrantyPeriodDays: String(row.warrantyPeriodDays ?? ""),
      });
    });
    return map;
  }, [data]);

  const partyLookupByDesc = useMemo(() => {
    const map = {};
    data.forEach((row) => {
      if (!map[row.partyDescription]) {
        map[row.partyDescription] = row.partyCode;
      }
    });
    return map;
  }, [data]);

  // ── When partyCode is selected in Add modal → auto-fill party info + items ─
  const handleAddPartyCodeChange = (val) => {
    setNewEntry((prev) => {
      const party = partyLookupByCode[val];
      if (party) {
        // Existing party — fill in details + show existing items (editable) + one new blank item
        return {
          ...prev,
          partyCode: val,
          partyDescription: party.partyDescription,
          partyType: party.partyType,
          state: party.state || "",
          districtCity: party.districtCity || "",
          items: [
            ...party.items.map((it) => ({ ...it, _existing: true })),
            { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false },
          ],
        };
      }
      return { ...prev, partyCode: val };
    });
  };

  const handleAddPartyDescChange = (val) => {
    setNewEntry((prev) => {
      // If description matches a known party, auto-fill by code
      const code = partyLookupByDesc[val];
      if (code) {
        const party = partyLookupByCode[code];
        if (party) {
          return {
            ...prev,
            partyDescription: val,
            partyCode: party.partyCode,
            partyType: party.partyType,
            state: party.state || "",
            districtCity: party.districtCity || "",
            items: [
              ...party.items.map((it) => ({ ...it, _existing: true })),
              { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false },
            ],
          };
        }
      }
      return { ...prev, partyDescription: val };
    });
  };

  // ── Manual add helpers ─────────────────────────────────────────────────────
  const handleAddItemRow = () =>
    setNewEntry({
      ...newEntry,
      items: [
        ...newEntry.items,
        { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false },
      ],
    });

  const handleRemoveItemRow = (idx) => {
    if (newEntry.items.length === 1) return;
    setNewEntry({
      ...newEntry,
      items: newEntry.items.filter((_, i) => i !== idx),
    });
  };

  const handleItemChange = (idx, field, val) =>
    setNewEntry({
      ...newEntry,
      items: newEntry.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const existingItems = newEntry.items.filter((it) => it._existing);
    const newItems = newEntry.items.filter((it) => !it._existing);
    const validNewItems = newItems.filter((item) => item.itemCode && item.itemCode.trim());

    try {
      const partyCode = newEntry.partyCode;

      // Auto-add new party type if missing
      const pType = newEntry.partyType?.trim();
      if (pType && !partyTypes.some(pt => pt.name.toLowerCase() === pType.toLowerCase())) {
        try {
          const res = await axios.post(`${API_URL}/master/party-types`, { name: pType });
          setPartyTypes(prev => [...prev, res.data]);
        } catch (e) {
          console.error("Failed to auto-add party type", e);
        }
      }

      // Auto-add new product segments if missing
      const uniqueInputSegments = [...new Set(
        [...existingItems, ...newItems].map(it => it.productSegment).filter(s => s && s.trim())
      )];
      for (const seg of uniqueInputSegments) {
        if (!segments.some(s => s.name.toLowerCase() === seg.toLowerCase())) {
          try {
            const res = await axios.post(`${API_URL}/master/product-segments`, { name: seg });
            setSegments(prev => [...prev, res.data]);
          } catch (e) {
            console.error("Failed to auto-add segment", e);
          }
        }
      }
      
      // Update rows in backend
      const updatedExistingRows = existingItems.map((item) => ({
        partyCode: newEntry.partyCode,
        partyDescription: newEntry.partyDescription,
        partyType: newEntry.partyType,
        state: newEntry.state,
        districtCity: newEntry.districtCity,
        productSegment: item.productSegment,
        itemCode: item.itemCode,
        itemDescription: item.itemDescription,
        warrantyPeriodDays: item.warrantyPeriodDays,
      }));

      const newRows = validNewItems.map((item) => ({
        partyCode: newEntry.partyCode,
        partyDescription: newEntry.partyDescription,
        partyType: newEntry.partyType,
        state: newEntry.state,
        districtCity: newEntry.districtCity,
        productSegment: item.productSegment,
        itemCode: item.itemCode,
        itemDescription: item.itemDescription,
        warrantyPeriodDays: Number(item.warrantyPeriodDays),
      }));

      // In manual submit, we replace all rows for THIS party
      const otherData = data.filter((d) => d.partyCode !== partyCode);
      const finalData = [...otherData, ...updatedExistingRows, ...newRows];
      
      await axios.post(`${API_URL}/master/customers/bulk`, { customers: finalData });
      
      setData(finalData.sort((a,b) => a.partyCode.localeCompare(b.partyCode)));

      setShowAddModal(false);
      setNewEntry({
        partyCode: "",
        partyDescription: "",
        partyType: partyTypes[0]?.name || "",
        state: "",
        districtCity: "",
        items: [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false }],
      });
      toast("Customer saved successfully!", "success");
    } catch (err) {
      toast("Failed to save customer", "error");
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const openEditModal = (partyCode) => {
    const party = partyLookupByCode[partyCode];
    if (!party) return;
    setEditEntry({
      partyCode: party.partyCode,
      partyDescription: party.partyDescription,
      partyType: party.partyType,
      state: party.state || "",
      districtCity: party.districtCity || "",
      items: party.items.map((it) => ({
        productSegment: it.productSegment || "",
        itemCode: it.itemCode || "",
        itemDescription: it.itemDescription || "",
        warrantyPeriodDays: String(it.warrantyPeriodDays ?? ""),
        _originalItemCode: it.itemCode, // track original item code for updates
      })),
    });
    setEditingPartyCode(partyCode);
  };

  const handleEditItemChange = (idx, field, val) =>
    setEditEntry((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    }));

  const handleEditAddItemRow = () =>
    setEditEntry((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _originalItemCode: null },
      ],
    }));

  const handleEditRemoveItemRow = async (idx) => {
    if (editEntry.items.length === 1) {
      toast("At least one item is required.", "warning");
      return;
    }
    const item = editEntry.items[idx];
    const confirmed = await confirm({
      title: "Remove Item",
      message: `Remove item "${item.itemCode || "this item"}" from this party?`,
      confirmText: "Yes, Remove",
      type: "danger",
    });
    if (confirmed) {
      setEditEntry((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const otherData = data.filter((d) => d.partyCode !== editingPartyCode);
    try {
      // Auto-add new party type if missing
      const pType = editEntry.partyType?.trim();
      if (pType && !partyTypes.some(pt => pt.name.toLowerCase() === pType.toLowerCase())) {
        try {
          const res = await axios.post(`${API_URL}/master/party-types`, { name: pType });
          setPartyTypes(prev => [...prev, res.data]);
        } catch (e) {
          console.error("Failed to auto-add party type", e);
        }
      }

      // Auto-add new product segments if missing
      const uniqueInputSegments = [...new Set(
        editEntry.items.map(it => it.productSegment).filter(s => s && s.trim())
      )];
      for (const seg of uniqueInputSegments) {
        if (!segments.some(s => s.name.toLowerCase() === seg.toLowerCase())) {
          try {
            const res = await axios.post(`${API_URL}/master/product-segments`, { name: seg });
            setSegments(prev => [...prev, res.data]);
          } catch (e) {
            console.error("Failed to auto-add segment", e);
          }
        }
      }

      const updatedRows = editEntry.items
        .filter((it) => it.itemCode && it.itemCode.trim())
        .map((item) => ({
          partyCode: editEntry.partyCode,
          partyDescription: editEntry.partyDescription,
          partyType: editEntry.partyType,
          state: editEntry.state,
          districtCity: editEntry.districtCity,
          productSegment: item.productSegment,
          itemCode: item.itemCode,
          itemDescription: item.itemDescription,
          warrantyPeriodDays: Number(item.warrantyPeriodDays),
        }));

      const finalData = [...otherData, ...updatedRows];
      await axios.post(`${API_URL}/master/customers/bulk`, { customers: finalData });
      
      setData(finalData.sort((a,b) => a.partyCode.localeCompare(b.partyCode)));

      setEditingPartyCode(null);
      setEditEntry(null);
      toast("Customer updated successfully!", "success");
    } catch (err) {
      toast("Failed to update customer", "error");
    }
  };

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) startUpload(f);
    else toast("Please drop a valid Excel file", "warning");
  };
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) startUpload(f);
    e.target.value = null;
  };
  const startUpload = (file) => {
    setUploadStep(2);
    setUploadProgress(0);
    const t = setInterval(
      () =>
        setUploadProgress((p) => {
          if (p >= 90) {
            clearInterval(t);
            processFile(file);
            return 90;
          }
          return p + 15;
        }),
      100,
    );
  };
  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!rawData || rawData.length === 0) {
        toast("The uploaded file is empty", "error");
        setUploadStep(1);
        return;
      }
      let hIdx = -1;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (row && row.some((c) => {
          const s = cleanStr(c);
          return s.includes("partycode") || s.includes("itemcode") || s.includes("partytype") || s.includes("productsegment");
        })) {
          hIdx = i;
          break;
        }
      }
      if (hIdx === -1) {
        toast("Could not find the header row. Please ensure 'Party Code' or 'Item Code' columns exist.", "error");
        setUploadStep(1);
        return;
      }

      const headers = rawData[hIdx].map(h => 
        String(h || "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ")
      );
      const gci = (possibilities) => headers.findIndex(h => possibilities.some(p => h.includes(p)));
      
      const idxPC = gci(["party code", "customer code", "partycode", "client code", "p code"]);
      const idxPD = gci(["party description", "party desc", "customer desc", "partyname", "customer name", "party name", "client name", "description of party"]);
      let idxPT = gci(["party type", "customer type", "category"]);
      if (idxPT === -1) idxPT = gci(["type"]);
      
      const idxPS = gci(["product segment", "segment", "product line"]);
      const idxIC = gci(["item code", "product code", "part code", "material code", "itemcode"]);
      const idxID = gci(["item description", "item desc", "product desc", "material desc", "item description", "product description"]);
      const idxWP = gci(["warranty period in days", "warranty period", "warranty", "period", "days"]);
      const idxSt = gci(["state", "province"]);
      const idxDC = gci(["district/city", "district", "city", "location", "town"]);

      if (idxPC === -1 || idxIC === -1) {
        toast(`Missing required columns: ${idxPC === -1 ? 'Party Code ' : ''}${idxIC === -1 ? 'Item Code' : ''}`, "error");
        setUploadStep(1);
        return;
      }

      console.log("Column Mapping Indices:", { idxPC, idxPD, idxPT, idxPS, idxIC, idxID, idxWP, idxSt, idxDC });

      const processed = rawData.slice(hIdx + 1).map((row) => {
        let pType = idxPT !== -1 ? row[idxPT] : "";
        if (pType && typeof pType === "string") pType = pType.trim();
        if (!pType) pType = partyTypes[0]?.name || "OEM";
        return {
          partyCode: idxPC !== -1 ? String(row[idxPC] || "").trim() : "",
          partyDescription: idxPD !== -1 ? String(row[idxPD] || "").trim() : "",
          partyType: pType,
          state: idxSt !== -1 ? String(row[idxSt] || "").trim() : "",
          districtCity: idxDC !== -1 ? String(row[idxDC] || "").trim() : "",
          productSegment: idxPS !== -1 ? String(row[idxPS] || "").trim() : "",
          itemCode: idxIC !== -1 ? String(row[idxIC] || "").trim() : "",
          itemDescription: idxID !== -1 ? String(row[idxID] || "").trim() : "",
          warrantyPeriodDays: idxWP !== -1 ? row[idxWP] : "",
        };
      });
      validateData(processed);
      setUploadProgress(100);
      setTimeout(() => setUploadStep(3), 500);
    };
    reader.readAsBinaryString(file);
  };
  const validateData = (rows) => {
    const validRows = [], issues = [];
    let validCount = 0;
    let skippedCount = 0;
    const existing = new Set(data.map((d) => `${cleanStr(d.partyCode)}::${cleanStr(d.itemCode)}`));
    const fileCodes = new Set();
    rows.forEach((row, idx) => {
      const rn = idx + 2;
      // Skip truly empty rows
      if (!row.partyCode && !row.partyDescription && !row.itemCode) {
        skippedCount++;
        return;
      }
      if (!row.partyCode) {
        issues.push({ id: `err-p-${idx}`, row: rn, type: "error", message: "Missing Party Code", rowData: row });
        return;
      }
      if (!row.itemCode) {
        issues.push({ id: `err-i-${idx}`, row: rn, type: "error", message: "Missing Item Code", rowData: row });
        return;
      }
      const cleanItem = cleanStr(row.itemCode);
      const cleanParty = cleanStr(row.partyCode);
      const combined = `${cleanParty}::${cleanItem}`;
      
      if (existing.has(combined)) {
        issues.push({ id: `dup-db-${idx}`, row: rn, type: "duplicate", message: `Item "${row.itemCode}" already exists for this party in DB`, rowData: row });
        return;
      }
      if (fileCodes.has(combined)) {
        issues.push({ id: `dup-f-${idx}`, row: rn, type: "duplicate", message: `Duplicate Item "${row.itemCode}" for this party in file`, rowData: row });
        return;
      }
      fileCodes.add(combined);
      const wp = Number(row.warrantyPeriodDays);
      if (row.warrantyPeriodDays === "" || isNaN(wp) || wp < 0) {
        issues.push({ id: `err-wp-${idx}`, row: rn, type: "error", message: `Invalid Warranty (${row.warrantyPeriodDays}). Must be a non-negative number.`, rowData: row });
        return;
      }
      validCount++;
      validRows.push({ ...row, warrantyPeriodDays: wp });
    });
    setValidationResult({
      total: rows.length - skippedCount,
      valid: validCount,
      skipped: skippedCount,
      duplicates: issues.filter((i) => i.type === "duplicate").length,
      errors: issues.filter((i) => i.type === "error").length,
      validRows,
      issues,
    });
  };

  const exportIssues = () => {
    if (validationResult.issues.length === 0) return;
    const exportData = validationResult.issues.map(i => ({
      "S.No": i.row,
      "Party Type": i.rowData?.partyType || "",
      "Product Segment": i.rowData?.productSegment || "",
      "Party Code": i.rowData?.partyCode || "",
      "Party Description": i.rowData?.partyDescription || "",
      "Item Code": i.rowData?.itemCode || "",
      "Item Description": i.rowData?.itemDescription || "",
      "Warranty Period in days": i.rowData?.warrantyPeriodDays || "",
      "State": i.rowData?.state || "",
      "District/City": i.rowData?.districtCity || "",
      "Remarks": i.message
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Style headers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1"; // Header row is 1
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "2F5F45" } }, // Dark green
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { vertical: "center", horizontal: "left" }
      };
    }
    
    // Auto-size columns slightly
    worksheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 15 }, // Party Type
      { wch: 15 }, // Product Segment
      { wch: 20 }, // Party Code
      { wch: 30 }, // Party Description
      { wch: 20 }, // Item Code
      { wch: 30 }, // Item Description
      { wch: 15 }, // Warranty
      { wch: 15 }, // State
      { wch: 20 }, // District
      { wch: 50 }, // Remarks
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Issues");
    XLSX.writeFile(workbook, `Import_Issues_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  const commitData = async () => {
    try {
      // Auto-add new party types
      const uploadPartyTypes = [...new Set(validationResult.validRows.map(r => r.partyType).filter(s => s && s.trim()))];
      for (const pType of uploadPartyTypes) {
        if (!partyTypes.some(pt => pt.name.toLowerCase() === pType.toLowerCase())) {
          try {
            const res = await axios.post(`${API_URL}/master/party-types`, { name: pType });
            setPartyTypes(prev => [...prev, res.data]);
          } catch (e) {
            console.error("Failed to auto-add party type", e);
          }
        }
      }

      // Auto-add new product segments
      const uploadSegments = [...new Set(validationResult.validRows.map(r => r.productSegment).filter(s => s && s.trim()))];
      for (const seg of uploadSegments) {
        if (!segments.some(s => s.name.toLowerCase() === seg.toLowerCase())) {
          try {
            const res = await axios.post(`${API_URL}/master/product-segments`, { name: seg });
            setSegments(prev => [...prev, res.data]);
          } catch (e) {
            console.error("Failed to auto-add segment", e);
          }
        }
      }

      const resp = await axios.post(`${API_URL}/master/customers/bulk-add`, { customers: validationResult.validRows });
      setUploadResult(resp.data);
      // Refresh the data from backend to ensure we have the exact state
      await fetchData();
      setUploadStep(4);
    } catch (err) {
      console.error("Upload error:", err);
      toast(err.response?.data?.message || "Failed to upload data to backend", "error");
    }
  };
  const resetUpload = () => {
    setShowUploadModal(false);
    setTimeout(() => {
      setUploadStep(1);
      setUploadProgress(0);
      setValidationResult({ total: 0, valid: 0, duplicates: 0, errors: 0, validRows: [], issues: [] });
      setUploadResult(null);
    }, 300);
  };

  // Helper to get unique identifier for each row
  const getRowId = (row) => row._id || `${row.partyCode}_${row.itemCode}`;

  // ── Selection ──────────────────────────────────────────────────────────────
  const handleSelectItem = (row) => {
    const id = getRowId(row);
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };
  const handleSelectAllPage = (pd) => {
    const s = new Set(selectedItems);
    const all = pd.every((i) => s.has(getRowId(i)));
    if (all) pd.forEach((i) => s.delete(getRowId(i)));
    else pd.forEach((i) => s.add(getRowId(i)));
    setSelectedItems(s);
  };
  const handleSelectAllOverall = () => {
    const s = new Set(selectedItems);
    const allFilteredSelected = filteredData.length > 0 && filteredData.every((i) => s.has(getRowId(i)));
    if (allFilteredSelected) {
      filteredData.forEach((i) => s.delete(getRowId(i)));
    } else {
      filteredData.forEach((i) => s.add(getRowId(i)));
    }
    setSelectedItems(s);
  };
  const handleBulkDelete = async () => {
    if (!selectedItems.size) return;
    const confirmed = await confirm({
      title: "Delete Customer Records",
      message: (
        <span>
          Are you sure you want to delete <strong>{selectedItems.size}</strong> selected items?
          <br /><br />
          <strong className="text-red-600">⚠️ WARNING:</strong> Deleting these customer records will also permanently delete <strong>all associated Service Call and Service Material records entirely</strong>. This action cannot be undone!
        </span>
      ),
      confirmText: `Yes, Delete ${selectedItems.size} items`,
      confirmTextMatch: "yes i'm consious to delete thsee",
      type: "danger",
    });
    if (confirmed) {
      try {
        const selectedRows = data.filter((item) => selectedItems.has(getRowId(item)));
        const itemCodes = selectedRows.map((item) => item.itemCode);
        await axios.post(`${API_URL}/master/customers/bulk-delete`, { itemCodes });
        setSelectedItems(new Set());
        await fetchData();
        toast(`${selectedRows.length} items and associated service records deleted successfully`);
      } catch (err) {
        toast("Failed to delete items", "error");
      }
    }
  };

  const handleDeleteParty = async (partyCode) => {
    const party = partyLookupByCode[partyCode];
    if (!party) return;
    const confirmed = await confirm({
      title: "Delete Customer",
      message: (
        <span>
          Are you sure you want to delete <strong>"{party.partyDescription}"</strong> ({party.partyCode}) and all its <strong>{party.items.length} items</strong>?
          <br /><br />
          <strong className="text-red-600">⚠️ WARNING:</strong> Deleting this customer will also permanently delete <strong>all associated Service Call and Service Material records entirely</strong>. This action cannot be undone!
        </span>
      ),
      confirmText: "Yes, Delete All",
      confirmTextMatch: "yes i'm consious to delete thsee",
      type: "danger",
    });
    if (confirmed) {
      try {
        const itemCodes = party.items.map((it) => it.itemCode);
        await axios.post(`${API_URL}/master/customers/bulk-delete`, { itemCodes });
        await fetchData();
        toast("Customer, items, and associated service records deleted successfully");
      } catch (err) {
        toast("Failed to delete customer", "error");
      }
    }
  };

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        const s = searchTerm.toLowerCase();
        const ms =
          String(item.partyCode).toLowerCase().includes(s) ||
          String(item.partyDescription).toLowerCase().includes(s) ||
          String(item.itemCode).toLowerCase().includes(s) ||
          String(item.productSegment).toLowerCase().includes(s);
        const mt =
          filterType === "All" ||
          String(item.partyType).toLowerCase() === filterType.toLowerCase();
        return ms && mt;
      }),
    [data, searchTerm, filterType],
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const isPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedItems.has(item.itemCode));

  const getTypeColor = (name) => {
    const idx = partyTypes.findIndex((t) => t.name === name);
    const colors = [
      "bg-purple-50 text-purple-700 border-purple-200/80",
      "bg-amber-50 text-amber-700 border-amber-200/80",
      "bg-blue-50 text-blue-700 border-blue-200/80",
      "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      "bg-rose-50 text-rose-700 border-rose-200/80",
      "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    ];
    return colors[idx % colors.length] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  // Active visible columns (for table rendering)
  const visibleCols = CUSTOMER_DB_COLUMNS.filter((c) => colVis[c.key] !== false);

  const renderHeaderCell = (col) => (
    <th key={col.key} className="p-[0.65vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] border-b border-r border-gray-200">
      {col.label}
    </th>
  );

  const renderRowCell = (col, row, isSameParty, rowSpan, partyCode) => {
    const isSpanned = ROW_SPAN_COLS.has(col.key);
    if (isSpanned && isSameParty) return null;

    const spanProps = isSpanned && !isSameParty ? { rowSpan } : {};
    const baseClass = `p-[0.7vw] border-r border-b border-gray-100 text-[0.76vw] ${isSpanned ? "bg-white align-middle" : ""}`;

    switch (col.key) {
      case "partyType":
        return (
          <td key={col.key} {...spanProps} className={baseClass}>
            <span className={`px-[0.55vw] py-[0.15vw] inline-block min-w-[5vw] text-center rounded-[0.35vw] text-[0.68vw] font-bold border ${getTypeColor(row.partyType)}`}>
              {row.partyType}
            </span>
          </td>
        );
      case "productSegment":
        return (
          <td key={col.key} className={baseClass + " text-gray-700 font-medium"}>
            {row.productSegment ? (
              <span className="inline-block bg-slate-50 text-slate-700 px-[0.45vw] py-[0.1vw] rounded text-[0.7vw] border border-slate-200/60 font-medium">
                {row.productSegment}
              </span>
            ) : "—"}
          </td>
        );
      case "partyCode":
        return (
          <td key={col.key} {...spanProps} className={baseClass + " text-gray-900 font-mono font-bold"}>
            {row.partyCode}
          </td>
        );
      case "partyDescription":
        return (
          <td key={col.key} {...spanProps} className={baseClass + " text-gray-800 font-semibold truncate max-w-[14vw]"} title={row.partyDescription}>
            {row.partyDescription}
          </td>
        );
      case "itemCode":
        return <td key={col.key} className={baseClass + " text-gray-800 font-mono text-[0.74vw]"}>{row.itemCode}</td>;
      case "itemDescription":
        return (
          <td key={col.key} className={baseClass + " text-gray-700 truncate max-w-[16vw] text-[0.74vw]"} title={row.itemDescription}>
            {row.itemDescription}
          </td>
        );
      case "warrantyPeriodDays":
        return (
          <td key={col.key} className={baseClass + " text-gray-800 text-center font-bold"}>
            {row.warrantyPeriodDays}
          </td>
        );
      case "state":
        return (
          <td key={col.key} {...spanProps} className={baseClass + " text-gray-700"}>
            {row.state || "—"}
          </td>
        );
      case "districtCity":
        return (
          <td key={col.key} {...spanProps} className={baseClass + " text-gray-700"}>
            {row.districtCity || "—"}
          </td>
        );
      default:
        return <td key={col.key} className={baseClass}>{row[col.key]}</td>;
    }
  };

  const totalCols = 2 + visibleCols.length + 1; // checkbox + S.No + visible + edit

  // ── Reset Add Modal ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setNewEntry({
      partyCode: "",
      partyDescription: "",
      partyType: partyTypes[0]?.name || "",
      state: "",
      districtCity: "",
      items: [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "", _existing: false }],
    });
    setShowAddModal(true);
  };

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      {/* Header Actions */}
      <div className="flex items-center justify-between pb-[0.6vw]">
        <div>
          <h1 className="text-[1.25vw] font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-[0.5vw]">
            <span className="w-[0.3vw] h-[1.1vw] bg-blue-600 rounded-full inline-block" />
            Customers Data
          </h1>
          <p className="text-[0.72vw] text-gray-500 font-medium mt-[0.1vw] pl-[0.8vw]">
            Directory of customers, party codes, and catalog item assignments
          </p>
        </div>

        {!isSupervisor && (
          <div className="flex items-center gap-[0.6vw]">
            {canWrite && (
              <button
                onClick={openAddModal}
                className="cursor-pointer flex items-center gap-[0.4vw] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-[0.9vw] h-[2.2vw] rounded-[0.5vw] font-semibold text-[0.76vw] transition-all shadow-2xs"
              >
                <Plus className="w-[0.9vw] h-[0.9vw] text-gray-500" /> Add Party
              </button>
            )}
            {canWrite && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="cursor-pointer flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] h-[2.2vw] rounded-[0.5vw] font-semibold text-[0.76vw] transition-all shadow-xs"
              >
                <UploadCloud className="w-[0.95vw] h-[0.95vw]" /> Upload Excel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toolbar: Search, Party Type Filter, and Bulk Delete */}
      <div className="flex items-center justify-between bg-white px-[0.9vw] py-[0.55vw] rounded-[0.7vw] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)] border border-gray-100 gap-[0.8vw] mb-[0.8vw]">
        {/* Search */}
        <div className="relative flex-1 max-w-[28vw]">
          <Search className="absolute left-[0.75vw] top-1/2 -translate-y-1/2 text-gray-400 w-[0.9vw] h-[0.9vw]" />
          <input
            type="text"
            placeholder="Search party code, description or item code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-[2.2vw] pr-[0.8vw] h-[2.1vw] border border-gray-200/80 rounded-[0.5vw] text-[0.76vw] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 bg-gray-50/40 hover:bg-white text-gray-800 placeholder-gray-400 transition-all shadow-none"
          />
        </div>

        <div className="flex gap-[0.6vw] items-center">
          <AnimatePresence>
            {selectedItems.size > 0 && !isSupervisor && canDelete && (
              <div className="flex items-center gap-[0.4vw]">
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleSelectAllOverall}
                  className="flex items-center gap-[0.4vw] bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 px-[0.75vw] h-[2.1vw] rounded-[0.5vw] font-semibold text-[0.74vw] cursor-pointer shadow-none transition-all"
                >
                  {filteredData.length > 0 && filteredData.every((i) => selectedItems.has(getRowId(i))) ? (
                    <CheckSquare className="w-[0.9vw] h-[0.9vw]" />
                  ) : (
                    <Square className="w-[0.9vw] h-[0.9vw]" />
                  )}
                  Select All ({filteredData.length})
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleBulkDelete}
                  className="flex items-center gap-[0.4vw] bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 px-[0.75vw] h-[2.1vw] rounded-[0.5vw] font-semibold text-[0.74vw] cursor-pointer shadow-none transition-all"
                >
                  <Trash2 className="w-[0.85vw] h-[0.85vw]" /> Delete ({selectedItems.size})
                </motion.button>
              </div>
            )}
          </AnimatePresence>

          <CustomDropdown
            options={[
              { value: "All", label: "All Types" },
              ...partyTypes.map((t) => ({ value: t.name, label: t.name })),
            ]}
            value={filterType}
            onChange={(val) => setFilterType(val)}
            className="w-[10.5vw]"
            size="md"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[0.8vw] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] border border-gray-200/80 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[68vh] min-h-[60vh] w-full">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50/90 sticky top-0 z-20 border-b border-gray-200">
              <tr>
                {!isSupervisor && (
                  <th className="p-[0.7vw] border-b border-r border-gray-200 w-[3%] text-center bg-slate-50">
                    <button
                      onClick={() => handleSelectAllPage(paginatedData)}
                      className="flex items-center justify-center w-full cursor-pointer"
                    >
                      {isPageSelected ? (
                        <CheckSquare className="w-[1vw] h-[1vw] text-blue-600" />
                      ) : (
                        <Square className="w-[1vw] h-[1vw] text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] border-b border-r border-gray-200 w-[3.5%] text-center bg-slate-50">
                  S.No
                </th>
                {visibleCols.map(renderHeaderCell)}
                {!isSupervisor && (
                  <th className="p-[0.7vw] font-bold text-gray-500 uppercase tracking-wider text-[0.68vw] border-b border-gray-200 w-[4.5%] text-center sticky top-0 right-0 bg-slate-50 z-30 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.06)]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={totalCols} className="py-[10vw]">
                    <div className="flex flex-col items-center justify-center gap-[1vw] text-gray-500">
                      <Loader2 className="w-[3vw] h-[3vw] animate-spin text-blue-600" />
                      <p className="text-[1vw] font-medium text-blue-600">Loading customer data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, i) => {
                  const serialNumber = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                  const isSelected = selectedItems.has(getRowId(row));
                  const prevRow = i > 0 ? paginatedData[i - 1] : null;
                  const isSameParty = prevRow && prevRow.partyCode === row.partyCode;
                  let rowSpan = 1;
                  if (!isSameParty) {
                    for (let j = i + 1; j < paginatedData.length; j++) {
                      if (paginatedData[j].partyCode === row.partyCode) rowSpan++;
                      else break;
                    }
                  }
                  return (
                    <tr
                      key={i}
                      className={`transition-colors border-b border-gray-100 ${isSelected ? "bg-blue-50/70" : "hover:bg-gray-50/60"}`}
                    >
                      {!isSupervisor && (
                        <td className="p-[0.7vw] border-r border-b border-gray-100 text-center">
                          <button
                            onClick={() => handleSelectItem(row)}
                            className="flex items-center justify-center w-full cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-[1vw] h-[1vw] text-blue-600" />
                            ) : (
                              <Square className="w-[1vw] h-[1vw] text-gray-300 hover:text-gray-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-[0.7vw] text-gray-500 font-medium border-r border-b border-gray-100 text-center text-[0.74vw]">
                        {serialNumber}
                      </td>
                      {visibleCols.map((col) =>
                        renderRowCell(col, row, isSameParty, rowSpan, row.partyCode),
                      )}
                      {/* Edit button — only shown on first row of each party group */}
                      {!isSameParty && !isSupervisor ? (
                        <td
                          rowSpan={rowSpan}
                          className="border-b border-gray-100 text-center align-middle bg-white sticky right-0 z-10 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.06)]"
                        >
                          {(canUpdate || canDelete) ? (
                            <div className="flex items-center justify-center gap-[0.3vw] px-[0.4vw]">
                              {canUpdate && (
                                <button
                                  onClick={() => openEditModal(row.partyCode)}
                                  className="inline-flex items-center justify-center p-[0.35vw] rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Edit Party"
                                >
                                  <Edit2 className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteParty(row.partyCode)}
                                  className="inline-flex items-center justify-center p-[0.35vw] rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Party"
                                >
                                  <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[0.68vw] text-slate-400 italic">View only</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={totalCols} className="py-[5vw] text-center text-gray-400 font-medium">
                    No customer data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200/80 px-[1vw] py-[0.6vw] bg-white flex justify-between items-center rounded-b-[0.8vw]">
          <div className="text-[0.74vw] text-gray-500 font-medium">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">{filteredData.length}</span>{" "}
            entries
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-[0.35vw] border border-gray-200 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronLeft className="w-[0.9vw] h-[0.9vw]" />
            </button>
            <div className="flex gap-[0.3vw]">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1;
                if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                if (pNum > totalPages) return null;
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`min-w-[1.7vw] h-[1.7vw] px-[0.4vw] flex items-center justify-center rounded-[0.4vw] text-[0.74vw] font-semibold cursor-pointer transition-all ${currentPage === pNum ? "bg-blue-600 text-white shadow-2xs" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.35vw] border border-gray-200 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronRight className="w-[0.9vw] h-[0.9vw]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Manual Add Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-[54vw] rounded-[1vw] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[88vh] flex flex-col border border-gray-100"
            >
              {/* Modal Header */}
              <div className="px-[1.2vw] py-[0.9vw] border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="w-[2vw] h-[2vw] rounded-[0.5vw] bg-blue-50 flex items-center justify-center text-blue-600">
                    <UserPlus className="w-[1vw] h-[1vw]" />
                  </div>
                  <div>
                    <h2 className="text-[1.05vw] font-bold text-gray-900 leading-none">Add Customer & Items</h2>
                    <p className="text-[0.68vw] text-gray-400 font-medium mt-[0.15vw]">Register a new party and catalog item details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-[1.8vw] h-[1.8vw] rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleManualSubmit} className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto">
                {/* Party Details Card */}
                <div className="bg-slate-50/60 p-[1vw] rounded-[0.7vw] border border-gray-200/80">
                  <div className="flex items-center gap-[0.4vw] mb-[0.8vw]">
                    <span className="w-[0.25vw] h-[0.8vw] bg-blue-600 rounded-full inline-block" />
                    <h3 className="text-[0.82vw] font-bold text-gray-800 uppercase tracking-wider">Party Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw] mb-[0.8vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">Party Code <span className="text-rose-500">*</span></label>
                      <AutocompleteInput
                        required
                        value={newEntry.partyCode}
                        onChange={handleAddPartyCodeChange}
                        suggestions={uniquePartyCodes}
                        placeholder="e.g. CUS-001"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">Party Type</label>
                      <CustomDropdown
                        options={partyTypes.map((t) => ({ value: t.name, label: t.name }))}
                        value={newEntry.partyType}
                        onChange={(val) => setNewEntry({ ...newEntry, partyType: val })}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[0.3vw] mb-[0.8vw]">
                    <label className="text-[0.74vw] font-semibold text-gray-700">Party Description <span className="text-rose-500">*</span></label>
                    <AutocompleteInput
                      required
                      value={newEntry.partyDescription}
                      onChange={handleAddPartyDescChange}
                      suggestions={uniquePartyDescriptions}
                      placeholder="Company / Customer Name"
                      className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">State</label>
                      <AutocompleteInput
                        value={newEntry.state}
                        onChange={(val) => setNewEntry({ ...newEntry, state: val })}
                        suggestions={uniqueStates}
                        placeholder="e.g. Tamil Nadu"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">District / City</label>
                      <AutocompleteInput
                        value={newEntry.districtCity}
                        onChange={(val) => setNewEntry({ ...newEntry, districtCity: val })}
                        suggestions={addModalDistricts}
                        placeholder="e.g. Coimbatore"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section Card */}
                <div className="bg-white border border-gray-200/90 rounded-[0.7vw] p-[1vw] shadow-2xs">
                  <div className="flex justify-between items-center mb-[0.6vw]">
                    <div className="flex items-center gap-[0.4vw]">
                      <span className="w-[0.25vw] h-[0.8vw] bg-indigo-600 rounded-full inline-block" />
                      <h3 className="text-[0.82vw] font-bold text-gray-800 uppercase tracking-wider">Product Items</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="text-blue-600 hover:text-blue-700 text-[0.74vw] font-semibold flex items-center gap-[0.3vw] cursor-pointer hover:underline"
                    >
                      <PlusCircle className="w-[0.85vw] h-[0.85vw]" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-[0.6vw]">
                    {newEntry.items.map((item, idx) => {
                      const isExisting = item._existing;
                      return (
                        <div
                          key={idx}
                          className={`flex gap-[0.5vw] items-center border-b border-gray-100 pb-[0.6vw] last:border-0 ${isExisting ? "bg-blue-50/40 rounded-[0.4vw] p-[0.4vw]" : ""}`}
                        >
                          {isExisting && (
                            <div className="flex flex-col justify-end shrink-0">
                              <span className="text-[0.62vw] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Existing</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col gap-[0.2vw]">
                            {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Segment</label>}
                            <AutocompleteInput
                              required={!isExisting}
                              value={item.productSegment}
                              onChange={(val) => handleItemChange(idx, "productSegment", val)}
                              suggestions={uniqueSegments}
                              placeholder="Segment"
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-[0.2vw]">
                            {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Item Code</label>}
                            <input
                              required={!isExisting}
                              value={item.itemCode}
                              readOnly={isExisting}
                              onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)}
                              className={`w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-mono transition-all ${isExisting ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                              placeholder="Item Code"
                            />
                          </div>
                          <div className="flex-[2] flex flex-col gap-[0.2vw]">
                            {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Description</label>}
                            <AutocompleteInput
                              required={!isExisting}
                              value={item.itemDescription}
                              onChange={(val) => handleItemChange(idx, "itemDescription", val)}
                              suggestions={uniqueItemDescriptions}
                              placeholder="Item Description"
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                            />
                          </div>
                          <div className="flex-[0.8] flex flex-col gap-[0.2vw]">
                            {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Warranty (days)</label>}
                            <input
                              required={!isExisting}
                              type="number"
                              min="0"
                              value={item.warrantyPeriodDays}
                              onChange={(e) => handleItemChange(idx, "warrantyPeriodDays", e.target.value)}
                              className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all font-semibold"
                              placeholder="Days"
                            />
                          </div>
                          
                          <div className="flex flex-col justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={newEntry.items.length === 1 && !isExisting}
                              className={`p-[0.35vw] text-gray-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer transition-colors ${idx === 0 ? "mt-[1.1vw]" : ""}`}
                            >
                              <MinusCircle className="w-[1vw] h-[1vw]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-[0.6vw] pt-[0.4vw]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-[1.2vw] h-[2.2vw] border border-gray-200 rounded-[0.45vw] text-gray-600 hover:bg-gray-50 text-[0.76vw] font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-[1.4vw] h-[2.2vw] bg-blue-600 text-white rounded-[0.45vw] hover:bg-blue-700 text-[0.76vw] font-semibold shadow-xs flex items-center gap-[0.4vw] transition-all cursor-pointer"
                  >
                    Save All
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingPartyCode && editEntry && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-[54vw] rounded-[1vw] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[88vh] flex flex-col border border-gray-100"
            >
              {/* Modal Header */}
              <div className="px-[1.2vw] py-[0.9vw] border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-[0.5vw]">
                  <div className="w-[2vw] h-[2vw] rounded-[0.5vw] bg-blue-50 flex items-center justify-center text-blue-600">
                    <Edit2 className="w-[1vw] h-[1vw]" />
                  </div>
                  <div>
                    <h2 className="text-[1.05vw] font-bold text-gray-900 leading-none flex items-center gap-[0.4vw]">
                      Edit Customer <span className="text-gray-400 font-normal">—</span> <span className="text-blue-600 font-mono font-bold">{editingPartyCode}</span>
                    </h2>
                    <p className="text-[0.68vw] text-gray-400 font-medium mt-[0.15vw]">Modify party metadata and catalog line items</p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditingPartyCode(null); setEditEntry(null); }}
                  className="w-[1.8vw] h-[1.8vw] rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-[1vw] h-[1vw]" />
                </button>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleEditSubmit} className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto">
                {/* Party Details Card */}
                <div className="bg-slate-50/60 p-[1vw] rounded-[0.7vw] border border-gray-200/80">
                  <div className="flex items-center gap-[0.4vw] mb-[0.8vw]">
                    <span className="w-[0.25vw] h-[0.8vw] bg-blue-600 rounded-full inline-block" />
                    <h3 className="text-[0.82vw] font-bold text-gray-800 uppercase tracking-wider">Party Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw] mb-[0.8vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">Party Code <span className="text-rose-500">*</span></label>
                      <input
                        required
                        value={editEntry.partyCode}
                        onChange={(e) => setEditEntry({ ...editEntry, partyCode: e.target.value })}
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-mono font-bold transition-all"
                        placeholder="e.g. CUS-001"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">Party Type</label>
                      <CustomDropdown
                        options={partyTypes.map((t) => ({ value: t.name, label: t.name }))}
                        value={editEntry.partyType}
                        onChange={(val) => setEditEntry({ ...editEntry, partyType: val })}
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[0.3vw] mb-[0.8vw]">
                    <label className="text-[0.74vw] font-semibold text-gray-700">Party Description <span className="text-rose-500">*</span></label>
                    <input
                      required
                      value={editEntry.partyDescription}
                      onChange={(e) => setEditEntry({ ...editEntry, partyDescription: e.target.value })}
                      className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-medium transition-all"
                      placeholder="Company Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">State</label>
                      <AutocompleteInput
                        value={editEntry.state}
                        onChange={(val) => setEditEntry({ ...editEntry, state: val })}
                        suggestions={uniqueStates}
                        placeholder="e.g. Tamil Nadu"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.3vw]">
                      <label className="text-[0.74vw] font-semibold text-gray-700">District / City</label>
                      <AutocompleteInput
                        value={editEntry.districtCity}
                        onChange={(val) => setEditEntry({ ...editEntry, districtCity: val })}
                        suggestions={editModalDistricts}
                        placeholder="e.g. Coimbatore"
                        className="w-full h-[2.1vw] px-[0.7vw] rounded-[0.45vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section Card */}
                <div className="bg-white border border-gray-200/90 rounded-[0.7vw] p-[1vw] shadow-2xs">
                  <div className="flex justify-between items-center mb-[0.6vw]">
                    <div className="flex items-center gap-[0.4vw]">
                      <span className="w-[0.25vw] h-[0.8vw] bg-indigo-600 rounded-full inline-block" />
                      <h3 className="text-[0.82vw] font-bold text-gray-800 uppercase tracking-wider">Product Items</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditAddItemRow}
                      className="text-blue-600 hover:text-blue-700 text-[0.74vw] font-semibold flex items-center gap-[0.3vw] cursor-pointer hover:underline"
                    >
                      <PlusCircle className="w-[0.85vw] h-[0.85vw]" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-[0.6vw]">
                    {editEntry.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-[0.5vw] items-center border-b border-gray-100 pb-[0.6vw] last:border-0"
                      >
                        <div className="flex-1 flex flex-col gap-[0.2vw]">
                          {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Item Code</label>}
                          <input
                            required
                            value={item.itemCode}
                            onChange={(e) => handleEditItemChange(idx, "itemCode", e.target.value)}
                            className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-mono transition-all"
                            placeholder="Code"
                          />
                        </div>
                        <div className="flex-[2] flex flex-col gap-[0.2vw]">
                          {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Description</label>}
                          <input
                            required
                            value={item.itemDescription}
                            onChange={(e) => handleEditItemChange(idx, "itemDescription", e.target.value)}
                            className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                            placeholder="Description"
                          />
                        </div>
                        <div className="flex-[0.8] flex flex-col gap-[0.2vw]">
                          {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Warranty (days)</label>}
                          <input
                            required
                            type="number"
                            min="0"
                            value={item.warrantyPeriodDays}
                            onChange={(e) => handleEditItemChange(idx, "warrantyPeriodDays", e.target.value)}
                            className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all font-semibold"
                            placeholder="Days"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-[0.2vw]">
                          {idx === 0 && <label className="text-[0.68vw] font-semibold text-gray-500">Product Segment</label>}
                          <AutocompleteInput
                            value={item.productSegment}
                            onChange={(val) => handleEditItemChange(idx, "productSegment", val)}
                            suggestions={uniqueSegments}
                            placeholder="Segment"
                            className="w-full h-[2.1vw] px-[0.6vw] rounded-[0.4vw] border border-gray-200 bg-white text-[0.76vw] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <button
                            type="button"
                            onClick={() => handleEditRemoveItemRow(idx)}
                            className={`p-[0.35vw] text-gray-400 hover:text-rose-600 cursor-pointer transition-colors ${idx === 0 ? "mt-[1.1vw]" : ""}`}
                          >
                            <MinusCircle className="w-[1vw] h-[1vw]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-[0.6vw] pt-[0.4vw]">
                  <button
                    type="button"
                    onClick={() => { setEditingPartyCode(null); setEditEntry(null); }}
                    className="px-[1.2vw] h-[2.2vw] border border-gray-200 rounded-[0.45vw] text-gray-600 hover:bg-gray-50 text-[0.76vw] font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-[1.4vw] h-[2.2vw] bg-blue-600 text-white rounded-[0.45vw] hover:bg-blue-700 text-[0.76vw] font-semibold shadow-xs flex items-center gap-[0.4vw] transition-all cursor-pointer"
                  >
                    <Save className="w-[0.9vw] h-[0.9vw]" /> Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Upload Modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-[55vw] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-[1vw] py-[0.7vw] border-b border-slate-400 flex justify-between items-center bg-gray-50">
                <h2 className="text-[1.2vw] font-semibold text-gray-900">Upload client data</h2>
                <button onClick={resetUpload} className="text-gray-400 hover:text-red-500 cursor-pointer">
                  <X className="w-[1.4vw] h-[1.4vw]" />
                </button>
              </div>
              <div className="px-[2vw] py-[1.2vw] flex-1 flex flex-col justify-center min-h-[25vw]">
                {uploadStep === 1 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`flex flex-col items-center justify-center h-[20vw] border-[0.2vw] border-dashed rounded-[1vw] cursor-pointer group ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-400 bg-gray-50 hover:bg-blue-50"}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx,.xls" />
                    <UploadCloud className="w-[2.5vw] h-[2.5vw] text-blue-500 mb-[1vw]" />
                    <p className="text-[1.1vw] font-semibold text-gray-800 mb-[0.4vw]">
                      {isDragging ? "Drop file here" : "Click to upload or Drag & Drop"}
                    </p>
                    <p className="text-gray-700 text-[0.9vw] mb-[0.5vw] text-center px-[10%]">
                      <span className="font-semibold">Expected Columns: </span>
                      Party Type, Product Segment, Party Code, Party Description, Item Code, Item Description, Warranty Period,{" "}
                      <span className="text-blue-600 font-semibold">State, District/City</span>
                    </p>
                    <p className="text-blue-600 text-[0.85vw] bg-blue-50 px-[1vw] py-[0.4vw] rounded-[0.3vw] border border-blue-200">
                      <span className="font-semibold">Note:</span> Multiple items per customer = new row with same Party Code
                    </p>
                  </div>
                )}
                {uploadStep === 2 && (
                  <div className="flex flex-col items-center justify-center w-full max-w-[30vw] mx-auto">
                    <div className="w-full flex justify-between font-semibold text-gray-600 mb-[0.5vw]">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-[0.8vw] bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                {uploadStep === 3 && (
                  <div className="flex gap-[2vw] h-full items-stretch">
                    <div className="w-[18vw] flex flex-col gap-[1vw]">
                      <div className="bg-gray-50 p-[1.5vw] rounded-[0.6vw] border border-slate-400 space-y-[0.8vw]">
                        <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-[1vw]">Summary</h4>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold">{validationResult.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valid</span>
                          <span className="font-bold text-green-600">{validationResult.valid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duplicates</span>
                          <span className="font-bold text-blue-600">{validationResult.duplicates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Errors</span>
                          <span className="font-bold text-red-600">{validationResult.errors}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 border border-slate-400 rounded-[0.6vw] flex flex-col overflow-hidden">
                      <div className="bg-gray-100 px-[1.5vw] py-[0.8vw] border-b border-slate-400 font-semibold text-gray-700 flex justify-between items-center">
                        <span>Issues Found ({validationResult.issues.length})</span>
                        {validationResult.issues.length > 0 && (
                          <button 
                            onClick={exportIssues} 
                            className="flex items-center gap-[0.4vw] text-[0.8vw] text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded cursor-pointer transition-colors"
                          >
                            <Download className="w-[0.9vw] h-[0.9vw]"/> Export Issues
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1 p-[1vw] space-y-[0.8vw] max-h-[20vw] bg-white">
                        {validationResult.issues.length > 0 ? (
                          validationResult.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-[0.8vw] p-[0.8vw] rounded-[0.4vw] border ${issue.type === "error" ? "bg-red-50 border-red-100" : "bg-blue-50 border-orange-100"}`}
                            >
                              <div>
                                <p className={`font-bold ${issue.type === "error" ? "text-red-700" : "text-blue-500"}`}>
                                  Row {issue.row}: {issue.type === "error" ? "Error" : "Duplicate"}
                                </p>
                                <p className="text-gray-600">{issue.message}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Check className="w-[3vw] h-[3vw] mb-[0.5vw]" />
                            <p>No Issues Found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {uploadStep === 4 && (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <h3 className="text-[1.6vw] font-bold text-gray-800 mb-[0.5vw]">Import Summary</h3>
                    <p className="text-[0.9vw] text-gray-500 mb-[2.5vw]">The import process is complete.</p>
                    <div className="grid grid-cols-3 gap-[1.5vw] w-full max-w-[35vw] mb-[2vw]">
                      <div className="bg-green-50 border border-green-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-green-700">
                          {uploadResult?.insertedCount || 0}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-green-600 uppercase tracking-wide">New Records</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-blue-600">
                          {uploadResult 
                            ? (validationResult.duplicates + (uploadResult.duplicateCount || 0))
                            : validationResult.duplicates
                          }
                        </span>
                        <span className="text-[0.75vw] font-semibold text-blue-500 uppercase tracking-wide">Already in DB</span>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-red-600">{validationResult.errors}</span>
                        <span className="text-[0.75vw] font-semibold text-red-500 uppercase tracking-wide">Errors</span>
                      </div>
                    </div>

                    {uploadResult?.insertedCount === 0 && (uploadResult?.duplicateCount > 0 || validationResult.duplicates > 0) && (
                      <p className="text-[0.85vw] text-blue-600 mb-[2vw] bg-blue-50 px-[1.5vw] py-[0.5vw] rounded-full border border-blue-100">
                        Notice: All uploaded records already exist in the database.
                      </p>
                    )}

                    <button
                      onClick={resetUpload}
                      className="px-[3vw] py-[0.8vw] text-[0.9vw] font-medium border border-gray-400 rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>
                )}
              </div>
              {uploadStep === 3 && (
                <div className="px-[1.5vw] py-[1vw] border-t border-slate-400 bg-gray-50 flex justify-end gap-[1vw]">
                  <button
                    onClick={resetUpload}
                    className="px-[2vw] py-[0.6vw] border border-gray-400 rounded-[0.4vw] bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={commitData}
                    disabled={validationResult.valid === 0}
                    className={`px-[1vw] py-[0.6vw] rounded-[0.4vw] text-white flex items-center cursor-pointer gap-[0.5vw] ${validationResult.valid > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
                  >
                    <Save className="w-[1vw] h-[1vw]" /> Import Records
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDatabase;