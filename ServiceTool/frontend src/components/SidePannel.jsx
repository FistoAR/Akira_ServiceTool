import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
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
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
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
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user) {
      setLoggedInUser(user);
      // Fetch latest profile from backend to sync permissions live
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
  }, []);

  const isAdmin = loggedInUser?.role === "Admin" || loggedInUser?.department === "Admin";
  const isSupervisor = loggedInUser?.role === "Supervisor";
  const canViewAdminModules = isAdmin || isSupervisor;

  const hasAccess = (modId) => {
    if (isAdmin) return true;
    return !!loggedInUser?.permissions?.[modId]?.enabled;
  };

  console.log("loggedInUser in SidePannel:", loggedInUser);

  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: DashboardIcon,
      show: true,
    },
    {
      path: "/masterPage",
      label: "Master Access",
      icon: AccessIcon,
      show: isAdmin || [
        "partyTypes", "warrantyRules", "segments", "fourM", "units", "employees", "roleAccess", "escalation"
      ].some(hasAccess),
      subItems: [
        { path: "/masterPage?tab=categories", label: "Party Type Categories", show: hasAccess("partyTypes") },
        { path: "/masterPage?tab=warranty-rules", label: "Warranty Rule Master", show: hasAccess("warrantyRules") },
        { path: "/masterPage?tab=segments", label: "Product Segments", show: hasAccess("segments") },
        { path: "/masterPage?tab=four-m", label: "4M Categories", show: hasAccess("fourM") },
        { path: "/masterPage?tab=units", label: "Units", show: hasAccess("units") },
        { path: "/masterPage?tab=employees", label: "User Management", show: hasAccess("employees") },
        { path: "/masterPage?tab=role-access", label: "Role Access", show: hasAccess("roleAccess") },
        { path: "/masterPage?tab=escalation", label: "Service Call SLA", show: hasAccess("escalation") },
      ].filter(sub => sub.show),
    },
    {
      path: "/customers",
      label: "Customers",
      icon: ActivityIcon,
      show: canViewAdminModules && hasAccess("customers"),
    },
    {
      path: "/serviceCall",
      label: "Service Call",
      icon: CallIcon,
      show: canViewAdminModules && ["callReg", "callAssign", "callEscalation", "callReports"].some(hasAccess),
      subItems: [
        { path: "/serviceCall", label: "Call Registration", show: hasAccess("callReg") },
        { path: "/serviceCall/assignment", label: "Call Assignment", show: hasAccess("callAssign") },
        { path: "/serviceCall/escalations", label: "Escalating Calls", show: hasAccess("callEscalation") },
        { path: "/serviceCall/reports", label: "Call Reports", show: hasAccess("callReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/serviceMaterial",
      label: "Service Material",
      icon: ServiceIcon,
      show: canViewAdminModules && ["matInward", "matReports"].some(hasAccess),
      subItems: [
        { path: "/serviceMaterial", label: "Material Inward Register", show: hasAccess("matInward") },
        { path: "/serviceMaterial/reports", label: "Reports", show: hasAccess("matReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/productionMaterial",
      label: "Production Material",
      icon: ProductionIcon,
      show: canViewAdminModules && ["prodNC", "prodReports"].some(hasAccess),
      subItems: [
        { path: "/productionMaterial", label: "Production NC", show: hasAccess("prodNC") },
        { path: "/productionMaterial/reports", label: "Reports", show: hasAccess("prodReports") },
      ].filter(sub => sub.show),
    },
    {
      path: "/serviceCallResponse",
      label: "Service Call",
      icon: CallIcon,
      show: !canViewAdminModules && ["callReg", "callAssign", "callEscalation", "callReports"].some(hasAccess),
    },
    {
      path: "/serviceMaterialResponse",
      label: "Service Material",
      icon: ServiceIcon,
      show: !canViewAdminModules && ["matInward", "matReports"].some(hasAccess),
    },
    {
      path: "/productionMaterialResponse",
      label: "Production Material",
      icon: ProductionIcon,
      show: !canViewAdminModules && ["prodNC", "prodReports"].some(hasAccess),
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
      // Prevents the default Link behavior
      e.preventDefault();
      
      // Open the menu
      setOpenMenu(item.path);
      
      // Expand sidebar if it's collapsed
      if (isCollapsed) {
        setIsCollapsed(false);
      }

      // NEW LOGIC: Automatically navigate to the first sub-item
      navigate(item.subItems[0].path);
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
        ${isCollapsed ? "min-w-[4vw] max-w-[4vw]" : "min-w-[18vw] max-w-[18vw]"}
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
                      transition-all duration-300 ease-out overflow-hidden
                      ${
                        isCollapsed
                          ? "justify-center px-[0.6vw] py-[1.2vh]"
                          : "px-[1vw] py-[1.2vh] gap-[1vw]"
                      }
                      ${
                        active
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    {!active && hoveredItem === item.path && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl" />
                    )}

                    <div
                      className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                        isCollapsed
                          ? "w-[1.8vw] h-[1.8vw]"
                          : "w-[1.4vw] h-[1.4vw]"
                      }`}
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="w-full h-full object-contain transition-all duration-300"
                        style={{
                          filter: active
                            ? "brightness(0) invert(1)"
                            : hoveredItem === item.path
                              ? activeFilter
                              : "none",
                        }}
                      />
                    </div>

                    <span
                      className={`whitespace-nowrap flex-1 font-medium text-[0.85vw] transition-all duration-500 ease-out ${
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
                          className={`text-[0.6vw] font-bold rounded-full w-[1.2vw] h-[1.2vw] flex items-center justify-center transition-all duration-300 ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {item.subItems.length}
                        </span>
                        <svg
                          className={`w-[0.8vw] h-[0.8vw] transition-transform duration-300 ${
                            isSubMenuOpen ? "rotate-180" : ""
                          } ${active ? "text-white" : "text-gray-400"}`}
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
                      <div className="absolute left-0 top-[15%] bottom-[15%] w-[0.25vw] bg-white rounded-r-full" />
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
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-300/80 p-[0.5vw] shadow-inner">
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
                                      transition-all duration-250 ease-out
                                      ${
                                        isSubActive
                                          ? "bg-white text-blue-600 font-semibold shadow-md border border-blue-100 scale-[1.02]"
                                          : "text-gray-500 hover:bg-white/80 hover:text-gray-800 hover:shadow-sm"
                                      }
                                    `}
                                  >
                                    <div
                                      className={`
                                        flex-shrink-0 rounded-md flex items-center justify-center text-[0.6vw] font-bold
                                        transition-all duration-300 w-[1.4vw] h-[1.4vw]
                                        ${
                                          isSubActive
                                            ? "bg-blue-500 text-white shadow-sm shadow-blue-400/30"
                                            : isSubHovered
                                              ? "bg-blue-100 text-blue-500"
                                              : "bg-gray-100 text-gray-400"
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
                                          ? "opacity-100 text-blue-500 translate-x-0"
                                          : isSubHovered
                                            ? "opacity-100 text-gray-400 translate-x-0"
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
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* Footer */}
      <div
        className={`py-[1.2vh] transition-all duration-500 ease-out ${
          isCollapsed ? "px-[0.4vw]" : "px-[0.8vw]"
        }`}
      >
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center py-[1vh] rounded-xl hover:bg-blue-50 transition-all duration-300 cursor-pointer group bg-blue-100"
            title="Expand sidebar"
          >
            <svg
              className="w-[1.2vw] h-[1.2vw] text-blue-400 group-hover:text-blue-600 transition-colors duration-200"
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
          </button>
        ) : (
          loggedInUser && (
            <div
              className="flex items-center rounded-xl p-[0.5vw] bg-gradient-to-r from-gray-50 to-gray-50/50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 cursor-pointer gap-[0.7vw]"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
            >
              <div className="relative flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 w-[2.2vw] h-[2.2vw]">
                <span className="text-white font-bold text-[0.6vw]">
                  {loggedInUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[0.78vw] font-semibold text-gray-800 truncate leading-tight">
                  {loggedInUser.name}
                </p>
                <p className="text-[0.6vw] text-gray-400 truncate leading-tight mt-[0.1vh]">
                  {loggedInUser.department}
                </p>
              </div>
              <div className="p-[0.3vw] bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">
                <svg
                  className="w-[0.9vw] h-[0.9vw] text-blue-400 flex-shrink-0 rotate-180"
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
            </div>
          )
        )}
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