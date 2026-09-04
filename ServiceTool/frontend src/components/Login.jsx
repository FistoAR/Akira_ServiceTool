import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// Added Loader2 for the spinner
import { Shield, Eye, EyeOff, User, Loader2 } from "lucide-react";
import logo from "../../public/Akira_logo.webp";

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

    setIsLoading(true); // Start loading

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email: emailOrUsername,
        password: password
      });

      const matchedUser = response.data;
      
      sessionStorage.setItem("loggedInUser", JSON.stringify(matchedUser));
      window.dispatchEvent(new Event('auth-change'));

      if (formData.rememberMe) {
        sessionStorage.setItem("rememberedUser", matchedUser.userId);
      } else {
        sessionStorage.removeItem("rememberedUser");
      }
      
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid User ID or Password. Please try again.");
    } finally {
      setIsLoading(false); // Stop loading regardless of success or failure
    }
  };

  useEffect(() => {
    const remembered = sessionStorage.getItem("rememberedUser");
    if (remembered) {
      setFormData((prev) => ({
        ...prev,
        emailOrUsername: remembered,
        rememberMe: true,
      }));
    }
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden text-gray-700">
      {/* Background elements code... (Unchanged) */}
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

      <div className="relative z-10 w-full max-w-[28%]">
        <div className={`transition-all duration-1000 ${mounted ? "transform translate-y-0 opacity-100" : "transform translate-y-8 opacity-0"}`}>
          <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-[1.5vw] border border-white border-opacity-20">
            <div className="flex flex-col items-center text-center mb-[1vw]">
              <img src={logo} alt="App Logo" className="mb-[0.8vw] w-[8vw]" />
              <p className="text-gray-600 text-[1vw]">Welcome back! Please sign in to your account.</p>
            </div>

            {error && (
              <div className="mb-[0.8vw] px-[1vw] py-[0.5vw] bg-red-50 border border-red-300 rounded-lg flex items-center gap-[0.5vw]">
                <div className="w-[0.5vw] h-[0.5vw] bg-red-500 rounded-full flex-shrink-0"></div>
                <p className="text-red-600 text-[0.85vw]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">Emp ID or Email *</label>
                <div className="relative">
                  <User className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={"1vw"} />
                  <input
                    type="text"
                    name="emailOrUsername"
                    disabled={isLoading}
                    value={formData.emailOrUsername}
                    onChange={handleInputChange}
                    className="w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw]"
                    placeholder="Enter your Emp ID (e.g., Fisto1)"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">Password *</label>
                <div className="relative">
                  <Shield className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={"1vw"} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    disabled={isLoading}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw]"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <Eye size={"1vw"} /> : <EyeOff size={"1vw"} />}
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
                    className="w-[1.2vw] h-[1.2vw] text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-[0.5vw] text-[0.9vw] text-gray-700">Remember me</span>
                </label>
                <button type="button" className="text-[0.9vw] text-blue-600 hover:text-blue-800 transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Updated Login Button with Spinner */}
              <button
                type="submit"
                disabled={isLoading}
                className="text-[1vw] w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-[0.6vw] px-[0.2vw] rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-[1.2vw] w-[1.2vw] animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-[1vw] text-center">
              <p className="text-[0.9vw] text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/register")}
                  disabled={isLoading}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Register Here
                </button>
              </p>
            </div>

            {/* Demo Credentials Hint */}
            <div className="mt-[1vw] p-[0.8vw] bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-[0.75vw] text-blue-700 font-semibold mb-[0.3vw]">Demo Credentials:</p>
              <p className="text-[0.7vw] text-blue-600">Admin User ID: <span className="text-black font-bold"> ak12</span> &nbsp;|&nbsp; Password: <span className="text-black font-bold">123456</span></p>
              <p className="text-[0.7vw] text-blue-600">User IDs: <span className="text-black font-bold"> AK1234</span> &nbsp;|&nbsp; Password: <span className="text-black font-bold">123456</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;