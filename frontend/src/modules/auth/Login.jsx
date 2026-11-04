import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, User, Loader2 } from "lucide-react";
import logo from "../../../public/Akira_logo.webp";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false,
  });

  // 1. Immediate check: if user is logged in (sessionStorage OR localStorage), navigate directly to /dashboard
  useEffect(() => {
    const rawUser = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser");
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user && (user.userId || user._id || user.email)) {
          // If recovered from localStorage (remember me), sync into sessionStorage as well
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

    // 2. Prefill username/email if saved previously
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const { emailOrUsername, password } = formData;

    if (!emailOrUsername.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email: emailOrUsername,
        password: password
      });

      const matchedUser = response.data;
      const userJson = JSON.stringify(matchedUser);

      // Always save to current browser session
      sessionStorage.setItem("loggedInUser", userJson);

      if (formData.rememberMe) {
        // Persist across browser closes in localStorage
        localStorage.setItem("loggedInUser", userJson);
        localStorage.setItem("rememberedUser", matchedUser.userId || matchedUser.email || emailOrUsername);
      } else {
        // Session only - clear any old persistent credentials
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("rememberedUser");
      }

      window.dispatchEvent(new Event('auth-change'));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid User ID or Password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden text-gray-700">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-80"></div>
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-[0.5vw] h-[0.5vw] bg-white bg-opacity-20 rounded-full transition-all duration-[6000ms] ${
                mounted ? "animate-pulse" : ""
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div
        className={`relative z-10 w-full max-w-[28vw] mx-4 transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.2vw] shadow-2xl p-[2vw] border border-white/20">
          <div className="text-center mb-[1.5vw]">
            <div className="w-[10vw] h-[4vw] mx-auto rounded-[0.8vw] flex items-center justify-center mb-[0.8vw] transform hover:scale-105 transition-transform duration-300">
              <img src={logo} alt="Company Logo" className="w-[9vw] h-[3.2vw]" />
            </div>
            <p className="text-[0.8vw] text-gray-600">
              Welcome back! Please sign in to your account.
            </p>
          </div>

          {error && (
            <div className="mb-[1vw] p-[0.7vw] bg-red-50 border border-red-200 rounded-[0.5vw] text-red-600 text-[0.7vw] flex items-center justify-center animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-[0.8vw]">
            <div>
              <label className="block text-[0.8vw] font-medium text-gray-700 mb-[0.3vw]">
                Emp ID or Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-[0.8vw] flex items-center pointer-events-none">
                  <User className="h-[1vw] w-[1vw] text-gray-400" />
                </div>
                <input
                  type="text"
                  name="emailOrUsername"
                  value={formData.emailOrUsername}
                  onChange={handleInputChange}
                  className="w-full pl-[2.4vw] pr-[0.8vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-[0.5vw] focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="ak12"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.8vw] font-medium text-gray-700 mb-[0.3vw]">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-[0.8vw] flex items-center pointer-events-none">
                  <Shield className="h-[1vw] w-[1vw] text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-[2.4vw] pr-[2.4vw] py-[0.5vw] text-[0.8vw] border border-gray-300 rounded-[0.5vw] focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-[0.8vw] flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-[1vw] w-[1vw]" />
                  ) : (
                    <Eye className="h-[1vw] w-[1vw]" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[0.75vw]">
              <label className="flex items-center text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-[0.8vw] w-[0.8vw] text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="ml-[0.5vw]">Remember me</span>
              </label>
              <a
                href="#"
                className="text-purple-600 hover:text-purple-500 font-medium"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-[0.5vw] px-[1vw] text-[0.8vw] bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-[0.5vw] hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-[1.02] shadow-md cursor-pointer flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-[1vw] h-[1vw] mr-[0.5vw] animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-[1vw] text-center">
            <p className="text-[0.75vw] text-gray-600">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-purple-600 hover:text-purple-500 font-medium cursor-pointer"
              >
                Register Here
              </button>
            </p>
          </div>

          <div className="mt-[1vw] p-[0.8vw] bg-blue-50 border border-blue-200 rounded-[0.6vw] text-[0.65vw] text-gray-600">
            <p className="font-semibold text-blue-900 mb-[0.2vw]">
              Demo Credentials:
            </p>
            <p>
              Admin User ID:{" "}
              <span className="font-bold text-gray-800">ak12</span> | Password:{" "}
              <span className="font-bold text-gray-800">123456</span>
            </p>
            <p>
              User IDs:{" "}
              <span className="font-bold text-gray-800">AK1234</span> |
              Password: <span className="font-bold text-gray-800">123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
