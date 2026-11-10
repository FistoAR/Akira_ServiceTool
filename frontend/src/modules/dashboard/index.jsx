import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, RefreshCw } from "lucide-react";
import useEscalationWorker from "../../service/useEscalationWorker";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";

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

    const callStatus = {
      Registered: calls.filter((c) => c.status === "Registered").length,
      Assigned: calls.filter((c) => c.status === "Assigned").length,
      Open: calls.filter((c) => c.status === "Open").length,
      Pending: calls.filter((c) => c.status === "Pending").length,
      Resolved: calls.filter((c) => c.status === "Resolved").length,
      Critical: calls.filter(
        (c) => c.status === "Critical" || c.status === "Critical_Unresolved"
      ).length,
      Escalated: calls.filter((c) => c.status === "Escalated").length,
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

    const criticalCalls = calls.filter((c) => {
      if (c.status === "Resolved" || c.status === "Closed") return false;
      const hasActiveUnattended = (c.products || []).some(
        (p) => !p._resolved && p._productClosure?.status !== "Closed" && !p._attended
      );
      if (!hasActiveUnattended) return false;
      const timer = timers.find((t) => t.callId === c._id || t.callId === c.callId);
      return (
        c.status === "Critical" ||
        c.status === "Critical_Unresolved" ||
        c.priority === "Critical" ||
        timer?.isExpired
      );
    });

    const activeEscalated = calls.filter(
      (c) => c.status === "Escalated" && c.status !== "Resolved"
    );

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

  const totalRegisteredCalls =
    stats.callStatus.Registered +
    stats.callStatus.Assigned +
    stats.callStatus.Open +
    stats.callStatus.Pending +
    stats.callStatus.Escalated +
    stats.callStatus.Critical;

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden px-3 pt-2 pb-2 font-sans text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight leading-tight text-slate-900">
            {getGreeting()},{" "}
            <span className="text-indigo-600 font-bold">
              {loggedInUser?.name || "User"}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
          className="group flex items-center gap-1.5 text-xs font-semibold text-slate-700
            bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600
            rounded-full px-3 py-1 transition-all cursor-pointer shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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

