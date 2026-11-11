import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import DashboardIcon from "../assets/SidePannelLogos/Dashboard.svg";
import AccessIcon from "../assets/SidePannelLogos/access.png";
import ActivityIcon from "../assets/SidePannelLogos/Activity.svg";
import CallIcon from "../assets/SidePannelLogos/call.png";
import ServiceIcon from "../assets/SidePannelLogos/service.png";
import ProductionIcon from "../assets/SidePannelLogos/production.png";
import MessagesIcon from "../assets/SidePannelLogos/Messages.svg";
import AkiraLogo from "../assets/Akira_logo.webp";

export const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync state if user exits or enters fullscreen via Esc or browser shortcut (e.g. F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullScreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      // Enter native browser fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      // Exit native browser fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isFullScreen,
        setIsFullScreen,
        toggleFullScreen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate(); // Hook for programmatic navigation
  const [loggedInUser, setLoggedInUser] = useState(null);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [hoveredSub, setHoveredSub] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const syncUser = () => {
      const user = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser"));
      if (user) {
        setLoggedInUser(user);
        axios
          .get(`${API_URL}/auth/employees`)
          .then((res) => {
            const freshUser = res.data.find((e) => e.userId === user.userId || e._id === user._id);
            if (freshUser) {
              const updated = { ...user, ...freshUser };
              setLoggedInUser(updated);
              sessionStorage.setItem("loggedInUser", JSON.stringify(updated));
            }
          })
          .catch((err) => console.error("Sync profile error:", err));
      }
    };

    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, []);

  const isAdmin = loggedInUser?.role === "Admin" || loggedInUser?.department === "Admin";
  const isSupervisor = loggedInUser?.role === "Supervisor";

  const hasAccess = (modId) => {
    if (isAdmin) return true;
    return !!loggedInUser?.permissions?.[modId]?.enabled;
  };

  // Check if user is an Incharge / Admin for a specific module or has write/update/delete access
  const hasModuleInchargeOrAdmin = (modId) => {
    if (isAdmin || isSupervisor) return true;
    const p = loggedInUser?.permissions?.[modId];
    return !!(p?.incharge || p?.isAdmin || p?.write || p?.update || p?.delete);
  };

  const canManageServiceCall = ["callReg", "callAssign", "callEscalation", "callReports", "serviceCallResponse"].some(hasAccess);
  const canManageServiceMaterial = ["matInward", "matReports", "serviceMaterialResponse"].some(hasAccess);
  const canManageProductionMaterial = ["prodNC", "prodReports", "productionMaterialResponse"].some(hasAccess);
  const canManageCustomers = hasAccess("customers");

  console.log("loggedInUser in SidePannel:", loggedInUser);

  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: DashboardIcon,
      show: isAdmin || hasAccess("dashboardAdmin") || hasAccess("dashboardUser") || !loggedInUser?.permissions || (loggedInUser.permissions.dashboardAdmin === undefined && loggedInUser.permissions.dashboardUser === undefined),
    },
    {
      path: "/masterPage",
      label: "Master Access",
      icon: AccessIcon,
      show: isAdmin || [
        "partyTypes", "warrantyRules", "segments", "fourM", "units", "sites", "employees", "roleAccess", "escalation"
      ].some(hasAccess),
      subItems: [
        { path: "/masterPage?tab=categories", label: "Party Type Categories", show: hasAccess("partyTypes") },
        { path: "/masterPage?tab=warranty-rules", label: "Warranty Rule Master", show: hasAccess("warrantyRules") },
        { path: "/masterPage?tab=segments", label: "Product Segments", show: hasAccess("segments") },
        { path: "/masterPage?tab=four-m", label: "4M Categories", show: hasAccess("fourM") },
        { path: "/masterPage?tab=units", label: "Units", show: hasAccess("units") },
        { path: "/masterPage?tab=sites", label: "Site Master", show: hasAccess("sites") },
        { path: "/masterPage?tab=employees", label: "User Management", show: hasAccess("employees") },
        { path: "/masterPage?tab=role-access", label: "Role Access", show: hasAccess("roleAccess") },
        { path: "/masterPage?tab=escalation", label: "Escalations", show: hasAccess("escalation") },
      ].filter(sub => sub.show),
    },
    {
      path: "/customers",
      label: "Customers",
      icon: ActivityIcon,
      show: canManageCustomers,
    },
    {
      path: "/serviceCall",
      label: "Service Call",
      icon: CallIcon,
      show: canManageServiceCall,
      subItems: [
        { path: "/serviceCall", label: "Call Registration", show: hasAccess("callReg") },
        { path: "/serviceCall/assignment", label: "Call Assignment", show: hasAccess("callAssign") },
        { path: "/serviceCall/escalations", label: "Escalating Calls", show: hasAccess("callEscalation") },
        { path: "/serviceCallResponse", label: "Call Response", show: hasAccess("serviceCallResponse") },
        { path: "/serviceCall/reports", label: "Call Reports", show: hasAccess("callReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/serviceMaterial",
      label: "Service Material",
      icon: ServiceIcon,
      show: canManageServiceMaterial,
      subItems: [
        { path: "/serviceMaterial", label: "Material Inward Register", show: hasAccess("matInward") },
        { path: "/serviceMaterialResponse", label: "Material Response", show: hasAccess("serviceMaterialResponse") },
        { path: "/serviceMaterial/reports", label: "Reports", show: hasAccess("matReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/productionMaterial",
      label: "Production Material",
      icon: ProductionIcon,
      show: canManageProductionMaterial,
      subItems: [
        { path: "/productionMaterial", label: "Production NC", show: hasAccess("prodNC") },
        { path: "/productionMaterialResponse", label: "Production Response", show: hasAccess("productionMaterialResponse") },
        { path: "/productionMaterial/reports", label: "Reports", show: hasAccess("prodReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/troubleshoot",
      label: "Troubleshoot",
      icon: MessagesIcon,
      show: hasAccess("troubleshoot"),
    },
  ];

  // Helper: find parent item that owns the current pathname
  const findActiveParent = () => {
    const currentPath = location.pathname + location.search;
    return navItems.find(
      (item) =>
        item.subItems &&
        item.subItems.some((sub) => currentPath === sub.path || location.pathname === sub.path)
    );
  };

  // Auto-open sub-menu based on current route
  useEffect(() => {
    const activeParent = findActiveParent();
    if (activeParent) {
      setOpenMenu(activeParent.path);
    } else {
      setOpenMenu(null);
    }
  }, [location.pathname, location.search]);

  // When sidebar expands, re-open the sub-menu if a sub-item is active
  useEffect(() => {
    if (!isCollapsed) {
      const activeParent = findActiveParent();
      if (activeParent) {
        setOpenMenu(activeParent.path);
      }
    }
  }, [isCollapsed]);

  const activeFilter =
    "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)";

  // Check if parent is active (either exact match or one of its children is active)
  const isActive = (item) => {
    const currentPath = location.pathname + location.search;
    if (location.pathname === item.path || currentPath === item.path) return true;
    if (item.subItems) {
      return item.subItems.some((sub) => location.pathname === sub.path || currentPath === sub.path);
    }
    return false;
  };

  const handleMenuClick = (item, e) => {
    if (item.subItems && item.subItems.length > 0) {
      e.preventDefault();

      // If sidebar is collapsed, expand it
      if (isCollapsed) {
        setIsCollapsed(false);
      }

      // If already open, clicking it toggles it closed (while retaining current active page)
      if (openMenu === item.path) {
        setOpenMenu(null);
      } else {
        setOpenMenu(item.path);
        // If current route is not already inside this menu's children, navigate to the first sub-item
        const isChildActive = item.subItems.some(
          (sub) => location.pathname === sub.path || (location.pathname + location.search) === sub.path
        );
        if (!isChildActive) {
          navigate(item.subItems[0].path);
        }
      }
    } else {
      setOpenMenu(null);
    }
  };

  return (
    <aside
      className={`
        flex flex-col bg-white relative
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        border-r border-slate-300 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.08)]
        ${isCollapsed ? "min-w-[4vw] max-w-[4vw]" : "min-w-[16vw] max-w-[16vw]"}
      `}
      style={{ height: "100vh" }}
    >
      {/* Logo */}
      <div
        className={`flex items-center justify-center border-b border-gray-50 transition-all duration-500 ease-out ${
          isCollapsed ? "h-[10vh] px-[0.5vw]" : "h-[12vh] px-[1vw]"
        }`}
      >
        <img
          src={AkiraLogo}
          alt="Logo"
          className={`transition-all duration-500 ease-out object-contain ${
            isCollapsed ? "w-auto h-[4vw] ml-[0.2vw]" : "w-auto h-[7vh]"
          }`}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-[2vh] px-[0.3vw] custom-scrollbar">
        <ul className="space-y-[1.5vh]">
          {navItems
            .filter((item) => item.show)
            .map((item, index) => {
              const active = isActive(item);
              const hasSubItems = Boolean(item.subItems);
              const isSubMenuOpen = openMenu === item.path;

              return (
                <li
                  key={item.path + item.label}
                  className="relative"
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={isCollapsed ? item.label : ""}
                >
                  {/* Parent */}
                  <Link
                    to={hasSubItems ? "#" : item.path}
                    onClick={(e) => handleMenuClick(item, e)}
                    className={`
                      relative flex items-center rounded-xl
                      transition-all duration-200 ease-out overflow-hidden
                      ${
                        isCollapsed
                          ? "justify-center px-[0.6vw] py-[1.2vh]"
                          : "px-[1vw] py-[1.2vh] gap-[1vw]"
                      }
                      ${
                        active
                          ? "bg-blue-100/75 text-blue-700 font-medium shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      }
                    `}
                  >
                    {!active && hoveredItem === item.path && (
                      <div className="absolute inset-0 bg-blue-50/50 rounded-xl pointer-events-none" />
                    )}

                    <div
                      className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                        isCollapsed
                          ? "w-[1.8vw] h-[1.8vw]"
                          : "w-[1.4vw] h-[1.4vw]"
                      }`}
                    >
                      {item.iconify ? (
                        <Icon
                          icon={item.iconify}
                          className={`w-full h-full transition-all duration-200 ${
                            active
                              ? "text-blue-600"
                              : hoveredItem === item.path
                                ? "text-blue-600"
                                : "text-slate-500"
                          }`}
                        />
                      ) : (
                        <img
                          src={item.icon}
                          alt={item.label}
                          className="w-full h-full object-contain transition-all duration-200"
                          style={{
                            filter: active || hoveredItem === item.path
                              ? activeFilter
                              : "none",
                          }}
                        />
                      )}
                    </div>

                    <span
                      className={`whitespace-nowrap flex-1 text-[0.85vw] transition-all duration-500 ease-out ${
                        isCollapsed
                          ? "w-0 opacity-0 translate-x-[-1vw] pointer-events-none"
                          : "w-auto opacity-100 translate-x-0"
                      }`}
                    >
                      {item.label}
                    </span>

                    {hasSubItems && !isCollapsed && (
                      <div className="flex items-center gap-[0.3vw] flex-shrink-0">
                        <span
                          className={`text-[0.6vw] font-medium rounded-full w-[1.2vw] h-[1.2vw] flex items-center justify-center transition-all duration-200 ${
                            active
                              ? "bg-blue-200/80 text-blue-800 font-medium"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {item.subItems.length}
                        </span>
                        <svg
                          className={`w-[0.8vw] h-[0.8vw] transition-transform duration-300 ${
                            isSubMenuOpen ? "rotate-180" : ""
                          } ${active ? "text-blue-600" : "text-slate-400"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    )}

                    {active && (
                      <div className="absolute left-0 top-[14%] bottom-[14%] w-[0.32vw] bg-blue-600 rounded-r-full shadow-xs" />
                    )}
                  </Link>

                  {/* Sub-menu Section */}
                  {hasSubItems && (
                    <div
                      className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        isSubMenuOpen && !isCollapsed
                          ? "max-h-[60vh] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="mx-[0.5vw] mt-[0.6vh] mb-[0.3vh]">
                        <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-[0.5vw]">
                          <ul className="flex flex-col gap-[0.4vh]">
                            {item.subItems.map((subItem, subIndex) => {
                              const isSubActive = (location.pathname + location.search) === subItem.path || (location.pathname === subItem.path);
                              const isSubHovered =
                                hoveredSub === subItem.path + subItem.label;
                              return (
                                <li
                                  key={subItem.path + subItem.label}
                                  onMouseEnter={() =>
                                    setHoveredSub(
                                      subItem.path + subItem.label
                                    )
                                  }
                                  onMouseLeave={() => setHoveredSub(null)}
                                  style={{
                                    animation: isSubMenuOpen
                                      ? `cardSlideIn 0.4s ease-out ${subIndex * 80 + 120}ms both`
                                      : "none",
                                  }}
                                >
                                  <Link
                                    to={subItem.path}
                                    className={`
                                      relative flex items-center gap-[0.6vw] px-[0.7vw] py-[0.8vh] rounded-lg text-[0.76vw]
                                      transition-all duration-200 ease-out
                                      ${
                                        isSubActive
                                          ? "bg-white text-blue-600 font-medium shadow-xs border border-blue-200"
                                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900 font-medium"
                                      }
                                    `}
                                  >
                                    <div
                                      className={`
                                        flex-shrink-0 rounded-md flex items-center justify-center text-[0.6vw] font-medium
                                        transition-all duration-200 w-[1.4vw] h-[1.4vw]
                                        ${
                                          isSubActive
                                            ? "bg-blue-600 text-white"
                                            : isSubHovered
                                              ? "bg-blue-100 text-blue-600"
                                              : "bg-slate-100 text-slate-400"
                                        }
                                      `}
                                    >
                                      {String(subIndex + 1).padStart(2, "0")}
                                    </div>

                                    <span className="flex-1">
                                      {subItem.label}
                                    </span>

                                    <svg
                                      className={`w-[0.6vw] h-[0.6vw] flex-shrink-0 transition-all duration-200 ${
                                        isSubActive
                                          ? "opacity-100 text-blue-600 translate-x-0"
                                          : isSubHovered
                                            ? "opacity-100 text-slate-400 translate-x-0"
                                            : "opacity-0 -translate-x-[0.3vw]"
                                      }`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collapsed tooltip */}
                  {isCollapsed && hoveredItem === item.path && (
                    <div className="absolute left-[120%] top-1/2 -translate-y-1/2 z-[100] bg-gray-900 text-white text-[0.75vw] font-medium px-[0.8vw] py-[0.5vh] rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[0.4vw] border-transparent border-r-gray-900" />
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Divider */}
      <div className="mx-[1vw]">
        <div className="h-[1px] bg-slate-200" />
      </div>

      {/* Footer: Toggle Collapse / Expand */}
      <div
        className={`py-[1vh] transition-all duration-300 ease-out ${
          isCollapsed ? "px-[0.4vw]" : "px-[0.8vw]"
        }`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer group hover:bg-slate-100 ${
            isCollapsed
              ? "justify-center py-[0.8vh] bg-slate-50 text-slate-500 hover:text-blue-600"
              : "px-[0.8vw] py-[0.8vh] justify-between text-slate-600 hover:text-slate-900 bg-slate-50/70 border border-slate-200/80"
          }`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!isCollapsed && (
            <span className="text-[0.72vw] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              Collapse menu
            </span>
          )}
          <div className="w-[1.6vw] h-[1.6vw] rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
            <svg
              className={`w-[0.9vw] h-[0.9vw] transition-transform duration-300 ${
                isCollapsed ? "" : "rotate-180"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      </div>

      <style>{`
        @keyframes cardSlideIn {
          from {
            opacity: 0;
            transform: translateY(0.8vh) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </aside>
  );
}