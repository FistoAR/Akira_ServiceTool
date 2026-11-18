import { useState, useEffect, useRef } from "react";
import { Phone, User, LogOut, Building2, IdCard, Mail, Gift, Maximize, Minimize, ShieldCheck, Sparkles, ChevronRight, Menu } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useSidebar } from "./SidePannel";
import ThemeSelector from "./ThemeSelector";

const NavBar = ({ type }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const profileRef = useRef(null);
  const { isFullScreen, toggleFullScreen, isCollapsed, setIsCollapsed } = useSidebar();

  // Load logged-in user from localStorage
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser"));
    if (user) {
      setLoggedInUser(user);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date to DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Fallback to original if invalid
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Get department color
  const getDeptColor = (department) => {
    switch (department) {
      case "Support Engineer":
        return "bg-blue-100 text-blue-700";
      case "Service Engineer":
        return "bg-green-100 text-green-700";
      case "R&D":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("token");
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = "/";
  };

  return (
    <>
      <div className="sticky top-0 p-1 z-48 shrink-0">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile / Small screen sidebar toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            {type === "Service Call" ? (
              <h1 className="text-base font-semibold text-black flex items-center gap-3 truncate">
                <Phone className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="truncate">Service Call Entry</span>
              </h1>
            ) : (
              <h1 className="text-base font-semibold text-black truncate">{type}</h1>
            )}
          </div>

          <div className={`flex gap-3 items-center`}>
            {/* Theme Selector */}
            <ThemeSelector />

            {/* Full Screen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullScreen}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-full px-2.5 py-1.5 hover:shadow-md hover:border-gray-400 text-slate-700 hover:text-blue-600 transition-all cursor-pointer font-semibold text-sm"
            >
              {isFullScreen ? (
                <>
                  <Minimize className="w-3.5 h-3.5 text-slate-600" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5 text-slate-600" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-full px-1.5 py-1.5 hover:shadow-md hover:border-gray-400 transition-all duration-200">
              {/* Notification Icon */}
              <NotificationsDropdown />

              {/* Profile Icon with Dropdown */}
              <div className="relative" ref={profileRef}>
                <div
                  onClick={() => setShowProfile(!showProfile)}
                  className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-200 hover:shadow-lg overflow-hidden border border-slate-350"
                  title="Profile"
                >
                  {loggedInUser?.profilePicture ? (
                    <img 
                      src={loggedInUser.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold select-none">
                        {loggedInUser ? getInitials(loggedInUser.name) : "U"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                {showProfile && loggedInUser && (
                  <div className="absolute right-0 mt-2.5 w-[288px] bg-white rounded-2xl shadow-[0_16px_40px_-8px_rgba(15,23,42,0.16)] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    {/* Header: Solid #2088ce with coordinated accents */}
                    <div className="p-4 bg-[#2088ce] flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/80 shadow-sm flex items-center justify-center overflow-hidden">
                          {loggedInUser.profilePicture ? (
                            <img 
                              src={loggedInUser.profilePicture} 
                              alt="Profile Large" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-bold tracking-wider">
                              {getInitials(loggedInUser.name)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-white text-xs font-semibold leading-tight truncate">
                            {loggedInUser.name}
                          </h3>
                          <span title="Verified User">
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-100 shrink-0" />
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center px-1.5 py-px rounded-sm text-xs font-semibold bg-white text-[#166498] shadow-2xs">
                            {loggedInUser.department || "Staff"}
                          </span>
                          {loggedInUser.role && (
                            <span className="text-xs font-medium text-white/95 bg-[#125887]/50 border border-white/25 px-1.5 py-px rounded-sm uppercase tracking-wider">
                              {loggedInUser.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Information Rows: Clean list format without boxy cards */}
                    <div className="py-2 px-3.5 divide-y divide-slate-100 bg-white">
                      {/* Employee ID */}
                      <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded transition-colors">
                        <div className="flex items-center gap-2.5">
                          <IdCard className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-xs font-normal text-slate-650">Employee ID</span>
                        </div>
                        <span className="font-semibold text-slate-800 font-mono text-xs">
                          {loggedInUser.userId || "—"}
                        </span>
                      </div>

                      {/* Full Name */}
                      <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded transition-colors">
                        <div className="flex items-center gap-2.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-normal text-slate-650">Full Name</span>
                        </div>
                        <span className="font-medium text-slate-800 text-sm truncate max-w-40">
                          {loggedInUser.name || "—"}
                        </span>
                      </div>

                      {/* Department */}
                      <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-normal text-slate-650">Department</span>
                        </div>
                        <span className="font-medium text-slate-800 text-sm truncate max-w-40">
                          {loggedInUser.department || "—"}
                        </span>
                      </div>

                      {/* Email */}
                      {loggedInUser.email && (
                        <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded transition-colors">
                          <div className="flex items-center gap-2.5">
                            <Mail className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-normal text-slate-650">Email</span>
                          </div>
                          <span className="font-medium text-slate-800 font-mono text-xs truncate max-w-40" title={loggedInUser.email}>
                            {loggedInUser.email}
                          </span>
                        </div>
                      )}

                      {/* DOB */}
                      {loggedInUser.dob && (
                        <div className="flex items-center justify-between py-2 px-1 hover:bg-slate-50/70 rounded transition-colors">
                          <div className="flex items-center gap-2.5">
                            <Gift className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-normal text-slate-650">Date of Birth</span>
                          </div>
                          <span className="font-medium text-slate-800 text-sm">
                            {formatDate(loggedInUser.dob)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sign Out CTA */}
                    <div className="p-3 bg-white border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all duration-150 cursor-pointer text-xs font-semibold shadow-2xs hover:shadow-xs group"
                      >
                        <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavBar;