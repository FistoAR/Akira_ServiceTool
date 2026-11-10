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
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-[0.65vw] font-bold select-none">
                        {loggedInUser ? getInitials(loggedInUser.name) : "U"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                {showProfile && loggedInUser && (
                  <div className="absolute right-0 mt-[0.6vw] w-[20vw] bg-white rounded-[1.2vw] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    {/* Header with modern deep gradient & subtle glass accent */}
                    <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-[1.2vw] pt-[1.2vw] pb-[1.4vw] overflow-hidden">
                      {/* Decorative ambient blurred blobs */}
                      <div className="absolute -top-[1.5vw] -right-[1.5vw] w-[5vw] h-[5vw] bg-white/10 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute -bottom-[2vw] -left-[1vw] w-[6vw] h-[6vw] bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

                      <div className="relative flex items-center gap-[0.9vw]">
                        <div className="relative shrink-0">
                          <div className="w-[3.4vw] h-[3.4vw] rounded-full bg-white/20 backdrop-blur-md p-[0.15vw] border-2 border-white/50 shadow-md flex items-center justify-center overflow-hidden">
                            {loggedInUser.profilePicture ? (
                              <img 
                                src={loggedInUser.profilePicture} 
                                alt="Profile Large" 
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-white text-[1.1vw] font-black tracking-wider">
                                {getInitials(loggedInUser.name)}
                              </span>
                            )}
                          </div>
                          {/* Online status indicator */}
                          <span className="absolute bottom-0 right-0 w-[0.8vw] h-[0.8vw] bg-emerald-500 border-2 border-indigo-700 rounded-full shadow-xs" title="Online" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-[0.35vw]">
                            <h3 className="text-white text-[1.05vw] font-bold leading-tight truncate">
                              {loggedInUser.name}
                            </h3>
                            <span title="Verified Employee">
                              <ShieldCheck className="w-[0.9vw] h-[0.9vw] text-emerald-300 shrink-0" />
                            </span>
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.3vw] flex-wrap">
                            <span
                              className={`inline-flex items-center px-[0.55vw] py-[0.15vw] rounded-full text-[0.62vw] font-bold tracking-wide shadow-xs bg-white/95 text-indigo-800 backdrop-blur-xs`}
                            >
                              {loggedInUser.department || "General Staff"}
                            </span>
                            {loggedInUser.role && (
                              <span className="text-[0.6vw] font-semibold text-white/80 uppercase tracking-wider bg-black/20 px-[0.4vw] py-[0.1vw] rounded-full">
                                {loggedInUser.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details section */}
                    <div className="p-[0.9vw] space-y-[0.45vw] bg-slate-50/50">
                      {/* Employee ID */}
                      <div className="flex items-center gap-[0.7vw] p-[0.6vw] rounded-[0.8vw] bg-white border border-slate-150 hover:border-indigo-200 hover:shadow-xs transition-all group">
                        <div className="w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                          <IdCard className="w-[1.1vw] h-[1.1vw]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider">
                            Employee ID
                          </p>
                          <p className="text-[0.82vw] text-slate-800 font-bold font-mono tracking-tight mt-[0.05vw]">
                            {loggedInUser.userId || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div className="flex items-center gap-[0.7vw] p-[0.6vw] rounded-[0.8vw] bg-white border border-slate-150 hover:border-emerald-200 hover:shadow-xs transition-all group">
                        <div className="w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                          <User className="w-[1.1vw] h-[1.1vw]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider">
                            Full Name
                          </p>
                          <p className="text-[0.82vw] text-slate-800 font-bold truncate mt-[0.05vw]">
                            {loggedInUser.name || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="flex items-center gap-[0.7vw] p-[0.6vw] rounded-[0.8vw] bg-white border border-slate-150 hover:border-purple-200 hover:shadow-xs transition-all group">
                        <div className="w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
                          <Building2 className="w-[1.1vw] h-[1.1vw]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider">
                            Department
                          </p>
                          <p className="text-[0.82vw] text-slate-800 font-bold truncate mt-[0.05vw]">
                            {loggedInUser.department || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Email Address */}
                      {loggedInUser.email && (
                        <div className="flex items-center gap-[0.7vw] p-[0.6vw] rounded-[0.8vw] bg-white border border-slate-150 hover:border-amber-200 hover:shadow-xs transition-all group">
                          <div className="w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                            <Mail className="w-[1.1vw] h-[1.1vw]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider">
                              Email Address
                            </p>
                            <p className="text-[0.8vw] text-slate-800 font-bold truncate mt-[0.05vw] font-mono">
                              {loggedInUser.email}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Date of Birth */}
                      {loggedInUser.dob && (
                        <div className="flex items-center gap-[0.7vw] p-[0.6vw] rounded-[0.8vw] bg-white border border-slate-150 hover:border-pink-200 hover:shadow-xs transition-all group">
                          <div className="w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100 group-hover:scale-105 transition-transform">
                            <Gift className="w-[1.1vw] h-[1.1vw]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider">
                              Date of Birth
                            </p>
                            <p className="text-[0.82vw] text-slate-800 font-bold mt-[0.05vw]">
                              {formatDate(loggedInUser.dob)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer / Sign Out Section */}
                    <div className="p-[0.9vw] pt-[0.6vw] bg-white border-t border-slate-200/80">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-[0.6vw] rounded-[0.8vw] text-rose-600 bg-rose-50/70 hover:bg-rose-100/90 border border-rose-200/80 transition-all duration-200 group cursor-pointer shadow-xs hover:shadow-sm"
                      >
                        <div className="flex items-center gap-[0.6vw]">
                          <div className="w-[2vw] h-[2vw] rounded-[0.5vw] bg-white shadow-2xs flex items-center justify-center text-rose-600 group-hover:scale-110 group-hover:text-rose-700 transition-all">
                            <LogOut className="w-[1vw] h-[1vw]" />
                          </div>
                          <span className="text-[0.82vw] font-bold text-rose-700">
                            Sign Out
                          </span>
                        </div>
                        <ChevronRight className="w-[0.9vw] h-[0.9vw] text-rose-400 group-hover:translate-x-1 transition-transform" />
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