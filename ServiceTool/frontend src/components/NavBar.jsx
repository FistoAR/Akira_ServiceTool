import { useState, useEffect, useRef } from "react";
import { Phone, User, LogOut, Building2, IdCard, Mail, Gift } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";

const NavBar = ({ type }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const profileRef = useRef(null);

  // Load logged-in user from localStorage
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
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
    localStorage.removeItem("loggedInUser");
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
                  <div className="absolute right-0 mt-[0.5vw] w-[18vw] bg-white rounded-xl shadow-2xl border border-slate-350 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-[1vw] py-[1vw]">
                      <div className="flex items-center gap-[0.8vw]">
                        <div className="w-[3vw] h-[3vw] rounded-full bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center border-2 border-white border-opacity-40 overflow-hidden">
                          {loggedInUser.profilePicture ? (
                            <img 
                              src={loggedInUser.profilePicture} 
                              alt="Profile Large" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-[1.1vw] font-bold">
                              {getInitials(loggedInUser.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white text-[0.95vw] font-semibold leading-tight">
                            {loggedInUser.name}
                          </h3>
                          <span
                            className={`inline-block mt-[0.2vw] px-[0.5vw] py-[0.1vw] rounded-full text-[0.6vw] font-medium ${getDeptColor(
                              loggedInUser.department
                            )}`}
                          >
                            {loggedInUser.department}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="px-[1vw] py-[0.7vw] space-y-[0.5vw]">
                      <div className="flex items-center gap-[0.6vw] p-[0.4vw] rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-blue-50 flex items-center justify-center">
                          <IdCard className="w-[1vw] h-[1vw] text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[0.65vw] text-slate-600 font-semibold uppercase tracking-wide">
                            Employee ID
                          </p>
                          <p className="text-[0.85vw] text-black font-semibold">
                            {loggedInUser.userId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-[0.6vw] p-[0.4vw] rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-green-50 flex items-center justify-center">
                          <User className="w-[1vw] h-[1vw] text-green-500" />
                        </div>
                        <div>
                          <p className="text-[0.65vw] text-slate-600 font-semibold uppercase tracking-wide">
                            Full Name
                          </p>
                          <p className="text-[0.85vw] text-black font-semibold">
                            {loggedInUser.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-[0.6vw] p-[0.4vw] rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-purple-50 flex items-center justify-center">
                          <Building2 className="w-[1vw] h-[1vw] text-purple-500" />
                        </div>
                        <div>
                          <p className="text-[0.65vw] text-slate-600 font-semibold uppercase tracking-wide">
                            Department
                          </p>
                          <p className="text-[0.85vw] text-black font-semibold">
                            {loggedInUser.department}
                          </p>
                        </div>
                      </div>

                      {loggedInUser.email && (
                        <div className="flex items-center gap-[0.6vw] p-[0.4vw] rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-orange-50 flex items-center justify-center">
                            <Mail className="w-[1vw] h-[1vw] text-orange-500" />
                          </div>
                          <div>
                            <p className="text-[0.65vw] text-slate-600 font-bold uppercase tracking-wide">
                              Email Address
                            </p>
                            <p className="text-[0.85vw] text-slate-900 font-black">
                              {loggedInUser.email}
                            </p>
                          </div>
                        </div>
                      )}

                      {loggedInUser.dob && (
                        <div className="flex items-center gap-[0.6vw] p-[0.4vw] rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-pink-50 flex items-center justify-center">
                            <Gift className="w-[1vw] h-[1vw] text-pink-500" />
                          </div>
                          <div>
                            <p className="text-[0.65vw] text-slate-600 font-bold uppercase tracking-wide">
                              Date of Birth
                            </p>
                            <p className="text-[0.85vw] text-slate-900 font-black">
                              {formatDate(loggedInUser.dob)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-300 mx-[0.8vw]"></div>

                    {/* Logout Button */}
                    <div className="px-[1vw] py-[0.6vw]">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-[0.6vw] p-[0.5vw] rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 group"
                      >
                        <div className="w-[1.8vw] h-[1.8vw] rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                          <LogOut className="w-[1vw] h-[1vw]" />
                        </div>
                        <span className="text-[0.85vw] font-semibold">
                          Sign Out
                        </span>
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