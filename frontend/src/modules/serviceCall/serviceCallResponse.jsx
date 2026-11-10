import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Clock,
  User,
  Package,
  FileText,
  CheckCircle,
  History,
  Shield,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  Send,
  X,
  MapPin,
  Bell,
  CheckSquare,
  Wrench,
  BarChart2,
  Eye,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Layers,
  Phone,
  Mail,
  Share2,
  Play,
  Search,
  Download,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  MoreVertical,
  ClipboardList,
  UserCheck,
  PhoneCall,
} from "lucide-react";
import {
  ServiceCallForm,
  emptyForm,
  CallSummaryModal,
  getStatusCfg,
  getProductStatus as getCallProductStatus,
  deriveCallStatus,
  getTypeColor,
  PRIORITIES,
} from "./ServiceCall";
import CustomDropdown from "../../components/CustomDropdown";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../components/NotificationContext";
import useEscalationWorker from "../../service/useEscalationWorker";
import { useSocket } from "../../contexts/SocketContext";
import ProductHistoryModal, {
  ProductHistoryTimeline,
} from "./ProductHistoryModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  API_URL,
  EMPLOYEES_KEY,
  ESCALATION_FLOWS_KEY,
  MODES_KEY,
  DEFAULT_MODES,
  RESOLUTION_TYPES,
  load,
  save,
  playNotificationSound,
  getProductStatus,
  PROD_STATUS_CFG
} from "./responseComponents/ResponseConstants";
import { Badge, ContactInfoBar, ProductSLATimer } from "./responseComponents/ResponseWidgets";
import { CustomerHistoryModal } from "./responseComponents/CustomerHistoryModal";
import { AssignVisitModal } from "./responseComponents/AssignVisitModal";
import { IssueDetailsContainer } from "./responseComponents/IssueDetailsContainer";
import { ProductClosurePanel } from "./responseComponents/ProductClosurePanel";
import { EscalationQueueTab } from "./responseComponents/EscalationQueueTab";
import { SelfAssignedQueueTab } from "./responseComponents/SelfAssignedQueueTab";
import { PendingTab } from "./responseComponents/PendingTab";
import { SupportRequestsTab } from "./responseComponents/SupportRequestsTab";
import { VisitsTab } from "./responseComponents/VisitsTab";

