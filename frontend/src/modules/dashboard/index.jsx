import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, RefreshCw } from "lucide-react";
import useEscalationWorker from "../../service/useEscalationWorker";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";
import { deriveCallStatus } from "../serviceCall/ServiceCall";

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const { timers } = useEscalationWorker();

  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    try {
      const user = JSON.parse(
        sessionStorage.getItem("loggedInUser") ||
          localStorage.getItem("loggedInUser") ||
          "null"
      );
      setLoggedInUser(user);

      // Fetch live employee profile to get freshly updated role access permissions immediately
      if (user) {
        axios
          .get(`${API_URL}/auth/employees`)
          .then((res) => {
            const freshUser = res.data.find(
              (e) => e.userId === user.userId || e._id === user._id
            );
            if (freshUser) {
              const updated = { ...user, ...freshUser };
              setLoggedInUser(updated);
              sessionStorage.setItem("loggedInUser", JSON.stringify(updated));
            }
          })
          .catch((err) => console.error("Sync profile in dashboard error:", err));
      }
    } catch {
      setLoggedInUser(null);
    }
  }, []);

  const [calls, setCalls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchData = async () => {
    try {
      const [callsRes, materialsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/service-calls`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/service-material`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/master/customers`).catch(() => ({ data: [] })),
      ]);
      setCalls(callsRes.data || []);
      setMaterials(materialsRes.data || []);
      setCustomers(customersRes.data || []);
      setLastSync(new Date());
    } catch (e) {
      console.error("Failed to sync dashboard metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const userId = loggedInUser?.userId || loggedInUser?.id;

    // Enrich calls with derived status matching ServiceCallEntry & Escalations logic
    const enrichedCalls = calls.map((c) => {
      let products = c.products || [];
      const attendedProd = products.find((p) => p._attended);
      if (attendedProd) {
        products = products.map((p) => ({
          ...p,
          _assigned: attendedProd._assigned,
          _assignedEngineerId: attendedProd._assignedEngineerId,
          _assignedEngineerName: attendedProd._assignedEngineerName,
          _attended: attendedProd._attended,
          _attendedAt: attendedProd._attendedAt || p._attendedAt,
        }));
      }
      const derived = deriveCallStatus(products, c.status);
      return { ...c, _products: products, derivedStatus: derived };
    });

    const callStatus = {
      Registered: enrichedCalls.filter((c) => c.derivedStatus === "Registered").length,
      Assigned: enrichedCalls.filter((c) => c.derivedStatus === "Assigned").length,
      Open: enrichedCalls.filter((c) => c.derivedStatus === "Open").length,
      Pending: enrichedCalls.filter((c) => c.derivedStatus === "Pending" || c.derivedStatus === "Field Visit" || c.derivedStatus === "Supporting").length,
      Resolved: enrichedCalls.filter((c) => c.derivedStatus === "Resolved").length,
      Critical: enrichedCalls.filter((c) => c.derivedStatus === "Critical").length,
      Escalated: enrichedCalls.filter((c) => c.derivedStatus === "Escalating" || c.derivedStatus === "Escalated").length,
    };

    let unclaimedMaterials = 0;
    let claimedMaterials = 0;
    let completedMaterials = 0;
    let approvedMaterials = 0;
    let deniedMaterials = 0;
    const pendingAdminReviews = [];
    const myClaimedProducts = [];

    materials.forEach((entry) => {
      (entry.products || []).forEach((p) => {
        const rawStatus = p.status || p.report?.status || "Open";
        const finalStatus = p.finalStatus || "Pending";

        if (!p.assignedTo) {
          unclaimedMaterials++;
        } else {
          claimedMaterials++;
          if (p.assignedTo === userId && rawStatus !== "Completed") {
            myClaimedProducts.push({ entry, product: p });
          }
        }

        if (rawStatus === "Completed" && finalStatus === "Pending") {
          completedMaterials++;
          pendingAdminReviews.push({ entry, product: p });
        }
        if (finalStatus === "Completed") approvedMaterials++;
        else if (finalStatus === "Admin Returned") deniedMaterials++;
      });
    });

    // Escalations & SLA Breaches matching ServiceCallEscalations.jsx exactly
    const activeEscalated = [];
    const criticalCalls = [];

    calls.forEach((c) => {
      if (c.status === "Resolved" || c.status === "Closed") return;
      const hasActiveUnattended = (c.products || []).some(
        (p) => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended
      );
      if (!hasActiveUnattended) return;

      const timer = timers.find((t) => t.callId === c._id || t.callId === c.callId);
      const isExhausted =
        c._queueEntry?.status === "Critical_Unresolved" ||
        c.status === "Critical_Unresolved" ||
        c.status === "Critical";

      if (!(timer != null || isExhausted)) return;

      const isCritical =
        isExhausted ||
        c.priority === "Critical" ||
        timer?.isExpired;

      if (isCritical) {
        criticalCalls.push(c);
      } else {
        activeEscalated.push(c);
      }
    });

    const myCalls = calls.filter(
      (c) =>
        c.assignedEngineerId === userId ||
        c.assignedEngineer === loggedInUser?.name
    );

    const myPendingCalls = myCalls.filter(
      (c) => c.status !== "Resolved" && c.status !== "Closed"
    );

    return {
      callStatus,
      totalCalls: calls.length,
      criticalCalls,
      activeEscalated,
      unclaimedMaterials,
      claimedMaterials,
      completedMaterials,
      approvedMaterials,
      deniedMaterials,
      pendingAdminReviews,
      myCalls,
      myPendingCalls,
      myClaimedProducts,
      myCompletedMaterials: materials.reduce((acc, entry) => {
        const count = (entry.products || []).filter(
          (p) =>
            p.assignedTo === userId &&
            (p.status === "Completed" || p.report?.status === "Completed")
        ).length;
        return acc + count;
      }, 0),
    };
  }, [calls, materials, loggedInUser, timers]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // Determine whether to display Admin or User Dashboard:
  // Rule: At least one dashboard should be enabled. If neither is explicitly enabled,
  // default to User Dashboard (dashboardUser) as fallback (or Admin Dashboard if user is Admin).
  const isAdmin =
    loggedInUser?.role === "Admin" ||
    loggedInUser?.department === "Admin";

  const perms = loggedInUser?.permissions || {};
  let showAdminView = false;

  if (perms.dashboardAdmin?.enabled) {
    showAdminView = true;
  } else if (perms.dashboardUser?.enabled) {
    showAdminView = false;
  } else {
    // If no dashboard is explicitly enabled, fallback:
    // Admin role gets Admin Dashboard; all other users get User Dashboard as default
    showAdminView = isAdmin;
  }

  if (loading) {
    return (
      <div className="w-full h-[90vh] flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-[2.4vw] h-[2.4vw] animate-spin text-indigo-500 mb-[0.8vw]" />
        <p className="text-[0.8vw] font-semibold">Syncing dashboard…</p>
      </div>
    );
  }

  const totalRegisteredCalls = stats.totalCalls || calls.length;

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden px-[0.8vw] pt-[0.5vw] pb-[0.5vw] font-sans text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between mb-[0.6vw] flex-shrink-0">
        <div>
          <h1 className="text-[1.1vw] font-bold tracking-tight leading-tight text-slate-900">
            {getGreeting()},{" "}
            <span className="text-indigo-600 font-bold">
              {loggedInUser?.name || "User"}
            </span>
          </h1>
          <p className="text-[0.68vw] font-medium text-slate-500 mt-[0.1vw] flex items-center gap-[0.35vw]">
            <Calendar className="w-[0.75vw] h-[0.75vw] text-slate-400" />
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <span className="text-slate-300">•</span>
            {showAdminView ? "Administrative overview" : "Operational overview"}
          </p>
        </div>

        <button
          onClick={fetchData}
          className="group flex items-center gap-[0.35vw] text-[0.68vw] font-semibold text-slate-700
            bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600
            rounded-full px-[0.7vw] py-[0.25vw] transition-all cursor-pointer shadow-xs"
        >
          <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-emerald-500 animate-pulse" />
          <span>Live • {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </button>
      </header>

      {/* Body */}
      {showAdminView ? (
        <AdminDashboard
          stats={stats}
          totalRegisteredCalls={totalRegisteredCalls}
          customersCount={customers.length}
          navigate={navigate}
        />
      ) : (
        <UserDashboard
          stats={stats}
          navigate={navigate}
        />
      )}
    </div>
  );
}

