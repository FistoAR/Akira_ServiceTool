import { useState, useEffect, useRef } from "react";
import { Phone, User, LogOut, Building2, IdCard, Mail, Gift, Maximize, Minimize, ShieldCheck, Sparkles, ChevronRight } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useSidebar } from "./SidePannel";

const NavBar = ({ type }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const profileRef = useRef(null);
  const { isFullScreen, toggleFullScreen } = useSidebar();

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
      <div className={`sticky top-0 p-[0.3vw] z-48 min-h-[8%] max-h-[8%]`}>
        <div className="flex justify-between items-start">
          {type === "Service Call" ? (
            <h1 className="text-[1.3vw] font-semibold text-black flex items-center gap-[0.8vw]">
              <Phone className="w-[1.1vw] h-[1.1vw] text-slate-700" />
              Service Call Entry
            </h1>
          ) : (
            <h1 className="text-[1.3vw] font-semibold text-black">{type}</h1>
          )}

          <div className={`flex gap-[0.8vw] items-center`}>
            {/* Full Screen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullScreen}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              className="flex items-center gap-[0.35vw] bg-white border border-gray-300 rounded-full px-[0.6vw] py-[0.38vw] hover:shadow-md hover:border-gray-400 text-slate-700 hover:text-blue-600 transition-all cursor-pointer font-semibold text-[0.72vw]"
            >
              {isFullScreen ? (
                <>
                  <Minimize className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize className="w-[0.9vw] h-[0.9vw] text-slate-600" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-full px-[0.4vw] py-[0.33vw] hover:shadow-md hover:border-gray-400 transition-all duration-200">
              {/* Notification Icon */}
              <NotificationsDropdown />

              {/* Profile Icon with Dropdown */}
              <div className="relative" ref={profileRef}>
                <div
                  onClick={() => setShowProfile(!showProfile)}
                  className="w-[1.9vw] h-[1.9vw] rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-200 hover:shadow-lg overflow-hidden border border-slate-350"
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
                      <span className="text-white text-[0.65vw] font-bold select-none">
                        {loggedInUser ? getInitials(loggedInUser.name) : "U"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                {showProfile && loggedInUser && (
                  <div className="absolute right-0 mt-[0.6vw] w-[20vw] bg-white rounded-[1vw] shadow-[0_16px_40px_-8px_rgba(15,23,42,0.16)] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    {/* Header: Refined Akira Indigo / Brand Blue */}
                    <div className="p-[1.1vw] bg-[#4338ca] flex items-center gap-[0.85vw]">
                      <div className="relative shrink-0">
                        <div className="w-[3.3vw] h-[3.3vw] rounded-full bg-white/15 border-2 border-white/60 shadow-sm flex items-center justify-center overflow-hidden">
                          {loggedInUser.profilePicture ? (
                            <img 
                              src={loggedInUser.profilePicture} 
                              alt="Profile Large" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-[1.1vw] font-bold tracking-wider">
                              {getInitials(loggedInUser.name)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-[0.35vw]">
                          <h3 className="text-white text-[1.05vw] font-semibold leading-tight truncate">
                            {loggedInUser.name}
                          </h3>
                          <span title="Verified User">
                            <ShieldCheck className="w-[0.9vw] h-[0.9vw] text-indigo-200 shrink-0" />
                          </span>
                        </div>
                        <div className="flex items-center gap-[0.35vw] mt-[0.25vw] flex-wrap">
                          <span className="inline-flex items-center px-[0.45vw] py-[0.1vw] rounded-[0.25vw] text-[0.62vw] font-medium bg-white text-indigo-900 shadow-2xs">
                            {loggedInUser.department || "Staff"}
                          </span>
                          {loggedInUser.role && (
                            <span className="text-[0.6vw] font-medium text-white/90 bg-indigo-900/40 border border-white/20 px-[0.35vw] py-[0.08vw] rounded-[0.25vw] uppercase tracking-wider">
                              {loggedInUser.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Information Grid Rows: Balanced Typography, Not overly bold */}
                    <div className="p-[0.8vw] space-y-[0.35vw] bg-slate-50/70">
                      {/* Employee ID */}
                      <div className="flex items-center justify-between py-[0.55vw] px-[0.6vw] bg-white border border-slate-200/90 rounded-[0.5vw] hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-[0.55vw]">
                          <IdCard className="w-[0.95vw] h-[0.95vw] text-indigo-600" />
                          <span className="text-[0.73vw] font-normal text-slate-650">Employee ID</span>
                        </div>
                        <span className="font-semibold text-slate-800 font-mono text-[0.78vw]">
                          {loggedInUser.userId || "—"}
                        </span>
                      </div>

                      {/* Full Name */}
                      <div className="flex items-center justify-between py-[0.55vw] px-[0.6vw] bg-white border border-slate-200/90 rounded-[0.5vw] hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-[0.55vw]">
                          <User className="w-[0.95vw] h-[0.95vw] text-emerald-600" />
                          <span className="text-[0.73vw] font-normal text-slate-650">Full Name</span>
                        </div>
                        <span className="font-medium text-slate-800 text-[0.78vw] truncate max-w-[11vw]">
                          {loggedInUser.name || "—"}
                        </span>
                      </div>

                      {/* Department */}
                      <div className="flex items-center justify-between py-[0.55vw] px-[0.6vw] bg-white border border-slate-200/90 rounded-[0.5vw] hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-[0.55vw]">
                          <Building2 className="w-[0.95vw] h-[0.95vw] text-purple-600" />
                          <span className="text-[0.73vw] font-normal text-slate-650">Department</span>
                        </div>
                        <span className="font-medium text-slate-800 text-[0.78vw] truncate max-w-[11vw]">
                          {loggedInUser.department || "—"}
                        </span>
                      </div>

                      {/* Email */}
                      {loggedInUser.email && (
                        <div className="flex items-center justify-between py-[0.55vw] px-[0.6vw] bg-white border border-slate-200/90 rounded-[0.5vw] hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-[0.55vw]">
                            <Mail className="w-[0.95vw] h-[0.95vw] text-amber-600" />
                            <span className="text-[0.73vw] font-normal text-slate-650">Email</span>
                          </div>
                          <span className="font-medium text-slate-800 font-mono text-[0.74vw] truncate max-w-[11vw]" title={loggedInUser.email}>
                            {loggedInUser.email}
                          </span>
                        </div>
                      )}

                      {/* DOB */}
                      {loggedInUser.dob && (
                        <div className="flex items-center justify-between py-[0.55vw] px-[0.6vw] bg-white border border-slate-200/90 rounded-[0.5vw] hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-[0.55vw]">
                            <Gift className="w-[0.95vw] h-[0.95vw] text-rose-500" />
                            <span className="text-[0.73vw] font-normal text-slate-650">Date of Birth</span>
                          </div>
                          <span className="font-medium text-slate-800 text-[0.78vw]">
                            {formatDate(loggedInUser.dob)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sign Out CTA */}
                    <div className="p-[0.75vw] bg-white border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-[0.5vw] py-[0.45vw] px-[0.8vw] rounded-[0.55vw] text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all duration-150 cursor-pointer text-[0.78vw] font-semibold shadow-2xs hover:shadow-xs group"
                      >
                        <LogOut className="w-[0.95vw] h-[0.95vw] group-hover:-translate-x-0.5 transition-transform" />
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