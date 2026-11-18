import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// Added Loader2 for the spinner
import { Shield, Eye, EyeOff, User, Loader2 } from "lucide-react";
import logo from "../../../public/Akira_logo.webp";
import loginBg from "../../../public/login_bg.webp";

// ... (defaultEmployees array remains the same)

const LoginPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false,
  });

  // Check on mount: if user already has an active session (sessionStorage or localStorage), redirect to /dashboard
  useEffect(() => {
    const rawUser = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser");
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user && (user.userId || user._id || user.email)) {
          if (!sessionStorage.getItem("loggedInUser")) {
            sessionStorage.setItem("loggedInUser", rawUser);
          }
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (e) {
        sessionStorage.removeItem("loggedInUser");
        localStorage.removeItem("loggedInUser");
      }
    }

    const remembered = localStorage.getItem("rememberedUser");
    if (remembered) {
      setFormData((prev) => ({
        ...prev,
        emailOrUsername: remembered,
        rememberMe: true,
      }));
    }
  }, [navigate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const emailInput = document.querySelector('input[name="emailOrUsername"]');
      if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
      }
    }
  }, [mounted]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const performLogin = async (username, pwd) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email: username,
        emailOrUserId: username,
        password: pwd
      });

      const matchedUser = response.data.user || response.data;
      const userJson = JSON.stringify(matchedUser);

      sessionStorage.setItem("loggedInUser", userJson);
      window.dispatchEvent(new Event('auth-change'));

      if (formData.rememberMe) {
        localStorage.setItem("loggedInUser", userJson);
        localStorage.setItem("rememberedUser", matchedUser.userId || matchedUser.email || username);
      } else {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("rememberedUser");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid User ID or Password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (username, pwd) => {
    setFormData((prev) => ({
      ...prev,
      emailOrUsername: username,
      password: pwd,
    }));
    performLogin(username, pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { emailOrUsername, password } = formData;

    if (!emailOrUsername.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    performLogin(emailOrUsername, password);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center relative overflow-hidden text-gray-700 bg-slate-100">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      <div className="relative z-10 w-full max-w-[28%]">
        <div className={`transition-all duration-1000 ${mounted ? "transform translate-y-0 opacity-100" : "transform translate-y-8 opacity-0"}`}>
          <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-5.5 border border-white border-opacity-20">
            <div className="flex flex-col items-center text-center mb-3.5">
              <img src={logo} alt="App Logo" className="mb-3 w-[115px]" />
              <p className="text-gray-600 text-xs">Welcome back! Please sign in to your account.</p>
            </div>

            {error && (
              <div className="mb-3 px-3.5 py-2 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 mb-2.5">Emp ID or Email *</label>
                <div className="relative">
                  <User className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-700 group-focus-within:text-blue-500 transition-colors" size="14px" />
                  <input
                    type="text"
                    name="emailOrUsername"
                    disabled={isLoading}
                    value={formData.emailOrUsername}
                    onChange={handleInputChange}
                    className="w-full pl-8 text-sm pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-sm"
                    placeholder="Enter your Emp ID (e.g., Fisto1)"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 mb-2.5">Password *</label>
                <div className="relative">
                  <Shield className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-700 group-focus-within:text-blue-500 transition-colors" size="14px" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    disabled={isLoading}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-8 text-sm pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <Eye size="14px" /> : <EyeOff size="14px" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    disabled={isLoading}
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </label>
                
              </div>

              {/* Updated Login Button with Spinner */}
              <button
                type="submit"
                disabled={isLoading}
                className="text-xs w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 px-1 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Demo Credentials Hint with 1-Click Quick Use Buttons */}
            <div className="mt-3.5 p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-700 font-semibold">Demo Credentials:</p>
                <span className="text-xs text-blue-500 font-medium bg-blue-100/70 px-1.5 py-px rounded">
                  Quick Login
                </span>
              </div>

              {/* Admin Quick Login Row */}
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-blue-100 shadow-2xs">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-px rounded border border-purple-200 mr-1">
                    Admin
                  </span>
                  ID: <span className="font-bold text-gray-900">ak12</span> &nbsp;|&nbsp; Pwd: <span className="font-bold text-gray-900">123456</span>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin("ak12", "123456")}
                  className="px-2.5 py-1 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Use & Login
                </button>
              </div>

              {/* User Quick Login Row */}
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-blue-100 shadow-2xs">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-px rounded border border-blue-200 mr-1">
                    User
                  </span>
                  ID: <span className="font-bold text-gray-900">AK1234</span> &nbsp;|&nbsp; Pwd: <span className="font-bold text-gray-900">123456</span>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin("AK1234", "123456")}
                  className="px-2.5 py-1 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Use & Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