const ServiceCallResponse = () => {
  const { timers } = useEscalationWorker();
  const [queue, setQueue] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [activeTab, setActiveTab] = useState("escalation");
  const [expandedCalls, setExpandedCalls] = useState({});
  const isAnyExpanded = Object.values(expandedCalls).some(Boolean);
  const [loggedInUser, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter State across all tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

  // Self Assigned Table specific states
  const [selfAssignedStatus, setSelfAssignedStatus] = useState("All");
  const [selfAssignedPage, setSelfAssignedPage] = useState(1);
  const [selfAssignedPageSize] = useState(10);
  const [escalationPage, setEscalationPage] = useState(1);
  const [escalationPageSize] = useState(10);
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [reverseModalItem, setReverseModalItem] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isSubmittingReverse, setIsSubmittingReverse] = useState(false);
  const [editingReportItem, setEditingReportItem] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    remarks: "",
    resolutionType: "",
    editReason: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [actionMenuCoords, setActionMenuCoords] = useState(null);
  const [summaryModalRow, setSummaryModalRow] = useState(null);
  const [historyModalProduct, setHistoryModalProduct] = useState(null);

  // Form View state for User Desk "Register Call" and "Edit Call"
  const [view, setView] = useState("desk"); // "desk" | "form"
  const [editingCall, setEditingCall] = useState(null);
  const [customerDb, setCustomerDb] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [segments, setSegments] = useState([]);
  const [modes, setModes] = useState([]);

  const { socket } = useSocket();

  const { toast } = useNotification();

  const [supportReqs, setSupportReqs] = useState([]);
  const [fieldVisits, setFieldVisits] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Close 3-dot action menu when clicking outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (
        !e.target.closest(".action-menu-portal") &&
        !e.target.closest(".action-menu-container")
      ) {
        setActiveActionMenuId(null);
        setActionMenuCoords(null);
      }
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  useEffect(() => {
    const u = JSON.parse(
      sessionStorage.getItem("loggedInUser") ||
        localStorage.getItem("loggedInUser") ||
        "null",
    );
    if (u) setUser(u);

    const ld = async () => {
      try {
        const promises = [
          axios.get(`${API_URL}/service-calls/active`),
          axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/auth/employees`),
          axios.get(`${API_URL}/master/customers`),
          axios.get(`${API_URL}/master/party-types`),
          axios.get(`${API_URL}/master/sites`),
          axios.get(`${API_URL}/master/settings/${MODES_KEY}`).catch(() => ({ data: { value: DEFAULT_MODES } })),
          axios.get(`${API_URL}/master/product-segments`),
        ];

        if (u?.userId) {
          promises.push(
            axios.get(`${API_URL}/service-calls/support/${u.userId}`),
          );
          promises.push(
            axios.get(`${API_URL}/service-calls/field-visit/${u.userId}`),
          );
        }

        const [
          activeRes,
          allRes,
          empRes,
          custRes,
          ptRes,
          sitesRes,
          modesRes,
          segRes,
          supportRes,
          visitRes,
        ] = await Promise.all(promises);

        setQueue(activeRes.data.map((call) => ({ ...call, callId: call._id })));
        setAllCalls((allRes.data || []).map((call) => ({ ...call, callId: call._id || call.id })));
        setEmployees(empRes.data);
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(empRes.data));

        if (custRes?.data) setCustomerDb(custRes.data);
        if (ptRes?.data) {
          setPartyTypes(
            ptRes.data.length
              ? ptRes.data.map((t) => ({ ...t, id: t._id || t.id }))
              : [
                  { id: 1, name: "OEM" },
                  { id: 2, name: "End Customer" },
                ],
          );
        }
        if (sitesRes?.data) setSites(sitesRes.data || []);
        if (segRes?.data) setSegments(segRes.data || []);
        if (modesRes?.data) {
          setModes(modesRes.data.value || DEFAULT_MODES);
        }

        if (supportRes) setSupportReqs(supportRes.data);
        if (visitRes) setFieldVisits(visitRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    ld();

    if (socket) {
      // Fallback: Catch up on any missed events when internet connection is restored
      socket.on("connect", ld);
      return () => socket.off("connect", ld);
    }
  }, [socket]);

  const remoteUpdateRef = useRef(false);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedCall) => {
      let isFromMe = false;
      let hasReturnToMe = false;
      let returnTab = null;

      if (updatedCall.products) {
        // Direct Return Detection - bypasses all dependency timings
        updatedCall.products.forEach((p) => {
          if (p._history && p._history.length > 0) {
            const h = p._history[p._history.length - 1];
            if (
              h.status === "Returned from Support" &&
              h.updatedBy !== loggedInUser?.userId
            ) {
              const askEvent = p._history
                .slice()
                .reverse()
                .find((hist) => hist.status === "Support Requested");
              const askedBy = askEvent?.updatedBy || p._assignedEngineerId;
              if (askedBy === loggedInUser?.userId) {
                hasReturnToMe = true;
                returnTab = "support";
              }
            }
            if (
              h.status === "Field Visit Returned" &&
              h.updatedBy !== loggedInUser?.userId
            ) {
              if (p._fieldVisit?.assignedBy === loggedInUser?.userId) {
                hasReturnToMe = true;
                returnTab = "fieldvisit";
              }
            }
          }
        });

        if (hasReturnToMe && returnTab) {
          playNotificationSound();
          setNewActivityTabs((old) => {
            const next = { ...old, [returnTab]: true };
            if (next[activeTab]) delete next[activeTab];
            return next;
          });
        }

        let latestTime = 0;
        let latestUpdater = null;
        updatedCall.products.forEach((p) => {
          if (p._history && p._history.length > 0) {
            const h = p._history[p._history.length - 1];
            const t = new Date(h.timestamp).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestUpdater = h.updatedBy;
            }
          }
        });
        if (latestUpdater === loggedInUser?.userId) {
          isFromMe = true;
        }
      }

      if (!isFromMe && !hasReturnToMe) {
        remoteUpdateRef.current = true;
      }

      if (updatedCall.deleted) {
        setQueue((prev) => prev.filter((c) => c.callId !== updatedCall.callId));
        return;
      }

      const call = { ...updatedCall, callId: updatedCall._id };

      setQueue((prev) => {
        if (call.status === "Resolved")
          return prev.filter((c) => c.callId !== call.callId);
        const exists = prev.some((c) => c.callId === call.callId);
        return exists
          ? prev.map((c) => (c.callId === call.callId ? call : c))
          : [call, ...prev];
      });

      setSupportReqs((prev) => {
        const uid = loggedInUser?.userId;
        if (!uid) return prev;
        const isSupport = call.products?.some(
          (p) =>
            p._supportPersonId === uid ||
            p._history?.some(
              (h) => h.status === "Support Requested" && h.updatedBy === uid,
            ),
        );
        if (!isSupport) return prev.filter((c) => c._id !== call._id);
        const exists = prev.some((c) => c._id === call._id);
        return exists
          ? prev.map((c) => (c._id === call._id ? call : c))
          : [call, ...prev];
      });

      setFieldVisits((prev) => {
        const uid = loggedInUser?.userId;
        if (!uid) return prev;
        const isFv = call.products?.some(
          (p) =>
            p._fieldVisit?.assignedTo === uid ||
            p._fieldVisit?.assignedBy === uid,
        );
        if (!isFv) return prev.filter((c) => c._id !== call._id);
        const exists = prev.some((c) => c._id === call._id);
        return exists
          ? prev.map((c) => (c._id === call._id ? call : c))
          : [call, ...prev];
      });
    };

    socket.on("service_call_updated", handleUpdate);
    return () => socket.off("service_call_updated", handleUpdate);
  }, [socket, loggedInUser]);

  // Filter Predicate across all tabs (Search Query, Date Range, Priority)
  const matchesSearchAndFilter = (call) => {
    if (!call) return false;

    // 1. Priority filter
    if (filterPriority && filterPriority !== "All") {
      if (call.priority !== filterPriority) return false;
    }

    // 2. Date range filter
    if (filterFromDate || filterToDate) {
      const rowDateStr = call.dateTime || call.timestamp || call.createdAt;
      if (rowDateStr) {
        const d = new Date(rowDateStr);
        if (!isNaN(d.getTime())) {
          if (filterFromDate) {
            const fromD = new Date(filterFromDate);
            fromD.setHours(0, 0, 0, 0);
            if (d < fromD) return false;
          }
          if (filterToDate) {
            const toD = new Date(filterToDate);
            toD.setHours(23, 59, 59, 999);
            if (d > toD) return false;
          }
        }
      }
    }

    // 3. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCallNo = (call.callNumber || call.callNo || "").toLowerCase().includes(q);
      const matchCust = (call.customerName || call.partyDescription || "").toLowerCase().includes(q);
      const matchParty = (call.partyCode || "").toLowerCase().includes(q);
      const matchPhone = (call.contactNumber || "").toLowerCase().includes(q);
      const matchPerson = (call.contactPerson || "").toLowerCase().includes(q);
      const matchEng = (call.currentEngineerName || call.assignedEngineerName || "").toLowerCase().includes(q);
      const matchProducts = (call.products || call._products || []).some((p) => {
        const m = (p.productModel || p.itemCode || p.model || "").toLowerCase();
        const sn = (p.serialNumber || "").toLowerCase();
        const desc = (p.callDescription || "").toLowerCase();
        const err = (p.errorCode || "").toLowerCase();
        return m.includes(q) || sn.includes(q) || desc.includes(q) || err.includes(q);
      });
      return matchCallNo || matchCust || matchParty || matchPhone || matchPerson || matchEng || matchProducts;
    }

    return true;
  };

  // Self Assigned Calls (Calls registered under this page / noEscalation / assigned to and registered by current logged-in user)
  const selfAssignedRawCalls = useMemo(() => {
    const uid = loggedInUser?.userId;
    const uName = loggedInUser?.name;
    if (!uid && !uName) return [];

    // Combine allCalls and queue, deduplicated by id
    const callMap = new Map();
    [...allCalls, ...queue].forEach((c) => {
      const cid = c._id || c.callId || c.id;
      if (cid && !callMap.has(cid)) {
        callMap.set(cid, c);
      }
    });

    return Array.from(callMap.values()).filter((c) => {
      // Must be self-assigned call (noEscalation === true or created under serviceCallResponse)
      const isSelfRegistered =
        c.noEscalation === true ||
        c.registeredBy === uid ||
        c.currentEngineerId === uid;

      if (!isSelfRegistered) return false;

      // Strictly belong to the current logged-in user:
      // either registeredBy matches, or currentEngineerId matches, or products assigned to this engineer
      const matchesUser =
        (uid && (c.registeredBy === uid || c.currentEngineerId === uid)) ||
        (uName && (c.currentEngineerName === uName || c.registeredByName === uName)) ||
        (c.products || []).some(
          (p) =>
            (uid && p._assignedEngineerId === uid) ||
            (uName && p._assignedEngineerName === uName),
        );

      return matchesUser;
    });
  }, [allCalls, queue, loggedInUser]);

  // Self Assigned Calls matching Search & Filters
  const selfAssignedFilteredCalls = useMemo(() => {
    return selfAssignedRawCalls.filter((c) => {
      if (!matchesSearchAndFilter(c)) return false;

      // Status filter within Self Assigned tab
      if (selfAssignedStatus !== "All") {
        const products = c.products || c._products || [{}];
        const hasMatchingStatus = products.some((prod) => {
          const rawStatus = getProductStatus(prod, c.status);
          const mappedLabel = getStatusCfg(rawStatus).label || "Registered";
          return mappedLabel === selfAssignedStatus;
        });
        if (!hasMatchingStatus && c.status !== selfAssignedStatus) return false;
      }
      return true;
    });
  }, [selfAssignedRawCalls, searchQuery, filterFromDate, filterToDate, filterPriority, selfAssignedStatus]);

  // Paginated Self Assigned Calls
  const selfAssignedPaginatedCalls = useMemo(() => {
    const start = (selfAssignedPage - 1) * selfAssignedPageSize;
    return selfAssignedFilteredCalls.slice(start, start + selfAssignedPageSize);
  }, [selfAssignedFilteredCalls, selfAssignedPage, selfAssignedPageSize]);

  const selfAssignedTotalPages = Math.ceil(selfAssignedFilteredCalls.length / selfAssignedPageSize) || 1;

  // Filtered versions for all other tabs
  const filteredQueue = useMemo(() => {
    return queue.filter(matchesSearchAndFilter);
  }, [queue, searchQuery, filterFromDate, filterToDate, filterPriority]);

  const myEscalations = useMemo(() => {
    const uid = loggedInUser?.userId;
    const isAdmin = loggedInUser?.department === "Admin";
    return filteredQueue.filter((e) => {
      if (e.status === "Resolved") return false;

      if (isAdmin) {
        return (e.products || []).some(
          (p) =>
            !p._resolved &&
            p._productClosure?.status !== "Closed" &&
            !p._supportRequested &&
            p._productClosure?.status !== "Pending" &&
            (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
        );
      }

      const hasProductsForUser = (e.products || []).some(
        (p) =>
          p._assignedEngineerId === uid &&
          p._assigned !== false &&
          !p._resolved &&
          p._productClosure?.status !== "Closed" &&
          !p._supportRequested &&
          p._productClosure?.status !== "Pending" &&
          (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
      );

      return hasProductsForUser;
    });
  }, [filteredQueue, loggedInUser]);

  const escalationPaginatedCalls = useMemo(() => {
    const start = (escalationPage - 1) * escalationPageSize;
    return myEscalations.slice(start, start + escalationPageSize);
  }, [myEscalations, escalationPage, escalationPageSize]);

  const escalationTotalPages = Math.ceil(myEscalations.length / escalationPageSize) || 1;

  const liveCounts = useMemo(() => {
    const uid = loggedInUser?.userId;

    // Self Assigned tab count
    const selfCount = selfAssignedRawCalls.length;

    // Support Tab Logic
    const askedSupport = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._assignedEngineerId === uid &&
          p._supportRequested === true &&
          p._productClosure?.status !== "Field Visit Required" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;
    const assignedSupport = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._supportPersonId === uid &&
          p._supportRequested === true &&
          !p._resolved &&
          p._productClosure?.status !== "Closed" &&
          p._productClosure?.status !== "Field Visit Required",
      ),
    ).length;

    // Field Visit Tab Logic
    const askedVisit = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._fieldVisit?.assignedBy === uid &&
          p._fieldVisit?.assignedTo !== uid &&
          p._fieldVisit.status !== "Closed" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;
    const assignedVisit = queue.filter((e) =>
      (e.products || []).some(
        (p) =>
          p._fieldVisit?.assignedTo === uid &&
          p._fieldVisit.status !== "Closed" &&
          p._fieldVisit.status !== "Returned" &&
          p._productClosure?.status !== "Resolved" &&
          p._productClosure?.status !== "Closed",
      ),
    ).length;

    return {
      selfAssigned: selfCount,
      escalation: queue.filter((e) => {
        if (e.status === "Resolved") return false;
        if (loggedInUser?.department === "Admin") return true;
        return (e.products || []).some(
          (p) =>
            p._assignedEngineerId === uid &&
            p._assigned !== false &&
            !p._resolved &&
            p._productClosure?.status !== "Closed" &&
            !p._supportRequested &&
            p._productClosure?.status !== "Pending" &&
            (!p._fieldVisit?.assignedTo || p._fieldVisit.status === "Closed"),
        );
      }).length,
      support: askedSupport + assignedSupport,
      fieldVisit: askedVisit + assignedVisit,
      pending: queue.filter((e) => {
        return (e.products || []).some(
          (p) =>
            p._assignedEngineerId === uid &&
            p._productClosure?.status === "Pending" &&
            !p._supportRequested,
        );
      }).length,
    };
  }, [queue, selfAssignedRawCalls, loggedInUser]);

  const handleProductClose = async (callId, pIdx, d) => {
    // Optimistic Update for instant UI feedback
    setQueue((prev) =>
      prev.map((call) => {
        if (call.callId === callId) {
          const updatedProducts = [...call.products];
          updatedProducts[pIdx] = {
            ...updatedProducts[pIdx],
            _productClosure: { ...updatedProducts[pIdx]._productClosure, ...d },
          };
          if (d.returnToAssigned) {
            updatedProducts[pIdx]._supportPersonId = null;
            updatedProducts[pIdx]._supportPersonName = null;
          }
          return { ...call, products: updatedProducts };
        }
        return call;
      }),
    );

    try {
      await axios.patch(
        `${API_URL}/service-calls/${callId}/product/${pIdx}/close`,
        { ...d, userId: loggedInUser?.userId, name: loggedInUser?.name },
      );
      toast("Product status updated", "success");

      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      setQueue(data.map((call) => ({ ...call, callId: call._id })));
    } catch (err) {
      toast("Failed to update product status", "error");
    }
  };

  const handleProductAttend = async (callId, pIdx) => {
    try {
      const call = queue.find((c) => c.callId === callId);
      if (!call) return;

      const productsToAttend = [];
      call.products.forEach((p, idx) => {
        if (p._assignedEngineerId === loggedInUser?.userId && !p._attended) {
          productsToAttend.push(idx);
        }
      });
      if (!productsToAttend.includes(pIdx)) productsToAttend.push(pIdx);

      await Promise.all(
        productsToAttend.map((idx) =>
          axios.patch(
            `${API_URL}/service-calls/${callId}/product/${idx}/attend`,
            { userId: loggedInUser?.userId, name: loggedInUser?.name },
          ),
        ),
      );

      toast("Call attended successfully", "success");

      const { data } = await axios.get(`${API_URL}/service-calls/active`);
      setQueue(data.map((call) => ({ ...call, callId: call._id })));
    } catch (err) {
      toast("Failed to mark call as attended", "error");
    }
  };

  const handleSupportRequest = async (callId, pIdx, data) => {
    const entry = queue.find((e) => e.callId === callId);
    if (!entry) return;
    try {
      await axios.post(`${API_URL}/service-calls/support`, {
        callId,
        callNumber: entry.callNumber,
        productIdx: pIdx,
        product: entry.products[pIdx],
        supportPerson: data.supportPerson,
        notes: data.notes,
        askedBy: loggedInUser?.userId,
        askedByName: loggedInUser?.name,
      });
      toast("Support request assigned", "success");

      const { data: qData } = await axios.get(
        `${API_URL}/service-calls/active`,
      );
      setQueue(qData.map((call) => ({ ...call, callId: call._id })));

      if (loggedInUser?.userId) {
        const sRes = await axios.get(
          `${API_URL}/service-calls/support/${loggedInUser.userId}`,
        );
        setSupportReqs(sRes.data);
      }
    } catch (err) {
      console.error(
        "Support Request Error:",
        err.response?.data || err.message,
      );
      toast("Failed to assign support request", "error");
    }
  };

  // Reverse Escalate handler
  const handleReverseEscalateInline = async (callId, productIdx, reason) => {
    setIsSubmittingReverse(true);
    try {
      await axios.patch(`${API_URL}/service-calls/${callId}/product/${productIdx}/reverse-escalate`, {
        userId: loggedInUser?.userId,
        name: loggedInUser?.name,
        reason: reason || "Reverse escalated back to previous assignee",
      });
      toast("Product reverse-escalated successfully", "success");
      setReverseModalItem(null);
      setReverseReason("");
      await refreshData();
    } catch (err) {
      console.error("Failed to reverse escalate:", err);
      toast(err.response?.data?.message || "Failed to reverse escalate", "error");
    } finally {
      setIsSubmittingReverse(false);
    }
  };

  const handleOpenReverseEscalate = (call, product, productIdx) => {
    const hist = product?._escalationHistory || [];
    let prevName = "";
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i];
      if (h.assignedTo && h.assignedTo !== loggedInUser?.userId) {
        prevName = h.engineerName || h.assignedToName || h.assignedTo;
        break;
      }
    }
    if (!prevName) {
      prevName = call.registeredByName || call.registeredBy || "Creator";
    }

    setReverseModalItem({
      callId: call._id || call.callId || call.id,
      callNumber: call.callNumber,
      productIdx,
      product,
      previousAssigneeName: prevName,
    });
    setReverseReason("");
  };

  const handleOpenEditReport = (call, product, productIdx) => {
    const closure = product?._productClosure || {};
    setEditingReportItem({
      callId: call._id || call.callId || call.id,
      callNumber: call.callNumber,
      productIdx,
      product,
    });
    setEditForm({
      status: closure.status || (product?._resolved ? "Resolved" : "Pending"),
      remarks: closure.remarks || "",
      resolutionType: closure.resolutionType || "",
      editReason: "",
    });
  };

  const handleSaveEditedReport = async () => {
    if (!editingReportItem) return;
    if (!editForm.editReason.trim()) {
      toast("Please provide a reason for editing this report", "error");
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await axios.patch(
        `${API_URL}/service-calls/${editingReportItem.callId}/product/${editingReportItem.productIdx}/edit-report`,
        {
          status: editForm.status,
          remarks: editForm.remarks,
          resolutionType: editForm.resolutionType,
          userId: loggedInUser?.userId,
          name: loggedInUser?.name,
          role: loggedInUser?.role,
          editReason: editForm.editReason,
        }
      );
      toast("Report updated successfully", "success");
      setEditingReportItem(null);
      await refreshData();
    } catch (err) {
      console.error("Failed to edit report:", err);
      toast("Failed to update report", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleAssignVisit = async (callId, type, form, productIdx) => {
    const entry = queue.find((e) => e.callId === callId);
    if (!entry) return;
    try {
      await axios.post(`${API_URL}/service-calls/field-visit`, {
        callId,
        callNumber: entry.callNumber,
        productIdx,
        type,
        assignedBy: loggedInUser?.userId,
        assignedByName: loggedInUser?.name,
        ...form,
      });
      toast("Field visit assigned", "success");

      const { data: qData } = await axios.get(
        `${API_URL}/service-calls/active`,
      );
      setQueue(qData.map((call) => ({ ...call, callId: call._id })));

      if (loggedInUser?.userId) {
        const fRes = await axios.get(
          `${API_URL}/service-calls/field-visit/${loggedInUser.userId}`,
        );
        setFieldVisits(fRes.data);
      }
    } catch (err) {
      console.error(
        "Field Visit Assignment Error:",
        err.response?.data || err.message,
      );
      toast("Failed to assign field visit", "error");
    }
  };

  const tabs = [
    {
      id: "escalation",
      label: "Escalation/ Assignments",
      icon: Shield,
      count: liveCounts.escalation,
      color: "from-blue-600 via-indigo-600 to-indigo-700 shadow-indigo-600/20",
    },
    {
      id: "self_assigned",
      label: "Self Assigned",
      icon: UserCheck,
      count: liveCounts.selfAssigned,
      color: "from-emerald-600 via-teal-600 to-cyan-700 shadow-teal-600/20",
    },
    {
      id: "pending",
      label: "Pending Checks",
      icon: AlertCircle,
      count: liveCounts.pending,
      color: "from-amber-500 via-orange-500 to-orange-600 shadow-orange-600/20",
    },
    {
      id: "support",
      label: "Support Desk",
      icon: HelpCircle,
      count: liveCounts.support,
      color: "from-sky-500 via-blue-500 to-indigo-500 shadow-blue-500/20",
    },
    {
      id: "fieldvisit",
      label: "Field Visits",
      icon: MapPin,
      count: liveCounts.fieldVisit,
      color:
        "from-indigo-600 via-violet-600 to-purple-600 shadow-indigo-600/20",
    },
  ];

  const prevLiveCountsRef = useRef(liveCounts);
  const [newActivityTabs, setNewActivityTabs] = useState({});

  useEffect(() => {
    const prev = prevLiveCountsRef.current;
    const current = liveCounts;
    const updates = {};
    let hasNew = false;

    // Check if the relevant assigned/actionable queues increased in size
    if (current.escalation > prev.escalation) {
      updates.escalation = true;
      hasNew = true;
    }
    if (current.support > prev.support) {
      updates.support = true;
      hasNew = true;
    }
    if (current.fieldVisit > prev.fieldVisit) {
      updates.fieldvisit = true;
      hasNew = true;
    }

    if (hasNew && remoteUpdateRef.current) {
      playNotificationSound();
      setNewActivityTabs((old) => {
        // Prevent highlighting the tab we are currently looking at
        const next = { ...old, ...updates };
        if (next[activeTab]) delete next[activeTab];
        return next;
      });
    }

    // Always reset the remote update flag after processing liveCounts
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
    }

    prevLiveCountsRef.current = current;
  }, [liveCounts, activeTab]);

  const refreshData = async () => {
    if (!loggedInUser?.userId) return;
    try {
      const [qRes, allRes, sRes, fRes] = await Promise.all([
        axios.get(`${API_URL}/service-calls/active`),
        axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/service-calls/support/${loggedInUser.userId}`),
        axios.get(`${API_URL}/service-calls/field-visit/${loggedInUser.userId}`),
      ]);
      setQueue(qRes.data.map((call) => ({ ...call, callId: call._id })));
      setAllCalls((allRes.data || []).map((call) => ({ ...call, callId: call._id || call.id })));
      setSupportReqs(sRes.data);
      setFieldVisits(fRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const defaultFormData = () => ({
    ...emptyForm(),
    mode: modes[0] || "Phone",
    assignedEngineer: loggedInUser?.userId || "",
    assignedEngineerName: loggedInUser?.name || "",
    assignedDepartment: loggedInUser?.department || "",
  });

  const handleSaveModes = async (updated) => {
    setModes(updated);
    try {
      await axios.post(`${API_URL}/master/settings`, {
        key: MODES_KEY,
        value: updated,
      });
    } catch (err) {
      console.error("Failed to save modes to server:", err);
      toast("Could not save modes to server", "error");
    }
  };

  const handleSaveCall = async (formRow, isEdit) => {
    let validDateTime = formRow.dateTime;
    if (
      validDateTime &&
      typeof validDateTime === "string" &&
      !validDateTime.includes("T")
    ) {
      validDateTime = formRow.timestamp || new Date().toISOString();
    }

    const assignedProducts = (formRow.products || []).map((p) => ({
      ...p,
      _assigned: true,
      _assignedAt: p._assignedAt || new Date().toISOString(),
      _assignedEngineerId: loggedInUser?.userId,
      _assignedEngineerName: loggedInUser?.name,
      _currentDepartment: loggedInUser?.department || "Support Engineers",
      _attended: true,
      _deadline: null,
      _isCritical: false,
      _levelPointer: 0,
      _escalationPointer: 0,
    }));

    const finalPayload = {
      ...formRow,
      dateTime: validDateTime,
      status: "Assigned",
      registeredBy: loggedInUser?.userId,
      currentEngineerId: loggedInUser?.userId,
      currentEngineerName: loggedInUser?.name,
      currentDepartment: loggedInUser?.department || "Support Engineers",
      noEscalation: true,
      deadline: null,
      products: assignedProducts,
    };

    const {
      id: _ignoreId,
      _id,
      _products,
      _people,
      _queueEntry,
      ...serverPayload
    } = finalPayload;

    if (isEdit) {
      serverPayload._editedBy = loggedInUser?.userId || "Employee";
      serverPayload._editedByName = loggedInUser?.name || "Employee";
      serverPayload._editedByRole = loggedInUser?.role || "Employee";
      const callId = formRow._id || formRow.id || formRow.callId;
      try {
        await axios.patch(`${API_URL}/service-calls/${callId}`, serverPayload);
        toast("Service call updated successfully", "success");
      } catch (err) {
        console.error("Failed to update call:", err);
        toast("Failed to update service call", "error");
        return;
      }
    } else {
      try {
        await axios.post(`${API_URL}/service-calls`, serverPayload);
        toast("Service call registered successfully", "success");
      } catch (err) {
        console.error("Failed to create call:", err);
        toast("Failed to register service call", "error");
        return;
      }
    }

    await refreshData();
    setView("desk");
    setEditingCall(null);
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    row: null,
  });

  const handleDeleteCall = async (callId) => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/service-calls/${callId}`);
      toast("Call deleted successfully", "success");
      setQueue((prev) => prev.filter((c) => (c._id || c.callId || c.id) !== callId));
      setDeleteModalState({ isOpen: false, row: null });
    } catch (err) {
      console.error("Failed to delete call:", err);
      toast("Failed to delete call", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Removed blocking full-screen loading spinner

  if (view === "form") {
    return (
      <div className="w-full h-full font-sans text-[0.85vw] flex flex-col flex-1 min-h-0 overflow-hidden">
        <ServiceCallForm
          initialData={editingCall || defaultFormData()}
          customerDb={customerDb}
          serviceCalls={queue}
          partyTypes={partyTypes}
          sites={sites}
          segments={segments}
          employees={employees}
          modes={modes}
          onSave={handleSaveCall}
          onBack={() => {
            setView("desk");
            setEditingCall(null);
          }}
          onSaveModes={handleSaveModes}
          canWrite={true}
          canUpdate={true}
          allowEditDate={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full text-[0.85vw] bg-slate-100/70 overflow-hidden pb-[0.4vw]">
      {/* Top Header Toolbar with Glass Tab Container & Action Buttons */}
      <div className="flex items-center gap-[0.8vw] mb-[0.6vw] sticky top-0 z-10 shrink-0">
        {/* Premium Glass-Effect Tab Container */}
        <div className="flex-1 flex gap-[0.5vw] bg-white/80 backdrop-blur-md border border-slate-400 rounded-[0.8vw] p-[0.35vw] shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                if (newActivityTabs[t.id]) {
                  setNewActivityTabs((prev) => {
                    const next = { ...prev };
                    delete next[t.id];
                    return next;
                  });
                }
              }}
              className={`flex-1 flex items-center justify-center gap-[0.5vw] py-[0.55vw] rounded-[0.5vw] font-bold transition-all duration-305 relative cursor-pointer ${
                activeTab === t.id
                  ? `bg-gradient-to-r ${t.color} text-white shadow-md overflow-hidden`
                  : newActivityTabs[t.id]
                    ? "tab-running-border text-white font-extrabold shadow-sm"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 overflow-hidden"
              }`}
            >
              <t.icon className="w-[1vw] h-[1vw]" />
              <span className="">{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[0.65vw] px-[0.45vw] py-[0.05vw] rounded-full font-bold transition-colors z-10 ${
                    activeTab === t.id
                      ? "bg-white/20 text-white"
                      : newActivityTabs[t.id]
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "bg-slate-100 text-slate-750"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Controls: Refresh & Register Call */}
        <div className="flex items-center gap-[0.5vw] bg-white/80 backdrop-blur-md border border-slate-400 rounded-[0.8vw] p-[0.35vw] shadow-sm shrink-0">
          <button
            type="button"
            onClick={refreshData}
            title="Refresh Tasks"
            className="p-[0.55vw] rounded-[0.5vw] text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
          >
            <RefreshCw className="w-[1vw] h-[1vw]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCall(null);
              setView("form");
            }}
            className="flex items-center gap-[0.4vw] px-[1vw] py-[0.55vw] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-[0.5vw] shadow-sm hover:shadow transition-all duration-200 cursor-pointer text-[0.82vw]"
          >
            <Plus className="w-[1vw] h-[1vw] stroke-[2.5]" />
            <span>Register Call</span>
          </button>
        </div>
      </div>

      {/* ── Global Search & Date/Priority Filters Toolbar across all tabs ── */}
      <div className="flex items-center justify-between bg-white px-[0.8vw] py-[0.45vw] rounded-[0.7vw] shadow-sm border border-slate-200 gap-[0.7vw] shrink-0 mb-[0.6vw]">
        {/* Left side: Search Box */}
        <div className="relative flex-1 max-w-[28vw]">
          <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 w-[0.95vw] h-[0.95vw]" />
          <input
            type="text"
            placeholder="Search by customer, party code, call no, product, model..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="w-full pl-[2.4vw] pr-[0.8vw] h-[2.1vw] border border-slate-200 rounded-[0.5vw] text-[0.76vw] font-medium text-slate-800 placeholder-slate-400 bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
          />
        </div>

        {/* Middle: Crisp Date Range Filter */}
        <div className="flex items-center gap-[0.35vw] border border-slate-200 rounded-[0.5vw] h-[2.1vw] px-[0.6vw] bg-slate-50/70 hover:bg-white focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all text-[0.74vw]">
          <Calendar className="w-[0.85vw] h-[0.85vw] text-slate-400 shrink-0" />
          <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider">
            From
          </span>
          <input
            type="date"
            value={filterFromDate || ""}
            onChange={(e) => {
              setFilterFromDate(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="text-[0.74vw] text-slate-800 bg-transparent outline-none font-semibold cursor-pointer border-none p-0 focus:ring-0"
          />
          <span className="text-slate-300 mx-[0.1vw]">—</span>
          <span className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider">
            To
          </span>
          <input
            type="date"
            value={filterToDate || ""}
            min={filterFromDate || undefined}
            onChange={(e) => {
              setFilterToDate(e.target.value);
              setSelfAssignedPage(1);
            }}
            className="text-[0.74vw] text-slate-800 bg-transparent outline-none font-semibold cursor-pointer border-none p-0 focus:ring-0"
          />
          {(filterFromDate || filterToDate) && (
            <button
              onClick={() => {
                setFilterFromDate("");
                setFilterToDate("");
                setSelfAssignedPage(1);
              }}
              className="text-[0.68vw] text-rose-500 hover:text-rose-700 font-bold cursor-pointer ml-[0.3vw] px-[0.3vw] py-[0.1vw] hover:bg-rose-50 rounded"
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right side: Priority Dropdown */}
        <div className="flex gap-[0.5vw] items-center flex-shrink-0">
          <div className="w-[10vw]">
            <CustomDropdown
              size="sm"
              value={filterPriority}
              onChange={(val) => {
                setFilterPriority(val);
                setSelfAssignedPage(1);
              }}
              options={[
                { value: "All", label: "All Priorities" },
                ...PRIORITIES.map((p) => ({ value: p, label: p })),
              ]}
              triggerClassName="h-[2.1vw] !rounded-[0.5vw] border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-slate-100/70 p-[1.2vw] rounded-[1vw] border border-slate-400 shadow-inner">
            <RefreshCw className="w-[3vw] h-[3vw] text-indigo-650 animate-spin mb-[1vw]" />
            <span className="text-[1vw] font-bold text-slate-800">
              Fetching latest tasks...
            </span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={
                activeTab === "reports"
                  ? "flex-1 min-h-0 flex flex-col"
                  : "flex-1 min-h-0 flex flex-col overflow-hidden"
              }
            >

              {activeTab === "escalation" && (
                <EscalationQueueTab
                  myEscalations={myEscalations}
                  escalationPaginatedCalls={escalationPaginatedCalls}
                  escalationPage={escalationPage}
                  setEscalationPage={setEscalationPage}
                  escalationTotalPages={escalationTotalPages}
                  escalationPageSize={escalationPageSize}
                  loggedInUser={loggedInUser}
                  employees={employees}
                  timers={timers}
                  activeActionMenuId={activeActionMenuId}
                  setActiveActionMenuId={setActiveActionMenuId}
                  actionMenuCoords={actionMenuCoords}
                  setActionMenuCoords={setActionMenuCoords}
                  handleProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  setReverseModalItem={setReverseModalItem}
                  setSummaryModalRow={setSummaryModalRow}
                  setHistoryModalProduct={setHistoryModalProduct}
                  setEditingReportItem={setEditingReportItem}
                  setEditForm={setEditForm}
                  handleDeleteCall={handleDeleteCall}
                />
              )}
              {/* ── Self Assigned Tab: Full Table View ── */}
              {activeTab === "self_assigned" && (
                <SelfAssignedQueueTab
                  selfAssignedRawCalls={selfAssignedRawCalls}
                  selfAssignedStatus={selfAssignedStatus}
                  setSelfAssignedStatus={setSelfAssignedStatus}
                  setSelfAssignedPage={setSelfAssignedPage}
                  selfAssignedPaginatedCalls={selfAssignedPaginatedCalls}
                  selfAssignedPage={selfAssignedPage}
                  selfAssignedTotalPages={selfAssignedTotalPages}
                  selfAssignedPageSize={selfAssignedPageSize}
                  selfAssignedFiltered={selfAssignedFiltered}
                  loggedInUser={loggedInUser}
                  employees={employees}
                  activeActionMenuId={activeActionMenuId}
                  setActiveActionMenuId={setActiveActionMenuId}
                  actionMenuCoords={actionMenuCoords}
                  setActionMenuCoords={setActionMenuCoords}
                  handleProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  setSummaryModalRow={setSummaryModalRow}
                  setHistoryModalProduct={setHistoryModalProduct}
                  setEditingReportItem={setEditingReportItem}
                  setEditForm={setEditForm}
                  handleDeleteCall={handleDeleteCall}
                  handleOpenEditCall={handleOpenEditCall}
                />
              )}

              {activeTab === "pending" && (
                <PendingTab
                  queue={filteredQueue}
                  currentUser={loggedInUser}
                  employees={employees}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
              {activeTab === "support" && (
                <SupportRequestsTab
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  queue={filteredQueue}
                  employees={employees}
                  onProductClose={handleProductClose}
                  onAssignFieldVisit={handleAssignVisit}
                  onSupportRequest={handleSupportRequest}
                  onProductAttend={handleProductAttend}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
              {activeTab === "fieldvisit" && (
                <VisitsTab
                  type="Field Visit"
                  queue={filteredQueue}
                  currentUser={loggedInUser}
                  onRefresh={refreshData}
                  employees={employees}
                  onAssignFieldVisit={handleAssignVisit}
                  onProductClose={handleProductClose}
                  onOpenRespond={(modalData) => setActiveModalProduct(modalData)}
                  onOpenHistory={(call) => setHistoryModalProduct(call)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Call Summary Modal */}
      {summaryModalRow && (
        <CallSummaryModal
          row={summaryModalRow}
          employees={employees}
          onClose={() => setSummaryModalRow(null)}
        />
      )}

      {/* Product History Modal */}
      {historyModalProduct && (
        <ProductHistoryModal
          history={[
            ...((historyModalProduct.editHistory || []).map((eh) => ({
              status: `Call Edited (${eh.role || "Admin"})`,
              timestamp: eh.editedAt,
              updatedBy: eh.editedBy,
              updatedByName: eh.editedByName,
              remarks: eh.reason ? `Reason: ${eh.reason}` : "",
              metadata: {
                isEdit: true,
                editReason: eh.reason,
                diffs: eh.diffs || [],
              },
            }))),
            ...((historyModalProduct._products || historyModalProduct.products || [])
              .flatMap((p) => [
                ...(p._escalationHistory || []).map((e) => ({
                  ...e,
                  timestamp: e.assignedAt,
                  status:
                    e.status === "Pending"
                      ? "Escalation Assigned"
                      : e.status || "Escalated",
                  updatedByName: e.updatedByName || "System",
                  metadata: {
                    assignedTo:
                      e.engineerName || e.assignedToName || e.assignedTo,
                    assignedToName: e.engineerName || e.assignedToName,
                    dept: e.department || e.dept,
                    remarks: e.remarks || e.reason || "",
                    level: e.level,
                    deadline: e.targetTime || e.deadline,
                  },
                })),
                ...(p._history || []),
              ])),
          ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
          employees={employees}
          currentUser={loggedInUser}
          onClose={() => setHistoryModalProduct(null)}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        isLoading={isDeleting}
        title="Delete Service Call"
        callNumber={deleteModalState.row?.callNumber}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalState({ isOpen: false, row: null });
          }
        }}
        onConfirm={() => {
          if (deleteModalState.row) {
            const callId =
              deleteModalState.row._id ||
              deleteModalState.row.callId ||
              deleteModalState.row.id;
            handleDeleteCall(callId);
          }
        }}
      />
    </div>
  );
};

export default ServiceCallResponse;
